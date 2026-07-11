@echo off
setlocal enabledelayedexpansion

echo.
echo === Spectra Studio - Full Check ===
echo.

set failed=0

echo --- Typecheck ---
call bun run typecheck
if !errorlevel! neq 0 ( set failed=1 & echo [FAIL] Typecheck ) else ( echo [PASS] Typecheck )

echo.
echo --- Lint ---
call bun run lint
if !errorlevel! neq 0 ( set failed=1 & echo [FAIL] Lint ) else ( echo [PASS] Lint )

echo.
echo --- Build ---
call bun run build
if !errorlevel! neq 0 ( set failed=1 & echo [FAIL] Build ) else ( echo [PASS] Build )

echo.
if !failed! equ 0 (
    echo === ALL CHECKS PASSED ===
) else (
    echo === SOME CHECKS FAILED ===
)
echo.
pause
