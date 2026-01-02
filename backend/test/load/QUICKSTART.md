# Load Testing Quick Start Guide

Get started with load testing in 5 minutes!

## 🚀 Quick Start

### Step 1: Start the Backend Server

```bash
# Terminal 1 - Start the server
cd backend
npm run start:dev
```

Wait for the server to start (you should see "Application is running on: http://localhost:3000")

### Step 2: Validate Setup

```bash
# Terminal 2 - Validate everything is ready
cd backend
npm run load-test:validate
```

If validation fails, the script will tell you what's wrong and how to fix it.

### Step 3: Run Your First Load Test

```bash
# Run standard load test
npm run load-test
```

That's it! 🎉

## 📊 Understanding the Output

Artillery will show you real-time metrics:

```
Summary report @ 12:34:56
  Scenarios launched:  500
  Scenarios completed: 498
  Requests completed:  1000
  Mean response time:  245 ms
  95th percentile:     450 ms
  99th percentile:     850 ms
  Errors:              2 (0.2%)
```

### What to Look For

✅ **Good Performance**
- Mean response time < 500ms
- 95th percentile < 2000ms
- Error rate < 1%

⚠️ **Needs Attention**
- Mean response time > 1000ms
- 95th percentile > 3000ms
- Error rate > 2%

❌ **Critical Issues**
- Mean response time > 2000ms
- 95th percentile > 5000ms
- Error rate > 5%

## 🔧 Troubleshooting

### Server Not Running

```bash
cd backend
npm run start:dev
```

### Database Not Seeded

```bash
cd backend
npm run db:seed
```

### Authentication Failing

```bash
# Check if admin user exists
cd backend
npm run db:seed
```

### Use Agentic Fix Loop

```bash
# Automatically detect and fix common issues
npm run load-test:fix
```

## 📈 Different Test Types

### Standard Load Test (Recommended for First Run)
```bash
npm run load-test
```
- Duration: ~5 minutes
- Load: 100-150 orders/minute
- Best for: Regular performance testing

### Stress Test (High Load)
```bash
npm run load-test:stress
```
- Duration: ~5.5 minutes
- Load: Up to 500 orders/minute
- Best for: Finding system limits

### Spike Test (Traffic Bursts)
```bash
npm run load-test:spike
```
- Duration: ~3.5 minutes
- Load: Sudden spikes to 600 orders/minute
- Best for: Testing auto-scaling

### With HTML Report
```bash
npm run load-test:report
```
- Generates detailed HTML report
- Opens automatically in browser
- Best for: Detailed analysis

## 📁 Where Are the Results?

Results are saved in `test/load/results/`:
- `report.json` - Raw test data
- `report.html` - Beautiful HTML report

## 🎯 Next Steps

1. ✅ Run standard load test
2. 📊 Review the results
3. 🔍 Identify bottlenecks
4. 🚀 Optimize and re-test
5. 📈 Run stress test to find limits

## 💡 Pro Tips

1. **Run tests multiple times** - First run may show slower results due to cold start
2. **Monitor system resources** - Use Task Manager (Windows) or Activity Monitor (Mac)
3. **Check logs** - Look for errors in the server console
4. **Start small** - Reduce `arrivalRate` in YAML files for debugging
5. **Use validation** - Always run `npm run load-test:validate` first

## 🆘 Need Help?

Check the detailed documentation:
- [README.md](./README.md) - Complete documentation
- [Artillery Docs](https://www.artillery.io/docs) - Official Artillery documentation

## 🐛 Common Issues

### Issue: "ECONNREFUSED"
**Solution**: Server is not running. Start it with `npm run start:dev`

### Issue: "401 Unauthorized"
**Solution**: Database not seeded. Run `npm run db:seed`

### Issue: "429 Too Many Requests"
**Solution**: This is expected under high load. It means rate limiting is working!

### Issue: Slow response times
**Solution**: 
1. Check if database has indexes
2. Monitor CPU/memory usage
3. Reduce concurrent connections
4. Consider caching

## 📞 Support

If you encounter issues:
1. Run `npm run load-test:validate` to diagnose
2. Run `npm run load-test:fix` to auto-fix common issues
3. Check the detailed logs in the console
4. Review the README.md for advanced troubleshooting

---

Happy Load Testing! 🚀

