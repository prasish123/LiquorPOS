# Requirements Review - Visual Diagrams
## REQ-001, REQ-002, REQ-003

---

## 1. Implementation Dependency Flow

```mermaid
graph TB
    START[Start Implementation] --> REQ001[REQ-001: Audit Log Immutability<br/>4 hours<br/>🟡 MEDIUM RISK]
    
    REQ001 --> PARALLEL{Parallel Development}
    
    PARALLEL --> REQ003[REQ-003: Manager Override<br/>3-4 days<br/>🔴 HIGH RISK]
    PARALLEL --> REQ002[REQ-002: Receipt Printing<br/>2-3 days<br/>🔴 HIGH RISK]
    
    REQ003 --> INTEGRATION[Integration Testing<br/>1 day]
    REQ002 --> INTEGRATION
    
    INTEGRATION --> DEPLOY[Production Deployment]
    
    style REQ001 fill:#fff3cd,stroke:#856404
    style REQ002 fill:#f8d7da,stroke:#721c24
    style REQ003 fill:#f8d7da,stroke:#721c24
    style INTEGRATION fill:#d4edda,stroke:#155724
    style DEPLOY fill:#d1ecf1,stroke:#0c5460
```

---

## 2. Risk Heat Map

```mermaid
quadrantChart
    title Risk Assessment Matrix
    x-axis Low Impact --> High Impact
    y-axis Low Probability --> High Probability
    quadrant-1 Monitor
    quadrant-2 Mitigate
    quadrant-3 Accept
    quadrant-4 Manage
    REQ-001 Database Migration: [0.3, 0.2]
    REQ-001 Performance: [0.2, 0.1]
    REQ-002 Thermal Printer: [0.9, 0.7]
    REQ-002 Browser Print: [0.5, 0.4]
    REQ-002 Offline Support: [0.6, 0.5]
    REQ-003 PIN Security: [0.8, 0.8]
    REQ-003 Override Abuse: [0.9, 0.6]
    REQ-003 Race Conditions: [0.7, 0.3]
```

---

## 3. Implementation Timeline

```mermaid
gantt
    title Requirements Implementation Schedule
    dateFormat  YYYY-MM-DD
    section REQ-001
    Database Migration           :req001-1, 2026-01-06, 2h
    Trigger Implementation       :req001-2, after req001-1, 1h
    Testing & Deployment         :req001-3, after req001-2, 1h
    
    section REQ-003
    Schema Updates               :req003-1, 2026-01-06, 2h
    PIN Auth Service             :req003-2, after req003-1, 4h
    Price Override Service       :req003-3, after req003-2, 6h
    Backend APIs                 :req003-4, after req003-3, 2h
    Frontend UI                  :req003-5, after req003-4, 8h
    Security Review              :req003-6, after req003-5, 6h
    
    section REQ-002
    Schema Updates               :req002-1, 2026-01-09, 2h
    Receipt Service              :req002-2, after req002-1, 8h
    ESC/POS Integration          :req002-3, after req002-2, 6h
    Frontend UI                  :req002-4, after req002-3, 4h
    Offline Support              :req002-5, after req002-4, 4h
    
    section Integration
    Integration Testing          :int-1, after req002-5, 1d
    Production Deployment        :deploy-1, after int-1, 4h
```

---

## 4. REQ-001: Audit Log Immutability Architecture

```mermaid
graph LR
    subgraph "Application Layer"
        APP[NestJS Application]
        PRISMA[Prisma Client]
    end
    
    subgraph "Database Layer"
        AUDIT[(AuditLog Table)]
        TRIGGER{PostgreSQL Trigger}
    end
    
    APP -->|Create Audit Log| PRISMA
    PRISMA -->|INSERT| AUDIT
    
    APP -.->|Attempt UPDATE| PRISMA
    PRISMA -.->|UPDATE| TRIGGER
    TRIGGER -.->|❌ BLOCK| PRISMA
    TRIGGER -.->|Raise Exception| APP
    
    APP -.->|Attempt DELETE| PRISMA
    PRISMA -.->|DELETE| TRIGGER
    TRIGGER -.->|❌ BLOCK| PRISMA
    
    style AUDIT fill:#d4edda,stroke:#155724
    style TRIGGER fill:#f8d7da,stroke:#721c24
    style APP fill:#d1ecf1,stroke:#0c5460
```

