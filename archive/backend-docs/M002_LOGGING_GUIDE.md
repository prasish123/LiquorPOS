# Logging Strategy Guide

## Overview

The POS-Omni system uses **Winston** for structured logging with support for:
- ✅ Multiple log levels (debug, info, warn, error, verbose)
- ✅ Structured JSON logging in production
- ✅ Human-readable console logs in development
- ✅ Automatic log rotation with daily files
- ✅ Request correlation IDs for distributed tracing
- ✅ Contextual metadata for easy filtering
- ✅ Separate error and combined log files
- ✅ Integration with log aggregation services

---

## Quick Start

### Basic Usage

```typescript
import { LoggerService } from './common/logger.service';

export class MyService {
  private readonly logger = new LoggerService('MyService');

  someMethod() {
    // Info level (general application flow)
    this.logger.info('Processing order', { orderId: '123' });

    // Debug level (detailed information)
    this.logger.debug('Inventory check', { sku: 'ABC123', quantity: 5 });

    // Warn level (potential issues)
    this.logger.warn('Low stock detected', { sku: 'ABC123', remaining: 2 });

    // Error level (errors and exceptions)
    try {
      // ... code that might throw
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to process order', stack, { orderId: '123', error: errorMessage });
    }
  }
}
```

---

## Log Levels

### Debug
**When to use:** Detailed information for debugging  
**Examples:** Database queries, cache hits/misses, internal state

```typescript
this.logger.debug('Cache hit for product', { productId: '123', ttl: 3600 });
```

### Info
**When to use:** General application flow, successful operations  
**Examples:** Order created, payment processed, user logged in

```typescript
this.logger.info('Order created successfully', { orderId: '123', total: 99.99 });
```

### Warn
**When to use:** Potential issues that don't prevent operation  
**Examples:** Fallback used, deprecated API called, low stock

```typescript
this.logger.warn('Redis unavailable, using in-memory cache', { service: 'RedisService' });
```

### Error
**When to use:** Errors and exceptions  
**Examples:** Database errors, payment failures, validation errors

```typescript
this.logger.error('Payment processing failed', error.stack, {
  orderId: '123',
  paymentMethod: 'card',
  error: error.message,
});
```

### Verbose
**When to use:** Very detailed information (more than debug)  
**Examples:** Raw API responses, detailed state dumps

```typescript
this.logger.verbose('Stripe API response', { response: stripeResponse });
```

---

## Request Correlation IDs

Every HTTP request automatically gets a unique correlation ID that is:
- ✅ Automatically included in all logs for that request
- ✅ Returned in the `X-Correlation-Id` response header
- ✅ Can be provided by the client in the `X-Correlation-Id` request header

### How It Works

```typescript
// Middleware automatically sets correlation ID
// All logs within the request context include it

// Example log output:
// {
//   "timestamp": "2026-01-02 10:30:45",
//   "level": "info",
//   "message": "Order created successfully",
//   "context": "OrdersService",
//   "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
//   "orderId": "123"
// }
```

### Client Usage

```bash
# Send correlation ID with request
curl -H "X-Correlation-Id: my-trace-id-123" http://localhost:3000/orders

# Server will use your ID and return it in response
# X-Correlation-Id: my-trace-id-123
```

---

## Environment Configuration

### LOG_LEVEL

Controls which logs are output. Logs at or above this level are shown.

**Options:** `debug`, `info`, `warn`, `error`  
**Default:** `info`

```bash
# Development (verbose)
LOG_LEVEL=debug

# Production (standard)
LOG_LEVEL=info

# Production (quiet)
LOG_LEVEL=warn
```

**Level Hierarchy:**
```
debug < info < warn < error
```

If `LOG_LEVEL=warn`, only `warn` and `error` logs are output.

### LOG_DIR

Directory for log files (production only). In development, logs only go to console.

**Default:** `logs`

```bash
# Custom log directory
LOG_DIR=/var/log/liquor-pos
```

---

## Log Output Formats

### Development (Console)

Human-readable format with colors:

```
2026-01-02 10:30:45 [info] [OrdersService] [a1b2c3d4] Order created successfully {"orderId":"123","total":99.99}
```

### Production (Files)

Structured JSON for easy parsing and aggregation:

```json
{
  "timestamp": "2026-01-02 10:30:45",
  "level": "info",
  "message": "Order created successfully",
  "context": "OrdersService",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "orderId": "123",
  "total": 99.99
}
```

---

## Log Files (Production Only)

### Combined Logs
**File:** `logs/combined-YYYY-MM-DD.log`  
**Contains:** All log levels  
**Rotation:** Daily  
**Max Size:** 20MB per file  
**Retention:** 14 days

