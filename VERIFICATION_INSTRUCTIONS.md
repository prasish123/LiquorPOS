# Test Verification Instructions

**Date:** January 4, 2026  
**Phase:** 0 - Critical Unit Tests  
**Target:** >50% Coverage

---

## Quick Start

### 1. Navigate to Backend
```bash
cd backend
```

### 2. Run Tests with Coverage
```bash
npm run test:cov
```

### 3. Expected Results
```
✅ All tests pass
✅ Payment Router Service: >90% coverage
✅ Receipt Service: >85% coverage  
✅ Orders Service: >80% coverage
✅ Overall Coverage: >50%
```

---

## Detailed Verification Steps

### Step 1: Verify Test Files Exist

Check that these files were created/updated:

```bash
# New test files
ls -la src/payments/payment-router.service.spec.ts
ls -la src/receipts/receipt.service.spec.ts

# Updated test file
ls -la src/orders/orders.service.spec.ts
```

**Expected:** All three files should exist

---

### Step 2: Run Individual Test Suites

#### Test Payment Router
```bash
npm test -- payment-router.service.spec.ts
```

**Expected Output:**
```
PASS  src/payments/payment-router.service.spec.ts
  PaymentRouterService
    ✓ should be defined
    routePayment - Cash Payments
      ✓ should route cash payment to Stripe when online
      ✓ should route cash payment to offline when network unavailable
    routePayment - Card Payments
      ✓ should route card payment to PAX when terminal available
      ✓ should route card payment to Stripe when no PAX terminal
      ✓ should route card payment to offline when Stripe unavailable
    ... (20+ tests total)

Test Suites: 1 passed, 1 total
Tests:       20+ passed, 20+ total
```

#### Test Receipt Service
```bash
npm test -- receipt.service.spec.ts
```

**Expected Output:**
```
PASS  src/receipts/receipt.service.spec.ts
  ReceiptService
    ✓ should be defined
    generateReceipt
      ✓ should generate receipt for cash transaction
      ✓ should generate receipt for card transaction
      ✓ should include price override information
      ... (25+ tests total)

Test Suites: 1 passed, 1 total
Tests:       25+ passed, 25+ total
```

#### Test Orders Service
```bash
npm test -- orders.service.spec.ts
```

**Expected Output:**
```
PASS  src/orders/orders.service.spec.ts
  OrdersService
    ✓ should be defined
    create
      ✓ should create order via orchestrator
      ✓ should propagate orchestrator errors
    findAll
      ✓ should return paginated orders
      ... (15+ tests total)

Test Suites: 1 passed, 1 total
Tests:       15+ passed, 15+ total
```

---

### Step 3: Run Full Test Suite

```bash
npm test
```

**Expected:** All tests pass, no failures

---

### Step 4: Generate Coverage Report

```bash
npm run test:cov
```

**Expected Output:**
```
--------------------------|---------|----------|---------|---------|
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
All files                 |   50+   |   40+    |   40+   |   50+   |
 payments/                |         |          |         |         |
  payment-router.service  |   90+   |   85+    |   90+   |   90+   |
 receipts/                |         |          |         |         |
  receipt.service         |   85+   |   80+    |   85+   |   85+   |
 orders/                  |         |          |         |         |
  orders.service          |   80+   |   75+    |   80+   |   80+   |
--------------------------|---------|----------|---------|---------|
```

---

### Step 5: View HTML Coverage Report

#### Windows
```bash
start coverage/lcov-report/index.html
```

#### Mac
```bash
open coverage/lcov-report/index.html
```

#### Linux
```bash
xdg-open coverage/lcov-report/index.html
```

**What to Check:**
1. Overall coverage >50%
2. Payment router service highlighted in green (>90%)
3. Receipt service highlighted in green (>85%)
4. Orders service highlighted in green (>80%)

---

## Troubleshooting

### Issue: "Cannot find module"

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Tests fail with "Mock not found"

**Solution:**
Check that all dependencies are installed:
```bash
npm install --save-dev @nestjs/testing jest ts-jest
```

### Issue: Coverage report not generated

**Solution:**
```bash
# Clear Jest cache
npm test -- --clearCache

# Run coverage again
npm run test:cov
```

### Issue: TypeScript errors

