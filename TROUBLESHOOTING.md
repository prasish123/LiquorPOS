# Troubleshooting Guide - Liquor POS System

**Version:** 1.0  
**Last Updated:** January 5, 2026

---

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Backend Issues](#backend-issues)
3. [Frontend Issues](#frontend-issues)
4. [Database Issues](#database-issues)
5. [Redis Issues](#redis-issues)
6. [Payment Issues](#payment-issues)
7. [Performance Issues](#performance-issues)
8. [Logging & Monitoring Issues](#logging--monitoring-issues)
9. [Network & Connectivity](#network--connectivity)
10. [Common Error Messages](#common-error-messages)

---

## Quick Diagnostics

### System Health Check

Run this script to get a quick overview of system health:

```bash
#!/bin/bash
echo "=== Liquor POS System Health Check ==="
echo ""

echo "1. Backend Health:"
curl -s http://localhost:3000/health | jq '.'
echo ""

echo "2. Database Health:"
curl -s http://localhost:3000/health/db | jq '.'
echo ""

echo "3. Redis Health:"
curl -s http://localhost:3000/health/redis | jq '.'
echo ""

echo "4. Recent Errors (last 10):"
kubectl logs deployment/liquor-pos-backend --tail=100 | grep ERROR | tail -10
echo ""

echo "5. Active Alerts:"
curl -s http://localhost:3000/monitoring/alerts -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "=== Health Check Complete ==="
```

### Log Locations Quick Reference

| Environment | Backend Logs | Frontend Logs | Access |
|-------------|-------------|---------------|--------|
| **Development** | `logs/combined-*.log` | Browser console | Local files |
| **Docker** | Container stdout | Browser console | `docker logs` |
| **Kubernetes** | Pod stdout | Browser console | `kubectl logs` |
| **Production** | Loki + Files | Sentry | Grafana + Files |

---

## Backend Issues

### Issue: Backend Not Starting

**Symptoms:**
- Server fails to start
- Port already in use error
- Module not found errors

**Diagnosis:**
```bash
# Check if port is in use
lsof -i :3000
# or on Windows
netstat -ano | findstr :3000

# Check for missing dependencies
npm list --depth=0

# Check environment variables
env | grep -E "(DATABASE_URL|REDIS_URL|STRIPE_SECRET_KEY)"
```

**Solutions:**

1. **Port already in use:**
```bash
# Kill process using port 3000
kill -9 $(lsof -t -i:3000)
# or change port
export PORT=3001
npm run start
```

2. **Missing dependencies:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

3. **Missing environment variables:**
```bash
# Copy example env file
cp .env.example .env
# Edit .env with correct values
nano .env
```

4. **Database connection error:**
```bash
# Check database is running
docker ps | grep postgres
# or
kubectl get pods -l app=postgres

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

---

### Issue: Backend Crashes Repeatedly

**Symptoms:**
- Server starts but crashes after a few seconds/minutes
- Out of memory errors
- Unhandled promise rejections

**Diagnosis:**
```bash
# Check logs for crash reason
kubectl logs deployment/liquor-pos-backend --previous

# Check memory usage
kubectl top pods -l app=liquor-pos-backend

# Check for unhandled rejections
kubectl logs deployment/liquor-pos-backend | grep "Unhandled"
```

**Solutions:**

1. **Out of memory:**
```bash
# Increase memory limit in deployment
kubectl set resources deployment/liquor-pos-backend \
  --limits=memory=1Gi \
  --requests=memory=512Mi

# Or in docker-compose.yml
services:
  backend:
    mem_limit: 1g
```

2. **Unhandled promise rejections:**
```bash
# Check logs for specific error
kubectl logs deployment/liquor-pos-backend | grep "UnhandledRejection" -A 10

# Common causes:
# - Database connection lost
# - Redis connection lost
# - External API timeout

# Fix: Ensure all promises have .catch() handlers
# The global handlers in main.ts will log these
```

3. **Database connection pool exhausted:**
```bash
# Increase pool size in .env
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Restart backend
kubectl rollout restart deployment/liquor-pos-backend
```

---

### Issue: API Returns 500 Errors

**Symptoms:**
- All or most API requests return 500
- Errors in logs
- Sentry showing many errors

**Diagnosis:**
```bash
# Check recent errors
kubectl logs deployment/liquor-pos-backend --tail=50 | grep ERROR

# Check Sentry dashboard
# https://sentry.io/organizations/your-org/issues/

# Check specific endpoint
curl -v http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN"
```

**Solutions:**

1. **Database connection issues:**
```bash
# Check database health
curl http://localhost:3000/health/db

# Restart backend to reset connections
kubectl rollout restart deployment/liquor-pos-backend
```

2. **Missing environment variables:**
```bash
# Check required env vars are set
kubectl describe deployment/liquor-pos-backend | grep -A 20 "Environment:"

# Update if needed
kubectl set env deployment/liquor-pos-backend \
  STRIPE_SECRET_KEY=sk_live_...
```

3. **Code error:**
```bash
# Check Sentry for stack trace
# Identify the failing code
# Deploy hotfix if critical
```

---

### Issue: Slow API Responses

**Symptoms:**
- Requests taking >3 seconds
- Timeouts
- Users complaining about slowness

**Diagnosis:**
```bash
# Check performance metrics
curl http://localhost:3000/monitoring/performance \
  -H "Authorization: Bearer $TOKEN" | jq '.stats'

# Check slow requests
curl http://localhost:3000/monitoring/performance \
  -H "Authorization: Bearer $TOKEN" | jq '.slowRequests'

# Check slow queries
curl http://localhost:3000/monitoring/performance \
  -H "Authorization: Bearer $TOKEN" | jq '.slowQueries'

# Check Grafana dashboard
# API Performance → Response Times
```

**Solutions:**

1. **Slow database queries:**
```bash
# Identify slow queries from logs
kubectl logs deployment/liquor-pos-backend | grep "Slow query"

# Add indexes if needed
# Example: Create index on frequently queried column
psql $DATABASE_URL -c "CREATE INDEX idx_orders_created_at ON \"Transaction\"(\"createdAt\")"

# Analyze query plan
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM \"Transaction\" WHERE \"createdAt\" > NOW() - INTERVAL '1 day'"
```

2. **High traffic:**
```bash
# Scale up replicas
kubectl scale deployment/liquor-pos-backend --replicas=3

# Monitor improvement
watch -n 5 'curl -s http://localhost:3000/monitoring/performance -H "Authorization: Bearer $TOKEN" | jq ".stats.requests.p95"'
```

3. **Redis cache misses:**
```bash
# Check cache hit rate
curl http://localhost:3000/monitoring/metrics \
  -H "Authorization: Bearer $TOKEN" | jq '.cache'

# If hit rate is low, check Redis is running
curl http://localhost:3000/health/redis

# Restart Redis if needed
kubectl rollout restart deployment/redis
```

4. **External API slowness:**
```bash
# Check external API status
curl https://status.stripe.com/api/v2/status.json

# Add timeouts to external calls (already configured)
# Increase timeout if needed in code
```

---

## Frontend Issues

### Issue: Frontend Not Loading

**Symptoms:**
- Blank white screen
- "Cannot GET /" error
- Build errors

**Diagnosis:**
```bash
# Check browser console for errors (F12)
# Look for JavaScript errors

# Check if frontend server is running
curl -I http://localhost:5173

# Check build output
npm run build
```

**Solutions:**

1. **Development server not running:**
```bash
# Start dev server
cd frontend
npm run dev
```

2. **Build errors:**
```bash
# Clear cache and rebuild
rm -rf node_modules dist .vite
npm install
npm run build
```

3. **Environment variables missing:**
```bash
# Check .env file exists
cat frontend/.env

# Should contain:
# VITE_API_URL=http://localhost:3000
# VITE_SENTRY_DSN=https://...
```

4. **Port conflict:**
```bash
# Change port in vite.config.ts
export default defineConfig({
  server: {
    port: 5174, // Changed from 5173
  },
});
```

---

### Issue: Frontend Can't Connect to Backend

**Symptoms:**
- Network errors in console
- "Failed to fetch" errors
- CORS errors

**Diagnosis:**
```bash
# Check browser console (F12) → Network tab
# Look for failed requests

# Check backend is running
curl http://localhost:3000/health

# Check CORS configuration
curl -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS \
  http://localhost:3000/api/orders -v
```

**Solutions:**

1. **Backend not running:**
```bash
# Start backend
cd backend
npm run start:dev
```

2. **Wrong API URL:**
```bash
# Check VITE_API_URL in frontend/.env
echo $VITE_API_URL

# Should be: http://localhost:3000 (dev) or https://api.yourdomain.com (prod)

# Update if wrong
echo "VITE_API_URL=http://localhost:3000" >> frontend/.env

# Restart frontend
npm run dev
```

3. **CORS issues:**
```bash
# Backend CORS is configured in main.ts
# Should allow origin: http://localhost:5173 (dev)

# If still having issues, check backend logs
kubectl logs deployment/liquor-pos-backend | grep CORS
```

---

### Issue: Sentry Not Capturing Errors

**Symptoms:**
- Errors in console but not in Sentry
- Sentry dashboard empty

**Diagnosis:**
```javascript
// Check browser console for Sentry initialization
// Should see: [Sentry] SDK successfully initialized

// Test Sentry manually
Sentry.captureException(new Error("Test error"));
```

**Solutions:**

1. **Sentry not initialized:**
```bash
# Check VITE_SENTRY_DSN is set
echo $VITE_SENTRY_DSN

# Should be: https://...@sentry.io/...

# Update if missing
echo "VITE_SENTRY_DSN=https://...@sentry.io/..." >> frontend/.env

# Restart frontend
npm run dev
```

2. **Wrong environment:**
```bash
# Check Sentry environment filter in dashboard
# Make sure it matches import.meta.env.MODE (development/production)
```

3. **Sentry rate limiting:**
```bash
# Check Sentry quota in dashboard
# https://sentry.io/settings/your-org/subscription/

# May need to upgrade plan or reduce sample rate
```

---

## Database Issues

### Issue: Database Connection Timeout

**Symptoms:**
- "Connection timeout" errors
- `/health/db` returns 503
- Slow queries

**Diagnosis:**
```bash
# Check database is running
kubectl get pods -l app=postgres

# Check connection
psql $DATABASE_URL -c "SELECT 1"

# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

# Check connection pool
kubectl logs deployment/liquor-pos-backend | grep "pool"
```

**Solutions:**

1. **Database not running:**
```bash
# Start database
docker-compose up -d postgres
# or
kubectl rollout restart deployment/postgres
```

2. **Too many connections:**
```bash
# Check max connections
psql $DATABASE_URL -c "SHOW max_connections"

# Check current connections
psql $DATABASE_URL -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state"

# Kill idle connections
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < NOW() - INTERVAL '5 minutes'"

# Increase max connections (in postgresql.conf)
max_connections = 200
```

3. **Connection pool exhausted:**
```bash
# Increase pool size in .env
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Restart backend
kubectl rollout restart deployment/liquor-pos-backend
```

---

### Issue: Database Migration Failed

**Symptoms:**
- Migration errors during deployment
- Schema mismatch errors
- "Table already exists" or "Column not found"

**Diagnosis:**
```bash
# Check migration status
npx prisma migrate status

# Check current schema
psql $DATABASE_URL -c "\dt"

# Check migration history
psql $DATABASE_URL -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10"
```

**Solutions:**

1. **Migration failed mid-way:**
```bash
# Mark migration as rolled back
npx prisma migrate resolve --rolled-back <migration-name>

# Re-run migration
npx prisma migrate deploy
```

2. **Schema drift:**
```bash
# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# Or manually fix schema
psql $DATABASE_URL -c "ALTER TABLE \"Transaction\" ADD COLUMN IF NOT EXISTS \"newColumn\" TEXT"

# Then mark migration as applied
npx prisma migrate resolve --applied <migration-name>
```

3. **Concurrent migrations:**
```bash
# Ensure only one instance is running migrations
# Use a migration lock or run migrations manually before deployment
```

---

### Issue: Slow Database Queries

**Symptoms:**
- Queries taking >1 second
- "Slow query" logs
- High database CPU

**Diagnosis:**
```bash
# Check slow queries from logs
kubectl logs deployment/liquor-pos-backend | grep "Slow query"

# Check slow queries in database
psql $DATABASE_URL -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10"

# Analyze specific query
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM \"Transaction\" WHERE \"createdAt\" > NOW() - INTERVAL '1 day'"
```

**Solutions:**

1. **Missing indexes:**
```bash
# Create indexes on frequently queried columns
psql $DATABASE_URL -c "CREATE INDEX IF NOT EXISTS idx_transaction_created_at ON \"Transaction\"(\"createdAt\")"
psql $DATABASE_URL -c "CREATE INDEX IF NOT EXISTS idx_transaction_location_id ON \"Transaction\"(\"locationId\")"
psql $DATABASE_URL -c "CREATE INDEX IF NOT EXISTS idx_product_sku ON \"Product\"(\"sku\")"

# Check index usage
psql $DATABASE_URL -c "SELECT schemaname, tablename, indexname, idx_scan FROM pg_stat_user_indexes ORDER BY idx_scan"
```

2. **Large table scans:**
```bash
# Add WHERE clauses to limit rows
# Add LIMIT to queries
# Use pagination for large result sets

# Example: Instead of SELECT * FROM "Transaction"
# Use: SELECT * FROM "Transaction" WHERE "createdAt" > NOW() - INTERVAL '7 days' LIMIT 100
```

3. **Database needs vacuuming:**
```bash
# Vacuum database
psql $DATABASE_URL -c "VACUUM ANALYZE"

# Enable autovacuum (in postgresql.conf)
autovacuum = on
```

---

## Redis Issues

### Issue: Redis Connection Failed

**Symptoms:**
- "Redis connection failed" errors
- `/health/redis` returns degraded mode
- Cache misses increasing

**Diagnosis:**
```bash
# Check Redis is running
kubectl get pods -l app=redis

# Test connection
redis-cli -u $REDIS_URL ping

# Check Redis logs
kubectl logs deployment/redis
```

**Solutions:**

1. **Redis not running:**
```bash
# Start Redis
docker-compose up -d redis
# or
kubectl rollout restart deployment/redis
```

2. **Wrong Redis URL:**
```bash
# Check REDIS_URL
echo $REDIS_URL

# Should be: redis://localhost:6379 (dev) or redis://redis:6379 (docker)

# Update if wrong
export REDIS_URL=redis://localhost:6379
```

3. **Redis out of memory:**
```bash
# Check memory usage
redis-cli -u $REDIS_URL INFO memory

# Increase maxmemory (in redis.conf)
maxmemory 256mb
maxmemory-policy allkeys-lru

# Or flush cache
redis-cli -u $REDIS_URL FLUSHALL
```

**Note:** System continues to operate with in-memory cache fallback when Redis is unavailable.

---

### Issue: Cache Misses High

**Symptoms:**
- Cache hit rate < 80%
- Slow response times
- High database load

**Diagnosis:**
```bash
# Check cache metrics
curl http://localhost:3000/monitoring/metrics \
  -H "Authorization: Bearer $TOKEN" | jq '.cache'

# Check Redis stats
redis-cli -u $REDIS_URL INFO stats
```

**Solutions:**

1. **Cache TTL too short:**
```bash
# Increase TTL in code
# Example: cache.set('key', value, 3600) // 1 hour instead of 300 (5 min)
```

2. **Cache eviction too aggressive:**
```bash
# Increase Redis memory
# Update maxmemory in redis.conf
maxmemory 512mb
```

3. **Cache keys not consistent:**
```bash
# Ensure cache keys are deterministic
# Example: Use sorted query params
# cache.set(`products:${sortedParams}`, data)
```

---

## Payment Issues

### Issue: Payment Processing Failures

**Symptoms:**
- "Payment failed" errors
- Orders stuck at payment step
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

# Check Stripe dashboard
# https://dashboard.stripe.com/
```

**Solutions:**

1. **Stripe API key missing or invalid:**
```bash
# Check STRIPE_SECRET_KEY is set
kubectl get secret liquor-pos-secrets -o json | \
  jq -r '.data.STRIPE_SECRET_KEY' | base64 -d

# Update if wrong
kubectl create secret generic liquor-pos-secrets \
  --from-literal=STRIPE_SECRET_KEY=sk_live_... \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart backend
kubectl rollout restart deployment/liquor-pos-backend
```

2. **Stripe API down:**
```bash
# Check Stripe status
curl https://status.stripe.com/api/v2/status.json

# If down, enable offline mode
# Payments will be queued and processed when Stripe recovers
# This is automatic in the system
```

3. **Card declined (user issue):**
```bash
# Check Stripe dashboard for decline reason
# https://dashboard.stripe.com/payments

# Common reasons:
# - Insufficient funds
# - Card expired
# - Incorrect CVV
# - Fraud prevention

# Ask user to try different card
```

4. **Network timeout:**
```bash
# Increase Stripe timeout in code
# Already set to 30 seconds in payment.agent.ts

# Check network connectivity
curl -v https://api.stripe.com/v1/charges
```

---

### Issue: Refund Failed

**Symptoms:**
- "Refund failed" errors
- Refund not showing in Stripe

**Diagnosis:**
```bash
# Check logs for refund errors
kubectl logs deployment/liquor-pos-backend | grep "refund" | grep "failed"

# Check Stripe dashboard
# https://dashboard.stripe.com/payments

# Check payment was captured
# Refunds can only be issued for captured payments
```

**Solutions:**

1. **Payment not captured:**
```bash
# Check payment status in database
psql $DATABASE_URL -c "SELECT id, status, \"processorId\" FROM \"Transaction\" WHERE id = 'order-123'"

# If status is 'authorized' but not 'captured', capture it first
curl -X POST http://localhost:3000/api/payments/capture \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"processorId": "pi_..."}'

# Then issue refund
```

2. **Refund amount exceeds payment:**
```bash
# Check refund amount doesn't exceed original payment
# Partial refunds are supported
```

3. **Stripe API error:**
```bash
# Check Stripe error message in logs
# Common errors:
# - charge_already_refunded
# - charge_expired_for_capture
# - insufficient_funds (for instant payouts)
```

---

## Performance Issues

### Issue: High CPU Usage

**Symptoms:**
- CPU usage > 80%
- Slow response times
- Server unresponsive

**Diagnosis:**
```bash
# Check CPU usage
kubectl top pods -l app=liquor-pos-backend

# Check process CPU
top -p $(pgrep -f "node.*backend")

# Check for CPU-intensive operations in logs
kubectl logs deployment/liquor-pos-backend | grep "duration" | sort -t: -k2 -n
```

**Solutions:**

1. **High traffic:**
```bash
# Scale up replicas
kubectl scale deployment/liquor-pos-backend --replicas=3

# Add horizontal pod autoscaler
kubectl autoscale deployment/liquor-pos-backend \
  --cpu-percent=70 \
  --min=2 \
  --max=10
```

2. **Inefficient code:**
```bash
# Identify slow operations from logs
kubectl logs deployment/liquor-pos-backend | grep "Slow request"

# Profile code to find bottlenecks
# Use Node.js profiler or APM tool
```

3. **Background jobs:**
```bash
# Move CPU-intensive tasks to background workers
# Use job queue (Bull, BullMQ) with Redis
```

---

### Issue: High Memory Usage

**Symptoms:**
- Memory usage > 85%
- Out of memory errors
- Server crashes

**Diagnosis:**
```bash
# Check memory usage
kubectl top pods -l app=liquor-pos-backend

# Check process memory
ps aux | grep "node.*backend"

# Check for memory leaks
kubectl logs deployment/liquor-pos-backend | grep "memory"
```

**Solutions:**

1. **Memory leak:**
```bash
# Restart to free memory temporarily
kubectl rollout restart deployment/liquor-pos-backend

# Profile memory usage
# Use Node.js --inspect flag and Chrome DevTools
node --inspect=0.0.0.0:9229 dist/main.js

# Common causes:
# - Event listeners not removed
# - Circular references
# - Large objects in memory
# - Cache not expiring
```

2. **Increase memory limit:**
```bash
# Increase memory limit
kubectl set resources deployment/liquor-pos-backend \
  --limits=memory=2Gi \
  --requests=memory=1Gi
```

3. **Optimize memory usage:**
```bash
# Use streams for large data
# Paginate database queries
# Clear cache periodically
# Use WeakMap/WeakSet for caches
```

---

### Issue: High Disk Usage

**Symptoms:**
- Disk usage > 90%
- "No space left on device" errors
- Backup failures

**Diagnosis:**
```bash
# Check disk usage
kubectl exec -it deployment/liquor-pos-backend -- df -h

# Find large files
kubectl exec -it deployment/liquor-pos-backend -- \
  du -h / | sort -rh | head -20

# Check log file sizes
kubectl exec -it deployment/liquor-pos-backend -- \
  ls -lh logs/
```

**Solutions:**

1. **Large log files:**
```bash
# Rotate logs
kubectl exec -it deployment/liquor-pos-backend -- \
  find logs/ -name "*.log" -mtime +7 -delete

# Configure log rotation (in logrotate.conf)
/var/log/liquor-pos/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

2. **Old backups:**
```bash
# Delete old backups (>30 days)
kubectl exec -it deployment/liquor-pos-backend -- \
  find /backups -name "*.sql" -mtime +30 -delete

# Configure backup retention
BACKUP_RETENTION_DAYS=30
```

3. **Increase disk size:**
```bash
# Resize persistent volume
kubectl patch pvc liquor-pos-data -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
```

---

## Logging & Monitoring Issues

### Issue: Logs Not Appearing in Loki

**Symptoms:**
- No logs in Grafana
- Loki queries return empty
- Winston logs in console but not Loki

**Diagnosis:**
```bash
# Check Loki is running
kubectl get pods -l app=loki

# Check Loki health
curl http://localhost:3100/ready

# Check backend logs for Loki errors
kubectl logs deployment/liquor-pos-backend | grep "Loki"

# Check Loki transport is enabled
kubectl describe deployment/liquor-pos-backend | grep ENABLE_LOKI_TRANSPORT
```

**Solutions:**

1. **Loki not running:**
```bash
# Start Loki
docker-compose up -d loki
# or
kubectl rollout restart deployment/loki
```

2. **Loki transport disabled:**
```bash
# Enable Loki transport in .env
ENABLE_LOKI_TRANSPORT=true
LOKI_HOST=http://loki:3100

# Restart backend
kubectl rollout restart deployment/liquor-pos-backend
```

3. **Loki URL wrong:**
```bash
# Check LOKI_HOST
echo $LOKI_HOST

# Should be: http://loki:3100 (docker) or http://localhost:3100 (dev)

# Update if wrong
export LOKI_HOST=http://loki:3100
```

4. **Loki circuit breaker open:**
```bash
# Check logs for circuit breaker status
kubectl logs deployment/liquor-pos-backend | grep "Circuit breaker"

# Circuit breaker opens after 5 consecutive failures
# Closes automatically after 60 seconds

# If persistently open, check Loki connectivity
curl http://loki:3100/loki/api/v1/push -v
```

---

### Issue: Grafana Dashboard Empty

**Symptoms:**
- Grafana shows no data
- Queries return no results
- Dashboards blank

**Diagnosis:**
```bash
# Check Grafana is running
kubectl get pods -l app=grafana

# Check Grafana logs
kubectl logs deployment/grafana

# Check Loki data source
# Grafana → Configuration → Data Sources → Loki
# Test connection

# Run manual query in Grafana Explore
# {service="liquor-pos-backend"}
```

**Solutions:**

1. **Loki data source not configured:**
```bash
# Add Loki data source in Grafana
# Configuration → Data Sources → Add data source → Loki
# URL: http://loki:3100
# Save & Test
```

2. **Time range too narrow:**
```bash
# Expand time range in Grafana
# Top right corner → Last 6 hours or Last 24 hours
```

3. **No logs in time range:**
```bash
# Check logs are being sent to Loki
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={service="liquor-pos-backend"}' | jq '.'

# If empty, check Loki transport is working
kubectl logs deployment/liquor-pos-backend | grep "Loki"
```

---

### Issue: Sentry Not Receiving Errors

**Symptoms:**
- Errors in logs but not in Sentry
- Sentry dashboard empty
- No error notifications

**Diagnosis:**
```bash
# Check Sentry is initialized
kubectl logs deployment/liquor-pos-backend | grep "Sentry"

# Check SENTRY_DSN is set
kubectl describe deployment/liquor-pos-backend | grep SENTRY_DSN

# Test Sentry manually
curl -X POST http://localhost:3000/api/test/sentry-error \
  -H "Authorization: Bearer $TOKEN"
```

**Solutions:**

1. **Sentry not initialized:**
```bash
# Check SENTRY_DSN is set
echo $SENTRY_DSN

# Should be: https://...@sentry.io/...

# Update if missing
export SENTRY_DSN=https://...@sentry.io/...

# Restart backend
kubectl rollout restart deployment/liquor-pos-backend
```

2. **Wrong environment:**
```bash
# Check Sentry environment filter
# Sentry dashboard → Filters → Environment

# Make sure it matches NODE_ENV (development/production)
```

3. **Sentry rate limiting:**
```bash
# Check Sentry quota
# https://sentry.io/settings/your-org/subscription/

# May need to upgrade plan or reduce sample rate
# In sentry.service.ts, adjust tracesSampleRate
```

---

## Network & Connectivity

### Issue: Cannot Connect to External APIs

**Symptoms:**
- "Connection timeout" to Stripe, Conexxus, etc.
- External API errors
- Network errors in logs

**Diagnosis:**
```bash
# Test connectivity to Stripe
curl -v https://api.stripe.com/v1/charges

# Test connectivity to Conexxus
curl -v https://api.conexxus.com/health

# Check DNS resolution
nslookup api.stripe.com

# Check firewall rules
iptables -L -n
```

**Solutions:**

1. **Firewall blocking:**
```bash
# Allow outbound HTTPS
iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT

# Or configure firewall rules in cloud provider
```

2. **DNS issues:**
```bash
# Use alternative DNS
echo "nameserver 8.8.8.8" >> /etc/resolv.conf

# Or use IP address instead of hostname (not recommended)
```

3. **Proxy required:**
```bash
# Configure HTTP proxy
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

# Restart backend
kubectl rollout restart deployment/liquor-pos-backend
```

---

### Issue: CORS Errors

**Symptoms:**
- "CORS policy" errors in browser console
- Preflight request failures
- OPTIONS requests failing

**Diagnosis:**
```bash
# Check CORS headers
curl -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS \
  http://localhost:3000/api/orders -v

# Should see:
# Access-Control-Allow-Origin: http://localhost:5173
# Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
```

**Solutions:**

1. **CORS not configured:**
```bash
# CORS is configured in backend/src/main.ts
# Should allow origin: http://localhost:5173 (dev)

# Check CORS configuration
kubectl logs deployment/liquor-pos-backend | grep CORS
```

2. **Wrong origin:**
```bash
# Update allowed origins in main.ts
app.enableCors({
  origin: [
    'http://localhost:5173',
    'https://pos.yourdomain.com',
  ],
  credentials: true,
});
```

3. **Credentials issue:**
```bash
# Ensure credentials: true in both backend and frontend
# Backend: app.enableCors({ credentials: true })
# Frontend: fetch(url, { credentials: 'include' })
```

---

## Common Error Messages

### "Connection pool timeout"

**Cause:** Database connection pool exhausted

**Solution:**
```bash
# Increase pool size
DATABASE_POOL_MAX=20

# Restart backend
kubectl rollout restart deployment/liquor-pos-backend
```

---

### "ECONNREFUSED"

**Cause:** Service not running or wrong host/port

**Solution:**
```bash
# Check service is running
kubectl get pods

# Check connection details
echo $DATABASE_URL
echo $REDIS_URL

# Update if wrong
```

---

### "Cannot find module"

**Cause:** Missing dependency

**Solution:**
```bash
# Reinstall dependencies
npm install

# Or install specific module
npm install <module-name>
```

---

### "Port 3000 is already in use"

**Cause:** Another process using the port

**Solution:**
```bash
# Kill process
kill -9 $(lsof -t -i:3000)

# Or use different port
export PORT=3001
```

---

### "Prisma Client could not connect to database"

**Cause:** Database not running or wrong connection string

**Solution:**
```bash
# Check database is running
docker ps | grep postgres

# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

---

### "Redis connection to localhost:6379 failed"

**Cause:** Redis not running

**Solution:**
```bash
# Start Redis
docker-compose up -d redis

# Or use different Redis URL
export REDIS_URL=redis://redis:6379
```

---

### "Stripe API key invalid"

**Cause:** Wrong or expired Stripe API key

**Solution:**
```bash
# Get new API key from Stripe dashboard
# https://dashboard.stripe.com/apikeys

# Update environment variable
export STRIPE_SECRET_KEY=sk_live_...

# Restart backend
kubectl rollout restart deployment/liquor-pos-backend
```

---

### "Out of memory"

**Cause:** Memory limit exceeded

**Solution:**
```bash
# Increase memory limit
kubectl set resources deployment/liquor-pos-backend \
  --limits=memory=2Gi

# Or investigate memory leak
```

---

### "Disk quota exceeded"

**Cause:** Disk full

**Solution:**
```bash
# Clean up logs
find logs/ -name "*.log" -mtime +7 -delete

# Clean up backups
find /backups -name "*.sql" -mtime +30 -delete

# Increase disk size
```

---

## Getting Help

### Before Asking for Help

1. Check this troubleshooting guide
2. Check logs for error messages
3. Check health endpoints
4. Check Sentry for stack traces
5. Check Grafana for metrics

### When Asking for Help

Provide:
1. Error message (full stack trace)
2. Steps to reproduce
3. Environment (dev/staging/prod)
4. Recent changes (deployments, config)
5. Relevant logs (last 50 lines)
6. Health check results

### Contact

- **Slack:** #incidents (for urgent issues)
- **Slack:** #engineering (for non-urgent questions)
- **Email:** ops@yourdomain.com
- **PagerDuty:** For critical production issues

---

**Last Updated:** January 5, 2026  
**Version:** 1.0  
**Maintainer:** Operations Team

