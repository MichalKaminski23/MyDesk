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
    if command -v python3 >/dev/null 2>&1; then
        PYTHON_COMMAND=python3
    elif command -v python >/dev/null 2>&1; then
        PYTHON_COMMAND=python
    else
        printf '%s\n' 'Install Python 3.10+ and run this script again.' >&2
        exit 1
    fi
    printf '%s\n' 'Creating virtual environment...'
    "$PYTHON_COMMAND" -m venv .venv
    if [ -x .venv/bin/python ]; then
        PYTHON_PATH=.venv/bin/python
    else
        PYTHON_PATH=.venv/Scripts/python.exe
    fi
fi

printf '%s\n' 'Installing dependencies...'
"$PYTHON_PATH" -m pip install --disable-pip-version-check --no-input --quiet -r requirements-test.txt

printf '%s\n' 'Running tests...'
"$PYTHON_PATH" -m unittest discover -s tests -t . -v
