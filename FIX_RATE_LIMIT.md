# 🔧 Fix Rate Limit & CSRF Issues

## Problem

Getting errors:
- "Too many requests" (429)
- "Invalid CSRF token" (403)

This happens when you try to login too many times (>5 attempts in 1 minute).

---

## ✅ Quick Fix

### **Option 1: Wait 60 Seconds (Easiest)**

The rate limit resets after 1 minute. Just:
1. Wait 60 seconds
2. Try login again with: `manager` / `password123`

---

### **Option 2: Clear Rate Limit in Redis (Instant)**

```powershell
# Connect to Redis and clear rate limits
redis-cli FLUSHDB
```

**If redis-cli not found, use this:**

```powershell
# Restart Redis service (clears memory)
Restart-Service redis*
```

**Or restart backend** (reconnects to Redis):
```powershell
# In backend terminal: Ctrl+C
cd "E:\ML Projects\POS-Omni\liquor-pos\backend"
npm run start:dev
```

---

### **Option 3: Use Different Browser/Incognito**

Rate limits are per IP, so using incognito might help:

1. Open **Incognito/Private window**:
   - Chrome: `Ctrl + Shift + N`
   - Firefox: `Ctrl + Shift + P`

2. Go to: `http://localhost:5173`

3. Login: `manager` / `password123`

---

## 🔍 Verify Manager User Exists

Let's make sure the manager account is correct:

```powershell
cd backend
npx prisma studio
```

1. Open **User** table
2. Find user with username: `manager`
3. Verify:
   - ✅ Username: `manager` (lowercase)
   - ✅ Role: `MANAGER`
   - ✅ Active: `true`

---

## 🧪 Test Manager Login via API

Test if the backend accepts the credentials:

```powershell
# Wait 60 seconds first, then run:

# Get CSRF token
$response = Invoke-WebRequest -Uri http://localhost:3000/auth/csrf-token -SessionVariable session
$csrf = ($response.Content | ConvertFrom-Json).csrfToken

# Try manager login
$body = '{"username":"manager","password":"password123"}'
Invoke-RestMethod -Uri http://localhost:3000/auth/login `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -Headers @{"x-csrf-token"=$csrf} `
    -WebSession $session
```

**Expected result:**
```json
{
  "user": {
    "id": "...",
    "username": "manager",
    "role": "MANAGER",
    ...
  }
}
```

**If this works:** Frontend issue
**If this fails:** Backend/database issue

---

## 🔧 Re-seed Database (If User Missing)

If manager user doesn't exist or password is wrong:

```powershell
cd backend
npm run seed
```

This will recreate all 3 users:
- `admin` / `password123`
- `manager` / `password123`
- `cashier` / `password123`

---

## 📊 Understanding Rate Limits

### **Login Rate Limit:**
- **Limit:** 5 attempts per minute
- **Purpose:** Prevent brute force attacks
- **Reset:** After 60 seconds

### **Why You Hit It:**
- Multiple failed login attempts
- Browser auto-refresh retrying
- Testing different credentials quickly

### **How to Avoid:**
- Wait between attempts
- Use correct credentials
- Clear browser cache if CSRF issues

---

## 🐛 Common Causes

### **1. Wrong Password**
```
✅ Correct: password123 (all lowercase)
❌ Wrong: Password123
❌ Wrong: password 123 (space)
❌ Wrong: password123 (extra space at end)
```

### **2. Wrong Username**
```
✅ Correct: manager (all lowercase)
❌ Wrong: Manager
❌ Wrong: MANAGER
```

### **3. Browser Cache**
Old CSRF tokens cached, causing failures

**Fix:**
```
Ctrl + Shift + R (hard refresh)
Or use Incognito mode
```

---

## ✅ Step-by-Step Recovery

### **Step 1: Wait**
Wait 60 seconds for rate limit to reset

### **Step 2: Clear Browser**
```
1. Press F12
2. Application → Clear storage
3. Click "Clear site data"
4. Close browser tab
```

### **Step 3: Fresh Login**
```
1. Open NEW browser tab
2. Go to http://localhost:5173
3. Login: manager / password123
```

### **Step 4: If Still Fails**
Re-seed database:
```powershell
cd backend
npm run seed
```

---

## 🔍 Check Backend Logs

Look at your backend terminal for:

### **Rate Limit Hit:**
```
POST /auth/login 429 0ms
```

### **CSRF Issue:**
```
POST /auth/login 403 0ms
```

### **Success:**
```
GET /auth/csrf-token 200 5ms
POST /auth/login 200 150ms
```

---

## 🚨 Emergency: Disable Rate Limiting (Development Only!)

**WARNING:** Only do this for testing, never in production!

Edit `backend/src/app.module.ts`:

Find the ThrottlerModule configuration and temporarily increase limits:

```typescript
ThrottlerModule.forRoot([
  {
    name: 'strict',
    ttl: 60000,
    limit: 100, // Change from 5 to 100
  },
]),
```

Then restart backend:
```powershell
cd backend
npm run start:dev
```

**Remember to change it back to 5 for production!**

---

## 📋 Quick Checklist

- [ ] Wait 60 seconds
- [ ] Clear browser cache (Ctrl+Shift+R)
- [ ] Close all tabs of localhost:5173
- [ ] Open fresh tab
- [ ] Try login: manager / password123
- [ ] Check credentials are lowercase
- [ ] Verify user exists in Prisma Studio
- [ ] Check backend logs for actual error

---

## 🎯 Most Likely Solution

**Just wait 60 seconds and try again!**

The rate limit will reset automatically, and you should be able to login.

If you're in a hurry, use **Incognito mode** for instant access.

---

## ✅ After Successful Login

Once you login as manager, you should:
- ✅ See admin dashboard (managers have admin access)
- ✅ Can process sales
- ✅ Can manage inventory
- ✅ Can view reports
- ❌ Cannot manage users (admin only)

---

**Try waiting 60 seconds first - that's usually all you need!** ⏱️

