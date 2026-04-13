from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse

from app.api.deps import get_preview_search_service
from app.schemas.api import ApiResponse
from app.services.preview_search import PreviewSearchService


router = APIRouter(prefix="/api/uploads", tags=["search"])


@router.get("/{upload_id}/search")
def search_upload_preview(
    upload_id: str,
    q: str = Query(default="", alias="q"),
    limit: int | None = Query(default=None, ge=1, le=12),
    preview_search_service: PreviewSearchService = Depends(get_preview_search_service),
) -> JSONResponse:
    result = preview_search_service.search(upload_id=upload_id, query=q, limit=limit)
    response = ApiResponse(data=result.model_dump(by_alias=True, mode="json"))
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=response.model_dump(by_alias=True, mode="json"),
    )
