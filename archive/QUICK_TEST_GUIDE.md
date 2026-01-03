# 🚀 Quick Test Guide - Start Here!

## ✅ Prerequisites
- Backend running: http://localhost:3000
- Frontend running: http://localhost:5173
- Login working: admin / password123

---

## 🎯 5-Minute Quick Test

### **Test 1: Login & Navigation (1 min)**
```
1. Go to http://localhost:5173
2. Login: admin / password123
3. ✅ Should see admin dashboard
4. Click around - explore the interface
```

### **Test 2: Process Your First Sale (3 min)**
```
1. Go to POS Terminal (or click POS icon)
2. Search for "nuts"
3. Click "Mixed Nuts" ($4.99)
4. Click "Checkout"
5. Select "Cash"
6. Enter $10.00
7. Click "Complete Sale"
8. ✅ Should see: Change $4.59
9. ✅ Should see: Receipt/confirmation
```

### **Test 3: Verify Inventory Updated (1 min)**
```
1. Go to Inventory section
2. Find "Mixed Nuts"
3. ✅ Should show 99 units (was 100, sold 1)
```

**If all 3 work → Your POS is fully functional!** 🎉

---

## 🧪 15-Minute Core Test

### **Test Different User Roles:**

#### **1. Admin (Full Access)**
```
Login: admin / password123
Try:
- View all products ✅
- Process a sale ✅
- View reports ✅
- Manage users ✅
```

#### **2. Manager (Sales & Inventory)**
```
Logout → Login: manager / password123
Try:
- Process sales ✅
- Adjust inventory ✅
- View reports ✅
- Manage users ❌ (should be blocked)
```

#### **3. Cashier (POS Only)**
```
Logout → Login: cashier / password123
Try:
- Process sales ✅
- View admin ❌ (should redirect to POS)
```

---

### **Test Multiple Items Sale:**
```
1. Login as cashier
2. Add to cart:
   - Wine ($24.99) x2
   - Beer ($12.99) x1
   - Nuts ($4.99) x3
3. Checkout with cash
4. ✅ Total should be: $84.56
   (Subtotal $77.94 + Tax $6.62)
```

---

### **Test Age Verification:**
```
1. Add "Premium Vodka" to cart
2. Try to checkout
3. ✅ Should prompt for age verification
4. Verify age (21+)
5. Complete sale
```

---

### **Test Product Search:**
```
Try searching for:
- "wine" → Should find Cabernet
- "WINE-001" → Should find by SKU
- "012345678901" → Should find by UPC
```

---

## 🎨 What to Look For

### **✅ Good Signs:**
- Login redirects to correct page
- Products load quickly
- Cart updates instantly
- Prices calculate correctly
- Inventory decreases after sale
- No console errors (F12)
- Smooth UI transitions

### **❌ Red Flags:**
- Errors in console (F12)
- Prices wrong
- Inventory not updating
- Slow loading (>3 seconds)
- UI freezing
- Login loops

---

## 📊 Quick Calculations to Verify

### **Tax Calculation:**
```
Product: $4.99
Tax (8.5%): $0.42
Total: $5.41

Formula: Price × 1.085
```

### **Multiple Items:**
```
Wine x2: $49.98
Beer x1: $12.99
Nuts x3: $14.97
-----------------
Subtotal: $77.94
Tax (8.5%): $6.62
Total: $84.56
```

### **Change Calculation:**
```
Total: $5.41
Paid: $10.00
Change: $4.59
```

---

## 🔍 Quick Checks

### **Database Check:**
```powershell
cd backend
npx prisma studio
```
Opens at: http://localhost:5555
- Check User table (3 users)
- Check Product table (5 products)
- Check Transaction table (your sales)

### **API Check:**
```powershell
# Health
Invoke-RestMethod -Uri http://localhost:3000/health

# Products
Invoke-RestMethod -Uri http://localhost:3000/api/products
```

