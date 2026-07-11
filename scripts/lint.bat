@echo off
echo.
echo === Lint ===
echo.
call bun run lint
if %errorlevel% neq 0 (
    echo.
    echo Lint found errors.
) else (
    echo.
    echo Lint clean.
)
pause
