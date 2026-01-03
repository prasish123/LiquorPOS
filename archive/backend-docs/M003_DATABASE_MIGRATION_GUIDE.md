# Database Migration Strategy Guide

## Overview

The POS-Omni system uses **Prisma Migrate** for database schema management with:
- ✅ Version-controlled migration files
- ✅ Automatic migration generation from schema changes
- ✅ Migration history tracking
- ✅ Rollback procedures
- ✅ CI/CD integration for migration testing
- ✅ Safe deployment strategies

---

## Quick Start

### Creating a New Migration

```bash
# 1. Modify prisma/schema.prisma
# 2. Generate migration
npx prisma migrate dev --name add_user_roles

# 3. Review generated SQL in prisma/migrations/
# 4. Test migration locally
# 5. Commit migration files to Git
```

### Applying Migrations

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

---

## Migration Directory Structure

```
prisma/
├── schema.prisma                    # Source of truth
├── migrations/
│   ├── migration_lock.toml          # Provider lock file
│   ├── 20260101215810_initial_schema/
│   │   └── migration.sql            # SQL migration
│   ├── 20260102120000_add_tax_rates/
│   │   └── migration.sql
│   └── 20260103150000_add_logging/
│       └── migration.sql
└── seed.ts                          # Seed data
```

**Important:**
- ✅ All files in `migrations/` must be committed to Git
- ✅ Never edit migration files after they're committed
- ✅ Migration names are timestamped for ordering
- ✅ `migration_lock.toml` ensures provider consistency

---

## Migration Workflow

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/add-loyalty-program

# 2. Modify schema
# Add new fields to prisma/schema.prisma

# 3. Generate migration
npx prisma migrate dev --name add_loyalty_program

# Output:
# ✔ Prisma Migrate created and applied migration:
#   migrations/20260102120000_add_loyalty_program/migration.sql

# 4. Review generated SQL
cat prisma/migrations/20260102120000_add_loyalty_program/migration.sql

# 5. Test application with new schema
npm test

# 6. Commit migration files
git add prisma/migrations/
git add prisma/schema.prisma
git commit -m "feat: add loyalty program schema"

# 7. Push to remote
git push origin feature/add-loyalty-program
```

### Production Deployment Workflow

```bash
# 1. Pull latest code
git pull origin main

# 2. Review pending migrations
npx prisma migrate status

# Output:
# Database schema is not up to date:
# - 20260102120000_add_loyalty_program (pending)

# 3. Backup database (CRITICAL)
./scripts/backup-database.sh

# 4. Apply migrations
npx prisma migrate deploy

# Output:
# ✔ Applied migration: 20260102120000_add_loyalty_program

# 5. Verify application
npm run start:prod
```

---

## Migration Commands

### Development Commands

#### `npx prisma migrate dev`
**Purpose:** Create and apply migrations in development  
**When to use:** Local development, feature branches  
**What it does:**
- Generates migration from schema changes
- Applies migration to database
- Regenerates Prisma Client
- Updates `_prisma_migrations` table

```bash
# Create named migration
npx prisma migrate dev --name add_user_roles

# Create migration without applying
npx prisma migrate dev --create-only

# Skip seed data
npx prisma migrate dev --skip-seed
```

#### `npx prisma migrate reset`
**Purpose:** Reset database to initial state  
**When to use:** Local development only (NEVER production)  
**What it does:**
- Drops database
- Recreates database
- Applies all migrations
- Runs seed data

```bash
# Reset database (DESTRUCTIVE)
npx prisma migrate reset

# Reset without confirmation
npx prisma migrate reset --force
```

### Production Commands

#### `npx prisma migrate deploy`
**Purpose:** Apply pending migrations in production  
**When to use:** Production deployments, staging, CI/CD  
**What it does:**
- Applies pending migrations only
- Does NOT generate new migrations
- Does NOT reset database
- Safe for production

```bash
# Apply pending migrations
npx prisma migrate deploy
```

#### `npx prisma migrate status`
**Purpose:** Check migration status  
**When to use:** Before deployments, troubleshooting  
**What it does:**
- Shows applied migrations
- Shows pending migrations
- Detects schema drift

```bash
# Check migration status
npx prisma migrate status

# Output examples:
# ✔ Database schema is up to date!
# ⚠ Database schema is not up to date (2 pending migrations)
# ⚠ Schema drift detected
```

### Utility Commands

#### `npx prisma migrate diff`
**Purpose:** Generate SQL diff between states  
**When to use:** Custom migrations, troubleshooting

```bash
# Diff from empty to current schema
npx prisma migrate diff \
  --from-empty \
  --to-schema prisma/schema.prisma \
  --script

# Diff from current database to schema
npx prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --script
```

#### `npx prisma migrate resolve`
**Purpose:** Mark migration as applied/rolled back  
**When to use:** Manual intervention, fixing migration state

```bash
# Mark migration as applied (without running it)
npx prisma migrate resolve --applied 20260102120000_add_loyalty_program

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back 20260102120000_add_loyalty_program
```

---

## Best Practices

### 1. Always Review Generated SQL

```bash
# After generating migration
npx prisma migrate dev --name my_migration --create-only

