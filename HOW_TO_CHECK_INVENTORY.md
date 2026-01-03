# 📦 How to Check Inventory

## Current Situation

The frontend **doesn't have a dedicated Inventory page yet**, but you can still check inventory levels using these methods:

---

## ✅ Method 1: Products Page (Frontend)

The **Products** page shows inventory levels for each product.

### **Steps:**
1. Login as admin/manager
2. Click **"Products"** in the sidebar (📦 icon)
3. You'll see all products with their current stock levels

**What you'll see:**
- Product name
- SKU
- Price
- **Current inventory quantity**
- Category

---

## ✅ Method 2: Prisma Studio (Best for Testing)

This gives you direct database access to see exact inventory.

### **Steps:**
```powershell
cd backend
npx prisma studio
```

Opens at: **http://localhost:5555**

### **Navigate to:**
1. Click **"Inventory"** table in left sidebar
2. See all inventory records with:
   - Product ID
   - Location ID
   - **Quantity** (current stock)
   - **Reserved** (held for orders)
   - Reorder point
   - Last updated

### **To see product names:**
1. Click **"Product"** table
2. Match product IDs with inventory records

---

## ✅ Method 3: API Endpoint (Direct Query)

Query the backend API directly:

### **Get All Inventory:**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/inventory
```

### **Get Inventory for Specific Product:**
```powershell
# Replace {productId} with actual product ID
Invoke-RestMethod -Uri http://localhost:3000/api/inventory/product/{productId}
```

### **Get Low Stock Items:**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/inventory/low-stock
```

---

## ✅ Method 4: API Documentation (Interactive)

Use Swagger UI to explore inventory endpoints:

### **Steps:**
1. Open: **http://localhost:3000/api/docs**
2. Scroll to **"inventory"** section
3. Try these endpoints:
   - `GET /api/inventory` - List all inventory
   - `GET /api/inventory/low-stock` - Low stock items
   - `GET /api/inventory/product/{productId}` - Specific product
   - `GET /api/inventory/location/{locationId}` - By location

4. Click **"Try it out"** → **"Execute"**

---

## 📊 Current Inventory (After Seeding)

All products start with **100 units** in stock:

```
Product              | SKU         | Initial Stock
---------------------|-------------|---------------
Cabernet Sauvignon   | WINE-001    | 100
Craft IPA 6-Pack     | BEER-001    | 100
Premium Vodka        | SPIRITS-001 | 100
Tonic Water 4-Pack   | MIXER-001   | 100
Mixed Nuts           | SNACK-001   | 100
```

**After each sale, inventory decreases automatically.**

---

## 🧪 Test Inventory Updates

### **Test 1: Check Before Sale**
```powershell
cd backend
npx prisma studio
```
- Open Inventory table
- Note "Mixed Nuts" quantity (should be 100)

### **Test 2: Process Sale**
1. Go to POS Terminal
2. Add "Mixed Nuts" to cart (quantity: 5)
3. Complete checkout with cash

### **Test 3: Check After Sale**
```powershell
# Refresh Prisma Studio (F5)
```
- Check "Mixed Nuts" quantity
- Should now be **95** (100 - 5)

---

## 🔍 Verify Inventory via Products Page

### **Quick Check:**
1. Login as admin/manager
2. Go to **Products** page
3. Look for inventory column/badge
4. Should show current stock levels

**Note:** The exact UI might vary, but stock levels should be visible on the Products page.

---

## 📝 What You Can See

### **In Prisma Studio (Inventory Table):**
```
id: uuid
productId: uuid (links to Product)
locationId: uuid (links to Location)
quantity: 95 (current available stock)
reserved: 0 (held for pending orders)
reorderPoint: 20 (alert threshold)
updatedAt: timestamp
```

### **In Products Page:**
- Product details
- Current stock level
- Low stock warning (if < reorderPoint)

---

## 🎯 Recommended Workflow

### **For Quick Checks:**
1. Use **Products** page in admin panel
2. Shows inventory at a glance

### **For Detailed Analysis:**
1. Use **Prisma Studio**
2. See exact quantities, reserved stock, etc.

### **For Automation/Scripts:**
1. Use **API endpoints**
2. Can integrate with other systems

---

## 🚀 Future Enhancement

A dedicated **Inventory Management** page could be added with:
- ✅ Real-time stock levels
- ✅ Low stock alerts
- ✅ Manual adjustments
- ✅ Inventory history
- ✅ Reorder suggestions
- ✅ Stock valuation
- ✅ Multi-location view

**For now, use the methods above to check inventory!**

---

## 💡 Quick Commands

### **Check All Inventory (API):**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/inventory
```

### **Check Low Stock (API):**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/inventory/low-stock
```

### **Open Database GUI:**
```powershell
cd backend
npx prisma studio
```

### **View API Docs:**
```
http://localhost:3000/api/docs
```

---

## ✅ Summary

**To check inventory right now:**

1. **Easiest:** Go to **Products** page in admin panel
2. **Most detailed:** Use **Prisma Studio** (npx prisma studio)
3. **For API testing:** Use **Swagger UI** (http://localhost:3000/api/docs)

**The inventory automatically updates when you process sales!**

---

Let me know if you need help accessing any of these methods!

