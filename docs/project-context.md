# Project Context

## Product Summary

`doc2dash` is a hosted internal webapp that turns dense spreadsheet reports into trustworthy dashboards for non-technical users inside companies. The core promise is that a user can open a normal URL, upload a spreadsheet in the browser, wait for processing, and land on a presentation-ready dashboard without terminal steps or rebuilding the report in PowerPoint.

## Source Of Truth

- Product requirements live in `_bmad-output/planning-artifacts/prd.md`.
- Architectural decisions live in `_bmad-output/planning-artifacts/architecture.md`.
- Delivery sequencing lives in `_bmad-output/planning-artifacts/epics.md`.
- Sprint and story readiness live in `_bmad-output/implementation-artifacts/`.

## Locked Product Decisions

- The standard MVP journey starts in the browser at a public company URL.
- Browser-based spreadsheet upload is the primary product entry point.
- Accept `.xlsx` and `.csv` files up to 30 MB.
- Use `pandas.read_excel(sheet_name=None)` for Excel workbook ingestion.
- Treat CSV as a single synthetic sheet during processing.
- Detect multiple tables per sheet with deterministic heuristics first.
- Use conservative normalization rules and preserve the original source view.
- Make system reasoning visible: detection rationale, normalization rationale, and low-confidence states must be shown to the user.
- Make presenter mode a first-class dashboard state for internal review meetings.
- Prefer automatic transformation with little user interaction; extra choices should be exceptions, not the normal flow.
- Reuse existing report visuals or report intent when they are already presentation-worthy; generate new charts when reuse is unavailable or weaker.
- Let users choose among only the chart types that are valid for the current data slice.
- Normal users must not need terminal commands, manual API calls, or pre-seeded upload IDs to use the product.
- Manual API-first flow is allowed only as a developer and QA support mode.

## Locked Technical Decisions

- Python backend with FastAPI for upload, parsing, manifest generation, and search APIs.
- React frontend with Vite for the dashboard shell and interaction layer.
- Frontend and backend must support a production-ready hosted integration path, ideally under one public origin.
- TanStack Table plus TanStack Virtual for large table previews.
- Plotly.js for interactive chart rendering.
- File-based upload bundles for MVP instead of a full database-backed domain model.
- Preview search is server-side over a bounded preview index; full-table search can be slower and paginated.
- The app assumes deployment behind existing company authentication or a trusted internal access layer for MVP.

## Engineering Guardrails

- Prefer boring, explainable technology over clever automation.
- Every transformation must preserve provenance metadata.
- JSON API payloads use `camelCase`; Python internals use `snake_case`.
- Tests must be fixture-driven for messy spreadsheets.
- Accessibility is a release criterion, not a stretch goal.
- No feature should silently merge tables, silently transpose mixed data, or silently choose misleading chart types.
- The first output after upload should already be readable and presentable without requiring dashboard-building work from the user.
- The first browser screen must start the real product flow, not point users at a manual dashboard URL.
- Search, drill-down, and chart switching are supporting tools, not the primary source of first value.
- Ambiguous detections require a review state before the data can be presented as trustworthy output.
- Presenter mode must keep source, confidence, and transformation cues accessible.

## Delivery Guardrails

- The active MVP slice is: landing page -> browser upload -> processing handoff -> dashboard route.
- Do not begin with AI table models, accounts, exports, or dark mode.
- Stories must remain implementation-ready and cite architecture/PRD sections directly.
- Keep presentation behavior in scope, but keep export and free-form slide composition out of scope.
- Do not force users into manual chart-building or dashboard-composition workflows for the common path.
- Do not treat manual API upload plus `/uploads/:id` as acceptable end-user MVP behavior.
