import pandas as pd

from app.pipelines.normalize_tables import TableNormalizer
from app.schemas.manifest import TableBounds, TableSummary


def build_table(
    *,
    table_id: str = "tbl_01_01",
    review_required: bool = False,
    bounds: TableBounds | None = None,
) -> TableSummary:
    return TableSummary(
        table_id=table_id,
        sheet_id="sheet_01",
        bounds=bounds or TableBounds(start_row=1, end_row=4, start_col=1, end_col=3),
        confidence=0.92,
        detection_reasons=["Detected a dense non-empty region from the sheet grid"],
        review_required=review_required,
    )


def test_normalize_table_melts_clear_wide_measure_columns() -> None:
    normalizer = TableNormalizer()
    grid = pd.DataFrame(
        [
            ["Product", "2024", "2025"],
            ["Alpha", 10, 12],
            ["Beta", 20, 22],
        ]
    )

    result = normalizer.normalize_table(table=build_table(), grid=grid)

    assert result.table.orientation == "wide_form"
    assert result.table.normalization.status == "melted"
    assert result.table.normalization.method == "melt"
    assert result.table.normalization.id_columns == ["Product"]
    assert result.table.normalization.value_columns == ["2024", "2025"]
    assert list(result.normalized_frame.columns) == ["Product", "variable", "value"]
    assert result.normalized_frame.shape == (4, 3)
    assert result.table.source_reference is not None
    assert result.table.source_reference.raw_columns == ["Product", "2024", "2025"]


def test_normalize_table_preserves_long_form_without_reshape() -> None:
    normalizer = TableNormalizer()
    grid = pd.DataFrame(
        [
            ["Date", "Product", "Revenue"],
            ["2026-01-01", "Alpha", 100],
            ["2026-01-02", "Beta", 120],
        ]
    )

    result = normalizer.normalize_table(table=build_table(), grid=grid)

    assert result.table.orientation == "long_form"
    assert result.table.normalization.status == "none"
    assert list(result.normalized_frame.columns) == ["Date", "Product", "Revenue"]
    assert result.normalized_frame.shape == (2, 3)


def test_normalize_table_skips_ambiguous_review_required_table() -> None:
    normalizer = TableNormalizer()
    grid = pd.DataFrame(
        [
            ["Product", "Revenue"],
            ["Alpha", 10],
            ["Product", "Revenue"],
            ["Beta", 20],
        ]
    )

    result = normalizer.normalize_table(
        table=build_table(
            review_required=True,
            bounds=TableBounds(start_row=1, end_row=4, start_col=1, end_col=2),
        ),
        grid=grid,
    )

    assert result.table.orientation == "not_safely_normalizable"
    assert result.table.normalization.status == "skipped"
    assert result.normalized_frame.shape == (3, 2)
