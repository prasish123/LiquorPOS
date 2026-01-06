# 🚀 POS SYSTEM DEPLOYMENT GUIDE

## Quick Start (One Command)

### Development (Local Testing)
```powershell
.\start-system.ps1 -Environment development -SetupEnv
```

### Client Terminal (POS at Store)
```powershell
.\start-system.ps1 -Environment client -SetupEnv
```

### Store Server (Local Server at Store)
```powershell
.\start-system.ps1 -Environment store -SetupEnv
```

### Cloud Deployment
```powershell
.\start-system.ps1 -Environment cloud -SetupEnv
```

---

## 🔧 Manual Setup (If Needed)

### 1. Setup Environment Files
```powershell
.\setup-env.ps1 -Environment development
```

### 2. Start System
```powershell
.\start-system.ps1 -Environment development
```

### 3. Stop System
```powershell
.\stop-system.ps1
```

---

## 📦 Deployment Scenarios

### Scenario 1: Single Store (All-in-One)
**Use Case:** Small store with one POS terminal

```powershell
# On store computer
.\start-system.ps1 -Environment store -SetupEnv
```

**What it does:**
- Starts local PostgreSQL database
- Starts local Redis cache
- Starts backend API server
- Starts frontend on port 80
- Enables offline mode

---

### Scenario 2: Multiple Terminals + Store Server
**Use Case:** Store with multiple POS terminals and one server

#### On Store Server:
```powershell
.\start-system.ps1 -Environment store -SetupEnv -SkipFrontend
```

#### On Each POS Terminal:
```powershell
.\setup-env.ps1 -Environment client -LocationId "YOUR-LOCATION-UUID" -TerminalId "terminal-01"
.\start-system.ps1 -Environment client -SkipDocker
```

**What it does:**
- Server runs database, backend API
- Terminals connect to server
- Each terminal has unique ID
- Offline mode enabled on terminals

---

### Scenario 3: Cloud Deployment (Multi-Store)
**Use Case:** Multiple stores connecting to central cloud server

#### On Cloud Server (AWS/Azure/GCP):
```bash
# Use Docker Compose for production
docker-compose -f docker-compose.prod.yml up -d
```

#### On Each Store Terminal:
```powershell
.\setup-env.ps1 -Environment client -LocationId "STORE-UUID"
# Edit frontend/.env to point to cloud API
# VITE_API_URL=https://api.yourstore.com
.\start-system.ps1 -Environment client -SkipDocker -SkipBackend
```

---

## 🔐 Security Checklist

### Before Production:

- [ ] Change all default passwords
- [ ] Generate new JWT secrets
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up firewall rules
- [ ] Enable audit logging
- [ ] Configure backup strategy
- [ ] Set up monitoring/alerts
- [ ] Test disaster recovery
- [ ] Configure Stripe (if using card payments)
- [ ] Test receipt printer integration

---

## 🐛 Troubleshooting

### Issue: "Docker not found"
**Solution:** Install Docker Desktop from https://docker.com

### Issue: "Port 3000 already in use"
**Solution:** 
```powershell
# Find and kill process
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### Issue: "CORS error"
**Solution:** 
1. Stop backend
2. Delete `backend/.env`
3. Run `.\setup-env.ps1 -Environment development`
4. Restart: `.\start-system.ps1 -Environment development`

### Issue: "Backend sync failed - Location ID must be UUID"
**Solution:** Already fixed in `setup-env.ps1` - it generates valid UUIDs

### Issue: "Redis authentication failed"
**Solution:** Already fixed - `setup-env.ps1` syncs passwords between `.env` and `docker-compose.yml`

---

## 📊 Environment Comparison

| Feature | Development | Client | Store | Cloud |
|---------|------------|--------|-------|-------|
| Database | Local | Remote | Local | Cloud |
| Redis | Local | Remote | Local | Cloud |
| Offline Mode | ✅ | ✅ | ✅ | ❌ |
| AI Features | ❌ | ❌ | ✅ | ✅ |
| Log Level | Debug | Info | Info | Warn |
| HTTPS | ❌ | ❌ | ⚠️ | ✅ |

---

## 🔄 Updating the System

### Pull Latest Changes
```powershell
git pull origin main
```

### Update Dependencies
```powershell
cd backend
npm install
cd ../frontend
npm install
```

### Run Migrations
```powershell
cd backend
npx prisma migrate deploy
```

### Restart System
```powershell
.\stop-system.ps1
.\start-system.ps1 -Environment production
```

---

## 📝 Configuration Files

### `.env` Files Created:
- `backend/.env` - Backend configuration
- `frontend/.env` - Frontend configuration
- `.env.info` - Secrets backup (KEEP SECURE!)

### Docker Files:
- `docker-compose.yml` - Development/Store setup
- `docker-compose.prod.yml` - Production cloud setup

---

## 🆘 Support

### Logs Location:
- Backend: Check terminal window or `backend/logs/`
- Frontend: Browser console (F12)
- Docker: `docker-compose logs`

### Health Checks:
- Backend: http://localhost:3000/health
- Frontend: http://localhost:5173
- Database: `docker exec -it liquor-pos-db psql -U postgres`

---

## ✅ Post-Deployment Checklist

After deployment, verify:

- [ ] Can login as cashier/manager/admin
- [ ] Can add items to cart
- [ ] Can complete cash transaction
- [ ] Transaction saves to database (check backend logs)
- [ ] Receipt prints (if configured)
- [ ] Manager can view reports
- [ ] Admin can manage users
- [ ] Offline mode works (disconnect network, try transaction)
- [ ] Multi-terminal sync works (if applicable)
- [ ] Backup runs successfully

---

**Need Help?** Check logs or contact support.

