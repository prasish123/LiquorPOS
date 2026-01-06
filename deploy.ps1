# =============================================================================
# Liquor POS System - Production Deployment Script (PowerShell)
# =============================================================================
# Usage: .\deploy.ps1 [-Environment production] [-SkipBackup] [-DryRun]
# Example: .\deploy.ps1 -Environment production

param(
    [string]$Environment = "production",
    [switch]$SkipBackup = $false,
    [switch]$DryRun = $false,
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"

# Configuration
$BACKUP_DIR = ".\backend\backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$LOG_FILE = "deployment_${TIMESTAMP}.log"
$DEPLOYMENT_LOCK = ".deployment.lock"

# Functions
function Write-Info {
    param([string]$Message)
    $msg = "[INFO] $Message"
    Write-Host $msg -ForegroundColor Green
    Add-Content -Path $LOG_FILE -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
}

function Write-Warn-Custom {
    param([string]$Message)
    $msg = "[WARN] $Message"
    Write-Host $msg -ForegroundColor Yellow
    Add-Content -Path $LOG_FILE -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
}

function Write-Error-Custom {
    param([string]$Message)
    $msg = "[ERROR] $Message"
    Write-Host $msg -ForegroundColor Red
    Add-Content -Path $LOG_FILE -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
}

function Write-Step {
    param([string]$Message)
    $msg = "[STEP] $Message"
    Write-Host $msg -ForegroundColor Blue
    Add-Content -Path $LOG_FILE -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
}

function Check-Prerequisites {
    Write-Step "Checking prerequisites..."
    
    # Check Docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error-Custom "Docker is not installed"
        exit 1
    }
    
    # Check Docker Compose
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Error-Custom "Docker Compose is not installed"
        exit 1
    }
    
    # Check .env file
    if (-not (Test-Path .env)) {
        Write-Error-Custom ".env file not found. Copy ENV_TEMPLATE.txt and configure it."
        exit 1
    }
    
    # Load and validate environment variables
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    
    # Validate required variables
    $required = @("JWT_SECRET", "AUDIT_LOG_ENCRYPTION_KEY", "DB_PASSWORD")
    foreach ($var in $required) {
        if ([string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable($var))) {
            Write-Error-Custom "$var not set in .env"
            exit 1
        }
    }
    
    Write-Info "Prerequisites check passed ✓"
}

function Check-DeploymentLock {
    if (Test-Path $DEPLOYMENT_LOCK) {
        $lockInfo = Get-Content $DEPLOYMENT_LOCK | ConvertFrom-Json
        $lockAge = (Get-Date) - [DateTime]$lockInfo.timestamp
        
        if ($lockAge.TotalMinutes -lt 30) {
            Write-Error-Custom "Deployment already in progress (started by $($lockInfo.user) at $($lockInfo.timestamp))"
            Write-Error-Custom "If this is a stale lock, delete $DEPLOYMENT_LOCK manually"
            exit 1
        } else {
            Write-Warn-Custom "Removing stale deployment lock (older than 30 minutes)"
            Remove-Item $DEPLOYMENT_LOCK -Force
        }
    }
    
    # Create lock
    $lockData = @{
        user = $env:USERNAME
        timestamp = Get-Date -Format "o"
        environment = $Environment
    } | ConvertTo-Json
    
    Set-Content -Path $DEPLOYMENT_LOCK -Value $lockData
    Write-Info "Deployment lock acquired"
}

function Remove-DeploymentLock {
    if (Test-Path $DEPLOYMENT_LOCK) {
        Remove-Item $DEPLOYMENT_LOCK -Force
        Write-Info "Deployment lock released"
    }
}

function Get-DeploymentVersion {
    if ($Version) {
        return $Version
    }
    
    # Try to get from git
    try {
        $gitVersion = git describe --tags --always 2>$null
        if ($gitVersion) {
            return $gitVersion
        }
    } catch {
        # Git not available or not a repo
    }
    
    # Fallback to timestamp
    return "v$TIMESTAMP"
}

function Run-PreDeploymentValidation {
    Write-Step "Running pre-deployment validation..."
    
    if (Test-Path ".\scripts\pre-deploy-validation.ps1") {
        try {
            & ".\scripts\pre-deploy-validation.ps1"
            Write-Info "Pre-deployment validation passed ✓"
        } catch {
            Write-Error-Custom "Pre-deployment validation failed: $_"
            throw
        }
    } else {
        Write-Warn-Custom "Pre-deployment validation script not found, skipping"
    }
}

