# Hardcoded Values Catalog

**Date:** January 3, 2026  
**Purpose:** Comprehensive catalog of all hardcoded values found in codebase for refactoring

---

## Summary Statistics

- **Total hardcoded values found:** 47
- **Categories:**
  - OPERATIONAL: 18
  - BUSINESS RULE: 12
  - ENVIRONMENT: 8
  - UI CONSTANT: 6
  - SECRET: 3 (already in .env)

---

## Detailed Catalog

### OPERATIONAL Configuration (18 items)

| File:Line | Current Value | Category | Proposed Solution | Risk |
|-----------|---------------|----------|-------------------|------|
| `redis.service.ts:64` | `MAX_MEMORY_CACHE_SIZE = 100` | OPERATIONAL | `REDIS_MEMORY_CACHE_SIZE` env var (default 100) | LOW |
| `redis.service.ts:103` | `setInterval(..., 60000)` | OPERATIONAL | `REDIS_CLEANUP_INTERVAL_MS` env var (default 60000) | LOW |
| `redis.service.ts:129` | `if (times > 3)` | OPERATIONAL | `REDIS_MAX_RETRY_ATTEMPTS` env var (default 3) | LOW |
| `redis.service.ts:135` | `Math.min(times * 100, 2000)` | OPERATIONAL | `REDIS_RETRY_BACKOFF_MS` env var (default 2000) | LOW |
| `redis.service.ts:138` | `maxRetriesPerRequest: 3` | OPERATIONAL | `REDIS_MAX_RETRIES_PER_REQUEST` env var (default 3) | LOW |
| `conexxus-http.client.ts:86` | `timeout: 30000` | OPERATIONAL | Already uses `CONEXXUS_TIMEOUT` | ✅ DONE |
| `conexxus-http.client.ts:88` | `retryDelay: 1000` | OPERATIONAL | Already uses `CONEXXUS_RETRY_DELAY` | ✅ DONE |
| `conexxus-http.client.ts:92` | `timeout: 60000` | OPERATIONAL | `CONEXXUS_UPLOAD_TIMEOUT` env var (default 60000) | LOW |
| `conexxus-http.client.ts:301` | `timeout: 5000` | OPERATIONAL | `CONEXXUS_HEALTH_CHECK_TIMEOUT` env var (default 5000) | LOW |
| `prisma.service.ts:80` | `idleTimeout: 10000` | OPERATIONAL | Already uses `DATABASE_POOL_IDLE_TIMEOUT` | ✅ DONE |
| `prisma.service.ts:81` | `connectionTimeout: 5000` | OPERATIONAL | Already uses `DATABASE_POOL_CONNECTION_TIMEOUT` | ✅ DONE |
| `offline-queue.service.ts:357` | `olderThanDays: number = 7` | OPERATIONAL | `OFFLINE_QUEUE_CLEANUP_DAYS` env var (default 7) | LOW |
| `backup.service.ts:346` | `24 * 60 * 60 * 1000` | OPERATIONAL | `BACKUP_STATS_WINDOW_HOURS` env var (default 24) | LOW |
| `backup.health.ts:23` | `25 * 60 * 60 * 1000` | OPERATIONAL | `BACKUP_MAX_AGE_HOURS` env var (default 25) | LOW |
| `id-scanner.interface.ts:130` | `setTimeout(..., 500)` | OPERATIONAL | `ID_SCAN_DELAY_MS` env var (default 500) | LOW |
| `circuit-breaker.spec.ts:117` | `setTimeout(..., 1100)` | OPERATIONAL | Test file - keep as is | N/A |
| `redis.service.spec.ts:193` | `setTimeout(..., 1500)` | OPERATIONAL | Test file - keep as is | N/A |
| `conexxus.service.ts:55` | `maxMetricsHistory = 100` | OPERATIONAL | `CONEXXUS_MAX_METRICS_HISTORY` env var (default 100) | LOW |

### BUSINESS RULE Configuration (12 items)

