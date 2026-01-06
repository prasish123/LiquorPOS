# ============================================
# POS TERMINAL SETUP
# ============================================
# Use this script on each POS TERMINAL (cashier workstation)
# This runs: Frontend ONLY
# Connects to the Store Server for backend/database
# ============================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$true)]
    [string]$StoreId,
    
    [Parameter(Mandatory=$true)]
    [string]$TerminalId
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  POS TERMINAL SETUP" -ForegroundColor Cyan
Write-Host "  Terminal: $TerminalId" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Server IP: $ServerIP" -ForegroundColor White
Write-Host "  Store ID: $StoreId" -ForegroundColor White
Write-Host "  Terminal ID: $TerminalId" -ForegroundColor White
Write-Host ""

Write-Host "Step 1: Testing connection to server..." -ForegroundColor Yellow

# Test server connection
try {
    $health = Invoke-RestMethod -Uri "http://${ServerIP}:3000/health" -TimeoutSec 5
    Write-Host "✓ Server connection successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Cannot connect to server at $ServerIP" -ForegroundColor Red
    Write-Host "  Make sure the store server is running and accessible" -ForegroundColor Yellow
    Write-Host "  Check firewall settings if needed" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 2: Creating terminal configuration..." -ForegroundColor Yellow

# Create frontend .env
$frontendEnv = @"
# ============================================
# POS TERMINAL CONFIGURATION
# Terminal: $TerminalId
# Store ID: $StoreId
# Server: $ServerIP
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ============================================

# Backend API (Store Server)
VITE_API_URL=http://${ServerIP}:3000

# Terminal Information
VITE_LOCATION_ID=$StoreId
VITE_TERMINAL_ID=$TerminalId

# Features
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_DEBUG=false

# Branding
VITE_STORE_NAME=Liquor POS
VITE_TERMINAL_NAME=$TerminalId
"@

Set-Content -Path "frontend/.env" -Value $frontendEnv -Encoding UTF8
Write-Host "✓ Terminal configuration created" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Installing dependencies..." -ForegroundColor Yellow

Push-Location frontend
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Dependency installation failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Pop-Location

Write-Host ""
Write-Host "Step 4: Starting POS terminal..." -ForegroundColor Yellow

# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'frontend'; npm run dev -- --host 0.0.0.0" -WindowStyle Normal
Write-Host "✓ POS terminal starting..." -ForegroundColor Green
Start-Sleep -Seconds 10

# Health check
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✓ Terminal health check passed" -ForegroundColor Green
} catch {
    Write-Host "⚠ Health check failed (terminal might still be starting)" -ForegroundColor Yellow
}

# Save terminal info
$terminalInfo = @"
# ============================================
# POS TERMINAL INFORMATION
# ============================================
Terminal ID: $TerminalId
Store ID: $StoreId
Server IP: $ServerIP
Terminal URL: http://localhost:5173
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# CONNECTION:
Backend API: http://${ServerIP}:3000

# DEFAULT LOGIN CREDENTIALS:
Cashier: cashier / password123
Manager: manager / password123
Admin: admin / password123

# TROUBLESHOOTING:
If you can't connect to the server:
1. Check server is running: http://${ServerIP}:3000/health
2. Check firewall allows port 3000
3. Verify server IP is correct: $ServerIP
4. Try pinging server: ping $ServerIP
"@

Set-Content -Path "terminal-${TerminalId}-info.txt" -Value $terminalInfo -Encoding UTF8

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ✓ POS TERMINAL READY!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Terminal Information:" -ForegroundColor Yellow
Write-Host "  Terminal ID: $TerminalId" -ForegroundColor White
Write-Host "  Store ID: $StoreId" -ForegroundColor White
Write-Host "  Server: http://${ServerIP}:3000" -ForegroundColor White
Write-Host ""
Write-Host "Access POS:" -ForegroundColor Yellow
Write-Host "  Open browser: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Default Login:" -ForegroundColor Yellow
Write-Host "  Cashier: cashier / password123" -ForegroundColor White
Write-Host ""
Write-Host "Terminal info saved to: terminal-${TerminalId}-info.txt" -ForegroundColor Yellow
Write-Host ""

