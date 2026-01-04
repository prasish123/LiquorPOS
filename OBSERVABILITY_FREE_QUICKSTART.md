# Free Observability Stack - Quick Start Guide

**Cost:** $0/month  
**Time:** 24 hours  
**Tools:** Loki + Grafana + Prometheus (all free & open-source)

---

## 🚀 Quick Start (Copy-Paste Ready)

### Step 1: Set Up Central Server (30 minutes)

```bash
# On your central observability server (NUC or cloud VM)
mkdir -p ~/observability/{loki,grafana,prometheus}
cd ~/observability

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    restart: unless-stopped

  uptime-kuma:
    image: louislam/uptime-kuma:latest
    ports:
      - "3002:3001"
    volumes:
      - uptime-kuma-data:/app/data
    restart: unless-stopped

volumes:
  loki-data:
  grafana-data:
  prometheus-data:
  uptime-kuma-data:
EOF

# Create Loki config
cat > loki-config.yml << 'EOF'
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  retention_period: 720h  # 30 days
EOF

# Create Prometheus config
cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
EOF

# Start everything
docker-compose up -d

# Check status
docker-compose ps

# Access dashboards:
echo "Grafana: http://$(hostname -I | awk '{print $1}'):3001 (admin/admin123)"
echo "Prometheus: http://$(hostname -I | awk '{print $1}'):9090"
echo "Loki: http://$(hostname -I | awk '{print $1}'):3100"
echo "Uptime Kuma: http://$(hostname -I | awk '{print $1}'):3002"
```

---

### Step 2: Backend Integration (2 hours)

```bash
# In your backend directory
cd backend
npm install winston winston-loki
```

```typescript
// backend/src/common/logger/loki-logger.service.ts
import winston from 'winston';
import LokiTransport from 'winston-loki';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LokiLoggerService {
  private logger: winston.Logger;

  constructor() {
    const lokiUrl = process.env.LOKI_URL || 'http://localhost:3100';
    const locationId = process.env.LOCATION_ID || 'unknown';

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: {
        service: 'pos-backend',
        location: locationId,
        version: process.env.npm_package_version,
      },
      transports: [
        new winston.transports.Console(),
        new LokiTransport({
          host: lokiUrl,
          labels: { service: 'pos-backend', location: locationId },
          json: true,
        }),
      ],
    });
  }

  log(message: string, context?: any) {
    this.logger.info(message, context);
  }

  error(message: string, error?: Error, context?: any) {
    this.logger.error(message, {
      error: error?.message,
      stack: error?.stack,
      ...context,
    });
  }
}
```

```bash
# backend/.env
LOKI_URL=http://your-server-ip:3100
LOCATION_ID=STORE_001
```

**Use in your code:**

```typescript
// backend/src/orders/order-orchestrator.ts
constructor(private logger: LokiLoggerService) {}

async processOrder(dto: CreateOrderDto) {
  try {
    this.logger.log('Processing order', {
      locationId: dto.locationId,
      terminalId: dto.terminalId,
      amount: dto.total,
    });
    // ... your code ...
  } catch (error) {
    this.logger.error('Order failed', error, {
      locationId: dto.locationId,
      terminalId: dto.terminalId,
      orderId: context.order?.id,
    });
    throw error;
  }
}
```

---

### Step 3: Frontend Integration (1 hour)

```bash
# In your frontend directory
cd frontend
npm install loglevel loglevel-plugin-remote
```

```typescript
// frontend/src/infrastructure/services/LokiLogger.ts
import log from 'loglevel';
import remote from 'loglevel-plugin-remote';

const lokiUrl = import.meta.env.VITE_LOKI_URL || 'http://localhost:3100';
const locationId = import.meta.env.VITE_LOCATION_ID || 'unknown';

remote.apply(log, {
  format: (logMessage) => ({
    streams: [{
      stream: {
        service: 'pos-frontend',
        location: locationId,
        level: logMessage.level.label,
      },
      values: [[
        String(Date.now() * 1000000),
        JSON.stringify({
          message: logMessage.message,
          ...logMessage.context,
        }),
      ]],
    }],
  }),
  url: `${lokiUrl}/loki/api/v1/push`,
});

export const Logger = {
  info: (msg: string, ctx?: any) => log.info(msg, ctx),
  error: (msg: string, err?: Error, ctx?: any) => 
    log.error(msg, { error: err?.message, stack: err?.stack, ...ctx }),
};
```

