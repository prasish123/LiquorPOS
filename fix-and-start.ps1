# POS System - Fix and Start Script
# This script kills existing processes and starts everything fresh

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "POS System - Fix and Start" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Kill existing processes on port 3000
Write-Host "[1/6] Killing existing backend processes..." -ForegroundColor Blue
try {
    $connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($connections) {
        $connections | ForEach-Object {
            $processId = $_.OwningProcess
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "  ✓ Killed process $processId on port 3000" -ForegroundColor Green
        }
    } else {
        Write-Host "  ✓ No processes found on port 3000" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ Could not check port 3000 (might be free)" -ForegroundColor Yellow
}

# Step 2: Kill existing processes on port 5173
Write-Host "`n[2/6] Killing existing frontend processes..." -ForegroundColor Blue
try {
    $connections = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
    if ($connections) {
        $connections | ForEach-Object {
            $processId = $_.OwningProcess
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "  ✓ Killed process $processId on port 5173" -ForegroundColor Green
        }
    } else {
        Write-Host "  ✓ No processes found on port 5173" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ Could not check port 5173 (might be free)" -ForegroundColor Yellow
}

# Wait a moment for ports to be released
Start-Sleep -Seconds 2

# Step 3: Check backend setup
Write-Host "`n[3/6] Checking backend setup..." -ForegroundColor Blue
Set-Location "E:\ML Projects\POS-Omni\liquor-pos\backend"

if (!(Test-Path ".env")) {
    Write-Host "  ✗ .env file not found!" -ForegroundColor Red
    Write-Host "  → Run: npm run setup:env" -ForegroundColor Yellow
    exit 1
}

if (!(Test-Path "node_modules")) {
    Write-Host "  ⚠ node_modules not found, installing..." -ForegroundColor Yellow
    npm install
}

Write-Host "  ✓ Backend setup OK" -ForegroundColor Green

# Step 4: Check Prisma
Write-Host "`n[4/6] Checking Prisma..." -ForegroundColor Blue
try {
    $migrateStatus = npx prisma migrate status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠ Migrations need to be applied" -ForegroundColor Yellow
        Write-Host "  → Running: npx prisma migrate dev" -ForegroundColor Cyan
        npx prisma migrate dev --name init
    }
    
    Write-Host "  → Generating Prisma client..." -ForegroundColor Cyan
    npx prisma generate | Out-Null
    Write-Host "  ✓ Prisma OK" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Prisma check failed, but continuing..." -ForegroundColor Yellow
}

# Step 5: Check frontend setup
Write-Host "`n[5/6] Checking frontend setup..." -ForegroundColor Blue
Set-Location "E:\ML Projects\POS-Omni\liquor-pos\frontend"

if (!(Test-Path "node_modules")) {
    Write-Host "  ⚠ node_modules not found, installing..." -ForegroundColor Yellow
    npm install
}

if (!(Test-Path ".env")) {
    Write-Host "  ⚠ .env not found, creating..." -ForegroundColor Yellow
    "VITE_API_URL=http://localhost:3000" | Out-File -FilePath ".env" -Encoding utf8
}

Write-Host "  ✓ Frontend setup OK" -ForegroundColor Green

# Step 6: Instructions
Write-Host "`n[6/6] Ready to start!" -ForegroundColor Blue
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n📋 Open 3 separate terminals and run:" -ForegroundColor White

Write-Host "`n  Terminal 1 (Backend):" -ForegroundColor Cyan
Write-Host "    cd `"E:\ML Projects\POS-Omni\liquor-pos\backend`"" -ForegroundColor Gray
Write-Host "    npm run start:dev" -ForegroundColor White

Write-Host "`n  Terminal 2 (Frontend):" -ForegroundColor Cyan
Write-Host "    cd `"E:\ML Projects\POS-Omni\liquor-pos\frontend`"" -ForegroundColor Gray
Write-Host "    npm run dev" -ForegroundColor White

Write-Host "`n  Terminal 3 (Health Check - wait 10 seconds first):" -ForegroundColor Cyan
Write-Host "    Invoke-RestMethod -Uri http://localhost:3000/health" -ForegroundColor White
Write-Host "    Start-Process http://localhost:5173" -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✨ Ports are now free and ready!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Ask if user wants to start automatically
$response = Read-Host "Do you want to start backend now? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "`nStarting backend..." -ForegroundColor Green
    Set-Location "E:\ML Projects\POS-Omni\liquor-pos\backend"
    npm run start:dev
}

