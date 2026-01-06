# Environment Variables Documentation

**Complete reference for all environment variables used in the Liquor POS system.**

---

## Quick Setup

```bash
# 1. Create .env file
cp ENV_TEMPLATE.txt .env

# 2. Generate secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('AUDIT_LOG_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"

# 3. Fill in Stripe keys and other values
# 4. Run: docker-compose up
```

---

## Required Variables (CRITICAL)

These MUST be set or the application will fail to start:

| Variable | Description | How to Generate | Example |
|----------|-------------|-----------------|---------|
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | `a1b2c3d4...` (128 chars) |
| `AUDIT_LOG_ENCRYPTION_KEY` | Encryption key for audit logs (32 bytes base64) | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` | `ZGV2LWVuY3J5cHRpb24...=` |
| `DATABASE_URL` | PostgreSQL connection string | Manual | `postgresql://user:pass@localhost:5432/db` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | Manual | `http://localhost:5173,http://localhost` |

---

## Database Configuration

### PostgreSQL

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_NAME` | No | `liquor_pos` | Database name |
| `DB_USER` | No | `postgres` | Database user |
| `DB_PASSWORD` | **YES** | - | Database password |
| `DB_HOST` | No | `localhost` | Database host |
| `DB_PORT` | No | `5432` | Database port |
| `DATABASE_URL` | **YES** | - | Full connection string (auto-constructed in docker-compose) |

### Connection Pool (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_POOL_MIN` | `2` | Minimum connections in pool |
| `DATABASE_POOL_MAX` | `10` | Maximum connections in pool |
| `DATABASE_POOL_IDLE_TIMEOUT` | `10000` | Idle timeout (ms) |
| `DATABASE_POOL_CONNECTION_TIMEOUT` | `2000` | Connection timeout (ms) |

---

## Redis Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | No | `localhost` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | - | Redis password (recommended in production) |
| `REDIS_URL` | No | - | Full connection string (auto-constructed) |

---

## Security & Authentication

| Variable | Required | Description | Used In |
|----------|----------|-------------|---------|
| `JWT_SECRET` | **YES** | JWT signing secret (min 32 chars) | `auth.service.ts`, `jwt.strategy.ts` |
| `AUDIT_LOG_ENCRYPTION_KEY` | **YES** | Audit log encryption key (32 bytes base64) | `encryption.service.ts` |
| `ALLOWED_ORIGINS` | **YES** | CORS allowed origins | `main.ts` |
| `SESSION_SECRET` | No | Cookie session secret | `main.ts` |
| `COOKIE_DOMAIN` | No | Cookie domain | `main.ts` |

---

## Payment Processing (Stripe)

| Variable | Required | Description | Used In |
|----------|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | **YES*** | Stripe secret key (sk_test_ or sk_live_) | `payment.service.ts` |
| `STRIPE_PUBLISHABLE_KEY` | **YES*** | Stripe publishable key (pk_test_ or pk_live_) | Frontend |
| `STRIPE_WEBHOOK_SECRET` | **YES*** | Webhook signature secret (whsec_) | `stripe-webhook.service.ts` |

\* Required for card payments. Cash-only mode works without Stripe.

---

## Error Tracking & Monitoring

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENTRY_DSN` | No | - | Sentry project DSN |
| `SENTRY_ENVIRONMENT` | No | `production` | Environment name |
| `SENTRY_TRACES_SAMPLE_RATE` | No | `0.1` | Trace sampling rate (0.0-1.0) |

---

## AI Features (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No | - | OpenAI API key (sk-...) |
| `OPENAI_MODEL` | No | `gpt-4` | Model to use (gpt-4, gpt-3.5-turbo) |

---

## Application Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment (development, production, test) |
| `PORT` | `3000` | Backend API port |
| `BACKEND_PORT` | `3000` | Backend port (docker-compose) |
| `FRONTEND_PORT` | `80` | Frontend port (docker-compose) |

---

## Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Log level (error, warn, info, debug) |
| `LOG_FILE_PATH` | `./logs` | Log file directory |

---

## Frontend Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | **YES** | Backend API URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | No | Stripe publishable key |

---

## Backup & Recovery

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_RETENTION_DAYS` | `30` | Days to keep backups |
| `BACKUP_SCHEDULE` | `0 2 * * *` | Cron schedule (daily at 2 AM) |

---

## Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_TTL` | `60` | Time window (seconds) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |

---

## Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_OFFLINE_MODE` | `true` | Enable offline functionality |
| `ENABLE_AI_FEATURES` | `false` | Enable AI-powered features |
| `ENABLE_RECEIPT_PRINTING` | `true` | Enable receipt printing |

---

## SSL/TLS (Production)

| Variable | Required | Description |
|----------|----------|-------------|
| `SSL_KEY_PATH` | No | Path to SSL private key |
| `SSL_CERT_PATH` | No | Path to SSL certificate |

---

## Environment-Specific Values

### Development

```bash
NODE_ENV=development
DB_PASSWORD=dev
REDIS_PASSWORD=
JWT_SECRET=dev-jwt-secret-change-in-production-min-32-chars
AUDIT_LOG_ENCRYPTION_KEY=ZGV2LWVuY3J5cHRpb24ta2V5LTMyLWNoYXJzISE=
STRIPE_SECRET_KEY=sk_test_...
LOG_LEVEL=debug
```

### Production

```bash
NODE_ENV=production
DB_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
JWT_SECRET=<64-byte-hex>
AUDIT_LOG_ENCRYPTION_KEY=<32-byte-base64>
STRIPE_SECRET_KEY=sk_live_...
LOG_LEVEL=info
SENTRY_DSN=https://...
```

---

## Validation

The application validates all critical environment variables at startup using `ConfigValidationService`:

- ✅ Checks required variables are present
- ✅ Validates format (e.g., Stripe keys start with sk_test_ or sk_live_)
- ✅ Warns about missing optional variables
- ✅ Fails fast if critical variables are invalid

See: `backend/src/common/config-validation.service.ts`

---

## Security Best Practices

1. **Never commit .env files** - They're in `.gitignore` for a reason
2. **Use strong passwords** - Generate with `openssl rand -base64 32`
3. **Rotate secrets regularly** - Especially JWT_SECRET and encryption keys
4. **Use test keys in development** - Never use live Stripe keys locally
5. **Restrict CORS origins** - Only allow your actual domains in production
6. **Enable Sentry in production** - Catch errors before users report them

---

## Troubleshooting

### "AUDIT_LOG_ENCRYPTION_KEY is required"
**Solution:** Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

### "JWT_SECRET must be at least 32 characters"
**Solution:** Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### "DATABASE_URL is required"
**Solution:** Set `DATABASE_URL=postgresql://user:password@localhost:5432/liquor_pos`

### "STRIPE_SECRET_KEY has unexpected format"
**Solution:** Ensure it starts with `sk_test_` (test) or `sk_live_` (production)

### "STRIPE_SECRET_KEY is in test mode but NODE_ENV is production"
**Solution:** Use `sk_live_` key in production, not `sk_test_`

---

## Complete Example

See `ENV_TEMPLATE.txt` in the project root for a complete, copy-paste-ready template.

