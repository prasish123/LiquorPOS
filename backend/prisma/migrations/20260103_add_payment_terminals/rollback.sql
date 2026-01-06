-- Rollback migration for REQ-PAX: Payment Terminals
-- This script removes the PaymentTerminal and PaxTransaction tables

-- Drop indexes first
DROP INDEX IF EXISTS "PaxTransaction_createdAt_idx";
DROP INDEX IF EXISTS "PaxTransaction_referenceNumber_idx";
DROP INDEX IF EXISTS "PaxTransaction_transactionId_idx";
DROP INDEX IF EXISTS "PaxTransaction_terminalId_idx";
DROP INDEX IF EXISTS "PaymentTerminal_serialNumber_idx";
DROP INDEX IF EXISTS "PaymentTerminal_enabled_idx";
DROP INDEX IF EXISTS "PaymentTerminal_type_idx";
DROP INDEX IF EXISTS "PaymentTerminal_locationId_idx";

-- Drop unique constraints
DROP INDEX IF EXISTS "PaxTransaction_referenceNumber_key";
DROP INDEX IF EXISTS "PaymentTerminal_serialNumber_key";

-- Drop foreign keys (CASCADE will handle this)
-- ALTER TABLE "PaymentTerminal" DROP CONSTRAINT IF EXISTS "PaymentTerminal_locationId_fkey";

-- Drop tables
DROP TABLE IF EXISTS "PaxTransaction";
DROP TABLE IF EXISTS "PaymentTerminal";

