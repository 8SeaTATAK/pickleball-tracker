@echo off
rem Sync once, then serve the local copy at http://localhost:8000.
rem Close this window to stop the page.
cd /d "%USERPROFILE%\pickleball-tracker" || (echo Run setup-sync.bat first. & pause & exit /b 1)
git pull -q origin main
set "PY=python"
where python >nul 2>nul || set "PY=py"
start "" http://localhost:8000
%PY% -m http.server 8000
if errorlevel 1 (echo Python not found. Install it from https://www.python.org/downloads/ & pause)
