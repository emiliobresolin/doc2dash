# Story 3.7: Improve Default View Quality And Condense Report-Style Workbooks

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user opening a complex workbook,  
I want the app to choose a strong first view and avoid exploding one report into an overwhelming flat list of weak tables,  
so that the product feels like a curated dashboard rather than a spreadsheet extraction dump.

## Story Goal

Improve presentation quality on the real report fixtures that are currently technically stable but visually weak.

This story should target the specific QA failures where:

- graph-heavy workbooks still open on weak or low-signal tables
- report/log/test workbooks fragment into too many table-first sections
- the default view is technically valid but not the best presentation starting point

## Acceptance Criteria

1. Default-view scoring avoids obviously weak entry points such as low-signal or single-column tables when a stronger summary, chartable, or presentation-worthy section exists.
2. The targeted report fixtures show materially better first-view outcomes than the current baseline:
   - `Google Finance Investment Tracker.xlsx`
   - `performance-logs-report.xlsx`
   - `test-validation-multiple-environments.xlsx`
   - `extensive-document-academic-report.xlsx`
3. Highly fragmented report-style workbooks gain grouping, condensation, or section-summary behavior that keeps the navigation usable and presentation-friendly.
4. Any revised default view or grouped navigation outcome remains explainable through manifest metadata and fixture-based tests.
5. Backend and frontend regression coverage protect the new default-view and condensation rules against the targeted fixtures.

## Boundaries / Non-Goals

- Do not promise universal workbook-chart extraction or perfect workbook-native chart reuse in this story.
- Do not add a manual report designer, drag-and-drop dashboard editor, or AI-based layout system.
- Do not redesign unrelated dashboard UI surfaces if the backend defaulting and grouping rules are sufficient.
- Do not fold preview-table filtering into this story. That belongs to story `3.8`.

## Tasks / Subtasks

- [x] Improve default-view scoring for real report fixtures (AC: 1, 2, 4)
  - [x] Review the current default-view pipeline and weak opening-view cases
  - [x] Bias the first view toward stronger summary, chartable, or presentation-worthy sections
  - [x] Preserve explainability for why the first view was selected
- [x] Condense or group fragmented report workbooks (AC: 2, 3, 4)
  - [x] Reduce the flat-navigation burden on heavily fragmented workbooks
  - [x] Keep related sections readable and presentation-friendly
  - [x] Expose enough metadata for the frontend to render the grouping or condensed structure clearly
- [x] Add regression coverage on the targeted fixtures (AC: 5)
  - [x] Protect the improved defaults and grouping behavior with fixture-based tests
  - [x] Add frontend non-regression checks if navigation metadata or rendering changes

## Affected Areas

- `apps/api/app/pipelines/select_default_view.py`
- `apps/api/app/services/workbook_ingestion.py`
- `apps/api/app/services/chart_strategy.py`
- `apps/api/app/schemas/manifest.py`
- dashboard navigation rendering under `apps/web/src/features/dashboard/`
- fixture-based backend tests and any related frontend regression tests

## Test Expectations

- Backend fixture tests should verify improved default-view outcomes for the targeted workbooks.
- If navigation grouping metadata changes, frontend tests should verify the grouped or condensed navigation remains usable.
- Manual QA should re-run the targeted fixtures and confirm that the first impression is more presentation-worthy than the current baseline.

## Dev Notes

- This is the story where we improve “nicer than spreadsheets” for the hard report fixtures.
- Prefer meaningful reconstruction of report intent and stronger default selection before chasing literal workbook-chart extraction everywhere.
- Keep the changes explainable. If the product chooses a section because it is more presentation-worthy, that reason should be traceable.

### Reuse From Current Implementation

- Reuse as-is:
  - current workbook ingestion pipeline
  - current manifest-driven dashboard route
  - current chart-strategy metadata model
- Likely extension points:
  - `apps/api/app/pipelines/select_default_view.py`
  - `apps/api/app/services/workbook_ingestion.py`
  - `apps/api/app/services/chart_strategy.py`
  - `apps/api/app/schemas/manifest.py`
  - dashboard navigation rendering in `apps/web/src/features/dashboard/`

### Current-Code Alignment Notes

- The product already has a manifest-first architecture, which is the right seam for improving default-view quality and navigation condensation without breaking the browser-first flow.
- The QA report shows that the app is operational on the target fixtures, so this story is about choosing and organizing better outputs, not fixing ingestion stability.
- This story should not be blocked on literal workbook chart extraction. Better first-view scoring and report condensation can deliver clear product value sooner.

### Small Risk / Dependency Note

- Condensation rules can become opaque if they are not explained. Preserve metadata that tells QA and users why a section was grouped or promoted.

### References

- QA source of truth: [Source: _bmad-output/implementation-artifacts/tests/fixture-library-qa-report-2026-04-12.md]
- Architecture default-first dashboard rule: [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- Architecture report-intent preservation: [Source: _bmad-output/planning-artifacts/architecture.md#Report-Intent-Preservation]
- Epic 3 corrective direction: [Source: _bmad-output/planning-artifacts/epics.md#Story-37-Improve-Default-View-Quality-And-Condense-Report-Style-Workbooks]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Improve the backend selector so low-signal stubs lose to stronger chartable or presentation-worthy tables on the real fixtures.
- Condense workbook navigation client-side into featured tables plus an overflow bucket for fragmented sheets.
- Re-run the live fixture regression path so the new defaults are measured against the actual workbook library.

### Debug Log References

- `python -m pytest apps/api/tests/unit/test_select_default_view.py apps/api/tests/integration/test_fixture_library_regressions.py`
- `npm.cmd test -- --run src/features/dashboard/DashboardPage.test.tsx`

### Completion Notes List

- Reworked default-view ranking so tiny one-cell or single-row stubs no longer outrank stronger sections simply because they are high-confidence extracts.
- Improved first-view outcomes on the real fixtures, including stronger defaults for `Google Finance Investment Tracker.xlsx` and `test-validation-multiple-environments.xlsx`.
- Condensed fragmented workbook navigation into featured tables plus overflow details, reducing the flat list burden on report-style workbooks without changing the manifest contract.
- Updated the fixture catalog baseline to match the improved selector outputs and keep the regression guardrail honest.

### File List

- _bmad-output/implementation-artifacts/3-7-improve-default-view-quality-and-condense-report-style-workbooks.md
- apps/api/app/pipelines/select_default_view.py
- apps/api/tests/fixtures/fixture_catalog.py
- apps/api/tests/unit/test_select_default_view.py
- apps/web/src/features/dashboard/DashboardPage.test.tsx
- apps/web/src/features/dashboard/DashboardPage.tsx
- apps/web/src/features/dashboard/navigationGroups.ts
- apps/web/src/styles/globals.css

## Change Log

- 2026-04-12: Story created from the fixture-library QA sweep and the demo evidence that report-style workbooks still open on weak or fragmented views.
- 2026-04-12: Implemented stronger default-view scoring, condensed workbook navigation, and updated the fixture baseline to the improved defaults.
