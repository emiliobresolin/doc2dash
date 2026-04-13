# Test Automation Summary

## Stories

- `1.1` Upload, Validate, And Build Workbook Manifest
- `1.2` Detect Sheet And Table Boundaries
- `1.3` Normalize Wide Tables And Profile Columns
- `2.1` Deliver Default Dashboard Shell And Workbook Navigation
- `2.2` Reuse Or Generate Safe Presentation Charts
- `2.3` Search And Preview Across Extracted Data
- `3.1` Create Fixture Pack And Automated Detection Tests
- `3.2` Add Accessibility And Low-Confidence Review UX
- `3.3` Harden Performance, Cancellation, And Failure Recovery
- `4.1` Deliver Browser Upload Landing And Dashboard Handoff
- `4.2` Add Upload Processing UX And Route-Level Terminal States
- `4.3` Productionize Same-Origin Frontend And Backend Integration
- `4.4` Define Hosted MVP Deployment And Runtime Configuration

## Generated Tests

### API Integration Tests

- [x] `apps/api/tests/integration/test_uploads.py` - Async upload acknowledgement, manifest polling, persisted table/preview artifacts, oversize rejection, unsupported type rejection, corrupt workbook rejection
- [x] `apps/api/tests/integration/test_detect_tables_manifest.py` - Multi-block sheet manifest splitting and review-required repeated-header handling
- [x] `apps/api/tests/integration/test_normalize_profile_pipeline.py` - Workbook-level normalization and profile metadata
- [x] `apps/api/tests/integration/test_search_api.py` - Indexed preview-search API results, source context, empty-query behavior, and API-level cache reuse/invalidation
- [x] `apps/api/tests/integration/test_search_api.py` - Indexed preview-search API results, source context, empty-query behavior, API-level cache reuse/invalidation, and bounded preview-search latency checks
- [x] `apps/api/tests/integration/test_fixture_library_regressions.py` - Fixture-driven workbook expectations plus the ugly-workbook upload path to manifest/default-view/preview outputs
- [x] `apps/api/tests/integration/test_uploads.py` - Runtime detail persistence, paginated preview reads, cancellation cleanup, failed-processing recovery, and ready-state cancel protection
- [x] `apps/api/tests/integration/test_hosted_frontend_integration.py` - Hosted frontend entry serving, SPA fallback on `/uploads/{uploadId}`, and `/api/*` route precedence over frontend fallback
- [x] `apps/api/tests/integration/test_uploads.py` - 30 MB upload-limit enforcement and oversize rejection behavior

### Unit Tests

- [x] `apps/api/tests/unit/test_file_validation.py` - Validation rules and stable error codes
- [x] `apps/api/tests/unit/test_workbook_ingestion.py` - Excel sheet loading, CSV synthetic sheet creation, corrupt workbook handling
- [x] `apps/api/tests/unit/test_detect_tables.py` - Dense region detection, blank-column separation, spacer-column continuation merge, repeated-header ambiguity
- [x] `apps/api/tests/unit/test_normalize_tables.py` - Wide-to-long reshaping, long-form preservation, ambiguous skip behavior
- [x] `apps/api/tests/unit/test_profile_tables.py` - Column-role inference, categorical chartability, note-column text behavior, and table-first fallback behavior
- [x] `apps/api/tests/unit/test_select_default_view.py` - Summary-first default-view ranking that prefers trusted, chart-friendly tables
- [x] `apps/api/tests/unit/test_chart_strategy.py` - Reused, reconstructed, generated, and table-only chart strategy outcomes
- [x] `apps/api/tests/unit/test_preview_search.py` - Indexed preview search grouping, source context, bounded results, and reused-index latency behavior

### Frontend Component Tests

- [x] `apps/web/src/features/dashboard/DashboardPage.test.tsx` - Manifest-driven landing, workbook navigation changes, failed/no-table terminal states, stale-preview clearing, and valid chart switching
- [x] `apps/web/src/features/presentation/PresenterMode.test.tsx` - Presenter-mode toggle, keyboard flow, low-clutter layout, stable focus-section transitions, and review-required cue visibility
- [x] `apps/web/src/components/charts/ChartPanel.test.tsx` - Valid chart-option exposure, provenance visibility, and table fallback switching
- [x] `apps/web/src/features/search/SearchPanel.test.tsx` - Highlighted compact search results and table selection from preview search
- [x] `apps/web/src/features/dashboard/DashboardPage.test.tsx` - Presenter-safe search refinement and pending search-state behavior
- [x] `apps/web/src/features/dashboard/DashboardPage.test.tsx` - Low-confidence review rendering, source-preview jump, and arrow-key workbook navigation
- [x] `apps/web/src/features/dashboard/DashboardPage.test.tsx` - Presenter shortcut scoping while the search input is focused
- [x] `apps/web/src/features/dashboard/DashboardPage.test.tsx` - Cancelled-manifest terminal state plus paginated preview stability in presenter mode
- [x] `apps/web/src/features/upload/UploadPage.test.tsx` - Browser upload landing, successful handoff into `/uploads/{uploadId}`, backend rejection messaging, unsupported-file blocking, and oversize-file blocking
- [x] `apps/web/src/features/upload/UploadPage.test.tsx` - 30 MB client-side upload limit messaging and oversize-file blocking
- [x] `apps/web/src/features/dashboard/DashboardPage.test.tsx` - Upload-handoff processing continuity, distinct missing-upload state, and recovery paths for failed and cancelled upload routes

