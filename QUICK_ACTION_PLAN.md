# Quick Action Plan - Production Deployment
## Step-by-Step Guide to Go Live

**Estimated Time:** 4-8 hours  
**Difficulty:** Medium  
**Prerequisites:** Access to production server, Stripe account

---

## Phase 1: Generate Secrets (30 minutes)

### Step 1.1: Generate Encryption Key
```bash
# Generate 32-byte base64 key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Example output:
# Xk7v9w$2B5E8H@KbPeShVmYq3t6w9z$C&F)J@NcRfUjX

# ⚠️ SAVE THIS - You'll need it for AUDIT_LOG_ENCRYPTION_KEY
```

### Step 1.2: Generate JWT Secret
```bash
# Generate 32-byte base64 key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Example output:
# A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2

# ⚠️ SAVE THIS - You'll need it for JWT_SECRET
```

### Step 1.3: Backup Keys Securely

**Option A: AWS Secrets Manager**
```bash
# Install AWS CLI if not already installed
# Configure: aws configure

# Store encryption key
aws secretsmanager create-secret \
  --name liquor-pos/audit-encryption-key \
  --description "Audit log encryption key" \
  --secret-string "YOUR_ENCRYPTION_KEY"

# Store JWT secret
aws secretsmanager create-secret \
  --name liquor-pos/jwt-secret \
  --description "JWT signing secret" \
  --secret-string "YOUR_JWT_SECRET"
```

**Option B: Manual Backup**
```bash
# Create encrypted backup file
cat > keys-backup.txt << EOF
AUDIT_LOG_ENCRYPTION_KEY=YOUR_ENCRYPTION_KEY
JWT_SECRET=YOUR_JWT_SECRET
Generated: $(date)
EOF

# Encrypt with GPG
gpg --symmetric --armor keys-backup.txt

# Store keys-backup.txt.asc in:
# 1. Password manager (1Password, LastPass, etc.)
# 2. Encrypted USB drive in safe
# 3. Secure cloud storage (separate from application)

# Delete plaintext file
shred -u keys-backup.txt
```

**✅ Checkpoint:** Keys generated and backed up in 2+ locations

---

## Phase 2: Get Stripe API Key (15 minutes)

### Step 2.1: Sign Up for Stripe
1. Go to https://stripe.com
2. Click "Start now" or "Sign up"
3. Complete registration
4. Verify email

### Step 2.2: Get Live API Key
1. Go to https://dashboard.stripe.com/apikeys
2. Click "Reveal live key" for "Secret key"
3. Copy the key (starts with `sk_live_`)
4. Save securely (same backup locations as other keys)

### Step 2.3: Test Mode Key (for staging)
1. In same dashboard, copy "Test mode" secret key
2. Starts with `sk_test_`
3. Use this for staging environment

**✅ Checkpoint:** Have both test and live Stripe keys

---

## Phase 3: Configure Production Environment (30 minutes)

### Step 3.1: Create Production .env File

```bash
# SSH into production server
ssh user@your-production-server

# Navigate to backend directory
cd /path/to/liquor-pos/backend

# Create .env.production file
nano .env.production
```

### Step 3.2: Add Required Variables

