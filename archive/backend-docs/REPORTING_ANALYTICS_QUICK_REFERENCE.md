# Reporting & Analytics - Quick Reference

**Version**: 1.0.0  
**Status**: ✅ Production Ready

---

## 🚀 Quick Start

### 1. Get Auth Token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

export TOKEN="your_jwt_token"
```

### 2. Generate Daily Sales Report
```bash
curl -X GET "http://localhost:3000/reporting/sales/daily?startDate=2026-01-01T00:00:00Z&endDate=2026-01-01T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Available Reports

| Report | Endpoint | Key Metrics |
|--------|----------|-------------|
| **Daily Sales** | `/reporting/sales/daily` | Revenue, transactions, hourly breakdown |
| **Sales Summary** | `/reporting/sales/summary` | Aggregated metrics |
| **Top Products** | `/reporting/products/top` | Best sellers, turnover rate |
| **Inventory** | `/reporting/inventory` | Stock levels, low stock alerts |
| **Employee Performance** | `/reporting/employees/performance` | Revenue per hour, transactions |

---

## 🔑 Common Query Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `startDate` | ✅ | Start date (ISO 8601) | `2026-01-01T00:00:00Z` |
| `endDate` | ✅ | End date (ISO 8601) | `2026-01-31T23:59:59Z` |
| `locationId` | ❌ | Filter by location | `loc_123` |
| `format` | ❌ | Export format | `csv`, `excel`, `pdf` |
| `limit` | ❌ | Number of results | `10` (default) |

---

## 📤 Export Examples

### CSV Export
```bash
curl -X GET "http://localhost:3000/reporting/export/sales?startDate=2026-01-01&endDate=2026-01-31&format=csv" \
  -H "Authorization: Bearer $TOKEN" -o sales-report.csv
```

### Inventory Export
```bash
curl -X GET "http://localhost:3000/reporting/export/inventory?startDate=2026-01-01&endDate=2026-01-31&format=csv" \
  -H "Authorization: Bearer $TOKEN" -o inventory-report.csv
```

---

## 🔗 Accounting Integration

### QuickBooks Setup
```typescript
import { QuickBooksService } from './reporting/integrations/quickbooks.service';

const qb = new QuickBooksService();
await qb.connect({
  provider: 'quickbooks',
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  accessToken: 'token',
  realmId: 'company_id',
});

await qb.syncTransactions(transactions);
```

### Xero Setup
```typescript
import { XeroService } from './reporting/integrations/xero.service';

const xero = new XeroService();
await xero.connect({
  provider: 'xero',
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  accessToken: 'token',
  tenantId: 'org_id',
});

await xero.syncTransactions(transactions);
```

---

## ⚡ Performance Tips

1. **Use Caching**: Reports are cached for 1 hour
2. **Limit Date Ranges**: Keep to 3-6 months for best performance
3. **Filter by Location**: Reduces data volume
4. **Run Off-Peak**: Schedule heavy reports during low traffic

---

## 🐛 Troubleshooting

### Slow Reports
- Check Redis is running: `redis-cli ping`
- Reduce date range
- Enable caching
- Check database indexes

### Export Fails
- Install libraries: `npm install exceljs pdfkit`
- Check file permissions
- Verify data format

### Cache Not Working
- Verify Redis connection
- Check cache keys in logs
- Invalidate cache: `cacheService.invalidateAll()`

---

## 📚 Full Documentation

- **User Guide**: `REPORTING_ANALYTICS_GUIDE.md`
- **Completion Report**: `REPORTING_ANALYTICS_COMPLETION_REPORT.md`
- **API Docs**: http://localhost:3000/api

---

## 📞 Support

- Check logs: `logs/combined.log`
- API documentation: http://localhost:3000/api
- Full guide: `backend/docs/REPORTING_ANALYTICS_GUIDE.md`

---

**Version**: 1.0.0  
**Last Updated**: 2026-01-02

