# Story 2.3: Search And Preview Across Extracted Data

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,  
I want fast searchable previews,  
so that I can jump to the right table or record set when the default dashboard is not enough.

## Acceptance Criteria

1. The backend provides indexed preview search across extracted workbook data with source sheet/table context and highlighted matches.
2. Preview search returns in under 500 ms for indexed preview workflows under the agreed MVP workload.
3. The UI exposes search as a supporting capability and not as a required step for first value.
4. Presenter-safe search interactions and search-driven table refinement keep the layout stable and avoid disruptive UI thrash during meetings.
5. Tests cover search accuracy, preview result structure, and stable UI state under presenter mode.

## Tasks / Subtasks

- [x] Implement backend preview indexing and search (AC: 1, 2)
  - [x] Build a bounded preview index from manifest/table artifacts
  - [x] Return result items with source sheet/table context and match snippets
  - [x] Keep the query path optimized for preview search, not arbitrary full-table scans
- [x] Expose search APIs and payload contracts (AC: 1, 2)
  - [x] Implement `GET /api/uploads/{uploadId}/search`
  - [x] Implement preview pagination or bounded result sizing
  - [x] Keep payloads aligned with manifest/table identities
- [x] Build frontend search and preview UX (AC: 3, 4)
  - [x] Add the always-visible search bar to the dashboard shell
  - [x] Render compact highlighted result previews with source context
  - [x] Keep presenter mode stable when search refines the viewed table or preview
- [x] Add tests and performance checks for search behavior (AC: 5)
  - [x] Backend tests for search matching and result structure
  - [x] Frontend tests for search UI state
  - [x] Automated latency checks for indexed preview search

## Dev Notes

- Search is intentionally a supporting capability. Do not force users into search before they can read the default dashboard.
- The 500 ms target applies to indexed preview search, not arbitrary scans across every stored row.
- Preserve source context in every result so the user can explain where the match came from in a meeting.
- Search interactions in presenter mode should preserve layout stability and the current narrative flow.

### Project Structure Notes

- Expected backend files:
  - `apps/api/app/services/preview_search.py`
  - `apps/api/app/api/routes/search.py`
  - `apps/api/app/schemas/api.py`
- Expected frontend files:
  - `apps/web/src/features/search/`
  - `apps/web/src/components/preview/`
  - `apps/web/src/lib/api.ts`
- Expected tests:
  - `apps/api/tests/unit/test_preview_search.py`
  - `apps/api/tests/integration/test_search_api.py`
  - `apps/web/src/features/search/*.test.tsx`

### References

- Architecture API endpoints and search constraints: [Source: _bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns]
- Architecture frontend and presenter-state rules: [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- Product search and performance requirements: [Source: _bmad-output/planning-artifacts/prd.md#FR7-Search-And-Preview]
- Product performance requirements: [Source: _bmad-output/planning-artifacts/prd.md#NFR1-Performance]
- Epic breakdown for story 2.3: [Source: _bmad-output/planning-artifacts/epics.md#Story-23-Search-And-Preview-Across-Extracted-Data]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Start with backend search result tests and latency-oriented design.
- Build the search UI after the API result contract is stable.
- Treat layout stability in presenter mode as part of the feature, not a later polish pass.

### Debug Log References

- `python -m pytest apps/api/tests/unit/test_preview_search.py apps/api/tests/integration/test_search_api.py`
- `python -m pytest`
- `npm.cmd test`
- `npm.cmd run build`

### Completion Notes List

- Architect review confirmed the story still matched the current product direction after one minimal wording fix: presenter-safe behavior is defined around search-driven refinement, not a broader filter model that does not exist yet.
- Added a bounded preview-search index over persisted preview artifacts with cached signatures, source sheet/table context, snippets, matched columns, preview rows, and bounded result sizing.
- Exposed `GET /api/uploads/{uploadId}/search` and shared API contracts for compact preview-search payloads.
- Added an always-visible dashboard search panel with highlighted compact results, source context, and safe handoff into the selected table preview.
- Preserved presenter-mode stability while search refines the viewed table, and added regression coverage for that flow.
- Hardened the backend search tests to use repo-local runtime directories instead of `pytest`'s Windows temp root so the suite remains stable on this machine.
- Memoized the preview-search service per uploads root so preview indices now persist across API requests within the same process while still invalidating when preview artifacts change.
- Added API-level coverage for cache reuse and invalidation, plus frontend coverage that verifies eligible queries show a pending/searching state instead of a premature empty-state message.

### File List

- _bmad-output/implementation-artifacts/2-3-search-and-preview-across-extracted-data.md
- apps/api/app/api/deps.py
- apps/api/app/api/routes/search.py
- apps/api/app/main.py
- apps/api/app/schemas/api.py
- apps/api/app/services/preview_search.py
- apps/api/tests/integration/test_search_api.py
- apps/api/tests/conftest.py
- apps/api/tests/unit/test_preview_search.py
- apps/web/src/components/preview/SearchResultList.tsx
- apps/web/src/features/dashboard/DashboardPage.test.tsx
- apps/web/src/features/dashboard/DashboardPage.tsx
- apps/web/src/features/search/SearchPanel.test.tsx
- apps/web/src/features/search/SearchPanel.tsx
- apps/web/src/lib/api.ts
- apps/web/src/styles/globals.css
- apps/web/src/types/search.ts

## Change Log

- 2026-04-04: Story created and marked `ready-for-dev`.
- 2026-04-11: Aligned presenter-safe wording with the current search-first implementation and moved the story to `review` after implementation.
- 2026-04-11: Addressed QA follow-up by persisting preview-search indexing across requests, adding lifecycle-aware API cache coverage, and removing the dashboard search empty-state flicker.
- 2026-04-11: QA re-review approved the story as done after verifying cache persistence, invalidation, and pending search-state behavior.
