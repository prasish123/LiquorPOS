# M-005: Health Check Implementation Guide

## Overview

This guide documents the comprehensive health check system implemented for the POS-Omni liquor-pos application. The health check system provides multiple endpoints for monitoring application health, dependency status, and readiness for serving traffic.

**Issue:** M-005 - No Health Check Endpoint  
**Priority:** 🟢 MEDIUM  
**Status:** ✅ COMPLETED

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Health Check Endpoints](#health-check-endpoints)
4. [Health Indicators](#health-indicators)
5. [Usage Examples](#usage-examples)
6. [Kubernetes Integration](#kubernetes-integration)
7. [Load Balancer Configuration](#load-balancer-configuration)
8. [Monitoring and Alerting](#monitoring-and-alerting)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Quick Start

### Testing Health Endpoints

```bash
# Comprehensive health check
curl http://localhost:3000/health

# Liveness probe (is app running?)
curl http://localhost:3000/health/live

# Readiness probe (ready to serve traffic?)
curl http://localhost:3000/health/ready

# Detailed health information
curl http://localhost:3000/health/details
```

### Expected Responses

**Healthy Response (200 OK):**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "cache": {
      "status": "up"
    },
    "encryption": {
      "status": "up"
    },
    "conexxus": {
      "status": "up"
    }
  },
  "error": {},
  "details": {}
}
```

**Unhealthy Response (503 Service Unavailable):**
```json
{
  "status": "error",
  "info": {},
  "error": {
    "database": {
      "status": "down",
      "message": "Connection failed"
    }
  },
  "details": {}
}
```

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Health Controller                      │
│  (/health, /health/live, /health/ready, /health/details)│
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              HealthCheckService (Terminus)               │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┼───────────┬───────────┬────────────┐
         ▼           ▼           ▼           ▼            ▼
┌─────────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐
│   Prisma    │ │  Redis  │ │Conexxus  │ │Encryption│ │ System  │
│  Indicator  │ │Indicator│ │Indicator │ │Indicator │ │Indicators│
└─────────────┘ └─────────┘ └──────────┘ └──────────┘ └─────────┘
       │             │            │             │            │
       ▼             ▼            ▼             ▼            ▼
┌─────────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐
│  Database   │ │  Redis  │ │Conexxus  │ │Encryption│ │Memory & │
│  (SQLite)   │ │  Cache  │ │   API    │ │  Service │ │  Disk   │
└─────────────┘ └─────────┘ └──────────┘ └──────────┘ └─────────┘
```

### Health Check Types

| Endpoint | Purpose | Checks | Use Case |
|----------|---------|--------|----------|
| `/health` | Comprehensive | All dependencies | Load balancer, monitoring |
| `/health/live` | Liveness | App running, memory | Kubernetes liveness probe |
| `/health/ready` | Readiness | Critical services | Kubernetes readiness probe |
| `/health/details` | Detailed info | All + metrics | Debugging, dashboards |

---

## Health Check Endpoints

### 1. Comprehensive Health Check

**Endpoint:** `GET /health`

**Purpose:** Check all dependencies and system resources

**Checks:**
- ✅ Database connectivity (Prisma/SQLite)
- ✅ Encryption service functionality
- ⚠️ Redis cache (optional - graceful degradation)
- ⚠️ Conexxus API (optional - graceful degradation)
- ✅ Memory usage (heap)
- ✅ Disk usage

**Response Codes:**
- `200 OK` - All critical services healthy
- `503 Service Unavailable` - One or more critical services down

**Example:**
```bash
curl -i http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "encryption": {
      "status": "up",
      "keyRotationActive": false
    },
    "cache": {
      "status": "up",
      "connected": true,
      "metrics": {
        "hitRate": 0.85,
        "totalKeys": 1234
      }
    },
    "conexxus": {
      "status": "up",
      "message": "Conexxus API is reachable"
    },
    "memory_heap": {
      "status": "up"
    },
    "disk": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

**Graceful Degradation:**

If Redis or Conexxus are down, the endpoint still returns `200 OK` with degraded status:

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "cache": { 
      "status": "degraded",
      "message": "Cache unavailable (performance degraded)"
    },
    "conexxus": {
      "status": "degraded",
      "message": "Conexxus API unavailable (sync disabled)"
    }
  }
}
```

---

### 2. Liveness Probe

**Endpoint:** `GET /health/live`

**Purpose:** Determine if the application process is alive and should be restarted

**Checks:**
- ✅ Application is running
- ✅ Event loop is responsive
- ✅ Memory usage (heap < 500MB)

**Response Codes:**
- `200 OK` - Application is alive
- `503 Service Unavailable` - Application is deadlocked or out of memory

**Example:**
```bash
curl -i http://localhost:3000/health/live
```

**Response:**
```json
{
  "status": "ok",
  "info": {
    "app": {
      "status": "up",
      "message": "Application is running",
      "uptime": 3600.5,
      "timestamp": "2026-01-02T12:00:00.000Z"
    },
    "memory_heap": {
      "status": "up"
    }
  },
  "error": {},
  "details": {}
}
```

**When to Use:**
- Kubernetes liveness probe
- Container orchestration restart decisions
- Detecting deadlocks or memory leaks

**Important:** This endpoint should NEVER check external dependencies (database, Redis, etc.) as temporary outages should not trigger restarts.

---

### 3. Readiness Probe

**Endpoint:** `GET /health/ready`

**Purpose:** Determine if the application is ready to serve traffic

**Checks:**
- ✅ Database is accessible (critical)
- ✅ Encryption service is working (critical)
- ⚠️ Redis cache (optional)
- ⚠️ Conexxus API (optional)

**Response Codes:**
- `200 OK` - Application is ready to serve traffic
- `503 Service Unavailable` - Critical services are down

**Example:**
```bash
curl -i http://localhost:3000/health/ready
```

**Response:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "encryption": {
      "status": "up",
      "keyRotationActive": false
    },
    "cache": {
      "status": "up"
    },
    "conexxus": {
      "status": "up"
    }
  },
  "error": {},
  "details": {}
}
```

**When to Use:**
- Kubernetes readiness probe
- Load balancer routing decisions
- Deployment verification (wait for ready before routing traffic)

**Critical vs Optional:**

| Service | Critical? | Behavior if Down |
|---------|-----------|------------------|
| Database | ✅ Yes | Returns 503 (not ready) |
| Encryption | ✅ Yes | Returns 503 (not ready) |
| Redis | ❌ No | Returns 200 (degraded mode) |
| Conexxus | ❌ No | Returns 200 (sync disabled) |

---

### 4. Detailed Health Information

**Endpoint:** `GET /health/details`

**Purpose:** Get detailed health information with metrics for debugging

**Response:**
```json
{
  "status": "ok",
  "info": { /* ... health check results ... */ },
  "error": {},
  "details": { /* ... detailed info ... */ },
  "timestamp": "2026-01-02T12:00:00.000Z",
  "uptime": 3600.5,
  "memory": {
    "rss": 123456789,
    "heapTotal": 98765432,
    "heapUsed": 87654321,
    "external": 1234567
  },
  "environment": "production"
}
```

**When to Use:**
- Debugging health issues
- Monitoring dashboards
- Performance analysis
- Capacity planning

---

## Health Indicators

### 1. Database Health Indicator (Prisma)

**Class:** `PrismaHealthIndicator` (from `@nestjs/terminus`)

**Checks:**
- Database connection is active
- Can execute ping query

**Configuration:**
```typescript
() => this.prismaHealth.pingCheck('database', this.prisma)
```

**Failure Scenarios:**
- Database file not found
- Database locked
- Connection timeout
- Corrupted database

**Recovery:**
- Check database file permissions
- Verify DATABASE_URL environment variable
- Check disk space
- Restart application

---

### 2. Redis Health Indicator

**Class:** `RedisHealthIndicator`  
**File:** `src/health/redis-health.indicator.ts`

**Checks:**
- Redis connection is active
- Can execute commands
- Response time is acceptable

**Configuration:**
```typescript
() => this.redisHealth.isHealthy('cache')
```

**Response:**
```json
{
  "cache": {
    "status": "up",
    "connected": true,
    "message": "Redis is operational",
    "metrics": {
      "hitRate": 0.85,
      "totalKeys": 1234
    }
  }
}
```

**Failure Scenarios:**
- Redis server not running
- Connection refused
- Authentication failed
- Network timeout

**Recovery:**
- Start Redis server
- Check REDIS_URL environment variable
- Verify network connectivity
- Check Redis logs

---

### 3. Conexxus Health Indicator

**Class:** `ConexxusHealthIndicator`  
**File:** `src/health/conexxus-health.indicator.ts`

**Checks:**
- Conexxus API is reachable
- API returns healthy status
- Response time is acceptable

**Configuration:**
```typescript
() => this.conexxusHealth.isHealthy('conexxus')
```

**Response:**
```json
{
  "conexxus": {
    "status": "up",
    "message": "Conexxus API is reachable"
  }
}
```

**Failure Scenarios:**
- API server down
- Network connectivity issues
- Authentication failed
- API endpoint changed

**Recovery:**
- Check CONEXXUS_API_URL environment variable
- Verify API key (CONEXXUS_API_KEY)
- Test connection: `curl http://localhost:3000/integrations/conexxus/test-connection`
- Check Conexxus API status

**Graceful Degradation:**

If Conexxus is down, the application continues to operate:
- Inventory sync is disabled
- Sales push is queued
- Manual sync can be triggered later
- Health check returns "degraded" status (not error)

---

### 4. Encryption Health Indicator

**Class:** `EncryptionHealthIndicator`  
**File:** `src/health/encryption-health.indicator.ts`

**Checks:**
- Encryption key is configured
- Can encrypt test data
- Can decrypt encrypted data
- Encryption/decryption round-trip works

**Configuration:**
```typescript
() => this.encryptionHealth.isHealthy('encryption')
```

**Response:**
```json
{
  "encryption": {
    "status": "up",
    "message": "Encryption service is operational",
    "keyRotationActive": false
  }
}
```

**Failure Scenarios:**
- AUDIT_LOG_ENCRYPTION_KEY not set
- Invalid encryption key format
- Encryption algorithm not available
- Decryption mismatch

**Recovery:**
- Set AUDIT_LOG_ENCRYPTION_KEY environment variable
- Generate new key: `openssl rand -base64 32`
- Verify key format (base64-encoded, 32 bytes)
- Check encryption service logs

---

### 5. Memory Health Indicator

**Class:** `MemoryHealthIndicator` (from `@nestjs/terminus`)

**Checks:**
- Heap memory usage < threshold

**Configuration:**
```typescript
// Liveness: 500MB threshold
() => this.memoryHealth.checkHeap('memory_heap', 500 * 1024 * 1024)

// Comprehensive: 300MB threshold
() => this.memoryHealth.checkHeap('memory_heap', 300 * 1024 * 1024)
```

**Failure Scenarios:**
- Memory leak
- Large dataset loaded in memory
- Insufficient memory allocation

**Recovery:**
- Restart application
- Increase Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=4096`
- Investigate memory leak
- Optimize memory usage

---

### 6. Disk Health Indicator

**Class:** `DiskHealthIndicator` (from `@nestjs/terminus`)

**Checks:**
- Disk usage < 90% threshold

**Configuration:**
```typescript
() => this.diskHealth.checkStorage('disk', { 
  path: '/', 
  thresholdPercent: 0.9 
})
```

**Failure Scenarios:**
- Disk full
- Log files consuming space
- Database growing too large

**Recovery:**
- Clean up log files
- Archive old data
- Increase disk space
- Enable log rotation

---

## Usage Examples

### 1. Manual Health Check

```bash
# Check overall health
curl http://localhost:3000/health

# Check if app is alive
curl http://localhost:3000/health/live

# Check if app is ready
curl http://localhost:3000/health/ready

# Get detailed info
curl http://localhost:3000/health/details | jq
```

### 2. Automated Monitoring Script

```bash
#!/bin/bash
# health-check.sh

ENDPOINT="http://localhost:3000/health/ready"
MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT)
  
  if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Health check passed"
    exit 0
  else
    echo "❌ Health check failed (attempt $i/$MAX_RETRIES): HTTP $HTTP_CODE"
    sleep $RETRY_DELAY
  fi
done

echo "❌ Health check failed after $MAX_RETRIES attempts"
exit 1
```

### 3. Node.js Health Check Client

```typescript
import axios from 'axios';

async function checkHealth(url: string): Promise<boolean> {
  try {
    const response = await axios.get(`${url}/health/ready`, {
      timeout: 5000,
    });
    
    return response.status === 200 && response.data.status === 'ok';
  } catch (error) {
    console.error('Health check failed:', error.message);
    return false;
  }
}

// Usage
const isHealthy = await checkHealth('http://localhost:3000');
console.log(`Application is ${isHealthy ? 'healthy' : 'unhealthy'}`);
```

---

## Kubernetes Integration

### Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pos-omni-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pos-omni-backend
  template:
    metadata:
      labels:
        app: pos-omni-backend
    spec:
      containers:
      - name: backend
        image: pos-omni-backend:latest
        ports:
        - containerPort: 3000
        
        # Liveness probe - restart if app is deadlocked
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
          successThreshold: 1
        
        # Readiness probe - route traffic only when ready
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
          successThreshold: 1
        
        # Startup probe - allow longer startup time
        startupProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 30  # 150 seconds max startup time
          successThreshold: 1
        
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Probe Configuration Best Practices

| Probe | Initial Delay | Period | Timeout | Failure Threshold |
|-------|---------------|--------|---------|-------------------|
| Liveness | 30s | 10s | 5s | 3 |
| Readiness | 10s | 5s | 3s | 3 |
| Startup | 0s | 5s | 3s | 30 |

**Rationale:**
- **Liveness:** Longer delay to allow startup, less frequent checks
- **Readiness:** Shorter delay, frequent checks for fast routing decisions
- **Startup:** No delay, allows up to 150s for slow startup

---

## Load Balancer Configuration

### AWS Application Load Balancer (ALB)

```json
{
  "HealthCheckEnabled": true,
  "HealthCheckPath": "/health/ready",
  "HealthCheckProtocol": "HTTP",
  "HealthCheckIntervalSeconds": 30,
  "HealthCheckTimeoutSeconds": 5,
  "HealthyThresholdCount": 2,
  "UnhealthyThresholdCount": 3,
  "Matcher": {
    "HttpCode": "200"
  }
}
```

### NGINX Health Check

```nginx
upstream backend {
  server backend1:3000 max_fails=3 fail_timeout=30s;
  server backend2:3000 max_fails=3 fail_timeout=30s;
  server backend3:3000 max_fails=3 fail_timeout=30s;
}

server {
  listen 80;
  
  location / {
    proxy_pass http://backend;
    proxy_next_upstream error timeout http_503;
  }
  
  location /health {
    proxy_pass http://backend/health/ready;
    access_log off;
  }
}
```

### HAProxy Health Check

```haproxy
backend pos_backend
  mode http
  balance roundrobin
  option httpchk GET /health/ready
  http-check expect status 200
  
  server backend1 backend1:3000 check inter 10s fall 3 rise 2
  server backend2 backend2:3000 check inter 10s fall 3 rise 2
  server backend3 backend3:3000 check inter 10s fall 3 rise 2
```

---

## Monitoring and Alerting

### Prometheus Metrics

While the health endpoints don't expose Prometheus metrics directly, you can scrape them:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'pos-omni-health'
    metrics_path: '/health/details'
    scrape_interval: 30s
    static_configs:
      - targets: ['backend:3000']
```

### Datadog Health Check

```yaml
# datadog.yaml
init_config:

instances:
  - name: pos-omni-backend
    url: http://backend:3000/health/ready
    timeout: 5
    http_response_status_code: 200
    tags:
      - env:production
      - service:pos-omni
```

### CloudWatch Alarms

```bash
# Create CloudWatch alarm for unhealthy targets
aws cloudwatch put-metric-alarm \
  --alarm-name pos-omni-unhealthy-targets \
  --alarm-description "Alert when backend is unhealthy" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 2
```

### PagerDuty Integration

```typescript
// health-monitor.ts
import axios from 'axios';

async function monitorHealth() {
  try {
    const response = await axios.get('http://backend:3000/health/ready');
    
    if (response.status !== 200 || response.data.status !== 'ok') {
      await triggerPagerDutyAlert({
        severity: 'error',
        summary: 'Backend health check failed',
        details: response.data,
      });
    }
  } catch (error) {
    await triggerPagerDutyAlert({
      severity: 'critical',
      summary: 'Backend is unreachable',
      details: error.message,
    });
  }
}

// Run every 30 seconds
setInterval(monitorHealth, 30000);
```

---

## Troubleshooting

### Problem: Health Check Returns 503

**Symptoms:**
```bash
$ curl http://localhost:3000/health/ready
HTTP/1.1 503 Service Unavailable
```

**Possible Causes:**
1. Database is down
2. Encryption service is broken
3. Application is starting up

**Solution:**
```bash
# Check which service is failing
curl http://localhost:3000/health/details | jq '.error'

# Check database
curl http://localhost:3000/health | jq '.info.database'

# Check encryption
curl http://localhost:3000/health | jq '.info.encryption'

# Check logs
tail -f logs/combined-*.log | grep ERROR
```

---

### Problem: Liveness Probe Failing (Kubernetes Restart Loop)

**Symptoms:**
- Pod keeps restarting
- `kubectl get pods` shows `CrashLoopBackOff`

**Possible Causes:**
1. Memory leak (heap > 500MB)
2. Application deadlock
3. Startup taking too long

**Solution:**
```bash
# Check pod events
kubectl describe pod <pod-name>

# Check memory usage
kubectl top pod <pod-name>

# Increase liveness probe initial delay
kubectl edit deployment pos-omni-backend
# Set livenessProbe.initialDelaySeconds: 60

# Check application logs
kubectl logs <pod-name> --previous
```

---

### Problem: Readiness Probe Failing (No Traffic Routed)

**Symptoms:**
- Pod is running but not receiving traffic
- Load balancer shows "unhealthy"

**Possible Causes:**
1. Database connection failed
2. Encryption key missing
3. Application not fully started

**Solution:**
```bash
# Check readiness status
kubectl exec <pod-name> -- curl http://localhost:3000/health/ready

# Check environment variables
kubectl exec <pod-name> -- env | grep -E '(DATABASE|ENCRYPTION)'

# Check database connectivity
kubectl exec <pod-name> -- curl http://localhost:3000/health | jq '.info.database'

# Restart pod if needed
kubectl delete pod <pod-name>
```

---

### Problem: Degraded Status (Redis or Conexxus Down)

**Symptoms:**
```json
{
  "cache": {
    "status": "degraded",
    "message": "Cache unavailable (performance degraded)"
  }
}
```

**Impact:**
- Application still works (200 OK)
- Performance may be slower (no caching)
- Inventory sync disabled (if Conexxus down)

**Solution:**
```bash
# Check Redis
redis-cli ping

# Start Redis if needed
redis-server

# Check Conexxus connectivity
curl http://localhost:3000/integrations/conexxus/test-connection

# Monitor performance impact
curl http://localhost:3000/health/details | jq '.memory'
```

---

## Best Practices

### 1. Use Appropriate Probes

| Scenario | Use This Probe |
|----------|----------------|
| Kubernetes liveness | `/health/live` |
| Kubernetes readiness | `/health/ready` |
| Load balancer | `/health/ready` |
| Monitoring dashboard | `/health` or `/health/details` |
| Manual debugging | `/health/details` |

### 2. Configure Timeouts Correctly

```typescript
// Good: Short timeout for health checks
axios.get('/health/ready', { timeout: 3000 })

// Bad: Long timeout (delays routing decisions)
axios.get('/health/ready', { timeout: 30000 })
```

### 3. Handle Graceful Degradation

```typescript
// Good: Optional services don't fail health check
async () => {
  try {
    return await this.redisHealth.isHealthy('cache');
  } catch (error) {
    return { cache: { status: 'degraded' } };
  }
}

// Bad: Optional service failure causes 503
() => this.redisHealth.isHealthy('cache')
```

### 4. Monitor Health Check Performance

```typescript
// Add timing metrics
const start = Date.now();
const result = await healthCheck();
const duration = Date.now() - start;

if (duration > 1000) {
  logger.warn(`Health check slow: ${duration}ms`);
}
```

### 5. Don't Check External Dependencies in Liveness Probe

```typescript
// Good: Liveness only checks app state
@Get('live')
checkLiveness() {
  return { status: 'up', uptime: process.uptime() };
}

// Bad: Liveness checks database (temporary outage triggers restart)
@Get('live')
checkLiveness() {
  return this.databaseHealth.check(); // ❌ DON'T DO THIS
}
```

### 6. Log Health Check Failures

```typescript
try {
  const result = await this.health.check([...]);
  return result;
} catch (error) {
  this.logger.error('Health check failed', error.stack, {
    checks: error.causes,
  });
  throw error;
}
```

### 7. Test Health Checks in CI/CD

```yaml
# .github/workflows/test.yml
- name: Wait for application to be ready
  run: |
    timeout 60 bash -c 'until curl -f http://localhost:3000/health/ready; do sleep 2; done'

- name: Run health check tests
  run: npm test -- src/health
```

---

## Summary

The health check system provides:

✅ **Multiple Endpoints:**
- `/health` - Comprehensive check
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe
- `/health/details` - Detailed information

✅ **Comprehensive Checks:**
- Database (Prisma/SQLite)
- Redis cache
- Conexxus API
- Encryption service
- Memory usage
- Disk usage

✅ **Graceful Degradation:**
- Optional services (Redis, Conexxus) don't fail health checks
- Application continues with reduced functionality

✅ **Production-Ready:**
- Kubernetes integration
- Load balancer support
- Monitoring and alerting
- Comprehensive documentation

✅ **Well-Tested:**
- 25 unit tests
- All tests passing
- Edge cases covered

---

## Related Documentation

- [M-002: Logging Strategy Guide](./M002_LOGGING_GUIDE.md)
- [M-004: Conexxus Integration Guide](./M004_CONEXXUS_INTEGRATION_GUIDE.md)
- [Encryption Key Management](./ENCRYPTION_KEY_MANAGEMENT.md)
- [Environment Setup](../ENV_SETUP.md)

---

**Last Updated:** 2026-01-02  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

