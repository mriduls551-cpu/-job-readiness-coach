@echo off
REM ============================================================
REM  Job Readiness Coach - local dev launcher
REM  Double-click this file to run the app at http://localhost:3000
REM ============================================================

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed. Install the LTS version from:
  echo  https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo.
  echo  First-time setup: installing dependencies. This can take a few minutes...
  echo.
  call npm install
)

echo.
echo  Starting Job Readiness Coach...
echo  When you see "Ready", open this in your browser:
echo.
echo      http://localhost:3000
echo.
echo  Leave this window open while you use the app.
echo  Press Ctrl+C in this window to stop the server.
echo.

call npm run dev
pause
