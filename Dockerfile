FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /app/apps/web

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

COPY apps/web/ ./
RUN npm run build

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DOC2DASH_FRONTEND_DIST_ROOT=/app/frontend-dist \
    DOC2DASH_UPLOADS_ROOT=/var/data/doc2dash-uploads \
    DOC2DASH_MAX_UPLOAD_SIZE_BYTES=31457280

WORKDIR /app

COPY apps/api/ /app/apps/api/
RUN python -m pip install --upgrade pip \
    && python -m pip install /app/apps/api

COPY --from=frontend-builder /app/apps/web/dist /app/frontend-dist

EXPOSE 10000

CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
