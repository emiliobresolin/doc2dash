# Corrective Slice QA Report

Date: `2026-04-12`  
Scope: integrated QA pass for stories `3.4` through `3.8`  
Mode: QA only, no fixes applied

## Conclusion

Result: `not ready`

The integrated corrective slice delivers real improvement in the browser experience, especially around:

- compact search-result presentation
- scoped search-driven presentation behavior
- preview-local filtering
- sticky navigation reachability
- the initial Line chart render defect

But the slice is not fully complete as a product-facing correction because story `3.7` does not yet meet its intent on the hard fixtures that matter most for demo quality:

- `Google Finance Investment Tracker.xlsx`
- `performance-logs-report.xlsx`
- `test-validation-multiple-environments.xlsx`

Those workbooks are still not consistently reaching a first-view/dashboard state that feels better than the source spreadsheet.

## Source Of Truth Reviewed

- [3-4-rebaseline-current-fixture-library-and-presentation-regression-expectations.md](C:/Users/emili/Desktop/Projets/doc2dash/_bmad-output/implementation-artifacts/3-4-rebaseline-current-fixture-library-and-presentation-regression-expectations.md)
- [3-5-harden-search-result-presentation-and-stable-dashboard-card-sizing.md](C:/Users/emili/Desktop/Projets/doc2dash/_bmad-output/implementation-artifacts/3-5-harden-search-result-presentation-and-stable-dashboard-card-sizing.md)
- [3-6-keep-dashboard-navigation-reachable-during-reading.md](C:/Users/emili/Desktop/Projets/doc2dash/_bmad-output/implementation-artifacts/3-6-keep-dashboard-navigation-reachable-during-reading.md)
- [3-7-improve-default-view-quality-and-condense-report-style-workbooks.md](C:/Users/emili/Desktop/Projets/doc2dash/_bmad-output/implementation-artifacts/3-7-improve-default-view-quality-and-condense-report-style-workbooks.md)
- [3-8-add-in-preview-filtering-for-source-aware-table-inspection.md](C:/Users/emili/Desktop/Projets/doc2dash/_bmad-output/implementation-artifacts/3-8-add-in-preview-filtering-for-source-aware-table-inspection.md)
- [epics.md](C:/Users/emili/Desktop/Projets/doc2dash/_bmad-output/planning-artifacts/epics.md)
- [sprint-status.yaml](C:/Users/emili/Desktop/Projets/doc2dash/_bmad-output/implementation-artifacts/sprint-status.yaml)

## Fixtures Used

All current workbook fixtures under [apps/api/tests/fixtures](C:/Users/emili/Desktop/Projets/doc2dash/apps/api/tests/fixtures):

- `Monthly budget.xlsx`
- `Google Finance Investment Tracker.xlsx`
- `performance-logs-report.xlsx`
- `test-validation-multiple-environments.xlsx`
- `extensive-document-academic-report.xlsx`
- `costs of 2025.xlsx`

Note on confidence:

- [Monthly budget.xlsx](C:/Users/emili/Desktop/Projets/doc2dash/apps/api/tests/fixtures/Monthly%20budget.xlsx) was already locally modified outside this implementation pass. I still used it for route, chart, and interaction verification, but I treat content-specific baseline confidence for that one file as slightly lower than the others.

## What Was Verified Automatically

Backend checks:

```powershell
python -m pytest apps/api/tests/unit/test_select_default_view.py apps/api/tests/integration/test_fixture_library_regressions.py apps/api/tests/integration/test_uploads.py
```

Result:

- `21 passed`

Frontend checks:

```powershell
npm.cmd test -- --run src/features/search/SearchPanel.test.tsx src/features/dashboard/DashboardPage.test.tsx src/features/presentation/PresenterMode.test.tsx src/components/charts/ChartPanel.test.tsx
```

Result:

- `25 passed`

Build check:

```powershell
npm.cmd run build
```

Result:

- success
- non-blocking warning: large Plotly chunk still emitted during build

## What Was Verified In The Running App

Hosted local app smoke:

- started FastAPI in hosted mode with built frontend assets
- confirmed `/` returned the upload page
- confirmed `/uploads/{uploadId}` resolved directly as SPA routes

Browser-first flow:

- uploaded [Monthly budget.xlsx](C:/Users/emili/Desktop/Projets/doc2dash/apps/api/tests/fixtures/Monthly%20budget.xlsx) from `/`
- verified automatic handoff into `/uploads/{uploadId}`
- reloaded the dashboard route successfully

Fixture baseline flow:

- uploaded all six fixtures through the running app/API path
- confirmed `processing -> ready` for all six
- reloaded `/uploads/{uploadId}` successfully for all six fixtures

Search/scoped/manual UX checks:

