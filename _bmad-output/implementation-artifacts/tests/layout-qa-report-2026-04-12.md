# Layout QA Report

Date: 2026-04-12
Mode: QA only
Scope: Integrated dashboard layout review of the running app

## Verdict

Not layout-ready for demo quality.

The current UI direction is promising, but the layout problems are systemic, not local. The biggest issue is a coupled page structure where:

- the left sidebar and main content share one stretched frame
- the sticky presenter/navigation block lives inside the main workspace instead of the top bar
- the preview/data surface grows without meaningful containment
- the masthead/search area disappears during normal reading scroll

That combination makes the dashboard lose balance on the harder fixtures.

## Test Setup

- Backend: local FastAPI on `http://127.0.0.1:8000`
- Frontend: local Vite app on `http://127.0.0.1:4174`
- Browser harness: Edge headless automation for screenshot capture
- Screenshot artifacts:
  - [academic-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-top.png)
  - [academic-search-open.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-search-open.png)
  - [academic-inspector.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-inspector.png)
  - [academic-scrolled.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-scrolled.png)
  - [performance-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-top.png)
  - [performance-search-open.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-search-open.png)
  - [performance-scrolled.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-scrolled.png)
  - [google-chart-switch.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/google-chart-switch.png)
  - [monthly-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/monthly-top.png)
- Geometry captures:
  - [academic-top.json](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-top.json)
  - [academic-scrolled.json](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-scrolled.json)
  - [performance-top.json](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-top.json)
  - [performance-scrolled.json](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-scrolled.json)
  - [google-top.json](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/google-top.json)
  - [monthly-baseline.json](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/monthly-baseline.json)

## Fixture Coverage

Verified in the running app:

- `Google Finance Investment Tracker.xlsx`
- `performance-logs-report.xlsx`
- `extensive-document-academic-report.xlsx`
- `Monthly budget.xlsx`

Coverage gap:

- `test-validation-multiple-environments.xlsx` could not be exercised in the current app because upload was rejected at the current 10 MB cap with:
  - `file_too_large`
  - `This file is larger than 10 MB. Upload a file up to 10 MB.`

That is not the main layout defect, but it did block the full requested hard-fixture sweep.

## Pass/Fail By Major Layout Area

### 1. Global layout integrity

Status: Fail

What I observed:

- The page does not preserve a stable overall composition when real content becomes large.
- A tall preview/data block or a tall sidebar causes the entire frame to elongate.
- The page stops feeling like an intentionally composed dashboard and starts feeling like one long vertical document.

Evidence:

- [academic-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-top.png)
- [performance-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-top.png)

Key metric:

- `performance-logs-report.xlsx` produced a preview card height of `4790px` and a coupled sidebar height of `5700px` in [performance-top.json](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-top.json).

### 2. Left sidebar / workbook navigation column

Status: Fail

What I observed:

- The sidebar is not independently contained.
- It does not get its own internal scroll behavior.
- It grows to the same giant page height as the rest of the layout.
- This makes it part of the page deformation instead of a controlled navigation column.

Evidence:

- [academic-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-top.png)
- [performance-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-top.png)

Key metrics:

- Academic sidebar:
  - height `2793px`
  - `overflowY: visible`
  - [academic-top.json](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-top.json)
- Performance sidebar:
  - height `5700px`
  - `overflowY: visible`
  - [performance-top.json](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-top.json)

Important nuance:

- The sidebar is still a problem, but the deeper issue is systemic coupling.
- The sidebar is not the only thing breaking the page.
- The main preview/data block is also stretching the shared frame, and the sidebar then stretches with it.

### 3. Top bar / top-row stability

Status: Fail

What I observed:

- On first load, the top bar looks visually fine.
- During normal reading scroll, the masthead and search bar disappear completely.
- The top-row controls are not stable enough for long dashboards.

Evidence:

- [academic-scrolled.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-scrolled.png)
- [performance-scrolled.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-scrolled.png)

Key metrics:

- After scrolling `900px`, masthead `y = -882` on both academic and performance routes:
  - [academic-scrolled.json](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-scrolled.json)
  - [performance-scrolled.json](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-scrolled.json)

QA conclusion:

- The search/top bar area is visually stable only at the top of the page.
- It is not stable during normal reading, which is when the harder fixtures need it most.

### 4. Presentation mode placement

Status: Fail

What I observed:

- The presenter/navigation block is currently occupying the first slot of the workspace grid, not the masthead/top utility area.
- In practice this steals one of the three top-row content slots and pushes the preview block downward.
- It creates a lopsided first row: sticky nav on the left, summary in the middle, charts on the right, preview below.

Evidence:

- [academic-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-top.png)
- [google-chart-switch.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/google-chart-switch.png)
- [monthly-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/monthly-top.png)

QA conclusion:

- Yes, the presentation mode block should be restored to the top horizontal area with the search field/top controls.
- Its current placement is materially contributing to layout imbalance.

### 5. Search field and search results

Status: Partial pass

What I observed:

- The search field itself is positioned correctly on first load.
- The search result dropdown overlays the page without reflowing the whole layout, which is good.
- Search cards stay readable enough and did not become the main layout breaker in this pass.
- However, because the masthead is not stable while scrolling, the search field disappears during long reading sessions.

Evidence:

- [academic-search-open.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-search-open.png)
- [performance-search-open.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-search-open.png)

