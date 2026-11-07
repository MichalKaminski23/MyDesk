#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR/frontend"

if ! command -v npm >/dev/null 2>&1; then
    printf '%s\n' 'Install Node.js 22.12+ (with npm), then run this script again.' >&2
    exit 1
fi

if [ ! -d node_modules ]; then
    npm ci
fi

exec npm run dev
