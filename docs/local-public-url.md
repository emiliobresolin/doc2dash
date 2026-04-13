# Local Docker With A Public URL

This is the fastest free path to keep `doc2dash` running on your own machine in Docker while exposing it through a temporary public URL for demos.

## What This Does

- runs the app locally in Docker
- keeps the normal browser-first flow intact
- exposes the local app through a Cloudflare Quick Tunnel
- gives you a public `trycloudflare.com` URL

## Important Limitation

- the public URL is temporary and may change every time you restart the tunnel
- the app still depends on your machine and Docker Desktop staying on while others use the URL

## Start

From the repo root:

```powershell
.\scripts\start-public-demo.ps1
```

Default local URL:

```text
http://localhost:8011/
```

If you need a different local port:

```powershell
.\scripts\start-public-demo.ps1 -LocalPort 8020
```

## Stop

```powershell
.\scripts\stop-public-demo.ps1
```

## Manual Checks

1. Open the local URL and confirm the upload page loads.
2. Use the public URL printed by the start script and confirm the same page loads outside your local browser session.
3. Upload a workbook smaller than 30 MB.
4. Confirm the app transitions to `/uploads/{uploadId}` and eventually shows the dashboard.
5. Reload the `/uploads/{uploadId}` route.
6. Confirm API precedence:

```powershell
curl.exe -i http://localhost:8011/api/does-not-exist
```

Expected:

- HTTP `404`
- `application/json`
- body similar to `{"detail":"Not Found"}`
