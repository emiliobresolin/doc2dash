from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from typing import Iterable

import pandas as pd

from app.schemas.manifest import TableBounds, TableSummary


@dataclass
class Region:
    row_start: int
    row_end: int
    col_start: int
    col_end: int
    cells: set[tuple[int, int]] = field(default_factory=set)
    merge_reasons: list[str] = field(default_factory=list)
    merged_count: int = 1

    @property
    def non_empty_count(self) -> int:
        return len(self.cells)


class TableDetector:
    review_threshold: float = 0.6

    def detect_tables(
        self,
        *,
        sheet_id: str,
        grid: pd.DataFrame,
    ) -> list[TableSummary]:
        components = self._find_connected_components(grid)
        merged_regions = self._merge_adjacent_regions(components, grid)
        tables: list[TableSummary] = []

        for index, region in enumerate(merged_regions, start=1):
            confidence, reasons, review_required = self._score_region(region, grid)
            tables.append(
                TableSummary(
                    table_id=f"tbl_{sheet_id.split('_')[-1]}_{index:02d}",
                    sheet_id=sheet_id,
                    bounds=TableBounds(
                        start_row=region.row_start + 1,
                        end_row=region.row_end + 1,
                        start_col=region.col_start + 1,
                        end_col=region.col_end + 1,
                    ),
                    confidence=round(confidence, 2),
                    detection_reasons=reasons,
                    review_required=review_required,
                )
            )

        return tables

    def _find_connected_components(self, grid: pd.DataFrame) -> list[Region]:
        visited: set[tuple[int, int]] = set()
        coordinates = [
            (row_index, col_index)
            for row_index in range(grid.shape[0])
            for col_index in range(grid.shape[1])
            if _is_non_empty(grid.iat[row_index, col_index])
        ]
        components: list[Region] = []

        for start in coordinates:
            if start in visited:
                continue

            queue = deque([start])
            visited.add(start)
            cells: set[tuple[int, int]] = set()

            while queue:
                row_index, col_index = queue.popleft()
                cells.add((row_index, col_index))
                for row_delta, col_delta in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    neighbor = (row_index + row_delta, col_index + col_delta)
                    if (
                        neighbor not in visited
                        and 0 <= neighbor[0] < grid.shape[0]
                        and 0 <= neighbor[1] < grid.shape[1]
                        and _is_non_empty(grid.iat[neighbor[0], neighbor[1]])
                    ):
                        visited.add(neighbor)
                        queue.append(neighbor)

            if len(cells) < 2:
                continue

            rows = [row_index for row_index, _ in cells]
            cols = [col_index for _, col_index in cells]
            components.append(
                Region(
                    row_start=min(rows),
                    row_end=max(rows),
                    col_start=min(cols),
                    col_end=max(cols),
                    cells=cells,
                )
            )

        components.sort(key=lambda region: (region.row_start, region.col_start))
        return components

    def _merge_adjacent_regions(
        self,
        regions: list[Region],
        grid: pd.DataFrame,
    ) -> list[Region]:
        merged_regions = regions[:]
        changed = True

        while changed:
            changed = False
            next_regions: list[Region] = []
            skip_indices: set[int] = set()

            for left_index, left_region in enumerate(merged_regions):
                if left_index in skip_indices:
                    continue

                merged_region = left_region
                for right_index in range(left_index + 1, len(merged_regions)):
                    if right_index in skip_indices:
                        continue

                    right_region = merged_regions[right_index]
                    should_merge, reason = self._should_merge_regions(
                        merged_region,
                        right_region,
                        grid,
                    )
                    if should_merge:
                        merged_region = Region(
                            row_start=min(merged_region.row_start, right_region.row_start),
                            row_end=max(merged_region.row_end, right_region.row_end),
                            col_start=min(merged_region.col_start, right_region.col_start),
                            col_end=max(merged_region.col_end, right_region.col_end),
                            cells=merged_region.cells | right_region.cells,
                            merge_reasons=[
                                *merged_region.merge_reasons,
                                *right_region.merge_reasons,
                                reason,
                            ],
                            merged_count=merged_region.merged_count + right_region.merged_count,
                        )
                        skip_indices.add(right_index)
                        changed = True

                next_regions.append(merged_region)

            merged_regions = sorted(
                next_regions,
                key=lambda region: (region.row_start, region.col_start),
            )

        return merged_regions

    def _should_merge_regions(
        self,
        left: Region,
        right: Region,
        grid: pd.DataFrame,
    ) -> tuple[bool, str]:
        vertical_gap = right.row_start - left.row_end - 1
        horizontal_gap = right.col_start - left.col_end - 1

        if vertical_gap == 1 and _overlap_ratio(
            left.col_start,
            left.col_end,
            right.col_start,
            right.col_end,
        ) >= 0.8:
            if self._looks_like_repeated_header(left, right, grid):
                return False, ""
            if _header_likeness(
                grid.iloc[
                    right.row_start : right.row_end + 1,
                    right.col_start : right.col_end + 1,
                ]
            ) > 0.55:
                return False, ""
            return True, "Merged vertically aligned regions across a single blank separator row"

        if horizontal_gap == 1 and _overlap_ratio(
            left.row_start,
            left.row_end,
            right.row_start,
            right.row_end,
        ) >= 0.8:
            left_frame = grid.iloc[
                left.row_start : left.row_end + 1,
                left.col_start : left.col_end + 1,
            ]
            right_frame = grid.iloc[
                right.row_start : right.row_end + 1,
                right.col_start : right.col_end + 1,
            ]
            if left.row_start == right.row_start and (
                _looks_like_measure_only_region(left_frame)
                or _looks_like_measure_only_region(right_frame)
            ):
                return (
                    True,
                    "Merged horizontally aligned regions across a single blank separator column",
                )
            return False, ""

        return False, ""

    def _looks_like_repeated_header(
        self,
        left: Region,
        right: Region,
        grid: pd.DataFrame,
    ) -> bool:
        left_header = _normalize_row_values(
            grid.iloc[left.row_start, left.col_start : left.col_end + 1].tolist()
        )
        right_header = _normalize_row_values(
            grid.iloc[right.row_start, right.col_start : right.col_end + 1].tolist()
        )
        return bool(left_header) and left_header == right_header

    def _score_region(
        self,
        region: Region,
        grid: pd.DataFrame,
    ) -> tuple[float, list[str], bool]:
        region_frame = grid.iloc[
            region.row_start : region.row_end + 1,
            region.col_start : region.col_end + 1,
        ]
        total_cells = max(region_frame.shape[0] * region_frame.shape[1], 1)
        density = region.non_empty_count / total_cells
        header_score = _header_likeness(region_frame)
        type_score = _type_consistency(region_frame, header_score > 0.55)
        repeated_headers = _find_repeated_headers(region_frame)

        confidence = (
            0.25
            + (density * 0.35)
            + (header_score * 0.2)
            + (type_score * 0.2)
        )
        if repeated_headers:
            confidence -= 0.22
        if density < 0.45:
            confidence -= 0.08
        if region.merged_count > 1:
            confidence -= 0.04

        confidence = max(0.05, min(confidence, 0.99))

        reasons: list[str] = ["Detected a dense non-empty region from the sheet grid"]
        if header_score > 0.55:
            reasons.append("The first row looks like a header row")
        if type_score > 0.55:
            reasons.append("Columns show consistent value types")
        if repeated_headers:
            reasons.append("A repeated header row pattern was found inside the region")
        reasons.extend(reason for reason in region.merge_reasons if reason)

        review_required = confidence < self.review_threshold or bool(repeated_headers)
        if review_required:
            reasons.append(
                "Confidence is below the auto-promote threshold, so this region requires review"
            )

        return confidence, reasons, review_required


