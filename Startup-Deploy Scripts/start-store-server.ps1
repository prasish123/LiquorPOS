# ============================================
# STORE SERVER SETUP
# ============================================
# Use this script on the MAIN SERVER at your store
# This runs: PostgreSQL + Redis + Backend API
# POS terminals will connect to this server
# ============================================

param(
    [Parameter(Mandatory=$false)]
    [string]$StoreId = "",
    
    [Parameter(Mandatory=$false)]
    [string]$StoreName = "My Liquor Store"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  STORE SERVER SETUP" -ForegroundColor Cyan
Write-Host "  Store: $StoreName" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Generate Store ID if not provided
if ([string]::IsNullOrEmpty($StoreId)) {
    $StoreId = [guid]::NewGuid().ToString()
    Write-Host "Generated Store ID: $StoreId" -ForegroundColor Green
}

# Generate secrets
function Generate-Secret {
    param([int]$Length = 64)
    $bytes = New-Object byte[] $Length
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

$jwtSecret = Generate-Secret -Length 64
$auditKey = Generate-Secret -Length 32
$redisPassword = Generate-Secret -Length 32

Write-Host "Step 1: Creating backend configuration..." -ForegroundColor Yellow

# Create backend .env
$backendEnv = @"
# ============================================
# STORE SERVER CONFIGURATION
# Store: $StoreName
# Store ID: $StoreId
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ============================================

NODE_ENV=production
PORT=3000

# Database (Local PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/liquor_pos
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Redis (Local)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$redisPassword
REDIS_URL=redis://:${redisPassword}@localhost:6379

# Security
JWT_SECRET=$jwtSecret
AUDIT_LOG_ENCRYPTION_KEY=$auditKey

# CORS - Allow POS terminals on local network
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:80,http://192.168.*.*:5173,http://10.*.*.*:5173

# Store Information
DEFAULT_LOCATION_ID=$StoreId
STORE_NAME=$StoreName

# Features
LOG_LEVEL=info
ENABLE_OFFLINE_MODE=true
ENABLE_AI_FEATURES=true

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
"@

Set-Content -Path "backend/.env" -Value $backendEnv -Encoding UTF8
Write-Host "✓ Backend configuration created" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Updating Docker configuration..." -ForegroundColor Yellow

# Update docker-compose.yml with Redis password
$dockerCompose = Get-Content "docker-compose.yml" -Raw
$dockerCompose = $dockerCompose -replace 'command: redis-server --requirepass redis', "command: redis-server --requirepass $redisPassword"
Set-Content -Path "docker-compose.yml" -Value $dockerCompose -Encoding UTF8
Write-Host "✓ Docker configuration updated" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Starting Docker services..." -ForegroundColor Yellow

# Start Docker
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker failed to start!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ PostgreSQL and Redis started" -ForegroundColor Green
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Step 4: Installing dependencies..." -ForegroundColor Yellow

Push-Location backend
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Dependency installation failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "Step 5: Setting up database..." -ForegroundColor Yellow

# Run migrations
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Migrations failed (might be OK if already applied)" -ForegroundColor Yellow
}

# Seed database
npx prisma db seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Seeding failed (might be OK if already seeded)" -ForegroundColor Yellow
}
Write-Host "✓ Database ready" -ForegroundColor Green

Pop-Location

Write-Host ""
Write-Host "Step 6: Starting backend server..." -ForegroundColor Yellow

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'backend'; npm run start:prod" -WindowStyle Normal
Write-Host "✓ Backend server starting..." -ForegroundColor Green
Start-Sleep -Seconds 15

# Health check
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 5
    Write-Host "✓ Server health check passed" -ForegroundColor Green
} catch {
    Write-Host "⚠ Health check failed (server might still be starting)" -ForegroundColor Yellow
}

# Save server info
$serverInfo = @"
# ============================================
# STORE SERVER INFORMATION
# ============================================
Store Name: $StoreName
Store ID: $StoreId
Server IP: $(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | Select-Object -First 1 -ExpandProperty IPAddress)
Backend URL: http://localhost:3000
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# SECRETS (KEEP SECURE!)
JWT Secret: $jwtSecret
Audit Key: $auditKey
Redis Password: $redisPassword

# NEXT STEPS:
1. Note the Server IP address above
2. On each POS terminal, run:
   .\start-pos-terminal.ps1 -ServerIP [SERVER_IP] -StoreId $StoreId -TerminalId terminal-01

# DEFAULT LOGIN CREDENTIALS:
Cashier: cashier / password123
Manager: manager / password123
Admin: admin / password123
"@

Set-Content -Path "store-server-info.txt" -Value $serverInfo -Encoding UTF8

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ✓ STORE SERVER READY!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server Information:" -ForegroundColor Yellow
Write-Host "  Store ID: $StoreId" -ForegroundColor White
Write-Host "  Backend API: http://localhost:3000" -ForegroundColor White
Write-Host "  Database: PostgreSQL (localhost:5432)" -ForegroundColor White
Write-Host "  Redis: localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "Server IP Address (for POS terminals):" -ForegroundColor Yellow
$serverIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | Select-Object -First 1 -ExpandProperty IPAddress
Write-Host "  $serverIP" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Note the server IP: $serverIP" -ForegroundColor White
Write-Host "  2. On each POS terminal, run:" -ForegroundColor White
Write-Host "     .\start-pos-terminal.ps1 -ServerIP $serverIP -StoreId $StoreId -TerminalId terminal-01" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server info saved to: store-server-info.txt" -ForegroundColor Yellow
Write-Host ""

