# Implementation Plan - Ready to Build

## Development Approach: Agent-Based (Inspired by Your ContextIQ)

### Sequential vs Agent-Based

**Sequential Development (Traditional):**
```
Step 1: Design → Step 2: Code → Step 3: Test → Step 4: Deploy
(One step at a time, linear)
```

**Agent-Based Development (Our Approach):**
```
Orchestrator Agent
  ├→ Architecture Agent (designs system)
  ├→ Backend Agent (builds APIs)
  ├→ Frontend Agent (builds UI)
  ├→ Test Agent (writes tests)
  ├→ DevOps Agent (deploys)
  └→ Validator Agent (verifies requirements)
  
(Multiple agents work in parallel, coordinated by orchestrator)
```

### Why Agent-Based?

✅ **Faster** - Agents work in parallel (backend + frontend simultaneously)  
✅ **Higher Quality** - Each agent specializes in one area  
✅ **Aligned with Your Architecture** - Matches your ContextIQ system  
✅ **AI-Native** - You + AI agents collaborate  

### Our Agent Workflow

```
YOU (Product Manager + Architect)
  ↓ Define requirements, approve designs
ORCHESTRATOR AGENT (You + AI)
  ↓ Coordinates all agents
  ├→ BACKEND AGENT (AI)
  │  • Builds NestJS APIs
  │  • Implements database schema
  │  • Creates event bus
  │
  ├→ FRONTEND AGENT (AI)
  │  • Builds React POS UI
  │  • Implements offline mode
  │  • Creates e-commerce site
  │
  ├→ TEST AGENT (AI)
  │  • Writes unit tests
  │  • Creates E2E tests
  │  • Runs load tests
  │
  ├→ DEVOPS AGENT (AI)
  │  • Sets up CI/CD
  │  • Configures infrastructure
  │  • Deploys to staging/prod
  │
  └→ VALIDATOR AGENT (AI)
     • Checks against PRD
     • Verifies requirements
     • Reports completion
```

---

## Final Tech Stack (Approved)

### Tier 1: POS Terminal
- **Database:** libSQL (embedded, auto-sync)
- **UI:** React 18 + TypeScript + Vite
- **State:** Zustand
- **Offline:** libSQL built-in sync

### Tier 2: Store Server
- **Database:** libSQL Server (aggregates POS terminals)
- **Backend:** NestJS + TypeScript
- **API:** REST + WebSocket (real-time)
- **Replication:** libSQL → PostgreSQL (cloud)

### Tier 3: Cloud
- **Database:** PostgreSQL + pgvector (Supabase/Neon)
- **Backend:** NestJS (same codebase as store server)
- **AI:** OpenAI embeddings + vector search
- **Analytics:** PostHog
- **Monitoring:** Grafana + Loki + Prometheus

### Integrations
- **Conexxus:** Standard APIs (adapter pattern)
- **Uber Eats/DoorDash:** Adapters
- **Back-Office:** Conexxus adapter
- **Payments:** Stripe adapter

---

## Phase 1 MVP - Updated with libSQL

### Week 1-2: Project Setup (Backend Agent + DevOps Agent)

**Backend Agent Tasks:**
```bash
# Initialize NestJS project
npx @nestjs/cli new liquor-pos-backend

# Install dependencies
npm install @libsql/client @nestjs/config @nestjs/typeorm prisma

# Set up Prisma schema
npx prisma init

# Create base modules
nest g module products
nest g module orders
nest g module inventory
nest g module customers
```

**DevOps Agent Tasks:**
```bash
# Set up GitHub repository
gh repo create liquor-pos --private

# Configure CI/CD (GitHub Actions)
# .github/workflows/ci.yml

# Set up staging environment (Railway)
railway init
```

---

### Week 3-4: Core Backend APIs (Backend Agent)

**Products Service:**
```typescript
// products/products.service.ts
@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private eventBus: EventBus,
  ) {}
  
  async create(dto: CreateProductDTO) {
    const product = await this.prisma.product.create({
      data: dto,
    });
    
    // Publish event
    await this.eventBus.publish({
      event: 'product.created',
      data: product,
    });
    
    return product;
  }
  
  async search(query: string) {
    // Vector search using pgvector
    const embedding = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    
    const results = await this.prisma.$queryRaw`
      SELECT *, 1 - (embedding <=> ${embedding.data[0].embedding}::vector) AS similarity
      FROM products
      ORDER BY embedding <=> ${embedding.data[0].embedding}::vector
      LIMIT 20
    `;
    
    return results;
  }
}
```

