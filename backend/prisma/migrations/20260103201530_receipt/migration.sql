-- REQ-002: Receipt Printing
-- This migration adds support for receipt generation and printing

-- Update Location table to add receipt configuration
ALTER TABLE "Location" ADD COLUMN "receiptHeader" TEXT;
ALTER TABLE "Location" ADD COLUMN "receiptFooter" TEXT;

-- Create Receipt table
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "htmlContent" TEXT,
    "printedAt" TIMESTAMP(3),
    "reprintCount" INTEGER NOT NULL DEFAULT 0,
    "lastReprintAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- Create unique index on transactionId
CREATE UNIQUE INDEX "Receipt_transactionId_key" ON "Receipt"("transactionId");

-- Create index for lookups
CREATE INDEX "Receipt_transactionId_idx" ON "Receipt"("transactionId");

-- Add foreign key constraint
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE "Receipt" IS 'Stores generated receipts for transactions (text and HTML format)';
COMMENT ON COLUMN "Receipt"."content" IS 'Plain text receipt for console/thermal printing';
COMMENT ON COLUMN "Receipt"."htmlContent" IS 'HTML receipt for browser printing';
COMMENT ON COLUMN "Receipt"."reprintCount" IS 'Number of times receipt has been reprinted';
COMMENT ON COLUMN "Location"."receiptHeader" IS 'Custom header text for receipts';
COMMENT ON COLUMN "Location"."receiptFooter" IS 'Custom footer text for receipts (e.g., Thank you!)';

