---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - "_bmad-output/planning-artifacts/technical-research.md"
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/epics.md"
  - "docs/project-context.md"
workflowType: "architecture"
project_name: "doc2dash"
user_name: "Emilio"
date: "2026-04-04"
lastStep: 8
status: "complete"
completedAt: "2026-04-04"
---

# Architecture Decision Document

This document is the architectural source of truth for `doc2dash`. It captures the decisions, consistency rules, and project structure needed for multiple AI or human implementers to build compatible code for a hosted internal report-to-dashboard webapp where users start from a normal browser URL, upload a spreadsheet in the browser, and use the dashboard itself to replace PowerPoint-style presentations.

## Project Context Analysis

### Requirements Overview

**Functional Requirements**

`doc2dash` must provide a hosted browser-first workflow: a user opens the app at a normal URL, uploads `.xlsx` or `.csv` files up to 30 MB in the browser, receives processing handoff in the UI, lands on a generated dashboard route, and then uses searchable responsive previews plus a presenter-friendly dashboard mode. The system must still load all sheets, detect multiple tables within sheets, normalize clear wide-table layouts, profile columns, preserve report intent where possible, reuse or reconstruct existing visuals when they are presentation-worthy, and generate safe interactive charts when reuse is not enough.

**Non-Functional Requirements**

- Indexed preview search target: under 500 ms
- Typical first dashboard target: under 5 seconds
- Complex workbook target: under 10 seconds where feasible
- Accessibility is required for release
- Transformations must be explainable
- Upload processing must avoid blocking the initial response

**Scale & Complexity**

- Primary domain: full-stack data-processing web application
- Complexity level: medium-high
- Estimated architectural components: 7

Core components:

1. Upload/API ingress
2. Workbook parser
3. Table detector
4. Normalization and profiling pipeline
5. Manifest and preview store
6. Dashboard API
7. React web application

### Technical Constraints & Dependencies

- Excel ingestion must use `pandas.read_excel(sheet_name=None)`.
- CSV must be represented as a synthetic single-sheet workbook.
- Preview search SLA only applies to indexed preview data.
- The application is expected to run inside company environments behind existing authentication or trusted internal access controls.
- The standard user flow must start in the browser and must not depend on terminal commands or manual API calls.
- Frontend and backend integration must support a production-ready hosted deployment, ideally under one public origin.
- Low-confidence detections must enter a review-required state before they are considered trustworthy presentation output.
- Chart selection must be constrained to validated chart types derived from the current dataset.
- The common path should reach a readable first dashboard with little or no manual setup.
- Search, drill-down, and chart switching are supporting capabilities, not required steps for first value.
- The MVP must not depend on ML model hosting, long-running worker infrastructure, or database-heavy setup.
- The system must remain understandable to future BMAD workflows and story-generation steps.

### Cross-Cutting Concerns Identified

- File validation and security
- Detection confidence and explanation UX
- Data provenance tracking
- Report-intent preservation and visual provenance
- Performance for preview tables and search
- Presenter mode stability and large-screen readability
- Auditability for uploads, transformations, and selected outputs
- Accessibility and keyboard navigation
- Test fixtures for messy spreadsheets
- Browser upload entry flow and upload-to-dashboard routing
- Production-friendly frontend/backend integration and deployability

## Starter Template Evaluation

### Primary Technology Domain

Split-stack full-stack web application:

- Python service for ingestion and table logic
- React web app for the dashboard shell

### Starter Options Considered

1. **Single Python app with Plotly Dash**
   - Pros: fast chart proof-of-concept
   - Cons: weaker long-term UX control, harder to shape a custom search/navigation shell
2. **JavaScript-only stack**
   - Pros: one language end to end
   - Cons: weaker spreadsheet parsing ergonomics for the hardest part of the product
3. **Split-stack custom workspace**
   - Pros: best fit for pandas-first parsing and React-first UX
   - Cons: two runtimes to manage

### Selected Starter: Custom Split Workspace

**Rationale for Selection**

No single off-the-shelf starter cleanly owns a Python ingestion backend plus a React presentation-grade dashboard frontend. The architecture therefore uses official tooling for each side and a simple monorepo layout.

**Initialization Commands**

```bash
python -m venv .venv
.venv\Scripts\activate
pip install "fastapi[standard]" pandas openpyxl python-multipart pydantic-settings pyarrow
npm create vite@latest apps/web -- --template react-ts
```

**Architectural Decisions Provided By The Selected Foundation**