QA conclusion:

- Search dropdown behavior is not the primary layout problem.
- The search/top bar container is the real problem.

### 6. Summary block, charts block, preview/data block

Status: Fail

What I observed:

- Summary and charts remain reasonably readable, but they are still being stretched to matching heights even when their internal content does not justify it.
- The preview/data block is the biggest containment failure.
- On harder fixtures, preview becomes a very tall narrow column and dominates the whole page.

Evidence:

- [academic-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-top.png)
- [performance-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-top.png)
- [monthly-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/monthly-top.png)

Key metrics:

- Academic:
  - summary height `875px`
  - charts height `875px`
  - preview height `1702px`
- Performance:
  - summary height `694px`
  - charts height `694px`
  - preview height `4790px`
- Monthly:
  - summary height `937px`
  - charts height `937px`
  - preview height `2165px`

These matching summary/chart heights are a strong sign that unrelated blocks are still being stretched together.

### 7. Previous / Next navigation and sticky behavior

Status: Partial fail

What I observed:

- The sticky navigation treatment does keep Previous / Next reachable while scrolling.
- But it does so by parking the presenter/navigation block inside the main workspace, where it permanently consumes a primary content slot.
- That solves reachability at the cost of layout integrity.

Evidence:

- [academic-scrolled.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-scrolled.png)

QA conclusion:

- Reachability improved.
- Placement is still wrong for the integrated page layout.

### 8. Inspectors, popups, expanded detail views

Status: Pass

What I observed:

- The search inspector modal is one of the strongest containment patterns currently in the UI.
- It isolates dense row detail in an overlay instead of deforming the main grid.
- This is the kind of containment pattern the main page needs more of.

Evidence:

- [academic-inspector.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-inspector.png)

### 9. Containment of long and dense content everywhere

Status: Fail

What I observed:

- Long and dense content is still not globally contained.
- The most visible failure is preview/data, not search.
- Logs and report tables still produce extremely tall surfaces.
- The page still deforms vertically when dense records are present.

Evidence:

- [performance-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-top.png)
- [academic-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-top.png)

QA conclusion:

- This is not a local search-only defect.
- It is a broader dashboard containment problem.

## Pass/Fail By Fixture

### `Google Finance Investment Tracker.xlsx`

Status: Partial pass

- Smaller and cleaner than the hardest fixtures, so the page looks more acceptable.
- Still shows the same underlying structural problem: presenter/navigation consumes the first workspace slot and preview sits below instead of participating in a stronger top-row composition.
- Useful comparison fixture, but it does not prove the layout is sound.

Evidence:

- [google-chart-switch.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/google-chart-switch.png)

### `performance-logs-report.xlsx`

Status: Fail

- Strongest proof of the remaining layout problem.
- Preview/data explodes vertically.
- Sidebar is not contained.
- Search/top bar vanishes during reading scroll.
- The page no longer feels dashboard-like.

Evidence:

- [performance-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-top.png)
- [performance-search-open.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-search-open.png)
- [performance-scrolled.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/performance-scrolled.png)

### `extensive-document-academic-report.xlsx`

Status: Fail

- Sidebar-heavy route makes the current structural imbalance very obvious.
- The workspace becomes visually split into:
  - oversized left navigation
  - misplaced sticky nav block in the first content slot
  - preview block pushed downward and stretched tall
- Search overlay itself behaves decently, but the page architecture underneath it is still weak.

Evidence:

- [academic-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-top.png)
- [academic-search-open.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-search-open.png)
- [academic-scrolled.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/academic-scrolled.png)

### `Monthly budget.xlsx`

Status: Partial pass

- Comparison baseline only.
- Looks cleaner than the hard fixtures, but still carries the same structural issues:
  - first workspace slot consumed by presenter/navigation
  - preview block too tall
  - sidebar coupled to page height

Evidence:

- [monthly-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/layout-pass/monthly-top.png)

### `test-validation-multiple-environments.xlsx`

Status: Not exercised

- Blocked by current upload-size rejection at 10 MB.

## What Is Causing Other Blocks To Deform

Primary layout deformers in the current build:

1. Left sidebar and main content are coupled inside one stretched frame.
2. The sticky presenter/navigation block is placed inside the workspace grid instead of the masthead/top bar.
3. The preview/data block has weak containment and becomes a tall narrow column.
4. The masthead/search area is not persistent enough for long-reading workflows.

This means the problem is systemic, not isolated to one component.

## Direct Answers To The Requested Questions

### Is the left sidebar still breaking the rest of the layout?

Yes.

More precisely:

- the sidebar is still part of the problem
- but the deeper issue is that sidebar and content are still coupled together
- large content on either side can deform the overall frame

### Should the presentation mode block be restored to the top bar area?

Yes.

Current evidence strongly supports moving it back to the top horizontal area with the search field/top controls.

### Is the search/top bar area stable?

Partially.

- Stable on first load
- Not stable during normal reading/scrolling
- Not strong enough yet for long fixtures

### Are the layout issues local or systemic?

Systemic.

The page architecture is still allowing one area to distort the others.

## Final Conclusion

The current UI is **not layout-ready for demo quality**.

The search dropdown and inspector overlay are moving in the right direction, but the full dashboard still breaks as an integrated system under real workbook pressure.

The next correction pass should treat this as a page-level layout architecture problem, not a single-component tweak.
