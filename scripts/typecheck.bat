@echo off
echo.
echo === Typecheck ===
echo.
call bun run typecheck
if %errorlevel% neq 0 (
    echo.
    echo Typecheck found errors.
) else (
    echo.
    echo Typecheck clean.
)
pause
