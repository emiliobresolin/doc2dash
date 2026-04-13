---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
inputDocuments: []
workflowType: "prd"
project_name: "doc2dash"
user_name: "Emilio"
date: "2026-04-04"
status: "complete"
---

# Product Requirements Document - doc2dash

**Author:** Emilio  
**Prepared with BMAD planning support:** 2026-04-04

## 1. Executive Summary

`doc2dash` is a hosted internal webapp that lets non-technical users inside companies open a normal URL, upload dense spreadsheet reports in the browser, and reach an easier-to-read dashboard instead of manually cleaning data or rebuilding slides in PowerPoint. The MVP focuses on a real browser-driven user journey, trustworthy ingestion, explainable table detection, conservative normalization, reuse of report visuals when appropriate, guided chart generation when reuse is not enough, minimal user interaction, and a presenter-friendly dashboard mode that is strong enough to use directly in internal review meetings.

## 2. Problem Statement

Business users frequently receive spreadsheet reports that are:

- spread across multiple sheets,
- inconsistent in layout,
- mixed between long and wide formats,
- interrupted by blank rows or embedded summary tables,
- difficult to read quickly without technical help.

Current alternatives require manual cleanup, spreadsheet expertise, or rebuilding visuals in BI tools and slide decks. Workers often spend substantial time both understanding the raw report and then re-expressing it for management or architecture teams in PowerPoint. The product opportunity is to reduce time from upload to first useful insight and eliminate the recurring step of turning spreadsheet reports into separate presentation decks.

## 3. Product Goals

1. Turn a valid spreadsheet-style report into at least one trustworthy, readable dashboard view without manual preprocessing.
2. Make the system’s reasoning legible so users trust detected tables, transformations, and charts.
3. Support messy but common spreadsheet layouts well enough for real internal operational and reporting workflows.
4. Keep the common path low-interaction: upload, process, review, present.
5. Make the dashboard presentation-ready so teams can use it directly in meetings instead of rebuilding slides.
6. Keep the experience responsive on both desktop and mobile, while optimizing first for desktop and shared-screen presentation.
7. Deliver the standard MVP workflow entirely through a browser-based hosted app, not through terminal steps or manual API usage.

## 4. Non-Goals For MVP

- User accounts, collaboration, or sharing
- Manual dashboard design tools
- Export to PowerPoint or PDF
- AI-trained table detection models in production
- Dark mode
- Support for `.xlsb`, `.ods`, or macros
- Full semantic analytics or narrative generation
- Manual API upload or terminal-assisted flow as the standard user experience

## 5. Primary Users

### Operations Manager

Needs to upload recurring operational spreadsheets and quickly spot patterns, anomalies, or trends without waiting on analysts.

### Business Analyst

Needs a fast first-pass dashboard from messy workbooks, then may continue deeper analysis elsewhere if needed.

### Internal Review Presenter

Needs a polished, presentation-ready view from an internal workbook without manually rebuilding the story in slides.

### Architecture Or Technical Reviewer

Needs a readable view of the report that preserves detail, provenance, and table-level drill-down for technical review meetings.

## 6. User Journey

1. User opens the hosted app at a normal company URL.
2. User uploads a `.xlsx` or `.csv` file in the browser.
3. System validates type and size and acknowledges the upload quickly.
4. The UI shows processing handoff and routes the user into the generated dashboard flow without requiring manual API steps.
5. System loads all sheets, segments tables, scores confidence, and normalizes clear wide-table cases.
6. System chooses a best default dashboard view with little or no user setup, using existing report visuals when they are available and clear, or generating safe alternatives when they are not.
7. User lands on a dashboard workspace with sheet/table navigation, summary stats, charts, and preview data.
8. User optionally reviews available chart options, chooses the most appropriate supported view when needed, and keeps source/provenance visible.
9. User searches across extracted data, reviews compact preview matches, and drills into a selected table only when needed.
10. User switches into presenter mode and walks stakeholders through the dashboard without rearranging content in PowerPoint.

## 7. Functional Requirements

### FR1. File Upload And Validation

