# Testing Guide - Florida Liquor Store POS

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Execution Instructions](#test-execution-instructions)
3. [API Testing](#api-testing)
4. [E2E Testing](#e2e-testing)
5. [Test Coverage](#test-coverage)
6. [Troubleshooting](#troubleshooting)
7. [CI/CD Integration](#cicd-integration)

---

## Quick Start

### Prerequisites

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### Run All Tests

```bash
# Backend - All tests
cd backend
npm test

# Backend - With coverage
npm run test:cov

# Backend - E2E tests
npm run test:e2e

# Frontend - E2E tests
cd frontend
npx playwright test
```

---

## Test Execution Instructions

### Backend Testing

#### 1. Unit Tests

Run all unit tests:

```bash
cd backend
npm test
```

Run specific test file:

```bash
npm test -- payment-router.service.spec.ts
```

Run tests matching a pattern:

```bash
npm test -- --testPathPattern="orders"
```

Run tests in watch mode:

```bash
npm run test:watch
```

#### 2. Integration Tests

Run integration tests:

```bash
npm test -- --testPathPattern="integration"
```

Run specific integration test:

```bash
npm test -- test/integration/order-flows.spec.ts
```

#### 3. E2E Tests

Run all E2E tests:

```bash
npm run test:e2e
```

Run specific E2E test:

```bash
npm run test:e2e -- --testNamePattern="offline"
```

#### 4. Coverage Reports

Generate coverage report:

```bash
npm run test:cov
```

View coverage report:

```bash
# Open in browser
open coverage/lcov-report/index.html

# Or on Windows
start coverage/lcov-report/index.html
```

#### 5. Debug Tests

Debug a specific test:

```bash
npm run test:debug -- payment-router.service.spec.ts
```

Then open `chrome://inspect` in Chrome and click "inspect".

---

### Frontend Testing

#### 1. E2E Tests with Playwright

Run all E2E tests:

```bash
cd frontend
npx playwright test
```

Run tests in headed mode (see browser):

```bash
npx playwright test --headed
```

Run specific test file:

```bash
npx playwright test e2e/checkout.spec.ts
```

Run tests in debug mode:

```bash
npx playwright test --debug
```

#### 2. Generate Playwright Report

```bash
npx playwright show-report
```

#### 3. Update Playwright Snapshots

```bash
npx playwright test --update-snapshots
```

---

## API Testing

### Using cURL

#### 1. Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

#### 2. Create Order (Cash Payment)

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "locationId": "loc-1",
    "terminalId": "term-1",
    "employeeId": "emp-1",
    "items": [
      {
        "productId": "prod-1",
        "quantity": 2,
        "unitPrice": 19.99
      }
    ],
    "paymentMethod": "cash",
    "amountTendered": 50.00
  }'
```

#### 3. Generate Receipt

```bash
curl http://localhost:3000/api/receipts/generate/txn-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Get Daily Sales Summary

```bash
curl "http://localhost:3000/api/orders/daily-summary?date=2026-01-05&locationId=loc-1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Using Postman

#### Import Postman Collection

1. Download the collection: `docs/postman/POS-API.postman_collection.json`
2. Open Postman
3. Click "Import" → Select the file
4. Set environment variables:
   - `BASE_URL`: `http://localhost:3000`
   - `AUTH_TOKEN`: Your JWT token

#### Available Collections

**1. Health & Status**
- GET Health Check
- GET Readiness Check
- GET Metrics

**2. Orders**
- POST Create Order (Cash)
- POST Create Order (Card - Stripe)
- POST Create Order (Card - PAX)
- GET Order by ID
- GET Orders (Paginated)
- GET Daily Summary
- GET Orders by Date Range

**3. Receipts**
- POST Generate Receipt
- GET Receipt HTML
- POST Reprint Receipt

**4. Payments**
- POST Authorize Payment
- POST Capture Payment
- POST Void Payment
- POST Refund Payment
- GET Payment Status

**5. Inventory**
- GET Product Inventory
- POST Reserve Inventory
- POST Release Inventory
- POST Commit Inventory

**6. Age Verification**
- POST Verify Age
- GET Compliance Events

---

### Using HTTPie

#### Install HTTPie

```bash
# macOS
brew install httpie

# Ubuntu/Debian
sudo apt install httpie

# Windows
pip install httpie
```

#### Example Requests

Create order:

```bash
http POST localhost:3000/api/orders \
  Authorization:"Bearer YOUR_TOKEN" \
  locationId=loc-1 \
  terminalId=term-1 \
  employeeId=emp-1 \
  items:='[{"productId":"prod-1","quantity":2,"unitPrice":19.99}]' \
  paymentMethod=cash \
  amountTendered:=50.00
```

Get order:

```bash
http GET localhost:3000/api/orders/order-123 \
  Authorization:"Bearer YOUR_TOKEN"
```

---

## E2E Testing

### Backend E2E Tests

#### Test Suites

1. **Order Orchestrator E2E** (`test/integration/order-orchestrator.e2e-spec.ts`)
   - Complete order processing flow
   - Payment integration
   - Inventory management
   - Age verification
   - Idempotency

2. **Offline Resilience E2E** (`test/e2e/offline-resilience.e2e-spec.ts`)
   - Offline payment processing
   - Queue management
   - Sync on reconnection

3. **Payment Integration E2E** (`test/e2e/payment-integration.e2e-spec.ts`)
   - Stripe integration
   - PAX terminal integration
   - Payment routing

#### Run Specific E2E Suite

```bash
cd backend

# Order orchestrator
npm run test:e2e -- --testNamePattern="OrderOrchestrator"

# Offline resilience
npm run test:e2e -- --testNamePattern="Offline"

# Payment integration
npm run test:e2e -- --testNamePattern="Payment"
```

---

### Frontend E2E Tests

#### Test Flows

1. **Checkout Flow** (`frontend/e2e/checkout.spec.ts`)
   - Add items to cart
   - Adjust quantities
   - Remove items
   - Process payment
   - Age verification
   - Error handling

#### Run Frontend E2E

```bash
cd frontend

# All tests
npx playwright test

# Specific test
npx playwright test e2e/checkout.spec.ts

# With UI
npx playwright test --ui

# Headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

#### Playwright Configuration

Located in `frontend/playwright.config.ts`:

- **Browsers:** Chromium, Firefox, WebKit
- **Base URL:** `http://localhost:5173`
- **Screenshots:** On failure
- **Videos:** On first retry
- **Retries:** 2

---

## Test Coverage

### Current Coverage (January 5, 2026)

```
Overall Backend Coverage: 43.16%
├─ Statements: 43.16%
├─ Branches:   36.05%
├─ Functions:  38.93%
└─ Lines:      42.84%
```

### Module Coverage

| Module | Coverage | Status |
|--------|----------|--------|
| Payment Router | 94.38% | 🟢 Excellent |
| Receipt Service | 100% | 🟢 Perfect |
| Orders Service | 100% | 🟢 Perfect |
| Compliance Agent | 100% | 🟢 Perfect |
| Inventory Agent | 100% | 🟢 Perfect |
| Payment Agent | 100% | 🟢 Perfect |
| Pricing Agent | 100% | 🟢 Perfect |

### View Coverage Report

```bash
cd backend
npm run test:cov
open coverage/lcov-report/index.html
```

### Coverage Targets

- **Overall:** 50% (Current: 43.16%)
- **Critical Modules:** 90%+ ✅ Achieved
- **Unit Tests:** 85%+ ✅ Achieved
- **Integration Tests:** 80%+

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Error:** `Cannot connect to database`

**Solution:**

```bash
# Check if PostgreSQL is running
pg_isready

# Restart PostgreSQL
# macOS
brew services restart postgresql

# Linux
sudo systemctl restart postgresql

# Check connection
psql -U postgres -h localhost
```

#### 2. Redis Connection Errors

**Error:** `Redis connection refused`

**Solution:**

```bash
# Check if Redis is running
redis-cli ping

# Start Redis
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

#### 3. Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run start:dev
```

#### 4. Test Timeouts

**Error:** `Exceeded timeout of 5000 ms`

**Solution:**

```bash
# Increase timeout in test file
jest.setTimeout(10000);

# Or run with longer timeout
npm test -- --testTimeout=10000
```

#### 5. Playwright Browser Not Found

**Error:** `Executable doesn't exist`

**Solution:**

```bash
# Install browsers
npx playwright install

# Install specific browser
npx playwright install chromium
```

#### 6. Environment Variables Missing

**Error:** `Environment variable not found`

**Solution:**

```bash
# Copy example env file
cp .env.example .env

# Validate environment
npm run validate:env
```

---

## CI/CD Integration

### GitHub Actions

#### Run Tests on PR

```yaml
name: Tests
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Run tests
        run: |
          cd backend
          npm run test:cov
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info
```

#### Run E2E Tests

```yaml
name: E2E Tests
on: [pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Run E2E tests
        run: |
          cd backend
          npm ci
          npm run test:e2e
```

---

## Test Organization

### Directory Structure

```
backend/
├── src/
│   ├── orders/
│   │   ├── orders.service.ts
│   │   └── orders.service.spec.ts        # Unit tests
│   ├── payments/
│   │   ├── payment-router.service.ts
│   │   └── payment-router.service.spec.ts
│   └── receipts/
│       ├── receipt.service.ts
│       └── receipt.service.spec.ts
└── test/
    ├── integration/
    │   ├── order-flows.spec.ts           # Integration tests
    │   └── order-orchestrator.e2e-spec.ts
    └── e2e/
        ├── offline-resilience.e2e-spec.ts # E2E tests
        └── payment-integration.e2e-spec.ts

frontend/
└── e2e/
    └── checkout.spec.ts                   # Playwright E2E
```

### Test Naming Conventions

- **Unit tests:** `*.service.spec.ts`, `*.controller.spec.ts`
- **Integration tests:** `*.integration.spec.ts`
- **E2E tests:** `*.e2e-spec.ts` (backend), `*.spec.ts` (frontend)

---

## Best Practices

### Writing Tests

1. **Follow AAA Pattern**
   ```typescript
   it('should process payment', async () => {
     // Arrange
     const payment = { amount: 100, method: 'cash' };
     
     // Act
     const result = await service.processPayment(payment);
     
     // Assert
     expect(result.status).toBe('success');
   });
   ```

2. **Use Descriptive Test Names**
   ```typescript
   // Good
   it('should throw error when payment amount is negative')
   
   // Bad
   it('test payment')
   ```

3. **Mock External Dependencies**
   ```typescript
   const mockStripe = {
     paymentIntents: {
       create: jest.fn().mockResolvedValue({ id: 'pi_123' })
     }
   };
   ```

4. **Test Edge Cases**
   - Null/undefined inputs
   - Empty arrays/objects
   - Boundary values
   - Error conditions

5. **Keep Tests Isolated**
   - Don't depend on test execution order
   - Clean up after each test
   - Use `beforeEach` and `afterEach`

---

## Resources

### Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)

### Tools

- **Coverage Viewer:** `coverage/lcov-report/index.html`
- **Playwright UI:** `npx playwright test --ui`
- **Test Explorer:** VS Code extension "Jest Runner"

### Support

- **Slack Channel:** #pos-testing
- **Wiki:** [Testing Best Practices](https://wiki.company.com/pos/testing)
- **Contact:** qa-team@company.com

---

**Last Updated:** January 5, 2026  
**Version:** 1.0.0

