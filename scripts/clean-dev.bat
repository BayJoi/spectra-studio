@echo off
setlocal enabledelayedexpansion

echo.
echo === Spectra Studio - Clean Dev ===
echo.

echo --- Removing .vite cache ---
if exist .vite (
  rmdir /s /q .vite
  echo [OK] .vite cleared
) else ( echo [--] .vite not found )

echo.
echo --- Starting dev server ---
call bun run dev
