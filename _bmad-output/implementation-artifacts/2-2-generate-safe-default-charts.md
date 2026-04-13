# Story 2.2: Reuse Or Generate Safe Presentation Charts

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,  
I want the app to preserve or generate the right visuals from my report,  
so that I can start reading and presenting insights immediately.

## Acceptance Criteria

1. The chart strategy prefers reusable or reconstructable report visuals when the source report already expresses a clear presentation-worthy visual intent.
2. When reuse is unavailable or weaker than a generated view, the system generates safe default charts based on profiled data roles.
3. The manifest includes `defaultChartType`, `availableChartTypes`, `chartSourceType`, and `chartSourceReason` for each presented chartable output.
4. The UI exposes only valid chart options for the current dataset and allows switching without changing the underlying data semantics.
5. Tests cover reused, reconstructed, and generated chart provenance paths, plus invalid chart suppression.

## Tasks / Subtasks

- [x] Implement backend chart strategy and provenance metadata (AC: 1, 2, 3)
  - [x] Create a strategy layer that chooses between `reused`, `reconstructed`, and `generated`
  - [x] Prefer report-intent preservation when the source workbook or report structure already suggests a strong visual
  - [x] Generate safe defaults when reuse or reconstruction is weak or unavailable
- [x] Populate valid chart options in the manifest (AC: 2, 3)
  - [x] Compute `availableChartTypes` from profile and semantics
  - [x] Choose `defaultChartType` conservatively
  - [x] Record `chartSourceType` and `chartSourceReason`
- [x] Build chart option switching in the frontend (AC: 4)
  - [x] Render the default chart from the manifest
  - [x] Expose only supported alternatives such as `bar`, `column`, `line`, `area`, `pie`, or `table`
  - [x] Keep source/provenance cues visible while switching views
- [x] Add tests for chart strategy and chart option UX (AC: 5)
  - [x] Backend tests for reused/reconstructed/generated decisions
  - [x] Frontend tests for valid-option switching and invalid-option suppression

## Dev Notes

- This story must stay conservative. The product promise is clarity and trust, not chart variety for its own sake.
- Workbook-native chart extraction may be shallow in MVP. Reconstructing report intent from clear summary sections is acceptable when direct extraction is not practical.
- The frontend must never infer unsupported chart options on its own. It should obey the manifest.
- "No chart" is a valid result when the table is not chart-friendly.

### Project Structure Notes

- Expected backend files:
  - `apps/api/app/services/chart_strategy.py`
  - `apps/api/app/schemas/manifest.py`
  - `apps/api/app/pipelines/profile_tables.py`
- Expected frontend files:
  - `apps/web/src/components/charts/`
  - `apps/web/src/lib/charts.ts`
  - `apps/web/src/features/dashboard/`
- Expected tests:
  - `apps/api/tests/unit/test_chart_strategy.py`
  - `apps/web/src/components/charts/*.test.tsx`
  - Playwright chart-switching coverage

### References

- Architecture reuse-first chart strategy: [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- Architecture report-intent preservation: [Source: _bmad-output/planning-artifacts/architecture.md#Report-Intent-Preservation]
- Architecture chart option format and provenance: [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- Product chart requirements: [Source: _bmad-output/planning-artifacts/prd.md#FR6-Chart-Recommendation-And-Rendering]
- Technical research note on chart reuse spike: [Source: _bmad-output/planning-artifacts/technical-research.md#6-Source-chart-reuse-remains-a-targeted-spike-area]
- Epic breakdown for story 2.2: [Source: _bmad-output/planning-artifacts/epics.md#Story-22-Reuse-Or-Generate-Safe-Presentation-Charts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Start with backend chart-strategy tests and provenance outputs.
- Add frontend rendering and chart switching only after the manifest contract is stable.
- Keep the first version small and presentation-safe.

### Debug Log References

- `python -m pytest apps/api/tests/unit/test_chart_strategy.py apps/api/tests/unit/test_workbook_ingestion.py apps/api/tests/integration/test_uploads.py`
- `python -m pytest apps/api/tests`
- `npm.cmd test`
- `npm.cmd run build`

### Completion Notes List

- Added a reuse-first chart strategy that emits conservative chart provenance and valid chart options into the manifest.
- Wired ingestion so chart recommendations are persisted with manifest and table artifacts.
- Replaced the dashboard chart placeholder with a manifest-driven Plotly chart panel that supports safe switching between valid chart types and interactive hover behavior.
- Tightened provenance so `reused` is reserved for real source-visual detection and summary-style naming falls back to `reconstructed`.
- Lazy-loaded Plotly so interactive rendering does not bloat the main app bundle.
- Added backend chart-strategy tests plus frontend chart-panel/dashboard switching coverage.

### File List

- _bmad-output/implementation-artifacts/2-2-generate-safe-default-charts.md
- apps/api/app/schemas/manifest.py
- apps/api/app/services/chart_strategy.py
- apps/api/app/services/workbook_ingestion.py
- apps/api/tests/unit/test_chart_strategy.py
- apps/api/tests/unit/test_workbook_ingestion.py
- apps/api/tests/integration/test_uploads.py
- apps/web/src/types/manifest.ts
- apps/web/src/lib/charts.ts
- apps/web/src/components/charts/ChartPanel.tsx
- apps/web/src/components/charts/ChartPanel.test.tsx
- apps/web/src/features/dashboard/DashboardPage.tsx
- apps/web/src/features/dashboard/DashboardPage.test.tsx
- apps/web/src/features/presentation/PresenterMode.test.tsx
- apps/web/src/styles/globals.css

## Change Log

- 2026-04-04: Story created and marked `ready-for-dev`.
- 2026-04-04: Story implemented and moved to `review`.
