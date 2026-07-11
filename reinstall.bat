@echo off
setlocal enabledelayedexpansion

echo.
echo === Spectra Studio Reinstall ===
echo.
echo This will delete node_modules, dist, .vite, and bun.lock, then reinstall.
echo.
set /p confirm="Continue? (y/N): "
if /i not "!confirm!"=="y" (
  echo Cancelled.
  timeout /t 1 >nul
  exit /b 0
)

echo.
echo --- Removing node_modules ---
if exist node_modules (
  rmdir /s /q node_modules
  echo [OK] node_modules removed
) else ( echo [--] node_modules not found )

echo.
echo --- Removing dist ---
if exist dist (
  rmdir /s /q dist
  echo [OK] dist removed
) else ( echo [--] dist not found )

echo.
echo --- Removing .vite cache ---
if exist .vite (
  rmdir /s /q .vite
  echo [OK] .vite cache removed
) else ( echo [--] .vite cache not found )

echo.
echo --- Removing bun.lock ---
if exist bun.lock (
  del /f /q bun.lock
  echo [OK] bun.lock removed
) else ( echo [--] bun.lock not found )

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
echo Clean reinstall complete.
timeout /t 1 >nul
