from __future__ import annotations

from collections.abc import Iterable
import re

import pandas as pd

from app.pipelines.normalize_tables import NormalizedTableResult
from app.schemas.manifest import ChartPoint, ChartRecommendation, ChartType


class ChartStrategy:
    def __init__(
        self,
        *,
        max_category_points: int = 12,
        max_pie_slices: int = 6,
        max_time_points: int = 24,
    ) -> None:
        self.max_category_points = max_category_points
        self.max_pie_slices = max_pie_slices
        self.max_time_points = max_time_points

    def enrich_table(
        self,
        *,
        sheet_name: str,
        result: NormalizedTableResult,
        source_visual_detected: bool = False,
    ) -> NormalizedTableResult:
        table = result.table
        if table.review_required:
            return self._replace_table(
                result,
                available_chart_types=["table"],
                default_chart_type="table",
                chart_source_type="generated",
                chart_source_reason=(
                    "Review is required before chart generation because the table is "
                    "ambiguous or not safely normalizable."
                ),
                chart_recommendations=[
                    self._build_table_recommendation(
                        description=(
                            "This table stays in readable form until a user confirms the "
                            "structure."
                        )
                    )
                ],
            )

        candidate = self._select_chart_fields(result)
        if candidate is None:
            return self._replace_table(
                result,
                available_chart_types=["table"],
                default_chart_type="table",
                chart_source_type="generated",
                chart_source_reason=(
                    "This table is safer to present as a readable table because it does "
                    "not expose a clear chart-friendly dimension and measure."
                ),
                chart_recommendations=[
                    self._build_table_recommendation(
                        description=(
                            "The available columns are better suited to direct reading than "
                            "to a generated chart."
                        )
                    )
                ],
            )

        dimension, dimension_role, measure, use_row_count = candidate
        source_type, source_reason = self._infer_source_type(
            sheet_name=sheet_name,
            source_visual_detected=source_visual_detected,
        )
        display_dimension = self._format_display_label(dimension)
        display_measure = "Entries" if use_row_count else self._format_display_label(measure)

        if dimension_role == "datetime":
            points, truncated = self._build_time_points(
                frame=result.normalized_frame,
                dimension=dimension,
                measure=measure,
                use_row_count=use_row_count,
            )
            available_chart_types: list[ChartType] = ["line", "area", "column", "table"]
            default_chart_type: ChartType = "line"
        else:
            points, truncated = self._build_category_points(
                frame=result.normalized_frame,
                dimension=dimension,
                measure=measure,
                use_row_count=use_row_count,
            )
            available_chart_types = ["column", "bar"]
            if self._supports_pie(points):
                available_chart_types.append("pie")
            available_chart_types.append("table")
            default_chart_type = "bar" if self._prefer_bar_chart(points) else "column"

        if not points:
            return self._replace_table(
                result,
                available_chart_types=["table"],
                default_chart_type="table",
                chart_source_type="generated",
                chart_source_reason=(
                    "This table is safer to present as a readable table because no stable "
                    "chart points could be derived from the profiled data."
                ),
                chart_recommendations=[
                    self._build_table_recommendation(
                        description=(
                            "The current table data does not produce a trustworthy chart "
                            "shape yet."
                        )
                    )
                ],
            )

        chart_recommendations = [
            self._build_chart_recommendation(
                chart_type=chart_type,
                dimension=display_dimension,
                measure=display_measure,
                points=points,
                truncated=truncated,
            )
            for chart_type in available_chart_types
            if chart_type != "table"
        ]
        chart_recommendations.append(
            self._build_table_recommendation(
                description=(
                    "The readable table remains available whenever a chart would hide detail."
                )
            )
        )

        return self._replace_table(
            result,
            available_chart_types=available_chart_types,
            default_chart_type=default_chart_type,
            chart_source_type=source_type,
            chart_source_reason=source_reason,
            chart_recommendations=chart_recommendations,
        )

    def _replace_table(
        self,
        result: NormalizedTableResult,
        *,
        available_chart_types: list[ChartType],
        default_chart_type: ChartType,
        chart_source_type: str,
        chart_source_reason: str,
        chart_recommendations: list[ChartRecommendation],
    ) -> NormalizedTableResult:
        table = result.table.model_copy(
            update={
                "available_chart_types": available_chart_types,
                "default_chart_type": default_chart_type,
                "chart_source_type": chart_source_type,
                "chart_source_reason": chart_source_reason,
                "chart_recommendations": chart_recommendations,
            }
        )
        return NormalizedTableResult(
            table=table,
            normalized_frame=result.normalized_frame,
            raw_frame=result.raw_frame,
        )

    def _select_chart_fields(
        self,
        result: NormalizedTableResult,
    ) -> tuple[str, str, str, bool] | None:
        table = result.table
        if table.orientation == "matrix_like" or not table.stats.chart_friendly:
            return None

        numeric_columns = [column for column in table.columns if column.role == "numeric"]
        categorical_columns = [
            column for column in table.columns if column.role == "categorical"
        ]
        datetime_columns = [column for column in table.columns if column.role == "datetime"]
        text_columns = [
            column
            for column in table.columns
            if column.role == "text" and column.unique_count <= self.max_category_points
        ]

        measure_candidates = sorted(
            (
                (
                    column.name,
                    self._measure_score(
                        column.name,
                        column.unique_count,
                        table.stats.row_count,
                    ),
                )
                for column in numeric_columns
            ),
            key=lambda item: item[1],
            reverse=True,
        )
        best_measure_name = measure_candidates[0][0] if measure_candidates else None
        best_measure_score = measure_candidates[0][1] if measure_candidates else -10.0

        dimension_candidates = sorted(
            [
                (
                    column.name,
                    "categorical",
                    self._dimension_score(
                        column.name,
                        column.unique_count,
                        table.stats.row_count,
                    ),
                )
                for column in categorical_columns
            ]
            + [
                (
                    column.name,
                    "categorical",
                    self._dimension_score(
                        column.name,
                        column.unique_count,
                        table.stats.row_count,
                    )
                    - 0.15,
                )
                for column in text_columns
            ]
            + [
                (
                    column.name,
                    "datetime",
                    self._datetime_dimension_score(
                        column.name,
                        table.stats.row_count,
                    ),
                )
                for column in datetime_columns
            ],
            key=lambda item: item[2],
            reverse=True,
        )

        best_datetime = next(
            (candidate for candidate in dimension_candidates if candidate[1] == "datetime"),
            None,
        )
        best_category = next(
            (candidate for candidate in dimension_candidates if candidate[1] == "categorical"),
            None,
        )

        if best_datetime and best_measure_name and self._measure_prefers_time_series(
            best_measure_name
        ):
            return best_datetime[0], "datetime", best_measure_name, False

        if best_category and best_measure_name:
            if best_category[2] >= 1.0 and (
                best_measure_score < 0.7
                or not self._measure_prefers_time_series(best_measure_name)
            ):
                return best_category[0], "categorical", best_measure_name, False

        if best_datetime and best_measure_name:
            return best_datetime[0], "datetime", best_measure_name, False

        if best_category and best_measure_name and best_measure_score >= 0.45:
            return best_category[0], "categorical", best_measure_name, False

        if best_category and best_category[2] >= 0.85:
            return best_category[0], "categorical", "__row_count__", True

        return None

    def _infer_source_type(
        self,
        *,
        sheet_name: str,
        source_visual_detected: bool,
    ) -> tuple[str, str]:
        normalized = sheet_name.strip().lower()

        if source_visual_detected:
            return (
                "reused",
                "A source visual was detected for this table, so the dashboard preserves "
                "that report visual first.",
            )

        if any(
            token in normalized
            for token in {
                "summary",
                "overview",
                "executive",
                "kpi",
                "highlight",
                "chart",
                "graph",
                "trend",
                "visual",
                "dashboard",
            }
        ):
            return (
                "reconstructed",
                "The sheet reads like a presentation-oriented summary, so the dashboard "
                "reconstructs a presentation-ready visual from the underlying values.",
            )

        return (
            "generated",
            "No reusable source visual was detected for this table, so the dashboard "
            "generated a safe default chart from the profiled columns.",
        )

    def _build_time_points(
        self,
        *,
        frame: pd.DataFrame,
        dimension: str,
        measure: str,
        use_row_count: bool = False,
    ) -> tuple[list[ChartPoint], bool]:
        selected_columns = [dimension] + ([] if use_row_count else [measure])
        chart_frame = frame.loc[:, selected_columns].copy()
        chart_frame[dimension] = pd.to_datetime(
            chart_frame[dimension],
            errors="coerce",
            format="mixed",
        )
        if use_row_count:
            chart_frame = chart_frame.dropna(subset=[dimension])
        else:
            chart_frame[measure] = pd.to_numeric(chart_frame[measure], errors="coerce")
            chart_frame = chart_frame.dropna()
        if chart_frame.empty:
            return [], False

        if use_row_count:
            grouped = (
                chart_frame.groupby(dimension, as_index=False)
                .size()
                .rename(columns={"size": "value"})
                .sort_values(dimension)
            )
        else:
            grouped = (
                chart_frame.groupby(dimension, as_index=False)[measure]
                .sum()
                .sort_values(dimension)
            )
        truncated = len(grouped.index) > self.max_time_points
        if truncated:
            grouped = grouped.tail(self.max_time_points)

        return (
            [
                ChartPoint(
                    label=_format_timestamp(timestamp),
                    value=float(value),
                )
                for timestamp, value in grouped.itertuples(index=False, name=None)
            ],
            truncated,
        )

    def _build_category_points(
        self,
        *,
        frame: pd.DataFrame,
        dimension: str,
        measure: str,
        use_row_count: bool = False,
    ) -> tuple[list[ChartPoint], bool]:
        selected_columns = [dimension] + ([] if use_row_count else [measure])
        chart_frame = frame.loc[:, selected_columns].copy()
        if use_row_count:
            chart_frame = chart_frame.dropna(subset=[dimension])
        else:
            chart_frame[measure] = pd.to_numeric(chart_frame[measure], errors="coerce")
            chart_frame = chart_frame.dropna(subset=[dimension, measure])
        if chart_frame.empty:
            return [], False

        chart_frame[dimension] = chart_frame[dimension].astype(str).str.strip()
        chart_frame = chart_frame.replace({dimension: {"": None, "nan": None, "None": None}})
        if use_row_count:
            chart_frame = chart_frame.dropna(subset=[dimension])
        else:
            chart_frame = chart_frame.dropna(subset=[dimension, measure])
        if chart_frame.empty:
            return [], False

        if use_row_count:
            grouped = (
                chart_frame.groupby(dimension, as_index=False)
                .size()
                .rename(columns={"size": "value"})
                .sort_values("value", ascending=False)
            )
        else:
            grouped = (
                chart_frame.groupby(dimension, as_index=False)[measure]
                .sum()
                .sort_values(measure, ascending=False)
            )
        truncated = len(grouped.index) > self.max_category_points
        if truncated:
            grouped = grouped.head(self.max_category_points)

        return (
            [
                ChartPoint(
                    label=self._format_point_label(str(label)),
                    value=float(value),
                )
                for label, value in grouped.itertuples(index=False, name=None)
            ],
            truncated,
        )

    def _supports_pie(self, points: Iterable[ChartPoint]) -> bool:
        point_list = list(points)
        return (
            1 < len(point_list) <= self.max_pie_slices
            and all(point.value >= 0 for point in point_list)
            and sum(point.value for point in point_list) > 0
        )

    def _prefer_bar_chart(self, points: Iterable[ChartPoint]) -> bool:
        labels = [point.label for point in points]
        if not labels:
            return False
        average_length = sum(len(label) for label in labels) / len(labels)
        return average_length >= 12 or max(len(label) for label in labels) >= 16

    def _build_chart_recommendation(
        self,
        *,
        chart_type: ChartType,
        dimension: str,
        measure: str,
        points: list[ChartPoint],
        truncated: bool,
    ) -> ChartRecommendation:
        if chart_type in {"line", "area"}:
            title = f"{measure} over {dimension}"
        else:
            title = f"{measure} by {dimension}"

        chart_label = {
            "bar": "Horizontal bar chart",
            "column": "Column chart",
            "line": "Line chart",
            "area": "Area chart",
            "pie": "Pie chart",
            "table": "Table",
        }[chart_type]

        description = (
            f"{chart_label} using {measure} as the measure and {dimension} as the "
            "presentation dimension."
        )
        if truncated:
            description += " The chart is trimmed to the most readable points for MVP."

        return ChartRecommendation(
            chart_type=chart_type,
            title=title,
            description=description,
            dimension_label=dimension,
            measure_label=measure,
            points=points,
            truncated=truncated,
        )

    @staticmethod
    def _build_table_recommendation(*, description: str) -> ChartRecommendation:
        return ChartRecommendation(
            chart_type="table",
            title="Readable table view",
            description=description,
        )

    @staticmethod
    def _measure_score(
        name: str,
        unique_count: int,
        row_count: int,
    ) -> float:
        normalized = name.strip().lower()
        ratio = unique_count / max(row_count, 1)
        score = 0.0

        if any(token in normalized for token in {"close", "revenue", "amount", "total", "value", "price"}):
            score += 1.2
        elif any(token in normalized for token in {"open", "high", "low", "volume"}):
            score += 1.0
        elif any(token in normalized for token in {"time", "duration", "latency", "score", "count"}):
            score += 0.9

        if re.fullmatch(r"column_\d+", normalized):
            score += 0.1

        if any(token in normalized for token in {"id", "transaction", "account", "request"}):
            score -= 1.2
        if unique_count <= 1:
            score -= 0.45
        if ratio >= 0.95 and not any(
            token in normalized
            for token in {
                "close",
                "open",
                "high",
                "low",
                "price",
                "value",
                "time",
                "duration",
                "volume",
            }
        ):
            score -= 0.5

        return score

    def _dimension_score(
        self,
        name: str,
        unique_count: int,
        row_count: int,
    ) -> float:
        normalized = name.strip().lower()
        ratio = unique_count / max(row_count, 1)

        if unique_count < 2:
            return -1.0

        score = 0.0
        if 2 <= unique_count <= self.max_category_points:
            score += 1.2
        elif unique_count <= 40:
            score += 0.85
        elif unique_count <= 100:
            score += 0.45
        else:
            score += 0.1

        if any(
            token in normalized
            for token in {"status", "event", "region", "category", "team", "product", "model", "issue", "summary", "type"}
        ):
            score += 0.3
        if re.fullmatch(r"column_\d+", normalized):
            score -= 0.15
        if len(name) > 48:
            score -= 0.35
        if ratio >= 0.95:
            score -= 0.2

        return score

    @staticmethod
    def _datetime_dimension_score(name: str, row_count: int) -> float:
        normalized = name.strip().lower()
        score = 1.15
        if any(token in normalized for token in {"date", "time", "timestamp"}):
            score += 0.25
        if row_count >= 12:
            score += 0.2
        return score

    @staticmethod
    def _measure_prefers_time_series(name: str) -> bool:
        normalized = name.strip().lower()
        return any(
            token in normalized
            for token in {"close", "open", "high", "low", "price", "revenue", "amount", "value", "volume"}
        )

    @staticmethod
    def _format_display_label(value: str) -> str:
        cleaned = re.sub(r"\s+", " ", value.replace("\n", " ").replace("_", " ")).strip()
        generic_match = re.fullmatch(r"column (\d+)", cleaned.lower())
        if generic_match:
            cleaned = f"Column {generic_match.group(1)}"
        if len(cleaned) > 56:
            return f"{cleaned[:53].rstrip()}..."
        return cleaned

    @staticmethod
    def _format_point_label(value: str) -> str:
        cleaned = re.sub(r"\s+", " ", value.replace("\n", " ")).strip()
        if len(cleaned) > 36:
            return f"{cleaned[:33].rstrip()}..."
        return cleaned


def _format_timestamp(value: pd.Timestamp) -> str:
    if value.hour == 0 and value.minute == 0 and value.second == 0:
        return value.date().isoformat()
    return value.isoformat()