```bash
# frontend/.env
VITE_LOKI_URL=http://your-server-ip:3100
VITE_LOCATION_ID=STORE_001
```

---

### Step 4: Set Up Grafana (1 hour)

```bash
# Open Grafana
open http://your-server-ip:3001

# Login: admin / admin123
```

**Add Loki Data Source:**
1. Configuration → Data Sources → Add data source
2. Select "Loki"
3. URL: `http://loki:3100`
4. Save & Test

**Create Dashboard:**
1. Create → Dashboard → Add new panel
2. Query: `{service="pos-backend"} |= "ERROR"`
3. Save dashboard as "POS Errors"

**Common Queries:**

```logql
# All errors
{service="pos-backend"} |= "ERROR"

# Errors from specific store
{service="pos-backend", location="STORE_047"} |= "ERROR"

# Payment errors
{service="pos-backend"} |= "payment" |= "ERROR"

# Errors in last hour
{service="pos-backend"} |= "ERROR" | json | line_format "{{.timestamp}} {{.message}}"
```

---

### Step 5: Set Up Alerts (30 minutes)

**In Grafana:**
1. Alerting → Alert rules → New alert rule
2. Name: "High Error Rate"
3. Query: `count_over_time({service="pos-backend"} |= "ERROR" [5m]) > 10`
4. Condition: Alert if > 10 errors in 5 minutes
5. Contact point: Slack

**Slack Webhook:**
1. Go to https://api.slack.com/apps
2. Create app → Incoming Webhooks
3. Add to workspace → Copy webhook URL
4. In Grafana: Alerting → Contact points → New contact point
5. Type: Slack
6. Webhook URL: Paste your URL
7. Test & Save

---

### Step 6: Set Up Uptime Monitoring (30 minutes)

```bash
# Open Uptime Kuma
open http://your-server-ip:3002
```

1. Create account
2. Add monitor:
   - Type: HTTP(s)
   - Name: "Store 1 Backend"
   - URL: `http://store-1-nuc:3000/health`
   - Interval: 5 minutes
3. Add notification:
   - Type: Slack
   - Webhook URL: Your Slack webhook
4. Repeat for all 100 stores

---

## ✅ Verification Checklist

After setup, verify everything works:

```bash
# 1. Check all services are running
docker-compose ps

# 2. Test Loki is receiving logs
curl http://localhost:3100/ready

# 3. Test backend logging
# In your backend, trigger an error and check Grafana

# 4. Test frontend logging
# In your frontend, trigger an error and check Grafana

# 5. Test alerts
# Trigger 10+ errors quickly and verify Slack alert

# 6. Test uptime monitoring
# Stop a backend and verify Uptime Kuma alert
```

---

## 📊 Example Dashboards

### Dashboard 1: Error Overview

```json
{
  "title": "POS Errors Overview",
  "panels": [
    {
      "title": "Error Count (Last Hour)",
      "targets": [{
        "expr": "sum(count_over_time({service=\"pos-backend\"} |= \"ERROR\" [1h]))"
      }]
    },
    {
      "title": "Errors by Store",
      "targets": [{
        "expr": "sum by (location) (count_over_time({service=\"pos-backend\"} |= \"ERROR\" [1h]))"
      }]
    },
    {
      "title": "Recent Errors",
      "targets": [{
        "expr": "{service=\"pos-backend\"} |= \"ERROR\""
      }]
    }
  ]
}
```

### Dashboard 2: Store Health

