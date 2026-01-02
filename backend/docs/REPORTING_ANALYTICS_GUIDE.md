# Reporting & Analytics Guide

**Version**: 1.0.0  
**Last Updated**: 2026-01-02  
**Status**: ✅ Production Ready

---

## 📊 Overview

The Reporting & Analytics module provides comprehensive business intelligence capabilities for the Liquor POS system. It enables store owners and managers to generate insights from sales, inventory, and employee performance data.

### Key Features

- ✅ **Sales Reports** - Daily, weekly, monthly sales summaries
- ✅ **Product Performance** - Best-selling products with turnover analysis
- ✅ **Inventory Reports** - Stock levels, turnover rates, low stock alerts
- ✅ **Employee Performance** - Productivity metrics and revenue tracking
- ✅ **Export Functionality** - CSV, Excel, PDF formats
- ✅ **Accounting Integration** - QuickBooks and Xero interfaces
- ✅ **Report Caching** - Redis-based caching for performance

---

## 🚀 Quick Start

### 1. Access Reports

All reporting endpoints require authentication:

```bash
# Get JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your_password"}'

# Use token in subsequent requests
export TOKEN="your_jwt_token"
```

### 2. Generate Daily Sales Report

```bash
curl -X GET "http://localhost:3000/reporting/sales/daily?startDate=2026-01-01T00:00:00Z&endDate=2026-01-01T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Get Top Selling Products

```bash
curl -X GET "http://localhost:3000/reporting/products/top?startDate=2026-01-01&endDate=2026-01-31&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📈 Available Reports

### 1. Sales Reports

#### Daily Sales Report

**Endpoint**: `GET /reporting/sales/daily`

**Query Parameters**:
- `startDate` (required): ISO 8601 date string
- `endDate` (required): ISO 8601 date string
- `locationId` (optional): Filter by location
- `format` (optional): Export format (json, csv, excel, pdf)

**Response**:
```json
{
  "date": "2026-01-15",
  "summary": {
    "totalRevenue": 15420.50,
    "totalTransactions": 145,
    "averageTransactionValue": 106.35,
    "totalItemsSold": 387,
    "totalTax": 1234.56,
    "totalDiscounts": 234.50,
    "netRevenue": 15186.00
  },
  "salesByHour": {
    "09": 1250.00,
    "10": 2340.50,
    "11": 3120.75,
    ...
  },
  "paymentMethods": {
    "credit_card": { "count": 98, "amount": 10420.50 },
    "cash": { "count": 35, "amount": 3500.00 },
    "debit_card": { "count": 12, "amount": 1500.00 }
  },
  "topCategories": [
    { "category": "WINE", "revenue": 8500.00, "quantity": 120 },
    { "category": "SPIRITS", "revenue": 4200.00, "quantity": 85 },
    { "category": "BEER", "revenue": 2720.50, "quantity": 182 }
  ]
}
```

#### Sales Summary

**Endpoint**: `GET /reporting/sales/summary`

Provides aggregated metrics without hourly breakdown.

---

### 2. Product Performance Reports

#### Top Selling Products

**Endpoint**: `GET /reporting/products/top`

**Query Parameters**:
- `startDate` (required)
- `endDate` (required)
- `locationId` (optional)
- `limit` (optional, default: 10)
- `category` (optional): Filter by category

**Response**:
```json
[
  {
    "productId": "prod_123",
    "productName": "Cabernet Sauvignon 2020",
    "sku": "WIN-CAB-2020",
    "category": "WINE",
    "unitsSold": 45,
    "totalRevenue": 2250.00,
    "averagePrice": 50.00,
    "profitMargin": 35.5,
    "currentStock": 120,
    "turnoverRate": 0.375
  },
  ...
]
```

**Metrics Explained**:
- **Units Sold**: Total quantity sold in period
- **Total Revenue**: Gross revenue from product
- **Average Price**: Average selling price
- **Profit Margin**: Percentage profit margin
- **Current Stock**: Current inventory level
- **Turnover Rate**: Sales velocity (units sold / average stock)

---

### 3. Inventory Reports

#### Comprehensive Inventory Report

**Endpoint**: `GET /reporting/inventory`

**Query Parameters**:
- `startDate` (required): For turnover calculation
- `endDate` (required): For turnover calculation
- `locationId` (optional)

**Response**:
```json
{
  "totalValue": 125000.00,
  "totalItems": 2500,
  "lowStockCount": 15,
  "outOfStockCount": 3,
  "averageTurnoverRate": 0.42,
  "lowStockItems": [
    {
      "productId": "prod_456",
      "name": "Pinot Noir 2021",
      "sku": "WIN-PIN-2021",
      "currentStock": 8,
      "reorderLevel": 20
    }
  ],
  "slowMovingItems": [
    {
      "productId": "prod_789",
      "name": "Rare Whiskey",
      "sku": "SPR-WHI-RARE",
      "daysSinceLastSale": 45,
      "currentStock": 12
    }
  ],
  "categoryBreakdown": [
    {
      "category": "WINE",
      "itemCount": 450,
      "totalValue": 67500.00,
      "averageTurnover": 0.52
    }
  ]
}
```

