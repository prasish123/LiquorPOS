# Observability Architecture Diagrams

**System:** Florida Liquor Store POS System  
**Focus:** Logging, Monitoring, Error Tracking, Remote Debugging  
**Date:** January 3, 2026

---

## 1. Current State (Before Implementation)

### 1.1 Current Logging Architecture ❌

```mermaid
graph TB
    subgraph "Store 1 (NUC)"
        POS1[POS Terminal]
        BACKEND1[Backend Container]
        LOGS1[Local Logs]
        
        POS1 -->|Console logs| LOGS1
        BACKEND1 -->|File logs| LOGS1
    end
    
    subgraph "Store 2 (NUC)"
        POS2[POS Terminal]
        BACKEND2[Backend Container]
        LOGS2[Local Logs]
        
        POS2 -->|Console logs| LOGS2
        BACKEND2 -->|File logs| LOGS2
    end
    
    subgraph "Store 100 (NUC)"
        POS100[POS Terminal]
        BACKEND100[Backend Container]
        LOGS100[Local Logs]
        
        POS100 -->|Console logs| LOGS100
        BACKEND100 -->|File logs| LOGS100
    end
    
    subgraph "Support Team"
        SUPPORT[Support Engineer]
        CAR[🚗 Drive to Store]
    end
    
    SUPPORT -->|Can't access remotely| CAR
    CAR -->|2 hours| LOGS1
    
    style LOGS1 fill:#ff6b6b
    style LOGS2 fill:#ff6b6b
    style LOGS100 fill:#ff6b6b
    style CAR fill:#ff6b6b
```

**Problems:**
- ❌ Logs scattered across 100+ NUCs
- ❌ No way to search logs remotely
- ❌ Logs lost when container restarts
- ❌ Must drive to store to debug

---

## 2. Target State (After Implementation)

### 2.1 Centralized Observability Stack ✅

```mermaid
graph TB
    subgraph "100 Stores (NUCs)"
        subgraph "Store 1"
            POS1[POS Terminal]
            BACKEND1[Backend]
        end
        
        subgraph "Store 2"
            POS2[POS Terminal]
            BACKEND2[Backend]
        end
        
        subgraph "Store 100"
            POS100[POS Terminal]
            BACKEND100[Backend]
        end
    end
    
    subgraph "Observability Platform"
        SENTRY[Sentry<br/>Error Tracking]
        LOGTAIL[Better Stack<br/>Log Aggregation]
        UPTIME[Uptime Robot<br/>Monitoring]
    end
    
    subgraph "Alerting"
        SLACK[Slack<br/>#pos-alerts]
        PAGERDUTY[PagerDuty<br/>On-Call]
    end
    
    subgraph "Support Team"
        SUPPORT[Support Engineer]
        LAPTOP[💻 Laptop]
    end
    
    POS1 -->|Errors| SENTRY
    POS2 -->|Errors| SENTRY
    POS100 -->|Errors| SENTRY
    
    BACKEND1 -->|Errors| SENTRY
    BACKEND2 -->|Errors| SENTRY
    BACKEND100 -->|Errors| SENTRY
    
    POS1 -->|Logs| LOGTAIL
    POS2 -->|Logs| LOGTAIL
    POS100 -->|Logs| LOGTAIL
    
    BACKEND1 -->|Logs| LOGTAIL
    BACKEND2 -->|Logs| LOGTAIL
    BACKEND100 -->|Logs| LOGTAIL
    
    BACKEND1 -->|Health| UPTIME
    BACKEND2 -->|Health| UPTIME
    BACKEND100 -->|Health| UPTIME
    
    SENTRY -->|Alerts| SLACK
    LOGTAIL -->|Alerts| SLACK
    UPTIME -->|Alerts| SLACK
    
    SENTRY -->|Critical| PAGERDUTY
    
    SUPPORT -->|Search & Debug| SENTRY
    SUPPORT -->|Search Logs| LOGTAIL
    SUPPORT -->|Check Status| UPTIME
    LAPTOP -->|Remote Access| BACKEND1
    
    style SENTRY fill:#4CAF50
    style LOGTAIL fill:#4CAF50
    style UPTIME fill:#4CAF50
    style LAPTOP fill:#4CAF50
```