function Backup-Database {
    if ($SkipBackup) {
        Write-Warn-Custom "Skipping database backup (--SkipBackup flag set)"
        return
    }
    
    Write-Step "Creating database backup..."
    
    if (-not (Test-Path $BACKUP_DIR)) {
        New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    }
    
    # Check if database container is running
    $postgresRunning = docker-compose ps postgres | Select-String "Up"
    
    if ($postgresRunning) {
        $backupFile = "$BACKUP_DIR\backup_$TIMESTAMP.sql"
        
        try {
            docker-compose exec -T postgres pg_dump -U postgres liquor_pos > $backupFile
            
            if ($LASTEXITCODE -eq 0) {
                Write-Info "Database backup created: $backupFile ✓"
                Set-Content -Path ".last_backup" -Value $backupFile
            } else {
                Write-Error-Custom "Database backup failed"
                throw "Backup failed with exit code $LASTEXITCODE"
            }
        } catch {
            Write-Error-Custom "Database backup failed: $_"
            throw
        }
    } else {
        Write-Warn-Custom "Database not running, skipping backup"
    }
}

function Pull-LatestCode {
    Write-Step "Pulling latest code..."
    
    if (Test-Path .git) {
        try {
            git fetch origin
            $currentBranch = git rev-parse --abbrev-ref HEAD
            Write-Info "Current branch: $currentBranch"
            
            git pull origin $currentBranch
            
            if ($LASTEXITCODE -eq 0) {
                Write-Info "Code updated successfully ✓"
            } else {
                Write-Error-Custom "Failed to pull latest code"
                throw "Git pull failed"
            }
        } catch {
            Write-Error-Custom "Failed to pull latest code: $_"
            throw
        }
    } else {
        Write-Warn-Custom "Not a git repository, skipping code pull"
    }
}

function Build-Images {
    Write-Step "Building Docker images..."
    
    try {
        docker-compose build --no-cache
        
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Images built successfully ✓"
        } else {
            Write-Error-Custom "Image build failed"
            throw "Docker build failed"
        }
    } catch {
        Write-Error-Custom "Image build failed: $_"
        throw
    }
}

function Run-Migrations {
    Write-Step "Running database migrations..."
    
    # Start database if not running
    docker-compose up -d postgres
    Start-Sleep -Seconds 10
    
    # Wait for database to be ready
    $maxRetries = 30
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries) {
        try {
            docker-compose exec -T postgres pg_isready -U postgres | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Info "Database is ready ✓"
                break
            }
        } catch {
            # Continue waiting
        }
        
        $retryCount++
        Write-Warn-Custom "Waiting for database... ($retryCount/$maxRetries)"
        Start-Sleep -Seconds 2
    }
    
    if ($retryCount -eq $maxRetries) {
        Write-Error-Custom "Database failed to start"
        throw "Database timeout"
    }
    
    # Run migrations
    try {
        docker-compose exec -T backend npm run migrate:deploy
        
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Migrations completed ✓"
        } else {
            Write-Error-Custom "Migrations failed"
            Write-Warn-Custom "Rolling back..."
            Invoke-Rollback
            throw "Migration failed"
        }
    } catch {
        Write-Error-Custom "Migrations failed: $_"
        throw
    }
}

function Deploy-Services {
    Write-Step "Deploying services..."
    
    if ($DryRun) {
        Write-Info "DRY RUN: Would deploy services now"
        return
    }
    
    try {
        # Stop old containers gracefully
        docker-compose down --timeout 30
        
        # Start new containers
        docker-compose up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Services deployed ✓"
        } else {
            Write-Error-Custom "Deployment failed"
            Invoke-Rollback
            throw "Service deployment failed"
        }
    } catch {
        Write-Error-Custom "Deployment failed: $_"
        throw
    }
}

function Test-HealthCheck {
    param(
        [string]$Url,
        [string]$ServiceName,
        [int]$MaxRetries = 10,
        [int]$RetryDelay = 5
    )
    
    $retryCount = 0
    
    while ($retryCount -lt $MaxRetries) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Info "$ServiceName health check passed ✓"
                return $true
            }
        } catch {
            $retryCount++
            if ($retryCount -lt $MaxRetries) {
                Write-Warn-Custom "$ServiceName not ready yet, retrying... ($retryCount/$MaxRetries)"
                Start-Sleep -Seconds $RetryDelay
            }
        }
    }
    
    Write-Error-Custom "$ServiceName health check failed after $MaxRetries attempts"
    return $false
}

function Run-HealthChecks {
    Write-Step "Running health checks..."
    
    # Wait for services to initialize
    Write-Info "Waiting for services to start..."
    Start-Sleep -Seconds 15
    
    # Check backend health
    if (-not (Test-HealthCheck -Url "http://localhost:3000/health" -ServiceName "Backend")) {
        docker-compose logs backend
        Invoke-Rollback
        throw "Backend health check failed"
    }
    
    # Check frontend health (if endpoint exists)
    try {
        $frontendResponse = Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing -TimeoutSec 5
        if ($frontendResponse.StatusCode -eq 200) {
            Write-Info "Frontend health check passed ✓"
        }
    } catch {
        Write-Warn-Custom "Frontend health check failed (may need more time or endpoint doesn't exist)"
    }
    
    # Check all services status
    Write-Info "Services status:"
    docker-compose ps
}

