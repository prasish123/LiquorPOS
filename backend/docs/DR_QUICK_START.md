# Disaster Recovery - Quick Start Guide

## 🚨 Emergency Restore Procedure

If you need to restore the database immediately, follow these steps:

### 1. List Available Backups

```bash
npm run dr:list-backups
```

### 2. Restore from Latest Backup

```bash
# Replace backup-1234567890 with actual backup ID
npm run dr:restore -- --backup-id=backup-1234567890
```

The script will:
- ✅ Verify backup integrity
- ✅ Stop the application
- ✅ Create a safety backup
- ✅ Restore the database
- ✅ Verify restored data
- ✅ Start the application

**Expected Time:** 30-45 minutes

---

## 📋 Common Scenarios

### Scenario 1: Accidental Data Deletion

**When:** You accidentally deleted important data

**Solution:** Point-in-time recovery

```bash
# Restore to 1 hour before deletion
npm run dr:restore -- \
  --backup-id=backup-1234567890 \
  --target-time="2024-01-15T10:30:00Z"
```

### Scenario 2: Database Corruption

**When:** Database is corrupted or showing errors

**Solution:** Restore from last known good backup

```bash
# First, verify the backup
npm run dr:restore -- --backup-id=backup-1234567890 --validate-only

# Then restore
npm run dr:restore -- --backup-id=backup-1234567890
```

### Scenario 3: Test Restore (No Downtime)

**When:** You want to test restore procedures without affecting production

**Solution:** Use the DR test suite

```bash
npm run dr:test
```

---

## 🔧 Configuration

### Required Environment Variables

```bash
# Backup Configuration
BACKUP_ENABLED=true
BACKUP_DIR=./backups
WAL_ARCHIVE_DIR=./wal_archive
BACKUP_RETENTION_DAYS=30

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/liquor_pos
```

### Optional: S3 Cloud Backups

```bash
BACKUP_S3_ENABLED=true
BACKUP_S3_BUCKET=liquor-pos-backups
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
```

---

## 📊 Monitoring

### Check Backup Health

```bash
curl http://localhost:3000/health/backup
```

**Response:**
```json
{
  "status": "ok",
  "info": {
    "backup": {
      "status": "up",
      "totalBackups": 30,
      "lastBackupTime": "2024-01-15T02:00:00Z",
      "lastBackupStatus": "completed",
      "lastBackupAge": 180,
      "failedBackupsLast24h": 0,
      "totalSize": "5.12 GB"
    }
  }
}
```

### Create Manual Backup

```bash
npm run backup:create
```

---

## ⚠️ Important Notes

1. **Always verify backups** before restoring in production
2. **Restore creates a safety backup** of current state
3. **Application will be stopped** during restore
4. **Test DR procedures quarterly** using `npm run dr:test`
5. **Keep WAL archiving enabled** for point-in-time recovery

---

## 📞 Emergency Contacts

| Role | Contact |
|------|---------|
| Primary DBA | [Name] - [Phone] |
| DevOps Lead | [Name] - [Phone] |
| CTO | [Name] - [Phone] |

---

## 📚 Full Documentation

For complete documentation, see:
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) - Full DR plan
- [resilience-strategy.md](../docs/resilience-strategy.md) - Resilience architecture

---

## 🧪 Testing

### Run Full DR Test Suite

```bash
npm run dr:test -- --full
```

This will test:
- ✅ Backup creation
- ✅ Backup integrity
- ✅ Backup compression
- ✅ Metadata validation
- ✅ Restore procedures
- ✅ Data verification
- ✅ WAL archiving
- ✅ Recovery time measurement

**Run this quarterly** to ensure DR procedures work correctly!

