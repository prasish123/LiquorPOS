-- Rollback migration for REQ-003: Receipt Printing
-- This script removes the Receipt table

-- Drop indexes
DROP INDEX IF EXISTS "Receipt_transactionId_idx";

-- Drop unique constraint
DROP INDEX IF EXISTS "Receipt_transactionId_key";

-- Drop foreign key (CASCADE will handle this)
-- ALTER TABLE "Receipt" DROP CONSTRAINT IF EXISTS "Receipt_transactionId_fkey";

-- Drop table
DROP TABLE IF EXISTS "Receipt";

