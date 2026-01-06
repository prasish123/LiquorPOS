# New Tests Onboarding Guide

## Welcome to the POS Testing Team! 🎉

This document will help you understand the recent test improvements and get you up to speed on our testing infrastructure.

---

## Table of Contents

1. [What's New](#whats-new)
2. [Test Overview](#test-overview)
3. [Quick Start](#quick-start)
4. [New Test Suites](#new-test-suites)
5. [Testing Workflow](#testing-workflow)
6. [Common Tasks](#common-tasks)
7. [Resources](#resources)

---

## What's New

### Recent Improvements (January 2026)

We've made significant improvements to our test coverage:

**📊 Coverage Improvements:**
- Overall coverage: **37.18% → 43.16%** (+5.98%)
- **60 new tests** added
- **3 critical modules** now fully tested (94-100% coverage)
- Test quality score: **75% → 81.8%** (+6.8%)

**✅ New Test Suites:**
1. **Payment Router Service** - 18 tests (0% → 94.38% coverage)
2. **Receipt Service** - 22 tests (0% → 100% coverage)
3. **Orders Service** - 20 tests (20% → 100% coverage)

**🎯 Status Change:**
- Overall testing status: 🟡 YELLOW → 🟢 GREEN
- Risk level: 🔴 HIGH → 🟢 LOW

---

## Test Overview

### Test Types

We have three main types of tests:

```
┌─────────────────────────────────────────────────────────────┐
│ TEST PYRAMID                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      E2E Tests                              │
│                    ▲ (50 tests)                             │
│                   ╱ ╲                                       │
│                  ╱   ╲                                      │
│                 ╱     ╲                                     │
│                ╱       ╲                                    │
│               ╱         ╲                                   │
│              ╱           ╲                                  │
│             ╱             ╲                                 │
│            ╱  Integration  ╲                                │
│           ╱    (84 tests)   ╲                               │
│          ╱                   ╲                              │
│         ╱                     ╲                             │
│        ╱                       ╲                            │
│       ╱                         ╲                           │
│      ╱                           ╲                          │
│     ╱        Unit Tests           ╲                         │
│    ╱         (450 tests)           ╲                        │
│   ╱_________________________________╲                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. **Unit Tests** (450 tests)
   - Test individual functions/methods
   - Fast execution (<1s)
   - Isolated with mocks
   - Located: `src/**/*.spec.ts`

2. **Integration Tests** (84 tests)
   - Test module interactions
   - Database integration
   - API endpoints
   - Located: `test/integration/**/*.spec.ts`

3. **E2E Tests** (50 tests)
   - Test complete user flows
   - Full system integration
   - Frontend + Backend
   - Located: `test/e2e/**/*.spec.ts`, `frontend/e2e/**/*.spec.ts`

---

## Quick Start

### 1. Setup Your Environment

```bash
# Clone repository
git clone https://github.com/company/liquor-pos.git
cd liquor-pos

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Setup environment variables
cd ../backend
cp .env.example .env
npm run validate:env

# Setup database
npm run db:setup
npm run db:seed
```

### 2. Run Your First Tests

```bash
# Backend unit tests
cd backend
npm test

# Backend with coverage
npm run test:cov

# Frontend E2E tests
cd ../frontend
npx playwright test
```

### 3. View Coverage Report

```bash
cd backend
npm run test:cov
open coverage/lcov-report/index.html
```

---

## New Test Suites

### 1. Payment Router Service Tests

**File:** `backend/src/payments/payment-router.service.spec.ts`

**What it tests:**
- Payment routing logic (Cash, Card, PAX, Stripe)
- Fallback mechanisms
- Network failure handling
- Processor selection

**Example test:**

```typescript
it('should route card payment to PAX when terminal available', async () => {
  // Arrange
  mockNetworkStatusService.isOnline.mockReturnValue(true);
  mockTerminalManagerService.getTerminal.mockResolvedValue({
    id: 'term-pax-1',
    status: 'active',
    enabled: true
  });

  // Act
  const result = await service.routePayment({
    amount: 100,
    paymentMethod: 'card',
    terminalId: 'term-pax-1'
  });

  // Assert
  expect(result.processor).toBe('pax');
  expect(mockPaxTerminalAgent.processTransaction).toHaveBeenCalled();
});
```

**Key scenarios covered:**
- ✅ Cash payment routing (online/offline)
- ✅ Card payment routing (PAX/Stripe/offline)
- ✅ Processor selection logic
- ✅ Fallback mechanisms
- ✅ Error handling

**Run tests:**
```bash
npm test -- payment-router.service.spec.ts
```

---

### 2. Receipt Service Tests

**File:** `backend/src/receipts/receipt.service.spec.ts`

**What it tests:**
- Receipt generation (text and HTML)
- Formatting (42-char thermal printer)
- Price override display
- Reprint functionality
- Edge cases (zero tax, missing data)

**Example test:**

```typescript
it('should generate receipt for cash transaction', async () => {
  // Arrange
  const mockTransaction = {
    id: 'txn-123',
    total: 53.5,
    paymentMethod: 'cash',
    items: [/* ... */],
    location: {/* ... */}
  };

  // Act
  const receipt = await service.generateReceipt('txn-123');

  // Assert
  expect(receipt).toContain('Downtown Liquor Store');
  expect(receipt).toContain('TOTAL: $53.50');
  expect(receipt).toContain('CASH: $100.00');
  expect(receipt).toContain('CHANGE: $46.50');
});
```

**Key scenarios covered:**
- ✅ Cash transaction receipts
- ✅ Card transaction receipts
- ✅ HTML receipt generation
- ✅ Price override display
- ✅ Reprint with count tracking
- ✅ Text formatting (42-char width)
- ✅ Edge cases (zero tax, long names)

**Run tests:**
```bash
npm test -- receipt.service.spec.ts
```

---

### 3. Orders Service Tests

**File:** `backend/src/orders/orders.service.spec.ts`

**What it tests:**
- Order CRUD operations
- Pagination and filtering
- Date range queries
- Daily sales summaries
- Error handling

**Example test:**

```typescript
it('should return paginated orders', async () => {
  // Arrange
  const mockOrders = [/* 10 orders */];
  prisma.transaction.findMany.mockResolvedValue(mockOrders);
  prisma.transaction.count.mockResolvedValue(50);

  // Act
  const result = await service.findAll({ page: 1, limit: 10 });

  // Assert
  expect(result.data).toHaveLength(10);
  expect(result.total).toBe(50);
  expect(result.page).toBe(1);
  expect(result.totalPages).toBe(5);
});
```

**Key scenarios covered:**
- ✅ Order creation via orchestrator
- ✅ Pagination and filtering
- ✅ Date range queries
- ✅ Daily sales summaries
- ✅ Error handling (NotFoundException)
- ✅ Edge cases (empty results, large pages)

**Run tests:**
```bash
npm test -- orders.service.spec.ts
```

---

## Testing Workflow

### Daily Development Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ DAILY TESTING WORKFLOW                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Pull Latest Code                                        │
│    ├─ git pull origin main                                 │
│    └─ npm install (if package.json changed)                │
│                                                             │
│ 2. Run Tests Before Coding                                 │
│    ├─ npm test (verify baseline)                           │
│    └─ Ensure all tests pass                                │
│                                                             │
│ 3. Write Code + Tests                                      │
│    ├─ Implement feature                                    │
│    ├─ Write unit tests                                     │
│    └─ Follow TDD if possible                               │
│                                                             │
│ 4. Run Tests in Watch Mode                                 │
│    ├─ npm run test:watch                                   │
│    └─ Tests run automatically on save                      │
│                                                             │
│ 5. Run Full Test Suite                                     │
│    ├─ npm run test:cov                                     │
│    ├─ Check coverage report                                │
│    └─ Ensure coverage doesn't decrease                     │
│                                                             │
│ 6. Run E2E Tests                                           │
│    ├─ npm run test:e2e                                     │
│    └─ Verify end-to-end flows                              │
│                                                             │
│ 7. Commit Changes                                          │
│    ├─ git add .                                            │
│    ├─ git commit -m "feat: description"                    │
│    └─ git push origin feature-branch                       │
│                                                             │
│ 8. Create Pull Request                                     │
│    ├─ CI runs all tests automatically                      │
│    ├─ Coverage report generated                            │
│    └─ Review and merge                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Before Committing Checklist

- [ ] All tests pass locally
- [ ] Coverage doesn't decrease
- [ ] New code has tests
- [ ] Tests follow AAA pattern
- [ ] No console.log statements
- [ ] Linting passes
- [ ] TypeScript compiles

---

## Common Tasks

### Task 1: Add a New Unit Test

```typescript
// 1. Create or open test file
// File: src/services/my-service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my-service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // 2. Add your test
  it('should calculate total correctly', () => {
    // Arrange
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 1 }
    ];

    // Act
    const total = service.calculateTotal(items);

    // Assert
    expect(total).toBe(25);
  });
});
```

### Task 2: Mock a Dependency

```typescript
// Mock Prisma service
const mockPrisma = {
  transaction: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

// Provide mock in test module
const module: TestingModule = await Test.createTestingModule({
  providers: [
    MyService,
    {
      provide: PrismaService,
      useValue: mockPrisma,
    },
  ],
}).compile();

// Use mock in test
mockPrisma.transaction.findUnique.mockResolvedValue({
  id: 'txn-123',
  total: 100,
});
```

### Task 3: Debug a Failing Test

```bash
# 1. Run specific test
npm test -- my-service.spec.ts

# 2. Run in debug mode
npm run test:debug -- my-service.spec.ts

# 3. Open chrome://inspect in Chrome
# 4. Click "inspect" on the Node process
# 5. Set breakpoints and step through
```

### Task 4: Update Test Snapshots

```bash
# Update all snapshots
npm test -- -u

# Update specific test snapshots
npm test -- my-component.spec.ts -u
```

### Task 5: Run Tests for Specific Module

```bash
# Run all tests in orders module
npm test -- --testPathPattern="orders"

# Run all payment-related tests
npm test -- --testPathPattern="payment"

# Run specific test file
npm test -- payment-router.service.spec.ts
```

---

## Best Practices

### Writing Good Tests

**DO:**
- ✅ Use descriptive test names
- ✅ Follow AAA pattern (Arrange, Act, Assert)
- ✅ Test one thing per test
- ✅ Mock external dependencies
- ✅ Test edge cases
- ✅ Keep tests fast (<100ms)
- ✅ Make tests independent

**DON'T:**
- ❌ Test implementation details
- ❌ Have tests depend on each other
- ❌ Use real database in unit tests
- ❌ Leave console.log in tests
- ❌ Skip tests (fix or remove them)
- ❌ Have flaky tests

### Test Naming Convention

```typescript
// Good test names
it('should return user when ID exists')
it('should throw error when user not found')
it('should calculate total with tax')

// Bad test names
it('test user')
it('works')
it('test1')
```

### AAA Pattern

```typescript
it('should process payment', async () => {
  // Arrange - Setup test data and mocks
  const payment = { amount: 100, method: 'cash' };
  mockService.authorize.mockResolvedValue({ status: 'success' });

  // Act - Execute the code under test
  const result = await service.processPayment(payment);

  // Assert - Verify the results
  expect(result.status).toBe('success');
  expect(mockService.authorize).toHaveBeenCalledWith(payment);
});
```

---

## Resources

### Documentation

- **Testing Guide:** `docs/TESTING_GUIDE.md`
- **E2E Test Flows:** `docs/E2E_TEST_FLOWS.md`
- **API Documentation:** `docs/API.md`
- **Postman Collection:** `docs/postman/POS-API.postman_collection.json`

### External Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://testingjavascript.com/)

### Tools

- **VS Code Extensions:**
  - Jest Runner
  - Test Explorer UI
  - Playwright Test for VSCode

- **Chrome Extensions:**
  - React Developer Tools
  - Redux DevTools

### Team Contacts

- **QA Lead:** qa-lead@company.com
- **Dev Lead:** dev-lead@company.com
- **Slack Channel:** #pos-testing
- **Wiki:** https://wiki.company.com/pos/testing

---

## FAQ

### Q: How do I run tests for only the file I'm working on?

```bash
npm test -- my-file.spec.ts --watch
```

### Q: My test is timing out. What should I do?

```typescript
// Increase timeout for specific test
it('slow test', async () => {
  jest.setTimeout(10000); // 10 seconds
  // ... test code
}, 10000);
```

### Q: How do I mock a date/time in tests?

```typescript
// Mock Date
const mockDate = new Date('2026-01-05T00:00:00Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

// Restore after test
afterEach(() => {
  jest.restoreAllMocks();
});
```

### Q: How do I test async code?

```typescript
// Use async/await
it('should fetch data', async () => {
  const data = await service.fetchData();
  expect(data).toBeDefined();
});

// Or return promise
it('should fetch data', () => {
  return service.fetchData().then(data => {
    expect(data).toBeDefined();
  });
});
```

### Q: How do I skip a test temporarily?

```typescript
// Skip single test
it.skip('test to skip', () => {
  // ...
});

// Skip entire suite
describe.skip('Suite to skip', () => {
  // ...
});

// Note: Don't commit skipped tests!
```

---

## Next Steps

### Week 1: Getting Started
- [ ] Setup development environment
- [ ] Run all tests successfully
- [ ] Read testing documentation
- [ ] Review existing test files
- [ ] Write your first test

### Week 2: Deep Dive
- [ ] Understand test pyramid
- [ ] Learn mocking strategies
- [ ] Practice TDD
- [ ] Review E2E test flows
- [ ] Contribute to test coverage

### Week 3: Mastery
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Optimize test performance
- [ ] Help team members
- [ ] Improve test documentation

---

## Welcome Aboard!

You're now part of a team committed to high-quality software through comprehensive testing. Don't hesitate to ask questions in #pos-testing!

**Happy Testing! 🎉**

---

**Last Updated:** January 5, 2026  
**Version:** 1.0.0