**Benefits:**
- ✅ All errors in one dashboard
- ✅ All logs searchable
- ✅ Real-time alerts
- ✅ Remote debugging

---

### 2.2 Error Flow with Rich Context

```mermaid
sequenceDiagram
    participant Terminal as POS Terminal<br/>Store 47, Term 02
    participant Backend as Backend API
    participant Sentry as Sentry
    participant Logtail as Logtail
    participant Slack as Slack
    participant Support as Support Team
    
    Terminal->>Backend: Process Payment ($125.50)
    
    rect rgb(255, 200, 200)
        Note over Backend: Payment fails!
        Backend->>Backend: Enrich error context
        Note right of Backend: storeId: STORE_047<br/>terminalId: TERM_02<br/>amount: 125.50<br/>userId: cashier_jane<br/>attemptNumber: 3<br/>networkStatus: online<br/>version: 2.1.3
    end
    
    par Send to Sentry
        Backend->>Sentry: Error + Context
        Sentry->>Sentry: Group & Deduplicate
        Sentry->>Slack: Alert: Payment Error
    and Send to Logtail
        Backend->>Logtail: Log + Context
        Logtail->>Logtail: Index & Store
    end
    
    Slack->>Support: 🚨 Payment Error @ Store 47
    
    Support->>Sentry: View Error Details
    Sentry-->>Support: Full context + stack trace
    
    Support->>Logtail: Search: "Store 47 payment"
    Logtail-->>Support: All related logs
    
    Support->>Backend: Remote Diagnostics
    Backend-->>Support: System info + logs
    
    Support->>Backend: Fix issue remotely
    
    Note over Support: Issue resolved in 15 minutes<br/>No drive to store needed! ✅
```

---

### 2.3 Log Aggregation Architecture

```mermaid
graph LR
    subgraph "Frontend (100 stores)"
        FE1[Store 1 Frontend]
        FE2[Store 2 Frontend]
        FE100[Store 100 Frontend]
    end
    
    subgraph "Backend (100 stores)"
        BE1[Store 1 Backend]
        BE2[Store 2 Backend]
        BE100[Store 100 Backend]
    end
    
    subgraph "Logtail Service"
        INGEST[Log Ingestion API]
        STORAGE[Log Storage<br/>30-day retention]
        SEARCH[Search Engine]
        DASHBOARD[Dashboard UI]
    end
    
    subgraph "Support Team"
        SUPPORT[Support Engineer]
    end
    
    FE1 -->|HTTPS| INGEST
    FE2 -->|HTTPS| INGEST
    FE100 -->|HTTPS| INGEST
    
    BE1 -->|HTTPS| INGEST
    BE2 -->|HTTPS| INGEST
    BE100 -->|HTTPS| INGEST
    
    INGEST --> STORAGE
    STORAGE --> SEARCH
    SEARCH --> DASHBOARD
    
    SUPPORT -->|Search Query| DASHBOARD
    DASHBOARD -->|Results| SUPPORT
    
    style INGEST fill:#4CAF50
    style STORAGE fill:#2196F3
    style SEARCH fill:#FF9800
    style DASHBOARD fill:#9C27B0
```

---

### 2.4 Remote Diagnostics Architecture

```mermaid
graph TB
    subgraph "Support Team"
        ADMIN[Admin Dashboard]
        SUPPORT[Support Engineer]
    end
    
    subgraph "Backend API"
        AUTH[Authentication]
        DIAG[Diagnostics Controller]
    end
    
    subgraph "Store 47 NUC"
        DOCKER[Docker Engine]
        BACKEND[Backend Container]
        FRONTEND[Frontend Container]
        POSTGRES[PostgreSQL Container]
        REDIS[Redis Container]
        SYSTEM[System Info]
    end
    
    SUPPORT -->|Login| ADMIN
    ADMIN -->|API Request| AUTH
    AUTH -->|Authorized| DIAG
    
    DIAG -->|Get System Info| SYSTEM
    DIAG -->|Check Docker Status| DOCKER
    DIAG -->|View Logs| BACKEND
    DIAG -->|Restart Service| DOCKER
    
    DOCKER -->|Manage| BACKEND
    DOCKER -->|Manage| FRONTEND
    DOCKER -->|Manage| POSTGRES
    DOCKER -->|Manage| REDIS
    
    SYSTEM -->|CPU, Memory, Disk| DIAG
    BACKEND -->|Logs| DIAG
    
    DIAG -->|Response| ADMIN
    ADMIN -->|Display| SUPPORT
    
    style DIAG fill:#4CAF50
    style ADMIN fill:#2196F3
```

