# Technical Research

**Project:** doc2dash  
**Research Date:** 2026-04-04  
**Purpose:** Validate the proposed stack and capture current technical guidance from primary sources before architecture and story creation.

## Research Questions

1. What is the most practical ingestion path for `.xlsx` and `.csv` files with multiple sheets and wide/long normalization needs?
2. What backend pattern best supports fast upload acknowledgement with asynchronous parsing?
3. What frontend stack best supports large previews, responsive stateful UX, and interactive charts?
4. What technical constraints should shape the MVP architecture?

## Findings

### 1. Workbook ingestion should stay pandas-first

- `pandas.read_excel(..., sheet_name=None)` returns all sheets, making it the right baseline for multi-sheet workbook ingestion.
- `DataFrame.melt()` is the canonical wide-to-long operation for unpivoting repeated measure columns into a normalized format.
- `DataFrame.T` remains useful for clear row-oriented matrices, but it should be treated as a narrow fallback rather than the default reshape tool.

**Implication:** Use pandas as the system of record for ingestion, table normalization, and profiling. Do not force a JavaScript-first parsing path in the MVP.

### 2. FastAPI fits the upload-and-process workflow

- FastAPI supports file/form upload handling via `UploadFile` and requires `python-multipart` for multipart form parsing.
- FastAPI `BackgroundTasks` are appropriate when the client should receive a fast response while work continues after the request.
- FastAPI explicitly recommends a larger queueing tool such as Celery when background computation becomes heavy or must run across multiple processes or servers.

**Implication:** Start with FastAPI + `BackgroundTasks` for the MVP ingestion pipeline, but keep the parser isolated so it can move to a worker queue later without rewriting the domain logic.

### 3. React + Vite remains the cleanest UI foundation

- React’s official guidance still centers on modeling UI as explicit visual states, which fits upload, processing, success, empty, ambiguous, and error states cleanly.
- Vite’s current docs show `vite@8.0.2` on the main guide and require Node.js `20.19+` or `22.12+`.
- Vite remains monorepo-friendly and supports direct scaffolding with `npm create vite@latest ... -- --template react-ts`.

**Implication:** Use React state machines and explicit loading/error states in the dashboard shell. Standardize on Node 20 LTS or newer so Vite is not the constraint.

### 4. Large preview tables need virtualization

- TanStack Table’s virtualization examples demonstrate large row counts with a virtualizer rather than raw DOM rendering.
- TanStack Virtual is in the `v3` line and is purpose-built for virtualizing large lists and tables.

**Implication:** Table previews should be virtualized from day one. A naive full DOM table will not meet the performance target on 100K-row data.

### 5. Plotly.js is suitable for interactive charting

- Plotly.js documents support for basic chart families needed by the MVP, including line, bar, pie, table, and scatter-style visualizations.
- Plotly’s GitHub releases page showed `v3.3.0` as the latest release in the observed snapshot.

**Implication:** Plotly.js is mature enough for the chart recommendation layer. The MVP can restrict itself to a small safe subset of chart types rather than exposing Plotly’s full surface area.

### 6. Source-chart reuse remains a targeted spike area

- The current research supports chart generation, chart selection, and presentation-oriented rendering more strongly than workbook-native chart extraction.
- Reusing or reconstructing existing report visuals is aligned with the product goal, but the technical depth of Excel chart extraction and faithful reuse should be treated as an implementation spike rather than assumed solved behavior.

**Implication:** The product direction should be “reuse first when practical, generate when clearer,” but the engineering plan should treat workbook-chart extraction as a bounded follow-up investigation inside the chart strategy layer.

## Recommended Version Policy

Use current stable major lines verified by primary sources on 2026-04-04, then pin exact patch versions during scaffold:

- Python: `3.11` or `3.12`
- FastAPI: current stable line from official docs/PyPI at scaffold time
- pandas: `3.0.x`
- Node.js: `20.19+` or `22.12+`
- React: `19.x`
- Vite: `8.x`
- TanStack Table: `8.x`
- TanStack Virtual: `3.x`
- Plotly.js: `3.x`

## Architecture Impact

### Direct Conclusions

- Choose a split-stack architecture: Python API + React web app.
- Keep parsing, detection, normalization, profiling, and manifest generation in Python.
- Keep navigation, search UI, preview rendering, and charts in the React app.
- Treat asynchronous parsing as a first-class workflow state.
- Build the chart system around explicit heuristics and a safe chart allowlist.
- Treat workbook-native chart reuse as a distinct strategy layer rather than assuming all visuals must be newly generated.

### Inferences From Sources

- Because FastAPI backgrounds small tasks but recommends Celery for heavier distributed work, the parser should be isolated behind a service boundary even if MVP still runs it in-process.
- Because TanStack’s virtualization examples target large row counts, preview performance is better handled with virtualization plus pagination than by trying to render entire tables.
- Because Plotly.js supports more chart types than the product should expose, the product should constrain recommendations to explainable defaults instead of raw library capability.

## Sources

- pandas `read_excel`: https://pandas.pydata.org/pandas-docs/version/1.1.0/reference/api/pandas.read_excel.html
- pandas `DataFrame.melt`: https://pandas.pydata.org/pandas-docs/version/1.1/reference/api/pandas.DataFrame.melt.html
- pandas `DataFrame.T`: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.T.html
- pandas package index: https://pypi.org/pypi/pandas
- FastAPI request forms/files: https://fastapi.tiangolo.com/tutorial/request-forms-and-files/
- FastAPI background tasks: https://fastapi.tiangolo.com/tutorial/background-tasks/
- FastAPI package index JSON: https://pypi.org/pypi/fastapi/json
- React UI states: https://react.dev/learn/reacting-to-input-with-state
- Vite guide: https://vite.dev/guide/
- Vite releases: https://vite.dev/releases
- TanStack Table virtualized rows example: https://tanstack.com/table/latest/docs/framework/lit/examples/virtualized-rows
- TanStack Virtual introduction: https://tanstack.com/virtual/latest/docs/introduction
- Plotly.js basic charts: https://plotly.com/javascript/basic-charts/
- Plotly.js releases: https://github.com/plotly/plotly.js/releases
