import json
import time

import pandas as pd
from fastapi.testclient import TestClient

from apps.api.tests.integration.test_uploads import XLSX_CONTENT_TYPE, build_excel_bytes
from app.services.preview_search import PreviewSearchService


def test_search_api_returns_compact_preview_results_with_context(
    client: TestClient,
) -> None:
    workbook = build_excel_bytes(
        {
            "Summary": pd.DataFrame(
                {
                    "Team": ["Platform", "Architecture"],
                    "Value": [4, 3],
                }
            ),
            "Status": pd.DataFrame(
                {
                    "Service": ["API", "Search"],
                    "Owner": ["Platform", "Ops"],
                    "Status": ["Healthy", "Needs review"],
                }
            ),
        }
    )

    upload_response = client.post(
        "/api/uploads",
        files={"file": ("report.xlsx", workbook, XLSX_CONTENT_TYPE)},
    )
    upload_id = upload_response.json()["data"]["uploadId"]

    response = client.get(f"/api/uploads/{upload_id}/search", params={"q": "platform"})

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["query"] == "platform"
    assert payload["resultCount"] >= 1
    assert payload["limit"] == 6
    assert payload["results"][0]["sheetName"] in {"Summary", "Status"}
    assert payload["results"][0]["tableId"].startswith("tbl_")
    assert payload["results"][0]["previewRows"]
    assert payload["results"][0]["previewRows"][0]["matchedColumns"]
    assert payload["results"][0]["snippet"]


def test_search_api_returns_empty_results_for_blank_queries(
    client: TestClient,
) -> None:
    upload_response = client.post(
        "/api/uploads",
        files={"file": ("report.csv", b"team,value\nplatform,4\n", "text/csv")},
    )
    upload_id = upload_response.json()["data"]["uploadId"]

    response = client.get(f"/api/uploads/{upload_id}/search", params={"q": " "})

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["resultCount"] == 0
    assert payload["results"] == []


def test_search_api_reuses_cached_index_and_invalidates_when_preview_changes(
    client: TestClient,
    uploads_root,
    monkeypatch,
) -> None:
    upload_response = client.post(
        "/api/uploads",
        files={"file": ("report.csv", b"team,value\nplatform,4\narchitecture,3\n", "text/csv")},
    )
    upload_id = upload_response.json()["data"]["uploadId"]
    manifest = client.get(f"/api/uploads/{upload_id}/manifest").json()["data"]
    table_id = manifest["tables"][0]["tableId"]

    original_build_index = PreviewSearchService._build_index
    build_calls = 0

    def counting_build_index(self, *, upload_id, signature, previews_dir):
        nonlocal build_calls
        build_calls += 1
        return original_build_index(
            self,
            upload_id=upload_id,
            signature=signature,
            previews_dir=previews_dir,
        )

    monkeypatch.setattr(PreviewSearchService, "_build_index", counting_build_index)

    first_response = client.get(f"/api/uploads/{upload_id}/search", params={"q": "platform"})
    second_response = client.get(f"/api/uploads/{upload_id}/search", params={"q": "platform"})

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert build_calls == 1

    preview_path = uploads_root / upload_id / "previews" / f"{table_id}.json"
    preview_payload = json.loads(preview_path.read_text(encoding="utf-8"))
    preview_payload["rows"].append({"team": "gamma", "value": 5})
    preview_payload["rowCount"] = len(preview_payload["rows"])
    time.sleep(0.01)
    preview_path.write_text(json.dumps(preview_payload), encoding="utf-8")

    invalidated_response = client.get(f"/api/uploads/{upload_id}/search", params={"q": "gamma"})

    assert invalidated_response.status_code == 200
    assert build_calls == 2
    payload = invalidated_response.json()["data"]
    assert payload["resultCount"] == 1
    assert payload["results"][0]["tableId"] == table_id
    assert payload["results"][0]["previewRows"][0]["row"]["team"] == "gamma"


def test_search_api_keeps_bounded_preview_search_under_budget_for_large_uploads(
    client: TestClient,
) -> None:
    csv_payload = "team,value\n" + "\n".join(
        f"team-{index},{index}" for index in range(1, 2001)
    )

    upload_response = client.post(
        "/api/uploads",
        files={"file": ("report.csv", csv_payload.encode("utf-8"), "text/csv")},
    )
    upload_id = upload_response.json()["data"]["uploadId"]

    response = client.get(f"/api/uploads/{upload_id}/search", params={"q": "team-12"})

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["resultCount"] == 1
    assert payload["tookMs"] < 500
