from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from apps.api.tests.fixtures.fixture_catalog import FIXTURE_CATALOG, fixture_path
from apps.api.tests.integration.test_uploads import XLSX_CONTENT_TYPE


LEGACY_FIXTURES = (
    "blank-rows-multi-table.xlsx",
    "spacer-column-report.xlsx",
    "wide-and-long-mixed.xlsx",
    "duplicate-headers-ambiguous.xlsx",
    "empty-and-summary.xlsx",
    "ugly-workbook.xlsx",
)


def test_fixture_library_is_documented_against_the_current_workbook_set() -> None:
    fixture_readme = fixture_path("README.md")

    assert fixture_readme.exists()
    readme_text = fixture_readme.read_text(encoding="utf-8")

    for fixture_name in FIXTURE_CATALOG:
        assert fixture_name in readme_text
        assert fixture_path(fixture_name).exists()

    for legacy_fixture_name in LEGACY_FIXTURES:
        assert legacy_fixture_name not in readme_text


@pytest.mark.parametrize("fixture_name", list(FIXTURE_CATALOG))
def test_current_fixture_library_upload_flow_matches_the_documented_baseline(
    fixture_name: str,
    client: TestClient,
) -> None:
    expectation = FIXTURE_CATALOG[fixture_name]
    path = fixture_path(expectation.file_name)

    response = client.post(
        "/api/uploads",
        files={"file": (path.name, path.read_bytes(), XLSX_CONTENT_TYPE)},
    )

    assert response.status_code == 202
    upload_id = response.json()["data"]["uploadId"]

    manifest_response = client.get(f"/api/uploads/{upload_id}/manifest")
    assert manifest_response.status_code == 200
    manifest = manifest_response.json()["data"]

    assert manifest["status"] == expectation.expected_status
    assert manifest["workbook"]["sheetCount"] == expectation.expected_sheet_count
    assert manifest["workbook"]["tableCount"] == expectation.expected_table_count
    assert (
        manifest["defaultView"]["sheetId"],
        manifest["defaultView"]["tableId"],
    ) == expectation.default_view

    review_required_tables = [table for table in manifest["tables"] if table["reviewRequired"]]
    assert len(review_required_tables) == expectation.expected_review_required_count

    default_table = next(
        (
            table
            for table in manifest["tables"]
            if table["tableId"] == manifest["defaultView"]["tableId"]
        ),
        None,
    )
    assert default_table is not None

    if expectation.default_view_primary_mode is not None:
        assert default_table["stats"]["primaryMode"] == expectation.default_view_primary_mode

    if expectation.default_view_chart_source_type is not None:
        assert default_table["chartSourceType"] == expectation.default_view_chart_source_type

    assert expectation.default_view_quality in {"strong", "partial", "weak"}
    assert expectation.target_stories
    assert expectation.tags


def test_fixture_catalog_points_only_to_real_current_workbook_files() -> None:
    fixture_names_on_disk = {
        path.name
        for path in fixture_path(".").glob("*.xlsx")
    }

    assert fixture_names_on_disk == set(FIXTURE_CATALOG)