**Use Cases**:
- **Reorder Planning**: Low stock items need replenishment
- **Inventory Optimization**: Identify slow-moving items
- **Cash Flow Management**: Total inventory value
- **Category Analysis**: Performance by product category

---

### 4. Employee Performance Reports

#### Employee Performance Metrics

**Endpoint**: `GET /reporting/employees/performance`

**Query Parameters**:
- `startDate` (required)
- `endDate` (required)
- `locationId` (optional)
- `employeeId` (optional): Filter by specific employee

**Response**:
```json
[
  {
    "employeeId": "emp_123",
    "employeeName": "John Doe",
    "transactionsProcessed": 145,
    "totalRevenue": 15420.50,
    "averageTransactionValue": 106.35,
    "hoursWorked": 40,
    "revenuePerHour": 385.51,
    "transactionsPerHour": 3.63,
    "satisfactionScore": 4.5
  }
]
```

**Metrics Explained**:
- **Transactions Processed**: Total number of sales
- **Total Revenue**: Revenue generated by employee
- **Average Transaction Value**: Average sale amount
- **Revenue Per Hour**: Productivity metric
- **Transactions Per Hour**: Efficiency metric

---

## 📤 Export Functionality

### Export Formats

#### CSV Export

**Endpoint**: `GET /reporting/export/sales?format=csv`

Returns CSV file for easy import into Excel or Google Sheets.

**Example**:
```bash
curl -X GET "http://localhost:3000/reporting/export/sales?startDate=2026-01-01&endDate=2026-01-31&format=csv" \
  -H "Authorization: Bearer $TOKEN" \
  -o sales-report.csv
```

#### Excel Export

**Endpoint**: `GET /reporting/export/sales?format=excel`

Returns Excel (.xlsx) file with formatted data.

**Note**: Requires `exceljs` library. Install with:
```bash
npm install exceljs
```

#### PDF Export

**Endpoint**: `GET /reporting/export/sales?format=pdf`

Returns PDF document suitable for printing.

**Note**: Requires `pdfkit` library. Install with:
```bash
npm install pdfkit
```

---

## 🔗 Accounting Integration

### QuickBooks Online Integration

#### Setup

1. **Create QuickBooks App**:
   - Go to https://developer.intuit.com/
   - Create new app
   - Get Client ID and Client Secret

2. **Configure OAuth**:
   ```typescript
   import { QuickBooksService } from './reporting/integrations/quickbooks.service';
   
   const quickbooks = new QuickBooksService();
   await quickbooks.connect({
     provider: 'quickbooks',
     clientId: 'your_client_id',
     clientSecret: 'your_client_secret',
     accessToken: 'oauth_access_token',
     refreshToken: 'oauth_refresh_token',
     realmId: 'company_id',
   });
   ```

3. **Sync Transactions**:
   ```typescript
   const transactions = [
     {
       transactionId: 'txn_123',
       date: new Date(),
       customerName: 'John Doe',
       items: [
         {
           description: 'Cabernet Sauvignon',
           quantity: 2,
           unitPrice: 50.00,
           amount: 100.00,
         },
       ],
       subtotal: 100.00,
       tax: 8.00,
       total: 108.00,
       paymentMethod: 'credit_card',
     },
   ];
   
   const result = await quickbooks.syncTransactions(transactions);
   console.log(`Synced ${result.recordsSucceeded} transactions`);
   ```

#### Features

- ✅ Sync sales transactions as Sales Receipts
- ✅ Sync inventory items
- ✅ Create invoices
- ✅ Get chart of accounts
- ✅ Automatic token refresh

### Xero Integration

#### Setup

1. **Create Xero App**:
   - Go to https://developer.xero.com/
   - Create new app
   - Get Client ID and Client Secret

2. **Configure OAuth**:
   ```typescript
   import { XeroService } from './reporting/integrations/xero.service';
   
   const xero = new XeroService();
   await xero.connect({
     provider: 'xero',
     clientId: 'your_client_id',
     clientSecret: 'your_client_secret',
     accessToken: 'oauth_access_token',
     refreshToken: 'oauth_refresh_token',
     tenantId: 'organization_id',
   });
   ```

3. **Sync Data**:
   ```typescript
   const result = await xero.syncTransactions(transactions);
   const inventoryResult = await xero.syncInventory(inventory);
   ```

#### Features

- ✅ Sync transactions as Invoices or Bank Transactions
- ✅ Sync inventory items
- ✅ Create invoices
- ✅ Get chart of accounts
- ✅ Multi-organization support

---

## ⚡ Performance & Caching

### Redis Caching

Reports are automatically cached in Redis to improve performance.

#### Cache Configuration

**Default TTL**: 1 hour (3600 seconds)

**Cache Keys Format**:
```
report:{reportType}:{startDate}:{endDate}:location:{locationId}
```

#### Cache Invalidation

**Automatic Invalidation**:
- When new transactions are created
- When inventory is updated
- When products are modified

