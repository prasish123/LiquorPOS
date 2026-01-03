# Fix Startup Issues - Complete Guide

## 🔴 Current Problems Identified

1. **Port 3000 Already in Use** - Multiple backend instances trying to start
2. **Prisma Migrate Fails** - Need to see the actual error
3. **PowerShell curl Security Error** - Easy fix
4. **npm warnings** - Safe to ignore (peer dependency conflicts)

---

## 🛠️ Step-by-Step Fix

### **STEP 1: Kill All Existing Backend Processes**

**Option A: Using PowerShell (Recommended)**
```powershell
# Find and kill all Node processes on port 3000
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object {
    $processId = $_.OwningProcess
    Stop-Process -Id $processId -Force
    Write-Host "Killed process $processId on port 3000"
}
```

**Option B: Kill all Node processes (Nuclear option)**
```powershell
# WARNING: This kills ALL Node.js processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

**Option C: Manual Task Manager**
1. Press `Ctrl + Shift + Esc` to open Task Manager
2. Find all "Node.js" processes
3. Right-click → End Task

---

### **STEP 2: Fix Prisma Migrations**

The migration might be failing due to missing migrations folder or database issues.

```powershell
cd "E:\ML Projects\POS-Omni\liquor-pos\backend"

# Check current migration status
npx prisma migrate status

# If migrations folder doesn't exist, create initial migration
npx prisma migrate dev --name init

# If that fails, try reset (WARNING: Deletes all data)
npx prisma migrate reset --force

# Generate Prisma client
npx prisma generate
```

**Common Prisma Migration Errors:**

| Error | Solution |
|-------|----------|
| "Migration failed" | Check DATABASE_URL in .env |
| "Database does not exist" | Create database: `createdb liquor_pos` |
| "Connection refused" | Start PostgreSQL service |
| "Permission denied" | Check database user permissions |

---

### **STEP 3: Fix PowerShell curl Command**

PowerShell's `curl` is an alias for `Invoke-WebRequest` which has security restrictions.

**Option A: Use -UseBasicParsing flag**
```powershell
curl -UseBasicParsing http://localhost:3000/health
```

**Option B: Use Invoke-RestMethod (Better for APIs)**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/health
```

**Option C: Use real curl (if installed via Git or Chocolatey)**
```powershell
curl.exe http://localhost:3000/health
```

**Option D: Use browser**
```
Open: http://localhost:3000/health
```

---

### **STEP 4: Clean Start Everything**

Now that processes are killed and migrations are fixed:

#### **Terminal 1: Backend**
```powershell
cd "E:\ML Projects\POS-Omni\liquor-pos\backend"

# Verify .env exists
Get-Content .env | Select-String "DATABASE_URL"

# Start backend
npm run start:dev

# Wait for: "🚀 Application is running on: http://localhost:3000"
```

#### **Terminal 2: Frontend**
```powershell
cd "E:\ML Projects\POS-Omni\liquor-pos\frontend"

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    npm install
}

# Start frontend
npm run dev

# Wait for: "Local: http://localhost:5173/"
```

#### **Terminal 3: Health Check**
```powershell
# Wait 10 seconds for services to start
Start-Sleep -Seconds 10

# Check backend
Invoke-RestMethod -Uri http://localhost:3000/health

# Check frontend (should return HTML)
Invoke-WebRequest -Uri http://localhost:5173 -UseBasicParsing
```

---

## 🔍 Troubleshooting Specific Issues

### **Issue: Prisma Migrate Still Fails**

Get the actual error:
```powershell
cd backend
npx prisma migrate dev --name init 2>&1 | Tee-Object -FilePath migration-error.log
Get-Content migration-error.log
```

Common fixes:
```powershell
# 1. Check PostgreSQL is running
Get-Service postgresql* | Select-Object Name, Status

# 2. Test database connection
npx prisma db push --skip-generate

# 3. Check DATABASE_URL format
# Should be: postgresql://username:password@localhost:5432/database_name
```

### **Issue: "Cannot find module '@prisma/client'"**

```powershell
cd backend
npx prisma generate
npm install @prisma/client
```

