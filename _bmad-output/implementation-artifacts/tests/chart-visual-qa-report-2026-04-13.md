# Chart Visual QA Report

Date: 2026-04-13
Reviewer: Quinn (`bmad-agent-qa`)
Scope: Latest chart visual enhancement pass in [ChartPanel.tsx](C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/components/charts/ChartPanel.tsx), [globals.css](C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/styles/globals.css), [ChartPanel.test.tsx](C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/components/charts/ChartPanel.test.tsx), and [DashboardPage.test.tsx](C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/features/dashboard/DashboardPage.test.tsx)

## Decision

Approved with minor follow-up note.

The latest dev changes materially improve chart presentation quality without breaking the current dashboard flow. The charts now read as more intentional and executive-friendly in the running app, and the rendering-side automation/build checks are clean.

## No Blocking Findings

I did not find a blocking regression in the latest visual chart pass.

## Minor Follow-up Note

The single-focus chart state currently repeats the chart title in two places: the static `Chart focus` field and the figure title itself in [ChartPanel.tsx#L97](C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/components/charts/ChartPanel.tsx#L97) and [ChartPanel.tsx#L141](C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/components/charts/ChartPanel.tsx#L141). It is not breaking, but it does add a little repetition in the chart card header and slightly reduces information density.

## Automated Verification

- `npm.cmd test -- --run src/components/charts/ChartPanel.test.tsx src/features/dashboard/DashboardPage.test.tsx`
  - Result: `26 passed`
- `npm.cmd run build`
  - Result: success
  - Non-blocking note: the existing large Plotly chunk warning is still present

Relevant automated coverage confirms the key rendering contract:
- mode bar now uses hover-only behavior in [ChartPanel.test.tsx#L138](C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/components/charts/ChartPanel.test.tsx#L138)
- hover label, transition, and legend styling are asserted in [ChartPanel.test.tsx#L159](C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/components/charts/ChartPanel.test.tsx#L159)
- premium pie treatment is asserted in [ChartPanel.test.tsx#L260](C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/components/charts/ChartPanel.test.tsx#L260)
- dashboard tests were updated to remain aligned with the richer figure header in [DashboardPage.test.tsx#L553](C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/features/dashboard/DashboardPage.test.tsx#L553)

## Manual Running-App Verification

Local QA run:
- Hosted local backend serving the built frontend on `http://127.0.0.1:8123`

Real fixtures exercised:
- `Monthly budget.xlsx`
- `costs of 2025.xlsx`
- `Google Finance Investment Tracker.xlsx`
- `performance-logs-report.xlsx`
- `extensive-document-academic-report.xlsx`

Manual checks performed:
- upload -> processing -> ready completed for all five fixtures
- default dashboard route loaded correctly for all five fixtures
- chart cards rendered correctly in the running app
- no regression observed in the current dashboard shell, chart slot, or preview area due to the chart-card enhancements

## Screenshot Artifacts

- [monthly-budget-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/chart-visual-qa/monthly-budget-top.png)
- [costs-2025-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/chart-visual-qa/costs-2025-top.png)
- [google-finance-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/chart-visual-qa/google-finance-top.png)
- [performance-logs-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/chart-visual-qa/performance-logs-top.png)
- [academic-report-top.png](C:/Users/emili/Desktop/Projets/doc2dash/.qa-artifacts/chart-visual-qa/academic-report-top.png)

## Visual Assessment

### What Improved

- Line charts now have noticeably stronger visual hierarchy.
  - Better contrast between line, markers, and plot surface
  - Cleaner hover treatment
  - More polished figure framing
- Bar charts are materially better presented.
  - Accent/emphasis coloring helps draw the eye without becoming noisy
  - Axes and gridlines feel lighter and more deliberate
  - The figure card now looks like a real presentation surface instead of a plain utility panel
- Chart containers are stronger overall.
  - The new figure header, eyebrow, summary tokens, and plot surface styling add clarity without changing the dashboard structure
  - The Plotly mode bar is visually integrated instead of feeling dropped in
- The overall chart slot now feels more premium and demo-ready while keeping the current product identity.

### What I Saw In The Hard Fixtures

- `Monthly budget.xlsx`
  - The default line chart looks cleaner and more executive-ready than before.
  - The chart card surface and typography improve first-glance credibility.
- `Google Finance Investment Tracker.xlsx`
  - The line presentation benefits from the stronger plot surface, refined hover card, and clearer framing.
  - The chart feels more like a deliberate dashboard element rather than a raw Plotly embed.
- `performance-logs-report.xlsx`
  - The dense horizontal bar chart is still inherently busy because of the source data, but it now reads more clearly and looks less generic.
  - The rendering polish helps, even though this remains a hard density case.
- `extensive-document-academic-report.xlsx`
  - The bar chart presentation is materially improved and better balanced against the surrounding cards.
- `costs of 2025.xlsx`
  - The bar-chart landing state feels stronger and more polished.
  - This remains a good representative case for the warmer, more premium chart-card treatment.

## Tradeoffs / Limits Observed

- My manual visual pass covered real rendered default line and bar states on the hard fixtures listed above.
- Pie and alternative chart-state styling were validated primarily through the focused rendering tests in [ChartPanel.test.tsx](C:/Users/emili/Desktop/Projets/doc2dash/apps/web/src/components/charts/ChartPanel.test.tsx), rather than through a broader manual click-through matrix for every chart type on every fixture.
- The improvements are presentation-focused, not modeling-focused. They make the charts look significantly better, but they do not change the underlying dataset suitability limits on the hardest, densest tables.

## Conclusion

This chart pass is approved for the current product direction.

The latest changes achieve the intended goal: the charts feel substantially less plain and more presentation-ready without disrupting the existing dashboard behavior. The remaining note is minor and visual, not a blocker to accepting this pass.
