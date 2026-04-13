# Fixture Library QA Report

Date: `2026-04-12`  
Scope: current workbook fixtures under `apps/api/tests/fixtures`  
Mode: QA analysis only, no fix implementation

## Summary

This QA pass exercised every current workbook fixture through the real upload-to-dashboard API path using an isolated runtime root.

Overall result:

- Upload/runtime stability: `pass`
- Presentation fitness across the current fixture library: `not acceptable yet`
- Best current fixture for demo flow: `Monthly budget.xlsx`
- Most problematic fixtures for the product goal of "nicer than Excel or Google Sheets": `performance-logs-report.xlsx`, `test-validation-multiple-environments.xlsx`, `Google Finance Investment Tracker.xlsx`, and `extensive-document-academic-report.xlsx`

The core pattern is that the app can ingest all current fixtures successfully, but several real-world report files still land in table-heavy, visually overloaded, or weakly reconstructed states that do not yet outperform the source spreadsheet as a presentation surface.

## Method

The sweep used FastAPI `TestClient` against `create_app()` with a temporary `DOC2DASH_UPLOADS_ROOT`, then for each workbook:

1. `POST /api/uploads`
2. poll `/api/uploads/{uploadId}/manifest` until the upload leaves `processing`
3. fetch `/api/uploads/{uploadId}/runtime`
4. inspect the default view table and page-1 preview
5. run one representative `/api/uploads/{uploadId}/search?q=...` query derived from fixture sample values

The current workbook fixtures covered in this pass were:

- `costs of 2025.xlsx`
- `extensive-document-academic-report.xlsx`
- `Google Finance Investment Tracker.xlsx`
- `Monthly budget.xlsx`
- `performance-logs-report.xlsx`
- `test-validation-multiple-environments.xlsx`

## Findings

### 1. Search result cards are not fit for wide or long report fixtures
Severity: `High`

This reproduces the demo complaint about the compacted search block not displaying data nicely.

Evidence from the fixture sweep:

- `extensive-document-academic-report.xlsx`
  - search returned up to `20` preview columns
  - longest preview value in search results: `7363` characters
  - longest snippet: `3719` characters
- `performance-logs-report.xlsx`
  - search returned up to `20` preview columns
  - longest preview value in search results: `135` characters