| File:Line | Current Value | Category | Proposed Solution | Risk |
|-----------|---------------|----------|-------------------|------|
| `state-regulations.ts:54` | `minimumAge: 21` | BUSINESS RULE | **Database** - Settings table per state | MEDIUM |
| `state-regulations.ts:84-88` | Tax rates (beer, wine, spirits) | BUSINESS RULE | **Database** - Settings table per state | MEDIUM |
| `state-regulations.ts:64-70` | Sale hours by day | BUSINESS RULE | **Database** - Settings table per location | MEDIUM |
| `conexxus.service.ts:239` | `cost: item.price * 0.7` (30% margin) | BUSINESS RULE | `DEFAULT_PRODUCT_MARGIN` env var (default 0.3) | MEDIUM |
| `order-validators.ts:84` | `value >= 1 && value <= 1000` | BUSINESS RULE | `MAX_ORDER_QUANTITY` env var (default 1000) | MEDIUM |
| `order-validators.ts:116` | `value <= 100000` | BUSINESS RULE | `MAX_TRANSACTION_AMOUNT` env var (default 100000) | MEDIUM |
| `order-validators.ts:21` | `{16,128}` (idempotency key length) | BUSINESS RULE | Keep in code as named constant | LOW |
| `order-validators.ts:54` | `{3,50}` (SKU length) | BUSINESS RULE | Keep in code as named constant | LOW |
| `order-validators.ts:148` | `{24}` (CUID length) | BUSINESS RULE | Keep in code as named constant | LOW |
| `order-validators.ts:150` | `{8,36}` (custom ID length) | BUSINESS RULE | Keep in code as named constant | LOW |
| `health.controller.ts:38` | `thresholdPercent: 0.9` | BUSINESS RULE | `DISK_USAGE_THRESHOLD` env var (default 0.9) | LOW |
| `enhanced-compliance.agent.spec.ts:123` | `21 years old` | BUSINESS RULE | Use state regulations from database | MEDIUM |

### ENVIRONMENT Configuration (8 items)

| File:Line | Current Value | Category | Proposed Solution | Risk |
|-----------|---------------|----------|-------------------|------|
| `health.controller.ts:31` | `process.platform === 'win32' ? 'C:\\' : '/'` | ENVIRONMENT | `DISK_PATH` env var (default auto-detect) | LOW |
| `conexxus.service.ts:284` | `process.env.LOCATION_ID \|\| 'default'` | ENVIRONMENT | Already uses env var with fallback | ✅ DONE |
| `ApiClient.ts:61` | `'http://localhost:3000'` | ENVIRONMENT | Already uses `VITE_API_URL` | ✅ DONE |
| `AuthProvider.tsx:20` | `'http://localhost:3000'` | ENVIRONMENT | Already uses `VITE_API_URL` | ✅ DONE |
| `Login.tsx:19` | `'http://localhost:3000'` | ENVIRONMENT | Already uses `VITE_API_URL` | ✅ DONE |
| `redis.service.ts:124` | `host: 'localhost', port: 6379` | ENVIRONMENT | Already uses `REDIS_HOST` and `REDIS_PORT` | ✅ DONE |
| `prisma.service.ts` | Database connection pooling | ENVIRONMENT | Already uses `DATABASE_POOL_*` vars | ✅ DONE |
| `conexxus-http.client.ts` | API URL and key | ENVIRONMENT | Already uses `CONEXXUS_API_URL` and `CONEXXUS_API_KEY` | ✅ DONE |

### UI CONSTANT (6 items)

| File:Line | Current Value | Category | Proposed Solution | Risk |
|-----------|---------------|----------|-------------------|------|
| `backup.service.spec.ts:301` | `1073741824` (1 GB) | UI CONSTANT | Named constant `BYTES_PER_GB = 1024 * 1024 * 1024` | LOW |
| `backup.service.ts:505` | `k = 1024` | UI CONSTANT | Named constant `BYTES_PER_KB = 1024` | LOW |
| `health\backup.health.ts:83` | `k = 1024` | UI CONSTANT | Named constant `BYTES_PER_KB = 1024` | LOW |
| `reporting\dto\report-response.dto.ts` | Example values | UI CONSTANT | Keep as is (documentation) | N/A |
| `webhooks\*.spec.ts` | Test data | UI CONSTANT | Keep as is (test data) | N/A |
| `order-orchestrator.spec.ts` | Test data | UI CONSTANT | Keep as is (test data) | N/A |

