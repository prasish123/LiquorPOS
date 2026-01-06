# Operational Setup Guide - Liquor POS System

**Version:** 1.0  
**Last Updated:** January 5, 2026  
**Purpose:** Complete guide for setting up monitoring, logging, and alerting infrastructure

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Logging Setup (Loki + Grafana)](#logging-setup-loki--grafana)
4. [Error Tracking Setup (Sentry)](#error-tracking-setup-sentry)
5. [Alerting Setup](#alerting-setup)
6. [Health Checks Configuration](#health-checks-configuration)
7. [Backup Configuration](#backup-configuration)
8. [Verification](#verification)
9. [Production Checklist](#production-checklist)

---

## Prerequisites

### Required Tools

- **Docker & Docker Compose:** v20.10+ (for local/dev)
- **Kubernetes:** v1.24+ (for production)
- **kubectl:** v1.24+ (for production)
- **Node.js:** v18+ (for development)
- **PostgreSQL:** v14+ (database)
- **Redis:** v7+ (cache)

### Required Accounts

- **Sentry Account:** https://sentry.io (free tier available)
- **Slack Workspace:** For alert notifications (optional)
- **PagerDuty Account:** For critical alerts (optional)
- **Stripe Account:** For payment processing

### Access Requirements

- Database admin credentials
- Kubernetes cluster access (production)
- Docker registry access (production)
- Domain and SSL certificates (production)

---

## Infrastructure Setup

### Development Environment

**1. Clone Repository:**
```bash
git clone https://github.com/your-org/liquor-pos.git
cd liquor-pos
```

**2. Install Dependencies:**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

**3. Setup Environment Variables:**
```bash
# Backend
cd backend
cp .env.example .env
nano .env
```

**Required Backend Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/liquor_pos
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Logging
LOG_LEVEL=info
ENABLE_LOKI_TRANSPORT=true
LOKI_HOST=http://localhost:3100
LOKI_BATCH_SIZE=100
LOKI_BATCH_INTERVAL=5000

# Error Tracking
SENTRY_DSN=https://your-key@sentry.io/your-project-id
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=1.0

# Payment
STRIPE_SECRET_KEY=sk_test_...

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# Server
PORT=3000
NODE_ENV=development
```

**Frontend Environment Variables:**
```bash
# Frontend
cd frontend
cp .env.example .env
nano .env
```

```bash
VITE_API_URL=http://localhost:3000
VITE_SENTRY_DSN=https://your-key@sentry.io/your-frontend-project-id
VITE_APP_VERSION=1.0.0
```

**4. Start Infrastructure with Docker Compose:**
```bash
cd ..
docker-compose -f docker-compose.dev.yml up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Loki (port 3100)
- Grafana (port 3001)

**5. Initialize Database:**
```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

**6. Start Applications:**
```bash
# Backend (terminal 1)
cd backend
npm run start:dev

# Frontend (terminal 2)
cd frontend
npm run dev
```

---

### Production Environment (Kubernetes)

**1. Create Namespace:**
```bash
kubectl create namespace liquor-pos
kubectl config set-context --current --namespace=liquor-pos
```

**2. Create Secrets:**
```bash
# Database credentials
kubectl create secret generic postgres-credentials \
  --from-literal=username=postgres \
  --from-literal=password=your-secure-password

# Application secrets
kubectl create secret generic liquor-pos-secrets \
  --from-literal=DATABASE_URL=postgresql://postgres:password@postgres:5432/liquor_pos \
  --from-literal=REDIS_URL=redis://redis:6379 \
  --from-literal=STRIPE_SECRET_KEY=sk_live_... \
  --from-literal=SENTRY_DSN=https://your-key@sentry.io/your-project-id \
  --from-literal=JWT_SECRET=your-jwt-secret
```

**3. Create ConfigMaps:**
```bash
kubectl create configmap liquor-pos-config \
  --from-literal=LOG_LEVEL=info \
  --from-literal=ENABLE_LOKI_TRANSPORT=true \
  --from-literal=LOKI_HOST=http://loki:3100 \
  --from-literal=SENTRY_ENVIRONMENT=production \
  --from-literal=NODE_ENV=production
```

**4. Deploy Infrastructure:**
```bash
# PostgreSQL
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml

# Redis
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/redis-service.yaml

# Loki
kubectl apply -f k8s/loki-deployment.yaml
kubectl apply -f k8s/loki-service.yaml

# Grafana
kubectl apply -f k8s/grafana-deployment.yaml
kubectl apply -f k8s/grafana-service.yaml
```

**5. Deploy Application:**
```bash
# Backend
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml

# Frontend
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml

# Ingress
kubectl apply -f k8s/ingress.yaml
```

**6. Verify Deployment:**
```bash
kubectl get pods
kubectl get services
kubectl get ingress
```

---

## Logging Setup (Loki + Grafana)

### Loki Configuration

**1. Loki Config File (`loki-config.yaml`):**
```yaml
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
    final_sleep: 0s
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2020-05-15
      store: boltdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 168h

storage_config:
  boltdb:
    directory: /tmp/loki/index

  filesystem:
    directory: /tmp/loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h  # 30 days
```

**2. Deploy Loki with Config:**
```bash
# Create ConfigMap from file
kubectl create configmap loki-config --from-file=loki-config.yaml

# Update deployment to use config
kubectl apply -f k8s/loki-deployment.yaml
```

**3. Verify Loki:**
```bash
# Check Loki is running
kubectl get pods -l app=loki

# Test Loki API
kubectl port-forward svc/loki 3100:3100
curl http://localhost:3100/ready
```

---

### Grafana Configuration

**1. Access Grafana:**
```bash
# Port forward (development)
kubectl port-forward svc/grafana 3001:3000

# Or use Ingress URL (production)
# https://grafana.pos-omni.example.com
```

**Default credentials:** admin / admin (change on first login)

**2. Add Loki Data Source:**
- Navigate to: Configuration → Data Sources → Add data source
- Select: Loki
- URL: `http://loki:3100` (Kubernetes) or `http://localhost:3100` (dev)
- Click: Save & Test

**3. Import Dashboards:**

**System Overview Dashboard:**
```bash
# Import from file
# Grafana → Dashboards → Import → Upload JSON file
# Use: docs/grafana-dashboards/system-overview.json
```

**Business Metrics Dashboard:**
```bash
# Import from file
# Use: docs/grafana-dashboards/business-metrics.json
```

**API Performance Dashboard:**
```bash
# Import from file
# Use: docs/grafana-dashboards/api-performance.json
```

**4. Configure Data Source for Dashboards:**
- Open each imported dashboard
- Dashboard Settings → Variables → datasource
- Set to: Loki

**5. Verify Logs Appearing:**
- Navigate to: Explore
- Select: Loki data source
- Query: `{service="liquor-pos-backend"}`
- Should see logs appearing in real-time

---

### Backend Logging Configuration

**Logging is already configured in the backend:**

**Winston Logger (`backend/src/common/logger/logger.service.ts`):**
- Structured JSON logging
- Multiple transports: Console, File, Loki
- Correlation IDs for request tracing
- Log levels: debug, info, warn, error, fatal

**Loki Transport (`backend/src/common/logger/loki-transport.ts`):**
- Batching (100 logs or 5 seconds)
- Retry logic (3 attempts with exponential backoff)
- Circuit breaker (opens after 5 failures, closes after 60s)
- Graceful degradation (logs to console if Loki unavailable)

**Configuration (`backend/src/config/app.config.ts`):**
```typescript
observability: {
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: true,
    enableFile: true,
    enableLoki: process.env.ENABLE_LOKI_TRANSPORT === 'true',
    lokiHost: process.env.LOKI_HOST || 'http://localhost:3100',
    lokiBatchSize: parseInt(process.env.LOKI_BATCH_SIZE || '100', 10),
    lokiBatchInterval: parseInt(process.env.LOKI_BATCH_INTERVAL || '5000', 10),
  },
}
```

**No code changes needed - just set environment variables!**

---

## Error Tracking Setup (Sentry)

### Sentry Project Setup

**1. Create Sentry Projects:**
- Go to: https://sentry.io
- Create Organization (if new)
- Create Project: "liquor-pos-backend" (Platform: Node.js)
- Create Project: "liquor-pos-frontend" (Platform: React)

**2. Get DSN Keys:**
- Backend Project → Settings → Client Keys (DSN)
- Copy DSN: `https://your-key@sentry.io/backend-project-id`
- Frontend Project → Settings → Client Keys (DSN)
- Copy DSN: `https://your-key@sentry.io/frontend-project-id`

**3. Configure Backend Sentry:**

**Already configured in `backend/src/monitoring/sentry.service.ts`:**
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  release: process.env.npm_package_version,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Prisma({ client: prisma }),
  ],
});
```

**Just set environment variables:**
```bash
SENTRY_DSN=https://your-key@sentry.io/backend-project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% sampling in production
```

**4. Configure Frontend Sentry:**

**Already configured in `frontend/src/main.tsx`:**
```typescript
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,
  tracesSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**Just set environment variables:**
```bash
VITE_SENTRY_DSN=https://your-key@sentry.io/frontend-project-id
VITE_APP_VERSION=1.0.0
```

**5. Test Sentry Integration:**

**Backend:**
```bash
# Trigger test error
curl -X POST http://localhost:3000/api/test/sentry-error \
  -H "Authorization: Bearer $TOKEN"

# Check Sentry dashboard
# Should see error appear within seconds
```

**Frontend:**
```javascript
// Open browser console
Sentry.captureException(new Error("Test error"));

// Check Sentry dashboard
```

**6. Configure Alerts in Sentry:**
- Project Settings → Alerts → New Alert Rule
- Condition: "An event is seen"
- Filter: "level:error"
- Action: Send notification to Slack/Email
- Save

---

## Alerting Setup

### Slack Integration

**1. Create Slack App:**
- Go to: https://api.slack.com/apps
- Create New App → From scratch
- Name: "Liquor POS Alerts"
- Workspace: Your workspace

**2. Configure Incoming Webhooks:**
- Features → Incoming Webhooks → Activate
- Add New Webhook to Workspace
- Select channel: #alerts
- Copy Webhook URL

**3. Configure Backend Alerts:**
```bash
# Set environment variable
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Or in Kubernetes
kubectl create secret generic slack-webhook \
  --from-literal=url=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**4. Test Slack Integration:**
```bash
# Send test alert
curl -X POST http://localhost:3000/api/monitoring/test-alert \
  -H "Authorization: Bearer $TOKEN"

# Should see alert in #alerts channel
```

---

### PagerDuty Integration (Critical Alerts)

**1. Create PagerDuty Service:**
- Go to: https://your-org.pagerduty.com
- Services → New Service
- Name: "Liquor POS"
- Escalation Policy: Create or select
- Integration: Events API v2
- Copy Integration Key

**2. Configure Backend PagerDuty:**
```bash
# Set environment variable
export PAGERDUTY_INTEGRATION_KEY=your-integration-key

# Or in Kubernetes
kubectl create secret generic pagerduty-key \
  --from-literal=key=your-integration-key
```

**3. Configure Alert Routing:**

**Already configured in `backend/src/monitoring/monitoring.service.ts`:**
- Critical alerts → PagerDuty
- High alerts → Slack
- Medium/Low alerts → Logs only

**4. Test PagerDuty Integration:**
```bash
# Trigger critical alert
curl -X POST http://localhost:3000/api/monitoring/test-critical-alert \
  -H "Authorization: Bearer $TOKEN"

# Should trigger PagerDuty incident
```

---

### Grafana Alerting

**1. Configure Alert Contact Points:**
- Grafana → Alerting → Contact points → New contact point
- Name: "Slack Alerts"
- Type: Slack
- Webhook URL: (from Slack setup)
- Save

**2. Create Alert Rules:**

**Example: High Error Rate Alert**
```yaml
# Grafana → Alerting → Alert rules → New alert rule
Name: High API Error Rate
Query: 
  rate({service="liquor-pos-backend"} |= "ERROR" [5m]) > 0.05
Condition: 
  WHEN avg() OF query(A, 5m, now) IS ABOVE 0.05
Evaluate every: 1m
For: 5m
Annotations:
  summary: API error rate is above 5%
  description: Check logs and Sentry for details
  runbook: https://docs.example.com/runbooks/api-errors
Labels:
  severity: high
  team: engineering
Contact point: Slack Alerts
```

**Example: Database Connection Alert**
```yaml
Name: Database Connection Failed
Query:
  count_over_time({service="liquor-pos-backend"} |= "Database connection failed" [5m]) > 0
Condition:
  WHEN last() OF query(A, 5m, now) IS ABOVE 0
Evaluate every: 30s
For: 1m
Annotations:
  summary: Database connection failures detected
  runbook: https://docs.example.com/runbooks/db-connection
Labels:
  severity: critical
Contact point: PagerDuty
```

**3. Import Alert Rules:**
```bash
# Import from file
# Grafana → Alerting → Alert rules → Import
# Use: docs/grafana-alerts/alert-rules.yaml
```

---

## Health Checks Configuration

### Kubernetes Health Probes

**Backend Deployment (`k8s/backend-deployment.yaml`):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: liquor-pos-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: liquor-pos-backend
  template:
    metadata:
      labels:
        app: liquor-pos-backend
    spec:
      containers:
      - name: backend
        image: your-registry/liquor-pos-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        # ... other env vars ...
        
        # Liveness Probe - checks if app is alive
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        # Readiness Probe - checks if app is ready to serve traffic
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        
        # Startup Probe - checks if app has started
        startupProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 30  # 30 * 5 = 150s max startup time
        
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

**Health Check Endpoints (already implemented):**
- `/health` - Overall health (all components)
- `/health/ready` - Readiness (DB + Redis must be up)
- `/health/live` - Liveness (only checks memory)
- `/health/db` - Database health only
- `/health/redis` - Redis health only
- `/health/backup` - Backup system health

---

### External Health Monitoring

**1. Setup Uptime Monitoring (Optional):**

**Using UptimeRobot (free):**
- Go to: https://uptimerobot.com
- Add New Monitor
- Monitor Type: HTTP(s)
- URL: https://api.pos-omni.example.com/health
- Monitoring Interval: 5 minutes
- Alert Contacts: Email/Slack

**Using Pingdom:**
- Similar setup
- More features in paid plans

**2. Configure Health Check Alerts:**
- Alert when: Status code != 200
- Alert after: 2 consecutive failures
- Alert contacts: Ops team

---

## Backup Configuration

### Automated Database Backups

**Already configured in `backend/src/backup/backup.service.ts`:**

**1. Configure Backup Schedule:**
```bash
# Environment variables
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
BACKUP_DIRECTORY=/backups
```

**2. Ensure Backup Directory Exists:**
```bash
# Local/Docker
mkdir -p /backups
chmod 755 /backups

# Kubernetes - use PersistentVolume
kubectl apply -f k8s/backup-pvc.yaml
```

**3. Test Manual Backup:**
```bash
# Trigger backup via API
curl -X POST http://localhost:3000/api/backup/create \
  -H "Authorization: Bearer $TOKEN"

# Check backup was created
ls -lh /backups/
```

**4. Verify Backup Health Check:**
```bash
curl http://localhost:3000/health/backup

# Should return:
# {
#   "status": "ok",
#   "info": {
#     "backup": {
#       "status": "up",
#       "lastBackup": "2026-01-05T02:00:00.000Z",
#       "backupAge": "6h"
#     }
#   }
# }
```

---

### Backup to Cloud Storage (Optional)

**AWS S3 Backup:**
```bash
# Install AWS CLI
apt-get install awscli

# Configure credentials
aws configure

# Update backup script to upload to S3
# In backup.service.ts, add after backup creation:
# await this.uploadToS3(backupPath);
```

**Example S3 Upload Function:**
```typescript
private async uploadToS3(filePath: string): Promise<void> {
  const s3 = new AWS.S3();
  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  
  await s3.putObject({
    Bucket: process.env.S3_BACKUP_BUCKET,
    Key: `backups/${fileName}`,
    Body: fileContent,
  }).promise();
  
  this.logger.log(`Backup uploaded to S3: ${fileName}`);
}
```

---

## Verification

### Post-Setup Verification Checklist

**1. Health Checks:**
```bash
# All health endpoints should return 200 OK
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
curl http://localhost:3000/health/live
curl http://localhost:3000/health/db
curl http://localhost:3000/health/redis
curl http://localhost:3000/health/backup
```

**2. Logging:**
```bash
# Check logs are being written
tail -f backend/logs/combined-*.log

# Check logs appear in Loki
# Grafana → Explore → Loki → {service="liquor-pos-backend"}

# Should see recent logs
```

**3. Error Tracking:**
```bash
# Trigger test error
curl -X POST http://localhost:3000/api/test/sentry-error \
  -H "Authorization: Bearer $TOKEN"

# Check Sentry dashboard
# Should see error within seconds
```

**4. Metrics:**
```bash
# Check metrics are being collected
curl http://localhost:3000/monitoring/metrics \
  -H "Authorization: Bearer $TOKEN"

# Should return counters, gauges, histograms
```

**5. Business Metrics:**
```bash
# Create test order
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"sku":"TEST001","quantity":1}],"paymentMethod":"cash"}'

# Check business metrics updated
curl http://localhost:3000/monitoring/business \
  -H "Authorization: Bearer $TOKEN"

# Should show order count increased
```

**6. Alerts:**
```bash
# Trigger test alert
curl -X POST http://localhost:3000/api/monitoring/test-alert \
  -H "Authorization: Bearer $TOKEN"

# Check Slack channel for alert
# Check Grafana → Alerting → Alert rules
```

**7. Backups:**
```bash
# Trigger manual backup
curl -X POST http://localhost:3000/api/backup/create \
  -H "Authorization: Bearer $TOKEN"

# Verify backup created
ls -lh /backups/

# Check backup health
curl http://localhost:3000/health/backup
```

**8. Dashboards:**
```bash
# Open Grafana
# http://localhost:3001

# Check all dashboards load:
# - System Overview
# - Business Metrics
# - API Performance

# Verify data is appearing
```

---

## Production Checklist

### Pre-Production Verification

- [ ] All environment variables configured
- [ ] Secrets created in Kubernetes
- [ ] Database migrations applied
- [ ] Health checks responding
- [ ] Logs appearing in Loki
- [ ] Errors appearing in Sentry
- [ ] Grafana dashboards configured
- [ ] Alert rules configured
- [ ] Slack integration working
- [ ] PagerDuty integration working
- [ ] Backups running successfully
- [ ] SSL certificates installed
- [ ] DNS configured
- [ ] Load balancer configured
- [ ] Auto-scaling configured
- [ ] Resource limits set
- [ ] Network policies applied
- [ ] Firewall rules configured
- [ ] Monitoring verified
- [ ] Documentation updated
- [ ] Team trained

### Production Environment Variables

**Critical - Must be set:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...  # Production database
REDIS_URL=redis://...  # Production Redis
STRIPE_SECRET_KEY=sk_live_...  # Live Stripe key
SENTRY_DSN=https://...  # Production Sentry project
JWT_SECRET=...  # Strong random secret
ENCRYPTION_KEY=...  # Strong random key
```

**Recommended:**
```bash
LOG_LEVEL=info  # Not debug in production
ENABLE_LOKI_TRANSPORT=true
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% sampling
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
SLACK_WEBHOOK_URL=https://...
PAGERDUTY_INTEGRATION_KEY=...
```

### Security Checklist

- [ ] All secrets stored in Kubernetes secrets (not ConfigMaps)
- [ ] Database credentials rotated
- [ ] API keys rotated
- [ ] JWT secret is strong and unique
- [ ] Encryption key is strong and unique
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Helmet.js configured
- [ ] SQL injection prevention (Prisma)
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Input validation
- [ ] Authentication required on sensitive endpoints
- [ ] Authorization checks in place
- [ ] Audit logging enabled

### Performance Checklist

- [ ] Database indexes created
- [ ] Query optimization done
- [ ] Redis caching enabled
- [ ] Connection pooling configured
- [ ] Resource limits set appropriately
- [ ] Auto-scaling configured
- [ ] CDN configured (for frontend)
- [ ] Image optimization
- [ ] Gzip compression enabled
- [ ] HTTP/2 enabled
- [ ] Slow query monitoring enabled

---

## Maintenance

### Daily Tasks

- Check Grafana dashboards for anomalies
- Review Sentry errors
- Check backup health
- Monitor alert volume

### Weekly Tasks

- Review slow queries
- Check disk usage
- Review error trends
- Update documentation

### Monthly Tasks

- Review and update alert thresholds
- Rotate credentials
- Review and optimize database
- Update dependencies
- Review and update runbooks

---

## Support

### Documentation

- **Runbook:** `RUNBOOK.md` - Operational procedures
- **Troubleshooting:** `TROUBLESHOOTING.md` - Common issues and solutions
- **API Docs:** `http://localhost:3000/api-docs` - Swagger documentation
- **Architecture:** `docs/ARCHITECTURE.md` - System architecture

### Contact

- **Slack:** #engineering, #incidents, #alerts
- **Email:** ops@yourdomain.com
- **PagerDuty:** For critical production issues

---

**Last Updated:** January 5, 2026  
**Version:** 1.0  
**Maintainer:** Operations Team

For questions or updates, contact: ops@yourdomain.com

