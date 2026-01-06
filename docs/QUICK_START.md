# Quick Start Guide

**Get the Liquor POS system running in 5 minutes!** ⚡

---

## Prerequisites (2 minutes)

Install these if you don't have them:

- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download](https://git-scm.com/downloads)

That's it! Docker includes everything else you need.

---

## Setup (3 minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/liquor-pos.git
cd liquor-pos
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Generate secrets (copy these to .env)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('AUDIT_LOG_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
```

**Edit `.env` and set:**
- `JWT_SECRET` - Paste generated value
- `AUDIT_LOG_ENCRYPTION_KEY` - Paste generated value
- `DB_PASSWORD` - Set a strong password (e.g., `openssl rand -base64 32`)
- `REDIS_PASSWORD` - Set a strong password
- `STRIPE_SECRET_KEY` - Get from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

### 3. Start the System

```bash
docker-compose up -d
```

**That's it!** 🎉

---

## Access the System

### Frontend (POS Interface)
**URL:** http://localhost  
**Default Login:**
- Username: `admin`
- Password: `password123`

### Backend API
**URL:** http://localhost:3000  
**API Docs:** http://localhost:3000/api

### Health Checks
- Backend: http://localhost:3000/health
- Frontend: http://localhost/health

---

## Quick Commands

```bash
# View logs
docker-compose logs -f

# Stop system
docker-compose down

# Restart
docker-compose restart

# Check status
docker-compose ps
```

---

## What's Running?

| Service | Port | Description |
|---------|------|-------------|
| **Frontend** | 80 | React POS interface |
| **Backend** | 3000 | NestJS API server |
| **PostgreSQL** | 5432 | Database |
| **Redis** | 6379 | Cache |

---

## Next Steps

### For Development

```bash
# Use development mode (hot reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Run tests
cd backend && npm run test

# Run linting
cd backend && npm run lint
```

### For Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment guide.

---

## Troubleshooting

### Services not starting?

```bash
# Check logs
docker-compose logs

# Check if ports are available
netstat -tulpn | grep 3000
netstat -tulpn | grep 80
```

### Database connection errors?

```bash
# Restart database
docker-compose restart postgres

# Check database logs
docker-compose logs postgres
```

### Need to reset everything?

```bash
# Stop and remove all containers
docker-compose down -v

# Start fresh
docker-compose up -d
```

---

## Common Issues

**Issue:** Port 80 already in use  
**Solution:** Stop other web servers or change `FRONTEND_PORT` in `.env`

**Issue:** Docker daemon not running  
**Solution:** Start Docker Desktop

**Issue:** Permission denied  
**Solution:** Run `chmod +x deploy.sh rollback.sh`

---

## Learn More

- **Full Documentation:** [docs/](../)
- **Deployment Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Environment Variables:** [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)

---

## Support

**Need help?** Check the [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) guide or open an issue on GitHub.

---

**Time to get started: ~5 minutes** ⚡  
**Last Updated:** January 5, 2026

