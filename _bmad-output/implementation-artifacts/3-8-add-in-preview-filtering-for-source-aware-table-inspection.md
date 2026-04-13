# Story 3.8: Add In-Preview Filtering For Source-Aware Table Inspection

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user reviewing the currently open table,  
I want to filter the actual preview table from inside the preview block,  
so that I can narrow source rows in context without relying only on global workbook search.

## Story Goal

Add a preview-local filtering control that refines the currently open table.

This story should make preview inspection more usable without expanding the global search system or changing the browser-first flow.

It must also cooperate explicitly with the scoped presentation behavior introduced from search selection, so preview filtering remains local to the active context and resets cleanly when the user exits that scoped state.

## Acceptance Criteria

1. The preview workspace includes a clearly labeled filter/search control scoped to the currently selected table preview.
2. Entering a preview-local query narrows the preview rows for the active table in a predictable way and cooperates with pagination.
3. Applying a new preview-local filter resets pagination as needed so users do not land on an empty stale page.
4. The preview-local filter has clear empty-state and no-match messaging that is distinct from the global search panel.
5. If a search-selected scoped presentation state is active, preview-local filtering stays confined to that selected result context and does not silently restore workbook-wide chart or preview scope.
6. Exiting the search-selected scoped presentation state restores the normal workbook/dashboard context with clear, predictable reset behavior for any scoped preview-filter state.
7. Global search remains available and distinct in purpose: global search jumps across workbook tables, while preview filtering refines the currently open table.
8. Frontend tests cover preview filtering behavior, pagination reset behavior, scoped-search compatibility, scoped-state exit/reset behavior, and non-regression for current preview loading and presenter mode.

## Boundaries / Non-Goals

- Do not replace or redesign the existing global search workflow.
- Do not introduce workbook-wide filtering or saved filters.
- Do not treat this story as a new search-engine project.
- Prefer the smallest usable implementation path, whether that is a narrow backend preview extension or a bounded frontend filter for the preview experience.
- Do not let preview-local filtering become an implicit replacement for the explicit enter/exit behavior of scoped search presentation from story `3.5`.

## Tasks / Subtasks

- [x] Add a preview-local filter control (AC: 1, 4, 7)
  - [x] Place the filter inside the preview workspace, not inside the global search panel
  - [x] Label it clearly so users understand it affects only the current table
  - [x] Provide distinct empty / no-match messaging
- [x] Connect filtering to the preview data flow (AC: 2, 3, 5, 6, 7)
  - [x] Choose the smallest implementation path that remains usable on real fixtures
  - [x] Ensure pagination behaves predictably when the filter changes
  - [x] Preserve current preview loading and route stability
- [x] Make preview filtering cooperate with scoped search presentation (AC: 5, 6)
  - [x] Keep preview-local filtering confined to the active scoped result when search-selected presentation state is active
  - [x] Define and implement the reset behavior when the user exits the scoped search-selected state
- [x] Add focused regression coverage (AC: 8)
  - [x] Cover local filtering behavior
  - [x] Cover pagination reset behavior
  - [x] Cover scoped-search compatibility and exit/reset
  - [x] Preserve presenter-mode and current preview non-regression coverage

## Affected Areas

- `apps/web/src/features/dashboard/DashboardPage.tsx`
- `apps/web/src/lib/api.ts` if a narrow preview API extension is required
- preview payload and related frontend types if filtering metadata is surfaced
- search/presentation state handling in `apps/web/src/features/dashboard/`
- dashboard tests under `apps/web/src/features/dashboard/`
- backend preview route or service only if the chosen implementation needs server-side filtering

## Test Expectations

- Frontend tests should cover in-preview filtering on a representative preview payload and confirm page reset behavior.
- Frontend tests should also cover preview filtering while a search-selected scoped presentation state is active, plus the expected reset behavior when that state exits.
- If backend support is added, integration coverage should verify table-scoped filtering semantics remain narrow and do not alter global search behavior.
- Manual QA should confirm that preview filtering helps with log/test-report inspection without confusing it with global search.