### **API Docs:**
```
Open: http://localhost:3000/api/docs
Browse all available endpoints
```

---

## 🎯 Test Scenarios by Priority

### **🔴 MUST TEST (Critical):**
1. ✅ Login (all 3 roles)
2. ✅ Process cash sale
3. ✅ Inventory updates
4. ✅ Age verification for alcohol
5. ✅ Logout

### **🟡 SHOULD TEST (Important):**
1. ✅ Multiple items in cart
2. ✅ Product search
3. ✅ View reports
4. ✅ Customer lookup
5. ✅ Manual inventory adjustment

### **🟢 NICE TO TEST (Optional):**
1. ✅ Add new product
2. ✅ Edit product
3. ✅ Add customer
4. ✅ Export reports
5. ✅ Card payment (if Stripe configured)

---

## 🐛 Common Issues & Quick Fixes

### **Issue: Products not showing**
```powershell
cd backend
npm run seed
```

### **Issue: Inventory not updating**
```
- Check backend logs for errors
- Refresh browser (F5)
- Check Prisma Studio for actual values
```

### **Issue: Login fails**
```
- Clear browser cache (Ctrl+Shift+R)
- Check credentials (lowercase!)
- Verify backend running
```

### **Issue: Prices wrong**
```
Tax should be 8.5% (7% state + 1.5% county)
Check Location settings in database
```

---

## 📱 Mobile/Tablet Testing

### **Responsive Design:**
```
1. Open DevTools (F12)
2. Click device toolbar icon
3. Select:
   - iPhone 12 Pro
   - iPad Pro
   - Galaxy S20
4. Test POS interface
```

### **Touch Gestures:**
- Tap products to add
- Swipe to navigate
- Pinch to zoom (if enabled)

---

## 🎓 Learning the System

### **Explore These Features:**

**Products:**
- Browse catalog
- Search by name/SKU/UPC
- View product details
- Check inventory levels

**Sales:**
- Add items to cart
- Modify quantities
- Apply discounts (if available)
- Process payments
- Print receipts

**Inventory:**
- View stock levels
- Low stock alerts
- Manual adjustments
- Reorder points

**Reports:**
- Daily sales summary
- Top products
- Employee performance
- Inventory valuation

**Customers:**
- Customer database
- Purchase history
- Loyalty points
- Age verification records

---

## 🎯 Success Checklist

After testing, you should be able to:
- [ ] Login as all 3 user types
- [ ] Process a complete sale
- [ ] See inventory decrease
- [ ] View transaction history
- [ ] Access reports
- [ ] Understand the UI layout
- [ ] Know where to find products
- [ ] Know how to add items to cart
- [ ] Know how to complete checkout
- [ ] Know how to logout

---

## 📞 Next Steps

### **If Everything Works:**
1. ✅ Customize products for your store
2. ✅ Add real users
3. ✅ Configure Stripe for card payments
4. ✅ Setup for production

### **If Something Doesn't Work:**
1. Check `TEST_SCENARIOS.md` for detailed tests
2. Check `LOGIN_DIAGNOSTIC.md` for troubleshooting
3. Check backend logs for errors
4. Check browser console (F12)

### **For Production:**
1. Read `backend/PRE_LAUNCH_CHECKLIST_REVIEW.md`
2. Change default passwords
3. Configure SSL
4. Setup monitoring
5. Test thoroughly

---

## 🚀 Ready to Test?

**Start with the 5-Minute Quick Test above!**

Then explore the system at your own pace. The interface is intuitive and designed for ease of use.

**Have fun testing your POS system!** 🎉

---

## 📚 Documentation

- **Full Test Scenarios:** `TEST_SCENARIOS.md`
- **Login Credentials:** `LOGIN_CREDENTIALS.md`
- **System Status:** `SYSTEM_READY.md`
- **Troubleshooting:** `LOGIN_DIAGNOSTIC.md`
- **Quick Start:** `QUICKSTART.md`

