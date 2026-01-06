# Test Gap Remediation Checklist

**Date:** January 4, 2026  
**Status:** 🔴 HIGH RISK - Do Not Deploy  
**Target:** ✅ LOW RISK - Production Ready

---

## 🔴 Phase 0: CRITICAL BLOCKERS (Week 1)

### Must Complete Before Any Deployment

- [ ] **E2E: Complete Checkout Flow** (5 days)
  - [ ] Barcode scanning simulation
  - [ ] Add multiple items to cart
  - [ ] Calculate totals with tax
  - [ ] Age verification prompt
  - [ ] Payment processing (cash + card)
  - [ ] Receipt generation
  - [ ] Receipt display
  - [ ] Clear cart after checkout
  - **Files:** `frontend/e2e/complete-checkout.spec.ts`
  - **Risk:** CRITICAL (10/10)

- [ ] **Unit: Payment Router Service** (3 days)
  - [ ] Route to Stripe for card payments
  - [ ] Route to cash handler for cash payments
  - [ ] Route to PAX terminal when available
  - [ ] Fallback logic when terminal unavailable
  - [ ] Error handling for routing failures
  - [ ] Retry logic with exponential backoff
  - **Files:** `backend/src/payments/payment-router.service.spec.ts`
  - **Risk:** CRITICAL (9/10)

**Phase 0 Exit Criteria:**
- ✅ Complete checkout flow works end-to-end
- ✅ Payment routing tested with all scenarios
- ✅ No critical test failures

---

## 🔴 Phase 1: PRE-PRODUCTION (Weeks 2-3)

### Must Complete Before Production Launch

- [ ] **E2E: Offline Sync Flow** (5 days)
  - [ ] Detect network offline
  - [ ] Show offline indicator in UI
  - [ ] Process offline payment (cash)
  - [ ] Create order locally
  - [ ] Queue order for sync
  - [ ] Detect network online
  - [ ] Process sync queue
  - [ ] Capture offline payments
  - [ ] Sync orders to server
  - [ ] Handle sync conflicts
  - **Files:** `backend/test/offline-sync-complete.e2e-spec.ts`
  - **Risk:** CRITICAL (10/10)

- [ ] **Unit: Receipt Generation** (3 days)
  - [ ] Format receipt data (header, items, totals)
  - [ ] Calculate tax breakdown by rate
  - [ ] Include store information
  - [ ] Include transaction ID
  - [ ] Include payment method
  - [ ] Include timestamp
  - [ ] Format for printing (80mm thermal)
  - [ ] Generate PDF for email
  - **Files:** `backend/src/receipts/receipt.service.spec.ts`
  - **Risk:** CRITICAL (8/10)

- [ ] **Frontend: Cart Unit Tests** (2 days)
  - [ ] Add item to cart
  - [ ] Remove item from cart
  - [ ] Update item quantity
  - [ ] Calculate cart subtotal
  - [ ] Calculate cart tax
  - [ ] Calculate cart total
  - [ ] Clear cart
  - [ ] Persist cart to local storage
  - [ ] Restore cart on page reload
  - **Files:** `frontend/src/stores/cart.test.ts`
  - **Risk:** CRITICAL (8/10)

- [ ] **E2E: Offline Payment Capture** (3 days)
  - [ ] Authorize payment offline
  - [ ] Store payment for capture
  - [ ] Detect network online
  - [ ] Capture pending payments
  - [ ] Handle capture failures
  - [ ] Retry failed captures
  - [ ] Update payment status
  - **Files:** `backend/test/offline-payment-capture.e2e-spec.ts`
  - **Risk:** CRITICAL (9/10)

**Phase 1 Exit Criteria:**
- ✅ All CRITICAL gaps closed
- ✅ Offline mode works end-to-end
- ✅ Receipt generation functional
- ✅ Frontend cart tested
- ✅ Test coverage ≥ 50%

---

## 🟠 Phase 2: PRE-LAUNCH (Weeks 4-7)

### Should Complete Before Public Launch

- [ ] **Unit: Orders Service** (2 days)
  - [ ] Create order
  - [ ] Get order by ID
  - [ ] List orders with pagination
  - [ ] Filter orders by date range
  - [ ] Filter orders by location
  - [ ] Filter orders by status
  - [ ] Update order status
  - [ ] Cancel order
  - **Files:** `backend/src/orders/orders.service.spec.ts`
  - **Risk:** HIGH (7/10)

- [ ] **Unit: Price Override Service** (2 days)
  - [ ] Request price override
  - [ ] Approve price override (manager)
  - [ ] Reject price override
  - [ ] Apply approved override to order
  - [ ] Log override for audit
  - [ ] Check override permissions
  - **Files:** `backend/src/orders/price-override.service.spec.ts`
  - **Risk:** HIGH (7/10)

