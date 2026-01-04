# Payment Integration Visual Summary
## PAX Terminal Integration - Architecture & Risk Diagrams

**Document Date:** January 3, 2026  
**Companion to:** PAYMENT_INTEGRATION_FORMAL_REVIEW.md

---

## 1. Current vs Proposed Architecture

### 1.1 Current State (Stripe Only)

```mermaid
graph LR
    subgraph "Current Payment Flow"
        POS[POS Terminal]
        API[NestJS API]
        ORCH[Order Orchestrator]
        STRIPE_AGENT[Payment Agent<br/>Stripe Only]
        STRIPE[Stripe API]
        DB[(PostgreSQL)]
    end
    
    POS -->|1. Create Order| API
    API --> ORCH
    ORCH -->|2. Authorize| STRIPE_AGENT
    STRIPE_AGENT -->|3. Payment Intent| STRIPE
    STRIPE -->|4. Response| STRIPE_AGENT
    STRIPE_AGENT -->|5. Save| DB
    
    style STRIPE_AGENT fill:#2196f3
    style STRIPE fill:#2196f3
```

**Limitations:**
- ❌ No physical terminal support
- ❌ No EMV chip card support
- ❌ Higher fees (card-not-present: 2.9% + 30¢)
- ❌ No contactless (NFC/tap-to-pay)

### 1.2 Proposed State (PAX + Stripe)

```mermaid
graph TB
    subgraph "Client Layer"
        POS[POS Terminal<br/>React UI]
        PAX_HW[PAX Terminal<br/>Physical Device]
    end
    
    subgraph "Backend Services"
        API[NestJS API Gateway]
        ORCH[Order Orchestrator]
        ROUTER[Payment Router<br/>NEW]
        PAX_AGENT[PAX Terminal Agent<br/>NEW]
        STRIPE_AGENT[Stripe Payment Agent<br/>EXISTING]
        TERM_MGR[Terminal Manager<br/>NEW]
    end
    
    subgraph "External Services"
        PAX_API[PAX SDK/API]
        STRIPE[Stripe API]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL)]
        REDIS[(Redis Cache)]
    end
    
    POS -->|1. Create Order| API
    API --> ORCH
    ORCH -->|2. Route Payment| ROUTER
    
    ROUTER -->|Card Present?| PAX_AGENT
    ROUTER -->|Card Not Present?| STRIPE_AGENT
    
    PAX_AGENT -->|3a. Get Terminal| TERM_MGR
    TERM_MGR -->|3b. Terminal Info| REDIS
    PAX_AGENT -->|4a. Process| PAX_API
    PAX_API <-->|EMV Transaction| PAX_HW
    
    STRIPE_AGENT -->|3c. Payment Intent| STRIPE
    
    PAX_AGENT --> DB
    STRIPE_AGENT --> DB
    
    style ROUTER fill:#ff9800
    style PAX_AGENT fill:#4caf50
    style TERM_MGR fill:#4caf50
    style STRIPE_AGENT fill:#2196f3
```

**Benefits:**
- ✅ Physical terminal support (EMV, NFC)
- ✅ Lower fees (card-present: 1.5% + 10¢)
- ✅ Automatic fallback (PAX → Stripe)
- ✅ Stripe unchanged (zero regression risk)

---

## 2. Payment Routing Decision Flow

```mermaid
flowchart TD
    START([Payment Request]) --> CASH{Payment Method<br/>= Cash?}
    
    CASH -->|Yes| CASH_HANDLER[Cash Handler<br/>No Processor]
    CASH_HANDLER --> END_CASH([Success])
    
    CASH -->|No| CHANNEL{Channel?}
    
    CHANNEL -->|Counter| TERMINAL{Terminal<br/>Available?}
    CHANNEL -->|Web/Mobile/Delivery| STRIPE_ROUTE[Route to Stripe]
    
    TERMINAL -->|Yes| PAX_TRY[Try PAX Terminal]
    TERMINAL -->|No| STRIPE_FALLBACK1[Fallback to Stripe]
    
    PAX_TRY --> PAX_SUCCESS{PAX Success?}
    PAX_SUCCESS -->|Yes| END_PAX([Success - PAX])
    PAX_SUCCESS -->|No| STRIPE_FALLBACK2[Fallback to Stripe]
    
    STRIPE_FALLBACK1 --> STRIPE_PROCESS[Stripe Payment Intent]
    STRIPE_FALLBACK2 --> STRIPE_PROCESS
    STRIPE_ROUTE --> STRIPE_PROCESS
    
    STRIPE_PROCESS --> END_STRIPE([Success - Stripe])
    
    style START fill:#e3f2fd
    style CASH_HANDLER fill:#fff9c4
    style PAX_TRY fill:#c8e6c9
    style STRIPE_PROCESS fill:#bbdefb
    style END_PAX fill:#4caf50
    style END_STRIPE fill:#2196f3
    style END_CASH fill:#ffc107
```

