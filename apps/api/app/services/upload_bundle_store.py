import json
import math
import re
from hashlib import sha256
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.core.errors import AppError
from app.schemas.api import UploadRuntimePayload
from app.schemas.manifest import UploadManifest


@dataclass(frozen=True)
class UploadBundlePaths:
    upload_id: str
    root: Path
    source_dir: Path
    tables_dir: Path
    previews_dir: Path
    narratives_dir: Path
    logs_dir: Path
    manifest_path: Path
    runtime_path: Path


class UploadBundleStore:
    def __init__(self, uploads_root: Path) -> None:
        self.uploads_root = uploads_root

    def create_bundle(self, upload_id: str) -> UploadBundlePaths:
        root = self.uploads_root / upload_id
        source_dir = root / "source"
        tables_dir = root / "tables"
        previews_dir = root / "previews"
        narratives_dir = root / "narratives"
        logs_dir = root / "logs"

        for path in (source_dir, tables_dir, previews_dir, narratives_dir, logs_dir):
            path.mkdir(parents=True, exist_ok=True)

        return UploadBundlePaths(
            upload_id=upload_id,
            root=root,
            source_dir=source_dir,
            tables_dir=tables_dir,
            previews_dir=previews_dir,
            narratives_dir=narratives_dir,
            logs_dir=logs_dir,
            manifest_path=root / "manifest.json",
            runtime_path=root / "runtime.json",
        )

    def load_bundle(self, upload_id: str) -> UploadBundlePaths:
        root = self.uploads_root / upload_id
        if not root.exists():
            raise AppError(
                status_code=404,
                code="upload_not_found",
                message="We couldn't find that upload. Please upload the report again.",
            )

        return UploadBundlePaths(
            upload_id=upload_id,
            root=root,
            source_dir=root / "source",
            tables_dir=root / "tables",
            previews_dir=root / "previews",
            narratives_dir=root / "narratives",
            logs_dir=root / "logs",
            manifest_path=root / "manifest.json",
            runtime_path=root / "runtime.json",
        )

    def save_source_file(
        self,
        bundle: UploadBundlePaths,
        file_name: str,
        payload: bytes,
    ) -> Path:
        file_path = bundle.source_dir / Path(file_name).name
        file_path.write_bytes(payload)
        return file_path

    def write_manifest(
        self,
        bundle: UploadBundlePaths,
        manifest: UploadManifest,
    ) -> Path:
        bundle.manifest_path.write_text(
            json.dumps(
                manifest.model_dump(by_alias=True, mode="json"),
                indent=2,
            ),
            encoding="utf-8",
        )
        return bundle.manifest_path

    def read_manifest(self, upload_id: str) -> UploadManifest:
        bundle = self.load_bundle(upload_id)
        if not bundle.manifest_path.exists():
            raise AppError(
                status_code=404,
                code="manifest_not_found",
                message="This upload is not ready yet. Please try again in a moment.",
            )
        return UploadManifest.model_validate_json(
            bundle.manifest_path.read_text(encoding="utf-8")
        )

    def write_runtime(
        self,
        bundle: UploadBundlePaths,
        runtime: UploadRuntimePayload,
    ) -> Path:
        bundle.runtime_path.write_text(
            json.dumps(
                runtime.model_dump(by_alias=True, mode="json"),
                indent=2,
            ),
            encoding="utf-8",
        )
        return bundle.runtime_path

    def read_runtime(self, upload_id: str) -> UploadRuntimePayload:
        bundle = self.load_bundle(upload_id)
        if not bundle.runtime_path.exists():
            raise AppError(
                status_code=404,
                code="runtime_not_found",
                message="We couldn't find runtime details for that upload.",
            )
        return UploadRuntimePayload.model_validate_json(
            bundle.runtime_path.read_text(encoding="utf-8")
        )

    def write_table_artifact(
        self,
        bundle: UploadBundlePaths,
        *,
        table_id: str,
        payload: dict[str, object],
    ) -> Path:
        artifact_path = bundle.tables_dir / f"{table_id}.json"
        artifact_path.write_text(
            json.dumps(payload, indent=2),
            encoding="utf-8",
        )
        return artifact_path

    def write_preview_artifact(
        self,
        bundle: UploadBundlePaths,
        *,
        table_id: str,
        payload: dict[str, object],
    ) -> Path:
        preview_path = bundle.previews_dir / f"{table_id}.json"
        preview_path.write_text(
            json.dumps(payload, indent=2),
            encoding="utf-8",
        )
        return preview_path

    def read_table_artifact(self, upload_id: str, *, table_id: str) -> dict[str, object]:
        bundle = self.load_bundle(upload_id)
        table_path = bundle.tables_dir / f"{table_id}.json"
        if not table_path.exists():
            raise AppError(
                status_code=404,
                code="table_artifact_not_found",
                message="We couldn't find source rows for that table yet.",
            )
        return json.loads(table_path.read_text(encoding="utf-8"))

    def read_cached_narrative(
        self,
        upload_id: str,
        *,
        cache_key: str,
    ) -> dict[str, object] | None:
        bundle = self.load_bundle(upload_id)
        cache_path = self._narrative_cache_path(bundle, cache_key)
        if not cache_path.exists():
            return None
        return json.loads(cache_path.read_text(encoding="utf-8"))

    def write_cached_narrative(
        self,
        bundle: UploadBundlePaths,
        *,
        cache_key: str,
        payload: dict[str, object],
    ) -> Path:
        cache_path = self._narrative_cache_path(bundle, cache_key)
        cache_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return cache_path

    def write_log(
        self,
        bundle: UploadBundlePaths,
        *,
        log_name: str,
        message: str,
    ) -> Path:
        log_path = bundle.logs_dir / log_name
        log_path.write_text(message, encoding="utf-8")
        return log_path

    def cleanup_generated_artifacts(self, bundle: UploadBundlePaths) -> None:
        for directory in (bundle.tables_dir, bundle.previews_dir, bundle.narratives_dir):
            if not directory.exists():
                continue
            for artifact in directory.glob("*.json"):
                artifact.unlink(missing_ok=True)

    def read_preview_artifact(
        self,
        upload_id: str,
        *,
        table_id: str,
        page: int = 1,
        page_size: int = 25,
        filter_query: str | None = None,
    ) -> dict[str, object]:
        bundle = self.load_bundle(upload_id)
        table_path = bundle.tables_dir / f"{table_id}.json"
        if table_path.exists():
            payload = json.loads(table_path.read_text(encoding="utf-8"))
            rows = self._prepare_preview_rows(list(payload.get("normalizedRows", [])))
            columns = list(payload.get("normalizedColumns", []))
            rows = self._filter_preview_rows(rows, filter_query)
            total_rows = len(rows)
            total_pages = max(1, math.ceil(total_rows / page_size)) if page_size > 0 else 1
            bounded_page = max(1, min(page, total_pages))
            start_index = (bounded_page - 1) * page_size
            end_index = start_index + page_size
            return {
                "tableId": table_id,
                "sheetId": payload.get("sheetId"),
                "columns": columns,
                "rows": rows[start_index:end_index],
                "rowCount": total_rows,
                "page": bounded_page,
                "pageSize": page_size,
                "totalPages": total_pages,
                "hasPreviousPage": bounded_page > 1,
                "hasNextPage": bounded_page < total_pages,
            }

        preview_path = bundle.previews_dir / f"{table_id}.json"
        if not preview_path.exists():
            raise AppError(
                status_code=404,
                code="preview_not_found",
                message="We couldn't find preview data for that table yet.",
            )
        payload = json.loads(preview_path.read_text(encoding="utf-8"))
        rows = self._prepare_preview_rows(list(payload.get("rows", [])))
        rows = self._filter_preview_rows(rows, filter_query)
        total_rows = len(rows)
        total_pages = max(1, math.ceil(total_rows / page_size)) if page_size > 0 else 1
        bounded_page = max(1, min(page, total_pages))
        start_index = (bounded_page - 1) * page_size
        end_index = start_index + page_size
        payload.setdefault("page", 1)
        payload["rows"] = rows[start_index:end_index]
        payload["rowCount"] = total_rows
        payload["page"] = bounded_page
        payload["pageSize"] = page_size
        payload["totalPages"] = total_pages
        payload["hasPreviousPage"] = bounded_page > 1
        payload["hasNextPage"] = bounded_page < total_pages
        return payload

    def list_log_files(self, bundle: UploadBundlePaths) -> list[str]:
        if not bundle.logs_dir.exists():
            return []
        return sorted(path.name for path in bundle.logs_dir.glob("*") if path.is_file())

    @staticmethod
    def _filter_preview_rows(
        rows: list[dict[str, Any]],
        filter_query: str | None,
    ) -> list[dict[str, Any]]:
        trimmed_query = (filter_query or "").strip().casefold()
        if not trimmed_query:
            return rows

        filtered_rows: list[dict[str, Any]] = []
        for row in rows:
            if any(trimmed_query in str(value).casefold() for value in row.values()):
                filtered_rows.append(row)
        return filtered_rows

    @classmethod
    def _prepare_preview_rows(
        cls,
        rows: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        if not rows:
            return rows

        candidate_rows = rows
        first_row = rows[0]
        if cls._looks_like_embedded_header_row(first_row):
            candidate_rows = rows[1:]

        filtered_rows = [
            row for row in candidate_rows if not cls._is_placeholder_row(row)
        ]
        return filtered_rows or candidate_rows or rows

    @staticmethod
    def _is_placeholder_row(row: dict[str, Any]) -> bool:
        for value in row.values():
            if value is None:
                continue
            if isinstance(value, bool):
                return False
            if isinstance(value, (int, float)):
                if value != 0:
                    return False
                continue

            normalized = str(value).strip().casefold()
            if normalized not in {"", "-", "—", "n/a", "na", "none", "null"}:
                return False

        return True

    @staticmethod
    def _looks_like_embedded_header_row(row: dict[str, Any]) -> bool:
        values = [value for value in row.values() if value is not None and str(value).strip()]
        if len(values) < 2:
            return False

        generic_column_names = sum(
            1 for column_name in row if re.fullmatch(r"column_\d+", column_name.casefold())
        )
        if generic_column_names == 0:
            return False

        token_like_values = 0
        for value in values:
            if isinstance(value, (int, float, bool)):
                return False
            normalized = str(value).strip()
            if re.fullmatch(r"[A-Za-z][A-Za-z0-9_ /#().-]{0,40}", normalized):
                token_like_values += 1

        return token_like_values >= max(2, len(values) - 1)

    @staticmethod
    def _narrative_cache_path(bundle: UploadBundlePaths, cache_key: str) -> Path:
        digest = sha256(cache_key.encode("utf-8")).hexdigest()[:20]
        return bundle.narratives_dir / f"summary-{digest}.json"
