@echo off
title BOPET EDA Platform - Dev

echo ============================================================
echo BOPET EDA Platform - One-Click Dev Start
echo ============================================================
echo.

if not exist node_modules (
    echo [INFO] node_modules not found. Running npm install...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo [INFO] launch.mjs will auto-create .env, init database, seed and start.
echo.

call npm run dev
pause
