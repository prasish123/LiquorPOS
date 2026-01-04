# PAX Terminal Integration

This module provides comprehensive payment terminal integration for the Liquor POS system, with primary support for PAX payment terminals.

## Features

### 1. Payment Router
- **Intelligent Payment Routing**: Automatically routes payments to the best available processor
- **Multi-Processor Support**: Stripe, PAX terminals, and offline fallback
- **Failover Logic**: Automatic fallback when primary processor unavailable
- **Processor Health Monitoring**: Real-time health checks for all payment processors

### 2. PAX Terminal Agent
- **Direct TCP/IP Communication**: Native PAX protocol implementation
- **Transaction Types**:
  - Sale (immediate capture)
  - Authorization (auth-only)
  - Capture (complete auth)
  - Refund
  - Void
- **EMV & Contactless Support**: Full chip and tap payment support
- **Terminal Status Monitoring**: Real-time terminal health and status
- **Transaction Logging**: Complete audit trail for all transactions

### 3. Terminal Manager
- **Terminal Lifecycle Management**: Register, configure, and monitor terminals
- **Multi-Terminal Support**: Manage multiple terminals per location
- **Health Monitoring**: Automated health checks every 5 minutes
- **Terminal Discovery**: Find best available terminal for transactions
- **Soft Delete**: Safe terminal decommissioning

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Payment Router                         │
│  (Intelligent routing to best available processor)          │
└────────────┬──────────────┬──────────────┬─────────────────┘
             │              │              │
             ▼              ▼              ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │   Stripe   │  │    PAX     │  │  Offline   │
    │   Agent    │  │  Terminal  │  │   Agent    │
    └────────────┘  └────────────┘  └────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │    Terminal    │
                  │    Manager     │
                  └────────────────┘
```

## Supported PAX Terminal Models

- **PAX A920/A920Pro**: Android-based countertop terminal
- **PAX A80**: Countertop PIN pad
- **PAX S300**: Integrated PIN pad
- **PAX IM30**: Mobile payment terminal

## API Endpoints

### Terminal Management

#### Register Terminal
```http
POST /api/payments/terminals
Content-Type: application/json
Authorization: Bearer <token>

{
  "id": "term-001",
  "name": "Counter 1 - PAX A920",
  "type": "pax",
  "locationId": "loc-001",
  "ipAddress": "192.168.1.100",
  "port": 10009,
  "serialNumber": "PAX-A920-12345",
  "model": "A920Pro",
  "enabled": true
}
```

#### Get All Terminals
```http
GET /api/payments/terminals?locationId=loc-001
Authorization: Bearer <token>
```

#### Get Terminal Health
```http
GET /api/payments/terminals/term-001/health
Authorization: Bearer <token>
```

#### Update Terminal
```http
PUT /api/payments/terminals/term-001
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Counter 1 - Updated",
  "enabled": false
}
```

#### Unregister Terminal
```http
DELETE /api/payments/terminals/term-001
Authorization: Bearer <token>
```

### PAX Transactions

#### Process Sale
```http
POST /api/payments/pax/transaction
Content-Type: application/json
Authorization: Bearer <token>

{
  "terminalId": "term-001",
  "amount": 42.99,
  "transactionType": "sale",
  "invoiceNumber": "INV-001",
  "metadata": {
    "orderId": "order-123",
    "employeeId": "emp-001"
  }
}
```

Response:
```json
{
  "success": true,
  "transactionId": "123e4567-e89b-12d3-a456-426614174000",
  "referenceNumber": "20260103120000001",
  "amount": 42.99,
  "cardType": "Visa",
  "last4": "4242",
  "authCode": "123456",
  "responseCode": "000000",
  "responseMessage": "APPROVED",
  "timestamp": "2026-01-03T12:00:00.000Z",
  "terminalId": "term-001"
}
```

#### Void Transaction
```http
POST /api/payments/pax/void
Content-Type: application/json
Authorization: Bearer <token>

{
  "terminalId": "term-001",
  "referenceNumber": "20260103120000001",
  "amount": 42.99
}
```

#### Refund Transaction
```http
POST /api/payments/pax/refund
Content-Type: application/json
Authorization: Bearer <token>

