import shutil
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.deps import clear_preview_search_service_cache
from app.core.config import get_settings
from app.main import create_app


@pytest.fixture
def uploads_root(monkeypatch: pytest.MonkeyPatch) -> Path:
    runtime_root = Path(__file__).resolve().parents[3] / "data" / "test-uploads"
    runtime_root.mkdir(parents=True, exist_ok=True)
    root = runtime_root / f"uploads-{uuid4().hex}"
    root.mkdir(parents=True, exist_ok=False)
    monkeypatch.setenv("DOC2DASH_UPLOADS_ROOT", str(root))
    get_settings.cache_clear()
    clear_preview_search_service_cache()
    yield root
    clear_preview_search_service_cache()
    get_settings.cache_clear()
    shutil.rmtree(root, ignore_errors=True)


@pytest.fixture
def client(uploads_root: Path) -> TestClient:
    app = create_app()
    return TestClient(app)
