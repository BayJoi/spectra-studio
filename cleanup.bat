@echo off
setlocal enabledelayedexpansion

echo.
echo === Spectra Studio Cleanup ===
echo.
echo This will remove: node_modules, dist, .vite, bun.lock
echo.
set /p confirm="Continue? (y/N): "
if /i not "!confirm!"=="y" (
    echo.
    echo [CANCELLED]
    timeout /t 1 >nul
    exit /b
)
echo.

del /f /s /q "node_modules\*" >nul 2>&1
rmdir /s /q "node_modules" >nul 2>&1
if !errorlevel! equ 0 ( echo [OK] node_modules removed ) else ( echo [--] node_modules not found )

del /f /s /q "dist\*" >nul 2>&1
rmdir /s /q "dist" >nul 2>&1
if !errorlevel! equ 0 ( echo [OK] dist removed ) else ( echo [--] dist not found )

del /f /s /q ".vite\*" >nul 2>&1
rmdir /s /q ".vite" >nul 2>&1
if !errorlevel! equ 0 ( echo [OK] .vite cache removed ) else ( echo [--] .vite cache not found )

del /f /q "bun.lock" >nul 2>&1
if !errorlevel! equ 0 ( echo [OK] bun.lock removed ) else ( echo [--] bun.lock not found )

echo.
echo Done.
timeout /t 1 >nul