{
  "terminalId": "term-001",
  "referenceNumber": "20260103120000001",
  "amount": 42.99,
  "reason": "Customer request"
}
```

#### Cancel Transaction
```http
POST /api/payments/pax/cancel
Content-Type: application/json
Authorization: Bearer <token>

{
  "terminalId": "term-001"
}
```

### Payment Processor Status

#### Get Processor Health
```http
GET /api/payments/processors/health
Authorization: Bearer <token>
```

Response:
```json
{
  "stripe": {
    "available": true,
    "lastCheck": "2026-01-03T12:00:00.000Z",
    "details": {
      "online": true
    }
  },
  "pax": {
    "available": true,
    "lastCheck": "2026-01-03T12:00:00.000Z",
    "details": {
      "terminalsRegistered": 2,
      "terminalsOnline": 2
    }
  },
  "offline": {
    "available": true,
    "lastCheck": "2026-01-03T12:00:00.000Z",
    "details": {
      "enabled": true,
      "maxTransactionAmount": 500,
      "maxDailyTotal": 5000
    }
  }
}
```

#### Get Available Processors
```http
GET /api/payments/processors/available?locationId=loc-001&amount=50&method=card
Authorization: Bearer <token>
```

Response:
```json
["stripe", "pax", "offline"]
```

## Configuration

### Environment Variables

```bash
# PAX Terminal Configuration
PAX_DEFAULT_TIMEOUT=30000          # Default timeout in ms
PAX_HEARTBEAT_INTERVAL=300000      # Health check interval (5 minutes)

# Offline Payment Configuration
OFFLINE_PAYMENTS_ENABLED=true
OFFLINE_MAX_TRANSACTION_AMOUNT=500
OFFLINE_MAX_DAILY_TOTAL=5000
OFFLINE_REQUIRE_MANAGER_APPROVAL=false
OFFLINE_ALLOWED_PAYMENT_METHODS=cash,card
```

## Database Schema

### PaymentTerminal Table
```sql
CREATE TABLE "PaymentTerminal" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,              -- pax, ingenico, verifone, virtual
    "locationId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "port" INTEGER,
    "serialNumber" TEXT UNIQUE,
    "model" TEXT,
    "enabled" BOOLEAN DEFAULT true,
    "firmwareVersion" TEXT,
    "lastHeartbeat" TIMESTAMP,
    "metadata" TEXT,                   -- JSON
    "deletedAt" TIMESTAMP,             -- Soft delete
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

### PaxTransaction Table
```sql
CREATE TABLE "PaxTransaction" (
    "id" TEXT PRIMARY KEY,
    "terminalId" TEXT NOT NULL,
    "transactionId" TEXT,              -- Link to main Transaction
    "transactionType" TEXT NOT NULL,   -- sale, refund, void, auth, capture
    "amount" DOUBLE PRECISION NOT NULL,
    "referenceNumber" TEXT UNIQUE NOT NULL,
    "invoiceNumber" TEXT,
    "success" BOOLEAN NOT NULL,
    "responseCode" TEXT NOT NULL,
    "responseMessage" TEXT NOT NULL,
    "authCode" TEXT,
    "cardType" TEXT,
    "last4" TEXT,
    "rawRequest" TEXT,                 -- JSON
    "rawResponse" TEXT,                -- JSON
    "createdAt" TIMESTAMP DEFAULT NOW()
);
```

## Usage Examples

### 1. Register a PAX Terminal

```typescript
import { PaymentsModule } from './payments/payments.module';
import { TerminalManagerService, TerminalType } from './payments/terminal-manager.service';

// In your service
constructor(private terminalManager: TerminalManagerService) {}

async registerTerminal() {
  await this.terminalManager.registerTerminal({
    id: 'term-001',
    name: 'Counter 1 - PAX A920',
    type: TerminalType.PAX,
    locationId: 'loc-001',
    enabled: true,
    ipAddress: '192.168.1.100',
    port: 10009,
    serialNumber: 'PAX-A920-12345',
    model: 'A920Pro',
  });
}
```

### 2. Process a Payment with Automatic Routing

