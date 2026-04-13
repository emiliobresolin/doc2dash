# Story 4.1: Deliver Browser Upload Landing And Dashboard Handoff

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a standard business user,  
I want to start from the landing page, upload a workbook in the browser, and be taken into the generated dashboard,  
so that I can use `doc2dash` without terminal steps or manual API calls.

## Acceptance Criteria

1. The public app entry route `/` renders a real upload landing page instead of a demo dashboard link.
2. The landing page accepts `.xlsx` and `.csv` files up to 30 MB through a browser file input and shows basic file guidance before submission.
3. Submitting a valid file posts multipart form data to the existing `POST /api/uploads` endpoint and handles the current `202 Accepted` response envelope.
4. After a successful upload acknowledgement, the browser transitions automatically to `/uploads/{uploadId}` so the existing dashboard route owns `processing`, `ready`, `failed`, and `cancelled` rendering.
5. If the backend rejects the upload, the landing page surfaces the returned user-ready error message without requiring terminal inspection.
6. Frontend tests cover the landing page render, successful upload handoff to `/uploads/{uploadId}`, and rejected upload error display.

## Tasks / Subtasks

- [x] Replace the placeholder home route with a real upload landing page (AC: 1, 2)
  - [x] Remove the current demo-only homepage behavior
  - [x] Add an upload-focused page under the existing `/` route
  - [x] Show supported file types and size guidance in the UI
- [x] Add browser upload submission using the existing backend contract (AC: 2, 3, 5)
  - [x] Add a frontend API helper for multipart upload submission to `POST /api/uploads`
  - [x] Handle the current `{ data, meta, error }` envelope and `202 Accepted` response
  - [x] Surface backend validation or rejection errors on the landing page
- [x] Hand off into the existing dashboard route after upload acknowledgement (AC: 4)
  - [x] Navigate to `/uploads/{uploadId}` after a successful upload response
  - [x] Reuse the current dashboard processing/ready/failed/cancelled behavior instead of re-implementing it on the landing page
- [x] Add frontend coverage for the browser-first entry flow (AC: 6)
  - [x] Test landing page render and upload control visibility
  - [x] Test successful upload handoff into `/uploads/{uploadId}`
  - [x] Test rejected upload message rendering

## Dev Notes

- This story is intentionally the smallest clean product-facing step toward the real hosted MVP.
- Reuse the current backend ingestion and runtime engine as-is. Do not change table detection, normalization, profiling, search, charting, or bundle storage unless the browser upload flow requires a narrow integration fix.
- Reuse the existing dashboard route as the post-upload destination. The point of this story is to let normal users reach it from the browser without manual API steps.
- Do not build a separate upload wizard. Keep the handoff simple: landing page -> upload -> `/uploads/{uploadId}`.
- Local API-first flow remains valid for dev and QA support, but this story must make it unnecessary for standard users.

### Reuse From Current Implementation

- Reuse as-is:
  - `apps/api/app/api/routes/uploads.py`
  - `apps/api/app/services/workbook_ingestion.py`
  - `apps/api/app/services/upload_bundle_store.py`
  - `apps/web/src/features/dashboard/DashboardPage.tsx`
  - `apps/web/src/features/search/`
  - `apps/web/src/features/presentation/`
- Extend for browser entry flow:
  - `apps/web/src/app/routes.tsx`
  - `apps/web/src/lib/api.ts`
  - `apps/web/src/features/upload/`
- Existing reusable coverage:
  - backend upload/runtime tests in `apps/api/tests/integration/test_uploads.py`
  - dashboard route and presenter coverage in `apps/web/src/features/dashboard/DashboardPage.test.tsx`
  - presenter coverage in `apps/web/src/features/presentation/PresenterMode.test.tsx`

### Project Structure Notes

- Expected frontend files:
  - `apps/web/src/app/routes.tsx`
  - `apps/web/src/lib/api.ts`
  - `apps/web/src/features/upload/UploadPage.tsx`
  - `apps/web/src/features/upload/UploadPage.test.tsx`
- Expected backend files:
  - no major new backend feature slice is expected
  - existing upload API route is reused from `apps/api/app/api/routes/uploads.py`

### References

- Updated MVP browser-first flow: [Source: _bmad-output/planning-artifacts/prd.md#6-User-Journey]
- Browser upload and hosted app requirements: [Source: _bmad-output/planning-artifacts/prd.md#7-Functional-Requirements]
- Same-origin and hosted app assumptions: [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure--Deployment]
- Frontend route and state expectations: [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- Corrected backlog priority: [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Productize-Browser-Entry-And-Hosted-Delivery]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Start with route-level frontend tests for the landing page and upload handoff.
- Implement the upload page and multipart submission helper next.
- Reuse the existing dashboard route for processing and terminal state rendering.

### Debug Log References

- `npm.cmd test`
- `npm.cmd run build`

### Completion Notes List

- Replaced the placeholder homepage with a browser-first upload landing page at `/`.
- Added client-side validation for supported file types and the 30 MB size limit before submission.
- Reused the existing `POST /api/uploads` backend contract and automatic dashboard handoff to `/uploads/{uploadId}`.
- Preserved the current dashboard experience so processing, ready, failed, and cancelled states continue to render from the existing dashboard route.
- Added a Vite `/api` dev proxy so local browser verification works in a normal same-origin-like session without disabling web security.
- Kept frontend API calls relative by default and normalized optional `VITE_API_BASE_URL` overrides.
- Added frontend coverage for landing render, valid upload handoff, backend rejection messaging, unsupported-file blocking, and oversize-file blocking.

### File List

- _bmad-output/implementation-artifacts/4-1-deliver-browser-upload-landing-and-dashboard-handoff.md
- apps/web/src/app/routes.tsx
- apps/web/src/lib/api.ts
- apps/web/src/styles/globals.css
- apps/web/vite.config.ts
- apps/web/src/features/upload/UploadPage.tsx
- apps/web/src/features/upload/UploadPage.test.tsx

## Change Log

- 2026-04-12: Story created as the first implementation step in the browser-first MVP correction.
- 2026-04-12: Implemented the browser upload landing page, upload API handoff, and frontend coverage for the first-run user flow.
- 2026-04-12: Added local `/api` dev proxy support and oversize-file regression coverage after QA re-review.
