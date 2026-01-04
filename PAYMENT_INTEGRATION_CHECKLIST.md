# PAX Payment Integration - Implementation Checklist

**Project:** PAX Terminal Integration with Stripe Preservation  
**Estimated Effort:** 16 hours  
**Target Completion:** January 13, 2026  
**Status:** 🔴 NOT STARTED

---

## Pre-Implementation (Before Starting)

### Business & Planning
- [ ] **Stakeholder approval obtained** (Product Manager, Tech Lead, Security)
- [ ] **PAX SDK access secured** (Developer portal credentials)
- [ ] **PAX terminals procured** (2 units for pilot)
- [ ] **Budget approved** ($2,400 dev + $1,500 hardware)
- [ ] **Timeline confirmed** (16 hours available)

### Technical Preparation
- [ ] **PAX documentation reviewed** (Integration guide, REST API spec)
- [ ] **PAX sandbox environment setup** (Test credentials)
- [ ] **Development environment ready** (Node.js 18+, PostgreSQL 14+)
- [ ] **Git feature branch created** (`feature/pax-terminal-integration`)
- [ ] **Stripe integration verified working** (Run existing tests)

---

## Phase 1: Research & Design (4 hours)

### Hour 1-2: PAX SDK Research
- [ ] **Review PAX integration options**
  - [ ] REST API over HTTPS (recommended)
  - [ ] Native SDK (if available for Node.js)
  - [ ] WebSocket/long-polling for terminal events
- [ ] **Identify PAX API endpoints**
  - [ ] `POST /api/transaction` (authorize, capture, void, refund)
  - [ ] `GET /api/health` (terminal health check)
  - [ ] `GET /api/status` (transaction status)
- [ ] **Determine authentication method**
  - [ ] API key
  - [ ] OAuth 2.0
  - [ ] Certificate-based
- [ ] **Document PAX transaction flow**
  - [ ] Authorization (EMV chip read)
  - [ ] Capture (settlement)
  - [ ] Void (cancel before settlement)
  - [ ] Refund (after settlement)

### Hour 3-4: Architecture Design
- [ ] **Design Payment Router**
  - [ ] Routing decision logic (card-present vs card-not-present)
  - [ ] Fallback mechanism (PAX → Stripe)
  - [ ] Unified `PaymentResult` interface
- [ ] **Design PAX Terminal Agent**
  - [ ] Terminal discovery/registration
  - [ ] Transaction processing (authorize, capture, void)
  - [ ] Error handling and retries
- [ ] **Design Terminal Manager**
  - [ ] Terminal registry (database + Redis cache)
  - [ ] Health checks and heartbeats
  - [ ] Connection pooling
- [ ] **Design database schema changes**
  - [ ] Add `processorType` to `Payment` table
  - [ ] Create `Terminal` table
  - [ ] Migration scripts

**Deliverables:**
- [ ] Technical design document (architecture diagrams)
- [ ] API specification (PAX Terminal Agent interface)
- [ ] Database migration scripts (SQL)

---

## Phase 2: Core Integration (8 hours)

### Hour 1-2: Database Migrations
- [ ] **Create migration file** (`prisma/migrations/xxx_add_pax_support.sql`)
- [ ] **Add `processorType` to Payment table**
  ```sql
  ALTER TABLE "Payment" ADD COLUMN "processorType" VARCHAR(20) DEFAULT 'stripe';
  ```
- [ ] **Create Terminal table**
  ```sql
  CREATE TABLE "Terminal" (
    "id" TEXT PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ipAddress" TEXT,
    "serialNumber" TEXT UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastHeartbeat" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("locationId") REFERENCES "Location"("id")
  );
  ```
- [ ] **Create indexes**
  ```sql
  CREATE INDEX "Terminal_locationId_idx" ON "Terminal"("locationId");
  CREATE INDEX "Terminal_status_idx" ON "Terminal"("status");
  ```
- [ ] **Update Prisma schema** (`backend/prisma/schema.prisma`)
- [ ] **Run migration** (`npm run migrate:deploy`)
- [ ] **Verify migration** (Check database schema)

### Hour 3-4: Terminal Manager Service
- [ ] **Create file** `backend/src/orders/agents/terminal-manager.service.ts`
- [ ] **Implement `TerminalManager` class**
  - [ ] `getTerminal(locationId, terminalId?)` - Retrieve terminal
  - [ ] `registerTerminal(data)` - Register new terminal
  - [ ] `healthCheck(terminalId)` - Check terminal health
  - [ ] `initializeCache()` - Load terminals into memory
