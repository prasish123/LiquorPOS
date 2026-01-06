# ============================================
# POS System Environment Setup Script
# ============================================
# This script creates all required .env files
# for different deployment scenarios
# ============================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('development', 'client', 'store', 'cloud')]
    [string]$Environment = 'development',
    
    [Parameter(Mandatory=$false)]
    [string]$LocationId = '',
    
    [Parameter(Mandatory=$false)]
    [string]$TerminalId = ''
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "POS System Environment Setup" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Generate secure random secrets
function Generate-Secret {
    param([int]$Length = 64)
    $bytes = New-Object byte[] $Length
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

function Generate-UUID {
    return [guid]::NewGuid().ToString()
}

# Generate secrets
$jwtSecret = Generate-Secret -Length 64
$auditKey = Generate-Secret -Length 32
$redisPassword = Generate-Secret -Length 32

# Generate UUIDs if not provided
if ([string]::IsNullOrEmpty($LocationId)) {
    $LocationId = Generate-UUID
    Write-Host "Generated Location ID: $LocationId" -ForegroundColor Green
}

if ([string]::IsNullOrEmpty($TerminalId)) {
    $TerminalId = Generate-UUID
    Write-Host "Generated Terminal ID: $TerminalId" -ForegroundColor Green
}

# Environment-specific configurations
$configs = @{
    'development' = @{
        DatabaseUrl = "postgresql://postgres:password@localhost:5432/liquor_pos"
        RedisUrl = "redis://:${redisPassword}@localhost:6379"
        ApiUrl = "http://localhost:3000"
        FrontendUrl = "http://localhost:5173"
        EnableOffline = "true"
        EnableAI = "false"
        LogLevel = "debug"
    }
    'client' = @{
        DatabaseUrl = "postgresql://postgres:password@store-server:5432/liquor_pos"
        RedisUrl = "redis://:${redisPassword}@store-server:6379"
        ApiUrl = "http://store-server:3000"
        FrontendUrl = "http://localhost:5173"
        EnableOffline = "true"
        EnableAI = "false"
        LogLevel = "info"
    }
    'store' = @{
        DatabaseUrl = "postgresql://postgres:password@localhost:5432/liquor_pos"
        RedisUrl = "redis://:${redisPassword}@localhost:6379"
        ApiUrl = "http://localhost:3000"
        FrontendUrl = "http://localhost:80"
        EnableOffline = "true"
        EnableAI = "true"
        LogLevel = "info"
    }
    'cloud' = @{
        DatabaseUrl = "postgresql://\${DB_USER}:\${DB_PASSWORD}@\${DB_HOST}:5432/\${DB_NAME}"
        RedisUrl = "redis://:\${REDIS_PASSWORD}@\${REDIS_HOST}:6379"
        ApiUrl = "https://\${API_DOMAIN}"
        FrontendUrl = "https://\${FRONTEND_DOMAIN}"
        EnableOffline = "false"
        EnableAI = "true"
        LogLevel = "warn"
    }
}

$config = $configs[$Environment]

# ============================================
# Create Backend .env
# ============================================
Write-Host "Creating backend/.env..." -ForegroundColor Yellow

$backendEnv = @"
# ============================================
# Backend Environment Configuration
# Environment: $Environment
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ============================================

# Application
NODE_ENV=$Environment
PORT=3000

# Database
DATABASE_URL=$($config.DatabaseUrl)
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$redisPassword
REDIS_URL=$($config.RedisUrl)

# Security
JWT_SECRET=$jwtSecret
AUDIT_LOG_ENCRYPTION_KEY=$auditKey

# CORS
ALLOWED_ORIGINS=$($config.FrontendUrl),$($config.ApiUrl)

# Features
LOG_LEVEL=$($config.LogLevel)
ENABLE_OFFLINE_MODE=$($config.EnableOffline)
ENABLE_AI_FEATURES=$($config.EnableAI)

# Location & Terminal
DEFAULT_LOCATION_ID=$LocationId
DEFAULT_TERMINAL_ID=$TerminalId

# Payment (configure as needed)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# Email (configure as needed)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
"@

Set-Content -Path "backend/.env" -Value $backendEnv -Encoding UTF8
Write-Host "[OK] Backend .env created" -ForegroundColor Green

# ============================================
# Create Frontend .env
# ============================================
Write-Host "Creating frontend/.env..." -ForegroundColor Yellow

$frontendEnv = @"
# ============================================
# Frontend Environment Configuration
# Environment: $Environment
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ============================================

# API Configuration
VITE_API_URL=$($config.ApiUrl)

# Location & Terminal (MUST be valid UUIDs)
VITE_LOCATION_ID=$LocationId
VITE_TERMINAL_ID=$TerminalId

# Features
VITE_ENABLE_OFFLINE_MODE=$($config.EnableOffline)
VITE_ENABLE_DEBUG=$($Environment -eq 'development')

# Branding (customize as needed)
VITE_STORE_NAME=Liquor POS
VITE_STORE_LOGO=/logo.png
"@

Set-Content -Path "frontend/.env" -Value $frontendEnv -Encoding UTF8
Write-Host "[OK] Frontend .env created" -ForegroundColor Green

# ============================================
# Update docker-compose.yml with Redis password
# ============================================
Write-Host "Updating docker-compose.yml..." -ForegroundColor Yellow

$dockerCompose = Get-Content "docker-compose.yml" -Raw
$dockerCompose = $dockerCompose -replace 'command: redis-server --requirepass redis', "command: redis-server --requirepass $redisPassword"
Set-Content -Path "docker-compose.yml" -Value $dockerCompose -Encoding UTF8
Write-Host "[OK] docker-compose.yml updated" -ForegroundColor Green

# ============================================
# Create environment info file
# ============================================
$envInfo = @"
# ============================================
# Environment Information
# ============================================
Environment: $Environment
Location ID: $LocationId
Terminal ID: $TerminalId
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Secrets (KEEP SECURE!)
JWT Secret: $jwtSecret
Audit Key: $auditKey
Redis Password: $redisPassword

# Configuration
Database: $($config.DatabaseUrl)
Redis: $($config.RedisUrl)
API: $($config.ApiUrl)
Frontend: $($config.FrontendUrl)
"@

Set-Content -Path ".env.info" -Value $envInfo -Encoding UTF8
Write-Host "[OK] Environment info saved to .env.info" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Environment setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review .env files in backend/ and frontend/" -ForegroundColor White
Write-Host "2. Run: .\start-system.ps1 -Environment $Environment" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Keep .env.info secure - it contains secrets!" -ForegroundColor Red
Write-Host ""

