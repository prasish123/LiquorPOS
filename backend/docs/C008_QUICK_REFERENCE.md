# C-008: Redis Sentinel - Quick Reference

## 🚀 Quick Start

### Standalone Mode (Default)

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password
```

### Sentinel Mode (High Availability)

```bash
# .env
REDIS_SENTINEL_ENABLED=true
REDIS_SENTINEL_MASTER_NAME=mymaster
REDIS_SENTINELS=sentinel1:26379,sentinel2:26379,sentinel3:26379
REDIS_PASSWORD=your_redis_password
REDIS_SENTINEL_PASSWORD=your_sentinel_password  # Optional
```

---

## 📋 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_SENTINEL_ENABLED` | No | `false` | Enable Sentinel mode |
| `REDIS_SENTINEL_MASTER_NAME` | Yes* | - | Master name in Sentinel |
| `REDIS_SENTINELS` | Yes* | - | Comma-separated sentinel nodes |
| `REDIS_PASSWORD` | No | - | Redis password |
| `REDIS_SENTINEL_PASSWORD` | No | - | Sentinel password |
| `REDIS_HOST` | No** | `localhost` | Redis host (standalone) |
| `REDIS_PORT` | No** | `6379` | Redis port (standalone) |

\* Required when `REDIS_SENTINEL_ENABLED=true`  
\*\* Used only in standalone mode

---

## 🔍 Health Check

```bash
# Check Redis health
curl http://localhost:3000/health

# Response (Sentinel mode):
{
  "redis": {
    "status": "up",
    "connected": true,
    "message": "Redis is healthy (Sentinel mode)",
    "mode": "sentinel",
    "metrics": {
      "hits": 100,
      "misses": 10,
      "hitRate": 0.91
    },
    "sentinel": {
      "enabled": true,
      "masterName": "mymaster",
      "sentinels": [
        { "host": "sentinel1", "port": 26379 },
        { "host": "sentinel2", "port": 26379 },
        { "host": "sentinel3", "port": 26379 }
      ],
      "currentMaster": { "host": "redis-master", "port": 6379 },
      "failoverCount": 0
    }
  }
}
```

---

## 🐳 Docker Compose

```yaml
version: '3.8'
services:
  redis-master:
    image: redis:7-alpine
    command: redis-server --requirepass mypassword

  redis-replica:
    image: redis:7-alpine
    command: redis-server --replicaof redis-master 6379 --masterauth mypassword --requirepass mypassword

  redis-sentinel-1:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf

  redis-sentinel-2:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf

  redis-sentinel-3:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf

  app:
    build: .
    environment:
      REDIS_SENTINEL_ENABLED: "true"
      REDIS_SENTINEL_MASTER_NAME: "mymaster"
      REDIS_SENTINELS: "redis-sentinel-1:26379,redis-sentinel-2:26379,redis-sentinel-3:26379"
      REDIS_PASSWORD: "mypassword"
```

**sentinel.conf:**

```conf
port 26379
sentinel monitor mymaster redis-master 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 10000
sentinel auth-pass mymaster mypassword
```

---

## 🧪 Testing Failover

```bash
# 1. Start cluster
docker-compose up -d

# 2. Verify connection
curl http://localhost:3000/health

# 3. Stop master
docker-compose stop redis-master

# 4. Watch logs for failover
docker-compose logs -f app
# Expected: "🔄 Redis Sentinel failover detected!"

# 5. Verify still working
curl http://localhost:3000/health
# Should still return status: "up"

# 6. Restart master
docker-compose start redis-master

# 7. Check failover count
curl http://localhost:3000/health | jq '.redis.sentinel.failoverCount'
```

---

## 📊 API Usage

### Get Health Status

```typescript
import { RedisService } from './redis/redis.service';

const health = await redisService.getHealthStatus();
console.log(health.status);        // 'up' | 'down' | 'degraded'
console.log(health.mode);          // 'standalone' | 'sentinel'
console.log(health.sentinel);      // Sentinel info (if enabled)
```

### Get Sentinel Info

```typescript
const sentinelInfo = redisService.getSentinelInfo();

if (sentinelInfo) {
  console.log(`Master: ${sentinelInfo.masterName}`);
  console.log(`Failovers: ${sentinelInfo.failoverCount}`);
  console.log(`Current Master: ${sentinelInfo.currentMaster.host}`);
}
```

### Get Mode

```typescript
const mode = redisService.getMode();
console.log(mode); // 'standalone' or 'sentinel'
```

---

## 🚨 Common Issues

### "Sentinel requires minimum 3 nodes"

**Problem:** Less than 3 sentinels configured

**Solution:**
```bash
REDIS_SENTINELS=sentinel1:26379,sentinel2:26379,sentinel3:26379
```

### Failover Not Working

**Problem:** Quorum not reached

**Solution:**
1. Check sentinel.conf quorum setting
2. Ensure at least 2 sentinels running
3. Verify network connectivity

### Connection Failed

**Problem:** Sentinels not reachable

**Solution:**
1. Verify sentinel nodes are running
2. Check REDIS_SENTINELS format
3. Test connectivity: `telnet sentinel1 26379`

---

## 📈 Monitoring

### Key Metrics

- **Failover Count** - Number of automatic failovers
- **Last Failover** - Timestamp of last failover
- **Current Master** - Active master node
- **Cache Hit Rate** - Cache effectiveness
- **Connection Status** - Up/down/degraded

### Log Messages

```
✅ Success: "Redis connected successfully in Sentinel mode 🚀"
🔄 Failover: "Redis Sentinel failover detected! Master switched..."
⚠️  Warning: "Sentinel requires minimum 3 nodes. Falling back..."
❌ Error: "Redis connection failed: ..."
```

---

## 🔒 Security

### Best Practices

1. **Use passwords** for both Redis and Sentinel
2. **Network isolation** - Private subnet for Redis/Sentinel
3. **Firewall rules** - Restrict port access
4. **TLS encryption** - Enable in production
5. **Regular updates** - Keep Redis updated

### Example with TLS

```bash
REDIS_SENTINEL_ENABLED=true
REDIS_SENTINEL_MASTER_NAME=mymaster
REDIS_SENTINELS=sentinel1:26379,sentinel2:26379,sentinel3:26379
REDIS_PASSWORD=your_password
REDIS_TLS_ENABLED=true
REDIS_TLS_CA_CERT=/path/to/ca.crt
```

---

## 📚 Additional Resources

- **Full Documentation:** [C008_REDIS_SENTINEL_COMPLETION_REPORT.md](./C008_REDIS_SENTINEL_COMPLETION_REPORT.md)
- **Redis Sentinel Docs:** https://redis.io/docs/management/sentinel/
- **ioredis Sentinel:** https://github.com/luin/ioredis#sentinel

---

## ✅ Checklist

### Development

- [ ] Configure environment variables
- [ ] Start Redis Sentinel cluster
- [ ] Verify connection
- [ ] Test failover

### Production

- [ ] Deploy Redis master + 2 replicas
- [ ] Deploy 3 Sentinel nodes
- [ ] Configure application with Sentinel
- [ ] Test failover
- [ ] Set up monitoring
- [ ] Configure alerts

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** January 2, 2026

