# Conexxus Integration Guide

## Overview

The POS-Omni system integrates with Conexxus back-office systems via **REST API** for:
- ✅ Inventory synchronization (pull from Conexxus)
- ✅ Sales data push (push to Conexxus)
- ✅ Automatic retries with exponential backoff
- ✅ Comprehensive error handling
- ✅ Health monitoring and metrics
- ✅ Manual sync triggers

**Previous Implementation:** File-based (XML files on filesystem)  
**Current Implementation:** REST API with HTTP client

---

## Quick Start

### 1. Configure Environment Variables

```bash
# .env
CONEXXUS_API_URL=https://api.conexxus.example.com
CONEXXUS_API_KEY=your-api-key-here
CONEXXUS_TIMEOUT=30000        # Optional: Request timeout in ms (default: 30000)
CONEXXUS_RETRIES=3            # Optional: Number of retries (default: 3)
CONEXXUS_RETRY_DELAY=1000     # Optional: Initial retry delay in ms (default: 1000)
LOCATION_ID=your-location-id  # For sales push
```

### 2. Test Connection

```bash
# Using curl
curl http://localhost:3000/integrations/conexxus/test-connection

# Response:
{
  "success": true,
  "message": "Connection successful",
  "latency": 45
}
```

### 3. Check Health

```bash
curl http://localhost:3000/integrations/conexxus/health

# Response:
{
  "status": "healthy",
  "isHealthy": true,
  "lastSyncTime": "2026-01-02T10:00:00.000Z",
  "lastSyncStatus": "success",
  "apiConnection": true
}
```

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Conexxus Integration                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │ ConexxusService  │◄────►│ ConexxusHttpClient│            │
│  │                  │      │                  │            │
│  │ - Scheduled Jobs │      │ - HTTP Requests  │            │
│  │ - Business Logic │      │ - Retry Logic    │            │
│  │ - Error Handling │      │ - Error Transform│            │
│  │ - Metrics        │      │ - Health Checks  │            │
│  └──────────────────┘      └──────────────────┘            │
│           │                         │                       │
│           ▼                         ▼                       │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │  Products/       │      │  Conexxus REST   │            │
│  │  Inventory/      │      │  API             │            │
│  │  Orders Services │      │                  │            │
│  └──────────────────┘      └──────────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

1. **REST API Integration**
   - Replaces file-based integration
   - HTTP client with axios
   - JSON request/response format

2. **Automatic Retries**
   - Exponential backoff strategy
   - Configurable retry count
   - Retry on network errors and 5xx errors

3. **Error Handling**
   - Comprehensive error transformation
   - Detailed error logging
   - Graceful degradation

4. **Health Monitoring**
   - API health checks
   - Sync status tracking
   - Metrics collection

5. **Manual Control**
   - REST endpoints for manual sync
   - Connection testing
   - Metrics viewing

---

## Scheduled Jobs

### Inventory Sync

**Schedule:** Every hour (`@Cron(CronExpression.EVERY_HOUR)`)  
**Endpoint:** `GET /api/v1/inventory/items`  
**Purpose:** Pull inventory items from Conexxus and update local database

**Process:**
1. Fetch items from Conexxus API
2. For each item:
   - Validate data (SKU, name, price)
   - Find existing product by SKU
   - Update existing product OR create new product
3. Track metrics (processed, succeeded, failed)
4. Log results

**Example Item:**
```json
{
  "sku": "WINE001",
  "name": "Cabernet Sauvignon 2020",
  "price": 29.99,
  "category": "Wine",
  "description": "Full-bodied red wine"
}
```

### Sales Push

**Schedule:** Daily at 11:30 PM (`@Cron('0 30 23 * * *')`)  
**Endpoint:** `POST /api/v1/sales/push`  
**Purpose:** Push daily sales data to Conexxus

**Process:**
1. Get daily sales summary from orders service
2. Transform to Conexxus format
3. Push to Conexxus API
4. Log results

**Example Sales Data:**
```json
{
  "date": "2026-01-02",
  "locationId": "loc-001",
  "transactions": [
    {
      "id": "txn-001",
      "timestamp": "2026-01-02T10:00:00Z",
      "total": 49.98,
      "items": [
        {
          "sku": "WINE001",
          "quantity": 2,
          "price": 24.99
        }
      ]
    }
  ]
}
```

---

## REST API Endpoints

### Health Check

```http
GET /integrations/conexxus/health
```

**Response:**
```json
{
  "status": "healthy",
  "isHealthy": true,
  "lastSyncTime": "2026-01-02T10:00:00.000Z",
  "lastSyncStatus": "success",
  "lastError": null,
  "apiConnection": true
}
```

**Status Values:**
- `healthy` - All systems operational
- `unhealthy` - API connection failed or last sync failed

**lastSyncStatus Values:**
- `success` - All items processed successfully
- `partial` - Some items failed, some succeeded
- `failed` - All items failed or sync error

### Test Connection

