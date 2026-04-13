from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal


FIXTURE_ROOT = Path(__file__).resolve().parent

DefaultViewQuality = Literal["strong", "partial", "weak"]


@dataclass(frozen=True)
class FixtureExpectation:
    file_name: str
    tags: tuple[str, ...]
    expected_status: Literal["ready"] = "ready"
    expected_sheet_count: int = 0
    expected_table_count: int = 0
    expected_review_required_count: int = 0
    default_view: tuple[str | None, str | None] = (None, None)
    default_view_quality: DefaultViewQuality = "partial"
    default_view_primary_mode: Literal["chart", "summary", "table"] | None = None
    default_view_chart_source_type: Literal["reused", "reconstructed", "generated"] | None = None
    presentation_risks: tuple[str, ...] = field(default_factory=tuple)
    target_stories: tuple[str, ...] = field(default_factory=tuple)
    smoke_search_query: str | None = None


def fixture_path(file_name: str) -> Path:
    return FIXTURE_ROOT / file_name


FIXTURE_CATALOG: dict[str, FixtureExpectation] = {
    "Monthly budget.xlsx": FixtureExpectation(
        file_name="Monthly budget.xlsx",
        tags=("budget", "summary_report", "demo_reference"),
        expected_sheet_count=2,
        expected_table_count=13,
        default_view=("sheet_02", "tbl_02_02"),
        default_view_quality="strong",
        default_view_primary_mode="chart",
        default_view_chart_source_type="generated",
        presentation_risks=("chart_reuse_is_still_generated",),
        target_stories=("3.5", "3.8"),
        smoke_search_query="Rent",
    ),
    "Google Finance Investment Tracker.xlsx": FixtureExpectation(
        file_name="Google Finance Investment Tracker.xlsx",
        tags=("finance", "tracker", "graph_heavy", "default_view_target"),
        expected_sheet_count=2,
        expected_table_count=9,
        default_view=("sheet_02", "tbl_02_03"),
        default_view_quality="partial",
        default_view_primary_mode="table",
        default_view_chart_source_type="generated",
        presentation_risks=(
            "default_view_is_table_first",
            "chart_reuse_absent",
        ),
        target_stories=("3.7",),
    ),
    "performance-logs-report.xlsx": FixtureExpectation(
        file_name="performance-logs-report.xlsx",
        tags=("logs", "report", "long_form", "search_layout_target"),
        expected_sheet_count=3,
        expected_table_count=3,
        default_view=("sheet_01", "tbl_01_01"),
        default_view_quality="weak",
        default_view_primary_mode="table",
        default_view_chart_source_type="generated",
        presentation_risks=(
            "wide_default_table",
            "long_form_search_rows",
            "table_first_report",
        ),
        target_stories=("3.5", "3.7", "3.8"),
        smoke_search_query="Mozilla",
    ),
    "test-validation-multiple-environments.xlsx": FixtureExpectation(
        file_name="test-validation-multiple-environments.xlsx",
        tags=("validation", "test_report", "fragmented", "condensation_target"),
        expected_sheet_count=7,
        expected_table_count=156,
        expected_review_required_count=6,
        default_view=("sheet_04", "tbl_04_18"),
        default_view_quality="strong",
        default_view_primary_mode="chart",
        default_view_chart_source_type="generated",
        presentation_risks=(
            "fragmented_navigation",
            "first_search_can_be_slow",
        ),
        target_stories=("3.6", "3.7", "3.8"),
        smoke_search_query="EMEA",
    ),
    "extensive-document-academic-report.xlsx": FixtureExpectation(
        file_name="extensive-document-academic-report.xlsx",
        tags=("academic", "long_form", "search_layout_target", "default_view_target"),
        expected_sheet_count=12,
        expected_table_count=17,
        default_view=("sheet_10", "tbl_10_01"),
        default_view_quality="partial",
        default_view_primary_mode="chart",
        default_view_chart_source_type="generated",
        presentation_risks=(
            "very_long_search_values",
            "wide_search_rows",
            "table_heavy_report",
        ),
        target_stories=("3.5", "3.7"),
        smoke_search_query="Físico",
    ),
    "costs of 2025.xlsx": FixtureExpectation(
        file_name="costs of 2025.xlsx",
        tags=("costs", "fragmented", "first_search_target"),
        expected_sheet_count=13,
        expected_table_count=85,
        default_view=("sheet_01", "tbl_01_05"),
        default_view_quality="partial",
        default_view_primary_mode="chart",
        default_view_chart_source_type="generated",
        presentation_risks=(
            "high_table_fragmentation",
            "first_search_can_be_slow",
        ),
        target_stories=("3.7",),
        smoke_search_query="AguaSuco",
    ),
}
