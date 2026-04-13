# Story 1.1: Upload, Validate, And Build Workbook Manifest

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a non-technical user,  
I want to upload a workbook and receive a structured processing result,  
so that I can trust the system has understood the file at a basic level.

## Acceptance Criteria

1. The backend accepts `.xlsx` and `.csv` uploads up to 30 MB and rejects unsupported, corrupt, or oversized files with stable error codes and user-ready messages.
2. Excel ingestion uses `pandas.read_excel(sheet_name=None)` and CSV ingestion creates a synthetic single-sheet workbook representation.
3. A successful upload creates an upload bundle and returns an upload identifier with a `processing` or `ready` status payload that conforms to the architecture envelope.
4. The workbook manifest captures file metadata plus sheet-level metadata at minimum: sheet name, order, row count, column count, and empty/not-empty status.
5. The workbook manifest includes enough metadata to support later default-view selection without requiring manual dashboard composition.
6. Unit and integration tests cover valid Excel upload, valid CSV upload, oversize rejection, unsupported type rejection, and corrupt file handling.

## Tasks / Subtasks

- [x] Implement the upload API contract and validation layer (AC: 1, 3)
  - [x] Add `POST /api/uploads` request handling with `UploadFile`
  - [x] Enforce extension, content-type, and 30 MB size checks before parsing
  - [x] Return the standard `{data, meta, error}` response envelope
- [x] Create upload bundle storage and identifiers (AC: 3)
  - [x] Generate opaque upload IDs
  - [x] Persist the original uploaded file under `data/uploads/{upload_id}/source/`
  - [x] Create a manifest shell and bundle folders for future pipeline steps
- [x] Implement workbook ingestion for `.xlsx` and `.csv` (AC: 2, 4, 5)
  - [x] Use `pandas.read_excel(sheet_name=None)` for Excel
  - [x] Wrap CSV into a synthetic workbook with one sheet
  - [x] Record sheet-level metadata for the manifest
- [x] Add default-view support placeholders to the manifest shell (AC: 3, 5)
  - [x] Include `presentation` and `defaultView` envelope fields even if later stories compute the final values
  - [x] Preserve source provenance fields that later presentation flows can surface
- [x] Add backend tests for validation and ingestion (AC: 1, 2, 4, 5, 6)
  - [x] Unit tests for file validation and manifest construction
  - [x] Integration tests for upload happy path and error scenarios
- [x] Document the API contract in code comments or schema definitions where needed (AC: 3, 4, 5)
  - [x] Keep manifest and response schemas aligned with the architecture document

## Dev Notes

- This story establishes the API and manifest spine for the rest of the product. Do not add table detection, normalization, or charting here unless directly required by the acceptance criteria.
- Keep parsing in backend Python code only.
- Use the file-based upload bundle pattern from the architecture document; do not introduce a database in this story.
- The upload acknowledgement can use FastAPI `BackgroundTasks`, but the parsing function must stay isolated enough to move into a worker later.
- Treat CSV as one workbook sheet named `Sheet1` unless a stronger naming rule is introduced later.
- API payloads must be `camelCase`; Python internals remain `snake_case`.
- Include manifest fields that later stories will use for default-first dashboard selection and presenter mode, even if their values are placeholders in this story.

### Project Structure Notes

- Expected backend files:
  - `apps/api/app/main.py`
  - `apps/api/app/api/routes/uploads.py`
  - `apps/api/app/schemas/api.py`
  - `apps/api/app/schemas/manifest.py`
  - `apps/api/app/schemas/uploads.py`
  - `apps/api/app/services/upload_bundle_store.py`
  - `apps/api/app/services/workbook_ingestion.py`
  - `apps/api/app/utils/file_validation.py`
  - `apps/api/app/utils/ids.py`
- Expected tests:
  - `apps/api/tests/unit/test_file_validation.py`
  - `apps/api/tests/unit/test_workbook_ingestion.py`
  - `apps/api/tests/integration/test_uploads.py`

### References

- Architecture data/storage rules: [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- Architecture API rules: [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- Architecture structure and file locations: [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- Product scope and file constraints: [Source: _bmad-output/planning-artifacts/prd.md#7-Functional-Requirements]
- Default-first and minimal-interaction product expectations: [Source: _bmad-output/planning-artifacts/prd.md#6-User-Journey]
- Technical research for ingestion/background tasks: [Source: _bmad-output/planning-artifacts/technical-research.md#Findings]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Start with failing validation and upload integration tests.
- Build schema and storage helpers next.
- Implement the Excel and CSV ingestion path.
- Keep the manifest minimal but correctly shaped for later stories.

### Debug Log References

- `python -m pytest`

### Completion Notes List

- Implemented the first FastAPI backend slice for `POST /api/uploads` with camelCase response envelopes and stable validation errors.
- Added file-based upload bundle creation, persisted source uploads, and wrote manifest shells to `data/uploads/{uploadId}/manifest.json`.
- Implemented Excel ingestion via `pandas.read_excel(sheet_name=None)` and CSV synthetic workbook ingestion with sheet-level metadata, presentation placeholders, and default-view placeholders.
- Added unit and integration coverage for valid uploads, corrupt files, unsupported types, and oversized files.
- Added QA automation summary for story `1.1` at `_bmad-output/implementation-artifacts/tests/test-summary.md`.
- Remediated the Epic 1 QA gaps by switching upload acknowledgement to `202 Accepted`, validating corrupt files before background processing, adding manifest polling endpoints, and persisting table/preview JSON artifacts for Epic 2 consumption.

### File List

- apps/api/pyproject.toml
- apps/api/app/__init__.py
- apps/api/app/main.py
- apps/api/app/core/__init__.py
- apps/api/app/core/config.py
- apps/api/app/core/errors.py
- apps/api/app/api/__init__.py
- apps/api/app/api/deps.py
- apps/api/app/api/routes/__init__.py
- apps/api/app/api/routes/uploads.py
- apps/api/app/schemas/__init__.py
- apps/api/app/schemas/api.py
- apps/api/app/schemas/manifest.py
- apps/api/app/schemas/uploads.py
- apps/api/app/services/__init__.py
- apps/api/app/services/upload_bundle_store.py
- apps/api/app/services/workbook_ingestion.py
- apps/api/app/utils/__init__.py
- apps/api/app/utils/file_validation.py
- apps/api/app/utils/ids.py
- apps/api/tests/__init__.py
- apps/api/tests/conftest.py
- apps/api/tests/unit/test_file_validation.py
- apps/api/tests/unit/test_workbook_ingestion.py
- apps/api/tests/integration/test_uploads.py
- data/uploads/.gitkeep
- _bmad-output/implementation-artifacts/tests/test-summary.md

## Change Log

- 2026-04-04: Story created and marked `ready-for-dev`.
- 2026-04-04: Implemented upload validation, bundle storage, workbook ingestion, and automated tests; status moved to `review`.
- 2026-04-04: Added async upload acknowledgement, manifest retrieval, and persisted bundle artifacts after Epic 1 QA remediation.
