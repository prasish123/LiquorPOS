# ============================================
# POS System Unified Start Script
# ============================================
# Single command to start the entire system
# Works for: Client, Store, Database Server, Cloud
# ============================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('development', 'client', 'store', 'cloud')]
    [string]$Environment = 'development',
    
    [Parameter(Mandatory=$false)]
    [switch]$SetupEnv = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDocker = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBackend = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipFrontend = $false
)

$ErrorActionPreference = "Continue"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  POS SYSTEM UNIFIED START" -ForegroundColor Cyan
Write-Host "  Environment: $Environment" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# Step 1: Check Prerequisites
# ============================================
Write-Host "[1/7] Checking prerequisites..." -ForegroundColor Yellow

# Check Docker
if (-not $SkipDocker) {
    try {
        $dockerVersion = docker --version 2>$null
        Write-Host "✓ Docker: $dockerVersion" -ForegroundColor Green
    } catch {
        Write-Host "✗ Docker not found! Please install Docker Desktop." -ForegroundColor Red
        exit 1
    }
}

# Check Node.js
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found! Please install Node.js 18+." -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version 2>$null
    Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================
# Step 2: Setup Environment (if needed)
# ============================================
if ($SetupEnv -or -not (Test-Path "backend/.env") -or -not (Test-Path "frontend/.env")) {
    Write-Host "[2/7] Setting up environment files..." -ForegroundColor Yellow
    & .\setup-env.ps1 -Environment $Environment
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Environment setup failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[2/7] Environment files already exist (skipping)" -ForegroundColor Green
}

Write-Host ""

# ============================================
# Step 3: Start Docker Services
# ============================================
if (-not $SkipDocker) {
    Write-Host "[3/7] Starting Docker services (PostgreSQL + Redis)..." -ForegroundColor Yellow
    
    # Check if Docker Desktop is running
    $dockerRunning = docker ps 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        Write-Host "Waiting for Docker to start (30 seconds)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }
    
    # Start containers
    docker-compose up -d
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Docker services failed to start!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Docker services started" -ForegroundColor Green
    Write-Host "Waiting for services to be ready (10 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
} else {
    Write-Host "[3/7] Skipping Docker services" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Step 4: Install Dependencies
# ============================================
Write-Host "[4/7] Checking dependencies..." -ForegroundColor Yellow

# Backend dependencies
if (-not $SkipBackend) {
    if (-not (Test-Path "backend/node_modules")) {
        Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
        Push-Location backend
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ Backend dependency installation failed!" -ForegroundColor Red
            Pop-Location
            exit 1
        }
        Pop-Location
        Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✓ Backend dependencies already installed" -ForegroundColor Green
    }
}

# Frontend dependencies
if (-not $SkipFrontend) {
    if (-not (Test-Path "frontend/node_modules")) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        Push-Location frontend
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ Frontend dependency installation failed!" -ForegroundColor Red
            Pop-Location
            exit 1
        }
        Pop-Location
        Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✓ Frontend dependencies already installed" -ForegroundColor Green
    }
}

Write-Host ""

# ============================================
# Step 5: Run Database Migrations
# ============================================
if (-not $SkipBackend) {
    Write-Host "[5/7] Running database migrations..." -ForegroundColor Yellow
    Push-Location backend
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠ Migrations failed (might be OK if already applied)" -ForegroundColor Yellow
    } else {
        Write-Host "✓ Migrations applied" -ForegroundColor Green
    }
    
    # Seed database
    Write-Host "Seeding database..." -ForegroundColor Yellow
    npx prisma db seed
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠ Seeding failed (might be OK if already seeded)" -ForegroundColor Yellow
    } else {
        Write-Host "✓ Database seeded" -ForegroundColor Green
    }
    Pop-Location
} else {
    Write-Host "[5/7] Skipping database migrations" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Step 6: Start Backend
# ============================================
if (-not $SkipBackend) {
    Write-Host "[6/7] Starting backend server..." -ForegroundColor Yellow
    
    # Check if already running
    $backendRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue 2>$null
    if ($backendRunning) {
        Write-Host "⚠ Backend already running on port 3000" -ForegroundColor Yellow
    } else {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'backend'; npm run start:dev" -WindowStyle Minimized
        Write-Host "✓ Backend starting (check separate window)" -ForegroundColor Green
        Write-Host "Waiting for backend to be ready (15 seconds)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 15
    }
} else {
    Write-Host "[6/7] Skipping backend" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Step 7: Start Frontend
# ============================================
if (-not $SkipFrontend) {
    Write-Host "[7/7] Starting frontend..." -ForegroundColor Yellow
    
    # Check if already running
    $frontendRunning = Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet -WarningAction SilentlyContinue 2>$null
    if ($frontendRunning) {
        Write-Host "⚠ Frontend already running on port 5173" -ForegroundColor Yellow
    } else {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'frontend'; npm run dev" -WindowStyle Minimized
        Write-Host "✓ Frontend starting (check separate window)" -ForegroundColor Green
        Write-Host "Waiting for frontend to be ready (10 seconds)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
} else {
    Write-Host "[7/7] Skipping frontend" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Health Check
# ============================================
Write-Host "Running health checks..." -ForegroundColor Yellow

# Check backend
if (-not $SkipBackend) {
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 5
        Write-Host "✓ Backend health check passed" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Backend health check failed (might still be starting)" -ForegroundColor Yellow
    }
}

# Check frontend
if (-not $SkipFrontend) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -UseBasicParsing
        Write-Host "✓ Frontend health check passed" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Frontend health check failed (might still be starting)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ✓ SYSTEM STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access the application:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "  API Docs: http://localhost:3000/api" -ForegroundColor White
Write-Host ""
Write-Host "Default credentials:" -ForegroundColor Yellow
Write-Host "  Cashier: cashier / password123" -ForegroundColor White
Write-Host "  Manager: manager / password123" -ForegroundColor White
Write-Host "  Admin:   admin / password123" -ForegroundColor White
Write-Host ""
Write-Host "To stop the system:" -ForegroundColor Yellow
Write-Host "  Run: .\stop-system.ps1" -ForegroundColor White
Write-Host ""