**Solution:**
```bash
# Rebuild
npm run build

# Check types
npx tsc --noEmit
```

---

## Success Criteria Checklist

### ✅ Tests Pass
- [ ] Payment router tests: All pass
- [ ] Receipt service tests: All pass
- [ ] Orders service tests: All pass
- [ ] No test failures
- [ ] No test timeouts

### ✅ Coverage Targets
- [ ] Overall coverage: >50%
- [ ] Payment router: >90%
- [ ] Receipt service: >85%
- [ ] Orders service: >80%

### ✅ Code Quality
- [ ] No linter errors
- [ ] No TypeScript errors
- [ ] All mocks properly configured
- [ ] Tests run in <30 seconds

---

## Validation Commands

### Check Test Count
```bash
npm test -- --listTests | wc -l
```
**Expected:** 40+ test files

### Check Coverage Summary
```bash
cat coverage/coverage-summary.json | grep -A 5 '"total"'
```

### Run Specific Module Tests
```bash
# Test all payment module
npm test -- src/payments

# Test all orders module
npm test -- src/orders

# Test all receipts module
npm test -- src/receipts
```

---

## Core Flows Validated

### ✅ Payment Processing
- [x] Cash payment routing
- [x] Card payment routing
- [x] PAX terminal integration
- [x] Stripe integration
- [x] Offline fallback
- [x] Error handling

### ✅ Receipt Generation
- [x] Text receipt formatting
- [x] HTML receipt generation
- [x] Price override display
- [x] Reprint functionality
- [x] Edge case handling

### ✅ Order Management
- [x] Order creation
- [x] Order retrieval
- [x] Pagination
- [x] Filtering
- [x] Daily summaries

---

## Next Steps After Verification

### If All Tests Pass ✅
1. Commit the new test files
2. Update coverage badge (if applicable)
3. Proceed to Phase 1 (E2E tests)

### If Tests Fail ❌
1. Review error messages
2. Check troubleshooting section
3. Fix failing tests
4. Re-run verification

### If Coverage < 50% ⚠️
1. Check that tests are actually running
2. Verify coverage configuration
3. Review which modules are not covered
4. Add additional tests if needed

---

## Reporting Results

### Generate Test Report
```bash
npm test -- --json --outputFile=test-results.json
```

### Generate Coverage Badge
```bash
npm run test:cov
# Coverage percentage will be in coverage/coverage-summary.json
```

### Share Results
1. Screenshot of coverage report
2. Test execution summary
3. Any failing tests with error messages

---

## Files to Review

### Test Files
1. `src/payments/payment-router.service.spec.ts`
2. `src/receipts/receipt.service.spec.ts`
3. `src/orders/orders.service.spec.ts`

### Coverage Report
1. `coverage/lcov-report/index.html` (main report)
2. `coverage/coverage-summary.json` (summary data)
3. `coverage/lcov.info` (detailed coverage data)

### Documentation
1. `TEST_IMPLEMENTATION_SUMMARY.md` (this file)
2. `TEST_GAP_ANALYSIS.md` (full analysis)
3. `TEST_GAP_SUMMARY.md` (executive summary)

---

## Expected Timeline

- **Verification:** 15-30 minutes
- **Fix issues (if any):** 1-2 hours
- **Documentation:** 30 minutes
- **Total:** 2-3 hours

---

## Contact & Support

### If You Encounter Issues

1. **Check troubleshooting section** above
2. **Review test file** for syntax errors
3. **Check dependencies** are installed
4. **Clear cache** and retry

### Common Questions

**Q: Why are some tests skipped?**
A: Check for `.skip()` or `xit()` in test files

**Q: Why is coverage lower than expected?**
A: Some files may not be imported correctly, check coverage config

**Q: Can I run tests in watch mode?**
A: Yes, use `npm test -- --watch`

---

## Final Checklist

Before marking verification complete:

- [ ] All test files created/updated
- [ ] All tests pass
- [ ] Coverage >50%
- [ ] No linter errors
- [ ] No TypeScript errors
- [ ] Coverage report generated
- [ ] Results documented
- [ ] Ready for Phase 1

---

**Status:** 🟡 **Awaiting Verification**  
**Next:** Run `npm run test:cov` and confirm results  
**Goal:** ✅ **>50% Coverage, All Tests Pass**

