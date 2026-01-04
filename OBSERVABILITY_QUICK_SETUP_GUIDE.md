# Quick Setup Guide - See Your Transaction Logs in 15 Minutes

**Goal:** Get the free observability stack running and see your POS transaction logs

✅ **Status**: Centralized logging is now **FULLY INTEGRATED** with Loki!

📚 **Detailed Guide**: See [LOKI_INTEGRATION_GUIDE.md](./LOKI_INTEGRATION_GUIDE.md) for comprehensive documentation.

---

## Prerequisites Check

Before starting, verify you have:

```powershell
# Check Docker
docker --version
# Should show: Docker version 20.x or higher

# Check Docker Compose
docker-compose --version
# Should show: docker-compose version 1.29.x or higher

# If not installed:
# Download Docker Desktop from: https://www.docker.com/products/docker-desktop
```

---

## Step 1: Start the Observability Stack (5 minutes)

### Option A: Quick Start (Recommended for Windows)

Create a file `start-observability.ps1`:

```powershell
# start-observability.ps1
Write-Host "Starting Free Observability Stack..." -ForegroundColor Green

# Create directory
$observabilityDir = "$HOME\observability"
New-Item -ItemType Directory -Force -Path $observabilityDir | Out-Null
Set-Location $observabilityDir

# Create docker-compose.yml
@"
version: '3.8'

networks:
  observability:
    driver: bridge

services:
  loki:
    image: grafana/loki:2.9.3
    container_name: loki
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped
    networks:
      - observability

  grafana:
    image: grafana/grafana:10.2.3
    container_name: grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_AUTH_ANONYMOUS_ENABLED=false
    restart: unless-stopped
    networks:
      - observability
    depends_on:
      - loki

volumes:
  loki-data:
  grafana-data:
"@ | Out-File -FilePath docker-compose.yml -Encoding UTF8

Write-Host "Starting services..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "`nWaiting for services to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`n=== Services Started ===" -ForegroundColor Green
Write-Host "Grafana: http://localhost:3001 (admin/admin123)" -ForegroundColor Cyan
Write-Host "Loki: http://localhost:3100" -ForegroundColor Cyan

Write-Host "`nTesting Loki..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3100/ready" -UseBasicParsing
    Write-Host "✓ Loki is ready!" -ForegroundColor Green
} catch {
    Write-Host "✗ Loki is not responding yet. Wait a minute and try again." -ForegroundColor Red
}

Write-Host "`nNext: Configure your backend to send logs to http://localhost:3100" -ForegroundColor Yellow
```

**Run it:**
```powershell
powershell -ExecutionPolicy Bypass -File start-observability.ps1
```

### Option B: Manual Docker Commands

```powershell
# Create network
docker network create observability

# Start Loki
docker run -d `
  --name loki `
  --network observability `
  -p 3100:3100 `
  -v loki-data:/loki `
  grafana/loki:2.9.3

# Start Grafana
docker run -d `
  --name grafana `
  --network observability `
  -p 3001:3000 `
  -e GF_SECURITY_ADMIN_PASSWORD=admin123 `
  -v grafana-data:/var/lib/grafana `
  grafana/grafana:10.2.3

# Wait 30 seconds
Start-Sleep -Seconds 30

# Test Loki
curl http://localhost:3100/ready
```

---

## Step 2: Configure Grafana (2 minutes)

1. **Open Grafana:** http://localhost:3001
2. **Login:** 
   - Username: `admin`
   - Password: `admin123`
3. **Add Loki Data Source:**
   - Click ☰ (menu) → Connections → Data sources
   - Click "Add data source"
   - Select "Loki"
   - URL: `http://loki:3100`
   - Click "Save & test"
   - You should see: "Data source connected and labels found"

---

## Step 3: Send Test Logs (1 minute)

Test that Loki is receiving logs:

```powershell
# Send a test log
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() * 1000000
$body = @{
    streams = @(
        @{
            stream = @{
                service = "test"
                level = "info"
            }
            values = @(
                @($timestamp.ToString(), "Test log from PowerShell")
            )
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3100/loki/api/v1/push" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body

Write-Host "Test log sent!" -ForegroundColor Green
```

**Verify in Grafana:**
1. Go to Grafana → Explore (compass icon)
2. Select "Loki" data source
3. Query: `{service="test"}`
4. Click "Run query"
5. You should see your test log!

---

## Step 4: Integrate Your Backend (5 minutes)

### Option A: Simple Integration (Quick Test)

Add this to your backend order processing:

