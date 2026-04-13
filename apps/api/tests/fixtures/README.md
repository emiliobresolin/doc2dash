# Fixture Library

This folder contains the workbook fixtures that now define the real regression baseline for `doc2dash`.

These are the files we currently demo, QA, and use to judge whether the product is actually better than Excel or Google Sheets for messy reports, long-form data, and fragmented workbooks.

## Current Regression Set

| Fixture | Current Role | Baseline Read |
| --- | --- | --- |
| `Monthly budget.xlsx` | Best current demo workbook | Strong baseline reference for upload, dashboard handoff, and readable presentation |
| `Google Finance Investment Tracker.xlsx` | Graph-heavy finance tracker | Weak default view today; primary target for default-view and chart-intent improvements |
| `performance-logs-report.xlsx` | Long-form performance/log report | Weak presentation today; primary target for long-form search rendering and report-first views |
| `test-validation-multiple-environments.xlsx` | Large fragmented validation report | Operational but heavily fragmented; primary target for condensation and navigation improvement |
| `extensive-document-academic-report.xlsx` | Long-form academic/report content | Operational but weak for compact search presentation; primary target for long/wide result rendering |
| `costs of 2025.xlsx` | Multi-sheet cost workbook | Operational but highly fragmented; useful baseline for first-search and navigation pressure |

## What This Library Protects

- Upload-to-ready stability for the current workbook set
- Sheet and table count regressions on the files we actually use now
- Baseline default-view outcomes before the corrective slice improves them
- Known presentation-risk markers that later stories should improve explicitly

## Current Corrective Targets

- Story `3.5`: search result presentation and stable dashboard card sizing
- Story `3.6`: scroll-friendly, reachable Previous / Next and preview navigation
- Story `3.7`: better default views and less fragmented report navigation
- Story `3.8`: preview-local filtering that works with scoped search presentation

## Source Of Truth

- The authoritative machine-readable expectations live in [`fixture_catalog.py`](./fixture_catalog.py).
- The latest QA sweep and baseline presentation findings live in:
  - [`_bmad-output/implementation-artifacts/tests/fixture-library-qa-report-2026-04-12.md`](../../../../_bmad-output/implementation-artifacts/tests/fixture-library-qa-report-2026-04-12.md)

## Notes

- Deleted legacy fixtures are no longer the active regression baseline.
- The product is browser-first now; fixture validation should reflect the real upload-to-dashboard flow wherever practical.
- Some fixtures are intentionally marked as weak today so later stories can prove improvement honestly rather than hiding the current gaps.
