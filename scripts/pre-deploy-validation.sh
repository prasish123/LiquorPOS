#!/bin/bash

# =============================================================================
# Pre-Deployment Validation Script
# =============================================================================
# Validates system readiness before deployment
# Exit code 0 = Ready for deployment
# Exit code 1 = Validation failed

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VALIDATION_FAILED=0

log_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    VALIDATION_FAILED=1
}

log_step() {
    echo -e "${BLUE}[→]${NC} $1"
}

echo "========================================"
echo "Pre-Deployment Validation"
echo "========================================"
echo ""

# 1. Check Docker and Docker Compose
log_step "Checking Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    log_info "Docker installed: $DOCKER_VERSION"
else
    log_error "Docker is not installed"
fi

if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    log_info "Docker Compose installed: $COMPOSE_VERSION"
else
    log_error "Docker Compose is not installed"
fi

# 2. Check environment file
log_step "Checking environment configuration..."
if [ -f .env ]; then
    log_info ".env file exists"
    
    # Check required variables
    source .env
    REQUIRED_VARS=("JWT_SECRET" "AUDIT_LOG_ENCRYPTION_KEY" "DB_PASSWORD" "DATABASE_URL")
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable not set: $var"
        else
            log_info "$var is set"
        fi
    done
    
    # Check for default/insecure values
    if [ "$DB_PASSWORD" = "changeme" ]; then
        log_error "DB_PASSWORD is set to default value 'changeme'"
    fi
    
    if [ "$JWT_SECRET" = "REPLACE_WITH_64_BYTE_HEX" ]; then
        log_error "JWT_SECRET is set to placeholder value"
    fi
else
    log_error ".env file not found"
fi

# 3. Check disk space
log_step "Checking disk space..."
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    log_error "Disk usage is critical: ${DISK_USAGE}%"
elif [ "$DISK_USAGE" -gt 80 ]; then
    log_warn "Disk usage is high: ${DISK_USAGE}%"
else
    log_info "Disk usage is acceptable: ${DISK_USAGE}%"
fi

# 4. Check available memory
log_step "Checking available memory..."
if command -v free &> /dev/null; then
    AVAILABLE_MEM=$(free -m | awk 'NR==2 {print $7}')
    if [ "$AVAILABLE_MEM" -lt 512 ]; then
        log_error "Available memory is low: ${AVAILABLE_MEM}MB"
    else
        log_info "Available memory: ${AVAILABLE_MEM}MB"
    fi
fi

# 5. Check database migrations
log_step "Checking database migrations..."
if [ -d "backend/prisma/migrations" ]; then
    MIGRATION_COUNT=$(find backend/prisma/migrations -name "migration.sql" | wc -l)
    log_info "Found $MIGRATION_COUNT migration(s)"
    
    # Check for rollback files
    ROLLBACK_COUNT=$(find backend/prisma/migrations -name "rollback.sql" | wc -l)
    if [ "$ROLLBACK_COUNT" -lt "$MIGRATION_COUNT" ]; then
        log_warn "Not all migrations have rollback scripts ($ROLLBACK_COUNT/$MIGRATION_COUNT)"
    fi
else
    log_error "Migrations directory not found"
fi

# 6. Check Prisma schema
log_step "Validating Prisma schema..."
cd backend
if npm run --silent migrate:status 2>&1 | grep -q "Database schema is up to date"; then
    log_info "Database schema is up to date"
elif npm run --silent migrate:status 2>&1 | grep -q "pending migrations"; then
    log_warn "There are pending migrations to apply"
else
    log_info "Migration status checked"
fi
cd ..

# 7. Check for uncommitted changes
log_step "Checking git status..."
if [ -d .git ]; then
    if git diff-index --quiet HEAD --; then
        log_info "No uncommitted changes"
    else
        log_warn "There are uncommitted changes"
        git status --short
    fi
    
    # Check if on correct branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    log_info "Current branch: $CURRENT_BRANCH"
else
    log_warn "Not a git repository"
fi

# 8. Check backup directory
log_step "Checking backup configuration..."
if [ -d "backend/backups" ]; then
    log_info "Backup directory exists"
    
    # Check recent backups
    RECENT_BACKUPS=$(find backend/backups -name "backup_*.sql*" -mtime -7 | wc -l)
    if [ "$RECENT_BACKUPS" -gt 0 ]; then
        log_info "Found $RECENT_BACKUPS backup(s) from last 7 days"
    else
        log_warn "No recent backups found (last 7 days)"
    fi
else
    log_warn "Backup directory not found"
fi

# 9. Check Docker images
log_step "Checking Docker images..."
if docker images | grep -q "liquor-pos"; then
    log_info "Liquor POS Docker images found"
else
    log_warn "No Liquor POS Docker images found (will be built during deployment)"
fi

# 10. Check ports availability
log_step "Checking port availability..."
PORTS=(3000 5432 6379 80)
for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warn "Port $port is already in use"
    else
        log_info "Port $port is available"
    fi
done

# 11. Check SSL certificates (if applicable)
log_step "Checking SSL certificates..."
if [ -f "certs/server.crt" ]; then
    EXPIRY=$(openssl x509 -enddate -noout -in certs/server.crt | cut -d= -f2)
    log_info "SSL certificate expires: $EXPIRY"
else
    log_info "No SSL certificates found (using HTTP)"
fi

# 12. Validate docker-compose.yml
log_step "Validating docker-compose.yml..."
if docker-compose config > /dev/null 2>&1; then
    log_info "docker-compose.yml is valid"
else
    log_error "docker-compose.yml has errors"
fi

# 13. Check Node.js version in backend
log_step "Checking Node.js version..."
if [ -f "backend/package.json" ]; then
    REQUIRED_NODE=$(cat backend/package.json | grep -o '"node": "[^"]*"' | cut -d'"' -f4 || echo "")
    if [ -n "$REQUIRED_NODE" ]; then
        log_info "Required Node.js version: $REQUIRED_NODE"
    fi
fi

# 14. Check for security vulnerabilities
log_step "Checking for security vulnerabilities..."
cd backend
if command -v npm &> /dev/null; then
    AUDIT_RESULT=$(npm audit --audit-level=high 2>&1 || true)
    if echo "$AUDIT_RESULT" | grep -q "found 0 vulnerabilities"; then
        log_info "No high-severity vulnerabilities found"
    else
        HIGH_VULN=$(echo "$AUDIT_RESULT" | grep -o "[0-9]* high" | awk '{print $1}' || echo "0")
        CRITICAL_VULN=$(echo "$AUDIT_RESULT" | grep -o "[0-9]* critical" | awk '{print $1}' || echo "0")
        
        if [ "$CRITICAL_VULN" != "0" ]; then
            log_error "Found $CRITICAL_VULN critical vulnerabilities"
        elif [ "$HIGH_VULN" != "0" ]; then
            log_warn "Found $HIGH_VULN high-severity vulnerabilities"
        fi
    fi
fi
cd ..

# 15. Check database connectivity (if running)
log_step "Checking database connectivity..."
if docker-compose ps postgres 2>/dev/null | grep -q "Up"; then
    if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        log_info "Database is accessible"
    else
        log_error "Database is not responding"
    fi
else
    log_info "Database is not running (will be started during deployment)"
fi

echo ""
echo "========================================"
if [ $VALIDATION_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Validation PASSED${NC}"
    echo "========================================"
    echo ""
    echo "System is ready for deployment"
    exit 0
else
    echo -e "${RED}✗ Validation FAILED${NC}"
    echo "========================================"
    echo ""
    echo "Please fix the errors above before deploying"
    exit 1
fi

