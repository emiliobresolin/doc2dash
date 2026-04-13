import pandas as pd

from app.pipelines.normalize_tables import NormalizedTableResult
from app.pipelines.profile_tables import TableProfiler
from app.schemas.manifest import (
    NormalizationSummary,
    SourceReference,
    TableBounds,
    TableSummary,
)


def build_result(
    frame: pd.DataFrame,
    *,
    orientation: str,
    normalization: NormalizationSummary | None = None,
) -> NormalizedTableResult:
    table = TableSummary(
        table_id="tbl_01_01",
        sheet_id="sheet_01",
        bounds=TableBounds(start_row=1, end_row=len(frame.index) + 1, start_col=1, end_col=len(frame.columns)),
        confidence=0.9,
        detection_reasons=["synthetic"],
        orientation=orientation,
        normalization=normalization
        or NormalizationSummary(
            status="none",
            method="none",
            reason="synthetic",
            output_columns=list(frame.columns),
            source_column_map={column: [column] for column in frame.columns},
        ),
        source_reference=SourceReference(
            sheet_id="sheet_01",
            bounds=TableBounds(start_row=1, end_row=len(frame.index) + 1, start_col=1, end_col=len(frame.columns)),
            header_row=1,
            data_start_row=2,
            raw_columns=list(frame.columns),
            raw_column_indexes=list(range(1, len(frame.columns) + 1)),
        ),
    )
    return NormalizedTableResult(table=table, normalized_frame=frame, raw_frame=frame)


def test_profile_table_assigns_roles_and_summary_stats() -> None:
    profiler = TableProfiler()
    frame = pd.DataFrame(
        {
            "Date": ["2026-01-01", "2026-01-02"],
            "Product": ["Alpha", "Beta"],
            "Revenue": [100, 120],
        }
    )

    result = profiler.profile_table(build_result(frame, orientation="long_form"))

    roles = {column.name: column.role for column in result.table.columns}
    assert roles == {
        "Date": "datetime",
        "Product": "categorical",
        "Revenue": "numeric",
    }
    revenue_stats = next(column.stats for column in result.table.columns if column.name == "Revenue")
    assert revenue_stats["min"] == 100.0
    assert revenue_stats["max"] == 120.0
    assert result.table.stats.row_count == 2
    assert result.table.stats.chart_friendly is True
    assert result.table.stats.primary_mode == "chart"


def test_profile_table_marks_mixed_column_as_not_chart_friendly() -> None:
    profiler = TableProfiler()
    frame = pd.DataFrame(
        {
            "Label": ["Alpha", "Beta", "Gamma"],
            "MixedMetric": ["10", "unknown", "12"],
        }
    )

    result = profiler.profile_table(build_result(frame, orientation="not_safely_normalizable"))

    roles = {column.name: column.role for column in result.table.columns}
    assert roles["MixedMetric"] == "not_chart_friendly"
    assert result.table.stats.primary_mode == "table"
    assert result.table.stats.chart_friendly is False


def test_profile_table_keeps_note_columns_as_text() -> None:
    profiler = TableProfiler()
    frame = pd.DataFrame(
        {
            "Owner": ["Platform", "Architecture"],
            "Notes": ["Kickoff review", "Migration workshop"],
            "Revenue": [100, 120],
        }
    )

    result = profiler.profile_table(build_result(frame, orientation="long_form"))

    roles = {column.name: column.role for column in result.table.columns}
    assert roles["Owner"] == "categorical"
    assert roles["Notes"] == "text"
