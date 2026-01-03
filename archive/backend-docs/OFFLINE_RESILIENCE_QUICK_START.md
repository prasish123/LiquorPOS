# Offline Resilience - Quick Start Guide

## 5-Minute Setup

### 1. Add Environment Variables

Add to your `.env` file:

```bash
# Enable offline payments
OFFLINE_PAYMENTS_ENABLED=true
OFFLINE_MAX_TRANSACTION_AMOUNT=500
OFFLINE_MAX_DAILY_TOTAL=5000
OFFLINE_REQUIRE_MANAGER_APPROVAL=true
OFFLINE_ALLOWED_PAYMENT_METHODS=cash,card

# Queue settings (defaults are fine)
OFFLINE_QUEUE_MAX_CONCURRENT=5
OFFLINE_QUEUE_MAX_RETRIES=5
```

### 2. Restart Backend

```bash
cd backend
npm run start:dev
```

### 3. Verify Services

```bash
# Check network status
curl http://localhost:3000/health/network

# Check offline queue
curl http://localhost:3000/health/offline-queue
```

That's it! The system now handles offline scenarios automatically.

## Common Use Cases

### Check if System is Online

```typescript
import { NetworkStatusService } from './common/network-status.service';

constructor(private networkStatus: NetworkStatusService) {}

// Simple check
if (this.networkStatus.isOnline()) {
  // Process normally
} else {
  // Use offline mode
}

// Check specific service
if (this.networkStatus.isStripeAvailable()) {
  // Process payment online
} else {
  // Use offline payment
}
```

### Process Offline Payment

```typescript
import { OfflinePaymentAgent } from './orders/agents/offline-payment.agent';

constructor(private offlinePayment: OfflinePaymentAgent) {}

// Check if allowed
const canProcess = await this.offlinePayment.canProcessOffline(
  100,      // amount
  'card',   // method
  'loc-1'   // locationId
);

if (canProcess.allowed) {
  // Authorize offline
  const result = await this.offlinePayment.authorizeOffline(
    100,
    'card',
    'loc-1'
  );
  
  if (result.status === 'offline_pending') {
    console.log('Will capture when online');
  }
}
```

### Queue Operation for Later

```typescript
import { OfflineQueueService } from './common/offline-queue.service';

constructor(private offlineQueue: OfflineQueueService) {}

// Queue any operation
await this.offlineQueue.enqueue(
  'payment_capture',
  {
    paymentId: 'pay-123',
    amount: 100
  },
  9  // priority (1-10, higher = more important)
);
```

### Queue Conexxus Sync

```typescript
import { ConexxusOfflineService } from './integrations/conexxus/conexxus-offline.service';

constructor(private conexxusOffline: ConexxusOfflineService) {}

// Queue end-of-day sync
await this.conexxusOffline.queueEndOfDaySync('location-1');

// Or queue specific sales data
await this.conexxusOffline.queueSalesData({
  date: '2025-01-02',
  locationId: 'location-1',
  transactions: [/* ... */]
});
```

## Testing Offline Mode

### Simulate Offline

```typescript
// Set offline mode
this.networkStatus.setOfflineMode(true);

// Test your code...

// Restore online mode
this.networkStatus.setOfflineMode(false);
```

### Check Queue Status

```bash
# Get queue metrics
curl http://localhost:3000/health/offline-queue

# Response:
{
  "pending": 5,
  "completed": 150,
  "failed": 2,
  "successRate": 0.99
}
```

### View Offline Payments

```bash
# Get statistics
curl http://localhost:3000/orders/offline-payments/stats?locationId=loc-1

# Response:
{
  "totalOfflinePayments": 25,
  "totalAmount": 1250.00,
  "pendingCaptures": 3,
  "byMethod": {
    "cash": { "count": 20, "amount": 1000.00 },
    "card": { "count": 5, "amount": 250.00 }
  }
}
```

## Configuration Quick Reference

### Conservative (Low Risk)
```bash
OFFLINE_MAX_TRANSACTION_AMOUNT=200
OFFLINE_MAX_DAILY_TOTAL=2000
OFFLINE_REQUIRE_MANAGER_APPROVAL=true
OFFLINE_ALLOWED_PAYMENT_METHODS=cash
```

### Balanced (Recommended)
```bash
OFFLINE_MAX_TRANSACTION_AMOUNT=500
OFFLINE_MAX_DAILY_TOTAL=5000
OFFLINE_REQUIRE_MANAGER_APPROVAL=true
OFFLINE_ALLOWED_PAYMENT_METHODS=cash,card
```

### High Volume
```bash
OFFLINE_MAX_TRANSACTION_AMOUNT=1000
OFFLINE_MAX_DAILY_TOTAL=10000
OFFLINE_REQUIRE_MANAGER_APPROVAL=false
OFFLINE_ALLOWED_PAYMENT_METHODS=cash,card
```

## Monitoring Commands

```bash
# Network status
curl http://localhost:3000/health/network

# Queue status
curl http://localhost:3000/health/offline-queue

# Offline payment stats
curl http://localhost:3000/orders/offline-payments/stats

# Pending syncs
curl http://localhost:3000/conexxus/pending-syncs
```

## Troubleshooting

### Offline payments not working?

1. Check configuration:
   ```bash
   curl http://localhost:3000/orders/offline-payments/config
   ```

2. Verify limits not exceeded:
   ```bash
   curl http://localhost:3000/orders/offline-payments/stats?locationId=loc-1
   ```

### Queue not processing?

1. Check queue status:
   ```bash
   curl http://localhost:3000/health/offline-queue
   ```

2. Manually trigger:
   ```bash
   curl -X POST http://localhost:3000/admin/offline-queue/process
   ```

### Need to retry failed operations?

```bash
curl -X POST http://localhost:3000/admin/offline-queue/retry-failed
```

## Key Points to Remember

1. ✅ **Cash always works offline** - No limits
2. ✅ **Card has limits** - Check `OFFLINE_MAX_TRANSACTION_AMOUNT`
3. ✅ **Auto-sync when online** - Queue processes every 2 minutes
4. ✅ **Audit trail** - All offline operations logged
5. ✅ **Manager approval** - Optional for card payments

## Next Steps

- Read full documentation: [OFFLINE_RESILIENCE.md](./OFFLINE_RESILIENCE.md)
- Review implementation: [OFFLINE_RESILIENCE_SUMMARY.md](./OFFLINE_RESILIENCE_SUMMARY.md)
- Run tests: `npm run test:e2e -- offline-resilience.e2e-spec.ts`

## Need Help?

- Documentation: `backend/docs/OFFLINE_RESILIENCE.md`
- Examples: `backend/test/offline-resilience.e2e-spec.ts`
- Support: support@pos-omni.com

