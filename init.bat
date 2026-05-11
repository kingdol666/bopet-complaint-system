@echo off
echo ============================================================
echo BOPET EDA Platform - One-Click Initialization
echo ============================================================
echo.

echo [1/5] Checking Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js (v18+ recommended)
    pause
    exit /b 1
)
echo [OK] Node.js found:
node -v
echo.

echo [2/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Dependencies installation failed
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

echo [3/5] Checking config files...
if not exist .env (
    echo [INFO] .env not found. Creating from .env.example...
    copy .env.example .env >nul
    echo [OK] .env created
) else (
    echo [OK] .env found
)
echo.

echo [4/5] Initializing database...
call npm run db:generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma Client generation failed
    pause
    exit /b 1
)

call npm run db:push
if %errorlevel% neq 0 (
    echo [ERROR] Database schema sync failed
    pause
    exit /b 1
)

call npm run db:seed
if %errorlevel% neq 0 (
    echo [ERROR] Database seed failed
    pause
    exit /b 1
)
echo [OK] Database initialized
echo.

echo [5/5] Building production version...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma Client generation failed
    pause
    exit /b 1
)

call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [OK] Production build complete
echo.

echo ============================================================
echo Initialization Complete!
echo ============================================================
echo.
echo Database: prisma\data\data.db
echo.
echo Start commands:
echo   start.bat    - Production mode (recommended)
echo   dev.bat      - Development mode (with hot reload)
echo   npm run dev  - Development mode
echo   npm run start - Production mode
echo.
pause