- Provide a browser-based upload entry flow from the main landing page.
- Accept `.xlsx` and `.csv` files up to 30 MB.
- Reject unsupported file types and oversize files with clear messages.
- Handle corrupt files gracefully.

### FR2. Multi-Sheet Workbook Ingestion

- Use `pandas.read_excel(sheet_name=None)` for Excel workbooks.
- Treat CSV as a single-sheet workbook abstraction.
- Capture sheet metadata even before deep table analysis completes.

### FR3. Table Boundary Detection

- Detect one or more tables per sheet.
- Handle blank rows, blank columns, repeated headers, and irregular layouts.
- Handle messy business-report layouts with as little user correction as possible.
- Produce confidence metadata and reasons for detected boundaries.
- Enter a review-required state when confidence is too low for trustworthy presentation.

### FR4. Orientation Detection And Normalization

- Detect long vs wide tables.
- Normalize wide tables into long form when repeated-measure patterns are clear.
- Preserve provenance and expose original structure information to the UI.
- Preserve a reachable raw/original table view for presentation and auditability.

### FR5. Data Profiling

- Infer numeric, categorical, datetime, and text-oriented columns.
- Compute core summary statistics and lightweight metadata for each table.
- Identify when a table is not chart-friendly and should remain primarily a readable table or summary view.

### FR6. Chart Recommendation And Rendering

- Detect whether the source workbook already contains reusable visual intent, such as clear embedded charts or obvious report-style summary sections, and preserve or reconstruct that intent when feasible.
- Suggest safe default charts based on inferred column roles when reusable visuals are unavailable or weaker than a generated view.
- Expose the set of chart types that are actually valid for the selected data, such as column, bar, line, area, or pie only when the data semantics support them.
- Let the user choose among those valid chart outputs without exposing unsupported or misleading options.
- Render interactive charts that support hover, filtering, and drill-down.
- Avoid chart types that misrepresent the data.
- Record whether each presented chart was reused, reconstructed from report intent, or newly generated.

### FR7. Search And Preview

- Provide a search input that works across extracted data.
- Return compact preview results with match highlighting and sheet/table origin.
- Support paginated or virtualized preview browsing.
- Keep search as a supporting capability rather than a required step for the common upload-to-presentation path.

### FR8. Responsive, Accessible Dashboard UI

- The public app entry must begin with a landing page that starts the real upload-to-dashboard product flow.
- Show sheet/table navigation in a left-side navigation model on desktop.
- Preserve usable navigation and readability on mobile.
- Support keyboard navigation, clear focus order, contrast, and ARIA labels.
- Provide a presenter mode with full-screen emphasis, stable layout, large-screen readability, and low visual clutter.
- Keep source sheet/table, transformation status, and confidence/provenance cues accessible during presentation.
- Provide a readable first screen by default, with clear hierarchy and without requiring users to build their own layout.
- Support both management-friendly summary views and architecture-friendly detail views without losing provenance.

### FR9. Async Processing

- Avoid blocking the initial upload response while parsing runs.
- Show processing, success, empty, ambiguous, cancelled, not-found, and error states clearly in the browser flow.
- Recover cleanly from failed or cancelled uploads and preserve an understandable next step for the user.
- Reach a presentable first screen with minimal user interaction after processing completes.
- Route the browser from upload acknowledgement into the generated dashboard without requiring manual upload ID handling.

### FR10. Quality And Testability

- Provide unit tests for detection and normalization logic.
- Provide integration coverage for upload-to-dashboard flow.
- Provide end-to-end coverage for critical happy path and ugly workbook flows.
- Validate presenter mode behavior, chart option correctness, and review-required flows.

## 8. Non-Functional Requirements

### NFR1. Performance

- Upload acknowledgement should return in under 2 seconds for typical files and under 5 seconds for a worst-case valid 30 MB file before deeper processing continues.
- Typical workbook should reach first useful dashboard in under 5 seconds.
- Complex multi-sheet workbook should remain under 10 seconds where feasible.
- Indexed preview search should return in under 500 ms.
- Switching between valid chart options or applying presenter-safe filters should feel near-instant once data is loaded.
- Entering presenter mode should not trigger a disruptive full reload.
- The common path from upload completion to a readable first dashboard should require at most one user selection step, and ideally none.
- The normal user journey must remain browser-driven from landing page to dashboard, with no manual API or terminal dependency.

