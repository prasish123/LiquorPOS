# POS-Omni Liquor Store - Quick Start
## Get Running in 10 Minutes

---

## 🚀 Fastest Path to Running System

```bash
# 1. Clone repository
git clone <repository-url>
cd liquor-pos

# 2. Setup backend
cd backend
npm install
npm run setup:env    # Interactive wizard
npm run db:setup     # Database setup
npm run start:dev    # Start server

# 3. Setup frontend (in new terminal)
cd ../frontend
npm install
npm run dev          # Start frontend

# 4. Open browser
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

**Done!** You now have a running POS system.

---

## 📋 What You Need

### Required
- **Node.js** 18+ ([download](https://nodejs.org/))
- **PostgreSQL** 14+ ([download](https://www.postgresql.org/download/))

### Optional (Improves Experience)
- **Redis** 7+ (for caching)
- **Stripe Account** (for card payments)
- **Sentry Account** (for error tracking)

---

## 🎯 Backend Setup (5 minutes)

### Automated Setup

```bash
cd backend
npm install

# Run interactive setup wizard
npm run setup:env

# Setup database
npm run db:setup

# Start server
npm run start:dev
```

The wizard will guide you through:
- ✅ Generating encryption keys
- ✅ Configuring CORS
- ✅ Setting up database
- ✅ Configuring Stripe (optional)
- ✅ Configuring Redis (optional)

### Manual Setup (if you prefer)

```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Edit .env with your values
nano .env

# Setup database
npm run migrate:deploy
npx prisma generate
npm run seed

# Start server
npm run start:dev
```

---

## 🎨 Frontend Setup (2 minutes)

```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:3000" > .env

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

## ✅ Verify Everything Works

### Check Backend Health

```bash
cd backend
npm run health
```

Expected output:
```
✅ SYSTEM HEALTHY
All services are operational.
```

### Check Frontend

1. Open `http://localhost:5173`
2. You should see the login screen
3. Default credentials (if seeded):
   - Username: `admin`
   - Password: `admin123`

### Test a Transaction

1. Login to frontend
2. Scan or search for a product
3. Add to cart
4. Complete checkout (cash payment works without Stripe)
5. Verify inventory decremented

---

## 🔑 Important First Steps

### 1. Backup Your Encryption Key

The setup wizard generates an encryption key. **BACKUP IT NOW!**

```bash
# Your key is in backend/.env
grep AUDIT_LOG_ENCRYPTION_KEY backend/.env

# Save it in:
# - Password manager (1Password, LastPass)
# - AWS Secrets Manager
# - Encrypted USB drive in safe
```

⚠️ **Losing this key = permanent data loss**

### 2. Get Stripe API Key (Optional)

For card payments:

1. Sign up at https://stripe.com
2. Get test key from https://dashboard.stripe.com/apikeys
3. Add to `backend/.env`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_your_key_here
   ```
4. Restart backend: `npm run start:dev`

### 3. Change Default Passwords

If you seeded the database:

```bash
# Login to frontend
# Go to Settings > Users
# Change password for admin user
```

---

## 📚 Key Commands

### Backend

```bash
# Setup
npm run setup:env      # Interactive setup wizard
npm run validate:env   # Validate configuration
npm run db:setup       # Setup database
npm run health         # Check system health

# Development
npm run start:dev      # Start with watch mode
npm run build          # Build for production
npm run start:prod     # Start production server

# Database
npm run migrate:dev    # Apply migrations (dev)
npm run migrate:deploy # Apply migrations (prod)
npm run seed           # Seed database
npx prisma studio      # Open database GUI

# Testing
npm test               # Run all tests
npm run test:cov       # Coverage report
```

### Frontend

```bash
npm run dev            # Start development server
npm run build          # Build for production
npm run preview        # Preview production build
npm test               # Run tests
```

---

## 🐛 Common Issues

### "AUDIT_LOG_ENCRYPTION_KEY is required"

```bash
cd backend
npm run setup:env
# Follow the wizard
```

### "Database connection failed"

```bash
# Check PostgreSQL is running
pg_isready

# Check DATABASE_URL in backend/.env
grep DATABASE_URL backend/.env

