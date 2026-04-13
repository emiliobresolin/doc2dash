# Story 3.5: Harden Search Result Presentation And Stable Dashboard Card Sizing

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a report reader,  
I want long-form search results and dashboard cards to stay visually bounded and readable,  
so that one oversized text block or wide row does not make the whole dashboard feel less presentable than the source spreadsheet.

## Story Goal

Keep the current global search behavior intact, but harden how long and wide content is presented.

This story should address the real demo and fixture-library issues where:

- long snippets and row values balloon the compact search block
- wide rows render too many inline cells at once
- one large block stretches the surrounding dashboard cards and breaks layout balance
- users need a safe way to inspect full details without forcing the whole dashboard grid to grow
- selecting a search result must scope the active presentation area to that result instead of letting the broader workbook continue driving the visible charts and preview

## Acceptance Criteria

1. Search results that contain many columns or very long values render in a bounded compact format that stays readable and source-aware.
2. The compact result format clamps or truncates long-form values and snippets by default, while preserving enough context to decide whether to open the result.
3. Full row/detail inspection is available through a separate presentation-safe surface such as a modal, drawer, popover, or equivalent inspector, rather than by stretching the dashboard grid itself.
4. Default dashboard card sizing stays visually stable even when a search result or long-form content block contains unusually large text.
5. Selecting a search result enters a scoped presentation state for that selected result so the chosen search block becomes the active presentation context.
6. While scoped search presentation is active, only charts and preview/data derived from the selected result drive the active presentation area; the rest of the workbook does not continue driving the visible presentation context until the user exits that state.
7. The scoped search presentation state includes a clear exit path that returns the user to the normal workbook/dashboard context with predictable state reset behavior.
8. Frontend regression tests cover long/wide search result rendering, expanded-detail access, scoped search presentation activation, scoped chart/preview behavior, scoped-state exit/reset, and non-regression for normal short-form results.

## Boundaries / Non-Goals

- Do not retune search ranking, indexing, or backend search relevance in this story unless a tiny response-shaping change is strictly required.
- Do not redesign the entire dashboard shell or chart system.
- Do not solve report condensation or default-view scoring here. Those belong to story `3.7`.
- Do not add a generic content-management system for arbitrary dialogs; keep the detail surface focused on this UX problem.
- Do not treat scoped search presentation as a new global navigation model. It is a temporary, explicit presentation context entered from search selection and exited by the user.

## Tasks / Subtasks

- [x] Harden the compact search result model (AC: 1, 2, 5)
  - [x] Review the current card layout in `SearchResultList.tsx`
  - [x] Prioritize readable match context over rendering every matched cell at full length
  - [x] Preserve source-sheet, table, and matched-column context
- [x] Keep dashboard cards visually stable under long-form content (AC: 3, 4)
  - [x] Add bounded default sizing for search and related workspace cards
  - [x] Prevent a single large content block from stretching sibling cards or destabilizing the grid
  - [x] Route full-detail inspection into a separate presentation-safe surface
- [x] Add scoped search-presentation behavior (AC: 5, 6, 7)
  - [x] Make search selection activate a scoped presentation context instead of only performing a passive table jump
  - [x] Ensure the active chart and preview area are driven only by the selected result while scoped state is active
  - [x] Provide a clear exit action that restores the broader workbook/dashboard context predictably
- [x] Add focused frontend regression coverage (AC: 8)
  - [x] Cover long snippets and very wide rows
  - [x] Cover the expand/detail path
  - [x] Cover scoped presentation activation and exit/reset
  - [x] Preserve normal short-result behavior

## Affected Areas

- `apps/web/src/components/preview/SearchResultList.tsx`
- `apps/web/src/features/search/SearchPanel.tsx`
- `apps/web/src/features/dashboard/DashboardPage.tsx`
- `apps/web/src/styles/globals.css`
- search and dashboard frontend types under `apps/web/src/types/`
- search-related frontend tests under `apps/web/src/features/search/` and `apps/web/src/features/dashboard/`

## Test Expectations

- Frontend tests should explicitly simulate long snippets, wide rows, and very long cell values.
- Tests should verify that the compact card remains bounded and that full detail is reachable through the dedicated expanded surface.
- Regression coverage should confirm that selecting a result enters scoped presentation mode, limits the active charts and preview/data to the selected result, and exits cleanly back to the workbook context.
- Existing short-form search flows should remain intact when the user does not enter or expand scoped presentation state.
- Manual QA should re-check `extensive-document-academic-report.xlsx` and `performance-logs-report.xlsx` after implementation.