```http
GET /integrations/conexxus/test-connection
```

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "latency": 45
}
```

### Get Metrics

```http
GET /integrations/conexxus/metrics
```

**Response:**
```json
{
  "latest": {
    "startTime": "2026-01-02T10:00:00.000Z",
    "endTime": "2026-01-02T10:00:15.000Z",
    "duration": 15000,
    "itemsProcessed": 100,
    "itemsSucceeded": 98,
    "itemsFailed": 2,
    "errors": [
      {
        "item": "INVALID001",
        "error": "Item missing name"
      }
    ]
  },
  "history": [
    // Last 10 sync metrics
  ]
}
```

### Manual Sync

```http
POST /integrations/conexxus/sync
```

**Response:**
```json
{
  "message": "Sync triggered",
  "status": "processing"
}
```

**Note:** Sync runs in background. Check metrics endpoint for results.

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONEXXUS_API_URL` | Yes | - | Base URL of Conexxus API |
| `CONEXXUS_API_KEY` | Yes | - | API key for authentication |
| `CONEXXUS_TIMEOUT` | No | 30000 | Request timeout in milliseconds |
| `CONEXXUS_RETRIES` | No | 3 | Number of retry attempts |
| `CONEXXUS_RETRY_DELAY` | No | 1000 | Initial retry delay in ms (exponential backoff) |
| `LOCATION_ID` | No | default | Location ID for sales push |

### Example Configuration

**Development:**
```bash
CONEXXUS_API_URL=https://api-dev.conexxus.example.com
CONEXXUS_API_KEY=dev-api-key-12345
CONEXXUS_TIMEOUT=10000
CONEXXUS_RETRIES=2
```

**Production:**
```bash
CONEXXUS_API_URL=https://api.conexxus.example.com
CONEXXUS_API_KEY=prod-api-key-67890
CONEXXUS_TIMEOUT=30000
CONEXXUS_RETRIES=3
CONEXXUS_RETRY_DELAY=2000
LOCATION_ID=store-001
```

---

## Error Handling

### Retry Strategy

**Automatic Retries:**
- Network errors (ECONNREFUSED, ENOTFOUND, etc.)
- 5xx server errors (500, 502, 503, 504)
- Timeout errors

**No Retries:**
- 4xx client errors (400, 401, 403, 404, 429)
- Successful responses (2xx)

**Exponential Backoff:**
```
Retry 1: 1000ms delay
Retry 2: 2000ms delay
Retry 3: 4000ms delay
```

### Error Types

**Authentication Error (401):**
```
Error: Conexxus API authentication failed. Check API key.
```

**Forbidden Error (403):**
```
Error: Conexxus API access forbidden. Check permissions.
```

**Not Found Error (404):**
```
Error: Conexxus API endpoint not found: /api/v1/inventory/items
```

**Rate Limit Error (429):**
```
Error: Conexxus API rate limit exceeded. Try again later.
```

**Server Error (500-599):**
```
Error: Conexxus API server error (503). Try again later.
```

**Network Error:**
```
Error: Conexxus API connection refused. Check API URL.
Error: Conexxus API host not found. Check API URL.
Error: Conexxus API request timeout after 30000ms
```

### Error Logging

All errors are logged with structured metadata:

```typescript
this.logger.error('Failed to fetch inventory items', error.stack, {
  url: '/api/v1/inventory/items',
  method: 'GET',
  status: 500,
  error: 'Internal Server Error',
});
```

---

## Monitoring

### Health Checks

**Application Health:**
```bash
# Check overall application health
curl http://localhost:3000/health

# Check Conexxus integration health
curl http://localhost:3000/integrations/conexxus/health
```

**Integration Health Indicators:**
- ✅ API connection status
- ✅ Last sync time
- ✅ Last sync status (success/partial/failed)
- ✅ Last error message (if any)

### Metrics

**Sync Metrics:**
- Start time
- End time
- Duration
- Items processed
- Items succeeded
- Items failed
- Error details

**Viewing Metrics:**
```bash
# Get latest metrics
curl http://localhost:3000/integrations/conexxus/metrics

# View in logs
grep "Conexxus inventory sync completed" logs/combined-*.log | jq
```

### Alerts

**Recommended Alerts:**
1. **Sync Failure:** Alert if `lastSyncStatus === 'failed'`
2. **API Down:** Alert if `apiConnection === false`
3. **High Failure Rate:** Alert if `itemsFailed / itemsProcessed > 0.1`
4. **No Recent Sync:** Alert if `lastSyncTime` > 2 hours ago

---

## Troubleshooting

### Problem: "API authentication failed"

**Cause:** Invalid or missing API key

**Solution:**
```bash
# Check API key is set
echo $CONEXXUS_API_KEY

# Test connection
curl http://localhost:3000/integrations/conexxus/test-connection

# Update API key in .env
CONEXXUS_API_KEY=your-correct-api-key
```

### Problem: "Connection refused"

**Cause:** API URL is incorrect or API is down

**Solution:**
```bash
# Check API URL
echo $CONEXXUS_API_URL

# Test connectivity
curl $CONEXXUS_API_URL/api/v1/health

# Update URL in .env if incorrect
CONEXXUS_API_URL=https://correct-api-url.com
```

