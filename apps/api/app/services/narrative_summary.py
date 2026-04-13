from __future__ import annotations

import json
from dataclasses import dataclass
from statistics import mean
from typing import Any

import httpx

from app.core.config import Settings
from app.core.errors import AppError
from app.schemas.manifest import ChartRecommendation, ColumnProfile, TableSummary, UploadManifest
from app.schemas.narratives import (
    NarrativeBasis,
    NarrativeContent,
    NarrativePreviewRow,
    NarrativeScope,
    NarrativeScopeMode,
    NarrativeStatus,
    NarrativeSummaryPayload,
    NarrativeSummaryRequest,
)
from app.services.upload_bundle_store import UploadBundleStore


SYSTEM_PROMPT = """You generate short grounded dashboard commentary for spreadsheet data.
Use only the JSON packet provided by the caller.
Never describe the whole workbook unless the packet explicitly represents the whole workbook.
Never invent facts, recommendations, causes, forecasts, or business advice.
Prefer cautious language such as "appears to", "in this selected table", or "in these scoped rows".
Return JSON only with this exact shape:
{
  "description": "short description",
  "insights": ["insight 1", "insight 2"],
  "caveat": "optional caveat or null"
}
Rules:
- description: 1 sentence, max 240 chars
- insights: 2 to 4 concise items, each max 180 chars
- caveat: null or 1 concise sentence, max 180 chars
- Keep the output grounded in visible evidence from the packet."""


class NarrativeProviderError(Exception):
    """Base provider error."""


class NarrativeProviderTimeout(NarrativeProviderError):
    """Provider timed out."""


class NarrativeProviderUnavailable(NarrativeProviderError):
    """Provider is unavailable."""


class NarrativeOutputInvalid(NarrativeProviderError):
    """Provider output failed validation."""


@dataclass(frozen=True)
class NarrativePacket:
    scope_mode: NarrativeScopeMode
    table_label: str
    sheet_name: str
    table_id: str
    row_count: int
    column_count: int
    chart_friendly: bool
    primary_mode: str
    confidence: float
    review_required: bool
    normalization_status: str
    normalization_reason: str
    default_chart_type: str
    chart_dimension: str | None
    chart_measure: str | None
    warnings: list[str]
    top_categories: list[dict[str, Any]]
    numeric_summary: list[dict[str, Any]]
    preview_rows: list[dict[str, Any]]
    scoped_matched_columns: list[str]
    query: str | None

    def to_prompt_payload(self) -> dict[str, Any]:
        return {
            "scopeMode": self.scope_mode,
            "tableLabel": self.table_label,
            "sheetName": self.sheet_name,
            "tableId": self.table_id,
            "rowCount": self.row_count,
            "columnCount": self.column_count,
            "chartFriendly": self.chart_friendly,
            "primaryMode": self.primary_mode,
            "confidence": round(self.confidence, 4),
            "reviewRequired": self.review_required,
            "normalizationStatus": self.normalization_status,
            "normalizationReason": self.normalization_reason,
            "defaultChartType": self.default_chart_type,
            "chartDimension": self.chart_dimension,
            "chartMeasure": self.chart_measure,
            "warnings": self.warnings,
            "topCategories": self.top_categories,
            "numericSummary": self.numeric_summary,
            "previewRows": self.preview_rows,
            "scopedMatchedColumns": self.scoped_matched_columns,
            "query": self.query,
        }


