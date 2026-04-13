from __future__ import annotations

import json
import time
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from app.schemas.api import PreviewSearchPayload, SearchPreviewRow, SearchResult
from app.services.upload_bundle_store import UploadBundleStore


@dataclass(frozen=True)
class IndexedPreviewRow:
    row_index: int
    row: dict[str, str | int | float | None]
    normalized_values: dict[str, str]
    blob: str


@dataclass(frozen=True)
class IndexedPreviewTable:
    table_id: str
    sheet_id: str
    sheet_name: str
    rows: list[IndexedPreviewRow]


@dataclass(frozen=True)
class PreviewSearchIndex:
    signature: tuple[tuple[str, int], ...]
    tables: list[IndexedPreviewTable]


class PreviewSearchService:
    def __init__(
        self,
        bundle_store: UploadBundleStore,
        *,
        default_limit: int = 6,
        max_limit: int = 12,
        preview_rows_per_result: int = 3,
    ) -> None:
        self.bundle_store = bundle_store
        self.default_limit = default_limit
        self.max_limit = max_limit
        self.preview_rows_per_result = preview_rows_per_result
        self._cache: dict[str, PreviewSearchIndex] = {}

    def search(
        self,
        *,
        upload_id: str,
        query: str,
        limit: int | None = None,
    ) -> PreviewSearchPayload:
        started_at = time.perf_counter()
        normalized_query = _normalize_text(query)
        bounded_limit = self._bound_limit(limit)

        if len(normalized_query) < 2:
            return PreviewSearchPayload(
                query=query,
                result_count=0,
                limit=bounded_limit,
                results=[],
                took_ms=self._elapsed_ms(started_at),
            )

        tokens = [token for token in normalized_query.split(" ") if token]
        if not tokens:
            return PreviewSearchPayload(
                query=query,
                result_count=0,
                limit=bounded_limit,
                results=[],
                took_ms=self._elapsed_ms(started_at),
            )

        index = self._get_or_build_index(upload_id)
        matches: list[tuple[int, SearchResult]] = []
        for table in index.tables:
            matched_rows: list[tuple[int, IndexedPreviewRow, list[str]]] = []
            matched_columns_counter: Counter[str] = Counter()
            for row in table.rows:
                if not all(token in row.blob for token in tokens):
                    continue

                matched_columns = [
                    column
                    for column, value in row.normalized_values.items()
                    if any(token in value for token in tokens)
                ]
                if not matched_columns:
                    continue

                row_score = len(matched_columns) + sum(
                    row.blob.count(token) for token in tokens
                )
                matched_rows.append((row_score, row, matched_columns))
                matched_columns_counter.update(matched_columns)

            if not matched_rows:
                continue

            matched_rows.sort(
                key=lambda item: (
                    -item[0],
                    item[1].row_index,
                )
            )
            top_row = matched_rows[0]
            top_columns = [
                column
                for column, _count in matched_columns_counter.most_common(3)
            ]
            result = SearchResult(
                table_id=table.table_id,
                sheet_id=table.sheet_id,
                sheet_name=table.sheet_name,
                match_count=len(matched_rows),
                matched_columns=top_columns,
                snippet=self._build_snippet(
                    row=top_row[1],
                    matched_columns=top_row[2],
                ),
                preview_rows=[
                    SearchPreviewRow(
                        row_index=row.row_index,
                        matched_columns=matched_columns,
                        row=row.row,
                    )
                    for _score, row, matched_columns in matched_rows[
                        : self.preview_rows_per_result
                    ]
                ],
            )
            table_score = sum(score for score, _row, _columns in matched_rows)
            matches.append((table_score, result))

        matches.sort(
            key=lambda item: (
                -item[0],
                item[1].sheet_name.lower(),
                item[1].table_id,
            )
        )
        truncated = len(matches) > bounded_limit
        limited_results = [result for _score, result in matches[:bounded_limit]]

        return PreviewSearchPayload(
            query=query,
            result_count=len(limited_results),
            limit=bounded_limit,
            truncated=truncated,
            took_ms=self._elapsed_ms(started_at),
            results=limited_results,
        )

    def _get_or_build_index(self, upload_id: str) -> PreviewSearchIndex:
        bundle = self.bundle_store.load_bundle(upload_id)
        signature = self._build_signature(bundle.previews_dir)
        cached = self._cache.get(upload_id)
        if cached and cached.signature == signature:
            return cached

        index = self._build_index(
            upload_id=upload_id,
            signature=signature,
            previews_dir=bundle.previews_dir,
        )
        self._cache[upload_id] = index
        return index

    def _build_index(
        self,
        *,
        upload_id: str,
        signature: tuple[tuple[str, int], ...],
        previews_dir: Path,
    ) -> PreviewSearchIndex:
        manifest = self.bundle_store.read_manifest(upload_id)
        sheet_lookup = {sheet.sheet_id: sheet.name for sheet in manifest.sheets}
        tables: list[IndexedPreviewTable] = []
        for preview_path in sorted(previews_dir.glob("*.json")):
            payload = json.loads(preview_path.read_text(encoding="utf-8"))
            rows = []
            for row_index, row in enumerate(payload.get("rows", [])):
                normalized_values = {
                    column: _normalize_text(value)
                    for column, value in row.items()
                }
                blob = " ".join(value for value in normalized_values.values() if value)
                rows.append(
                    IndexedPreviewRow(
                        row_index=row_index,
                        row=row,
                        normalized_values=normalized_values,
                        blob=blob,
                    )
                )

            sheet_id = str(payload.get("sheetId", ""))
            tables.append(
                IndexedPreviewTable(
                    table_id=str(payload.get("tableId", preview_path.stem)),
                    sheet_id=sheet_id,
                    sheet_name=sheet_lookup.get(sheet_id, "Unknown sheet"),
                    rows=rows,
                )
            )

        return PreviewSearchIndex(signature=signature, tables=tables)

    @staticmethod
    def _build_signature(previews_dir: Path) -> tuple[tuple[str, int], ...]:
        return tuple(
            sorted(
                (
                    preview_path.name,
                    preview_path.stat().st_mtime_ns,
                )
                for preview_path in previews_dir.glob("*.json")
            )
        )

    @staticmethod
    def _build_snippet(
        *,
        row: IndexedPreviewRow,
        matched_columns: list[str],
    ) -> str:
        if matched_columns:
            parts = [
                f"{column}: {row.row.get(column, '')}"
                for column in matched_columns[:2]
            ]
            return " | ".join(parts)

        parts = [
            f"{column}: {value}"
            for column, value in row.row.items()
            if value not in (None, "")
        ]
        return " | ".join(parts[:2])

    def _bound_limit(self, requested_limit: int | None) -> int:
        if requested_limit is None:
            return self.default_limit
        return max(1, min(requested_limit, self.max_limit))

    @staticmethod
    def _elapsed_ms(started_at: float) -> int:
        return int((time.perf_counter() - started_at) * 1000)


def _normalize_text(value: object) -> str:
    if value is None:
        return ""
    return " ".join(str(value).strip().lower().split())
