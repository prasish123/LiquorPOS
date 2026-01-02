# Offline Resilience Implementation

## Overview

The POS system now includes comprehensive offline resilience features to ensure store operations continue seamlessly during internet outages or external service failures. This document describes the implementation, configuration, and usage of these features.

## Architecture

### Components

1. **Network Status Monitoring Service** (`network-status.service.ts`)
   - Monitors connectivity to internet, Stripe, and Conexxus
   - Runs health checks every 30 seconds
   - Provides real-time status updates

2. **Offline Queue Service** (`offline-queue.service.ts`)
   - Implements store-and-forward pattern
   - Queues operations when offline
   - Automatic retry with exponential backoff
   - Processes queue every 2 minutes

3. **Offline Payment Agent** (`offline-payment.agent.ts`)
   - Handles payment authorization when Stripe is unavailable
   - Configurable transaction and daily limits
   - Manager approval workflow support
   - Automatic capture when back online

4. **Conexxus Offline Service** (`conexxus-offline.service.ts`)
   - Queues sales data for sync
   - Store-and-forward for inventory updates
   - Automatic end-of-day sync
   - Retry logic for failed syncs

## Features

### 1. Offline Transaction Processing

**Problem Solved:** Store operations halt during internet outage

**Solution:**
- Transactions are processed locally and queued for sync
- Cash payments work immediately
- Card payments authorized offline (within limits)
- Automatic sync when connectivity restored

**Flow:**
```
1. Customer makes purchase
2. System detects Stripe unavailable
3. Offline payment authorization (if within limits)
4. Transaction recorded locally
5. Queued for online capture
6. Automatic processing when online
```

### 2. Offline Payment Authorization

**Problem Solved:** Cannot process card payments without Stripe

**Solution:**
- Configurable offline payment limits
- Cash always accepted
- Card payments authorized up to configured limit
- Manager approval workflow (optional)
- Automatic capture when Stripe available

**Configuration:**
```bash
# Enable offline payments
OFFLINE_PAYMENTS_ENABLED=true

# Maximum single transaction (e.g., $500)
OFFLINE_MAX_TRANSACTION_AMOUNT=500

# Maximum daily total per location (e.g., $5000)
OFFLINE_MAX_DAILY_TOTAL=5000

# Require manager approval for card payments
OFFLINE_REQUIRE_MANAGER_APPROVAL=true

# Allowed methods (cash,card)
OFFLINE_ALLOWED_PAYMENT_METHODS=cash,card
```

**Risk Mitigation:**
- Transaction limits prevent excessive exposure
- Daily limits cap total risk
- Manager approval adds oversight
- Audit trail for all offline payments
- Automatic fraud detection (future)

### 3. Store-and-Forward for Conexxus

**Problem Solved:** Sales data not synced during outage

**Solution:**
- Sales data queued locally
- Automatic sync when Conexxus available
- End-of-day batch processing
- Retry logic for failed syncs

**Features:**
- Priority-based queue processing
- Configurable retry attempts (default: 10)
- Automatic end-of-day sync
- Manual sync trigger available

### 4. Network Status Monitoring

**Problem Solved:** System doesn't know when offline

**Solution:**
- Active monitoring of all external services
- Health checks every 30 seconds
- Real-time status updates
- Subscriber notification system

**Monitored Services:**
- Internet connectivity (Google)
- Stripe API
- Conexxus API

**Status Levels:**
- `online`: All services available
- `degraded`: Some services unavailable
- `offline`: No internet connectivity

## Configuration

### Environment Variables

Copy values from `offline-resilience.env.example` to your `.env` file:

```bash
# Offline Payments
OFFLINE_PAYMENTS_ENABLED=true
OFFLINE_MAX_TRANSACTION_AMOUNT=500
OFFLINE_MAX_DAILY_TOTAL=5000
OFFLINE_REQUIRE_MANAGER_APPROVAL=true
OFFLINE_ALLOWED_PAYMENT_METHODS=cash,card

# Network Monitoring
NETWORK_CHECK_INTERVAL=30
NETWORK_FAILURE_THRESHOLD=2

# Offline Queue
OFFLINE_QUEUE_MAX_CONCURRENT=5
OFFLINE_QUEUE_PROCESS_INTERVAL=2
OFFLINE_QUEUE_MAX_RETRIES=5
OFFLINE_QUEUE_RETENTION_DAYS=7

# Conexxus Sync
CONEXXUS_AUTO_EOD_SYNC=true
CONEXXUS_EOD_SYNC_TIME=23:30
CONEXXUS_SYNC_PRIORITY=8
CONEXXUS_SYNC_MAX_RETRIES=10
```

### Recommended Settings

**High-Volume Store:**
```bash
OFFLINE_MAX_TRANSACTION_AMOUNT=1000
OFFLINE_MAX_DAILY_TOTAL=10000
OFFLINE_REQUIRE_MANAGER_APPROVAL=true
OFFLINE_QUEUE_MAX_CONCURRENT=10
```