### **Issue: Backend starts but crashes immediately**

Check logs:
```powershell
cd backend
npm run start:dev 2>&1 | Tee-Object -FilePath startup.log
```

### **Issue: Frontend can't connect to backend**

1. **Check CORS in backend/.env:**
```bash
ALLOWED_ORIGINS=http://localhost:5173
```

2. **Check frontend/.env:**
```bash
VITE_API_URL=http://localhost:3000
```

3. **Verify backend is actually running:**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/health
```

---

## ✅ Verification Checklist

After following the steps above, verify:

```powershell
# 1. Backend health
Invoke-RestMethod -Uri http://localhost:3000/health
# Expected: {"status":"ok", ...}

# 2. Backend API docs
Start-Process "http://localhost:3000/api/docs"

# 3. Frontend
Start-Process "http://localhost:5173"

# 4. Database connection
cd backend
npx prisma studio
# Should open database GUI at http://localhost:5555
```

---

## 📋 Quick Reference Commands

### **Kill Port 3000**
```powershell
Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### **Check What's Running**
```powershell
# Check port 3000
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

# Check port 5173
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue

# List all Node processes
Get-Process node -ErrorAction SilentlyContinue
```

### **Database Commands**
```powershell
cd backend

# Status
npx prisma migrate status

# Apply migrations
npx prisma migrate dev

# Reset database (WARNING: Deletes data)
npx prisma migrate reset

# Open database GUI
npx prisma studio

# Seed data
npm run seed
```

### **Health Checks**
```powershell
# Backend
Invoke-RestMethod -Uri http://localhost:3000/health

# Frontend
Invoke-WebRequest -Uri http://localhost:5173 -UseBasicParsing

# Database
cd backend
npx prisma db execute --stdin < "SELECT 1"
```

---

## 🚨 Emergency Reset

If nothing works, nuclear option:

```powershell
# 1. Kill everything
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Clean backend
cd "E:\ML Projects\POS-Omni\liquor-pos\backend"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm install

# 3. Reset database
npx prisma migrate reset --force
npx prisma generate
npm run seed

# 4. Clean frontend
cd "E:\ML Projects\POS-Omni\liquor-pos\frontend"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm install

# 5. Start fresh
cd "E:\ML Projects\POS-Omni\liquor-pos\backend"
npm run start:dev
```

---

## 📞 What to Check if Still Failing

1. **PostgreSQL Service Running?**
   ```powershell
   Get-Service postgresql*
   ```

2. **Redis Service Running?** (Optional but backend expects it)
   ```powershell
   Get-Service redis*
   ```

3. **Correct Node Version?**
   ```powershell
   node --version  # Should be 18+ or 20+
   ```

4. **Environment Variables Set?**
   ```powershell
   cd backend
   Get-Content .env
   ```

5. **Firewall Blocking Ports?**
   ```powershell
   Test-NetConnection -ComputerName localhost -Port 3000
   Test-NetConnection -ComputerName localhost -Port 5173
   ```

---

## 🎯 Expected Final State

When everything is working:

### **Terminal 1 (Backend):**
```
[Nest] 12345  - 01/03/2026, 10:30:00 AM     LOG [NestApplication] Nest application successfully started
🚀 Application is running on: http://localhost:3000
📚 API Documentation available at: http://localhost:3000/api/docs
```

### **Terminal 2 (Frontend):**
```
  VITE v7.3.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### **Browser:**
- Backend Health: http://localhost:3000/health → `{"status":"ok"}`
- Backend API Docs: http://localhost:3000/api/docs → Swagger UI
- Frontend: http://localhost:5173 → POS Login Screen

---

## 📝 Notes

- **npm warnings about @opentelemetry**: Safe to ignore, these are peer dependency conflicts that don't affect functionality
- **Stripe warnings**: Normal if you haven't configured Stripe yet (cash payments work)
- **Redis warnings**: Normal if Redis isn't running (in-memory cache fallback works)
- **OpenAI warnings**: Normal if you haven't configured OpenAI (regular search works)

---

**Need more help?** Run the health check script:
```powershell
cd backend
npm run health
```