**Orders Service:**
```typescript
// orders/orders.service.ts
@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private eventBus: EventBus,
    private orchestrator: OrderOrchestrator,
  ) {}
  
  async create(dto: CreateOrderDTO) {
    // Use orchestrator pattern (from your ContextIQ)
    const result = await this.orchestrator.processOrder(dto);
    return result;
  }
}

// orders/order-orchestrator.ts
@Injectable()
export class OrderOrchestrator {
  constructor(
    private inventoryAgent: InventoryAgent,
    private pricingAgent: PricingAgent,
    private paymentAgent: PaymentAgent,
    private complianceAgent: ComplianceAgent,
  ) {}
  
  async processOrder(dto: CreateOrderDTO) {
    const context = { order: dto };
    
    try {
      // Step 1: Inventory check
      context.inventory = await this.inventoryAgent.checkAndReserve(dto.items);
      
      // Step 2: Calculate pricing
      context.pricing = await this.pricingAgent.calculate(dto.items);
      
      // Step 3: Compliance check
      context.compliance = await this.complianceAgent.verifyAge(dto.customer_id);
      
      // Step 4: Process payment
      context.payment = await this.paymentAgent.authorize(context.pricing.total);
      
      // Step 5: Create order
      const order = await this.createOrder(context);
      
      // Step 6: Publish event
      await this.eventBus.publish({
        event: 'order.created',
        data: order,
      });
      
      return order;
    } catch (error) {
      // Compensation (SAGA pattern)
      await this.compensate(context, error);
      throw error;
    }
  }
  
  private async compensate(context, error) {
    if (context.inventory) {
      await this.inventoryAgent.release(context.inventory);
    }
    if (context.payment) {
      await this.paymentAgent.void(context.payment);
    }
  }
}
```

---

### Week 5-6: POS Frontend (Frontend Agent)

