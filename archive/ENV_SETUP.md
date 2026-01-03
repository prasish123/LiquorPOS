# Environment Setup Guide

## Overview

This application uses **centralized environment validation** that runs at startup. The application will **fail fast** with clear error messages if required variables are missing or invalid.

✅ **New in v2.0:** Automatic validation at startup  
✅ **New in v2.0:** Auto-generated JWT secrets in development  
✅ **New in v2.0:** Comprehensive error messages with fix instructions  
✅ **New in v3.0:** Structured logging with Winston and correlation IDs

## Required Environment Variables

All environment variables are validated before the application starts. The validation service will:
- ✅ Check that all required variables are present
- ✅ Validate format and strength of secrets
- ✅ Provide helpful error messages with fix commands
- ✅ Warn about optional but recommended variables

### Critical Variables (MUST be set)

#### 1. AUDIT_LOG_ENCRYPTION_KEY
**Purpose**: Encrypts sensitive data in audit logs (customer IDs, age verification, payment details)

**Generate**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Example**:
```bash
AUDIT_LOG_ENCRYPTION_KEY=qVvLhfcDvgh42nScKjTaNQl1mcjXYlFE8apAvBVaII0=
```

**⚠️ CRITICAL**: 
- **Backup this key securely** (password manager, secrets vault, key management service)
- **Losing this key means permanent data loss** - audit logs cannot be decrypted
- **7-year retention requirement** for liquor sales records (compliance)
- Use different keys for dev/staging/production
- **See `docs/ENCRYPTION_KEY_MANAGEMENT.md` for complete key management guide**

---

#### 2. ALLOWED_ORIGINS
**Purpose**: CORS configuration for allowed frontend origins

**Format**: Comma-separated list of URLs (no trailing slashes)

**Development**:
```bash
ALLOWED_ORIGINS=http://localhost:5173
```

**Production**:
```bash
ALLOWED_ORIGINS=https://pos.example.com,https://admin.example.com
```

**⚠️ WARNING**: If not set, CORS will reject all cross-origin requests

---

#### 3. STRIPE_SECRET_KEY
**Purpose**: Payment processing (REQUIRED for card payments)

**Get Key**: https://dashboard.stripe.com/apikeys

**Development** (test mode):
```bash
STRIPE_SECRET_KEY=sk_test_51ABC...
```

**Production** (live mode):
```bash
STRIPE_SECRET_KEY=sk_live_51ABC...
```

**⚠️ IMPORTANT NOTES**:
- Cash payments work without Stripe configuration
- Card payments will fail if STRIPE_SECRET_KEY is not set
- System logs warning on startup if Stripe is not configured
- Use test mode keys (sk_test_) for development/testing
- Never commit API keys to version control
- See `docs/STRIPE_SETUP.md` for detailed setup guide

**Features Implemented**:
- ✅ Payment authorization (reserve funds)
- ✅ Payment capture (complete transaction)
- ✅ Payment void/refund (compensation)
- ✅ Automatic retry logic (3 retries, 30s timeout)
- ✅ User-friendly error messages
- ✅ Card details storage (brand, last4 for receipts)
- ✅ PCI-DSS compliant (no card data on server)

---

### Optional Variables

#### Monitoring & APM (Application Performance Monitoring)

##### Sentry Integration (Optional - Recommended for Production)
**Purpose**: Error tracking and performance monitoring

```bash
# Sentry DSN (get from https://sentry.io)
SENTRY_DSN=https://your-key@sentry.io/project-id

# Environment (development, staging, production)
SENTRY_ENVIRONMENT=production

# Release version (optional - helps track which version has issues)
SENTRY_RELEASE=1.0.0

# Traces sample rate (0.0 to 1.0)
# 1.0 = track 100% of requests (development)
# 0.1 = track 10% of requests (production)
SENTRY_TRACES_SAMPLE_RATE=1.0

# Profiles sample rate (0.0 to 1.0)
# 1.0 = profile 100% of requests (development)
# 0.01 = profile 1% of requests (production)
SENTRY_PROFILES_SAMPLE_RATE=1.0
```

**Features:**
- ✅ Automatic error tracking with stack traces
- ✅ Performance monitoring (request/query timing)
- ✅ User context tracking
- ✅ Breadcrumb tracking for debugging
- ✅ Automatic sensitive data filtering
- ✅ Release tracking
- ✅ Profiling integration

**⚠️ IMPORTANT:**
- Sentry is optional - application works without it
- Enables advanced error tracking and APM
- Free tier available for small projects
- Lower sample rates in production to reduce costs
- See `docs/C009_QUICK_REFERENCE.md` for setup guide

**Built-in Monitoring (Always Enabled):**
- ✅ Performance tracking (requests, database queries)
- ✅ Metrics collection (counters, gauges, histograms)
- ✅ Slow request/query detection
- ✅ Prometheus-compatible metrics export
- ✅ API endpoints: `/monitoring/performance`, `/monitoring/metrics`

---

#### Redis Configuration