---

## 5. REQ-002: Receipt Printing Flow

```mermaid
sequenceDiagram
    participant C as Cashier
    participant POS as POS Frontend
    participant API as Backend API
    participant DB as Database
    participant TP as Thermal Printer
    participant BP as Browser Print
    
    C->>POS: Complete Transaction
    POS->>API: POST /orders
    API->>DB: Save Transaction
    API->>API: Generate Receipt
    API->>DB: Save Receipt
    
    alt Thermal Printer Available
        API->>TP: Send ESC/POS Commands
        TP-->>C: Print Receipt
    else Thermal Printer Offline
        API->>POS: Return Receipt HTML
        POS->>BP: window.print()
        BP-->>C: Print Receipt
    end
    
    Note over POS,DB: Offline Mode
    POS->>POS: Queue Receipt in IndexedDB
    POS->>POS: Sync when online
    
    C->>POS: Request Reprint
    POS->>API: GET /receipts/:id
    API->>DB: Fetch Receipt
    DB-->>API: Receipt Data
    API-->>POS: Receipt HTML
    POS->>BP: window.print()
    BP-->>C: Print Receipt
```

---

## 6. REQ-003: Manager Override Flow

```mermaid
sequenceDiagram
    participant C as Cashier
    participant POS as POS Frontend
    participant API as Backend API
    participant PIN as PIN Auth Service
    participant OVR as Override Service
    participant AUDIT as Audit Service
    participant DB as Database
    
    C->>POS: Click "Override Price"
    POS->>C: Show Override Modal
    C->>POS: Enter Manager PIN
    
    POS->>API: POST /price-overrides
    API->>PIN: Authenticate PIN
    PIN->>DB: Find User by PIN
    DB-->>PIN: User Data
    PIN->>PIN: Validate Role (MANAGER/ADMIN)
    
    alt Valid Manager
        PIN-->>API: ✅ Manager Authenticated
        API->>OVR: Process Override
        OVR->>DB: Update Transaction Item
        OVR->>DB: Update Transaction Totals
        OVR->>DB: Create PriceOverride Record
        OVR->>AUDIT: Log Override (Immutable)
        AUDIT->>DB: Create AuditLog Entry
        OVR-->>API: Override Success
        API-->>POS: New Price
        POS->>C: Show Updated Price
    else Invalid PIN or Not Manager
        PIN-->>API: ❌ Authentication Failed
        API-->>POS: Error
        POS->>C: Show Error Message
    end
```

---

## 7. Data Model Relationships

```mermaid
erDiagram
    Transaction ||--o{ TransactionItem : contains
    Transaction ||--o{ Payment : has
    Transaction ||--o{ PriceOverride : has
    Transaction ||--o| Receipt : generates
    Transaction ||--o{ AuditLog : logs
    
    User ||--o{ PriceOverride : approves
    User ||--o{ AuditLog : performs
    
    Location ||--o{ Transaction : processes
    
    Transaction {
        string id PK
        string locationId FK
        float subtotal
        float tax
        float total
        boolean ageVerified
        datetime createdAt
    }
    
    TransactionItem {
        string id PK
        string transactionId FK
        string sku
        float unitPrice
        float originalPrice
        boolean priceOverridden
    }
    
    PriceOverride {
        string id PK
        string transactionId FK
        string itemId
        float originalPrice
        float overridePrice
        string reason
        string managerId FK
        datetime approvedAt
    }
    
    Receipt {
        string id PK
        string transactionId FK
        string content
        string htmlContent
        int reprintCount
    }
    
    AuditLog {
        string id PK
        string eventType
        string userId FK
        string action
        string result
        datetime timestamp
    }
    
    User {
        string id PK
        string username
        string pin
        string role
    }
```

