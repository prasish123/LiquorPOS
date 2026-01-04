#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test Loki integration for centralized logging

.DESCRIPTION
    This script tests the Loki integration by:
    1. Checking if required environment variables are set
    2. Running the Loki integration test script
    3. Providing helpful feedback

.EXAMPLE
    .\scripts\test-loki.ps1
#>

Write-Host "🔍 Loki Integration Test" -ForegroundColor Cyan
Write-Host "=" * 60

# Check if we're in the backend directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Must run from backend directory" -ForegroundColor Red
    exit 1
}

# Check required environment variables
Write-Host "`n📋 Checking environment variables..." -ForegroundColor Yellow

$requiredVars = @{
    "LOKI_ENABLED" = $env:LOKI_ENABLED
    "LOKI_URL" = $env:LOKI_URL
    "LOCATION_ID" = $env:LOCATION_ID
}

$missingVars = @()
foreach ($var in $requiredVars.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace($var.Value)) {
        $missingVars += $var.Key
        Write-Host "   ❌ $($var.Key): Not set" -ForegroundColor Red
    } else {
        Write-Host "   ✅ $($var.Key): $($var.Value)" -ForegroundColor Green
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "`n⚠️ Missing required environment variables:" -ForegroundColor Yellow
    foreach ($var in $missingVars) {
        Write-Host "   - $var" -ForegroundColor Yellow
    }
    Write-Host "`nℹ️ Set them in your .env file or environment:" -ForegroundColor Cyan
    Write-Host "   LOKI_ENABLED=true" -ForegroundColor Gray
    Write-Host "   LOKI_URL=http://localhost:3100" -ForegroundColor Gray
    Write-Host "   LOCATION_ID=store-001" -ForegroundColor Gray
    exit 1
}

# Check if Loki is enabled
if ($env:LOKI_ENABLED -ne "true") {
    Write-Host "`n❌ LOKI_ENABLED is not set to 'true'" -ForegroundColor Red
    Write-Host "   Set LOKI_ENABLED=true to enable Loki integration" -ForegroundColor Yellow
    exit 1
}

# Run the test script
Write-Host "`n🚀 Running Loki integration test..." -ForegroundColor Cyan
Write-Host "=" * 60

# Use ts-node to run the TypeScript test script
$env:NODE_ENV = "development"
npx ts-node scripts/test-loki-integration.ts

$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host "`n✅ Loki integration test completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Loki integration test failed!" -ForegroundColor Red
}

exit $exitCode

