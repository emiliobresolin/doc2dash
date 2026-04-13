from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import pandas as pd

from app.schemas.manifest import (
    NormalizationSummary,
    SourceReference,
    TableBounds,
    TableSummary,
)

Orientation = Literal[
    "long_form",
    "wide_form",
    "matrix_like",
    "not_safely_normalizable",
]


@dataclass
class OrientationDecision:
    orientation: Orientation
    reason: str
    id_columns: list[str]
    value_columns: list[str]


@dataclass
class NormalizedTableResult:
    table: TableSummary
    normalized_frame: pd.DataFrame
    raw_frame: pd.DataFrame


class TableNormalizer:
    def normalize_table(
        self,
        *,
        table: TableSummary,
        grid: pd.DataFrame,
    ) -> NormalizedTableResult:
        raw_frame = self._extract_region(grid, table.bounds)
        structured_frame, raw_columns = self._structure_region(raw_frame)
        source_reference = self._build_source_reference(
            table=table,
            raw_columns=raw_columns,
        )
        decision = self._classify_orientation(
            table=table,
            frame=structured_frame,
        )

        normalized_frame = structured_frame.copy()
        normalization = NormalizationSummary(
            status="none",
            method="none",
            reason=decision.reason,
            id_columns=decision.id_columns,
            value_columns=decision.value_columns,
            output_columns=list(structured_frame.columns),
            source_column_map={column: [column] for column in structured_frame.columns},
        )

        if decision.orientation == "wide_form":
            normalized_frame = structured_frame.melt(
                id_vars=decision.id_columns,
                value_vars=decision.value_columns,
                var_name="variable",
                value_name="value",
            )
            normalization = NormalizationSummary(
                status="melted",
                method="melt",
                reason=decision.reason,
                id_columns=decision.id_columns,
                value_columns=decision.value_columns,
                output_columns=list(normalized_frame.columns),
                variable_column_name="variable",
                value_column_name="value",
                source_column_map={
                    **{column: [column] for column in decision.id_columns},
                    "variable": decision.value_columns,
                    "value": decision.value_columns,
                },
            )
        elif decision.orientation in {"matrix_like", "not_safely_normalizable"}:
            normalization = NormalizationSummary(
                status="skipped",
                method="none",
                reason=decision.reason,
                id_columns=decision.id_columns,
                value_columns=decision.value_columns,
                output_columns=list(structured_frame.columns),
                source_column_map={column: [column] for column in structured_frame.columns},
            )

        enriched_table = table.model_copy(
            update={
                "orientation": decision.orientation,
                "normalization": normalization,
                "source_reference": source_reference,
            }
        )

        return NormalizedTableResult(
            table=enriched_table,
            normalized_frame=normalized_frame.reset_index(drop=True),
            raw_frame=structured_frame.reset_index(drop=True),
        )

    def _extract_region(self, grid: pd.DataFrame, bounds: TableBounds) -> pd.DataFrame:
        return grid.iloc[
            bounds.start_row - 1 : bounds.end_row,
            bounds.start_col - 1 : bounds.end_col,
        ].copy()

    def _structure_region(self, region: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
        if region.empty:
            return pd.DataFrame(), []

        raw_headers = region.iloc[0].tolist()
        header_names = _make_header_names(raw_headers)
        body = region.iloc[1:].copy()
        body.columns = header_names
        body = body.dropna(how="all").reset_index(drop=True)
        body = body.loc[:, ~body.columns.duplicated()]
        return body, header_names

    def _build_source_reference(
        self,
        *,
        table: TableSummary,
        raw_columns: list[str],
    ) -> SourceReference:
        return SourceReference(
            sheet_id=table.sheet_id,
            bounds=table.bounds,
            header_row=table.bounds.start_row,
            data_start_row=table.bounds.start_row + 1,
            raw_columns=raw_columns,
            raw_column_indexes=list(
                range(table.bounds.start_col, table.bounds.end_col + 1)
            ),
        )

    def _classify_orientation(
        self,
        *,
        table: TableSummary,
        frame: pd.DataFrame,
    ) -> OrientationDecision:
        if table.review_required or frame.empty or len(frame.columns) < 2:
            return OrientationDecision(
                orientation="not_safely_normalizable",
                reason=(
                    "The table is ambiguous, empty, or too small to normalize safely."
                ),
                id_columns=[],
                value_columns=[],
            )

        wide_candidate = self._detect_wide_candidate(frame)
        if wide_candidate is not None:
            return wide_candidate

        if self._is_long_form(frame):
            return OrientationDecision(
                orientation="long_form",
                reason="The table already follows a long-form structure, so no reshape was applied.",
                id_columns=[
                    column
                    for column in frame.columns
                    if _series_kind(frame[column]) != "numeric"
                ],
                value_columns=[
                    column
                    for column in frame.columns
                    if _series_kind(frame[column]) == "numeric"
                ],
            )

        if self._is_matrix_like(frame):
            return OrientationDecision(
                orientation="matrix_like",
                reason=(
                    "The table looks like a cross-tab matrix with row and column dimensions,"
                    " so it was preserved as-is."
                ),
                id_columns=[frame.columns[0]],
                value_columns=list(frame.columns[1:]),
            )

        return OrientationDecision(
            orientation="not_safely_normalizable",
            reason="The table structure is mixed or unclear, so normalization was skipped.",
            id_columns=[],
            value_columns=[],
        )

    def _detect_wide_candidate(self, frame: pd.DataFrame) -> OrientationDecision | None:
        columns = list(frame.columns)
        if len(columns) < 3:
            return None

        for split_index in range(1, len(columns) - 1):
            id_columns = columns[:split_index]
            value_columns = columns[split_index:]

            if not id_columns or len(value_columns) < 2:
                continue

            if not all(_series_kind(frame[column]) == "numeric" for column in value_columns):
                continue

            if not _headers_look_like_repeated_measures(value_columns):
                continue

            return OrientationDecision(
                orientation="wide_form",
                reason=(
                    "Trailing columns look like repeated measure headers with numeric values,"
                    " so the table was normalized with melt()."
                ),
                id_columns=id_columns,
                value_columns=value_columns,
            )

        return None

    def _is_long_form(self, frame: pd.DataFrame) -> bool:
        kinds = [_series_kind(frame[column]) for column in frame.columns]
        numeric_count = sum(kind == "numeric" for kind in kinds)
        datetime_count = sum(kind == "datetime" for kind in kinds)
        dimension_count = sum(kind in {"categorical", "text", "datetime"} for kind in kinds)
        return dimension_count >= 1 and (numeric_count + datetime_count) >= 1 and numeric_count <= 2

    def _is_matrix_like(self, frame: pd.DataFrame) -> bool:
        if len(frame.columns) < 3:
            return False
        first_kind = _series_kind(frame.iloc[:, 0])
        remaining_kinds = [_series_kind(frame[column]) for column in frame.columns[1:]]
        return first_kind in {"categorical", "text"} and all(
            kind == "numeric" for kind in remaining_kinds
        )


def _make_header_names(values: list[object]) -> list[str]:
    names: list[str] = []
    seen: dict[str, int] = {}
    for index, value in enumerate(values, start=1):
        if value is None or (isinstance(value, float) and pd.isna(value)):
            candidate = f"column_{index}"
        else:
            candidate = str(value).strip() or f"column_{index}"
        count = seen.get(candidate, 0)
        seen[candidate] = count + 1
        if count:
            candidate = f"{candidate}_{count + 1}"
        names.append(candidate)
    return names


def _headers_look_like_repeated_measures(headers: list[str]) -> bool:
    if len(headers) < 2:
        return False

    matched = sum(_looks_like_measure_header(header) for header in headers)
    return matched / len(headers) >= 0.75


def _looks_like_measure_header(value: str) -> bool:
    normalized = value.strip().lower()
    months = {
        "jan",
        "feb",
        "mar",
        "apr",
        "may",
        "jun",
        "jul",
        "aug",
        "sep",
        "oct",
        "nov",
        "dec",
        "january",
        "february",
        "march",
        "april",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
    }
    if normalized in months:
        return True
    if normalized.startswith("q") and normalized[1:].isdigit():
        return True
    if normalized.isdigit() and len(normalized) in {1, 2, 4}:
        return True
    if len(normalized) == 7 and normalized[4] == "-" and normalized[:4].isdigit():
        return True
    return False


def _series_kind(series: pd.Series) -> str:
    non_empty = series.dropna()
    if non_empty.empty:
        return "not_chart_friendly"

    numeric = pd.to_numeric(non_empty, errors="coerce")
    numeric_ratio = numeric.notna().mean()
    if numeric_ratio >= 0.85:
        return "numeric"

    datetime = pd.to_datetime(non_empty, errors="coerce", format="mixed")
    datetime_ratio = datetime.notna().mean()
    if datetime_ratio >= 0.85:
        return "datetime"

    unique_ratio = non_empty.astype(str).nunique(dropna=True) / len(non_empty)
    average_length = non_empty.astype(str).str.len().mean()

    if unique_ratio <= 0.5:
        return "categorical"
    if average_length > 24 or unique_ratio > 0.8:
        return "text"
    return "categorical"
