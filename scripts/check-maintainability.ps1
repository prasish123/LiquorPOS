# Maintainability Check Script (PowerShell)
# Run this locally before committing

Write-Host "🔍 Running maintainability check..." -ForegroundColor Cyan
Write-Host ""

# Navigate to project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptPath\.."

# Run the calculator
node .github/scripts/calculate-maintainability.js

# Display the report
Write-Host ""
Write-Host "📊 Full report:" -ForegroundColor Cyan
Write-Host ""
Get-Content maintainability-report.md

Write-Host ""
Write-Host "✅ Maintainability check complete!" -ForegroundColor Green

