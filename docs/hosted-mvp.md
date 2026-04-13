# Hosted MVP Runbook

## Purpose

This document defines the concrete first deployment contract for running `doc2dash` as a real internal hosted MVP.

The goal is not to automate infrastructure. The goal is to make the current hosted webapp runnable by another internal team without guesswork.

## Concrete First Deployment Target

The first hosted MVP target is:

- one Render Web Service
- Docker runtime
- service name `doc2dash-mvp`
- public URL format `https://<service-name>.onrender.com`
- FastAPI serving `/api/*`
- FastAPI serving the built frontend assets in hosted mode
- browser routes such as `/` and `/uploads/{uploadId}` resolving through the frontend SPA
- one persistent Render disk mounted at `/var/data/doc2dash-uploads`
- no app-level auth in the MVP
- an existing company access layer in front of the app only if restricted access is required outside the app itself

This is the official product path for MVP. Local split-process development remains a developer workflow, not the hosted product definition.

## What Must Exist

The hosted MVP needs all of the following:

1. A Render Web Service connected to the `doc2dash` repository
2. A repo-root `Dockerfile` that builds the frontend and starts FastAPI
3. A persistent Render disk mounted at `/var/data/doc2dash-uploads`
4. One public/internal URL that routes browser and API traffic to the same FastAPI app
5. If access restriction is needed, an existing company gateway or trusted internal network boundary

If upload bundles are stored on ephemeral disk, the MVP is not truly usable because generated dashboards may disappear after restarts or redeploys.

## Runtime Configuration Contract

