#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
set -a
# shellcheck disable=SC1091
source ./.env
set +a
BACKEND_PORT="${BACKEND_PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  echo "Missing .env. Copy .env.example and provide reviewed local values." >&2
  exit 1
fi
if [[ ! -d "$PROJECT_DIR/backend/node_modules" || ! -d "$PROJECT_DIR/frontend/node_modules" ]]; then
  echo "Dependencies are absent. Install them explicitly in backend and frontend; this launcher never changes dependencies." >&2
  exit 1
fi
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && { echo "Port $port is occupied; refusing to terminate another process" >&2; exit 1; }
done
node "$PROJECT_DIR/backend/src/runtimeBootstrap.js"

(
  cd "$PROJECT_DIR/backend"
  exec env BACKEND_PORT="$BACKEND_PORT" node src/index.js
) &
SERVER_PID=$!

(
  cd "$PROJECT_DIR/frontend"
  exec env PORT="$FRONTEND_PORT" BROWSER=none ./node_modules/.bin/react-scripts start
) &
CLIENT_PID=$!

cleanup() {
  kill "$SERVER_PID" "$CLIENT_PID" 2>/dev/null || true
  wait "$SERVER_PID" "$CLIENT_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait "$SERVER_PID" "$CLIENT_PID"
