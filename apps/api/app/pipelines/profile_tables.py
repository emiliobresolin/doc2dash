from __future__ import annotations

from collections import Counter

import pandas as pd

from app.pipelines.normalize_tables import NormalizedTableResult
from app.schemas.manifest import ColumnProfile, TableStats


class TableProfiler:
    def profile_table(self, result: NormalizedTableResult) -> NormalizedTableResult:
        frame = result.normalized_frame
        column_profiles = [
            self._profile_column(
                frame[column],
                source_columns=result.table.normalization.source_column_map.get(
                    column, [column]
                ),
            )
            for column in frame.columns
        ]
        stats = self._build_table_stats(result.table.orientation, column_profiles, frame)
        table = result.table.model_copy(
            update={
                "columns": column_profiles,
                "stats": stats,
            }
        )
        return NormalizedTableResult(
            table=table,
            normalized_frame=result.normalized_frame,
            raw_frame=result.raw_frame,
        )

    def _profile_column(
        self,
        series: pd.Series,
        *,
        source_columns: list[str],
    ) -> ColumnProfile:
        non_null = series.dropna()
        dtype = str(series.dtype)
        role = self._infer_role(series)
        stats = _build_column_stats(series, role)
        return ColumnProfile(
            name=str(series.name),
            role=role,
            dtype=dtype,
            source_columns=source_columns,
            null_count=int(series.isna().sum()),
            unique_count=int(non_null.astype(str).nunique()) if not non_null.empty else 0,
            chart_friendly=role in {"numeric", "categorical", "datetime"},
            stats=stats,
        )

    def _infer_role(self, series: pd.Series) -> str:
        non_null = series.dropna()
        if non_null.empty:
            return "not_chart_friendly"

        numeric = pd.to_numeric(non_null, errors="coerce")
        numeric_ratio = numeric.notna().mean()
        datetime = pd.to_datetime(non_null, errors="coerce", format="mixed")
        datetime_ratio = datetime.notna().mean()

        if 0.25 < numeric_ratio < 0.85:
            return "not_chart_friendly"
        if numeric_ratio >= 0.85:
            return "numeric"
        if 0.25 < datetime_ratio < 0.85:
            return "not_chart_friendly"
        if datetime_ratio >= 0.85:
            return "datetime"

        as_text = non_null.astype(str)
        normalized_name = str(series.name).strip().lower()
        unique_ratio = as_text.nunique() / len(as_text)
        average_length = as_text.str.len().mean()
        average_word_count = as_text.str.split().str.len().mean()

        if any(
            token in normalized_name
            for token in {"note", "comment", "description", "detail", "details", "summary"}
        ):
            return "text"

        if unique_ratio <= 0.5:
            return "categorical"
        if average_word_count > 2 or average_length > 24:
            return "text"
        return "categorical"

    def _build_table_stats(
        self,
        orientation: str | None,
        columns: list[ColumnProfile],
        frame: pd.DataFrame,
    ) -> TableStats:
        counts = Counter(column.role for column in columns)
        can_support_structured_chart = (
            counts["numeric"] >= 1 and (counts["categorical"] + counts["datetime"]) >= 1
        )
        can_support_summary_counts = counts["categorical"] >= 1 and int(frame.shape[0]) >= 4

        if orientation == "matrix_like":
            primary_mode = "table"
            reason = "This table is safer as a readable table or summary than as a chart-driven view."
        elif orientation == "not_safely_normalizable" and can_support_structured_chart:
            if counts["datetime"] >= 1:
                primary_mode = "chart"
                reason = (
                    "This table keeps a mixed source structure, but it still preserves a "
                    "clear time-series shape for a chart-first view."
                )
            else:
                primary_mode = "summary"
                reason = (
                    "This table keeps a mixed source structure, but it still supports a "
                    "condensed presentation view instead of a raw extraction dump."
                )
        elif orientation == "not_safely_normalizable" and can_support_summary_counts:
            primary_mode = "summary"
            reason = (
                "This table is structurally mixed, but repeated categories still support a "
                "grouped presentation summary."
            )
        elif not can_support_structured_chart:
            primary_mode = "table"
            reason = "This table is safer as a readable table or summary than as a chart-driven view."
        elif counts["numeric"] >= 2 and counts["categorical"] == 0:
            primary_mode = "summary"
            reason = "This table has measurable values but limited chart-friendly dimensions."
        else:
            primary_mode = "chart"
            reason = "This table has clear dimensions and measures that support later chart selection."

        return TableStats(
            row_count=int(frame.shape[0]),
            column_count=int(frame.shape[1]),
            numeric_column_count=counts["numeric"],
            categorical_column_count=counts["categorical"],
            datetime_column_count=counts["datetime"],
            text_column_count=counts["text"],
            not_chart_friendly_column_count=counts["not_chart_friendly"],
            chart_friendly=can_support_structured_chart or can_support_summary_counts,
            primary_mode=primary_mode,
            reason=reason,
        )


def _build_column_stats(series: pd.Series, role: str) -> dict[str, int | float | str | list[str] | None]:
    non_null = series.dropna()
    if non_null.empty:
        return {}

    if role == "numeric":
        numeric = pd.to_numeric(non_null, errors="coerce").dropna()
        return {
            "min": float(numeric.min()),
            "max": float(numeric.max()),
            "mean": float(numeric.mean()),
            "sum": float(numeric.sum()),
        }

    if role == "datetime":
        datetime = pd.to_datetime(non_null, errors="coerce", format="mixed").dropna()
        return {
            "min": datetime.min().isoformat() if not datetime.empty else None,
            "max": datetime.max().isoformat() if not datetime.empty else None,
        }

    text_values = non_null.astype(str)
    top_values = [value for value, _ in Counter(text_values).most_common(3)]
    return {
        "topValues": top_values,
        "sampleValues": text_values.head(3).tolist(),
    }
