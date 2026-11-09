#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

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

if [ ! -f .env ]; then
    cp .env.example .env
    printf '%s\n' 'Created .env based on .env.example.'
fi

printf '%s\n' 'Installing dependencies...'
"$PYTHON_PATH" -m pip install -r requirements.txt

printf '%s\n' 'Running application...'
exec "$PYTHON_PATH" -m uvicorn app.main:app --reload
