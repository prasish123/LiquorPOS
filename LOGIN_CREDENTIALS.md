# 🔐 POS System - Login Credentials

## ✅ System Status: RUNNING

Your POS system is now fully operational!

- **Backend:** ✅ Running on http://localhost:3000
- **Frontend:** ✅ Running on http://localhost:5173
- **Database:** ✅ Connected (PostgreSQL)
- **Redis:** ✅ Connected

---

## 👤 Default User Accounts

Three user accounts were created during database seeding:

### **1. Admin Account (Full Access)**
```
Username: admin
Password: password123
PIN: 1234
Role: ADMIN
```
**Permissions:** Full system access, user management, reports, settings

---

### **2. Manager Account**
```
Username: manager
Password: password123
PIN: 5678
Role: MANAGER
```
**Permissions:** Sales, inventory management, reports (no user management)

---

### **3. Cashier Account**
```
Username: cashier
Password: password123
PIN: 0000
Role: CASHIER
```
**Permissions:** Sales transactions only (limited access)

---

## 🚀 Quick Access

### **Frontend (POS Interface)**
Open in browser: **http://localhost:5173**

### **Backend API Documentation**
Open in browser: **http://localhost:3000/api/docs**

### **Database GUI (Prisma Studio)**
```powershell
cd "E:\ML Projects\POS-Omni\liquor-pos\backend"
npx prisma studio
```
Opens at: **http://localhost:5555**

---

## 📦 Sample Data Included

Your database was seeded with:

### **Products (5 items)**
- `WINE-001` - Cabernet Sauvignon 2020 ($24.99)
- `BEER-001` - Craft IPA 6-Pack ($12.99)
- `SPIRITS-001` - Premium Vodka 750ml ($29.99)
- `MIXER-001` - Tonic Water 4-Pack ($5.99)
- `SNACK-001` - Mixed Nuts ($4.99)

### **Location**
- **Main Store** - 123 Main St, Miami, FL 33101
- Tax Rate: 7% (FL state) + 1.5% (Miami-Dade county)
- License: FL-LIQ-12345

### **Sample Customer**
- **John Doe** - john.doe@example.com
- Phone: +1-305-555-0123
- Age Verified: Yes

### **Inventory**
- All products have 100 units in stock
- Reorder point: 20 units

---

## 🧪 Test the System

### **1. Login to Frontend**
1. Open http://localhost:5173
2. Login with: `admin` / `password123`
3. You should see the POS dashboard

### **2. Test a Sale**
1. Search for a product (e.g., "wine")
2. Add to cart
3. Complete checkout with cash payment
4. Verify inventory decreased

### **3. Check API Health**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/health
```

### **4. View API Documentation**
Open: http://localhost:3000/api/docs

---

## 🔒 Security Notes

### **⚠️ IMPORTANT: Change Default Passwords!**

These are **development credentials** - change them before production:

```powershell
# Option 1: Through Frontend
# Login as admin → Settings → Users → Change Password

# Option 2: Through Prisma Studio
cd backend
npx prisma studio
# Navigate to User table and update passwords
```

### **Password Requirements**
- Minimum 8 characters
- Passwords are hashed with bcrypt (salt rounds: 10)
- PINs are 4-6 digits for quick cashier access

---

## 📊 What You Can Do Now

### **As Admin:**
- ✅ Process sales transactions
- ✅ Manage products and inventory
- ✅ Create/edit users
- ✅ View sales reports
- ✅ Configure locations
- ✅ Manage customers
- ✅ Age verification for alcohol sales
- ✅ Accept cash payments (card payments need Stripe)

### **Features Available:**
- ✅ Product search (by name, SKU, UPC)
- ✅ Barcode scanning (UPC lookup)
- ✅ Age verification (21+ for alcohol)
- ✅ Tax calculation (state + county)
- ✅ Inventory tracking
- ✅ Customer loyalty points
- ✅ Multi-location support
- ✅ Audit logging
- ✅ Offline mode (with sync)

### **Features Requiring Configuration:**
- ⚠️ **Card Payments** - Need Stripe API key
- ⚠️ **AI Search** - Need OpenAI API key (optional)
- ⚠️ **Error Tracking** - Need Sentry DSN (optional)

---

## 🛠️ Useful Commands

### **Stop/Start Services**

```powershell
# Stop backend (Ctrl+C in terminal, or)
Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Stop frontend (Ctrl+C in terminal, or)
Get-NetTCPConnection -LocalPort 5173 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Start backend
cd "E:\ML Projects\POS-Omni\liquor-pos\backend"
npm run start:dev

# Start frontend
cd "E:\ML Projects\POS-Omni\liquor-pos\frontend"
npm run dev
```

### **Database Management**

```powershell
cd backend

# View database in GUI
npx prisma studio

# Check migration status
npx prisma migrate status

# Re-seed database (WARNING: Resets data)
npm run seed

# Backup database
npm run backup:create
```

### **Health Checks**

```powershell
# Backend health
Invoke-RestMethod -Uri http://localhost:3000/health

# Detailed health (with auth)
cd backend
npm run health
```

---

## 📱 Mobile/Tablet Support

The POS system is responsive and works on:
- ✅ Desktop browsers (Chrome, Firefox, Edge)
- ✅ Tablets (iPad, Android tablets)
- ✅ Mobile phones (iOS, Android)

---

## 🎯 Next Steps

### **For Testing:**
1. ✅ Login with admin credentials
2. ✅ Test a cash transaction
3. ✅ Explore the API docs
4. ✅ View data in Prisma Studio

### **For Production:**
1. ⚠️ Change all default passwords
2. ⚠️ Configure Stripe for card payments
3. ⚠️ Setup SSL certificates
4. ⚠️ Configure production database
5. ⚠️ Setup monitoring (Sentry)
6. ⚠️ Review security checklist

See: `backend/PRE_LAUNCH_CHECKLIST_REVIEW.md`

---

## 🆘 Troubleshooting

### **Can't Login?**
- Verify database was seeded: `cd backend && npm run seed`
- Check user exists: `npx prisma studio` → User table
- Try password: `password123` (all lowercase, no spaces)

### **Products Not Showing?**
- Verify database was seeded: `cd backend && npm run seed`
- Check products exist: `npx prisma studio` → Product table

### **Backend Not Responding?**
- Check it's running: `Invoke-RestMethod -Uri http://localhost:3000/health`
- Check logs in terminal where backend is running
- Restart: Kill port 3000 and run `npm run start:dev`

---

## 📞 Support Resources

- **Setup Guide:** `QUICKSTART.md`
- **Environment Setup:** `backend/ENV_SETUP.md`
- **API Documentation:** http://localhost:3000/api/docs
- **Architecture:** `docs/architecture.md`
- **Troubleshooting:** `FIX_STARTUP_ISSUES.md`

---

**🎉 Congratulations! Your POS system is ready to use!**

Login at: **http://localhost:5173**  
Username: **admin**  
Password: **password123**