### Error Logs
**File:** `logs/error-YYYY-MM-DD.log`  
**Contains:** Only error level  
**Rotation:** Daily  
**Max Size:** 20MB per file  
**Retention:** 30 days

### Automatic Rotation

Logs are automatically rotated:
- ✅ Daily (new file each day)
- ✅ When file reaches 20MB
- ✅ Old files automatically deleted after retention period

---

## Request Logging

All HTTP requests are automatically logged with:

```typescript
// Successful request (200-399)
{
  "level": "info",
  "message": "GET /orders 200 45ms",
  "method": "GET",
  "path": "/orders",
  "statusCode": 200,
  "duration": 45,
  "user": "cashier@example.com",
  "ip": "192.168.1.100",
  "correlationId": "a1b2c3d4"
}

// Client error (400-499)
{
  "level": "warn",
  "message": "POST /orders 400 12ms",
  "method": "POST",
  "path": "/orders",
  "statusCode": 400,
  "duration": 12,
  "user": "anonymous",
  "ip": "192.168.1.100",
  "correlationId": "b2c3d4e5"
}

// Server error (500+)
{
  "level": "error",
  "message": "POST /orders 500 123ms",
  "method": "POST",
  "path": "/orders",
  "statusCode": 500,
  "duration": 123,
  "user": "cashier@example.com",
  "ip": "192.168.1.100",
  "correlationId": "c3d4e5f6"
}
```

---

## Best Practices

### 1. Always Include Context

```typescript
// ✅ Good: Includes context
this.logger.error('Payment failed', error.stack, {
  orderId: '123',
  paymentMethod: 'card',
  amount: 99.99,
  error: error.message,
});

// ❌ Bad: No context
this.logger.error('Payment failed');
```

### 2. Use Appropriate Log Levels

```typescript
// ✅ Good: Correct level for each situation
this.logger.debug('Cache lookup', { key: 'product:123' });
this.logger.info('Order created', { orderId: '123' });
this.logger.warn('Low stock', { sku: 'ABC123', remaining: 2 });
this.logger.error('Database connection failed', error.stack);

// ❌ Bad: Everything at info level
this.logger.info('Cache lookup', { key: 'product:123' });
this.logger.info('Order created', { orderId: '123' });
this.logger.info('Low stock', { sku: 'ABC123', remaining: 2 });
this.logger.info('Database connection failed');
```

### 3. Log Structured Data

```typescript
// ✅ Good: Structured metadata
this.logger.info('Order created', {
  orderId: '123',
  userId: '456',
  total: 99.99,
  itemCount: 3,
});

// ❌ Bad: String concatenation
this.logger.info(`Order 123 created by user 456 with total 99.99 and 3 items`);
```

### 4. Don't Log Sensitive Data

```typescript
// ✅ Good: Redacted sensitive data
this.logger.info('Payment processed', {
  orderId: '123',
  last4: '4242',
  amount: 99.99,
});

// ❌ Bad: Full credit card number
this.logger.info('Payment processed', {
  orderId: '123',
  cardNumber: '4242424242424242',
  cvv: '123',
});
```

### 5. Use Child Loggers for Context

```typescript
export class OrdersService {
  private readonly logger = new LoggerService('OrdersService');

  processOrder(orderId: string) {
    // Create child logger with order context
    const orderLogger = this.logger.child(`OrdersService:${orderId}`);
    
    orderLogger.info('Processing order');
    orderLogger.debug('Validating items');
    orderLogger.info('Order processed successfully');
  }
}
```

### 6. Log Errors with Stack Traces

```typescript
// ✅ Good: Includes stack trace
try {
  await this.processPayment(order);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const stack = error instanceof Error ? error.stack : undefined;
  this.logger.error('Payment processing failed', stack, {
    orderId: order.id,
    error: errorMessage,
  });
  throw error;
}

// ❌ Bad: No stack trace
try {
  await this.processPayment(order);
} catch (error) {
  this.logger.error('Payment processing failed');
  throw error;
}
```

---

## Integration with Log Aggregation Services

### AWS CloudWatch

```typescript
// Add CloudWatch transport (install aws-sdk and winston-cloudwatch)
import WinstonCloudWatch from 'winston-cloudwatch';

transports.push(
  new WinstonCloudWatch({
    logGroupName: '/liquor-pos/application',
    logStreamName: `${process.env.NODE_ENV}-${new Date().toISOString().split('T')[0]}`,
    awsRegion: process.env.AWS_REGION,
  })
);
```

### Datadog

```typescript
// Add Datadog transport (install datadog-winston)
import DatadogWinston from 'datadog-winston';

transports.push(
  new DatadogWinston({
    apiKey: process.env.DATADOG_API_KEY,
    hostname: process.env.HOSTNAME,
    service: 'liquor-pos',
    ddsource: 'nodejs',
  })
);
```

