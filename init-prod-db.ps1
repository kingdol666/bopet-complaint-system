# Initialize production database script
$ErrorActionPreference = "Stop"

Write-Host "Initializing production database..." -ForegroundColor Green

# Create data directory if not exists
if (!(Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" | Out-Null
}

# Delete existing production database if exists
if (Test-Path "data\bopet.db") {
    Remove-Item "data\bopet.db" -Force
    Write-Host "Deleted existing production database" -ForegroundColor Yellow
}

# Set environment variable for production database
$env:DATABASE_URL = "file:./data/bopet.db"

Write-Host "Pushing schema to production database..." -ForegroundColor Cyan
npx prisma db push

Write-Host "Seeding production database..." -ForegroundColor Cyan
npx tsx prisma\seed.ts

Write-Host "Production database initialized successfully!" -ForegroundColor Green
