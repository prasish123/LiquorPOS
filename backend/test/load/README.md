# Load Testing Documentation

This directory contains Artillery load tests for the Liquor POS system. The tests simulate realistic traffic patterns and validate system performance under various load conditions.

## 📋 Test Files

### Main Test Configurations

1. **`load-test.yml`** - Standard load test
   - Simulates realistic traffic patterns
   - Tests complete checkout flow
   - Validates idempotency
   - Target: 100-150 orders/minute sustained load
   - Duration: ~5 minutes

2. **`stress-test.yml`** - Stress test
   - Pushes system to limits
   - Tests behavior under extreme load
   - Target: 300-500 orders/minute
   - Duration: ~5.5 minutes
   - Validates graceful degradation

3. **`spike-test.yml`** - Spike test
   - Tests sudden traffic bursts
   - Simulates flash sales or promotional events
   - Target: Spikes up to 600 orders/minute
   - Duration: ~3.5 minutes
   - Validates recovery after spikes

### Helper Files

- **`helpers/auth-helper.js`** - Authentication and token management
- **`helpers/test-data-generator.js`** - Realistic test data generation
- **`results/`** - Test results and reports (generated)

## 🚀 Running Tests

### Prerequisites

1. Ensure the backend server is running:
   ```bash
   npm run start:dev
   ```

2. Ensure the database is seeded with test data:
   ```bash
   npm run db:seed
   ```

3. Verify Artillery is installed:
   ```bash
   npx artillery --version
   ```

### Running Individual Tests

```bash
# Standard load test
npm run load-test

# Load test with HTML report
npm run load-test:report

# Stress test
npm run load-test:stress

# Spike test
npm run load-test:spike
```

### Running Tests Manually

```bash
# Run specific test file
npx artillery run test/load/load-test.yml

# Run with output to JSON
npx artillery run --output results/report.json test/load/load-test.yml

# Generate HTML report from JSON
npx artillery report results/report.json
```

## 📊 Understanding Results

### Key Metrics

Artillery provides several important metrics:

1. **Response Time Metrics**
   - `http.response_time.min` - Fastest response
   - `http.response_time.max` - Slowest response
   - `http.response_time.median` - 50th percentile
   - `http.response_time.p95` - 95th percentile (target: < 2s)
   - `http.response_time.p99` - 99th percentile (target: < 5s)

2. **Request Metrics**
   - `http.requests` - Total requests sent
   - `http.responses` - Total responses received
   - `http.codes.201` - Successful order creations
   - `http.codes.200` - Successful reads
   - `http.codes.429` - Rate limit hits

3. **Error Metrics**
   - `errors.ETIMEDOUT` - Timeout errors
   - `errors.ECONNREFUSED` - Connection errors
   - `vusers.failed` - Failed virtual users

### Success Criteria

#### Load Test
- ✅ Error rate < 1%
- ✅ P95 response time < 2 seconds
- ✅ P99 response time < 5 seconds
- ✅ All idempotency checks pass

#### Stress Test
- ✅ Error rate < 5%
- ✅ P95 response time < 5 seconds
- ✅ P99 response time < 10 seconds
- ✅ System recovers after load reduction

#### Spike Test
- ✅ Error rate < 3%
- ✅ P95 response time < 3 seconds
- ✅ P99 response time < 8 seconds
- ✅ System handles sudden traffic spikes
- ✅ Rate limiting works correctly (429 responses)

## 🔧 Test Scenarios

### 1. Complete Checkout Flow (70% of traffic)
- Authenticate user
- Generate unique order
- Create order via POST /orders
- Verify order via GET /orders/:id
- Validates full transaction flow

### 2. Idempotency Check (10% of traffic)
- Creates order with idempotency key
- Retries same request
- Validates duplicate prevention
- Ensures same order ID returned

### 3. List Orders (15% of traffic)
- Retrieves paginated order lists
- Tests with location filters
- Validates read performance

### 4. Daily Summary (5% of traffic)
- Retrieves sales summaries
- Tests aggregation queries
- Validates reporting endpoints

## 🎯 Load Test Patterns

### Traffic Distribution

The tests simulate realistic shopping patterns:

- **40%** - Single item purchases (beer or wine)
- **30%** - Party packs (multiple items, same category)
- **20%** - Mixed purchases (alcohol + mixers/snacks)
- **10%** - Large orders (multiple categories)

### Payment Methods
- **Cash**: 33%
- **Card**: 33%
- **Split**: 34%

### Sales Channels
- **Counter**: 40%
- **Web**: 30%
- **Uber Eats**: 15%
- **DoorDash**: 15%

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Failures**
   ```
   Error: Login failed: 401 Unauthorized
   ```
   **Solution**: Verify default credentials in `auth-helper.js` match seeded users

2. **Connection Refused**
   ```
   Error: ECONNREFUSED
   ```
   **Solution**: Ensure backend server is running on port 3000

3. **Rate Limiting**
   ```
   HTTP 429 Too Many Requests
   ```
   **Solution**: This is expected under high load. Check rate limit configuration.

4. **Timeout Errors**
   ```
   Error: ETIMEDOUT
   ```
   **Solution**: Increase timeout in test config or optimize slow endpoints

### Debugging Tips

1. **Enable verbose logging**:
   ```bash
   DEBUG=http npx artillery run test/load/load-test.yml
   ```

2. **Test single scenario**:
   ```bash
   npx artillery run --scenario "Complete Checkout Flow" test/load/load-test.yml
   ```

3. **Reduce load for debugging**:
   - Modify `arrivalRate` in test config
   - Reduce `duration` of phases

## 📈 Performance Optimization

Based on load test results, consider:

1. **Database Optimization**
   - Add indexes for frequently queried fields
   - Optimize transaction queries
   - Consider read replicas for reporting

2. **Caching**
   - Cache product data
   - Cache location configurations
   - Implement Redis for session management

3. **Rate Limiting**
   - Adjust limits based on capacity
   - Implement per-user rate limiting
   - Add burst allowances

4. **Connection Pooling**
   - Optimize database connection pool size
   - Configure HTTP keep-alive
   - Tune timeout settings

## 🔄 Continuous Integration

### Running in CI/CD

```yaml
# Example GitHub Actions workflow
- name: Run Load Tests
  run: |
    npm run start:prod &
    sleep 10
    npm run load-test
    kill $!
```

### Performance Regression Testing

Set up automated alerts for:
- Response time degradation (> 20% increase)
- Error rate increase (> 1%)
- Throughput decrease (> 15% reduction)

## 📚 Additional Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Load Testing Best Practices](https://www.artillery.io/docs/guides/guides/test-script-reference)
- [Performance Testing Guide](https://www.artillery.io/docs/guides/guides/http-reference)

## 🤝 Contributing

When adding new load tests:

1. Follow existing naming conventions
2. Add realistic test data
3. Document expected results
4. Update this README
5. Test locally before committing

## 📝 Notes

- Tests use the seeded database data
- Each test run generates unique idempotency keys
- Authentication tokens are managed automatically
- Results are saved in `results/` directory
- HTML reports provide detailed visualizations

