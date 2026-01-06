# Backup & Recovery Instructions

**Complete guide for backup and disaster recovery procedures.**

**Status:** 🟢 Production Ready  
**Last Updated:** January 5, 2026  
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Automated Backups](#automated-backups)
3. [Manual Backups](#manual-backups)
4. [Backup Verification](#backup-verification)
5. [Restore Procedures](#restore-procedures)
6. [Disaster Recovery](#disaster-recovery)
7. [Backup Monitoring](#backup-monitoring)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

### Backup Strategy

```
┌─────────────────────────────────────────────────────┐
│  BACKUP STRATEGY                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ✅ Automated Backups                              │
│     ├─ Before every deployment                     │
│     ├─ Before every rollback                       │
│     └─ Daily at 2:00 AM (scheduled)                │
│                                                     │
│  ✅ Retention Policy                               │
│     ├─ Daily backups:   30 days                    │
│     ├─ Weekly backups:  90 days                    │
│     └─ Monthly backups: 1 year                     │
│                                                     │
│  ✅ Storage Locations                              │
│     ├─ Local: ./backend/backups/                   │
│     ├─ Offsite: S3/Remote server (recommended)     │
│     └─ Archive: Long-term storage                  │
│                                                     │
│  ✅ Recovery Objectives                            │
│     ├─ RTO (Recovery Time): < 1 hour               │
│     └─ RPO (Recovery Point): < 24 hours            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### What Gets Backed Up

| Component | Included | Method | Frequency |
|-----------|----------|--------|-----------|
| **Database** | ✅ Yes | pg_dump | Daily + pre-deployment |
| **Environment Config** | ✅ Yes | Manual copy | Before changes |
| **Docker Volumes** | ✅ Yes | Volume backup | Weekly |
| **Application Code** | ✅ Yes | Git repository | Continuous |
| **Uploaded Files** | ✅ Yes | Volume backup | Daily |
| **Logs** | ⚠️ Optional | Log aggregation | Continuous |

### Backup Locations

```
./backend/backups/
├── backup_20260105_120000.sql          # Full database backup
├── backup_20260105_140000.sql          # Another backup
├── pre_rollback_20260105_150000.sql    # Pre-rollback safety backup
└── weekly/
    └── backup_20260101_020000.sql      # Weekly backup
```

---

## 🤖 Automated Backups

### Deployment Backups

Backups are automatically created before every deployment:

```bash
# Deploy script automatically creates backup
./deploy.sh production

# Backup saved to: ./backend/backups/backup_<timestamp>.sql
```

**What happens:**
1. ✅ Deployment script starts
2. ✅ Database backup created automatically
3. ✅ Backup verified for integrity
4. ✅ Deployment proceeds
5. ✅ If deployment fails, automatic rollback to backup

### Scheduled Backups

Set up daily automated backups using cron:

#### Linux/Mac Setup

```bash
# Edit crontab
crontab -e

# Add daily backup at 2:00 AM
0 2 * * * cd /path/to/liquor-pos && docker-compose exec -T postgres pg_dump -U postgres liquor_pos > ./backend/backups/backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql

# Add weekly backup (Sundays at 3:00 AM)
0 3 * * 0 cd /path/to/liquor-pos && docker-compose exec -T postgres pg_dump -U postgres liquor_pos > ./backend/backups/weekly/backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql

# Add monthly cleanup (1st of month at 4:00 AM)
0 4 1 * * find /path/to/liquor-pos/backend/backups/ -name "*.sql" -mtime +30 -delete
```

#### Windows Setup

Create a scheduled task:

```powershell
# Create backup script: backup.ps1
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "E:\ML Projects\POS-Omni\liquor-pos\backend\backups\backup_$timestamp.sql"
docker-compose -f "E:\ML Projects\POS-Omni\liquor-pos\docker-compose.yml" exec -T postgres pg_dump -U postgres liquor_pos > $backupFile

# Schedule task (run as Administrator)
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File E:\ML Projects\POS-Omni\liquor-pos\backup.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "LiquorPOS-DailyBackup" -Description "Daily database backup"
```

### Backup Script

Create a dedicated backup script:

**File:** `scripts/backup.sh`

```bash
#!/bin/bash

set -e

BACKUP_DIR="./backend/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
LOG_FILE="$BACKUP_DIR/backup.log"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Log start
echo "[$(date)] Starting backup..." | tee -a "$LOG_FILE"

# Create backup
if docker-compose exec -T postgres pg_dump -U postgres liquor_pos > "$BACKUP_FILE"; then
    echo "[$(date)] Backup created: $BACKUP_FILE" | tee -a "$LOG_FILE"
    
    # Compress backup
    gzip "$BACKUP_FILE"
    echo "[$(date)] Backup compressed: $BACKUP_FILE.gz" | tee -a "$LOG_FILE"
    
    # Verify backup
    if [ -f "$BACKUP_FILE.gz" ] && [ -s "$BACKUP_FILE.gz" ]; then
        echo "[$(date)] Backup verified successfully" | tee -a "$LOG_FILE"
    else
        echo "[$(date)] ERROR: Backup verification failed" | tee -a "$LOG_FILE"
        exit 1
    fi
    
    # Clean up old backups (keep last 30 days)
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete
    echo "[$(date)] Old backups cleaned up" | tee -a "$LOG_FILE"
    
    # Success
    echo "[$(date)] Backup completed successfully" | tee -a "$LOG_FILE"
    exit 0
else
    echo "[$(date)] ERROR: Backup failed" | tee -a "$LOG_FILE"
    exit 1
fi
```

Make it executable:

```bash
chmod +x scripts/backup.sh
```

---

## 📝 Manual Backups

### Quick Backup

```bash
# Simple backup
docker-compose exec -T postgres pg_dump -U postgres liquor_pos > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Full Backup (Recommended)

```bash
# Create backup directory
mkdir -p ./backend/backups

# Full database backup
docker-compose exec -T postgres pg_dump -U postgres liquor_pos > ./backend/backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh ./backend/backups/
```

### Compressed Backup

```bash
# Backup and compress
docker-compose exec -T postgres pg_dump -U postgres liquor_pos | gzip > ./backend/backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Saves ~70% disk space
```

### Custom Format Backup (Faster Restore)

```bash
# Backup in custom format
docker-compose exec -T postgres pg_dump -U postgres -Fc liquor_pos > ./backend/backups/backup_$(date +%Y%m%d_%H%M%S).dump

# Advantages:
# - Faster restore
# - Parallel restore support
# - Selective table restore
```

### Schema-Only Backup

```bash
# Backup schema only (no data)
docker-compose exec -T postgres pg_dump -U postgres --schema-only liquor_pos > ./backend/backups/schema_$(date +%Y%m%d_%H%M%S).sql
```

### Data-Only Backup

```bash
# Backup data only (no schema)
docker-compose exec -T postgres pg_dump -U postgres --data-only liquor_pos > ./backend/backups/data_$(date +%Y%m%d_%H%M%S).sql
```

### Specific Table Backup

```bash
# Backup specific table
docker-compose exec -T postgres pg_dump -U postgres -t Order liquor_pos > ./backend/backups/orders_$(date +%Y%m%d_%H%M%S).sql

# Backup multiple tables
docker-compose exec -T postgres pg_dump -U postgres -t Order -t OrderItem liquor_pos > ./backend/backups/orders_items_$(date +%Y%m%d_%H%M%S).sql
```

### Environment Configuration Backup

```bash
# Backup .env file (store securely!)
cp .env ./backend/backups/env_$(date +%Y%m%d_%H%M%S).backup

# Encrypt backup (recommended)
openssl enc -aes-256-cbc -salt -in .env -out ./backend/backups/env_$(date +%Y%m%d_%H%M%S).enc

# Decrypt when needed
openssl enc -aes-256-cbc -d -in ./backend/backups/env_<timestamp>.enc -out .env
```

### Docker Volume Backup

```bash
# Backup all volumes
docker run --rm \
  -v liquor-pos_postgres_data:/data \
  -v $(pwd)/backend/backups:/backup \
  alpine tar czf /backup/volumes_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

---

## ✅ Backup Verification

### Verify Backup Exists

```bash
# Check backup was created
ls -lh ./backend/backups/backup_*.sql

# Check file size (should be > 0)
du -h ./backend/backups/backup_*.sql
```

### Verify Backup Integrity

```bash
# Test backup can be read
head -n 10 ./backend/backups/backup_<timestamp>.sql

# For compressed backups
gunzip -t ./backend/backups/backup_<timestamp>.sql.gz

# For custom format backups
docker-compose exec -T postgres pg_restore --list ./backups/backup_<timestamp>.dump
```

### Test Restore (Recommended)

```bash
# Create test database
docker-compose exec postgres createdb -U postgres test_restore

# Restore to test database
docker-compose exec -T postgres psql -U postgres -d test_restore < ./backend/backups/backup_<timestamp>.sql

# Verify data
docker-compose exec postgres psql -U postgres -d test_restore -c "SELECT COUNT(*) FROM \"Order\";"

# Clean up test database
docker-compose exec postgres dropdb -U postgres test_restore
```

### Automated Verification Script

**File:** `scripts/verify-backup.sh`

```bash
#!/bin/bash

set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./verify-backup.sh <backup_file>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Verifying backup: $BACKUP_FILE"

# Check file size
SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
if [ "$SIZE" -lt 1000 ]; then
    echo "ERROR: Backup file too small ($SIZE bytes)"
    exit 1
fi

echo "✓ File size OK ($SIZE bytes)"

# Create test database
echo "Creating test database..."
docker-compose exec postgres createdb -U postgres test_restore 2>/dev/null || true

# Restore to test database
echo "Testing restore..."
if docker-compose exec -T postgres psql -U postgres -d test_restore < "$BACKUP_FILE" > /dev/null 2>&1; then
    echo "✓ Restore successful"
    
    # Verify tables exist
    TABLE_COUNT=$(docker-compose exec -T postgres psql -U postgres -d test_restore -c "\dt" | grep -c "public" || echo "0")
    echo "✓ Found $TABLE_COUNT tables"
    
    # Clean up
    docker-compose exec postgres dropdb -U postgres test_restore
    
    echo "✓ Backup verified successfully"
    exit 0
else
    echo "ERROR: Restore failed"
    docker-compose exec postgres dropdb -U postgres test_restore 2>/dev/null || true
    exit 1
fi
```

---

## 🔄 Restore Procedures

### Quick Restore

```bash
# Using rollback script (recommended)
./rollback.sh ./backend/backups/backup_<timestamp>.sql
```

### Manual Restore

#### Full Database Restore

```bash
# 1. Stop services
docker-compose down

# 2. Start database only
docker-compose up -d postgres
sleep 10

# 3. Drop and recreate database
docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS liquor_pos;"
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE liquor_pos;"

# 4. Restore from backup
docker-compose exec -T postgres psql -U postgres -d liquor_pos < ./backend/backups/backup_<timestamp>.sql

# 5. Restart all services
docker-compose up -d

# 6. Verify
curl http://localhost:3000/health
```

#### Restore from Compressed Backup

```bash
# Decompress and restore
gunzip -c ./backend/backups/backup_<timestamp>.sql.gz | docker-compose exec -T postgres psql -U postgres -d liquor_pos
```

#### Restore from Custom Format

```bash
# Restore from custom format
docker-compose exec -T postgres pg_restore -U postgres -d liquor_pos ./backups/backup_<timestamp>.dump

# Parallel restore (faster)
docker-compose exec -T postgres pg_restore -U postgres -d liquor_pos -j 4 ./backups/backup_<timestamp>.dump
```

#### Restore Specific Table

```bash
# Restore single table
docker-compose exec -T postgres psql -U postgres -d liquor_pos < ./backend/backups/orders_<timestamp>.sql

# Or from full backup
docker-compose exec -T postgres pg_restore -U postgres -d liquor_pos -t Order ./backups/backup_<timestamp>.dump
```

### Point-in-Time Recovery

If you have WAL (Write-Ahead Logging) enabled:

```bash
# 1. Restore base backup
docker-compose exec -T postgres psql -U postgres -d liquor_pos < ./backend/backups/backup_<timestamp>.sql

# 2. Apply WAL files
docker-compose exec postgres pg_wal_replay -D /var/lib/postgresql/data

# 3. Recover to specific time
docker-compose exec postgres psql -U postgres -d liquor_pos -c "SELECT pg_wal_replay_resume();"
```

---

## 🚨 Disaster Recovery

### Scenario 1: Database Corruption

```bash
# 1. Stop services immediately
docker-compose down

# 2. Identify last good backup
ls -lt ./backend/backups/ | head -5

# 3. Restore from backup
./rollback.sh ./backend/backups/backup_<last-good>.sql

# 4. Verify data integrity
docker-compose exec postgres psql -U postgres -d liquor_pos -c "SELECT COUNT(*) FROM \"Order\";"

# 5. Resume operations
docker-compose up -d
```

### Scenario 2: Complete Server Failure

```bash
# 1. Provision new server
# - Install Docker & Docker Compose
# - Configure firewall
# - Set up domain/SSL

# 2. Clone repository
git clone <your-repo-url>
cd liquor-pos

# 3. Restore .env file
# Copy from secure backup location
# Or recreate with production values

# 4. Start database
docker-compose up -d postgres
sleep 10

# 5. Restore database from offsite backup
# Copy backup from S3/remote server
aws s3 cp s3://your-bucket/backup_<timestamp>.sql ./backend/backups/
docker-compose exec -T postgres psql -U postgres -d liquor_pos < ./backend/backups/backup_<timestamp>.sql

# 6. Deploy full system
./deploy.sh production

# 7. Verify all services
curl http://localhost:3000/health
./scripts/smoke-tests.sh

# 8. Update DNS if needed
# Point domain to new server

# 9. Resume operations
```

### Scenario 3: Accidental Data Deletion

```bash
# 1. Stop writes immediately
docker-compose stop backend frontend

# 2. Create backup of current state
docker-compose exec -T postgres pg_dump -U postgres liquor_pos > ./backend/backups/current_state.sql

# 3. Identify backup before deletion
# Check backup timestamps
ls -lt ./backend/backups/

# 4. Restore from backup before deletion
./rollback.sh ./backend/backups/backup_<before-deletion>.sql

# 5. Verify restored data
docker-compose exec postgres psql -U postgres -d liquor_pos -c "SELECT COUNT(*) FROM \"Order\";"

# 6. Resume operations
docker-compose start backend frontend
```

### Scenario 4: Ransomware Attack

```bash
# 1. Isolate system immediately
# Disconnect from network
# Stop all services
docker-compose down

# 2. Assess damage
# Check which files are encrypted
# Verify backup integrity

# 3. Wipe and reinstall
# Fresh OS installation
# Install Docker & Docker Compose

# 4. Restore from clean offsite backup
# Use backup from before attack
# Verify backup is not compromised

# 5. Restore system
git clone <your-repo-url>
cd liquor-pos
# Restore .env
./rollback.sh <offsite-backup>

# 6. Deploy
./deploy.sh production

# 7. Security audit
# Update all passwords
# Review access logs
# Implement additional security measures
```

### Recovery Time Objectives

| Scenario | RTO (Recovery Time) | RPO (Recovery Point) | Priority |
|----------|---------------------|----------------------|----------|
| **Database Corruption** | < 30 minutes | < 24 hours | Critical |
| **Server Failure** | < 1 hour | < 24 hours | Critical |
| **Data Deletion** | < 15 minutes | < 24 hours | High |
| **Ransomware** | < 4 hours | < 24 hours | Critical |
| **Service Outage** | < 5 minutes | 0 (no data loss) | Critical |

---

## 📊 Backup Monitoring

### Check Backup Status

```bash
# List recent backups
ls -lth ./backend/backups/ | head -10

# Check backup sizes
du -h ./backend/backups/*.sql

# Count backups
ls -1 ./backend/backups/backup_*.sql | wc -l
```

### Backup Health Script

**File:** `scripts/check-backups.sh`

```bash
#!/bin/bash

BACKUP_DIR="./backend/backups"
MIN_BACKUPS=7
MAX_AGE_HOURS=48

echo "=== Backup Health Check ==="

# Check backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# Count backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.sql 2>/dev/null | wc -l)
echo "Total backups: $BACKUP_COUNT"

if [ "$BACKUP_COUNT" -lt "$MIN_BACKUPS" ]; then
    echo "WARNING: Less than $MIN_BACKUPS backups found"
fi

# Check latest backup age
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.sql 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    BACKUP_AGE=$(($(date +%s) - $(stat -f%m "$LATEST_BACKUP" 2>/dev/null || stat -c%Y "$LATEST_BACKUP")))
    BACKUP_AGE_HOURS=$((BACKUP_AGE / 3600))
    
    echo "Latest backup: $(basename "$LATEST_BACKUP")"
    echo "Age: $BACKUP_AGE_HOURS hours"
    
    if [ "$BACKUP_AGE_HOURS" -gt "$MAX_AGE_HOURS" ]; then
        echo "WARNING: Latest backup is older than $MAX_AGE_HOURS hours"
    fi
else
    echo "ERROR: No backups found"
    exit 1
fi

# Check disk space
DISK_USAGE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
echo "Disk usage: $DISK_USAGE%"

if [ "$DISK_USAGE" -gt 90 ]; then
    echo "WARNING: Disk usage above 90%"
fi

echo "=== Backup Health Check Complete ==="
```

### Automated Monitoring

Add to cron for daily monitoring:

```bash
# Add to crontab
0 8 * * * cd /path/to/liquor-pos && ./scripts/check-backups.sh | mail -s "Backup Health Report" admin@yourdomain.com
```

---

## 🔧 Troubleshooting

### Backup Fails

**Problem:** Backup command fails

```bash
# Check database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U postgres -l

# Check disk space
df -h

# Try manual backup
docker-compose exec -T postgres pg_dump -U postgres liquor_pos
```

### Restore Fails

**Problem:** Restore command fails

```bash
# Check backup file exists
ls -lh ./backend/backups/backup_<timestamp>.sql

# Verify backup integrity
head -n 10 ./backend/backups/backup_<timestamp>.sql

# Check database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Try restoring to test database first
docker-compose exec postgres createdb -U postgres test_restore
docker-compose exec -T postgres psql -U postgres -d test_restore < ./backend/backups/backup_<timestamp>.sql
```

### Backup Too Large

**Problem:** Backup files consuming too much disk space

```bash
# Use compression
docker-compose exec -T postgres pg_dump -U postgres liquor_pos | gzip > backup.sql.gz

# Use custom format (better compression)
docker-compose exec -T postgres pg_dump -U postgres -Fc liquor_pos > backup.dump

# Clean up old backups
find ./backend/backups/ -name "*.sql" -mtime +30 -delete

# Archive old backups to S3
aws s3 sync ./backend/backups/ s3://your-bucket/archive/
find ./backend/backups/ -name "*.sql" -mtime +7 -delete
```

### Backup Too Slow

**Problem:** Backup takes too long

```bash
# Use custom format (faster)
docker-compose exec -T postgres pg_dump -U postgres -Fc liquor_pos > backup.dump

# Parallel backup (PostgreSQL 9.3+)
docker-compose exec -T postgres pg_dump -U postgres -Fc -j 4 liquor_pos > backup.dump

# Backup specific tables only
docker-compose exec -T postgres pg_dump -U postgres -t Order -t OrderItem liquor_pos > backup.sql
```

---

## 📚 Additional Resources

### Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide
- **[QUICKSTART.md](QUICKSTART.md)** - Quick start guide
- **[rollback.sh](rollback.sh)** - Rollback script

### External Resources

- **[PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)**
- **[pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)**
- **[pg_restore Documentation](https://www.postgresql.org/docs/current/app-pgrestore.html)**

---

## 🎯 Quick Reference

### Common Commands

```bash
# Create backup
docker-compose exec -T postgres pg_dump -U postgres liquor_pos > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
./rollback.sh ./backend/backups/backup_<timestamp>.sql

# List backups
ls -lth ./backend/backups/

# Verify backup
./scripts/verify-backup.sh ./backend/backups/backup_<timestamp>.sql

# Check backup health
./scripts/check-backups.sh
```

---

**Status:** 🟢 Backup System Ready  
**RTO:** < 1 hour  
**RPO:** < 24 hours  
**Retention:** 30 days (daily), 90 days (weekly), 1 year (monthly)

---

*This document is maintained by the DevOps team. Last updated: January 5, 2026*

