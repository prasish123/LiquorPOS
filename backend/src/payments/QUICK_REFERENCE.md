# PAX Integration - Quick Reference Card

## Quick Start (5 Minutes)

### 1. Register Terminal
```typescript
await terminalManager.registerTerminal({
  id: 'term-001',
  name: 'Counter 1',
  type: TerminalType.PAX,
  locationId: 'loc-001',
  ipAddress: '192.168.1.100',
  port: 10009,
  enabled: true,
});
```

### 2. Process Payment (Automatic Routing)
```typescript
const result = await paymentRouter.routePayment({
  amount: 42.99,
  method: 'card',
  locationId: 'loc-001',
  terminalId: 'term-001',
});
```

### 3. Check Terminal Health
```typescript
const health = await terminalManager.checkTerminalHealth('term-001');
console.log(`Online: ${health.online}, Healthy: ${health.healthy}`);
```

## Common Operations

### Process Sale
```typescript
const result = await paxAgent.processTransaction('term-001', {
  amount: 50.00,
  transactionType: 'sale',
  invoiceNumber: 'INV-001',
});
```

### Refund
```typescript
await paxAgent.processTransaction('term-001', {
  amount: 50.00,
  transactionType: 'refund',
  referenceNumber: 'original-ref-123',
});
```

### Void
```typescript
await paxAgent.processTransaction('term-001', {
  amount: 50.00,
  transactionType: 'void',
  referenceNumber: 'original-ref-123',
});
```

### Cancel
```typescript
await paxAgent.cancelTransaction('term-001');
```

## API Endpoints Cheat Sheet

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/payments/terminals` | Register terminal |
| GET | `/api/payments/terminals` | List terminals |
| GET | `/api/payments/terminals/:id` | Get terminal |
| PUT | `/api/payments/terminals/:id` | Update terminal |
| DELETE | `/api/payments/terminals/:id` | Delete terminal |
| GET | `/api/payments/terminals/:id/health` | Check health |
| POST | `/api/payments/pax/transaction` | Process transaction |
| POST | `/api/payments/pax/void` | Void transaction |
| POST | `/api/payments/pax/refund` | Refund transaction |
| POST | `/api/payments/pax/cancel` | Cancel transaction |
| GET | `/api/payments/processors/health` | Processor status |

## Response Codes

| Code | Meaning |
|------|---------|
| `000000` or `00` | Approved |
| `100001` | Declined |
| `200001` | Invalid card |
| `300001` | Timeout |
| `ERROR` | Communication error |

## Terminal Types

- `pax` - PAX terminals (A920, A80, S300, IM30)
- `ingenico` - Ingenico terminals (future)
- `verifone` - Verifone terminals (future)
- `virtual` - Virtual terminal (testing)

## Transaction Types

- `sale` - Immediate capture
- `auth` - Authorization only
- `capture` - Complete authorization
- `refund` - Refund previous transaction
- `void` - Void same-day transaction

## Payment Processors

- `stripe` - Stripe payment processing
- `pax` - PAX terminal
- `offline` - Offline mode (fallback)

## Environment Variables

```bash
PAX_DEFAULT_TIMEOUT=30000
PAX_HEARTBEAT_INTERVAL=300000
OFFLINE_PAYMENTS_ENABLED=true
OFFLINE_MAX_TRANSACTION_AMOUNT=500
OFFLINE_MAX_DAILY_TOTAL=5000
```

## Error Handling

```typescript
try {
  const result = await paxAgent.processTransaction('term-001', {
    amount: 50.00,
    transactionType: 'sale',
  });
  
  if (!result.success) {
    console.error(`Declined: ${result.responseMessage}`);
  }
} catch (error) {
  if (error.message.includes('timeout')) {
    // Handle timeout
  } else if (error.message.includes('not registered')) {
    // Handle terminal not found
  } else {
    // Handle other errors
  }
}
```

## Dependency Injection

```typescript
import { PaymentRouterService } from './payments/payment-router.service';
import { PaxTerminalAgent } from './payments/pax-terminal.agent';
import { TerminalManagerService } from './payments/terminal-manager.service';

constructor(
  private paymentRouter: PaymentRouterService,
  private paxAgent: PaxTerminalAgent,
  private terminalManager: TerminalManagerService,
) {}
```

## Module Import

```typescript
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [PaymentsModule],
})
export class YourModule {}
```

## Testing

```bash
# Run all payment tests
npm test -- payments

# Run specific test file
npm test -- payment-router.service.spec.ts

# Run with coverage
npm run test:cov
```

## Database Queries

```sql
-- Get all terminals for location
SELECT * FROM "PaymentTerminal"
WHERE "locationId" = 'loc-001' AND "deletedAt" IS NULL;

-- Get recent transactions
SELECT * FROM "PaxTransaction"
WHERE "terminalId" = 'term-001'
AND "createdAt" > NOW() - INTERVAL '1 day'
ORDER BY "createdAt" DESC;

-- Get failed transactions
SELECT * FROM "PaxTransaction"
WHERE "success" = false
ORDER BY "createdAt" DESC
LIMIT 10;
```

## Troubleshooting Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| Terminal offline | `ping <terminal-ip>` |
| Transaction timeout | Increase `PAX_DEFAULT_TIMEOUT` |
| Terminal not found | Check terminal is registered |
| Connection refused | Check port 10009 is open |
| Health check fails | Restart terminal |

## Common Patterns

### With Order Processing
```typescript
async processOrder(dto: CreateOrderDto) {
  // ... other order processing ...
  
  const payment = await this.paymentRouter.routePayment({
    amount: total,
    method: dto.paymentMethod,
    locationId: dto.locationId,
    terminalId: dto.terminalId,
  });
  
  if (payment.status === 'failed') {
    throw new Error('Payment failed');
  }
  
  // ... complete order ...
}
```

### Multi-Terminal Setup
```typescript
// Find best available terminal
const terminal = await terminalManager.findBestTerminal(
  'loc-001',
  TerminalType.PAX
);

if (!terminal) {
  throw new Error('No terminals available');
}

// Use the terminal
const result = await paymentRouter.routePayment({
  amount: 50.00,
  method: 'card',
  locationId: 'loc-001',
  terminalId: terminal.id,
});
```

### Health Monitoring
```typescript
// Check all terminals
const allHealth = terminalManager.getAllTerminalHealth();

const unhealthy = allHealth.filter(h => !h.healthy);
if (unhealthy.length > 0) {
  console.warn(`${unhealthy.length} terminals need attention`);
}
```

## Documentation Links

- [Full README](./README.md)
- [Integration Guide](../../docs/PAX_INTEGRATION_GUIDE.md)
- [Implementation Summary](../../../PAX_INTEGRATION_SUMMARY.md)
- [API Docs](http://localhost:3000/api/docs)

## Support Contacts

- PAX Terminal Issues: PAX Support
- Integration Issues: Check logs and documentation
- Payment Processing: Contact payment processor
- Network Issues: IT/Network team

## Version

- **Implementation Date**: January 3, 2026
- **Version**: 1.0.0
- **Status**: Production Ready ✅

