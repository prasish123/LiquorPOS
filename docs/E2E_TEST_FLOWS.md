# E2E Test Flows - Florida Liquor Store POS

## Overview

This document describes all End-to-End (E2E) test flows for the POS system, including backend API flows and frontend user flows.

---

## Table of Contents

1. [Backend E2E Flows](#backend-e2e-flows)
2. [Frontend E2E Flows](#frontend-e2e-flows)
3. [Test Data Setup](#test-data-setup)
4. [Running E2E Tests](#running-e2e-tests)
5. [Test Scenarios](#test-scenarios)

---

## Backend E2E Flows

### Flow 1: Complete Order Processing (Happy Path)

**File:** `backend/test/integration/order-orchestrator.e2e-spec.ts`

**Scenario:** Customer purchases items with cash payment

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW: Complete Order Processing (Cash)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Create Order Request                                    │
│    ├─ Location: Downtown Store                             │
│    ├─ Terminal: POS-001                                    │
│    ├─ Employee: John Doe                                   │
│    ├─ Items: 2x Whiskey ($39.99 each)                     │
│    └─ Payment: Cash ($100)                                 │
│                                                             │
│ 2. Pricing Calculation                                     │
│    ├─ Subtotal: $79.98                                     │
│    ├─ Tax (7%): $5.60                                      │
│    └─ Total: $85.58                                        │
│                                                             │
│ 3. Age Verification                                        │
│    ├─ Check customer DOB                                   │
│    ├─ Verify age ≥ 21                                      │
│    └─ Log compliance event                                 │
│                                                             │
│ 4. Inventory Reservation                                   │
│    ├─ Check stock availability                             │
│    ├─ Reserve 2 units (row-level lock)                     │
│    └─ Update reserved quantity                             │
│                                                             │
│ 5. Payment Processing                                      │
│    ├─ Authorize cash payment                               │
│    ├─ Calculate change: $14.42                             │
│    └─ Create payment record                                │
│                                                             │
│ 6. Inventory Commit                                        │
│    ├─ Deduct from available quantity                       │
│    ├─ Release reservation                                  │
│    └─ Check low stock alert                                │
│                                                             │
│ 7. Transaction Finalization                                │
│    ├─ Create transaction record                            │
│    ├─ Update order status: COMPLETED                       │
│    ├─ Generate receipt                                     │
│    └─ Emit order.completed event                           │
│                                                             │
│ ✅ Expected Result:                                         │
│    - Order status: COMPLETED                               │
│    - Payment status: AUTHORIZED                            │
│    - Inventory: Reduced by 2                               │
│    - Receipt: Generated                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Test Code:**

```typescript
it('should process complete cash order', async () => {
  const orderDto = {
    locationId: 'loc-1',
    terminalId: 'term-1',
    employeeId: 'emp-1',
    items: [
      { productId: 'prod-1', quantity: 2, unitPrice: 39.99 }
    ],
    paymentMethod: 'cash',
    amountTendered: 100.00
  };

  const response = await request(app.getHttpServer())
    .post('/api/orders')
    .send(orderDto)
    .expect(201);

  expect(response.body.status).toBe('completed');
  expect(response.body.total).toBe(85.58);
});
```

---

### Flow 2: Card Payment with Stripe

**File:** `backend/test/e2e/payment-integration.e2e-spec.ts`

**Scenario:** Customer pays with credit card via Stripe

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW: Card Payment with Stripe                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Order Creation                                          │
│    ├─ Items: 1x Premium Vodka ($59.99)                    │
│    ├─ Payment Method: Card                                 │
│    └─ Processor: Stripe (default)                          │
│                                                             │
│ 2. Payment Router Decision                                 │
│    ├─ Check network status: ONLINE                         │
│    ├─ Check PAX terminal: Not available                    │
│    └─ Route to: Stripe                                     │
│                                                             │
│ 3. Stripe Payment Intent                                   │
│    ├─ Create payment intent                                │
│    ├─ Amount: $64.19 (including tax)                       │
│    ├─ Currency: USD                                        │
│    └─ Confirm payment                                      │
│                                                             │
│ 4. Payment Authorization                                   │
│    ├─ Stripe processes card                                │
│    ├─ Status: SUCCEEDED                                    │
│    └─ Save payment record                                  │
│                                                             │
│ 5. Order Completion                                        │
│    ├─ Commit inventory                                     │
│    ├─ Finalize transaction                                 │
│    └─ Generate receipt                                     │
│                                                             │
│ ✅ Expected Result:                                         │
│    - Payment Intent ID: pi_xxx                             │
│    - Payment Status: SUCCEEDED                             │
│    - Order Status: COMPLETED                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 3: Offline Payment Processing

**File:** `backend/test/e2e/offline-resilience.e2e-spec.ts`

**Scenario:** Process payment when network is unavailable

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW: Offline Payment Processing                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Network Status Check                                    │
│    ├─ Check Stripe: UNAVAILABLE                            │
│    ├─ Check Conexxus: UNAVAILABLE                          │
│    └─ Mode: OFFLINE                                        │
│                                                             │
│ 2. Offline Payment Authorization                           │
│    ├─ Validate amount ≤ $500 (offline limit)              │
│    ├─ Create offline payment record                        │
│    ├─ Status: PENDING_SYNC                                 │
│    └─ Queue for later sync                                 │
│                                                             │
│ 3. Order Processing                                        │
│    ├─ Reserve inventory (local)                            │
│    ├─ Complete transaction                                 │
│    └─ Generate receipt                                     │
│                                                             │
│ 4. Queue Management                                        │
│    ├─ Add to offline queue                                 │
│    ├─ Store in local database                              │
│    └─ Set retry schedule                                   │
│                                                             │
│ 5. Network Reconnection                                    │
│    ├─ Detect network available                             │
│    ├─ Process offline queue                                │
│    ├─ Sync with Stripe                                     │
│    └─ Update payment status                                │
│                                                             │
│ ✅ Expected Result:                                         │
│    - Offline payment authorized                            │
│    - Order completed locally                               │
│    - Queued for sync                                       │
│    - Synced when online                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 4: Payment Compensation (Failure Scenario)

**File:** `backend/test/integration/order-orchestrator.e2e-spec.ts`

**Scenario:** Payment fails, inventory must be released

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW: Payment Failure Compensation                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Order Processing Starts                                 │
│    ├─ Pricing: ✅ Success                                  │
│    ├─ Age Verification: ✅ Success                         │
│    └─ Inventory Reservation: ✅ Success (2 units)          │
│                                                             │
│ 2. Payment Processing                                      │
│    ├─ Attempt Stripe payment                               │
│    ├─ Error: Card declined                                 │
│    └─ Status: FAILED                                       │
│                                                             │
│ 3. Compensation Actions                                    │
│    ├─ Release reserved inventory (2 units)                 │
│    ├─ Void payment attempt                                 │
│    ├─ Update order status: FAILED                          │
│    └─ Log compensation event                               │
│                                                             │
│ 4. Rollback Verification                                   │
│    ├─ Check inventory: Original quantity restored          │
│    ├─ Check payment: No charge                             │
│    └─ Check order: Marked as failed                        │
│                                                             │
│ ✅ Expected Result:                                         │
│    - Inventory released                                    │
│    - No payment charged                                    │
│    - Order status: FAILED                                  │
│    - Error message returned                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 5: Age Verification Failure

**File:** `backend/test/integration/order-orchestrator.e2e-spec.ts`

**Scenario:** Customer under 21 attempts to buy alcohol

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW: Age Verification Failure                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Order Creation                                          │
│    ├─ Customer: DOB 2010-01-01 (16 years old)             │
│    ├─ Items: Age-restricted (alcohol)                      │
│    └─ Payment: Ready                                       │
│                                                             │
│ 2. Age Verification                                        │
│    ├─ Calculate age: 16 years                              │
│    ├─ Required age: 21 years                               │
│    ├─ Result: FAILED                                       │
│    └─ Log compliance event                                 │
│                                                             │
│ 3. Order Rejection                                         │
│    ├─ Stop processing immediately                          │
│    ├─ No inventory reservation                             │
│    ├─ No payment processing                                │
│    └─ Return error: Age verification failed                │
│                                                             │
│ ✅ Expected Result:                                         │
│    - Order rejected                                        │
│    - Error: "Age verification failed"                      │
│    - Compliance event logged                               │
│    - No inventory impact                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 6: Idempotency Check

**File:** `backend/test/integration/order-orchestrator.e2e-spec.ts`

**Scenario:** Duplicate order request with same idempotency key

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW: Idempotency Protection                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. First Order Request                                     │
│    ├─ Idempotency Key: "order-abc-123"                    │
│    ├─ Process order normally                               │
│    ├─ Create transaction                                   │
│    └─ Return: Order ID "ord-1"                             │
│                                                             │
│ 2. Duplicate Request (Network Retry)                       │
│    ├─ Same Idempotency Key: "order-abc-123"               │
│    ├─ Check existing transaction                           │
│    ├─ Found: Transaction already exists                    │
│    └─ Return: Same Order ID "ord-1"                        │
│                                                             │
│ 3. Verification                                            │
│    ├─ No duplicate charge                                  │
│    ├─ No duplicate inventory deduction                     │
│    ├─ Same transaction returned                            │
│    └─ Idempotency maintained                               │
│                                                             │
│ ✅ Expected Result:                                         │
│    - Only one transaction created                          │
│    - Same response for both requests                       │
│    - No double-charging                                    │
│    - No duplicate inventory impact                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend E2E Flows

### Flow 7: Checkout Process (Frontend)

**File:** `frontend/e2e/checkout.spec.ts`

**Scenario:** User completes checkout in the browser

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW: Frontend Checkout Process                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Navigate to POS                                         │
│    ├─ Open: http://localhost:5173                         │
│    ├─ Wait for: Page load                                 │
│    └─ Verify: Product catalog visible                      │
│                                                             │
│ 2. Add Items to Cart                                       │
│    ├─ Click: "Jack Daniel's" product                      │
│    ├─ Verify: Added to cart                               │
│    ├─ Cart count: 1 item                                  │
│    └─ Subtotal: $39.99                                    │
│                                                             │
│ 3. Adjust Quantity                                         │
│    ├─ Click: Quantity "+" button                          │
│    ├─ New quantity: 2                                     │
│    ├─ Subtotal: $79.98                                    │
│    └─ Verify: Cart updated                                │
│                                                             │
│ 4. Add Second Item                                         │
│    ├─ Click: "Grey Goose" product                         │
│    ├─ Cart count: 2 items (3 total units)                │
│    └─ Subtotal: $139.97                                   │
│                                                             │
│ 5. Remove Item                                             │
│    ├─ Click: Remove "Grey Goose"                          │
│    ├─ Cart count: 1 item (2 units)                       │
│    └─ Subtotal: $79.98                                    │
│                                                             │
│ 6. Proceed to Checkout                                     │
│    ├─ Click: "Checkout" button                            │
│    ├─ Navigate to: Checkout page                          │
│    └─ Verify: Order summary displayed                      │
│                                                             │
│ 7. Age Verification                                        │
│    ├─ Prompt: "Verify customer age"                       │
│    ├─ Input: Date of birth                                │
│    ├─ Click: "Verify" button                              │
│    └─ Status: Age verified ✅                             │
│                                                             │
│ 8. Select Payment Method                                   │
│    ├─ Options: Cash, Card                                 │
│    ├─ Select: "Cash"                                      │
│    ├─ Input: Amount tendered ($100)                       │
│    └─ Calculate: Change due ($14.42)                      │
│                                                             │
│ 9. Complete Payment                                        │
│    ├─ Click: "Complete Payment"                           │
│    ├─ API Call: POST /api/orders                          │
│    ├─ Wait for: Response                                  │
│    └─ Status: 201 Created                                 │
│                                                             │
│ 10. Receipt Display                                        │
│     ├─ Show: Receipt modal                                │
│     ├─ Content: Transaction details                       │
│     ├─ Options: Print, Email                              │
│     └─ Action: Print receipt                              │
│                                                             │
│ 11. Return to POS                                          │
│     ├─ Click: "New Transaction"                           │
│     ├─ Cart: Cleared                                      │
│     └─ Ready: For next customer                           │
│                                                             │
│ ✅ Expected Result:                                         │
│    - Order completed successfully                          │
│    - Receipt generated and displayed                       │
│    - Cart cleared                                          │
│    - Ready for next transaction                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Test Code:**

```typescript
test('complete checkout flow', async ({ page }) => {
  // Navigate to POS
  await page.goto('http://localhost:5173');
  
  // Add item to cart
  await page.click('[data-testid="product-1"]');
  await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
  
  // Adjust quantity
  await page.click('[data-testid="quantity-increase"]');
  await expect(page.locator('[data-testid="cart-count"]')).toHaveText('2');
  
  // Checkout
  await page.click('[data-testid="checkout-button"]');
  
  // Age verification
  await page.fill('[data-testid="dob-input"]', '1990-01-01');
  await page.click('[data-testid="verify-age-button"]');
  
  // Payment
  await page.click('[data-testid="payment-cash"]');
  await page.fill('[data-testid="amount-tendered"]', '100');
  await page.click('[data-testid="complete-payment"]');
  
  // Verify receipt
  await expect(page.locator('[data-testid="receipt-modal"]')).toBeVisible();
  await expect(page.locator('[data-testid="receipt-total"]')).toContainText('$85.58');
});
```

---

### Flow 8: Checkout Error Handling

**File:** `frontend/e2e/checkout.spec.ts`

**Scenario:** Handle payment failure gracefully

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW: Checkout Error Handling                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Setup Error Scenario                                    │
│    ├─ Mock: API returns 400 error                         │
│    ├─ Reason: Insufficient inventory                       │
│    └─ Message: "Product out of stock"                     │
│                                                             │
│ 2. Attempt Checkout                                        │
│    ├─ User: Completes checkout form                       │
│    ├─ Click: "Complete Payment"                           │
│    └─ API Call: POST /api/orders (fails)                  │
│                                                             │
│ 3. Error Display                                           │
│    ├─ Show: Error toast/modal                             │
│    ├─ Message: "Product out of stock"                     │
│    ├─ Action: Close button                                │
│    └─ Cart: Remains intact                                │
│                                                             │
│ 4. User Recovery                                           │
│    ├─ Option 1: Remove out-of-stock item                  │
│    ├─ Option 2: Try again later                           │
│    └─ Cart: Still editable                                │
│                                                             │
│ ✅ Expected Result:                                         │
│    - Error displayed clearly                               │
│    - Cart not cleared                                      │
│    - User can retry or modify                              │
│    - No partial transaction                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Test Data Setup

### Database Seeding

Before running E2E tests, seed the database with test data:

```bash
cd backend
npm run db:seed
```

**Test Data Created:**

1. **Locations**
   - `loc-1`: Downtown Liquor Store
   - `loc-2`: Uptown Liquor Store

2. **Products**
   - `prod-1`: Jack Daniel's ($39.99, age-restricted)
   - `prod-2`: Grey Goose ($59.99, age-restricted)
   - `prod-3`: Coca-Cola ($2.99, not restricted)

3. **Employees**
   - `emp-1`: John Doe (cashier)
   - `emp-2`: Jane Smith (manager)

4. **Terminals**
   - `term-1`: POS-001 (Downtown)
   - `term-pax-1`: POS-PAX-001 (PAX terminal)

5. **Customers**
   - `cust-1`: Test Customer (DOB: 1990-01-01, age 36)
   - `cust-2`: Young Customer (DOB: 2010-01-01, age 16)

---

## Running E2E Tests

### Backend E2E Tests

```bash
cd backend

# All E2E tests
npm run test:e2e

# Specific test file
npm run test:e2e -- --testNamePattern="order-orchestrator"

# With coverage
npm run test:e2e -- --coverage

# Debug mode
npm run test:debug -- test/integration/order-orchestrator.e2e-spec.ts
```

### Frontend E2E Tests

```bash
cd frontend

# All tests
npx playwright test

# Specific test
npx playwright test e2e/checkout.spec.ts

# Headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug

# Generate report
npx playwright show-report
```

---

## Test Scenarios

### Critical Scenarios (Must Pass)

1. ✅ **Complete Cash Order** - Happy path
2. ✅ **Complete Card Order (Stripe)** - Payment integration
3. ✅ **Complete Card Order (PAX)** - Terminal integration
4. ✅ **Age Verification Success** - Compliance
5. ✅ **Age Verification Failure** - Compliance rejection
6. ✅ **Inventory Reservation** - Stock management
7. ✅ **Payment Failure Compensation** - Rollback
8. ✅ **Offline Payment Processing** - Resilience
9. ✅ **Idempotency Protection** - Duplicate prevention
10. ✅ **Frontend Checkout Flow** - User experience

### Edge Case Scenarios

11. ✅ **Insufficient Inventory** - Out of stock handling
12. ✅ **Network Timeout** - Timeout handling
13. ✅ **Concurrent Orders** - Race condition handling
14. ✅ **Invalid Payment Amount** - Validation
15. ✅ **Missing Customer Data** - Error handling

### Performance Scenarios

16. ⏳ **High Volume Orders** - Load testing (deferred)
17. ⏳ **Concurrent Payments** - Stress testing (deferred)
18. ⏳ **Large Cart** - Performance testing (deferred)

---

## Test Metrics

### Current E2E Coverage

- **Backend E2E:** 50 tests, 60% pass rate
- **Frontend E2E:** 1 test file, 100% pass rate
- **Integration:** 84 tests, 88.1% pass rate

### Target Metrics

- **Pass Rate:** 90%+
- **Execution Time:** <5 minutes
- **Flakiness:** <5%

---

**Last Updated:** January 5, 2026  
**Version:** 1.0.0

