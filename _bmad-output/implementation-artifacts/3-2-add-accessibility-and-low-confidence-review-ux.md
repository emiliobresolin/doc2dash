# Story 3.2: Add Accessibility And Low-Confidence Review UX

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,  
I want accessible navigation and clarity around uncertain detections,  
so that I can use the product confidently even when the workbook is messy.

## Acceptance Criteria

1. Low-confidence or ambiguous detections display a review-required state that explains the uncertainty and prevents the output from being treated as presentation-ready by default.
2. The UI keeps source table, transformation, and confidence/provenance cues accessible in both analysis and presenter modes.
3. Core flows are keyboard-usable and screen-reader-friendly, including dashboard navigation, presenter mode, and review-required states.
4. Accessibility and low-confidence review flows are covered by automated tests.

## Tasks / Subtasks

- [x] Implement low-confidence review UX (AC: 1, 2)
  - [x] Add a visible review-required state for ambiguous tables
  - [x] Explain why the output is uncertain using `detectionReasons` and confidence cues
  - [x] Keep raw/source views reachable from the review state
- [x] Surface provenance and transformation metadata in the UI (AC: 2)
  - [x] Display source sheet/table context
  - [x] Display normalization badges and chart provenance badges
  - [x] Ensure presenter mode keeps these cues accessible without cluttering the main view
- [x] Harden keyboard and accessibility behavior (AC: 3)
  - [x] Add focus order, ARIA labels, and keyboard navigation for dashboard and presenter mode
  - [x] Validate screen-reader-friendly naming on nav, charts, filters, and review state
- [x] Add tests for accessibility and review-required flows (AC: 4)
  - [x] Frontend tests for review state rendering and keyboard behavior
  - [x] Integration-style frontend coverage for a low-confidence workbook path using the current manifest-driven dashboard entry

## Dev Notes

- Review-required is a product trust feature, not a generic warning banner.
- Presenter mode must never hide the fact that a table is ambiguous or transformed.
- Accessibility work here must cover the high-value paths, not just static lint checks.

### Project Structure Notes

- Expected frontend files:
  - `apps/web/src/features/presentation/`
  - `apps/web/src/features/dashboard/`
  - `apps/web/src/components/layout/`
  - `apps/web/src/components/charts/`
- Expected tests:
  - `apps/web/src/features/presentation/*.test.tsx`
  - `apps/web/src/features/dashboard/*.test.tsx`
  - Integration-style frontend coverage for review-required and keyboard paths

### References

- Architecture presenter rules and review-required behavior: [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- Architecture error and loading patterns: [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Patterns--Consistency-Rules]
- Product accessibility and trust requirements: [Source: _bmad-output/planning-artifacts/prd.md#FR8-Responsive-Accessible-Dashboard-UI]
- Product explainability requirements: [Source: _bmad-output/planning-artifacts/prd.md#NFR3-Trust-And-Explainability]
- Epic breakdown for story 3.2: [Source: _bmad-output/planning-artifacts/epics.md#Story-32-Add-Accessibility-And-Low-Confidence-Review-UX]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Start with the review-required UI contract and keyboard behavior tests.
- Add provenance badges and presenter-safe visibility next.
- Finish with accessibility test automation and manifest-driven integration coverage.

### Debug Log References

- `npm.cmd test`
- `npm.cmd run build`
- `python -m pytest`

### Completion Notes List

- Added a dedicated review-required UI state that explains ambiguity with confidence and detection reasons, and keeps source rows one action away.
- Added a presenter-safe metadata strip so trust, transformation, and provenance cues stay visible in both analysis and presenter modes.
- Added keyboard improvements for workbook navigation and section focus management without changing the manifest-driven dashboard flow.
- Scoped presenter keyboard shortcuts away from focused interactive controls so search input usage no longer triggers presenter navigation or exit unexpectedly.
- Added frontend integration-style coverage for low-confidence default views, review-state rendering, presenter-mode trust cues, and keyboard navigation.

### File List

- _bmad-output/implementation-artifacts/3-2-add-accessibility-and-low-confidence-review-ux.md
- apps/api/tests/fixtures/README.md
- apps/web/src/features/dashboard/DashboardPage.tsx
- apps/web/src/features/dashboard/DashboardPage.test.tsx
- apps/web/src/features/dashboard/ReviewRequiredState.tsx
- apps/web/src/features/presentation/PresenterMode.test.tsx
- apps/web/src/styles/globals.css
- _bmad-output/implementation-artifacts/tests/test-summary.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-04-04: Story created and marked `ready-for-dev`.
- 2026-04-11: Adjusted AC3 and the final test task to match the current manifest-driven dashboard entry path instead of a not-yet-built upload UI and Playwright harness.
- 2026-04-11: Implemented the low-confidence review UX, accessibility improvements, and integration-style frontend coverage; status moved to `review`.
- 2026-04-11: Applied QA follow-up so presenter shortcuts ignore focused interactive controls, and added a focused-search regression test.
- 2026-04-11: QA re-validation approved the story as done after confirming focused interactive controls no longer trigger presenter shortcuts.
