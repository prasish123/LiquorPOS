# Team Onboarding - Operational Guide

**Version:** 1.0  
**Last Updated:** January 5, 2026  
**Purpose:** Quick-start guide for new team members on operations, monitoring, and incident response

---

## Welcome to the Liquor POS Operations Team! 🎉

This guide will get you up to speed on how we monitor, maintain, and troubleshoot the Liquor POS system.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Architecture Overview](#system-architecture-overview)
3. [Key Tools & Access](#key-tools--access)
4. [Daily Operations](#daily-operations)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Incident Response](#incident-response)
7. [Common Tasks](#common-tasks)
8. [Learning Resources](#learning-resources)

---

## Quick Start

### Your First Day

**1. Get Access (ask your manager):**
- [ ] GitHub repository access
- [ ] Kubernetes cluster access
- [ ] Grafana dashboard access
- [ ] Sentry account
- [ ] Slack channels: #engineering, #incidents, #alerts, #deployments
- [ ] PagerDuty account (if on-call rotation)
- [ ] AWS/Cloud provider console access

**2. Setup Local Environment:**
```bash
# Clone repository
git clone https://github.com/your-org/liquor-pos.git
cd liquor-pos

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start infrastructure
docker-compose -f docker-compose.dev.yml up -d

# Initialize database
cd backend
npx prisma migrate deploy
npx prisma db seed

# Start applications
npm run start:dev  # Backend (terminal 1)
cd ../frontend && npm run dev  # Frontend (terminal 2)
```

**3. Verify Setup:**
```bash
# Check health
curl http://localhost:3000/health

# Open frontend
# http://localhost:5173

# Open Grafana
# http://localhost:3001 (admin/admin)
```

**4. Read Documentation:**
- [ ] `README.md` - Project overview
- [ ] `RUNBOOK.md` - Operational procedures
- [ ] `TROUBLESHOOTING.md` - Common issues
- [ ] `OPERATIONAL_SETUP_GUIDE.md` - Infrastructure setup
- [ ] This guide!

**5. Shadow On-Call Engineer:**
- Observe how they monitor systems
- Learn alert response procedures
- Ask questions!

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────┐
│   Frontend  │ (React + Vite)
│  Port 5173  │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Backend   │ (NestJS + Express)
│  Port 3000  │
└──────┬──────┘
       │
       ├──→ PostgreSQL (Database, Port 5432)
       ├──→ Redis (Cache, Port 6379)
       ├──→ Stripe (Payment Gateway)
       ├──→ Conexxus (Back-office Integration)
       │
       └──→ Observability Stack:
            ├──→ Loki (Logs, Port 3100)
            ├──→ Grafana (Dashboards, Port 3001)
            └──→ Sentry (Error Tracking)
```

### Key Components

| Component | Purpose | Technology | Port |
|-----------|---------|------------|------|
| **Frontend** | POS user interface | React, TypeScript, Zustand | 5173 |
| **Backend** | API, business logic | NestJS, Prisma, TypeScript | 3000 |
| **Database** | Data persistence | PostgreSQL 14+ | 5432 |
| **Cache** | Session, rate limiting | Redis 7+ | 6379 |
| **Logs** | Log aggregation | Grafana Loki | 3100 |
| **Dashboards** | Monitoring, alerting | Grafana | 3001 |
| **Error Tracking** | Error monitoring | Sentry | N/A |

### Data Flow

**Order Processing Flow:**
```
1. User creates order in Frontend
2. Frontend sends request to Backend API
3. Backend validates order
4. Backend checks inventory (DB + Redis cache)
5. Backend processes payment (Stripe)
6. Backend updates inventory (DB)
7. Backend logs transaction (Audit trail)
8. Backend tracks metrics (Business metrics)
9. Backend sends response to Frontend
10. Frontend displays confirmation

All steps are logged to:
- Console (development)
- File logs (production)
- Loki (aggregation)
- Sentry (errors only)
```

---

## Key Tools & Access

### Essential URLs

| Tool | URL | Purpose | Login |
|------|-----|---------|-------|
| **Production API** | https://api.pos-omni.example.com | Backend API | JWT token |
| **Production Frontend** | https://pos.pos-omni.example.com | POS interface | User credentials |
| **Grafana** | https://grafana.pos-omni.example.com | Monitoring dashboards | SSO or admin |
| **Sentry** | https://sentry.io/organizations/your-org | Error tracking | SSO |
| **Stripe Dashboard** | https://dashboard.stripe.com | Payment monitoring | Stripe account |
| **GitHub** | https://github.com/your-org/liquor-pos | Source code | GitHub account |
| **Kubernetes Dashboard** | https://k8s.pos-omni.example.com | Cluster management | kubectl config |

### Command-Line Tools

**Install these on your machine:**

```bash
# kubectl (Kubernetes CLI)
brew install kubectl  # macOS
# or
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Verify
kubectl version --client

# Configure access
kubectl config use-context liquor-pos-production

# Test access
kubectl get pods -n liquor-pos
```

```bash
# Docker & Docker Compose
brew install docker docker-compose  # macOS
# or follow: https://docs.docker.com/get-docker/

# Verify
docker --version
docker-compose --version
```

```bash
# Node.js & npm
brew install node@18  # macOS
# or follow: https://nodejs.org/

# Verify
node --version  # Should be v18+
npm --version
```

```bash
# PostgreSQL client (psql)
brew install postgresql  # macOS

# Verify
psql --version
```

```bash
# Redis CLI
brew install redis  # macOS

# Verify
redis-cli --version
```

### Slack Channels

| Channel | Purpose | When to Use |
|---------|---------|-------------|
| **#engineering** | General engineering discussion | Questions, updates, non-urgent issues |
| **#incidents** | Active incident coordination | During active incidents only |
| **#alerts** | Automated alerts | Monitor, don't post manually |
| **#deployments** | Deployment notifications | Announce deployments, rollbacks |
| **#ops** | Operations team discussion | Ops-specific topics |

---

## Daily Operations

### Morning Routine (10 minutes)

**1. Check System Health:**
```bash
# Quick health check script
curl -s http://localhost:3000/health | jq '.'
```

Or use the dashboard:
- Open Grafana → System Overview dashboard
- Check all components are green
- Look for any anomalies

**2. Review Overnight Alerts:**
- Slack #alerts channel
- Grafana → Alerting → Alert rules
- Check if any alerts fired
- Verify they were resolved

**3. Check Sentry for New Errors:**
- Open Sentry dashboard
- Filter: Last 24 hours
- Review any new error types
- Create tickets for recurring issues

**4. Verify Backups:**
```bash
# Check backup health
curl http://localhost:3000/health/backup

# Or check Grafana
# System Overview → Backup Status
```

**5. Review Metrics:**
- Grafana → Business Metrics dashboard
- Check yesterday's order volume
- Verify revenue numbers look normal
- Check payment success rate

### Throughout the Day

**Monitor Slack #alerts:**
- Alerts are automatically posted
- Most are informational
- Critical alerts require immediate action

**Check Grafana Periodically:**
- System Overview dashboard
- Look for red indicators
- Check P95 latency trends

**Respond to Incidents:**
- See [Incident Response](#incident-response) section

### End of Day (5 minutes)

**1. Check for Open Incidents:**
- Slack #incidents channel
- Ensure all incidents resolved or handed off

**2. Review Day's Metrics:**
- Total orders processed
- Revenue
- Error rate
- Any anomalies

**3. Update On-Call Notes:**
- Document any issues
- Note any ongoing investigations
- Update runbook if needed

---

## Monitoring & Alerting

### Grafana Dashboards

**System Overview Dashboard:**
- **Purpose:** High-level system health
- **Key Metrics:**
  - Overall health status (green/yellow/red)
  - Request rate (requests/second)
  - Error rate (%)
  - P50, P95, P99 latency
  - CPU, memory, disk usage
  - Database connection pool
  - Redis status

**Business Metrics Dashboard:**
- **Purpose:** Business KPIs
- **Key Metrics:**
  - Orders per hour
  - Revenue per hour
  - Average order value
  - Payment success rate
  - Refund rate
  - Top products sold
  - Active customers

**API Performance Dashboard:**
- **Purpose:** API health and performance
- **Key Metrics:**
  - Endpoint latencies
  - Slow requests (>3s)
  - Error rates by endpoint
  - Request volume by endpoint
  - Database query times
  - Slow queries (>1s)

### Log Querying (Loki)

**Access Logs:**
- Grafana → Explore → Select Loki data source

**Common Queries:**

```logql
# All backend logs
{service="liquor-pos-backend"}

# Error logs only
{service="liquor-pos-backend"} |= "ERROR"

# Logs for specific order
{service="liquor-pos-backend"} |= "order-123"

# Logs with correlation ID (trace entire request)
{service="liquor-pos-backend"} | json | correlationId="req_1234567890_abc123"

# Slow requests (>3 seconds)
{service="liquor-pos-backend"} | json | duration > 3000

# Payment failures
{service="liquor-pos-backend"} |= "payment" |= "failed"

# Database errors
{service="liquor-pos-backend"} |= "database" |= "error"

# Last hour of logs
{service="liquor-pos-backend"} [1h]

# Count errors per minute
sum(count_over_time({service="liquor-pos-backend"} |= "ERROR" [1m]))
```

### Alert Severity Levels

| Severity | Response Time | Notification | Examples |
|----------|---------------|--------------|----------|
| **Critical** | Immediate | PagerDuty + Slack | Database down, payment system down, zero revenue |
| **High** | <5 minutes | Slack | High error rate, Redis down, API latency high |
| **Medium** | <30 minutes | Slack | Cache misses high, slow queries |
| **Low** | Next business day | Log only | Low stock, config warnings |

### Common Alerts

**Critical:**
- Database connection pool exhausted
- Payment failure rate > 1%
- Zero orders for 1 hour (during business hours)
- Backup failed or missing (>25 hours)
- Disk usage > 95%

**High:**
- API error rate > 5%
- P99 latency > 5 seconds
- Redis connection failure
- Slow query detected (>1 second)

**Medium:**
- Cache hit rate < 80%
- P95 latency > 3 seconds
- Memory usage > 85%
- CPU usage > 80%

---

## Incident Response

### Incident Response Process

**1. Acknowledge (30 seconds):**
- Acknowledge alert in PagerDuty/Slack
- Post in #incidents: "Investigating [issue]"

**2. Assess (2 minutes):**
- Check Grafana dashboards
- Check Sentry for errors
- Check logs in Loki
- Determine severity

**3. Mitigate (5-15 minutes):**
- Follow runbook for specific issue
- See `RUNBOOK.md` → Common Incidents
- Take immediate action to restore service

**4. Communicate:**
- Post updates in #incidents every 5-10 minutes
- Notify stakeholders if customer-facing
- Update status page if available

**5. Resolve:**
- Verify issue is resolved
- Monitor for 10 minutes
- Post resolution in #incidents
- Close PagerDuty incident

**6. Post-Mortem (within 24 hours):**
- Document what happened
- Root cause analysis
- Action items to prevent recurrence
- Update runbook

### Quick Reference: What to Do When...

**Alert: "High API Error Rate"**
```bash
# 1. Check recent errors
kubectl logs -f deployment/liquor-pos-backend --tail=50 | grep ERROR

# 2. Check Sentry for details
# Open Sentry → Issues → Filter: Last 15 minutes

# 3. Check database health
curl http://localhost:3000/health/db

# 4. If database is down, escalate to database admin
# 5. If code error, consider rollback
kubectl rollout undo deployment/liquor-pos-backend

# 6. Monitor recovery
watch -n 5 'curl -s http://localhost:3000/monitoring/performance | jq ".stats.requests.errorRate"'
```

**Alert: "Database Connection Failed"**
```bash
# 1. Check database is running
kubectl get pods -l app=postgres

# 2. If down, restart
kubectl rollout restart deployment/postgres

# 3. If up, check connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

# 4. Restart backend to reset connection pool
kubectl rollout restart deployment/liquor-pos-backend

# 5. Monitor recovery
watch -n 2 'curl -s http://localhost:3000/health/db'
```

**Alert: "Payment Failure Rate High"**
```bash
# 1. Check Stripe status
curl https://status.stripe.com/api/v2/status.json

# 2. If Stripe is down, notify team
# System will queue payments for later processing

# 3. Check logs for specific errors
kubectl logs deployment/liquor-pos-backend | grep "payment" | grep "failed" | tail -20

# 4. Check Stripe dashboard
# https://dashboard.stripe.com/payments

# 5. Monitor recovery
watch -n 10 'curl -s http://localhost:3000/monitoring/business -H "Authorization: Bearer $TOKEN" | jq ".payments.failureRate"'
```

**Alert: "Zero Revenue for 1 Hour"**
```bash
# 1. Verify store should be open
# Check business hours

# 2. Check frontend is accessible
curl -I https://pos.pos-omni.example.com

# 3. Check backend is accessible
curl http://localhost:3000/health

# 4. Check recent orders
curl http://localhost:3000/api/orders?limit=10 -H "Authorization: Bearer $TOKEN"

# 5. Test order flow manually
# Use admin panel to create test order

# 6. If systems healthy, may be legitimate (slow day)
# Notify store manager
```

### Escalation

**When to Escalate:**
- Issue not resolved within 15 minutes
- Customer-facing outage
- Data loss risk
- Security incident
- Unsure how to proceed

**Escalation Path:**
1. **L1 (0-5 min):** On-call engineer
2. **L2 (5-15 min):** Senior engineer
3. **L3 (15-30 min):** Engineering manager
4. **L4 (30+ min):** CTO

**How to Escalate:**
- Slack: @mention person in #incidents
- PagerDuty: Escalate incident
- Phone: Call if critical and no response

---

## Common Tasks

### Checking System Health

```bash
# Quick health check
curl http://localhost:3000/health | jq '.'

# All health endpoints
curl http://localhost:3000/health/ready | jq '.'
curl http://localhost:3000/health/live | jq '.'
curl http://localhost:3000/health/db | jq '.'
curl http://localhost:3000/health/redis | jq '.'
curl http://localhost:3000/health/backup | jq '.'
```

### Viewing Logs

```bash
# Kubernetes logs (last 50 lines)
kubectl logs deployment/liquor-pos-backend --tail=50

# Follow logs in real-time
kubectl logs -f deployment/liquor-pos-backend

# Logs from previous pod (if crashed)
kubectl logs deployment/liquor-pos-backend --previous

# Logs from specific pod
kubectl logs liquor-pos-backend-abc123-xyz

# Logs with timestamps
kubectl logs deployment/liquor-pos-backend --timestamps

# Logs from last 1 hour
kubectl logs deployment/liquor-pos-backend --since=1h

# Search logs for specific term
kubectl logs deployment/liquor-pos-backend | grep "ERROR"
```

### Restarting Services

```bash
# Restart backend (rolling restart, zero downtime)
kubectl rollout restart deployment/liquor-pos-backend

# Restart frontend
kubectl rollout restart deployment/liquor-pos-frontend

# Restart database (CAUTION: causes brief downtime)
kubectl rollout restart deployment/postgres

# Restart Redis (CAUTION: clears cache)
kubectl rollout restart deployment/redis

# Check rollout status
kubectl rollout status deployment/liquor-pos-backend
```

### Scaling Services

```bash
# Scale backend to 3 replicas
kubectl scale deployment/liquor-pos-backend --replicas=3

# Scale down to 1 replica
kubectl scale deployment/liquor-pos-backend --replicas=1

# Check current replicas
kubectl get deployment liquor-pos-backend
```

### Checking Metrics

```bash
# Business metrics
curl http://localhost:3000/monitoring/business \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Performance metrics
curl http://localhost:3000/monitoring/performance \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# System metrics
curl http://localhost:3000/monitoring/metrics \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Prometheus format (for external monitoring)
curl http://localhost:3000/monitoring/metrics/prometheus \
  -H "Authorization: Bearer $TOKEN"
```

### Managing Backups

```bash
# Trigger manual backup
curl -X POST http://localhost:3000/api/backup/create \
  -H "Authorization: Bearer $TOKEN"

# List backups
curl http://localhost:3000/api/backup/list \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Check backup health
curl http://localhost:3000/health/backup | jq '.'

# Restore from backup (CAUTION: destructive)
# See RUNBOOK.md → Backup & Recovery
```

### Deploying Updates

```bash
# 1. Backup database
curl -X POST http://localhost:3000/api/backup/create \
  -H "Authorization: Bearer $TOKEN"

# 2. Run migrations (if any)
kubectl exec -it deployment/liquor-pos-backend -- npm run migrate:deploy

# 3. Update backend image
kubectl set image deployment/liquor-pos-backend \
  backend=your-registry/liquor-pos-backend:v1.2.3

# 4. Monitor rollout
kubectl rollout status deployment/liquor-pos-backend

# 5. Verify health
curl http://localhost:3000/health/ready

# 6. Update frontend image
kubectl set image deployment/liquor-pos-frontend \
  frontend=your-registry/liquor-pos-frontend:v1.2.3

# 7. Monitor rollout
kubectl rollout status deployment/liquor-pos-frontend

# 8. Smoke test critical flows
# Test: login, create order, process payment
```

### Rolling Back

```bash
# Rollback backend to previous version
kubectl rollout undo deployment/liquor-pos-backend

# Rollback to specific revision
kubectl rollout undo deployment/liquor-pos-backend --to-revision=5

# Check rollout history
kubectl rollout history deployment/liquor-pos-backend

# Verify health after rollback
curl http://localhost:3000/health/ready
```

---

## Learning Resources

### Documentation

**Must Read (First Week):**
1. `README.md` - Project overview
2. `RUNBOOK.md` - Operational procedures
3. `TROUBLESHOOTING.md` - Common issues and solutions
4. `OPERATIONAL_SETUP_GUIDE.md` - Infrastructure setup

**Important (First Month):**
5. `docs/PRD.md` - Product requirements
6. `docs/ARCHITECTURE.md` - System architecture
7. `backend/README.md` - Backend documentation
8. `frontend/README.md` - Frontend documentation

**Reference:**
9. `REQUIREMENTS_REVIEW_COMPLETE.md` - Requirements compliance
10. `HONEST_MAINTAINABILITY_ASSESSMENT.md` - Code quality assessment

### External Resources

**NestJS (Backend Framework):**
- Official Docs: https://docs.nestjs.com/
- Best Practices: https://docs.nestjs.com/techniques/performance

**React (Frontend Framework):**
- Official Docs: https://react.dev/
- Hooks: https://react.dev/reference/react

**Prisma (ORM):**
- Official Docs: https://www.prisma.io/docs/
- Best Practices: https://www.prisma.io/docs/guides/performance-and-optimization

**Kubernetes:**
- Official Docs: https://kubernetes.io/docs/
- kubectl Cheat Sheet: https://kubernetes.io/docs/reference/kubectl/cheatsheet/

**Grafana:**
- Official Docs: https://grafana.com/docs/
- Loki Query Language: https://grafana.com/docs/loki/latest/logql/

**Sentry:**
- Official Docs: https://docs.sentry.io/

### Training

**Week 1: Observation**
- Shadow on-call engineer
- Observe incident response
- Review dashboards and alerts
- Read documentation

**Week 2: Hands-On**
- Setup local environment
- Deploy to staging
- Trigger test alerts
- Practice incident response

**Week 3: On-Call Shadow**
- Shadow on-call rotation
- Respond to alerts with guidance
- Document learnings

**Week 4: Independent**
- Join on-call rotation
- Respond to incidents independently
- Contribute to runbooks

### Useful Commands Cheat Sheet

```bash
# === Health Checks ===
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
curl http://localhost:3000/health/db

# === Logs ===
kubectl logs -f deployment/liquor-pos-backend --tail=50
kubectl logs deployment/liquor-pos-backend | grep ERROR

# === Restart ===
kubectl rollout restart deployment/liquor-pos-backend
kubectl rollout status deployment/liquor-pos-backend

# === Scale ===
kubectl scale deployment/liquor-pos-backend --replicas=3

# === Metrics ===
curl http://localhost:3000/monitoring/business -H "Authorization: Bearer $TOKEN"
curl http://localhost:3000/monitoring/performance -H "Authorization: Bearer $TOKEN"

# === Backup ===
curl -X POST http://localhost:3000/api/backup/create -H "Authorization: Bearer $TOKEN"
curl http://localhost:3000/health/backup

# === Deploy ===
kubectl set image deployment/liquor-pos-backend backend=registry/image:tag
kubectl rollout status deployment/liquor-pos-backend

# === Rollback ===
kubectl rollout undo deployment/liquor-pos-backend

# === Database ===
psql $DATABASE_URL -c "SELECT 1"
psql $DATABASE_URL -c "SELECT count(*) FROM \"Transaction\""

# === Redis ===
redis-cli -u $REDIS_URL ping
redis-cli -u $REDIS_URL INFO stats
```

---

## Getting Help

### When You're Stuck

**1. Check Documentation:**
- `TROUBLESHOOTING.md` for common issues
- `RUNBOOK.md` for procedures
- This guide for quick reference

**2. Check Logs:**
- Grafana → Explore → Loki
- Sentry for errors
- kubectl logs for raw output

**3. Ask in Slack:**
- #engineering for general questions
- #ops for operations questions
- #incidents for active issues

**4. Escalate if Needed:**
- Don't hesitate to ask for help
- Better to escalate early than late
- We're a team!

### Questions to Ask

**Good Questions:**
- "I see this error in logs, what does it mean?"
- "How do I check if backups are running?"
- "What's the procedure for deploying to production?"
- "Can you explain how the payment flow works?"

**Even Better Questions (with context):**
- "I see 'Connection timeout' errors in logs. I checked database health and it's up. What else should I check?"
- "Backups health check is failing. I checked the logs and see 'Disk full'. How do I free up space?"

### Contact Information

| Role | Name | Slack | Email |
|------|------|-------|-------|
| **Engineering Lead** | John Doe | @john | john@example.com |
| **Database Admin** | Bob Johnson | @bob | bob@example.com |
| **DevOps Lead** | Charlie Wilson | @charlie | charlie@example.com |
| **On-Call (Current)** | Check PagerDuty | - | - |

---

## Conclusion

**Remember:**
- **Safety First:** When in doubt, ask for help
- **Document Everything:** Update runbooks with new learnings
- **Communicate:** Keep team informed during incidents
- **Learn Continuously:** Every incident is a learning opportunity
- **Be Proactive:** Monitor trends, don't just react to alerts

**You've Got This!** 💪

The team is here to support you. Don't hesitate to ask questions.

---

**Last Updated:** January 5, 2026  
**Version:** 1.0  
**Maintainer:** Operations Team

**Next Steps:**
1. Complete Week 1 training
2. Setup local environment
3. Review all dashboards
4. Shadow on-call engineer
5. Ask questions!

For questions or updates, contact: ops@yourdomain.com

