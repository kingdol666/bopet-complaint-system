@echo off
echo ============================================================
echo BOPET Complaint System - Development Mode
echo ============================================================
echo.

echo [1/2] Checking environment...
if not exist node_modules (
    echo [INFO] Dependencies not found. Installing...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Dependencies installation failed. Please run init.bat first.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies found
)

if not exist .env (
    echo [INFO] .env not found. Creating from .env.example...
    copy .env.example .env >nul
    echo [OK] .env created
) else (
    echo [OK] .env found
)

if not exist prisma\data\bopet.db (
    echo [INFO] Database not found. Initializing...
    call npm run db:generate
    call npm run db:push
    call npm run db:seed
    if %errorlevel% neq 0 (
        echo [ERROR] Database initialization failed. Please run init.bat first.
        pause
        exit /b 1
    )
    echo [OK] Database initialized
) else (
    echo [OK] Database found
)
echo.

echo [2/2] Starting development server...
echo ============================================================
echo Server URL: http://localhost:3000
echo Mode: Development (with hot reload)
echo Press Ctrl+C to stop the server
echo ============================================================
echo.

call npm run dev
