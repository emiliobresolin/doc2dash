# Story 4.4: Define Hosted MVP Deployment And Runtime Configuration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a delivery team,  
I want a clear hosted deployment model and runtime configuration contract,  
so that `doc2dash` can be run as a real internal webapp by other people instead of remaining a developer-only setup.

## Story Goal

Make the current browser-first and same-origin application shape realistically deployable as a hosted MVP.

This story should define and implement the minimum deployable contract for:

- one public app origin
- frontend build plus backend hosted serving
- persistent runtime storage for upload bundles
- required environment and runtime settings
- the minimum run/deploy documentation needed for another internal team to operate the MVP

## Acceptance Criteria

1. The project includes clear hosted MVP run/deployment documentation that describes the supported one-origin shape: browser routes served by the frontend app, `/api/*` served by FastAPI, and FastAPI serving the built frontend assets in hosted mode.
2. The minimum runtime configuration contract is explicit and documented, including:
   - frontend build output location
   - upload bundle storage root
   - upload size limit
   - any assumptions about internal access, retention, and runtime persistence for MVP
3. The documented hosted MVP shape assumes persistent storage for upload bundles and explains that local ephemeral storage is not acceptable for real hosted use.
4. The hosted MVP documentation includes exact steps to build the frontend, point FastAPI at the built frontend assets, start the backend in hosted mode, and verify the browser-first flow from `/` to `/uploads/{uploadId}`.
5. The hosted MVP documentation clearly distinguishes what is in scope for MVP versus what remains out of scope, including auth/accounts, advanced infrastructure automation, object storage migration, worker-queue migration, and enterprise-grade retention/audit policy implementation.
6. The implementation includes any minimal code or config needed to make the documented hosted MVP contract real and discoverable, but does not drift into platform-specific automation or full deployment tooling.
7. The story leaves the project in a state where an internal team can reasonably deploy and run the MVP behind an existing company access layer without inventing missing runtime assumptions.

## Expected Hosted Runtime Behavior

1. An internal team builds the frontend static bundle from `apps/web`.
2. The hosted environment runs FastAPI from `apps/api` with hosted mode enabled and points it to the built frontend dist directory.
3. Standard users open one internal URL.
4. `/` resolves to the upload landing page, `/uploads/{uploadId}` resolves through SPA fallback, and `/api/*` continues to hit FastAPI routes.
5. Uploaded workbook bundles are stored in a persistent directory configured for the environment.
6. If the app process restarts, previously generated uploads remain available as long as the persistent storage mount remains intact.

## Boundaries / Non-Goals

- Do not add authentication, user accounts, sharing, or role-aware access control.
- Do not implement container orchestration, Terraform, Helm, cloud provisioning, CI/CD, or platform-specific deployment automation.
- Do not add new ingestion, search, dashboard, or charting capabilities.
- Do not migrate bundle storage to object storage or add worker queues in this story.
- Do not promise enterprise-grade retention, audit, observability, or security hardening beyond the minimum internal MVP assumptions.

## Tasks / Subtasks

- [x] Define the hosted MVP runtime contract (AC: 1, 2, 3, 5, 7)
  - [x] Document the one-origin hosting shape and runtime ownership between frontend routes and `/api/*`
  - [x] Document the required environment variables and their purpose
  - [x] Document persistent storage expectations for upload bundles in hosted environments
  - [x] Document MVP access-layer assumptions and explicit out-of-scope items
- [x] Make the hosted runtime contract discoverable in the repo (AC: 1, 2, 4, 6)
  - [x] Add or update repo-level documentation for local hosted-like startup and hosted MVP startup
  - [x] Add a minimal example configuration or env template if needed to make the contract concrete
  - [x] Ensure the existing hosted-mode backend setting names and expectations are documented accurately
- [x] Verify the hosted MVP handoff path operationally (AC: 4, 6, 7)
  - [x] Document exact build and run steps for the hosted MVP path
  - [x] Add or update lightweight verification notes so another team can confirm `/`, `/uploads/{uploadId}`, and `/api/*` behavior after deployment

## Dev Notes

- This story is intentionally the minimum operationalization step for MVP, not a production-platform project.
- The current codebase already supports the application shape we need:
  - browser upload flow from story `4.1`
  - route-level processing and terminal states from story `4.2`
  - same-origin hosted frontend serving from story `4.3`
- The key gap now is making the hosted path explicit, repeatable, and runnable by others without tribal knowledge.
- Prefer boring documentation and a small explicit config contract over clever deployment abstraction.

### Reuse From Current Implementation

- Reuse as-is:
  - `apps/api/app/main.py`
  - `apps/api/app/core/config.py`
  - `apps/web/package.json`
  - `apps/web/src/app/routes.tsx`
  - `apps/web/src/features/upload/UploadPage.tsx`
  - `apps/web/src/features/dashboard/DashboardPage.tsx`
- Likely extension points:
  - `README.md`
  - `docs/project-context.md`
  - hosted MVP documentation under `_bmad-output/` or `docs/`
  - optional env example or startup note files
