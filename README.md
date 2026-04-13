# doc2dash

`doc2dash` is an internal company report-to-dashboard web application for non-technical users. The MVP accepts `.xlsx` and `.csv` uploads up to 30 MB, detects sheets and tables, preserves report intent when possible, and produces an interactive dashboard that can be used directly in meetings as a presentation surface instead of rebuilding the report in PowerPoint.

## Documentation Pack

- Product context: `docs/project-context.md`
- Hosted MVP runbook: `docs/hosted-mvp.md`
- Local Docker + public URL runbook: `docs/local-public-url.md`
- Technical research: `_bmad-output/planning-artifacts/technical-research.md`
- PRD: `_bmad-output/planning-artifacts/prd.md`
- Epic and story breakdown: `_bmad-output/planning-artifacts/epics.md`
- Architecture decision document: `_bmad-output/planning-artifacts/architecture.md`
- Sprint tracker: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Hosted MVP env reference: `apps/api/.env.hosted.example`

## Locked MVP Decisions

- Backend: FastAPI + pandas + openpyxl
- Frontend: React + Vite + TanStack Table + TanStack Virtual + Plotly.js
- Table detection: heuristics first, AI-assisted detection later if benchmark data proves it is needed
- Normalization: long format is canonical; transformations must be explainable and reversible via metadata
- Presentation mode is core MVP behavior; PowerPoint export is not
- Minimal interaction is core MVP behavior; the default path should get from upload to a presentable first view with little or no setup
- Chart strategy is reuse first, generate second, and always stay within valid chart options for the data
- Chart selection is guided: users can choose only from chart types the data actually supports
- Search SLA: under 500 ms only for indexed preview search, not full raw-dataset scans
- Dark mode, sharing, and manual table editing are deferred past MVP

## Hosted MVP Contract

The supported first hosted MVP target is:

- one Render Web Service using the Docker runtime
- one public/internal URL at `https://<service-name>.onrender.com`
- FastAPI serving `/api/*`
- FastAPI serving the built frontend assets in hosted mode
- one persistent Render disk mounted at `/var/data/doc2dash-uploads`
- no app-level auth in the MVP; any user with the URL can use it unless an external company access layer is added

Required backend runtime settings:

- none for the baseline Render Docker deployment, because the image sets:
  - `DOC2DASH_FRONTEND_DIST_ROOT=/app/frontend-dist`
  - `DOC2DASH_UPLOADS_ROOT=/var/data/doc2dash-uploads`
  - `DOC2DASH_MAX_UPLOAD_SIZE_BYTES=31457280`
- `DOC2DASH_MAX_UPLOAD_SIZE_BYTES` remains an optional override if a team needs a different limit

For exact build, run, verification, persistence, and out-of-scope guidance, use:

- `docs/hosted-mvp.md`
- `apps/api/.env.hosted.example`

Local Docker smoke reminder:

- run `docker run --rm --name doc2dash-local -p 8000:10000 -v doc2dash_uploads:/var/data/doc2dash-uploads doc2dash-mvp`
- then open `http://localhost:8000/`
- do not browse to `http://0.0.0.0:10000/`; that is only the bind address inside the container

Local Docker with a temporary public URL:

- run `.\scripts\start-public-demo.ps1`
- this starts the app locally with Docker Compose and prints a public `trycloudflare.com` URL
- use `.\scripts\stop-public-demo.ps1` to stop the stack

## Current Delivery Status

- Browser-first upload entry: done
- Route-level processing and terminal UX: done
- Same-origin hosted app shape: done
- Hosted MVP deployment/runtime contract: done