# Review SQL before applying
cat prisma/migrations/*/migration.sql

# If OK, apply
npx prisma migrate dev
```

**Why:** Prisma generates SQL automatically, but you should verify:
- ✅ No data loss (e.g., dropping columns)
- ✅ Correct indexes created
- ✅ Foreign keys properly set
- ✅ Default values appropriate

### 2. Use Descriptive Migration Names

```bash
# ✅ Good names
npx prisma migrate dev --name add_loyalty_program
npx prisma migrate dev --name add_tax_rate_to_locations
npx prisma migrate dev --name create_audit_log_indexes

# ❌ Bad names
npx prisma migrate dev --name update
npx prisma migrate dev --name fix
npx prisma migrate dev --name changes
```

### 3. One Logical Change Per Migration

```bash
# ✅ Good: Single logical change
# Migration 1: Add loyalty program
# Migration 2: Add tax rates
# Migration 3: Add audit indexes

# ❌ Bad: Multiple unrelated changes
# Migration 1: Add loyalty + tax rates + audit indexes
```

**Why:** Easier to review, test, and rollback

### 4. Never Edit Committed Migrations

```bash
# ❌ NEVER do this
git checkout main
# Edit prisma/migrations/20260102120000_add_loyalty/migration.sql
git commit -m "fix migration"

# ✅ Instead, create a new migration
npx prisma migrate dev --name fix_loyalty_program
```

**Why:** Migrations are applied based on checksum. Editing breaks migration history.

### 5. Always Backup Before Production Migration

```bash
# CRITICAL: Backup before migration
./scripts/backup-database.sh

# Then apply migration
npx prisma migrate deploy
```

### 6. Test Migrations on Staging First

```bash
# 1. Deploy to staging
ssh staging
git pull
npx prisma migrate deploy

# 2. Test application
npm test
./scripts/smoke-test.sh

# 3. If OK, deploy to production
ssh production
git pull
./scripts/backup-database.sh
npx prisma migrate deploy
```

### 7. Handle Data Migrations Carefully

For migrations that require data transformation:

```sql
-- migration.sql
-- Step 1: Add new column (nullable)
ALTER TABLE "User" ADD COLUMN "fullName" TEXT;

-- Step 2: Populate from existing data
UPDATE "User" SET "fullName" = "firstName" || ' ' || "lastName";

-- Step 3: Make non-nullable (if required)
-- Do this in a separate migration after verifying data
```

### 8. Use Transactions for Safety

Prisma Migrate wraps migrations in transactions automatically (SQLite, PostgreSQL).

For manual migrations:

```sql
BEGIN TRANSACTION;

-- Your migration SQL here
ALTER TABLE "Product" ADD COLUMN "featured" BOOLEAN DEFAULT false;
UPDATE "Product" SET "featured" = false WHERE "featured" IS NULL;

COMMIT;
```

---

## Rollback Procedures

### Scenario 1: Migration Not Yet Applied

```bash
# Simply don't apply it
# Delete migration files if needed
rm -rf prisma/migrations/20260102120000_bad_migration/
git reset HEAD prisma/migrations/
```

### Scenario 2: Migration Applied Locally (Dev)

```bash
# Reset database
npx prisma migrate reset

# Or manually rollback
# 1. Drop changes manually
# 2. Mark migration as rolled back
npx prisma migrate resolve --rolled-back 20260102120000_bad_migration
```

### Scenario 3: Migration Applied in Production

**Option A: Forward Fix (Recommended)**

```bash
# Create new migration to fix issue
npx prisma migrate dev --name fix_previous_migration

# Deploy fix
npx prisma migrate deploy
```

**Option B: Manual Rollback (Use with caution)**

```bash
# 1. Backup database
./scripts/backup-database.sh

# 2. Manually write rollback SQL
cat > rollback.sql << 'EOF'
-- Reverse the migration
ALTER TABLE "User" DROP COLUMN "badColumn";
EOF

# 3. Apply rollback
sqlite3 dev.db < rollback.sql

# 4. Mark migration as rolled back
npx prisma migrate resolve --rolled-back 20260102120000_bad_migration

# 5. Remove migration files
rm -rf prisma/migrations/20260102120000_bad_migration/
git add prisma/migrations/
git commit -m "rollback: remove bad migration"
```

---

## Common Migration Scenarios

### Adding a Column

```prisma
// schema.prisma
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  email     String?  // ← New column (nullable)
}
```

```bash
npx prisma migrate dev --name add_user_email
```

Generated SQL:
```sql
ALTER TABLE "User" ADD COLUMN "email" TEXT;
```

### Adding a Required Column (with default)

```prisma
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  status    String   @default("active")  // ← New required column
}
```

```bash
npx prisma migrate dev --name add_user_status
```

Generated SQL:
```sql
ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
```

### Renaming a Column

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique  // Renamed from username
}
```

```bash
# Prisma cannot detect renames automatically
# You need to create a custom migration

npx prisma migrate dev --name rename_username_to_email --create-only

# Edit migration.sql manually:
# ALTER TABLE "User" RENAME COLUMN "username" TO "email";

npx prisma migrate dev
```

### Adding an Index

```prisma
model Transaction {
  id         String   @id @default(uuid())
  locationId String
  createdAt  DateTime @default(now())
  
  @@index([locationId, createdAt])  // ← New composite index
}
```

```bash
npx prisma migrate dev --name add_transaction_composite_index
```

Generated SQL:
```sql
CREATE INDEX "Transaction_locationId_createdAt_idx" 
ON "Transaction"("locationId", "createdAt");
```

### Adding a Relation

```prisma
model Order {
  id         String   @id @default(uuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
}

model Customer {
  id     String  @id @default(uuid())
  orders Order[]
}
```

```bash
npx prisma migrate dev --name add_order_customer_relation
```

Generated SQL:
```sql
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" 
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test Migrations

on: [push, pull_request]

jobs:
  test-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm install
      
      - name: Check migration status
        run: |
          cd backend
          npx prisma migrate diff \
            --from-empty \
            --to-schema prisma/schema.prisma \
            --script > /tmp/expected.sql
          
          npx prisma migrate diff \
            --from-empty \
            --to-migrations prisma/migrations \
            --script > /tmp/actual.sql
          
          diff /tmp/expected.sql /tmp/actual.sql
      
      - name: Test migrations on clean database
        run: |
          cd backend
          rm -f dev.db
          npx prisma migrate deploy
          npx prisma db seed
      
      - name: Run tests
        run: |
          cd backend
          npm test
```

### Pre-Deployment Check Script

```bash
#!/bin/bash
# scripts/check-migrations.sh

set -e

echo "Checking migration status..."
npx prisma migrate status

echo "Checking for schema drift..."
npx prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --exit-code

if [ $? -eq 2 ]; then
  echo "❌ Schema drift detected!"
  echo "Run 'npx prisma migrate dev' to generate migration"
  exit 1
fi

echo "✅ Migrations are up to date"
```

---

## Troubleshooting

### Problem: "Schema drift detected"

**Cause:** Database schema doesn't match migration history

**Solution:**
```bash
# Option 1: Reset database (dev only)
npx prisma migrate reset

# Option 2: Generate migration to fix drift
npx prisma migrate dev --name fix_schema_drift

# Option 3: Mark as resolved (if intentional)
npx prisma migrate resolve --applied <migration_name>
```

### Problem: "Migration failed to apply"

**Cause:** SQL error in migration

**Solution:**
```bash
# 1. Check error message
npx prisma migrate status

# 2. Fix database manually if needed
sqlite3 dev.db

# 3. Mark migration as applied or rolled back
npx prisma migrate resolve --applied <migration_name>
# or
npx prisma migrate resolve --rolled-back <migration_name>

# 4. Create fix migration
npx prisma migrate dev --name fix_migration_issue
```

### Problem: "Cannot find migration files"

**Cause:** Migration files not committed to Git

**Solution:**
```bash
# Ensure all migration files are committed
git add prisma/migrations/
git commit -m "chore: add missing migrations"
git push
```

### Problem: "Migration already applied"

**Cause:** Trying to apply same migration twice

**Solution:**
```bash
# Check status
npx prisma migrate status

# If migration is already applied, no action needed
# If you need to reapply, rollback first
npx prisma migrate resolve --rolled-back <migration_name>
npx prisma migrate deploy
```

---

## Migration Checklist

### Before Creating Migration

- [ ] Schema changes are finalized
- [ ] Breaking changes are documented
- [ ] Data migration strategy is planned
- [ ] Rollback plan is prepared

### After Creating Migration

- [ ] Review generated SQL
- [ ] Test migration locally
- [ ] Run application tests
- [ ] Commit migration files to Git
- [ ] Document breaking changes (if any)

### Before Production Deployment

- [ ] Backup database
- [ ] Test migration on staging
- [ ] Review migration status
- [ ] Notify team of deployment
- [ ] Prepare rollback plan

### After Production Deployment

- [ ] Verify migration applied successfully
- [ ] Run smoke tests
- [ ] Monitor application logs
- [ ] Verify data integrity
- [ ] Document deployment

---

## Summary

**Migration Strategy:**
- ✅ Prisma Migrate for schema management
- ✅ Version-controlled migration files
- ✅ Automatic migration generation
- ✅ Safe production deployment
- ✅ Rollback procedures
- ✅ CI/CD integration

**Key Commands:**
- `npx prisma migrate dev` - Development
- `npx prisma migrate deploy` - Production
- `npx prisma migrate status` - Check status
- `npx prisma migrate reset` - Reset (dev only)

**Best Practices:**
- ✅ Review generated SQL
- ✅ Use descriptive names
- ✅ One change per migration
- ✅ Never edit committed migrations
- ✅ Always backup before production
- ✅ Test on staging first

**Key Files:**
- `prisma/schema.prisma` - Source of truth
- `prisma/migrations/` - Migration history
- `prisma/migrations/migration_lock.toml` - Provider lock

---

**Created:** 2026-01-02  
**Issue:** M-003 - No Database Migration Strategy  
**Status:** ✅ COMPLETE