- [ ] **Add to module** (`backend/src/orders/orders.module.ts`)
- [ ] **Write unit tests** (`terminal-manager.service.spec.ts`)
  - [ ] Test terminal retrieval (cache hit)
  - [ ] Test terminal retrieval (cache miss)
  - [ ] Test terminal registration
  - [ ] Test health check (success)
  - [ ] Test health check (failure)

### Hour 5-6: PAX Terminal Agent
- [ ] **Create file** `backend/src/orders/agents/pax-terminal.agent.ts`
- [ ] **Define interfaces**
  - [ ] `PaxTerminal` - Terminal metadata
  - [ ] `PaxTransactionRequest` - Transaction request payload
  - [ ] `PaxTransactionResponse` - Transaction response payload
- [ ] **Implement `PaxTerminalAgent` class**
  - [ ] `authorize(context, terminal)` - Authorize payment
  - [ ] `capture(paymentId, processorId)` - Capture payment
  - [ ] `void(payment)` - Void/cancel payment
  - [ ] `refund(processorId, amount, reason)` - Refund payment
  - [ ] `callPaxTerminal(terminal, request)` - HTTP client wrapper
- [ ] **Add error handling**
  - [ ] Network timeout (30s)
  - [ ] Terminal offline
  - [ ] Card declined
  - [ ] EMV transaction cancelled
- [ ] **Add to module** (`backend/src/orders/orders.module.ts`)
- [ ] **Write unit tests** (`pax-terminal.agent.spec.ts`)
  - [ ] Test successful authorization
  - [ ] Test authorization failure (card declined)
  - [ ] Test network timeout
  - [ ] Test terminal unavailable

### Hour 7-8: Payment Router
- [ ] **Create file** `backend/src/orders/agents/payment-router.service.ts`
- [ ] **Define interfaces**
  - [ ] `PaymentRouteContext` - Routing context
  - [ ] `PaymentResult` - Unified payment result (add `processorType`)
- [ ] **Implement `PaymentRouter` class**
  - [ ] `authorize(context)` - Route payment to processor
  - [ ] `capture(paymentResult)` - Capture via appropriate processor
  - [ ] `void(paymentResult)` - Void via appropriate processor
  - [ ] `isCardPresent(context)` - Determine if card-present
- [ ] **Implement routing logic**
  - [ ] Cash → Cash handler
  - [ ] Card + counter + terminal available → PAX
  - [ ] Card + counter + terminal unavailable → Stripe fallback
  - [ ] Card + web/mobile/delivery → Stripe
- [ ] **Add to module** (`backend/src/orders/orders.module.ts`)
- [ ] **Write unit tests** (`payment-router.service.spec.ts`)
  - [ ] Test cash routing
  - [ ] Test card-present routing (PAX)
  - [ ] Test card-not-present routing (Stripe)
  - [ ] Test PAX fallback to Stripe

### Hour 9: Order Orchestrator Integration
- [ ] **Update `OrderOrchestrator`** (`backend/src/orders/order-orchestrator.ts`)
  - [ ] Inject `PaymentRouter` (replace direct `PaymentAgent` calls)
  - [ ] Update `processOrder()` to use `PaymentRouter.authorize()`
  - [ ] Update payment capture to use `PaymentRouter.capture()`
  - [ ] Update compensation to use `PaymentRouter.void()`
- [ ] **Verify no changes to `PaymentAgent`** (Stripe code untouched)
- [ ] **Update `PaymentAgent.createPaymentRecord()`**
  - [ ] Add `processorType` field to database insert
- [ ] **Run existing tests** (Ensure no regressions)

---

## Phase 3: Testing & Validation (3 hours)

### Hour 1: Unit Tests
- [ ] **Run all unit tests** (`npm run test`)
- [ ] **Verify coverage** (Target: >80%)
  - [ ] `PaymentRouter`: 100%
  - [ ] `PaxTerminalAgent`: >80%
  - [ ] `TerminalManager`: >80%
- [ ] **Fix any failing tests**
- [ ] **Add missing test cases**

### Hour 2: Integration Tests
- [ ] **Create integration test file** (`backend/test/pax-integration.e2e-spec.ts`)
- [ ] **Test PAX payment flow (sandbox)**
  - [ ] Successful authorization
  - [ ] Successful capture
  - [ ] Card declined
  - [ ] Terminal timeout
  - [ ] Void/refund
- [ ] **Test PAX → Stripe fallback**
  - [ ] Terminal offline → Stripe used
  - [ ] PAX error → Stripe used
- [ ] **Test payment routing**
  - [ ] Counter + terminal → PAX
  - [ ] Counter + no terminal → Stripe
  - [ ] Web → Stripe
  - [ ] Mobile → Stripe

