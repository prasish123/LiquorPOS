# Troubleshooting Guide

**Common issues and solutions for the Liquor POS system.**

---

## Table of Contents

1. [Docker Issues](#docker-issues)
2. [Database Issues](#database-issues)
3. [Redis Issues](#redis-issues)
4. [Backend Issues](#backend-issues)
5. [Frontend Issues](#frontend-issues)
6. [Deployment Issues](#deployment-issues)
7. [Performance Issues](#performance-issues)
8. [Security Issues](#security-issues)

---

## Docker Issues

### Docker daemon not running

**Symptoms:**
```
ERROR: error during connect: ... docker daemon not running
```

**Solutions:**
1. Start Docker Desktop
2. Check Docker service: `sudo systemctl start docker` (Linux)
3. Restart Docker Desktop

---

### Port already in use

**Symptoms:**
```
ERROR: for backend  Cannot start service backend: 
Bind for 0.0.0.0:3000 failed: port is already allocated
```

**Solutions:**

```bash
# Find process using port
netstat -tulpn | grep 3000  # Linux
lsof -i :3000               # Mac
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # Linux/Mac
taskkill /PID <PID> /F  # Windows

# Or change port in .env
BACKEND_PORT=3001
```

---

### Containers keep restarting

**Symptoms:**
```
liquor-pos-backend    Restarting (1) 5 seconds ago
```

**Solutions:**

```bash
# Check logs
docker-compose logs backend

# Common causes:
# 1. Missing environment variables
# 2. Database not ready
# 3. Application crash

# Check health
docker inspect liquor-pos-backend | grep Health -A 10
```

---

### Out of disk space

**Symptoms:**
```
ERROR: no space left on device
```

**Solutions:**

```bash
# Clean up Docker
docker system prune -a

# Remove old images
docker image prune -a

# Remove old volumes
docker volume prune

# Check disk usage
docker system df
```

---

## Database Issues

### Connection refused

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**

```bash
# Check if database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

---

### Migration failures

**Symptoms:**
```
Error: Migration failed to apply
```

**Solutions:**

```bash
# Check migration status
docker-compose exec backend npm run migrate:status

# View detailed logs
docker-compose logs backend | grep migration

# Rollback to last backup
./rollback.sh ./backend/backups/backup_<timestamp>.sql

# If stuck, reset migrations (CAUTION: data loss)
docker-compose exec backend npx prisma migrate reset
```

---

### Database locked

**Symptoms:**
```
Error: database is locked
```

**Solutions:**

```bash
# This shouldn't happen with PostgreSQL
# If using SQLite in development:

# Stop all connections
docker-compose down

# Remove lock file
rm backend/dev.db-shm backend/dev.db-wal

# Restart
docker-compose up -d
```

---

### Slow queries

**Symptoms:**
- Slow response times
- High CPU usage

**Solutions:**

```bash
# Check slow queries (in logs)
docker-compose logs backend | grep "Slow query"

# Add indexes to frequently queried columns
# Check prisma/schema.prisma for @@index directives

# Increase connection pool
DATABASE_POOL_MAX=20  # in .env
```

---

## Redis Issues

### Connection refused

**Symptoms:**
```
Error: Redis connection to redis:6379 failed - connect ECONNREFUSED
```

**Solutions:**

```bash
# Check if Redis is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis

# Test connection
docker-compose exec redis redis-cli ping
# Should return: PONG
```

---

### Authentication failed

**Symptoms:**
```
Error: NOAUTH Authentication required
```

**Solutions:**

```bash
# Check REDIS_PASSWORD in .env
echo $REDIS_PASSWORD

# Test with password
docker-compose exec redis redis-cli -a <password> ping

# Update docker-compose.yml if needed
```

---

### Out of memory

**Symptoms:**
```
Error: OOM command not allowed when used memory > 'maxmemory'
```

**Solutions:**

```bash
# Check memory usage
docker-compose exec redis redis-cli INFO memory

# Increase maxmemory in docker-compose.yml
command: >
  redis-server
  --maxmemory 512mb  # Increase this

# Or change eviction policy
--maxmemory-policy allkeys-lru
```

---

## Backend Issues

### Application crashes on startup

**Symptoms:**
```
liquor-pos-backend exited with code 1
```

**Solutions:**

```bash
# Check logs for error
docker-compose logs backend

# Common causes:
# 1. Missing JWT_SECRET
# 2. Missing AUDIT_LOG_ENCRYPTION_KEY
# 3. Invalid DATABASE_URL
# 4. Missing dependencies

# Verify environment
docker-compose exec backend env | grep JWT_SECRET

# Rebuild if dependencies changed
docker-compose build --no-cache backend
```

---

### 401 Unauthorized errors

**Symptoms:**
```
{"statusCode":401,"message":"Unauthorized"}
```

**Solutions:**

```bash
# Check JWT_SECRET is set
echo $JWT_SECRET

# Clear browser cookies/localStorage

# Get new token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

---

### Stripe webhook failures

**Symptoms:**
```
Error: No signatures found matching the expected signature
```

**Solutions:**

```bash
# Check STRIPE_WEBHOOK_SECRET
echo $STRIPE_WEBHOOK_SECRET

# Test webhook locally with Stripe CLI
stripe listen --forward-to localhost:3000/webhooks/stripe

# Update webhook secret from Stripe CLI output
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

### High memory usage

**Symptoms:**
- Backend container using >1GB RAM
- Slow response times

**Solutions:**

```bash
# Check memory usage
docker stats liquor-pos-backend

# Reduce connection pool
DATABASE_POOL_MAX=5  # in .env

# Restart backend
docker-compose restart backend

# Check for memory leaks in logs
docker-compose logs backend | grep "heap"
```

---

## Frontend Issues

### White screen / blank page

**Symptoms:**
- Browser shows blank page
- No errors in console

**Solutions:**

```bash
# Check frontend logs
docker-compose logs frontend

# Check if frontend is running
curl http://localhost/health

# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose restart frontend

# Check browser console for errors (F12)
```

---

### API calls failing

**Symptoms:**
```
Failed to fetch
CORS error
```

**Solutions:**

```bash
# Check ALLOWED_ORIGINS in .env
ALLOWED_ORIGINS=http://localhost,http://localhost:80

# Check nginx proxy configuration
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# Restart frontend
docker-compose restart frontend
```

---

### Assets not loading

**Symptoms:**
- Images/CSS/JS not loading
- 404 errors in console

**Solutions:**

```bash
# Check nginx logs
docker-compose logs frontend

# Verify build output
docker-compose exec frontend ls -la /usr/share/nginx/html

# Rebuild with no cache
docker-compose build --no-cache frontend
```

---

## Deployment Issues

### Deployment script fails

**Symptoms:**
```
[ERROR] Deployment failed at line X
```

**Solutions:**

```bash
# Check deployment log
cat deployment_<timestamp>.log

# Common causes:
# 1. Missing .env file
# 2. Docker not running
# 3. Health check timeout

# Run steps manually
docker-compose build
docker-compose up -d
curl http://localhost:3000/health
```

---

### Health checks failing

**Symptoms:**
```
[ERROR] Backend health check failed
```

**Solutions:**

```bash
# Check if backend is actually running
docker-compose ps backend

# Check backend logs
docker-compose logs backend

# Increase health check timeout
# Edit docker-compose.yml:
healthcheck:
  timeout: 30s  # Increase this
  start_period: 60s  # Increase this

# Restart
docker-compose restart backend
```

---

### Rollback fails

**Symptoms:**
```
[ERROR] Database restore failed
```

**Solutions:**

```bash
# Check backup file exists
ls -lh ./backend/backups/

# Verify backup file is valid
file ./backend/backups/backup_<timestamp>.sql

# Try manual restore
docker-compose exec -T postgres psql -U postgres -d liquor_pos < backup.sql

# If corrupted, use previous backup
./rollback.sh ./backend/backups/backup_<earlier_timestamp>.sql
```

---

## Performance Issues

### Slow API responses

**Symptoms:**
- API calls taking >1 second
- Timeout errors

**Solutions:**

```bash
# Check database query performance
docker-compose logs backend | grep "Slow query"

# Add database indexes
# Edit prisma/schema.prisma, add @@index

# Increase connection pool
DATABASE_POOL_MAX=20

# Check Redis is working
docker-compose exec redis redis-cli INFO stats

# Monitor container resources
docker stats
```

---

### High CPU usage

**Symptoms:**
- Container using 100% CPU
- System slow

**Solutions:**

```bash
# Identify problematic container
docker stats

# Check logs for errors/loops
docker-compose logs backend

# Restart container
docker-compose restart backend

# Limit CPU usage in docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '1.0'
```

---

## Security Issues

### Exposed secrets

**Symptoms:**
- .env file committed to git
- Secrets in logs

**Solutions:**

```bash
# Remove from git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# Rotate all secrets immediately
# Generate new JWT_SECRET, AUDIT_LOG_ENCRYPTION_KEY
# Update Stripe keys
# Change database passwords

# Add to .gitignore
echo ".env" >> .gitignore
```

---

### Unauthorized access attempts

**Symptoms:**
- Failed login attempts in logs
- Unusual API calls

**Solutions:**

```bash
# Check audit logs
docker-compose exec backend npm run logs:audit

# Enable rate limiting (already configured)
# Check throttler settings in app.module.ts

# Review ALLOWED_ORIGINS
ALLOWED_ORIGINS=https://yourdomain.com  # Only your domain

# Enable IP whitelisting if needed
```

---

## Getting More Help

### Collect Diagnostic Information

```bash
# System info
docker version
docker-compose version

# Service status
docker-compose ps

# Recent logs
docker-compose logs --tail=100 > logs.txt

# Environment (sanitized)
docker-compose config > config.txt

# Resource usage
docker stats --no-stream > stats.txt
```

### Contact Support

Include:
1. Error message (full text)
2. Steps to reproduce
3. Logs (sanitized - remove secrets!)
4. System info
5. What you've tried

---

## Quick Reference

### Restart Everything

```bash
docker-compose down
docker-compose up -d
```

### Reset Database

```bash
docker-compose down -v
docker-compose up -d
docker-compose exec backend npm run migrate:deploy
```

### View All Logs

```bash
docker-compose logs -f
```

### Check Health

```bash
curl http://localhost:3000/health
curl http://localhost/health
docker-compose ps
```

---

**Last Updated:** January 5, 2026  
**Need more help?** Check [DEPLOYMENT.md](./DEPLOYMENT.md) or open an issue on GitHub.

