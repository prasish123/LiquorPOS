# PAX Terminal Integration Guide

## Quick Start

This guide will help you integrate PAX payment terminals into your Liquor POS system.

## Prerequisites

- PAX terminal (A920, A80, S300, or IM30)
- Network connectivity between POS and terminal
- Terminal configured with static IP address
- Backend server running

## Step 1: Network Setup

### Configure Terminal Network Settings

1. **Access Terminal Settings**
   - On PAX terminal, go to Settings → Network
   - Select Ethernet or WiFi

2. **Set Static IP Address**
   ```
   IP Address: 192.168.1.100
   Subnet Mask: 255.255.255.0
   Gateway: 192.168.1.1
   DNS: 8.8.8.8
   ```

3. **Enable TCP/IP Server**
   - Go to Settings → Communication
   - Enable TCP/IP Server
   - Set Port: 10009 (default PAX port)
   - Save settings

4. **Test Connectivity**
   ```bash
   ping 192.168.1.100
   ```

## Step 2: Register Terminal in POS

### Using API

```bash
curl -X POST http://localhost:3000/api/payments/terminals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "id": "term-001",
    "name": "Counter 1 - PAX A920",
    "type": "pax",
    "locationId": "loc-001",
    "ipAddress": "192.168.1.100",
    "port": 10009,
    "serialNumber": "PAX-A920-12345",
    "model": "A920Pro",
    "enabled": true
  }'
```

### Using TypeScript

```typescript
import { TerminalManagerService, TerminalType } from './payments/terminal-manager.service';

async function registerTerminal(terminalManager: TerminalManagerService) {
  await terminalManager.registerTerminal({
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
  
  console.log('Terminal registered successfully');
}
```

## Step 3: Verify Terminal Health

```bash
curl http://localhost:3000/api/payments/terminals/term-001/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "terminalId": "term-001",
  "type": "pax",
  "online": true,
  "healthy": true,
  "lastCheck": "2026-01-03T12:00:00.000Z",
  "lastHeartbeat": "2026-01-03T12:00:00.000Z",
  "details": {
    "firmwareVersion": "1.2.3",
    "batteryLevel": 85,
    "paperStatus": "ok"
  }
}
```

## Step 4: Process Test Transaction

### Sale Transaction

```bash
curl -X POST http://localhost:3000/api/payments/pax/transaction \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "terminalId": "term-001",
    "amount": 1.00,
    "transactionType": "sale",
    "invoiceNumber": "TEST-001"
  }'
```

### Using Payment Router (Automatic)

```typescript
import { PaymentRouterService } from './payments/payment-router.service';

async function processPayment(router: PaymentRouterService) {
  const result = await router.routePayment({
    amount: 42.99,
    method: 'card',
    locationId: 'loc-001',
    terminalId: 'term-001',
    metadata: {
      orderId: 'order-123',
      employeeId: 'emp-001',
    },
  });
  
  console.log('Payment Result:', result);
  // Payment will automatically route to PAX if terminal is available
}
```

## Step 5: Integration with Orders

Update your order processing to use the Payment Router:

```typescript
import { OrderOrchestrator } from './orders/order-orchestrator';
import { PaymentRouterService } from './payments/payment-router.service';

// In OrderOrchestrator or OrdersService
async processOrder(dto: CreateOrderDto) {
  // ... inventory, pricing, compliance checks ...
  
  // Route payment automatically
  const payment = await this.paymentRouter.routePayment({
    amount: orderTotal,
    method: dto.paymentMethod,
    locationId: dto.locationId,
    terminalId: dto.terminalId,
    metadata: {
      orderId: order.id,
      employeeId: dto.employeeId,
    },
  });
  
  if (payment.status === 'failed') {
    throw new Error('Payment failed');
  }
  
  // ... complete order ...
}
```

## Configuration Options

### Environment Variables

Add to your `.env` file:

```bash
# PAX Terminal Configuration
PAX_DEFAULT_TIMEOUT=30000          # 30 seconds
PAX_HEARTBEAT_INTERVAL=300000      # 5 minutes

# Enable automatic failover
PAX_AUTO_FAILOVER=true

# Offline payment fallback
OFFLINE_PAYMENTS_ENABLED=true
OFFLINE_MAX_TRANSACTION_AMOUNT=500
OFFLINE_MAX_DAILY_TOTAL=5000
```

## Multi-Terminal Setup

For locations with multiple terminals:

```typescript
// Register multiple terminals
await terminalManager.registerTerminal({
  id: 'term-001',
  name: 'Counter 1',
  type: TerminalType.PAX,
  locationId: 'loc-001',
  ipAddress: '192.168.1.100',
  port: 10009,
  enabled: true,
});

await terminalManager.registerTerminal({
  id: 'term-002',
  name: 'Counter 2',
  type: TerminalType.PAX,
  locationId: 'loc-001',
  ipAddress: '192.168.1.101',
  port: 10009,
  enabled: true,
});

// Find best available terminal
const bestTerminal = await terminalManager.findBestTerminal(
  'loc-001',
  TerminalType.PAX
);

console.log(`Using terminal: ${bestTerminal.name}`);
```

## Transaction Types