## Dev Notes

- This story comes after the presentation and default-view corrections because it is a supporting inspection tool, not the primary fix for the current product pain.
- Keep the distinction between global search and local preview filtering very clear in both UI copy and behavior.
- The implementation should stay narrow. This is not the place to redesign the global search service.
- Scoped search presentation should remain the owner of active chart/preview context while it is on. Preview filtering should refine that active context, not break out of it.

### Reuse From Current Implementation

- Reuse as-is:
  - current preview loading and pagination flow in `DashboardPage.tsx`
  - current global search panel and jump-to-table behavior
- Likely extension points:
  - `apps/web/src/features/dashboard/DashboardPage.tsx`
  - preview-related API helpers and types
  - backend preview route only if strictly needed

### Current-Code Alignment Notes

- The preview table currently has pagination but no local filter/search affordance.
- The current global search jumps across tables, which is useful but not sufficient for inspecting the open table itself.
- This story should feel like a refinement of the preview workspace, not a second competing global search UI.
- The reset behavior between scoped search presentation and preview-local filtering must be explicit so users do not get trapped in a partially scoped view.

### Small Risk / Dependency Note

- If preview-local filtering is implemented with a backend extension, keep it table-scoped and predictable. Do not accidentally reintroduce a second global search API under a different name.
- If scoped-state exit leaves stale preview filters behind, the dashboard will feel inconsistent. Be explicit about which filters clear and which workbook context returns on exit.

### References

- QA source of truth: [Source: _bmad-output/implementation-artifacts/tests/fixture-library-qa-report-2026-04-12.md]
- Architecture preview and search constraints: [Source: _bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns]
- Epic 3 corrective direction: [Source: _bmad-output/planning-artifacts/epics.md#Story-38-Add-In-Preview-Filtering-For-Source-Aware-Table-Inspection]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add a distinct preview-local filter control inside the preview workspace, not in the global search surface.
- Extend the existing preview route with one narrow table-scoped filter parameter so filtering remains honest on the large fixtures.
- Keep scoped search presentation in charge of active chart/preview context while allowing local refinement and a predictable reset on exit.

### Debug Log References

- `python -m pytest apps/api/tests/integration/test_uploads.py`
- `npm.cmd test -- --run src/features/dashboard/DashboardPage.test.tsx`
- `npm.cmd run build`

### Completion Notes List

- Added a preview-local filter input inside the preview card with distinct copy that clarifies it only narrows the open table.
- Extended the existing preview API with a table-scoped `filter` parameter so pagination and filtered row counts remain correct on large datasets.
- Reset preview pagination when the local filter changes and added a distinct no-match message for preview filtering.
- Kept local preview filtering confined to the active search-scoped result when scoped presentation is active, and cleared that local filter on scoped-state exit.
- Followed up on integrated layout QA by bounding preview-table overflow and clamping dense cell content so preview-local filtering remains useful without stretching the full dashboard.

### File List

- _bmad-output/implementation-artifacts/3-8-add-in-preview-filtering-for-source-aware-table-inspection.md
- apps/api/app/api/routes/uploads.py
- apps/api/app/services/upload_bundle_store.py
- apps/api/tests/integration/test_uploads.py
- apps/web/src/features/dashboard/DashboardPage.test.tsx
- apps/web/src/features/dashboard/DashboardPage.tsx
- apps/web/src/lib/api.ts
- apps/web/src/styles/globals.css

## Change Log

- 2026-04-12: Story created from the real-demo request for preview-table filtering and the corrective fixture-hardening slice.
- 2026-04-12: Added table-scoped preview filtering with page reset behavior, scoped-search compatibility, backend preview filtering support, and regression coverage.
- 2026-04-12: Refined preview containment so large filtered tables remain bounded inside the dashboard instead of deforming the page layout.