```typescript
// backend/src/orders/order-orchestrator.ts
import axios from 'axios';

// Add this helper function
async function sendLogToLoki(level: string, message: string, context: any) {
  try {
    await axios.post('http://localhost:3100/loki/api/v1/push', {
      streams: [{
        stream: {
          service: 'pos-backend',
          level: level,
          location: context.locationId || 'unknown',
          terminal: context.terminalId || 'unknown',
        },
        values: [[
          String(Date.now() * 1000000),
          JSON.stringify({
            message,
            timestamp: new Date().toISOString(),
            ...context,
          }),
        ]],
      }],
    });
  } catch (error) {
    // Don't crash if logging fails
    console.error('Failed to send log to Loki:', error.message);
  }
}

// Use it in your order processing
async processOrder(dto: CreateOrderDto): Promise<OrderResponseDto> {
  // Log order start
  await sendLogToLoki('info', 'Processing order', {
    locationId: dto.locationId,
    terminalId: dto.terminalId,
    amount: dto.total,
    items: dto.items.length,
    paymentMethod: dto.paymentMethod,
  });

  try {
    // ... your existing order processing code ...
    
    // Log success
    await sendLogToLoki('info', 'Order completed successfully', {
      locationId: dto.locationId,
      terminalId: dto.terminalId,
      orderId: transaction.id,
      amount: transaction.total,
    });

    return result;
  } catch (error) {
    // Log error
    await sendLogToLoki('error', 'Order processing failed', {
      locationId: dto.locationId,
      terminalId: dto.terminalId,
      error: error.message,
      stack: error.stack,
    });
    
    throw error;
  }
}
```

### Option B: Production Integration (Full Implementation)

1. **Install dependencies:**
```bash
cd backend
npm install axios
```

2. **Copy the LokiTransport:**
```bash
# Copy from the implementation
cp backend/src/common/logger/loki-transport.ts src/common/logger/
```

3. **Update your logger service:**
```typescript
// backend/src/common/logger/logger.service.ts
import { LokiTransport } from './loki-transport';
import winston from 'winston';

export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    const transports: winston.transport[] = [
      new winston.transports.Console(),
    ];

    // Add Loki transport if URL is configured
    if (process.env.LOKI_URL) {
      transports.push(new LokiTransport({
        host: process.env.LOKI_URL,
        labels: {
          service: 'pos-backend',
          location: process.env.LOCATION_ID || 'unknown',
        },
        batching: true,
        batchInterval: 5000,
        maxBatchSize: 100,
      }));
    }

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports,
    });
  }

  log(message: string, context?: any) {
    this.logger.info(message, context);
  }

  error(message: string, error?: Error, context?: any) {
    this.logger.error(message, {
      error: error?.message,
      stack: error?.stack,
      ...context,
    });
  }
}
```

4. **Add environment variable:**
```bash
# backend/.env
LOKI_URL=http://localhost:3100
LOCATION_ID=STORE_001
```

5. **Restart your backend:**
```bash
npm run start:dev
```

---

## Step 5: View Your Transaction Logs (2 minutes)

### In Grafana:

1. **Open Grafana:** http://localhost:3001
2. **Go to Explore:** Click compass icon (🧭)
3. **Select Loki data source**
4. **Try these queries:**

**See all logs:**
```logql
{service="pos-backend"}
```

**See only errors:**
```logql
{service="pos-backend"} |= "error"
```

**See logs from specific store:**
```logql
{service="pos-backend", location="STORE_001"}
```

**See transaction logs:**
```logql
{service="pos-backend"} |= "order" or "transaction"
```

**See payment errors:**
```logql
{service="pos-backend"} |= "payment" |= "error"
```

5. **Set time range:** Last 15 minutes (top right)
6. **Click "Run query"**

### Create a Dashboard:

1. **Go to Dashboards → New → New Dashboard**
2. **Add panel:**
   - Query: `{service="pos-backend"} |= "error"`
   - Title: "Error Logs"
3. **Add another panel:**
   - Query: `sum(count_over_time({service="pos-backend"}[5m])) by (location)`
   - Title: "Logs by Store"
4. **Save dashboard**

---

## Step 6: Test with a Real Transaction

1. **Process a transaction** in your POS system
2. **Go to Grafana → Explore**
3. **Query:**
```logql
{service="pos-backend"} |= "order"
```
4. **You should see:**
   - "Processing order" log
   - "Order completed successfully" log
   - All transaction details (store, terminal, amount, etc.)

---

## Troubleshooting

### Problem: "localhost:3100 is offline"

**Check if Loki is running:**
```powershell
docker ps | Select-String loki
```

**If not running, start it:**
```powershell
docker start loki
```

**Check Loki logs:**
```powershell
docker logs loki
```

**Test Loki endpoint:**
```powershell
curl http://localhost:3100/ready
```

### Problem: "No logs appearing in Grafana"

**1. Check Loki is receiving logs:**
```powershell
# Send test log
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() * 1000000
Invoke-RestMethod -Uri "http://localhost:3100/loki/api/v1/push" `
    -Method Post `
    -ContentType "application/json" `
    -Body (@{
        streams = @(@{
            stream = @{ service = "test" }
            values = @(@($timestamp.ToString(), "test"))
        })
    } | ConvertTo-Json -Depth 10)

