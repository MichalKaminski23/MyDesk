#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

sh "$SCRIPT_DIR/start-app.sh" &
BACKEND_PID=$!

cleanup() {
    kill "$BACKEND_PID" 2>/dev/null || true
    if [ -n "${FRONTEND_PID:-}" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
}

trap cleanup INT TERM EXIT

printf '%s\n' 'Waiting for backend...'
backend_ready=false
for _ in $(seq 1 60); do
    if curl --fail --silent http://127.0.0.1:8000/health >/dev/null 2>&1; then
        backend_ready=true
        break
    fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        printf '%s\n' 'Backend stopped before becoming ready.' >&2
        exit 1
    fi
    sleep 1
done

if [ "$backend_ready" != true ]; then
    printf '%s\n' 'Backend did not become ready within 60 seconds.' >&2
    exit 1
fi

printf '%s\n' 'Backend is ready. Starting frontend...'
sh "$SCRIPT_DIR/start-frontend.sh" &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"
