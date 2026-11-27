@echo off
rem Open a separate Chrome just for Tennis World, with a local-only debug port
rem so WorkBuddy can add courts to the cart. Your everyday Chrome is untouched.
rem Close this Chrome window when done: the port closes with it.
set "PROFILE=C:\TennisWorldChrome"
set "URL=https://www.tennisworldonline.com.au/bookacourt/"

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" (echo Chrome not found. & pause & exit /b 1)

rem No --remote-debugging-address: Chrome then listens on 127.0.0.1 only.
start "" "%CHROME%" --remote-debugging-port=9222 --user-data-dir="%PROFILE%" --no-first-run --no-default-browser-check "%URL%"
