-- REQ-003: Manager Override
-- This migration adds support for manager price overrides with PIN authentication

-- Create OverrideReason enum
CREATE TYPE "OverrideReason" AS ENUM ('PRICE_MATCH', 'DAMAGED_GOODS', 'CUSTOMER_SATISFACTION', 'OTHER');

-- Update TransactionItem table to track price overrides
ALTER TABLE "TransactionItem" ADD COLUMN "originalPrice" DOUBLE PRECISION;
ALTER TABLE "TransactionItem" ADD COLUMN "priceOverridden" BOOLEAN NOT NULL DEFAULT false;

-- Create PriceOverride table
CREATE TABLE "PriceOverride" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "overridePrice" DOUBLE PRECISION NOT NULL,
    "reason" "OverrideReason" NOT NULL,
    "reasonNotes" TEXT,
    "managerId" TEXT NOT NULL,
    "managerName" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cashierId" TEXT,
    "cashierName" TEXT,
    "terminalId" TEXT,

    CONSTRAINT "PriceOverride_pkey" PRIMARY KEY ("id")
);

-- Create indexes for PriceOverride
CREATE INDEX "PriceOverride_transactionId_idx" ON "PriceOverride"("transactionId");
CREATE INDEX "PriceOverride_managerId_idx" ON "PriceOverride"("managerId");
CREATE INDEX "PriceOverride_approvedAt_idx" ON "PriceOverride"("approvedAt");

-- Add foreign key constraints
ALTER TABLE "PriceOverride" ADD CONSTRAINT "PriceOverride_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PriceOverride" ADD CONSTRAINT "PriceOverride_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE "PriceOverride" IS 'Tracks all manager price overrides with full audit trail';
COMMENT ON COLUMN "PriceOverride"."managerName" IS 'Cached manager name for audit trail (immutable)';
COMMENT ON COLUMN "PriceOverride"."reasonNotes" IS 'Additional notes for OTHER reason type';
COMMENT ON COLUMN "TransactionItem"."originalPrice" IS 'Original price before override (null if not overridden)';
COMMENT ON COLUMN "TransactionItem"."priceOverridden" IS 'Flag indicating if price was overridden by manager';

