@echo off
setlocal enabledelayedexpansion

echo.
echo === Spectra Studio - Clean Install + Check ===
echo.

echo --- Removing old artifacts ---
if exist node_modules ( rmdir /s /q node_modules & echo [OK] node_modules removed ) else ( echo [--] node_modules not found )
if exist dist ( rmdir /s /q dist & echo [OK] dist removed ) else ( echo [--] dist not found )
if exist .vite ( rmdir /s /q .vite & echo [OK] .vite removed ) else ( echo [--] .vite not found )
if exist bun.lock ( del /f /q bun.lock & echo [OK] bun.lock removed ) else ( echo [--] bun.lock not found )

echo.
echo --- bun install ---
call bun install
if !errorlevel! neq 0 ( echo [FAIL] Install & pause & exit /b 1 )
echo [OK] Install

echo.
echo --- Typecheck ---
call bun run typecheck
if !errorlevel! neq 0 ( echo [FAIL] Typecheck & pause & exit /b 1 )
echo [PASS] Typecheck

echo.
echo --- Lint ---
call bun run lint
if !errorlevel! neq 0 ( echo [FAIL] Lint & pause & exit /b 1 )
echo [PASS] Lint

echo.
echo --- Build ---
call bun run build
if !errorlevel! neq 0 ( echo [FAIL] Build & pause & exit /b 1 )
echo [PASS] Build

echo.
echo === ALL PASSED ===
pause
