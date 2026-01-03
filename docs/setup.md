# Setup Guide

## Quick Start (10 Minutes)

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **PostgreSQL** 14+ ([download](https://www.postgresql.org/download/))
- **npm** or **yarn**

### Automated Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd liquor-pos

# 2. Setup backend
cd backend
npm install
npm run migrate:deploy
npx prisma generate
npm run seed
npm run start:dev

# 3. Setup frontend (in new terminal)
cd ../frontend
npm install
npm run dev
```

**Done!** Backend runs on `http://localhost:3000`, Frontend on `http://localhost:5173`

### Default Credentials

After seeding:
- Username: `admin`
- Password: `password123`

---

## Detailed Setup

### Backend Setup

#### 1. Install Dependencies

```bash
cd backend
npm install
```

#### 2. Configure Environment

Create `backend/.env` file:

```bash
# Required
AUDIT_LOG_ENCRYPTION_KEY=<generate-with-command-below>
ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=postgresql://user:password@localhost:5432/liquor_pos

# Optional
STRIPE_SECRET_KEY=sk_test_...
REDIS_URL=redis://localhost:6379
SENTRY_DSN=https://...
```

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**⚠️ CRITICAL:** Backup your encryption key securely. Losing it means permanent data loss.

#### 3. Setup Database

```bash
# Create database
createdb liquor_pos

# Run migrations
npm run migrate:deploy

# Generate Prisma client
npx prisma generate

# Seed sample data (optional)
npm run seed
```

#### 4. Start Server

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Frontend Setup

```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:3000" > .env

# Start development server
npm run dev
```

---

## Verification

### Check Backend Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### Test Frontend

1. Open `http://localhost:5173`
2. Login with default credentials
3. Process a test sale

---

## Common Issues

### "AUDIT_LOG_ENCRYPTION_KEY is required"

Generate and add to `.env`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### "Database connection failed"

Check PostgreSQL is running:
```bash
pg_isready
```

Verify `DATABASE_URL` in `.env` matches your PostgreSQL configuration.

### "Port 3000 already in use"

Kill existing process:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### "Cannot connect to frontend"

1. Verify backend is running: `curl http://localhost:3000/health`
2. Check CORS configuration in `backend/.env`:
   ```
   ALLOWED_ORIGINS=http://localhost:5173
   ```

---

## Useful Commands

### Backend

```bash
npm run start:dev      # Start with watch mode
npm run build          # Build for production
npm run start:prod     # Start production server

# Database
npm run migrate:dev    # Create and apply migrations
npm run migrate:deploy # Apply migrations (production)
npm run seed           # Seed database
npx prisma studio      # Open database GUI

# Testing
npm test               # Run all tests
npm run test:cov       # Coverage report
npm run test:e2e       # E2E tests
```

### Frontend

```bash
npm run dev            # Start development server
npm run build          # Build for production
npm run preview        # Preview production build
npm test               # Run tests
```

---

## Project Structure

```
liquor-pos/
├── backend/              # NestJS API server
│   ├── src/             # Source code
│   ├── prisma/          # Database schema & migrations
│   ├── scripts/         # Setup & utility scripts
│   └── .env             # Configuration (create this)
│
├── frontend/            # React frontend
│   ├── src/            # Source code
│   └── .env            # Configuration (create this)
│
└── docs/               # Documentation
```

---

## Next Steps

- **Development:** See [Configuration Guide](configuration.md)
- **Production:** See [Deployment Guide](deployment.md)
- **Architecture:** See [Architecture Overview](architecture.md)