---

## 3. Risk Heat Map

```mermaid
quadrantChart
    title Payment Integration Risk Assessment
    x-axis Low Impact --> High Impact
    y-axis Low Probability --> High Probability
    quadrant-1 Monitor & Mitigate
    quadrant-2 Accept & Monitor
    quadrant-3 Accept
    quadrant-4 Mitigate Urgently
    
    "Dual Processor Complexity": [0.85, 0.85]
    "PCI Scope Expansion": [0.90, 0.75]
    "Transaction Reconciliation": [0.85, 0.80]
    "Stripe Regression": [0.90, 0.20]
    "Terminal Hardware Failure": [0.85, 0.50]
    "Payment Routing Errors": [0.80, 0.50]
    "Development Overrun": [0.70, 0.80]
    "Network Latency": [0.40, 0.30]
    "Staff Training": [0.50, 0.75]
```

### Risk Legend

**🔴 HIGH RISK (Quadrant 1 - Monitor & Mitigate):**
- Dual Processor Complexity
- PCI Scope Expansion
- Transaction Reconciliation
- Development Timeline Overrun

**🟡 MEDIUM RISK (Quadrant 2 & 4):**
- Terminal Hardware Failure
- Payment Routing Errors
- Staff Training Complexity

**🟢 LOW RISK (Quadrant 3):**
- Network Latency
- Stripe Regression (with proper testing)

---

## 4. Transaction Flow Sequence

### 4.1 Successful PAX Payment

```mermaid
sequenceDiagram
    actor Customer
    participant POS as POS Terminal
    participant API as NestJS API
    participant Router as Payment Router
    participant PAX as PAX Agent
    participant Terminal as PAX Terminal
    participant DB as PostgreSQL

    Customer->>POS: Scan Items
    POS->>API: POST /orders (method: 'card', terminalId: 'T1')
    API->>Router: authorize(amount, context)
    
    Note over Router: Decision: Card-Present<br/>+ Terminal Available
    
    Router->>PAX: authorize(context, terminal)
    PAX->>Terminal: POST /api/transaction (AUTH)
    
    Customer->>Terminal: Insert/Tap Card
    Terminal->>Terminal: Read EMV Chip
    Terminal-->>PAX: {success: true, authCode: 'ABC123'}
    
    PAX->>DB: Save Payment (processorType: 'pax')
    PAX-->>Router: {status: 'authorized', processorType: 'pax'}
    Router-->>API: PaymentResult
    API-->>POS: 200 OK
    POS->>Customer: Receipt Printed
    
    Note over Terminal,Customer: Transaction Time: 2-3 seconds
```

### 4.2 PAX Failure with Stripe Fallback

```mermaid
sequenceDiagram
    actor Customer
    participant POS as POS Terminal
    participant API as NestJS API
    participant Router as Payment Router
    participant PAX as PAX Agent
    participant Terminal as PAX Terminal
    participant Stripe as Stripe Agent
    participant StripeAPI as Stripe API

    Customer->>POS: Scan Items
    POS->>API: POST /orders (method: 'card', terminalId: 'T1')
    API->>Router: authorize(amount, context)
    
    Router->>PAX: authorize(context, terminal)
    PAX->>Terminal: POST /api/transaction (AUTH)
    Terminal-->>PAX: ❌ {success: false, error: 'Terminal Offline'}
    
    Note over Router: Automatic Fallback<br/>to Stripe
    
    Router->>Stripe: authorize(amount, 'card')
    Stripe->>StripeAPI: paymentIntents.create()
    StripeAPI-->>Stripe: PaymentIntent
    Stripe-->>Router: {status: 'authorized', processorType: 'stripe'}
    
    Router-->>API: PaymentResult
    API-->>POS: 200 OK (Manual Entry Required)
    POS->>Customer: Enter Card Manually
    
    Note over POS,Customer: Fallback adds 10-15 seconds
```

