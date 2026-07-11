@echo off
setlocal enabledelayedexpansion

echo.
echo === Spectra Studio - Production Build ===
echo.

echo --- Typecheck ---
call bun run typecheck
if !errorlevel! neq 0 (
    echo [FAIL] Typecheck - aborting
    pause
    exit /b 1
)

echo --- Lint ---
call bun run lint
if !errorlevel! neq 0 (
    echo [FAIL] Lint - aborting
    pause
    exit /b 1
)

echo --- Build ---
call bun run build
if !errorlevel! neq 0 (
    echo [FAIL] Build
    pause
    exit /b 1
)

echo.
echo === BUILD SUCCESSFUL ===
echo Output: dist/
echo.
pause
