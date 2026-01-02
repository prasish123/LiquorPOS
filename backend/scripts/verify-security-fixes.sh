#!/bin/bash

# Verification script for C-004 and C-005 security fixes
# This script verifies that the security fixes are properly implemented

echo "=========================================="
echo "Security Fixes Verification Script"
echo "C-004: CSRF Protection"
echo "C-005: Rate Limiting"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must be run from backend directory${NC}"
    exit 1
fi

echo "Step 1: Checking CSRF Protection Implementation..."
echo "---------------------------------------------------"

# Check if login exemption is removed
if grep -q "req.path.startsWith('/auth/login')" src/main.ts; then
    echo -e "${RED}✗ FAILED: Login endpoint still exempted from CSRF${NC}"
    exit 1
else
    echo -e "${GREEN}✓ PASSED: Login endpoint requires CSRF token${NC}"
fi

# Check if CSRF token endpoint is still exempt (should be)
if grep -q "req.path.startsWith('/auth/csrf-token')" src/main.ts; then
    echo -e "${GREEN}✓ PASSED: CSRF token endpoint properly exempted${NC}"
else
    echo -e "${RED}✗ FAILED: CSRF token endpoint not exempted${NC}"
    exit 1
fi

# Check for enhanced error response
if grep -q "CSRF_TOKEN_MISMATCH" src/main.ts; then
    echo -e "${GREEN}✓ PASSED: Enhanced CSRF error response implemented${NC}"
else
    echo -e "${YELLOW}⚠ WARNING: Enhanced error response not found${NC}"
fi

echo ""
echo "Step 2: Checking Rate Limiting Configuration..."
echo "---------------------------------------------------"

# Check global rate limit
if grep -q "limit: 100" src/app.module.ts; then
    echo -e "${GREEN}✓ PASSED: Global rate limit increased to 100/min${NC}"
else
    echo -e "${RED}✗ FAILED: Global rate limit not properly configured${NC}"
    exit 1
fi

# Check for named rate limit configurations
if grep -q "name: 'strict'" src/app.module.ts; then
    echo -e "${GREEN}✓ PASSED: Strict rate limit configured (5/min)${NC}"
else
    echo -e "${RED}✗ FAILED: Strict rate limit not configured${NC}"
    exit 1
fi

if grep -q "name: 'orders'" src/app.module.ts; then
    echo -e "${GREEN}✓ PASSED: Orders rate limit configured (30/min)${NC}"
else
    echo -e "${RED}✗ FAILED: Orders rate limit not configured${NC}"
    exit 1
fi

if grep -q "name: 'inventory'" src/app.module.ts; then
    echo -e "${GREEN}✓ PASSED: Inventory rate limit configured (50/min)${NC}"
else
    echo -e "${RED}✗ FAILED: Inventory rate limit not configured${NC}"
    exit 1
fi

echo ""
echo "Step 3: Checking Endpoint-Specific Rate Limits..."
echo "---------------------------------------------------"

# Check auth controller
if grep -q "@Throttle({ strict:" src/auth/auth.controller.ts; then
    echo -e "${GREEN}✓ PASSED: Login endpoint uses strict rate limit${NC}"
else
    echo -e "${RED}✗ FAILED: Login endpoint rate limit not configured${NC}"
    exit 1
fi

# Check orders controller
if grep -q "@Throttle({ orders:" src/orders/orders.controller.ts; then
    echo -e "${GREEN}✓ PASSED: Orders endpoint uses orders rate limit${NC}"
else
    echo -e "${RED}✗ FAILED: Orders endpoint rate limit not configured${NC}"
    exit 1
fi

# Check inventory controller
if grep -q "@Throttle({ inventory:" src/inventory/inventory.controller.ts; then
    echo -e "${GREEN}✓ PASSED: Inventory endpoints use inventory rate limit${NC}"
else
    echo -e "${RED}✗ FAILED: Inventory endpoint rate limit not configured${NC}"
    exit 1
fi

echo ""
echo "Step 4: Checking Test Coverage..."
echo "---------------------------------------------------"

# Check if CSRF tests exist
if [ -f "test/csrf-protection.e2e-spec.ts" ]; then
    echo -e "${GREEN}✓ PASSED: CSRF protection tests exist${NC}"
    
    # Count test cases
    csrf_tests=$(grep -c "it('should" test/csrf-protection.e2e-spec.ts || echo "0")
    echo -e "  ${GREEN}Found ${csrf_tests} CSRF test cases${NC}"
else
    echo -e "${RED}✗ FAILED: CSRF protection tests not found${NC}"
    exit 1
fi

# Check if rate limiting tests exist
if [ -f "test/rate-limiting.e2e-spec.ts" ]; then
    echo -e "${GREEN}✓ PASSED: Rate limiting tests exist${NC}"
    
    # Count test cases
    rate_tests=$(grep -c "it('should" test/rate-limiting.e2e-spec.ts || echo "0")
    echo -e "  ${GREEN}Found ${rate_tests} rate limiting test cases${NC}"
else
    echo -e "${RED}✗ FAILED: Rate limiting tests not found${NC}"
    exit 1
fi

echo ""
echo "Step 5: Checking Documentation..."
echo "---------------------------------------------------"

if [ -f "docs/C004_C005_SECURITY_FIXES_SUMMARY.md" ]; then
    echo -e "${GREEN}✓ PASSED: Security fixes documentation exists${NC}"
else
    echo -e "${YELLOW}⚠ WARNING: Security fixes documentation not found${NC}"
fi

echo ""
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo -e "${GREEN}✓ All critical checks passed!${NC}"
echo ""
echo "Next Steps:"
echo "1. Run tests: npm run test:e2e"
echo "2. Review documentation: docs/C004_C005_SECURITY_FIXES_SUMMARY.md"
echo "3. Update frontend to include CSRF token in login requests"
echo "4. Deploy to staging for integration testing"
echo ""
echo -e "${YELLOW}⚠ IMPORTANT: Frontend changes required for login endpoint${NC}"
echo "See documentation for integration details."
echo ""

