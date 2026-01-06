#!/bin/bash

# =============================================================================
# Liquor POS System - Production Deployment Script
# =============================================================================
# Usage: ./deploy.sh [environment] [--skip-backup] [--dry-run] [--version VERSION]
# Example: ./deploy.sh production
# Example: ./deploy.sh staging --skip-backup
# Example: ./deploy.sh production --version v1.2.3

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
BACKUP_DIR="./backend/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="deployment_${TIMESTAMP}.log"
DEPLOYMENT_LOCK=".deployment.lock"
SKIP_BACKUP=false
DRY_RUN=false
VERSION=""

# Functions (defined before argument parsing)
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1" | tee -a "$LOG_FILE"
}

# Parse command line arguments
shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

check_deployment_lock() {
    if [ -f "$DEPLOYMENT_LOCK" ]; then
        LOCK_INFO=$(cat "$DEPLOYMENT_LOCK")
        LOCK_TIME=$(echo "$LOCK_INFO" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4)
        LOCK_USER=$(echo "$LOCK_INFO" | grep -o '"user":"[^"]*"' | cut -d'"' -f4)
        
        # Check if lock is older than 30 minutes
        if [ -n "$LOCK_TIME" ]; then
            LOCK_AGE=$(($(date +%s) - $(date -d "$LOCK_TIME" +%s 2>/dev/null || echo 0)))
            if [ "$LOCK_AGE" -lt 1800 ]; then
                log_error "Deployment already in progress (started by $LOCK_USER at $LOCK_TIME)"
                log_error "If this is a stale lock, delete $DEPLOYMENT_LOCK manually"
                exit 1
            else
                log_warn "Removing stale deployment lock (older than 30 minutes)"
                rm -f "$DEPLOYMENT_LOCK"
            fi
        fi
    fi
    
    # Create lock
    echo "{\"user\":\"$USER\",\"timestamp\":\"$(date -Iseconds)\",\"environment\":\"$ENVIRONMENT\"}" > "$DEPLOYMENT_LOCK"
    log_info "Deployment lock acquired"
}

remove_deployment_lock() {
    rm -f "$DEPLOYMENT_LOCK"
    log_info "Deployment lock released"
}

get_deployment_version() {
    if [ -n "$VERSION" ]; then
        echo "$VERSION"
        return
    fi
    
    # Try to get from git
    if [ -d .git ]; then
        GIT_VERSION=$(git describe --tags --always 2>/dev/null || echo "")
        if [ -n "$GIT_VERSION" ]; then
            echo "$GIT_VERSION"
            return
        fi
    fi
    
    # Fallback to timestamp
    echo "v$TIMESTAMP"
}

run_pre_deployment_validation() {
    log_step "Running pre-deployment validation..."
    
    if [ -f "./scripts/pre-deploy-validation.sh" ]; then
        if bash ./scripts/pre-deploy-validation.sh; then
            log_info "Pre-deployment validation passed ✓"
        else
            log_error "Pre-deployment validation failed"
            exit 1
        fi
    else
        log_warn "Pre-deployment validation script not found, skipping"
    fi
}

check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check .env file
    if [ ! -f .env ]; then
        log_error ".env file not found. Copy ENV_TEMPLATE.txt or .env.example and configure it."
        exit 1
    fi
    
    # Validate required environment variables
    source .env
    if [ -z "${JWT_SECRET:-}" ]; then
        log_error "JWT_SECRET not set in .env"
        exit 1
    fi
    
    if [ -z "${AUDIT_LOG_ENCRYPTION_KEY:-}" ]; then
        log_error "AUDIT_LOG_ENCRYPTION_KEY not set in .env"
        exit 1
    fi
    
    if [ -z "${DB_PASSWORD:-}" ]; then
        log_error "DB_PASSWORD not set in .env"
        exit 1
    fi
    
    log_info "Prerequisites check passed ✓"
}

backup_database() {
    if [ "$SKIP_BACKUP" = true ]; then
        log_warn "Skipping database backup (--skip-backup flag set)"
        return
    fi
    
    log_step "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Check if database container is running
    if docker-compose ps postgres | grep -q "Up"; then
        # Backup using docker-compose
        docker-compose exec -T postgres pg_dump -U "${DB_USER:-postgres}" "${DB_NAME:-liquor_pos}" > "$BACKUP_DIR/backup_$TIMESTAMP.sql"
        
        if [ $? -eq 0 ]; then
            log_info "Database backup created: $BACKUP_DIR/backup_$TIMESTAMP.sql ✓"
            echo "$BACKUP_DIR/backup_$TIMESTAMP.sql" > .last_backup
        else
            log_error "Database backup failed"
            exit 1
        fi
    else
        log_warn "Database not running, skipping backup"
    fi
}

pull_latest_code() {
    log_step "Pulling latest code..."
    
    # Check if git repo
    if [ -d .git ]; then
        git fetch origin
        CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
        log_info "Current branch: $CURRENT_BRANCH"
        
        # Pull latest changes
        git pull origin "$CURRENT_BRANCH"
        
        if [ $? -eq 0 ]; then
            log_info "Code updated successfully ✓"
        else
            log_error "Failed to pull latest code"
            exit 1
        fi
    else
        log_warn "Not a git repository, skipping code pull"
    fi
}

build_images() {
    log_step "Building Docker images..."
    
    docker-compose build --no-cache
    
    if [ $? -eq 0 ]; then
        log_info "Images built successfully ✓"
    else
        log_error "Image build failed"
        exit 1
    fi
}

