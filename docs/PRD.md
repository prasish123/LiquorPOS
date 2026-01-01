# Product Requirements Document (PRD)
## Florida Liquor Store POS System

**Version:** 1.0  
**Date:** December 31, 2024  
**Author:** Product Manager  
**Status:** Draft for Review

---

## 1. Executive Summary

### Problem Statement
Independent liquor stores in Florida are using outdated POS systems (like NRS Plus) that:
- Have poor UI/UX (slow, clunky interfaces)
- Lack native delivery integration (manual order entry from Uber Eats/DoorDash)
- Have hidden costs ($95-110/month with add-ons)
- Don't support unified omnichannel pricing
- Lack modern features (AI search, smart recommendations)

### Solution
Build a modern, cloud-native POS system with:
- **Killer UI/UX** - Fast, beautiful, intuitive interface
- **Native Delivery Integration** - Auto-sync Uber Eats/DoorDash orders
- **Unified Omnichannel** - Same pricing across counter, web, delivery
- **AI-Powered Search** - Semantic product search and recommendations
- **Event-Driven Architecture** - Real-time updates, data integrity
- **Transparent Pricing** - All-inclusive SaaS ($149/month)

### Success Criteria
- **10+ liquor stores** using the system within 12 months
- **$15K+ MRR** (monthly recurring revenue)
- **<2 second checkout time** (scan to receipt)
- **99.9% uptime**
- **4.5+ star customer rating**
- **Win 50%+ of head-to-head deals** vs NRS Plus

---

## 2. User Personas

### Persona 1: Sarah (Cashier)
**Age:** 24  
**Experience:** 6 months at liquor store  
**Tech Savvy:** Medium  

**Goals:**
- Process transactions quickly (long lines during rush hour)
- Avoid age verification mistakes (fear of fines)
- Minimize errors (wrong prices, inventory issues)

**Pain Points:**
- Current POS is slow (3-4 seconds per transaction)
- Age verification is manual (easy to forget)
- Confusing error messages
- Training took 2 weeks

**Needs:**
- Fast, intuitive interface
- Automatic age verification prompts
- Clear error messages
- <30 minute training time

---

### Persona 2: Mike (Store Manager)
**Age:** 38  
**Experience:** 5 years managing liquor store  
**Tech Savvy:** High  

**Goals:**
- Monitor sales in real-time (from anywhere)
- Manage inventory efficiently (avoid stockouts)
- Control costs (reduce IT expenses)
- Grow online sales (e-commerce + delivery)

**Pain Points:**
- Can't access data remotely (must be at store)
- Inventory discrepancies (manual counts)
- High IT costs (on-site visits for issues)
- Delivery orders require manual entry (30+ min/day)

**Needs:**
- Mobile app for remote management
- Real-time inventory tracking
- Automated delivery order sync
- Low-stock alerts

---

### Persona 3: Jessica (Customer)
**Age:** 32  
**Experience:** Busy professional  
**Tech Savvy:** High  

**Goals:**
- Order wine online for pickup (save time)
- Browse products with good descriptions
- Get recommendations (what wine for dinner?)
- Fast checkout (in-store or online)

**Pain Points:**
- Store website is outdated (hard to browse)
- Prices differ online vs in-store
- No product recommendations
- Long wait times at counter

**Needs:**
- Modern e-commerce website
- Unified pricing (online = in-store)
- AI recommendations
- Fast pickup process

---

## 3. User Stories

### Epic 1: Counter POS

**US-001: Barcode Scanning**
```
As a cashier,
I want to scan a product barcode and see it added to the cart instantly,
So that I can process transactions quickly.

Acceptance Criteria:
- Barcode scanner detects product
- Product appears in cart within 500ms
- Product image, name, price displayed
- Quantity defaults to 1 (editable)
- Total updates automatically
```

**US-002: Age Verification**
```
As a cashier,
I want the system to automatically prompt for age verification when scanning alcohol,
So that I comply with Florida law and avoid fines.

Acceptance Criteria:
- System detects age-restricted product (product.age_restricted = true)
- Large warning appears: "⚠️ AGE VERIFICATION REQUIRED"
- Cashier scans customer ID (driver's license barcode)
- System parses DOB and calculates age
- If age >= 21, transaction continues
- If age < 21, transaction blocked with error message
- Age verification logged in audit trail
```

**US-003: Payment Processing**
```
As a cashier,
I want to accept multiple payment methods (cash, card, split),
So that I can serve all customers.

Acceptance Criteria:
- Cash payment: enter amount tendered, calculate change
- Card payment: integrate with Stripe terminal
- Split payment: accept partial cash + partial card
- Receipt prints automatically
- Transaction saved to database
- Inventory decremented
```

**US-004: Offline Mode**
```
As a cashier,
I want to continue processing transactions when internet is down,
So that I don't lose sales.

Acceptance Criteria:
- System detects offline status
- Transactions saved to IndexedDB
- "Offline Mode" indicator displayed
- When online, transactions auto-sync to server
- No data loss
```

---

### Epic 2: E-commerce Website