# Should be: postgresql://user:password@localhost:5432/liquor_pos
```

### "Port 3000 already in use"

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows (find PID, then taskkill /PID <pid>)

# Or use different port
PORT=3001 npm run start:dev
```

### "Cannot connect to frontend"

```bash
# Check backend is running
curl http://localhost:3000/health

# Check CORS is configured
grep ALLOWED_ORIGINS backend/.env
# Should include: http://localhost:5173
```

---

## 📖 Next Steps

### For Development

1. **Explore API Docs**: http://localhost:3000/api
2. **View Database**: `npx prisma studio` (in backend/)
3. **Read Architecture**: `docs/architecture.md`
4. **Check Tests**: `npm test` (in backend/)

### For Production

1. **Read Pre-Launch Checklist**: `backend/PRE_LAUNCH_CHECKLIST_REVIEW.md`
2. **Review Security**: `backend/docs/STRIPE_SETUP.md`
3. **Setup Monitoring**: Configure Sentry
4. **Test Thoroughly**: Deploy to staging first

---

## 📁 Project Structure

```
liquor-pos/
├── backend/              # NestJS API server
│   ├── src/             # Source code
│   ├── prisma/          # Database schema & migrations
│   ├── scripts/         # Setup & utility scripts
│   ├── docs/            # Documentation
│   └── .env             # Configuration (create this)
│
├── frontend/            # React frontend
│   ├── src/            # Source code
│   ├── public/         # Static assets
│   └── .env            # Configuration (create this)
│
└── docs/               # Project documentation
```

---

## 🎯 Feature Checklist

After setup, you should have:

- ✅ Backend API running on port 3000
- ✅ Frontend running on port 5173
- ✅ PostgreSQL database with schema
- ✅ Sample products (if seeded)
- ✅ Admin user (if seeded)
- ✅ Health check endpoint
- ✅ API documentation (Swagger)

### Core Features Working:

- ✅ User authentication (login/logout)
- ✅ Product catalog
- ✅ Inventory management
- ✅ Checkout flow
- ✅ Cash payments
- ✅ Age verification (21+ for alcohol)
- ✅ Audit logging
- ✅ Multi-location support

### Optional Features (Need Configuration):

- ⚠️ Card payments (need Stripe key)
- ⚠️ Redis caching (need Redis server)
- ⚠️ Error tracking (need Sentry account)

---

## 🆘 Getting Help

### Documentation

- **Setup Guide**: `backend/SETUP.md` (detailed)
- **Environment Setup**: `backend/ENV_SETUP.md`
- **Stripe Setup**: `backend/docs/STRIPE_SETUP.md`
- **Key Management**: `backend/docs/ENCRYPTION_KEY_MANAGEMENT.md`
- **Pre-Launch**: `backend/PRE_LAUNCH_CHECKLIST_REVIEW.md`

### Health Checks

```bash
# Backend health
curl http://localhost:3000/health

# Or use script
cd backend && npm run health

# Validate environment
cd backend && npm run validate:env
```

### Logs

```bash
# Backend logs (console output when running npm run start:dev)
# Or if using PM2:
pm2 logs liquor-pos

# Frontend logs (browser console)
# Open DevTools (F12) in browser
```

---

## 🚀 Production Deployment

**Not ready yet?** That's okay! Development mode is perfect for testing.

**Ready for production?** Follow these guides:

1. `backend/PRE_LAUNCH_CHECKLIST_REVIEW.md` - Complete checklist
2. `SYSTEM_READINESS_SUMMARY.md` - System status
3. `QUICK_ACTION_PLAN.md` - Deployment steps

**Estimated time to production**: 4-8 hours

---

## ✨ Success!

You now have a fully functional POS system running locally!

**What you can do:**
- 🛒 Process transactions
- 📦 Manage inventory
- 👥 Manage users
- 📊 View reports
- 🔒 Age verification for alcohol
- 💳 Accept payments (cash now, cards with Stripe)

**Next steps:**
- Customize products for your store
- Configure payment processing
- Setup for production deployment
- Train your team

---

**Questions?** Check the documentation in `backend/docs/` or run `npm run health` to diagnose issues.

**Ready to launch?** Read `backend/PRE_LAUNCH_CHECKLIST_REVIEW.md`


