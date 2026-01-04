# PAX Integration Architecture Diagrams

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Liquor POS System                            │
│                    (React Frontend + NestJS Backend)                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 │ HTTP/REST API
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Backend API Layer                           │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Orders     │  │   Payments   │  │   Other      │            │
│  │  Controller  │  │  Controller  │  │ Controllers  │            │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘            │
│         │                  │                                        │
│         │                  │                                        │
│  ┌──────▼──────────────────▼───────┐                              │
│  │     Order Orchestrator           │                              │
│  │  (Existing Order Processing)     │                              │
│  └──────────────┬───────────────────┘                              │
│                 │                                                   │
└─────────────────┼───────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Payment Router Service                         │
│                   (NEW - Intelligent Routing)                       │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  Routing Logic:                                           │    │
│  │  1. Analyze payment request (amount, method, location)    │    │
│  │  2. Check processor availability                          │    │
│  │  3. Select best processor:                                │    │
│  │     • PAX terminal (if available)                         │    │
│  │     • Stripe (if online)                                  │    │
│  │     • Offline mode (fallback)                             │    │
│  │  4. Route payment to selected processor                   │    │
│  │  5. Handle errors and failover                            │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                     │
└────────┬──────────────────┬──────────────────┬──────────────────────┘
         │                  │                  │
         │                  │                  │
         ▼                  ▼                  ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Stripe Agent  │  │  PAX Terminal  │  │ Offline Agent  │
│   (Existing)   │  │     Agent      │  │   (Existing)   │
│                │  │     (NEW)      │  │                │
│  • Cloud API   │  │  • TCP/IP      │  │  • Local Auth  │
│  • Payment     │  │  • PAX Protocol│  │  • Deferred    │
│    Intents     │  │  • Direct Comm │  │    Capture     │
└────────────────┘  └────────┬───────┘  └────────────────┘
                             │
                             │
                             ▼
                    ┌────────────────┐
                    │   Terminal     │
                    │   Manager      │
                    │   Service      │
                    │    (NEW)       │
                    │                │
                    │  • Register    │
                    │  • Monitor     │
                    │  • Health      │
                    │  • Discovery   │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │   Database     │
                    │  (PostgreSQL)  │
                    │                │
                    │ PaymentTerminal│
                    │ PaxTransaction │
                    └────────────────┘
```

## Payment Flow Sequence

```
┌─────┐     ┌──────────┐     ┌────────────┐     ┌──────────┐     ┌──────────┐
│ POS │     │  Order   │     │  Payment   │     │   PAX    │     │ Terminal │
│     │     │Orchestr. │     │  Router    │     │  Agent   │     │ Hardware │
└──┬──┘     └────┬─────┘     └─────┬──────┘     └────┬─────┘     └────┬─────┘
   │             │                  │                 │                │
   │ 1. Create   │                  │                 │                │
   │   Order     │                  │                 │                │
   ├────────────>│                  │                 │                │
   │             │                  │                 │                │
   │             │ 2. Route Payment │                 │                │
   │             ├─────────────────>│                 │                │
   │             │                  │                 │                │
   │             │                  │ 3. Check        │                │
   │             │                  │    Terminal     │                │
   │             │                  ├────────────────>│                │
   │             │                  │                 │                │
   │             │                  │ 4. Terminal OK  │                │
   │             │                  │<────────────────┤                │
   │             │                  │                 │                │
   │             │                  │ 5. Process      │                │
   │             │                  │    Transaction  │                │
   │             │                  ├────────────────>│                │
   │             │                  │                 │                │
   │             │                  │                 │ 6. Send PAX    │
   │             │                  │                 │    Command     │
   │             │                  │                 ├───────────────>│
   │             │                  │                 │                │
   │             │                  │                 │                │ 7. Customer
   │             │                  │                 │                │    Interaction
   │             │                  │                 │                │    (Insert/Tap)
   │             │                  │                 │                │
   │             │                  │                 │ 8. Response    │
   │             │                  │                 │<───────────────┤
   │             │                  │                 │                │
   │             │                  │ 9. Result       │                │
   │             │                  │<────────────────┤                │
   │             │                  │                 │                │
   │             │ 10. Payment      │                 │                │
   │             │     Complete     │                 │                │
   │             │<─────────────────┤                 │                │
   │             │                  │                 │                │
   │ 11. Order   │                  │                 │                │
   │     Complete│                  │                 │                │
   │<────────────┤                  │                 │                │
   │             │                  │                 │                │
