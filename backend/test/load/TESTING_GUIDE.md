# Load Testing Guide - Complete Walkthrough

## 🎯 Overview

This guide walks you through running your first load test from start to finish.

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Node.js 18+ installed
- ✅ Backend dependencies installed (`npm install`)
- ✅ Database set up and migrated
- ✅ Environment variables configured

## 🚀 Step-by-Step Guide

### Step 1: Prepare the Environment

#### 1.1 Start the Backend Server

Open a terminal and start the development server:

```bash
cd backend
npm run start:dev
```

Wait for the server to start. You should see:
```
[Nest] 12345  - 01/02/2026, 12:00:00 AM     LOG [NestApplication] Nest application successfully started +2ms
Application is running on: http://localhost:3000
```

**Keep this terminal open!** The server needs to run during the entire test.

#### 1.2 Verify Database is Seeded

In a **new terminal**:

```bash
cd backend
npm run db:seed
```

This creates test data including:
- Admin user (username: `admin`, password: `admin123`)
- Products (beers, wines, spirits, mixers, snacks)
- Locations (3 stores)
- Sample inventory

### Step 2: Validate Setup

Before running load tests, validate everything is configured correctly:

```bash
cd backend
npm run load-test:validate
```

Expected output:
```
🔍 Validating Load Test Setup...

1️⃣  Checking if server is running...
   ✅ Server is running and healthy

2️⃣  Checking authentication...
   ✅ Authentication successful (User: admin)

3️⃣  Checking database...
   ✅ Database is connected and accessible

4️⃣  Checking test files...
   ✅ load-test.yml
   ✅ stress-test.yml
   ✅ spike-test.yml
   ✅ helpers/auth-helper.js
   ✅ helpers/test-data-generator.js
   ✅ All test files present

5️⃣  Checking Artillery installation...
   ✅ Artillery is installed (version: 2.0.27)

6️⃣  Checking critical endpoints...
   ✅ GET /health (200)
   ✅ GET /auth/csrf-token (200)
   ✅ All endpoints accessible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All validation checks passed!

🚀 You can now run load tests:
   npm run load-test          - Standard load test
   npm run load-test:report   - Load test with HTML report
   npm run load-test:stress   - Stress test
   npm run load-test:spike    - Spike test
```