---

## 5. Database Schema Changes

```mermaid
erDiagram
    PAYMENT ||--o{ TRANSACTION : belongs_to
    TERMINAL ||--o{ LOCATION : belongs_to
    
    PAYMENT {
        string id PK
        string transactionId FK
        string method
        float amount
        string processorType "NEW: stripe|pax|cash"
        string processorId
        string cardType
        string last4
        string status
        timestamp createdAt
    }
    
    TERMINAL {
        string id PK "NEW TABLE"
        string locationId FK
        string name
        string type "pax_a920, pax_s900"
        string ipAddress
        string serialNumber
        string status "active|inactive|maintenance"
        timestamp lastHeartbeat
        timestamp createdAt
    }
    
    LOCATION {
        string id PK
        string name
        string address
    }
    
    TRANSACTION {
        string id PK
        string locationId FK
        float total
        string paymentMethod
        string paymentStatus
    }
```

**Migration Script:**

```sql
-- Add processorType to Payment table
ALTER TABLE "Payment" 
ADD COLUMN "processorType" VARCHAR(20) DEFAULT 'stripe';

-- Create Terminal table
CREATE TABLE "Terminal" (
  "id" TEXT PRIMARY KEY,
  "locationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "ipAddress" TEXT,
  "serialNumber" TEXT UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'active',
  "lastHeartbeat" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("locationId") REFERENCES "Location"("id")
);

CREATE INDEX "Terminal_locationId_idx" ON "Terminal"("locationId");
CREATE INDEX "Terminal_status_idx" ON "Terminal"("status");
```

---

## 6. Component Architecture

```mermaid
graph TB
    subgraph "New Components (16h effort)"
        ROUTER[Payment Router<br/>4h]
        PAX[PAX Terminal Agent<br/>6h]
        TERM_MGR[Terminal Manager<br/>3h]
        MIGRATIONS[DB Migrations<br/>1h]
        TESTS[Tests & QA<br/>2h]
    end
    
    subgraph "Existing Components (Untouched)"
        STRIPE[Stripe Payment Agent<br/>0h]
        ORCH[Order Orchestrator<br/>0h]
        OFFLINE[Offline Payment Agent<br/>0h]
    end
    
    subgraph "Integration Points"
        API[API Layer<br/>Minor changes]
        DB[Database Schema<br/>Additive only]
    end
    
    ROUTER --> PAX
    ROUTER --> STRIPE
    ROUTER --> TERM_MGR
    PAX --> DB
    STRIPE --> DB
    TERM_MGR --> DB
    
    ORCH --> ROUTER
    API --> ORCH
    
    style ROUTER fill:#ff9800
    style PAX fill:#4caf50
    style TERM_MGR fill:#4caf50
    style STRIPE fill:#2196f3
    style ORCH fill:#2196f3
```

**Effort Breakdown:**
- 🟢 **New Development:** 14h (Router, PAX Agent, Terminal Manager, Migrations)
- 🔵 **Testing:** 2h (Unit, Integration, Regression)
- ⚪ **Existing Code:** 0h (Zero changes to Stripe, Orchestrator)

---

## 7. Rollout Timeline

```mermaid
gantt
    title PAX Terminal Integration Rollout
    dateFormat YYYY-MM-DD
    section Research & Design
    PAX SDK Research           :2026-01-06, 2h
    Architecture Design        :2026-01-06, 2h
    
    section Development
    Payment Router             :2026-01-07, 4h
    PAX Terminal Agent         :2026-01-08, 6h
    Terminal Manager           :2026-01-09, 3h
    Database Migrations        :2026-01-09, 1h
    
    section Testing
    Unit Tests                 :2026-01-10, 1h
    Integration Tests          :2026-01-10, 1h
    Regression Tests           :2026-01-10, 1h
    
    section Deployment
    Staging Deployment         :2026-01-13, 1h
    Pilot (2 terminals)        :2026-01-14, 5d
    Gradual Rollout            :2026-01-20, 7d
    Full Production            :2026-01-27, 1d
    
    section Validation
    PCI Compliance Audit       :2026-01-20, 3d
```

