# =============================================================================
# Smoke Tests - Post-Deployment Validation (PowerShell)
# =============================================================================
# Validates critical functionality after deployment
# Exit code 0 = All tests passed
# Exit code 1 = Tests failed

$ErrorActionPreference = "Continue"

$TestsFailed = 0
$TestsPassed = 0
$TestsTotal = 0

$ApiUrl = if ($env:API_URL) { $env:API_URL } else { "http://localhost:3000" }
$FrontendUrl = if ($env:FRONTEND_URL) { $env:FRONTEND_URL } else { "http://localhost" }

function Test-Pass {
    param([string]$Message)
    Write-Host "[✓] $Message" -ForegroundColor Green
    $script:TestsPassed++
    $script:TestsTotal++
}

function Test-Fail {
    param([string]$Message)
    Write-Host "[✗] $Message" -ForegroundColor Red
    $script:TestsFailed++
    $script:TestsTotal++
}

function Write-TestStep {
    param([string]$Message)
    Write-Host "[→] $Message" -ForegroundColor Blue
}

Write-Host "========================================"
Write-Host "Smoke Tests - Post-Deployment Validation"
Write-Host "========================================"
Write-Host "API URL: $ApiUrl"
Write-Host "Frontend URL: $FrontendUrl"
Write-Host ""

# Test 1: Backend Health Check
Write-TestStep "Test 1: Backend Health Check"
try {
    $healthResponse = Invoke-RestMethod -Uri "$ApiUrl/health" -Method Get -TimeoutSec 10
    if ($healthResponse.status -eq "ok") {
        Test-Pass "Backend health endpoint is healthy"
    } else {
        Test-Fail "Backend health endpoint returned unexpected response"
    }
} catch {
    Test-Fail "Backend health endpoint is not accessible: $_"
}

# Test 2: Database Health
Write-TestStep "Test 2: Database Health"
try {
    $dbHealth = Invoke-RestMethod -Uri "$ApiUrl/health/db" -Method Get -TimeoutSec 10
    if ($dbHealth.database.status -eq "up") {
        Test-Pass "Database is healthy"
    } else {
        Test-Fail "Database is not healthy"
    }
} catch {
    Test-Fail "Database health check failed: $_"
}

# Test 3: Redis Health
Write-TestStep "Test 3: Redis Health"
try {
    $redisHealth = Invoke-RestMethod -Uri "$ApiUrl/health/redis" -Method Get -TimeoutSec 10
    if ($redisHealth.redis.status -eq "up") {
        Test-Pass "Redis is healthy"
    } else {
        Test-Fail "Redis is not healthy"
    }
} catch {
    Test-Fail "Redis health check failed: $_"
}

# Test 4: API Documentation
Write-TestStep "Test 4: API Documentation"
try {
    $apiDocs = Invoke-WebRequest -Uri "$ApiUrl/api" -Method Get -UseBasicParsing -TimeoutSec 10
    if ($apiDocs.StatusCode -eq 200) {
        Test-Pass "API documentation is accessible"
    } else {
        Test-Fail "API documentation returned status: $($apiDocs.StatusCode)"
    }
} catch {
    Test-Fail "API documentation is not accessible: $_"
}

# Test 5: Frontend Accessibility
Write-TestStep "Test 5: Frontend Accessibility"
try {
    $frontend = Invoke-WebRequest -Uri $FrontendUrl -Method Get -UseBasicParsing -TimeoutSec 10
    if ($frontend.StatusCode -eq 200) {
        Test-Pass "Frontend is accessible"
    } else {
        Test-Fail "Frontend returned status: $($frontend.StatusCode)"
    }
} catch {
    Test-Fail "Frontend is not accessible: $_"
}

# Test 6: Authentication Endpoint
Write-TestStep "Test 6: Authentication Endpoint"
try {
    $authBody = @{
        username = "invalid"
        password = "invalid"
    } | ConvertTo-Json
    
    $authResponse = Invoke-RestMethod -Uri "$ApiUrl/api/auth/login" -Method Post -Body $authBody -ContentType "application/json" -TimeoutSec 10
    Test-Fail "Authentication endpoint should reject invalid credentials"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Message -match "Unauthorized") {
        Test-Pass "Authentication endpoint is responding correctly"
    } else {
        Test-Fail "Authentication endpoint error: $_"
    }
}

# Test 7: Products API
Write-TestStep "Test 7: Products API"
try {
    $products = Invoke-RestMethod -Uri "$ApiUrl/api/products?limit=1" -Method Get -TimeoutSec 10
    Test-Pass "Products API is responding"
} catch {
    Test-Fail "Products API is not responding correctly: $_"
}

# Test 8: Backup Health
Write-TestStep "Test 8: Backup Health"
try {
    $backupHealth = Invoke-RestMethod -Uri "$ApiUrl/health/backup" -Method Get -TimeoutSec 10
    if ($backupHealth.backup) {
        Test-Pass "Backup system is healthy"
    } else {
        Test-Fail "Backup system health check failed"
    }
} catch {
    Test-Fail "Backup system health check failed: $_"
}

