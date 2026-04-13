from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from app.core.errors import AppError


SUPPORTED_EXTENSIONS: dict[str, Literal["xlsx", "csv"]] = {
    ".xlsx": "xlsx",
    ".csv": "csv",
}

ALLOWED_CONTENT_TYPES: dict[str, set[str]] = {
    ".xlsx": {
        "application/octet-stream",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    ".csv": {
        "application/csv",
        "application/octet-stream",
        "application/vnd.ms-excel",
        "text/csv",
        "text/plain",
    },
}


@dataclass(frozen=True)
class ValidatedUpload:
    file_name: str
    safe_file_name: str
    file_type: Literal["xlsx", "csv"]
    content_type: str | None
    size_bytes: int


def validate_upload(
    *,
    file_name: str | None,
    content_type: str | None,
    size_bytes: int,
    max_upload_size_bytes: int,
) -> ValidatedUpload:
    if not file_name:
        raise AppError(
            status_code=400,
            code="missing_file_name",
            message="The uploaded file must include a file name.",
        )

    safe_file_name = Path(file_name).name
    extension = Path(safe_file_name).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise AppError(
            status_code=415,
            code="unsupported_file_type",
            message="Only .xlsx and .csv files up to 30 MB are supported.",
        )

    if size_bytes > max_upload_size_bytes:
        raise AppError(
            status_code=413,
            code="file_too_large",
            message="This file is larger than 30 MB. Upload a file up to 30 MB.",
        )

    allowed_content_types = ALLOWED_CONTENT_TYPES[extension]
    if content_type not in allowed_content_types:
        raise AppError(
            status_code=415,
            code="invalid_content_type",
            message=(
                "The uploaded file content type does not match a valid .xlsx or .csv upload."
            ),
        )

    return ValidatedUpload(
        file_name=file_name,
        safe_file_name=safe_file_name,
        file_type=SUPPORTED_EXTENSIONS[extension],
        content_type=content_type,
        size_bytes=size_bytes,
    )