---

## 8. Security Architecture (REQ-003)

```mermaid
graph TB
    subgraph "Security Layers"
        UI[Frontend UI]
        API[API Gateway]
        AUTH[PIN Authentication]
        RBAC[Role Validation]
        AUDIT[Audit Logging]
        MONITOR[Monitoring & Alerts]
    end
    
    UI -->|1. Manager PIN| API
    API -->|2. Authenticate| AUTH
    AUTH -->|3. Validate Role| RBAC
    
    RBAC -->|✅ MANAGER/ADMIN| PROCESS[Process Override]
    RBAC -->|❌ CASHIER| DENY[Deny Access]
    
    PROCESS -->|4. Log Action| AUDIT
    AUDIT -->|5. Immutable Record| DB[(Database)]
    
    AUDIT -->|6. Check Patterns| MONITOR
    MONITOR -->|Large Discount Alert| ALERT[Alert Manager]
    MONITOR -->|Unusual Pattern| ALERT
    
    style AUTH fill:#fff3cd,stroke:#856404
    style RBAC fill:#fff3cd,stroke:#856404
    style AUDIT fill:#d4edda,stroke:#155724
    style MONITOR fill:#d1ecf1,stroke:#0c5460
    style DENY fill:#f8d7da,stroke:#721c24
```

---

## 9. Risk Mitigation Strategy

```mermaid
mindmap
  root((Risk Mitigation))
    REQ-001
      Test on Staging
      Rollback Plan
      No Existing UPDATE/DELETE
      Monitor Performance
    REQ-002
      Procure Test Printer
      Browser Testing
      Offline Support
      Fallback Strategy
      Receipt Preview
    REQ-003
      PIN Security
        Hash with bcrypt
        Rate Limiting
        Expiration Policy
      Override Monitoring
        Alert on Large Discounts
        Daily Reports
        Pattern Detection
      Security Review
        Penetration Testing
        Code Review
        Manager Training
```

---

## 10. Testing Strategy

```mermaid
graph TB
    subgraph "Unit Tests"
        UT1[Trigger Enforcement]
        UT2[Receipt Formatting]
        UT3[PIN Authentication]
        UT4[Price Calculation]
    end
    
    subgraph "Integration Tests"
        IT1[Prisma Error Handling]
        IT2[Receipt Generation]
        IT3[Override Workflow]
        IT4[Audit Trail]
    end
    
    subgraph "Hardware Tests"
        HT1[Thermal Printer USB]
        HT2[Thermal Printer Network]
        HT3[Browser Print Chrome]
        HT4[Browser Print Firefox]
    end
    
    subgraph "Security Tests"
        ST1[PIN Rate Limiting]
        ST2[Role Authorization]
        ST3[Concurrent Overrides]
        ST4[Large Discount Alerts]
    end
    
    subgraph "E2E Tests"
        E2E1[Complete Transaction]
        E2E2[Print Receipt]
        E2E3[Manager Override]
        E2E4[Offline Scenarios]
    end
    
    UT1 --> IT1
    UT2 --> IT2
    UT3 --> IT3
    UT4 --> IT3
    
    IT1 --> E2E1
    IT2 --> E2E2
    IT3 --> E2E3
    
    HT1 --> E2E2
    HT2 --> E2E2
    HT3 --> E2E2
    HT4 --> E2E2
    
    ST1 --> E2E3
    ST2 --> E2E3
    ST3 --> E2E3
    ST4 --> E2E3
    
    E2E1 --> DEPLOY[Production Deployment]
    E2E2 --> DEPLOY
    E2E3 --> DEPLOY
    E2E4 --> DEPLOY
    
    style DEPLOY fill:#d4edda,stroke:#155724
```

---

