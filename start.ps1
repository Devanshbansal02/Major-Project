# Bloom: Dev Server Launcher
# Starts the project using Docker Compose.

$Root = $PSScriptRoot

Write-Host ""
Write-Host "  Bloom Dev Launcher (Dockerized)" -ForegroundColor Cyan
Write-Host "  ===============================" -ForegroundColor Cyan
Write-Host ""

# Install uv if not available
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "  uv not found. Installing uv..." -ForegroundColor Yellow
    irm https://astral.sh/uv/install.ps1 | iex
    $env:Path += ";$HOME\.cargo\bin"
}

Write-Host "  Downloading backend dependencies using uv..." -ForegroundColor Yellow
Set-Location -Path "$Root\backend"
if (-not (Test-Path ".venv")) {
    uv venv
}
uv sync

Write-Host "  Downloading frontend dependencies using npm..." -ForegroundColor Yellow
Set-Location -Path "$Root\frontend"
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm install
} else {
    Write-Host "  npm not found. Skipping frontend dependency installation." -ForegroundColor Red
}

Write-Host "  Checking initial config..." -ForegroundColor Yellow
Set-Location -Path $Root
if (-not (Test-Path ".env")) {
    Write-Host "  No .env file found. Creating a default .env file..." -ForegroundColor Yellow
    Set-Content -Path ".env" -Value "# Default environment variables`n"
}

Write-Host "  Starting Bloom stack via docker-compose..." -ForegroundColor Yellow

Set-Location -Path $Root
docker-compose up -d --build

Write-Host ""
Write-Host "  Stack started in background." -ForegroundColor Green
Write-Host "  Backend : http://localhost:8000" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "  To view logs, run: docker-compose logs -f" -ForegroundColor DarkGray
Write-Host "  To stop servers, run: docker-compose down" -ForegroundColor DarkGray
Write-Host ""
