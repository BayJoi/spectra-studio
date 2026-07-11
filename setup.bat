@echo off
setlocal enabledelayedexpansion

echo.
echo === Spectra Studio Setup ===
echo.

if exist node_modules (
  echo node_modules already exists.
  set /p confirm="Reinstall anyway? (y/N): "
  if /i not "!confirm!"=="y" (
    echo.
    echo Done.
    timeout /t 1 >nul
    exit /b 0
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

echo.
echo Done.
timeout /t 1 >nul
