from app.schemas.manifest import DefaultView, SheetSummary, TableSummary


class DefaultViewSelector:
    def select(
        self,
        *,
        sheets: list[SheetSummary],
        tables: list[TableSummary],
    ) -> DefaultView:
        ranked_tables = sorted(
            tables,
            key=self._table_rank,
            reverse=True,
        )
        if ranked_tables:
            selected_table = ranked_tables[0]
            return DefaultView(
                sheet_id=selected_table.sheet_id,
                table_id=selected_table.table_id,
                view_type="summary_dashboard",
            )

        first_non_empty_sheet = next((sheet for sheet in sheets if not sheet.is_empty), None)
        return DefaultView(
            sheet_id=first_non_empty_sheet.sheet_id if first_non_empty_sheet else None,
            table_id=None,
            view_type="summary_dashboard",
        )

    @staticmethod
    def _table_rank(table: TableSummary) -> tuple[int, float, float, float, float, float, float]:
        return (
            0 if table.review_required else 1,
            DefaultViewSelector._presentation_mode_score(table.stats.primary_mode),
            DefaultViewSelector._chart_default_score(table),
            DefaultViewSelector._signal_score(table),
            DefaultViewSelector._density_score(table),
            1 if table.default_chart_type != "table" else 0,
            table.confidence,
            DefaultViewSelector._orientation_score(table.orientation),
        )

    @staticmethod
    def _presentation_mode_score(primary_mode: str) -> float:
        if primary_mode == "chart":
            return 2.0
        if primary_mode == "summary":
            return 1.5
        return 0.0

    @staticmethod
    def _signal_score(table: TableSummary) -> float:
        row_count = table.stats.row_count
        column_count = table.stats.column_count

        if row_count <= 0 or column_count <= 0:
            return -2.0
        if row_count == 1 and column_count == 1:
            return -1.5
        if row_count == 1:
            return -0.8 + min(column_count, 8) * 0.05
        if column_count == 1 and row_count <= 6:
            return -0.6 + min(row_count, 12) * 0.04

        score = min(row_count, 40) / 40 + min(column_count, 8) / 8

        if row_count >= 5:
            score += 0.35
        if row_count >= 15:
            score += 0.25
        if row_count >= 50 and column_count <= 8:
            score += 0.2
        if column_count >= 3:
            score += 0.2
        if column_count >= 5:
            score += 0.15
        if column_count > 16:
            score -= 0.15
        if table.default_chart_type == "table" and row_count >= 200 and column_count >= 10:
            score -= 0.45
        if table.default_chart_type == "table" and row_count >= 25 and column_count >= 8:
            score -= 0.2

        return score

    @staticmethod
    def _chart_default_score(table: TableSummary) -> float:
        if table.default_chart_type == "line":
            return 1.2
        if table.default_chart_type == "area":
            return 1.05
        if table.default_chart_type == "bar":
            return 0.95
        if table.default_chart_type == "column":
            return 0.9
        if table.default_chart_type == "pie":
            return 0.7
        return -0.2

    @staticmethod
    def _density_score(table: TableSummary) -> float:
        row_count = table.stats.row_count
        column_count = table.stats.column_count

        if table.default_chart_type == "table":
            if row_count >= 2000 and column_count >= 16:
                return -0.75
            if row_count >= 500 and column_count >= 12:
                return -0.45
            if row_count >= 100 and column_count >= 10:
                return -0.2
            return 0.0

        if row_count >= 200 and column_count <= 8:
            return 0.35
        if row_count >= 20 and column_count <= 8:
            return 0.2
        return 0.0

    @staticmethod
    def _orientation_score(orientation: str | None) -> float:
        if orientation == "long_form":
            return 1.0
        if orientation == "wide_form":
            return 0.9
        if orientation == "matrix_like":
            return 0.6
        if orientation == "not_safely_normalizable":
            return 0.3
        return 0.0
