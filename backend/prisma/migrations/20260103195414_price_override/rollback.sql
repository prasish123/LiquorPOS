-- Rollback migration for REQ-002: Price Override
-- This script removes the PriceOverride table and related structures

-- Drop indexes
DROP INDEX IF EXISTS "PriceOverride_approvedAt_idx";
DROP INDEX IF EXISTS "PriceOverride_managerId_idx";
DROP INDEX IF EXISTS "PriceOverride_transactionId_idx";

-- Drop foreign keys (CASCADE will handle this)
-- ALTER TABLE "PriceOverride" DROP CONSTRAINT IF EXISTS "PriceOverride_managerId_fkey";
-- ALTER TABLE "PriceOverride" DROP CONSTRAINT IF EXISTS "PriceOverride_transactionId_fkey";

-- Drop table
DROP TABLE IF EXISTS "PriceOverride";

-- Drop enum type
DROP TYPE IF EXISTS "OverrideReason";

