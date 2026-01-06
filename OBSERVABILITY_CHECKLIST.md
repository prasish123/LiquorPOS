# Observability Implementation Checklist

Quick reference for implementing observability improvements.

---

## ✅ Phase 1: Production Blockers (P0 - Week 1)

### 1. Kubernetes Health Probes
- [ ] Add `/health/ready` endpoint
  - [ ] Check database connectivity
  - [ ] Check Redis connectivity
  - [ ] Return 200 when ready, 503 when not
- [ ] Add `/health/live` endpoint
  - [ ] Check memory usage
  - [ ] Check process responsiveness
  - [ ] Return 200 when alive, 503 when dead
- [ ] Add `/health/startup` endpoint (optional)
- [ ] Test with Kubernetes deployment
- [ ] Update deployment manifests

**Files:** `backend/src/health/health.controller.ts`

---

### 2. Global Error Handlers
- [ ] Add `process.on('uncaughtException')` handler
  - [ ] Log error with full stack trace
  - [ ] Send to Sentry
  - [ ] Graceful shutdown
- [ ] Add `process.on('unhandledRejection')` handler
  - [ ] Log rejection with context
  - [ ] Send to Sentry
- [ ] Add SIGTERM handler for graceful shutdown
- [ ] Add SIGINT handler for graceful shutdown
- [ ] Test error scenarios

**Files:** `backend/src/main.ts`

---

### 3. Frontend Sentry Integration
- [ ] Install `@sentry/react` package
- [ ] Create Sentry configuration
- [ ] Initialize Sentry in `main.tsx`
  - [ ] Set DSN from environment
  - [ ] Configure environment
  - [ ] Enable browser tracing
  - [ ] Enable session replay
- [ ] Update LoggerService to use Sentry
- [ ] Add error boundary component
- [ ] Test error reporting
- [ ] Verify errors appear in Sentry dashboard

**Files:** 
- `frontend/package.json`
- `frontend/src/main.tsx`
- `frontend/src/infrastructure/services/LoggerService.ts`

---

### 4. Alert Thresholds
- [ ] Create `alert-rules.ts` file
- [ ] Define database alert rules
  - [ ] Slow query threshold
  - [ ] Connection pool exhaustion
  - [ ] Query failure rate
- [ ] Define API alert rules
  - [ ] Error rate threshold
  - [ ] P95 latency threshold
  - [ ] P99 latency threshold
- [ ] Define business alert rules
  - [ ] Order failure rate
  - [ ] Payment failure rate
- [ ] Implement threshold checking
- [ ] Configure Slack webhook
- [ ] Configure PagerDuty integration
- [ ] Test alerting

**Files:** 
- `backend/src/monitoring/alert-rules.ts` (NEW)
- `backend/src/monitoring/monitoring.service.ts`

---

### 5. Business Metrics
- [ ] Create `BusinessMetricsService`
- [ ] Track order metrics
  - [ ] Orders completed
  - [ ] Order value
  - [ ] Orders per hour
- [ ] Track payment metrics
  - [ ] Payment attempts
  - [ ] Payment success/failure
  - [ ] Payment method breakdown
- [ ] Track revenue metrics
  - [ ] Revenue per hour
  - [ ] Average transaction value
- [ ] Expose metrics via API endpoint
- [ ] Create Grafana dashboard
- [ ] Test metrics collection

**Files:** 
- `backend/src/monitoring/business-metrics.service.ts` (NEW)
- `backend/src/orders/order-orchestrator.ts`
- `backend/src/orders/agents/payment.agent.ts`

---

## ⚠️ Phase 2: High Priority (P1 - Week 2-3)

### 6. Database Query Monitoring
- [ ] Enable query logging in production
- [ ] Add query sampling (10%)
- [ ] Track slow queries
- [ ] Export query metrics
- [ ] Create slow query dashboard
- [ ] Alert on slow queries

**Files:** `backend/src/prisma.service.ts`

---

### 7. Cache Performance Monitoring
- [ ] Expose cache metrics via API
- [ ] Track hit rate
- [ ] Track memory usage
- [ ] Alert on low hit rate (<80%)
- [ ] Create cache dashboard

**Files:** `backend/src/redis/redis.service.ts`

---

### 8. Connection Pool Monitoring
- [ ] Implement `getConnectionPoolMetrics()`
- [ ] Expose via `/health/db` endpoint
- [ ] Track pool utilization
- [ ] Alert on high utilization (>90%)
- [ ] Create pool dashboard

**Files:** `backend/src/prisma.service.ts`

---