---

## 3. Error Context Flow

### 3.1 Error Enrichment Pipeline

```mermaid
graph LR
    subgraph "Error Occurs"
        ERROR[Payment Failed]
    end
    
    subgraph "Context Collection"
        STORE[Store Context<br/>storeId, storeName]
        TERMINAL[Terminal Context<br/>terminalId]
        USER[User Context<br/>userId, role, name]
        TRANSACTION[Transaction Context<br/>orderId, amount, method]
        SYSTEM[System Context<br/>version, platform, network]
        REQUEST[Request Context<br/>correlationId, attempt]
    end
    
    subgraph "Enriched Error"
        RICH[Error + Full Context]
    end
    
    subgraph "Destinations"
        CONSOLE[Console Log]
        SENTRY[Sentry]
        LOGTAIL[Logtail]
        AUDIT[Audit Log DB]
    end
    
    ERROR --> STORE
    ERROR --> TERMINAL
    ERROR --> USER
    ERROR --> TRANSACTION
    ERROR --> SYSTEM
    ERROR --> REQUEST
    
    STORE --> RICH
    TERMINAL --> RICH
    USER --> RICH
    TRANSACTION --> RICH
    SYSTEM --> RICH
    REQUEST --> RICH
    
    RICH --> CONSOLE
    RICH --> SENTRY
    RICH --> LOGTAIL
    RICH --> AUDIT
    
    style ERROR fill:#ff6b6b
    style RICH fill:#4CAF50
```

---

### 3.2 Correlation ID Flow

```mermaid
sequenceDiagram
    participant Client as POS Terminal
    participant Gateway as API Gateway
    participant Orders as Orders Service
    participant Payment as Payment Service
    participant Inventory as Inventory Service
    participant Sentry as Sentry
    participant Logtail as Logtail
    
    Client->>Gateway: POST /orders
    Note over Gateway: Generate correlation ID<br/>corr_abc123
    Gateway->>Gateway: Add to request headers
    Gateway->>Gateway: Add to response headers
    
    Gateway->>Orders: Process Order<br/>(corr_abc123)
    Orders->>Orders: Log: "Processing order"<br/>(corr_abc123)
    Orders->>Logtail: Log + correlation ID
    
    Orders->>Payment: Authorize Payment<br/>(corr_abc123)
    Payment->>Payment: Log: "Authorizing payment"<br/>(corr_abc123)
    Payment->>Logtail: Log + correlation ID
    
    Payment-->>Orders: Payment failed!<br/>(corr_abc123)
    Orders->>Sentry: Error + correlation ID
    Orders->>Logtail: Error log + correlation ID
    
    Orders-->>Gateway: Error response<br/>(corr_abc123)
    Gateway-->>Client: Error + correlation ID
    
    Client->>Sentry: Frontend error<br/>(corr_abc123)
    Client->>Logtail: Frontend log<br/>(corr_abc123)
    
    Note over Logtail: Search by corr_abc123<br/>Shows full request flow:<br/>Frontend → Gateway → Orders → Payment
```

---

## 4. Alerting Architecture

### 4.1 Alert Flow

