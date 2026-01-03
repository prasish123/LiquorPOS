# POS System - Automated Test Script
# This script tests the complete system flow

param(
    [string]$BackendUrl = "http://localhost:3000",
    [string]$FrontendUrl = "http://localhost:5173"
)

$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "POS System - Automated Test" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Backend Health
Write-Host "[1/6] Testing Backend Health..." -ForegroundColor Blue
try {
    $health = Invoke-RestMethod -Uri "$BackendUrl/health" -ErrorAction Stop
    if ($health.status -eq "ok") {
        Write-Host "  ✓ Backend is healthy" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Backend health check failed" -ForegroundColor Red
        Write-Host "  Status: $($health.status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Cannot connect to backend" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "`n  Make sure backend is running:" -ForegroundColor Yellow
    Write-Host "  cd backend && npm run start:dev" -ForegroundColor Gray
    exit 1
}

# Test 2: Products
Write-Host "`n[2/6] Testing Products API..." -ForegroundColor Blue
try {
    $products = Invoke-RestMethod -Uri "$BackendUrl/api/products" -ErrorAction Stop
    Write-Host "  ✓ Products API working" -ForegroundColor Green
    Write-Host "  Found $($products.Count) products" -ForegroundColor Gray
    
    if ($products.Count -eq 0) {
        Write-Host "  ⚠ No products found - run: npm run seed" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Products API failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 3: Inventory
Write-Host "`n[3/6] Testing Inventory API..." -ForegroundColor Blue
try {
    $inventory = Invoke-RestMethod -Uri "$BackendUrl/api/inventory" -ErrorAction Stop
    Write-Host "  ✓ Inventory API working" -ForegroundColor Green
    Write-Host "  Found $($inventory.Count) inventory records" -ForegroundColor Gray
    
    if ($inventory.Count -gt 0) {
        $totalStock = ($inventory | Measure-Object -Property quantity -Sum).Sum
        Write-Host "  Total stock: $totalStock units" -ForegroundColor Gray
    } else {
        Write-Host "  ⚠ No inventory found - run: npm run seed" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Inventory API failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 4: CSRF Token
Write-Host "`n[4/6] Testing CSRF Token..." -ForegroundColor Blue
try {
    $csrfResponse = Invoke-WebRequest -Uri "$BackendUrl/auth/csrf-token" -SessionVariable session -ErrorAction Stop
    $csrf = ($csrfResponse.Content | ConvertFrom-Json).csrfToken
    
    if ($csrf) {
        Write-Host "  ✓ CSRF token retrieved" -ForegroundColor Green
        Write-Host "  Token: $($csrf.Substring(0, 20))..." -ForegroundColor Gray
    } else {
        Write-Host "  ✗ No CSRF token returned" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ CSRF token request failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 5: Login
Write-Host "`n[5/6] Testing Login..." -ForegroundColor Blue
try {
    $loginBody = @{
        username = "admin"
        password = "password123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$BackendUrl/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -Headers @{"x-csrf-token"=$csrf} `
        -WebSession $session `
        -ErrorAction Stop
    
    if ($loginResponse.user) {
        Write-Host "  ✓ Login successful" -ForegroundColor Green
        Write-Host "  User: $($loginResponse.user.username) ($($loginResponse.user.role))" -ForegroundColor Gray
    } else {
        Write-Host "  ✗ Login failed - no user returned" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Login failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Message -match "429") {
        Write-Host "  ⚠ Rate limited - wait 60 seconds or restart backend" -ForegroundColor Yellow
    }
    if ($_.Exception.Message -match "403") {
        Write-Host "  ⚠ CSRF token issue - check frontend code" -ForegroundColor Yellow
    }
    if ($_.Exception.Message -match "401") {
        Write-Host "  ⚠ Invalid credentials - run: npm run seed" -ForegroundColor Yellow
    }
}

# Test 6: Transactions
Write-Host "`n[6/6] Testing Transactions..." -ForegroundColor Blue
try {
    $transactions = Invoke-RestMethod -Uri "$BackendUrl/orders" `
        -WebSession $session `
        -ErrorAction Stop
    
    Write-Host "  ✓ Transactions API working" -ForegroundColor Green
    Write-Host "  Found $($transactions.Count) transactions" -ForegroundColor Gray
    
    if ($transactions.Count -eq 0) {
        Write-Host "  ℹ No transactions yet - process a sale in POS" -ForegroundColor Cyan
    } else {
        $totalSales = ($transactions | Measure-Object -Property total -Sum).Sum
        Write-Host "  Total sales: `$$([math]::Round($totalSales, 2))" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ✗ Transactions API failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nBackend URL: $BackendUrl" -ForegroundColor Gray
Write-Host "Frontend URL: $FrontendUrl" -ForegroundColor Gray

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Open frontend: $FrontendUrl" -ForegroundColor White
Write-Host "  2. Login: admin / password123" -ForegroundColor White
Write-Host "  3. Process a test sale" -ForegroundColor White
Write-Host "  4. Run this script again to verify" -ForegroundColor White

Write-Host "`nAPI Documentation: $BackendUrl/api/docs" -ForegroundColor Cyan
Write-Host "`n========================================`n" -ForegroundColor Cyan

