# Operations Quick Reference Card

**Liquor POS System** | Version 1.0 | January 5, 2026

---

## 🚨 Emergency Contacts

| Severity | Contact | Method |
|----------|---------|--------|
| **Critical** | PagerDuty | Auto-page on-call |
| **High** | #incidents | Slack @on-call |
| **Medium** | #engineering | Slack message |

**On-Call:** Check PagerDuty schedule

---

## 🏥 Health Check URLs

```bash
# Quick health check
curl http://localhost:3000/health

# All endpoints
/health          # Overall health
/health/ready    # Kubernetes readiness
/health/live     # Kubernetes liveness
/health/db       # Database only
/health/redis    # Redis only
/health/backup   # Backup system
```

**Expected:** `200 OK` with `{"status": "ok"}`

---

## 📊 Monitoring Dashboards

**Grafana:** http://localhost:3001 (admin/admin)

| Dashboard | Purpose | Key Metrics |
|-----------|---------|-------------|
| **System Overview** | Overall health | Health, error rate, latency, resources |
| **Business Metrics** | Business KPIs | Orders, revenue, payments |
| **API Performance** | API health | Endpoint latencies, slow requests |
| **Database** | DB performance | Query times, connections |

---

## 📝 Log Locations

| Environment | Location | Command |
|-------------|----------|---------|
| **Kubernetes** | Pod stdout | `kubectl logs -f deployment/liquor-pos-backend` |
| **Docker** | Container stdout | `docker logs -f liquor-pos-backend` |
| **Local Files** | `logs/*.log` | `tail -f logs/combined-*.log` |
| **Loki** | Grafana Explore | Query: `{service="liquor-pos-backend"}` |
| **Sentry** | sentry.io | Filter by environment |

---

## 🔍 Common Loki Queries

```logql
# All logs
{service="liquor-pos-backend"}

# Errors only
{service="liquor-pos-backend"} |= "ERROR"

# Specific order
{service="liquor-pos-backend"} |= "order-123"

# Correlation ID (trace request)
{service="liquor-pos-backend"} | json | correlationId="req_..."

# Slow requests (>3s)
{service="liquor-pos-backend"} | json | duration > 3000

# Payment failures
{service="liquor-pos-backend"} |= "payment" |= "failed"
```

---

## 🚀 Common Commands

### View Logs
```bash
# Last 50 lines
kubectl logs deployment/liquor-pos-backend --tail=50

# Follow in real-time
kubectl logs -f deployment/liquor-pos-backend

# Search for errors
kubectl logs deployment/liquor-pos-backend | grep ERROR

# Previous pod (if crashed)
kubectl logs deployment/liquor-pos-backend --previous
```

### Restart Service
```bash
# Rolling restart (zero downtime)
kubectl rollout restart deployment/liquor-pos-backend

# Check status
kubectl rollout status deployment/liquor-pos-backend
```

### Scale Service
```bash
# Scale up
kubectl scale deployment/liquor-pos-backend --replicas=3

# Scale down
kubectl scale deployment/liquor-pos-backend --replicas=1
```

### Check Metrics
```bash
# Business metrics
curl http://localhost:3000/monitoring/business \
  -H "Authorization: Bearer $TOKEN"

# Performance metrics
curl http://localhost:3000/monitoring/performance \
  -H "Authorization: Bearer $TOKEN"

# All metrics
curl http://localhost:3000/monitoring/metrics \
  -H "Authorization: Bearer $TOKEN"
```

### Backup
```bash
# Trigger manual backup
curl -X POST http://localhost:3000/api/backup/create \
  -H "Authorization: Bearer $TOKEN"

# Check backup health
curl http://localhost:3000/health/backup

# List backups
curl http://localhost:3000/api/backup/list \
  -H "Authorization: Bearer $TOKEN"
```

### Deploy
```bash
# Update image
kubectl set image deployment/liquor-pos-backend \
  backend=registry/image:v1.2.3

# Monitor rollout
kubectl rollout status deployment/liquor-pos-backend

# Rollback if needed
kubectl rollout undo deployment/liquor-pos-backend
```

---

## 🔥 Incident Response (5 Steps)

### 1. Acknowledge (30s)
- Acknowledge in PagerDuty/Slack
- Post in #incidents: "Investigating [issue]"

### 2. Assess (2min)
- Check Grafana dashboards
- Check Sentry for errors
- Check logs in Loki
- Determine severity

### 3. Mitigate (5-15min)
- Follow runbook (see below)
- Take action to restore service

