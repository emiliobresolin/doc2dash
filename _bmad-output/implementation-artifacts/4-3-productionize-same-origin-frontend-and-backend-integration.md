# Story 4.3: Productionize Same-Origin Frontend And Backend Integration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a standard business user,  
I want `doc2dash` to behave like one hosted webapp under one normal URL,  
so that browser routes and API requests work together without development-only setup or manual URL handling.

## Story Goal

Turn the current browser-first flow from stories `4.1` and `4.2` into a real same-origin MVP application shape for hosted use.

This story should make the current app behave correctly when accessed behind one public origin by ensuring:

- browser routes such as `/` and `/uploads/{uploadId}` resolve to the frontend app
- `/api/*` continues to resolve to FastAPI
- the frontend uses relative API paths in the normal hosted flow
- local split-process development remains supported, but is no longer the assumed product hosting model

## Acceptance Criteria

1. The application supports a same-origin hosted mode in which one public origin serves browser routes and `/api/*` without requiring manual API base URLs for standard users.
2. In same-origin hosted mode, requesting `/` returns the frontend app entry and requesting `/uploads/{uploadId}` also resolves correctly as a browser route instead of returning a backend 404.
3. In same-origin hosted mode, requests under `/api/*` continue to hit FastAPI API routes and are not shadowed by the frontend app fallback.
4. The browser-first flow from stories `4.1` and `4.2` continues to work unchanged in same-origin hosted mode: upload from `/`, handoff to `/uploads/{uploadId}`, processing continuity, terminal states, and ready dashboard rendering.
5. Local development remains usable with the existing Vite dev server and `/api` proxy path, but the normal product path is documented and implemented as one public-origin app shape.
6. Production-friendly configuration needed for same-origin integration is explicit and minimal, including how the backend locates the built frontend assets when hosted mode is enabled.
7. Automated verification covers same-origin route serving, SPA fallback for `/uploads/{uploadId}`, and API route precedence over the frontend fallback.

## Expected User Flow And Hosting Behavior

1. A user opens the hosted `doc2dash` URL in the browser.
2. The browser requests `/` and receives the frontend app entry from the same public origin that also serves `/api/*`.
3. The user uploads a workbook from the landing page and the frontend calls relative `/api/uploads`.
4. The browser transitions to `/uploads/{uploadId}` and continues to use relative `/api/*` requests on the same origin for manifest, runtime, preview, and search.
5. If a user reloads or directly opens `/uploads/{uploadId}`, the hosted app still resolves to the frontend route correctly and the dashboard flow continues without requiring a separate frontend dev server or manual route rewrite.

## Boundaries / Non-Goals

- Do not implement deployment infrastructure, container orchestration, hosting provider setup, or runtime operations. That belongs to story `4.4`.
- Do not add authentication, authorization, sharing, or user-account behavior.
- Do not redesign the upload flow, dashboard flow, or terminal-state UX already delivered in stories `4.1` and `4.2`.
- Do not add new ingestion, search, charting, or report-processing capabilities.
- Do not introduce a second production integration model if one clear MVP path is enough.

## Tasks / Subtasks

- [x] Add same-origin hosted integration support to the backend application shell (AC: 1, 2, 3, 6)
  - [x] Add a production-friendly configuration setting for the frontend build output location
  - [x] Serve the built frontend assets from FastAPI when hosted mode is enabled
  - [x] Add SPA fallback handling for browser routes such as `/` and `/uploads/{uploadId}`
  - [x] Preserve `/api/*` precedence so API routes are never shadowed by the frontend fallback
- [x] Preserve the current browser-first frontend behavior under the same-origin hosted shape (AC: 1, 4, 5)
  - [x] Keep relative `/api` calls as the default browser path
  - [x] Preserve the current Vite dev proxy path for local split-process development
  - [x] Avoid introducing hosted-mode assumptions that break local frontend or backend tests
- [x] Add verification for hosted integration behavior (AC: 7)
  - [x] Add backend tests for browser-route fallback and `/api/*` route precedence
  - [x] Add a minimal verification path that proves `/` and `/uploads/{uploadId}` are resolvable in same-origin hosted mode

