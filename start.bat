@echo off
title BOPET EDA Platform - Production

echo ============================================================
echo BOPET EDA Platform - One-Click Production Start
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

echo [INFO] launch.mjs will auto-create .env.production, init database,
echo        auto-build if needed, and start on 0.0.0.0 (configurable port).
echo.

call npm run start
pause