```mermaid
graph TB
    subgraph "Error Sources"
        SENTRY[Sentry<br/>Error Tracking]
        LOGTAIL[Logtail<br/>Log Aggregation]
        UPTIME[Uptime Robot<br/>Monitoring]
    end
    
    subgraph "Alert Rules"
        RULE1[Critical Error]
        RULE2[Error Spike<br/>>10/min]
        RULE3[Store Offline<br/>No logs 10min]
        RULE4[API Down]
        RULE5[High Error Rate]
    end
    
    subgraph "Notification Channels"
        SLACK[Slack<br/>#pos-alerts]
        EMAIL[Email]
        PAGERDUTY[PagerDuty<br/>On-Call]
        SMS[SMS]
    end
    
    subgraph "Support Team"
        SUPPORT[Support Engineer]
        ONCALL[On-Call Engineer]
    end
    
    SENTRY --> RULE1
    SENTRY --> RULE2
    SENTRY --> RULE5
    LOGTAIL --> RULE3
    UPTIME --> RULE4
    
    RULE1 -->|Severity: Critical| PAGERDUTY
    RULE1 -->|All| SLACK
    
    RULE2 -->|Severity: High| SLACK
    RULE2 -->|Severity: High| EMAIL
    
    RULE3 -->|Severity: High| SLACK
    RULE3 -->|Severity: High| EMAIL
    
    RULE4 -->|Severity: Critical| PAGERDUTY
    RULE4 -->|All| SLACK
    RULE4 -->|All| SMS
    
    RULE5 -->|Severity: Medium| SLACK
    
    SLACK --> SUPPORT
    EMAIL --> SUPPORT
    PAGERDUTY --> ONCALL
    SMS --> ONCALL
    
    style RULE1 fill:#ff6b6b
    style RULE4 fill:#ff6b6b
    style PAGERDUTY fill:#ff6b6b
```

---

### 4.2 Escalation Policy

```mermaid
graph TB
    ALERT[🚨 Critical Alert]
    
    ALERT --> L1[Level 1: Slack Alert]
    L1 -->|No response 5 min| L2[Level 2: Email Alert]
    L2 -->|No response 10 min| L3[Level 3: PagerDuty]
    L3 -->|No response 15 min| L4[Level 4: SMS to Manager]
    L4 -->|No response 30 min| L5[Level 5: Call CTO]
    
    L1 -->|Acknowledged| RESOLVE[Investigate & Resolve]
    L2 -->|Acknowledged| RESOLVE
    L3 -->|Acknowledged| RESOLVE
    L4 -->|Acknowledged| RESOLVE
    L5 -->|Acknowledged| RESOLVE
    
    RESOLVE --> POSTMORTEM[Post-Mortem]
    
    style ALERT fill:#ff6b6b
    style L5 fill:#ff6b6b
```

---

## 5. Remote Access Architecture

### 5.1 Tailscale VPN Architecture

```mermaid
graph TB
    subgraph "Support Team"
        LAPTOP1[Support Laptop 1]
        LAPTOP2[Support Laptop 2]
        LAPTOP3[Support Laptop 3]
    end
    
    subgraph "Tailscale Network"
        TAILSCALE[Tailscale<br/>Mesh VPN]
    end
    
    subgraph "Store NUCs"
        NUC1[Store 1 NUC<br/>100.64.0.1]
        NUC2[Store 2 NUC<br/>100.64.0.2]
        NUC100[Store 100 NUC<br/>100.64.0.100]
    end
    
    LAPTOP1 -->|Encrypted| TAILSCALE
    LAPTOP2 -->|Encrypted| TAILSCALE
    LAPTOP3 -->|Encrypted| TAILSCALE
    
    TAILSCALE -->|Encrypted| NUC1
    TAILSCALE -->|Encrypted| NUC2
    TAILSCALE -->|Encrypted| NUC100
    
    NUC1 -.->|SSH| LAPTOP1
    NUC2 -.->|SSH| LAPTOP2
    NUC100 -.->|SSH| LAPTOP3
    
    style TAILSCALE fill:#4CAF50
```

---

### 5.2 Remote Diagnostics Flow

