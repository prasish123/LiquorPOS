# Quick Start: Observability Setup

**5-Minute Setup Guide**

---

## ⚡ Quick Setup (No Configuration)

The system works out-of-the-box with basic observability. Just deploy and go!

```bash
# 1. Install frontend dependencies
cd frontend
npm install

# 2. Build everything
cd ../backend
npm run build
cd ../frontend
npm run build

# 3. Start backend
cd ../backend
npm run start:prod

# 4. Test health endpoints
curl http://localhost:3000/health/ready  # ✅ Should return 200
curl http://localhost:3000/health/live   # ✅ Should return 200
```

**That's it!** You now have:
- ✅ Kubernetes health probes
- ✅ Global error handlers
- ✅ Structured logging
- ✅ Business metrics tracking

---

## 🔧 Enhanced Setup (With Sentry - 5 more minutes)

For full error tracking and alerting:

### 1. Get Sentry DSN (2 minutes)

1. Go to [sentry.io](https://sentry.io)
2. Create free account
3. Create new project (React + Node.js)
4. Copy DSN (looks like: `https://abc123@sentry.io/456789`)

### 2. Configure Backend (1 minute)

```bash
# backend/.env
echo "SENTRY_DSN=your-backend-dsn" >> .env
```

### 3. Configure Frontend (1 minute)

```bash
# frontend/.env
echo "VITE_SENTRY_DSN=your-frontend-dsn" >> .env
echo "VITE_APP_VERSION=1.0.0" >> .env
```

### 4. Restart (1 minute)

```bash
# Rebuild and restart
npm run build
npm run start:prod
```

**Done!** You now have full error tracking in Sentry.

---

## 📊 Verify Everything Works

### Test 1: Health Checks (30 seconds)
```bash
curl http://localhost:3000/health/ready
# Expected: {"status":"ok","info":{...}}

curl http://localhost:3000/health/live
# Expected: {"status":"ok","info":{...}}
```

### Test 2: Business Metrics (30 seconds)
```bash
# Get auth token first
TOKEN="your-jwt-token"

curl http://localhost:3000/monitoring/business \
  -H "Authorization: Bearer $TOKEN"
  
# Expected: {"orders":{...},"payments":{...},"revenue":{...}}
```

### Test 3: Error Tracking (1 minute)
```bash
# Open browser console on your frontend
# Run this:
import { Logger } from './infrastructure/services/LoggerService';
Logger.error('Test error', new Error('Test'));

# Check Sentry dashboard - error should appear within 1 minute
```

### Test 4: Graceful Shutdown (30 seconds)
```bash
npm run start:dev
# Press Ctrl+C
# Check logs for: "✅ Application closed gracefully"
```

---

## 🚀 Kubernetes Deployment (2 minutes)

Add health probes to your `deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: liquor-pos-backend
spec:
  template:
    spec:
      containers:
      - name: backend
        image: your-image
        ports:
        - containerPort: 3000
        
        # Add these health probes
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
```

Deploy:
```bash
kubectl apply -f deployment.yaml
kubectl get pods  # Wait for pods to be Ready
```

---

## 🔔 Optional: Slack Alerts (2 minutes)

Get instant alerts in Slack:

### 1. Create Slack Webhook
1. Go to your Slack workspace
2. Add "Incoming Webhooks" app
3. Create webhook for your channel
4. Copy webhook URL

### 2. Configure
```bash
# backend/.env
echo "SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL" >> .env
```

### 3. Restart
```bash
npm run start:prod
```

**Done!** You'll now get alerts for:
- High error rates
- Payment failures
- Order failures
- System issues

---

## 📈 Optional: Grafana Dashboard (10 minutes)

Visualize your metrics:

### 1. Start Grafana
```bash
docker run -d \
  -p 3001:3000 \
  --name grafana \
  grafana/grafana
```

### 2. Access Grafana
- Open http://localhost:3001
- Login: admin/admin
- Change password

### 3. Add Data Source
1. Click "Add data source"
2. Select "Prometheus"
3. URL: `http://localhost:9090`
4. Click "Save & Test"

### 4. Import Dashboard
1. Click "+" → "Import"
2. Upload dashboard JSON (create custom or use template)
3. Select Prometheus data source
4. Click "Import"

**Done!** You now have beautiful dashboards.

---

## 🎯 What You Get

### Health Monitoring
- ✅ `/health` - Overall health
- ✅ `/health/ready` - Kubernetes readiness
- ✅ `/health/live` - Kubernetes liveness
- ✅ `/health/db` - Database health
- ✅ `/health/redis` - Redis health

### Error Tracking
- ✅ All backend errors logged
- ✅ All frontend errors tracked in Sentry
- ✅ Unhandled exceptions caught
- ✅ Graceful shutdown on errors

### Business Metrics
- ✅ Orders per hour
- ✅ Revenue tracking
- ✅ Payment success rate
- ✅ Order failure rate
- ✅ Customer metrics

### Alerting
- ✅ Slack notifications
- ✅ PagerDuty integration (optional)
- ✅ Email alerts (optional)
- ✅ Configurable thresholds

---

## 🆘 Troubleshooting

### Health checks return 503
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Check Redis connection
redis-cli -u $REDIS_URL ping
```

### Sentry not receiving errors
```bash
# Check DSN is set
echo $SENTRY_DSN
echo $VITE_SENTRY_DSN

# Check logs for Sentry initialization
grep "Sentry" logs/*.log
```

### Metrics not updating
```bash
# Check monitoring service is running
curl http://localhost:3000/monitoring/health

# Process a test order
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"locationId":"loc-001","items":[{"sku":"WINE-001","quantity":1}],"paymentMethod":"cash"}'

# Check metrics again
curl http://localhost:3000/monitoring/business \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📚 Learn More

| Document | When to Read |
|----------|-------------|
| `IMPLEMENTATION_SUMMARY.md` | Overview of what was implemented |
| `OBSERVABILITY_IMPLEMENTATION_COMPLETE.md` | Detailed verification steps |
| `OBSERVABILITY_MINIMAL_FILES.md` | List of changed files |
| `OBSERVABILITY_GAPS_ANALYSIS.md` | Full analysis and future improvements |

---

## ✅ Checklist

- [ ] Backend health endpoints work
- [ ] Frontend Sentry is initialized
- [ ] Business metrics are tracking
- [ ] Graceful shutdown works
- [ ] Kubernetes probes configured (if using K8s)
- [ ] Slack alerts configured (optional)
- [ ] Grafana dashboard set up (optional)

---

## 🎉 You're Done!

Your system now has **production-grade observability** in less than 15 minutes!

**Next Steps:**
1. Deploy to production
2. Monitor Sentry dashboard for errors
3. Set up Grafana dashboards (optional)
4. Configure additional alerts (optional)
5. Implement Phase 2 improvements (optional)

---

**Need Help?** Check the detailed documentation in `OBSERVABILITY_IMPLEMENTATION_COMPLETE.md`

**Questions?** Review `OBSERVABILITY_GAPS_ANALYSIS.md` for context and explanations

---

**Status:** ✅ Ready for Production  
**Time to Setup:** 5-15 minutes  
**Difficulty:** Easy 🟢

