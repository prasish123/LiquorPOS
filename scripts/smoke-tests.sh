#!/bin/bash

# =============================================================================
# Smoke Tests - Post-Deployment Validation
# =============================================================================
# Validates critical functionality after deployment
# Exit code 0 = All tests passed
# Exit code 1 = Tests failed

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_FAILED=0
TESTS_PASSED=0
TESTS_TOTAL=0

API_URL="${API_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost}"

log_test_pass() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((TESTS_PASSED++))
    ((TESTS_TOTAL++))
}

log_test_fail() {
    echo -e "${RED}[✗]${NC} $1"
    ((TESTS_FAILED++))
    ((TESTS_TOTAL++))
}

log_step() {
    echo -e "${BLUE}[→]${NC} $1"
}

echo "========================================"
echo "Smoke Tests - Post-Deployment Validation"
echo "========================================"
echo "API URL: $API_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Test 1: Backend Health Check
log_step "Test 1: Backend Health Check"
if curl -f -s "$API_URL/health" > /dev/null; then
    HEALTH_RESPONSE=$(curl -s "$API_URL/health")
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
        log_test_pass "Backend health endpoint is healthy"
    else
        log_test_fail "Backend health endpoint returned unexpected response"
    fi
else
    log_test_fail "Backend health endpoint is not accessible"
fi

# Test 2: Database Health
log_step "Test 2: Database Health"
DB_HEALTH=$(curl -s "$API_URL/health/db" || echo "failed")
if echo "$DB_HEALTH" | grep -q '"database"'; then
    if echo "$DB_HEALTH" | grep -q '"status":"up"'; then
        log_test_pass "Database is healthy"
    else
        log_test_fail "Database is not healthy"
    fi
else
    log_test_fail "Database health check failed"
fi

# Test 3: Redis Health
log_step "Test 3: Redis Health"
REDIS_HEALTH=$(curl -s "$API_URL/health/redis" || echo "failed")
if echo "$REDIS_HEALTH" | grep -q '"redis"'; then
    if echo "$REDIS_HEALTH" | grep -q '"status":"up"'; then
        log_test_pass "Redis is healthy"
    else
        log_test_fail "Redis is not healthy"
    fi
else
    log_test_fail "Redis health check failed"
fi

# Test 4: API Documentation
log_step "Test 4: API Documentation"
if curl -f -s "$API_URL/api" > /dev/null; then
    log_test_pass "API documentation is accessible"
else
    log_test_fail "API documentation is not accessible"
fi

# Test 5: Frontend Accessibility
log_step "Test 5: Frontend Accessibility"
if curl -f -s "$FRONTEND_URL" > /dev/null; then
    log_test_pass "Frontend is accessible"
else
    log_test_fail "Frontend is not accessible"
fi

# Test 6: Authentication Endpoint
log_step "Test 6: Authentication Endpoint"
AUTH_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"invalid","password":"invalid"}' || echo "failed")

if echo "$AUTH_RESPONSE" | grep -q -E '(Unauthorized|Invalid|401)'; then
    log_test_pass "Authentication endpoint is responding correctly"
else
    log_test_fail "Authentication endpoint is not responding as expected"
fi

# Test 7: Products API
log_step "Test 7: Products API"
PRODUCTS_RESPONSE=$(curl -s "$API_URL/api/products?limit=1" || echo "failed")
if echo "$PRODUCTS_RESPONSE" | grep -q -E '(\[|\{|products)'; then
    log_test_pass "Products API is responding"
else
    log_test_fail "Products API is not responding correctly"
fi

# Test 8: Backup Health
log_step "Test 8: Backup Health"
BACKUP_HEALTH=$(curl -s "$API_URL/health/backup" || echo "failed")
if echo "$BACKUP_HEALTH" | grep -q '"backup"'; then
    log_test_pass "Backup system is healthy"
else
    log_test_fail "Backup system health check failed"
fi

# Test 9: Response Time Check
log_step "Test 9: Response Time Check"
START_TIME=$(date +%s%N)
curl -s "$API_URL/health" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$RESPONSE_TIME" -lt 1000 ]; then
    log_test_pass "Response time is acceptable: ${RESPONSE_TIME}ms"
