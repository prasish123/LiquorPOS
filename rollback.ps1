# =============================================================================
# Liquor POS System - Rollback Script (PowerShell)
# =============================================================================
# Usage: .\rollback.ps1 [backup_file]
# Example: .\rollback.ps1 .\backend\backups\backup_20260105_120000.sql

param(
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

# Functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn-Custom {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Step {
    param([string]$Message)
    Write-Host "[STEP] $Message" -ForegroundColor Blue
}

# Check if backup file is provided
if ([string]::IsNullOrEmpty($BackupFile)) {
    Write-Error-Custom "Usage: .\rollback.ps1 <backup_file>"
    Write-Host ""
    Write-Info "Available backups:"
    Get-ChildItem -Path ".\backend\backups\*.sql" -ErrorAction SilentlyContinue | Format-Table Name, Length, LastWriteTime
    exit 1
}

# Check if backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Error-Custom "Backup file not found: $BackupFile"
    exit 1
}

Write-Warn-Custom "========================================="
Write-Warn-Custom "WARNING: Database Rollback"
Write-Warn-Custom "========================================="
Write-Warn-Custom "This will restore the database from:"
Write-Warn-Custom "  $BackupFile"
Write-Warn-Custom ""
Write-Warn-Custom "Current data will be LOST!"
Write-Warn-Custom "========================================="
Write-Host ""
$confirmation = Read-Host "Are you sure you want to continue? (type 'yes' to confirm)"

if ($confirmation -ne "yes") {
    Write-Info "Rollback cancelled"
    exit 0
}

Write-Step "Starting rollback process..."

# Create a backup of current state
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PreRollbackBackup = ".\backend\backups\pre_rollback_$Timestamp.sql"

Write-Step "Creating backup of current state..."
try {
    docker-compose exec -T postgres pg_dump -U postgres liquor_pos > $PreRollbackBackup
    Write-Info "Pre-rollback backup saved: $PreRollbackBackup"
}
catch {
    Write-Warn-Custom "Could not create pre-rollback backup"
}

# Stop services
Write-Step "Stopping services..."
docker-compose down

# Start only database
Write-Step "Starting database..."
docker-compose up -d postgres
Start-Sleep -Seconds 10

# Wait for database
Write-Step "Waiting for database to be ready..."
$MaxRetries = 30
$RetryCount = 0

while ($RetryCount -lt $MaxRetries) {
    try {
        docker-compose exec -T postgres pg_isready -U postgres | Out-Null
        Write-Info "Database is ready ✓"
        break
    }
    catch {
        $RetryCount++
        Write-Warn-Custom "Database not ready yet, retrying... ($RetryCount/$MaxRetries)"
        Start-Sleep -Seconds 2
    }
}

if ($RetryCount -eq $MaxRetries) {
    Write-Error-Custom "Database failed to start"
    exit 1
}

# Drop and recreate database
Write-Step "Dropping and recreating database..."
docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS liquor_pos;"
docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE liquor_pos;"

# Restore database
Write-Step "Restoring database from $BackupFile..."
Get-Content $BackupFile | docker-compose exec -T postgres psql -U postgres -d liquor_pos

if ($LASTEXITCODE -eq 0) {
    Write-Info "Database restored successfully ✓"
}
else {
    Write-Error-Custom "Database restore failed"
    Write-Error-Custom "You can restore from pre-rollback backup: $PreRollbackBackup"
    exit 1
}

# Restart all services
Write-Step "Restarting all services..."
docker-compose down
docker-compose up -d

# Wait for services
Write-Step "Waiting for services to start..."
Start-Sleep -Seconds 15

# Health check
Write-Step "Running health checks..."
$MaxRetries = 10
$RetryCount = 0

while ($RetryCount -lt $MaxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Info "Backend health check passed ✓"
            break
        }
    }
    catch {
        $RetryCount++
        Write-Warn-Custom "Backend not ready yet, retrying... ($RetryCount/$MaxRetries)"
        Start-Sleep -Seconds 3
    }
}

if ($RetryCount -eq $MaxRetries) {
    Write-Error-Custom "Health check failed after rollback"
    docker-compose logs backend
    exit 1
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Info "Frontend health check passed ✓"
    }
}
catch {
    Write-Warn-Custom "Frontend health check failed (may need more time)"
}

Write-Host ""
Write-Info "========================================="
Write-Info "Rollback completed successfully! ✓"
Write-Info "========================================="
Write-Host ""
Write-Info "Database restored from: $BackupFile"
Write-Info "Pre-rollback backup saved to: $PreRollbackBackup"
Write-Host ""
Write-Info "Services status:"
docker-compose ps
Write-Host ""
Write-Info "View logs: docker-compose logs -f"