run_migrations() {
    log_step "Running database migrations..."
    
    # Start database if not running
    docker-compose up -d postgres
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    MAX_RETRIES=30
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if docker-compose exec -T postgres pg_isready -U "${DB_USER:-postgres}" > /dev/null 2>&1; then
            log_info "Database is ready ✓"
            break
        else
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                log_warn "Database not ready yet, retrying... ($RETRY_COUNT/$MAX_RETRIES)"
                sleep 2
            fi
        fi
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "Database failed to start"
        exit 1
    fi
    
    # Run migrations
    docker-compose exec -T backend npm run migrate:deploy
    
    if [ $? -eq 0 ]; then
        log_info "Migrations completed ✓"
    else
        log_error "Migrations failed"
        log_warn "Rolling back..."
        rollback_deployment
        exit 1
    fi
}

deploy_services() {
    log_step "Deploying services..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY RUN: Would deploy services now"
        return
    fi
    
    # Stop old containers gracefully
    docker-compose down --timeout 30
    
    # Start new containers
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        log_info "Services deployed ✓"
    else
        log_error "Deployment failed"
        rollback_deployment
        exit 1
    fi
}

health_check() {
    log_step "Running health checks..."
    
    # Wait for services to initialize
    log_info "Waiting for services to start..."
    sleep 15
    
    # Check backend health
    MAX_RETRIES=10
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log_info "Backend health check passed ✓"
            break
        else
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                log_warn "Backend not ready yet, retrying... ($RETRY_COUNT/$MAX_RETRIES)"
                sleep 5
            fi
        fi
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "Backend health check failed after $MAX_RETRIES attempts"
        docker-compose logs --tail=50 backend
        rollback_deployment
        exit 1
    fi
    
    # Check frontend health (try root endpoint if /health doesn't exist)
    if curl -f http://localhost/ > /dev/null 2>&1; then
        log_info "Frontend health check passed ✓"
    else
        log_warn "Frontend health check failed (may need more time or endpoint doesn't exist)"
    fi
    
    # Check all services status
    log_info "Services status:"
    docker-compose ps
}

run_smoke_tests() {
    log_step "Running smoke tests..."
    
    if [ -f "./scripts/smoke-tests.sh" ]; then
        if bash ./scripts/smoke-tests.sh; then
            log_info "Smoke tests passed ✓"
        else
            log_error "Smoke tests failed"
            rollback_deployment
            exit 1
        fi
    else
        log_warn "Smoke tests script not found, skipping"
    fi
}

tag_deployment() {
    local VERSION=$1
    log_step "Tagging deployment..."
    
    # Create deployment tag file
    cat > .deployment_tag << EOF
{
  "version": "$VERSION",
  "environment": "$ENVIRONMENT",
  "timestamp": "$(date -Iseconds)",
  "user": "$USER",
  "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
}
EOF
    
    log_info "Deployment tagged: $VERSION"
}

cleanup_old_images() {
    log_step "Cleaning up old Docker images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old backups (keep last 30 days)
    find "$BACKUP_DIR" -name "backup_*.sql" -mtime +30 -delete
    
    log_info "Cleanup completed ✓"
}

rollback_deployment() {
    log_error "Deployment failed, initiating rollback..."
    
    if [ -f .last_backup ]; then
        LAST_BACKUP=$(cat .last_backup)
        log_warn "To rollback database, run: ./rollback.sh $LAST_BACKUP"
    fi
    
    # Stop failed containers
    docker-compose down
    
    log_error "Rollback initiated. Please check logs and fix issues."
}

send_notification() {
    local STATUS=$1
    local MESSAGE=$2
    
    log_step "Sending deployment notification..."
    
    # Send to webhook if configured
    if [ -n "${DEPLOYMENT_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
          --data "{\"text\":\"Deployment $STATUS: $MESSAGE\",\"environment\":\"$ENVIRONMENT\",\"version\":\"$DEPLOY_VERSION\"}" \
          "$DEPLOYMENT_WEBHOOK_URL" > /dev/null 2>&1 || log_warn "Failed to send webhook notification"
    fi
    
    log_info "Notification sent (status: $STATUS)"
}

# Main deployment flow
main() {
    DEPLOY_VERSION=$(get_deployment_version)
    
    log_info "========================================="
    log_info "Starting deployment to $ENVIRONMENT..."
    log_info "Version: $DEPLOY_VERSION"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Dry Run: $DRY_RUN"
    log_info "========================================="
    echo ""
    
    check_deployment_lock
    check_prerequisites
    run_pre_deployment_validation
    backup_database
    pull_latest_code
    build_images
    run_migrations
    deploy_services
    health_check
    run_smoke_tests
    cleanup_old_images
    tag_deployment "$DEPLOY_VERSION"
    
    echo ""
    log_info "========================================="
    log_info "Deployment completed successfully! 🎉"
    log_info "========================================="
    echo ""
    log_info "Version: $DEPLOY_VERSION"
    log_info "Services:"
    log_info "  - Frontend: http://localhost"
    log_info "  - Backend:  http://localhost:3000"
    log_info "  - API Docs: http://localhost:3000/api"
    echo ""
    log_info "Useful commands:"
    log_info "  - View logs:     docker-compose logs -f"
    log_info "  - Stop services: docker-compose down"
    log_info "  - Restart:       docker-compose restart"
    log_info "  - Rollback:      ./rollback.sh $(cat .last_backup 2>/dev/null || echo 'backup_file')"
    echo ""
    log_info "Deployment log saved to: $LOG_FILE"
    
    send_notification "SUCCESS" "Deployment to $ENVIRONMENT completed successfully (version: $DEPLOY_VERSION)"
    
    remove_deployment_lock
}

# Trap errors and cleanup
trap 'log_error "Deployment failed at line $LINENO"; rollback_deployment; remove_deployment_lock; exit 1' ERR

# Run main function
main

