# Bloom — Dev Server Launcher
# Starts the project using Docker Compose.

$Root = $PSScriptRoot

Write-Host ""
Write-Host "  Bloom Dev Launcher (Dockerized)" -ForegroundColor Cyan
Write-Host "  ===============================" -ForegroundColor Cyan
Write-Host ""

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