### 1. Sale (Immediate Capture)
```typescript
await paxAgent.processTransaction('term-001', {
  amount: 50.00,
  transactionType: 'sale',
  invoiceNumber: 'INV-001',
});
```

### 2. Authorization Only
```typescript
// Authorize
const authResult = await paxAgent.processTransaction('term-001', {
  amount: 50.00,
  transactionType: 'auth',
  invoiceNumber: 'INV-001',
});

// Later, capture
await paxAgent.processTransaction('term-001', {
  amount: 50.00,
  transactionType: 'capture',
  referenceNumber: authResult.referenceNumber,
});
```

### 3. Refund
```typescript
await paxAgent.processTransaction('term-001', {
  amount: 50.00,
  transactionType: 'refund',
  referenceNumber: originalReferenceNumber,
  metadata: { reason: 'Customer request' },
});
```

### 4. Void
```typescript
await paxAgent.processTransaction('term-001', {
  amount: 50.00,
  transactionType: 'void',
  referenceNumber: originalReferenceNumber,
});
```

## Error Handling

### Connection Errors

```typescript
try {
  const result = await paxAgent.processTransaction('term-001', {
    amount: 50.00,
    transactionType: 'sale',
  });
} catch (error) {
  if (error.message.includes('timeout')) {
    // Terminal not responding
    console.error('Terminal timeout - check network connection');
  } else if (error.message.includes('not registered')) {
    // Terminal not found
    console.error('Terminal not registered');
  } else {
    // Other error
    console.error('Transaction error:', error.message);
  }
}
```

### Automatic Failover

The Payment Router automatically handles failover:

```typescript
// Will try PAX first, then Stripe, then offline mode
const result = await paymentRouter.routePayment({
  amount: 50.00,
  method: 'card',
  locationId: 'loc-001',
  terminalId: 'term-001',
});

console.log(`Payment processed via: ${result.processor}`);
// Could be: 'pax', 'stripe', or 'offline'
```

## Monitoring & Health Checks

### Automated Health Checks

The Terminal Manager automatically checks terminal health every 5 minutes:

```typescript
// Get health status
const health = await terminalManager.checkTerminalHealth('term-001');

if (!health.healthy) {
  console.warn(`Terminal issues: ${health.issues.join(', ')}`);
}
```

### Manual Health Check

```bash
# Check single terminal
curl http://localhost:3000/api/payments/terminals/term-001/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check all terminals
curl http://localhost:3000/api/payments/terminals/health/all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Terminal Not Connecting

**Problem**: Terminal shows as offline

**Solutions**:
1. Verify network connectivity: `ping <terminal-ip>`
2. Check terminal is powered on
3. Verify port 10009 is open: `telnet <terminal-ip> 10009`
4. Check firewall rules
5. Restart terminal

### Transaction Timeout

**Problem**: Transactions timeout after 30 seconds

**Solutions**:
1. Increase timeout in terminal config
2. Check network latency
3. Ensure terminal is in idle state
4. Verify no other transactions in progress

### Declined Transactions

**Problem**: Transactions consistently declined

**Solutions**:
1. Check card is valid and not expired
2. Verify sufficient funds
3. Check terminal response code
4. Review terminal logs
5. Contact payment processor

### Paper Out Warning

**Problem**: Terminal shows paper low/out

**Solutions**:
1. Replace receipt paper
2. Health check will show paper status
3. Terminal can still process transactions

## Database Queries

### View Terminal Status

```sql
SELECT * FROM "PaymentTerminal"
WHERE "locationId" = 'loc-001'
AND "deletedAt" IS NULL;
```

### View Recent PAX Transactions

```sql
SELECT * FROM "PaxTransaction"
WHERE "terminalId" = 'term-001'
AND "createdAt" > NOW() - INTERVAL '1 day'
ORDER BY "createdAt" DESC;
```

### View Failed Transactions

```sql
SELECT * FROM "PaxTransaction"
WHERE "success" = false
AND "createdAt" > NOW() - INTERVAL '1 day'
ORDER BY "createdAt" DESC;
```

## Best Practices

1. **Always use Payment Router**: Let the system choose the best processor
2. **Monitor Health**: Check terminal health regularly
3. **Handle Errors**: Implement proper error handling and user feedback
4. **Log Transactions**: All transactions are automatically logged
5. **Test Regularly**: Run test transactions to verify connectivity
6. **Keep Firmware Updated**: Update terminal firmware regularly
7. **Use Static IPs**: Assign static IPs to terminals for reliability
8. **Network Isolation**: Use VLANs to isolate payment terminals
9. **Backup Processors**: Configure Stripe and offline mode as backups

## Production Checklist

- [ ] Terminal registered with correct IP and port
- [ ] Health check passing
- [ ] Test transaction successful
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Monitoring alerts set up
- [ ] Backup processors configured
- [ ] Network security reviewed
- [ ] PCI compliance verified
- [ ] Staff trained on terminal usage

## Support

For technical support:
- PAX Terminal Issues: Contact PAX support
- Integration Issues: Check logs and error messages
- Network Issues: Verify connectivity and firewall rules
- Payment Processing: Contact payment processor support

## Additional Resources

- [PAX Terminal Documentation](https://www.pax.com)
- [Payment Router README](./README.md)
- [API Documentation](http://localhost:3000/api/docs)

