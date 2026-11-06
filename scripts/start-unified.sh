#!/bin/sh
set -e

echo "=========================================================="
echo " Starting ExamDuty AI — Full-Stack Container Service"
echo "=========================================================="

PUBLIC_PORT="${PORT:-3000}"
INTERNAL_API_PORT="${BACKEND_PORT:-8000}"

echo "[1/2] Launching FastAPI Backend on internal port ${INTERNAL_API_PORT}..."
cd /app/backend
uvicorn app.main:app --host 0.0.0.0 --port "${INTERNAL_API_PORT}" &
BACKEND_PID=$!

# Wait briefly for backend to initialize
sleep 2

echo "[2/2] Launching Next.js Frontend on public port ${PUBLIC_PORT}..."
cd /app/frontend
export INTERNAL_BACKEND_URL="http://127.0.0.1:${INTERNAL_API_PORT}"
npm run start -- -p "${PUBLIC_PORT}" &
FRONTEND_PID=$!

# Graceful shutdown handler
trap "kill -TERM $BACKEND_PID $FRONTEND_PID" INT TERM EXIT

# Wait for any process to exit
wait -n $BACKEND_PID $FRONTEND_PID
