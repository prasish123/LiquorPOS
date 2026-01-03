# Configuration Guide

## Environment Variables

All environment variables are validated at startup. The application will fail fast with clear error messages if required variables are missing or invalid.

---

## Required Variables

### AUDIT_LOG_ENCRYPTION_KEY

**Purpose:** Encrypts sensitive data in audit logs (customer IDs, age verification, payment details)

**Generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Example:**
```bash
AUDIT_LOG_ENCRYPTION_KEY=qVvLhfcDvgh42nScKjTaNQl1mcjXYlFE8apAvBVaII0=
```

**⚠️ CRITICAL:**
- **Backup this key securely** (password manager, secrets vault, key management service)
- **Losing this key means permanent data loss** - audit logs cannot be decrypted
- **7-year retention requirement** for liquor sales records (compliance)
- Use different keys for dev/staging/production

---

### ALLOWED_ORIGINS

**Purpose:** CORS configuration for allowed frontend origins

**Format:** Comma-separated list of URLs (no trailing slashes)

**Development:**
```bash
ALLOWED_ORIGINS=http://localhost:5173
```

**Production:**
```bash
ALLOWED_ORIGINS=https://pos.example.com,https://admin.example.com
```

---

### DATABASE_URL

**Purpose:** PostgreSQL connection string

**Format:**
```bash
DATABASE_URL=postgresql://username:password@host:port/database
```

**Development:**
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/liquor_pos
```

**Production:**
```bash
DATABASE_URL=postgresql://user:pass@prod-host:5432/liquor_pos?sslmode=require
```

---

## Optional Variables

### Payment Processing

#### STRIPE_SECRET_KEY

**Purpose:** Payment processing (REQUIRED for card payments)

**Get Key:** https://dashboard.stripe.com/apikeys

**Development (test mode):**
```bash
STRIPE_SECRET_KEY=sk_test_51ABC...
```

**Production (live mode):**
```bash
STRIPE_SECRET_KEY=sk_live_51ABC...
```

**Notes:**
- Cash payments work without Stripe configuration
- Card payments will fail if not set
- Use test mode keys (`sk_test_`) for development
- Never commit API keys to version control

---

### Caching & Performance

#### REDIS_URL

**Purpose:** Redis connection for caching and session management

**Format:**
```bash
REDIS_URL=redis://host:port
```

**Example:**
```bash
REDIS_URL=redis://localhost:6379
```

**Notes:**
- Optional - system has in-memory fallback
- Recommended for production
- Improves performance significantly

---

### Monitoring & Logging

#### SENTRY_DSN

**Purpose:** Error tracking and monitoring

**Get DSN:** https://sentry.io/settings/projects/

**Example:**
```bash
SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/123456
```

**Notes:**
- Optional but highly recommended for production
- Provides real-time error tracking
- Includes performance monitoring

#### LOG_LEVEL

**Purpose:** Control logging verbosity

**Options:** `error`, `warn`, `info`, `debug`, `verbose`

**Default:** `info`

**Example:**
```bash
LOG_LEVEL=debug  # Development
LOG_LEVEL=warn   # Production
```

---

### Authentication

#### JWT_SECRET

**Purpose:** JWT token signing

**Generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Example:**
```bash
JWT_SECRET=your-secret-key-here
```

**Notes:**
- Auto-generated in development if not provided
- MUST be set explicitly in production
- Keep secure and backed up

#### JWT_EXPIRATION

**Purpose:** JWT token expiration time

**Default:** `8h`

**Example:**
```bash
JWT_EXPIRATION=8h   # 8 hours
JWT_EXPIRATION=30d  # 30 days
```

---

### Application Settings

#### NODE_ENV

**Purpose:** Environment mode

**Options:** `development`, `production`, `test`

**Example:**
```bash
NODE_ENV=production
```

#### PORT

**Purpose:** Server port

**Default:** `3000`

**Example:**
```bash
PORT=3000
```

---

## Configuration Files

### Development (.env)

```bash
# Required
AUDIT_LOG_ENCRYPTION_KEY=<generated-key>
ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=postgresql://postgres:password@localhost:5432/liquor_pos

