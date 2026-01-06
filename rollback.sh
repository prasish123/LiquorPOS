#!/bin/bash

# =============================================================================
# Liquor POS System - Rollback Script
# =============================================================================
# Usage: ./rollback.sh [backup_file]
# Example: ./rollback.sh ./backend/backups/backup_20260105_120000.sql

set -e
set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if backup file is provided
if [ -z "${1:-}" ]; then
    log_error "Usage: ./rollback.sh <backup_file>"
    echo ""
    log_info "Available backups:"
    ls -lh ./backend/backups/*.sql 2>/dev/null || log_warn "No backups found"
    exit 1
fi

BACKUP_FILE=$1

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log_warn "========================================="
log_warn "WARNING: Database Rollback"
log_warn "========================================="
log_warn "This will restore the database from:"
log_warn "  $BACKUP_FILE"
log_warn ""
log_warn "Current data will be LOST!"
log_warn "========================================="
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
echo

if [[ ! $REPLY == "yes" ]]; then
    log_info "Rollback cancelled"
    exit 0
fi

log_step "Starting rollback process..."

# Create a backup of current state before rollback
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PRE_ROLLBACK_BACKUP="./backend/backups/pre_rollback_$TIMESTAMP.sql"

log_step "Creating backup of current state..."
if docker-compose ps postgres | grep -q "Up"; then
    docker-compose exec -T postgres pg_dump -U "${DB_USER:-postgres}" "${DB_NAME:-liquor_pos}" > "$PRE_ROLLBACK_BACKUP"
    log_info "Pre-rollback backup saved: $PRE_ROLLBACK_BACKUP"
fi

# Stop services
log_step "Stopping services..."
docker-compose down

# Start only database
log_step "Starting database..."
docker-compose up -d postgres
sleep 10

# Wait for database to be ready
log_step "Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose exec -T postgres pg_isready -U "${DB_USER:-postgres}" > /dev/null 2>&1; then
        log_info "Database is ready ✓"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        log_warn "Database not ready yet, retrying... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "Database failed to start"
    exit 1
fi

# Drop and recreate database
log_step "Dropping and recreating database..."
docker-compose exec -T postgres psql -U "${DB_USER:-postgres}" -c "DROP DATABASE IF EXISTS ${DB_NAME:-liquor_pos};"
docker-compose exec -T postgres psql -U "${DB_USER:-postgres}" -c "CREATE DATABASE ${DB_NAME:-liquor_pos};"

# Restore database
log_step "Restoring database from $BACKUP_FILE..."
docker-compose exec -T postgres psql -U "${DB_USER:-postgres}" -d "${DB_NAME:-liquor_pos}" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    log_info "Database restored successfully ✓"
else
    log_error "Database restore failed"
    log_error "You can restore from pre-rollback backup: $PRE_ROLLBACK_BACKUP"
    exit 1
fi

# Restart all services
log_step "Restarting all services..."
docker-compose down
docker-compose up -d

# Wait for services
log_step "Waiting for services to start..."
sleep 15

# Health check
log_step "Running health checks..."
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_info "Backend health check passed ✓"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        log_warn "Backend not ready yet, retrying... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 3
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "Health check failed after rollback"
    docker-compose logs backend
    exit 1
fi

if curl -f http://localhost/health > /dev/null 2>&1; then
    log_info "Frontend health check passed ✓"
else
    log_warn "Frontend health check failed (may need more time)"
fi

echo ""
log_info "========================================="
log_info "Rollback completed successfully! ✓"
log_info "========================================="
echo ""
log_info "Database restored from: $BACKUP_FILE"
log_info "Pre-rollback backup saved to: $PRE_ROLLBACK_BACKUP"
echo ""
log_info "Services status:"
docker-compose ps
echo ""
log_info "View logs: docker-compose logs -f"