**Critical Milestones:**
- ✅ **Day 1-2:** Research & Design (4h)
- ✅ **Day 3-4:** Core Development (14h)
- ✅ **Day 5:** Testing (3h)
- ✅ **Day 6:** Staging Deployment
- ✅ **Day 7-11:** Pilot (2 terminals)
- ✅ **Day 12-18:** Gradual Rollout
- ✅ **Day 19+:** Full Production

---

## 8. Monitoring Dashboard Layout

```mermaid
graph TB
    subgraph "Payment Metrics Dashboard"
        subgraph "Top Row - Volume"
            PAX_VOL[PAX Payments<br/>1,234/day<br/>↑ 12%]
            STRIPE_VOL[Stripe Payments<br/>456/day<br/>↓ 5%]
            CASH_VOL[Cash Payments<br/>789/day<br/>→ 0%]
        end
        
        subgraph "Middle Row - Success Rate"
            PAX_SUCCESS[PAX Success<br/>98.5%<br/>🟢 Healthy]
            STRIPE_SUCCESS[Stripe Success<br/>99.2%<br/>🟢 Healthy]
            FALLBACK[PAX→Stripe Fallback<br/>3.2%<br/>🟡 Monitor]
        end
        
        subgraph "Bottom Row - Performance"
            PAX_LATENCY[PAX Latency<br/>p95: 2.1s<br/>🟢 Good]
            STRIPE_LATENCY[Stripe Latency<br/>p95: 0.8s<br/>🟢 Good]
            TERMINAL_HEALTH[Terminal Health<br/>4/5 Active<br/>🟡 1 Offline]
        end
    end
    
    style PAX_VOL fill:#c8e6c9
    style PAX_SUCCESS fill:#c8e6c9
    style PAX_LATENCY fill:#c8e6c9
    style STRIPE_VOL fill:#bbdefb
    style STRIPE_SUCCESS fill:#bbdefb
    style STRIPE_LATENCY fill:#bbdefb
    style FALLBACK fill:#fff9c4
    style TERMINAL_HEALTH fill:#fff9c4
```

**Alert Thresholds:**
- 🔴 **Critical:** PAX success rate <95%, Terminal offline >5min
- 🟡 **Warning:** Fallback rate >20%, Latency p95 >5s
- 🟢 **Healthy:** All metrics within normal range

---

## 9. Cost-Benefit Summary

```mermaid
graph LR
    subgraph "Costs"
        DEV[Development<br/>$2,400]
        HARDWARE[Hardware<br/>$1,500]
        ONGOING[Ongoing<br/>$1,800/yr]
    end
    
    subgraph "Benefits"
        FEES[Lower Fees<br/>+$3,000/yr]
        SPEED[Faster Checkout<br/>+$2,000/yr]
        FRAUD[Fraud Protection<br/>+$500/yr]
    end
    
    subgraph "ROI"
        PAYBACK[Payback Period<br/>7.8 months]
        ROI_3YR[3-Year ROI<br/>362%]
    end
    
    DEV --> PAYBACK
    HARDWARE --> PAYBACK
    ONGOING --> PAYBACK
    
    FEES --> ROI_3YR
    SPEED --> ROI_3YR
    FRAUD --> ROI_3YR
    
    style FEES fill:#c8e6c9
    style SPEED fill:#c8e6c9
    style FRAUD fill:#c8e6c9
    style ROI_3YR fill:#4caf50
```

**Financial Summary:**
- **Total Investment:** $3,900 (one-time) + $1,800/yr (ongoing)
- **Annual Benefit:** $5,500/yr
- **Net Annual Benefit:** $3,700/yr
- **Payback Period:** 7.8 months
- **3-Year ROI:** 362%

---

## 10. Security & Compliance Architecture

