from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    app_name: str = "doc2dash API"
    uploads_root: Path = PROJECT_ROOT / "data" / "uploads"
    max_upload_size_bytes: int = 30 * 1024 * 1024
    frontend_dist_root: Path | None = None

    model_config = SettingsConfigDict(
        env_prefix="DOC2DASH_",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.uploads_root.mkdir(parents=True, exist_ok=True)
    return settings
