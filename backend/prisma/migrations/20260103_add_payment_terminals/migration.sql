-- CreateTable
CREATE TABLE "PaymentTerminal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "port" INTEGER,
    "serialNumber" TEXT,
    "model" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "firmwareVersion" TEXT,
    "lastHeartbeat" TIMESTAMP(3),
    "metadata" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTerminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaxTransaction" (
    "id" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "transactionId" TEXT,
    "transactionType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "success" BOOLEAN NOT NULL,
    "responseCode" TEXT NOT NULL,
    "responseMessage" TEXT NOT NULL,
    "authCode" TEXT,
    "cardType" TEXT,
    "last4" TEXT,
    "rawRequest" TEXT,
    "rawResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaxTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTerminal_serialNumber_key" ON "PaymentTerminal"("serialNumber");

-- CreateIndex
CREATE INDEX "PaymentTerminal_locationId_idx" ON "PaymentTerminal"("locationId");

-- CreateIndex
CREATE INDEX "PaymentTerminal_type_idx" ON "PaymentTerminal"("type");

-- CreateIndex
CREATE INDEX "PaymentTerminal_enabled_idx" ON "PaymentTerminal"("enabled");

-- CreateIndex
CREATE INDEX "PaymentTerminal_serialNumber_idx" ON "PaymentTerminal"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PaxTransaction_referenceNumber_key" ON "PaxTransaction"("referenceNumber");

-- CreateIndex
CREATE INDEX "PaxTransaction_terminalId_idx" ON "PaxTransaction"("terminalId");

-- CreateIndex
CREATE INDEX "PaxTransaction_transactionId_idx" ON "PaxTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "PaxTransaction_referenceNumber_idx" ON "PaxTransaction"("referenceNumber");

-- CreateIndex
CREATE INDEX "PaxTransaction_createdAt_idx" ON "PaxTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "PaymentTerminal" ADD CONSTRAINT "PaymentTerminal_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

