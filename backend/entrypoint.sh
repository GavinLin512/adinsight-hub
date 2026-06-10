#!/usr/bin/env bash
set -e

# R2:先套用 schema migration(此時 db 已 healthy),再啟動 API
echo "[entrypoint] Running alembic migrations..."
alembic upgrade head

echo "[entrypoint] Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
