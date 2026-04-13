---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/technical-research.md"
---

# doc2dash - Epic Breakdown

## Overview

This document decomposes the MVP requirements for `doc2dash` into user-value-focused epics and implementation-ready stories for an internal hosted report-to-dashboard webapp.

## Correction Notice

The project has been rebaselined around the real MVP user flow:

- hosted webapp
- browser-based spreadsheet upload
- processing handoff in the UI
- generated dashboard opened in the browser
- normal end-user flow from a public URL
- no terminal steps or manual API usage for standard users

Epics 1 through 3 remain reusable foundation work. They are no longer treated as the end-user MVP entry flow.

## Rebaselined Delivery Order

1. Epic 4: Productize Browser Entry And Hosted Delivery
2. Epic 1: Understand Uploaded Workbooks
3. Epic 2: Explore Data Through A Dashboard
4. Epic 3: Harden The Product For Real Files

## Reusable Foundation Kept As-Is

The corrected MVP plan explicitly reuses the strongest implemented foundation:

- ingestion and runtime engine from `apps/api/app/services/`
- upload API and manifest/runtime contract from `apps/api/app/api/routes/uploads.py` and `apps/api/app/schemas/`
- manifest-driven dashboard route from `apps/web/src/features/dashboard/DashboardPage.tsx`
- search, preview pagination, presenter mode, and review-required UI from existing frontend feature slices
- existing backend fixture/integration coverage and frontend dashboard regression coverage

## Requirements Inventory

### Functional Requirements

- FR1: Accept and validate `.xlsx` and `.csv` uploads up to 30 MB.
- FR2: Load all workbook sheets using pandas and a CSV single-sheet abstraction.
- FR3: Detect one or more tables per sheet with confidence metadata.
- FR4: Detect orientation and normalize safe wide-table cases into long form.
- FR5: Profile typed columns and summary statistics.
- FR6: Reuse or generate safe chart outputs and expose user-selectable valid chart options.
- FR7: Provide global search and compact preview results.
- FR8: Deliver an accessible responsive dashboard shell with presenter mode.
- FR9: Process uploads asynchronously.
- FR10: Cover detection, transformation, and dashboard flow with tests.

### NonFunctional Requirements

- NFR1: Indexed preview search under 500 ms.
- NFR2: Support workbooks up to roughly 100K rows without freezing the UI.
- NFR3: Keep transformations explainable and reversible through metadata.
- NFR4: Preserve accessibility and responsiveness across core flows.
- NFR5: Isolate parsing and rendering concerns for maintainability.
- NFR6: Apply strict file validation and no macro execution.

### Additional Requirements

- No accounts or collaboration in MVP.
- No manual table editor in MVP.
- No dark mode in MVP.
- Heuristics-first table detection.
- Preview search SLA applies to indexed preview results, not arbitrary full-table scans.
- Present directly from the dashboard is in scope; export to PowerPoint is not.
- The common path should not require users to manually build a dashboard.
- Standard users must not need manual API calls or terminal steps to use the product.

### UX Design Requirements

- Always-visible search.
- Left-side workbook and table navigation on desktop.
- One selected table in focus at a time.
- Clear processing, ambiguous, empty, and error states.
- Explain why table detection or normalization happened.
- Keep presenter mode clean, stable, and readable on large shared screens.
- Show only those chart types that the current data supports.
- Prefer reuse of report visuals or report intent before inventing new charts.

### FR Coverage Map

- FR1: Epic 1 - Establish workbook upload and validation.
- FR2: Epic 1 - Create workbook manifest and sheet ingestion flow.
- FR3: Epic 1 - Detect sheet and table boundaries.
- FR4: Epic 1 - Normalize orientation and preserve provenance.
- FR5: Epic 1 - Profile structured tables.
- FR6: Epic 2 - Generate charts and interactive analysis views.
- FR7: Epic 2 - Add search, preview, and table exploration.
- FR8: Epic 2 - Deliver responsive accessible dashboard shell.
- FR9: Epic 1 / Epic 3 - Async upload flow and runtime hardening.
- FR10: Epic 3 - Fixture-based quality, accessibility, and performance gates.
- Browser-first hosted entry flow: Epic 4 - Productize browser entry and hosted delivery.

## Epic List

