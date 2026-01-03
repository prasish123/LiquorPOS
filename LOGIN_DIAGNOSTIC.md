# 🔍 Login Diagnostic Guide

## Quick Checks

### **1. Check Browser Console (Most Important!)**

Press `F12` → Go to **Console** tab

Look for errors like:
- `Failed to fetch`
- `CORS error`
- `401 Unauthorized`
- `500 Internal Server Error`
- Any red error messages

**Copy the exact error message and share it!**

---

### **2. Check Network Tab**

Press `F12` → Go to **Network** tab → Try login again

Look for these requests:

#### **Expected Flow:**
```
✅ GET /auth/csrf-token → 200 OK
✅ POST /auth/login → 200 OK
```

#### **Common Issues:**

| Request | Status | Problem |
|---------|--------|---------|
| GET /auth/csrf-token | 200 | ✅ CSRF token working |
| POST /auth/login | **401** | ❌ Wrong username/password |
| POST /auth/login | **403** | ❌ CSRF token still failing |
| POST /auth/login | **429** | ❌ Too many attempts (wait 1 min) |
| POST /auth/login | **500** | ❌ Backend error (check logs) |
| POST /auth/login | **(failed)** | ❌ CORS or network error |

**Click on the failed request → Response tab → Copy the error message**

---

### **3. Check Backend Terminal**

Look at your backend terminal for logs like:

#### **✅ Good (Login Success):**
```
GET /auth/csrf-token 200 5ms
POST /auth/login 200 150ms
```

#### **❌ Bad (Login Failed):**
```
POST /auth/login 401 10ms  ← Wrong credentials
POST /auth/login 403 0ms   ← CSRF issue
POST /auth/login 500 50ms  ← Server error
```

**Copy the exact log line and share it!**

---

## Common Error Codes & Solutions

### **401 Unauthorized - Invalid Credentials**

**Error Message:** "Invalid credentials" or "AUTH_INVALID_CREDENTIALS"

**Causes:**
1. Wrong username or password
2. User doesn't exist in database
3. Password not hashed correctly

**Solutions:**

#### **A. Verify Credentials**
```
Username: admin (lowercase!)
Password: password123 (lowercase!)
```

#### **B. Check Database**
```powershell
cd backend
npx prisma studio
```
- Open **User** table
- Verify `admin` user exists
- Check `active` field is `true`

#### **C. Re-seed Database**
```powershell
cd backend
npm run seed
```

---

### **403 Forbidden - CSRF Token Issue**

**Error Message:** "Invalid CSRF token" or "CSRF_TOKEN_MISMATCH"

**Causes:**
1. Frontend not sending CSRF token
2. Cookie not being set
3. CORS blocking cookies

**Solutions:**

#### **A. Hard Refresh Browser**
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

#### **B. Clear Cookies**
```
F12 → Application → Cookies → Delete all
Refresh page
```

#### **C. Check CORS in backend/.env**
```bash
ALLOWED_ORIGINS=http://localhost:5173
```

#### **D. Verify Frontend Code Updated**
```powershell
cd frontend
# Check if Login.tsx has CSRF token code
grep -n "csrf-token" src/pages/Login.tsx
# Should show lines with csrf token fetch
```

---

### **429 Too Many Requests - Rate Limited**

**Error Message:** "Too many login attempts"

**Cause:** More than 5 login attempts in 1 minute

**Solution:** Wait 60 seconds and try again

---

### **500 Internal Server Error**

**Error Message:** Various, check backend logs

**Common Causes:**

#### **A. Database Connection Failed**
```powershell
# Check PostgreSQL is running
Get-Service postgresql*

# Test connection
cd backend
npx prisma db execute --stdin
# Type: SELECT 1;
# Press Enter, then Ctrl+D
```

#### **B. Redis Connection Failed**
```powershell
# Check Redis is running
Get-Service redis*

# Or check backend logs for:
# "Redis connected successfully"
```

#### **C. Missing Environment Variables**
```powershell
cd backend
npm run validate:env
```

---

### **CORS Error**

**Error Message:** "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause:** Backend not allowing frontend origin

**Solution:**

Check `backend/.env`:
```bash
ALLOWED_ORIGINS=http://localhost:5173
```

Restart backend:
```powershell
cd backend
npm run start:dev
```

---

### **Network Error / Failed to Fetch**

**Error Message:** "Failed to fetch" or "Network request failed"

**Causes:**
1. Backend not running
2. Wrong API URL
3. Firewall blocking

**Solutions:**

#### **A. Verify Backend Running**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/health
```

#### **B. Check Frontend .env**
```bash
# frontend/.env
VITE_API_URL=http://localhost:3000
```

#### **C. Check Firewall**
```powershell
Test-NetConnection -ComputerName localhost -Port 3000
Test-NetConnection -ComputerName localhost -Port 5173
```

---

## Step-by-Step Diagnostic

### **Step 1: Verify Services Running**

```powershell
# Backend health
Invoke-RestMethod -Uri http://localhost:3000/health

# Should return: {"status":"ok", ...}
```

### **Step 2: Test CSRF Token Endpoint**

```powershell
# Get CSRF token
Invoke-RestMethod -Uri http://localhost:3000/auth/csrf-token

# Should return: {"csrfToken":"..."}
```

### **Step 3: Check Database Has Users**

```powershell
cd backend
npx prisma studio
```
- Open **User** table
- Verify `admin` user exists

### **Step 4: Try Login with curl**

```powershell
# Get CSRF token first
$response = Invoke-WebRequest -Uri http://localhost:3000/auth/csrf-token -SessionVariable session
$csrf = ($response.Content | ConvertFrom-Json).csrfToken

# Try login
$body = @{
    username = "admin"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/auth/login `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -Headers @{"x-csrf-token"=$csrf} `
    -WebSession $session
```

If this works, the backend is fine → Frontend issue
If this fails, check the error → Backend issue

---

## Quick Fixes

### **Nuclear Option: Full Reset**

```powershell
# 1. Stop everything
Get-Process node | Stop-Process -Force

# 2. Clear browser completely
# F12 → Application → Clear storage → Clear site data

# 3. Restart backend
cd "E:\ML Projects\POS-Omni\liquor-pos\backend"
npm run start:dev

# 4. Restart frontend
cd "E:\ML Projects\POS-Omni\liquor-pos\frontend"
npm run dev

# 5. Hard refresh browser
# Ctrl + Shift + R
```

---

## What to Share for Help

If still not working, share these:

1. **Browser console error** (F12 → Console)
2. **Network tab response** (F12 → Network → Click failed request → Response)
3. **Backend terminal logs** (last 20 lines)
4. **What status code** (401, 403, 500, etc.)

---

## Most Likely Issues

Based on "different error code":

### **If 401:**
- Wrong password → Try: `password123` (all lowercase)
- User doesn't exist → Run: `npm run seed` in backend

### **If 403:**
- CSRF still failing → Hard refresh browser (Ctrl+Shift+R)
- Cookies blocked → Check browser settings

### **If 500:**
- Database issue → Check PostgreSQL running
- Redis issue → Check Redis running

### **If Network Error:**
- Backend not running → Check `http://localhost:3000/health`
- CORS issue → Check `ALLOWED_ORIGINS` in backend/.env

---

**Tell me the error code/message and I can help fix it!**