### 9. Payment Metrics
- [ ] Create `PaymentMetricsService`
- [ ] Track payment attempts
- [ ] Track payment success/failure
- [ ] Track authorization vs capture
- [ ] Track refunds
- [ ] Alert on high failure rate
- [ ] Create payment dashboard

**Files:** 
- `backend/src/payments/payment-metrics.service.ts` (NEW)
- `backend/src/orders/agents/payment.agent.ts`

---

### 10. Security Event Logging
- [ ] Create `SecurityAuditService`
- [ ] Log failed login attempts
- [ ] Detect brute force attacks
- [ ] Log privilege escalation attempts
- [ ] Log unusual access patterns
- [ ] Alert on security events
- [ ] Create security dashboard

**Files:** 
- `backend/src/auth/security-audit.service.ts` (NEW)
- `backend/src/auth/auth.controller.ts`

---

### 11. External Service Health
- [ ] Add Stripe health check
- [ ] Add OpenAI health check
- [ ] Add Conexxus health check
- [ ] Add storage health check
- [ ] Expose via `/health/external`
- [ ] Alert on service degradation

**Files:** `backend/src/health/health.controller.ts`

---

### 12. Offline Queue Monitoring
- [ ] Expose queue depth metric
- [ ] Track oldest item age
- [ ] Track sync success rate
- [ ] Alert on queue backup
- [ ] Create queue dashboard

**Files:** `backend/src/offline/offline-queue.service.ts`

---

### 13. Distributed Tracing
- [ ] Install OpenTelemetry
- [ ] Configure trace propagation
- [ ] Add trace context to external calls
- [ ] Set up Jaeger/Tempo
- [ ] Create trace dashboard

**Files:** Multiple

---

## 📊 Phase 3: Medium Priority (P2 - Week 4-5)

### 14. Log Retention & Archival
- [ ] Extend combined logs to 30 days
- [ ] Extend error logs to 90 days
- [ ] Set up audit log archival (7 years)
- [ ] Configure S3/R2 archival
- [ ] Test restore process

**Files:** `backend/src/common/logger.service.ts`

---

### 15. Metrics Aggregation
- [ ] Implement time-based windows
- [ ] Add 1h, 24h, 7d aggregations
- [ ] Export to Prometheus
- [ ] Add percentile calculations
- [ ] Create aggregation dashboard

**Files:** `backend/src/monitoring/metrics.service.ts`

---

### 16. SLO Tracking
- [ ] Define SLOs
  - [ ] Availability target (99.9%)
  - [ ] Latency target (95% < 1s)
  - [ ] Error rate target (99% success)
- [ ] Implement error budget calculation
- [ ] Track burn rate
- [ ] Alert on budget exhaustion
- [ ] Create SLO dashboard

**Files:** `backend/src/monitoring/slo.service.ts` (NEW)

---

### 17. Performance Budgets
- [ ] Define API performance budgets
- [ ] Define database performance budgets
- [ ] Implement budget checking
- [ ] Alert on budget violations
- [ ] Add to CI/CD pipeline

**Files:** `backend/src/monitoring/performance-budgets.ts` (NEW)

---

### 18. Synthetic Monitoring
- [ ] Create synthetic order flow
- [ ] Set up external uptime monitoring
- [ ] Monitor critical user journeys
- [ ] Alert on synthetic failures
- [ ] Create synthetic dashboard

**Tools:** UptimeRobot, Pingdom, or custom

---

### 19. Grafana Dashboards
- [ ] Set up Grafana instance
- [ ] Create system overview dashboard
- [ ] Create API performance dashboard
- [ ] Create database dashboard
- [ ] Create business metrics dashboard
- [ ] Create security dashboard
- [ ] Share with team

**Tool:** Grafana

---

### 20. Log Sampling
- [ ] Skip health check logging
- [ ] Sample high-frequency endpoints (10%)
- [ ] Keep all error logs
- [ ] Keep all security logs
- [ ] Test log volume reduction

**Files:** `backend/src/main.ts`

---

### 21. Compliance Metrics
- [ ] Track age verifications
- [ ] Track verification methods
- [ ] Calculate verification rate
- [ ] Create compliance report
- [ ] Create compliance dashboard

**Files:** `backend/src/monitoring/compliance-metrics.service.ts` (NEW)

---

### 22. Inventory Metrics
- [ ] Track stock levels
- [ ] Track reservations
- [ ] Track low stock items
- [ ] Alert on low stock
- [ ] Create inventory dashboard

**Files:** `backend/src/inventory/inventory-metrics.service.ts` (NEW)

