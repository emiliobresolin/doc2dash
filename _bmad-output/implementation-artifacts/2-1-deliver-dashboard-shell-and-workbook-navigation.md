# Story 2.1: Deliver Default Dashboard Shell And Workbook Navigation

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,  
I want a clear default dashboard and navigation model for sheets and tables,  
so that I can understand the report immediately and still know what part of the workbook I am viewing.

## Acceptance Criteria

1. A processed upload opens to a readable summary-first dashboard without requiring manual dashboard composition.
2. The system selects a best default view from the manifest so the common path reaches a presentable first screen with little or no manual setup.
3. The dashboard shows workbook, sheet, and table navigation plus a focused content workspace for summaries, charts, and preview data.
4. Presenter mode provides a low-clutter, keyboard-friendly, stable layout suitable for internal meetings.
5. Unit, component, or end-to-end tests cover dashboard landing, workbook navigation, and presenter-mode state transitions.

## Tasks / Subtasks

- [x] Implement default-view selection in the backend manifest pipeline (AC: 1, 2)
  - [x] Add a backend rule set to choose the best first sheet/table/view
  - [x] Persist `defaultView` metadata in the manifest
  - [x] Favor summary-first and readable outputs over exploratory density
- [x] Build the dashboard shell and workbook navigation UI (AC: 1, 3)
  - [x] Create the main dashboard route and load manifest data
  - [x] Render workbook/sheet/table navigation plus a focused workspace
  - [x] Preserve a clear source-of-truth location indicator in the UI
- [x] Implement presenter mode state and layout behavior (AC: 4)
  - [x] Add a presenter-mode toggle or entry path
  - [x] Keep the layout stable, low-clutter, and readable on large shared screens
  - [x] Support keyboard-forward navigation for moving through the presentation flow
- [x] Add frontend tests for default landing and presenter mode (AC: 5)
  - [x] Test the common path to first dashboard
  - [x] Test navigation state changes and presenter-mode transitions

## Dev Notes

- This story is about the first readable and presentable output, not about advanced search or chart strategy depth.
- The frontend should not invent its own first-view heuristics separate from the manifest. Default-view selection belongs to the backend contract.
- Presenter mode must preserve provenance badges and source visibility without cluttering the primary narrative.
- Optimize first for desktop and large-screen meeting readability, while keeping mobile usable.

### Project Structure Notes

- Expected backend files:
  - `apps/api/app/pipelines/select_default_view.py`
  - `apps/api/app/schemas/manifest.py`
- Expected frontend files:
  - `apps/web/src/app/App.tsx`
  - `apps/web/src/features/dashboard/`
  - `apps/web/src/features/presentation/`
  - `apps/web/src/components/layout/`
- Expected tests:
  - `apps/web/src/features/dashboard/*.test.tsx`
  - `apps/web/src/features/presentation/*.test.tsx`
  - Playwright dashboard landing coverage

### References

- Architecture frontend architecture and presenter rules: [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- Architecture default-first and state-model rules: [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- Architecture project structure: [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- Product dashboard and presenter requirements: [Source: _bmad-output/planning-artifacts/prd.md#FR8-Responsive-Accessible-Dashboard-UI]
- Product low-interaction journey: [Source: _bmad-output/planning-artifacts/prd.md#6-User-Journey]
- Epic breakdown for story 2.1: [Source: _bmad-output/planning-artifacts/epics.md#Story-21-Deliver-Default-Dashboard-Shell-And-Workbook-Navigation]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Start with manifest-driven dashboard landing tests.
- Implement default-view selection and presenter mode structure before visual polish.
- Keep the first version summary-first and stable rather than highly configurable.

### Debug Log References

- `python -m pytest`
- `npm.cmd test`
- `npm.cmd run build`

### Completion Notes List

- Added manifest-driven default-view selection so uploads land on the best readable table instead of relying on frontend heuristics.
- Added persisted preview retrieval to the upload API so the dashboard can load source-aware sample rows for the selected table.
- Scaffolded the React/Vite web app with a dashboard route, workbook navigation, summary-first workspace, and provenance location indicator.
- Implemented presenter mode with stable summary/charts/preview sections, keyboard navigation, and low-clutter presenter controls.
- Added frontend component coverage for default landing, table switching, and presenter-mode transitions, then verified the production build.
- Fixed QA follow-ups so failed manifests and no-table manifests render terminal states instead of looping in a busy shell.
- Tightened presenter mode to remove the workbook sidebar and reveal only the active presentation section for a lower-clutter meeting view.
- Cleared stale preview rows immediately on table switches and added regression coverage for failed/no-table states plus presenter-mode layout behavior.

### File List

- _bmad-output/implementation-artifacts/2-1-deliver-dashboard-shell-and-workbook-navigation.md
- apps/api/app/api/routes/uploads.py
- apps/api/app/pipelines/select_default_view.py
- apps/api/app/services/upload_bundle_store.py
- apps/api/app/services/workbook_ingestion.py
- apps/api/tests/integration/test_uploads.py
- apps/api/tests/unit/test_select_default_view.py
- apps/web/index.html
- apps/web/package-lock.json
- apps/web/package.json
- apps/web/tsconfig.json
- apps/web/tsconfig.node.json
- apps/web/vite.config.ts
- apps/web/src/main.tsx
- apps/web/src/app/App.tsx
- apps/web/src/app/providers.tsx
- apps/web/src/app/routes.tsx
- apps/web/src/components/layout/AppFrame.tsx
- apps/web/src/features/dashboard/DashboardPage.tsx
- apps/web/src/features/dashboard/DashboardPage.test.tsx
- apps/web/src/features/presentation/PresenterToolbar.tsx
- apps/web/src/features/presentation/PresenterMode.test.tsx
- apps/web/src/lib/api.ts
- apps/web/src/styles/globals.css
- apps/web/src/styles/tokens.css
- apps/web/src/test/setup.ts
- apps/web/src/types/manifest.ts

## Change Log

- 2026-04-04: Story created and marked `ready-for-dev`.
- 2026-04-04: Implemented manifest-driven default dashboard landing, workbook navigation UI, presenter mode, and frontend component coverage; status moved to `review`.
- 2026-04-04: Addressed QA findings around terminal states, presenter-mode clutter, and stale preview transitions.