- `performance-logs-report.xlsx`
  - searched `Mozilla`
  - verified bounded result cards
  - verified `+17 more fields` overflow badge
  - verified inspector dialog opens separately from the dashboard grid
- `extensive-document-academic-report.xlsx`
  - searched `Privacidade`
  - selected a search result from `PRISMA / tbl_01_01`
  - verified scoped presentation state
  - verified preview/data and chart area switched to the selected result
  - verified `Exit scoped view` restored the prior workbook context
- `Monthly budget.xlsx`
  - verified initial `Line` chart render on first load
  - switched `Area -> Line` and confirmed no longer-needed workaround
  - verified preview-local filter narrows rows and resets cleanly
- `test-validation-multiple-environments.xlsx`
  - verified sticky Previous / Next controls remained reachable after scrolling
  - verified grouped navigation reduced initial visible table count

## Story Status

| Story | Status | QA Read |
| --- | --- | --- |
| `3.4` | Pass | Fixture README, catalog, and regression tests now align to the actual current workbook set. Upload-to-ready and route reload remained stable for all fixtures. |
| `3.5` | Pass | Search-result presentation is materially better, scoped search presentation works, inspector behavior is real, and the initial Line render bug is fixed. |
| `3.6` | Pass | Previous / Next and preview page controls remain reachable while scrolling on long dashboards. |
| `3.7` | Fail | Default-view quality and report condensation improved in some places, but the targeted hard fixtures are still not consistently presentation-worthy. |
| `3.8` | Pass | Preview-local filtering works in normal and scoped contexts, resets pagination, and exits cleanly with scoped state. |

## Fixture Status

| Fixture | Status | QA Notes |
| --- | --- | --- |
| `Monthly budget.xlsx` | Pass | Best current fixture. Browser upload, first-load Line render, reload stability, and preview filtering all behaved well. |
| `Google Finance Investment Tracker.xlsx` | Fail | Better than the old one-column stub, but still opens on a table-only Watchlist view with many blank rows and no presentation-strong chart. |
| `performance-logs-report.xlsx` | Fail | Search cards are much better, but the default dashboard is still a 20-column, 2333-row table-first experience that does not yet feel better than the source workbook. |
| `test-validation-multiple-environments.xlsx` | Fail | Grouping is improved and the default view is chartable, but the chart labeling and overall fragmentation still make the first experience too weak for presentation/demo quality. |
| `extensive-document-academic-report.xlsx` | Pass | Long-form search presentation, scoped result selection, and scoped preview behavior are materially improved and usable. |
| `costs of 2025.xlsx` | Pass | Stable upload, reload, and grouped navigation behavior. Still busy, but no regression found in the corrective slice areas. |

## Detailed Findings

### 1. Fixture Regression Baseline

Status: `pass`

Verified:

- all six fixtures uploaded successfully
- all six reached `ready`
- all six dashboard routes reloaded successfully
- browser-first upload flow still works
- fixture inventory now matches the actual current workbook set in:
  - [README.md](C:/Users/emili/Desktop/Projets/doc2dash/apps/api/tests/fixtures/README.md)
  - [fixture_catalog.py](C:/Users/emili/Desktop/Projets/doc2dash/apps/api/tests/fixtures/fixture_catalog.py)
  - [test_fixture_library_regressions.py](C:/Users/emili/Desktop/Projets/doc2dash/apps/api/tests/integration/test_fixture_library_regressions.py)

### 2. Search Result Presentation Hardening

Status: `pass`

What improved in reality:

- long and wide results are no longer dumped as ugly mini-spreadsheets
- cards stay compact
- rows now show only a small set of prioritized columns
- overflow is communicated with badges like `+17 more fields`
- long snippets and values are clamped enough to stay readable
- full detail opens in a separate inspector dialog instead of inflating the dashboard grid

Evidence:

- [SearchResultList.tsx](C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/components/preview/SearchResultList.tsx)
- [SearchResultInspector.tsx](C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/components/preview/SearchResultInspector.tsx)
- `performance-logs-report.xlsx` search for `Mozilla`
- `extensive-document-academic-report.xlsx` search for `Privacidade`

Residual weakness:

- the overall dashboard can still feel visually heavy on table-first fixtures because the preview workspace itself remains large and table-dense
- that is not a search regression, but it still affects total presentation quality

### 3. Scoped Search Presentation Behavior

Status: `pass`

Verified:

- selecting a search result enters a visible scoped state
- selected result becomes the active presentation context
- chart section switches to the selected result’s table
- preview section switches to the selected result’s rows only
- badges and copy clearly indicate scoped behavior
- `Exit scoped view` restores the prior workbook context
- exiting scoped state clears scoped preview filter state predictably

Evidence:

- [DashboardPage.tsx](C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/features/dashboard/DashboardPage.tsx)
- academic fixture:
  - initial context: `LegacyFederation / tbl_10_01`
  - scoped context after selection: `PRISMA / tbl_01_01`
  - restored context after exit: `LegacyFederation / tbl_10_01`

### 4. Stable Dashboard Card Sizing

Status: `pass with weakness noted`

What passed:

- search result dropdown is bounded and overlays rather than reflowing the page
- inspector opens separately and does not stretch sibling cards
- card widths stayed stable before and after inspector open in the performance-log check

What still feels weak:

- on table-heavy fixtures, especially `performance-logs-report.xlsx`, the preview area still produces a very tall reading experience
- this does not recreate the old broken compact-search behavior, but it still leaves the overall page heavier than ideal for presentation

This is why story `3.5` passes but the integrated slice still is not ready overall.

### 5. Presentation Slot Initial Render Bug

Status: `pass`

Verified explicitly on [Monthly budget.xlsx](C:/Users/emili/Desktop/Projets/doc2dash/apps/api/tests/fixtures/Monthly%20budget.xlsx):

- default `Line` chart rendered correctly on first load
- plotted trace existed immediately
- switching `Area -> Line` no longer changed an empty first render into a working one

Evidence:

- first-load chart DOM already contained visible SVG content and one trace
- post-toggle chart DOM matched the initial render instead of fixing a broken state

### 6. Sticky / Reachable Navigation

Status: `pass`

Verified on longer fixtures:

- `performance-logs-report.xlsx`
- `test-validation-multiple-environments.xlsx`

Behavior:

- sticky navigation remained at the top of the viewport during scroll
- Previous / Next stayed visible and reachable
- preview page controls also remained reachable without scrolling back to the bottom of the preview card

Residual weakness:

- the sticky treatment is functionally successful, but it still consumes a meaningful amount of horizontal space on already dense dashboards

### 7. Default-View Quality And Report Condensation

Status: `fail`

This is the main blocker.

What improved:

- `Google Finance Investment Tracker.xlsx` no longer lands on the earlier low-signal one-column stub; it now opens on `tbl_02_03`
- `test-validation-multiple-environments.xlsx` gets a chart-first default and visible navigation grouping
- grouped navigation reduces flat visible navigation burden on fragmented workbooks
  - validation workbook: `19` visible nav buttons, `137` hidden under overflow groups

What is still not good enough:

- `Google Finance Investment Tracker.xlsx`
  - default is still a table-only Watchlist
  - first page is visually weak and padded by many blank rows
- `performance-logs-report.xlsx`
  - default is still a 20-column table-first view
  - no first-view uplift to something more presentation-worthy
- `test-validation-multiple-environments.xlsx`
  - chart exists, but its dimension label is still extremely long and visually awkward
  - grouped navigation helps structurally, but the workbook still feels too exploded for presentation confidence
- `extensive-document-academic-report.xlsx`
  - remains workable, but I did not see a materially stronger first-view outcome than the baseline expectation

Bottom line:

- the story improved mechanics
- it did not yet fully improve first impression on the hard fixtures

### 8. Preview-Local Filtering

Status: `pass`

Verified:

- filter lives inside the preview area and is clearly distinct from global search
- filtering narrows only the open table
- pagination resets when the filter changes
- no-match message is distinct and clear
- scoped search mode keeps the filter confined to the scoped result
- exiting scoped mode clears the scoped preview filter and restores normal workbook context

Examples:

- `Monthly budget.xlsx`
  - filtering `Rent` reduced preview rows from `25` to `1`
  - filtering a non-match showed `No rows in this preview match "..."`
- academic scoped result
  - preview filter copy changed to `This filter refines only the scoped search selection shown here.`
  - exit restored the prior table and cleared the filter input

## Regressions Found

No regression was found in:

- browser-first upload handoff
- dashboard route reload behavior
- hosted same-origin local path
- automated checks rerun in this QA pass

The issue is not regression of the earlier browser/deploy slice. The issue is incomplete product correction on the remaining hard fixtures.

## Behaviors That Technically Work But Are Still Weak

These are important because they will matter in demos even though they are not total failures:

- `Google Finance Investment Tracker.xlsx` technically works, but still looks table-first and low-signal
- `test-validation-multiple-environments.xlsx` technically works, but its first chart and labeling are still awkward for presentation
- `performance-logs-report.xlsx` now has much better search behavior, but the core default dashboard still looks like a giant extracted table
- sticky navigation works, but the page still feels visually dense on long/table-heavy fixtures

## Ready For Review?

Verdict: `not ready`

This slice is good enough to hand back to architecture for the next planning step, but it is not ready to be treated as a fully successful corrective closeout.

If the standard is:

> the app should feel better than Excel / Google Sheets on the real fixture library

then the current integrated result still falls short on the finance tracker, performance logs, and multi-environment validation workbook.