### Problem: "Request timeout"

**Cause:** API is slow or timeout is too short

**Solution:**
```bash
# Increase timeout in .env
CONEXXUS_TIMEOUT=60000  # 60 seconds

# Check API latency
curl http://localhost:3000/integrations/conexxus/test-connection
```

### Problem: "Sync completed with errors"

**Cause:** Some items have invalid data

**Solution:**
```bash
# Check metrics for error details
curl http://localhost:3000/integrations/conexxus/metrics | jq '.latest.errors'

# Example output:
[
  {
    "item": "INVALID001",
    "error": "Item missing name"
  },
  {
    "item": "INVALID002",
    "error": "Item has invalid price"
  }
]

# Contact Conexxus to fix invalid items
```

### Problem: "No items returned from API"

**Cause:** API returned empty response

**Solution:**
```bash
# Check API directly
curl -H "X-API-Key: $CONEXXUS_API_KEY" \
  $CONEXXUS_API_URL/api/v1/inventory/items

# Check if location filter is needed
# Contact Conexxus support
```

---

## Migration from File-Based Integration

### Before (File-Based)

```typescript
// Read XML file from filesystem
const filePath = path.join(this.samplePath, 'ItemMaintenance.xml');
const data = await fs.readFile(filePath, 'utf-8');
const parser = new XMLParser();
const result = parser.parse(data);

// Problems:
// - Requires file system access
// - No automatic updates
// - No error handling
// - No retries
// - Difficult to scale
```

### After (REST API)

```typescript
// Fetch from REST API
const items = await this.httpClient.fetchInventoryItems();

// Benefits:
// ✅ Real-time updates
// ✅ Automatic retries
// ✅ Comprehensive error handling
// ✅ Health monitoring
// ✅ Cloud-native (no filesystem)
// ✅ Scalable
```

### Migration Steps

1. **Configure API credentials:**
   ```bash
   CONEXXUS_API_URL=https://api.conexxus.example.com
   CONEXXUS_API_KEY=your-api-key
   ```

2. **Test connection:**
   ```bash
   curl http://localhost:3000/integrations/conexxus/test-connection
   ```

3. **Trigger manual sync:**
   ```bash
   curl -X POST http://localhost:3000/integrations/conexxus/sync
   ```

4. **Monitor sync:**
   ```bash
   curl http://localhost:3000/integrations/conexxus/metrics
   ```

5. **Remove old files:**
   ```bash
   rm -rf sample-files/ItemMaintenance.xml
   ```

---

## Best Practices

### 1. Always Set API Key

```bash
# ✅ Good: Set API key in environment
CONEXXUS_API_KEY=your-secure-api-key

# ❌ Bad: Hardcode API key in code
const apiKey = 'hardcoded-key';
```

### 2. Monitor Health Regularly

```bash
# Set up health check monitoring
# Alert if health check fails for > 5 minutes
```

### 3. Review Sync Metrics

```bash
# Check metrics after each sync
# Investigate if failure rate > 10%
```

### 4. Handle Partial Failures

```typescript
// Sync continues even if some items fail
// Check metrics for failed items
// Contact Conexxus to fix invalid data
```

### 5. Test in Staging First

```bash
# Test with staging API first
CONEXXUS_API_URL=https://api-staging.conexxus.example.com

# Verify sync works correctly
# Then deploy to production
```

### 6. Set Appropriate Timeouts

```bash
# Development: Shorter timeout for fast feedback
CONEXXUS_TIMEOUT=10000

# Production: Longer timeout for reliability
CONEXXUS_TIMEOUT=30000
```

### 7. Use Structured Logging

```typescript
// All logs include structured metadata
this.logger.log('Sync completed', {
  processed: 100,
  succeeded: 98,
  failed: 2,
});
```

---

## Summary

**Integration Type:** REST API (replaces file-based)  
**Key Features:**
- ✅ Automatic retries with exponential backoff
- ✅ Comprehensive error handling
- ✅ Health monitoring and metrics
- ✅ Manual sync triggers
- ✅ Structured logging
- ✅ Cloud-native (no filesystem dependency)

**Key Endpoints:**
- `GET /integrations/conexxus/health` - Health check
- `GET /integrations/conexxus/test-connection` - Test API connection
- `GET /integrations/conexxus/metrics` - View sync metrics
- `POST /integrations/conexxus/sync` - Trigger manual sync

**Configuration:**
- `CONEXXUS_API_URL` - API base URL (required)
- `CONEXXUS_API_KEY` - API key (required)
- `CONEXXUS_TIMEOUT` - Request timeout (optional, default: 30000ms)
- `CONEXXUS_RETRIES` - Retry count (optional, default: 3)

**Scheduled Jobs:**
- Inventory sync: Every hour
- Sales push: Daily at 11:30 PM

---

**Created:** 2026-01-02  
**Issue:** M-004 - File-based Conexxus Integration  
**Status:** ✅ COMPLETE

