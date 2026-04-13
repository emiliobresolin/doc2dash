from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, UploadFile, status
from fastapi.responses import JSONResponse

from app.api.deps import (
    get_upload_bundle_store,
    get_workbook_ingestion_service,
)
from app.core.errors import AppError
from app.core.config import Settings, get_settings
from app.schemas.api import ApiResponse
from app.services.upload_bundle_store import UploadBundlePaths, UploadBundleStore
from app.services.workbook_ingestion import WorkbookIngestionService
from app.utils.file_validation import validate_upload
from app.utils.ids import generate_upload_id


router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
    bundle_store: UploadBundleStore = Depends(get_upload_bundle_store),
    ingestion_service: WorkbookIngestionService = Depends(
        get_workbook_ingestion_service
    ),
) -> JSONResponse:
    payload = await file.read()
    validated_upload = validate_upload(
        file_name=file.filename,
        content_type=file.content_type,
        size_bytes=len(payload),
        max_upload_size_bytes=settings.max_upload_size_bytes,
    )
    ingestion_service.validate_readable_upload(
        validated_upload=validated_upload,
        file_bytes=payload,
    )

    upload_id = generate_upload_id()
    bundle = bundle_store.create_bundle(upload_id)
    bundle_store.save_source_file(bundle, validated_upload.safe_file_name, payload)
    manifest = ingestion_service.build_processing_manifest(
        upload_id=upload_id,
        validated_upload=validated_upload,
    )
    runtime = ingestion_service.build_processing_runtime(upload_id=upload_id)
    bundle_store.write_manifest(bundle, manifest)
    bundle_store.write_runtime(bundle, runtime)
    background_tasks.add_task(
        _process_upload_bundle,
        bundle=bundle,
        bundle_store=bundle_store,
        ingestion_service=ingestion_service,
        upload_id=upload_id,
        validated_upload=validated_upload,
        payload=payload,
    )

    response = ApiResponse(data=manifest.model_dump(by_alias=True, mode="json"))
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content=response.model_dump(by_alias=True, mode="json"),
    )


@router.get("/{upload_id}")
@router.get("/{upload_id}/manifest")
def get_upload_manifest(
    upload_id: str,
    bundle_store: UploadBundleStore = Depends(get_upload_bundle_store),
) -> JSONResponse:
    manifest = bundle_store.read_manifest(upload_id)
    response = ApiResponse(data=manifest.model_dump(by_alias=True, mode="json"))
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=response.model_dump(by_alias=True, mode="json"),
    )


@router.get("/{upload_id}/runtime")
def get_upload_runtime(
    upload_id: str,
    bundle_store: UploadBundleStore = Depends(get_upload_bundle_store),
) -> JSONResponse:
    runtime = bundle_store.read_runtime(upload_id)
    response = ApiResponse(data=runtime.model_dump(by_alias=True, mode="json"))
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=response.model_dump(by_alias=True, mode="json"),
    )


@router.post("/{upload_id}/cancel")
def cancel_upload(
    upload_id: str,
    bundle_store: UploadBundleStore = Depends(get_upload_bundle_store),
    ingestion_service: WorkbookIngestionService = Depends(
        get_workbook_ingestion_service
    ),
) -> JSONResponse:
    bundle = bundle_store.load_bundle(upload_id)
    current_manifest = bundle_store.read_manifest(upload_id)
    current_runtime = bundle_store.read_runtime(upload_id)
    if (
        current_manifest.status != "processing"
        or current_runtime.status != "processing"
    ):
        raise AppError(
            status_code=409,
            code="upload_not_cancellable",
            message=(
                "This upload is no longer processing, so it can't be cancelled. "
                "Start a new upload to prepare another dashboard."
            ),
        )

    message = (
        "This upload was cancelled before the dashboard was fully prepared. "
        "Upload the report again to continue."
    )

    bundle_store.cleanup_generated_artifacts(bundle)
    bundle_store.write_log(
        bundle,
        log_name="cancellation.log",
        message=message,
    )

    cancelled_manifest = ingestion_service.build_cancelled_manifest(
        manifest=current_manifest,
        message=message,
    )
    cancelled_runtime = ingestion_service.build_cancelled_runtime(
        upload_id=upload_id,
        created_at=current_runtime.created_at,
        started_at=current_runtime.processing_started_at,
        log_files=bundle_store.list_log_files(bundle),
    )
    bundle_store.write_manifest(bundle, cancelled_manifest)
    bundle_store.write_runtime(bundle, cancelled_runtime)

    response = ApiResponse(data=cancelled_manifest.model_dump(by_alias=True, mode="json"))
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=response.model_dump(by_alias=True, mode="json"),
    )