### Epic 4: Productize Browser Entry And Hosted Delivery
Users can start from a normal URL, upload a workbook in the browser, wait for processing, and land on the generated dashboard without local or manual API steps.
**FRs covered:** FR1, FR8, FR9

### Epic 1: Understand Uploaded Workbooks
Users can upload a workbook and receive a trustworthy structured representation of sheets, tables, normalized data, and profiles.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR9

### Epic 2: Explore Data Through A Dashboard
Users can move from detected tables to charts, summaries, previews, search results, and presenter mode without technical help and with little manual setup.
**FRs covered:** FR6, FR7, FR8

### Epic 3: Harden The Product For Real Files
Users can rely on the product under messy workbook conditions, accessibility constraints, performance thresholds, and real presentation-quality expectations on the kinds of report files they actually demo.
**FRs covered:** FR6, FR7, FR8, FR9, FR10

## Epic 4: Productize Browser Entry And Hosted Delivery

Create the real browser-first product flow so the existing ingestion and dashboard foundation can be reached from a normal hosted webapp entry point.

### Story 4.1: Deliver Browser Upload Landing And Dashboard Handoff

As a standard business user,  
I want to start from the landing page, upload a workbook in the browser, and be taken into the generated dashboard,  
So that I can use `doc2dash` without terminal steps or manual API calls.

**Acceptance Criteria:**

**Given** a user opens the public app entry route  
**When** the landing page loads  
**Then** the page presents the real browser upload flow instead of a demo upload link

**Given** a valid `.xlsx` or `.csv` file under 30 MB  
**When** the user submits it in the browser  
**Then** the frontend posts the file to `POST /api/uploads` and receives the upload identifier plus processing state

**Given** a successful upload acknowledgement  
**When** the frontend receives the `uploadId`  
**Then** it transitions the user into `/uploads/{uploadId}` automatically so the dashboard route owns processing, ready, failed, and cancelled state rendering

**Given** an invalid or rejected upload  
**When** the backend returns a user-ready error  
**Then** the landing page surfaces that message without requiring terminal inspection

### Story 4.2: Add Upload Processing UX And Route-Level Terminal States

As a standard business user,  
I want the route that opens after upload to clearly guide me through processing and terminal outcomes,  
So that the handoff from `/` into `/uploads/{uploadId}` feels trustworthy and complete without manual troubleshooting.

**Acceptance Criteria:**

**Given** a successful browser upload from `/`  
**When** the frontend transitions into `/uploads/{uploadId}`  
**Then** the route presents a deliberate processing handoff state instead of a generic loading placeholder

**Given** a valid upload that is still processing  
**When** the user lands on `/uploads/{uploadId}`  
**Then** the route keeps polling the existing manifest and runtime contract without refresh and explains that the dashboard is being prepared from the uploaded workbook

**Given** a failed upload route  
**When** the user lands on `/uploads/{uploadId}`  
**Then** the UI shows a clear failed state with a recovery path back to `/`

**Given** a cancelled upload route  
**When** the user lands on `/uploads/{uploadId}`  
**Then** the UI shows a clear cancelled state with a recovery path back to `/`

**Given** a missing or invalid upload route  
**When** the user lands on `/uploads/{uploadId}`  
**Then** the UI shows a distinct not-found state instead of a generic technical fallback

**Given** a ready upload  
**When** processing completes  
**Then** the route continues into the existing dashboard experience without regression to preview, search, presenter, review-required, or chart behavior

### Story 4.3: Productionize Same-Origin Frontend And Backend Integration

As a product team,  
I want the frontend and backend integrated in a production-friendly way,  
So that the webapp can be hosted behind one normal company URL.

**Acceptance Criteria:**

**Given** the MVP deployment target  
**When** the app is configured for production  
**Then** browser routes and `/api/*` work together without local development hacks or manual API URL handling for standard users

**Given** local development  
**When** the team runs the app  
**Then** the browser upload flow remains testable with a clearly documented dev integration path

### Story 4.4: Define Hosted MVP Deployment And Runtime Configuration

As a delivery team,  
I want a clear hosted deployment model and runtime configuration contract,  
So that the MVP can be deployed as a real webapp instead of a local prototype.

**Acceptance Criteria:**

**Given** the MVP deployment decision  
**When** hosting and runtime assumptions are documented  
**Then** upload storage, public routing, environment variables, and internal access assumptions are explicit and implementation-ready

