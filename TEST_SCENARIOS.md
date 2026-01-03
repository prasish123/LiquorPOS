# 🧪 POS System - Test Scenarios & Use Cases

## ✅ System Status
- Backend: Running on http://localhost:3000
- Frontend: Running on http://localhost:5173
- Login: Working! ✅

---

## 🎯 Test Plan Overview

### **Priority Levels:**
- 🔴 **Critical** - Core functionality, must work
- 🟡 **Important** - Key features, should work
- 🟢 **Nice-to-Have** - Additional features, good to test

---

# 1️⃣ AUTHENTICATION & AUTHORIZATION

## 🔴 Test Case 1.1: Admin Login
**Goal:** Verify admin can login and access admin features

**Steps:**
1. Go to http://localhost:5173
2. Login with:
   - Username: `admin`
   - Password: `password123`
3. Should redirect to `/admin` dashboard

**Expected Results:**
- ✅ Login successful
- ✅ Redirected to admin dashboard
- ✅ Can see admin menu/navigation
- ✅ User info displayed (Admin User)

**Test Data:**
```
Username: admin
Password: password123
Role: ADMIN
```

---

## 🔴 Test Case 1.2: Manager Login
**Goal:** Verify manager can login with appropriate permissions

**Steps:**
1. Logout (if logged in)
2. Login with:
   - Username: `manager`
   - Password: `password123`
3. Should redirect to `/admin` dashboard

**Expected Results:**
- ✅ Login successful
- ✅ Can access sales and inventory
- ✅ Can view reports
- ✅ Cannot manage users (admin only)

**Test Data:**
```
Username: manager
Password: password123
Role: MANAGER
```

---

## 🔴 Test Case 1.3: Cashier Login
**Goal:** Verify cashier has limited access (POS only)

**Steps:**
1. Logout
2. Login with:
   - Username: `cashier`
   - Password: `password123`
3. Should redirect to `/pos` terminal

**Expected Results:**
- ✅ Login successful
- ✅ Redirected to POS terminal
- ✅ Can process sales
- ✅ Cannot access admin features

**Test Data:**
```
Username: cashier
Password: password123
Role: CASHIER
```

---

## 🟡 Test Case 1.4: Invalid Login
**Goal:** Verify system rejects invalid credentials

**Steps:**
1. Try login with:
   - Username: `admin`
   - Password: `wrongpassword`

**Expected Results:**
- ❌ Login fails
- ✅ Error message displayed
- ✅ User stays on login page

---

## 🟡 Test Case 1.5: Logout
**Goal:** Verify logout clears session

**Steps:**
1. Login as admin
2. Click logout button
3. Try accessing `/admin` directly

**Expected Results:**
- ✅ Redirected to login page
- ✅ Cannot access protected routes
- ✅ Session cleared

---

# 2️⃣ PRODUCT MANAGEMENT

## 🔴 Test Case 2.1: View Products
**Goal:** Verify product catalog displays correctly

**Steps:**
1. Login as admin/manager
2. Navigate to Products section
3. View product list

**Expected Results:**
- ✅ See 5 sample products:
  - Cabernet Sauvignon 2020 ($24.99)
  - Craft IPA 6-Pack ($12.99)
  - Premium Vodka 750ml ($29.99)
  - Tonic Water 4-Pack ($5.99)
  - Mixed Nuts ($4.99)
- ✅ Products show correct prices
- ✅ Products show inventory levels

---

## 🟡 Test Case 2.2: Search Products
**Goal:** Verify product search functionality

**Steps:**
1. Go to POS terminal
2. Search for "wine"
3. Search for "WINE-001" (SKU)
4. Search for "012345678901" (UPC)

**Expected Results:**
- ✅ Search by name works
- ✅ Search by SKU works
- ✅ Search by UPC works
- ✅ Results display instantly

**Test Data:**
```
Product: Cabernet Sauvignon 2020
SKU: WINE-001
UPC: 012345678901
Price: $24.99
```

---

## 🟡 Test Case 2.3: Add New Product (Admin Only)
**Goal:** Verify admin can add products

**Steps:**
1. Login as admin
2. Go to Products → Add Product
3. Fill in product details:
   - SKU: `TEST-001`
   - Name: `Test Product`
   - Category: `snacks`
   - Price: `9.99`
   - Cost: `5.00`
