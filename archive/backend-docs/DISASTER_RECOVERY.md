# Disaster Recovery Plan

## Overview

This document outlines the disaster recovery (DR) procedures for the Liquor POS system. The DR plan ensures business continuity and data protection in the event of catastrophic failures.

## Recovery Objectives

- **Recovery Time Objective (RTO):** 45 minutes
- **Recovery Point Objective (RPO):** 1 hour
- **Backup Frequency:** Daily full backups + continuous WAL archiving
- **Backup Retention:** 30 days
- **Testing Frequency:** Quarterly

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Restore Procedures](#restore-procedures)
3. [Point-in-Time Recovery](#point-in-time-recovery)
4. [Testing Procedures](#testing-procedures)
5. [Disaster Scenarios](#disaster-scenarios)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Contact Information](#contact-information)

---

## Backup Strategy

### Automated Daily Backups

**Schedule:** Every day at 2:00 AM EST

**Process:**
1. Full PostgreSQL dump using `pg_dump`
2. Compression using gzip (typically 70-80% reduction)
3. Checksum calculation (SHA-256)
4. Upload to S3 (if configured)
5. Metadata storage
6. Cleanup of backups older than 30 days

**Location:**
- Local: `./backups/backup-{timestamp}.sql.gz`
- S3: `s3://{bucket}/backups/backup-{timestamp}.sql.gz`

### Continuous WAL Archiving

**Purpose:** Enables point-in-time recovery (PITR)

**Configuration:**
```sql
-- PostgreSQL configuration (postgresql.conf)
wal_level = replica
archive_mode = on
archive_command = 'cp %p /path/to/wal_archive/%f'
```

**Location:** `./wal_archive/`

### Backup Types

| Type | Frequency | Retention | Purpose |
|------|-----------|-----------|---------|
| Full Backup | Daily | 30 days | Complete database restore |
| WAL Archive | Continuous | 7 days | Point-in-time recovery |
| Safety Backup | Before restore | 7 days | Rollback protection |

---

## Restore Procedures

### Standard Restore (Latest Backup)

**Use Case:** Restore database to the most recent backup

**Steps:**

1. **List available backups:**
```bash
npm run dr:list-backups
```

2. **Verify backup integrity:**
```bash
npm run dr:restore -- --backup-id=backup-1234567890 --validate-only
```

3. **Stop application:**
```bash
pm2 stop liquor-pos-backend
# or
sudo systemctl stop liquor-pos-backend
```

4. **Restore database:**
```bash
npm run dr:restore -- --backup-id=backup-1234567890
```

5. **Verify restored data:**
```bash
npm run dr:verify
```

6. **Start application:**
```bash
pm2 start liquor-pos-backend
# or
sudo systemctl start liquor-pos-backend
```

**Expected Duration:** 30-45 minutes

### Manual Restore (Advanced)

If the automated script fails, use manual procedures:

```bash
# 1. Decompress backup
gunzip -c ./backups/backup-1234567890.sql.gz > restore.sql

# 2. Drop and recreate schema
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 3. Restore from backup
psql $DATABASE_URL < restore.sql

# 4. Run migrations (if needed)
npm run migrate:deploy

# 5. Verify data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Product\";"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Transaction\";"

# 6. Clean up
rm restore.sql
```

---

## Point-in-Time Recovery

**Use Case:** Restore database to a specific point in time (e.g., before data corruption)

**Requirements:**
- WAL archiving must be enabled
- WAL files must exist for the target time period

**Steps:**

1. **Identify target time:**
```bash
# Example: Restore to 1 hour before data corruption
TARGET_TIME="2024-01-15T10:30:00Z"
```

2. **Find appropriate backup:**
```bash
# Use the most recent backup before target time
npm run dr:list-backups
```

3. **Restore with PITR:**
```bash
npm run dr:restore -- \
  --backup-id=backup-1234567890 \
  --target-time="2024-01-15T10:30:00Z"
```

4. **Verify restored state:**
```bash
psql $DATABASE_URL -c "SELECT MAX(\"createdAt\") FROM \"Transaction\";"
```

**Expected Duration:** 45-60 minutes

---

## Testing Procedures

### Quarterly DR Test

**Schedule:** First Monday of each quarter (Jan, Apr, Jul, Oct)

**Purpose:** Verify DR procedures work correctly and team is prepared

**Checklist:**

- [ ] Run automated DR test suite
- [ ] Review test results
- [ ] Verify RTO meets target (< 45 minutes)
- [ ] Verify RPO meets target (< 1 hour)
- [ ] Update documentation if needed
- [ ] Train new team members
- [ ] Review and update contact list

**Command:**
```bash
npm run dr:test
```

**Full Test (includes WAL replay):**
```bash
npm run dr:test -- --full
```

### Test Report

The test suite generates a detailed report:

```
DISASTER RECOVERY TEST REPORT
================================================================================

Timestamp: 2024-01-15T10:00:00.000Z
Total Duration: 125.45s
Pass Rate: 100.00%

Test Results:
--------------------------------------------------------------------------------
✅ Backup Creation                          5.23s
✅ Backup Integrity                         2.15s
✅ Backup Compression                       3.45s
✅ Metadata Validation                      0.12s
✅ Restore to Test Database                 45.67s
✅ Data Verification                        2.34s
⚠️  WAL Archiving                           0.05s (SKIP)
⚠️  Point-in-Time Recovery                  0.03s (SKIP)
✅ Recovery Time Measurement                65.12s
✅ Backup Cleanup                           1.29s

================================================================================

Recovery Time Objective (RTO): 42.50 minutes

Recommendations:
  ✅ All tests passed - DR procedures are working correctly
  ✅ RTO (42.50 min) meets target of 45 minutes

================================================================================
```

---

## Disaster Scenarios

### Scenario 1: Database Corruption

**Symptoms:**
- Database errors in logs
- Data inconsistencies
- Application crashes

**Recovery Steps:**
1. Identify when corruption occurred
2. Find last known good backup
3. Restore using PITR to just before corruption
4. Verify data integrity
5. Investigate root cause

**Expected RTO:** 45 minutes

---

### Scenario 2: Complete Database Loss

**Symptoms:**
- Database server unreachable
- All data lost
- Cannot connect to database

**Recovery Steps:**
1. Provision new database server (if needed)
2. Restore from latest backup
3. Replay WAL logs (if available)
4. Verify data integrity
5. Update connection strings (if needed)
6. Restart application

**Expected RTO:** 60 minutes

---

### Scenario 3: Accidental Data Deletion

**Symptoms:**
- Critical data missing
- User reports data loss
- Audit logs show deletion

**Recovery Steps:**
1. Stop application immediately
2. Identify deletion time
3. Restore using PITR to just before deletion
4. Verify restored data
5. Investigate how deletion occurred
6. Implement preventive measures

**Expected RTO:** 45 minutes

---

### Scenario 4: Ransomware Attack

**Symptoms:**
- Files encrypted
- Ransom note
- Database inaccessible

**Recovery Steps:**
1. Isolate affected systems
2. Do NOT pay ransom
3. Restore from immutable S3 backup
4. Verify backup integrity
5. Restore to clean environment
6. Update security measures
7. Report to authorities

**Expected RTO:** 2-4 hours

**Prevention:**
- S3 Object Lock (WORM - Write Once Read Many)
- Versioning enabled
- MFA delete protection
- Regular security audits

---

### Scenario 5: Cloud Provider Outage

**Symptoms:**
- Cannot reach cloud services
- Database unavailable
- Application down

**Mitigation:**
1. **Immediate (Phase 1-2):**
   - POS terminals continue in offline mode
   - Transactions stored locally
   - Sync when cloud recovers

2. **Long-term (Phase 3):**
   - Multi-region deployment
   - Automatic failover (Route53)
   - Database replication
   - Recovery Time: 60 seconds (automatic)

---

## Monitoring & Alerts

### Backup Monitoring

**Metrics:**
- Last backup time
- Backup success/failure rate
- Backup size trends
- Storage usage

**Alerts:**
- ❌ Backup failed
- ⚠️  No backup in 25 hours
- ⚠️  Backup size anomaly (>50% change)
- ⚠️  Storage > 80% full
- ⚠️  WAL archiving stalled

**Notification Channels:**
- Email: admin@example.com
- Slack: #alerts-backup
- PagerDuty: High severity

### Health Checks

**Endpoint:** `GET /api/backup/stats`

**Response:**
```json
{
  "totalBackups": 30,
  "lastBackupTime": "2024-01-15T02:00:00Z",
  "lastBackupStatus": "completed",
  "totalSize": 5368709120,
  "oldestBackup": "2023-12-16T02:00:00Z",
  "failedBackupsLast24h": 0
}
```

---

## Configuration

### Environment Variables

```bash
# Backup Configuration
BACKUP_ENABLED=true
BACKUP_DIR=./backups
WAL_ARCHIVE_DIR=./wal_archive
BACKUP_RETENTION_DAYS=30

# S3 Configuration (Optional)
BACKUP_S3_ENABLED=true
BACKUP_S3_BUCKET=liquor-pos-backups
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1

# Test Database (for DR testing)
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/test_db
```

### PostgreSQL Configuration

```conf
# postgresql.conf

# WAL Configuration
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /path/to/wal_archive/%f && cp %p /path/to/wal_archive/%f'
archive_timeout = 300  # 5 minutes

# Connection Settings
max_connections = 100
shared_buffers = 256MB

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
```

---

## API Endpoints

### Create Manual Backup

```bash
POST /api/backup/create
Authorization: Bearer {admin_token}

Response:
{
  "success": true,
  "backupId": "backup-1234567890",
  "message": "Backup created successfully"
}
```

### List Backups

```bash
GET /api/backup/list
Authorization: Bearer {admin_token}

Response:
{
  "success": true,
  "backups": [
    {
      "id": "backup-1234567890",
      "timestamp": "2024-01-15T02:00:00Z",
      "type": "full",
      "size": 178956970,
      "status": "completed"
    }
  ]
}
```

### Verify Backup

```bash
POST /api/backup/verify?backupId=backup-1234567890
Authorization: Bearer {admin_token}

Response:
{
  "success": true,
  "message": "Backup integrity verified"
}
```

---

## NPM Scripts

```json
{
  "scripts": {
    "dr:restore": "ts-node scripts/disaster-recovery/restore-database.ts",
    "dr:test": "ts-node scripts/disaster-recovery/test-dr-procedures.ts",
    "dr:list-backups": "curl http://localhost:3000/api/backup/list",
    "dr:verify": "ts-node scripts/disaster-recovery/verify-restore.ts"
  }
}
```

---

## Contact Information

### Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Primary DBA | [Name] | [Phone] | [Email] |
| Backup DBA | [Name] | [Phone] | [Email] |
| DevOps Lead | [Name] | [Phone] | [Email] |
| CTO | [Name] | [Phone] | [Email] |

### Escalation Path

1. **Level 1:** On-call engineer (15 min response)
2. **Level 2:** Senior DBA (30 min response)
3. **Level 3:** CTO (1 hour response)

### External Support

- **AWS Support:** Premium Support Plan
- **Database Consultant:** [Contact Info]
- **Security Team:** [Contact Info]

---

## Appendix

### A. Backup Size Estimates

| Database Size | Backup Size (Compressed) | Restore Time |
|---------------|-------------------------|--------------|
| 1 GB | ~250 MB | 5-10 min |
| 10 GB | ~2.5 GB | 15-25 min |
| 100 GB | ~25 GB | 45-90 min |

### B. Common Issues

**Issue:** Backup fails with "disk full" error
**Solution:** Clean up old backups or increase storage

**Issue:** Restore fails with "permission denied"
**Solution:** Ensure database user has CREATE privileges

**Issue:** WAL replay fails
**Solution:** Check WAL files are in correct order and not corrupted

### C. Glossary

- **RTO (Recovery Time Objective):** Maximum acceptable downtime
- **RPO (Recovery Point Objective):** Maximum acceptable data loss
- **WAL (Write-Ahead Log):** PostgreSQL transaction log
- **PITR (Point-in-Time Recovery):** Restore to specific timestamp
- **WORM (Write Once Read Many):** Immutable storage

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | DR Team | Initial version |

---

## Next Review Date

**Scheduled:** April 1, 2024

**Reminder:** Update this document after any DR test or actual recovery event.