```

## Terminal Registration Flow

```
┌──────────┐     ┌────────────┐     ┌──────────┐     ┌──────────┐
│  Admin   │     │  Payments  │     │ Terminal │     │ Database │
│   API    │     │ Controller │     │ Manager  │     │          │
└────┬─────┘     └─────┬──────┘     └────┬─────┘     └────┬─────┘
     │                 │                  │                │
     │ 1. POST         │                  │                │
     │   /terminals    │                  │                │
     ├────────────────>│                  │                │
     │                 │                  │                │
     │                 │ 2. Register      │                │
     │                 │    Terminal      │                │
     │                 ├─────────────────>│                │
     │                 │                  │                │
     │                 │                  │ 3. Validate    │
     │                 │                  │    Config      │
     │                 │                  │                │
     │                 │                  │ 4. Save to DB  │
     │                 │                  ├───────────────>│
     │                 │                  │                │
     │                 │                  │ 5. Saved       │
     │                 │                  │<───────────────┤
     │                 │                  │                │
     │                 │                  │ 6. Register    │
     │                 │                  │    with PAX    │
     │                 │                  │    Agent       │
     │                 │                  │                │
     │                 │                  │ 7. Health      │
     │                 │                  │    Check       │
     │                 │                  │                │
     │                 │ 8. Success       │                │
     │                 │<─────────────────┤                │
     │                 │                  │                │
     │ 9. 201 Created  │                  │                │
     │<────────────────┤                  │                │
     │                 │                  │                │
```

## Health Monitoring Flow

```
┌────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   Cron     │     │ Terminal │     │   PAX    │     │ Terminal │
│ Scheduler  │     │ Manager  │     │  Agent   │     │ Hardware │
└─────┬──────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
      │                 │                 │                │
      │ Every 5 min     │                 │                │
      ├────────────────>│                 │                │
      │                 │                 │                │
      │                 │ For each        │                │
      │                 │ terminal        │                │
      │                 │                 │                │
      │                 │ Get Status      │                │
      │                 ├────────────────>│                │
      │                 │                 │                │
      │                 │                 │ Send A00       │
      │                 │                 │ (Status Cmd)   │
      │                 │                 ├───────────────>│
      │                 │                 │                │
      │                 │                 │ A01 Response   │
      │                 │                 │<───────────────┤
      │                 │                 │                │
      │                 │ Status          │                │
      │                 │<────────────────┤                │
      │                 │                 │                │
      │                 │ Update Health   │                │
      │                 │ Status          │                │
      │                 │                 │                │
      │ Complete        │                 │                │
      │<────────────────┤                 │                │
      │                 │                 │                │
```

## Failover Scenario

```
┌──────────┐     ┌────────────┐     ┌──────────┐     ┌──────────┐
│  Order   │     │  Payment   │     │   PAX    │     │  Stripe  │
│Orchestr. │     │  Router    │     │  Agent   │     │  Agent   │
└────┬─────┘     └─────┬──────┘     └────┬─────┘     └────┬─────┘
     │                 │                  │                │
     │ 1. Process      │                  │                │
     │    Payment      │                  │                │
     ├────────────────>│                  │                │
     │                 │                  │                │
     │                 │ 2. Try PAX       │                │
     │                 │    (preferred)   │                │
     │                 ├─────────────────>│                │
     │                 │                  │                │
     │                 │ 3. ERROR         │                │
     │                 │    (timeout)     │                │
     │                 │<─────────────────┤                │
     │                 │                  │                │
     │                 │ 4. Failover      │                │
     │                 │    to Stripe     │                │
     │                 ├────────────────────────────────>  │
     │                 │                  │                │
     │                 │ 5. SUCCESS       │                │
     │                 │<────────────────────────────────  │
     │                 │                  │                │
     │ 6. Payment OK   │                  │                │
     │    (via Stripe) │                  │                │
     │<────────────────┤                  │                │
     │                 │                  │                │