## Epic 1: Understand Uploaded Workbooks

Create the ingestion and interpretation pipeline that turns uploaded spreadsheets into a structured manifest and readable first view the rest of the product can trust.

### Story 1.1: Upload, Validate, And Build Workbook Manifest

As a non-technical user,  
I want to upload a workbook and receive a structured processing result,  
So that I can trust the system has understood the file at a basic level.

**Acceptance Criteria:**

**Given** a valid `.xlsx` or `.csv` file under 30 MB  
**When** the user uploads it  
**Then** the API accepts it and returns an upload identifier plus processing status

**Given** a valid Excel workbook  
**When** ingestion runs  
**Then** all sheets are loaded and represented in a workbook manifest

**Given** a successful upload  
**When** processing completes  
**Then** the system has enough workbook and sheet metadata to support a default readable first dashboard without requiring manual dashboard composition

**Given** an invalid, unsupported, oversized, or corrupt file  
**When** the user uploads it  
**Then** the system returns a clear, actionable error response

### Story 1.2: Detect Sheet And Table Boundaries

As a user,  
I want the app to find the real tables inside each sheet,  
So that I do not have to manually separate data blocks myself.

**Acceptance Criteria:**

**Given** a sheet with multiple tables separated by strong blank rows or columns  
**When** detection runs  
**Then** the system creates separate table regions with confidence scores

**Given** a sheet with ambiguous structure  
**When** detection confidence is low  
**Then** the output metadata flags the ambiguity instead of silently merging content

**Given** repeated headers or dense cell clusters  
**When** the detector scores candidate regions  
**Then** the chosen bounds include detection reasons in metadata

### Story 1.3: Normalize Wide Tables And Profile Columns

As a user,  
I want the app to normalize and profile the data safely,  
So that the resulting visuals and summaries match the meaning of the spreadsheet.

**Acceptance Criteria:**

**Given** a clearly wide table with identifier columns and repeated measure columns  
**When** normalization runs  
**Then** the system reshapes it into long format and records the transformation metadata

**Given** a long-form table  
**When** normalization runs  
**Then** the system keeps it intact

**Given** a detected table  
**When** profiling runs  
**Then** the system infers core column types and summary stats for later chart suggestions

## Epic 2: Explore Data Through A Dashboard

Turn structured workbook output into a dashboard experience that feels immediate, legible, trustworthy, and presentation-ready.

### Story 2.1: Deliver Default Dashboard Shell And Workbook Navigation

As a user,  
I want a clear default dashboard and navigation model for sheets and tables,  
So that I can understand the report immediately and still know what part of the workbook I am viewing.

**Acceptance Criteria:**

**Given** a processed upload  
**When** the dashboard opens  
**Then** the user sees a readable summary-first dashboard, workbook/sheet/table navigation, and a focused table workspace

**Given** mobile or desktop usage  
**When** the layout adapts  
**Then** navigation remains reachable and readable without hidden traps

**Given** a user is ready to present  
**When** presenter mode is enabled  
**Then** the UI shifts into a low-clutter, stable, keyboard-friendly workspace suitable for internal meetings

**Given** the common path after upload  
**When** the first dashboard is shown  
**Then** the user reaches a presentable first view with little or no manual setup

### Story 2.2: Reuse Or Generate Safe Presentation Charts

As a user,  
I want the app to preserve or generate the right visuals from my report,  
So that I can start reading and presenting insights immediately.

**Acceptance Criteria:**

**Given** a workbook already expresses a clear visual or report-summary intent  
**When** the dashboard is generated  
**Then** the app reuses or reconstructs that intent when it is presentation-worthy

**Given** reusable visuals are unavailable or weak  
**When** chart suggestions are generated  
**Then** time-aware data gets time-series-friendly charts, categories get categorical charts, unsafe pairings are rejected, and the user sees only the valid chart options for that dataset

**Given** more than one valid chart type is available  
**When** the user switches between them  
**Then** the chart updates without changing the underlying data semantics or exposing unsupported choices

**Given** a selected chart  
**When** the user hovers or drills into it  
**Then** the chart remains interactive and consistent with the underlying data

**Given** a presented visual  
**When** the user inspects its metadata  
**Then** the app indicates whether the visual was reused, reconstructed, or newly generated

### Story 2.3: Search And Preview Across Extracted Data