# Query it back
Invoke-RestMethod -Uri "http://localhost:3100/loki/api/v1/query_range?query={service=`"test`"}"
```

**2. Check Grafana data source:**
- Go to Connections → Data sources → Loki
- Click "Test" button
- Should say "Data source connected"

**3. Check time range:**
- In Grafana Explore, set time range to "Last 1 hour"
- Make sure your logs are within that range

### Problem: "Backend can't connect to Loki"

**Check network connectivity:**
```powershell
# From your backend directory
curl http://localhost:3100/ready
```

**If using Docker for backend:**
- Use `http://host.docker.internal:3100` instead of `localhost:3100`

**If using WSL:**
- Use your Windows IP address instead of localhost
- Find it with: `ipconfig` (look for IPv4 Address)

### Problem: "Logs are slow to appear"

This is normal! Logs are batched:
- **Batching interval:** 5 seconds
- **Wait time:** Up to 10 seconds for logs to appear
- **Solution:** Be patient, or disable batching for testing

---

## Quick Reference

### URLs
- **Grafana:** http://localhost:3001 (admin/admin123)
- **Loki API:** http://localhost:3100
- **Loki Ready Check:** http://localhost:3100/ready

### Common LogQL Queries
```logql
# All logs
{service="pos-backend"}

# Errors only
{service="pos-backend"} |= "error"

# Specific store
{service="pos-backend", location="STORE_001"}

# Payment errors
{service="pos-backend"} |= "payment" |= "error"

# Last hour
{service="pos-backend"} [1h]

# Count by store
sum(count_over_time({service="pos-backend"}[5m])) by (location)
```

### Docker Commands
```powershell
# Check status
docker ps

# View logs
docker logs loki
docker logs grafana

# Restart services
docker restart loki grafana

# Stop services
docker stop loki grafana

# Start services
docker start loki grafana

# Remove everything (clean start)
docker-compose down -v
```

---

## Next Steps

Once you see your logs:

1. **Create useful dashboards** in Grafana
2. **Set up alerts** for critical errors
3. **Add more context** to your logs (user ID, session ID, etc.)
4. **Monitor multiple stores** with location filters
5. **Set up Uptime Kuma** for uptime monitoring

---

## Summary

**What you did:**
1. ✅ Started Loki and Grafana with Docker
2. ✅ Configured Grafana to connect to Loki
3. ✅ Sent test logs to verify it works
4. ✅ Integrated your backend to send transaction logs
5. ✅ Viewed logs in Grafana

**What you have now:**
- ✅ Free centralized logging ($0/month)
- ✅ All transaction logs in one place
- ✅ Searchable and filterable logs
- ✅ Real-time log viewing
- ✅ No more SSH into servers!

**Time spent:** ~15 minutes  
**Cost:** $0/month  
**Value:** Priceless! 🎉

---

## Need Help?

**Check services are running:**
```powershell
docker ps
```

**View Loki logs:**
```powershell
docker logs loki --tail 50
```

**Test Loki endpoint:**
```powershell
curl http://localhost:3100/ready
```

**Send test log:**
```powershell
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() * 1000000
Invoke-RestMethod -Uri "http://localhost:3100/loki/api/v1/push" `
    -Method Post `
    -ContentType "application/json" `
    -Body (@{
        streams = @(@{
            stream = @{ service = "test"; level = "info" }
            values = @(@($timestamp.ToString(), "Test from PowerShell"))
        })
    } | ConvertTo-Json -Depth 10)
```

---

## 🔗 Loki Integration (NEW!)

The application now automatically sends logs to Loki when configured. 

### Quick Setup

1. **Set environment variables** in `backend/.env`:
```env
LOKI_ENABLED=true
LOKI_URL=http://localhost:3100
LOCATION_ID=store-001
```

2. **Test the integration**:
```bash
cd backend
npm run test:loki
```

3. **Start your application**:
```bash
npm run start:dev
```

You should see: `✅ Loki transport enabled: http://localhost:3100`

### View Logs in Grafana

1. Open http://localhost:3000 (admin/admin)
2. Go to **Explore** (compass icon)
3. Query: `{service="liquor-pos-backend"}`

📚 **Full Documentation**: [LOKI_INTEGRATION_GUIDE.md](./LOKI_INTEGRATION_GUIDE.md)

---

**You're all set! Start processing transactions and watch your logs flow in! 🚀**

**Next Steps:**
- [Loki Integration Guide](./LOKI_INTEGRATION_GUIDE.md) - **NEW!**
- [Full Observability Architecture](./docs/OBSERVABILITY_ARCHITECTURE.md)
- [Free Stack Alternative Guide](./docs/OBSERVABILITY_FREE_ALTERNATIVE.md)

