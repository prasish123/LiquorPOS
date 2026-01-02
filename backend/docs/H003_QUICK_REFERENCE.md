# H-003: Redis Health Monitoring - Quick Reference

## 🎯 What Was Fixed

Redis connection failures now detected immediately with graceful degradation instead of silent performance issues.

---

## 🚀 Quick Start

### Check Health Status
```bash
# Comprehensive health check
curl http://localhost:3000/health

# Liveness probe
curl http://localhost:3000/health/live

# Readiness probe
curl http://localhost:3000/health/ready
```

### Get Cache Metrics
```bash
curl http://localhost:3000/health | jq '.details.cache.metrics'
```

**Output:**
```json
{
  "hits": 150,
  "misses": 25,
  "hitRate": 0.86,
  "sets": 80,
  "deletes": 10,
  "errors": 0
}
```

---

## 📊 Health Check Endpoints

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `/health` | Full health check | Load balancer |
| `/health/live` | Liveness probe | Kubernetes liveness |
| `/health/ready` | Readiness probe | Kubernetes readiness |

---

## 🔄 System Modes

### Normal Mode (Redis Up)
- ✅ Full Redis caching
- ✅ Best performance
- ✅ All metrics tracked

### Degraded Mode (Redis Down)
- ⚠️ In-memory cache fallback (100 entries)
- ⚠️ Reduced performance (still good)
- ✅ System still functional
- ✅ Errors logged

### Database-Only Mode
- ❌ Both caches failed
- ❌ Slowest performance
- ✅ Still functional

---

## 📈 Key Metrics

| Metric | Description | Target | Alert If |
|--------|-------------|--------|----------|
| Hit Rate | Cache success rate | >80% | <60% |
| Errors | Redis failures | 0 | >10/min |
| Status | Connection state | 'up' | 'down'/'degraded' |

---

## 🧪 Testing

### Run Tests
```bash
cd backend

# Unit tests
npm test -- redis.service.spec.ts
npm test -- health.controller.spec.ts

# E2E tests
npm run test:e2e -- health.e2e-spec.ts
```

### Manual Testing
```bash
# 1. Start backend
npm run start:dev

# 2. Check health (should be 'up')
curl http://localhost:3000/health

# 3. Stop Redis
docker stop redis

# 4. Check health (should be 'degraded')
curl http://localhost:3000/health

# 5. App should still work!
```

---

## ⚙️ Configuration

### Load Balancer
```yaml
health_check:
  url: /health
  interval: 30s
  timeout: 5s
  healthy_threshold: 2
  unhealthy_threshold: 3
```

### Kubernetes
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## 🚨 Monitoring

### Alert Rules
```yaml
# Redis Degraded
alert: redis_degraded
condition: cache.status != 'up'
duration: 2m
severity: warning

# Low Hit Rate
alert: cache_hit_rate_low
condition: cache.hitRate < 0.6
duration: 5m
severity: warning

# High Error Rate
alert: cache_errors_high
condition: cache.errors > 10
duration: 1m
severity: critical
```

---

## 📁 Files Changed

### New Files
- `src/health/health.module.ts`
- `src/health/health.controller.ts`
- `src/health/redis-health.indicator.ts`
- `test/health.e2e-spec.ts`
- `src/redis/redis.service.spec.ts`

### Modified Files
- `src/redis/redis.service.ts` (enhanced)
- `src/app.module.ts` (added HealthModule)
- `src/prisma.service.ts` (exposed $transaction)

---

## 🔧 Troubleshooting

### Health Check Returns 503
**Cause:** Database or Redis critical failure  
**Fix:** Check database connection, restart services

### Cache Hit Rate Low (<60%)
**Cause:** Cache not being used effectively  
**Fix:** Review cache TTL, increase cache size

### High Error Rate
**Cause:** Redis connection unstable  
**Fix:** Check Redis logs, network connectivity

### Degraded Mode Persists
**Cause:** Redis not reconnecting  
**Fix:** Restart Redis, check configuration

---

## 📞 Support

### Common Issues

**Q: Getting 404 on /health?**  
A: HealthModule not imported. Check `app.module.ts`.

**Q: Metrics showing all zeros?**  
A: No cache operations yet. Use the app to generate traffic.

**Q: Redis down but status shows 'up'?**  
A: Check Redis connection settings in `.env`.

---

## ✅ Verification Checklist

- [ ] Health endpoints accessible
- [ ] Metrics tracking working
- [ ] Redis failure detected
- [ ] Fallback cache working
- [ ] Load balancer configured
- [ ] Monitoring alerts set up

---

## 🎓 Learn More

- Full documentation: `H003_REDIS_HEALTH_FIX_SUMMARY.md`
- Completion report: `H003_COMPLETION_REPORT.md`
- NestJS Terminus: https://docs.nestjs.com/recipes/terminus

---

**Status:** ✅ Complete  
**Production Ready:** Yes  
**Last Updated:** 2026-01-01

