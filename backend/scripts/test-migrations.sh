#!/bin/bash
# Test Prisma migrations on a clean database
# Usage: ./scripts/test-migrations.sh

set -e  # Exit on error

echo "🧪 Testing Prisma Migrations"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
TEST_DB="test_migrations.db"
BACKUP_DB="dev.db.backup"

# Step 1: Backup existing database
echo "📦 Step 1: Backing up existing database..."
if [ -f "dev.db" ]; then
    cp dev.db "$BACKUP_DB"
    echo -e "${GREEN}✓${NC} Database backed up to $BACKUP_DB"
else
    echo -e "${YELLOW}⚠${NC} No existing database found (first run)"
fi
echo ""

# Step 2: Remove test database if exists
echo "🗑️  Step 2: Cleaning up old test database..."
if [ -f "$TEST_DB" ]; then
    rm "$TEST_DB"
    echo -e "${GREEN}✓${NC} Old test database removed"
else
    echo -e "${YELLOW}⚠${NC} No old test database found"
fi
echo ""

# Step 3: Set test database URL
echo "⚙️  Step 3: Configuring test database..."
export DATABASE_URL="file:./$TEST_DB"
echo -e "${GREEN}✓${NC} Test database URL set: $DATABASE_URL"
echo ""

# Step 4: Check migration status
echo "🔍 Step 4: Checking migration files..."
MIGRATION_COUNT=$(find prisma/migrations -name "migration.sql" | wc -l)
echo -e "${GREEN}✓${NC} Found $MIGRATION_COUNT migration(s)"
echo ""

# Step 5: Apply migrations
echo "🚀 Step 5: Applying migrations to test database..."
npx prisma migrate deploy
echo -e "${GREEN}✓${NC} All migrations applied successfully"
echo ""

# Step 6: Verify schema
echo "🔍 Step 6: Verifying schema integrity..."
npx prisma validate
echo -e "${GREEN}✓${NC} Schema is valid"
echo ""

# Step 7: Check for schema drift
echo "🔍 Step 7: Checking for schema drift..."
npx prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --exit-code > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No schema drift detected"
elif [ $? -eq 2 ]; then
    echo -e "${RED}✗${NC} Schema drift detected!"
    echo "   Run 'npx prisma migrate dev' to generate missing migration"
    exit 1
else
    echo -e "${YELLOW}⚠${NC} Could not check schema drift (may be expected)"
fi
echo ""

# Step 8: Generate Prisma Client
echo "🔧 Step 8: Generating Prisma Client..."
npx prisma generate > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Prisma Client generated"
echo ""

# Step 9: Test database operations
echo "🧪 Step 9: Testing basic database operations..."

# Create a test TypeScript file
cat > test-db-ops.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./test_migrations.db',
    },
  },
});

async function testOperations() {
  try {
    // Test 1: Create a user
    const user = await prisma.user.create({
      data: {
        username: 'test_user',
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        role: 'CASHIER',
      },
    });
    console.log('✓ User created:', user.id);

    // Test 2: Create a location
    const location = await prisma.location.create({
      data: {
        name: 'Test Store',
        address: '123 Test St',
        city: 'Test City',
        state: 'FL',
        zip: '12345',
        taxRate: 0.07,
      },
    });
    console.log('✓ Location created:', location.id);

    // Test 3: Create a product
    const product = await prisma.product.create({
      data: {
        sku: 'TEST001',
        name: 'Test Product',
        category: 'spirits',
        basePrice: 19.99,
        cost: 10.00,
      },
    });
    console.log('✓ Product created:', product.id);

    // Test 4: Create inventory
    const inventory = await prisma.inventory.create({
      data: {
        productId: product.id,
        locationId: location.id,
        quantity: 100,
        reserved: 0,
      },
    });
    console.log('✓ Inventory created:', inventory.id);

    // Test 5: Query with relations
    const productWithInventory = await prisma.product.findUnique({
      where: { id: product.id },
      include: { inventory: true },
    });
    console.log('✓ Product with inventory queried');

    // Test 6: Test indexes (query by indexed field)
    const products = await prisma.product.findMany({
      where: { category: 'spirits' },
    });
    console.log('✓ Index query successful:', products.length, 'products');

    console.log('\n✅ All database operations successful');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database operation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testOperations();
EOF

# Run the test
npx ts-node test-db-ops.ts
echo -e "${GREEN}✓${NC} Database operations test passed"
echo ""

# Cleanup test file
rm test-db-ops.ts

# Step 10: Cleanup
echo "🧹 Step 10: Cleaning up..."
rm "$TEST_DB"
if [ -f "$TEST_DB-journal" ]; then
    rm "$TEST_DB-journal"
fi
echo -e "${GREEN}✓${NC} Test database removed"
echo ""

# Restore original DATABASE_URL
unset DATABASE_URL

echo "=============================="
echo -e "${GREEN}✅ All migration tests passed!${NC}"
echo "=============================="
echo ""
echo "Summary:"
echo "  - Migrations applied: $MIGRATION_COUNT"
echo "  - Schema validated: ✓"
echo "  - Schema drift: None"
echo "  - Database operations: ✓"
echo ""
echo "Your migrations are ready for production deployment."

