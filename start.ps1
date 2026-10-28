$ErrorActionPreference = "Stop"

$venvPath = ".\.venv"
$pythonPath = "$venvPath\Scripts\python.exe"

if (-not (Test-Path $pythonPath)) {
    Write-Host "Creating virtual environment..."
    python -m venv $venvPath
}

if (-not (Test-Path ".\.env")) {
    if (-not (Test-Path ".\.env.example")) {
        throw "No .env.example found."
    }

    Copy-Item ".\.env.example" ".\.env"
    Write-Host "Created .env based on .env.example."
}

Write-Host "Installing dependencies..."
& $pythonPath -m pip install -r requirements.txt

Write-Host "Running application..."
& $pythonPath -m uvicorn app.main:app --reload