Backend settings are still read from environment variables with the `DOC2DASH_` prefix, but the recommended Render Docker image sets the hosted defaults directly.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DOC2DASH_FRONTEND_DIST_ROOT` | No for the recommended Render deployment | `/app/frontend-dist` | Path to the built frontend `dist` directory that contains `index.html` and `assets/` |
| `DOC2DASH_UPLOADS_ROOT` | No for the recommended Render deployment | `/var/data/doc2dash-uploads` | Persistent directory where uploaded source files, manifests, previews, tables, and runtime metadata are stored |
| `DOC2DASH_MAX_UPLOAD_SIZE_BYTES` | No | `31457280` | Upload size limit in bytes; default is 30 MB |

Reference example: [apps/api/.env.hosted.example](C:/Users/emili/Desktop/Projets/doc2dash/apps/api/.env.hosted.example)

Important notes:

- `DOC2DASH_FRONTEND_DIST_ROOT` should point at the built frontend output, not the source directory.
- `DOC2DASH_UPLOADS_ROOT` must point at persistent storage in hosted environments, and the Render disk mount path should match it exactly.
- The project does not currently auto-manage retention or cleanup policy for hosted uploads. Teams must choose a persistent location intentionally.

## Hosted Routing Behavior

With hosted mode enabled:

- `/` returns the frontend app entry
- `/uploads/{uploadId}` resolves through SPA fallback
- `/assets/*` serves built frontend assets
- `/api/*` continues to hit FastAPI directly
- unknown `/api/*` paths return API JSON 404 responses, not the frontend fallback

This behavior is implemented in `apps/api/app/main.py` and covered by backend integration tests.

## Exact Deploy Contract

### Platform and service shape

- Platform: Render
- Service type: Web Service
- Runtime: Docker
- Service name: `doc2dash-mvp`
- Dockerfile path: `Dockerfile`
- Instance type: `Starter`
- Persistent disk: `10 GB`, mounted at `/var/data/doc2dash-uploads`
- Public URL format: `https://doc2dash-mvp.onrender.com`

### Exact build steps

Render builds the image directly from the repo-root `Dockerfile`.

Equivalent local build command:

```powershell
Set-Location C:\Users\emili\Desktop\Projets\doc2dash
docker build -t doc2dash-mvp .
```

### Exact local Docker smoke command

Use this command for the local hosted-like smoke test:

```powershell
Set-Location C:\Users\emili\Desktop\Projets\doc2dash
docker run --rm --name doc2dash-local -p 8000:10000 -v doc2dash_uploads:/var/data/doc2dash-uploads doc2dash-mvp
```

Then open:

```text
http://localhost:8000/
```

Important:

- `0.0.0.0:10000` is the container bind address from the server log, not the browser URL.
- `http://localhost:8000/` only works when the host port is mapped to the container port with `-p 8000:10000`.
- If someone uses `-p 8000:8000`, the container can still be healthy while the browser sees an empty-response or connection-closed failure because nothing is listening on container port `8000`.

### Exact startup command

The container starts FastAPI with the Dockerfile `CMD`:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}
```

### Exact required environment variables

For the recommended Render deployment: none.

The Docker image already sets:

- `DOC2DASH_FRONTEND_DIST_ROOT=/app/frontend-dist`
- `DOC2DASH_UPLOADS_ROOT=/var/data/doc2dash-uploads`
- `DOC2DASH_MAX_UPLOAD_SIZE_BYTES=31457280`

Optional override:

- `DOC2DASH_MAX_UPLOAD_SIZE_BYTES` if a team intentionally wants a different limit

### Exact storage requirement

- Attach one persistent Render disk
- Mount it at `/var/data/doc2dash-uploads`
- Keep the service at a single instance because Render persistent disks are single-service and single-instance

### Exact deploy steps on Render

1. Push the repo with the root `Dockerfile`.
2. In the Render Dashboard, create a new Web Service from the repo.
3. Set `Language` to `Docker`.
4. Keep `Dockerfile Path` as `Dockerfile`.
5. Set the service name to `doc2dash-mvp`.
6. Choose the `Starter` instance type.
7. Under `Advanced`, add a persistent disk:
   - mount path: `/var/data/doc2dash-uploads`
   - size: `10 GB`
8. Leave `Docker Command` empty so Render uses the Dockerfile `CMD`.
9. Deploy the service.
10. Use the actual Render service name to determine the public URL:
    - if the service is `doc2dash-mvp`, the URL is `https://doc2dash-mvp.onrender.com`
    - otherwise use `https://<your-service-name>.onrender.com`

### Exact hosted verification checklist after deploy

1. Open `https://<service-name>.onrender.com/`.
   - Expected: the upload landing page loads from the same origin as `/api/*`.
2. Upload a valid `.xlsx` or `.csv` file smaller than 30 MB.
   - Expected: upload succeeds and the browser transitions to `/uploads/{uploadId}`.
3. Wait for processing.
   - Expected: the route shows the processing handoff, then resolves to the dashboard when ready.
4. Reload `/uploads/{uploadId}`.
   - Expected: SPA fallback returns the app shell and the dashboard route still works.
5. Request `https://<service-name>.onrender.com/api/does-not-exist`.
   - Expected: HTTP `404` with JSON, not frontend HTML.
6. Restart or redeploy the service, then reopen the same `/uploads/{uploadId}` route.
   - Expected: the dashboard still works because the upload bundle is stored on the persistent disk.

## If Render Returns Plain "Not Found"

If the public URL returns plain-text `Not Found` and the response includes `x-render-routing: no-server`, the request is not reaching the FastAPI app yet.

Check these items first in Render:

1. the URL matches the actual service name
2. the service type is `Web Service`
3. the runtime is `Docker`
4. the latest deploy is live and healthy
5. the repo-root `Dockerfile` is the one Render built
6. no custom start command is overriding the Dockerfile `CMD`
7. service logs include `Uvicorn running on http://0.0.0.0:<PORT>`

This symptom points to Render service/deploy configuration before it points to an application bug.

## Persistent Storage Expectations

`DOC2DASH_UPLOADS_ROOT` stores:

- uploaded source files
- workbook manifests
- runtime metadata
- normalized table artifacts
- preview artifacts
- logs related to failures and cancellation

For a real hosted MVP:

- this directory must survive process restarts
- this directory should live on the Render persistent disk mounted at `/var/data/doc2dash-uploads`
- local temp folders, container scratch space, or other ephemeral paths are not acceptable for real hosted use

## Out Of Scope After 4.4

Even after this story, the MVP remains intentionally limited.

Still out of scope:

- app-level authentication and user accounts
- infrastructure automation such as CI/CD, Terraform, Helm, or container orchestration
- object storage migration
- queue/worker migration for background processing
- enterprise-grade retention, audit, observability, and security hardening
- hosted-path browser E2E automation

## Practical MVP Statement

Finishing story `4.4` is enough to call `doc2dash` a usable hosted MVP for internal users if the hosting environment provides:

- one reachable internal/public URL such as `https://<service-name>.onrender.com`
- persistent filesystem storage for upload bundles through the Render disk mount at `/var/data/doc2dash-uploads`
- an existing company access layer if public reachability must be restricted

It is not enough to call the product enterprise-complete.
