@echo off
setlocal
set "ROOT=%~dp0"

echo.
echo Applying GIWA Forecast frontend hotfix...
copy /Y "%ROOT%hotfix\src\lib\markets.ts" "%ROOT%frontend\src\lib\markets.ts" >nul
if errorlevel 1 goto :copyfail
copy /Y "%ROOT%hotfix\src\pages\Pages.tsx" "%ROOT%frontend\src\pages\Pages.tsx" >nul
if errorlevel 1 goto :copyfail

echo.
echo Hotfix applied successfully.
echo.
echo Next:
echo 1. Stop the old frontend terminal with Ctrl+C.
echo 2. Run: cd /d "%ROOT%frontend"
echo 3. Run: npm run dev
echo 4. Open: http://localhost:5173/terminal
pause
exit /b 0

:copyfail
echo.
echo ERROR: This file must be extracted directly into the giwa-forecast project root.
echo Expected folders next to this file: frontend and hotfix.
pause
exit /b 1
