@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Zum Starten wird Node.js benoetigt: https://nodejs.org/
  pause
  exit /b 1
)
echo Recipe Assistant startet. Zum Beenden dieses Fenster schliessen.
node server.mjs --open
pause
