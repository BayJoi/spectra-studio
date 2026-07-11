@echo off
echo.
echo === Spectra Studio - Dev Server ===
echo.
call bun run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Dev server failed.
    pause
    exit /b %errorlevel%
)