### Elasticsearch (ELK Stack)

```typescript
// Add Elasticsearch transport (install winston-elasticsearch)
import { ElasticsearchTransport } from 'winston-elasticsearch';

transports.push(
  new ElasticsearchTransport({
    level: 'info',
    clientOpts: { node: process.env.ELASTICSEARCH_URL },
    index: 'liquor-pos-logs',
  })
);
```

---

## Querying Logs

### Development (Console)

```bash
# Filter by level
npm run start:dev 2>&1 | grep "error"

# Filter by context
npm run start:dev 2>&1 | grep "OrdersService"

# Filter by correlation ID
npm run start:dev 2>&1 | grep "a1b2c3d4"
```

### Production (JSON Files)

```bash
# Find all errors
cat logs/error-2026-01-02.log | jq '.message'

# Find logs for specific order
cat logs/combined-2026-01-02.log | jq 'select(.orderId == "123")'

# Find logs for specific correlation ID
cat logs/combined-2026-01-02.log | jq 'select(.correlationId == "a1b2c3d4")'

# Find slow requests (>1000ms)
cat logs/combined-2026-01-02.log | jq 'select(.duration > 1000)'

# Count errors by context
cat logs/error-2026-01-02.log | jq -r '.context' | sort | uniq -c
```

---

## Troubleshooting

### Logs Not Appearing

**Problem:** No logs in console or files

**Solutions:**
1. Check `LOG_LEVEL` - may be set too high (e.g., `error` only)
2. Check file permissions on `LOG_DIR`
3. Verify logger is initialized: `new LoggerService('Context')`

### Too Many Logs

**Problem:** Log files growing too large

**Solutions:**
1. Increase `LOG_LEVEL` to `warn` or `error`
2. Reduce retention period in logger configuration
3. Implement log sampling for high-volume endpoints

### Missing Correlation IDs

**Problem:** Logs don't include correlation IDs

**Solutions:**
1. Ensure `CorrelationIdMiddleware` is registered in `AppModule`
2. Check that middleware is applied to all routes
3. Verify CLS namespace is active

### Log Rotation Not Working

**Problem:** Old log files not being deleted

**Solutions:**
1. Check `winston-daily-rotate-file` configuration
2. Verify `maxFiles` setting (e.g., `'14d'` for 14 days)
3. Check file system permissions

---

## Migration from console.log

### Before (console.log)

```typescript
console.log('Order created:', orderId);
console.warn('Low stock:', sku);
console.error('Payment failed:', error);
```

### After (LoggerService)

```typescript
private readonly logger = new LoggerService('MyService');

this.logger.info('Order created', { orderId });
this.logger.warn('Low stock', { sku });
this.logger.error('Payment failed', error.stack, { error: error.message });
```

### Benefits

- ✅ Structured data (easy to query)
- ✅ Automatic correlation IDs
- ✅ Context included (service name)
- ✅ Log levels for filtering
- ✅ Automatic rotation and retention
- ✅ Production-ready JSON format
- ✅ Integration with log aggregation services

---

## Performance Considerations

### Log Sampling

For high-volume endpoints, implement sampling:

```typescript
// Log only 10% of successful requests
if (statusCode < 400 || Math.random() < 0.1) {
  this.logger.info('Request processed', { method, path, statusCode });
}
```

### Async Logging

Winston handles async logging automatically. No additional configuration needed.

### Log Level in Production

Set `LOG_LEVEL=info` or `LOG_LEVEL=warn` in production to reduce volume.

---

## Summary

**Logging Strategy:**
- ✅ Winston for structured logging
- ✅ Multiple log levels (debug, info, warn, error, verbose)
- ✅ Automatic log rotation and retention
- ✅ Request correlation IDs for tracing
- ✅ Contextual metadata for filtering
- ✅ JSON format for production
- ✅ Human-readable format for development
- ✅ Integration with log aggregation services

**Key Files:**
- `src/common/logger.service.ts` - Logging service
- `src/common/correlation-id.middleware.ts` - Correlation ID middleware
- `src/main.ts` - Request logging middleware
- `logs/combined-*.log` - All logs (production)
- `logs/error-*.log` - Error logs (production)

**Environment Variables:**
- `LOG_LEVEL` - Log level (debug, info, warn, error)
- `LOG_DIR` - Log directory (production only)

**Next Steps:**
1. Replace all `console.log` with `LoggerService` ✅
2. Add correlation ID middleware ✅
3. Configure log aggregation service (optional)
4. Set up log monitoring and alerting (optional)

---

**Completed:** 2026-01-02  
**Issue:** M-002 - No Logging Strategy  
**Status:** ✅ COMPLETE