@router.get("/{upload_id}/tables/{table_id}/preview")
def get_table_preview(
    upload_id: str,
    table_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, alias="pageSize", ge=5, le=100),
    filter_query: str | None = Query(default=None, alias="filter"),
    bundle_store: UploadBundleStore = Depends(get_upload_bundle_store),
) -> JSONResponse:
    preview = bundle_store.read_preview_artifact(
        upload_id,
        table_id=table_id,
        page=page,
        page_size=page_size,
        filter_query=filter_query,
    )
    response = ApiResponse(data=preview)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=response.model_dump(by_alias=True, mode="json"),
    )


def _process_upload_bundle(
    *,
    bundle: UploadBundlePaths,
    bundle_store: UploadBundleStore,
    ingestion_service: WorkbookIngestionService,
    upload_id: str,
    validated_upload,
    payload: bytes,
) -> None:
    try:
        current_manifest = bundle_store.read_manifest(upload_id)
        if current_manifest.status == "cancelled":
            return

        current_runtime = bundle_store.read_runtime(upload_id)
        result = ingestion_service.build_ingestion_result(
            upload_id=upload_id,
            validated_upload=validated_upload,
            file_bytes=payload,
        )
        current_manifest = bundle_store.read_manifest(upload_id)
        if current_manifest.status == "cancelled":
            bundle_store.cleanup_generated_artifacts(bundle)
            return

        for table_artifact in result.table_artifacts:
            bundle_store.write_table_artifact(
                bundle,
                table_id=table_artifact.table_id,
                payload=table_artifact.payload,
            )
        for preview_artifact in result.preview_artifacts:
            bundle_store.write_preview_artifact(
                bundle,
                table_id=preview_artifact.table_id,
                payload=preview_artifact.payload,
            )
        bundle_store.write_manifest(bundle, result.manifest)
        bundle_store.write_runtime(
            bundle,
            ingestion_service.build_ready_runtime(
                upload_id=upload_id,
                created_at=current_runtime.created_at,
                started_at=current_runtime.processing_started_at,
                table_artifact_count=len(result.table_artifacts),
                preview_artifact_count=len(result.preview_artifacts),
                log_files=bundle_store.list_log_files(bundle),
            ),
        )
    except AppError as exc:
        failed_manifest = ingestion_service.build_failed_manifest(
            upload_id=upload_id,
            validated_upload=validated_upload,
            message=exc.message,
        )
        bundle_store.cleanup_generated_artifacts(bundle)
        bundle_store.write_manifest(bundle, failed_manifest)
        bundle_store.write_log(
            bundle,
            log_name="processing-error.log",
            message=exc.message,
        )
        current_runtime = bundle_store.read_runtime(upload_id)
        bundle_store.write_runtime(
            bundle,
            ingestion_service.build_failed_runtime(
                upload_id=upload_id,
                started_at=current_runtime.processing_started_at,
                message=exc.message,
                log_files=bundle_store.list_log_files(bundle),
            ),
        )
    except Exception as exc:  # pragma: no cover - defensive background safety
        message = "We couldn't finish processing this report. Please upload it again."
        failed_manifest = ingestion_service.build_failed_manifest(
            upload_id=upload_id,
            validated_upload=validated_upload,
            message=message,
        )
        bundle_store.cleanup_generated_artifacts(bundle)
        bundle_store.write_manifest(bundle, failed_manifest)
        bundle_store.write_log(
            bundle,
            log_name="processing-error.log",
            message=str(exc),
        )
        current_runtime = bundle_store.read_runtime(upload_id)
        bundle_store.write_runtime(
            bundle,
            ingestion_service.build_failed_runtime(
                upload_id=upload_id,
                started_at=current_runtime.processing_started_at,
                message=message,
                log_files=bundle_store.list_log_files(bundle),
            ),
        )
