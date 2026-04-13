# Story 1.3: Normalize Wide Tables And Profile Columns

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,  
I want the app to normalize and profile the data safely,  
so that the resulting visuals and summaries match the meaning of the spreadsheet.

## Acceptance Criteria

1. The backend classifies detected tables as long-form, wide-form, matrix-like, or not-safely-normalizable using deterministic rules.
2. Wide tables are reshaped into long form only when repeated-measure patterns are clear, and the normalization metadata explains what changed and why.
3. Long-form tables remain intact and retain provenance to the raw source rows and columns.
4. Column profiling infers core roles such as numeric, categorical, datetime, text, and not-chart-friendly, plus summary statistics needed for later chart strategy.
5. Unit and integration tests cover wide-to-long reshaping, no-op long-form preservation, mixed-type columns, and non-chart-friendly tables.

## Tasks / Subtasks

- [x] Implement orientation classification rules (AC: 1)
  - [x] Distinguish between long-form, wide-form, matrix-like, and ambiguous structures
  - [x] Base the decision on header patterns, identifier columns, and repeated measures
- [x] Implement safe normalization for wide tables (AC: 2, 3)
  - [x] Use `melt()` where repeated-measure patterns are clear
  - [x] Preserve source row/column provenance and transformation reasons
  - [x] Leave ambiguous or unsafe tables unnormalized
- [x] Add raw/original table traceability (AC: 2, 3)
  - [x] Store raw/original references in manifest metadata
  - [x] Preserve enough information for later "view source" UI behavior
- [x] Implement table profiling and chartability metadata (AC: 4)
  - [x] Infer core column roles and summary stats
  - [x] Mark when a table should stay primarily tabular or summary-based rather than chart-driven
  - [x] Prepare profile outputs that later chart strategy can consume without finalizing chart choices here
- [x] Add backend tests for normalization and profiling (AC: 5)
  - [x] Unit tests for reshape rules and type inference
  - [x] Integration tests using fixture workbooks with mixed layouts

## Dev Notes

- This story should not yet decide the final chart shown to the user. It should produce trustworthy normalization and profiling metadata for story `2.2`.
- Preserve source meaning over aggressive reshaping. If the normalization is not obviously safe, leave the table in reviewable form.
- Store enough provenance for future presentation mode and audit flows to show what changed.
- Keep the chartability signal conservative. "No chart" is better than a misleading chart.

### Project Structure Notes

- Expected backend files:
  - `apps/api/app/pipelines/normalize_tables.py`
  - `apps/api/app/pipelines/profile_tables.py`
  - `apps/api/app/schemas/manifest.py`
- Expected tests:
  - `apps/api/tests/unit/test_normalize_tables.py`
  - `apps/api/tests/unit/test_profile_tables.py`
  - `apps/api/tests/integration/test_normalize_profile_pipeline.py`

### References

- Architecture canonical data model: [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- Architecture report-intent and provenance rules: [Source: _bmad-output/planning-artifacts/architecture.md#Report Intent Preservation]
- Architecture implementation patterns: [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- Product normalization and profiling requirements: [Source: _bmad-output/planning-artifacts/prd.md#FR4-Orientation-Detection-And-Normalization]
- Product chartability requirement: [Source: _bmad-output/planning-artifacts/prd.md#FR5-Data-Profiling]
- Epic breakdown for story 1.3: [Source: _bmad-output/planning-artifacts/epics.md#Story-13-Normalize-Wide-Tables-And-Profile-Columns]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Start with failing normalization and profiling tests.
- Implement orientation classification first, then reshaping and provenance.
- Add chartability and summary-stat outputs last, after the normalization rules are stable.

### Debug Log References

- `python -m pytest`

### Completion Notes List

- Added deterministic orientation classification for `long_form`, `wide_form`, `matrix_like`, and `not_safely_normalizable`.
- Implemented safe wide-table normalization with `melt()` only when repeated measure headers are clear.
- Added source-traceability metadata covering raw bounds, header row, data start row, and original source columns.
- Implemented column profiling for numeric, categorical, datetime, text, and not-chart-friendly roles with table-level chartability metadata.
- Wired normalization and profiling into workbook ingestion so upload manifests now include orientation, normalization, columns, stats, and source reference metadata.
- Added unit and integration coverage for wide-to-long reshaping, long-form preservation, mixed-type fallback, and workbook-level normalization/profile metadata.
- Tightened role inference so short label dimensions remain chartable as `categorical` while obvious note/comment fields stay `text`, which restores safe defaults for Epic 2 chart selection.

### File List

- apps/api/app/pipelines/normalize_tables.py
- apps/api/app/pipelines/profile_tables.py
- apps/api/app/schemas/manifest.py
- apps/api/app/services/workbook_ingestion.py
- apps/api/tests/unit/test_normalize_tables.py
- apps/api/tests/unit/test_profile_tables.py
- apps/api/tests/integration/test_normalize_profile_pipeline.py

## Change Log

- 2026-04-04: Story created and marked `ready-for-dev`.
- 2026-04-04: Implemented normalization, provenance, profiling, and automated tests; status moved to `review`.
- 2026-04-04: Corrected categorical-vs-text profiling heuristics after Epic 1 QA remediation.
