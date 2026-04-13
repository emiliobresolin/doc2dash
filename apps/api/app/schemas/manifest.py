from datetime import datetime, timezone
from typing import Literal

from pydantic import Field

from app.schemas.api import CamelModel

ChartType = Literal["bar", "column", "line", "area", "pie", "table"]
ChartSourceType = Literal["reused", "reconstructed", "generated"]


class ManifestSource(CamelModel):
    file_name: str
    file_type: Literal["xlsx", "csv"]
    size_bytes: int
    uploaded_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    uploaded_by: str | None = None


class WorkbookSummary(CamelModel):
    sheet_count: int
    table_count: int = 0
    warnings: list[str] = Field(default_factory=list)


class PresentationState(CamelModel):
    default_mode: Literal["analysis"] = "analysis"
    presenter_mode_available: bool = True


class DefaultView(CamelModel):
    sheet_id: str | None = None
    table_id: str | None = None
    view_type: str = "summary_dashboard"


class SheetSummary(CamelModel):
    sheet_id: str
    name: str
    order: int
    row_count: int
    column_count: int
    is_empty: bool


class TableBounds(CamelModel):
    start_row: int
    end_row: int
    start_col: int
    end_col: int


class SourceReference(CamelModel):
    sheet_id: str
    bounds: TableBounds
    header_row: int
    data_start_row: int
    raw_columns: list[str] = Field(default_factory=list)
    raw_column_indexes: list[int] = Field(default_factory=list)


class NormalizationSummary(CamelModel):
    status: Literal["none", "melted", "skipped"] = "none"
    method: Literal["none", "melt"] = "none"
    reason: str = ""
    id_columns: list[str] = Field(default_factory=list)
    value_columns: list[str] = Field(default_factory=list)
    output_columns: list[str] = Field(default_factory=list)
    variable_column_name: str | None = None
    value_column_name: str | None = None
    source_column_map: dict[str, list[str]] = Field(default_factory=dict)


class ColumnProfile(CamelModel):
    name: str
    role: Literal[
        "numeric",
        "categorical",
        "datetime",
        "text",
        "not_chart_friendly",
    ]
    dtype: str
    source_columns: list[str] = Field(default_factory=list)
    null_count: int = 0
    unique_count: int = 0
    chart_friendly: bool = False
    stats: dict[str, int | float | str | list[str] | None] = Field(default_factory=dict)


class TableStats(CamelModel):
    row_count: int = 0
    column_count: int = 0
    numeric_column_count: int = 0
    categorical_column_count: int = 0
    datetime_column_count: int = 0
    text_column_count: int = 0
    not_chart_friendly_column_count: int = 0
    chart_friendly: bool = False
    primary_mode: Literal["chart", "summary", "table"] = "table"
    reason: str = ""


class ChartPoint(CamelModel):
    label: str
    value: float


class ChartRecommendation(CamelModel):
    chart_type: ChartType
    title: str
    description: str
    dimension_label: str | None = None
    measure_label: str | None = None
    points: list[ChartPoint] = Field(default_factory=list)
    truncated: bool = False


class TableSummary(CamelModel):
    table_id: str
    sheet_id: str
    bounds: TableBounds
    confidence: float
    detection_reasons: list[str] = Field(default_factory=list)
    orientation: Literal[
        "long_form",
        "wide_form",
        "matrix_like",
        "not_safely_normalizable",
    ] | None = None
    normalization: NormalizationSummary = Field(default_factory=NormalizationSummary)
    columns: list[ColumnProfile] = Field(default_factory=list)
    stats: TableStats = Field(default_factory=TableStats)
    source_reference: SourceReference | None = None
    review_required: bool = False
    available_chart_types: list[ChartType] = Field(default_factory=lambda: ["table"])
    default_chart_type: ChartType = "table"
    chart_source_type: ChartSourceType = "generated"
    chart_source_reason: str = (
        "No reusable source visual was detected for this table."
    )
    chart_recommendations: list[ChartRecommendation] = Field(default_factory=list)


class UploadManifest(CamelModel):
    upload_id: str
    status: Literal["processing", "ready", "failed", "cancelled"] = "ready"
    source: ManifestSource
    workbook: WorkbookSummary
    presentation: PresentationState = Field(default_factory=PresentationState)
    default_view: DefaultView = Field(default_factory=DefaultView)
    sheets: list[SheetSummary] = Field(default_factory=list)
    tables: list[TableSummary] = Field(default_factory=list)
