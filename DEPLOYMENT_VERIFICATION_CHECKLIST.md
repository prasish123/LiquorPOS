# Deployment Verification Checklist

**Version:** 1.0  
**Last Updated:** January 5, 2026  
**Purpose:** Ensure successful and safe deployments to production

---

## Pre-Deployment Checklist

### 1. Code & Version Control
- [ ] All code changes are committed and pushed
- [ ] Working on correct branch (main/master for production)
- [ ] No uncommitted changes in working directory
- [ ] Version tag created (if applicable)
- [ ] Pull request reviewed and approved (if applicable)

### 2. Environment Configuration
- [ ] `.env` file configured with production values
- [ ] All required environment variables set
- [ ] No placeholder values (REPLACE_WITH_*, changeme, etc.)
- [ ] Secrets rotated if needed
- [ ] SSL certificates valid (if applicable)

### 3. Database
- [ ] Database migrations reviewed
- [ ] Migration rollback scripts exist
- [ ] Database backup completed
- [ ] Backup verified and accessible
- [ ] Database connection tested

### 4. Dependencies
- [ ] All npm packages up to date
- [ ] No critical security vulnerabilities (`npm audit`)
- [ ] Docker images built successfully
- [ ] All services dependencies available

### 5. Testing
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing (if applicable)
- [ ] Load tests completed (if applicable)
- [ ] Security scans completed

### 6. Pre-Deployment Validation
- [ ] Run `./scripts/pre-deploy-validation.sh` (Linux)
- [ ] Run `.\scripts\pre-deploy-validation.ps1` (Windows)
- [ ] All validation checks passed
- [ ] Disk space sufficient (< 80% usage)
- [ ] Memory available (> 512MB free)

---

## During Deployment Checklist

### 1. Deployment Lock
- [ ] Deployment lock acquired
- [ ] No other deployments in progress
- [ ] Team notified of deployment

### 2. Backup
- [ ] Pre-deployment database backup created
- [ ] Backup file location recorded
- [ ] Backup integrity verified

### 3. Code Update
- [ ] Latest code pulled from repository
- [ ] Correct branch/tag checked out
- [ ] Git commit hash recorded

### 4. Build
- [ ] Docker images built successfully
- [ ] No build errors or warnings
- [ ] Image sizes reasonable

### 5. Database Migrations
- [ ] Database ready and accessible
- [ ] Migrations applied successfully
- [ ] No migration errors
- [ ] Schema drift check passed

### 6. Service Deployment
- [ ] Old containers stopped gracefully
- [ ] New containers started
- [ ] All services running
- [ ] No container restarts

### 7. Health Checks
- [ ] Backend health endpoint responding (http://localhost:3000/health)
- [ ] Frontend accessible (http://localhost/)
- [ ] Database connection healthy
- [ ] Redis connection healthy
- [ ] All health checks passing

---

## Post-Deployment Checklist

### 1. Smoke Tests
- [ ] Run `./scripts/smoke-tests.sh` (Linux)
- [ ] Run `.\scripts\smoke-tests.ps1` (Windows)
- [ ] All smoke tests passing
- [ ] API endpoints responding correctly
- [ ] Authentication working
- [ ] Database queries working

### 2. Critical Functionality
- [ ] User login working
- [ ] Product catalog accessible
- [ ] Transactions can be created
- [ ] Payment processing working (if applicable)
- [ ] Inventory updates working
- [ ] Backup system operational

### 3. Performance
- [ ] Response times acceptable (< 1s for health check)
- [ ] CPU usage normal (< 70%)
- [ ] Memory usage normal (< 80%)
- [ ] Database connections normal (< 50)
- [ ] No memory leaks detected

### 4. Logs & Monitoring
- [ ] No errors in application logs
- [ ] No database errors
- [ ] No Redis errors
- [ ] Monitoring dashboards updated
- [ ] Alert rules active

### 5. Security
- [ ] HTTPS working (if applicable)
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] Audit logging working
- [ ] No exposed secrets in logs

### 6. Documentation
- [ ] Deployment log saved
- [ ] Deployment version tagged
- [ ] Deployment notes recorded
- [ ] Team notified of completion
- [ ] Rollback procedure documented

---

## Rollback Checklist (If Needed)

### When to Rollback
- [ ] Critical functionality broken
- [ ] Health checks failing
- [ ] High error rates (> 5% requests)
- [ ] Performance degradation (> 50% slower)
- [ ] Security vulnerability exposed
- [ ] Data corruption detected

### Rollback Steps
- [ ] Identify rollback point (backup file)
- [ ] Notify team of rollback decision
- [ ] Stop current services
- [ ] Run rollback script: `./rollback.sh <backup_file>`
- [ ] Verify rollback completed
- [ ] Run health checks
- [ ] Run smoke tests
- [ ] Verify functionality restored
- [ ] Document rollback reason
- [ ] Plan fix for next deployment

---

## Verification Commands

### Linux/Mac
```bash
# Pre-deployment validation
bash scripts/pre-deploy-validation.sh

# Deploy
bash deploy.sh production

# Smoke tests
bash scripts/smoke-tests.sh

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Check services
docker-compose ps

# Rollback if needed
bash rollback.sh ./backend/backups/backup_YYYYMMDD_HHMMSS.sql
```

### Windows
```powershell
# Pre-deployment validation
.\scripts\pre-deploy-validation.ps1

# Deploy
.\deploy.ps1 -Environment production

# Smoke tests
.\scripts\smoke-tests.ps1

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Check services
docker-compose ps

# Rollback if needed
.\rollback.ps1 .\backend\backups\backup_YYYYMMDD_HHMMSS.sql
```

---

## Quick Health Check URLs

### Local Development
- Backend Health: http://localhost:3000/health
- Backend API Docs: http://localhost:3000/api
- Frontend: http://localhost/
- Database: localhost:5432
- Redis: localhost:6379

### Production (Update with actual URLs)
- Backend Health: https://api.yourdomain.com/health
- Backend API Docs: https://api.yourdomain.com/api
- Frontend: https://yourdomain.com/
- Monitoring Dashboard: https://monitoring.yourdomain.com/

---

## Emergency Contacts

### Development Team
- Lead Developer: [Name] - [Contact]
- DevOps Engineer: [Name] - [Contact]
- Database Admin: [Name] - [Contact]

### On-Call Rotation
- Primary: [Name] - [Contact]
- Secondary: [Name] - [Contact]

### Escalation
- Engineering Manager: [Name] - [Contact]
- CTO: [Name] - [Contact]

---

## Deployment Sign-Off

**Deployment Date:** _______________  
**Deployment Time:** _______________  
**Deployed By:** _______________  
**Version/Commit:** _______________  

**Pre-Deployment Validation:** ☐ PASS ☐ FAIL  
**Deployment Successful:** ☐ YES ☐ NO  
**Post-Deployment Tests:** ☐ PASS ☐ FAIL  
**Rollback Required:** ☐ YES ☐ NO  

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

**Approved By:** _______________  
**Signature:** _______________  
**Date:** _______________

---

## Lessons Learned (Post-Deployment)

### What Went Well
- 
- 
- 

### What Could Be Improved
- 
- 
- 

### Action Items for Next Deployment
- 
- 
- 

---

**Document Version:** 1.0  
**Next Review Date:** [30 days from creation]  
**Owner:** DevOps Team

