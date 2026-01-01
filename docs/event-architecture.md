# Event-Driven Architecture - Simplified Pub/Sub Design

## Philosophy: Simple but Robust

**Goal:** Use events to ensure data integrity across transactions, inventory, and back-office sync WITHOUT the complexity of full Kafka/microservices.

**Approach:** Lightweight pub/sub using Redis Pub/Sub or PostgreSQL LISTEN/NOTIFY for real-time events, with event log table for audit trail.

---

## Event Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    EVENT-DRIVEN FLOW                         │
└──────────────────────────────────────────────────────────────┘

┌─────────────┐
│   POS/Web   │
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. POST /api/orders (create transaction)
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Order Service                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ BEGIN TRANSACTION                                    │  │
│  │                                                      │  │
│  │ 1. Validate inventory availability                  │  │
│  │ 2. Create order record                              │  │
│  │ 3. Reserve inventory                                │  │
│  │ 4. Process payment                                  │  │
│  │ 5. Publish event: "order.created"                   │  │
│  │                                                      │  │
│  │ COMMIT TRANSACTION                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└──────┬──────────────────────────────────────────────────────┘
       │
       │ Event: order.created
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Event Bus (Redis Pub/Sub or PostgreSQL NOTIFY)            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Channel: "events"                                    │  │
│  │ Payload: {                                           │  │
│  │   "event": "order.created",                          │  │
│  │   "order_id": "12345",                               │  │
│  │   "timestamp": "2024-12-31T09:00:00Z",               │  │
│  │   "data": {...}                                      │  │
│  │ }                                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│Inventory │  │Back-Office│  │Analytics │  │WebSocket │
│ Service  │  │  Sync     │  │ Service  │  │  Hub     │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
│             │             │             │
│ Update qty  │ Sync to BO  │ Track sale  │ Notify POS
│ Check low   │ API         │ Update dash │ Real-time
│ stock alert │             │             │
```

---

## Core Events

### 1. Order Events

**order.created**
```json
{
  "event": "order.created",
  "order_id": "ORD-12345",
  "timestamp": "2024-12-31T09:00:00Z",
  "location_id": "STORE-001",
  "channel": "counter", // counter, web, uber_eats, doordash
  "data": {
    "customer_id": "CUST-789",
    "items": [
      {
        "sku": "WINE-CAB-001",
        "quantity": 2,
        "price": 19.99,
        "total": 39.98
      }
    ],
    "subtotal": 39.98,
    "tax": 2.80,
    "total": 42.78,
    "payment_method": "card",
    "age_verified": true
  }
}
```

**order.completed**
```json
{
  "event": "order.completed",
  "order_id": "ORD-12345",
  "timestamp": "2024-12-31T09:01:00Z",
  "location_id": "STORE-001",
  "data": {
    "payment_status": "captured",
    "fulfillment_status": "completed"
  }
}
```

**order.refunded**
```json
{
  "event": "order.refunded",
  "order_id": "ORD-12345",
  "timestamp": "2024-12-31T10:00:00Z",
  "location_id": "STORE-001",
  "data": {
    "refund_amount": 42.78,
    "reason": "customer_request",
    "items_returned": ["WINE-CAB-001"]
  }
}
```

---

### 2. Inventory Events

**inventory.updated**
```json
{
  "event": "inventory.updated",
  "timestamp": "2024-12-31T09:01:00Z",
  "location_id": "STORE-001",
  "data": {
    "sku": "WINE-CAB-001",
    "old_quantity": 25,
    "new_quantity": 23,
    "change": -2,
    "reason": "sale", // sale, restock, adjustment, transfer
    "reference_id": "ORD-12345"
  }
}
```

**inventory.low_stock**
```json
{
  "event": "inventory.low_stock",
  "timestamp": "2024-12-31T09:01:00Z",
  "location_id": "STORE-001",
  "data": {
    "sku": "WINE-CAB-001",
    "current_quantity": 5,
    "reorder_point": 10,
    "suggested_order_quantity": 24 // case size
  }
}
```

---

### 3. Payment Events

**payment.authorized**
```json
{
  "event": "payment.authorized",
  "order_id": "ORD-12345",
  "timestamp": "2024-12-31T09:00:30Z",
  "data": {
    "amount": 42.78,
    "payment_method": "card",
    "payment_intent_id": "pi_stripe_123",
    "status": "authorized"
  }
}
```

**payment.captured**
```json
{
  "event": "payment.captured",
  "order_id": "ORD-12345",
  "timestamp": "2024-12-31T09:01:00Z",
  "data": {
    "amount": 42.78,
    "payment_intent_id": "pi_stripe_123",
    "status": "succeeded"
  }
}
```

---

## Event Log Table (Audit Trail)

```sql
CREATE TABLE event_log (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(100), -- order_id, sku, etc.
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location_id VARCHAR(50),
  payload JSONB NOT NULL,
  metadata JSONB, -- user_id, ip_address, etc.
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  
  -- Indexing for fast queries
  INDEX idx_event_type (event_type),
  INDEX idx_aggregate_id (aggregate_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_location (location_id)
);

-- Retention: Keep 90 days for operational queries, archive to S3 for compliance
```

---

## Implementation: Lightweight Pub/Sub

### Option 1: Redis Pub/Sub (Recommended)

**Pros:**
- Simple to implement
- Real-time delivery
- Scales well for our use case
- Already using Redis for caching

**Cons:**
- Fire-and-forget (no persistence)
- Need event_log table for audit trail

**Implementation:**

```typescript
// services/event-bus.service.ts
import Redis from 'ioredis';

export class EventBus {
  private publisher: Redis;
  private subscriber: Redis;
  
  constructor() {
    this.publisher = new Redis(process.env.REDIS_URL);
    this.subscriber = new Redis(process.env.REDIS_URL);
  }
  
  // Publish event
  async publish(event: Event) {
    // 1. Save to event_log table (audit trail)
    await db.event_log.create({
      event_type: event.event,
      aggregate_id: event.order_id || event.sku,
      timestamp: event.timestamp,
      location_id: event.location_id,
      payload: event.data,
    });
    
    // 2. Publish to Redis
    await this.publisher.publish('events', JSON.stringify(event));
  }
  
  // Subscribe to events
  subscribe(handler: (event: Event) => void) {
    this.subscriber.subscribe('events');
    this.subscriber.on('message', (channel, message) => {
      const event = JSON.parse(message);
      handler(event);
    });
  }
}
```

**Event Handlers:**

```typescript
// services/inventory-event-handler.ts
export class InventoryEventHandler {
  constructor(private eventBus: EventBus) {
    this.eventBus.subscribe(this.handleEvent.bind(this));
  }
  
  async handleEvent(event: Event) {
    switch (event.event) {
      case 'order.created':
        await this.decrementInventory(event);
        break;
      case 'order.refunded':
        await this.incrementInventory(event);
        break;
    }
  }
  
  private async decrementInventory(event: OrderCreatedEvent) {
    for (const item of event.data.items) {
      // Update inventory
      await db.inventory.update({
        where: {
          sku: item.sku,
          location_id: event.location_id,
        },
        data: {
          quantity: { decrement: item.quantity },
        },
      });
      
      // Check if low stock
      const inventory = await db.inventory.findUnique({...});
      if (inventory.quantity <= inventory.reorder_point) {
        await this.eventBus.publish({
          event: 'inventory.low_stock',
          timestamp: new Date().toISOString(),
          location_id: event.location_id,
          data: {
            sku: item.sku,
            current_quantity: inventory.quantity,
            reorder_point: inventory.reorder_point,
          },
        });
      }
    }
  }
}
```

---

### Option 2: PostgreSQL LISTEN/NOTIFY

**Pros:**
- No additional infrastructure (already using PostgreSQL)
- Persistent (if using event_log table)
- Transactional (can NOTIFY within transaction)

**Cons:**
- Slightly more complex
- Limited to PostgreSQL connections

**Implementation:**

```typescript
// Publish event (within transaction)
await db.$executeRaw`
  NOTIFY events, ${JSON.stringify(event)}
`;

// Subscribe to events
const client = await db.$connect();
await client.query('LISTEN events');
client.on('notification', (msg) => {
  const event = JSON.parse(msg.payload);
  handleEvent(event);
});
```

---

## Back-Office Integration API Contracts

Based on your 6 files:

### 1. Item List Maintenance

**Sync Product Catalog to Back-Office**

```typescript
// POST /api/backoffice/items/bulk
{
  "items": [
    {
      "sku": "WINE-CAB-001",
      "name": "Cabernet Sauvignon 750ml",
      "category": "wine",
      "cost": 12.50,
      "price": 19.99,
      "case_size": 12,
      "active": true
    }
  ]
}

// Response
{
  "success": true,
  "synced_count": 1,
  "errors": []
}
```

**Event Trigger:** `product.created`, `product.updated`, `product.deleted`

---

### 2. Item Maintenance

**Sync Individual Product Updates**

```typescript
// PUT /api/backoffice/items/{sku}
{
  "sku": "WINE-CAB-001",
  "name": "Cabernet Sauvignon 750ml",
  "cost": 12.50,
  "price": 19.99,
  "active": true
}

// Response
{
  "success": true,
  "sku": "WINE-CAB-001",
  "updated_at": "2024-12-31T09:00:00Z"
}
```

**Event Trigger:** `product.updated`

---

### 3. Merchandise Code Maintenance

**Sync Product Categories/Departments**

```typescript
// POST /api/backoffice/merchandise-codes
{
  "code": "WINE",
  "description": "Wine Products",
  "tax_category": "alcohol",
  "gl_account": "4000" // General ledger account
}

// Response
{
  "success": true,
  "code": "WINE"
}
```

**Event Trigger:** `category.created`, `category.updated`

---

### 4. Promotions - Combo

**Sync Combo Promotions (e.g., "Buy 2 bottles, get 10% off")**

```typescript
// POST /api/backoffice/promotions/combo
{
  "promotion_id": "PROMO-001",
  "name": "Wine Duo Deal",
  "type": "combo",
  "start_date": "2024-12-01",
  "end_date": "2024-12-31",
  "rules": {
    "buy_quantity": 2,
    "buy_skus": ["WINE-CAB-001", "WINE-CHARD-002"],
    "discount_type": "percentage",
    "discount_value": 10
  },
  "active": true
}

// Response
{
  "success": true,
  "promotion_id": "PROMO-001"
}
```

**Event Trigger:** `promotion.created`, `promotion.updated`

---

### 5. Promotions - Mix and Match

**Sync Mix-and-Match Promotions (e.g., "Any 6 beers for $9.99")**

```typescript
// POST /api/backoffice/promotions/mix-match
{
  "promotion_id": "PROMO-002",
  "name": "6-Pack Any Beer",
  "type": "mix_match",
  "start_date": "2024-12-01",
  "end_date": "2024-12-31",
  "rules": {
    "category": "beer",
    "quantity": 6,
    "price": 9.99,
    "eligible_skus": ["BEER-BUD-001", "BEER-COORS-002", "BEER-MILLER-003"]
  },
  "active": true
}

// Response
{
  "success": true,
  "promotion_id": "PROMO-002"
}
```

**Event Trigger:** `promotion.created`, `promotion.updated`

---

### 6. Transaction Sync (Implied from your setup)

**Sync Sales Transactions to Back-Office**

```typescript
// POST /api/backoffice/transactions
{
  "transaction_id": "ORD-12345",
  "timestamp": "2024-12-31T09:00:00Z",
  "location_id": "STORE-001",
  "channel": "counter",
  "items": [
    {
      "sku": "WINE-CAB-001",
      "quantity": 2,
      "unit_price": 19.99,
      "discount": 0,
      "tax": 2.80,
      "total": 42.78
    }
  ],
  "payment": {
    "method": "card",
    "amount": 42.78,
    "status": "captured"
  },
  "customer_id": "CUST-789"
}

// Response
{
  "success": true,
  "transaction_id": "ORD-12345",
  "backoffice_id": "BO-98765" // Their internal ID
}
```

**Event Trigger:** `order.completed`

---

## Event-Driven Back-Office Sync

```typescript
// services/backoffice-sync-handler.ts
export class BackOfficeSyncHandler {
  constructor(
    private eventBus: EventBus,
    private backofficeClient: BackOfficeClient
  ) {
    this.eventBus.subscribe(this.handleEvent.bind(this));
  }
  
  async handleEvent(event: Event) {
    try {
      switch (event.event) {
        case 'order.completed':
          await this.syncTransaction(event);
          break;
        case 'product.updated':
          await this.syncProduct(event);
          break;
        case 'promotion.created':
          await this.syncPromotion(event);
          break;
      }
      
      // Mark event as processed
      await db.event_log.update({
        where: { id: event.id },
        data: { processed: true, processed_at: new Date() },
      });
    } catch (error) {
      // Log error, retry later
      console.error('Back-office sync failed:', error);
      // Could implement retry queue here
    }
  }
  
  private async syncTransaction(event: OrderCompletedEvent) {
    const response = await this.backofficeClient.post(
      '/api/backoffice/transactions',
      this.transformOrderToBackOffice(event)
    );
    
    // Store back-office ID for reference
    await db.transactions.update({
      where: { id: event.order_id },
      data: { backoffice_id: response.backoffice_id },
    });
  }
}
```

---

## Simplified Event Flow Example

**Scenario:** Customer buys 2 bottles of wine at counter

```
1. Cashier scans items → POST /api/orders

2. Order Service:
   ┌─────────────────────────────────────┐
   │ BEGIN TRANSACTION                   │
   │ • Create order record               │
   │ • Authorize payment (Stripe)        │
   │ • Publish: order.created            │
   │ COMMIT                              │
   └─────────────────────────────────────┘

3. Event Bus publishes "order.created" to Redis

4. Subscribers react:
   
   Inventory Handler:
   • Decrement wine quantity: 25 → 23
   • Check reorder point (10)
   • No alert needed
   
   Back-Office Sync Handler:
   • POST /api/backoffice/transactions
   • Store backoffice_id
   
   Analytics Handler:
   • Track sale in PostHog
   • Update dashboard metrics
   
   WebSocket Handler:
   • Notify other POS terminals
   • Update real-time inventory display

5. Order Service:
   • Capture payment
   • Publish: order.completed
   • Return success to POS

Total time: <2 seconds
```

---

## Why This Approach is Simple but Robust

✅ **No Kafka complexity** - Redis Pub/Sub is lightweight  
✅ **Event log for audit** - PostgreSQL table for compliance  
✅ **Async processing** - Non-blocking, fast checkout  
✅ **Data integrity** - Events ensure all systems stay in sync  
✅ **Retry logic** - Failed back-office syncs can retry  
✅ **Real-time updates** - WebSocket notifications from events  

---

## Budget Clarification: You + AI Development

**$125K Budget Breakdown (You coding with AI assistance):**

### Phase 1: MVP (Months 1-3) - $15K
- **Your Time:** 200 hours @ $0 (your sweat equity)
- **Infrastructure:** $2K (AWS/Vercel/Supabase)
- **Hardware:** $3K (tablets, scanners, printers for pilot)
- **AI Tools:** $1K (GitHub Copilot, ChatGPT Plus, Cursor)
- **Design Assets:** $2K (UI kit, icons, logo)
- **Testing/QA:** $5K (hire QA tester for 2 weeks)
- **Contingency:** $2K

### Phase 2-6: $110K
- **Your Time:** 800 hours @ $0 (your sweat equity)
- **Contract Developers:** $60K (hire 1-2 devs for specific modules)
  - React Native mobile app: $20K
  - Delivery integrations: $15K
  - Advanced features: $25K
- **Infrastructure:** $15K (scaling costs)
- **Design/UX:** $10K (professional designer for polish)
- **Testing/QA:** $15K
- **Marketing/Sales:** $5K (website, demos)
- **Contingency:** $5K

**Your Contribution:**
- 1,000 hours of development (worth ~$100K if outsourced)
- Product vision and domain expertise
- Customer relationships

**Total Real Cost:** $125K cash + your time = ~$225K total value

**Alternative: Fully Outsourced**
- Would cost $250K-350K
- Slower (less control)
- Your approach saves $125K+ in dev costs

---

## Next Steps

1. **Share your architecture** - I'd love to see what you've designed
2. **Connect with back-office team** - Get API documentation for the 6 files
3. **Set up development environment** - I can help you scaffold the project
4. **Start Phase 1 MVP** - Build counter POS with event-driven architecture

Ready to review your architecture and start building! 🚀
