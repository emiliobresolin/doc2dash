import json
import shutil
from pathlib import Path
from uuid import uuid4

import pytest

from app.schemas.manifest import ManifestSource, SheetSummary, UploadManifest, WorkbookSummary
from app.services.preview_search import PreviewSearchService
from app.services.upload_bundle_store import UploadBundleStore


def build_manifest() -> UploadManifest:
    return UploadManifest(
        upload_id="upl_search",
        status="ready",
        source=ManifestSource(
            file_name="report.csv",
            file_type="csv",
            size_bytes=128,
        ),
        workbook=WorkbookSummary(sheet_count=2, table_count=2),
        sheets=[
            SheetSummary(
                sheet_id="sheet_01",
                name="Summary",
                order=1,
                row_count=4,
                column_count=2,
                is_empty=False,
            ),
            SheetSummary(
                sheet_id="sheet_02",
                name="Ops",
                order=2,
                row_count=4,
                column_count=3,
                is_empty=False,
            ),
        ],
        tables=[],
    )


def write_preview(root: Path, *, table_id: str, sheet_id: str, rows: list[dict[str, object]]) -> None:
    preview_path = root / "previews" / f"{table_id}.json"
    preview_path.write_text(
        json.dumps(
            {
                "tableId": table_id,
                "sheetId": sheet_id,
                "columns": list(rows[0].keys()) if rows else [],
                "rows": rows,
                "rowCount": len(rows),
            },
            indent=2,
        ),
        encoding="utf-8",
    )


@pytest.fixture
def preview_uploads_root() -> Path:
    runtime_root = Path(__file__).resolve().parents[4] / "data" / "test-search"
    runtime_root.mkdir(parents=True, exist_ok=True)
    root = runtime_root / f"uploads-{uuid4().hex}"
    root.mkdir(parents=True, exist_ok=False)
    yield root / "uploads"
    shutil.rmtree(root, ignore_errors=True)


def test_preview_search_groups_results_by_table_and_keeps_source_context(
    preview_uploads_root: Path,
) -> None:
    uploads_root = preview_uploads_root
    bundle_store = UploadBundleStore(uploads_root)
    bundle = bundle_store.create_bundle("upl_search")
    bundle_store.write_manifest(bundle, build_manifest())
    write_preview(
        bundle.root,
        table_id="tbl_01_01",
        sheet_id="sheet_01",
        rows=[
            {"team": "Platform", "value": 4},
            {"team": "Architecture", "value": 3},
        ],
    )
    write_preview(
        bundle.root,
        table_id="tbl_02_01",
        sheet_id="sheet_02",
        rows=[
            {"service": "API", "status": "Healthy", "owner": "Platform"},
            {"service": "Search", "status": "Needs review", "owner": "Ops"},
        ],
    )

    service = PreviewSearchService(bundle_store)
    result = service.search(upload_id="upl_search", query="platform")

    assert result.result_count == 2
    results_by_table = {item.table_id: item for item in result.results}
    assert set(results_by_table) == {"tbl_01_01", "tbl_02_01"}
    assert results_by_table["tbl_01_01"].sheet_name == "Summary"
    assert results_by_table["tbl_01_01"].matched_columns == ["team"]
    assert results_by_table["tbl_01_01"].snippet == "team: Platform"
    assert results_by_table["tbl_02_01"].sheet_name == "Ops"
    assert results_by_table["tbl_02_01"].preview_rows[0].matched_columns == ["owner"]


def test_preview_search_meets_preview_latency_target_for_reused_indexed_workflow(
    preview_uploads_root: Path,
) -> None:
    uploads_root = preview_uploads_root
    bundle_store = UploadBundleStore(uploads_root)
    bundle = bundle_store.create_bundle("upl_search")
    bundle_store.write_manifest(bundle, build_manifest())

    for table_number in range(1, 81):
        rows = [
            {
                "team": f"Platform {row_number}" if row_number % 5 == 0 else f"Ops {row_number}",
                "status": "Healthy",
                "owner": "Architecture" if row_number % 2 == 0 else "Platform",
            }
            for row_number in range(25)
        ]
        write_preview(
            bundle.root,
            table_id=f"tbl_{table_number:02d}_01",
            sheet_id="sheet_02" if table_number % 2 == 0 else "sheet_01",
            rows=rows,
        )

    service = PreviewSearchService(bundle_store)
    warmup = service.search(upload_id="upl_search", query="platform")
    result = service.search(upload_id="upl_search", query="platform")

    assert warmup.result_count == 6
    assert result.result_count == 6
    assert result.truncated is True
    assert result.took_ms < 500