**Language & Runtime**

- Python `3.11+` for backend ingestion and APIs
- Node.js `20.19+` or `22.12+` for frontend development and builds

**Styling Solution**

- Plain CSS modules or scoped CSS with design tokens defined in the app shell
- No heavy design system dependency in MVP

**Build Tooling**

- FastAPI standard runtime for API development
- Vite for frontend dev server and production builds

**Testing Framework**

- `pytest` for backend unit/integration tests
- `vitest` and React Testing Library for frontend unit tests
- Playwright for end-to-end flows

**Note**

Project initialization is not a product story by itself; it is a prerequisite foundation for story 1.1.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation)**

- Split-stack architecture: FastAPI backend + React frontend
- Browser upload as the standard product entry point
- Same-origin hosted integration path for frontend and backend
- File-based upload bundle storage for MVP
- Heuristic table detection with confidence scores
- Long-format canonical data model
- Server-side preview search over bounded preview indices
- Presenter mode as a first-class frontend state
- Default-first dashboard generation with minimal interaction

**Important Decisions (Shape Architecture)**

- JSON manifest contract as the integration seam between parser and UI
- CamelCase API payloads with snake_case backend internals
- Plotly.js chart allowlist instead of open-ended chart generation
- User-selectable chart outputs driven by manifest-provided valid options
- Reuse-first chart strategy: reuse, reconstruct, then generate
- Low-confidence review UX instead of silent auto-merge
- Upstream identity-aware deployment and provenance capture for internal enterprise use

**Deferred Decisions (Post-MVP)**

- Distributed worker queue
- Object storage abstraction
- Manual table editor
- User accounts and sharing
- AI/ML table detection

### Data Architecture

#### MVP Storage Model

The MVP will not introduce a permanent relational database. Each upload is stored as a file-based bundle under:

```text
data/uploads/{upload_id}/
  source/
  manifest.json
  tables/
  previews/
  logs/
```

**Bundle contents**

- `source/`: original uploaded file
- `manifest.json`: workbook, sheet, table, profile, and chart metadata
- `tables/{table_id}.json`: normalized plus raw table storage for MVP bundle consumption
- `previews/{table_id}.json`: preview rows and search index inputs
- `logs/`: parse warnings and debug artifacts

#### Canonical Data Shape

Long format is canonical after parsing:

- identifier columns remain stable
- repeated measure columns become `variable` / `value` pairs when `melt()` rules are satisfied
- original bounds, header rows, and transformation reasons remain attached as metadata
- presentation mode never hides the fact that a transformation occurred

#### Report Intent Preservation

The system should preserve the source report's reading intent whenever possible:

- detect embedded workbook charts or clearly chart-like report elements when available
- detect summary-table patterns that imply a reusable visual structure
- prefer reconstruction of an existing report visual over invention of a brand-new chart when the original intent is clear
- generate new visuals only when reuse or reconstruction would be weaker than a safe generated output

This produces a translation pipeline that is faithful to the report before it becomes merely analytical.

#### Manifest Contract

Every upload produces a manifest with this top-level structure:

```json
{
  "uploadId": "upl_...",
  "status": "processing | ready | failed",
  "source": {
    "fileName": "sales.xlsx",
    "fileType": "xlsx",
    "sizeBytes": 1048576,
    "uploadedBy": null
  },
  "workbook": {
    "sheetCount": 2,
    "tableCount": 3,
    "warnings": []
  },
  "presentation": {
    "defaultMode": "analysis",
    "presenterModeAvailable": true
  },
  "defaultView": {
    "sheetId": "sheet_01",
    "tableId": "tbl_01_01",
    "viewType": "summary_dashboard"
  },
  "sheets": [],
  "tables": []
}
```

Each table entry must include:

- `tableId`
- `sheetId`
- `bounds`
- `confidence`
- `detectionReasons`
- `orientation`
- `normalization`
- `columns`
- `stats`
- `preview`
- `chartRecommendations`
- `availableChartTypes`
- `defaultChartType`
- `sourceReference`
- `chartSourceType`
- `chartSourceReason`

### Authentication & Security

MVP does not introduce standalone account management. Security therefore focuses on internal deployment assumptions plus upload handling:

- allowlist `.xlsx` and `.csv` only
- enforce 30 MB limit before parsing
- validate extension and request content type
- never execute macros or formulas
- store uploads under opaque random identifiers
- expire upload bundles with a cleanup policy once retention rules are implemented
- assume the app sits behind company SSO, trusted internal auth, or a controlled internal network layer
- capture caller identity in upload provenance when the hosting environment provides it
- record enough upload, detection, normalization, and chart-selection provenance to explain the presented output later