**libSQL Setup:**
```typescript
// db/libsql-client.ts
import { createClient } from '@libsql/client';

export const db = createClient({
  url: 'file:pos-terminal.db',
  syncUrl: process.env.STORE_SERVER_URL, // http://store-server.local:8080
  syncInterval: 5000, // Sync every 5 seconds
  authToken: process.env.SYNC_TOKEN,
});

// Initialize schema
await db.execute(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE,
    name TEXT,
    price REAL,
    inventory INTEGER,
    embedding BLOB
  );
  
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    timestamp INTEGER,
    items TEXT,
    total REAL,
    payment_method TEXT,
    synced INTEGER DEFAULT 0
  );
`);
```

**Checkout Component:**
```typescript
// components/Checkout.tsx
export function Checkout() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const handleCheckout = async () => {
    const transaction = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      items: cart,
      total: calculateTotal(cart),
      payment_method: 'card',
      synced: 0,
    };
    
    // Save to libSQL (automatically syncs to store server)
    await db.execute({
      sql: 'INSERT INTO transactions (id, timestamp, items, total, payment_method) VALUES (?, ?, ?, ?, ?)',
      args: [
        transaction.id,
        transaction.timestamp,
        JSON.stringify(transaction.items),
        transaction.total,
        transaction.payment_method,
      ],
    });
    
    // Update local inventory
    for (const item of cart) {
      await db.execute({
        sql: 'UPDATE products SET inventory = inventory - ? WHERE sku = ?',
        args: [item.quantity, item.sku],
      });
    }
    
    // Show success
    toast.success('Transaction complete!');
    setCart([]);
  };
  
  return (
    <div className="checkout">
      {isOffline && (
        <div className="offline-banner">
          ⚠️ Offline Mode - Transactions will sync when online
        </div>
      )}
      
      <Cart items={cart} />
      <button onClick={handleCheckout}>Complete Sale</button>
    </div>
  );
}
```

---

### Week 7-8: Testing (Test Agent)

**Unit Tests:**
```typescript
// products/products.service.spec.ts
describe('ProductsService', () => {
  it('should create product and publish event', async () => {
    const product = await service.create({
      sku: 'WINE-001',
      name: 'Cabernet Sauvignon',
      price: 19.99,
    });
    
    expect(product.sku).toBe('WINE-001');
    expect(eventBus.publish).toHaveBeenCalledWith({
      event: 'product.created',
      data: product,
    });
  });
});
```

**E2E Tests:**
```typescript
// e2e/checkout.spec.ts
test('complete checkout flow', async ({ page }) => {
  // Navigate to POS
  await page.goto('http://localhost:3000');
  
  // Scan product
  await page.fill('[data-testid="barcode-input"]', 'WINE-001');
  await page.press('[data-testid="barcode-input"]', 'Enter');
  
  // Verify product added to cart
  await expect(page.locator('[data-testid="cart-item"]')).toContainText('Cabernet Sauvignon');
  
  // Complete checkout
  await page.click('[data-testid="checkout-button"]');
  
  // Verify success
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

**Load Tests:**
```javascript
// k6/load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function () {
  const res = http.post('http://localhost:3000/api/orders', {
    items: [{ sku: 'WINE-001', quantity: 1 }],
    total: 19.99,
  });
  
  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

---

### Week 9-10: Integration & Polish (All Agents)

**Conexxus Adapter:**
```typescript
// integrations/conexxus-adapter.ts
@Injectable()
export class ConexusAdapter implements IntegrationAdapter {
  async syncTransaction(tx: Transaction) {
    const conexusTx = this.transformToConexus(tx);
    
    await this.httpClient.post('/api/conexxus/v1/transactions', conexusTx);
    
    await this.eventBus.publish({
      event: 'conexxus.transaction.synced',
      data: { transaction_id: tx.id },
    });
  }
  
  private transformToConexus(tx: Transaction): ConexusTransaction {
    return {
      storeId: tx.location_id,
      posId: tx.terminal_id,
      transactionId: tx.id,
      timestamp: tx.created_at.toISOString(),
      items: tx.items.map(item => ({
        upc: item.upc,
        description: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        departmentId: item.category.toUpperCase(),
        ageRestricted: item.age_restricted,
      })),
      totals: {
        subtotal: tx.subtotal,
        tax: tx.tax,
        total: tx.total,
      },
      compliance: {
        ageVerified: tx.age_verified,
        idScanned: tx.id_scanned,
        employeeId: tx.employee_id,
      },
    };
  }
}
```

---

### Week 11-12: Pilot Deployment (DevOps Agent + Validator Agent)

**Deployment Checklist:**
- [ ] Deploy store server to on-premise hardware
- [ ] Configure libSQL server
- [ ] Set up POS terminals (tablets)
- [ ] Install barcode scanners, receipt printers
- [ ] Configure network (LAN + internet)
- [ ] Set up Grafana monitoring
- [ ] Train cashiers (30-minute session)
- [ ] Go live with pilot store

**Validator Agent Checks:**
- [ ] All PRD requirements met
- [ ] Performance targets achieved (<2s checkout)
- [ ] Offline mode works
- [ ] Age verification compliant
- [ ] Conexxus API integration working
- [ ] Monitoring dashboards operational

---

## Agent Coordination Example

**Scenario:** Build checkout flow

```
YOU: "Build the checkout flow with age verification"
  ↓
ORCHESTRATOR: "Breaking down into agent tasks..."
  ↓
  ├→ BACKEND AGENT: "Create POST /api/orders endpoint with age verification"
  │  ✅ Completed in 10 minutes
  │
  ├→ FRONTEND AGENT: "Build checkout UI with age verification prompt"
  │  ✅ Completed in 15 minutes
  │
  ├→ TEST AGENT: "Write E2E test for checkout flow"
  │  ✅ Completed in 5 minutes
  │
  └→ VALIDATOR AGENT: "Verify against PRD user story US-002"
     ✅ All acceptance criteria met
  
ORCHESTRATOR: "Checkout flow complete! ✅"
```

**Total Time:** 30 minutes (vs 2-3 hours sequential)

---

## Summary

### Development Approach: **Agent-Based** ✅
- Faster (parallel work)
- Higher quality (specialized agents)
- Aligned with your ContextIQ architecture

### Database: **libSQL** ✅
- Built-in sync (saves development time)
- SQLite-compatible (easy fallback)
- Perfect for 3-tier architecture

### Ready to Build: **YES** ✅
- All planning complete
- Tech stack finalized
- Agent workflow defined
- Implementation plan ready

---

## Next Steps

1. **Approve this plan** - Confirm agent-based approach + libSQL
2. **Set up development environment** - Install tools, create repos
3. **Start Week 1** - Backend Agent + DevOps Agent initialize project
4. **Daily standups** - Review agent progress, adjust as needed

**Estimated MVP Completion:** 12 weeks (3 months)

Ready to start building! 🚀