```json
{
  "title": "Store Health Dashboard",
  "panels": [
    {
      "title": "Stores Online",
      "targets": [{
        "expr": "count(count_over_time({service=\"pos-backend\"} [5m]) by (location))"
      }]
    },
    {
      "title": "Stores with Errors",
      "targets": [{
        "expr": "count(count_over_time({service=\"pos-backend\"} |= \"ERROR\" [5m]) by (location))"
      }]
    }
  ]
}
```

---

## 🔧 Troubleshooting

### Logs not appearing in Grafana?

```bash
# Check Loki is running
docker logs observability-loki-1

# Check backend can reach Loki
curl -v http://your-server-ip:3100/ready

# Check backend environment variables
echo $LOKI_URL
echo $LOCATION_ID

# Test manual log push
curl -X POST http://your-server-ip:3100/loki/api/v1/push \
  -H "Content-Type: application/json" \
  -d '{
    "streams": [{
      "stream": {"service": "test"},
      "values": [["'$(date +%s)000000000'", "test message"]]
    }]
  }'
```

### Grafana can't connect to Loki?

```bash
# Check they're on same Docker network
docker network inspect observability_default

# Use container name instead of localhost
# In Grafana data source: http://loki:3100
```

### Alerts not firing?

```bash
# Check alert rule is active
# In Grafana: Alerting → Alert rules → Check status

# Check contact point is configured
# In Grafana: Alerting → Contact points → Test

# Manually trigger alert
# Generate 10+ errors quickly in your app
```

---

## 📈 Scaling Tips

### For 100+ Stores

```yaml
# docker-compose.yml - Add more resources
services:
  loki:
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G

  grafana:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Add More Retention

```yaml
# loki-config.yml
limits_config:
  retention_period: 2160h  # 90 days instead of 30
```

### Add Backup

```bash
# Backup Loki data
docker run --rm -v observability_loki-data:/data -v $(pwd):/backup ubuntu tar czf /backup/loki-backup.tar.gz /data

# Restore
docker run --rm -v observability_loki-data:/data -v $(pwd):/backup ubuntu tar xzf /backup/loki-backup.tar.gz -C /
```

---

## 💰 Cost Summary

| Component | Cost | Why |
|-----------|------|-----|
| Loki | Free | Open source |
| Grafana | Free | Open source |
| Prometheus | Free | Open source |
| Uptime Kuma | Free | Open source |
| Winston | Free | Open source |
| Server | $0-10/mo | Use existing NUC or cheap VM |
| **TOTAL** | **$0-10/mo** | **vs. $39/mo for SaaS** |

**Annual Savings:** $348-468/year (plus infinite scalability)

---

## 🎯 Success Metrics

After 1 week, you should see:

- ✅ All 100 stores reporting logs to Loki
- ✅ Can search logs by store ID in Grafana
- ✅ Error dashboard showing real-time errors
- ✅ Slack alerts working for critical errors
- ✅ Uptime monitoring tracking all stores
- ✅ <30 minute resolution time for issues
- ✅ 90% of issues resolved remotely

---

## 📚 Next Steps

1. **Complete setup** (follow this guide)
2. **Use for 3 months** (prove value)
3. **Evaluate** (is maintenance burden acceptable?)
4. **Decide:**
   - Keep free stack (if working well)
   - Upgrade to SaaS (if want less maintenance)
   - Hybrid approach (free logs + paid error tracking)

---

## 🆘 Need Help?

- **Documentation:** https://grafana.com/docs/loki/
- **Community:** https://community.grafana.com/
- **This Project:** See `docs/OBSERVABILITY_FREE_ALTERNATIVE.md` for detailed guide

---

**Bottom Line:** You can have production-grade observability for FREE. Start here, prove the value, then decide if SaaS convenience is worth $39/month.

**Time Investment:** 24 hours setup + 2-4 hours/month maintenance  
**Cost:** $0/month  
**ROI:** INFINITE ♾️

---

**Document:** OBSERVABILITY_FREE_QUICKSTART.md  
**Date:** January 3, 2026  
**Status:** Ready to use - Copy & paste commands!

