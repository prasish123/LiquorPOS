# Loki Centralized Logging Integration Guide

## 🎯 Overview

This guide explains how to set up and use centralized logging with **Grafana Loki** in the Liquor POS system. Loki provides powerful log aggregation, querying, and visualization capabilities for the free observability stack.

## ✅ What's Included

The Loki integration includes:

- **LokiTransport**: Custom Winston transport with advanced features
  - Batching support for efficient log shipping
  - Circuit breaker pattern for resilience
  - Retry logic with exponential backoff
  - Queue management to prevent memory issues
  - Comprehensive error handling

- **Automatic Integration**: Logs are automatically sent to Loki when enabled
  - All application logs (debug, info, warn, error)
  - Structured logging with metadata
  - Correlation IDs for request tracking
  - Location and environment labels

- **Test Suite**: Comprehensive tests and verification scripts
  - Unit tests for LokiTransport
  - Integration test script
  - PowerShell helper script

## 📋 Prerequisites

1. **Loki Server**: Running instance of Grafana Loki
   - Use the provided `start-observability.ps1` script (Loki + Grafana)
   - Or use the full stack: `bash scripts/observability/setup-free-stack.sh`

2. **Environment Variables**: Required configuration (see below)

## 🚀 Quick Start

### 1. Start Loki and Grafana

**Option A: Quick Start (Loki + Grafana only)**

```powershell
# From project root
.\start-observability.ps1
```

This starts:
- Loki on `http://localhost:3100`
- Grafana on `http://localhost:3000` (admin/admin)

**Option B: Full Stack (Loki + Grafana + Prometheus + Uptime Kuma)**

```bash
# From project root
bash scripts/observability/setup-free-stack.sh
```

### 2. Configure Environment Variables

Add these to your `backend/.env` file:

```env
# Loki Configuration
LOKI_ENABLED=true
LOKI_URL=http://localhost:3100

# Location Configuration (required)
LOCATION_ID=store-001

# Optional: Loki Fine-tuning
LOKI_BATCH_INTERVAL=5000        # Batch interval in ms (default: 5000)
LOKI_MAX_BATCH_SIZE=100         # Max logs per batch (default: 100)
LOKI_MAX_RETRIES=3              # Max retry attempts (default: 3)
```

### 3. Test the Integration

```bash
# From backend directory
cd backend

# Run the integration test
npm run test:loki

# Or use the PowerShell script
pwsh scripts/test-loki.ps1
```

### 4. Start Your Application

```bash
npm run start:dev
```

You should see:
```
✅ Loki transport enabled: http://localhost:3100
```

## 🔧 Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOKI_ENABLED` | Yes | `false` | Enable/disable Loki integration |
| `LOKI_URL` | Yes* | - | Loki server URL (required if enabled) |
| `LOCATION_ID` | Yes | `default-location` | Store/location identifier |
| `LOKI_BATCH_INTERVAL` | No | `5000` | Batch interval in milliseconds |
| `LOKI_MAX_BATCH_SIZE` | No | `100` | Maximum logs per batch |
| `LOKI_MAX_RETRIES` | No | `3` | Maximum retry attempts |

*Required when `LOKI_ENABLED=true`

### Validation Rules

The configuration validator enforces:
- `LOKI_URL` must be set when `LOKI_ENABLED=true`
- `LOKI_BATCH_INTERVAL` must be at least 100ms
- `LOKI_MAX_BATCH_SIZE` must be at least 1
- `LOKI_MAX_RETRIES` must be at least 0
- `LOCATION_ID` must be a non-empty string

## 📊 Using Grafana to View Logs

### 1. Access Grafana

Open http://localhost:3000 in your browser
- Username: `admin`
- Password: `admin`

### 2. Explore Logs

Navigate to **Explore** (compass icon in sidebar)

### 3. Example Queries

**All logs from your application:**
```logql
{service="liquor-pos-backend"}
```

**Logs from a specific location:**
```logql
{service="liquor-pos-backend", location="store-001"}
```

**Error logs only:**
```logql
{service="liquor-pos-backend"} |= "level" |= "error"
```

**Logs for a specific user:**
```logql
{service="liquor-pos-backend"} |= "user" |= "john@example.com"
```

**Logs with correlation ID (trace requests):**
```logql
{service="liquor-pos-backend"} |= "correlationId" |= "abc-123"
```