## 11. Monitoring Dashboard

```mermaid
graph TB
    subgraph "REQ-001 Metrics"
        M1[Audit Log Creation Rate]
        M2[Trigger Errors]
        M3[Table Size Growth]
    end
    
    subgraph "REQ-002 Metrics"
        M4[Receipt Generation Success]
        M5[Thermal Print Success]
        M6[Browser Print Success]
        M7[Reprint Frequency]
        M8[Offline Queue Size]
    end
    
    subgraph "REQ-003 Metrics"
        M9[Override Frequency]
        M10[Override Amount]
        M11[Override by Manager]
        M12[Large Discounts]
        M13[Failed PIN Attempts]
    end
    
    M1 --> DASH[Monitoring Dashboard]
    M2 --> DASH
    M3 --> DASH
    M4 --> DASH
    M5 --> DASH
    M6 --> DASH
    M7 --> DASH
    M8 --> DASH
    M9 --> DASH
    M10 --> DASH
    M11 --> DASH
    M12 --> DASH
    M13 --> DASH
    
    DASH --> ALERT1[Alert: Trigger Error]
    DASH --> ALERT2[Alert: Printer Offline]
    DASH --> ALERT3[Alert: Large Discount]
    DASH --> ALERT4[Alert: Failed PINs]
    
    style DASH fill:#d1ecf1,stroke:#0c5460
    style ALERT1 fill:#f8d7da,stroke:#721c24
    style ALERT2 fill:#f8d7da,stroke:#721c24
    style ALERT3 fill:#fff3cd,stroke:#856404
    style ALERT4 fill:#fff3cd,stroke:#856404
```

---

## 12. Deployment Pipeline

```mermaid
graph LR
    DEV[Development] --> TEST[Unit Tests]
    TEST --> LINT[Linting]
    LINT --> BUILD[Build]
    BUILD --> STAGE[Staging Deploy]
    
    STAGE --> INT[Integration Tests]
    INT --> SEC[Security Scan]
    SEC --> PERF[Performance Tests]
    
    PERF --> APPROVE{Manual Approval}
    
    APPROVE -->|✅ Approved| PROD[Production Deploy]
    APPROVE -->|❌ Rejected| DEV
    
    PROD --> SMOKE[Smoke Tests]
    SMOKE --> MONITOR[Monitoring]
    
    MONITOR -->|Issues Detected| ROLLBACK[Rollback]
    ROLLBACK --> DEV
    
    style PROD fill:#d4edda,stroke:#155724
    style ROLLBACK fill:#f8d7da,stroke:#721c24
    style APPROVE fill:#fff3cd,stroke:#856404
```

---

## 13. Success Metrics Dashboard

```mermaid
graph TB
    subgraph "Implementation Success"
        S1[✅ All Tests Passing]
        S2[✅ Zero Critical Bugs]
        S3[✅ Documentation Complete]
    end
    
    subgraph "Operational Success"
        S4[📊 Receipt Print Rate > 99%]
        S5[📊 Override Approval Time < 30s]
        S6[📊 Zero Audit Log Modifications]
    end
    
    subgraph "Business Success"
        S7[💰 Reduced Pricing Errors]
        S8[💰 Improved Customer Satisfaction]
        S9[💰 Compliance Maintained]
    end
    
    S1 --> SUCCESS[✅ Requirements Complete]
    S2 --> SUCCESS
    S3 --> SUCCESS
    S4 --> SUCCESS
    S5 --> SUCCESS
    S6 --> SUCCESS
    S7 --> SUCCESS
    S8 --> SUCCESS
    S9 --> SUCCESS
    
    style SUCCESS fill:#d4edda,stroke:#155724,stroke-width:3px
```

---

**Diagram Status:** ✅ COMPLETE  
**Total Diagrams:** 13  
**Date:** January 3, 2026

---

*These visual diagrams complement the formal review document and provide quick reference for architecture, flows, risks, and implementation strategy.*