```bash
# ============================================
# REQUIRED VARIABLES
# ============================================

# Environment
NODE_ENV=production

# Encryption (use generated key from Phase 1)
AUDIT_LOG_ENCRYPTION_KEY=YOUR_ENCRYPTION_KEY_HERE

# CORS (replace with your actual domain)
ALLOWED_ORIGINS=https://pos.yourdomain.com,https://admin.yourdomain.com

# Database (replace with your PostgreSQL connection string)
DATABASE_URL=postgresql://username:password@host:5432/database_name?connection_limit=20&pool_timeout=10

# JWT (use generated secret from Phase 1)
JWT_SECRET=YOUR_JWT_SECRET_HERE

# Stripe (use live key from Phase 2)
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_KEY_HERE

# ============================================
# OPTIONAL BUT RECOMMENDED
# ============================================

# Redis (if using)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Redis Sentinel (for high availability)
# REDIS_SENTINEL_ENABLED=true
# REDIS_SENTINEL_MASTER_NAME=mymaster
# REDIS_SENTINELS=sentinel1:26379,sentinel2:26379,sentinel3:26379

# Sentry (error tracking)
# SENTRY_DSN=https://your-key@sentry.io/project-id
# SENTRY_ENVIRONMENT=production
# SENTRY_TRACES_SAMPLE_RATE=0.1
# SENTRY_PROFILES_SAMPLE_RATE=0.01

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log/liquor-pos

# ============================================
# CONNECTION POOL (optional tuning)
# ============================================
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_POOL_IDLE_TIMEOUT=30000
DATABASE_POOL_CONNECTION_TIMEOUT=10000
```

### Step 3.3: Secure the .env File

```bash
# Set restrictive permissions (owner read/write only)
chmod 600 .env.production

# Verify permissions
ls -l .env.production
# Should show: -rw------- (600)

# Verify owner
# Should be the user running the application
```

**✅ Checkpoint:** Production environment configured

---

## Phase 4: Setup Database (30 minutes)

### Step 4.1: Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres -h your-db-host

# Create database
CREATE DATABASE liquor_pos;

# Create user (if needed)
CREATE USER liquor_pos_user WITH PASSWORD 'secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE liquor_pos TO liquor_pos_user;

# Exit
\q
```

### Step 4.2: Run Migrations

```bash
# Navigate to backend
cd /path/to/liquor-pos/backend

# Install dependencies (if not already done)
npm install

# Run migrations
npm run migrate:deploy

# Expected output:
# Applying migration `20240101000000_init`
# Applying migration `20240102000000_add_audit_logs`
# ...
# ✅ All migrations applied successfully
```

### Step 4.3: Generate Prisma Client

```bash
# Generate Prisma client
npx prisma generate

# Expected output:
# ✔ Generated Prisma Client
```

### Step 4.4: Seed Database (Optional)

```bash
# Seed with initial data (products, users, locations)
npm run seed

# Expected output:
# ✅ Seeded 50 products
# ✅ Seeded 3 users
# ✅ Seeded 2 locations
```

**✅ Checkpoint:** Database ready

---

## Phase 5: Deploy Application (1 hour)

### Step 5.1: Build Application

```bash
# Navigate to backend
cd /path/to/liquor-pos/backend

# Build TypeScript
npm run build

# Expected output:
# ✓ Compiled successfully
# dist/ folder created
```

### Step 5.2: Start Application

**Option A: Direct Start**
```bash
# Start production server
NODE_ENV=production npm run start:prod

# Expected output:
# [Bootstrap] Validating environment configuration...
# [ConfigValidationService] ✅ Environment configuration validated successfully
# [Bootstrap] 🚀 Application is running on: http://localhost:3000
```

**Option B: PM2 (Recommended)**
```bash
# Install PM2 globally (if not already)
npm install -g pm2

# Start with PM2
pm2 start npm --name "liquor-pos" -- run start:prod

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions printed

# Check status
pm2 status

# View logs
pm2 logs liquor-pos
```

**Option C: Docker**
```bash
# Build Docker image
docker build -t liquor-pos-backend .

# Run container
docker run -d \
  --name liquor-pos \
  --env-file .env.production \
  -p 3000:3000 \
  liquor-pos-backend

# Check logs
docker logs -f liquor-pos
```

**✅ Checkpoint:** Application running

---

## Phase 6: Verify Deployment (30 minutes)

### Step 6.1: Health Check

```bash
# Check health endpoint
curl http://localhost:3000/health | jq

