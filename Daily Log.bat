@echo off
setlocal

set "APP_DIR=%~dp0"
set "APP_URL=http://localhost:3000"
set "HEALTH_URL=http://localhost:3000/api/health"

cd /d "%APP_DIR%"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js first, then run this launcher again.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)

if not exist "%APP_DIR%node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing '%HEALTH_URL%' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 (
  start "" "%APP_URL%"
  echo Daily Log is already running at %APP_URL%
  pause
  exit /b 0
)

echo Starting Daily Log...
start "" "%APP_URL%"
echo Keep this window open while using Daily Log.
echo Close this window to stop the local service.
echo.
call npm start

endlocal