**Rate of errors per minute:**
```logql
rate({service="liquor-pos-backend"} |= "error" [1m])
```

### 4. Create Dashboards

1. Click **Dashboards** → **New Dashboard**
2. Add panels with LogQL queries
3. Save your dashboard

**Recommended Panels:**
- Error rate over time
- Log volume by level
- Top error messages
- Logs by location
- Request duration distribution

## 🧪 Testing

### Run Unit Tests

```bash
cd backend
npm test -- logger/loki-transport.spec.ts
```

### Run Integration Test

```bash
# Make sure Loki is running first
npm run test:loki
```

The integration test will:
1. ✅ Check if Loki is accessible
2. ✅ Send test logs at various levels
3. ✅ Query Loki to verify logs were received
4. ✅ Report results

### Manual Testing

```bash
# Start the application
npm run start:dev

# In another terminal, make some requests
curl http://localhost:3000/api/health

# Check Grafana Explore for logs
```

## 🔍 How It Works

### Architecture

```
Application Code
       ↓
LoggerService (Winston)
       ↓
LokiTransport
       ↓
Batching Queue (5s interval or 100 logs)
       ↓
HTTP POST to Loki
       ↓
Loki Storage
       ↓
Grafana Query Interface
```

### Log Flow

1. **Application logs**: Your code calls `logger.info()`, `logger.error()`, etc.
2. **Winston processes**: Formats and enriches logs with metadata
3. **LokiTransport batches**: Collects logs for efficient sending
4. **Circuit breaker checks**: Prevents overwhelming Loki if it's down
5. **HTTP POST**: Sends batch to Loki API
6. **Retry on failure**: Exponential backoff if request fails
7. **Loki stores**: Indexes and stores logs
8. **Grafana queries**: You can search and visualize logs

### Labels

Every log includes these labels:
- `service`: `liquor-pos-backend`
- `location`: Your `LOCATION_ID`
- `environment`: `development`, `production`, or `test`
- `level`: `debug`, `info`, `warn`, or `error`

### Metadata

Logs include rich metadata:
- `timestamp`: ISO 8601 timestamp
- `message`: Log message
- `level`: Log level
- `context`: Logger context (e.g., "HTTP", "PaymentService")
- `correlationId`: Request correlation ID (if available)
- Custom fields: Any metadata you pass to the logger

## 🛡️ Resilience Features

### Circuit Breaker

Protects your application from Loki outages:
- **Closed**: Normal operation, logs sent to Loki
- **Open**: After 5 failures, stops sending logs for 60 seconds
- **Half-Open**: After timeout, tries one request to test recovery

### Retry Logic

Automatic retries with exponential backoff:
- 1st retry: 1 second delay
- 2nd retry: 2 seconds delay
- 3rd retry: 4 seconds delay
- After 3 retries: Log is dropped (app continues)

### Queue Management

Prevents memory issues:
- Max queue size: 1000 logs (configurable)
- When full: Drops oldest logs
- Warning logged when queue is full

### Batching

Efficient log shipping:
- Collects logs for 5 seconds (configurable)
- Or sends when 100 logs collected (configurable)
- Reduces HTTP overhead
- Improves throughput

## 🐛 Troubleshooting

### Logs Not Appearing in Grafana

**Check 1: Is Loki enabled?**
```bash
# Check your .env file
cat backend/.env | grep LOKI_ENABLED
# Should be: LOKI_ENABLED=true
```

**Check 2: Is Loki running?**
```bash
curl http://localhost:3100/ready
# Should return: ready
```

**Check 3: Check application logs**
```bash
# Look for this message when app starts:
# ✅ Loki transport enabled: http://localhost:3100
```

**Check 4: Wait for batching**
Logs are batched every 5 seconds. Wait a bit and check again.

**Check 5: Check circuit breaker**
If Loki was down, the circuit breaker may be open. Restart your application.

### Test Script Fails

**Error: "Failed to connect to Loki"**
- Make sure Loki is running: `.\start-observability.ps1`
- Check the URL: `echo $env:LOKI_URL` (PowerShell) or `echo $LOKI_URL` (bash)

**Error: "No logs found in Loki"**
- Logs may still be in the batch queue
- Wait 10 seconds and try again
- Check Grafana Explore manually

### Application Won't Start