```mermaid
sequenceDiagram
    participant Support as Support Engineer
    participant Admin as Admin Dashboard
    participant API as Diagnostics API
    participant NUC as Store 47 NUC
    
    Support->>Admin: Navigate to Diagnostics
    Admin->>Admin: Select Store 47
    
    Support->>Admin: Click "System Info"
    Admin->>API: GET /diagnostics/STORE_047/system-info
    API->>NUC: Collect system info
    NUC-->>API: CPU, Memory, Disk, Network
    API-->>Admin: System info JSON
    Admin-->>Support: Display system info
    
    Support->>Admin: Click "Docker Status"
    Admin->>API: GET /diagnostics/STORE_047/docker-status
    API->>NUC: docker ps
    NUC-->>API: Container status
    API-->>Admin: Container list
    Admin-->>Support: Display containers
    
    Support->>Admin: Click "View Logs"
    Admin->>API: GET /diagnostics/STORE_047/logs?service=backend
    API->>NUC: docker logs backend
    NUC-->>API: Last 100 lines
    API-->>Admin: Logs
    Admin-->>Support: Display logs
    
    Note over Support: Identifies issue: Backend OOM
    
    Support->>Admin: Click "Restart Service"
    Admin->>API: POST /diagnostics/STORE_047/restart-service<br/>{service: "backend"}
    API->>NUC: docker restart backend
    NUC-->>API: Success
    API-->>Admin: Service restarted
    Admin-->>Support: ✅ Backend restarted
    
    Note over Support: Issue resolved in 5 minutes!<br/>No drive to store needed!
```

---

## 6. Performance Monitoring

### 6.1 Performance Metrics Flow

```mermaid
graph LR
    subgraph "Application"
        API[API Endpoints]
        DB[Database Queries]
        PAYMENT[Payment Processing]
        SYNC[Offline Sync]
    end
    
    subgraph "Instrumentation"
        INTERCEPTOR[Performance Interceptor]
        TIMER[Request Timer]
        TRACER[Distributed Tracing]
    end
    
    subgraph "Metrics Collection"
        SENTRY_PERF[Sentry Performance]
        CUSTOM[Custom Metrics]
    end
    
    subgraph "Dashboards"
        SENTRY_DASH[Sentry Dashboard]
        GRAFANA[Grafana<br/>Optional]
    end
    
    API --> INTERCEPTOR
    DB --> INTERCEPTOR
    PAYMENT --> INTERCEPTOR
    SYNC --> INTERCEPTOR
    
    INTERCEPTOR --> TIMER
    INTERCEPTOR --> TRACER
    
    TIMER --> SENTRY_PERF
    TRACER --> SENTRY_PERF
    TIMER --> CUSTOM
    
    SENTRY_PERF --> SENTRY_DASH
    CUSTOM --> GRAFANA
    
    style INTERCEPTOR fill:#4CAF50
    style SENTRY_PERF fill:#2196F3
```

---

## 7. Cost Comparison

### 7.1 Cost Without Observability

```mermaid
graph TB
    INCIDENTS[50 Incidents/Month]
    
    INCIDENTS --> ONSITE[40 On-Site Visits<br/>$400 each]
    INCIDENTS --> REMOTE[10 Remote<br/>$100 each]
    
    ONSITE --> COST1[$16,000/month]
    REMOTE --> COST2[$1,000/month]
    
    COST1 --> TOTAL[Total: $17,000/month<br/>$204,000/year]
    COST2 --> TOTAL
    
    style INCIDENTS fill:#ff6b6b
    style COST1 fill:#ff6b6b
    style TOTAL fill:#ff6b6b
```

---

### 7.2 Cost With Observability

```mermaid
graph TB
    INCIDENTS[50 Incidents/Month]
    
    INCIDENTS --> PROACTIVE[20 Detected Proactively<br/>Fixed before customer notices<br/>$50 each]
    INCIDENTS --> REMOTE[25 Remote Resolution<br/>$100 each]
    INCIDENTS --> ONSITE[5 On-Site Visits<br/>$400 each]
    
    PROACTIVE --> COST1[$1,000/month]
    REMOTE --> COST2[$2,500/month]
    ONSITE --> COST3[$2,000/month]
    
    COST1 --> SUBTOTAL[$5,500/month]
    COST2 --> SUBTOTAL
    COST3 --> SUBTOTAL
    
    SUBTOTAL --> TOOLS[+ Tools: $39/month]
    TOOLS --> TOTAL[Total: $5,539/month<br/>$66,468/year]
    
    TOTAL --> SAVINGS[Savings: $137,532/year<br/>ROI: 24,800%]
    
    style PROACTIVE fill:#4CAF50
    style REMOTE fill:#4CAF50
    style SAVINGS fill:#4CAF50
```