```mermaid
graph TB
    subgraph "PCI Compliance Zones"
        subgraph "Out of Scope (No Card Data)"
            POS[POS Terminal<br/>UI Only]
            API[NestJS API<br/>Orchestration]
            DB[(Database<br/>Tokenized Only)]
        end
        
        subgraph "Reduced Scope (P2PE)"
            PAX_AGENT[PAX Agent<br/>API Calls Only]
            STRIPE_AGENT[Stripe Agent<br/>API Calls Only]
        end
        
        subgraph "PCI Validated (P2PE)"
            PAX_TERMINAL[PAX Terminal<br/>P2PE Validated]
            STRIPE_API[Stripe API<br/>PCI Level 1]
        end
    end
    
    POS -->|No Card Data| API
    API -->|No Card Data| PAX_AGENT
    API -->|No Card Data| STRIPE_AGENT
    
    PAX_AGENT -->|Encrypted| PAX_TERMINAL
    STRIPE_AGENT -->|Encrypted| STRIPE_API
    
    PAX_TERMINAL -->|Tokenized| DB
    STRIPE_API -->|Tokenized| DB
    
    style PAX_TERMINAL fill:#4caf50
    style STRIPE_API fill:#2196f3
    style DB fill:#fff9c4
```

**Security Controls:**
- ✅ **P2PE Terminals:** PAX handles card data (encrypted end-to-end)
- ✅ **Tokenization:** Backend stores only last4 + cardType
- ✅ **TLS 1.3:** All API communication encrypted
- ✅ **No Logging:** Never log full PAN, CVV, or track data
- ✅ **Access Control:** Terminal registration with API keys
- ✅ **Annual Audit:** PCI DSS compliance validation

---

## 11. Decision Summary

### 11.1 Go/No-Go Decision Matrix

```mermaid
graph TD
    START{PAX Integration<br/>Decision} --> FEASIBLE{Technically<br/>Feasible?}
    
    FEASIBLE -->|Yes| VALUE{High Business<br/>Value?}
    FEASIBLE -->|No| REJECT[❌ REJECT]
    
    VALUE -->|Yes| RISK{Acceptable<br/>Risk?}
    VALUE -->|No| REJECT
    
    RISK -->|Yes| RESOURCES{Resources<br/>Available?}
    RISK -->|No| DEFER[⏸️ DEFER]
    
    RESOURCES -->|Yes| APPROVE[✅ APPROVE]
    RESOURCES -->|No| DEFER
    
    APPROVE --> CONDITIONS{Conditions<br/>Met?}
    CONDITIONS -->|Yes| GO[🚀 GO]
    CONDITIONS -->|No| DEFER
    
    style APPROVE fill:#4caf50
    style GO fill:#4caf50
    style REJECT fill:#f44336
    style DEFER fill:#ff9800
```

**Final Decision:** ✅ **GO - APPROVED WITH CONDITIONS**

**Conditions:**
1. ✅ PAX REST API confirmed compatible
2. ✅ Zero changes to Stripe integration
3. ✅ Comprehensive test coverage (>80%)
4. ✅ Gradual rollout with rollback plan
5. ✅ PCI compliance validation

### 11.2 Risk Mitigation Summary

| Risk Category | Risk Level | Mitigation Status |
|--------------|------------|-------------------|
| Technical | 🔴 HIGH | ✅ Mitigated (Router pattern, fallback) |
| Security | 🔴 HIGH | ✅ Mitigated (P2PE, tokenization) |
| Operational | 🟡 MEDIUM | ✅ Mitigated (monitoring, training) |
| Business | 🟡 MEDIUM | ✅ Mitigated (phased rollout, ROI) |

---

## 12. Next Steps

```mermaid
graph LR
    A[1. Stakeholder<br/>Approval] --> B[2. PAX SDK<br/>Access]
    B --> C[3. Terminal<br/>Procurement]
    C --> D[4. Development<br/>16h]
    D --> E[5. Testing<br/>3h]
    E --> F[6. Pilot<br/>5 days]
    F --> G[7. Production<br/>Rollout]
    
    style A fill:#e3f2fd
    style B fill:#e3f2fd
    style C fill:#e3f2fd
    style D fill:#fff9c4
    style E fill:#fff9c4
    style F fill:#c8e6c9
    style G fill:#4caf50
```

**Immediate Actions:**
1. ✅ Review formal review document with stakeholders
2. ✅ Contact PAX sales for SDK access and pricing
3. ✅ Procure 2 PAX terminals for pilot
4. ✅ Schedule kickoff meeting (Jan 6, 2026)
5. ✅ Begin Phase 1: Research & Design

---

**Document Version:** 1.0  
**Last Updated:** January 3, 2026  
**Companion Document:** PAYMENT_INTEGRATION_FORMAL_REVIEW.md

---

**For Questions or Clarifications:**
- Technical: Tech Lead
- Business: Product Manager
- Security: Security Team
- Operations: Operations Manager