### API & Communication Patterns

#### API Style

- REST JSON APIs
- explicit `202 Accepted` for async processing
- consistent response envelope:

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

#### Core Endpoints

- `POST /api/uploads`
- `GET /api/uploads/{uploadId}`
- `GET /api/uploads/{uploadId}/manifest`
- `GET /api/uploads/{uploadId}/tables/{tableId}/preview`
- `GET /api/uploads/{uploadId}/search`
- `DELETE /api/uploads/{uploadId}`

Browser routes for the hosted MVP:

- `GET /` -> upload landing page and browser entry flow
- `GET /uploads/{uploadId}` -> generated dashboard route

Manual API-first upload remains valid for developers and QA, but it is not the product definition for end users.

Chart option selection should not require a separate endpoint in MVP. Valid chart types travel in the manifest and frontend view state chooses among them.

The API should also be able to return a default-first presentation model from the manifest without requiring an additional “build dashboard” step from the user.

#### Async Processing Approach

- Use FastAPI `BackgroundTasks` for MVP parsing jobs.
- Return immediately after upload acknowledgement.
- Move to Celery/RQ only if in-process background execution fails benchmark or deployment constraints.

This choice is based on FastAPI’s guidance that `BackgroundTasks` suit smaller same-process work while heavier distributed computation should move to a dedicated queue.

### Frontend Architecture

- React application with route-level page state
- upload landing page as the public app entry point
- browser upload form that posts directly to the backend API
- upload handoff state that routes users into `/uploads/{uploadId}` without manual ID handling
- left navigation for workbook -> sheet -> table
- main content pane for table summary, charts, and preview grid
- always-visible search
- presenter mode with low-clutter layout, large-screen readability, stable panel ordering, and keyboard navigation
- TanStack Table for headless table rendering
- TanStack Virtual for large preview virtualization
- Plotly.js for chart rendering
- guided chart selection UI that only shows valid output options for the current table or slice
- a default dashboard landing state that favors summary-first reading and requires little or no manual configuration

#### Presenter Mode Rules

- presenter mode is a dedicated frontend state, not an afterthought overlay
- chart cards retain source sheet/table, confidence, and transformation badges
- presenter-safe filters are pinned and must not reflow the entire page unexpectedly
- the default presenter narrative is summary -> key chart -> supporting preview/source path
- low-confidence tables show review-required messaging before they can be treated as trusted presentation output
- presenter mode should show whether a chart was reused, reconstructed, or generated without cluttering the main narrative

#### State Model

Primary visual states:

- `landing`
- `idle`
- `uploading`
- `processing`
- `handoff`
- `review_required`
- `ready`
- `ambiguous`
- `empty`
- `not_found`
- `failed`
- `cancelled`
- `error`
- `presenting`

The preferred state transition is:

`landing -> uploading -> handoff -> processing -> ready -> presenting`

with `review_required` only when the system cannot safely auto-promote the detected result into a trustworthy presentation path.

This mirrors React’s recommended explicit visual-state approach rather than ad hoc imperative DOM transitions.

### Infrastructure & Deployment

- Single repository, two application directories
- One public app URL for standard users
- Path-based routing: `/api/*` to FastAPI and browser routes to the frontend app
- Local filesystem upload bundles in dev and first hosted environments, backed by persistent storage in hosted MVP environments
- Containerization optional but not required to start coding
- OpenAPI generated from FastAPI for contract documentation
- Frontend deployed as a static build behind the same public origin as the API, or behind a reverse proxy that preserves same-origin browser use
- exact retention, deletion, and audit policies must be configurable per company environment
- Local API-first flow is a dev and QA support mode only, not the product deployment model

### Decision Impact Analysis

**Implementation Sequence**

1. Deliver browser upload landing page and browser submission flow
2. Connect upload acknowledgement to processing handoff and dashboard routing
3. Lock same-origin frontend/backend integration and production-friendly configuration
4. Reuse the existing manifest, dashboard, preview, search, and presenter features as the dashboard engine
5. Harden terminal states, recovery states, accessibility, and deployment assumptions

**Cross-Component Dependencies**

