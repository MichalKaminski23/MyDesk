#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

printf '%s\n' 'Running backend tests...'
sh "$SCRIPT_DIR/test-app.sh"

printf '%s\n' 'Running frontend tests...'
sh "$SCRIPT_DIR/test-frontend.sh"

printf '%s\n' 'All tests passed.'