## Dev Notes

- This story is about application integration shape, not infrastructure rollout.
- Prefer one explicit MVP hosted shape instead of abstract deployment flexibility. The simplest valid choice is to let FastAPI serve the built frontend assets and provide SPA fallback for browser routes when a frontend `dist` directory is configured.
- Local Vite proxy support remains useful for development, but it must no longer be the only working browser path.
- The main architectural guardrail is route ownership:
  - `/api/*` belongs to FastAPI
  - browser routes belong to the frontend SPA entry
- Keep the implementation boring and easy to host internally.

### Reuse From Current Implementation

- Reuse as-is:
  - `apps/web/src/app/routes.tsx`
  - `apps/web/src/features/upload/UploadPage.tsx`
  - `apps/web/src/features/dashboard/DashboardPage.tsx`
  - `apps/web/src/lib/api.ts`
  - `apps/web/vite.config.ts`
  - `apps/api/app/api/routes/uploads.py`
  - `apps/api/app/api/routes/search.py`
- Likely extension points:
  - `apps/api/app/main.py`
  - `apps/api/app/core/config.py`
  - backend integration tests under `apps/api/tests/integration/`
- Existing reusable coverage:
  - `apps/web/src/features/upload/UploadPage.test.tsx`
  - `apps/web/src/features/dashboard/DashboardPage.test.tsx`
  - `apps/api/tests/integration/test_uploads.py`

### Current-Code Alignment Notes

- Stories `4.1` and `4.2` already deliver the browser upload entry, route handoff, and route-level terminal states.
- The frontend already defaults to relative `/api` paths, and local development already works through the Vite `/api` proxy.
- The missing production gap is that FastAPI currently serves only API routes and does not yet provide frontend static hosting or SPA fallback for browser routes.
- This story should close that gap without changing the workbook-processing engine or the dashboard feature set.

### Small Risk / Dependency Note

- The main implementation risk is route precedence. The SPA fallback must never intercept `/api/*`.
- The frontend asset path should be optional in API-only test mode so existing backend tests stay stable when hosted mode is not configured.

### References

- Browser-first MVP user journey: [Source: _bmad-output/planning-artifacts/prd.md#6-User-Journey]
- Hosted webapp and browser-first acceptance criteria: [Source: _bmad-output/planning-artifacts/prd.md#10-Acceptance-Criteria]
- Same-origin hosting direction: [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure--Deployment]
- Epic 4 story order: [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Productize-Browser-Entry-And-Hosted-Delivery]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add backend integration tests first for hosted SPA fallback on `/` and `/uploads/{uploadId}` plus `/api/*` precedence.
- Extend the FastAPI application shell with optional hosted frontend serving driven by explicit configuration.
- Keep API-only test mode and the existing Vite local development flow untouched.

### Debug Log References

- `python -m pytest apps/api/tests`
- `python -m pytest`
- `npm.cmd test`
- `npm.cmd run build`

### Completion Notes List

- Added a minimal hosted-mode backend setting so FastAPI can locate a built frontend dist directory when same-origin hosting is enabled.
- Extended FastAPI to serve the built frontend entry at `/`, provide SPA fallback for browser routes such as `/uploads/{uploadId}`, and preserve `/api/*` precedence.
- Kept hosted mode opt-in so API-only test mode remains stable when frontend assets are not configured.
- Preserved the existing relative `/api` browser behavior and the local Vite `/api` proxy development path.
- Added backend integration coverage for hosted root serving, SPA fallback on upload routes, and API-route precedence over the frontend fallback.

### File List

- _bmad-output/implementation-artifacts/4-3-productionize-same-origin-frontend-and-backend-integration.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/tests/test-summary.md
- apps/api/app/core/config.py
- apps/api/app/main.py
- apps/api/tests/integration/test_hosted_frontend_integration.py

## Change Log

- 2026-04-12: Story created and validated against the browser-first hosted MVP direction.
- 2026-04-12: Implemented hosted same-origin frontend serving, SPA fallback, API precedence protection, and backend integration coverage.
