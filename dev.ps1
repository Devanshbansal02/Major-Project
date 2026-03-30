# Bloom — Dev Server Launcher
# Starts the FastAPI backend and Vite frontend in separate terminal windows.

$Root = $PSScriptRoot
$NodePath = "C:\Program Files\nodejs"
$GitPath = "C:\Program Files\Git\cmd"

# Add Node to PATH for this session if not already there
if ($env:PATH -notlike "*$NodePath*") {
    $env:PATH = "$NodePath;" + $env:PATH
}

Write-Host ""
Write-Host "  Bloom Dev Launcher" -ForegroundColor Cyan
Write-Host "  ==================" -ForegroundColor Cyan
Write-Host ""

# --- Backend ---
Write-Host "  Starting backend (FastAPI on http://localhost:8000)..." -ForegroundColor Yellow

$backendCmd = @"
cd /d "$Root"
echo Starting Bloom backend...
backend\.venv\Scripts\uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
pause
"@

Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $backendCmd -WindowStyle Normal

Start-Sleep -Seconds 2

# --- Frontend ---
Write-Host "  Starting frontend (Vite on http://localhost:5173)..." -ForegroundColor Yellow

$frontendCmd = @"
cd /d "$Root\frontend"
echo Starting Bloom frontend...
"$NodePath\npm.cmd" run dev
pause
"@

Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $frontendCmd -WindowStyle Normal

Write-Host ""
Write-Host "  Both servers starting in separate windows." -ForegroundColor Green
Write-Host "  Backend : http://localhost:8000" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "  Close the cmd windows to stop the servers." -ForegroundColor DarkGray
Write-Host ""