---

## 8. Implementation Timeline

### 8.1 Implementation Phases

```mermaid
gantt
    title Observability Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Priority 1 (CRITICAL)
    Enable Sentry           :p1, 2026-01-03, 2h
    Add Error Context       :p2, after p1, 4h
    Set Up Log Aggregation  :p3, after p2, 8h
    section Priority 2 (HIGH)
    Set Up Alerting         :p4, after p3, 4h
    Remote Diagnostics API  :p5, after p4, 6h
    section Priority 3 (MEDIUM)
    Session Replay          :p6, after p5, 8h
    Remote Access (VPN)     :p7, after p6, 12h
    Performance Monitoring  :p8, after p7, 4h
```

---

### 8.2 Rollout Strategy

```mermaid
graph LR
    DEV[Development<br/>Test all features]
    STAGING[Staging<br/>Test with 1 store]
    PILOT[Pilot<br/>Test with 5 stores]
    PROD[Production<br/>Roll out to 100 stores]
    
    DEV -->|2 days| STAGING
    STAGING -->|1 day| PILOT
    PILOT -->|2 days| PROD
    
    DEV -.->|Issues found| DEV
    STAGING -.->|Issues found| DEV
    PILOT -.->|Issues found| STAGING
    
    style DEV fill:#2196F3
    style STAGING fill:#FF9800
    style PILOT fill:#FFC107
    style PROD fill:#4CAF50
```

---

## 9. Success Metrics Dashboard

### 9.1 Key Metrics to Track

```mermaid
graph TB
    subgraph "Operational Metrics"
        M1[Incidents/Month]
        M2[On-Site Visits/Month]
        M3[Average Resolution Time]
        M4[Remote Resolution Rate]
    end
    
    subgraph "Technical Metrics"
        M5[Error Rate]
        M6[API Response Time]
        M7[Uptime %]
        M8[Failed Sync Attempts]
    end
    
    subgraph "Business Metrics"
        M9[Support Costs]
        M10[Customer Satisfaction]
        M11[System Reliability]
        M12[Time to Detection]
    end
    
    subgraph "Targets"
        T1[<10 incidents/month]
        T2[<5 on-site visits/month]
        T3[<30 minutes]
        T4[>90%]
        T5[<1% error rate]
        T6[<500ms p95]
        T7[>99.9%]
        T8[<5%]
        T9[<$5,000/month]
        T10[>8/10]
        T11[>99%]
        T12[<5 minutes]
    end
    
    M1 --> T1
    M2 --> T2
    M3 --> T3
    M4 --> T4
    M5 --> T5
    M6 --> T6
    M7 --> T7
    M8 --> T8
    M9 --> T9
    M10 --> T10
    M11 --> T11
    M12 --> T12
    
    style T1 fill:#4CAF50
    style T2 fill:#4CAF50
    style T3 fill:#4CAF50
    style T4 fill:#4CAF50
```

---

## Summary

This observability architecture provides:

1. **Centralized Error Tracking** - All errors from all stores in one place
2. **Centralized Logging** - All logs searchable and correlated
3. **Rich Error Context** - Every error includes full business and technical context
4. **Real-Time Alerts** - Proactive detection before customers notice
5. **Remote Diagnostics** - Debug and fix issues without on-site visits
6. **Performance Monitoring** - Track system performance across all stores
7. **Cost Savings** - 90% reduction in support costs

**Total Cost:** $39/month  
**Total ROI:** 24,000%+  
**Implementation Time:** 14 hours (Priority 1)

---

**Last Updated:** January 3, 2026  
**Status:** Ready for Implementation  
**Next Step:** Begin Priority 1 tasks