4. Save product

**Expected Results:**
- ✅ Product created successfully
- ✅ Appears in product list
- ✅ Can be searched in POS

---

## 🟢 Test Case 2.4: Edit Product
**Goal:** Verify product can be updated

**Steps:**
1. Login as admin/manager
2. Select a product
3. Edit price from $24.99 to $29.99
4. Save changes

**Expected Results:**
- ✅ Price updated
- ✅ New price shows in POS
- ✅ Audit log created

---

# 3️⃣ SALES TRANSACTIONS (CRITICAL!)

## 🔴 Test Case 3.1: Simple Cash Sale
**Goal:** Process a basic cash transaction

**Steps:**
1. Login as cashier
2. Search for "Mixed Nuts" ($4.99)
3. Add to cart
4. Click Checkout
5. Select "Cash" payment
6. Enter amount: $10.00
7. Complete sale

**Expected Results:**
- ✅ Item added to cart
- ✅ Subtotal: $4.99
- ✅ Tax calculated (8.5%): $0.42
- ✅ Total: $5.41
- ✅ Change calculated: $4.59
- ✅ Sale completed
- ✅ Inventory decreased by 1
- ✅ Receipt generated

**Test Data:**
```
Product: Mixed Nuts
Price: $4.99
Tax Rate: 8.5% (7% state + 1.5% county)
Payment: Cash $10.00
Expected Total: $5.41
Expected Change: $4.59
```

---

## 🔴 Test Case 3.2: Multiple Items Sale
**Goal:** Process sale with multiple items

**Steps:**
1. Add "Cabernet Sauvignon" ($24.99) - Qty: 2
2. Add "Craft IPA" ($12.99) - Qty: 1
3. Add "Mixed Nuts" ($4.99) - Qty: 3
4. Checkout with cash

**Expected Results:**
- ✅ Cart shows 3 line items
- ✅ Quantities correct
- ✅ Subtotal: $77.94
- ✅ Tax: $6.62
- ✅ Total: $84.56
- ✅ All inventory updated

**Test Data:**
```
Items:
- Cabernet Sauvignon x2 = $49.98
- Craft IPA x1 = $12.99
- Mixed Nuts x3 = $14.97
Subtotal: $77.94
Tax (8.5%): $6.62
Total: $84.56
```

---

## 🔴 Test Case 3.3: Age-Restricted Sale
**Goal:** Verify age verification for alcohol

**Steps:**
1. Add "Premium Vodka" ($29.99) to cart
2. Proceed to checkout
3. System should prompt for age verification

**Expected Results:**
- ✅ Age verification required
- ✅ Cannot complete without verification
- ✅ Verification recorded in audit log
- ✅ Transaction includes verification flag

**Test Data:**
```
Product: Premium Vodka 750ml
Age Restricted: Yes (21+)
Requires: Age verification
```

---

## 🟡 Test Case 3.4: Modify Cart
**Goal:** Verify cart can be modified

**Steps:**
1. Add "Wine" to cart
2. Change quantity from 1 to 3
3. Remove item
4. Add different item

**Expected Results:**
- ✅ Quantity updates correctly
- ✅ Price recalculates
- ✅ Can remove items
- ✅ Can add new items

---

## 🟡 Test Case 3.5: Card Payment (Requires Stripe)
**Goal:** Process card payment

**Note:** Only works if `STRIPE_SECRET_KEY` is configured

**Steps:**
1. Add items to cart
2. Select "Card" payment
3. Enter test card: `4242 4242 4242 4242`
4. Complete payment

**Expected Results:**
- ✅ Payment authorized
- ✅ Payment captured
- ✅ Transaction completed
- ✅ Receipt shows last 4 digits