##### Standalone Mode (Default)
**Purpose**: Single Redis instance for caching

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password  # Optional
```

##### Sentinel Mode (High Availability - Recommended for Production)
**Purpose**: Redis with automatic failover using Sentinel

```bash
# Enable Sentinel
REDIS_SENTINEL_ENABLED=true

# Master name (configured in Sentinel)
REDIS_SENTINEL_MASTER_NAME=mymaster

# Sentinel nodes (minimum 3 for quorum)
REDIS_SENTINELS=sentinel1:26379,sentinel2:26379,sentinel3:26379

# Optional: Redis password
REDIS_PASSWORD=your_redis_password

# Optional: Sentinel password
REDIS_SENTINEL_PASSWORD=your_sentinel_password
```

**Features**:
- ✅ Automatic failover detection and handling
- ✅ Minimum 3 Sentinel nodes for high availability
- ✅ Master-replica replication
- ✅ Zero downtime during failovers
- ✅ Comprehensive health monitoring
- ✅ In-memory fallback if Redis unavailable

**⚠️ IMPORTANT**: 
- Redis is optional - application works without it
- In-memory cache fallback if Redis unavailable
- Sentinel requires minimum 3 nodes for quorum
- See `docs/C008_QUICK_REFERENCE.md` for setup guide

---

#### JWT_SECRET
**Status**: **Auto-generated in development, REQUIRED in production**

**Development/Test:**
- If not set, a secure random secret is auto-generated
- Secret changes on each restart
- Warning logged to console

**Production:**
- MUST be explicitly set
- Application will not start if missing or using default value
- Minimum 32 characters recommended

**Generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Set in .env:**
```bash
JWT_SECRET=<generated-secret>
```

**⚠️ IMPORTANT**: 
- Never use the default value "your-secret-key-change-in-production"
- Use different secrets for dev/staging/prod
- Keep secret secure (password manager, secrets vault)

#### DATABASE_URL
**REQUIRED**: PostgreSQL connection string
**Production**: PostgreSQL with connection pooling

```bash
# Development
DATABASE_URL=postgresql://liquor_pos:password@localhost:5432/liquor_pos

# Production (with connection pooling)
DATABASE_URL=postgresql://liquor_pos:password@prod-host:5432/liquor_pos?connection_limit=20&pool_timeout=10
```

**⚠️ IMPORTANT**: 
- SQLite is no longer supported (migrated to PostgreSQL)
- PostgreSQL is required for concurrent writes and scalability
- See `docs/POSTGRESQL_MIGRATION_GUIDE.md` for setup instructions

---

#### Connection Pool Configuration (Optional)

**Purpose**: Fine-tune database connection pooling for optimal performance

```bash
# Minimum connections in pool (default: 2 dev, 5 prod)
DATABASE_POOL_MIN=2

# Maximum connections in pool (default: 10 dev, 20 prod)
DATABASE_POOL_MAX=20

# Idle connection timeout in milliseconds (default: 10000 dev, 30000 prod)
DATABASE_POOL_IDLE_TIMEOUT=30000

# Connection timeout in milliseconds (default: 5000 dev, 10000 prod)
DATABASE_POOL_CONNECTION_TIMEOUT=10000
```

**Default Values by Environment**:

| Environment | Min | Max | Idle Timeout | Connection Timeout |
|-------------|-----|-----|--------------|-------------------|
| Development | 2   | 10  | 10s          | 5s                |
| Test        | 1   | 5   | 5s           | 3s                |
| Production  | 5   | 20  | 30s          | 10s               |

**⚠️ IMPORTANT**:
- Pool size is automatically configured based on NODE_ENV
- Override defaults only if you have specific requirements
- Too many connections can overwhelm PostgreSQL
- Too few connections can cause request queuing
- Monitor pool metrics at `/health` endpoint

---

## Quick Start

1. **Copy example file**:
   ```bash
   cp .env.example .env
   ```

2. **Generate encryption key**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. **Update .env**:
   ```bash
   AUDIT_LOG_ENCRYPTION_KEY=<generated-key>
   ALLOWED_ORIGINS=http://localhost:5173
   STRIPE_SECRET_KEY=sk_test_your_key
   ```

4. **Run migrations**:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start application**:
   ```bash
   npm run dev
   ```

---

## Verification

### Automatic Validation at Startup

The application now validates all environment variables automatically when it starts. You'll see one of these outcomes:

### ✅ Success (All Required Variables Set)
```bash
$ npm run start:dev

[Bootstrap] Validating environment configuration...
[ConfigValidationService] ⚠️  Environment Configuration Warnings:
[ConfigValidationService]   1. STRIPE_SECRET_KEY not configured. Card payments will fail...
[ConfigValidationService] ✅ Environment configuration validated successfully
[Bootstrap] Environment validation complete
[Bootstrap] 🚀 Application is running on: http://localhost:3000
```

### ❌ Failure (Missing Required Variables)
```bash
$ npm run start:dev

