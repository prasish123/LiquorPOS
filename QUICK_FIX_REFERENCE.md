# Quick Fix Reference Card

## 🚨 Common Issues & Instant Fixes

### Issue: "Location ID must be a valid UUID"

**Symptoms:**
- Backend sync fails with 400 error
- Console shows: `locationId must be a valid UUID`

**Instant Fix:**
```powershell
cd "E:\ML Projects\POS-Omni\liquor-pos"
.\Startup-Deploy` Scripts\setup-env.ps1 -Environment development
```

**Why it works:** Regenerates `.env` files with proper UUIDs

---

### Issue: "WRONGPASS invalid username-password pair"

**Symptoms:**
- Redis connection fails
- Backend can't connect to Redis

**Instant Fix:**
```powershell
.\Startup-Deploy` Scripts\setup-env.ps1 -Environment development
docker-compose down
docker-compose up -d
```

**Why it works:** Regenerates matching Redis passwords in `.env` and `docker-compose.yml`

---

### Issue: CORS blocking requests

**Symptoms:**
- Frontend can't connect to backend
- Console shows: `Access to fetch blocked by CORS policy`

**Instant Fix:**
```powershell
# Stop backend
Get-Process -Name "node" | Stop-Process -Force

# Regenerate .env with correct ALLOWED_ORIGINS
.\Startup-Deploy` Scripts\setup-env.ps1 -Environment development

# Restart backend
cd backend
npm run start:dev
```

**Why it works:** Ensures `ALLOWED_ORIGINS` is set before backend starts

---

### Issue: Transaction saved but not synced

**Symptoms:**
- Toast shows: "Transaction saved locally. Backend sync failed"
- Order in IndexedDB but not in PostgreSQL

**Instant Fix:**
1. Check if backend is running: `curl http://localhost:3000/health`
2. Check if authenticated: Re-login to get fresh JWT token
3. Manual sync will happen automatically when backend is available

**Why it works:** System has offline-first architecture with automatic retry

---

### Issue: Can't start the system

**Symptoms:**
- Multiple errors during startup
- Services not starting in correct order

**Instant Fix:**
```powershell
# Clean slate
.\Startup-Deploy` Scripts\stop-system.ps1

# Setup configuration
.\Startup-Deploy` Scripts\setup-env.ps1 -Environment development

# Start everything
.\Startup-Deploy` Scripts\start-system.ps1
```

**Why it works:** Ensures clean state and proper startup order

---

## 📋 Pre-Flight Checklist

Before starting development:
- [ ] Docker Desktop is running
- [ ] `.env` files exist in `backend/` and `frontend/`
- [ ] UUIDs in `.env` are valid (not `loc-001` or `terminal-01`)
- [ ] Redis password matches in `.env` and `docker-compose.yml`

**Quick Check:**
```powershell
# Check if .env files exist
Test-Path backend/.env
Test-Path frontend/.env

# Check if UUIDs are valid (should be 36 characters with hyphens)
Get-Content frontend/.env | Select-String "VITE_LOCATION_ID"
Get-Content frontend/.env | Select-String "VITE_TERMINAL_ID"
```

---

## 🔧 Script Quick Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `setup-env.ps1` | Generate configuration | First time setup, after config issues |
| `start-system.ps1` | Start all services | Development, single-store deployment |
| `start-store-server.ps1` | Start backend only | Dedicated store server |
| `start-pos-terminal.ps1` | Start frontend only | POS client terminal |
| `stop-system.ps1` | Stop all services | Clean shutdown, troubleshooting |

---

## 🎯 Troubleshooting Decision Tree

```
Is the system starting?
├─ NO → Run stop-system.ps1, then setup-env.ps1, then start-system.ps1
└─ YES
    │
    Is backend sync working?
    ├─ NO → Check UUIDs in .env files
    │       └─ Invalid? → Run setup-env.ps1
    │       └─ Valid? → Check authentication (re-login)
    └─ YES
        │
        Is Redis working?
        ├─ NO → Check Redis password matches
        │       └─ Run setup-env.ps1 and restart Docker
        └─ YES → System is healthy! 🎉
```

---

## 💡 Pro Tips

### Tip 1: Always use setup-env.ps1 for configuration
**Don't:** Manually edit `.env` files with random UUIDs  
**Do:** Run `setup-env.ps1` to generate proper configuration

### Tip 2: Check logs when things fail
```powershell
# Backend logs
cd backend
npm run start:dev  # Watch console output

# Frontend logs
# Open browser console (F12)

# Docker logs
docker-compose logs redis
docker-compose logs postgres
```

### Tip 3: Use the right script for your deployment
- **Development:** `start-system.ps1`
- **Store Server:** `start-store-server.ps1`
- **POS Terminal:** `start-pos-terminal.ps1`
- **Cloud:** `setup-cloud-deployment.ps1`

### Tip 4: Keep .env.info secure
After running `setup-env.ps1`, a file called `.env.info` is created with all secrets. **Never commit this file to git!**

---

## 🆘 Emergency Contacts

### System Down?
1. Run `stop-system.ps1`
2. Run `setup-env.ps1`
3. Run `start-system.ps1`
4. If still failing, check logs and contact DevOps

### Data Integrity Issues?
1. Check PostgreSQL: `docker-compose logs postgres`
2. Check Redis: `docker-compose logs redis`
3. Verify transactions in database
4. Contact Database Admin if needed

### Authentication Issues?
1. Clear browser cookies
2. Re-login to get fresh JWT token
3. Check backend logs for auth errors
4. Contact Security Team if persistent

---

## 📞 Support Resources

- **Documentation:** See `DEPLOYMENT_GUIDE.md`
- **Deployment Scenarios:** See `DEPLOYMENT_SCENARIOS.md`
- **Detailed Fix Report:** See `AGENTIC_FIX_LOOP_REPORT.md`
- **Visual Summary:** See `FIXES_VISUAL_SUMMARY.md`

---

**Last Updated:** January 5, 2026  
**Version:** 1.0 (Post Agentic Fix Loop)

