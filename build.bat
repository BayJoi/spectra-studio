@echo off
setlocal enabledelayedexpansion

echo.
echo === Spectra Studio Build ===
echo.

echo --- Build ---
call bun run build
if !errorlevel! equ 0 (
    echo.
    echo [SUCCESS] Build completed.
) else (
    echo.
    echo [FAILURE] Build failed with code !errorlevel!.
)

timeout /t 1 >nul
exit /b
