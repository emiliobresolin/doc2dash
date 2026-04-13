from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import search, uploads
from app.core.config import get_settings
from app.core.errors import AppError
from app.schemas.api import ApiError, ApiResponse


def _resolve_frontend_dist_root() -> Path | None:
    settings = get_settings()
    if settings.frontend_dist_root is None:
        return None

    frontend_dist_root = settings.frontend_dist_root
    index_path = frontend_dist_root / "index.html"
    if not index_path.exists():
        raise RuntimeError(
            f"Hosted frontend mode expected index.html under {frontend_dist_root}, but it was not found."
        )

    return frontend_dist_root


def _register_hosted_frontend(app: FastAPI, frontend_dist_root: Path) -> None:
    index_path = frontend_dist_root / "index.html"
    assets_root = frontend_dist_root / "assets"
    if assets_root.exists():
        app.mount(
            "/assets",
            StaticFiles(directory=str(assets_root)),
            name="frontend-assets",
        )

    @app.get("/", include_in_schema=False, response_model=None)
    async def serve_frontend_index() -> FileResponse:
        return FileResponse(index_path)

    @app.get("/{full_path:path}", include_in_schema=False, response_model=None)
    async def serve_frontend_spa(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})

        requested_path = (frontend_dist_root / full_path).resolve()
        try:
            requested_path.relative_to(frontend_dist_root.resolve())
        except ValueError:
            return JSONResponse(status_code=404, content={"detail": "Not Found"})

        if requested_path.is_file():
            return FileResponse(requested_path)

        return FileResponse(index_path)


def create_app() -> FastAPI:
    app = FastAPI(title="doc2dash API", version="0.1.0")
    app.include_router(uploads.router)
    app.include_router(search.router)

    @app.exception_handler(AppError)
    async def app_error_handler(_, exc: AppError) -> JSONResponse:
        payload = ApiResponse(
            error=ApiError(code=exc.code, message=exc.message),
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=payload.model_dump(by_alias=True, mode="json"),
        )

    frontend_dist_root = _resolve_frontend_dist_root()
    if frontend_dist_root is not None:
        _register_hosted_frontend(app, frontend_dist_root)

    return app


app = create_app()
