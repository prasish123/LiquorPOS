# =============================================================================
# Pre-Deployment Validation Script (PowerShell)
# =============================================================================
# Validates system readiness before deployment
# Exit code 0 = Ready for deployment
# Exit code 1 = Validation failed

$ErrorActionPreference = "Continue"
$ValidationFailed = $false

function Write-Success {
    param([string]$Message)
    Write-Host "[✓] $Message" -ForegroundColor Green
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "[⚠] $Message" -ForegroundColor Yellow
}

function Write-Failure {
    param([string]$Message)
    Write-Host "[✗] $Message" -ForegroundColor Red
    $script:ValidationFailed = $true
}

function Write-StepInfo {
    param([string]$Message)
    Write-Host "[→] $Message" -ForegroundColor Blue
}

Write-Host "========================================"
Write-Host "Pre-Deployment Validation"
Write-Host "========================================"
Write-Host ""

# 1. Check Docker and Docker Compose
Write-StepInfo "Checking Docker..."
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $dockerVersion = docker --version
    Write-Success "Docker installed: $dockerVersion"
} else {
    Write-Failure "Docker is not installed"
}

if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $composeVersion = docker-compose --version
    Write-Success "Docker Compose installed: $composeVersion"
} else {
    Write-Failure "Docker Compose is not installed"
}

# 2. Check environment file
Write-StepInfo "Checking environment configuration..."
if (Test-Path .env) {
    Write-Success ".env file exists"
    
    # Load environment variables
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    
    # Check required variables
    $requiredVars = @("JWT_SECRET", "AUDIT_LOG_ENCRYPTION_KEY", "DB_PASSWORD", "DATABASE_URL")
    
    foreach ($var in $requiredVars) {
        $value = [Environment]::GetEnvironmentVariable($var)
        if ([string]::IsNullOrEmpty($value)) {
            Write-Failure "Required environment variable not set: $var"
        } else {
            Write-Success "$var is set"
        }
    }
    
    # Check for default/insecure values
    if ([Environment]::GetEnvironmentVariable("DB_PASSWORD") -eq "changeme") {
        Write-Failure "DB_PASSWORD is set to default value 'changeme'"
    }
    
    if ([Environment]::GetEnvironmentVariable("JWT_SECRET") -eq "REPLACE_WITH_64_BYTE_HEX") {
        Write-Failure "JWT_SECRET is set to placeholder value"
    }
} else {
    Write-Failure ".env file not found"
}

# 3. Check disk space
Write-StepInfo "Checking disk space..."
$drive = (Get-Location).Drive
$disk = Get-PSDrive -Name $drive.Name
$percentUsed = [math]::Round((($disk.Used / ($disk.Used + $disk.Free)) * 100), 2)

if ($percentUsed -gt 90) {
    Write-Failure "Disk usage is critical: $percentUsed%"
} elseif ($percentUsed -gt 80) {
    Write-Warning-Custom "Disk usage is high: $percentUsed%"
} else {
    Write-Success "Disk usage is acceptable: $percentUsed%"
}

# 4. Check available memory
Write-StepInfo "Checking available memory..."
$os = Get-CimInstance -ClassName Win32_OperatingSystem
$availableMemMB = [math]::Round($os.FreePhysicalMemory / 1024, 0)

if ($availableMemMB -lt 512) {
    Write-Failure "Available memory is low: ${availableMemMB}MB"
} else {
    Write-Success "Available memory: ${availableMemMB}MB"
}

# 5. Check database migrations
Write-StepInfo "Checking database migrations..."
if (Test-Path "backend\prisma\migrations") {
    $migrationCount = (Get-ChildItem -Path "backend\prisma\migrations" -Filter "migration.sql" -Recurse).Count
    Write-Success "Found $migrationCount migration(s)"
    
    # Check for rollback files
    $rollbackCount = (Get-ChildItem -Path "backend\prisma\migrations" -Filter "rollback.sql" -Recurse).Count
    if ($rollbackCount -lt $migrationCount) {
        Write-Warning-Custom "Not all migrations have rollback scripts ($rollbackCount/$migrationCount)"
    }
} else {
    Write-Failure "Migrations directory not found"
}