[Bootstrap] Validating environment configuration...
[ConfigValidationService] ❌ Environment Configuration Errors:
[ConfigValidationService]   1. AUDIT_LOG_ENCRYPTION_KEY is required. Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
[ConfigValidationService]   2. ALLOWED_ORIGINS is required for CORS. Set to comma-separated list...
[Bootstrap] ❌ Application failed to start
[Bootstrap] Environment validation failed with 2 error(s). Please fix the above errors and restart the application.
```

### What Gets Validated

| Variable | Validation | Failure Behavior |
|----------|------------|------------------|
| AUDIT_LOG_ENCRYPTION_KEY | Required, 32 bytes, base64 | ❌ App won't start |
| ALLOWED_ORIGINS | Required, valid URLs | ❌ App won't start |
| JWT_SECRET | Auto-gen in dev, required in prod | ❌ App won't start (prod only) |
| STRIPE_SECRET_KEY | Format check (sk_test_/sk_live_) | ⚠️ Warning only |
| DATABASE_URL | Optional | ⚠️ Warning only |
| REDIS_URL | Optional | ⚠️ Warning only |
| PORT | Valid range (1-65535) | ❌ App won't start if invalid |
| SSL_KEY_PATH/SSL_CERT_PATH | File existence | ⚠️ Warning in production |

---

## Troubleshooting

### "AUDIT_LOG_ENCRYPTION_KEY is required"

**Fix:**
```bash
# Generate key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Add to .env
AUDIT_LOG_ENCRYPTION_KEY=<generated-key>
```

### "ALLOWED_ORIGINS is required"

**Fix:**
```bash
# Add to .env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

### "JWT_SECRET must be explicitly set in production"

**Fix:**
```bash
# Generate secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Add to .env
JWT_SECRET=<generated-secret>
```

### "STRIPE_SECRET_KEY not configured"

This is a warning, not an error. Cash payments will work without Stripe.

**To enable card payments:**
```bash
# Get key from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_your_key
```

---

## Security Best Practices

1. **Never commit `.env` to git** (already in `.gitignore`)
2. **Use different keys per environment** (dev/staging/prod)
3. **Rotate encryption keys periodically** (annually recommended)
   - See `docs/ENCRYPTION_KEY_MANAGEMENT.md` for rotation procedure
   - Use `npm run rotate-key` script for automated re-encryption
4. **Store production keys in secrets manager** (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
5. **Backup encryption key securely** (losing it = permanent data loss)
   - Multiple backup locations recommended
   - Test recovery procedure quarterly
6. **Use strong JWT secrets** (32+ characters or base64-encoded 32 bytes)
7. **Never use default secrets** (validation will reject them)
8. **Document key operations** (generation, rotation, recovery)
9. **Restrict key access** (principle of least privilege)
10. **Test disaster recovery** (key loss scenario)

---

## Logging Configuration (Optional)

### LOG_LEVEL
**Purpose**: Control logging verbosity  
**Options**: `debug`, `info`, `warn`, `error`  
**Default**: `info`

**Development**:
```bash
LOG_LEVEL=debug
```

**Production**:
```bash
LOG_LEVEL=info  # or warn/error for less verbose logs
```

### LOG_DIR
**Purpose**: Directory for log files (production only)  
**Default**: `logs`

**Production**:
```bash
LOG_DIR=/var/log/liquor-pos
```

**Features**:
- ✅ Structured JSON logging in production
- ✅ Human-readable console logs in development
- ✅ Automatic log rotation (daily, max 20MB per file)
- ✅ Separate error logs (30-day retention)
- ✅ Combined logs (14-day retention)
- ✅ Request correlation IDs for tracing
- ✅ Contextual metadata (user, IP, duration, etc.)

---

## What's New in v3.0

### ✅ Structured Logging with Winston
- JSON logs for production (easy aggregation)
- Human-readable logs for development
- Automatic log rotation with daily files
- Separate error and combined log files
- Log level filtering (debug/info/warn/error)

### ✅ Request Correlation IDs
- Unique ID per request for tracing
- Automatically included in all logs
- Returned in `X-Correlation-Id` header
- Supports distributed tracing

### ✅ Contextual Metadata
- Every log includes context (service name)
- Request logs include: method, path, status, duration, user, IP
- Error logs include stack traces
- Structured metadata for easy filtering

---

## What's New in v2.0

### ✅ Centralized Environment Validation
- All variables validated at startup
- Fail-fast with clear error messages
- Helpful fix commands included

### ✅ Auto-Generated JWT Secrets
- Secure random secrets in development
- No more default weak secrets
- Explicit requirement in production

### ✅ Improved Error Messages
- Exact commands to fix issues
- Links to documentation
- Categorized as errors vs warnings

### ✅ Format Validation
- URL validation for ALLOWED_ORIGINS
- Base64 validation for encryption keys
- Stripe key format validation
- Port range validation

---

## Migration from v1.0

If upgrading from a previous version:

1. **JWT_SECRET** is now auto-generated in development
   - Remove from .env if in dev/test
   - Keep in .env for production

2. **Validation is automatic**
   - No code changes needed
   - Application will guide you if variables missing

3. **New validation service**
   - See `backend/src/common/config-validation.service.ts`
   - 30 unit tests ensure reliability
