#!/bin/bash
# Rollback a Prisma migration
# Usage: ./scripts/rollback-migration.sh <migration_name>

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if migration name provided
if [ -z "$1" ]; then
    echo -e "${RED}Error:${NC} Migration name required"
    echo ""
    echo "Usage: $0 <migration_name>"
    echo ""
    echo "Example:"
    echo "  $0 20260102120000_add_loyalty_program"
    echo ""
    echo "Available migrations:"
    ls -1 prisma/migrations/ | grep -v migration_lock.toml
    exit 1
fi

MIGRATION_NAME="$1"
MIGRATION_DIR="prisma/migrations/$MIGRATION_NAME"

# Check if migration exists
if [ ! -d "$MIGRATION_DIR" ]; then
    echo -e "${RED}Error:${NC} Migration not found: $MIGRATION_NAME"
    echo ""
    echo "Available migrations:"
    ls -1 prisma/migrations/ | grep -v migration_lock.toml
    exit 1
fi

echo "⚠️  Migration Rollback"
echo "=============================="
echo ""
echo -e "${YELLOW}WARNING:${NC} You are about to rollback a migration!"
echo "Migration: $MIGRATION_NAME"
echo ""
echo "This will:"
echo "  1. Mark the migration as rolled back in Prisma"
echo "  2. Require manual SQL to reverse database changes"
echo "  3. Potentially cause data loss"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Step 1: Backup database
echo ""
echo "📦 Step 1: Backing up database..."
BACKUP_FILE="dev.db.backup.$(date +%Y%m%d_%H%M%S)"
if [ -f "dev.db" ]; then
    cp dev.db "$BACKUP_FILE"
    echo -e "${GREEN}✓${NC} Database backed up to $BACKUP_FILE"
else
    echo -e "${YELLOW}⚠${NC} No database found to backup"
fi

# Step 2: Show migration SQL
echo ""
echo "📄 Step 2: Migration SQL to reverse:"
echo "=============================="
cat "$MIGRATION_DIR/migration.sql"
echo "=============================="
echo ""

# Step 3: Create rollback SQL
echo "📝 Step 3: Creating rollback SQL..."
echo ""
echo "You need to manually write the rollback SQL."
echo "Common rollback operations:"
echo ""
echo "  ALTER TABLE -> DROP TABLE"
echo "  ADD COLUMN -> DROP COLUMN"
echo "  CREATE INDEX -> DROP INDEX"
echo "  ADD CONSTRAINT -> DROP CONSTRAINT"
echo ""

ROLLBACK_FILE="rollback_${MIGRATION_NAME}.sql"
read -p "Enter path to rollback SQL file (or press Enter to create): " ROLLBACK_PATH

if [ -z "$ROLLBACK_PATH" ]; then
    echo "Creating template rollback file: $ROLLBACK_FILE"
    cat > "$ROLLBACK_FILE" << EOF
-- Rollback for migration: $MIGRATION_NAME
-- Created: $(date)
-- 
-- INSTRUCTIONS:
-- 1. Write SQL to reverse the migration
-- 2. Test on a backup database first
-- 3. Apply to production database
-- 
-- Example rollback operations:
-- DROP TABLE IF EXISTS "NewTable";
-- ALTER TABLE "ExistingTable" DROP COLUMN "newColumn";
-- DROP INDEX IF EXISTS "NewIndex";

-- Your rollback SQL here:

EOF
    echo ""
    echo -e "${YELLOW}⚠${NC} Please edit $ROLLBACK_FILE with rollback SQL"
    echo "Then run: sqlite3 dev.db < $ROLLBACK_FILE"
    echo ""
    read -p "Press Enter after editing rollback SQL..."
    ROLLBACK_PATH="$ROLLBACK_FILE"
fi

# Step 4: Apply rollback SQL
echo ""
echo "🔄 Step 4: Applying rollback SQL..."
read -p "Apply rollback SQL now? (yes/no): " APPLY

if [ "$APPLY" == "yes" ]; then
    if [ -f "$ROLLBACK_PATH" ]; then
        sqlite3 dev.db < "$ROLLBACK_PATH"
        echo -e "${GREEN}✓${NC} Rollback SQL applied"
    else
        echo -e "${RED}✗${NC} Rollback file not found: $ROLLBACK_PATH"
        exit 1
    fi
else
    echo "Skipping rollback SQL application"
    echo "Apply manually: sqlite3 dev.db < $ROLLBACK_PATH"
fi

# Step 5: Mark migration as rolled back
echo ""
echo "📋 Step 5: Marking migration as rolled back in Prisma..."
npx prisma migrate resolve --rolled-back "$MIGRATION_NAME"
echo -e "${GREEN}✓${NC} Migration marked as rolled back"

# Step 6: Verify status
echo ""
echo "🔍 Step 6: Verifying migration status..."
npx prisma migrate status

echo ""
echo "=============================="
echo -e "${GREEN}✅ Rollback complete${NC}"
echo "=============================="
echo ""
echo "Summary:"
echo "  - Backup: $BACKUP_FILE"
echo "  - Rollback SQL: $ROLLBACK_PATH"
echo "  - Migration status: Rolled back"
echo ""
echo "Next steps:"
echo "  1. Verify application works correctly"
echo "  2. Remove migration files if needed:"
echo "     rm -rf $MIGRATION_DIR"
echo "  3. Commit changes to Git"
echo ""
echo -e "${YELLOW}Note:${NC} To create a forward fix instead, run:"
echo "  npx prisma migrate dev --name fix_$MIGRATION_NAME"

