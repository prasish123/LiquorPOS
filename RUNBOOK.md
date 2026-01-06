# Operations Runbook - Liquor POS System

**Version:** 1.0  
**Last Updated:** January 5, 2026  
**Maintainer:** Operations Team

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Health Checks](#health-checks)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Common Incidents](#common-incidents)
6. [Deployment Procedures](#deployment-procedures)
7. [Backup & Recovery](#backup--recovery)
8. [Emergency Contacts](#emergency-contacts)

---

## System Overview

### Components

| Component | Technology | Port | Purpose |
|-----------|-----------|------|---------|
| **Backend API** | NestJS + Express | 3000 | REST API, business logic |
| **Frontend** | React + Vite | 5173 (dev) | POS interface |
| **Database** | PostgreSQL | 5432 | Primary data store |
| **Cache** | Redis | 6379 | Session cache, rate limiting |
| **Log Aggregation** | Grafana Loki | 3100 | Centralized logging |
| **Visualization** | Grafana | 3001 | Dashboards, alerts |
| **Error Tracking** | Sentry | N/A | Error monitoring |

### Service Dependencies

```
Frontend → Backend API → Database (PostgreSQL)
                      → Cache (Redis)
                      → Payment Gateway (Stripe)
                      → Conexxus API
                      → OpenAI API
                      
Backend API → Loki (Logging)
           → Sentry (Error Tracking)
           → Slack (Alerts)
           → PagerDuty (Critical Alerts)
```

---

## Architecture

### Request Flow

```
User → Frontend → Backend API → Database
                              → Redis Cache
                              → External APIs

All requests logged to:
  → Console (stdout)
  → File (logs/*.log)
  → Loki (aggregation)
  
All errors tracked in:
  → Sentry (error tracking)
  → Logs (structured JSON)
```

### Data Flow

```
Order Processing:
1. Frontend sends order
2. Backend validates
3. Check inventory (DB + Redis)
4. Process payment (Stripe)
5. Update inventory (DB)
6. Log to audit trail (DB)
7. Send receipt (Email/Print)
8. Track metrics (Business Metrics Service)
```

---

## Health Checks

### Available Endpoints

| Endpoint | Purpose | Expected Response | Timeout |
|----------|---------|-------------------|---------|
| `GET /health` | Overall health | 200 OK | 5s |
| `GET /health/ready` | Readiness probe | 200 OK | 3s |
| `GET /health/live` | Liveness probe | 200 OK | 1s |
| `GET /health/db` | Database health | 200 OK | 3s |
| `GET /health/redis` | Redis health | 200 OK | 2s |
| `GET /health/backup` | Backup health | 200 OK | 2s |

### Health Check Commands

```bash
# Quick health check
curl http://localhost:3000/health

# Kubernetes readiness
curl http://localhost:3000/health/ready

# Kubernetes liveness
curl http://localhost:3000/health/live

# Database specific
curl http://localhost:3000/health/db

# Redis specific
curl http://localhost:3000/health/redis
```

### Expected Responses

**Healthy:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "redis": {
      "status": "up"
    }
  }
}
```

**Unhealthy:**
```json
{
  "status": "error",
  "error": {
    "database": {
      "status": "down",
      "message": "Connection timeout"
    }
  }
}
```

---

## Monitoring & Alerts

### Log Locations

#### Backend Logs

**Development:**
```bash
# Console output
npm run start:dev

# View logs
tail -f logs/combined-*.log
tail -f logs/error-*.log
```

**Production:**
```bash
# Systemd logs
journalctl -u liquor-pos-backend -f

# File logs
tail -f /var/log/liquor-pos/combined-*.log
tail -f /var/log/liquor-pos/error-*.log

# Loki logs (via Grafana)
# Open Grafana → Explore → Loki
# Query: {service="liquor-pos-backend"}
```

**Docker:**
```bash
# Container logs
docker logs -f liquor-pos-backend

# All logs
docker-compose logs -f
```

**Kubernetes:**
```bash
# Pod logs
kubectl logs -f deployment/liquor-pos-backend

# Previous pod logs
kubectl logs -f deployment/liquor-pos-backend --previous

# All pods
kubectl logs -f -l app=liquor-pos-backend
```

#### Frontend Logs

**Browser Console:**
```javascript
// Open browser DevTools (F12)
// Console tab shows all logs
// Errors automatically sent to Sentry
```

**Sentry Dashboard:**
```
https://sentry.io/organizations/your-org/issues/
```

### Log Formats

**Structured JSON (Production):**
```json
{
  "timestamp": "2026-01-05T12:34:56.789Z",
  "level": "info",
  "message": "Order completed successfully",
  "context": "OrderOrchestrator",
  "correlationId": "req_1234567890_abc123",
  "metadata": {
    "orderId": "order-123",
    "locationId": "loc-001",
    "total": 42.78,
    "duration": 245
  }
}
```

**Human-Readable (Development):**
```
2026-01-05 12:34:56 [info] [OrderOrchestrator] [req_1234567890_abc123] Order completed successfully {"orderId":"order-123","total":42.78}
```

### Grafana Dashboards

**Access:** http://localhost:3001 (or your Grafana URL)

**Login:** admin / admin (change on first login)

**Key Dashboards:**

1. **System Overview**
   - Overall health status
   - Request rate, error rate
   - Response times (P50, P95, P99)
   - Resource usage (CPU, memory, disk)

2. **Business Metrics**
   - Orders per hour
   - Revenue per hour
   - Payment success rate
   - Order failure rate
   - Average order value

3. **API Performance**
   - Endpoint latencies
   - Slow requests
   - Error rates by endpoint
   - Request volume by endpoint

4. **Database Performance**
   - Query times
   - Slow queries
   - Connection pool usage
   - Query failure rate

5. **Alerts**
   - Active alerts
   - Alert history
   - Alert resolution times

### Loki Queries (LogQL)

**All logs from backend:**
```logql
{service="liquor-pos-backend"}
```

**Error logs only:**
```logql
{service="liquor-pos-backend"} |= "error"
```

**Logs for specific order:**
```logql
{service="liquor-pos-backend"} |= "order-123"
```

**Logs with correlation ID:**
```logql
{service="liquor-pos-backend"} | json | correlationId="req_1234567890_abc123"
```

**Slow requests (>3s):**
```logql
{service="liquor-pos-backend"} | json | duration > 3000
```

**Payment failures:**
```logql
{service="liquor-pos-backend"} |= "payment" |= "failed"
```

### Alert Rules

**Critical Alerts (PagerDuty):**
- Order failure rate > 2%
- Payment failure rate > 1%
- Database connection pool exhausted (>90%)
- Zero revenue for 1 hour (during business hours)
- Backup failed or missing (>25 hours)

**High Alerts (Slack):**
- API error rate > 5%
- P99 latency > 5 seconds
- Slow query detected (>1 second)
- Redis connection failure
- Disk usage > 90%

**Medium Alerts (Slack):**
- Cache hit rate < 80%
- P95 latency > 3 seconds
- Memory usage > 85%
- CPU usage > 80%

**Low Alerts (Log only):**
- Inventory low stock
- Failed login attempts
- Configuration warnings

### Metrics API

**Business Metrics:**
```bash
curl http://localhost:3000/monitoring/business \
  -H "Authorization: Bearer $TOKEN"
```

**Performance Metrics:**
```bash
curl http://localhost:3000/monitoring/performance \
  -H "Authorization: Bearer $TOKEN"
```

**System Metrics:**
```bash
curl http://localhost:3000/monitoring/metrics \
  -H "Authorization: Bearer $TOKEN"
```

**Prometheus Format:**
```bash
curl http://localhost:3000/monitoring/metrics/prometheus \
  -H "Authorization: Bearer $TOKEN"
```

---

## Common Incidents

### 1. High Error Rate

**Symptoms:**
- Alert: "API error rate > 5%"
- Multiple 500 errors in logs
- Users reporting failures

**Diagnosis:**
```bash
# Check recent errors
kubectl logs -f deployment/liquor-pos-backend | grep ERROR

# Check Sentry dashboard
# https://sentry.io/organizations/your-org/issues/

# Check Grafana
# Dashboard: API Performance → Error Rate
```

**Common Causes:**
1. Database connection issues
2. External API failures (Stripe, Conexxus)
3. Memory leak
4. Configuration error

**Resolution:**
```bash
# 1. Check database connectivity
kubectl exec -it deployment/liquor-pos-backend -- \
  psql $DATABASE_URL -c "SELECT 1"

# 2. Check Redis connectivity
kubectl exec -it deployment/liquor-pos-backend -- \
  redis-cli -u $REDIS_URL ping

# 3. Check memory usage
kubectl top pods -l app=liquor-pos-backend

# 4. Restart if needed
kubectl rollout restart deployment/liquor-pos-backend

# 5. Monitor recovery
kubectl logs -f deployment/liquor-pos-backend
```

**Escalation:** If error rate doesn't decrease within 5 minutes, page on-call engineer.

---

### 2. Slow Response Times

**Symptoms:**
- Alert: "P95 latency > 3 seconds"
- Users reporting slow performance
- Timeouts in logs

**Diagnosis:**
```bash
# Check slow requests
curl http://localhost:3000/monitoring/performance \
  -H "Authorization: Bearer $TOKEN" | jq '.slowRequests'

# Check slow queries
curl http://localhost:3000/monitoring/performance \
  -H "Authorization: Bearer $TOKEN" | jq '.slowQueries'

# Check Grafana
# Dashboard: API Performance → Response Times
```

**Common Causes:**
1. Slow database queries
2. High traffic
3. Memory pressure
4. External API slowness

**Resolution:**
```bash
# 1. Check database query performance
# Look for slow queries in logs
kubectl logs deployment/liquor-pos-backend | grep "Slow query"

# 2. Check connection pool
curl http://localhost:3000/health/db

# 3. Check cache hit rate
curl http://localhost:3000/health/redis

# 4. Scale up if needed
kubectl scale deployment/liquor-pos-backend --replicas=3

# 5. Monitor improvement
watch -n 5 'curl -s http://localhost:3000/monitoring/performance | jq ".stats.requests.p95"'
```

**Escalation:** If P95 latency doesn't improve within 10 minutes, page on-call engineer.

---

### 3. Database Connection Issues

**Symptoms:**
- Alert: "Database health check failed"
- `/health/db` returns 503
- Errors: "Connection timeout" or "Too many connections"

**Diagnosis:**
```bash
# Check database health
curl http://localhost:3000/health/db

# Check connection pool
# Look for "Connection pool exhausted" in logs
kubectl logs deployment/liquor-pos-backend | grep "pool"

# Check database directly
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"
```

**Common Causes:**
1. Connection pool exhausted
2. Database server down
3. Network issues
4. Connection leaks

**Resolution:**
```bash
# 1. Check database is running
kubectl get pods -l app=postgres

# 2. Check connection pool settings
# Look for DATABASE_POOL_MAX in env vars
kubectl describe deployment/liquor-pos-backend | grep DATABASE_POOL

# 3. Restart backend to reset connections
kubectl rollout restart deployment/liquor-pos-backend

# 4. If database is down, check database logs
kubectl logs -f deployment/postgres

# 5. Monitor recovery
watch -n 2 'curl -s http://localhost:3000/health/db'
```

**Escalation:** If database doesn't recover within 2 minutes, page database admin and on-call engineer.

---

### 4. Redis Connection Failure

**Symptoms:**
- Alert: "Redis connection failure"
- `/health/redis` shows degraded mode
- Cache misses increasing

**Diagnosis:**
```bash
# Check Redis health
curl http://localhost:3000/health/redis

# Check Redis directly
redis-cli -u $REDIS_URL ping

# Check cache metrics
curl http://localhost:3000/monitoring/metrics | jq '.cache'
```

**Common Causes:**
1. Redis server down
2. Network issues
3. Redis out of memory
4. Connection timeout

**Resolution:**
```bash
# 1. Check Redis is running
kubectl get pods -l app=redis

# 2. Check Redis memory
redis-cli -u $REDIS_URL INFO memory

# 3. Check Redis logs
kubectl logs -f deployment/redis

# 4. Restart Redis if needed
kubectl rollout restart deployment/redis

# 5. Backend continues with in-memory fallback
# No immediate action needed unless performance degrades
```

**Note:** System continues to operate with in-memory cache fallback. Redis failure is not critical.

**Escalation:** If Redis doesn't recover within 10 minutes, investigate further.

---

### 5. Payment Processing Failures

**Symptoms:**
- Alert: "Payment failure rate > 1%"
- Orders failing at payment step
- Stripe errors in logs

**Diagnosis:**
```bash
# Check payment metrics
curl http://localhost:3000/monitoring/business \
  -H "Authorization: Bearer $TOKEN" | jq '.payments'

# Check Stripe status
curl https://status.stripe.com/api/v2/status.json

# Check logs for payment errors
kubectl logs deployment/liquor-pos-backend | grep "payment" | grep "failed"
```

**Common Causes:**
1. Stripe API issues
2. Invalid API keys
3. Network issues
4. Card declined (user issue)

**Resolution:**
```bash
# 1. Check Stripe API status
# https://status.stripe.com/

# 2. Verify Stripe API key is set
kubectl get secret liquor-pos-secrets -o json | \
  jq -r '.data.STRIPE_SECRET_KEY' | base64 -d

# 3. Test Stripe connection
# Create test payment in Stripe dashboard

# 4. If Stripe is down, enable offline mode
# Orders will be queued and processed when Stripe recovers

# 5. Monitor recovery
watch -n 10 'curl -s http://localhost:3000/monitoring/business -H "Authorization: Bearer $TOKEN" | jq ".payments.failureRate"'
```

**Escalation:** If payment failure rate doesn't decrease within 5 minutes and Stripe status is healthy, page on-call engineer.

---

### 6. Zero Revenue Alert

**Symptoms:**
- Alert: "No revenue for 1 hour during business hours"
- No orders being processed
- Business metrics show zero activity

**Diagnosis:**
```bash
# Check business metrics
curl http://localhost:3000/monitoring/business \
  -H "Authorization: Bearer $TOKEN"

# Check if frontend is accessible
curl -I https://pos.yourdomain.com

# Check recent orders
curl http://localhost:3000/api/orders?limit=10 \
  -H "Authorization: Bearer $TOKEN"

# Check logs for errors
kubectl logs deployment/liquor-pos-backend --tail=100
```

**Common Causes:**
1. Frontend down
2. Backend down
3. Payment gateway down
4. Store actually closed (false alarm)
5. Network issues

**Resolution:**
```bash
# 1. Verify store should be open
# Check business hours configuration

# 2. Check frontend status
kubectl get pods -l app=liquor-pos-frontend

# 3. Check backend status
kubectl get pods -l app=liquor-pos-backend

# 4. Check if orders are being received
kubectl logs -f deployment/liquor-pos-backend | grep "Order"

# 5. Test order flow manually
# Use admin panel or API to create test order

# 6. If systems are healthy, may be legitimate (slow day)
```

**Escalation:** If systems are healthy but no orders for 2 hours during peak hours, notify store manager and on-call engineer.

---

### 7. Backup Failure

**Symptoms:**
- Alert: "Backup failed" or "No backup in 25 hours"
- Backup health check failing

**Diagnosis:**
```bash
# Check backup health
curl http://localhost:3000/health/backup

# Check recent backups
curl http://localhost:3000/api/backup/list \
  -H "Authorization: Bearer $TOKEN"

# Check backup logs
kubectl logs deployment/liquor-pos-backend | grep "backup"
```

**Common Causes:**
1. Insufficient disk space
2. Database connection issues
3. Backup storage unavailable
4. Backup process crashed

**Resolution:**
```bash
# 1. Check disk space
kubectl exec -it deployment/liquor-pos-backend -- df -h

# 2. Check backup directory
kubectl exec -it deployment/liquor-pos-backend -- ls -lh /backups

# 3. Trigger manual backup
curl -X POST http://localhost:3000/api/backup/create \
  -H "Authorization: Bearer $TOKEN"

# 4. Monitor backup progress
kubectl logs -f deployment/liquor-pos-backend | grep "backup"

# 5. Verify backup completed
curl http://localhost:3000/api/backup/list \
  -H "Authorization: Bearer $TOKEN"
```

**Escalation:** If backup fails twice, page database admin immediately.

---

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Environment variables updated
- [ ] Backup completed recently (<24h)
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Maintenance window scheduled (if needed)

### Standard Deployment (Zero-Downtime)

```bash
# 1. Backup database
curl -X POST http://localhost:3000/api/backup/create \
  -H "Authorization: Bearer $TOKEN"

# 2. Run database migrations (if any)
kubectl exec -it deployment/liquor-pos-backend -- \
  npm run migrate:deploy

# 3. Update backend (rolling update)
kubectl set image deployment/liquor-pos-backend \
  backend=your-registry/liquor-pos-backend:v1.2.3

# 4. Monitor rollout
kubectl rollout status deployment/liquor-pos-backend

# 5. Verify health
curl http://localhost:3000/health/ready

# 6. Update frontend
kubectl set image deployment/liquor-pos-frontend \
  frontend=your-registry/liquor-pos-frontend:v1.2.3

# 7. Monitor rollout
kubectl rollout status deployment/liquor-pos-frontend

# 8. Smoke test
# Test critical flows: login, create order, process payment

# 9. Monitor for errors
kubectl logs -f deployment/liquor-pos-backend --tail=50
```

### Rollback Procedure

```bash
# 1. Rollback backend
kubectl rollout undo deployment/liquor-pos-backend

# 2. Verify health
curl http://localhost:3000/health/ready

# 3. Rollback frontend
kubectl rollout undo deployment/liquor-pos-frontend

# 4. Rollback database (if migrations were run)
kubectl exec -it deployment/liquor-pos-backend -- \
  npm run migrate:rollback

# 5. Monitor for stability
kubectl logs -f deployment/liquor-pos-backend --tail=50

# 6. Notify team
# Send message to #deployments channel
```

### Emergency Hotfix

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-fix main

# 2. Make minimal changes
# Edit only necessary files

# 3. Test locally
npm run test

# 4. Build and push
docker build -t your-registry/liquor-pos-backend:hotfix-123 .
docker push your-registry/liquor-pos-backend:hotfix-123

# 5. Deploy immediately
kubectl set image deployment/liquor-pos-backend \
  backend=your-registry/liquor-pos-backend:hotfix-123

# 6. Monitor closely
kubectl logs -f deployment/liquor-pos-backend

# 7. Create PR for review (after deployment)
git push origin hotfix/critical-fix
# Create PR on GitHub
```

---

## Backup & Recovery

### Backup Schedule

- **Automatic:** Daily at 2:00 AM (configured in `BACKUP_SCHEDULE`)
- **Retention:** 30 days
- **Location:** `/backups` directory or S3 bucket

### Manual Backup

```bash
# Trigger backup via API
curl -X POST http://localhost:3000/api/backup/create \
  -H "Authorization: Bearer $TOKEN"

# Or via kubectl
kubectl exec -it deployment/liquor-pos-backend -- \
  npm run backup:create
```

### List Backups

```bash
# Via API
curl http://localhost:3000/api/backup/list \
  -H "Authorization: Bearer $TOKEN"

# Or via kubectl
kubectl exec -it deployment/liquor-pos-backend -- \
  ls -lh /backups
```

### Restore from Backup

```bash
# 1. Stop application
kubectl scale deployment/liquor-pos-backend --replicas=0

# 2. List available backups
kubectl exec -it deployment/liquor-pos-backend -- \
  ls -lh /backups

# 3. Restore backup
kubectl exec -it deployment/liquor-pos-backend -- \
  npm run dr:restore -- --backup-file=/backups/backup-2026-01-05.sql

# 4. Verify restoration
kubectl exec -it deployment/liquor-pos-backend -- \
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Transaction\""

# 5. Restart application
kubectl scale deployment/liquor-pos-backend --replicas=2

# 6. Verify health
curl http://localhost:3000/health/ready
```

---

## Emergency Contacts

### On-Call Rotation

| Role | Primary | Backup | Phone | Slack |
|------|---------|--------|-------|-------|
| **Engineering** | John Doe | Jane Smith | +1-555-0100 | @john |
| **Database Admin** | Bob Johnson | Alice Brown | +1-555-0101 | @bob |
| **DevOps** | Charlie Wilson | Diana Lee | +1-555-0102 | @charlie |
| **Product** | Eve Davis | Frank Miller | +1-555-0103 | @eve |

### Escalation Path

1. **L1 (0-5 min):** On-call engineer investigates
2. **L2 (5-15 min):** Escalate to senior engineer if not resolved
3. **L3 (15-30 min):** Escalate to engineering manager
4. **L4 (30+ min):** Escalate to CTO

### Communication Channels

- **Slack:** #incidents (for active incidents)
- **Slack:** #deployments (for deployment notifications)
- **Slack:** #alerts (for automated alerts)
- **PagerDuty:** For critical alerts
- **Email:** ops@yourdomain.com

### External Vendors

| Vendor | Purpose | Support | Status Page |
|--------|---------|---------|-------------|
| **Stripe** | Payment processing | support@stripe.com | status.stripe.com |
| **AWS** | Infrastructure | aws.amazon.com/support | status.aws.amazon.com |
| **Sentry** | Error tracking | support@sentry.io | status.sentry.io |
| **Grafana Cloud** | Monitoring | support@grafana.com | status.grafana.com |

---

## Quick Reference

### Most Common Commands

```bash
# Check health
curl http://localhost:3000/health

# View logs
kubectl logs -f deployment/liquor-pos-backend

# Restart service
kubectl rollout restart deployment/liquor-pos-backend

# Scale service
kubectl scale deployment/liquor-pos-backend --replicas=3

# Check metrics
curl http://localhost:3000/monitoring/business -H "Authorization: Bearer $TOKEN"

# Trigger backup
curl -X POST http://localhost:3000/api/backup/create -H "Authorization: Bearer $TOKEN"
```

### Important URLs

- **Production API:** https://api.pos-omni.example.com
- **Production Frontend:** https://pos.pos-omni.example.com
- **Grafana:** https://grafana.pos-omni.example.com
- **Sentry:** https://sentry.io/organizations/your-org
- **Kubernetes Dashboard:** https://k8s.pos-omni.example.com

---

**Last Updated:** January 5, 2026  
**Version:** 1.0  
**Maintainer:** Operations Team

For questions or updates, contact: ops@yourdomain.com

