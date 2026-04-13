from app.pipelines.select_default_view import DefaultViewSelector
from app.schemas.manifest import (
    ColumnProfile,
    DefaultView,
    SheetSummary,
    TableBounds,
    TableStats,
    TableSummary,
)


def build_table(
    *,
    table_id: str,
    sheet_id: str,
    confidence: float,
    chart_friendly: bool,
    primary_mode: str,
    review_required: bool = False,
    row_count: int = 3,
    column_count: int = 2,
) -> TableSummary:
    return TableSummary(
        table_id=table_id,
        sheet_id=sheet_id,
        bounds=TableBounds(start_row=1, end_row=4, start_col=1, end_col=3),
        confidence=confidence,
        detection_reasons=["synthetic"],
        review_required=review_required,
        orientation="long_form",
        columns=[
            ColumnProfile(
                name="Label",
                role="categorical",
                dtype="object",
                chart_friendly=True,
            ),
            ColumnProfile(
                name="Value",
                role="numeric",
                dtype="int64",
                chart_friendly=True,
            ),
        ],
        stats=TableStats(
            row_count=row_count,
            column_count=column_count,
            numeric_column_count=1,
            categorical_column_count=1,
            chart_friendly=chart_friendly,
            primary_mode=primary_mode,
            reason="synthetic",
        ),
    )


def test_selector_prefers_non_review_chart_friendly_table() -> None:
    selector = DefaultViewSelector()
    sheets = [
        SheetSummary(
            sheet_id="sheet_01",
            name="Paged",
            order=1,
            row_count=10,
            column_count=2,
            is_empty=False,
        ),
        SheetSummary(
            sheet_id="sheet_02",
            name="Summary",
            order=2,
            row_count=5,
            column_count=2,
            is_empty=False,
        ),
    ]
    tables = [
        build_table(
            table_id="tbl_01_01",
            sheet_id="sheet_01",
            confidence=0.55,
            chart_friendly=False,
            primary_mode="table",
            review_required=True,
        ),
        build_table(
            table_id="tbl_02_01",
            sheet_id="sheet_02",
            confidence=0.9,
            chart_friendly=True,
            primary_mode="chart",
        ),
    ]

    selected = selector.select(sheets=sheets, tables=tables)

    assert selected == DefaultView(
        sheet_id="sheet_02",
        table_id="tbl_02_01",
        view_type="summary_dashboard",
    )


def test_selector_falls_back_to_first_non_empty_sheet_when_no_tables_exist() -> None:
    selector = DefaultViewSelector()
    sheets = [
        SheetSummary(
            sheet_id="sheet_01",
            name="Empty",
            order=1,
            row_count=0,
            column_count=0,
            is_empty=True,
        ),
        SheetSummary(
            sheet_id="sheet_02",
            name="Headers",
            order=2,
            row_count=1,
            column_count=3,
            is_empty=False,
        ),
    ]

    selected = selector.select(sheets=sheets, tables=[])

    assert selected == DefaultView(
        sheet_id="sheet_02",
        table_id=None,
        view_type="summary_dashboard",
    )


def test_selector_avoids_tiny_stub_tables_when_a_stronger_table_exists() -> None:
    selector = DefaultViewSelector()
    sheets = [
        SheetSummary(
            sheet_id="sheet_01",
            name="Tracker",
            order=1,
            row_count=300,
            column_count=8,
            is_empty=False,
        ),
    ]
    tables = [
        build_table(
            table_id="tbl_stub",
            sheet_id="sheet_01",
            confidence=0.99,
            chart_friendly=False,
            primary_mode="table",
            row_count=1,
            column_count=1,
        ),
        build_table(
            table_id="tbl_presentable",
            sheet_id="sheet_01",
            confidence=0.91,
            chart_friendly=False,
            primary_mode="table",
            row_count=240,
            column_count=6,
        ),
    ]

    selected = selector.select(sheets=sheets, tables=tables)

    assert selected.table_id == "tbl_presentable"


def test_selector_keeps_chart_ready_sections_ahead_of_plain_tables() -> None:
    selector = DefaultViewSelector()
    sheets = [
        SheetSummary(
            sheet_id="sheet_01",
            name="Validation",
            order=1,
            row_count=40,
            column_count=8,
            is_empty=False,
        ),
    ]
    tables = [
        build_table(
            table_id="tbl_chart",
            sheet_id="sheet_01",
            confidence=0.88,
            chart_friendly=True,
            primary_mode="chart",
            row_count=9,
            column_count=4,
        ),
        build_table(
            table_id="tbl_detail",
            sheet_id="sheet_01",
            confidence=0.97,
            chart_friendly=False,
            primary_mode="table",
            row_count=38,
            column_count=12,
        ),
    ]

    selected = selector.select(sheets=sheets, tables=tables)

    assert selected.table_id == "tbl_chart"