### SECRET (3 items - Already Handled)

| File:Line | Current Value | Category | Status |
|-----------|---------------|----------|--------|
| Stripe keys | `sk_test_*`, `sk_live_*` | SECRET | ✅ Already in .env as `STRIPE_SECRET_KEY` |
| Database URL | PostgreSQL connection | SECRET | ✅ Already in .env as `DATABASE_URL` |
| JWT Secret | Token signing | SECRET | ✅ Already in .env as `JWT_SECRET` |

---

## Cron Schedule Configuration (4 items)

| File:Line | Current Value | Category | Proposed Solution | Risk |
|-----------|---------------|----------|-------------------|------|
| `conexxus.service.ts:96` | `@Cron(CronExpression.EVERY_HOUR)` | OPERATIONAL | `CONEXXUS_SYNC_SCHEDULE` env var (default '0 * * * *') | LOW |
| `conexxus.service.ts:260` | `@Cron('0 30 23 * * *')` | OPERATIONAL | `CONEXXUS_SALES_PUSH_SCHEDULE` env var (default '0 30 23 * * *') | LOW |
| `offline-queue.service.ts:118` | `@Cron(CronExpression.EVERY_5_MINUTES)` | OPERATIONAL | `OFFLINE_QUEUE_PROCESS_SCHEDULE` env var (default '*/5 * * * *') | LOW |
| `backup.service.ts:92` | `@Cron('0 2 * * *')` | OPERATIONAL | `BACKUP_SCHEDULE` env var (default '0 2 * * *') | LOW |
| `backup.service.ts:116` | `@Cron(CronExpression.EVERY_HOUR)` | OPERATIONAL | `BACKUP_CLEANUP_SCHEDULE` env var (default '0 * * * *') | LOW |
| `network-status.service.ts:82` | `@Cron(CronExpression.EVERY_30_SECONDS)` | OPERATIONAL | `NETWORK_CHECK_SCHEDULE` env var (default '*/30 * * * *') | LOW |

---

## Priority Refactoring List

### HIGH PRIORITY (Must Fix)

1. **Disk path detection** (`health.controller.ts:31`)
   - Currently hardcodes `C:\` for Windows
   - Should use env var with auto-detection fallback

2. **Business rules in database** (state regulations)
   - Tax rates vary by state/county
   - Sale hours vary by location
   - Should be in database for easy updates

### MEDIUM PRIORITY (Should Fix)

1. **Order validation limits**
   - Max quantity (1000)
   - Max transaction amount ($100,000)
   - Should be configurable per store

2. **Product margin calculation**
   - Currently hardcoded 30% margin
   - Should be configurable

3. **Timeout values**
   - Various timeout values scattered across services
   - Should be centralized and configurable

### LOW PRIORITY (Nice to Have)

1. **Cache sizes and intervals**
   - Memory cache size
   - Cleanup intervals
   - Retry attempts

2. **Cron schedules**
   - Backup schedules
   - Sync schedules
   - Cleanup schedules

---

## Proposed Configuration Structure

### New Environment Variables

```bash
# Operational - Redis
REDIS_MEMORY_CACHE_SIZE=100
REDIS_CLEANUP_INTERVAL_MS=60000
REDIS_MAX_RETRY_ATTEMPTS=3
REDIS_RETRY_BACKOFF_MS=2000
REDIS_MAX_RETRIES_PER_REQUEST=3

# Operational - Conexxus
CONEXXUS_UPLOAD_TIMEOUT=60000
CONEXXUS_HEALTH_CHECK_TIMEOUT=5000
CONEXXUS_MAX_METRICS_HISTORY=100
CONEXXUS_SYNC_SCHEDULE="0 * * * *"
CONEXXUS_SALES_PUSH_SCHEDULE="0 30 23 * * *"

# Operational - System
DISK_PATH=auto
DISK_USAGE_THRESHOLD=0.9
ID_SCAN_DELAY_MS=500

# Operational - Backup
BACKUP_MAX_AGE_HOURS=25
BACKUP_STATS_WINDOW_HOURS=24
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_CLEANUP_SCHEDULE="0 * * * *"