- [ ] **Unit: Terminal Manager Service** (2 days)
  - [ ] Register PAX terminal
  - [ ] Unregister terminal
  - [ ] Get terminal status
  - [ ] Check terminal health
  - [ ] Handle terminal disconnection
  - [ ] Reconnect terminal
  - [ ] List all terminals
  - **Files:** `backend/src/payments/terminal-manager.service.spec.ts`
  - **Risk:** HIGH (7/10)

- [ ] **Unit: Reporting Service** (4 days)
  - [ ] Generate sales report
  - [ ] Generate inventory report
  - [ ] Generate tax report
  - [ ] Generate employee report
  - [ ] Filter reports by date range
  - [ ] Filter reports by location
  - [ ] Export report to CSV
  - [ ] Export report to PDF
  - [ ] Cache report results
  - [ ] Invalidate cache on data change
  - **Files:** `backend/src/reporting/reporting.service.spec.ts`
  - **Risk:** HIGH (7/10)

- [ ] **E2E: Webhook Processing** (3 days)
  - [ ] Receive Stripe webhook
  - [ ] Verify webhook signature
  - [ ] Process payment.succeeded event
  - [ ] Process payment.failed event
  - [ ] Process refund.created event
  - [ ] Receive UberEats webhook
  - [ ] Transform UberEats order format
  - [ ] Receive DoorDash webhook
  - [ ] Transform DoorDash order format
  - [ ] Handle webhook replay
  - [ ] Handle out-of-order webhooks
  - **Files:** `backend/test/webhooks-complete.e2e-spec.ts`
  - **Risk:** HIGH (7/10)

- [ ] **Integration: Conexxus Flows** (3 days)
  - [ ] Send transaction to Conexxus
  - [ ] Receive transaction response
  - [ ] Handle Conexxus timeout
  - [ ] Handle Conexxus error
  - [ ] Retry failed requests
  - [ ] Circuit breaker opens on failures
  - [ ] Circuit breaker closes after recovery
  - [ ] Offline fallback when unavailable
  - **Files:** `backend/test/integration/conexxus-flows.spec.ts`
  - **Risk:** HIGH (7/10)

- [ ] **E2E: Age Verification + ID Scanner** (2 days)
  - [ ] Scan ID barcode
  - [ ] Parse ID data
  - [ ] Extract date of birth
  - [ ] Calculate age
  - [ ] Verify age ≥ 21
  - [ ] Handle invalid ID format
  - [ ] Handle expired ID
  - [ ] Log compliance event
  - **Files:** `backend/test/age-verification-scanner.e2e-spec.ts`
  - **Risk:** HIGH (6/10)

- [ ] **Integration: Offline Inventory Conflicts** (3 days)
  - [ ] Reserve inventory offline
  - [ ] Reserve same inventory online
  - [ ] Detect conflict on sync
  - [ ] Resolve conflict (first-wins)
  - [ ] Notify user of conflict
  - [ ] Rollback conflicting order
  - [ ] Update inventory correctly
  - **Files:** `backend/test/integration/offline-inventory-conflicts.spec.ts`
  - **Risk:** HIGH (6/10)

**Phase 2 Exit Criteria:**
- ✅ All HIGH priority gaps closed
- ✅ Webhook processing tested
- ✅ Reporting functional
- ✅ Integration tests passing
- ✅ Test coverage ≥ 65%

---

## 🟡 Phase 3: POST-LAUNCH (Weeks 8-10)

### Can Complete After Launch (Monitor Closely)

- [ ] **Unit: AI Services** (3 days)
  - [ ] Semantic product search
  - [ ] Generate search embeddings
  - [ ] Find similar products
  - [ ] Handle search errors
  - [ ] Cache search results
  - **Files:** `backend/src/ai/local-ai.service.spec.ts`
  - **Risk:** MEDIUM (5/10)

- [ ] **Unit: Monitoring Services** (3 days)
  - [ ] Collect metrics
  - [ ] Track API response times
  - [ ] Track database query times
  - [ ] Track error rates
  - [ ] Send metrics to Prometheus
  - [ ] Create performance alerts
  - **Files:** `backend/src/monitoring/monitoring.service.spec.ts`
  - **Risk:** MEDIUM (5/10)

- [ ] **Unit: Audit Service** (1 day)
  - [ ] Log order created
  - [ ] Log order modified
  - [ ] Log price override
  - [ ] Log compliance event
  - [ ] Encrypt sensitive data
  - [ ] Query audit logs
  - **Files:** `backend/src/orders/audit.service.spec.ts`
  - **Risk:** MEDIUM (5/10)

- [ ] **E2E: Frontend Error Handling** (2 days)
  - [ ] Display API errors
  - [ ] Display network errors
  - [ ] Display validation errors
  - [ ] Retry failed requests
  - [ ] Show error toast notifications
  - [ ] Clear errors on success
  - **Files:** `frontend/e2e/error-handling.spec.ts`
  - **Risk:** MEDIUM (5/10)

