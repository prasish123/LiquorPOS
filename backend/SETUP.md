# Quick Setup Guide
## POS-Omni Liquor Store Backend

This guide will get you up and running in **5-10 minutes**.

---

## Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **PostgreSQL** 14+ ([download](https://www.postgresql.org/download/))
- **npm** or **yarn**

---

## Quick Start (Automated)

### Option 1: Interactive Setup Wizard (Recommended)

```bash
# 1. Clone and install
git clone <repository-url>
cd liquor-pos/backend
npm install

# 2. Run setup wizard
npm run setup:env

# 3. Setup database
npm run db:setup

# 4. Start server
npm run start:dev

# 5. Check health
npm run health
```

**Done!** Your server is running at `http://localhost:3000`

---

## Manual Setup

If you prefer manual configuration:

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Environment

```bash
# Copy example file
cp .env.example .env

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Edit .env file
nano .env
```

**Required variables:**
```bash
AUDIT_LOG_ENCRYPTION_KEY=<generated-key>
ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=postgresql://user:password@localhost:5432/liquor_pos
```

### Step 3: Setup Database

```bash
# Create database
createdb liquor_pos

# Run migrations
npm run migrate:deploy

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npm run seed
```

### Step 4: Start Server

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Step 5: Verify

```bash
# Check health
curl http://localhost:3000/health

# Or use the script
npm run health
```

---

## Available Commands

### Setup & Configuration
```bash
npm run setup:env      # Interactive environment setup wizard
npm run validate:env   # Validate environment configuration
npm run db:setup       # Complete database setup (migrate + generate + seed)
npm run health         # Check system health
```

### Development
```bash
npm run start:dev      # Start with watch mode
npm run start:debug    # Start with debugger
npm run build          # Build for production
npm run start:prod     # Start production server
```

### Database
```bash
npm run migrate:dev      # Create and apply migrations (development)
npm run migrate:deploy   # Apply migrations (production)
npm run migrate:status   # Check migration status
npm run seed             # Seed database with sample data
npx prisma studio        # Open database GUI
```

### Testing
```bash
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Generate coverage report
npm run test:e2e       # Run end-to-end tests
```

### Utilities
```bash
npm run rotate-key     # Rotate encryption key
npm run lint           # Run linter
npm run format         # Format code
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `AUDIT_LOG_ENCRYPTION_KEY` | 32-byte base64 encryption key | Generate with setup wizard |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret | Auto-generated in dev |
| `STRIPE_SECRET_KEY` | Stripe API key | None (card payments disabled) |
| `REDIS_HOST` | Redis host | None (in-memory cache) |
| `SENTRY_DSN` | Sentry error tracking | None (built-in monitoring) |
| `PORT` | Server port | `3000` |
| `LOG_LEVEL` | Logging level | `info` |

**See `.env.example` for complete list.**

---

## Troubleshooting

### "AUDIT_LOG_ENCRYPTION_KEY is required"

**Solution:**
```bash
# Generate key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Add to .env
echo "AUDIT_LOG_ENCRYPTION_KEY=<your-key>" >> .env
```

### "Database connection failed"

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql postgresql://user:password@localhost:5432/liquor_pos

# Check DATABASE_URL in .env
grep DATABASE_URL .env
```

### "Port 3000 already in use"

**Solution:**
```bash
# Use different port
PORT=3001 npm run start:dev

# Or kill process on port 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
```

### "Stripe payment failed"

**Solution:**
```bash
# Check Stripe key is set
grep STRIPE_SECRET_KEY .env

# Get key from: https://dashboard.stripe.com/apikeys
# Add to .env:
echo "STRIPE_SECRET_KEY=sk_test_..." >> .env
```

---

## Next Steps

### Development
1. **Explore API**: Open `http://localhost:3000/api` (Swagger docs)
2. **View Database**: Run `npx prisma studio`
3. **Check Logs**: Watch console output
4. **Test Endpoints**: Use Postman or curl

### Production
1. **Review**: Read `PRE_LAUNCH_CHECKLIST_REVIEW.md`
2. **Configure**: Set production environment variables
3. **Test**: Deploy to staging first
4. **Monitor**: Setup health checks and alerts

---

## Documentation

- **Environment Setup**: `ENV_SETUP.md` (detailed guide)
- **Stripe Setup**: `docs/STRIPE_SETUP.md`
- **Key Management**: `docs/ENCRYPTION_KEY_MANAGEMENT.md`
- **Pre-Launch**: `PRE_LAUNCH_CHECKLIST_REVIEW.md`
- **API Docs**: `http://localhost:3000/api` (when running)

---

## Support

### Health Endpoints
- `GET /health` - System health check
- `GET /health/backup` - Backup system status
- `GET /monitoring/metrics` - Prometheus metrics
- `GET /monitoring/performance` - Performance data

### Common Issues
- Check logs: `pm2 logs` or console output
- Validate config: `npm run validate:env`
- Test database: `npx prisma db pull`
- Check health: `npm run health`

---

## Quick Reference

```bash
# First time setup
npm install
npm run setup:env
npm run db:setup
npm run start:dev

# Daily development
npm run start:dev        # Start server
npm test                 # Run tests
npm run lint             # Check code

# Before deployment
npm run validate:env     # Validate config
npm run test:cov         # Check coverage
npm run build            # Build for production

# Production
npm run migrate:deploy   # Apply migrations
npm run start:prod       # Start server
npm run health           # Check health
```

---

**Need help?** Check the documentation or run `npm run validate:env` to diagnose issues.

**Ready to deploy?** Read `PRE_LAUNCH_CHECKLIST_REVIEW.md` for production readiness.


