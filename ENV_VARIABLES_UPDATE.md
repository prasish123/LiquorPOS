# Environment Variables Update

**Date:** January 3, 2026  
**Purpose:** New environment variables to add to `.env.example`

---

## New Variables to Add

Add these to `backend/.env.example`:

```bash
# ------------------------------------------------------------------------------
# Redis Configuration
# ------------------------------------------------------------------------------
REDIS_MEMORY_CACHE_SIZE=100
REDIS_CLEANUP_INTERVAL_MS=60000
REDIS_MAX_RETRY_ATTEMPTS=3
REDIS_RETRY_BACKOFF_MS=2000
REDIS_MAX_RETRIES_PER_REQUEST=3

# ------------------------------------------------------------------------------
# Conexxus Configuration
# ------------------------------------------------------------------------------
CONEXXUS_UPLOAD_TIMEOUT=60000
CONEXXUS_HEALTH_CHECK_TIMEOUT=5000
CONEXXUS_MAX_METRICS_HISTORY=100
CONEXXUS_SYNC_SCHEDULE=0 * * * *
CONEXXUS_SALES_PUSH_SCHEDULE=0 30 23 * * *

# ------------------------------------------------------------------------------
# System Configuration
# ------------------------------------------------------------------------------
DISK_PATH=
DISK_USAGE_THRESHOLD=0.9
ID_SCAN_DELAY_MS=500

# ------------------------------------------------------------------------------
# Backup Configuration
# ------------------------------------------------------------------------------
BACKUP_SCHEDULE=0 2 * * *
BACKUP_CLEANUP_SCHEDULE=0 * * * *
BACKUP_MAX_AGE_HOURS=25
BACKUP_STATS_WINDOW_HOURS=24

# ------------------------------------------------------------------------------
# Offline Queue Configuration
# ------------------------------------------------------------------------------
OFFLINE_QUEUE_CLEANUP_DAYS=7
OFFLINE_QUEUE_PROCESS_SCHEDULE=*/5 * * * *

# ------------------------------------------------------------------------------
# Network Monitoring
# ------------------------------------------------------------------------------
NETWORK_CHECK_SCHEDULE=*/30 * * * *

# ------------------------------------------------------------------------------
# Business Rules
# ------------------------------------------------------------------------------
DEFAULT_PRODUCT_MARGIN=0.3
MAX_ORDER_QUANTITY=1000
MAX_TRANSACTION_AMOUNT=100000
```

---

## Instructions

1. Open `backend/.env.example`
2. Add the above variables to the appropriate sections
3. Copy to your `.env` file if needed
4. All values shown are defaults - no need to set unless you want to override

---

## Documentation

See `HARDCODED_VALUES_CATALOG.md` for complete details on each variable.


