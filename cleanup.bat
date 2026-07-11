@echo off
setlocal enabledelayedexpansion

echo.
echo === Spectra Studio Cleanup ===
echo.
echo This will remove: node_modules, bun.lock
echo.
set /p confirm="Continue? (y/N): "
if /i not "!confirm!"=="y" (
    echo.
    echo [CANCELLED]
    timeout /t 1 >nul
    exit /b
)
echo.

if exist node_modules (
    rmdir /s /q "node_modules"
    echo [OK] node_modules removed
) else ( echo [--] node_modules not found )

if exist bun.lock (
    del /f /q "bun.lock"
    echo [OK] bun.lock removed
) else ( echo [--] bun.lock not found )

echo.
echo Done.
timeout /t 1 >nul
