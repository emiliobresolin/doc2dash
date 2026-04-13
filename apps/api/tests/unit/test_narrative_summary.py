import asyncio

from app.core.config import get_settings
from app.schemas.manifest import (
    ChartRecommendation,
    ColumnProfile,
    DefaultView,
    ManifestSource,
    NormalizationSummary,
    PresentationState,
    SheetSummary,
    TableBounds,
    TableStats,
    TableSummary,
    UploadManifest,
    WorkbookSummary,
)
from app.schemas.narratives import NarrativeContent, NarrativeSummaryRequest
from app.services.narrative_summary import (
    NarrativeOutputInvalid,
    NarrativeProviderTimeout,
    NarrativeSummaryService,
)
from app.services.upload_bundle_store import UploadBundleStore


class RecordingProvider:
    configured = True

    def __init__(self, response: NarrativeContent) -> None:
        self.response = response
        self.packets = []

    async def generate(self, packet):
        self.packets.append(packet)
        return self.response


class TimeoutProvider:
    configured = True

    async def generate(self, _packet):
        raise NarrativeProviderTimeout("timed out")


class InvalidProvider:
    configured = True

    async def generate(self, _packet):
        raise NarrativeOutputInvalid("invalid")


def _seed_bundle(uploads_root, *, review_required: bool = False):
    bundle_store = UploadBundleStore(uploads_root)
    bundle = bundle_store.create_bundle("upl_narrative")
    table = TableSummary(
        table_id="tbl_01_01",
        sheet_id="sheet_01",
        bounds=TableBounds(start_row=1, end_row=5, start_col=1, end_col=3),
        confidence=0.82,
        detection_reasons=["Dense region"],
        orientation="long_form",
        normalization=NormalizationSummary(
            status="none",
            method="none",
            reason="Already long form",
            output_columns=["Team", "Value", "Notes"],
            source_column_map={
                "Team": ["Team"],
                "Value": ["Value"],
                "Notes": ["Notes"],
            },
        ),
        columns=[
            ColumnProfile(
                name="Team",
                role="categorical",
                dtype="object",
                source_columns=["Team"],
                unique_count=2,
                chart_friendly=True,
                stats={"topValues": ["Platform", "Architecture"]},
            ),
            ColumnProfile(
                name="Value",
                role="numeric",
                dtype="int64",
                source_columns=["Value"],
                unique_count=3,
                chart_friendly=True,
                stats={"min": 3.0, "max": 8.0, "mean": 5.0},
            ),
            ColumnProfile(
                name="Notes",
                role="text",
                dtype="object",
                source_columns=["Notes"],
                unique_count=3,
                chart_friendly=False,
                stats={
                    "sampleValues": ["Alpha launch", "Ops work", "Platform follow-up"],
                    "topValues": ["Alpha launch", "Ops work"],
                },
            ),
        ],
        stats=TableStats(
            row_count=3,
            column_count=3,
            numeric_column_count=1,
            categorical_column_count=1,
            text_column_count=1,
            chart_friendly=True,
            primary_mode="chart",
            reason="Clear dimensions and measures",
        ),
        review_required=review_required,
        available_chart_types=["column", "bar", "table"],
        default_chart_type="column",
        chart_source_type="generated",
        chart_source_reason="No reusable source visual was detected for this table.",
        chart_recommendations=[
            ChartRecommendation(
                chart_type="column",
                title="Value by Team",
                description="Column chart using Value as the measure and Team as the presentation dimension.",
                dimension_label="Team",
                measure_label="Value",
                points=[
                    {"label": "Platform", "value": 8},
                    {"label": "Architecture", "value": 4},
                ],
            ),
            ChartRecommendation(
                chart_type="table",
                title="Readable table view",
                description="The readable table remains available whenever a chart would hide detail.",
            ),
        ],
    )
    manifest = UploadManifest(
        upload_id="upl_narrative",
        status="ready",
        source=ManifestSource(file_name="report.xlsx", file_type="xlsx", size_bytes=1024),
        workbook=WorkbookSummary(sheet_count=1, table_count=1, warnings=["Detection used dense-region heuristics."]),
        presentation=PresentationState(),
        default_view=DefaultView(sheet_id="sheet_01", table_id="tbl_01_01"),
        sheets=[
            SheetSummary(
                sheet_id="sheet_01",
                name="Summary",
                order=1,
                row_count=3,
                column_count=3,
                is_empty=False,
            )
        ],
        tables=[table],
    )
    bundle_store.write_manifest(bundle, manifest)
    bundle_store.write_table_artifact(
        bundle,
        table_id="tbl_01_01",
        payload={
            "tableId": "tbl_01_01",
            "sheetId": "sheet_01",
            "normalizedColumns": ["Team", "Value", "Notes"],
            "normalizedRows": [
                {"Team": "Platform", "Value": 8, "Notes": "Alpha launch"},
                {"Team": "Architecture", "Value": 4, "Notes": "Ops work"},
                {"Team": "Platform", "Value": 3, "Notes": "Platform follow-up"},
            ],
        },
    )
    bundle_store.write_preview_artifact(
        bundle,
        table_id="tbl_01_01",
        payload={
            "tableId": "tbl_01_01",
            "sheetId": "sheet_01",
            "columns": ["Team", "Value", "Notes"],
            "rows": [
                {"Team": "Platform", "Value": 8, "Notes": "Alpha launch"},
                {"Team": "Architecture", "Value": 4, "Notes": "Ops work"},
                {"Team": "Platform", "Value": 3, "Notes": "Platform follow-up"},
            ],
            "rowCount": 3,
        },
    )
    return bundle_store


