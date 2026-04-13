from pathlib import Path
import shutil
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.deps import clear_preview_search_service_cache
from app.core.config import get_settings
from app.main import create_app


def _write_frontend_dist(dist_root: Path) -> None:
    assets_root = dist_root / "assets"
    assets_root.mkdir(parents=True, exist_ok=True)
    (dist_root / "index.html").write_text(
        """
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>doc2dash</title>
  </head>
  <body>
    <div id="root">doc2dash hosted app</div>
    <script type="module" src="/assets/app.js"></script>
  </body>
</html>
""".strip(),
        encoding="utf-8",
    )
    (assets_root / "app.js").write_text("console.log('doc2dash hosted app');", encoding="utf-8")


@pytest.fixture
def hosted_client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    runtime_root = Path(__file__).resolve().parents[3] / "data" / "test-hosted"
    runtime_root.mkdir(parents=True, exist_ok=True)
    test_root = runtime_root / f"hosted-{uuid4().hex}"
    uploads_root = test_root / "uploads"
    frontend_dist_root = test_root / "frontend-dist"
    uploads_root.mkdir(parents=True, exist_ok=True)
    _write_frontend_dist(frontend_dist_root)

    monkeypatch.setenv("DOC2DASH_UPLOADS_ROOT", str(uploads_root))
    monkeypatch.setenv("DOC2DASH_FRONTEND_DIST_ROOT", str(frontend_dist_root))
    get_settings.cache_clear()
    clear_preview_search_service_cache()

    yield TestClient(create_app())

    clear_preview_search_service_cache()
    get_settings.cache_clear()
    shutil.rmtree(test_root, ignore_errors=True)


def test_hosted_mode_serves_frontend_entry_at_root(hosted_client: TestClient) -> None:
    response = hosted_client.get("/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "doc2dash hosted app" in response.text


def test_hosted_mode_serves_spa_fallback_for_upload_routes(hosted_client: TestClient) -> None:
    response = hosted_client.get("/uploads/upl_demo")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "doc2dash hosted app" in response.text


def test_hosted_mode_never_shadows_api_routes_with_frontend_fallback(
    hosted_client: TestClient,
) -> None:
    missing_api_route = hosted_client.get("/api/does-not-exist")

    assert missing_api_route.status_code == 404
    assert missing_api_route.headers["content-type"].startswith("application/json")
    assert missing_api_route.json() == {"detail": "Not Found"}

    known_api_route = hosted_client.get("/api/uploads/upl_missing/manifest")

    assert known_api_route.status_code == 404
    assert known_api_route.headers["content-type"].startswith("application/json")
    assert known_api_route.json()["error"]["code"] == "upload_not_found"
