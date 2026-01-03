# 🚀 Quick Fix - 3 Commands to Get Running

## Problem: Port 3000 already in use + Multiple issues

## Solution: Run these 3 commands

### **Command 1: Kill Port 3000 (Copy-Paste This)**

```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }; Write-Host "✓ Port 3000 freed" -ForegroundColor Green
```

### **Command 2: Fix Prisma & Start Backend**

```powershell
cd "E:\ML Projects\POS-Omni\liquor-pos\backend"; npx prisma generate; npm run start:dev
```

**Wait for this message:**
```
🚀 Application is running on: http://localhost:3000
```

### **Command 3: Start Frontend (New Terminal)**

```powershell
cd "E:\ML Projects\POS-Omni\liquor-pos\frontend"; npm run dev
```

---

## ✅ Test It Works

### **Test Backend (New Terminal):**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/health
```

**Expected output:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-03T...",
  "database": "connected",
  "redis": "connected"
}
```

### **Test Frontend:**
Open browser: http://localhost:5173

---

## 🔧 If Prisma Migrate Still Fails

Run this ONCE:

```powershell
cd "E:\ML Projects\POS-Omni\liquor-pos\backend"
npx prisma migrate dev --name init --skip-seed
npx prisma generate
npm run seed
```

---

## 📝 About Those npm Warnings

The `@opentelemetry` warnings are **SAFE TO IGNORE**. They're just peer dependency version mismatches that don't affect functionality.

---

## 🆘 Still Having Issues?

1. **Check PostgreSQL is running:**
   ```powershell
   Get-Service postgresql*
   ```

2. **Check your .env file exists:**
   ```powershell
   Get-Content "E:\ML Projects\POS-Omni\liquor-pos\backend\.env"
   ```

3. **Run the automated fix script:**
   ```powershell
   cd "E:\ML Projects\POS-Omni\liquor-pos"
   .\fix-and-start.ps1
   ```

4. **See detailed troubleshooting:**
   Open `FIX_STARTUP_ISSUES.md` for complete guide

---

## 🎯 Expected Final State

**Terminal 1 (Backend):** Shows "Application is running on: http://localhost:3000"  
**Terminal 2 (Frontend):** Shows "Local: http://localhost:5173/"  
**Browser:** http://localhost:5173 shows POS login screen  

✨ **Done!** You can now test your POS system.