elif [ "$RESPONSE_TIME" -lt 3000 ]; then
    log_test_pass "Response time is acceptable but slow: ${RESPONSE_TIME}ms"
else
    log_test_fail "Response time is too slow: ${RESPONSE_TIME}ms"
fi

# Test 10: Docker Containers Status
log_step "Test 10: Docker Containers Status"
EXPECTED_CONTAINERS=("liquor-pos-backend" "liquor-pos-frontend" "liquor-pos-db" "liquor-pos-redis")
ALL_RUNNING=true

for container in "${EXPECTED_CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "running")
        if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "running" ]; then
            echo "  ✓ $container is running"
        else
            echo "  ✗ $container is unhealthy: $STATUS"
            ALL_RUNNING=false
        fi
    else
        echo "  ✗ $container is not running"
        ALL_RUNNING=false
    fi
done

if [ "$ALL_RUNNING" = true ]; then
    log_test_pass "All Docker containers are running"
else
    log_test_fail "Some Docker containers are not running properly"
fi

# Test 11: Database Connection Pool
log_step "Test 11: Database Connection Pool"
DB_CONNECTIONS=$(docker-compose exec -T postgres psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo "0")
DB_CONNECTIONS=$(echo "$DB_CONNECTIONS" | tr -d ' ')

if [ "$DB_CONNECTIONS" -gt 0 ] && [ "$DB_CONNECTIONS" -lt 50 ]; then
    log_test_pass "Database connections: $DB_CONNECTIONS (healthy)"
elif [ "$DB_CONNECTIONS" -ge 50 ]; then
    log_test_fail "Database connections: $DB_CONNECTIONS (too many)"
else
    log_test_fail "Could not check database connections"
fi

# Test 12: Disk Space After Deployment
log_step "Test 12: Disk Space After Deployment"
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 90 ]; then
    log_test_pass "Disk usage after deployment: ${DISK_USAGE}%"
else
    log_test_fail "Disk usage is critical after deployment: ${DISK_USAGE}%"
fi

# Test 13: Memory Usage
log_step "Test 13: Memory Usage"
if command -v free &> /dev/null; then
    MEM_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
    if [ "$MEM_USAGE" -lt 90 ]; then
        log_test_pass "Memory usage: ${MEM_USAGE}%"
    else
        log_test_fail "Memory usage is high: ${MEM_USAGE}%"
    fi
fi

# Test 14: Logs Check for Errors
log_step "Test 14: Recent Logs Check"
RECENT_ERRORS=$(docker-compose logs --tail=100 backend 2>/dev/null | grep -i -E '(error|exception|fatal)' | grep -v -E '(test|mock)' | wc -l)
if [ "$RECENT_ERRORS" -eq 0 ]; then
    log_test_pass "No errors in recent logs"
elif [ "$RECENT_ERRORS" -lt 5 ]; then
    log_test_pass "Few errors in recent logs: $RECENT_ERRORS (acceptable)"
else
    log_test_fail "Many errors in recent logs: $RECENT_ERRORS"
fi

# Test 15: SSL/TLS Check (if applicable)
log_step "Test 15: SSL/TLS Configuration"
if echo "$API_URL" | grep -q "https://"; then
    if curl -s --head "$API_URL" | grep -q "Strict-Transport-Security"; then
        log_test_pass "HTTPS is properly configured"
    else
        log_test_fail "HTTPS is not properly configured"
    fi
else
    log_test_pass "HTTP mode (SSL not required for this environment)"
fi

echo ""
echo "========================================"
echo "Test Results"
echo "========================================"
echo "Total Tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All smoke tests PASSED${NC}"
    echo "Deployment is successful and system is operational"
    exit 0
else
    echo -e "${RED}✗ Some smoke tests FAILED${NC}"
    echo "Please investigate the failures above"
    echo ""
    echo "Useful commands:"
    echo "  docker-compose logs backend"
    echo "  docker-compose logs frontend"
    echo "  docker-compose ps"
    exit 1
fi