**Test Card:**
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
```

---

# 4️⃣ INVENTORY MANAGEMENT

## 🔴 Test Case 4.1: View Inventory
**Goal:** Check current stock levels

**Steps:**
1. Login as admin/manager
2. Go to Inventory section
3. View stock levels

**Expected Results:**
- ✅ All products show 100 units (initial seed)
- ✅ Can see available vs reserved
- ✅ Low stock alerts (if < 20)

---

## 🟡 Test Case 4.2: Inventory Decreases After Sale
**Goal:** Verify inventory updates automatically

**Steps:**
1. Note current inventory for "Mixed Nuts" (should be 100)
2. Process sale of 5 units
3. Check inventory again

**Expected Results:**
- ✅ Inventory decreased to 95
- ✅ Update is immediate
- ✅ Audit trail created

---

## 🟡 Test Case 4.3: Manual Inventory Adjustment
**Goal:** Adjust inventory manually

**Steps:**
1. Login as admin/manager
2. Go to Inventory
3. Select "Mixed Nuts"
4. Adjust quantity: Add 50 units
5. Reason: "Received shipment"

**Expected Results:**
- ✅ Inventory increased by 50
- ✅ Adjustment logged
- ✅ Reason recorded

---

## 🟡 Test Case 4.4: Low Stock Alert
**Goal:** Verify low stock notifications

**Steps:**
1. Process sales until inventory < 20
2. Check inventory dashboard

**Expected Results:**
- ✅ Low stock warning displayed
- ✅ Product highlighted in red/yellow
- ✅ Reorder point triggered

---

# 5️⃣ CUSTOMER MANAGEMENT

## 🟡 Test Case 5.1: View Customers
**Goal:** Access customer database

**Steps:**
1. Login as admin/manager
2. Go to Customers section
3. View customer list

**Expected Results:**
- ✅ See sample customer: John Doe
- ✅ Email: john.doe@example.com
- ✅ Phone: +1-305-555-0123
- ✅ Age verified: Yes

---

## 🟡 Test Case 5.2: Add New Customer
**Goal:** Create customer profile

**Steps:**
1. Go to Customers → Add Customer
2. Fill in:
   - First Name: Jane
   - Last Name: Smith
   - Email: jane.smith@example.com
   - Phone: +1-305-555-9999
3. Save customer

**Expected Results:**
- ✅ Customer created
- ✅ Appears in customer list
- ✅ Can be selected during checkout

---

## 🟡 Test Case 5.3: Customer Lookup During Sale
**Goal:** Associate sale with customer

**Steps:**
1. Start new sale
2. Search for customer "John Doe"
3. Select customer
4. Complete sale

**Expected Results:**
- ✅ Customer linked to transaction
- ✅ Purchase history updated
- ✅ Loyalty points awarded (if enabled)

---

# 6️⃣ REPORTING & ANALYTICS

## 🟡 Test Case 6.1: Daily Sales Report
**Goal:** View sales summary

**Steps:**
1. Login as admin/manager
2. Go to Reports → Sales
3. Select date range: Today
4. View report

**Expected Results:**
- ✅ Total sales amount
- ✅ Number of transactions
- ✅ Average transaction value
- ✅ Payment method breakdown

---

## 🟡 Test Case 6.2: Top Products Report
**Goal:** See best-selling items

**Steps:**
1. Go to Reports → Products
2. View top products

**Expected Results:**
- ✅ Products ranked by sales
- ✅ Quantity sold shown
- ✅ Revenue per product

---

## 🟡 Test Case 6.3: Inventory Report
**Goal:** Check stock status

**Steps:**
1. Go to Reports → Inventory
2. View current stock levels

**Expected Results:**
- ✅ All products listed
- ✅ Current quantities
- ✅ Low stock items highlighted
- ✅ Stock value calculated

---

# 7️⃣ SYSTEM FEATURES

## 🟢 Test Case 7.1: Health Check
**Goal:** Verify system health

**Steps:**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/health
```