# Expected output:
# {
#   "status": "ok",
#   "info": {
#     "database": { "status": "up" },
#     "redis": { "status": "up" },
#     "memory_heap": { "status": "up" },
#     "memory_rss": { "status": "up" },
#     "disk": { "status": "up" }
#   }
# }
```

### Step 6.2: Test Database Connection

```bash
# Check database connectivity
curl http://localhost:3000/health | jq '.info.database'

# Should show: { "status": "up" }
```

### Step 6.3: Test Authentication

```bash
# Login (replace with actual credentials from seeding)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# Expected output:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "id": "...",
#     "username": "admin",
#     "role": "ADMIN"
#   }
# }

# Save the access_token for next tests
export TOKEN="your_access_token_here"
```

### Step 6.4: Test Payment Processing

```bash
# Test Stripe connection (use test card in staging)
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "locationId": "your-location-id",
    "items": [
      {
        "sku": "TEST-001",
        "quantity": 1,
        "priceAtSale": 19.99
      }
    ],
    "subtotal": 19.99,
    "tax": 1.40,
    "total": 21.39,
    "paymentMethod": "card"
  }'

# Expected: Order created successfully
# Check Stripe dashboard for payment
```

**✅ Checkpoint:** All systems operational

---

## Phase 7: Staging Testing (2-3 hours)

### Critical Test Cases:

#### Test 1: Cash Payment
```bash
# Create order with cash payment
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "locationId": "LOC-001",
    "items": [{"sku": "WINE-001", "quantity": 1, "priceAtSale": 19.99}],
    "subtotal": 19.99,
    "tax": 1.40,
    "total": 21.39,
    "paymentMethod": "cash"
  }'

# ✅ Should succeed
# ✅ Inventory should decrement
# ✅ Audit log should be created
```

#### Test 2: Card Payment (Test Card)
```bash
# Use Stripe test card: 4242 4242 4242 4242
# Same request as Test 1, but with paymentMethod: "card"

# ✅ Should succeed
# ✅ Check Stripe dashboard for payment
```

#### Test 3: Age Verification (Alcohol)
```bash
# Create order with alcohol (ageRestricted: true)
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "locationId": "LOC-001",
    "items": [{"sku": "VODKA-001", "quantity": 1, "priceAtSale": 29.99}],
    "subtotal": 29.99,
    "tax": 2.10,
    "total": 32.09,
    "paymentMethod": "cash",
    "ageVerified": true
  }'

# ✅ Should succeed with ageVerified: true
# ❌ Should fail with ageVerified: false or missing
```

#### Test 4: Concurrent Transactions
```bash
# Open 2 terminals
# Run same order in both simultaneously
# Both should succeed without inventory conflicts
```

#### Test 5: Refund
```bash
# Get order ID from previous test
ORDER_ID="your-order-id"

# Request refund
curl -X POST http://localhost:3000/orders/$ORDER_ID/refund \
  -H "Authorization: Bearer $TOKEN"

# ✅ Should succeed
# ✅ Inventory should be restored
# ✅ Stripe refund should be created
```

**✅ Checkpoint:** All critical flows tested

---

## Phase 8: Production Deployment (1 hour)

### Step 8.1: Final Checklist

- [ ] All staging tests passed
- [ ] Production secrets backed up (2+ locations)
- [ ] Database backup created
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Monitoring alerts configured
- [ ] Team trained on system

### Step 8.2: Deploy to Production

```bash
# SSH into production server
ssh user@production-server

# Pull latest code
cd /path/to/liquor-pos
git pull origin main

# Install dependencies
cd backend
npm install

# Build
npm run build

# Run migrations
npm run migrate:deploy

# Restart application
pm2 restart liquor-pos

# Or if using Docker:
docker-compose down
docker-compose up -d
```

### Step 8.3: Verify Production

```bash
# Health check
curl https://api.yourdomain.com/health | jq

# Should return: { "status": "ok", ... }
```

**✅ Checkpoint:** Production deployment complete

---

## Phase 9: Post-Deployment Monitoring (First 24 Hours)

### Hour 1: Critical Monitoring

```bash
# Watch logs in real-time
pm2 logs liquor-pos --lines 100