## Dev Notes

- The main issue is presentation, not search correctness. Search is mostly fine functionally today.
- Treat this as a display/modeling problem first. The goal is to make the current data readable without pretending the backend search engine is the problem.
- There is currently no dedicated preview-table detail component. The expanded surface may therefore live in `DashboardPage.tsx` at first, as long as the implementation stays small and presentation-safe.
- The scoped search rule is not optional polish. Once a result is selected, that result should temporarily own the active presentation area until the user exits back to the broader workbook context.

### Reuse From Current Implementation

- Reuse as-is:
  - current global search API and dashboard jump behavior
  - `SearchPanel.tsx`
  - `SearchResultList.tsx`
- Likely extension points:
  - `apps/web/src/components/preview/SearchResultList.tsx`
  - `apps/web/src/features/dashboard/DashboardPage.tsx`
  - `apps/web/src/styles/globals.css`
  - search type definitions under `apps/web/src/types/`

### Current-Code Alignment Notes

- Current search results render every matched row as a flat inline list of cells, which is the root of the layout blow-up.
- The compact search block is acceptable in spirit; it just needs stronger layout rules, truncation, and a separate detail surface.
- Current search selection behavior is too weak for presentation use because it does not explicitly establish a scoped result-driven presentation context.
- This story should preserve the browser-first flow and the existing dashboard route behavior while making search selection presentation-aware.

### Small Risk / Dependency Note

- If the implementation pushes too much detail into the compact card, it will re-create the current problem. The guardrail is simple: compact cards should stay compact, and full detail should open separately.
- The scoped state must feel temporary and clear. If users cannot tell whether they are in scoped-result mode or workbook mode, the behavior will feel broken even if the data is technically correct.

### References

- QA source of truth: [Source: _bmad-output/implementation-artifacts/tests/fixture-library-qa-report-2026-04-12.md]
- Architecture search and presentation goals: [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- Epic 3 corrective direction: [Source: _bmad-output/planning-artifacts/epics.md#Story-35-Harden-Search-Result-Presentation-And-Stable-Dashboard-Card-Sizing]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Keep the existing global search semantics intact while replacing the raw row dump with bounded result cards.
- Add a separate inspector surface for full row details so the dashboard grid stays stable.
- Make search-result selection explicitly activate and exit a scoped presentation state backed by dashboard tests.

### Debug Log References

- `npm.cmd test -- --run src/features/search/SearchPanel.test.tsx src/features/dashboard/DashboardPage.test.tsx src/features/presentation/PresenterMode.test.tsx src/components/charts/ChartPanel.test.tsx`
- `npm.cmd test -- --run src/features/dashboard/DashboardPage.test.tsx src/features/presentation/PresenterMode.test.tsx`
- `npm.cmd run build`

### Completion Notes List

- Reworked search result cards so long snippets and wide rows clamp by default, expose overflow context, and keep the workbook source metadata readable.
- Added a separate search-result inspector modal for full row/detail inspection instead of stretching the dashboard grid.
- Introduced scoped search presentation so selecting a result temporarily owns the active chart and preview context until the user exits back to the workbook view.
- Hardened chart mounting with explicit resize handling to fix the initial line-chart render defect.
- Followed up on the integrated layout QA findings by keeping the scoped-search strip full-width, moving navigation controls out of the workspace grid, and tightening preview containment so dense data no longer deforms sibling cards.

### File List

- _bmad-output/implementation-artifacts/3-5-harden-search-result-presentation-and-stable-dashboard-card-sizing.md
- apps/web/src/components/charts/ChartPanel.tsx
- apps/web/src/components/charts/ChartPanel.test.tsx
- apps/web/src/components/preview/SearchResultInspector.tsx
- apps/web/src/components/preview/SearchResultList.tsx
- apps/web/src/features/dashboard/DashboardPage.tsx
- apps/web/src/features/dashboard/DashboardPage.test.tsx
- apps/web/src/features/presentation/PresenterMode.test.tsx
- apps/web/src/features/search/SearchPanel.test.tsx
- apps/web/src/features/search/SearchPanel.tsx
- apps/web/src/styles/globals.css

## Change Log

- 2026-04-12: Story created from fixture-library QA findings and screenshot-confirmed layout failures on long-form report content.
- 2026-04-12: Implemented bounded search result cards, scoped search presentation, a separate detail inspector, and chart initial-render hardening.
- 2026-04-12: Applied page-level layout stabilization so scoped presentation, preview containment, and card sizing behave as a coherent dashboard system.
