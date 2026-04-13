import pandas as pd

from app.pipelines.detect_tables import TableDetector


def test_detect_tables_finds_single_dense_region() -> None:
    detector = TableDetector()
    grid = pd.DataFrame(
        [
            ["Date", "Revenue"],
            ["2026-01-01", 100],
            ["2026-01-02", 120],
        ]
    )

    tables = detector.detect_tables(sheet_id="sheet_01", grid=grid)

    assert len(tables) == 1
    assert tables[0].bounds.start_row == 1
    assert tables[0].bounds.end_row == 3
    assert tables[0].bounds.start_col == 1
    assert tables[0].bounds.end_col == 2
    assert tables[0].confidence >= 0.6
    assert any("header row" in reason.lower() for reason in tables[0].detection_reasons)
    assert tables[0].review_required is False


def test_detect_tables_splits_regions_across_blank_row_and_blank_column() -> None:
    detector = TableDetector()
    grid = pd.DataFrame(
        [
            ["Name", "Value", None, "Team", "Count"],
            ["Alpha", 1, None, "Platform", 4],
            ["Beta", 2, None, "Architecture", 3],
        ]
    )

    tables = detector.detect_tables(sheet_id="sheet_01", grid=grid)

    assert len(tables) == 2
    assert tables[0].bounds.start_col == 1
    assert tables[0].bounds.end_col == 2
    assert tables[1].bounds.start_col == 4
    assert tables[1].bounds.end_col == 5


def test_detect_tables_merges_measure_continuation_across_blank_column() -> None:
    detector = TableDetector()
    grid = pd.DataFrame(
        [
            ["Region", "Q1", None, "Q2"],
            ["North", 10, None, 11],
            ["South", 12, None, 13],
        ]
    )

    tables = detector.detect_tables(sheet_id="sheet_01", grid=grid)

    assert len(tables) == 1
    assert tables[0].bounds.start_col == 1
    assert tables[0].bounds.end_col == 4
    assert any(
        "separator column" in reason.lower() for reason in tables[0].detection_reasons
    )


def test_detect_tables_marks_repeated_header_layouts_as_review_required() -> None:
    detector = TableDetector()
    grid = pd.DataFrame(
        [
            ["Product", "Revenue"],
            ["Alpha", 10],
            ["Beta", 20],
            ["Product", "Revenue"],
            ["Gamma", 30],
        ]
    )

    tables = detector.detect_tables(sheet_id="sheet_01", grid=grid)

    assert len(tables) == 1
    assert tables[0].review_required is True
    assert any("repeated header" in reason.lower() for reason in tables[0].detection_reasons)