**Manual Invalidation**:
```typescript
import { ReportCacheService } from './reporting/cache/report-cache.service';

// Invalidate specific report
await cacheService.invalidate('sales:2026-01-01:2026-01-31');

// Invalidate all reports for a location
await cacheService.invalidateByLocation('loc_123');

// Invalidate all reports
await cacheService.invalidateAll();
```

#### Cache Monitoring

Check cache hit rates in logs:
```
[ReportCacheService] Cache HIT: sales:2026-01-01:2026-01-31
[ReportCacheService] Cache MISS: inventory:2026-01-01:2026-01-31
```

---

## 🔒 Security & Authorization

### Authentication

All reporting endpoints require JWT authentication:

```typescript
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportingController { ... }
```

### Role-Based Access (Future Enhancement)

Recommended roles:
- **ADMIN**: Full access to all reports
- **MANAGER**: Access to sales and inventory reports
- **EMPLOYEE**: Limited access to personal performance reports

---

## 📊 Best Practices

### 1. Report Scheduling

**Recommended Schedule**:
- **Daily Sales Report**: Run at 1 AM daily
- **Weekly Summary**: Run Monday mornings
- **Monthly Reports**: Run on 1st of each month
- **Inventory Report**: Run daily at 2 AM

**Implementation**:
```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Cron(CronExpression.EVERY_DAY_AT_1AM)
async generateDailySalesReport() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const report = await this.reportingService.getDailySalesReport({
    startDate: yesterday.toISOString(),
    endDate: new Date().toISOString(),
  });
  
  // Email or save report
}
```

### 2. Data Retention

**Recommendations**:
- Keep detailed transaction data for 7 years (compliance)
- Archive old reports to cold storage after 1 year
- Maintain aggregated summaries indefinitely

### 3. Performance Optimization

**Tips**:
- Use date range filters to limit data volume
- Enable caching for frequently accessed reports
- Run expensive reports during off-peak hours
- Use pagination for large result sets

### 4. Export Best Practices

**CSV**:
- Best for data analysis in Excel
- Lightweight and fast
- Easy to import into other systems

**Excel**:
- Best for formatted reports
- Supports charts and formatting
- Larger file size

**PDF**:
- Best for printing and sharing
- Professional appearance
- Not editable

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Slow Report Generation

**Symptoms**: Reports take > 5 seconds to generate

**Solutions**:
- Check database indexes on `createdAt`, `locationId`, `status`
- Enable report caching
- Reduce date range
- Run during off-peak hours

#### 2. Cache Not Working

**Symptoms**: Every request shows "Cache MISS"

**Solutions**:
- Verify Redis is running: `redis-cli ping`
- Check Redis connection in logs
- Verify cache keys are consistent
- Check TTL settings

#### 3. Export Fails

**Symptoms**: Export endpoints return errors

**Solutions**:
- Install required libraries (`exceljs`, `pdfkit`)
- Check file permissions
- Verify data format
- Check memory limits for large exports

#### 4. Accounting Sync Fails

**Symptoms**: QuickBooks/Xero sync returns errors

**Solutions**:
- Verify OAuth tokens are valid
- Check API rate limits
- Verify account mappings
- Check network connectivity

---

## 📚 API Reference

### Complete Endpoint List

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/reporting/sales/daily` | GET | Daily sales report |
| `/reporting/sales/summary` | GET | Sales summary |
| `/reporting/products/top` | GET | Top selling products |
| `/reporting/inventory` | GET | Inventory report |
| `/reporting/employees/performance` | GET | Employee performance |
| `/reporting/export/sales` | GET | Export sales report |
| `/reporting/export/inventory` | GET | Export inventory report |

### Query Parameters

**Common Parameters**:
- `startDate`: ISO 8601 date (required)
- `endDate`: ISO 8601 date (required)
- `locationId`: Location filter (optional)
- `format`: Export format (optional)

**Product-Specific**:
- `limit`: Number of results (default: 10)
- `category`: Product category filter

**Employee-Specific**:
- `employeeId`: Employee filter

---

## 🚀 Future Enhancements

### Phase 2 (Q2 2026)

- [ ] **Real-time Dashboards**: WebSocket-based live updates
- [ ] **Custom Report Builder**: User-defined report templates
- [ ] **Predictive Analytics**: ML-based sales forecasting
- [ ] **Automated Insights**: AI-generated business recommendations

### Phase 3 (Q3 2026)

- [ ] **Data Warehouse**: Historical data analysis
- [ ] **Advanced Visualizations**: Interactive charts and graphs
- [ ] **Multi-store Comparison**: Compare performance across locations
- [ ] **Customer Analytics**: RFM analysis, cohort analysis

---

## 📞 Support

For questions or issues:
- **Documentation**: See `backend/docs/`
- **API Docs**: http://localhost:3000/api (Swagger UI)
- **Logs**: Check `logs/combined.log`

---

**Version**: 1.0.0  
**Last Updated**: 2026-01-02  
**Status**: ✅ Production Ready

