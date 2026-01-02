# Load Testing Examples

Real-world examples and use cases for load testing the Liquor POS system.

## 📚 Table of Contents

1. [Basic Examples](#basic-examples)
2. [Advanced Scenarios](#advanced-scenarios)
3. [Custom Test Creation](#custom-test-creation)
4. [Performance Benchmarks](#performance-benchmarks)
5. [CI/CD Integration](#cicd-integration)

## Basic Examples

### Example 1: Quick Smoke Test

Test with minimal load to verify everything works:

```yaml
# smoke-test.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 30
      arrivalRate: 5
  processor: "./helpers/auth-helper.js"

scenarios:
  - name: "Quick Checkout"
    flow:
      - function: "beforeScenario"
      - function: "generateIdempotencyKey"
      - function: "generateOrderData"
      - post:
          url: "/orders"
          headers:
            Authorization: "Bearer {{ accessToken }}"
            x-csrf-token: "{{ csrfToken }}"
          json: "{{ orderData }}"
```

Run it:
```bash
npx artillery run test/load/smoke-test.yml
```

### Example 2: Single Endpoint Test

Test a specific endpoint in isolation:

```yaml
# orders-list-test.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 50
  processor: "./helpers/auth-helper.js"

scenarios:
  - name: "List Orders"
    flow:
      - function: "beforeScenario"
      - get:
          url: "/orders?page=1&limit=50"
          headers:
            Authorization: "Bearer {{ accessToken }}"
```

### Example 3: Idempotency Focused Test

Specifically test idempotency behavior:

```yaml
# idempotency-test.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 20
  processor: "./helpers/auth-helper.js"

scenarios:
  - name: "Duplicate Request Test"
    flow:
      - function: "beforeScenario"
      - function: "generateIdempotencyKey"
      - function: "generateOrderData"
      
      # First request
      - post:
          url: "/orders"
          headers:
            Authorization: "Bearer {{ accessToken }}"
            x-csrf-token: "{{ csrfToken }}"
          json: "{{ orderData }}"
          capture:
            - json: "$.id"
              as: "orderId1"
      
      # Duplicate request (should return same order)
      - post:
          url: "/orders"
          headers:
            Authorization: "Bearer {{ accessToken }}"
            x-csrf-token: "{{ csrfToken }}"
          json: "{{ orderData }}"
          capture:
            - json: "$.id"
              as: "orderId2"
      
      # Verify same order ID
      - log: "Order ID 1: {{ orderId1 }}, Order ID 2: {{ orderId2 }}"
```

## Advanced Scenarios

### Example 4: Multi-Location Test

Simulate traffic across multiple store locations:

```javascript
// helpers/multi-location.js
function setLocationData(context, events, done) {
  const locations = [
    { id: 'loc-001', weight: 40 }, // Downtown - 40% traffic
    { id: 'loc-002', weight: 35 }, // Airport - 35% traffic
    { id: 'loc-003', weight: 25 }, // Beach - 25% traffic
  ];
  
  const rand = Math.random() * 100;
  let cumulative = 0;
  
  for (const loc of locations) {
    cumulative += loc.weight;
    if (rand <= cumulative) {
      context.vars.locationId = loc.id;
      break;
    }
  }
  
  done();
}

module.exports = { setLocationData };
```

### Example 5: Peak Hours Simulation

Simulate realistic daily traffic patterns:

```yaml
# daily-pattern-test.yml
config:
  target: "http://localhost:3000"
  phases:
    # Morning (8-10 AM) - Low traffic
    - duration: 120
      arrivalRate: 20
      name: "Morning"
    
    # Lunch (12-2 PM) - Medium traffic
    - duration: 120
      arrivalRate: 80
      name: "Lunch rush"
    
    # Afternoon (3-5 PM) - Low-medium traffic
    - duration: 120
      arrivalRate: 40
      name: "Afternoon"
    
    # Evening (6-9 PM) - Peak traffic
    - duration: 180
      arrivalRate: 150
      name: "Evening rush"
    
    # Late night (10 PM-12 AM) - Low traffic
    - duration: 120
      arrivalRate: 15
      name: "Late night"
```

### Example 6: Black Friday / Holiday Load

Extreme load for special events:

```yaml
# holiday-load-test.yml
config:
  target: "http://localhost:3000"
  phases:
    # Pre-sale buildup
    - duration: 60
      arrivalRate: 100
      rampTo: 500
      name: "Pre-sale buildup"
    
    # Sale starts - MASSIVE spike
    - duration: 120
      arrivalRate: 1000
      name: "Sale launch"
    
    # Sustained high load
    - duration: 300
      arrivalRate: 600
      name: "Sustained holiday traffic"
    
    # Gradual decline
    - duration: 120
      arrivalRate: 600
      rampTo: 200
      name: "Post-rush decline"
```

## Custom Test Creation

### Example 7: Custom Shopping Patterns

Create realistic shopping behavior:

```javascript
// helpers/shopping-patterns.js

function generateWeekendPartyOrder(context, events, done) {
  // Weekend party orders: Beer + Spirits + Mixers + Snacks
  context.vars.orderData = {
    locationId: 'loc-001',
    items: [
      { sku: 'BEER-BUD-12', quantity: 12, priceAtSale: 8.99, discount: 0 },
      { sku: 'BEER-CORONA-6', quantity: 6, priceAtSale: 12.99, discount: 0 },
      { sku: 'VODKA-GREY-750', quantity: 2, priceAtSale: 34.99, discount: 0 },
      { sku: 'MIXER-COKE-2L', quantity: 4, priceAtSale: 2.99, discount: 0 },
      { sku: 'SNACK-CHIPS-REG', quantity: 3, priceAtSale: 3.99, discount: 0 },
    ],
    paymentMethod: 'card',
    channel: 'counter',
    ageVerified: true,
    idScanned: true,
    idempotencyKey: require('crypto').randomUUID(),
  };
  done();
}

function generateWineEnthusiastOrder(context, events, done) {
  // Wine enthusiast: Multiple premium wines
  context.vars.orderData = {
    locationId: 'loc-001',
    items: [
      { sku: 'WINE-CAB-750', quantity: 3, priceAtSale: 19.99, discount: 2.0 },
      { sku: 'WINE-PINOT-750', quantity: 2, priceAtSale: 22.99, discount: 2.0 },
      { sku: 'WINE-CHARD-750', quantity: 2, priceAtSale: 15.99, discount: 0 },
    ],
    paymentMethod: 'card',
    channel: 'web',
    ageVerified: true,
    idScanned: true,
    idempotencyKey: require('crypto').randomUUID(),
  };
  done();
}

module.exports = {
  generateWeekendPartyOrder,
  generateWineEnthusiastOrder,
};
```

### Example 8: Error Scenario Testing

Test error handling under load:

```yaml
# error-handling-test.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 50

scenarios:
  # Invalid requests
  - name: "Invalid Order - Missing Required Fields"
    weight: 10
    flow:
      - function: "beforeScenario"
      - post:
          url: "/orders"
          headers:
            Authorization: "Bearer {{ accessToken }}"
            x-csrf-token: "{{ csrfToken }}"
          json:
            locationId: "loc-001"
            # Missing items - should fail validation
          expect:
            - statusCode: 400
  
  # Valid requests
  - name: "Valid Order"
    weight: 90
    flow:
      - function: "beforeScenario"
      - function: "generateOrderData"
      - post:
          url: "/orders"
          headers:
            Authorization: "Bearer {{ accessToken }}"
            x-csrf-token: "{{ csrfToken }}"
          json: "{{ orderData }}"
          expect:
            - statusCode: 201
```

## Performance Benchmarks

### Example 9: Baseline Performance Test

Establish performance baselines:

```yaml
# baseline-test.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 300
      arrivalRate: 100
  
  ensure:
    # Strict performance requirements
    maxErrorRate: 0.5
    p50: 200   # Median < 200ms
    p95: 1000  # 95th percentile < 1s
    p99: 2000  # 99th percentile < 2s
```

### Example 10: Regression Test

Compare against previous performance:

```bash
# Run baseline test and save results
npm run load-test -- --output results/baseline.json

# After code changes, run again
npm run load-test -- --output results/current.json

# Compare results
npx artillery report results/baseline.json
npx artillery report results/current.json
```

## CI/CD Integration

### Example 11: GitHub Actions

```yaml
# .github/workflows/load-test.yml
name: Load Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  load-test:
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
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Run migrations
        run: |
          cd backend
          npm run migrate:deploy
      
      - name: Seed database
        run: |
          cd backend
          npm run db:seed
      
      - name: Start server
        run: |
          cd backend
          npm run start:prod &
          sleep 10
      
      - name: Validate setup
        run: |
          cd backend
          npm run load-test:validate
      
      - name: Run load tests
        run: |
          cd backend
          npm run load-test:report
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: backend/test/load/results/
```

### Example 12: Performance Gate

Fail CI if performance degrades:

```yaml
# performance-gate-test.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 120
      arrivalRate: 100
  
  # Strict gates - fail if not met
  ensure:
    maxErrorRate: 1
    p95: 2000
    p99: 5000
    
  # Fail fast on critical errors
  http:
    timeout: 30
```

## 📊 Analyzing Results

### Reading Artillery Output

```
Summary report @ 12:34:56(+00:00)
──────────────────────────────────────────────────────────────
  Scenarios launched:  1000
  Scenarios completed: 995
  Requests completed:  2000
  Mean response/sec:   33.33
  Response time (msec):
    min: 45
    max: 2341
    median: 234
    p95: 567
    p99: 1234
  Scenario counts:
    Complete Checkout Flow: 700 (70%)
    Idempotency Check: 100 (10%)
    List Orders: 150 (15%)
    Daily Summary: 50 (5%)
  Codes:
    201: 1000
    200: 995
    429: 5
  Errors:
    ETIMEDOUT: 3
    ECONNRESET: 2
```

### What Each Metric Means

- **Scenarios launched**: Total test users started
- **Scenarios completed**: Test users that finished successfully
- **Requests completed**: Total HTTP requests sent
- **Mean response/sec**: Throughput (requests per second)
- **Response time**: How long requests took
  - **median**: 50% of requests were faster than this
  - **p95**: 95% of requests were faster than this
  - **p99**: 99% of requests were faster than this
- **Codes**: HTTP status code distribution
- **Errors**: Network/timeout errors

## 🎯 Best Practices

1. **Start Small**: Begin with low load and gradually increase
2. **Isolate Tests**: Test one thing at a time when debugging
3. **Use Realistic Data**: Match production traffic patterns
4. **Monitor Resources**: Watch CPU, memory, database connections
5. **Run Multiple Times**: First run may show cold-start effects
6. **Document Baselines**: Keep records of expected performance
7. **Test Regularly**: Run load tests on every major change

## 📚 Additional Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Load Testing Best Practices](https://www.artillery.io/docs/guides/guides/test-script-reference)
- [Performance Testing Patterns](https://www.artillery.io/docs/guides/guides/http-reference)

---

Need more examples? Check the [README.md](./README.md) for detailed documentation!

