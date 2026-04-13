import pytest

from app.core.errors import AppError
from app.utils.file_validation import validate_upload


def test_validate_upload_accepts_supported_xlsx() -> None:
    result = validate_upload(
        file_name="quarterly-report.xlsx",
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size_bytes=1024,
        max_upload_size_bytes=30 * 1024 * 1024,
    )

    assert result.file_type == "xlsx"
    assert result.safe_file_name == "quarterly-report.xlsx"


def test_validate_upload_rejects_oversized_files() -> None:
    with pytest.raises(AppError) as exc_info:
        validate_upload(
            file_name="huge.csv",
            content_type="text/csv",
            size_bytes=(30 * 1024 * 1024) + 1,
            max_upload_size_bytes=30 * 1024 * 1024,
        )

    assert exc_info.value.status_code == 413
    assert exc_info.value.code == "file_too_large"


def test_validate_upload_rejects_unsupported_extensions() -> None:
    with pytest.raises(AppError) as exc_info:
        validate_upload(
            file_name="report.ods",
            content_type="application/vnd.oasis.opendocument.spreadsheet",
            size_bytes=1024,
            max_upload_size_bytes=30 * 1024 * 1024,
        )

    assert exc_info.value.status_code == 415
    assert exc_info.value.code == "unsupported_file_type"


def test_validate_upload_rejects_invalid_content_type() -> None:
    with pytest.raises(AppError) as exc_info:
        validate_upload(
            file_name="report.csv",
            content_type="application/json",
            size_bytes=512,
            max_upload_size_bytes=30 * 1024 * 1024,
        )

    assert exc_info.value.status_code == 415
    assert exc_info.value.code == "invalid_content_type"