As a user,  
I want fast searchable previews,  
So that I can jump to the right table or record set when the default dashboard is not enough.

**Acceptance Criteria:**

**Given** a processed upload  
**When** the user enters a query  
**Then** the system returns compact preview results with source sheet/table context and match highlighting

**Given** indexed preview search  
**When** the query is executed  
**Then** the result target is under 500 ms for the preview workflow

**Given** presenter mode is active  
**When** filters are applied  
**Then** the layout stays stable and the user can still navigate the key insights without UI thrash

## Epic 3: Harden The Product For Real Files

Ensure the system behaves well under messy data, accessibility demands, performance constraints, and enterprise presentation expectations.

### Story 3.1: Create Fixture Pack And Automated Detection Tests

As a product team,  
I want realistic workbook fixtures and automated tests,  
So that detector regressions are caught before release.

**Acceptance Criteria:**

**Given** the fixture library  
**When** tests run  
**Then** expected sheet counts, table counts, orientations, and normalization outcomes are validated automatically

### Story 3.2: Add Accessibility And Low-Confidence Review UX

As a user,  
I want accessible navigation and clarity around uncertain detections,  
So that I can use the product confidently even when the workbook is messy.

**Acceptance Criteria:**

**Given** low-confidence detection metadata  
**When** the user opens the affected table  
**Then** the UI explains the uncertainty, offers a review path, and prevents the ambiguous output from being treated as presentation-ready by default

**Given** keyboard-only use  
**When** the user navigates the dashboard  
**Then** core flows remain fully usable

### Story 3.3: Harden Performance, Cancellation, And Failure Recovery

As a user,  
I want the app to stay responsive when files are large or uploads fail,  
So that I am not blocked by heavy workbooks or brittle processing.

**Acceptance Criteria:**

**Given** a large but valid workbook  
**When** the user uploads it  
**Then** the app provides progress, paginated or virtualized previews, and resilient chart rendering

**Given** a cancelled or failed upload  
**When** processing stops  
**Then** the app cleans up state and exposes a recoverable next step

**Given** the app is deployed in a company environment  
**When** uploads and transformations occur  
**Then** the system preserves enough provenance and runtime detail to support trust, audit, and recovery workflows

### Corrective Extension: Real Fixture Presentation Hardening

The `2026-04-12` fixture-library QA sweep showed that the product is operational but still not consistently better than Excel or Google Sheets on real report-style workbooks. The next corrective slice therefore focuses on presentation quality, stable card sizing, report-friendly navigation, and authoritative regression coverage for the fixture files that are actually being demoed.

### Story 3.4: Rebaseline Current Fixture Library And Presentation Regression Expectations

As a product team,  
I want the current workbook fixture library and expectations to match the real files we demo and QA today,  
So that presentation regressions are measured against the actual report inputs the product must handle well.

**Acceptance Criteria:**

**Given** the current fixture folder contents  
**When** fixture documentation and expectations are reviewed  
**Then** the authoritative README and machine-readable catalog describe the current workbook set instead of deleted legacy fixtures

**Given** the current workbook set  
**When** automated checks run  
**Then** each workbook has an explicit baseline for upload readiness, table/sheet counts, default-view expectations, and any presentation-risk markers needed by follow-on stories

**Given** the QA report from `2026-04-12`  
**When** the corrective stories are implemented  
**Then** the project has a stable regression baseline for `Monthly budget.xlsx`, `Google Finance Investment Tracker.xlsx`, `performance-logs-report.xlsx`, `test-validation-multiple-environments.xlsx`, `extensive-document-academic-report.xlsx`, and `costs of 2025.xlsx`

### Story 3.5: Harden Search Result Presentation And Stable Dashboard Card Sizing

As a report reader,  
I want long-form search results and dashboard cards to stay visually bounded and readable,  
So that one oversized text block or wide row does not make the whole dashboard feel less presentable than the source spreadsheet.

**Acceptance Criteria:**

**Given** search results that contain very long values, many columns, or long-form snippets  
**When** the compact dashboard search UI renders them  
**Then** the results stay bounded, readable, and source-aware without dumping every cell inline at full length

**Given** oversized row content  
**When** the dashboard workspace is displayed  
**Then** default card sizing remains visually stable and sibling cards do not get stretched or pushed out of balance by one large content block