# Or Docker:
docker logs -f liquor-pos

# Check for:
# ✅ No startup errors
# ✅ Database connections successful
# ✅ Redis connections successful (if configured)
# ✅ No authentication errors
```

### Hour 2-24: Ongoing Monitoring

**Check these metrics:**
- [ ] Error rate < 0.1%
- [ ] Response time < 200ms (p95)
- [ ] Payment success rate > 99%
- [ ] No memory leaks (check `pm2 monit`)
- [ ] No database connection pool exhaustion

**Monitor endpoints:**
```bash
# Every hour, check:
curl https://api.yourdomain.com/health
curl https://api.yourdomain.com/monitoring/metrics
```

**✅ Checkpoint:** System stable in production

---

## Troubleshooting

### Issue: "AUDIT_LOG_ENCRYPTION_KEY is required"
**Solution:**
```bash
# Check .env file exists
ls -la .env.production

# Check variable is set
grep AUDIT_LOG_ENCRYPTION_KEY .env.production

# If missing, add it and restart
nano .env.production
pm2 restart liquor-pos
```

### Issue: "Database connection failed"
**Solution:**
```bash
# Test database connection
psql $DATABASE_URL

# Check connection string format
# Should be: postgresql://user:pass@host:5432/dbname

# Check firewall allows connection
telnet db-host 5432
```

### Issue: "Stripe payment failed"
**Solution:**
```bash
# Check Stripe key is correct
grep STRIPE_SECRET_KEY .env.production

# Should start with sk_live_ for production
# Should start with sk_test_ for staging

# Check Stripe dashboard for error details
# https://dashboard.stripe.com/payments
```

### Issue: "Redis connection failed"
**Solution:**
```bash
# Check if Redis is required
# System works without Redis (in-memory fallback)

# If you want Redis, check connection:
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
# Should return: PONG

# Or remove Redis config to use in-memory fallback
```

---

## Rollback Plan

If something goes wrong:

```bash
# 1. Stop application
pm2 stop liquor-pos

# 2. Restore database backup
psql $DATABASE_URL < backup-YYYYMMDD.sql

# 3. Revert code
git checkout previous-working-commit
npm install
npm run build

# 4. Restart
pm2 restart liquor-pos

# 5. Verify
curl http://localhost:3000/health
```

---

## Success Criteria

You're ready to serve customers when:

- ✅ Health check returns 200 OK
- ✅ Can login with credentials
- ✅ Can process cash payment
- ✅ Can process card payment
- ✅ Age verification works
- ✅ Inventory decrements correctly
- ✅ Audit logs are created
- ✅ No errors in logs

---

## Next Steps After Launch

### Week 1:
- Monitor error rates daily
- Check payment success rates
- Gather user feedback
- Fix any critical issues

### Week 2:
- Optimize slow queries (if any)
- Tune connection pool settings
- Setup automated backups
- Create operations manual

### Month 1:
- Analyze usage patterns
- Plan feature enhancements
- Review security logs
- Test disaster recovery

---

## Support

**Documentation:**
- `backend/ENV_SETUP.md` - Environment setup
- `backend/docs/STRIPE_SETUP.md` - Stripe integration
- `backend/docs/ENCRYPTION_KEY_MANAGEMENT.md` - Key management
- `backend/PRE_LAUNCH_CHECKLIST_REVIEW.md` - Detailed review

**Health Monitoring:**
- `GET /health` - System health
- `GET /monitoring/metrics` - Metrics
- `GET /monitoring/performance` - Performance

**Emergency Contacts:**
- Database issues: Check PostgreSQL logs
- Payment issues: Check Stripe dashboard
- Application errors: Check `pm2 logs` or `docker logs`

---

**Estimated Total Time:** 4-8 hours  
**Difficulty:** Medium  
**Success Rate:** High (all critical features tested)

**Good luck with your launch! 🚀**


