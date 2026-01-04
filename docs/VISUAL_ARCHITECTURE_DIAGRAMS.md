# Visual Architecture Diagrams

> **Comprehensive Mermaid diagrams** for the Florida Liquor Store POS System covering architecture, sequences, integrations, patterns, and configurations.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Sequence Diagrams](#2-sequence-diagrams)
3. [Integration Diagrams](#3-integration-diagrams)
4. [Design Patterns](#4-design-patterns)
5. [Database Schema](#5-database-schema)
6. [Configuration Flows](#6-configuration-flows)
7. [UI Component Architecture](#7-ui-component-architecture)
8. [State Management](#8-state-management)

---

## 1. System Architecture

### 1.1 High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        POS[POS Terminal<br/>React + Vite]
        ADMIN[Admin Dashboard<br/>React + Vite]
        MOBILE[Mobile App<br/>Future]
    end
    
    subgraph "API Gateway"
        GATEWAY[NestJS API Gateway<br/>Port 3000]
        AUTH[JWT Auth Guard]
        THROTTLE[Rate Limiter]
        CORS[CORS Handler]
    end
    
    subgraph "Backend Services"
        PRODUCTS[Products Module]
        ORDERS[Orders Module]
        INVENTORY[Inventory Module]
        CUSTOMERS[Customers Module]
        COMPLIANCE[Compliance Module]
        PAYMENTS[Payments Module]
    end
    
    subgraph "Data Layer"
        POSTGRES[(PostgreSQL<br/>Primary DB)]
        REDIS[(Redis<br/>Cache/Queue)]
        INDEXDB[(IndexedDB<br/>Offline Storage)]
    end
    
    subgraph "External Services"
        STRIPE[Stripe<br/>Payments]
        SENTRY[Sentry<br/>Monitoring]
        BACKOFFICE[Back-Office<br/>Integration]
    end
    
    POS --> GATEWAY
    ADMIN --> GATEWAY
    MOBILE -.-> GATEWAY
    
    GATEWAY --> AUTH
    GATEWAY --> THROTTLE
    GATEWAY --> CORS
    
    AUTH --> PRODUCTS
    AUTH --> ORDERS
    AUTH --> INVENTORY
    AUTH --> CUSTOMERS
    AUTH --> COMPLIANCE
    AUTH --> PAYMENTS
    
    PRODUCTS --> POSTGRES
    ORDERS --> POSTGRES
    INVENTORY --> POSTGRES
    CUSTOMERS --> POSTGRES
    
    ORDERS --> REDIS
    INVENTORY --> REDIS
    
    POS --> INDEXDB
    
    PAYMENTS --> STRIPE
    ORDERS --> SENTRY
    ORDERS --> BACKOFFICE
    
    style POS fill:#4CAF50
    style ADMIN fill:#2196F3
    style GATEWAY fill:#FF9800
    style POSTGRES fill:#336791
    style REDIS fill:#DC382D
```

### 1.2 Module Architecture (Backend)

```mermaid
graph LR
    subgraph "Core Modules"
        AUTH[Auth Module]
        PRODUCTS[Products Module]
        ORDERS[Orders Module]
        INVENTORY[Inventory Module]
        CUSTOMERS[Customers Module]
        LOCATIONS[Locations Module]
    end
    
    subgraph "Integration Modules"
        CONEXXUS[Conexxus Module]
        STRIPE_INT[Stripe Integration]
        BACKOFFICE_INT[Back-Office Integration]
    end
    
    subgraph "Infrastructure"
        PRISMA[Prisma Service]
        REDIS_SVC[Redis Service]
        EVENT[Event Emitter]
        AUDIT[Audit Service]
        HEALTH[Health Module]
        MONITORING[Monitoring Service]
    end
    
    subgraph "Common"
        GUARDS[Auth Guards]
        FILTERS[Exception Filters]
        INTERCEPTORS[Interceptors]
        VALIDATORS[Validators]
    end
    
    ORDERS --> INVENTORY
    ORDERS --> PRODUCTS
    ORDERS --> CUSTOMERS
    ORDERS --> STRIPE_INT
    ORDERS --> AUDIT
    ORDERS --> EVENT
    
    INVENTORY --> PRODUCTS
    INVENTORY --> LOCATIONS
    INVENTORY --> EVENT
    
    PRODUCTS --> PRISMA
    ORDERS --> PRISMA
    INVENTORY --> PRISMA
    CUSTOMERS --> PRISMA
    
    AUTH --> REDIS_SVC
    ORDERS --> REDIS_SVC
    
    CONEXXUS --> PRODUCTS
    CONEXXUS --> INVENTORY
    
    style ORDERS fill:#FF5722
    style INVENTORY fill:#4CAF50
    style PRODUCTS fill:#2196F3
```

### 1.3 Frontend Architecture

```mermaid
graph TB
    subgraph "Pages"
        LOGIN[Login Page]
        POS_PAGE[POS Terminal Page]
        ADMIN_DASH[Admin Dashboard]
        ADMIN_PROD[Admin Products]
        ADMIN_USERS[Admin Users]
        ADMIN_SETTINGS[Admin Settings]
    end
    
    subgraph "Components"
        CART[Cart Component]
        CHECKOUT[Checkout Component]
        SEARCH[Product Search]
        OFFLINE[Offline Banner]
        TOAST[Toast Notifications]
    end
    
    subgraph "Domain Logic"
        CART_LOGIC[Cart Logic]
        TYPES[Domain Types]
    end
    
    subgraph "State Management"
        CART_STORE[Cart Store<br/>Zustand]
        PRODUCTS_STORE[Products Store]
        OFFLINE_STORE[Offline Store]
        SYNC_STORE[Sync Store]
        TOAST_STORE[Toast Store]
    end
    
    subgraph "Infrastructure"
        API[API Client]
        INDEXDB_REPO[IndexedDB<br/>Repositories]
        SYNC[Sync Service]
        LOGGER[Logger Service]
    end
    
    subgraph "Auth"
        AUTH_PROVIDER[Auth Provider]
        AUTH_CONTEXT[Auth Context]
    end
    
    POS_PAGE --> CART
    POS_PAGE --> CHECKOUT
    POS_PAGE --> SEARCH
    
    CART --> CART_STORE
    CHECKOUT --> CART_STORE
    CHECKOUT --> CART_LOGIC
    
    CART_STORE --> API
    PRODUCTS_STORE --> API
    
    API --> INDEXDB_REPO
    OFFLINE_STORE --> INDEXDB_REPO
    
    SYNC --> SYNC_STORE
    SYNC --> API
    SYNC --> INDEXDB_REPO
    
    LOGIN --> AUTH_PROVIDER
    POS_PAGE --> AUTH_PROVIDER
    
    style POS_PAGE fill:#4CAF50
    style CART_STORE fill:#FF9800
    style API fill:#2196F3
```

---

## 2. Sequence Diagrams

### 2.1 Counter Checkout Flow (Happy Path)

```mermaid
sequenceDiagram
    actor Cashier
    participant POS as POS Terminal
    participant Cart as Cart Store
    participant API as API Client
    participant Backend as Orders Service
    participant Inventory as Inventory Agent
    participant Pricing as Pricing Agent
    participant Payment as Payment Agent
    participant DB as PostgreSQL
    participant Stripe as Stripe API
    
    Cashier->>POS: Scan barcode
    POS->>Cart: Add item to cart
    Cart->>Cart: Check if age-restricted
    
    alt Age-Restricted Item
        Cart-->>POS: Show age verification prompt
        Cashier->>POS: Verify customer age
        POS->>Cart: Set ageVerified = true
    end
    
    Cashier->>POS: Click Checkout
    POS->>Cart: Get cart items & totals
    Cart->>API: POST /api/orders
    
    API->>Backend: Create order request
    
    rect rgb(200, 220, 240)
        Note over Backend,DB: SAGA Pattern - Step 1: Inventory
        Backend->>Inventory: Check & reserve inventory
        Inventory->>DB: SELECT FOR UPDATE (lock rows)
        DB-->>Inventory: Inventory locked
        Inventory->>DB: UPDATE reserved quantity
        DB-->>Inventory: Reservation confirmed
        Inventory-->>Backend: Reservation ID
    end
    
    rect rgb(220, 240, 200)
        Note over Backend,Pricing: SAGA Pattern - Step 2: Pricing
        Backend->>Pricing: Calculate pricing
        Pricing->>DB: Get product prices & tax rate
        DB-->>Pricing: Prices & tax rate
        Pricing->>Pricing: Calculate subtotal, tax, total
        Pricing-->>Backend: Pricing result
    end
    
    rect rgb(240, 220, 200)
        Note over Backend,Stripe: SAGA Pattern - Step 3: Payment
        Backend->>Payment: Authorize payment
        
        alt Card Payment
            Payment->>Stripe: Create Payment Intent
            Stripe-->>Payment: Payment authorized
        else Cash Payment
            Payment->>Payment: Mark as captured
        end
        
        Payment-->>Backend: Payment result
    end
    
    rect rgb(240, 200, 220)
        Note over Backend,DB: SAGA Pattern - Step 4: Commit
        Backend->>DB: Create transaction record
        Backend->>DB: Create transaction items
        Backend->>DB: Create payment record
        Backend->>DB: Update inventory (decrement)
        DB-->>Backend: Transaction committed
    end
    
    Backend-->>API: Order response
    API-->>POS: Success
    POS->>Cart: Clear cart
    POS->>Cashier: Show success message
    
    Note over POS,Cashier: Total time: <2 seconds
```

### 2.2 Offline Order Processing

```mermaid
sequenceDiagram
    actor Cashier
    participant POS as POS Terminal
    participant Network as Network Status
    participant IDB as IndexedDB
    participant Queue as Offline Queue
    participant API as API Client
    participant Backend as Backend API
    
    Cashier->>POS: Scan products & checkout
    POS->>Network: Check connectivity
    Network-->>POS: Offline
    
    rect rgb(255, 200, 200)
        Note over POS,IDB: Offline Mode Active
        POS->>IDB: Save transaction locally
        IDB-->>POS: Saved (UUID)
        POS->>Queue: Add to sync queue
        Queue-->>POS: Queued
        POS->>Cashier: ⚠️ Offline - Will sync later
    end
    
    Note over Network: Internet restored
    
    Network->>POS: Online event
    POS->>Queue: Process queue
    
    loop For each queued transaction
        Queue->>API: POST /api/orders
        API->>Backend: Create order
        
        alt Success
            Backend-->>API: Order created
            API-->>Queue: Success
            Queue->>IDB: Mark as synced
            Queue->>POS: Update UI
        else Failure
            Backend-->>API: Error
            API-->>Queue: Retry later
            Queue->>Queue: Exponential backoff
        end
    end
    
    Queue->>POS: All synced ✓
    POS->>Cashier: All transactions synced
```

### 2.3 Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Login Page
    participant Auth as Auth Provider
    participant API as API Client
    participant Backend as Auth Controller
    participant Service as Auth Service
    participant DB as PostgreSQL
    participant Redis as Redis
    
    User->>UI: Enter username & password
    UI->>Auth: login(credentials)
    Auth->>API: POST /api/auth/login
    
    API->>Backend: Login request
    Backend->>Service: validateUser()
    Service->>DB: SELECT user WHERE username
    DB-->>Service: User record
    Service->>Service: bcrypt.compare(password)
    
    alt Valid Credentials
        Service->>Service: Generate JWT (jti)
        Service->>Redis: Store session (jti)
        Redis-->>Service: Stored
        Service-->>Backend: { access_token, user }
        Backend->>Backend: Set HttpOnly cookie
        Backend-->>API: User data + cookie
        API-->>Auth: User object
        Auth->>Auth: Update context
        Auth-->>UI: Success
        UI->>User: Redirect to dashboard
    else Invalid Credentials
        Service-->>Backend: null
        Backend-->>API: 401 Unauthorized
        API-->>Auth: Error
        Auth-->>UI: Error message
        UI->>User: Show error
    end
```

### 2.4 Product Search with AI

```mermaid
sequenceDiagram
    actor User
    participant UI as Search Component
    participant Store as Products Store
    participant API as API Client
    participant Backend as Products Controller
    participant AI as AI Service
    participant Vector as Vector Search
    participant DB as PostgreSQL
    
    User->>UI: Type search query
    UI->>Store: Search products
    Store->>API: GET /api/products/search?q=query
    
    API->>Backend: Search request
    Backend->>AI: Generate embedding
    AI->>AI: OpenAI embeddings API
    AI-->>Backend: Vector [1536 dimensions]
    
    Backend->>Vector: Cosine similarity search
    Vector->>DB: Find similar embeddings
    DB-->>Vector: Top 10 matches
    Vector-->>Backend: Ranked results
    
    Backend->>Backend: Enrich with inventory
    Backend-->>API: Product results
    API-->>Store: Update products
    Store-->>UI: Render results
    UI->>User: Display products
    
    Note over UI,User: Search time: <500ms
```

### 2.5 Inventory Adjustment Flow

```mermaid
sequenceDiagram
    actor Manager
    participant UI as Admin Dashboard
    participant API as API Client
    participant Backend as Inventory Service
    participant DB as PostgreSQL
    participant Events as Event Emitter
    participant Audit as Audit Service
    participant Redis as Redis Pub/Sub
    
    Manager->>UI: Adjust inventory (+10 units)
    UI->>API: POST /api/inventory/adjust
    
    API->>Backend: Adjustment request
    Backend->>DB: SELECT inventory FOR UPDATE
    DB-->>Backend: Current quantity (locked)
    
    Backend->>Backend: Calculate new quantity
    Backend->>DB: UPDATE quantity
    DB-->>Backend: Updated
    
    Backend->>Events: Emit 'inventory.adjusted'
    Events->>Audit: Log adjustment
    Audit->>DB: INSERT event_log
    
    Events->>Redis: Publish event
    Redis-->>Events: Published
    
    Backend-->>API: Success
    API-->>UI: Updated inventory
    UI->>Manager: Show success
    
    Note over Redis: Other terminals receive update
```

---

## 3. Integration Diagrams

### 3.1 External Integrations Overview

```mermaid
graph TB
    subgraph "POS System"
        BACKEND[Backend API]
        ORDERS[Orders Service]
        INVENTORY[Inventory Service]
        PRODUCTS[Products Service]
    end
    
    subgraph "Payment Processing"
        STRIPE[Stripe API]
        STRIPE_TERMINAL[Stripe Terminal SDK]
    end
    
    subgraph "Monitoring & Analytics"
        SENTRY[Sentry<br/>Error Tracking]
        POSTHOG[PostHog<br/>Analytics]
    end
    
    subgraph "Back-Office"
        BACKOFFICE[Friend's System<br/>REST API]
    end
    
    subgraph "Future Integrations"
        UBEREATS[Uber Eats API<br/>Webhooks]
        DOORDASH[DoorDash API<br/>Webhooks]
    end
    
    ORDERS -->|Payment Intent| STRIPE
    ORDERS -->|Terminal Payment| STRIPE_TERMINAL
    
    BACKEND -->|Error Events| SENTRY
    BACKEND -->|Analytics Events| POSTHOG
    
    ORDERS -->|Transaction Sync| BACKOFFICE
    INVENTORY -->|Inventory Sync| BACKOFFICE
    PRODUCTS -->|Product Sync| BACKOFFICE
    
    UBEREATS -.->|Order Webhook| ORDERS
    DOORDASH -.->|Order Webhook| ORDERS
    
    style STRIPE fill:#635BFF
    style SENTRY fill:#362D59
    style BACKOFFICE fill:#FF9800
```

### 3.2 Stripe Payment Integration

```mermaid
sequenceDiagram
    participant POS as POS Terminal
    participant Backend as Payment Agent
    participant Stripe as Stripe API
    participant Terminal as Card Terminal
    
    POS->>Backend: Authorize payment ($13.90)
    
    rect rgb(200, 220, 255)
        Note over Backend,Stripe: Authorization Phase
        Backend->>Stripe: Create Payment Intent
        Note right of Backend: capture_method: 'manual'
        Stripe-->>Backend: payment_intent.id
        Backend-->>POS: Payment authorized
    end
    
    POS->>Terminal: Present card reader
    Terminal->>Stripe: Card data (tokenized)
    Stripe->>Stripe: Validate card
    Stripe-->>Terminal: Authorized
    Terminal-->>POS: Card accepted
    
    rect rgb(220, 255, 220)
        Note over Backend,Stripe: Capture Phase
        POS->>Backend: Capture payment
        Backend->>Stripe: Capture Payment Intent
        Stripe->>Stripe: Process payment
        Stripe-->>Backend: payment_intent.succeeded
        Backend-->>POS: Payment captured
    end
    
    Note over POS,Stripe: Two-phase commit for refund safety
```

### 3.3 Back-Office Sync Integration

```mermaid
graph LR
    subgraph "POS System"
        ORDERS[Orders Service]
        INVENTORY[Inventory Service]
        PRODUCTS[Products Service]
        SYNC[Sync Service]
    end
    
    subgraph "Sync Queue"
        REDIS[(Redis Queue)]
    end
    
    subgraph "Back-Office System"
        BO_API[REST API]
        BO_DB[(Back-Office DB)]
    end
    
    ORDERS -->|Transaction Created| REDIS
    INVENTORY -->|Inventory Updated| REDIS
    PRODUCTS -->|Product Updated| REDIS
    
    SYNC -->|Poll Queue| REDIS
    REDIS -->|Batch Events| SYNC
    
    SYNC -->|POST /transactions| BO_API
    SYNC -->|POST /inventory| BO_API
    SYNC -->|PUT /products| BO_API
    
    BO_API -->|Store| BO_DB
    BO_API -->|Confirmation| SYNC
    
    SYNC -->|Update Status| ORDERS
    SYNC -->|Update Status| INVENTORY
    SYNC -->|Update Status| PRODUCTS
    
    style REDIS fill:#DC382D
    style SYNC fill:#FF9800
```

---

## 4. Design Patterns

### 4.1 SAGA Pattern (Order Orchestration)

```mermaid
graph TB
    START([Order Request]) --> STEP1
    
    subgraph "SAGA Steps"
        STEP1[Step 1: Reserve Inventory]
        STEP2[Step 2: Calculate Pricing]
        STEP3[Step 3: Authorize Payment]
        STEP4[Step 4: Commit Transaction]
    end
    
    subgraph "Compensations"
        COMP1[Release Inventory]
        COMP2[Rollback Pricing]
        COMP3[Refund Payment]
    end
    
    STEP1 -->|Success| STEP2
    STEP2 -->|Success| STEP3
    STEP3 -->|Success| STEP4
    STEP4 -->|Success| SUCCESS([Order Complete])
    
    STEP1 -->|Failure| FAIL1([Fail: No Inventory])
    STEP2 -->|Failure| COMP1
    STEP3 -->|Failure| COMP1
    STEP4 -->|Failure| COMP3
    
    COMP1 --> FAIL2([Fail: Compensated])
    COMP3 --> COMP1
    
    style STEP1 fill:#4CAF50
    style STEP2 fill:#2196F3
    style STEP3 fill:#FF9800
    style STEP4 fill:#9C27B0
    style COMP1 fill:#F44336
    style COMP3 fill:#F44336
```

### 4.2 Agent Pattern (Order Processing)

```mermaid
graph LR
    ORCHESTRATOR[Order Orchestrator]
    
    subgraph "Specialized Agents"
        INV_AGENT[Inventory Agent]
        PRICE_AGENT[Pricing Agent]
        COMP_AGENT[Compliance Agent]
        PAY_AGENT[Payment Agent]
        OFFLINE_AGENT[Offline Payment Agent]
    end
    
    subgraph "Infrastructure"
        PRISMA[(Prisma)]
        REDIS[(Redis)]
        STRIPE[Stripe]
    end
    
    ORCHESTRATOR -->|Delegate| INV_AGENT
    ORCHESTRATOR -->|Delegate| PRICE_AGENT
    ORCHESTRATOR -->|Delegate| COMP_AGENT
    ORCHESTRATOR -->|Delegate| PAY_AGENT
    ORCHESTRATOR -->|Delegate| OFFLINE_AGENT
    
    INV_AGENT --> PRISMA
    PRICE_AGENT --> PRISMA
    COMP_AGENT --> PRISMA
    PAY_AGENT --> STRIPE
    OFFLINE_AGENT --> REDIS
    
    style ORCHESTRATOR fill:#FF5722
    style INV_AGENT fill:#4CAF50
    style PRICE_AGENT fill:#2196F3
    style PAY_AGENT fill:#FF9800
```

### 4.3 Repository Pattern (Frontend)

```mermaid
graph TB
    subgraph "Application Layer"
        COMPONENT[React Components]
        STORE[Zustand Stores]
    end
    
    subgraph "Domain Layer"
        LOGIC[Business Logic]
        TYPES[Domain Types]
    end
    
    subgraph "Infrastructure Layer"
        API[API Client]
        ORDER_REPO[Order Repository]
        PRODUCT_REPO[Product Repository]
    end
    
    subgraph "Data Sources"
        BACKEND[Backend API]
        INDEXDB[(IndexedDB)]
    end
    
    COMPONENT --> STORE
    STORE --> LOGIC
    LOGIC --> TYPES
    
    STORE --> API
    STORE --> ORDER_REPO
    STORE --> PRODUCT_REPO
    
    API --> BACKEND
    ORDER_REPO --> INDEXDB
    PRODUCT_REPO --> INDEXDB
    
    ORDER_REPO -.->|Fallback| API
    PRODUCT_REPO -.->|Fallback| API
    
    style LOGIC fill:#4CAF50
    style ORDER_REPO fill:#2196F3
    style INDEXDB fill:#FF9800
```

### 4.4 Event-Driven Architecture

```mermaid
graph TB
    subgraph "Event Publishers"
        ORDERS[Orders Service]
        INVENTORY[Inventory Service]
        PRODUCTS[Products Service]
    end
    
    subgraph "Event Bus"
        EMITTER[Event Emitter 2]
        REDIS[(Redis Pub/Sub)]
    end
    
    subgraph "Event Subscribers"
        AUDIT[Audit Service]
        SYNC[Sync Service]
        NOTIFICATIONS[Notification Service]
        ANALYTICS[Analytics Service]
    end
    
    ORDERS -->|order.created| EMITTER
    ORDERS -->|order.completed| EMITTER
    INVENTORY -->|inventory.adjusted| EMITTER
    INVENTORY -->|inventory.low| EMITTER
    PRODUCTS -->|product.updated| EMITTER
    
    EMITTER --> REDIS
    
    REDIS --> AUDIT
    REDIS --> SYNC
    REDIS --> NOTIFICATIONS
    REDIS --> ANALYTICS
    
    AUDIT -->|Log| DB[(PostgreSQL)]
    SYNC -->|Queue| BACKOFFICE[Back-Office]
    
    style EMITTER fill:#FF9800
    style REDIS fill:#DC382D
```

---

## 5. Database Schema

### 5.1 Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Transaction : creates
    Location ||--o{ Transaction : has
    Location ||--o{ Inventory : has
    Product ||--o{ Inventory : tracks
    Product ||--o{ ProductImage : has
    Product ||--o{ TransactionItem : contains
    Transaction ||--o{ TransactionItem : contains
    Transaction ||--o{ Payment : has
    Transaction ||--o| Customer : for
    Customer ||--o{ Transaction : places
    
    User {
        uuid id PK
        string username UK
        string password
        string pin
        string firstName
        string lastName
        enum role
        boolean active
        timestamp createdAt
        timestamp updatedAt
    }
    
    Product {
        uuid id PK
        string sku UK
        string upc UK
        string name
        string description
        string category
        float abv
        int volumeMl
        int caseSize
        float basePrice
        float cost
        boolean trackInventory
        boolean ageRestricted
        string searchText
        string embedding
        timestamp createdAt
        timestamp updatedAt
    }
    
    Inventory {
        uuid id PK
        uuid productId FK
        uuid locationId FK
        int quantity
        int reserved
        int reorderPoint
        timestamp updatedAt
    }
    
    Location {
        uuid id PK
        string name
        string address
        string city
        string state
        string zip
        float taxRate
        float countyTaxRate
        string licenseNumber
        timestamp licenseExpiry
        timestamp createdAt
    }
    
    Transaction {
        uuid id PK
        uuid locationId FK
        string terminalId
        string employeeId
        uuid customerId FK
        float subtotal
        float tax
        float discount
        float total
        string paymentMethod
        string paymentStatus
        string channel
        boolean ageVerified
        string ageVerifiedBy
        boolean idScanned
        boolean syncedToCloud
        boolean syncedToBackOffice
        string idempotencyKey UK
        timestamp createdAt
    }
    
    TransactionItem {
        uuid id PK
        uuid transactionId FK
        string sku
        string name
        int quantity
        float unitPrice
        float discount
        float tax
        float total
    }
    
    Payment {
        uuid id PK
        uuid transactionId FK
        string method
        float amount
        string status
        string processorId
        string processorResponse
        timestamp createdAt
    }
    
    Customer {
        uuid id PK
        string firstName
        string lastName
        string email
        string phone
        date dateOfBirth
        boolean ageVerified
        int loyaltyPoints
        timestamp createdAt
        timestamp updatedAt
    }
    
    ProductImage {
        uuid id PK
        uuid productId FK
        string url
        boolean isPrimary
    }
```

### 5.2 Database Indexes Strategy

```mermaid
graph TB
    subgraph "High-Performance Indexes"
        IDX1[Product.sku<br/>UNIQUE INDEX]
        IDX2[Product.category<br/>B-TREE INDEX]
        IDX3[Transaction.locationId + createdAt<br/>COMPOSITE INDEX]
        IDX4[Inventory.productId + locationId<br/>UNIQUE COMPOSITE]
    end
    
    subgraph "Query Patterns"
        Q1[Product Lookup by SKU]
        Q2[Products by Category]
        Q3[Daily Sales Report]
        Q4[Inventory Check]
    end
    
    Q1 -->|Uses| IDX1
    Q2 -->|Uses| IDX2
    Q3 -->|Uses| IDX3
    Q4 -->|Uses| IDX4
    
    style IDX1 fill:#4CAF50
    style IDX2 fill:#2196F3
    style IDX3 fill:#FF9800
    style IDX4 fill:#9C27B0
```

---

## 6. Configuration Flows

### 6.1 Tax Configuration Flow

```mermaid
graph TB
    START([Configure Tax Rates]) --> LOCATION
    
    LOCATION[Select Location]
    LOCATION --> STATE[Florida State Tax<br/>7% base rate]
    
    STATE --> COUNTY{County Tax?}
    COUNTY -->|Yes| ADD_COUNTY[Add County Tax<br/>0-1.5%]
    COUNTY -->|No| CALC
    
    ADD_COUNTY --> CALC[Calculate Combined Rate]
    
    CALC --> SAVE[Save to Location Record]
    SAVE --> DB[(PostgreSQL)]
    
    DB --> APPLY[Apply to Transactions]
    
    subgraph "Runtime Calculation"
        APPLY --> ORDER[New Order]
        ORDER --> GET_RATE[Get Location Tax Rate]
        GET_RATE --> COMPUTE[Compute Tax<br/>subtotal × taxRate]
        COMPUTE --> TOTAL[Add to Total]
    end
    
    style STATE fill:#4CAF50
    style CALC fill:#2196F3
    style COMPUTE fill:#FF9800
```

### 6.2 Pricing Configuration Flow

```mermaid
graph LR
    subgraph "Price Sources"
        BACKOFFICE[Back-Office System<br/>Source of Truth]
        MANUAL[Manual Entry<br/>Admin Dashboard]
        IMPORT[CSV Import]
    end
    
    subgraph "Price Sync"
        SYNC[Sync Service]
        QUEUE[Redis Queue]
    end
    
    subgraph "POS System"
        PRODUCTS[Products Service]
        DB[(PostgreSQL)]
        CACHE[(Redis Cache)]
    end
    
    subgraph "Price Application"
        PRICING[Pricing Agent]
        ORDER[Order Processing]
    end
    
    BACKOFFICE -->|Webhook| SYNC
    MANUAL -->|API Call| PRODUCTS
    IMPORT -->|Batch Upload| PRODUCTS
    
    SYNC --> QUEUE
    QUEUE --> PRODUCTS
    
    PRODUCTS --> DB
    PRODUCTS --> CACHE
    
    ORDER --> PRICING
    PRICING -->|Read| CACHE
    CACHE -.->|Miss| DB
    
    style BACKOFFICE fill:#FF9800
    style CACHE fill:#DC382D
    style PRICING fill:#4CAF50
```

### 6.3 Adding New Product Configuration

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Admin Dashboard
    participant API as Products API
    participant Service as Products Service
    participant AI as AI Service
    participant DB as PostgreSQL
    participant Cache as Redis
    
    Admin->>UI: Fill product form
    Note right of Admin: SKU, name, price,<br/>category, ABV, etc.
    
    UI->>UI: Validate form
    UI->>API: POST /api/products
    
    API->>Service: Create product
    Service->>Service: Validate SKU uniqueness
    
    Service->>AI: Generate search embedding
    AI->>AI: OpenAI embeddings
    AI-->>Service: Vector [1536]
    
    Service->>DB: INSERT product
    DB-->>Service: Product created
    
    Service->>Cache: Cache product
    Cache-->>Service: Cached
    
    Service->>Service: Emit 'product.created'
    
    Service-->>API: Product response
    API-->>UI: Success
    UI->>Admin: Show success message
    
    Note over Service,DB: Auto-create inventory<br/>records for all locations
```

### 6.4 Button/UI Configuration

```mermaid
graph TB
    subgraph "UI Configuration"
        CONFIG[Frontend Config]
        THEME[Theme Settings]
        LAYOUT[Layout Config]
    end
    
    subgraph "Button Types"
        PRIMARY[Primary Actions<br/>Checkout, Save]
        SECONDARY[Secondary Actions<br/>Cancel, Back]
        DANGER[Danger Actions<br/>Delete, Refund]
        DISABLED[Disabled State]
    end
    
    subgraph "Styling System"
        TAILWIND[Tailwind CSS]
        CLASSES[Utility Classes]
        VARIANTS[Button Variants]
    end
    
    CONFIG --> THEME
    THEME --> TAILWIND
    
    TAILWIND --> CLASSES
    CLASSES --> PRIMARY
    CLASSES --> SECONDARY
    CLASSES --> DANGER
    CLASSES --> DISABLED
    
    PRIMARY -.->|bg-green-600| VARIANTS
    SECONDARY -.->|bg-gray-600| VARIANTS
    DANGER -.->|bg-red-600| VARIANTS
    DISABLED -.->|opacity-50| VARIANTS
    
    LAYOUT --> RESPONSIVE[Responsive Breakpoints]
    RESPONSIVE --> MOBILE[Mobile: sm]
    RESPONSIVE --> TABLET[Tablet: md]
    RESPONSIVE --> DESKTOP[Desktop: lg]
    
    style PRIMARY fill:#4CAF50
    style DANGER fill:#F44336
    style TAILWIND fill:#38BDF8
```

---

## 7. UI Component Architecture

### 7.1 POS Terminal Component Tree

```mermaid
graph TB
    APP[App.tsx]
    
    APP --> ROUTER[Router]
    ROUTER --> LOGIN[Login Page]
    ROUTER --> POS[POS Terminal Page]
    ROUTER --> ADMIN[Admin Layout]
    
    subgraph "POS Terminal"
        POS --> HEADER[Header<br/>User, Location]
        POS --> SEARCH[Product Search]
        POS --> CART[Cart Component]
        POS --> CHECKOUT[Checkout Component]
        POS --> OFFLINE[Offline Banner]
    end
    
    subgraph "Cart Component"
        CART --> CART_ITEMS[Cart Items List]
        CART --> CART_SUMMARY[Cart Summary]
        CART_ITEMS --> CART_ITEM[Cart Item<br/>× N]
    end
    
    subgraph "Checkout Component"
        CHECKOUT --> PAYMENT_SELECT[Payment Method]
        CHECKOUT --> AGE_VERIFY[Age Verification]
        CHECKOUT --> CHECKOUT_BTN[Checkout Button]
    end
    
    subgraph "Search Component"
        SEARCH --> SEARCH_INPUT[Search Input]
        SEARCH --> RESULTS[Product Results]
        RESULTS --> PRODUCT_CARD[Product Card<br/>× N]
    end
    
    APP --> TOAST[Toast Notifications]
    APP --> PWA[PWA Install Prompt]
    
    style POS fill:#4CAF50
    style CART fill:#2196F3
    style CHECKOUT fill:#FF9800
```

### 7.2 Admin Dashboard Component Tree

```mermaid
graph TB
    ADMIN[Admin Layout]
    
    ADMIN --> SIDEBAR[Sidebar Navigation]
    ADMIN --> CONTENT[Content Area]
    
    CONTENT --> DASH[Dashboard Page]
    CONTENT --> PRODUCTS[Products Page]
    CONTENT --> USERS[Users Page]
    CONTENT --> SETTINGS[Settings Page]
    
    subgraph "Dashboard Page"
        DASH --> STATS[Stats Cards]
        DASH --> CHART[Sales Chart]
        DASH --> RECENT[Recent Orders]
    end
    
    subgraph "Products Page"
        PRODUCTS --> FILTER[Filter Box]
        PRODUCTS --> TABLE[Products Table]
        PRODUCTS --> ACTIONS[Action Buttons]
        TABLE --> ROW[Product Row<br/>× N]
    end
    
    subgraph "Users Page"
        USERS --> USER_LIST[Users List]
        USERS --> USER_FORM[User Form]
        USER_LIST --> USER_CARD[User Card<br/>× N]
    end
    
    subgraph "Settings Page"
        SETTINGS --> TAX_CONFIG[Tax Configuration]
        SETTINGS --> LOCATION_CONFIG[Location Settings]
        SETTINGS --> SYSTEM_CONFIG[System Settings]
    end
    
    style DASH fill:#4CAF50
    style PRODUCTS fill:#2196F3
    style USERS fill:#FF9800
```

### 7.3 Component State Flow

```mermaid
graph LR
    subgraph "User Actions"
        SCAN[Scan Product]
        ADJUST[Adjust Quantity]
        REMOVE[Remove Item]
        CHECKOUT_ACT[Checkout]
    end
    
    subgraph "State Updates"
        CART_STORE[Cart Store<br/>Zustand]
        PRODUCTS_STORE[Products Store]
        SYNC_STORE[Sync Store]
    end
    
    subgraph "Side Effects"
        API_CALL[API Calls]
        IDB_SAVE[IndexedDB Save]
        TOAST_SHOW[Show Toast]
    end
    
    subgraph "UI Updates"
        RERENDER[Component Re-render]
        ANIMATION[Animations]
    end
    
    SCAN --> CART_STORE
    ADJUST --> CART_STORE
    REMOVE --> CART_STORE
    CHECKOUT_ACT --> CART_STORE
    
    CART_STORE --> API_CALL
    CART_STORE --> IDB_SAVE
    CART_STORE --> TOAST_SHOW
    
    CART_STORE --> RERENDER
    RERENDER --> ANIMATION
    
    API_CALL --> SYNC_STORE
    IDB_SAVE --> SYNC_STORE
    
    style CART_STORE fill:#FF9800
    style RERENDER fill:#4CAF50
```

---

## 8. State Management

### 8.1 Zustand Store Architecture

```mermaid
graph TB
    subgraph "Zustand Stores"
        CART[Cart Store]
        PRODUCTS[Products Store]
        OFFLINE[Offline Store]
        SYNC[Sync Store]
        TOAST[Toast Store]
    end
    
    subgraph "Store Contents"
        CART --> CART_STATE[State:<br/>items, total, tax]
        CART --> CART_ACTIONS[Actions:<br/>addItem, removeItem,<br/>checkout, clear]
        
        PRODUCTS --> PROD_STATE[State:<br/>products, loading]
        PRODUCTS --> PROD_ACTIONS[Actions:<br/>fetchProducts,<br/>searchProducts]
        
        OFFLINE --> OFF_STATE[State:<br/>isOffline, queue]
        OFFLINE --> OFF_ACTIONS[Actions:<br/>addToQueue,<br/>processQueue]
    end
    
    subgraph "Persistence"
        CART_ACTIONS --> IDB1[(IndexedDB)]
        OFFLINE --> IDB2[(IndexedDB)]
        SYNC --> IDB3[(IndexedDB)]
    end
    
    subgraph "API Integration"
        CART_ACTIONS --> API[API Client]
        PROD_ACTIONS --> API
        OFF_ACTIONS --> API
    end
    
    style CART fill:#4CAF50
    style PRODUCTS fill:#2196F3
    style OFFLINE fill:#FF9800
```

### 8.2 State Synchronization Flow

```mermaid
sequenceDiagram
    participant UI as React Component
    participant Store as Zustand Store
    participant IDB as IndexedDB
    participant API as API Client
    participant Backend as Backend API
    
    UI->>Store: Subscribe to state
    Store-->>UI: Initial state
    
    UI->>Store: Dispatch action
    Store->>Store: Update state
    Store-->>UI: Notify subscribers
    UI->>UI: Re-render
    
    par Persist Locally
        Store->>IDB: Save state
        IDB-->>Store: Saved
    and Sync to Backend
        Store->>API: POST request
        API->>Backend: HTTP request
        Backend-->>API: Response
        API-->>Store: Update state
        Store-->>UI: Notify subscribers
    end
```

### 8.3 Offline State Management

```mermaid
stateDiagram-v2
    [*] --> Online
    
    Online --> Offline: Network Lost
    Offline --> Online: Network Restored
    
    state Online {
        [*] --> Synced
        Synced --> Syncing: Action Triggered
        Syncing --> Synced: API Success
        Syncing --> Error: API Failure
        Error --> Syncing: Retry
    }
    
    state Offline {
        [*] --> Queued
        Queued --> Queued: Queue Action
        Queued --> PendingSync: Network Restored
    }
    
    PendingSync --> Online: Start Sync
    
    note right of Offline
        Actions saved to IndexedDB
        Will sync when online
    end note
    
    note right of Online
        Real-time sync with backend
        Immediate feedback
    end note
```

---

## 9. Deployment Architecture

### 9.1 Production Deployment

```mermaid
graph TB
    subgraph "Client Devices"
        POS_TABLET[POS Tablets<br/>8-10 inch]
        ADMIN_PC[Admin PC<br/>Desktop Browser]
        MOBILE[Mobile Devices<br/>Future]
    end
    
    subgraph "CDN Layer"
        CLOUDFLARE[Cloudflare CDN]
    end
    
    subgraph "Frontend Hosting"
        VERCEL[Vercel<br/>React Apps]
    end
    
    subgraph "Backend Hosting"
        RAILWAY[Railway<br/>NestJS API]
        SCALE[Auto-scaling<br/>2-10 instances]
    end
    
    subgraph "Database Layer"
        POSTGRES[PostgreSQL<br/>Supabase/Neon]
        REDIS[Redis<br/>Upstash]
    end
    
    subgraph "Storage"
        R2[Cloudflare R2<br/>Object Storage]
    end
    
    subgraph "Monitoring"
        SENTRY[Sentry<br/>Error Tracking]
        UPTIME[Uptime Robot<br/>Monitoring]
    end
    
    POS_TABLET --> CLOUDFLARE
    ADMIN_PC --> CLOUDFLARE
    MOBILE -.-> CLOUDFLARE
    
    CLOUDFLARE --> VERCEL
    CLOUDFLARE --> RAILWAY
    
    RAILWAY --> SCALE
    SCALE --> POSTGRES
    SCALE --> REDIS
    SCALE --> R2
    
    RAILWAY --> SENTRY
    RAILWAY --> UPTIME
    
    style CLOUDFLARE fill:#F38020
    style VERCEL fill:#000000
    style RAILWAY fill:#0B0D0E
    style POSTGRES fill:#336791
```

### 9.2 Development Environment

```mermaid
graph LR
    subgraph "Developer Machine"
        CODE[VS Code]
        TERMINAL[Terminal]
    end
    
    subgraph "Local Services"
        FRONTEND[Vite Dev Server<br/>Port 5173]
        BACKEND[NestJS Dev Server<br/>Port 3000]
        DB[PostgreSQL<br/>Port 5432]
        REDIS_LOCAL[Redis<br/>Port 6379]
    end
    
    subgraph "External Services"
        STRIPE_TEST[Stripe Test Mode]
    end
    
    CODE --> TERMINAL
    TERMINAL --> FRONTEND
    TERMINAL --> BACKEND
    TERMINAL --> DB
    TERMINAL --> REDIS_LOCAL
    
    FRONTEND --> BACKEND
    BACKEND --> DB
    BACKEND --> REDIS_LOCAL
    BACKEND --> STRIPE_TEST
    
    style FRONTEND fill:#646CFF
    style BACKEND fill:#E0234E
    style DB fill:#336791
```

---

## 10. Security Architecture

### 10.1 Authentication & Authorization Flow

```mermaid
graph TB
    USER[User Request] --> GATEWAY[API Gateway]
    
    GATEWAY --> CSRF{CSRF Token<br/>Valid?}
    CSRF -->|No| REJECT1[403 Forbidden]
    CSRF -->|Yes| JWT{JWT Token<br/>Valid?}
    
    JWT -->|No| REJECT2[401 Unauthorized]
    JWT -->|Yes| BLACKLIST{Token<br/>Blacklisted?}
    
    BLACKLIST -->|Yes| REJECT3[401 Token Revoked]
    BLACKLIST -->|No| RBAC{Has Required<br/>Role?}
    
    RBAC -->|No| REJECT4[403 Forbidden]
    RBAC -->|Yes| CONTROLLER[Controller Handler]
    
    CONTROLLER --> RESPONSE[Response]
    
    style CSRF fill:#FF9800
    style JWT fill:#4CAF50
    style RBAC fill:#2196F3
```

### 10.2 Data Encryption Flow

```mermaid
graph LR
    subgraph "Client"
        DATA[Sensitive Data]
    end
    
    subgraph "Transport"
        TLS[TLS 1.3<br/>Encryption]
    end
    
    subgraph "Backend"
        DECRYPT[Decrypt]
        PROCESS[Process]
        ENCRYPT[Encrypt]
    end
    
    subgraph "Database"
        DB[(PostgreSQL<br/>AES-256 at rest)]
    end
    
    subgraph "Audit Logs"
        AUDIT[(Encrypted Logs<br/>AES-256)]
    end
    
    DATA --> TLS
    TLS --> DECRYPT
    DECRYPT --> PROCESS
    PROCESS --> ENCRYPT
    ENCRYPT --> DB
    PROCESS --> AUDIT
    
    style TLS fill:#4CAF50
    style ENCRYPT fill:#FF9800
    style DB fill:#336791
```

---

## Configuration Examples

### Adding a New Tax Rate

```typescript
// In Admin Dashboard - Settings Page
const taxConfig = {
  locationId: "STORE-001",
  stateTaxRate: 0.07,      // 7% Florida state tax
  countyTaxRate: 0.015,    // 1.5% county tax
  combinedRate: 0.085      // 8.5% total
};

// Backend automatically applies this in PricingAgent
const tax = subtotal * location.taxRate;
```

### Adding a New Product

```typescript
// In Admin Dashboard - Products Page
const newProduct = {
  sku: "WINE-CAB-001",
  upc: "012345678901",
  name: "Cabernet Sauvignon 2020",
  category: "wine",
  basePrice: 24.99,
  cost: 15.00,
  abv: 13.5,
  volumeMl: 750,
  ageRestricted: true,
  trackInventory: true
};

// AI automatically generates search embedding
// Inventory records created for all locations
```

### Configuring Payment Methods

```typescript
// In .env file
STRIPE_SECRET_KEY=sk_live_...

// In POS Terminal
const paymentMethods = [
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'card', label: 'Card', icon: '💳', requiresStripe: true },
  { id: 'split', label: 'Split', icon: '🔀' }
];
```

---

## Legend

### Diagram Color Coding

- 🟢 **Green**: Success paths, primary actions
- 🔵 **Blue**: Data flow, secondary actions
- 🟠 **Orange**: Warnings, intermediate states
- 🔴 **Red**: Errors, compensations, danger actions
- 🟣 **Purple**: External services, integrations

### Common Symbols

- `[]` - Process/Action
- `()` - Start/End
- `{}` - Decision Point
- `[(Database)]` - Data Store
- `[/Module\]` - Service/Module

---

## Usage Guide

### Viewing Diagrams

These Mermaid diagrams can be viewed in:

1. **GitHub** - Native Mermaid rendering
2. **VS Code** - Markdown Preview Mermaid Support extension
3. **Mermaid Live Editor** - https://mermaid.live
4. **Documentation Sites** - GitBook, Docusaurus, etc.

### Updating Diagrams

When updating the system:

1. Update relevant diagrams in this file
2. Keep diagrams in sync with code changes
3. Add new diagrams for new features
4. Archive outdated diagrams to `/archive`

---

## Related Documentation

- [Architecture Overview](architecture.md) - Text-based architecture documentation
- [Configuration Guide](configuration.md) - Environment variables and settings
- [Setup Guide](setup.md) - Installation and setup instructions
- [PRD](PRD.md) - Product requirements and user stories

---

**Last Updated:** January 3, 2026  
**Maintained By:** Development Team  
**Version:** 1.0