- [ ] **Unit: Exception Filters** (1 day)
  - [ ] Catch HTTP exceptions
  - [ ] Format error responses
  - [ ] Log errors to Sentry
  - [ ] Return user-friendly messages
  - [ ] Hide sensitive error details
  - **Files:** `backend/src/common/filters/app-exception.filter.spec.ts`
  - **Risk:** MEDIUM (4/10)

- [ ] **Integration: State Regulations** (1 day)
  - [ ] Load Florida regulations
  - [ ] Check age requirements
  - [ ] Check license requirements
  - [ ] Check hours restrictions
  - [ ] Check product restrictions
  - **Files:** `backend/src/common/compliance/state-regulations.spec.ts`
  - **Risk:** MEDIUM (4/10)

- [ ] **Performance Testing** (3 days)
  - [ ] Load test: 100 concurrent orders
  - [ ] Load test: 1000 products search
  - [ ] Stress test: Database connections
  - [ ] Stress test: Redis cache
  - [ ] Spike test: Black Friday traffic
  - [ ] Measure API response times
  - [ ] Measure database query times
  - [ ] Identify bottlenecks
  - **Files:** `backend/test/load/`
  - **Risk:** MEDIUM (5/10)

**Phase 3 Exit Criteria:**
- ✅ All MEDIUM priority gaps closed
- ✅ Performance benchmarks established
- ✅ Observability improved
- ✅ Test coverage ≥ 70%

---

## 🟢 Phase 4: ONGOING

### Nice to Have (Low Priority)

- [ ] **Unit: Frontend Loading States** (1 day)
- [ ] **E2E: Product Search Edge Cases** (1 day)
- [ ] **Unit: OpenAI Service** (1 day)
- [ ] **Unit: Accounting Integrations** (2 days)
- [ ] **Security Testing** (ongoing)
- [ ] **Load Testing** (ongoing)

---

## Progress Tracking

### Overall Status
- [ ] Phase 0: CRITICAL BLOCKERS (0/2 complete)
- [ ] Phase 1: PRE-PRODUCTION (0/4 complete)
- [ ] Phase 2: PRE-LAUNCH (0/8 complete)
- [ ] Phase 3: POST-LAUNCH (0/7 complete)
- [ ] Phase 4: ONGOING (0/6 complete)

### Coverage Milestones
- [ ] 40% coverage (current: 37.18%)
- [ ] 50% coverage
- [ ] 60% coverage
- [ ] 70% coverage (target)
- [ ] 80% coverage (stretch goal)

### Risk Reduction
- [ ] CRITICAL risk → MEDIUM risk (Phase 1 complete)
- [ ] MEDIUM risk → LOW risk (Phase 2 complete)
- [ ] LOW risk → MINIMAL risk (Phase 3 complete)

---

## Daily Standup Checklist

### What to Report
- [ ] Tests written today
- [ ] Tests passing/failing
- [ ] Coverage increase/decrease
- [ ] Blockers encountered
- [ ] Help needed

### What to Track
- [ ] Lines of test code added
- [ ] Test execution time
- [ ] Flaky tests identified
- [ ] Test failures investigated

---

## Definition of Done (Per Test)

### Unit Test
- [ ] Test file created with `.spec.ts` extension
- [ ] All public methods tested
- [ ] Happy path covered
- [ ] Error cases covered
- [ ] Edge cases covered
- [ ] Mocks properly configured
- [ ] Test passes consistently
- [ ] Coverage increased

### Integration Test
- [ ] Test file created in `test/integration/`
- [ ] Multiple modules tested together
- [ ] Database interactions tested
- [ ] External service mocks configured
- [ ] Happy path covered
- [ ] Error cases covered
- [ ] Test passes consistently
- [ ] Cleanup performed after test

### E2E Test
- [ ] Test file created in `test/` or `frontend/e2e/`
- [ ] Complete user flow tested
- [ ] Frontend + Backend tested together
- [ ] Real database used (test environment)
- [ ] Happy path covered
- [ ] Error cases covered
- [ ] Test passes consistently
- [ ] Test data cleaned up

---

## CI/CD Integration Checklist

- [ ] Tests run on every commit
- [ ] Tests run on every PR
- [ ] PR blocked if tests fail
- [ ] Coverage report generated
- [ ] Coverage report commented on PR
- [ ] PR blocked if coverage decreases
- [ ] E2E tests run nightly
- [ ] Performance tests run weekly
- [ ] Test results visible in dashboard

---

## Resources

- **Full Analysis:** `TEST_GAP_ANALYSIS.md`
- **Executive Summary:** `TEST_GAP_SUMMARY.md`
- **Coverage Report:** `backend/coverage/lcov-report/index.html`
- **Test Documentation:** `backend/test/README.md`

---

## Notes

- Prioritize CRITICAL tests first
- Don't skip test cleanup
- Write tests before fixing bugs
- Keep tests simple and focused
- Mock external dependencies
- Use factories for test data
- Run tests locally before committing
- Review test failures immediately

---

**Last Updated:** January 4, 2026  
**Next Review:** Weekly during active development

