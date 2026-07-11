@echo off
setlocal enabledelayedexpansion

echo.
echo === Spectra Studio - Preview ===
echo.

echo --- Building ---
call bun run build
if !errorlevel! neq 0 (
    echo [FAIL] Build failed
    pause
    exit /b 1
)

echo.
echo --- Starting preview server ---
call bun run serve
