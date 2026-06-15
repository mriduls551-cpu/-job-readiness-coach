@echo off
REM ============================================================
REM  Save changes to GitHub
REM  Double-click this whenever you want to push your latest
REM  changes up to your GitHub repo.
REM ============================================================

cd /d "%~dp0"

echo.
echo  This will save all your current changes to GitHub.
echo.
git status --short
echo.
set /p msg="In a few words, what did you change? "

if "%msg%"=="" set msg=Update project

echo.
echo  Saving...
echo.

git add -A
git diff --cached --quiet
if %errorlevel%==0 (
  echo  No new changes to commit.
  echo.
  pause
  exit /b 0
)

git commit -m "%msg%"
if %errorlevel% neq 0 (
  echo.
  echo  Commit did not complete. Please review the message above.
  echo.
  pause
  exit /b 1
)

git push
if %errorlevel% neq 0 (
  echo.
  echo  Push did not complete. Please review the message above.
  echo.
  pause
  exit /b 1
)

echo.
echo  Done. If you see errors above (red text), copy them and ask Claude.
echo.
pause
