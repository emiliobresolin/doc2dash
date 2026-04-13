from io import BytesIO

import pandas as pd
import pytest

from app.core.errors import AppError
from app.services.workbook_ingestion import WorkbookIngestionService
from app.utils.file_validation import ValidatedUpload


def build_excel_bytes(sheet_map: dict[str, pd.DataFrame]) -> bytes:
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        for sheet_name, dataframe in sheet_map.items():
            dataframe.to_excel(writer, sheet_name=sheet_name, index=False)
    return buffer.getvalue()


def test_build_manifest_uses_pandas_read_excel_with_all_sheets(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = WorkbookIngestionService()
    called_with: dict[str, object] = {}

    def fake_read_excel(
        payload: BytesIO,
        sheet_name: object = None,
        **kwargs: object,
    ) -> dict[str, pd.DataFrame]:
        called_with["sheet_name"] = sheet_name
        called_with["header"] = kwargs.get("header", "default")
        assert isinstance(payload, BytesIO)
        return {
            "Sales": pd.DataFrame({"Revenue": [100, 120]}),
            "Summary": pd.DataFrame(),
        }

    monkeypatch.setattr(pd, "read_excel", fake_read_excel)

    manifest = service.build_manifest(
        upload_id="upl_test",
        validated_upload=ValidatedUpload(
            file_name="sales.xlsx",
            safe_file_name="sales.xlsx",
            file_type="xlsx",
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            size_bytes=1024,
        ),
        file_bytes=b"placeholder",
    )

    assert called_with["sheet_name"] is None
    assert called_with["header"] is None
    assert manifest.workbook.sheet_count == 2
    assert manifest.sheets[0].name == "Sales"
    assert manifest.default_view.sheet_id == "sheet_01"
    assert manifest.workbook.table_count == 1
    assert manifest.tables[0].sheet_id == "sheet_01"
    assert manifest.tables[0].default_chart_type == "table"
    assert manifest.tables[0].available_chart_types == ["table"]


def test_build_manifest_wraps_csv_as_synthetic_sheet() -> None:
    service = WorkbookIngestionService()
    manifest = service.build_manifest(
        upload_id="upl_csv",
        validated_upload=ValidatedUpload(
            file_name="report.csv",
            safe_file_name="report.csv",
            file_type="csv",
            content_type="text/csv",
            size_bytes=32,
        ),
        file_bytes=b"product,revenue\nA,10\nB,20\n",
    )

    assert manifest.workbook.sheet_count == 1
    assert manifest.sheets[0].name == "Sheet1"
    assert manifest.sheets[0].row_count == 2
    assert manifest.sheets[0].column_count == 2
    assert manifest.presentation.presenter_mode_available is True
    assert manifest.default_view.view_type == "summary_dashboard"
    assert manifest.tables[0].default_chart_type == "column"
    assert manifest.tables[0].available_chart_types == ["column", "bar", "pie", "table"]
    assert manifest.tables[0].chart_source_type == "generated"


def test_build_manifest_marks_empty_sheets_and_prefers_first_non_empty_sheet() -> None:
    service = WorkbookIngestionService()
    workbook = build_excel_bytes(
        {
            "Empty": pd.DataFrame(),
            "Sales": pd.DataFrame({"Revenue": [100]}),
        }
    )

    manifest = service.build_manifest(
        upload_id="upl_empty",
        validated_upload=ValidatedUpload(
            file_name="empty-first.xlsx",
            safe_file_name="empty-first.xlsx",
            file_type="xlsx",
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            size_bytes=len(workbook),
        ),
        file_bytes=workbook,
    )

    assert manifest.sheets[0].name == "Empty"
    assert manifest.sheets[0].is_empty is True
    assert manifest.sheets[1].name == "Sales"
    assert manifest.sheets[1].is_empty is False
    assert manifest.default_view.sheet_id == "sheet_02"
    assert [sheet.order for sheet in manifest.sheets] == [1, 2]


def test_build_manifest_rejects_corrupt_workbooks() -> None:
    service = WorkbookIngestionService()

    with pytest.raises(AppError) as exc_info:
        service.build_manifest(
            upload_id="upl_bad",
            validated_upload=ValidatedUpload(
                file_name="broken.xlsx",
                safe_file_name="broken.xlsx",
                file_type="xlsx",
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                size_bytes=11,
            ),
            file_bytes=b"not an excel workbook",
        )

    assert exc_info.value.code == "corrupt_file"
