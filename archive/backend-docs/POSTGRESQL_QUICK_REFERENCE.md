# PostgreSQL Migration - Quick Reference

## TL;DR

SQLite → PostgreSQL migration complete. PostgreSQL now handles:
- ✅ Multiple cashiers simultaneously (concurrent writes)
- ✅ 100+ connections (connection pooling)
- ✅ 100K+ transactions (scalability)

---

## Quick Start (5 Minutes)

### 1. Install PostgreSQL (Docker - Easiest)

```bash
docker run --name liquor-pos-db \
  -e POSTGRES_USER=liquor_pos \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=liquor_pos \
  -p 5432:5432 \
  -d postgres:16-alpine
```

### 2. Update .env

```bash
DATABASE_URL="postgresql://liquor_pos:your_secure_password@localhost:5432/liquor_pos"
```

### 3. Install & Migrate

```bash
cd backend
npm install
npx prisma migrate dev --name init_postgresql
npm run db:seed
```

### 4. Start Application

```bash
npm run start:dev
```

### 5. Verify

```bash
npm test -- postgresql-verification
```

**Done!** 🎉

---

## Migration from Existing SQLite Data

```bash
# Set both database URLs
SQLITE_URL=file:./dev.db \
DATABASE_URL=postgresql://liquor_pos:password@localhost:5432/liquor_pos \
npm run migrate:sqlite-to-postgres
```

---

## Connection Pooling

### Development
```bash
DATABASE_URL="postgresql://liquor_pos:password@localhost:5432/liquor_pos?connection_limit=5"
```

### Production (Single Location)
```bash
DATABASE_URL="postgresql://liquor_pos:password@prod-db:5432/liquor_pos?connection_limit=20&pool_timeout=10"
```

### Production (Multiple Locations)
```bash
DATABASE_URL="postgresql://liquor_pos:password@prod-db:5432/liquor_pos?connection_limit=50&pool_timeout=15"
```

---

## Common Commands

### Database Management

```bash
# Check migration status
npx prisma migrate status

# Create new migration
npx prisma migrate dev --name your_migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (dev only - DESTRUCTIVE)
npx prisma migrate reset
```

### PostgreSQL Commands

```bash
# Connect to database
psql -U liquor_pos -h localhost liquor_pos

# Check connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'liquor_pos';

# Database size
SELECT pg_size_pretty(pg_database_size('liquor_pos'));

# Backup
pg_dump -U liquor_pos liquor_pos > backup.sql

# Restore
psql -U liquor_pos liquor_pos < backup.sql
```

---

## Troubleshooting

### Can't connect to PostgreSQL

```bash
# Check if running
docker ps  # (if using Docker)
sudo systemctl status postgresql  # (if native)

# Check port
netstat -an | grep 5432

# Test connection
psql -U liquor_pos -h localhost liquor_pos
```

### "password authentication failed"

```bash
# Reset password
sudo -u postgres psql
ALTER USER liquor_pos WITH PASSWORD 'new_password';

# Update .env
DATABASE_URL="postgresql://liquor_pos:new_password@localhost:5432/liquor_pos"
```

### "too many connections"

```bash
# Increase connection limit in DATABASE_URL
DATABASE_URL="postgresql://...?connection_limit=50"

# Or increase PostgreSQL max_connections
sudo -u postgres psql
ALTER SYSTEM SET max_connections = 200;
sudo systemctl restart postgresql
```

---

## Performance Tips

1. **Use Indexes** - Already configured in schema
2. **Connection Pooling** - Enabled by default
3. **Monitor Slow Queries** - Automatic logging (>1000ms)
4. **Regular Backups** - Daily recommended
5. **Vacuum** - Automatic (autovacuum enabled)

---

## Key Differences from SQLite

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| Concurrent Writes | ❌ 1 writer | ✅ 100+ writers |
| Connection Pool | ❌ No | ✅ Yes (20-100) |
| Max DB Size | ⚠️ 2GB | ✅ Unlimited |
| Locking | ⚠️ Database | ✅ Row-level |
| Remote Access | ❌ No | ✅ Yes |
| Replication | ❌ No | ✅ Yes |

---

## Documentation

- **Full Guide**: `docs/POSTGRESQL_MIGRATION_GUIDE.md`
- **Connection Pooling**: `docs/CONNECTION_POOLING_GUIDE.md`
- **Completion Report**: `docs/POSTGRESQL_MIGRATION_COMPLETION_REPORT.md`
- **Environment Setup**: `ENV_SETUP.md`

---

## Support

### Health Check
```bash
curl http://localhost:3000/health
```

### Run Tests
```bash
npm test -- postgresql-verification
```

### Check Logs
```bash
# Application logs
tail -f logs/combined.log

# PostgreSQL logs (Docker)
docker logs liquor-pos-db

# PostgreSQL logs (native)
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

---

**Status**: ✅ Production Ready  
**Date**: 2026-01-02  
**Issue**: Critical - SQLite → PostgreSQL Migration Required