Current UI rendering makes this worse because every matched row is rendered as a flat flex-wrapped list of inline cells with no truncation or clamping in [SearchResultList.tsx](/C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/components/preview/SearchResultList.tsx#L41) and [globals.css](/C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/styles/globals.css#L332). The layout is likely to balloon vertically and become hard to scan on report-style fixtures.

### 2. Existing visual/chart intent is not being meaningfully reused on graph-rich spreadsheets
Severity: `High`

This confirms the demo complaint that files which already contain good graphs are not replicable in the application.

Evidence from the sweep:

- Across all `6` current workbook fixtures, the manifest contained `0` tables with `chartSourceType = "reused"`
- `Google Finance Investment Tracker.xlsx`
  - `9` tables total
  - `9` table-first tables
  - default view lands on `tbl_01_03`, a single-column table
  - no chart-first outcome at all
- `Monthly budget.xlsx`
  - the best current workbook in the set
  - still defaults to a generated chart in the final dashboard view
  - only `2` tables were `reconstructed`, `0` were `reused`

The product promise says existing presentation-worthy report visuals should be reused when possible. The current fixture sweep shows that path is not materially exercised by the current implementation.

### 3. Report-style workbooks that should be strong showcase inputs still degrade into spreadsheet-like table views
Severity: `High`

This is the clearest product-fit issue in the current fixture library.

Evidence:

- `performance-logs-report.xlsx`
  - `3` tables total
  - all `3` are table-first
  - default table has `20` columns
  - preview page shows `25` rows with values up to `135` characters
  - result: stable technically, but not nicer than the original spreadsheet
- `test-validation-multiple-environments.xlsx`
  - `156` tables total
  - `151` table-first tables
  - `6` review-required tables
  - default view is chartable, but the workbook overall is heavily fragmented
  - likely overwhelms sidebar navigation and weakens the “open one dashboard and present it” experience
- `extensive-document-academic-report.xlsx`
  - `17` tables total
  - only `2` chart-first tables
  - most of the workbook remains table-first and hard to present elegantly

For the exact kinds of performance logs and test reports the user called out, the application is currently more of a faithful data extraction layer than a strong presentation upgrade.

### 4. The fixture library documentation is stale and no longer matches the actual inputs being tested
Severity: `Medium`

The current fixture folder contents no longer match the documented fixture inventory in [README.md](/C:/Users/emili/Desktop/Projets/doc2dash/apps/api/tests/fixtures/README.md#L8) and [fixture_catalog.py](/C:/Users/emili/Desktop/Projets/doc2dash/apps/api/tests/fixtures/fixture_catalog.py#L38).

The documented library still describes deleted legacy fixtures like:

- `blank-rows-multi-table.xlsx`
- `spacer-column-report.xlsx`
- `wide-and-long-mixed.xlsx`
- `duplicate-headers-ambiguous.xlsx`
- `empty-and-summary.xlsx`
- `ugly-workbook.xlsx`

But the current folder now contains a different workbook set. That means current QA/demo inputs are no longer represented by the authoritative fixture expectations, which makes regressions easier to miss.

### 5. First-search responsiveness is still uneven on the largest fixtures
Severity: `Medium`

Representative first search calls returned:

- `extensive-document-academic-report.xlsx` -> `130 ms`
- `performance-logs-report.xlsx` -> `23 ms`
- `test-validation-multiple-environments.xlsx` -> `1122 ms`
- `costs of 2025.xlsx` -> `649 ms`

This does not necessarily violate the current technical contract for warmed indexed search, but it does matter for actual first-user perception on heavy workbooks.

## Fixture-By-Fixture Outcome

| Fixture | Upload Status | Presentation Outcome | Notes |
| --- | --- | --- | --- |
| `costs of 2025.xlsx` | Ready | Partial | Technically stable, but `85` generated tables from `13` sheets means the workbook is still heavily table-fragmented. |
| `extensive-document-academic-report.xlsx` | Ready | Fail for presentation goal | Search results become huge and hard to scan; only `2/17` tables are chart-first. |
| `Google Finance Investment Tracker.xlsx` | Ready | Fail for presentation goal | All `9` tables are table-first; default view is a one-column table; no meaningful chart reuse. |
| `Monthly budget.xlsx` | Ready | Best current result | Search was clean, runtime stable, and two tables were reconstructed. Still not true source-chart reuse. |
| `performance-logs-report.xlsx` | Ready | Fail for presentation goal | Default view is a `20`-column table-only experience; this does not currently present better than the source workbook. |
| `test-validation-multiple-environments.xlsx` | Ready | Fail for presentation goal | `156` detected tables, `151` table-first, `6` review-required; likely too fragmented for a strong report dashboard. |

## Positive Notes

- All `6` current workbook fixtures uploaded successfully and reached `ready`
- The large `test-validation-multiple-environments.xlsx` fixture passed under the current `30 MB` limit
- The same-origin dashboard contract remained stable across the sweep
- `Monthly budget.xlsx` is a credible working reference for the current browser-first demo path

## QA Conclusion

The current application is operational and demoable, but it is not yet reliable across the actual fixture library for the stated product goal of presenting messy spreadsheet data more cleanly than Excel or Google Sheets.

The main gaps are now clearly product-facing:

1. search-result presentation for long and wide content
2. chart/visual reuse or reconstruction quality on graph-heavy workbooks
3. report-style workbook heuristics for logs, trackers, and test reports
4. stale fixture coverage and expectation maintenance

This report is ready to hand to architecture for fix planning.
