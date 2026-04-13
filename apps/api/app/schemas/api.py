from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ApiError(CamelModel):
    code: str
    message: str


class ApiResponse(CamelModel):
    data: dict[str, Any] | None = None
    meta: dict[str, Any] = Field(default_factory=dict)
    error: ApiError | None = None


class ArtifactSummary(CamelModel):
    table_artifacts: int = 0
    preview_artifacts: int = 0


class UploadRuntimePayload(CamelModel):
    upload_id: str
    status: Literal["processing", "ready", "failed", "cancelled"]
    created_at: datetime
    updated_at: datetime
    processing_started_at: datetime | None = None
    processing_finished_at: datetime | None = None
    cancellation_requested_at: datetime | None = None
    cancelled_at: datetime | None = None
    failure_message: str | None = None
    recovery_hint: str = ""
    artifact_summary: ArtifactSummary = Field(default_factory=ArtifactSummary)
    log_files: list[str] = Field(default_factory=list)


class SearchPreviewRow(CamelModel):
    row_index: int
    matched_columns: list[str] = Field(default_factory=list)
    row: dict[str, str | int | float | None]


class SearchResult(CamelModel):
    table_id: str
    sheet_id: str
    sheet_name: str
    match_count: int
    matched_columns: list[str] = Field(default_factory=list)
    snippet: str
    preview_rows: list[SearchPreviewRow] = Field(default_factory=list)


class PreviewSearchPayload(CamelModel):
    query: str
    result_count: int
    limit: int
    truncated: bool = False
    took_ms: int = 0
    results: list[SearchResult] = Field(default_factory=list)
