# Story 1.2: Detect Sheet And Table Boundaries

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,  
I want the app to find the real tables inside each sheet,  
so that I do not have to manually separate data blocks myself.

## Acceptance Criteria

1. The backend detects one or more candidate tables per sheet using deterministic heuristics over non-empty regions, separators, repeated headers, and cell-type consistency.
2. Each detected table stores explicit bounds, confidence score, and human-readable detection reasons in the manifest.
3. The detector handles common messy-report layouts including blank rows, blank columns, repeated header rows, and multiple dense table regions on the same sheet.
4. Low-confidence detections enter a `review_required` path in metadata instead of being silently promoted into trustworthy presentation output.
5. Unit and integration tests cover single-table sheets, multi-table sheets, separator-driven splits, and ambiguous layouts.

## Tasks / Subtasks

- [x] Implement sheet-grid analysis and candidate region extraction (AC: 1, 3)
  - [x] Convert workbook sheets into a detector-friendly grid representation
  - [x] Identify contiguous non-empty regions and blank-row/blank-column separators
  - [x] Preserve original sheet coordinates for every candidate region
- [x] Implement heuristic scoring for table boundaries (AC: 1, 2, 3)
  - [x] Score header-likeness, density, repeated-header patterns, and type consistency
  - [x] Merge or split candidate regions only when the structure supports it
  - [x] Record `detectionReasons` that can be surfaced in the UI later
- [x] Persist table boundary metadata into the manifest (AC: 2, 4)
  - [x] Add `bounds`, `confidence`, `detectionReasons`, and provisional `reviewRequired` fields to table entries
  - [x] Ensure multi-table sheets are represented as separate tables
- [x] Define low-confidence behavior for ambiguous detections (AC: 4)
  - [x] Establish a threshold or rule set for `review_required`
  - [x] Prevent ambiguous tables from being treated as presentation-ready by default
- [x] Add backend tests for boundary detection (AC: 5)
  - [x] Unit tests with synthetic grids for separators and repeated headers
  - [x] Integration tests using messy workbook fixtures

## Dev Notes

- Keep the detector deterministic. This story is heuristics-first and must not depend on AI/ML services.
- The detector should produce rich metadata, not final presentation decisions. It creates trustworthy structural inputs for later normalization and chart strategy stories.
- Treat ambiguous output as a valid product state. The goal is not to guess harder; the goal is to avoid misleading the user.
- Do not add normalization or chart generation here beyond what is required to classify regions structurally.

### Project Structure Notes

- Expected backend files:
  - `apps/api/app/pipelines/detect_tables.py`
  - `apps/api/app/schemas/manifest.py`
  - `apps/api/app/services/workbook_ingestion.py`
- Expected tests:
  - `apps/api/tests/unit/test_detect_tables.py`
  - `apps/api/tests/integration/test_detect_tables_manifest.py`

### References

- Architecture critical decisions: [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- Architecture report-intent and review-required rules: [Source: _bmad-output/planning-artifacts/architecture.md#Project Context Analysis]
- Architecture manifest/table metadata: [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- Product detection requirements: [Source: _bmad-output/planning-artifacts/prd.md#FR3-Table-Boundary-Detection]
- Epic breakdown for story 1.2: [Source: _bmad-output/planning-artifacts/epics.md#Story-12-Detect-Sheet-And-Table-Boundaries]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Write failing detector tests first using synthetic and workbook-based fixtures.
- Build grid extraction and region scoring next.
- Persist confidence and reasons into the manifest only after the tests prove stable split behavior.

### Debug Log References

- `python -m pytest`

### Completion Notes List

- Added a deterministic table detector that works from raw sheet grids and identifies dense non-empty table regions with explicit sheet coordinates.
- Implemented heuristic confidence scoring using density, header-likeness, repeated-header detection, and column type consistency.
- Persisted `bounds`, `confidence`, `detectionReasons`, and `reviewRequired` into manifest table entries and updated workbook `tableCount`.
- Wired table detection into workbook ingestion so uploads now emit table metadata directly in the manifest.
- Added unit and integration coverage for single-table sheets, blank-column separation, multi-block sheets, and repeated-header review-required layouts.
- Added horizontal continuation detection for measure blocks split by a single blank separator column so common spacer-column report layouts are no longer silently split into separate trusted tables.

### File List

- apps/api/app/pipelines/__init__.py
- apps/api/app/pipelines/detect_tables.py
- apps/api/app/schemas/manifest.py
- apps/api/app/services/workbook_ingestion.py
- apps/api/tests/unit/test_detect_tables.py
- apps/api/tests/unit/test_workbook_ingestion.py
- apps/api/tests/integration/test_detect_tables_manifest.py
- apps/api/tests/integration/test_uploads.py

## Change Log

- 2026-04-04: Story created and marked `ready-for-dev`.
- 2026-04-04: Implemented deterministic table detection, manifest metadata, and automated tests; status moved to `review`.
- 2026-04-04: Fixed spacer-column continuation handling after Epic 1 QA remediation.
