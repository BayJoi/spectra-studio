@echo off
setlocal enabledelayedexpansion

echo.
echo === Spectra Studio Setup ===
echo.

if exist node_modules (
  echo node_modules already exists.
  set /p confirm="Reinstall anyway? (y/N): "
  if /i not "!confirm!"=="y" (
    goto :build
  )
)

echo.
echo --- bun install ---
call bun install
if !errorlevel! neq 0 (
    echo [FAILED] bun install
    timeout /t 2 >nul
    exit /b !errorlevel!
)
echo [OK] Install complete

:build
echo.
echo --- Build ---
call bun run build
if !errorlevel! neq 0 (
    echo [FAILED] Build
    timeout /t 2 >nul
    exit /b !errorlevel!
)
echo [OK] Build passed

echo.
echo All done.
timeout /t 1 >nul
