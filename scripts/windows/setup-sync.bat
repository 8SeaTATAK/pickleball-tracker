@echo off
rem One-time setup: clone the tracker to %USERPROFILE%\pickleball-tracker and
rem sync it from GitHub every 30 minutes in the background.
set "REPO=%USERPROFILE%\pickleball-tracker"
set "VBS=%USERPROFILE%\pickleball-sync.vbs"

where git >nul 2>nul || (echo Git not found. Install it from https://git-scm.com/download/win and run this again. & pause & exit /b 1)

if not exist "%REPO%\.git" (
  echo Cloning into %REPO% ...
  git clone https://github.com/8SeaTATAK/pickleball-tracker.git "%REPO%" || (pause & exit /b 1)
)

rem Small VBScript wrapper so the scheduled sync runs without flashing a window.
> "%VBS%" echo Set sh = CreateObject("WScript.Shell")
>>"%VBS%" echo sh.Run "git -C ""%REPO%"" pull -q origin main", 0, True

schtasks /create /f /tn "Pickleball Sync" /sc minute /mo 30 /tr "wscript.exe \"%VBS%\"" || (pause & exit /b 1)

echo.
echo Done. Local copy: %REPO%
echo It now syncs from GitHub every 30 minutes.
echo To stop syncing later:  schtasks /delete /tn "Pickleball Sync" /f
pause
