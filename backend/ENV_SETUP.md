# Environment Setup Guide

## Required Environment Variables

This application requires several environment variables to be configured before starting. Copy `.env.example` to `.env` and update the values.

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
- Backup this key securely (password manager, secrets vault)
- Losing this key means audit logs cannot be decrypted
- Use different keys for dev/staging/production

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

**⚠️ NOTE**: Mock payments have been removed for security. Cash payments work without Stripe.

---

### Optional Variables

#### JWT_SECRET
**Default**: Auto-generated if not set
**Recommendation**: Set explicitly for production

```bash
JWT_SECRET=your-long-random-secret-key-here
```

#### DATABASE_URL
**Default**: `file:./dev.db` (SQLite)
**Production**: Use PostgreSQL

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/liquor_pos
```

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

### Check encryption key is set:
```bash
npm run dev
```
Should NOT see: `AUDIT_LOG_ENCRYPTION_KEY environment variable is required`

### Check CORS is configured:
```bash
npm run dev
```
Should NOT see: `⚠️  WARNING: ALLOWED_ORIGINS not configured`

### Check Stripe is configured (for card payments):
Try creating an order with `paymentMethod: 'card'`
Should NOT see: `STRIPE_SECRET_KEY environment variable is required`

---

## Security Best Practices

1. **Never commit `.env` to git** (already in `.gitignore`)
2. **Use different keys per environment** (dev/staging/prod)
3. **Rotate encryption keys periodically** (requires data re-encryption)
4. **Store production keys in secrets manager** (AWS Secrets Manager, Azure Key Vault)
5. **Backup encryption key securely** (losing it = data loss)