**Low-Volume Store:**
```bash
OFFLINE_MAX_TRANSACTION_AMOUNT=200
OFFLINE_MAX_DAILY_TOTAL=2000
OFFLINE_REQUIRE_MANAGER_APPROVAL=false
OFFLINE_QUEUE_MAX_CONCURRENT=3
```

**Maximum Security (Cash Only):**
```bash
OFFLINE_ALLOWED_PAYMENT_METHODS=cash
OFFLINE_REQUIRE_MANAGER_APPROVAL=true
```

## Usage

### Programmatic Access

#### Check Network Status

```typescript
import { NetworkStatusService } from './common/network-status.service';

// Get current status
const status = networkStatus.getStatus();
console.log(`Online: ${status.isOnline}`);
console.log(`Stripe: ${status.services.stripe}`);
console.log(`Conexxus: ${status.services.conexxus}`);

// Check specific service
if (networkStatus.isStripeAvailable()) {
  // Process online payment
} else {
  // Use offline payment
}

// Subscribe to status changes
const unsubscribe = networkStatus.subscribe((status) => {
  console.log(`Network status changed: ${status.isOnline}`);
});
```

#### Process Offline Payment

```typescript
import { OfflinePaymentAgent } from './orders/agents/offline-payment.agent';

// Check if offline payment is allowed
const canProcess = await offlinePayment.canProcessOffline(
  100, // amount
  'card', // method
  'location-1' // locationId
);

if (canProcess.allowed) {
  // Authorize offline payment
  const result = await offlinePayment.authorizeOffline(
    100,
    'card',
    'location-1',
    {
      employeeId: 'emp-1',
      terminalId: 'term-1',
    }
  );

  if (result.status === 'offline_pending') {
    console.log('Payment authorized offline, will capture when online');
  }
}
```

#### Queue Operations

```typescript
import { OfflineQueueService } from './common/offline-queue.service';

// Enqueue operation
const queueId = await offlineQueue.enqueue(
  'payment_capture',
  {
    paymentId: 'pay-123',
    processorId: 'pi_xxx',
    amount: 100,
  },
  9, // priority (1-10)
  5  // max retries
);

// Get queue metrics
const metrics = await offlineQueue.getMetrics();
console.log(`Pending: ${metrics.pending}`);
console.log(`Success rate: ${metrics.successRate * 100}%`);

// Manually trigger processing
await offlineQueue.processQueue();
```

#### Queue Conexxus Sync

```typescript
import { ConexxusOfflineService } from './integrations/conexxus/conexxus-offline.service';

// Queue end-of-day sync
const queueId = await conexxusOffline.queueEndOfDaySync(
  'location-1',
  new Date()
);

// Get sync metrics
const metrics = await conexxusOffline.getMetrics('location-1');
console.log(`Pending syncs: ${metrics.pendingSyncs}`);
console.log(`Last successful sync: ${metrics.lastSuccessfulSync}`);

// Manually trigger sync
const result = await conexxusOffline.syncPending();
console.log(`Processed: ${result.processed}, Successful: ${result.successful}`);
```

### API Endpoints

#### Network Status

```bash
GET /health/network
```

Response:
```json
{
  "isOnline": true,
  "lastCheck": "2025-01-02T10:30:00Z",
  "consecutiveFailures": 0,
  "services": {
    "stripe": true,
    "conexxus": true,
    "internet": true
  }
}
```

#### Offline Queue Status

```bash
GET /health/offline-queue
```

Response:
```json
{
  "pending": 5,
  "processing": 1,
  "completed": 150,
  "failed": 2,
  "totalProcessed": 152,
  "successRate": 0.99
}
```

#### Offline Payment Statistics

```bash
GET /orders/offline-payments/stats?locationId=location-1&days=7
```

Response:
```json
{
  "totalOfflinePayments": 25,
  "totalAmount": 1250.00,
  "pendingCaptures": 3,
  "averageAmount": 50.00,
  "byMethod": {
    "cash": { "count": 20, "amount": 1000.00 },
    "card": { "count": 5, "amount": 250.00 }
  }
}
```

## Monitoring & Alerts

### Health Checks

The system provides health check endpoints for monitoring:

```bash
# Overall health
GET /health

# Network status
GET /health/network

# Offline queue status
GET /health/offline-queue

# Database connectivity
GET /health/db
```

### Metrics to Monitor

1. **Offline Queue Depth**
   - Alert if > 100 pending operations
   - Indicates prolonged outage or processing issues

2. **Offline Payment Total**
   - Monitor daily offline payment totals
   - Alert if approaching daily limit

3. **Network Status Duration**
   - Alert if offline > 30 minutes
   - May indicate infrastructure issue

4. **Failed Operations**
   - Monitor failed queue operations
   - May indicate data or configuration issues

### Logging

All offline operations are logged with context:

