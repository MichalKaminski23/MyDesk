#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$PROJECT_DIR"

if [ -x .venv/bin/python ]; then
    PYTHON_PATH=.venv/bin/python
elif [ -x .venv/Scripts/python.exe ]; then
    PYTHON_PATH=.venv/Scripts/python.exe
else
    printf '%s\n' 'Run start-app.sh first to create .venv.' >&2
    exit 1
fi

"$PYTHON_PATH" -m pip install -r requirements-test.txt
"$PYTHON_PATH" -m unittest discover -s tests -t . -v
