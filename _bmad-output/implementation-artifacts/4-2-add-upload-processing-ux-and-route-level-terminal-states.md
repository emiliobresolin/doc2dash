# Story 4.2: Add Upload Processing UX And Route-Level Terminal States

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a standard business user,  
I want the route that opens after upload to clearly guide me through processing and terminal outcomes,  
so that the handoff from `/` into `/uploads/{uploadId}` feels trustworthy and complete without manual troubleshooting.

## Story Goal

Turn the existing dashboard route into a clear browser-first handoff experience after story `4.1`, with explicit route-level handling for:

- `processing`
- `failed`
- `cancelled`
- missing upload / `not_found`

The result should feel like one continuous hosted webapp flow from upload landing page to generated dashboard route.

## Acceptance Criteria

1. After a successful browser upload from `/`, the transition into `/uploads/{uploadId}` presents a deliberate processing handoff state instead of a generic loading placeholder.
2. While a valid upload is still processing, `/uploads/{uploadId}` keeps polling the existing manifest/runtime APIs without manual refresh and explains that the dashboard is being prepared from the uploaded workbook.
3. If the upload route resolves to a failed upload, the UI shows a clear failed state with the existing user-ready message and an explicit next step to upload again from the landing page.
4. If the upload route resolves to a cancelled upload, the UI shows a clear cancelled state with an explicit next step to upload again from the landing page.
5. If the upload route does not exist or the upload cannot be found, the UI shows a distinct not-found state instead of a generic technical error fallback.
6. Ready uploads continue into the existing dashboard experience without regression to search, preview, presenter, review-required, or chart behavior.
7. Frontend tests cover processing handoff continuity, failed state, cancelled state, missing-upload/not-found state, and ready-state non-regression for the route-level browser flow.

## Expected User Flow

1. User uploads a valid workbook from `/`.
2. The browser transitions into `/uploads/{uploadId}` immediately after the `202 Accepted` acknowledgement from `POST /api/uploads`.
3. The route shows a clear processing handoff message while polling the existing backend status contract.
4. One of the following happens:
   - processing completes and the user lands in the existing dashboard workspace
   - processing fails and the route shows a clear recovery message plus a path back to `/`
   - the upload is cancelled and the route shows a clear cancellation message plus a path back to `/`
   - the upload ID is missing or invalid and the route shows a clear not-found message plus a path back to `/`

## Boundaries / Non-Goals

- Do not add production deployment or hosted infrastructure work. That belongs to story `4.3` and `4.4`.
- Do not add authentication, sharing, or account-aware routing.
- Do not introduce new backend ingestion capabilities unless a narrow route-state UX gap truly requires it.
- Do not redesign the ready dashboard experience beyond what is needed to preserve continuity from the new route states.
- Do not add unrelated dashboard polish, chart enhancements, or search/presenter feature work.

## Tasks / Subtasks

- [x] Refine the route-level processing handoff after browser upload (AC: 1, 2)
  - [x] Replace the generic loading copy on `/uploads/{uploadId}` with a browser-first processing handoff state
  - [x] Keep polling the existing backend status contract without requiring refresh or manual API use
  - [x] Preserve continuity with the upload action the user just completed on `/`
- [x] Add explicit terminal states for failed, cancelled, and missing uploads (AC: 3, 4, 5)
  - [x] Distinguish missing-upload / not-found from the broader failed-processing state
  - [x] Show clear next steps that send the user back into the standard browser upload flow at `/`
  - [x] Keep the messaging user-ready rather than developer-oriented
- [x] Preserve the existing ready dashboard route behavior (AC: 6)
  - [x] Ensure the route-level UX layer does not regress ready-state dashboard rendering
  - [x] Reuse existing dashboard features once the upload is ready instead of rebuilding the workspace shell
- [x] Expand frontend coverage for the browser-first route states (AC: 7)
  - [x] Test processing handoff continuity from upload acknowledgement into route polling
  - [x] Test failed upload state
  - [x] Test cancelled upload state
  - [x] Test missing-upload / not-found state
  - [x] Test ready upload still enters the existing dashboard path

## Dev Notes