def _is_non_empty(value: object) -> bool:
    if value is None:
        return False
    if pd.isna(value):
        return False
    if isinstance(value, str):
        return value.strip() != ""
    return True


def _normalize_row_values(values: Iterable[object]) -> tuple[str, ...]:
    normalized = []
    for value in values:
        if not _is_non_empty(value):
            continue
        normalized.append(str(value).strip().lower())
    return tuple(normalized)


def _overlap_ratio(
    first_start: int,
    first_end: int,
    second_start: int,
    second_end: int,
) -> float:
    overlap = max(0, min(first_end, second_end) - max(first_start, second_start) + 1)
    union = max(first_end, second_end) - min(first_start, second_start) + 1
    if union <= 0:
        return 0.0
    return overlap / union


def _header_likeness(region_frame: pd.DataFrame) -> float:
    if region_frame.empty:
        return 0.0

    first_row = [value for value in region_frame.iloc[0].tolist() if _is_non_empty(value)]
    if not first_row:
        return 0.0

    string_ratio = sum(isinstance(value, str) for value in first_row) / len(first_row)
    unique_ratio = len({str(value).strip().lower() for value in first_row}) / len(first_row)

    next_rows = region_frame.iloc[1:]
    subsequent_values = [
        value
        for row in next_rows.itertuples(index=False)
        for value in row
        if _is_non_empty(value)
    ]
    if subsequent_values:
        subsequent_string_ratio = sum(
            isinstance(value, str) for value in subsequent_values
        ) / len(subsequent_values)
    else:
        subsequent_string_ratio = 1.0

    type_shift = max(0.0, string_ratio - subsequent_string_ratio)
    return min(1.0, (string_ratio * 0.5) + (unique_ratio * 0.25) + (type_shift * 0.25))


def _type_consistency(region_frame: pd.DataFrame, skip_header: bool) -> float:
    frame = region_frame.iloc[1:] if skip_header and len(region_frame.index) > 1 else region_frame
    if frame.empty:
        return 0.0

    scores: list[float] = []
    for _, column in frame.items():
        kinds = [_infer_kind(value) for value in column.tolist() if _is_non_empty(value)]
        if not kinds:
            continue
        dominant_count = Counter(kinds).most_common(1)[0][1]
        scores.append(dominant_count / len(kinds))

    if not scores:
        return 0.0
    return sum(scores) / len(scores)


def _infer_kind(value: object) -> str:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return "number"
    if hasattr(value, "isoformat") and not isinstance(value, str):
        return "datetime"
    return "text"


def _find_repeated_headers(region_frame: pd.DataFrame) -> list[int]:
    if len(region_frame.index) < 3:
        return []

    header_signature = _normalize_row_values(region_frame.iloc[0].tolist())
    repeated_rows: list[int] = []
    for row_index in range(1, len(region_frame.index)):
        row_signature = _normalize_row_values(region_frame.iloc[row_index].tolist())
        if header_signature and row_signature == header_signature:
            repeated_rows.append(row_index)
    return repeated_rows


def _looks_like_measure_only_region(region_frame: pd.DataFrame) -> bool:
    if region_frame.empty or len(region_frame.index) < 2:
        return False

    headers = [str(value).strip() for value in region_frame.iloc[0].tolist() if _is_non_empty(value)]
    if not headers:
        return False

    if sum(_looks_like_measure_header(header) for header in headers) / len(headers) < 0.75:
        return False

    body_values = [
        value
        for row in region_frame.iloc[1:].itertuples(index=False)
        for value in row
        if _is_non_empty(value)
    ]
    if not body_values:
        return False

    numeric_ratio = sum(_infer_kind(value) == "number" for value in body_values) / len(
        body_values
    )
    return numeric_ratio >= 0.85


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
