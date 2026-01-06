# ============================================
# POS System Stop Script
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  STOPPING POS SYSTEM" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Stop Node processes
Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✓ Node.js processes stopped" -ForegroundColor Green

# Stop Docker containers
Write-Host "Stopping Docker containers..." -ForegroundColor Yellow
docker-compose down
Write-Host "✓ Docker containers stopped" -ForegroundColor Green

Write-Host ""
Write-Host "✓ System stopped successfully" -ForegroundColor Green
Write-Host ""

