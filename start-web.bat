@echo off
setlocal

rem Player History — build web UI and serve production bundle locally

cd /d "%~dp0web"

echo.
echo  Player History Web UI (preview)
echo  -----------------------------
echo  Building...
echo.

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 goto :failed
)

call npm run build
if errorlevel 1 goto :failed

echo.
echo  UI:    http://localhost:4173
echo  API:   http://127.0.0.1:3847  (PlayerHistory_Server must be running)
echo.
echo  Tip: use start-client.bat for hot-reload dev instead.
echo.
echo Starting preview server...
echo Press Ctrl+C to stop.
echo.

call npm run preview
goto :end

:failed
echo.
echo Web UI failed to start.
pause
exit /b 1

:end
endlocal