# 6. Check for uncommitted changes
Write-StepInfo "Checking git status..."
if (Test-Path .git) {
    try {
        $gitStatus = git status --porcelain
        if ([string]::IsNullOrEmpty($gitStatus)) {
            Write-Success "No uncommitted changes"
        } else {
            Write-Warning-Custom "There are uncommitted changes"
            git status --short
        }
        
        $currentBranch = git rev-parse --abbrev-ref HEAD
        Write-Success "Current branch: $currentBranch"
    } catch {
        Write-Warning-Custom "Could not check git status"
    }
} else {
    Write-Warning-Custom "Not a git repository"
}

# 7. Check backup directory
Write-StepInfo "Checking backup configuration..."
if (Test-Path "backend\backups") {
    Write-Success "Backup directory exists"
    
    # Check recent backups
    $cutoffDate = (Get-Date).AddDays(-7)
    $recentBackups = Get-ChildItem -Path "backend\backups" -Filter "backup_*.sql*" | 
        Where-Object { $_.LastWriteTime -gt $cutoffDate }
    
    if ($recentBackups.Count -gt 0) {
        Write-Success "Found $($recentBackups.Count) backup(s) from last 7 days"
    } else {
        Write-Warning-Custom "No recent backups found (last 7 days)"
    }
} else {
    Write-Warning-Custom "Backup directory not found"
}

# 8. Check Docker images
Write-StepInfo "Checking Docker images..."
$images = docker images | Select-String "liquor-pos"
if ($images) {
    Write-Success "Liquor POS Docker images found"
} else {
    Write-Warning-Custom "No Liquor POS Docker images found (will be built during deployment)"
}

# 9. Check ports availability
Write-StepInfo "Checking port availability..."
$ports = @(3000, 5432, 6379, 80)

foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Warning-Custom "Port $port is already in use"
    } else {
        Write-Success "Port $port is available"
    }
}

# 10. Validate docker-compose.yml
Write-StepInfo "Validating docker-compose.yml..."
try {
    docker-compose config | Out-Null
    Write-Success "docker-compose.yml is valid"
} catch {
    Write-Failure "docker-compose.yml has errors"
}

# 11. Check Node.js version
Write-StepInfo "Checking Node.js version..."
if (Test-Path "backend\package.json") {
    $packageJson = Get-Content "backend\package.json" | ConvertFrom-Json
    if ($packageJson.engines.node) {
        Write-Success "Required Node.js version: $($packageJson.engines.node)"
    }
}

# 12. Check for security vulnerabilities
Write-StepInfo "Checking for security vulnerabilities..."
Push-Location backend
try {
    $auditResult = npm audit --audit-level=high 2>&1
    if ($auditResult -match "found 0 vulnerabilities") {
        Write-Success "No high-severity vulnerabilities found"
    } else {
        if ($auditResult -match "(\d+) critical") {
            $criticalCount = $matches[1]
            Write-Failure "Found $criticalCount critical vulnerabilities"
        } elseif ($auditResult -match "(\d+) high") {
            $highCount = $matches[1]
            Write-Warning-Custom "Found $highCount high-severity vulnerabilities"
        }
    }
} catch {
    Write-Warning-Custom "Could not run npm audit"
}
Pop-Location

# 13. Check database connectivity (if running)
Write-StepInfo "Checking database connectivity..."
$postgresRunning = docker-compose ps postgres 2>$null | Select-String "Up"
if ($postgresRunning) {
    try {
        docker-compose exec -T postgres pg_isready -U postgres | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database is accessible"
        } else {
            Write-Failure "Database is not responding"
        }
    } catch {
        Write-Failure "Database is not responding"
    }
} else {
    Write-Success "Database is not running (will be started during deployment)"
}

Write-Host ""
Write-Host "========================================"
if (-not $ValidationFailed) {
    Write-Host "✓ Validation PASSED" -ForegroundColor Green
    Write-Host "========================================"
    Write-Host ""
    Write-Host "System is ready for deployment"
    exit 0
} else {
    Write-Host "✗ Validation FAILED" -ForegroundColor Red
    Write-Host "========================================"
    Write-Host ""
    Write-Host "Please fix the errors above before deploying"
    exit 1
}