- Dashboard rendering depends on stable manifest shape
- Search depends on preview extraction and bounded indexing
- Charting depends on profiling output and normalization metadata
- Chart selection UX depends on manifest-provided valid chart types and stable chart configuration rules
- Default landing experience depends on a stable “best first view” selection rule
- Low-confidence UX depends on detector reasons and confidence scores
- Presenter mode depends on stable layout primitives, provenance badges, and filter-state rules

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

Critical conflict points identified:

1. API naming vs Python naming
2. Table identifier format
3. Preview search semantics
4. Error envelope format
5. File and folder ownership between apps
6. Presenter mode state and layout stability
7. Chart option availability rules
8. Reuse vs reconstruct vs generate chart provenance rules

### Naming Patterns

**Backend Python**

- package/module/file names: `snake_case`
- service classes: `PascalCase`
- internal fields: `snake_case`

**Frontend TypeScript**

- components: `PascalCase.tsx`
- hooks: `useSomething.ts`
- utilities: `camelCase.ts`

**API Payloads**

- JSON keys: `camelCase`
- IDs: `uploadId`, `sheetId`, `tableId`, `chartId`
- chart types: lower-case enum values such as `bar`, `column`, `line`, `area`, `pie`, `table`
- chart source types: `reused`, `reconstructed`, `generated`

**Table Identifier Pattern**

`tbl_{sheetOrder}_{tableOrder}`

Examples:

- `tbl_01_01`
- `tbl_02_03`

### Structure Patterns

- Backend business logic lives under `apps/api/app/services/`
- Detection and normalization live under `apps/api/app/pipelines/`
- Visual selection and chart provenance logic live under backend pipelines/services, not in the frontend
- API routes live under `apps/api/app/api/routes/`
- Frontend feature areas live under `apps/web/src/features/`
- Tests are separated by layer, not co-located for the backend MVP
- Presenter mode UI lives in its own frontend feature slice and must not be mixed into upload logic

### Format Patterns

**API Response Envelope**

```json
{
  "data": {},
  "meta": {
    "requestId": "req_..."
  },
  "error": null
}
```

**Error Format**

```json
{
  "data": null,
  "meta": {
    "requestId": "req_..."
  },
  "error": {
    "code": "file_too_large",
    "message": "Files must be 30 MB or smaller.",
    "details": {}
  }
}
```

**Date/Time Format**

- ISO 8601 UTC strings at API boundaries

**Chart Option Format**

```json
{
  "defaultChartType": "bar",
  "availableChartTypes": ["bar", "line", "table"],
  "chartSourceType": "generated",
  "chartSourceReason": "No reusable source visual was detected for this table."
}
```

### Communication Patterns

- No event bus in MVP
- Frontend polls upload status or manifest status through HTTP
- Search requests are debounced
- Chart interactions update local UI state, not global store events
- Presenter mode uses explicit local view state for current insight, selected chart type, and pinned filters
- The first readable dashboard should come directly from manifest defaults, not from a user-driven setup wizard

### Process Patterns

**Error Handling**

- Parser warnings live in manifest warnings arrays
- User-facing errors use stable error codes
- Low-confidence detection is not an exception path; it is normal metadata
- Review-required state is blocking for trustworthy presentation, but not necessarily for raw inspection
- If reusable report visuals are detected but judged misleading or low-quality, that decision should be recorded in provenance rather than silently discarded

**Loading States**

- Upload action owns `uploading`
- Manifest retrieval owns `processing`
- Table view owns `loadingPreview`
- Search owns `searching`
- Presenter mode owns `presenting` and never changes the underlying persisted data model
- Minimal-interaction first view owns the default dashboard state and should not require a chart-builder workflow

### Enforcement Guidelines

All implementers must:

- preserve provenance metadata on every transformation
- avoid adding unsupported chart types without updating the allowlist
- keep API payloads camelCase and backend internals snake_case
- update fixture tests when detection rules change
- only expose chart options that are present in `availableChartTypes`
- keep presenter mode stable, low-clutter, and source-aware
- preserve and expose `chartSourceType` and `chartSourceReason` for every presented visual
- reserve `chartSourceType: "reused"` for cases where a source visual or workbook-native chart signal was actually detected; naming heuristics alone should fall back to `reconstructed`
- do not require search or manual chart selection before a presentable first view exists

**Good Examples**

- `apps/api/app/services/workbook_ingestion.py`
- `apps/web/src/features/upload/UploadPage.tsx`
- `uploadId` in JSON and `upload_id` in Python internals
- `availableChartTypes: ["bar", "line"]` with the UI choosing one of those options
- `chartSourceType: "reused"` when a workbook visual is meaningfully preserved

