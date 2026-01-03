# 🔧 Prisma Studio Fix - DATABASE_URL Not Found

## Problem

Prisma Studio can't find `DATABASE_URL` because it's loading from `prisma.config.ts` instead of `.env`.

---

## ✅ Solution 1: Use --url Flag (Quickest)

Provide the database URL directly:

```powershell
cd backend

# Get your DATABASE_URL from .env
Get-Content .env | Select-String "DATABASE_URL"

# Then run Prisma Studio with the URL
npx prisma studio --url "postgresql://postgres:password@localhost:5432/liquor_pos"
```

**Replace the URL with your actual DATABASE_URL from `.env`**

---

## ✅ Solution 2: Load .env First (Recommended)

Use dotenv to load environment variables:

```powershell
cd backend

# Install dotenv-cli if not already installed
npm install -g dotenv-cli

# Run Prisma Studio with dotenv
dotenv -e .env -- npx prisma studio
```

---

## ✅ Solution 3: Temporary Environment Variable

Set the environment variable in PowerShell:

```powershell
cd backend

# Set DATABASE_URL for this session
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/liquor_pos"

# Run Prisma Studio
npx prisma studio
```

**Replace with your actual DATABASE_URL from `.env`**

---

## ✅ Solution 4: Use API Endpoints Instead

Since Prisma Studio isn't working, use the API to check inventory:

### **Check All Inventory:**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/inventory | ConvertTo-Json -Depth 5
```

### **Check Specific Product:**
```powershell
# First, get product IDs
$products = Invoke-RestMethod -Uri http://localhost:3000/api/products
$products | Select-Object id, name, sku

# Then check inventory for a product
$productId = "paste-product-id-here"
Invoke-RestMethod -Uri "http://localhost:3000/api/inventory/product/$productId"
```

### **Check Low Stock:**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/inventory/low-stock
```

---

## ✅ Solution 5: Use Swagger UI (Best Alternative)

This is the easiest way to explore data without Prisma Studio:

1. **Open:** http://localhost:3000/api/docs

2. **Navigate to "inventory" section**

3. **Try these endpoints:**
   - `GET /api/inventory` - Click "Try it out" → "Execute"
   - `GET /api/inventory/low-stock` - See items below reorder point
   - `GET /api/products` - See all products with inventory

4. **View the response** - Shows all data in JSON format

---

## 🎯 Quick Command Reference

### **Get Your DATABASE_URL:**
```powershell
cd backend
Get-Content .env | Select-String "DATABASE_URL"
```

### **Run Prisma Studio with URL:**
```powershell
npx prisma studio --url "YOUR_DATABASE_URL_HERE"
```

### **Check Inventory via API:**
```powershell
# All inventory
Invoke-RestMethod -Uri http://localhost:3000/api/inventory

# Products (includes inventory info)
Invoke-RestMethod -Uri http://localhost:3000/api/products

# Low stock
Invoke-RestMethod -Uri http://localhost:3000/api/inventory/low-stock
```

---

## 📊 Example: Check Inventory via API

```powershell
# Get all products with their details
$products = Invoke-RestMethod -Uri http://localhost:3000/api/products

# Display in a nice table
$products | Format-Table name, sku, basePrice, category

# Get inventory for each product
foreach ($product in $products) {
    $inventory = Invoke-RestMethod -Uri "http://localhost:3000/api/inventory/product/$($product.id)"
    Write-Host "$($product.name): $($inventory.quantity) units"
}
```

---

## 🔍 Why This Happens

Prisma 7 introduced `prisma.config.ts` which changes how configuration works. The config file doesn't automatically load `.env` files like the old setup did.

**Workarounds:**
1. Pass URL explicitly with `--url`
2. Use dotenv-cli to load .env
3. Use API endpoints instead
4. Use Swagger UI for interactive exploration

---

## ✅ Recommended Approach

**For now, use Swagger UI:**

1. Open: http://localhost:3000/api/docs
2. Navigate to "inventory" section
3. Click "Try it out" on any endpoint
4. Click "Execute"
5. View results

**This gives you the same data as Prisma Studio, just in a different interface!**

---

## 📝 What You Can Check

### **Via Swagger UI:**
- ✅ All inventory levels
- ✅ Products with stock info
- ✅ Low stock items
- ✅ Inventory by location
- ✅ Inventory by product

### **Via API Commands:**
```powershell
# Summary of all inventory
Invoke-RestMethod -Uri http://localhost:3000/api/inventory | 
    Select-Object -ExpandProperty inventory | 
    Format-Table productId, quantity, reserved, reorderPoint
```

---

## 🎯 Quick Test

Try this right now:

```powershell
# Check all inventory
Invoke-RestMethod -Uri http://localhost:3000/api/inventory
```

You should see all inventory records with quantities!

---

**Use Swagger UI (http://localhost:3000/api/docs) - it's the easiest alternative to Prisma Studio!**