**US-005: Product Browsing**
```
As a customer,
I want to browse products by category (wine, beer, spirits) with filters,
So that I can find what I'm looking for quickly.

Acceptance Criteria:
- Category navigation (wine, beer, spirits, mixers)
- Filters: price range, brand, type, ABV
- Sort: price (low-high, high-low), popularity, name
- Product cards show: image, name, price, in-stock status
- Pagination or infinite scroll
```

**US-006: AI Product Search**
```
As a customer,
I want to search for products using natural language,
So that I can find what I need without knowing exact names.

Acceptance Criteria:
- Search bar accepts queries like "wine for steak dinner"
- Vector search returns semantically relevant products
- Results ranked by relevance, price, availability
- Search results appear within 1 second
- Fallback to keyword search if vector search fails
```

**US-007: Online Ordering**
```
As a customer,
I want to order products online for pickup,
So that I can save time.

Acceptance Criteria:
- Add products to cart
- Real-time inventory check (no overselling)
- Age verification: upload ID before first order
- Select pickup location and time
- Pay with credit card (Stripe)
- Receive confirmation email
- Order appears in POS for staff to prepare
```

---

### Epic 3: Delivery Integration

**US-008: Uber Eats Auto-Sync**
```
As a store manager,
I want Uber Eats orders to automatically sync to the POS,
So that I don't waste time manually entering orders.

Acceptance Criteria:
- Uber Eats order webhook received
- Order parsed and created in POS
- Staff notified (visual + sound alert)
- Order details displayed (items, customer, delivery address)
- Staff marks order as "Ready for pickup"
- Uber Eats notified (driver dispatched)
- Inventory decremented automatically
```

**US-009: DoorDash Auto-Sync**
```
(Same as US-008, but for DoorDash)
```

---

### Epic 4: Inventory Management

**US-010: Real-Time Inventory**
```
As a manager,
I want to see real-time inventory levels across all locations,
So that I can make informed decisions.

Acceptance Criteria:
- Dashboard shows inventory by location
- Real-time updates (no page refresh needed)
- Color-coded: green (in-stock), yellow (low), red (out-of-stock)
- Search/filter by SKU, category, location
- Export to CSV
```

**US-011: Low Stock Alerts**
```
As a manager,
I want to receive alerts when products are low in stock,
So that I can reorder before running out.

Acceptance Criteria:
- Set reorder point per product (e.g., 10 units)
- When inventory <= reorder point, alert triggered
- Alert sent via: push notification (mobile app), email
- Alert includes: SKU, current quantity, suggested order quantity
- Manager can mark as "ordered" to dismiss alert
```

---

### Epic 5: Back-Office Integration

**US-012: Transaction Sync**
```
As a store owner,
I want sales transactions to automatically sync to the back-office system,
So that my accounting is always up-to-date.

Acceptance Criteria:
- Every completed transaction synced within 5 minutes
- Sync includes: transaction ID, items, payment, customer
- Back-office returns confirmation (backoffice_id)
- Failed syncs retry with exponential backoff
- Dashboard shows sync status (last synced, pending, errors)
```

**US-013: Product Sync**
```
As a manager,
I want product updates (price, cost, description) to sync between POS and back-office,
So that data is consistent.

Acceptance Criteria:
- Product updates in POS → sync to back-office
- Product updates in back-office → sync to POS
- Bi-directional sync
- Conflict resolution: back-office wins (source of truth for pricing)
```

---

## 4. Functional Requirements

### 4.1 Counter POS
- [ ] **FR-001:** Barcode scanning (USB/Bluetooth scanners)
- [ ] **FR-002:** Product search (by name, SKU, barcode)
- [ ] **FR-003:** Shopping cart (add, remove, edit quantity)
- [ ] **FR-004:** Age verification (ID scanner, manual DOB entry)
- [ ] **FR-005:** Payment processing (cash, card, split)
- [ ] **FR-006:** Receipt printing (thermal printer)
- [ ] **FR-007:** Digital receipts (email, SMS)
- [ ] **FR-008:** Offline mode (IndexedDB, background sync)
- [ ] **FR-009:** Refunds (full, partial)
- [ ] **FR-010:** Discounts (manual, automatic promotions)

### 4.2 E-commerce Website
- [ ] **FR-011:** Product catalog (browse, search, filter)
- [ ] **FR-012:** AI-powered search (semantic, vector-based)
- [ ] **FR-013:** Shopping cart
- [ ] **FR-014:** Age verification (ID upload)
- [ ] **FR-015:** Online checkout (Stripe)
- [ ] **FR-016:** Order tracking
- [ ] **FR-017:** Pickup scheduling
- [ ] **FR-018:** Customer accounts (order history, saved addresses)

### 4.3 Mobile Manager App
- [ ] **FR-019:** Real-time sales dashboard
- [ ] **FR-020:** Inventory management (view, adjust, transfer)
- [ ] **FR-021:** Low stock alerts (push notifications)
- [ ] **FR-022:** Price updates
- [ ] **FR-023:** Employee management
- [ ] **FR-024:** Multi-location overview