If validation fails, see [Troubleshooting](#troubleshooting) section.

### Step 3: Run Your First Load Test

#### 3.1 Standard Load Test

Run the standard load test:

```bash
npm run load-test
```

You'll see real-time output:

```
Test run id: abc123_def456_ghi789
Phase started: Warm-up (index: 0, duration: 30s) 12:00:00(+0000)

Phase completed: Warm-up (index: 0, duration: 30s) 12:00:30(+0000)
Phase started: Ramp-up (index: 1, duration: 60s) 12:00:30(+0000)

--------------------------------------
Metrics for period to: 12:00:40(+0000) (width: 10s)
--------------------------------------

http.codes.200: ................................................................ 45
http.codes.201: ................................................................ 42
http.request_rate: ......................................................... 9/sec
http.requests: ............................................................. 87
http.response_time:
  min: ......................................................................... 89
  max: ......................................................................... 456
  median: ...................................................................... 234
  p95: ......................................................................... 389
  p99: ......................................................................... 445
http.responses: ............................................................ 87
vusers.completed: .......................................................... 42
vusers.created: ............................................................ 45
vusers.created_by_name.Complete Checkout Flow: ............................ 31
vusers.created_by_name.Idempotency Check: .................................. 4
vusers.created_by_name.List Orders: ........................................ 7
vusers.created_by_name.Daily Summary: ...................................... 3
vusers.failed: .............................................................. 0
vusers.session_length:
  min: ......................................................................... 1234
  max: ......................................................................... 3456
  median: ...................................................................... 2345
  p95: ......................................................................... 3123
  p99: ......................................................................... 3401
```

The test will run for approximately 5 minutes through these phases:
1. **Warm-up** (30s) - 10 orders/min
2. **Ramp-up** (60s) - 10 → 100 orders/min
3. **Sustained load** (120s) - 100 orders/min
4. **Peak load** (60s) - 150 orders/min
5. **Cool-down** (30s) - 50 orders/min

#### 3.2 Understanding the Output

**Key Metrics to Watch:**

1. **Response Codes**
   - `http.codes.201` - Successful order creations ✅
   - `http.codes.200` - Successful reads ✅
   - `http.codes.429` - Rate limiting (expected under high load) ⚠️
   - `http.codes.500` - Server errors (should be minimal) ❌

2. **Response Times**
   - `median` - 50% of requests faster than this
   - `p95` - 95% of requests faster than this (target: < 2000ms)
   - `p99` - 99% of requests faster than this (target: < 5000ms)

3. **Virtual Users**
   - `vusers.created` - Test users started
   - `vusers.completed` - Test users finished successfully
   - `vusers.failed` - Test users that failed (should be < 1%)

4. **Errors**
   - `errors.ETIMEDOUT` - Timeout errors
   - `errors.ECONNREFUSED` - Connection errors
   - Should be minimal or zero

#### 3.3 Final Summary

At the end, you'll see a complete summary:

```
All VUs finished. Total time: 5 minutes 1 second

--------------------------------
Summary report @ 12:05:01(+0000)
--------------------------------

http.codes.200: 1245
http.codes.201: 1000
http.codes.429: 5
http.downloaded_bytes: 0
http.request_rate: 33/sec
http.requests: 2250
http.response_time:
  min: 67
  max: 2341
  median: 234
  p95: 567
  p99: 1234
http.responses: 2245
vusers.completed: 995
vusers.created: 1000
vusers.created_by_name.Complete Checkout Flow: 700
vusers.created_by_name.Idempotency Check: 100
vusers.created_by_name.List Orders: 150
vusers.created_by_name.Daily Summary: 50
vusers.failed: 5
vusers.session_length:
  min: 1123
  max: 4567
  median: 2345
  p95: 3456
  p99: 4123
```

**Interpreting Results:**

✅ **Good Performance** (This test passed!)
- Error rate: 5/1000 = 0.5% (< 1% ✅)
- P95 response time: 567ms (< 2000ms ✅)
- P99 response time: 1234ms (< 5000ms ✅)
- Throughput: 33 requests/sec ✅

### Step 4: Generate HTML Report

For a detailed visual report:

```bash
npm run load-test:report
```

This generates an HTML report at `test/load/results/report.html` and opens it in your browser.

The report includes:
- 📊 Response time graphs
- 📈 Throughput charts
- 🎯 Success/error rates
- 📉 Percentile distributions
- 🔍 Detailed metrics

### Step 5: Run Different Test Types

#### Stress Test (High Load)

Test system limits:

```bash
npm run load-test:stress
```

- Duration: ~5.5 minutes
- Peak load: 500 orders/minute
- Tests breaking points and recovery

#### Spike Test (Traffic Bursts)

Test sudden traffic spikes:

```bash
npm run load-test:spike
```

- Duration: ~3.5 minutes
- Spike load: 600 orders/minute
- Tests auto-scaling and rate limiting

## 📊 Analyzing Results

### What to Look For

#### ✅ Good Indicators
- Low error rate (< 1%)
- Consistent response times
- High throughput
- No timeouts
- Graceful handling of rate limits

#### ⚠️ Warning Signs
- Error rate 1-5%
- Response times increasing over time
- Occasional timeouts
- High P99 latency

#### ❌ Critical Issues
- Error rate > 5%
- Frequent timeouts
- Response times > 5 seconds
- Connection errors
- Memory leaks (increasing response times)

### Performance Benchmarks

| Metric | Target | Good | Warning | Critical |
|--------|--------|------|---------|----------|
| Error Rate | < 1% | < 1% | 1-5% | > 5% |
| P95 Response Time | < 2s | < 1s | 1-3s | > 3s |
| P99 Response Time | < 5s | < 2s | 2-7s | > 7s |
| Throughput | 100/min | > 150/min | 50-100/min | < 50/min |

## 🐛 Troubleshooting

### Common Issues

#### Issue 1: Server Not Running

**Error:**
```
❌ Server is not running or not responding
Error: ECONNREFUSED
```

**Solution:**
```bash
# Start the server
cd backend
npm run start:dev
```

#### Issue 2: Authentication Failed

**Error:**
```
❌ Authentication failed
Status: 401
```

**Solution:**
```bash
# Seed the database
cd backend
npm run db:seed
```

#### Issue 3: Database Connection Error

**Error:**
```
❌ Database check failed
```

**Solution:**
```bash
# Check database status
cd backend
npm run migrate:status

# Run migrations if needed
npm run migrate:deploy
```

#### Issue 4: Artillery Not Installed

**Error:**
```
❌ Artillery is not installed
```

**Solution:**
```bash
# Install Artillery
cd backend
npm install --save-dev artillery
```

#### Issue 5: High Error Rate

**Symptoms:**
- Error rate > 5%
- Many timeout errors
- Connection refused errors

**Solutions:**
1. Check server logs for errors
2. Verify database connection pool size
3. Monitor system resources (CPU, memory)
4. Reduce load in test configuration
5. Check for slow database queries

#### Issue 6: Slow Response Times

**Symptoms:**
- P95 > 3 seconds
- P99 > 7 seconds
- Increasing latency over time

**Solutions:**
1. Add database indexes
2. Implement caching
3. Optimize slow queries
4. Increase connection pool
5. Check for N+1 queries

### Using Auto-Fix

Try the automatic fix loop:

```bash
npm run load-test:fix
```

This will:
1. Detect common issues
2. Attempt automatic fixes
3. Provide manual fix instructions
4. Re-validate setup

## 🎯 Best Practices

### Before Running Tests

1. ✅ Close unnecessary applications
2. ✅ Ensure stable network connection
3. ✅ Check system resources (CPU, memory, disk)
4. ✅ Verify database is optimized
5. ✅ Run validation script

### During Tests

1. 📊 Monitor server logs
2. 📈 Watch system resources
3. 🔍 Look for error patterns
4. 📝 Take notes on anomalies
5. 🎥 Consider recording metrics

### After Tests

1. 📊 Review HTML report
2. 📈 Compare against baselines
3. 🔍 Investigate errors
4. 📝 Document findings
5. 🎯 Plan optimizations

## 📚 Next Steps

### Beginner
1. ✅ Run standard load test
2. ✅ Understand the metrics
3. ✅ Generate HTML report
4. ✅ Identify bottlenecks

### Intermediate
1. ✅ Run stress test
2. ✅ Run spike test
3. ✅ Customize test scenarios
4. ✅ Set up CI/CD integration

### Advanced
1. ✅ Create custom scenarios
2. ✅ Implement distributed testing
3. ✅ Set up monitoring dashboards
4. ✅ Automate performance regression detection

## 📖 Additional Resources

- [README.md](./README.md) - Complete documentation
- [QUICKSTART.md](./QUICKSTART.md) - Quick reference
- [EXAMPLES.md](./EXAMPLES.md) - Example scenarios
- [Artillery Docs](https://www.artillery.io/docs) - Official documentation

## 🎉 Congratulations!

You've successfully completed your first load test! 🚀

Key takeaways:
- ✅ Load testing validates system performance
- ✅ Multiple test types reveal different issues
- ✅ Metrics help identify bottlenecks
- ✅ Regular testing prevents performance regressions

Keep testing and optimizing! 💪

