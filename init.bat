@echo off
echo ============================================================
echo BOPET Complaint System - One-Click Initialization
echo ============================================================
echo.

echo [1/7] Checking Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js (v18+ recommended)
    pause
    exit /b 1
)
echo [OK] Node.js found:
node -v
echo.

echo [2/7] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Dependencies installation failed
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

echo [3/7] Checking config files...
if not exist .env (
    echo [INFO] .env not found. Creating from .env.example...
    copy .env.example .env >nul
    echo [OK] .env created
) else (
    echo [OK] .env found
)

if not exist .env.production (
    echo [INFO] .env.production not found. Creating from .env.example...
    copy .env.example .env.production >nul
    echo [OK] .env.production created
) else (
    echo [OK] .env.production found
)
echo.

echo [4/7] Initializing development database...
call npm run db:generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma Client generation failed
    pause
    exit /b 1
)

call npm run db:push
if %errorlevel% neq 0 (
    echo [ERROR] Development database schema sync failed
    pause
    exit /b 1
)

call npm run db:seed
if %errorlevel% neq 0 (
    echo [ERROR] Development database seed failed
    pause
    exit /b 1
)
echo [OK] Development database initialized
echo.

echo [5/7] Initializing production database...
if not exist data mkdir data

REM Use absolute path for production database
set DATABASE_URL=file:%CD%\data\bopet.db

call npx prisma db push --force-reset
if %errorlevel% neq 0 (
    echo [ERROR] Production database schema sync failed
    pause
    exit /b 1
)

call npx tsx prisma\seed.ts
if %errorlevel% neq 0 (
    echo [ERROR] Production database seed failed
    pause
    exit /b 1
)

REM Clear temporary environment variable
set DATABASE_URL=
echo [OK] Production database initialized
echo.

echo [6/7] Building production version...
echo Using production database path for build...
set DATABASE_URL=file:%CD%\data\bopet.db
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

echo [7/7] Restoring development configuration...
REM Restore development Prisma Client
set DATABASE_URL=file:%CD%\prisma\data\bopet.db
call npx prisma generate
if %errorlevel% neq 0 (
    echo [WARN] Development Prisma Client restore failed, but it will not affect usage
)
set DATABASE_URL=
echo [OK] Development configuration restored
echo.

echo ============================================================
echo Initialization Complete!
echo ============================================================
echo.
echo Database files:
echo   Development: prisma\data\bopet.db
echo   Production:  data\bopet.db
echo.
echo Start commands:
echo   start.bat    - Production mode (recommended)
echo   dev.bat      - Development mode (with hot reload)
echo   npm run dev  - Development mode
echo   npm run start - Production mode
echo.
pause