**Anti-Patterns**

- silent table merges
- direct DOM table rendering for 100K-row previews
- exposing raw pandas objects directly to the frontend
- mixing backend parsing logic into frontend data preparation
- showing a pie chart option when the current dataset does not support pie semantics
- hiding provenance and confidence cues in presenter mode
- forcing the user through a multi-step dashboard composition flow before they see a readable first result

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
doc2dash/
├── README.md
├── docs/
│   └── project-context.md
├── contracts/
│   ├── api-error.schema.json
│   ├── chart-spec.schema.json
│   └── manifest.schema.json
├── apps/
│   ├── api/
│   │   ├── pyproject.toml
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── core/
│   │   │   │   ├── config.py
│   │   │   │   ├── errors.py
│   │   │   │   └── logging.py
│   │   │   ├── api/
│   │   │   │   ├── deps.py
│   │   │   │   └── routes/
│   │   │   │       ├── health.py
│   │   │   │       ├── search.py
│   │   │   │       └── uploads.py
│   │   │   ├── pipelines/
│   │   │   │   ├── normalize_tables.py
│   │   │   │   ├── profile_tables.py
│   │   │   │   ├── select_default_view.py
│   │   │   │   └── detect_tables.py
│   │   │   ├── schemas/
│   │   │   │   ├── api.py
│   │   │   │   ├── manifest.py
│   │   │   │   └── uploads.py
│   │   │   ├── services/
│   │   │   │   ├── chart_strategy.py
│   │   │   │   ├── preview_search.py
│   │   │   │   ├── upload_bundle_store.py
│   │   │   │   └── workbook_ingestion.py
│   │   │   └── utils/
│   │   │       ├── file_validation.py
│   │   │       └── ids.py
│   │   └── tests/
│   │       ├── fixtures/
│   │       ├── integration/
│   │       └── unit/
│   └── web/
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── index.html
│       └── src/
│           ├── app/
│           │   ├── App.tsx
│           │   ├── routes.tsx
│           │   └── providers.tsx
│           ├── components/
│           │   ├── charts/
│           │   ├── layout/
│           │   └── preview/
│           ├── features/
│           │   ├── dashboard/
│           │   ├── presentation/
│           │   ├── search/
│           │   ├── table-browser/
│           │   └── upload/
│           ├── lib/
│           │   ├── api.ts
│           │   ├── charts.ts
│           │   └── formatters.ts
│           ├── styles/
│           │   ├── tokens.css
│           │   └── globals.css
│           └── types/
│               └── manifest.ts
├── data/
│   └── uploads/
│       └── .gitkeep
├── _bmad-output/
│   ├── planning-artifacts/
│   └── implementation-artifacts/
└── .gitignore
```

### Architectural Boundaries

**API Boundaries**

- Upload ingress and manifest retrieval live in the backend only.
- The frontend never reads workbook files directly.

**Component Boundaries**

- Upload workflow is separate from dashboard exploration.
- Search is its own feature slice with shared manifest-aware helpers.
- Presentation is its own feature slice with read-only view-state rules.
- Default-view selection is a backend concern surfaced through the manifest, not a frontend-only heuristic.

**Service Boundaries**

- Detection, normalization, profiling, and preview search are separate services/pipelines.
- Bundle storage is abstracted behind `upload_bundle_store.py`.

**Data Boundaries**

- Raw source files never cross into frontend payloads.
- Preview rows are bounded and paginated.
- Charts use structured recommendation payloads instead of arbitrary frontend inference.
- Presenter mode reads from the same manifest data model and never creates a second hidden reporting model.
- Report-visual reuse decisions and generated-chart decisions both remain traceable through manifest metadata.

### Requirements To Structure Mapping

**Epic 1: Understand Uploaded Workbooks**

- Backend routes: `apps/api/app/api/routes/uploads.py`
- Pipelines: `apps/api/app/pipelines/*`
- Storage service: `apps/api/app/services/upload_bundle_store.py`
- Tests: `apps/api/tests/unit/`, `apps/api/tests/integration/`

**Epic 2: Explore Data Through A Dashboard**

- Frontend upload and dashboard features
- Chart components
- Preview components
- Search feature slice
- Presentation feature slice
- Backend default-view and chart-strategy pipelines

**Epic 3: Harden The Product For Real Files**

- Fixture library
- Playwright suite
- Accessibility checks
- Performance tests and preview/search tuning

**Epic 4: Productize Browser Entry And Hosted Delivery**

- Frontend upload landing page and upload feature slice
- Upload handoff and browser routing states
- Same-origin frontend/backend deployment path
- Hosted-app assumptions for public URL access and production configuration

### Integration Points

**Internal Communication**

- Frontend consumes manifest and preview APIs only.
- Backend pipelines communicate via typed Python objects and persisted bundle artifacts.

**External Integrations**

- None required for MVP beyond optional hosting and storage infrastructure.
- Identity context may be provided by the company hosting environment or internal gateway.

**Data Flow**

1. User opens the hosted app landing page
2. User uploads a file in the browser
3. Frontend submits `POST /api/uploads`
4. Backend validates the file and creates an upload bundle
5. Frontend routes the user into `/uploads/{uploadId}` and shows processing handoff
6. Backend parses the workbook, detects tables, normalizes, profiles, and persists artifacts
7. Frontend renders the generated dashboard from manifest defaults

### File Organization Patterns

**Configuration Files**

- Backend config: `apps/api/app/core/config.py`
- Frontend config: Vite plus environment variables
- Contracts: `/contracts`

**Test Organization**

- Backend fixtures and integration tests drive ingestion quality
- Frontend unit tests target dashboard state transitions
- Playwright protects key upload/search flows
- Presenter mode and chart-option switching are part of the critical frontend regression suite
- Chart provenance and default-first dashboard selection are part of backend integration coverage

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** Passed  
The selected technologies fit the workload and avoid forcing JavaScript to own pandas-native parsing logic.

**Pattern Consistency:** Passed  
Naming, payload format, and storage rules are consistent across backend and frontend responsibilities.

**Structure Alignment:** Passed  
The project tree reflects the separation between ingestion logic, UI, and BMAD planning artifacts.

### Requirements Coverage Validation

**Epic Coverage:** Passed  
All four MVP epics map cleanly to architecture components.

**Functional Requirements Coverage:** Passed  
Hosted browser upload, parsing, detection, normalization, profiling, charting, search, UI, and testing all have explicit architectural homes.

**Non-Functional Requirements Coverage:** Passed  
Performance, accessibility, explainability, maintainability, and security are all represented directly in the design.

### Implementation Readiness Validation

**Decision Completeness:** High  
Enough detail exists for story generation and initial implementation.

**Structure Completeness:** High  
The planned tree is concrete enough for scaffold and first-sprint work.

**Pattern Completeness:** High  
Main conflict points for AI agents are addressed.

### Gap Analysis Results

**Critical Gaps**

- Browser upload entry flow is not yet implemented as the standard product experience.
- Same-origin or production-ready frontend/backend integration is not yet formalized.
- Public app routing from landing page to upload to dashboard is not yet the active implementation priority.

**Important Gaps**

- Exact patch versions should be pinned during scaffold.
- Search indexing may need a stronger approach if preview search benchmarks fail on real customer files.
- Upstream auth integration details still depend on the target company environment.
- Reuse of embedded workbook charts may require format-specific parsing rules beyond the first MVP path.

**Nice-To-Have Gaps**

- Manual table review editor
- Export workflows and saved presentation packages
- Distributed worker queue

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Technology stack specified
- [x] Data architecture defined
- [x] API patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Error and loading patterns documented
- [x] Boundaries explained

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Epic-to-structure mapping completed

### Architecture Readiness Assessment

**Overall Status:** NEEDS PRODUCT-FLOW REBASELINE BEFORE MORE FEATURE IMPLEMENTATION

**Confidence Level:** Medium-High

**Key Strengths**

- Boring, explainable ingestion path
- Strong contract between parser and UI
- Minimal infrastructure burden for MVP
- Good handoff quality for BMAD story generation
- Presentation behavior is now aligned with the product goal instead of being treated as a later export concern
- Report-intent preservation is now part of the architecture instead of assuming every visual must be newly generated

**Areas For Future Enhancement**

- worker queue extraction
- richer search indexing
- manual correction flows
- retention and storage abstraction
- richer presenter sequencing or saved presentation views
- deeper workbook-chart extraction for more file formats and report conventions
- browser upload polish such as drag-and-drop or resumable uploads

### Implementation Handoff

AI or human implementers should:

- follow this document before introducing new infrastructure or dependencies
- keep the manifest contract stable
- treat story files as the next source of truth after this architecture
- avoid skipping fixture-driven tests for detector logic

**First Implementation Priority:** Story `4.1 - Deliver Browser Upload Landing And Dashboard Handoff`