class LocalOpenAICompatibleNarrativeProvider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @property
    def configured(self) -> bool:
        return (
            self.settings.narrative_provider == "local_openai_compatible"
            and bool(self.settings.narrative_base_url)
            and bool(self.settings.narrative_model)
        )

    async def generate(self, packet: NarrativePacket) -> NarrativeContent:
        if not self.configured:
            raise NarrativeProviderUnavailable("Local narrative provider is not configured.")

        base_url = self.settings.narrative_base_url.rstrip("/")
        endpoint = f"{base_url}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self.settings.narrative_api_key:
            headers["Authorization"] = f"Bearer {self.settings.narrative_api_key}"

        payload = {
            "model": self.settings.narrative_model,
            "temperature": 0.1,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(packet.to_prompt_payload(), ensure_ascii=True),
                },
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=self.settings.narrative_timeout_seconds) as client:
                response = await client.post(endpoint, headers=headers, json=payload)
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise NarrativeProviderTimeout("Narrative generation timed out.") from exc
        except httpx.HTTPError as exc:
            raise NarrativeProviderUnavailable("Narrative provider could not be reached.") from exc

        content = (
            response.json()
            .get("choices", [{}])[0]
            .get("message", {})
            .get("content")
        )
        if not isinstance(content, str) or not content.strip():
            raise NarrativeOutputInvalid("Narrative provider returned no content.")

        try:
            parsed = json.loads(_strip_json_fences(content))
        except json.JSONDecodeError as exc:
            raise NarrativeOutputInvalid("Narrative output was not valid JSON.") from exc

        try:
            return NarrativeContent.model_validate(parsed)
        except Exception as exc:  # pragma: no cover - schema guards are exercised by tests
            raise NarrativeOutputInvalid("Narrative output did not match the required schema.") from exc


class NarrativeSummaryService:
    def __init__(
        self,
        bundle_store: UploadBundleStore,
        settings: Settings,
        provider: LocalOpenAICompatibleNarrativeProvider | None = None,
    ) -> None:
        self.bundle_store = bundle_store
        self.settings = settings
        self.provider = provider or LocalOpenAICompatibleNarrativeProvider(settings)

    async def summarize(
        self,
        *,
        upload_id: str,
        request: NarrativeSummaryRequest,
    ) -> NarrativeSummaryPayload:
        manifest = self.bundle_store.read_manifest(upload_id)
        table = _find_table(manifest, request.table_id)
        sheet_name = _sheet_name_for(manifest, table.sheet_id)
        basis = _build_basis(sheet_name=sheet_name, table=table, request=request)
        scope = NarrativeScope(
            mode=request.mode,
            upload_id=upload_id,
            table_id=request.table_id,
            query=request.query,
        )

        cache_key = _build_cache_key(upload_id=upload_id, request=request)
        cached = self.bundle_store.read_cached_narrative(upload_id, cache_key=cache_key)
        if cached:
            return NarrativeSummaryPayload.model_validate(cached)

        packet = self._build_packet(
            manifest=manifest,
            table=table,
            sheet_name=sheet_name,
            upload_id=upload_id,
            request=request,
        )

        if not self.provider.configured:
            return _fallback_payload(
                status="unavailable",
                scope=scope,
                basis=basis,
                message="AI narrative unavailable in this environment. Use summary, charts, and source-aware rows to review this scope.",
            )

        try:
            narrative = await self.provider.generate(packet)
            _validate_grounding(narrative=narrative, packet=packet)
        except NarrativeProviderTimeout:
            return _fallback_payload(
                status="timeout",
                scope=scope,
                basis=basis,
                message="AI narrative took too long to generate. Use summary, charts, and source-aware rows to continue reviewing this scope.",
            )
        except NarrativeOutputInvalid:
            return _fallback_payload(
                status="invalid",
                scope=scope,
                basis=basis,
                message="AI narrative was not grounded enough to show safely for this scope.",
            )
        except NarrativeProviderError:
            return _fallback_payload(
                status="unavailable",
                scope=scope,
                basis=basis,
                message="AI narrative unavailable in this environment. Use summary, charts, and source-aware rows to review this scope.",
            )

        payload = NarrativeSummaryPayload(
            status="ready",
            scope=scope,
            narrative=narrative,
            basis=basis,
            fallback_message=None,
        )
        bundle = self.bundle_store.load_bundle(upload_id)
        self.bundle_store.write_cached_narrative(
            bundle,
            cache_key=cache_key,
            payload=payload.model_dump(by_alias=True, mode="json"),
        )
        return payload

    def _build_packet(
        self,
        *,
        manifest: UploadManifest,
        table: TableSummary,
        sheet_name: str,
        upload_id: str,
        request: NarrativeSummaryRequest,
    ) -> NarrativePacket:
        chart_recommendation = _resolve_chart_recommendation(table)
        warnings = manifest.workbook.warnings[:3]

        if request.mode == "scopedResult":
            scoped_rows = [row.row for row in request.preview_rows[:4]]
            scoped_columns = _union_scoped_columns(request.preview_rows)
            return NarrativePacket(
                scope_mode=request.mode,
                table_label=f"{sheet_name} / {table.table_id}",
                sheet_name=sheet_name,
                table_id=table.table_id,
                row_count=len(request.preview_rows),
                column_count=len(scoped_columns),
                chart_friendly=table.stats.chart_friendly,
                primary_mode=table.stats.primary_mode,
                confidence=table.confidence,
                review_required=table.review_required,
                normalization_status=table.normalization.status,
                normalization_reason=table.normalization.reason,
                default_chart_type=table.default_chart_type,
                chart_dimension=chart_recommendation.dimension_label if chart_recommendation else None,
                chart_measure=chart_recommendation.measure_label if chart_recommendation else None,
                warnings=warnings,
                top_categories=_top_categories_from_rows(request.preview_rows),
                numeric_summary=_numeric_summary_from_rows(request.preview_rows),
                preview_rows=scoped_rows,
                scoped_matched_columns=request.matched_columns[:4],
                query=request.query,
            )

        preview_payload = self.bundle_store.read_preview_artifact(
            upload_id,
            table_id=table.table_id,
            page=1,
            page_size=5,
        )
        table_artifact = self.bundle_store.read_table_artifact(upload_id, table_id=table.table_id)
        return NarrativePacket(
            scope_mode=request.mode,
            table_label=f"{sheet_name} / {table.table_id}",
            sheet_name=sheet_name,
            table_id=table.table_id,
            row_count=table.stats.row_count,
            column_count=table.stats.column_count,
            chart_friendly=table.stats.chart_friendly,
            primary_mode=table.stats.primary_mode,
            confidence=table.confidence,
            review_required=table.review_required,
            normalization_status=table.normalization.status,
            normalization_reason=table.normalization.reason,
            default_chart_type=table.default_chart_type,
            chart_dimension=chart_recommendation.dimension_label if chart_recommendation else None,
            chart_measure=chart_recommendation.measure_label if chart_recommendation else None,
            warnings=warnings,
            top_categories=_top_categories_from_table(table),
            numeric_summary=_numeric_summary_from_table(table),
            preview_rows=list(preview_payload.get("rows", [])),
            scoped_matched_columns=[],
            query=None,
        )


