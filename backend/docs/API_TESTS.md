# Test Orders API

## Prerequisites
1. Backend server running on http://localhost:3000
2. Database seeded with sample data

## Test 1: Create an Order (Cash Payment)

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "loc-001",
    "terminalId": "terminal-01",
    "employeeId": "emp-001",
    "items": [
      {
        "sku": "WINE-001",
        "quantity": 2
      },
      {
        "sku": "SNACK-001",
        "quantity": 1
      }
    ],
    "paymentMethod": "cash",
    "channel": "counter",
    "ageVerified": true,
    "ageVerifiedBy": "emp-001"
  }'
```

## Test 2: Create an Order (Card Payment)

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "loc-001",
    "terminalId": "terminal-01",
    "items": [
      {
        "sku": "BEER-001",
        "quantity": 1
      }
    ],
    "paymentMethod": "card",
    "channel": "counter",
    "ageVerified": true
  }'
```

## Test 3: Get All Orders

```bash
curl http://localhost:3000/orders
```

## Test 4: Get Order by ID

```bash
curl http://localhost:3000/orders/{order-id}
```

## Test 5: Get Daily Summary

```bash
curl "http://localhost:3000/orders/summary/daily?date=2025-12-31&locationId=loc-001"
```

## Test 6: Search Products

```bash
curl "http://localhost:3000/products/search?query=wine"
```

## Test 7: Get Product by SKU

```bash
curl http://localhost:3000/products/sku/WINE-001
```

## Expected Responses

### Successful Order Creation
```json
{
  "id": "uuid",
  "locationId": "loc-001",
  "subtotal": 54.97,
  "tax": 3.85,
  "discount": 0,
  "total": 58.82,
  "paymentMethod": "cash",
  "paymentStatus": "completed",
  "channel": "counter",
  "ageVerified": true,
  "idScanned": false,
  "items": [
    {
      "id": "uuid",
      "sku": "WINE-001",
      "name": "Cabernet Sauvignon 2020",
      "quantity": 2,
      "unitPrice": 24.99,
      "discount": 0,
      "tax": 3.50,
      "total": 53.48
    },
    {
      "id": "uuid",
      "sku": "SNACK-001",
      "name": "Mixed Nuts",
      "quantity": 1,
      "unitPrice": 4.99,
      "discount": 0,
      "tax": 0.35,
      "total": 5.34
    }
  ],
  "createdAt": "2025-12-31T18:00:00.000Z"
}
```

### Error: Insufficient Inventory
```json
{
  "statusCode": 400,
  "message": "Insufficient inventory for Cabernet Sauvignon 2020. Available: 5, Requested: 10",
  "error": "Bad Request"
}
```

### Error: Age Verification Required
```json
{
  "statusCode": 403,
  "message": "Age verification required for alcohol purchases",
  "error": "Forbidden"
}
```
