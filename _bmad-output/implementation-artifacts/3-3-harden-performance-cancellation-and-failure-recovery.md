# Story 3.3: Harden Performance, Cancellation, And Failure Recovery

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,  
I want the app to stay responsive when files are large or uploads fail,  
so that I am not blocked by heavy workbooks or brittle processing.

## Acceptance Criteria

1. The system acknowledges uploads quickly, processes large valid workbooks without freezing the UI, and preserves the agreed search and dashboard performance targets.
2. Users can cancel or abandon uploads cleanly, and the system leaves a recoverable state instead of broken partial output.
3. Table previews remain responsive through pagination or virtualization, and presenter mode does not trigger disruptive full reloads.
4. Runtime details and provenance are sufficient to support trust, cleanup, audit, and recovery workflows.
5. Automated tests or checks cover performance-sensitive paths, cancellation behavior, and failure recovery.

## Tasks / Subtasks

- [x] Harden runtime performance for upload and dashboard flows (AC: 1, 3)
  - [x] Preserve fast upload acknowledgement and background processing behavior
  - [x] Add pagination or virtualization where required for large previews
  - [x] Keep chart switching and presenter mode transitions stable and fast
- [x] Implement cancellation and cleanup behavior (AC: 2, 4)
  - [x] Support cancellation or deletion of in-flight upload bundles through the current upload runtime API
  - [x] Clean up abandoned or failed bundle state
  - [x] Preserve enough runtime detail for recovery or support analysis
- [x] Add performance and recovery checks (AC: 5)
  - [x] Add tests or scripted checks for search latency and first-dashboard behavior
  - [x] Add integration tests for failed upload and cleanup paths
  - [x] Validate presenter mode does not regress under large manifests

## Dev Notes

- This story is where the performance budgets become enforceable engineering constraints.
- The app does not need perfect streaming for MVP, but it must degrade gracefully and remain usable.
- Recovery details are part of trust for internal reporting. Failed processing should be understandable, not mysterious.

### Project Structure Notes

- Expected backend files:
  - `apps/api/app/api/routes/uploads.py`
  - `apps/api/app/services/upload_bundle_store.py`
  - `apps/api/app/services/preview_search.py`
- Expected frontend files:
  - `apps/web/src/features/dashboard/`
  - `apps/web/src/components/preview/`
- Expected tests:
  - backend integration tests for cleanup/recovery
  - frontend performance-sensitive regression tests
  - Vitest coverage for dashboard preview and presenter-mode stability on the current manifest-driven route

### References

- Architecture async processing and deployment constraints: [Source: _bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns]
- Architecture frontend and performance dependencies: [Source: _bmad-output/planning-artifacts/architecture.md#Decision-Impact-Analysis]
- Product performance and recovery requirements: [Source: _bmad-output/planning-artifacts/prd.md#NFR1-Performance]
- Product async processing requirements: [Source: _bmad-output/planning-artifacts/prd.md#FR9-Async-Processing]
- Epic breakdown for story 3.3: [Source: _bmad-output/planning-artifacts/epics.md#Story-33-Harden-Performance-Cancellation-And-Failure-Recovery]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Preserve current async processing assumptions first.
- Add cleanup and recovery behavior next.
- Validate performance-sensitive paths last with explicit checks tied to the agreed budgets.

### Debug Log References

- `python -m pytest apps/api/tests`
- `python -m pytest`
- `npm.cmd test`
- `npm.cmd run build`

### Completion Notes List

- Added runtime lifecycle persistence with `runtime.json`, a runtime details API, and explicit `cancelled` bundle handling.
- Preserved fast upload acknowledgement while hardening the background pipeline to skip cancelled bundles and clean generated artifacts on failure.
- Switched preview loading to paginated reads from stored table artifacts so large row sets stay responsive without reloading the dashboard shell.
- Added cancellation and failure-recovery coverage plus a bounded preview-search latency check on the backend.
- Added frontend regressions for cancelled-manifest handling and paginated preview behavior in presenter mode.
- Applied QA follow-up so cancel is limited to in-flight processing uploads and completed dashboards cannot be downgraded or cleaned by mistake.
- Aligned the unit latency gate to the reused indexed-search path, while keeping the API-level search latency smoke check in place.

### File List

- _bmad-output/implementation-artifacts/3-3-harden-performance-cancellation-and-failure-recovery.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/tests/test-summary.md
- apps/api/app/api/routes/uploads.py
- apps/api/app/schemas/api.py
- apps/api/app/schemas/manifest.py
- apps/api/app/services/upload_bundle_store.py
- apps/api/app/services/workbook_ingestion.py
- apps/api/tests/integration/test_search_api.py
- apps/api/tests/integration/test_uploads.py
- apps/api/tests/unit/test_preview_search.py
- apps/web/src/features/dashboard/DashboardPage.tsx
- apps/web/src/features/dashboard/DashboardPage.test.tsx
- apps/web/src/features/presentation/PresenterMode.test.tsx
- apps/web/src/lib/api.ts
- apps/web/src/styles/globals.css
- apps/web/src/types/manifest.ts

## Change Log

- 2026-04-04: Story created and marked `ready-for-dev`.
- 2026-04-11: Adjusted runtime and test notes to match the current upload API and manifest-driven dashboard route instead of a not-yet-built upload UI and Playwright harness.
- 2026-04-11: Implemented preview pagination, runtime detail persistence, cancellation cleanup, failure recovery, and the related backend/frontend regression coverage; status moved to `review`.
- 2026-04-12: Applied QA follow-up to reject cancel requests for completed uploads and stabilize the indexed-search latency gate.
- 2026-04-12: QA re-validation passed and story status moved to `done`.