### 4. Communicate
- Update #incidents every 5-10 min
- Notify stakeholders if needed

### 5. Resolve
- Verify issue resolved
- Monitor for 10 minutes
- Close incident
- Schedule post-mortem

---

## 🔧 Quick Fixes

### High Error Rate
```bash
# 1. Check recent errors
kubectl logs deployment/liquor-pos-backend --tail=50 | grep ERROR

# 2. Check Sentry dashboard
# 3. Check database health
curl http://localhost:3000/health/db

# 4. Restart if needed
kubectl rollout restart deployment/liquor-pos-backend

# 5. Monitor recovery
watch -n 5 'curl -s http://localhost:3000/monitoring/performance | jq ".stats.requests.errorRate"'
```

### Database Connection Failed
```bash
# 1. Check database is running
kubectl get pods -l app=postgres

# 2. Restart backend
kubectl rollout restart deployment/liquor-pos-backend

# 3. Monitor recovery
watch -n 2 'curl -s http://localhost:3000/health/db'
```

### Slow Response Times
```bash
# 1. Check slow requests
curl http://localhost:3000/monitoring/performance \
  -H "Authorization: Bearer $TOKEN" | jq '.slowRequests'

# 2. Scale up if needed
kubectl scale deployment/liquor-pos-backend --replicas=3

# 3. Monitor improvement
watch -n 5 'curl -s http://localhost:3000/monitoring/performance | jq ".stats.requests.p95"'
```

### Payment Failures
```bash
# 1. Check Stripe status
curl https://status.stripe.com/api/v2/status.json

# 2. Check logs
kubectl logs deployment/liquor-pos-backend | grep "payment" | grep "failed"

# 3. Check Stripe dashboard
# https://dashboard.stripe.com/payments

# 4. System auto-queues if Stripe down
```

---

## 🚨 Alert Severity

| Level | Response Time | Notification | Examples |
|-------|---------------|--------------|----------|
| **Critical** | Immediate | PagerDuty + Slack | DB down, payments down, zero revenue |
| **High** | <5 min | Slack | High error rate, Redis down |
| **Medium** | <30 min | Slack | Cache misses, slow queries |
| **Low** | Next day | Log only | Low stock, config warnings |

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `RUNBOOK.md` | Operational procedures, incident response |
| `TROUBLESHOOTING.md` | Common issues and solutions |
| `OPERATIONAL_SETUP_GUIDE.md` | Infrastructure setup |
| `TEAM_ONBOARDING_OPERATIONAL_GUIDE.md` | New team member guide |
| `OPERATIONAL_DOCUMENTATION_SUMMARY.md` | Complete overview |

---

## 🔗 Important URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Production API** | https://api.pos-omni.example.com | Backend API |
| **Production Frontend** | https://pos.pos-omni.example.com | POS interface |
| **Grafana** | https://grafana.pos-omni.example.com | Dashboards |
| **Sentry** | https://sentry.io/organizations/your-org | Error tracking |
| **Stripe** | https://dashboard.stripe.com | Payments |
| **GitHub** | https://github.com/your-org/liquor-pos | Source code |

---

## 🎯 Key Metrics to Watch

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| **Error Rate** | <1% | 1-5% | >5% |
| **P95 Latency** | <1s | 1-3s | >3s |
| **CPU Usage** | <50% | 50-80% | >80% |
| **Memory Usage** | <70% | 70-85% | >85% |
| **Disk Usage** | <70% | 70-90% | >90% |
| **Payment Success** | >99% | 98-99% | <98% |
| **Cache Hit Rate** | >90% | 80-90% | <80% |

---

## 💡 Pro Tips

1. **Always check logs first** - Most issues show up in logs
2. **Use correlation IDs** - Trace entire request flow
3. **Check Sentry for stack traces** - Better than raw logs
4. **Monitor after changes** - Watch metrics for 10+ minutes
5. **Document everything** - Update runbooks with learnings
6. **Communicate early** - Keep team informed
7. **Don't hesitate to escalate** - Better safe than sorry

---

## 🆘 When in Doubt

1. Check `TROUBLESHOOTING.md` for common issues
2. Search logs in Loki for error messages
3. Ask in #engineering Slack channel
4. Escalate to on-call engineer
5. Don't make changes without understanding impact

---

**Remember:** Safety first. When in doubt, ask for help! 🚀

---

**Print this page and keep it handy!**

Last Updated: January 5, 2026 | Version 1.0

