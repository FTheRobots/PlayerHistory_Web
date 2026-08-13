@echo off
cd /d "%~dp0web"
if not exist node_modules (
  echo Installing web client dependencies...
  call npm install
)
echo.
echo Player History Web Client
echo Point at your server on the login screen, or set VITE_API_BASE_URL in web/.env
echo Dev proxy targets http://localhost:3847 when no server URL is saved.
echo.
call npm run dev
