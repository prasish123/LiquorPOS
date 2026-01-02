#!/bin/bash
# Check migration status and schema drift
# Usage: ./scripts/check-migrations.sh

set -e

echo "🔍 Checking Migration Status"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Check if migrations directory exists
if [ ! -d "prisma/migrations" ]; then
    echo -e "${RED}✗${NC} No migrations directory found!"
    echo "   Run 'npx prisma migrate dev' to create initial migration"
    exit 1
fi

# Step 2: Count migrations
MIGRATION_COUNT=$(find prisma/migrations -name "migration.sql" | wc -l)
echo -e "${GREEN}✓${NC} Found $MIGRATION_COUNT migration(s)"
echo ""

# Step 3: Check migration lock file
if [ ! -f "prisma/migrations/migration_lock.toml" ]; then
    echo -e "${YELLOW}⚠${NC} No migration_lock.toml found"
    echo "   This file should be committed to Git"
else
    echo -e "${GREEN}✓${NC} migration_lock.toml exists"
fi
echo ""

# Step 4: Validate schema
echo "Validating Prisma schema..."
npx prisma validate
echo -e "${GREEN}✓${NC} Schema is valid"
echo ""

# Step 5: Check for schema drift
echo "Checking for schema drift..."
npx prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --exit-code > /dev/null 2>&1

DRIFT_EXIT_CODE=$?

if [ $DRIFT_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No schema drift detected"
elif [ $DRIFT_EXIT_CODE -eq 2 ]; then
    echo -e "${RED}✗${NC} Schema drift detected!"
    echo ""
    echo "Your database schema doesn't match your migration history."
    echo "This means you've made changes to schema.prisma without creating a migration."
    echo ""
    echo "To fix:"
    echo "  1. Run: npx prisma migrate dev --name describe_your_changes"
    echo "  2. Review the generated SQL"
    echo "  3. Commit the new migration files"
    exit 1
else
    echo -e "${YELLOW}⚠${NC} Could not check schema drift"
fi
echo ""

# Step 6: Check migration status
echo "Checking migration status..."
npx prisma migrate status

echo ""
echo "=============================="
echo -e "${GREEN}✅ Migration check complete${NC}"
echo "=============================="

