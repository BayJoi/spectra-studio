@echo off
setlocal enabledelayedexpansion

echo.
echo === Spectra Studio - Bundle Analysis ===
echo.

call bun run build
if !errorlevel! neq 0 (
    echo Build failed.
    pause
    exit /b 1
)

echo.
echo --- Bundle sizes ---
echo.
powershell -Command "Get-ChildItem -Path 'dist\assets' -File | Sort-Object Length -Descending | ForEach-Object { $kb = [math]::Round($_.Length / 1KB, 1); Write-Host ('{0,8} KB  {1}' -f $kb, $_.Name) }"
echo.
powershell -Command "$total = (Get-ChildItem -Path 'dist\assets' -File | Measure-Object -Property Length -Sum).Sum; $kb = [math]::Round($total / 1KB, 1); Write-Host ('Total: {0} KB' -f $kb)"
echo.
pause