def _build_basis(
    *,
    sheet_name: str,
    table: TableSummary,
    request: NarrativeSummaryRequest,
) -> NarrativeBasis:
    if request.mode == "scopedResult":
        scoped_columns = _union_scoped_columns(request.preview_rows)
        row_count = len(request.preview_rows)
        column_count = len(scoped_columns)
    else:
        row_count = table.stats.row_count
        column_count = table.stats.column_count

    return NarrativeBasis(
        sheet_name=sheet_name,
        row_count=row_count,
        column_count=column_count,
        confidence=table.confidence,
        review_required=table.review_required,
        default_chart_type=table.default_chart_type,
        primary_mode=table.stats.primary_mode,
    )


def _resolve_chart_recommendation(table: TableSummary) -> ChartRecommendation | None:
    return next(
        (
            recommendation
            for recommendation in table.chart_recommendations
            if recommendation.chart_type == table.default_chart_type
        ),
        table.chart_recommendations[0] if table.chart_recommendations else None,
    )


def _top_categories_from_table(table: TableSummary) -> list[dict[str, Any]]:
    categories: list[dict[str, Any]] = []
    for column in table.columns:
        if column.role not in {"categorical", "text"}:
            continue
        values = column.stats.get("topValues")
        if not isinstance(values, list) or not values:
            continue
        categories.append({"column": column.name, "values": values[:3]})
        if len(categories) == 3:
            break
    return categories


def _numeric_summary_from_table(table: TableSummary) -> list[dict[str, Any]]:
    summaries: list[dict[str, Any]] = []
    for column in table.columns:
        if column.role != "numeric":
            continue
        minimum = column.stats.get("min")
        maximum = column.stats.get("max")
        average = column.stats.get("mean")
        if minimum is None and maximum is None and average is None:
            continue
        summaries.append(
            {
                "column": column.name,
                "min": minimum,
                "max": maximum,
                "mean": average,
            }
        )
        if len(summaries) == 3:
            break
    return summaries