# Optional
STRIPE_SECRET_KEY=sk_test_...
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
```

### Production (.env.production)

```bash
# Required
NODE_ENV=production
AUDIT_LOG_ENCRYPTION_KEY=<generated-key>
ALLOWED_ORIGINS=https://yourdomain.com
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
JWT_SECRET=<generated-secret>

# Payment
STRIPE_SECRET_KEY=sk_live_...

# Performance
REDIS_URL=redis://prod-redis:6379

# Monitoring
SENTRY_DSN=https://...
LOG_LEVEL=warn
```

---

## Security Best Practices

### Key Management

1. **Never commit secrets to version control**
   - Use `.env` files (already in `.gitignore`)
   - Use environment variables in CI/CD
   - Use secrets management services (AWS Secrets Manager, HashiCorp Vault)

2. **Backup encryption keys**
   - Store in 2+ secure locations
   - Use password manager (1Password, LastPass)
   - Document key rotation procedure

3. **Rotate keys regularly**
   ```bash
   npm run rotate-key
   ```

### CORS Configuration

1. **Development:** Allow localhost only
   ```bash
   ALLOWED_ORIGINS=http://localhost:5173
   ```

2. **Production:** Specify exact domains
   ```bash
   ALLOWED_ORIGINS=https://pos.example.com,https://admin.example.com
   ```

3. **Never use wildcards in production:**
   ❌ `ALLOWED_ORIGINS=*`

### Database Security

1. **Use SSL in production:**
   ```bash
   DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
   ```

2. **Use strong passwords:**
   - Minimum 16 characters
   - Mix of letters, numbers, symbols
   - Unique per environment

3. **Limit database user permissions:**
   - Grant only necessary permissions
   - Use separate users for migrations vs runtime

---

## Validation

### Check Configuration

The application validates all environment variables at startup. You'll see clear error messages if anything is missing or invalid.

### Manual Validation

```bash
# Check all required variables are set
grep -E "AUDIT_LOG_ENCRYPTION_KEY|DATABASE_URL|ALLOWED_ORIGINS" backend/.env

# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Test Redis connection (if configured)
redis-cli -u $REDIS_URL ping
```

---

## Troubleshooting

### "Environment variable required" error

1. Check `.env` file exists in `backend/` directory
2. Verify variable is set: `grep VARIABLE_NAME backend/.env`
3. Ensure no extra spaces or quotes
4. Restart server after changes

### "Invalid encryption key format" error

1. Key must be base64-encoded
2. Generate new key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

### "Database connection failed" error

1. Check PostgreSQL is running: `pg_isready`
2. Verify connection string format
3. Test connection: `psql $DATABASE_URL`
4. Check firewall/network settings

### "CORS error" in browser

1. Verify `ALLOWED_ORIGINS` includes frontend URL
2. No trailing slashes in URLs
3. Use exact protocol (http vs https)
4. Restart backend after changes

---

## Environment-Specific Configuration

### Development

- Use `.env` file
- Enable debug logging
- Use test Stripe keys
- Local PostgreSQL and Redis

### Staging

- Use `.env.staging` file
- Enable info logging
- Use test Stripe keys
- Cloud PostgreSQL and Redis
- Enable Sentry

### Production

- Use environment variables (not files)
- Enable warn/error logging only
- Use live Stripe keys
- Cloud PostgreSQL with SSL
- Cloud Redis with TLS
- Enable Sentry
- Enable automated backups

---

## Next Steps

- **Setup:** See [Setup Guide](setup.md)
- **Deployment:** See [Deployment Guide](deployment.md)
- **Architecture:** See [Architecture Overview](architecture.md)

