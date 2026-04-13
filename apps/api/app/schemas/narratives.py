from typing import Literal

from pydantic import Field, model_validator

from app.schemas.api import CamelModel


RowValue = str | int | float | None
NarrativeStatus = Literal["ready", "unavailable", "invalid", "timeout"]
NarrativeScopeMode = Literal["table", "scopedResult"]


class NarrativePreviewRow(CamelModel):
    row_index: int
    matched_columns: list[str] = Field(default_factory=list)
    row: dict[str, RowValue] = Field(default_factory=dict)


class NarrativeSummaryRequest(CamelModel):
    mode: NarrativeScopeMode
    table_id: str
    query: str | None = None
    matched_columns: list[str] = Field(default_factory=list)
    preview_rows: list[NarrativePreviewRow] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_scope_fields(self) -> "NarrativeSummaryRequest":
        if self.mode == "table":
            return self

        if not self.preview_rows:
            raise ValueError("Scoped narrative requests require preview rows.")
        return self


class NarrativeContent(CamelModel):
    description: str = Field(min_length=1, max_length=240)
    insights: list[str] = Field(min_length=2, max_length=4)
    caveat: str | None = Field(default=None, max_length=180)

    @model_validator(mode="after")
    def validate_insight_lengths(self) -> "NarrativeContent":
        normalized_insights: list[str] = []
        for insight in self.insights:
            trimmed = insight.strip()
            if not trimmed:
                raise ValueError("Narrative insights must not be blank.")
            if len(trimmed) > 180:
                raise ValueError("Narrative insights must be 180 characters or fewer.")
            normalized_insights.append(trimmed)

        self.description = self.description.strip()
        self.insights = normalized_insights
        self.caveat = self.caveat.strip() if self.caveat else None
        return self


class NarrativeScope(CamelModel):
    mode: NarrativeScopeMode
    upload_id: str
    table_id: str
    query: str | None = None


class NarrativeBasis(CamelModel):
    sheet_name: str
    row_count: int
    column_count: int
    confidence: float
    review_required: bool
    default_chart_type: str
    primary_mode: str


class NarrativeSummaryPayload(CamelModel):
    status: NarrativeStatus
    scope: NarrativeScope
    narrative: NarrativeContent | None = None
    basis: NarrativeBasis
    fallback_message: str | None = None
