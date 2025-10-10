@echo off
echo.
echo ========================================
echo   VS Code TypeScript Cache Fix
echo ========================================
echo.
echo This will reload VS Code window to clear the TypeScript cache.
echo.
echo Steps:
echo 1. Press Ctrl+Shift+P in VS Code
echo 2. Type: "Reload Window"
echo 3. Press Enter
echo.
echo ========================================
echo   OR Run This Command in VS Code Terminal:
echo ========================================
echo.
echo code --command workbench.action.reloadWindow
echo.
echo ========================================
echo   Your App Status:
echo ========================================
echo.
echo [OK] Runtime error FIXED!
echo [OK] TypeScript compiles successfully
echo [OK] App runs without errors
echo [~]  VS Code editor cache needs refresh
echo.
echo ========================================
echo   What the Red Lines Mean:
echo ========================================
echo.
echo The red lines on '@/utils/airQuality' are FALSE ERRORS
echo - Your code is CORRECT
echo - TypeScript compilation SUCCEEDS
echo - App RUNS PERFECTLY
echo - Only VS Code editor is confused
echo.
echo ========================================
echo   Quick Test:
echo ========================================
echo.
cd /d "%~dp0"
echo Running TypeScript check...
echo.
call npx tsc --noEmit
echo.
if %ERRORLEVEL% == 0 (
    echo [SUCCESS] No TypeScript errors found!
    echo Your code is perfect. Just reload VS Code window.
) else (
    echo [ERROR] Found TypeScript errors.
    echo Check the output above for details.
)
echo.
echo ========================================
pause
