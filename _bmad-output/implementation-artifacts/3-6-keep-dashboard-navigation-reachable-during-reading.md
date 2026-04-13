# Story 3.6: Keep Dashboard Navigation Reachable During Reading

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user presenting or reading a long dashboard,  
I want section and preview navigation controls to stay easy to reach while scrolling,  
so that I do not have to jump to the top or bottom of the page just to keep moving through the report.

## Story Goal

Make navigation controls presentation-safe and conveniently reachable during normal reading.

This story should specifically address the current demo behavior where:

- Previous / Next controls become inconvenient once the page is scrolled
- preview pagination controls are easy to lose in longer pages
- the dashboard feels less usable during real reading and presenting than the underlying spreadsheet

## Acceptance Criteria

1. Section navigation controls such as Previous / Next remain conveniently reachable during dashboard scrolling through a sticky or equivalent presentation-safe treatment.
2. Preview pagination controls remain conveniently reachable when the preview area is long or the page is scrolled.
3. The navigation treatment works in presenter mode and does not regress normal analysis mode.
4. The navigation controls remain keyboard accessible, readable, and non-obstructive on normal desktop usage.
5. Frontend regression coverage proves that the new navigation treatment does not break presenter keyboard navigation, preview pagination, or route stability.

## Boundaries / Non-Goals

- Do not redesign the presenter mode model or introduce a new route/navigation system.
- Do not add infinite scroll, virtual page sections, or unrelated dashboard shell changes.
- Do not mix this story with default-view scoring or report condensation logic.
- Do not add mobile-specific redesign work beyond preserving reasonable accessibility and non-obstruction.

## Tasks / Subtasks

- [x] Make section navigation reachable during reading (AC: 1, 3, 4)
  - [x] Review the current presenter/navigation placement
  - [x] Introduce a sticky or otherwise persistent navigation treatment suitable for long dashboards
  - [x] Preserve keyboard and focus behavior
- [x] Make preview paging reachable during reading (AC: 2, 4)
  - [x] Review the current preview pagination placement inside `DashboardPage.tsx`
  - [x] Keep page controls reachable without requiring extreme scroll jumps
  - [x] Preserve existing pagination semantics
- [x] Add frontend regression coverage (AC: 5)
  - [x] Cover presenter mode non-regression
  - [x] Cover preview pagination non-regression
  - [x] Add at least one test that validates the new persistent navigation treatment is rendered

## Affected Areas

- `apps/web/src/features/presentation/PresenterToolbar.tsx`
- `apps/web/src/features/dashboard/DashboardPage.tsx`
- `apps/web/src/styles/globals.css`
- presenter and dashboard tests under `apps/web/src/features/presentation/` and `apps/web/src/features/dashboard/`

## Test Expectations

- Frontend tests should preserve current keyboard behavior for presenter mode.
- Existing preview pagination tests should continue to pass, with new coverage for the persistent navigation treatment.
- Manual QA should verify that section navigation and preview pagination remain usable while the page is naturally scrolled on a long dashboard.

## Dev Notes

- This is a reachability story, not a navigation-model rewrite.
- Prefer a boring, persistent treatment over clever motion or a new interaction model.
- The controls should remain available without becoming noisy or blocking content.

### Reuse From Current Implementation

- Reuse as-is:
  - current presenter mode section model
  - current preview pagination behavior
- Likely extension points:
  - `apps/web/src/features/presentation/PresenterToolbar.tsx`
  - `apps/web/src/features/dashboard/DashboardPage.tsx`
  - `apps/web/src/styles/globals.css`

### Current-Code Alignment Notes

- The current Previous / Next controls already exist, but their placement is not scroll-friendly.
- Preview pagination already exists, but it needs a more presentation-safe position for real reading.
- This story should preserve the current dashboard route and presenter state machine while making the controls easier to use.

### Small Risk / Dependency Note

- Sticky controls can become visually noisy if they are too large or poorly placed. Keep the treatment small, stable, and clearly subordinate to the dashboard content.

### References

- QA source of truth: [Source: _bmad-output/implementation-artifacts/tests/fixture-library-qa-report-2026-04-12.md]
- Architecture presenter-mode rules: [Source: _bmad-output/planning-artifacts/architecture.md#Presenter-Mode-Rules]
- Epic 3 corrective direction: [Source: _bmad-output/planning-artifacts/epics.md#Story-36-Keep-Dashboard-Navigation-Reachable-During-Reading]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Move the presenter controls into a sticky reading-navigation strip so section travel stays reachable while scrolling.
- Surface preview paging controls in the same persistent strip when the preview spans multiple pages.
- Preserve keyboard focus rules and existing presenter/preview behaviors with targeted dashboard tests.

### Debug Log References

- `npm.cmd test -- --run src/features/dashboard/DashboardPage.test.tsx src/features/presentation/PresenterMode.test.tsx`
- `npm.cmd run build`

### Completion Notes List

- Added a sticky reading-navigation region that keeps presenter controls reachable during long-form reading and presenting.
- Added persistent preview page controls to the sticky strip so users can keep paging without hunting for the bottom-of-card controls.
- Preserved keyboard navigation and presenter-mode focus behavior while keeping the treatment visually subordinate to the dashboard content.
- Followed up on the whole-page layout QA by restoring presenter and paging controls to the masthead/top-control area, keeping them reachable without consuming a primary workspace slot.

### File List

- _bmad-output/implementation-artifacts/3-6-keep-dashboard-navigation-reachable-during-reading.md
- apps/web/src/features/dashboard/DashboardPage.tsx
- apps/web/src/features/dashboard/DashboardPage.test.tsx
- apps/web/src/styles/globals.css


## Change Log

- 2026-04-12: Story created from demo-observed navigation reachability issues and the corrective presentation-hardening slice.
- 2026-04-12: Added sticky reading navigation and persistent preview paging without regressing presenter mode behavior.
- 2026-04-12: Refined the navigation treatment so it remains top-row anchored and structurally independent from the workspace grid.
