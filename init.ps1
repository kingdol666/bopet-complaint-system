# BOPET Complaint System - One-Click Initialization (PowerShell)
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "BOPET Complaint System - One-Click Initialization" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# [1/7] Check Node.js
Write-Host "[1/7] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found. Please install Node.js (v18+ recommended)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# [2/7] Install dependencies
Write-Host "[2/7] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Dependencies installation failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Dependencies installed" -ForegroundColor Green
Write-Host ""

# [3/7] Check config files
Write-Host "[3/7] Checking config files..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "[INFO] .env not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "[OK] .env created" -ForegroundColor Green
} else {
    Write-Host "[OK] .env found" -ForegroundColor Green
}

if (-not (Test-Path ".env.production")) {
    Write-Host "[INFO] .env.production not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env.production"
    Write-Host "[OK] .env.production created" -ForegroundColor Green
} else {
    Write-Host "[OK] .env.production found" -ForegroundColor Green
}
Write-Host ""

# [4/7] Initialize development database
Write-Host "[4/7] Initializing development database..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Prisma Client generation failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Development database schema sync failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

npm run db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Development database seed failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Development database initialized" -ForegroundColor Green
Write-Host ""

# [5/7] Initialize production database
Write-Host "[5/7] Initializing production database..." -ForegroundColor Yellow
if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" | Out-Null
}

$env:DATABASE_URL = "file:$PWD\data\bopet.db"

npx prisma db push --force-reset
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Production database schema sync failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

npx tsx prisma\seed.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Production database seed failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$env:DATABASE_URL = $null
Write-Host "[OK] Production database initialized" -ForegroundColor Green
Write-Host ""

# [6/7] Build production version
Write-Host "[6/7] Building production version..." -ForegroundColor Yellow
$env:DATABASE_URL = "file:$PWD\data\bopet.db"
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Prisma Client generation failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Production build complete" -ForegroundColor Green
Write-Host ""

# [7/7] Restore development configuration
Write-Host "[7/7] Restoring development configuration..." -ForegroundColor Yellow
$env:DATABASE_URL = "file:$PWD\prisma\data\bopet.db"
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] Development Prisma Client restore failed, but it will not affect usage" -ForegroundColor Yellow
}
$env:DATABASE_URL = $null
Write-Host "[OK] Development configuration restored" -ForegroundColor Green
Write-Host ""

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Initialization Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database files:" -ForegroundColor White
Write-Host "  Development: prisma\data\bopet.db" -ForegroundColor Gray
Write-Host "  Production:  data\bopet.db" -ForegroundColor Gray
Write-Host ""
Write-Host "Start commands:" -ForegroundColor White
Write-Host "  start.bat    - Production mode (recommended)" -ForegroundColor Gray
Write-Host "  dev.bat      - Development mode (with hot reload)" -ForegroundColor Gray
Write-Host "  npm run dev  - Development mode" -ForegroundColor Gray
Write-Host "  npm run start - Production mode" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