### Hour 3: Regression Tests
- [ ] **Run existing Stripe tests** (`backend/test/payment-integration.e2e-spec.ts`)
- [ ] **Verify all Stripe tests pass** (Zero regressions)
- [ ] **Test e-commerce checkout** (Stripe unchanged)
- [ ] **Test mobile app checkout** (Stripe unchanged)
- [ ] **Test delivery order checkout** (Stripe unchanged)
- [ ] **Test offline payment queue** (Unchanged)

---

## Phase 4: Deployment & Monitoring (1 hour)

### Staging Deployment
- [ ] **Merge feature branch** (`git merge feature/pax-terminal-integration`)
- [ ] **Deploy to staging** (`npm run deploy:staging`)
- [ ] **Run smoke tests** (Basic checkout flow)
- [ ] **Verify database migrations** (Check schema)
- [ ] **Test with PAX sandbox terminal**

### Monitoring Setup
- [ ] **Add payment routing metrics**
  - [ ] `payment.route.pax.count`
  - [ ] `payment.route.stripe.count`
  - [ ] `payment.route.fallback.count`
- [ ] **Add PAX terminal metrics**
  - [ ] `pax.authorization.success.count`
  - [ ] `pax.authorization.failure.count`
  - [ ] `pax.authorization.duration` (p50, p95, p99)
  - [ ] `pax.terminal.health.status`
- [ ] **Configure alerts**
  - [ ] 🔴 PAX terminal unreachable >5 minutes
  - [ ] 🔴 Payment routing errors >5% in 5 minutes
  - [ ] 🟡 PAX fallback to Stripe >20% in 15 minutes
- [ ] **Create monitoring dashboard** (Grafana/Datadog)

### Documentation
- [ ] **Update API documentation** (Swagger/OpenAPI)
- [ ] **Create operations runbook**
  - [ ] Terminal registration procedure
  - [ ] Troubleshooting guide (common errors)
  - [ ] Rollback procedure
- [ ] **Create staff training materials**
  - [ ] How to use PAX terminal
  - [ ] What to do if terminal fails
  - [ ] When Stripe fallback is used

---

## Phase 5: Pilot Rollout (5 days)

### Day 1: Pilot Setup
- [ ] **Register 2 PAX terminals** (1 location)
  - [ ] Terminal 1: `POST /api/terminals/register`
  - [ ] Terminal 2: `POST /api/terminals/register`
- [ ] **Verify terminal connectivity** (Health checks)
- [ ] **Configure POS terminals** (Set `terminalId` in environment)
- [ ] **Train staff** (30-minute session)

### Day 2-4: Pilot Monitoring
- [ ] **Monitor payment metrics** (Dashboard)
  - [ ] PAX payment count
  - [ ] PAX success rate (target: >98%)
  - [ ] Fallback rate (target: <5%)
  - [ ] Checkout time (target: <3s)
- [ ] **Collect staff feedback** (Daily check-ins)
- [ ] **Address issues** (Bug fixes, UX improvements)

### Day 5: Pilot Review
- [ ] **Review pilot metrics**
  - [ ] Payment success rate: ____%
  - [ ] Average checkout time: ____s
  - [ ] Fallback rate: ____%
  - [ ] Staff satisfaction: ____/5
- [ ] **Go/No-Go decision for gradual rollout**
  - [ ] ✅ Success rate >98%
  - [ ] ✅ Checkout time <3s
  - [ ] ✅ Staff satisfaction >4/5
  - [ ] ✅ Zero critical bugs

---

## Phase 6: Gradual Rollout (7 days)

### Week 1: Location 1 (All Terminals)
- [ ] **Register all terminals at pilot location**
- [ ] **Monitor for 3 days**
- [ ] **Review metrics** (Daily)

### Week 2: Location 2-3
- [ ] **Register terminals at 2 additional locations**
- [ ] **Monitor for 3 days**
- [ ] **Review metrics** (Daily)

### Week 3: All Locations
- [ ] **Register terminals at all remaining locations**
- [ ] **Monitor for 7 days**
- [ ] **Final review**

---

## Phase 7: PCI Compliance Audit (3 days)

### Day 1: Pre-Audit Checklist
- [ ] **Verify P2PE terminals** (PAX certified)
- [ ] **Verify no card data in logs** (Search logs for PAN patterns)
- [ ] **Verify tokenization** (Only last4 + cardType in database)
- [ ] **Verify TLS 1.3** (All API communication encrypted)
- [ ] **Verify access controls** (Terminal registration with API keys)
- [ ] **Verify audit logging** (All payment transactions logged)

