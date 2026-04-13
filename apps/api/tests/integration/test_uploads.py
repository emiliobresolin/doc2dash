import json
from io import BytesIO
from pathlib import Path

import pandas as pd
from fastapi.testclient import TestClient

from app.core.errors import AppError
from app.services.upload_bundle_store import UploadBundleStore
from app.services.workbook_ingestion import WorkbookIngestionService
from app.utils.file_validation import ValidatedUpload


XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def build_excel_bytes(sheet_map: dict[str, pd.DataFrame]) -> bytes:
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        for sheet_name, dataframe in sheet_map.items():
            dataframe.to_excel(writer, sheet_name=sheet_name, index=False)
    return buffer.getvalue()


def test_post_upload_accepts_valid_excel(
    client: TestClient,
    uploads_root: Path,
) -> None:
    workbook = build_excel_bytes(
        {
            "Sales": pd.DataFrame({"Date": ["2026-01-01"], "Revenue": [100]}),
            "Roster": pd.DataFrame({"Name": ["Ava"], "Role": ["Engineer"]}),
        }
    )

    response = client.post(
        "/api/uploads",
        files={"file": ("report.xlsx", workbook, XLSX_CONTENT_TYPE)},
    )

    assert response.status_code == 202
    payload = response.json()
    assert payload["error"] is None
    assert payload["meta"] == {}
    assert payload["data"]["status"] == "processing"
    assert payload["data"]["workbook"]["sheetCount"] == 0
    assert payload["data"]["workbook"]["tableCount"] == 0
    assert payload["data"]["defaultView"]["sheetId"] is None
    assert payload["data"]["defaultView"]["tableId"] is None
    assert payload["data"]["defaultView"]["viewType"] == "summary_dashboard"
    assert payload["data"]["presentation"]["defaultMode"] == "analysis"
    assert payload["data"]["presentation"]["presenterModeAvailable"] is True

    upload_id = payload["data"]["uploadId"]
    bundle_root = uploads_root / upload_id
    assert (bundle_root / "source" / "report.xlsx").exists()
    assert (bundle_root / "tables").is_dir()
    assert (bundle_root / "previews").is_dir()
    assert (bundle_root / "logs").is_dir()

    manifest_response = client.get(f"/api/uploads/{upload_id}")
    assert manifest_response.status_code == 200
    manifest_payload = manifest_response.json()["data"]
    assert manifest_payload["status"] == "ready"
    assert manifest_payload["workbook"]["sheetCount"] == 2
    assert manifest_payload["workbook"]["tableCount"] == 2
    assert manifest_payload["defaultView"]["sheetId"] == "sheet_01"
    assert manifest_payload["defaultView"]["tableId"] == "tbl_01_01"
    assert manifest_payload["tables"][0]["defaultChartType"] == "line"
    assert manifest_payload["tables"][0]["availableChartTypes"] == [
        "line",
        "area",
        "column",
        "table",
    ]
    assert manifest_payload["tables"][0]["chartSourceType"] == "generated"
    assert manifest_payload["tables"][1]["defaultChartType"] == "table"
    assert manifest_payload["tables"][1]["availableChartTypes"] == ["table"]

    manifest = json.loads((bundle_root / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["source"]["fileName"] == "report.xlsx"
    assert manifest["sheets"][0]["order"] == 1
    assert manifest["sheets"][0]["isEmpty"] is False
    assert manifest["presentation"]["presenterModeAvailable"] is True
    assert len(manifest["tables"]) == 2
    assert manifest["tables"][0]["reviewRequired"] is False
    assert manifest["tables"][0]["chartRecommendations"][0]["chartType"] == "line"
    assert manifest["tables"][0]["chartRecommendations"][-1]["chartType"] == "table"
    assert (bundle_root / "tables" / "tbl_01_01.json").exists()
    assert (bundle_root / "previews" / "tbl_01_01.json").exists()
    assert (bundle_root / "runtime.json").exists()

    runtime_response = client.get(f"/api/uploads/{upload_id}/runtime")
    assert runtime_response.status_code == 200
    runtime = runtime_response.json()["data"]
    assert runtime["status"] == "ready"
    assert runtime["artifactSummary"]["tableArtifacts"] == 2
    assert runtime["artifactSummary"]["previewArtifacts"] == 2
    assert runtime["processingStartedAt"] is not None
    assert runtime["processingFinishedAt"] is not None


def test_post_upload_accepts_valid_csv(
    client: TestClient,
    uploads_root: Path,
) -> None:
    response = client.post(
        "/api/uploads",
        files={"file": ("report.csv", b"team,value\nplatform,4\n", "text/csv")},
    )

    assert response.status_code == 202
    payload = response.json()["data"]
    upload_id = payload["uploadId"]

    assert payload["status"] == "processing"
    assert (uploads_root / upload_id / "source" / "report.csv").exists()

    manifest_response = client.get(f"/api/uploads/{upload_id}/manifest")
    assert manifest_response.status_code == 200
    manifest = manifest_response.json()["data"]
    assert manifest["status"] == "ready"
    assert manifest["workbook"]["sheetCount"] == 1
    assert manifest["workbook"]["tableCount"] == 1
    assert manifest["sheets"][0]["name"] == "Sheet1"
    assert manifest["sheets"][0]["isEmpty"] is False
    assert manifest["defaultView"]["sheetId"] == "sheet_01"
    assert manifest["defaultView"]["tableId"] == "tbl_01_01"
    assert manifest["tables"][0]["bounds"]["startRow"] == 1
    assert manifest["tables"][0]["defaultChartType"] == "column"
    assert manifest["tables"][0]["availableChartTypes"] == [
        "column",
        "bar",
        "table",
    ]
    assert (uploads_root / upload_id / "tables" / "tbl_01_01.json").exists()
    assert (uploads_root / upload_id / "previews" / "tbl_01_01.json").exists()


def test_get_preview_returns_persisted_preview_rows(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/uploads",
        files={
            "file": (
                "report.csv",
                (
                    "team,value\n"
                    + "\n".join(f"team-{index},{index}" for index in range(1, 31))
                    + "\n"
                ).encode("utf-8"),
                "text/csv",
            )
        },
    )

    upload_id = response.json()["data"]["uploadId"]
    manifest = client.get(f"/api/uploads/{upload_id}/manifest").json()["data"]
    table_id = manifest["tables"][0]["tableId"]

    preview_response = client.get(f"/api/uploads/{upload_id}/tables/{table_id}/preview")

    assert preview_response.status_code == 200
    preview = preview_response.json()["data"]
    assert preview["tableId"] == table_id
    assert preview["columns"] == ["team", "value"]
    assert preview["rowCount"] == 30
    assert preview["page"] == 1
    assert preview["pageSize"] == 25
    assert preview["totalPages"] == 2
    assert preview["hasPreviousPage"] is False
    assert preview["hasNextPage"] is True
    assert preview["rows"][0]["team"] == "team-1"

    second_page_response = client.get(
        f"/api/uploads/{upload_id}/tables/{table_id}/preview",
        params={"page": 2, "pageSize": 10},
    )
    assert second_page_response.status_code == 200
    second_page = second_page_response.json()["data"]
    assert second_page["page"] == 2
    assert second_page["pageSize"] == 10
    assert second_page["totalPages"] == 3
    assert second_page["hasPreviousPage"] is True
    assert second_page["hasNextPage"] is True
    assert second_page["rows"][0]["team"] == "team-11"
    assert second_page["rows"][-1]["team"] == "team-20"

    filtered_response = client.get(
        f"/api/uploads/{upload_id}/tables/{table_id}/preview",
        params={"filter": "team-2", "pageSize": 5},
    )
    assert filtered_response.status_code == 200
    filtered_preview = filtered_response.json()["data"]
    assert filtered_preview["page"] == 1
    assert filtered_preview["pageSize"] == 5
    assert filtered_preview["rowCount"] == 11
    assert filtered_preview["totalPages"] == 3
    assert filtered_preview["hasPreviousPage"] is False
    assert filtered_preview["hasNextPage"] is True
    assert filtered_preview["rows"][0]["team"] == "team-2"
    assert filtered_preview["rows"][-1]["team"] == "team-23"


def test_post_upload_rejects_oversized_files(client: TestClient) -> None:
    response = client.post(
        "/api/uploads",
        files={
            "file": (
                "large.csv",
                b"x" * ((30 * 1024 * 1024) + 1),
                "text/csv",
            )
        },
    )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "file_too_large"


def test_post_upload_rejects_unsupported_types(client: TestClient) -> None:
    response = client.post(
        "/api/uploads",
        files={"file": ("report.ods", b"fake", "application/vnd.oasis.opendocument.spreadsheet")},
    )

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "unsupported_file_type"


def test_post_upload_rejects_corrupt_workbooks(client: TestClient) -> None:
    response = client.post(
        "/api/uploads",
        files={"file": ("broken.xlsx", b"not really excel", XLSX_CONTENT_TYPE)},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "corrupt_file"


def test_cancel_upload_cleans_generated_artifacts_and_preserves_recovery_state(
    client: TestClient,
    uploads_root: Path,
) -> None:
    upload_id = "upl_cancelled"
    bundle_store = UploadBundleStore(uploads_root)
    ingestion_service = WorkbookIngestionService()
    validated_upload = ValidatedUpload(
        file_name="report.csv",
        safe_file_name="report.csv",
        file_type="csv",
        content_type="text/csv",
        size_bytes=18,
    )
    bundle = bundle_store.create_bundle(upload_id)
    bundle_store.write_manifest(
        bundle,
        ingestion_service.build_processing_manifest(
            upload_id=upload_id,
            validated_upload=validated_upload,
        ),
    )
    bundle_store.write_runtime(
        bundle,
        ingestion_service.build_processing_runtime(upload_id=upload_id),
    )
    bundle_store.write_table_artifact(
        bundle,
        table_id="tbl_01_01",
        payload={
            "tableId": "tbl_01_01",
            "sheetId": "sheet_01",
            "normalizedColumns": ["team", "value"],
            "normalizedRows": [{"team": "platform", "value": 4}],
        },
    )
    bundle_store.write_preview_artifact(
        bundle,
        table_id="tbl_01_01",
        payload={
            "tableId": "tbl_01_01",
            "sheetId": "sheet_01",
            "columns": ["team", "value"],
            "rows": [{"team": "platform", "value": 4}],
            "rowCount": 1,
        },
    )

    response = client.post(f"/api/uploads/{upload_id}/cancel")

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["status"] == "cancelled"
    assert payload["tables"] == []
    assert payload["defaultView"]["tableId"] is None
    assert list((uploads_root / upload_id / "tables").glob("*.json")) == []
    assert list((uploads_root / upload_id / "previews").glob("*.json")) == []

    runtime_response = client.get(f"/api/uploads/{upload_id}/runtime")
    assert runtime_response.status_code == 200
    runtime = runtime_response.json()["data"]
    assert runtime["status"] == "cancelled"
    assert runtime["cancelledAt"] is not None
    assert runtime["artifactSummary"]["tableArtifacts"] == 0
    assert runtime["artifactSummary"]["previewArtifacts"] == 0
    assert "cancellation.log" in runtime["logFiles"]


def test_cancel_upload_rejects_ready_bundles_without_destroying_artifacts(
    client: TestClient,
    uploads_root: Path,
) -> None:
    response = client.post(
        "/api/uploads",
        files={"file": ("report.csv", b"team,value\nplatform,4\n", "text/csv")},
    )

    assert response.status_code == 202
    upload_id = response.json()["data"]["uploadId"]
    manifest_before = client.get(f"/api/uploads/{upload_id}/manifest").json()["data"]
    runtime_before = client.get(f"/api/uploads/{upload_id}/runtime").json()["data"]
    table_id = manifest_before["tables"][0]["tableId"]

    cancel_response = client.post(f"/api/uploads/{upload_id}/cancel")

    assert cancel_response.status_code == 409
    assert cancel_response.json()["error"]["code"] == "upload_not_cancellable"

    manifest_after = client.get(f"/api/uploads/{upload_id}/manifest").json()["data"]
    runtime_after = client.get(f"/api/uploads/{upload_id}/runtime").json()["data"]
    assert manifest_after["status"] == "ready"
    assert runtime_after["status"] == "ready"
    assert manifest_after["defaultView"]["tableId"] == manifest_before["defaultView"]["tableId"]
    assert runtime_after["artifactSummary"] == runtime_before["artifactSummary"]
    assert (uploads_root / upload_id / "tables" / f"{table_id}.json").exists()
    assert (uploads_root / upload_id / "previews" / f"{table_id}.json").exists()


def test_failed_upload_records_runtime_details_and_cleans_partial_artifacts(
    client: TestClient,
    uploads_root: Path,
    monkeypatch,
) -> None:
    def raise_processing_error(*args, **kwargs):
        raise AppError(
            status_code=422,
            code="processing_failed",
            message="The workbook failed during background processing.",
        )

    monkeypatch.setattr(
        WorkbookIngestionService,
        "build_ingestion_result",
        raise_processing_error,
    )

    response = client.post(
        "/api/uploads",
        files={"file": ("report.csv", b"team,value\nplatform,4\n", "text/csv")},
    )

    assert response.status_code == 202
    upload_id = response.json()["data"]["uploadId"]

    manifest_response = client.get(f"/api/uploads/{upload_id}/manifest")
    manifest = manifest_response.json()["data"]
    assert manifest["status"] == "failed"
    assert manifest["workbook"]["warnings"] == [
        "The workbook failed during background processing."
    ]

    runtime_response = client.get(f"/api/uploads/{upload_id}/runtime")
    runtime = runtime_response.json()["data"]
    assert runtime["status"] == "failed"
    assert runtime["failureMessage"] == "The workbook failed during background processing."
    assert runtime["processingFinishedAt"] is not None
    assert "processing-error.log" in runtime["logFiles"]
    assert list((uploads_root / upload_id / "tables").glob("*.json")) == []
    assert list((uploads_root / upload_id / "previews").glob("*.json")) == []