### 4.4 Delivery Integration
- [ ] **FR-025:** Uber Eats menu sync
- [ ] **FR-026:** Uber Eats order ingestion (webhook)
- [ ] **FR-027:** DoorDash menu sync
- [ ] **FR-028:** DoorDash order ingestion (webhook)
- [ ] **FR-029:** Unified order queue (all channels)
- [ ] **FR-030:** Order status updates (preparing, ready, picked up)

### 4.5 Back-Office Integration
- [ ] **FR-031:** Transaction sync (real-time)
- [ ] **FR-032:** Product sync (bi-directional)
- [ ] **FR-033:** Inventory sync
- [ ] **FR-034:** Promotion sync (combo, mix-match)
- [ ] **FR-035:** Category sync (merchandise codes)

### 4.6 Compliance
- [ ] **FR-036:** Age verification logging (audit trail)
- [ ] **FR-037:** Florida tax calculation (7% state + local)
- [ ] **FR-038:** Transaction logs (7-year retention)
- [ ] **FR-039:** License tracking (expiration reminders)

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **NFR-001:** Checkout time < 2 seconds (scan to receipt)
- **NFR-002:** API response time p95 < 500ms
- **NFR-003:** Page load time < 1 second (Lighthouse score 90+)
- **NFR-004:** Vector search < 50ms
- **NFR-005:** Real-time inventory updates < 5 seconds

### 5.2 Scalability
- **NFR-006:** Support 10+ stores (80+ terminals)
- **NFR-007:** Handle 1,000 transactions/hour
- **NFR-008:** Support 100 concurrent users
- **NFR-009:** Database connections < 100

### 5.3 Reliability
- **NFR-010:** System uptime 99.9% (8.7 hours downtime/year)
- **NFR-011:** Offline mode works (no data loss)
- **NFR-012:** Automatic failover (multi-region)
- **NFR-013:** Daily backups (30-day retention)

### 5.4 Security
- **NFR-014:** HTTPS only (TLS 1.3)
- **NFR-015:** JWT authentication (15-min expiry)
- **NFR-016:** Role-based access control (cashier, manager, owner, admin)
- **NFR-017:** Payment data tokenized (PCI compliant)
- **NFR-018:** Encryption at rest (AES-256)

### 5.5 Usability
- **NFR-019:** Cashier training < 30 minutes
- **NFR-020:** Mobile responsive (tablets, phones)
- **NFR-021:** Touch targets >= 44px
- **NFR-022:** Animations 60fps
- **NFR-023:** Clear error messages (no technical jargon)

### 5.6 Maintainability
- **NFR-024:** Code coverage >= 80%
- **NFR-025:** API documentation (OpenAPI/Swagger)
- **NFR-026:** Monitoring (Sentry, PostHog)
- **NFR-027:** Logging (structured logs, searchable)

---

## 6. Success Metrics

### 6.1 Business Metrics
- **10+ stores** using the system (12 months)
- **$15K+ MRR** (monthly recurring revenue)
- **<5% churn rate**
- **50%+ win rate** vs NRS Plus
- **4.5+ star rating** (customer reviews)

### 6.2 Technical Metrics
- **99.9% uptime**
- **<2 second checkout time**
- **<500ms API response time** (p95)
- **<1 second page load time**
- **<50ms vector search**

### 6.3 User Metrics
- **30+ transactions/hour** per terminal (vs 20 with NRS Plus)
- **<30 minute training time** (vs 2 weeks with NRS Plus)
- **20%+ online sales** (within 2 months of e-commerce launch)
- **30%+ loyalty enrollment** (within 3 months)

---

## 7. Out of Scope (Phase 1 MVP)

The following features are **NOT** included in Phase 1:
- ❌ Mobile manager app (Phase 5)
- ❌ Advanced analytics (Phase 5)
- ❌ Multi-location transfers (Phase 5)
- ❌ Customer loyalty program (Phase 2)
- ❌ AI recommendations (Phase 3)
- ❌ Predictive reordering (Phase 3)

---

## 8. Risks and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Delivery API changes** | Medium | High | Version lock APIs, monitor changelog, abstraction layer |
| **Payment processing issues** | Low | Critical | Use Stripe SDK, retry logic, monitoring |
| **Back-office integration delays** | High | Medium | Start with CSV export, build API in parallel |
| **Florida compliance gaps** | Medium | Critical | Consult liquor store owners, hire compliance expert |
| **Customer adoption resistance** | Medium | High | Free pilot, white-glove onboarding, 24/7 support |

---

## 9. Timeline

**Phase 1 MVP:** 16 weeks (4 months)
- Week 1: PRD + Architecture
- Weeks 2-13: Development (6 sprints × 2 weeks)
- Weeks 14-15: Testing (QA)
- Week 16: Validation + Pilot deployment

---

## 10. Approval

**Product Manager:** _________________ Date: _______  
**Architect:** _________________ Date: _______  
**Stakeholder:** _________________ Date: _______

---

**Next Steps:**
1. Review and approve PRD
2. Finalize architecture
3. Begin Sprint 1 (project setup)
