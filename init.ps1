# BOPET EDA Platform - One-Click Initialization (PowerShell)
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "BOPET EDA Platform - One-Click Initialization" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# [1/5] Check Node.js
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found. Please install Node.js (v18+ recommended)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# [2/5] Install dependencies
Write-Host "[2/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Dependencies installation failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Dependencies installed" -ForegroundColor Green
Write-Host ""

# [3/5] Check config files
Write-Host "[3/5] Checking config files..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "[INFO] .env not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "[OK] .env created" -ForegroundColor Green
} else {
    Write-Host "[OK] .env found" -ForegroundColor Green
}
Write-Host ""

# [4/5] Initialize database
Write-Host "[4/5] Initializing database..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Prisma Client generation failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Database schema sync failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

npm run db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Database seed failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Database initialized" -ForegroundColor Green
Write-Host ""

# [5/5] Build production version
Write-Host "[5/5] Building production version..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Production build complete" -ForegroundColor Green
Write-Host ""

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Initialization Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database: prisma\data\data.db" -ForegroundColor Gray
Write-Host ""
Write-Host "Start commands:" -ForegroundColor White
Write-Host "  start.bat    - Production mode (recommended)" -ForegroundColor Gray
Write-Host "  dev.bat      - Development mode (with hot reload)" -ForegroundColor Gray
Write-Host "  npm run dev  - Development mode" -ForegroundColor Gray
Write-Host "  npm run start - Production mode" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