def test_summarize_table_scope_builds_a_grounded_packet_and_caches_ready_results(uploads_root) -> None:
    bundle_store = _seed_bundle(uploads_root)
    provider = RecordingProvider(
        NarrativeContent(
            description="This selected table appears to compare value across two teams.",
            insights=[
                "Platform has the highest visible value in the selected table.",
                "The current table is compact and chart-friendly.",
            ],
            caveat=None,
        )
    )
    service = NarrativeSummaryService(bundle_store, get_settings(), provider=provider)
    request = NarrativeSummaryRequest(mode="table", table_id="tbl_01_01")

    first = asyncio.run(service.summarize(upload_id="upl_narrative", request=request))
    second = asyncio.run(service.summarize(upload_id="upl_narrative", request=request))

    assert first.status == "ready"
    assert second.status == "ready"
    assert len(provider.packets) == 1
    packet = provider.packets[0]
    assert packet.scope_mode == "table"
    assert packet.row_count == 3
    assert packet.chart_dimension == "Team"
    assert packet.chart_measure == "Value"
    assert packet.top_categories[0]["column"] == "Team"
    assert packet.numeric_summary[0]["column"] == "Value"


def test_summarize_scoped_result_uses_only_selected_rows(uploads_root) -> None:
    bundle_store = _seed_bundle(uploads_root)
    provider = RecordingProvider(
        NarrativeContent(
            description="In these scoped rows, Platform is the only visible team.",
            insights=[
                "The scoped result contains only the matched Platform rows.",
                "This scoped summary should not be read as a workbook-wide conclusion.",
            ],
            caveat="This summary is limited to the active scoped result.",
        )
    )
    service = NarrativeSummaryService(bundle_store, get_settings(), provider=provider)
    request = NarrativeSummaryRequest(
        mode="scopedResult",
        table_id="tbl_01_01",
        query="platform",
        matched_columns=["Team"],
        preview_rows=[
            {
                "rowIndex": 0,
                "matchedColumns": ["Team"],
                "row": {"Team": "Platform", "Value": 8, "Notes": "Alpha launch"},
            },
            {
                "rowIndex": 2,
                "matchedColumns": ["Team"],
                "row": {"Team": "Platform", "Value": 3, "Notes": "Platform follow-up"},
            },
        ],
    )

    response = asyncio.run(service.summarize(upload_id="upl_narrative", request=request))

    assert response.status == "ready"
    packet = provider.packets[0]
    assert packet.scope_mode == "scopedResult"
    assert packet.row_count == 2
    assert packet.preview_rows == [
        {"Team": "Platform", "Value": 8, "Notes": "Alpha launch"},
        {"Team": "Platform", "Value": 3, "Notes": "Platform follow-up"},
    ]
    assert packet.top_categories == [{"column": "Notes", "values": ["Alpha launch", "Platform follow-up"]}]
    assert packet.numeric_summary == [{"column": "Value", "min": 3.0, "max": 8.0, "mean": 5.5}]


def test_summarize_review_required_table_downgrades_provider_output_without_caveat(uploads_root) -> None:
    bundle_store = _seed_bundle(uploads_root, review_required=True)
    provider = RecordingProvider(
        NarrativeContent(
            description="This selected table appears to compare value across two teams.",
            insights=[
                "Platform has the highest visible value in the selected table.",
                "The current table is compact and chart-friendly.",
            ],
            caveat=None,
        )
    )
    service = NarrativeSummaryService(bundle_store, get_settings(), provider=provider)
    request = NarrativeSummaryRequest(mode="table", table_id="tbl_01_01")

    response = asyncio.run(service.summarize(upload_id="upl_narrative", request=request))

    assert response.status == "invalid"
    assert response.fallback_message == "AI narrative was not grounded enough to show safely for this scope."


def test_summarize_timeout_returns_non_blocking_timeout_payload(uploads_root) -> None:
    bundle_store = _seed_bundle(uploads_root)
    service = NarrativeSummaryService(bundle_store, get_settings(), provider=TimeoutProvider())
    request = NarrativeSummaryRequest(mode="table", table_id="tbl_01_01")

    response = asyncio.run(service.summarize(upload_id="upl_narrative", request=request))

    assert response.status == "timeout"
    assert "too long" in (response.fallback_message or "")