**Error: "LOKI_URL is required when LOKI_ENABLED is true"**
- Set `LOKI_URL=http://localhost:3100` in your `.env` file

**Error: "LOCATION_ID must be set to a non-empty string"**
- Set `LOCATION_ID=store-001` (or your store ID) in your `.env` file

## 📚 Advanced Usage

### Custom Log Metadata

```typescript
logger.info('Payment processed', {
  amount: 50.00,
  paymentMethod: 'credit_card',
  transactionId: 'txn_123',
  customerId: 'cust_456',
});
```

### Correlation IDs

Correlation IDs are automatically included in logs for HTTP requests:

```typescript
// Automatically set by middleware
LoggerService.setCorrelationId(req.headers['x-correlation-id']);

// All logs in this request will include the correlation ID
logger.info('Processing order'); // Includes correlationId
```

### Child Loggers

Create context-specific loggers:

```typescript
const logger = new LoggerService('PaymentService');
const childLogger = logger.child('StripeIntegration');

childLogger.info('Processing payment'); // Context: PaymentService.StripeIntegration
```

### Querying by Correlation ID

Find all logs for a specific request:

```logql
{service="liquor-pos-backend"} |= "correlationId" |= "abc-123-def-456"
```

### Performance Monitoring

Track slow requests:

```logql
{service="liquor-pos-backend"} 
  |= "duration" 
  | json 
  | duration > 1000
```

## 🔐 Security Considerations

### Production Deployment

1. **Use HTTPS**: Set `LOKI_URL=https://your-loki-instance.com`
2. **Authentication**: Configure Loki with authentication
3. **Network Security**: Use VPN or private network
4. **Log Sanitization**: Avoid logging sensitive data (passwords, tokens, PII)

### Sensitive Data

Never log:
- Passwords
- API keys
- Credit card numbers
- Social security numbers
- Personal identifiable information (PII)

The application automatically sanitizes some sensitive fields, but always review your logs.

## 📈 Performance Impact

### Overhead

- **Memory**: ~1-2 MB for batch queue
- **CPU**: Minimal (batching reduces overhead)
- **Network**: ~1 HTTP request every 5 seconds (or per 100 logs)

### Optimization Tips

1. **Adjust batch size**: Larger batches = fewer requests
2. **Increase batch interval**: Less frequent sending
3. **Filter log levels**: Only send `warn` and `error` in production
4. **Use circuit breaker**: Automatically stops sending if Loki is down

### Production Settings

```env
# Recommended for production
LOKI_ENABLED=true
LOKI_URL=https://your-loki-instance.com
LOKI_BATCH_INTERVAL=10000      # 10 seconds
LOKI_MAX_BATCH_SIZE=200        # Larger batches
LOKI_MAX_RETRIES=5             # More retries
LOG_LEVEL=info                 # Skip debug logs
```

## 🆘 Support

### Documentation

- [Grafana Loki Documentation](https://grafana.com/docs/loki/latest/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Winston Documentation](https://github.com/winstonjs/winston)

### Files

- **Transport Implementation**: `backend/src/common/logger/loki-transport.ts`
- **Logger Service**: `backend/src/common/logger.service.ts`
- **Configuration**: `backend/src/config/app.config.ts`
- **Tests**: `backend/src/common/logger/loki-transport.spec.ts`
- **Integration Test**: `backend/scripts/test-loki-integration.ts`

### Common Issues

See the **Troubleshooting** section above for solutions to common problems.

## 🎉 Success Checklist

- [ ] Loki is running (`curl http://localhost:3100/ready`)
- [ ] Environment variables are set (`LOKI_ENABLED`, `LOKI_URL`, `LOCATION_ID`)
- [ ] Integration test passes (`npm run test:loki`)
- [ ] Application starts with "✅ Loki transport enabled" message
- [ ] Logs appear in Grafana Explore
- [ ] You can query logs with LogQL
- [ ] Dashboards are created (optional)

## 📝 Next Steps

1. **Create Dashboards**: Build visualizations for your logs
2. **Set Up Alerts**: Configure Grafana alerts for errors
3. **Explore LogQL**: Learn advanced query patterns
4. **Monitor Performance**: Track application metrics
5. **Scale Loki**: Deploy Loki in production with persistence

---

**Need Help?** Check the troubleshooting section or review the test scripts for examples.