- This story is a route-level UX story, not a new backend-processing story.
- Prefer reusing the existing manifest and runtime APIs. Only introduce a narrow backend change if the current API contract makes the route-state UX impossible or misleading.
- The browser-first product definition is the guardrail: the user should feel that `/` and `/uploads/{uploadId}` are one continuous app flow.
- The missing-upload state must not read like a developer error. It should be a recoverable user-facing route state.
- If runtime details are used to strengthen failed/cancelled/processing messaging, keep that usage minimal and focused on route-level UX.

### Reuse From Current Implementation

- Reuse as-is:
  - `apps/web/src/features/upload/UploadPage.tsx`
  - `apps/web/src/features/dashboard/DashboardPage.tsx`
  - `apps/web/src/lib/api.ts`
  - `apps/api/app/api/routes/uploads.py`
  - `apps/api/app/schemas/api.py`
  - `apps/api/app/services/upload_bundle_store.py`
- Likely extension points:
  - `apps/web/src/features/dashboard/DashboardPage.tsx`
  - `apps/web/src/features/dashboard/DashboardPage.test.tsx`
  - `apps/web/src/lib/api.ts`
- Existing reusable coverage:
  - `apps/web/src/features/upload/UploadPage.test.tsx`
  - `apps/web/src/features/dashboard/DashboardPage.test.tsx`
  - `apps/api/tests/integration/test_uploads.py`

### Current-Code Alignment Notes

- Story `4.1` already delivers the browser upload entry and route handoff.
- The current dashboard route already handles `processing`, `failed`, `cancelled`, and no-table states, but missing-upload handling is still too generic for the browser-first MVP.
- The backend already exposes:
  - `GET /api/uploads/{uploadId}/manifest`
  - `GET /api/uploads/{uploadId}/runtime`
- The route-level UX should build on those existing contracts rather than creating a new upload-status API.

### Small Risk / Dependency Note

- The only likely dependency is whether the current manifest-only polling is enough to deliver clean route-state messaging. If not, the existing runtime endpoint is the preferred minimal reuse path before any new backend feature is considered.

### References

- Browser-first MVP user journey: [Source: _bmad-output/planning-artifacts/prd.md#6-User-Journey]
- Async processing and route-state requirements: [Source: _bmad-output/planning-artifacts/prd.md#7-Functional-Requirements]
- Frontend state model and browser-route expectations: [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- Hosted app and same-origin direction: [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure--Deployment]
- Epic 4 story order: [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Productize-Browser-Entry-And-Hosted-Delivery]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Start from the current dashboard route state handling and identify the minimal gaps against the browser-first MVP.
- Improve processing continuity and terminal states without disturbing ready-state dashboard behavior.
- Add route-level frontend tests before implementation is considered complete.

### Debug Log References

- `npm.cmd test`
- `npm.cmd run build`

### Completion Notes List

- Added route-aware API error handling so the frontend can distinguish missing uploads from general dashboard failures.
- Reused the existing runtime endpoint to support clearer processing, failed, and cancelled route messaging without creating a new backend workflow.
- Upgraded `/uploads/{uploadId}` to present a deliberate processing handoff, distinct missing-upload handling, and recovery links back to `/`.
- Preserved the existing ready dashboard behavior after processing completes, including search, preview, presenter mode, review-required tables, and chart switching.
- Added frontend coverage for processing continuity, failed state, cancelled state, missing-upload/not-found state, and ready-state non-regression.

### File List

- _bmad-output/implementation-artifacts/4-2-add-upload-processing-ux-and-route-level-terminal-states.md
- apps/web/src/features/dashboard/DashboardPage.tsx
- apps/web/src/features/dashboard/DashboardPage.test.tsx
- apps/web/src/features/upload/UploadPage.tsx
- apps/web/src/lib/api.ts
- apps/web/src/types/manifest.ts

## Change Log

- 2026-04-12: Story created and validated against the browser-first MVP reset, the approved 4.1 handoff flow, and the current dashboard/runtime behavior.
- 2026-04-12: Implemented route-level processing continuity, distinct terminal states, runtime-backed recovery messaging, and frontend regression coverage.