```typescript
// Network status changes
[NetworkStatusService] ✅ Network status: ONLINE
[NetworkStatusService] ⚠️ Network status: OFFLINE

// Offline payments
[OfflinePaymentAgent] Offline card payment authorized (requires online capture)
[OfflinePaymentAgent] Daily offline total: $1,250.00 / $5,000.00

// Queue operations
[OfflineQueueService] Queued payment_capture operation: queue-123
[OfflineQueueService] Processing 5 queued operations
[OfflineQueueService] Queue processing completed: 5 successful, 0 failed

// Conexxus sync
[ConexxusOfflineService] Queuing sales data for sync: 2025-01-02, 45 transactions
[ConexxusOfflineService] Successfully synced sales data: 2025-01-02
```

## Testing

### Run Offline Resilience Tests

```bash
# Run all offline resilience tests
npm run test:e2e -- offline-resilience.e2e-spec.ts

# Run specific test suite
npm run test:e2e -- offline-resilience.e2e-spec.ts -t "Network Status Monitoring"
```

### Manual Testing Scenarios

#### Scenario 1: Simulate Network Outage

```typescript
// In your test or development environment
networkStatus.setOfflineMode(true);

// Process order - should use offline payment
const order = await orderService.createOrder({
  // ... order details
  paymentMethod: 'card',
});

// Verify offline payment was used
expect(order.offlineMode).toBe(true);

// Restore online mode
networkStatus.setOfflineMode(false);
```

#### Scenario 2: Test Queue Processing

```bash
# 1. Set offline mode
# 2. Create several transactions
# 3. Check queue metrics
curl http://localhost:3000/health/offline-queue

# 4. Set online mode
# 5. Wait 2 minutes for auto-processing
# 6. Verify queue is empty
```

#### Scenario 3: Test Offline Payment Limits

```typescript
// Set low limit
offlinePayment.updateConfig({ maxTransactionAmount: 100 });

// Try transaction above limit
const result = await offlinePayment.authorizeOffline(500, 'card', 'loc-1');
expect(result.status).toBe('failed');
expect(result.errorMessage).toContain('exceeds offline limit');
```

## Troubleshooting

### Issue: Offline payments not working

**Check:**
1. `OFFLINE_PAYMENTS_ENABLED=true` in `.env`
2. Transaction amount within `OFFLINE_MAX_TRANSACTION_AMOUNT`
3. Daily total within `OFFLINE_MAX_DAILY_TOTAL`
4. Payment method in `OFFLINE_ALLOWED_PAYMENT_METHODS`

**Solution:**
```bash
# Check configuration
curl http://localhost:3000/orders/offline-payments/config

# Check daily total
curl http://localhost:3000/orders/offline-payments/stats?locationId=loc-1
```

### Issue: Queue not processing

**Check:**
1. Queue service is running
2. No errors in logs
3. Network connectivity restored

**Solution:**
```bash
# Check queue status
curl http://localhost:3000/health/offline-queue

# Manually trigger processing
curl -X POST http://localhost:3000/admin/offline-queue/process

# Check for failed operations
curl http://localhost:3000/admin/offline-queue/failed
```

### Issue: Conexxus sync failing

**Check:**
1. Conexxus API URL configured correctly
2. API key valid
3. Network connectivity to Conexxus

**Solution:**
```bash
# Test Conexxus connection
curl http://localhost:3000/conexxus/health

# Check pending syncs
curl http://localhost:3000/conexxus/pending-syncs

# Retry failed syncs
curl -X POST http://localhost:3000/admin/offline-queue/retry-failed
```

## Best Practices

### 1. Set Appropriate Limits

- **Conservative:** Start with low limits and increase based on experience
- **Risk-Based:** Higher limits for trusted employees/managers
- **Volume-Based:** Adjust based on typical transaction sizes

### 2. Monitor Regularly

- Check offline queue depth daily
- Review offline payment totals weekly
- Investigate failed operations immediately

### 3. Test Offline Scenarios

- Regularly test offline mode
- Verify queue processing works
- Ensure staff trained on offline procedures

### 4. Plan for Extended Outages

- Keep cash on hand
- Have backup payment terminal
- Document offline procedures
- Train staff on manual processes

### 5. Security Considerations

- Enable manager approval for card payments
- Set conservative transaction limits
- Monitor for unusual patterns
- Review offline payments daily

## Future Enhancements

### Planned Features

1. **Fraud Detection**
   - Pattern analysis for offline payments
   - Velocity checks
   - Anomaly detection

2. **Enhanced Monitoring**
   - Real-time dashboards
   - Slack/email alerts
   - Predictive analytics

3. **Improved Sync**
   - Differential sync
   - Compression for large datasets
   - Conflict resolution

4. **Mobile Offline Support**
   - IndexedDB for browser storage
   - Service workers for offline PWA
   - Background sync API

## Support

For issues or questions:
- Check logs: `backend/logs/`
- Review metrics: `GET /health`
- Contact support: support@pos-omni.com

## References

- [Network Status Service](../src/common/network-status.service.ts)
- [Offline Queue Service](../src/common/offline-queue.service.ts)
- [Offline Payment Agent](../src/orders/agents/offline-payment.agent.ts)
- [Conexxus Offline Service](../src/integrations/conexxus/conexxus-offline.service.ts)
- [Configuration Example](../offline-resilience.env.example)
- [Tests](../test/offline-resilience.e2e-spec.ts)