### NFR2. Scalability

- Support datasets up to roughly 100K rows per upload for preview and charting workflows.
- Degrade gracefully through pagination, virtualization, preview indexing, and aggregation.

### NFR3. Trust And Explainability

- Users must be able to understand why a table was split or transformed.
- Low-confidence detections must be surfaced rather than hidden.
- Presentation mode must preserve source, confidence, and transformation visibility.
- Unsupported chart types must never be shown as available choices.
- Users must be able to tell whether a visual was reused from the source report, reconstructed from report intent, or newly generated.

### NFR4. Accessibility

- Main flows must be keyboard-usable and screen-reader-friendly.
- Charts must not depend on color alone.

### NFR5. Maintainability

- Parsing, detection, normalization, charting, and UI concerns must remain separable.
- The architecture must support future worker queues and storage upgrades.
- Deployment and configuration must support a real hosted webapp, not only local split-process development.

### NFR6. Security

- Do not execute macros or arbitrary code from uploaded files.
- Use strict size limits and content validation.
- Use expiring upload storage for MVP.
- Operate behind existing company authentication or a trusted internal access layer for MVP.
- Capture upload and transformation provenance when caller identity is available from the hosting environment.

## 9. UX Requirements

- Always-visible search on the main dashboard shell.
- One focused table in the main canvas at a time.
- Detection rationale in plain language.
- Original/raw table view reachable whenever a transformation was applied.
- Strong light theme with high contrast; dark mode deferred.
- A presenter mode with stable chart layouts, large readable headings, and keyboard-friendly next/previous presentation flow.
- Guided chart selection that shows users what outputs are available for the current dataset.
- Pinned or presenter-safe filters that do not unexpectedly rearrange the layout mid-meeting.
- A clean, readable default dashboard that favors summary-first reading over raw table exploration.
- A clear distinction between summary view and detail view so management and architecture audiences can consume the same report differently.

## 10. Acceptance Criteria

1. A valid `.xlsx` or `.csv` upload always results in either a trustworthy dashboard view or an explicit review-required state before the data can be presented.
2. A standard user can complete the MVP flow entirely in the browser: open the app, upload a spreadsheet, wait for processing, and reach the generated dashboard without terminal commands or manual API calls.
3. All workbook sheets are represented in the output manifest.
4. Multi-table sheets are not silently merged into misleading datasets.
5. Wide-to-long normalization is only applied when rules are satisfied and is always documented in metadata/UI.
6. The system reuses existing report visuals when they are usable, and otherwise generates safe chart outputs while recording which strategy was used.
7. Chart suggestions and user-selectable chart options reflect actual inferred data types and only expose valid output choices.
8. The common path reaches a readable first dashboard with at most one user selection step after processing, and ideally none.
9. Search returns understandable preview results fast enough to feel live.
10. Main flows work on desktop and mobile with accessible navigation.
11. A user can switch into presenter mode and use the dashboard directly in an internal review without manual slide rearrangement.

## 11. Success Metrics

- Upload-to-first-dashboard completion rate for valid files
- Upload-to-first-presentable-dashboard completion rate for valid files
- Browser upload start-to-dashboard completion rate without developer assistance
- Detection accuracy on the internal messy-workbook fixture pack
- Search latency on indexed preview data
- Number of uploads that require manual fallback or user clarification
- User confidence signals during testing, especially around table splits and transformations
- Share of recurring internal reports presented directly from the dashboard instead of being rebuilt in PowerPoint

## 12. Risks And Open Questions

- Table segmentation quality may degrade on highly irregular enterprise workbooks.
- Some wide business tables will remain ambiguous without manual user confirmation.
- Preview search may need a stronger index if real-world workbook sizes skew larger than expected.
- Internal authentication, retention, and audit expectations may vary by company environment.
- Reusing workbook chart intent may be hard when the source workbook contains weak, misleading, or partially extractable visuals.
