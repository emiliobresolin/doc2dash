import pandas as pd

from app.pipelines.normalize_tables import NormalizedTableResult
from app.schemas.manifest import (
    ColumnProfile,
    NormalizationSummary,
    SourceReference,
    TableBounds,
    TableStats,
    TableSummary,
)
from app.services.chart_strategy import ChartStrategy


def build_result(
    frame: pd.DataFrame,
    *,
    orientation: str = "long_form",
    review_required: bool = False,
) -> NormalizedTableResult:
    columns: list[ColumnProfile] = []
    for column in frame.columns:
        role = "text"
        chart_friendly = False
        if column in {"Revenue", "Value"}:
            role = "numeric"
            chart_friendly = True
        elif column == "Date":
            role = "datetime"
            chart_friendly = True
        elif column in {"Product", "Team", "Owner"}:
            role = "categorical"
            chart_friendly = True
        elif column == "Notes":
            role = "text"
        columns.append(
            ColumnProfile(
                name=column,
                role=role,
                dtype=str(frame[column].dtype),
                source_columns=[column],
                null_count=0,
                unique_count=int(frame[column].astype(str).nunique()),
                chart_friendly=chart_friendly,
                stats={},
            )
        )

    table = TableSummary(
        table_id="tbl_01_01",
        sheet_id="sheet_01",
        bounds=TableBounds(
            start_row=1,
            end_row=len(frame.index) + 1,
            start_col=1,
            end_col=len(frame.columns),
        ),
        confidence=0.92,
        detection_reasons=["synthetic"],
        orientation=orientation,
        review_required=review_required,
        normalization=NormalizationSummary(
            status="none",
            method="none",
            reason="synthetic",
            output_columns=list(frame.columns),
            source_column_map={column: [column] for column in frame.columns},
        ),
        source_reference=SourceReference(
            sheet_id="sheet_01",
            bounds=TableBounds(
                start_row=1,
                end_row=len(frame.index) + 1,
                start_col=1,
                end_col=len(frame.columns),
            ),
            header_row=1,
            data_start_row=2,
            raw_columns=list(frame.columns),
            raw_column_indexes=list(range(1, len(frame.columns) + 1)),
        ),
        columns=columns,
        stats=TableStats(
            row_count=int(frame.shape[0]),
            column_count=int(frame.shape[1]),
            numeric_column_count=1
            if "Revenue" in frame.columns or "Value" in frame.columns
            else 0,
            categorical_column_count=1
            if "Product" in frame.columns or "Team" in frame.columns
            else 0,
            datetime_column_count=1 if "Date" in frame.columns else 0,
            text_column_count=1 if "Notes" in frame.columns else 0,
            not_chart_friendly_column_count=0,
            chart_friendly="Revenue" in frame.columns or "Value" in frame.columns,
            primary_mode="chart" if not review_required else "table",
            reason="synthetic",
        ),
    )
    return NormalizedTableResult(table=table, normalized_frame=frame, raw_frame=frame)


def test_chart_strategy_marks_explicit_visual_intent_as_reused() -> None:
    strategy = ChartStrategy()
    frame = pd.DataFrame(
        {
            "Date": ["2026-01-01", "2026-01-02", "2026-01-03"],
            "Revenue": [100, 120, 140],
        }
    )

    result = strategy.enrich_table(
        sheet_name="Revenue Trend Chart",
        result=build_result(frame),
        source_visual_detected=True,
    )

    assert result.table.chart_source_type == "reused"
    assert result.table.default_chart_type == "line"
    assert result.table.available_chart_types == ["line", "area", "column", "table"]
    assert {chart.chart_type for chart in result.table.chart_recommendations} == {
        "line",
        "area",
        "column",
        "table",
    }


def test_chart_strategy_marks_summary_sections_as_reconstructed() -> None:
    strategy = ChartStrategy()
    frame = pd.DataFrame(
        {
            "Product": ["Alpha", "Beta", "Gamma"],
            "Revenue": [100, 120, 90],
        }
    )

    result = strategy.enrich_table(
        sheet_name="Executive Trend Summary",
        result=build_result(frame),
    )

    assert result.table.chart_source_type == "reconstructed"
    assert result.table.default_chart_type in {"column", "bar", "pie"}
    assert "column" in result.table.available_chart_types
    assert "bar" in result.table.available_chart_types
    assert "table" in result.table.available_chart_types


def test_chart_strategy_falls_back_to_generated_when_intent_is_weak() -> None:
    strategy = ChartStrategy()
    frame = pd.DataFrame(
        {
            "Team": ["Platform", "Architecture", "Security"],
            "Value": [4, 3, 2],
        }
    )

    result = strategy.enrich_table(
        sheet_name="Sheet1",
        result=build_result(frame),
    )

    assert result.table.chart_source_type == "generated"
    assert result.table.default_chart_type in {"column", "bar", "pie"}
    assert "line" not in result.table.available_chart_types


def test_chart_strategy_suppresses_invalid_chart_types_for_non_chartable_tables() -> None:
    strategy = ChartStrategy()
    frame = pd.DataFrame(
        {
            "Owner": ["Platform", "Architecture"],
            "Notes": ["Kickoff review", "Migration workshop"],
        }
    )

    result = strategy.enrich_table(
        sheet_name="Notes",
        result=build_result(frame, orientation="not_safely_normalizable", review_required=True),
    )

    assert result.table.available_chart_types == ["table"]
    assert result.table.default_chart_type == "table"
    assert result.table.chart_recommendations[0].chart_type == "table"
    assert result.table.chart_source_reason.startswith("Review is required")


def test_chart_strategy_suppresses_pie_for_large_category_sets() -> None:
    strategy = ChartStrategy()
    frame = pd.DataFrame(
        {
            "Product": [f"Item {index}" for index in range(1, 9)],
            "Revenue": [index * 10 for index in range(1, 9)],
        }
    )

    result = strategy.enrich_table(
        sheet_name="Sheet1",
        result=build_result(frame),
    )

    assert "pie" not in result.table.available_chart_types


def test_chart_strategy_drops_blank_category_labels_from_generated_points() -> None:
    strategy = ChartStrategy()
    frame = pd.DataFrame(
        {
            "Product": ["Alpha", None, "Gamma"],
            "Revenue": [100, 120, 90],
        }
    )

    result = strategy.enrich_table(
        sheet_name="Executive Summary",
        result=build_result(frame),
    )

    column_chart = next(
        chart
        for chart in result.table.chart_recommendations
        if chart.chart_type == "column"
    )

    assert [point.label for point in column_chart.points] == ["Alpha", "Gamma"]
