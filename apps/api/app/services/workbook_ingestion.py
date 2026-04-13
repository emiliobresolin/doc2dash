import json
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO

import pandas as pd

from app.core.errors import AppError
from app.pipelines.detect_tables import TableDetector
from app.pipelines.normalize_tables import TableNormalizer
from app.pipelines.profile_tables import TableProfiler
from app.pipelines.select_default_view import DefaultViewSelector
from app.schemas.api import ArtifactSummary, UploadRuntimePayload
from app.schemas.manifest import (
    DefaultView,
    ManifestSource,
    SheetSummary,
    TableSummary,
    UploadManifest,
    WorkbookSummary,
)
from app.services.chart_strategy import ChartStrategy
from app.utils.file_validation import ValidatedUpload


@dataclass(frozen=True)
class TableArtifact:
    table_id: str
    payload: dict[str, object]


@dataclass(frozen=True)
class PreviewArtifact:
    table_id: str
    payload: dict[str, object]


@dataclass(frozen=True)
class WorkbookIngestionResult:
    manifest: UploadManifest
    table_artifacts: list[TableArtifact]
    preview_artifacts: list[PreviewArtifact]


class WorkbookIngestionService:
    def __init__(
        self,
        table_detector: TableDetector | None = None,
        table_normalizer: TableNormalizer | None = None,
        table_profiler: TableProfiler | None = None,
        chart_strategy: ChartStrategy | None = None,
        default_view_selector: DefaultViewSelector | None = None,
        preview_row_limit: int = 12,
    ) -> None:
        self.table_detector = table_detector or TableDetector()
        self.table_normalizer = table_normalizer or TableNormalizer()
        self.table_profiler = table_profiler or TableProfiler()
        self.chart_strategy = chart_strategy or ChartStrategy()
        self.default_view_selector = default_view_selector or DefaultViewSelector()
        self.preview_row_limit = preview_row_limit

    def validate_readable_upload(
        self,
        *,
        validated_upload: ValidatedUpload,
        file_bytes: bytes,
    ) -> None:
        try:
            if validated_upload.file_type == "xlsx":
                pd.read_excel(BytesIO(file_bytes), sheet_name=None, nrows=1)
                return

            pd.read_csv(BytesIO(file_bytes), nrows=1)
        except Exception as exc:  # pragma: no cover - exercised via service tests
            self._raise_corrupt_file_error(exc)

    def build_processing_manifest(
        self,
        *,
        upload_id: str,
        validated_upload: ValidatedUpload,
    ) -> UploadManifest:
        return UploadManifest(
            upload_id=upload_id,
            status="processing",
            source=ManifestSource(
                file_name=validated_upload.safe_file_name,
                file_type=validated_upload.file_type,
                size_bytes=validated_upload.size_bytes,
            ),
            workbook=WorkbookSummary(sheet_count=0, table_count=0, warnings=[]),
            default_view=DefaultView(view_type="summary_dashboard"),
            sheets=[],
            tables=[],
        )

    def build_processing_runtime(
        self,
        *,
        upload_id: str,
    ) -> UploadRuntimePayload:
        now = self._now()
        return UploadRuntimePayload(
            upload_id=upload_id,
            status="processing",
            created_at=now,
            updated_at=now,
            processing_started_at=now,
            recovery_hint="Processing is still running. Keep this route open or check back in a moment.",
        )

    def build_failed_manifest(
        self,
        *,
        upload_id: str,
        validated_upload: ValidatedUpload,
        message: str,
    ) -> UploadManifest:
        return UploadManifest(
            upload_id=upload_id,
            status="failed",
            source=ManifestSource(
                file_name=validated_upload.safe_file_name,
                file_type=validated_upload.file_type,
                size_bytes=validated_upload.size_bytes,
            ),
            workbook=WorkbookSummary(sheet_count=0, table_count=0, warnings=[message]),
            default_view=DefaultView(view_type="summary_dashboard"),
            sheets=[],
            tables=[],
        )

    def build_failed_runtime(
        self,
        *,
        upload_id: str,
        started_at: datetime | None,
        message: str,
        log_files: list[str] | None = None,
    ) -> UploadRuntimePayload:
        now = self._now()
        created_at = started_at or now
        return UploadRuntimePayload(
            upload_id=upload_id,
            status="failed",
            created_at=created_at,
            updated_at=now,
            processing_started_at=started_at or created_at,
            processing_finished_at=now,
            failure_message=message,
            recovery_hint="We couldn't finish this upload. Review the failure details and upload the report again.",
            log_files=log_files or [],
        )

    def build_cancelled_manifest(
        self,
        *,
        manifest: UploadManifest,
        message: str,
    ) -> UploadManifest:
        next_manifest = manifest.model_copy(deep=True)
        next_manifest.status = "cancelled"
        next_manifest.tables = []
        next_manifest.default_view = DefaultView(view_type="summary_dashboard")
        next_manifest.workbook.table_count = 0
        next_manifest.workbook.warnings = [message]
        return next_manifest

    def build_cancelled_runtime(
        self,
        *,
        upload_id: str,
        created_at: datetime | None,
        started_at: datetime | None,
        log_files: list[str] | None = None,
    ) -> UploadRuntimePayload:
        now = self._now()
        origin = created_at or started_at or now
        return UploadRuntimePayload(
            upload_id=upload_id,
            status="cancelled",
            created_at=origin,
            updated_at=now,
            processing_started_at=started_at or origin,
            processing_finished_at=now,
            cancellation_requested_at=now,
            cancelled_at=now,
            recovery_hint="This upload was cancelled. Upload the report again when you are ready to rebuild the dashboard.",
            log_files=log_files or [],
        )

    def build_ready_runtime(
        self,
        *,
        upload_id: str,
        created_at: datetime | None,
        started_at: datetime | None,
        table_artifact_count: int,
        preview_artifact_count: int,
        log_files: list[str] | None = None,
    ) -> UploadRuntimePayload:
        now = self._now()
        origin = created_at or started_at or now
        return UploadRuntimePayload(
            upload_id=upload_id,
            status="ready",
            created_at=origin,
            updated_at=now,
            processing_started_at=started_at or origin,
            processing_finished_at=now,
            recovery_hint="Dashboard artifacts are ready. Open the upload route to review or present the report.",
            artifact_summary=ArtifactSummary(
                table_artifacts=table_artifact_count,
                preview_artifacts=preview_artifact_count,
            ),
            log_files=log_files or [],
        )

    def build_manifest(
        self,
        upload_id: str,
        validated_upload: ValidatedUpload,
        file_bytes: bytes,
    ) -> UploadManifest:
        return self.build_ingestion_result(
            upload_id=upload_id,
            validated_upload=validated_upload,
            file_bytes=file_bytes,
        ).manifest

    def build_ingestion_result(
        self,
        *,
        upload_id: str,
        validated_upload: ValidatedUpload,
        file_bytes: bytes,
    ) -> WorkbookIngestionResult:
        sheet_frames = self._read_sheet_frames(validated_upload.file_type, file_bytes)
        detection_grids = self._read_detection_grids(validated_upload.file_type, file_bytes)
        sheets: list[SheetSummary] = []
        tables: list[TableSummary] = []
        table_artifacts: list[TableArtifact] = []
        preview_artifacts: list[PreviewArtifact] = []
        for order, (sheet_name, dataframe) in enumerate(sheet_frames.items(), start=1):
            sheet_id = f"sheet_{order:02d}"
            is_empty = self._is_empty_sheet(dataframe)

            sheets.append(
                SheetSummary(
                    sheet_id=sheet_id,
                    name=sheet_name,
                    order=order,
                    row_count=int(dataframe.shape[0]),
                    column_count=int(dataframe.shape[1]),
                    is_empty=is_empty,
                )
            )

            grid = detection_grids.get(sheet_name, pd.DataFrame())
            detected_tables = self.table_detector.detect_tables(sheet_id=sheet_id, grid=grid)
            enriched_tables = []
            for detected_table in detected_tables:
                normalized = self.table_normalizer.normalize_table(
                    table=detected_table,
                    grid=grid,
                )
                profiled = self.table_profiler.profile_table(normalized)
                charted = self.chart_strategy.enrich_table(
                    sheet_name=sheet_name,
                    result=profiled,
                )
                enriched_tables.append(charted.table)
                table_artifacts.append(self._build_table_artifact(charted))
                preview_artifacts.append(self._build_preview_artifact(charted))

            tables.extend(enriched_tables)
        default_view = self.default_view_selector.select(
            sheets=sheets,
            tables=tables,
        )

        return WorkbookIngestionResult(
            manifest=UploadManifest(
                upload_id=upload_id,
                status="ready",
                source=ManifestSource(
                    file_name=validated_upload.safe_file_name,
                    file_type=validated_upload.file_type,
                    size_bytes=validated_upload.size_bytes,
                ),
                workbook=WorkbookSummary(
                    sheet_count=len(sheets),
                    table_count=len(tables),
                    warnings=[],
                ),
                default_view=default_view,
                sheets=sheets,
                tables=tables,
            ),
            table_artifacts=table_artifacts,
            preview_artifacts=preview_artifacts,
        )

    def _read_sheet_frames(
        self,
        file_type: str,
        file_bytes: bytes,
    ) -> dict[str, pd.DataFrame]:
        try:
            if file_type == "xlsx":
                return pd.read_excel(BytesIO(file_bytes), sheet_name=None)

            dataframe = pd.read_csv(BytesIO(file_bytes))
            return {"Sheet1": dataframe}
        except Exception as exc:  # pragma: no cover - exercised via service tests
            self._raise_corrupt_file_error(exc)

    def _read_detection_grids(
        self,
        file_type: str,
        file_bytes: bytes,
    ) -> dict[str, pd.DataFrame]:
        try:
            if file_type == "xlsx":
                return pd.read_excel(BytesIO(file_bytes), sheet_name=None, header=None)

            dataframe = pd.read_csv(BytesIO(file_bytes), header=None)
            return {"Sheet1": dataframe}
        except Exception as exc:  # pragma: no cover - exercised via service tests
            self._raise_corrupt_file_error(exc)

    @staticmethod
    def _is_empty_sheet(dataframe: pd.DataFrame) -> bool:
        if dataframe.empty:
            return True

        without_empty_rows = dataframe.dropna(how="all")
        return without_empty_rows.empty

    def _build_table_artifact(self, result) -> TableArtifact:
        return TableArtifact(
            table_id=result.table.table_id,
            payload={
                "tableId": result.table.table_id,
                "sheetId": result.table.sheet_id,
                "orientation": result.table.orientation,
                "normalizationStatus": result.table.normalization.status,
                "normalizedColumns": list(result.normalized_frame.columns),
                "normalizedRows": self._frame_to_records(result.normalized_frame),
                "rawColumns": list(result.raw_frame.columns),
                "rawRows": self._frame_to_records(result.raw_frame),
                "availableChartTypes": result.table.available_chart_types,
                "defaultChartType": result.table.default_chart_type,
                "chartSourceType": result.table.chart_source_type,
                "chartSourceReason": result.table.chart_source_reason,
                "chartRecommendations": [
                    recommendation.model_dump(by_alias=True, mode="json")
                    for recommendation in result.table.chart_recommendations
                ],
            },
        )

    def _build_preview_artifact(self, result) -> PreviewArtifact:
        preview_frame = result.normalized_frame.head(self.preview_row_limit)
        return PreviewArtifact(
            table_id=result.table.table_id,
            payload={
                "tableId": result.table.table_id,
                "sheetId": result.table.sheet_id,
                "columns": list(preview_frame.columns),
                "rows": self._frame_to_records(preview_frame),
                "rowCount": int(result.normalized_frame.shape[0]),
            },
        )

    @staticmethod
    def _frame_to_records(frame: pd.DataFrame) -> list[dict[str, object]]:
        if frame.empty:
            return []
        return json.loads(frame.to_json(orient="records", date_format="iso"))

    @staticmethod
    def _raise_corrupt_file_error(exc: Exception) -> None:
        raise AppError(
            status_code=400,
            code="corrupt_file",
            message="We couldn't read this file. Please upload a valid .xlsx or .csv report.",
        ) from exc

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)
