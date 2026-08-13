@echo off
setlocal
cd /d "%~dp0"
set CSC_IDENTITY_AUTO_DISCOVERY=false

echo Building web client...
cd web
call npm run build
if errorlevel 1 exit /b 1
cd ..

echo Installing desktop dependencies (first run only)...
cd desktop
if not exist node_modules call npm install
if errorlevel 1 exit /b 1

echo Packaging portable exe...
call npm run dist
if errorlevel 1 exit /b 1

echo.
echo Done. Portable exe:
dir /b release\PlayerHistory-Admin.*.exe 2>nul
endlocal