- Existing reusable coverage:
  - `apps/api/tests/integration/test_hosted_frontend_integration.py`
  - `apps/api/tests/integration/test_uploads.py`
  - `apps/web/src/features/upload/UploadPage.test.tsx`
  - `apps/web/src/features/dashboard/DashboardPage.test.tsx`

### Current-Code Alignment Notes

- Story `4.3` already provides the hosted same-origin application shell through FastAPI plus SPA fallback.
- The current config surface already includes:
  - `DOC2DASH_UPLOADS_ROOT`
  - `DOC2DASH_MAX_UPLOAD_SIZE_BYTES` (`31457280` / 30 MB default)
  - `DOC2DASH_FRONTEND_DIST_ROOT`
- What is still missing is a clear, explicit deployment/runtime contract that tells another team how to use those settings for a real hosted MVP.

### Small Risk / Dependency Note

- The main risk is underspecifying persistence. If hosted teams treat upload bundle storage as ephemeral, the app will appear to lose generated dashboards after restarts.
- This story should be explicit that MVP usability depends on a persistent storage mount and an existing internal access layer outside the app.

### MVP Practicality Statement

- Finishing this story should be enough to call `doc2dash` a real usable hosted MVP for internal users, provided the hosting environment offers:
  - one public/internal URL
  - persistent filesystem storage for upload bundles
  - an existing company access layer in front of the app if access restriction is required
- After `4.4`, the app would still not be enterprise-complete. Major out-of-scope follow-ups remain:
  - app-level auth/accounts
  - infrastructure automation
  - object storage and queue-based processing
  - retention/audit hardening
  - browser E2E automation for the hosted path

### References

- Browser-first MVP user journey: [Source: _bmad-output/planning-artifacts/prd.md#6-User-Journey]
- Hosted webapp acceptance criteria: [Source: _bmad-output/planning-artifacts/prd.md#10-Acceptance-Criteria]
- Same-origin hosting and runtime assumptions: [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure--Deployment]
- Epic 4 story order: [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Productize-Browser-Entry-And-Hosted-Delivery]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Document the hosted MVP run/deploy contract in one concrete place before adding any new operational complexity.
- Add a minimal environment reference so another team can discover the required runtime settings without reading backend code.
- Re-run only the hosted integration and frontend build checks that this story’s contract depends on.

### Debug Log References

- `python -m pytest apps/api/tests/integration/test_hosted_frontend_integration.py`
- `npm.cmd run build`

### Completion Notes List

- Added a dedicated hosted MVP runbook covering the one-origin app shape, required runtime settings, persistent storage expectations, exact build/run steps, and out-of-scope items.
- Added a minimal hosted environment reference file for the backend runtime variables used by the current hosted MVP path.
- Updated the repo README so the hosted MVP contract is discoverable from the project entry point instead of being buried in planning artifacts.
- Kept the implementation tightly scoped to documentation and config discoverability; no new product behavior or infrastructure automation was added.
- Added `uvicorn` to the backend runtime dependency contract so the documented hosted startup command is installable from the project itself.
- Completed the hosted runbook with an explicit backend install step before frontend build, env setup, and hosted startup verification.
- Updated the product-wide upload limit from 10 MB to 30 MB (`31457280` bytes) across backend defaults, frontend validation, docs, and tests.
- Locked the first hosted MVP deployment path to a single Render Docker web service with a persistent disk and documented the exact service shape, startup command, URL format, and verification checklist.
- Clarified the exact local Docker smoke command, the correct browser URL, and why `0.0.0.0:10000` is not a browser target.
- Clarified that a plain Render `Not Found` with `x-render-routing: no-server` points to Render service/deploy configuration before it points to an app defect.

### File List

- _bmad-output/implementation-artifacts/4-4-define-hosted-mvp-deployment-and-runtime-configuration.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/tests/test-summary.md
- README.md
- docs/hosted-mvp.md
- apps/api/.env.hosted.example
- apps/api/pyproject.toml
- Dockerfile
- .dockerignore
- apps/api/app/core/config.py
- apps/api/app/utils/file_validation.py
- apps/api/tests/unit/test_file_validation.py
- apps/api/tests/integration/test_uploads.py
- apps/web/src/features/upload/UploadPage.tsx
- apps/web/src/features/upload/UploadPage.test.tsx
- docs/project-context.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/epics.md
- _bmad-output/implementation-artifacts/1-1-upload-validate-and-build-workbook-manifest.md
- _bmad-output/implementation-artifacts/4-1-deliver-browser-upload-landing-and-dashboard-handoff.md

## Change Log

- 2026-04-12: Story created and validated as the final hosted MVP planning step for Epic 4.
- 2026-04-12: Added hosted MVP runtime documentation, a backend env reference file, and repo-level discoverability for the hosted deployment contract.
- 2026-04-12: Fixed the hosted startup contract by adding `uvicorn` to backend runtime dependencies and documenting the full backend install path.
- 2026-04-12: Raised the upload limit to 30 MB and documented the first concrete hosted deployment path as a Render Docker web service with a persistent disk.
- 2026-04-12: Clarified the local Docker smoke path and the first Render checks for the `x-render-routing: no-server` deployment symptom.
