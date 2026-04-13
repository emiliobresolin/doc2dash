from functools import lru_cache
from pathlib import Path

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.services.preview_search import PreviewSearchService
from app.services.upload_bundle_store import UploadBundleStore
from app.services.workbook_ingestion import WorkbookIngestionService


def get_upload_bundle_store(
    settings: Settings = Depends(get_settings),
) -> UploadBundleStore:
    return UploadBundleStore(settings.uploads_root)


def get_workbook_ingestion_service() -> WorkbookIngestionService:
    return WorkbookIngestionService()


@lru_cache(maxsize=8)
def _get_preview_search_service_for_root(uploads_root: str) -> PreviewSearchService:
    return PreviewSearchService(UploadBundleStore(Path(uploads_root)))


def clear_preview_search_service_cache() -> None:
    _get_preview_search_service_for_root.cache_clear()


def get_preview_search_service(
    settings: Settings = Depends(get_settings),
) -> PreviewSearchService:
    return _get_preview_search_service_for_root(str(settings.uploads_root))