## Coverage

- Upload validation rules: covered
- Workbook ingestion entry paths: covered
- Bundle creation and manifest persistence: covered through integration tests
- Async upload acknowledgement and manifest retrieval: covered through integration tests
- Table and preview artifact persistence: covered through integration tests
- Deterministic table boundary detection: covered
- Spacer-column continuation heuristics: covered
- Review-required table ambiguity path: covered
- Wide-table normalization and long-form preservation: covered
- Profiling roles and table-level chartability metadata: covered
- Backend default-view selection: covered
- Dashboard landing and workbook navigation: covered through frontend component tests
- Failed-manifest and no-table dashboard terminal states: covered through frontend component tests
- Stale preview clearing on table switch: covered through frontend component tests
- Chart provenance selection and safe-option suppression: covered through unit and frontend component tests
- Manifest-driven chart switching without semantic drift: covered through frontend component tests
- Interactive Plotly chart rendering and safe fallback states: covered through frontend component tests
- Presenter-mode state transitions: covered through frontend component tests
- Presenter-mode low-clutter layout behavior: covered through frontend component tests
- Indexed preview search, source-aware result payloads, and bounded result sizing: covered
- API-level preview-search cache reuse and invalidation across repeated requests: covered
- Dashboard search handoff and presenter-mode stability during table refinement: covered through frontend component tests
- Pending search-state behavior without premature empty-state messaging: covered through frontend component tests
- Versioned workbook fixture library for messy spreadsheet shapes: covered
- Fixture-driven sheet/table counts, bounds, review-required behavior, normalization status, and key profile roles: covered
- Ugly-workbook upload path through manifest/default-view/preview outputs: covered through integration tests
- Review-required state rendering and source-preview reachability: covered through frontend component tests
- Presenter-safe trust/provenance visibility for ambiguous tables: covered through frontend component tests
- Keyboard workbook navigation and section focus management: covered through frontend component tests
- Presenter shortcut isolation from focused interactive controls: covered through frontend component tests
- Runtime detail persistence for processing, ready, failed, and cancelled bundle states: covered through integration tests
- Generated-artifact cleanup on cancellation and failed processing: covered through integration tests
- Ready-state uploads reject cancel requests without losing artifacts: covered through integration tests
- Paginated preview payloads for larger row sets: covered through integration tests and frontend component tests
- Presenter-mode stability while preview pages change: covered through frontend component tests
- Bounded preview-search latency checks against larger uploads: covered through integration tests
- Reused-index preview-search latency checks: covered through unit tests
- Browser-first upload landing and automatic dashboard handoff: covered through frontend component tests
- Route-level processing continuity and browser-first recovery states on `/uploads/{uploadId}`: covered through frontend component tests
- Same-origin hosted frontend entry serving and SPA fallback for browser routes: covered through backend integration tests
- API route precedence over hosted frontend fallback: covered through backend integration tests
- Hosted MVP runtime contract, startup instructions, and environment discoverability: documented through repo runbook and env reference artifacts
- 30 MB upload-size contract across backend defaults, frontend validation, user-facing copy, docs, and tests: covered
- Concrete first hosted deployment path via Render Docker web service plus persistent disk contract: documented
- Browser E2E: not applicable yet because the route-level browser flow exists, but hosted-path browser automation is not yet in place

## Verification

- Command run: `python -m pytest apps/api/tests/unit/test_file_validation.py apps/api/tests/integration/test_uploads.py apps/api/tests/integration/test_hosted_frontend_integration.py`
- Result: `16 passed`
- Command run: `npm.cmd test`
- Result: `24 passed`
- Command run: `npm.cmd run build`
- Result: `vite build` succeeded
- Command run: hosted-mode FastAPI smoke with built frontend assets
- Result: `/` returned the SPA shell, `/uploads/{uploadId}` resolved through SPA fallback, and `/api/does-not-exist` returned JSON `404`
- Command run: `docker build -t doc2dash-mvp .`
- Result: could not complete locally because the Docker daemon was not running (`dockerDesktopLinuxEngine` unavailable)

## Next Steps

- QA review the 30 MB upload-limit update and the concrete Render deployment contract before the first hosted rollout