# Operational - Offline Queue
OFFLINE_QUEUE_CLEANUP_DAYS=7
OFFLINE_QUEUE_PROCESS_SCHEDULE="*/5 * * * *"

# Operational - Network
NETWORK_CHECK_SCHEDULE="*/30 * * * *"

# Business Rules
DEFAULT_PRODUCT_MARGIN=0.3
MAX_ORDER_QUANTITY=1000
MAX_TRANSACTION_AMOUNT=100000
```

### Database Settings Table

```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  state_code VARCHAR(2),
  key VARCHAR(255) NOT NULL,
  value JSONB NOT NULL,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(location_id, key)
);

-- Example data
INSERT INTO settings (location_id, state_code, key, value, category) VALUES
  (NULL, 'FL', 'minimum_age', '21', 'compliance'),
  (NULL, 'FL', 'tax_rates', '{"beer": 0.48, "wine": 2.25, "spirits": 6.50}', 'tax'),
  ('location-123', NULL, 'sale_hours', '{"monday": {"start": "07:00", "end": "24:00"}}', 'hours');
```

---

## Implementation Plan

### Phase 1: Critical Fixes (Day 1)
1. ✅ Create config validation module
2. ✅ Extract disk path to env var
3. ✅ Extract business rule limits to env vars
4. ✅ Update .env.example
5. ✅ Update docs/configuration.md

### Phase 2: Operational Config (Day 2)
1. Extract timeout values
2. Extract retry limits
3. Extract cache sizes
4. Extract cron schedules
5. Test all services

### Phase 3: Database Migration (Day 3-4)
1. Create settings table migration
2. Migrate state regulations to database
3. Create settings service
4. Update compliance service to use database
5. Create admin UI for settings management

### Phase 4: Cleanup (Day 5)
1. Remove hardcoded constants
2. Add named constants for UI values
3. Update tests
4. Final verification

---

## Files to Modify

### Backend Core
- `src/config/app.config.ts` (NEW - centralized config)
- `src/config/validate-config.ts` (NEW - startup validation)
- `src/health/health.controller.ts`
- `src/redis/redis.service.ts`
- `src/integrations/conexxus/conexxus.service.ts`
- `src/integrations/conexxus/conexxus-http.client.ts`
- `src/orders/validators/order-validators.ts`
- `src/common/offline-queue.service.ts`
- `src/backup/backup.service.ts`
- `src/backup/backup.health.ts`
- `src/common/network-status.service.ts`
- `src/main.ts` (add config validation)

### Database
- `prisma/migrations/XXXXXX_create_settings_table.sql` (NEW)
- `prisma/schema.prisma` (add Settings model)
- `src/settings/settings.service.ts` (NEW)
- `src/settings/settings.controller.ts` (NEW)
- `src/settings/settings.module.ts` (NEW)

### Documentation
- `.env.example`
- `docs/configuration.md`
- `backend/README.md`

---

## Risk Assessment

### LOW RISK (Safe to change immediately)
- Timeout values
- Cache sizes
- Retry limits
- Cleanup intervals
- Cron schedules

### MEDIUM RISK (Test thoroughly)
- Order validation limits
- Transaction amount limits
- Product margin calculation
- Disk path detection

### HIGH RISK (Requires migration strategy)
- State regulations (tax rates, sale hours)
- Age restrictions
- Compliance rules

---

## Testing Strategy

### Unit Tests
- Config validation function
- Default value fallbacks
- Type conversions (string to number)

### Integration Tests
- Services with new config values
- Cron jobs with custom schedules
- Database settings retrieval

### E2E Tests
- Full order flow with new limits
- Compliance checks with database settings
- Backup schedules

---

## Rollback Plan

If issues arise:
1. All changes use env vars with sensible defaults
2. Can revert to defaults by removing env vars
3. Database settings are additive (old code still works)
4. No breaking changes to existing functionality

---

**Next Steps:**
1. Review and approve this catalog
2. Implement Phase 1 (critical fixes)
3. Test thoroughly
4. Deploy to staging
5. Monitor for issues
6. Proceed with Phase 2