---

## 🔧 Phase 4: Low Priority (P3 - Week 6)

### 23. Request ID in Headers
- [ ] Add `X-Request-ID` to response headers
- [ ] Document for clients

**Files:** `backend/src/common/correlation-id.middleware.ts`

---

### 24. User-Agent Parsing
- [ ] Install `useragent` package
- [ ] Parse user agent
- [ ] Track browser/OS metrics
- [ ] Segment errors by client

**Files:** `backend/src/main.ts`

---

### 25. Geographic Metrics
- [ ] Add location-based metrics
- [ ] Track requests by region
- [ ] Create geographic dashboard

**Files:** `backend/src/monitoring/metrics.service.ts`

---

### 26. API Version Tracking
- [ ] Track API version usage
- [ ] Alert on deprecated version usage
- [ ] Create version dashboard

**Files:** `backend/src/main.ts`

---

### 27. Feature Flag Metrics
- [ ] Track feature flag evaluations
- [ ] Measure feature adoption
- [ ] Create feature flag dashboard

**Files:** `backend/src/monitoring/feature-metrics.service.ts` (NEW)

---

### 28. A/B Test Metrics
- [ ] Track experiment assignments
- [ ] Track conversion rates
- [ ] Create experiment dashboard

**Files:** `backend/src/monitoring/experiment-metrics.service.ts` (NEW)

---

### 29. Device Type Metrics
- [ ] Detect mobile vs desktop
- [ ] Track metrics by device
- [ ] Create device dashboard

**Files:** `backend/src/main.ts`

---

## 📋 Testing Checklist

### Health Checks
- [ ] `/health` returns 200 when healthy
- [ ] `/health` returns 503 when unhealthy
- [ ] `/health/ready` returns 200 when ready
- [ ] `/health/ready` returns 503 when not ready
- [ ] `/health/live` returns 200 when alive
- [ ] `/health/db` shows connection pool metrics
- [ ] `/health/redis` shows cache metrics
- [ ] `/health/external` shows external service status

### Error Handling
- [ ] Uncaught exceptions are logged
- [ ] Uncaught exceptions are sent to Sentry
- [ ] Unhandled rejections are logged
- [ ] Unhandled rejections are sent to Sentry
- [ ] Frontend errors are sent to Sentry
- [ ] Error correlation IDs work

### Alerting
- [ ] Slack alerts fire correctly
- [ ] PagerDuty alerts fire correctly
- [ ] Alert thresholds are appropriate
- [ ] Alert messages are clear
- [ ] Critical alerts escalate properly

### Metrics
- [ ] Business metrics are tracked
- [ ] Payment metrics are tracked
- [ ] Database metrics are tracked
- [ ] Cache metrics are tracked
- [ ] Metrics are exposed via API
- [ ] Prometheus can scrape metrics

### Dashboards
- [ ] Grafana dashboards load
- [ ] Dashboards show real data
- [ ] Dashboards auto-refresh
- [ ] Dashboards are shared with team

---

## 🎯 Success Criteria

### Phase 1 Complete
- [ ] All P0 items checked off
- [ ] Health probes tested in Kubernetes
- [ ] Errors appearing in Sentry
- [ ] Alerts firing to Slack
- [ ] Business metrics dashboard live

### Phase 2 Complete
- [ ] All P1 items checked off
- [ ] Query monitoring active
- [ ] Payment metrics tracked
- [ ] Security events logged
- [ ] External services monitored

### Production Ready
- [ ] All P0 and P1 items complete
- [ ] Dashboards created
- [ ] Runbooks documented
- [ ] Team trained
- [ ] Incident response tested

---

## 📚 Documentation Checklist

- [ ] Update architecture docs
- [ ] Document alert thresholds
- [ ] Create runbooks for common alerts
- [ ] Document dashboard usage
- [ ] Create on-call guide
- [ ] Document incident response process
- [ ] Update deployment docs

---

## 🚀 Deployment Checklist

- [ ] Set environment variables
  - [ ] `SENTRY_DSN`
  - [ ] `SLACK_WEBHOOK_URL`
  - [ ] `PAGERDUTY_INTEGRATION_KEY`
  - [ ] `LOKI_URL`
- [ ] Configure Kubernetes probes
- [ ] Set up Grafana
- [ ] Set up Prometheus
- [ ] Configure alerting rules
- [ ] Test health checks
- [ ] Test alerting
- [ ] Train team

---

**Last Updated:** January 5, 2026  
**Owner:** Engineering Team  
**Status:** Ready for Implementation

