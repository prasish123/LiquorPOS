# C-009: Monitoring & APM - Quick Reference

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
# .env
SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_PROFILES_SAMPLE_RATE=1.0
```

### 3. Start Application

```bash
npm run start:dev
```

### 4. Verify Monitoring

```bash
curl http://localhost:3000/monitoring/health
```

---

## 📊 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /monitoring/performance` | Performance statistics |
| `GET /monitoring/metrics` | Application metrics |
| `GET /monitoring/metrics/prometheus` | Prometheus format metrics |
| `GET /monitoring/sentry/status` | Sentry configuration |
| `GET /monitoring/health` | Monitoring health status |

---

## 🔧 Environment Variables

```bash
# Sentry (Optional - enables error tracking)
SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_ENVIRONMENT=production  # development, staging, production
SENTRY_RELEASE=1.0.0  # Optional: version/git hash
SENTRY_TRACES_SAMPLE_RATE=1.0  # 0.0 to 1.0 (1.0 = 100%)
SENTRY_PROFILES_SAMPLE_RATE=1.0  # 0.0 to 1.0 (1.0 = 100%)

# Logging (Already configured)
LOG_LEVEL=info  # debug, info, warn, error
LOG_DIR=logs
```

---

## 📈 Usage Examples

### Track Custom Operations

```typescript
import { PerformanceMonitoringService } from './monitoring/performance-monitoring.service';

@Injectable()
export class MyService {
  constructor(private readonly perf: PerformanceMonitoringService) {}

  async myOperation() {
    const stop = this.perf.startTracking('my_operation');
    try {
      // Your code here
    } finally {
      stop();
    }
  }
}
```

### Record Metrics

```typescript
import { MetricsService } from './monitoring/metrics.service';

@Injectable()
export class MyService {
  constructor(private readonly metrics: MetricsService) {}

  async processItem() {
    // Increment counter
    this.metrics.incrementCounter('items_processed', 1, {
      type: 'order',
    });

    // Record duration
    this.metrics.recordHistogram('processing_time', 150, {
      type: 'order',
    });

    // Update gauge
    this.metrics.setGauge('queue_size', 42);
  }
}
```

### Capture Errors in Sentry

```typescript
import { SentryService } from './monitoring/sentry.service';

@Injectable()
export class MyService {
  constructor(private readonly sentry: SentryService) {}

  async riskyOperation(userId: string) {
    // Set user context
    this.sentry.setUser({ id: userId });

    // Add breadcrumb
    this.sentry.addBreadcrumb({
      message: 'Starting risky operation',
      level: 'info',
    });

    try {
      // Your code here
    } catch (error) {
      // Capture with context
      this.sentry.captureException(error, {
        tags: { operation: 'risky' },
        extra: { userId },
      });
      throw error;
    }
  }
}
```

---

## 🎯 What Gets Tracked Automatically

### HTTP Requests
- ✅ Request duration
- ✅ HTTP method and path
- ✅ Status code
- ✅ User information
- ✅ Correlation ID
- ✅ Slow requests (>3s)

### Database Queries
- ✅ Query duration
- ✅ Model and action
- ✅ Success/failure
- ✅ Slow queries (>1s)

### Errors
- ✅ Exception type
- ✅ Stack trace
- ✅ User context
- ✅ Request context
- ✅ Correlation ID

---

## 📊 Metrics Available

### Counters
- `http_requests_total` - Total HTTP requests
- `http_errors_total` - Total HTTP errors
- `db_queries_total` - Total database queries

### Histograms
- `http_request_duration_ms` - Request duration
- `db_query_duration_ms` - Query duration

### Custom
- Track any custom metric with labels

---

## 🔍 Monitoring Dashboard

### Performance Stats

```bash
curl http://localhost:3000/monitoring/performance | jq
```

**Response:**
```json
{
  "stats": {
    "requests": {
      "total": 1000,
      "averageDuration": 150,
      "p50": 120,
      "p95": 450,
      "p99": 800
    },
    "database": {
      "total": 5000,
      "averageDuration": 25
    }
  },
  "slowRequests": [...],
  "slowQueries": [...]
}
```

### Prometheus Metrics

```bash
curl http://localhost:3000/monitoring/metrics/prometheus
```

**Response:**
```
http_requests_total{method="GET",status="200"} 10000
http_request_duration_ms_avg 150
db_queries_total{model="User",action="findMany"} 500
```

---

## 🚨 Troubleshooting

### Sentry Not Working

```bash
# Check if DSN is set
echo $SENTRY_DSN

# Check Sentry status
curl http://localhost:3000/monitoring/sentry/status

# Check logs
grep "Sentry" logs/combined-*.log
```

### High Memory Usage

**Solution:** Lower sample rates

```bash
SENTRY_TRACES_SAMPLE_RATE=0.1  # Track 10% of requests
SENTRY_PROFILES_SAMPLE_RATE=0.01  # Profile 1% of requests
```

### Slow Requests Not Detected

**Check threshold:**
- Default: 3000ms (3 seconds)
- Adjust in `PerformanceMonitoringService`

---

## 📚 Documentation

- **Full Report:** [C009_MONITORING_APM_COMPLETION_REPORT.md](./C009_MONITORING_APM_COMPLETION_REPORT.md)
- **Sentry Docs:** https://docs.sentry.io/platforms/node/
- **Prometheus:** https://prometheus.io/docs/

---

## ✅ Production Checklist

- [ ] Set `SENTRY_DSN` in production
- [ ] Set `SENTRY_ENVIRONMENT=production`
- [ ] Set `SENTRY_RELEASE` to version/git hash
- [ ] Lower sample rates for high traffic (10-20%)
- [ ] Configure Sentry alerts
- [ ] Set up Grafana dashboard (optional)
- [ ] Test error reporting
- [ ] Test performance tracking
- [ ] Monitor memory usage
- [ ] Review slow queries weekly

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** January 2, 2026