```typescript
import { PaymentRouterService } from './payments/payment-router.service';

constructor(private paymentRouter: PaymentRouterService) {}

async processPayment(orderId: string, amount: number) {
  const result = await this.paymentRouter.routePayment({
    amount,
    method: 'card',
    locationId: 'loc-001',
    terminalId: 'term-001',
    metadata: {
      orderId,
      employeeId: 'emp-001',
    },
  });

  console.log(`Payment processed via ${result.processor}`);
  console.log(`Status: ${result.status}`);
  console.log(`Card: ${result.cardType} ending in ${result.last4}`);
}
```

### 3. Process a Direct PAX Transaction

```typescript
import { PaxTerminalAgent } from './payments/pax-terminal.agent';

constructor(private paxAgent: PaxTerminalAgent) {}

async processSale(terminalId: string, amount: number) {
  const result = await this.paxAgent.processTransaction(terminalId, {
    amount,
    transactionType: 'sale',
    invoiceNumber: 'INV-001',
  });

  if (result.success) {
    console.log(`Transaction approved: ${result.authCode}`);
  } else {
    console.error(`Transaction declined: ${result.responseMessage}`);
  }
}
```

### 4. Check Terminal Health

```typescript
import { TerminalManagerService } from './payments/terminal-manager.service';

constructor(private terminalManager: TerminalManagerService) {}

async checkHealth(terminalId: string) {
  const health = await this.terminalManager.checkTerminalHealth(terminalId);
  
  console.log(`Terminal ${terminalId}:`);
  console.log(`  Online: ${health.online}`);
  console.log(`  Healthy: ${health.healthy}`);
  
  if (health.issues) {
    console.log(`  Issues: ${health.issues.join(', ')}`);
  }
}
```

## Testing

### Run Unit Tests
```bash
cd backend
npm test -- payments
```

### Run Specific Test Suite
```bash
npm test -- payment-router.service.spec.ts
npm test -- pax-terminal.agent.spec.ts
npm test -- terminal-manager.service.spec.ts
```

### Test Coverage
```bash
npm run test:cov
```

## PAX Protocol Details

The PAX Terminal Agent implements the PAX protocol for direct TCP/IP communication:

### Message Format
```
[STX][Command][FS][Field1][FS][Field2]...[ETX][LRC]

STX  = 0x02 (Start of Text)
FS   = 0x1C (Field Separator)
ETX  = 0x03 (End of Text)
LRC  = Longitudinal Redundancy Check
```

### Command Codes
- `T00`: Sale transaction
- `T02`: Refund transaction
- `T04`: Void transaction
- `T06`: Authorization only
- `T08`: Capture authorization
- `A00`: Status inquiry
- `A14`: Cancel transaction

### Response Codes
- `000000` or `00`: Approved
- `100001`: Declined
- `200001`: Invalid card
- `300001`: Timeout
- `ERROR`: Communication error

## Troubleshooting

### Terminal Not Connecting
1. Verify IP address and port are correct
2. Check network connectivity: `ping <terminal-ip>`
3. Ensure terminal is powered on and in idle state
4. Check firewall rules allow TCP traffic on terminal port

### Transaction Timeout
1. Increase timeout in terminal configuration
2. Check network latency
3. Verify terminal is not processing another transaction
4. Check terminal logs for errors

### Health Check Failures
1. Verify terminal is online
2. Check last heartbeat timestamp
3. Review terminal error logs
4. Restart terminal if necessary

## Security Considerations

1. **Network Security**: Use VLANs to isolate payment terminals
2. **Encryption**: All card data is encrypted by PAX terminal
3. **PCI Compliance**: Terminal handles sensitive card data, not the POS
4. **Audit Trail**: All transactions logged with full details
5. **Access Control**: API endpoints protected with JWT authentication

## Future Enhancements

- [ ] Support for Ingenico terminals
- [ ] Support for Verifone terminals
- [ ] Terminal firmware update management
- [ ] Advanced transaction reporting
- [ ] Multi-currency support
- [ ] Tip adjustment support
- [ ] Signature capture
- [ ] Receipt printing via terminal

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review PAX terminal documentation
3. Contact PAX support for terminal-specific issues
4. File an issue in the project repository