function Run-SmokeTests {
    Write-Step "Running smoke tests..."
    
    if (Test-Path ".\scripts\smoke-tests.ps1") {
        try {
            & ".\scripts\smoke-tests.ps1"
            Write-Info "Smoke tests passed ✓"
        } catch {
            Write-Error-Custom "Smoke tests failed: $_"
            Invoke-Rollback
            throw
        }
    } else {
        Write-Warn-Custom "Smoke tests script not found, skipping"
    }
}

function Cleanup-OldImages {
    Write-Step "Cleaning up old Docker images..."
    
    try {
        # Remove dangling images
        docker image prune -f | Out-Null
        
        # Remove old backups (keep last 30 days)
        $cutoffDate = (Get-Date).AddDays(-30)
        Get-ChildItem -Path $BACKUP_DIR -Filter "backup_*.sql" | 
            Where-Object { $_.LastWriteTime -lt $cutoffDate } |
            Remove-Item -Force
        
        Write-Info "Cleanup completed ✓"
    } catch {
        Write-Warn-Custom "Cleanup failed: $_"
    }
}

function Invoke-Rollback {
    Write-Error-Custom "Deployment failed, initiating rollback..."
    
    if (Test-Path ".last_backup") {
        $lastBackup = Get-Content ".last_backup"
        Write-Warn-Custom "To rollback database, run: .\rollback.ps1 $lastBackup"
    }
    
    # Stop failed containers
    docker-compose down
    
    Write-Error-Custom "Rollback initiated. Please check logs and fix issues."
}

function Send-Notification {
    param(
        [string]$Status,
        [string]$Message
    )
    
    Write-Step "Sending deployment notification..."
    
    # Add your notification logic here (Slack, email, etc.)
    # Example for webhook:
    # $webhook = $env:DEPLOYMENT_WEBHOOK_URL
    # if ($webhook) {
    #     $body = @{
    #         text = "Deployment $Status`: $Message"
    #         environment = $Environment
    #         version = $deployVersion
    #     } | ConvertTo-Json
    #     
    #     Invoke-RestMethod -Uri $webhook -Method Post -Body $body -ContentType "application/json"
    # }
    
    Write-Info "Notification sent (status: $Status)"
}

function Tag-Deployment {
    param([string]$Version)
    
    Write-Step "Tagging deployment..."
    
    try {
        # Create deployment tag file
        $tagData = @{
            version = $Version
            environment = $Environment
            timestamp = Get-Date -Format "o"
            user = $env:USERNAME
            gitCommit = (git rev-parse HEAD 2>$null)
        } | ConvertTo-Json
        
        Set-Content -Path ".deployment_tag" -Value $tagData
        Write-Info "Deployment tagged: $Version"
    } catch {
        Write-Warn-Custom "Failed to tag deployment: $_"
    }
}

# Main deployment flow
function Main {
    $deployVersion = Get-DeploymentVersion
    
    Write-Info "========================================="
    Write-Info "Starting deployment to $Environment..."
    Write-Info "Version: $deployVersion"
    Write-Info "Timestamp: $TIMESTAMP"
    Write-Info "Dry Run: $DryRun"
    Write-Info "========================================="
    Write-Host ""
    
    try {
        Check-DeploymentLock
        Check-Prerequisites
        Run-PreDeploymentValidation
        Backup-Database
        Pull-LatestCode
        Build-Images
        Run-Migrations
        Deploy-Services
        Run-HealthChecks
        Run-SmokeTests
        Cleanup-OldImages
        Tag-Deployment -Version $deployVersion
        
        Write-Host ""
        Write-Info "========================================="
        Write-Info "Deployment completed successfully! 🎉"
        Write-Info "========================================="
        Write-Host ""
        Write-Info "Services:"
        Write-Info "  - Frontend: http://localhost"
        Write-Info "  - Backend:  http://localhost:3000"
        Write-Info "  - API Docs: http://localhost:3000/api"
        Write-Host ""
        Write-Info "Useful commands:"
        Write-Info "  - View logs:     docker-compose logs -f"
        Write-Info "  - Stop services: docker-compose down"
        Write-Info "  - Restart:       docker-compose restart"
        Write-Host ""
        Write-Info "Deployment log saved to: $LOG_FILE"
        
        Send-Notification -Status "SUCCESS" -Message "Deployment to $Environment completed successfully (version: $deployVersion)"
        
    } catch {
        Write-Error-Custom "Deployment failed: $_"
        Send-Notification -Status "FAILED" -Message "Deployment to $Environment failed: $_"
        exit 1
    } finally {
        Remove-DeploymentLock
    }
}

# Run main function
Main

