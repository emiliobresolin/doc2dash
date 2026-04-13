# QA Validation Report: Latest Dev Changes

Date: 2026-04-13
Reviewer: Quinn
Scope: Latest frontend-only dev pass covering scoped chart modeling fixes and the lower full-width preview layout adjustment.

## Source Of Truth

- Latest dev implementation summary in working tree
- `apps/web/src/lib/scopedCharts.ts`
- `apps/web/src/lib/scopedCharts.test.ts`
- `apps/web/src/features/dashboard/DashboardPage.tsx`
- `apps/web/src/features/dashboard/DashboardPage.test.tsx`
- `apps/web/src/styles/globals.css`

## Automated Verification

- `npm.cmd test -- --run src/lib/scopedCharts.test.ts src/components/charts/ChartPanel.test.tsx src/features/dashboard/DashboardPage.test.tsx`
  - Result: `31 passed`
- `npm.cmd run build`
  - Result: success
  - Non-blocking note: existing Plotly chunk-size warning still appears

Additional direct model smoke:

- `npx tsx -e "... buildScopedChartModel(... MonthNo / Cost ...) ..."`
  - Result: ordinal numeric values `1,2,3,4` stayed as labels `1,2,3,4`
  - Result: default scoped option was `Cost by MonthNo`
  - Result: no fake `1970-01-01` time-axis labels
  - Result: no reverse `MonthNo by Cost` pairing emitted

## Manual Running-App Verification

Environment used:

- Backend: `http://127.0.0.1:8000`
- Frontend: `http://127.0.0.1:4175`
- Fresh uploads created for this QA run

Fixtures exercised:

- `costs of 2025.xlsx`
- `performance-logs-report.xlsx`
- `extensive-document-academic-report.xlsx`
- `Google Finance Investment Tracker.xlsx`

### Scoped Chart Behavior

#### `costs of 2025.xlsx`

Query: `PIX`

Verified:

- scoped search activation still works
- scoped preview/data remained limited to the selected rows only
- default scoped chart focus became `Custo by GASTOS DIARIOS`
- an alternative scoped chart pairing was exposed: `Custo by Detalhe`
- switching the scoped chart option updated the active focus to `Custo by Detalhe`

Conclusion:

- meaningful default scoped chart selection: pass
- meaningful alternative scoped pairing: pass
- scoped interaction model remained intact: pass

#### `performance-logs-report.xlsx`

Query: `Mozilla`

Verified:

- scoped search activation still works
- scoped chart behavior stayed honest and fell back to `Readable table view`
- no misleading ID-driven or fake chart pairing surfaced in the tested scoped result

Conclusion:

- legitimate fallback behavior: pass

#### `Google Finance Investment Tracker.xlsx`

Query: `GOOG`

Verified:

- scoped search activation still works
- single-row scoped result stayed on `Readable table view`
- no fake chart was forced for an unchartable scoped row

Conclusion:

- legitimate single-row fallback: pass

### Preview / Source-Aware Rows Layout

#### `performance-logs-report.xlsx`

Verified:

- preview card now uses the lower full-width band
- preview stayed bounded instead of compressing into a narrow right-column card
- long browser-version values remained readable through wider horizontal space and contained scrolling

Conclusion:

- wide lower-band preview materially improves log readability: pass

#### `extensive-document-academic-report.xlsx`

Verified:

- preview card now uses the lower full-width band
- long headers and longer cell values have meaningfully more horizontal room
- preview remains contained and readable without deforming the whole dashboard

Conclusion:

- academic/report preview readability materially improved: pass

## Screenshot Artifacts

Captured during this QA run:

- `.qa-artifacts/latest-dev-validation/costs-search-open.png`
- `.qa-artifacts/latest-dev-validation/costs-scoped-default.png`
- `.qa-artifacts/latest-dev-validation/costs-scoped-alt.png`
- `.qa-artifacts/latest-dev-validation/performance-preview-lower.png`
- `.qa-artifacts/latest-dev-validation/performance-scoped-fallback.png`
- `.qa-artifacts/latest-dev-validation/academic-preview-lower.png`
- `.qa-artifacts/latest-dev-validation/google-scoped-fallback.png`

Supporting browser-state captures:

- `.qa-artifacts/latest-dev-validation/*.json`

## Findings

No blocking findings in this pass.

Minor note:

- In the scoped `costs` screenshots, the sticky masthead still visually overlaps the very top of the chart area at the current viewport position, so the focus picker is less visible in the capture than the underlying behavior would suggest. This did not block the actual scoped option switching in the running app, but it is worth keeping an eye on in future layout passes.

## QA Decision

Approved with minor follow-up note.

The latest dev changes fixed the previously reported scoped-chart modeling defects and improved the preview table readability in the running app. The targeted regression cases now behave correctly, and the current screenshot evidence supports sending this back for architect/product review or the next QA pass if broader layout work continues.