**Given** a user needs full row/detail inspection  
**When** they choose to expand the result  
**Then** the full detail opens in a separate presentation-safe surface instead of forcing the dashboard grid to grow

**Given** a user selects a search result block  
**When** that result becomes active  
**Then** the dashboard enters a scoped presentation state for that selected block so only the selected block's charts and preview/data drive the active presentation area

**Given** a scoped search presentation state is active  
**When** the user wants to return to the broader workbook context  
**Then** the UI provides a clear exit path that restores the normal dashboard/workbook presentation state

### Story 3.6: Keep Dashboard Navigation Reachable During Reading

As a user presenting or reading a long dashboard,  
I want Previous/Next and preview navigation controls to stay easy to reach while scrolling,  
So that I do not have to jump to the top or bottom of the page just to keep moving through the report.

**Acceptance Criteria:**

**Given** a long dashboard or preview section  
**When** the user scrolls through the content  
**Then** section navigation and preview paging controls remain conveniently reachable through a sticky or otherwise presentation-safe treatment

**Given** presenter mode or normal analysis mode  
**When** navigation controls are shown  
**Then** they stay keyboard accessible, readable, and do not obscure the primary content

### Story 3.7: Improve Default View Quality And Condense Report-Style Workbooks

As a user opening a complex workbook,  
I want the app to choose a strong first view and avoid exploding one report into an overwhelming flat list of weak tables,  
So that the product feels like a curated dashboard rather than a spreadsheet extraction dump.

**Acceptance Criteria:**

**Given** graph-heavy, log-style, academic, or multi-environment report workbooks  
**When** the manifest default view is selected  
**Then** the chosen first view favors summary value, chartability, and presentation strength over low-signal or single-column tables

**Given** highly fragmented report workbooks  
**When** the dashboard navigation is prepared  
**Then** the product groups, condenses, or summarizes related sections enough to keep the navigation usable and presentation-friendly

**Given** a revised default view or grouped navigation outcome  
**When** the user inspects the manifest-driven dashboard  
**Then** the reasons for that default remain traceable through metadata and fixture-based tests

### Story 3.8: Add In-Preview Filtering For Source-Aware Table Inspection

As a user reviewing the currently open table,  
I want to filter the actual preview table from inside the preview block,  
So that I can narrow the source rows in context without relying only on global workbook search.

**Acceptance Criteria:**

**Given** a selected table preview  
**When** the user enters a preview-local query  
**Then** the preview rows narrow within the current table context and cooperate predictably with pagination

**Given** preview-local filtering and global search both exist  
**When** the user interacts with them  
**Then** each control stays distinct in purpose: global search jumps across workbook tables, while preview filtering refines the open table view

**Given** a search-selected scoped presentation state is active  
**When** the user filters the preview table  
**Then** the filtering stays scoped to that selected result context and does not silently restore workbook-wide chart or preview scope

**Given** the user exits the scoped search-selected state  
**When** the dashboard returns to the normal workbook context  
**Then** any preview-local filtering or scoped preview state resets in a clear, predictable way

### Story 3.9: Add Grounded AI Narrative Summary Panel To The Summary Area

As a report reader or presenter,  
I want the summary area to include a grounded AI narrative for the currently active data scope,  
So that I can quickly understand what the selected table or scoped search result appears to represent without needing chatbot-style interaction.

**Acceptance Criteria:**

**Given** the dashboard summary area in normal analysis mode  
**When** a table is selected and the dashboard is otherwise ready  
**Then** the summary area requests and shows a passive AI narrative for that selected table without blocking the rest of the dashboard

**Given** scoped search presentation is active  
**When** a search result has been explicitly selected for presentation  
**Then** the AI narrative is scoped only to that selected result and its selected scoped rows, not to the rest of the workbook or other search results

**Given** the AI narrative is returned  
**When** the summary panel renders it  
**Then** the content is limited to one short description, two to four concise findings, and at most one short caveat

**Given** the AI provider is disabled, unavailable, slow, times out, or returns invalid output  
**When** the dashboard remains in use  
**Then** the summary area falls back to a safe unavailable state and the deterministic dashboard experience stays fully usable

**Given** the product must remain free of paid AI dependencies  
**When** the feature is implemented  
**Then** it uses only a no-cost local or self-hosted model path and degrades gracefully when that environment is not configured