**Expected Results:**
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "memory_heap": {...},
  "memory_rss": {...},
  "disk": {...}
}
```

---

## 🟢 Test Case 7.2: API Documentation
**Goal:** Access Swagger docs

**Steps:**
1. Open http://localhost:3000/api/docs
2. Browse available endpoints
3. Try "Try it out" on GET /api/products

**Expected Results:**
- ✅ Swagger UI loads
- ✅ All endpoints documented
- ✅ Can test endpoints directly

---

## 🟢 Test Case 7.3: Database GUI
**Goal:** View data in Prisma Studio

**Steps:**
```powershell
cd backend
npx prisma studio
```

**Expected Results:**
- ✅ Opens at http://localhost:5555
- ✅ Can browse all tables
- ✅ Can view/edit data
- ✅ See relationships

---

# 8️⃣ ERROR HANDLING

## 🟡 Test Case 8.1: Insufficient Inventory
**Goal:** Handle out-of-stock scenario

**Steps:**
1. Try to sell 200 units of "Mixed Nuts" (only 100 available)
2. Attempt checkout

**Expected Results:**
- ❌ Sale blocked
- ✅ Error message: "Insufficient stock"
- ✅ Suggests available quantity

---

## 🟡 Test Case 8.2: Invalid Product Search
**Goal:** Handle product not found

**Steps:**
1. Search for "INVALID-SKU-999"

**Expected Results:**
- ✅ No results message
- ✅ Suggestions to try different search
- ✅ No system error

---

## 🟡 Test Case 8.3: Network Offline
**Goal:** Test offline resilience

**Steps:**
1. Stop backend server
2. Try to process sale in frontend

**Expected Results:**
- ✅ Offline banner displayed
- ✅ Sale queued locally
- ✅ Syncs when backend returns

---

# 9️⃣ SECURITY & COMPLIANCE

## 🔴 Test Case 9.1: Unauthorized Access
**Goal:** Verify route protection

**Steps:**
1. Logout
2. Try to access http://localhost:5173/admin directly

**Expected Results:**
- ✅ Redirected to login
- ✅ Cannot access without auth

---

## 🔴 Test Case 9.2: Role-Based Access
**Goal:** Verify cashier cannot access admin

**Steps:**
1. Login as cashier
2. Try to access admin features

**Expected Results:**
- ✅ Admin menu not visible
- ✅ Direct URL access blocked
- ✅ Appropriate error message

---

## 🟡 Test Case 9.3: Audit Logging
**Goal:** Verify actions are logged

**Steps:**
1. Process a sale
2. Check audit logs (Prisma Studio → AuditLog table)

**Expected Results:**
- ✅ Transaction logged
- ✅ User ID recorded
- ✅ Timestamp accurate
- ✅ Sensitive data encrypted

---

# 🎯 QUICK TEST CHECKLIST

## **5-Minute Smoke Test:**
- [ ] Login as admin ✅
- [ ] View products ✅
- [ ] Process cash sale ✅
- [ ] Check inventory decreased ✅
- [ ] Logout ✅

## **15-Minute Core Test:**
- [ ] All 3 user roles login ✅
- [ ] Search products ✅
- [ ] Multiple item sale ✅
- [ ] Age verification ✅
- [ ] View reports ✅
- [ ] Check audit logs ✅

## **30-Minute Full Test:**
- [ ] Complete all 🔴 Critical tests
- [ ] Complete all 🟡 Important tests
- [ ] Test error scenarios
- [ ] Verify security features

---

# 📊 TEST DATA SUMMARY

## **Users:**
```
admin / password123 (ADMIN)
manager / password123 (MANAGER)
cashier / password123 (CASHIER)
```

## **Products:**
```
WINE-001: Cabernet Sauvignon 2020 - $24.99 (Age restricted)
BEER-001: Craft IPA 6-Pack - $12.99 (Age restricted)
SPIRITS-001: Premium Vodka 750ml - $29.99 (Age restricted)
MIXER-001: Tonic Water 4-Pack - $5.99
SNACK-001: Mixed Nuts - $4.99
```

## **Location:**
```
Main Store
123 Main St, Miami, FL 33101
Tax Rate: 8.5% (7% state + 1.5% county)
```

## **Customer:**
```
John Doe
john.doe@example.com
+1-305-555-0123
DOB: 1985-06-15 (Age verified)
```

---

# 🐛 KNOWN ISSUES TO TEST

1. **Card payments** - Only work with Stripe configured
2. **AI search** - Falls back to regular search without OpenAI
3. **Offline mode** - Requires service worker registration
4. **Backup/restore** - Requires PostgreSQL CLI tools

---

# ✅ SUCCESS CRITERIA

Your POS system is working if:
- ✅ All 🔴 Critical tests pass
- ✅ Can process cash sales end-to-end
- ✅ Inventory updates correctly
- ✅ All 3 user roles work
- ✅ Security features active
- ✅ No console errors during normal operation

---

**Start with the 5-Minute Smoke Test, then expand to more detailed scenarios!** 🚀

Let me know which tests you'd like to focus on or if you encounter any issues!

