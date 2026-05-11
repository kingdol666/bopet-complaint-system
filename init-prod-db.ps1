# Initialize production database script
$ErrorActionPreference = "Stop"

Write-Host "Initializing production database..." -ForegroundColor Green

# Delete existing database if exists
if (Test-Path "prisma\data\data.db") {
    Remove-Item "prisma\data\data.db" -Force
    Write-Host "Deleted existing database" -ForegroundColor Yellow
}

# Set environment variable for database
$env:DATABASE_URL = "file:./data/data.db"

Write-Host "Pushing schema..." -ForegroundColor Cyan
npx prisma db push

Write-Host "Seeding database..." -ForegroundColor Cyan
npx tsx prisma\seed.ts

Write-Host "Database initialized successfully!" -ForegroundColor Green
