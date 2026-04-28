@echo off
echo ============================================================
echo BOPET Complaint System - Production Mode
echo ============================================================
echo.

echo [1/2] Checking environment...
if not exist node_modules (
    echo [ERROR] Dependencies not found. Please run init.bat first.
    pause
    exit /b 1
) else (
    echo [OK] Dependencies found
)

if not exist .env.production (
    echo [ERROR] .env.production not found. Please run init.bat first.
    pause
    exit /b 1
) else (
    echo [OK] .env.production found
)

if not exist .output\server\index.mjs (
    echo [INFO] Production build not found. Building now...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Build failed. Please run init.bat for full initialization.
        pause
        exit /b 1
    )
    echo [OK] Build complete
) else (
    echo [OK] Production build found
)

if not exist data\bopet.db (
    echo [ERROR] Production database not found. Please run init.bat first.
    pause
    exit /b 1
) else (
    echo [OK] Production database found
)
echo.

echo [2/2] Starting production server...
echo ============================================================
echo Server URL: http://localhost:3000
echo Mode: Production
echo Database: %CD%\data\bopet.db
echo Press Ctrl+C to stop the server
echo ============================================================
echo.

REM Set production database absolute path
set DATABASE_URL=file:%CD%\data\bopet.db

call npm run start
