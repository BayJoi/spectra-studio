@echo off
echo.
echo === Spectra Studio - Dev Server ===
echo.
echo Starting Vite dev server...
echo.
call bun run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Dev server failed with code %errorlevel%.
    timeout /t 2 >nul
    exit /b %errorlevel%
)