### Day 2: Security Audit
- [ ] **Conduct penetration testing** (Terminal API endpoints)
- [ ] **Review code for vulnerabilities** (SQL injection, XSS, etc.)
- [ ] **Review network architecture** (Firewall rules, segmentation)
- [ ] **Review physical security** (Terminal tamper-evident seals)

### Day 3: Compliance Documentation
- [ ] **Complete SAQ (Self-Assessment Questionnaire)**
- [ ] **Document security controls** (Policies, procedures)
- [ ] **Submit for PCI audit** (If required)
- [ ] **Obtain PCI compliance certificate**

---

## Post-Implementation

### Success Metrics (30 days post-launch)
- [ ] **Payment success rate** (Target: >99%)
  - [ ] PAX: ____%
  - [ ] Stripe: ____%
- [ ] **Checkout time** (Target: <3s)
  - [ ] Average: ____s
  - [ ] p95: ____s
- [ ] **Fallback rate** (Target: <5%)
  - [ ] Actual: ____%
- [ ] **Terminal uptime** (Target: >99%)
  - [ ] Actual: ____%
- [ ] **Customer satisfaction** (Target: >4.5/5)
  - [ ] Actual: ____/5

### Financial Metrics (90 days post-launch)
- [ ] **Transaction fee savings** (Target: $3,000/yr)
  - [ ] Actual: $____/yr
- [ ] **Checkout speed improvement** (Target: 50% faster)
  - [ ] Actual: ____%
- [ ] **Fraud reduction** (Target: $500/yr)
  - [ ] Actual: $____/yr

### Lessons Learned
- [ ] **What went well?**
  - [ ] ___________________________
  - [ ] ___________________________
- [ ] **What could be improved?**
  - [ ] ___________________________
  - [ ] ___________________________
- [ ] **Recommendations for future integrations**
  - [ ] ___________________________
  - [ ] ___________________________

---

## Rollback Plan (If Needed)

### Immediate Rollback (Critical Issues)
- [ ] **Disable PAX routing** (Feature flag: `ENABLE_PAX=false`)
- [ ] **All payments route to Stripe** (Fallback mode)
- [ ] **Notify staff** (Email + Slack)
- [ ] **Monitor Stripe payments** (Ensure no disruption)

### Rollback Triggers
- [ ] Payment failure rate >10% for >15 minutes
- [ ] Critical security vulnerability discovered
- [ ] PCI compliance issue identified
- [ ] Terminal hardware failure affecting >50% of terminals

### Post-Rollback Actions
- [ ] **Root cause analysis** (Why did it fail?)
- [ ] **Fix issues** (Code changes, configuration)
- [ ] **Re-test** (Staging environment)
- [ ] **Re-deploy** (When ready)

---

## Sign-Off

### Development Team
- [ ] **Backend Developer:** _________________ Date: _______
- [ ] **QA Engineer:** _________________ Date: _______
- [ ] **DevOps Engineer:** _________________ Date: _______

### Stakeholders
- [ ] **Tech Lead:** _________________ Date: _______
- [ ] **Product Manager:** _________________ Date: _______
- [ ] **Security Lead:** _________________ Date: _______
- [ ] **Operations Manager:** _________________ Date: _______

---

## Quick Reference

### Key Files Modified/Created
- ✅ `backend/prisma/schema.prisma` (Terminal model, processorType field)
- ✅ `backend/src/orders/agents/payment-router.service.ts` (NEW)
- ✅ `backend/src/orders/agents/pax-terminal.agent.ts` (NEW)
- ✅ `backend/src/orders/agents/terminal-manager.service.ts` (NEW)
- ✅ `backend/src/orders/order-orchestrator.ts` (MODIFIED - use PaymentRouter)
- ✅ `backend/src/orders/agents/payment.agent.ts` (MINOR - add processorType)
- ⚪ `backend/src/orders/agents/payment.agent.ts` (Stripe - UNTOUCHED)

### Key Commands
```bash
# Run migrations
npm run migrate:deploy

# Run unit tests
npm run test

# Run integration tests
npm run test:e2e

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod

# Rollback (disable PAX)
export ENABLE_PAX=false
npm run restart
```

### Key Metrics to Monitor
- `payment.route.pax.count` - PAX payments
- `payment.route.stripe.count` - Stripe payments
- `payment.route.fallback.count` - PAX → Stripe fallbacks
- `pax.authorization.success.count` - PAX successes
- `pax.authorization.failure.count` - PAX failures
- `pax.terminal.health.status` - Terminal health

---

**Checklist Version:** 1.0  
**Last Updated:** January 3, 2026  
**Estimated Completion:** January 13, 2026