# Test 9: Response Time Check
Write-TestStep "Test 9: Response Time Check"
$startTime = Get-Date
try {
    Invoke-RestMethod -Uri "$ApiUrl/health" -Method Get -TimeoutSec 10 | Out-Null
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    
    if ($responseTime -lt 1000) {
        Test-Pass "Response time is acceptable: $([math]::Round($responseTime, 0))ms"
    } elseif ($responseTime -lt 3000) {
        Test-Pass "Response time is acceptable but slow: $([math]::Round($responseTime, 0))ms"
    } else {
        Test-Fail "Response time is too slow: $([math]::Round($responseTime, 0))ms"
    }
} catch {
    Test-Fail "Response time check failed: $_"
}

# Test 10: Docker Containers Status
Write-TestStep "Test 10: Docker Containers Status"
$expectedContainers = @("liquor-pos-backend", "liquor-pos-frontend", "liquor-pos-db", "liquor-pos-redis")
$allRunning = $true

foreach ($container in $expectedContainers) {
    $containerInfo = docker ps --format "{{.Names}}" | Select-String -Pattern "^$container$"
    if ($containerInfo) {
        $status = docker inspect --format='{{.State.Status}}' $container 2>$null
        if ($status -eq "running") {
            Write-Host "  ✓ $container is running" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $container is unhealthy: $status" -ForegroundColor Red
            $allRunning = $false
        }
    } else {
        Write-Host "  ✗ $container is not running" -ForegroundColor Red
        $allRunning = $false
    }
}

if ($allRunning) {
    Test-Pass "All Docker containers are running"
} else {
    Test-Fail "Some Docker containers are not running properly"
}

# Test 11: Database Connection Pool
Write-TestStep "Test 11: Database Connection Pool"
try {
    $dbConnections = docker-compose exec -T postgres psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" 2>$null
    $dbConnections = [int]($dbConnections.Trim())
    
    if ($dbConnections -gt 0 -and $dbConnections -lt 50) {
        Test-Pass "Database connections: $dbConnections (healthy)"
    } elseif ($dbConnections -ge 50) {
        Test-Fail "Database connections: $dbConnections (too many)"
    } else {
        Test-Fail "Could not check database connections"
    }
} catch {
    Test-Fail "Could not check database connections: $_"
}

# Test 12: Disk Space After Deployment
Write-TestStep "Test 12: Disk Space After Deployment"
$drive = (Get-Location).Drive
$disk = Get-PSDrive -Name $drive.Name
$percentUsed = [math]::Round((($disk.Used / ($disk.Used + $disk.Free)) * 100), 2)

if ($percentUsed -lt 90) {
    Test-Pass "Disk usage after deployment: $percentUsed%"
} else {
    Test-Fail "Disk usage is critical after deployment: $percentUsed%"
}

# Test 13: Memory Usage
Write-TestStep "Test 13: Memory Usage"
$os = Get-CimInstance -ClassName Win32_OperatingSystem
$memUsagePercent = [math]::Round(((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100), 2)

if ($memUsagePercent -lt 90) {
    Test-Pass "Memory usage: $memUsagePercent%"
} else {
    Test-Fail "Memory usage is high: $memUsagePercent%"
}

# Test 14: Logs Check for Errors
Write-TestStep "Test 14: Recent Logs Check"
try {
    $recentLogs = docker-compose logs --tail=100 backend 2>$null | Select-String -Pattern "(error|exception|fatal)" -CaseSensitive:$false
    $errorCount = ($recentLogs | Measure-Object).Count
    
    if ($errorCount -eq 0) {
        Test-Pass "No errors in recent logs"
    } elseif ($errorCount -lt 5) {
        Test-Pass "Few errors in recent logs: $errorCount (acceptable)"
    } else {
        Test-Fail "Many errors in recent logs: $errorCount"
    }
} catch {
    Test-Fail "Could not check logs: $_"
}

# Test 15: SSL/TLS Check (if applicable)
Write-TestStep "Test 15: SSL/TLS Configuration"
if ($ApiUrl -match "^https://") {
    try {
        $response = Invoke-WebRequest -Uri $ApiUrl -Method Head -UseBasicParsing
        if ($response.Headers["Strict-Transport-Security"]) {
            Test-Pass "HTTPS is properly configured"
        } else {
            Test-Fail "HTTPS is not properly configured"
        }
    } catch {
        Test-Fail "HTTPS configuration check failed: $_"
    }
} else {
    Test-Pass "HTTP mode (SSL not required for this environment)"
}

Write-Host ""
Write-Host "========================================"
Write-Host "Test Results"
Write-Host "========================================"
Write-Host "Total Tests: $TestsTotal"
Write-Host "Passed: $TestsPassed" -ForegroundColor Green
Write-Host "Failed: $TestsFailed" -ForegroundColor Red
Write-Host ""

if ($TestsFailed -eq 0) {
    Write-Host "✓ All smoke tests PASSED" -ForegroundColor Green
    Write-Host "Deployment is successful and system is operational"
    exit 0
} else {
    Write-Host "✗ Some smoke tests FAILED" -ForegroundColor Red
    Write-Host "Please investigate the failures above"
    Write-Host ""
    Write-Host "Useful commands:"
    Write-Host "  docker-compose logs backend"
    Write-Host "  docker-compose logs frontend"
    Write-Host "  docker-compose ps"
    exit 1
}