```

## Data Model

```
┌─────────────────────────────────────────────────────────────┐
│                      PaymentTerminal                        │
├─────────────────────────────────────────────────────────────┤
│ id: string (PK)                                             │
│ name: string                                                │
│ type: string (pax, ingenico, verifone, virtual)            │
│ locationId: string (FK → Location)                          │
│ ipAddress: string?                                          │
│ port: integer?                                              │
│ serialNumber: string? (unique)                              │
│ model: string?                                              │
│ enabled: boolean                                            │
│ firmwareVersion: string?                                    │
│ lastHeartbeat: timestamp?                                   │
│ metadata: json?                                             │
│ deletedAt: timestamp? (soft delete)                         │
│ createdAt: timestamp                                        │
│ updatedAt: timestamp                                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ 1:N
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      PaxTransaction                         │
├─────────────────────────────────────────────────────────────┤
│ id: string (PK)                                             │
│ terminalId: string (FK → PaymentTerminal)                   │
│ transactionId: string? (FK → Transaction)                   │
│ transactionType: string (sale, refund, void, auth, capture) │
│ amount: float                                               │
│ referenceNumber: string (unique)                            │
│ invoiceNumber: string?                                      │
│ success: boolean                                            │
│ responseCode: string                                        │
│ responseMessage: string                                     │
│ authCode: string?                                           │
│ cardType: string?                                           │
│ last4: string?                                              │
│ rawRequest: json?                                           │
│ rawResponse: json?                                          │
│ createdAt: timestamp                                        │
└─────────────────────────────────────────────────────────────┘
```

## Module Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                        App Module                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ imports
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Orders     │  │   Payments   │  │   Common     │
│   Module     │  │   Module     │  │   Module     │
│              │  │    (NEW)     │  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       │ uses            │ uses             │
       └────────────────>│<─────────────────┘
                         │
                         │ provides
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Payment    │  │     PAX      │  │   Terminal   │
│   Router     │  │   Terminal   │  │   Manager    │
│   Service    │  │    Agent     │  │   Service    │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                    Payment Router Service                   │
│                                                             │
│  Dependencies:                                              │
│  • PaymentAgent (Stripe)                                    │
│  • OfflinePaymentAgent                                      │
│  • NetworkStatusService                                     │
│  • TerminalManagerService ──────────┐                      │
│  • PaxTerminalAgent ────────────┐   │                      │
└─────────────────────────────────┼───┼──────────────────────┘
                                  │   │
                                  │   │
                ┌─────────────────┘   │
                │                     │
                ▼                     ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│   PAX Terminal Agent    │  │  Terminal Manager Svc   │
│                         │  │                         │
│  Dependencies:          │  │  Dependencies:          │
│  • PrismaService        │  │  • PrismaService        │
│                         │  │  • PaxTerminalAgent ────┤
│  Provides:              │  │                         │
│  • processTransaction() │  │  Provides:              │
│  • getTerminalStatus()  │  │  • registerTerminal()   │
│  • cancelTransaction()  │  │  • checkHealth()        │
└─────────────────────────┘  │  • findBestTerminal()   │
                             └─────────────────────────┘
```

## Legend

```
┌─────────┐
│  Box    │  = Component/Service/Module
└─────────┘

    │
    ▼        = Data/Control Flow

   ───>      = Dependency/Uses

   (NEW)     = Newly implemented component

   (Existing)= Pre-existing component

   PK        = Primary Key
   FK        = Foreign Key
   ?         = Optional field
```

---

*These diagrams provide a visual overview of the PAX Terminal Integration architecture, data flow, and component relationships.*