def _top_categories_from_rows(rows: list[NarrativePreviewRow]) -> list[dict[str, Any]]:
    if not rows:
        return []

    values_by_column: dict[str, list[str]] = {}
    for preview_row in rows:
        for column, value in preview_row.row.items():
            if isinstance(value, str) and value.strip():
                values_by_column.setdefault(column, []).append(value.strip())

    categories: list[dict[str, Any]] = []
    for column, values in values_by_column.items():
        unique_values = list(dict.fromkeys(values))
        if len(unique_values) < 2:
            continue
        categories.append({"column": column, "values": unique_values[:3]})
        if len(categories) == 3:
            break
    return categories


def _numeric_summary_from_rows(rows: list[NarrativePreviewRow]) -> list[dict[str, Any]]:
    numeric_values: dict[str, list[float]] = {}
    for preview_row in rows:
        for column, value in preview_row.row.items():
            if isinstance(value, bool):
                continue
            if isinstance(value, (int, float)):
                numeric_values.setdefault(column, []).append(float(value))

    summaries: list[dict[str, Any]] = []
    for column, values in numeric_values.items():
        if not values:
            continue
        summaries.append(
            {
                "column": column,
                "min": min(values),
                "max": max(values),
                "mean": round(mean(values), 4),
            }
        )
        if len(summaries) == 3:
            break
    return summaries


def _union_scoped_columns(rows: list[NarrativePreviewRow]) -> list[str]:
    seen: dict[str, None] = {}
    for preview_row in rows:
        for column in preview_row.row:
            seen.setdefault(column, None)
    return list(seen)


def _build_cache_key(*, upload_id: str, request: NarrativeSummaryRequest) -> str:
    return json.dumps(
        {
            "uploadId": upload_id,
            "mode": request.mode,
            "tableId": request.table_id,
            "query": request.query,
            "matchedColumns": request.matched_columns,
            "previewRows": [row.model_dump(by_alias=True, mode="json") for row in request.preview_rows],
        },
        sort_keys=True,
    )


def _find_table(manifest: UploadManifest, table_id: str) -> TableSummary:
    for table in manifest.tables:
        if table.table_id == table_id:
            return table
    raise AppError(
        status_code=404,
        code="table_not_found",
        message="We couldn't find the selected table for this narrative request.",
    )


def _sheet_name_for(manifest: UploadManifest, sheet_id: str) -> str:
    for sheet in manifest.sheets:
        if sheet.sheet_id == sheet_id:
            return sheet.name
    return "Unknown sheet"


def _fallback_payload(
    *,
    status: NarrativeStatus,
    scope: NarrativeScope,
    basis: NarrativeBasis,
    message: str,
) -> NarrativeSummaryPayload:
    return NarrativeSummaryPayload(
        status=status,
        scope=scope,
        narrative=None,
        basis=basis,
        fallback_message=message,
    )


def _validate_grounding(
    *,
    narrative: NarrativeContent,
    packet: NarrativePacket,
) -> None:
    all_lines = [narrative.description, *narrative.insights]
    if narrative.caveat:
        all_lines.append(narrative.caveat)

    normalized_lines = [" ".join(line.strip().split()).lower() for line in all_lines if line.strip()]
    if len(set(normalized_lines)) < len(normalized_lines):
        raise NarrativeOutputInvalid("Narrative lines were too repetitive.")

    generic_fragments = (
        "provides valuable insights",
        "offers a useful overview",
        "contains various data points",
        "the data appears informative",
        "this table contains information",
    )
    if any(fragment in line for line in normalized_lines for fragment in generic_fragments):
        raise NarrativeOutputInvalid("Narrative output was too generic.")

    if packet.review_required and not narrative.caveat:
        raise NarrativeOutputInvalid("Review-required tables must carry a caveat.")


def _strip_json_fences(content: str) -> str:
    stripped = content.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.startswith("json"):
            stripped = stripped[4:]
    return stripped.strip()
