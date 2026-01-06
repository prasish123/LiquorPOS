# Complete Requirements Testing Checklist
## Florida Liquor Store POS System

**Date:** January 3, 2026  
**Version:** 1.0  
**Purpose:** Comprehensive testing and validation checklist for all system requirements

---

## 📋 How to Use This Checklist

- **For Testers:** Go through each requirement systematically
- **For Developers:** Use this to verify implementation completeness
- **For Managers:** Track overall progress and identify gaps
- **Status Codes:**
  - ✅ = Fully implemented and tested
  - 🔄 = Partially implemented
  - ⏳ = Not started
  - ❌ = Failed/Blocked

---

# PART 1: FUNCTIONAL REQUIREMENTS

## Epic 1: Counter POS

### US-001: Barcode Scanning
**Priority:** P0 (Critical)

- [ ] **FR-001.1:** USB barcode scanner detected and functional
- [ ] **FR-001.2:** Bluetooth barcode scanner pairing works
- [ ] **FR-001.3:** Product appears in cart within 500ms of scan
- [ ] **FR-001.4:** Product image displays correctly
- [ ] **FR-001.5:** Product name displays correctly
- [ ] **FR-001.6:** Product price displays correctly
- [ ] **FR-001.7:** Quantity defaults to 1
- [ ] **FR-001.8:** Quantity is editable (can increase/decrease)
- [ ] **FR-001.9:** Cart total updates automatically
- [ ] **FR-001.10:** Invalid barcode shows clear error message
- [ ] **FR-001.11:** Duplicate scans increment quantity (not add new line)
- [ ] **FR-001.12:** Scanner works in offline mode

**Test Scenarios:**
- [ ] Scan single product
- [ ] Scan same product multiple times
- [ ] Scan invalid barcode
- [ ] Scan while offline
- [ ] Scan 20+ products rapidly (stress test)

---

### US-002: Age Verification
**Priority:** P0 (Legal Compliance)

- [ ] **FR-002.1:** System detects age-restricted products
- [ ] **FR-002.2:** Warning appears: "⚠️ AGE VERIFICATION REQUIRED"
- [ ] **FR-002.3:** Warning is large and unmissable
- [ ] **FR-002.4:** Cannot proceed without verification
- [ ] **FR-002.5:** ID scanner reads driver's license barcode
- [ ] **FR-002.6:** System parses DOB from ID
- [ ] **FR-002.7:** System calculates age correctly
- [ ] **FR-002.8:** Age >= 21 allows transaction to continue
- [ ] **FR-002.9:** Age < 21 blocks transaction with error
- [ ] **FR-002.10:** Manual DOB entry option available
- [ ] **FR-002.11:** Age verification logged to audit trail
- [ ] **FR-002.12:** Audit log includes: timestamp, cashier, customer age, product
- [ ] **FR-002.13:** Multiple age-restricted items only require one verification
- [ ] **FR-002.14:** Verification works in offline mode

**Test Scenarios:**
- [ ] Scan alcohol product (beer, wine, spirits)
- [ ] Scan tobacco product
- [ ] Scan with valid ID (age 21+)
- [ ] Scan with invalid ID (age <21)
- [ ] Manual DOB entry for age 21+
- [ ] Manual DOB entry for age <21
- [ ] Multiple alcohol items in one transaction
- [ ] Age verification while offline

---

### US-003: Payment Processing
**Priority:** P0 (Critical)

#### Cash Payment
- [ ] **FR-003.1:** Cash payment option available
- [ ] **FR-003.2:** Amount tendered input field works
- [ ] **FR-003.3:** Change calculated correctly
- [ ] **FR-003.4:** Change displayed clearly
- [ ] **FR-003.5:** Exact change accepted (no change due)
- [ ] **FR-003.6:** Overpayment accepted
- [ ] **FR-003.7:** Underpayment rejected with error
- [ ] **FR-003.8:** Receipt prints automatically
- [ ] **FR-003.9:** Transaction saved to database
- [ ] **FR-003.10:** Inventory decremented

#### Card Payment (Stripe)
- [ ] **FR-003.11:** Card payment option available
- [ ] **FR-003.12:** Stripe terminal integration works
- [ ] **FR-003.13:** Payment amount sent correctly
- [ ] **FR-003.14:** Card authorization successful
- [ ] **FR-003.15:** Card capture successful
- [ ] **FR-003.16:** Payment declined handled gracefully
- [ ] **FR-003.17:** Receipt prints automatically
- [ ] **FR-003.18:** Transaction saved with payment details
- [ ] **FR-003.19:** Inventory decremented

#### Card Payment (PAX Terminal)
- [ ] **FR-003.20:** PAX terminal detected
- [ ] **FR-003.21:** Payment routed to PAX automatically
- [ ] **FR-003.22:** EMV chip card works
- [ ] **FR-003.23:** Contactless (NFC) payment works
- [ ] **FR-003.24:** Magnetic stripe fallback works
- [ ] **FR-003.25:** Payment authorization <3 seconds
- [ ] **FR-003.26:** Receipt prints automatically
- [ ] **FR-003.27:** Transaction saved with PAX details
- [ ] **FR-003.28:** Fallback to Stripe if PAX fails

#### Split Payment
- [ ] **FR-003.29:** Split payment option available
- [ ] **FR-003.30:** Partial cash + partial card works
- [ ] **FR-003.31:** Split amounts calculated correctly
- [ ] **FR-003.32:** Both payments recorded separately
- [ ] **FR-003.33:** Receipt shows both payment methods

**Test Scenarios:**
- [ ] Cash payment (exact change)
- [ ] Cash payment (with change)
- [ ] Card payment (Stripe)
- [ ] Card payment (PAX - chip)
- [ ] Card payment (PAX - contactless)
- [ ] Card payment (PAX - stripe)
- [ ] Split payment (cash + card)
- [ ] Payment declined scenario
- [ ] Payment timeout scenario
- [ ] Payment while offline (queued)

---

### US-004: Offline Mode
**Priority:** P0 (Critical)

- [ ] **FR-004.1:** System detects offline status automatically
- [ ] **FR-004.2:** "Offline Mode" indicator displayed prominently
- [ ] **FR-004.3:** Transactions continue to work offline
- [ ] **FR-004.4:** Transactions saved to IndexedDB
- [ ] **FR-004.5:** Product catalog cached locally
- [ ] **FR-004.6:** Prices available offline
- [ ] **FR-004.7:** Inventory checks use cached data
- [ ] **FR-004.8:** Age verification works offline
- [ ] **FR-004.9:** Receipt generation works offline
- [ ] **FR-004.10:** When online, transactions auto-sync
- [ ] **FR-004.11:** Sync status indicator shows progress
- [ ] **FR-004.12:** No data loss during sync
- [ ] **FR-004.13:** Conflict resolution works (if any)
- [ ] **FR-004.14:** Sync retry on failure

**Test Scenarios:**
- [ ] Disconnect internet, process transaction
- [ ] Process 10 transactions offline
- [ ] Reconnect internet, verify auto-sync
- [ ] Offline for 1 hour, then sync
- [ ] Sync failure, verify retry logic
- [ ] Mixed online/offline transactions

---

### FR-005: Refunds
**Priority:** P1 (High)

- [ ] **FR-005.1:** Refund option available from transaction history
- [ ] **FR-005.2:** Full refund works
- [ ] **FR-005.3:** Partial refund works (select items)
- [ ] **FR-005.4:** Refund reason required
- [ ] **FR-005.5:** Manager approval required (if configured)
- [ ] **FR-005.6:** Refund to original payment method
- [ ] **FR-005.7:** Refund receipt prints
- [ ] **FR-005.8:** Inventory incremented
- [ ] **FR-005.9:** Refund logged to audit trail
- [ ] **FR-005.10:** Cannot refund same transaction twice

**Test Scenarios:**
- [ ] Full refund (cash)
- [ ] Full refund (card)
- [ ] Partial refund (2 of 5 items)
- [ ] Refund with manager override
- [ ] Attempt duplicate refund (should fail)

---

### FR-006: Discounts
**Priority:** P1 (High)

- [ ] **FR-006.1:** Manual discount option available
- [ ] **FR-006.2:** Percentage discount works (e.g., 10% off)
- [ ] **FR-006.3:** Fixed amount discount works (e.g., $5 off)
- [ ] **FR-006.4:** Item-level discount works
- [ ] **FR-006.5:** Transaction-level discount works
- [ ] **FR-006.6:** Discount reason required
- [ ] **FR-006.7:** Manager approval required (if configured)
- [ ] **FR-006.8:** Automatic promotions apply
- [ ] **FR-006.9:** Combo deals work (e.g., buy 2 get 1 free)
- [ ] **FR-006.10:** Mix-and-match promotions work
- [ ] **FR-006.11:** Discounts logged to audit trail
- [ ] **FR-006.12:** Receipt shows discount details

**Test Scenarios:**
- [ ] 10% off entire transaction
- [ ] $5 off single item
- [ ] Buy 2 get 1 free combo
- [ ] Mix-and-match (6 beers for $10)
- [ ] Manual discount with manager override
- [ ] Multiple discounts on same transaction

---

## Epic 2: E-commerce Website

### US-005: Product Browsing
**Priority:** P1 (High)

- [ ] **FR-011.1:** Category navigation works (wine, beer, spirits, mixers)
- [ ] **FR-011.2:** Product grid displays correctly
- [ ] **FR-011.3:** Product images load
- [ ] **FR-011.4:** Product names display
- [ ] **FR-011.5:** Product prices display
- [ ] **FR-011.6:** In-stock status shows
- [ ] **FR-011.7:** Out-of-stock products marked clearly
- [ ] **FR-011.8:** Filter by price range works
- [ ] **FR-011.9:** Filter by brand works
- [ ] **FR-011.10:** Filter by type works (red wine, IPA, vodka, etc.)
- [ ] **FR-011.11:** Filter by ABV works
- [ ] **FR-011.12:** Sort by price (low-high) works
- [ ] **FR-011.13:** Sort by price (high-low) works
- [ ] **FR-011.14:** Sort by popularity works
- [ ] **FR-011.15:** Sort by name (A-Z) works
- [ ] **FR-011.16:** Pagination works
- [ ] **FR-011.17:** Infinite scroll works (if implemented)
- [ ] **FR-011.18:** Mobile responsive

**Test Scenarios:**
- [ ] Browse wine category
- [ ] Filter red wines under $20
- [ ] Sort by price (low to high)
- [ ] View 50+ products with pagination
- [ ] Test on mobile device
- [ ] Test on tablet

---

### US-006: AI Product Search
**Priority:** P2 (Medium)

- [ ] **FR-012.1:** Search bar prominent and accessible
- [ ] **FR-012.2:** Natural language queries work ("wine for steak dinner")
- [ ] **FR-012.3:** Vector search returns relevant products
- [ ] **FR-012.4:** Results ranked by relevance
- [ ] **FR-012.5:** Results appear within 1 second
- [ ] **FR-012.6:** Keyword fallback works if vector search fails
- [ ] **FR-012.7:** Search handles typos
- [ ] **FR-012.8:** Search suggestions appear (autocomplete)
- [ ] **FR-012.9:** Recent searches saved
- [ ] **FR-012.10:** Popular searches displayed

**Test Scenarios:**
- [ ] Search: "wine for steak dinner"
- [ ] Search: "cheap beer"
- [ ] Search: "tequila for margaritas"
- [ ] Search with typo: "whine for dinner"
- [ ] Search non-existent product
- [ ] Search performance with 1000+ products

---

### US-007: Online Ordering
**Priority:** P1 (High)

- [ ] **FR-013.1:** Add to cart button works
- [ ] **FR-013.2:** Cart icon shows item count
- [ ] **FR-013.3:** Cart page displays all items
- [ ] **FR-013.4:** Quantity adjustment in cart works
- [ ] **FR-013.5:** Remove from cart works
- [ ] **FR-013.6:** Real-time inventory check prevents overselling
- [ ] **FR-013.7:** Age verification required (ID upload)
- [ ] **FR-013.8:** ID upload works (image file)
- [ ] **FR-013.9:** ID verification status shown
- [ ] **FR-013.10:** Pickup location selection works
- [ ] **FR-013.11:** Pickup time selection works
- [ ] **FR-013.12:** Payment with credit card (Stripe) works
- [ ] **FR-013.13:** Order confirmation email sent
- [ ] **FR-013.14:** Order appears in POS for staff
- [ ] **FR-013.15:** Order status tracking works
- [ ] **FR-013.16:** Order cancellation works (before pickup)

**Test Scenarios:**
- [ ] Complete online order (wine)
- [ ] Complete online order (beer)
- [ ] Complete online order (spirits)
- [ ] Order out-of-stock item (should fail)
- [ ] Order without ID verification (should fail)
- [ ] Order for pickup today
- [ ] Order for pickup tomorrow
- [ ] Cancel order before pickup

---

## Epic 3: Delivery Integration

### US-008: Uber Eats Auto-Sync
**Priority:** P1 (High)

- [ ] **FR-025.1:** Uber Eats webhook configured
- [ ] **FR-025.2:** Webhook receives orders
- [ ] **FR-025.3:** Order parsed correctly
- [ ] **FR-025.4:** Order created in POS
- [ ] **FR-025.5:** Staff notified (visual alert)
- [ ] **FR-025.6:** Staff notified (sound alert)
- [ ] **FR-025.7:** Order details displayed (items, customer, address)
- [ ] **FR-025.8:** "Mark as Ready" button works
- [ ] **FR-025.9:** Uber Eats notified when ready
- [ ] **FR-025.10:** Driver dispatched automatically
- [ ] **FR-025.11:** Inventory decremented
- [ ] **FR-025.12:** Order logged to audit trail

**Test Scenarios:**
- [ ] Receive Uber Eats order (single item)
- [ ] Receive Uber Eats order (multiple items)
- [ ] Mark order as ready
- [ ] Verify driver dispatch
- [ ] Verify inventory update

---

### US-009: DoorDash Auto-Sync
**Priority:** P1 (High)

- [ ] **FR-027.1:** DoorDash webhook configured
- [ ] **FR-027.2:** Webhook receives orders
- [ ] **FR-027.3:** Order parsed correctly
- [ ] **FR-027.4:** Order created in POS
- [ ] **FR-027.5:** Staff notified (visual alert)
- [ ] **FR-027.6:** Staff notified (sound alert)
- [ ] **FR-027.7:** Order details displayed
- [ ] **FR-027.8:** "Mark as Ready" button works
- [ ] **FR-027.9:** DoorDash notified when ready
- [ ] **FR-027.10:** Driver dispatched automatically
- [ ] **FR-027.11:** Inventory decremented
- [ ] **FR-027.12:** Order logged to audit trail

**Test Scenarios:**
- [ ] Receive DoorDash order
- [ ] Mark order as ready
- [ ] Verify driver dispatch
- [ ] Verify inventory update

---

### FR-029: Unified Order Queue
**Priority:** P1 (High)

- [ ] **FR-029.1:** All orders in single queue (counter, online, Uber Eats, DoorDash)
- [ ] **FR-029.2:** Order source clearly labeled
- [ ] **FR-029.3:** Orders sorted by time (oldest first)
- [ ] **FR-029.4:** Filter by source works
- [ ] **FR-029.5:** Filter by status works (pending, preparing, ready, completed)
- [ ] **FR-029.6:** Order details expandable
- [ ] **FR-029.7:** Status updates in real-time

**Test Scenarios:**
- [ ] View queue with mixed order sources
- [ ] Filter by Uber Eats only
- [ ] Filter by pending status
- [ ] Process orders in sequence

---

## Epic 4: Inventory Management

### US-010: Real-Time Inventory
**Priority:** P0 (Critical)

- [ ] **FR-010.1:** Dashboard shows inventory by location
- [ ] **FR-010.2:** Real-time updates (no page refresh)
- [ ] **FR-010.3:** Color-coded status (green, yellow, red)
- [ ] **FR-010.4:** Green = in-stock (>10 units)
- [ ] **FR-010.5:** Yellow = low stock (1-10 units)
- [ ] **FR-010.6:** Red = out-of-stock (0 units)
- [ ] **FR-010.7:** Search by SKU works
- [ ] **FR-010.8:** Filter by category works
- [ ] **FR-010.9:** Filter by location works
- [ ] **FR-010.10:** Export to CSV works
- [ ] **FR-010.11:** Inventory count accurate after sale
- [ ] **FR-010.12:** Inventory count accurate after refund

**Test Scenarios:**
- [ ] View inventory dashboard
- [ ] Process sale, verify inventory decrements
- [ ] Process refund, verify inventory increments
- [ ] Search for specific SKU
- [ ] Filter by low stock
- [ ] Export inventory report

---

### US-011: Low Stock Alerts
**Priority:** P1 (High)

- [ ] **FR-011.1:** Reorder point configurable per product
- [ ] **FR-011.2:** Alert triggered when inventory <= reorder point
- [ ] **FR-011.3:** Push notification sent (mobile app)
- [ ] **FR-011.4:** Email alert sent
- [ ] **FR-011.5:** Alert includes SKU
- [ ] **FR-011.6:** Alert includes current quantity
- [ ] **FR-011.7:** Alert includes suggested order quantity
- [ ] **FR-011.8:** "Mark as Ordered" button works
- [ ] **FR-011.9:** Alert dismissed after marking ordered
- [ ] **FR-011.10:** Alert history viewable

**Test Scenarios:**
- [ ] Set reorder point to 5 units
- [ ] Sell product until 5 units remain
- [ ] Verify alert triggered
- [ ] Verify email sent
- [ ] Mark as ordered
- [ ] Verify alert dismissed

---

## Epic 5: Back-Office Integration

### US-012: Transaction Sync
**Priority:** P0 (Critical)

- [ ] **FR-031.1:** Every transaction syncs within 5 minutes
- [ ] **FR-031.2:** Sync includes transaction ID
- [ ] **FR-031.3:** Sync includes items
- [ ] **FR-031.4:** Sync includes payment details
- [ ] **FR-031.5:** Sync includes customer info
- [ ] **FR-031.6:** Back-office returns confirmation (backoffice_id)
- [ ] **FR-031.7:** Failed syncs retry with exponential backoff
- [ ] **FR-031.8:** Dashboard shows sync status
- [ ] **FR-031.9:** Last synced timestamp displayed
- [ ] **FR-031.10:** Pending syncs count displayed
- [ ] **FR-031.11:** Sync errors logged
- [ ] **FR-031.12:** Manual retry option available

**Test Scenarios:**
- [ ] Process transaction, verify sync within 5 min
- [ ] Simulate back-office offline, verify retry
- [ ] View sync dashboard
- [ ] Manual retry failed sync

---

### US-013: Product Sync
**Priority:** P1 (High)

- [ ] **FR-032.1:** Product updates in POS sync to back-office
- [ ] **FR-032.2:** Product updates in back-office sync to POS
- [ ] **FR-032.3:** Bi-directional sync works
- [ ] **FR-032.4:** Price updates sync
- [ ] **FR-032.5:** Cost updates sync
- [ ] **FR-032.6:** Description updates sync
- [ ] **FR-032.7:** Image updates sync
- [ ] **FR-032.8:** Conflict resolution: back-office wins
- [ ] **FR-032.9:** Sync status per product visible

**Test Scenarios:**
- [ ] Update price in POS, verify back-office updated
- [ ] Update price in back-office, verify POS updated
- [ ] Simultaneous updates (conflict), verify back-office wins
- [ ] Update product description
- [ ] Update product image

---

## Epic 6: Compliance

### FR-036: Age Verification Logging
**Priority:** P0 (Legal Compliance)

- [ ] **FR-036.1:** Every age verification logged
- [ ] **FR-036.2:** Log includes timestamp
- [ ] **FR-036.3:** Log includes cashier ID
- [ ] **FR-036.4:** Log includes customer age (not DOB for privacy)
- [ ] **FR-036.5:** Log includes product SKU
- [ ] **FR-036.6:** Log includes verification method (ID scan vs manual)
- [ ] **FR-036.7:** Logs immutable (cannot be edited/deleted)
- [ ] **FR-036.8:** Logs exportable for audits
- [ ] **FR-036.9:** 7-year retention enforced

**Test Scenarios:**
- [ ] Verify age verification creates audit log
- [ ] Attempt to modify audit log (should fail)
- [ ] Attempt to delete audit log (should fail)
- [ ] Export audit logs for date range
- [ ] Verify logs retained for 7 years

---

### FR-037: Florida Tax Calculation
**Priority:** P0 (Legal Compliance)

- [ ] **FR-037.1:** State tax (7%) applied correctly
- [ ] **FR-037.2:** Local tax applied correctly (varies by county)
- [ ] **FR-037.3:** Tax calculated on subtotal (before discounts)
- [ ] **FR-037.4:** Tax calculated after discounts (if configured)
- [ ] **FR-037.5:** Tax breakdown shown on receipt
- [ ] **FR-037.6:** Tax rates configurable per location
- [ ] **FR-037.7:** Tax rates updatable without code changes

**Test Scenarios:**
- [ ] Sale in Miami-Dade County (7% state + 1% local = 8%)
- [ ] Sale in Broward County (7% state + 1% local = 8%)
- [ ] Sale in Orange County (7% state + 0.5% local = 7.5%)
- [ ] Verify tax on $100 sale = $8.00 (Miami-Dade)
- [ ] Verify tax with discount applied

---

### FR-038: Transaction Logs
**Priority:** P0 (Legal Compliance)

- [ ] **FR-038.1:** All transactions logged
- [ ] **FR-038.2:** Logs include all transaction details
- [ ] **FR-038.3:** Logs immutable
- [ ] **FR-038.4:** 7-year retention enforced
- [ ] **FR-038.5:** Logs exportable for audits
- [ ] **FR-038.6:** Logs searchable by date, location, cashier

**Test Scenarios:**
- [ ] Verify transaction creates log
- [ ] Attempt to modify log (should fail)
- [ ] Export logs for audit
- [ ] Search logs by date range
- [ ] Verify 7-year retention policy

---

## Epic 7: Manager Override (REQ-003)

### Manager Override Workflow
**Priority:** P0 (Critical)

- [ ] **REQ-003.1:** "Override Price" button available to cashier
- [ ] **REQ-003.2:** Button click prompts for manager PIN
- [ ] **REQ-003.3:** PIN input modal displays
- [ ] **REQ-003.4:** PIN masked (not visible)
- [ ] **REQ-003.5:** System validates PIN
- [ ] **REQ-003.6:** System validates manager role
- [ ] **REQ-003.7:** Invalid PIN shows error
- [ ] **REQ-003.8:** Non-manager role blocked
- [ ] **REQ-003.9:** Manager selects override reason
- [ ] **REQ-003.10:** Reason options: Price Match, Damaged Goods, Customer Satisfaction, Other
- [ ] **REQ-003.11:** "Other" requires text explanation
- [ ] **REQ-003.12:** Manager enters new price
- [ ] **REQ-003.13:** New price validated (not negative, not > 50% off)
- [ ] **REQ-003.14:** Override logged to immutable audit trail
- [ ] **REQ-003.15:** Audit log includes: manager ID, cashier ID, original price, new price, reason
- [ ] **REQ-003.16:** Receipt shows override details
- [ ] **REQ-003.17:** Receipt shows "Manager Override: [Reason]"
- [ ] **REQ-003.18:** Override workflow <30 seconds

**Test Scenarios:**
- [ ] Override price with valid manager PIN
- [ ] Override price with invalid PIN (should fail)
- [ ] Override price with cashier PIN (should fail)
- [ ] Override for price match
- [ ] Override for damaged goods
- [ ] Override with "Other" reason
- [ ] Verify audit log created
- [ ] Verify receipt shows override
- [ ] Attempt excessive discount (>50% off, should fail)

---

## Epic 8: Receipt Printing (REQ-002)

### Receipt Generation
**Priority:** P0 (Critical)

- [ ] **REQ-002.1:** Receipt generated after every transaction
- [ ] **REQ-002.2:** Receipt includes store name
- [ ] **REQ-002.3:** Receipt includes store address
- [ ] **REQ-002.4:** Receipt includes store phone
- [ ] **REQ-002.5:** Receipt includes transaction ID
- [ ] **REQ-002.6:** Receipt includes date/time
- [ ] **REQ-002.7:** Receipt includes cashier name
- [ ] **REQ-002.8:** Receipt includes itemized list
- [ ] **REQ-002.9:** Receipt includes item names
- [ ] **REQ-002.10:** Receipt includes item prices
- [ ] **REQ-002.11:** Receipt includes item quantities
- [ ] **REQ-002.12:** Receipt includes subtotal
- [ ] **REQ-002.13:** Receipt includes tax breakdown
- [ ] **REQ-002.14:** Receipt includes total
- [ ] **REQ-002.15:** Receipt includes payment method
- [ ] **REQ-002.16:** Receipt includes change (if cash)
- [ ] **REQ-002.17:** Receipt includes age verification indicator (if applicable)
- [ ] **REQ-002.18:** Receipt includes manager override indicator (if applicable)
- [ ] **REQ-002.19:** Receipt includes return policy
- [ ] **REQ-002.20:** Receipt includes thank you message

### Thermal Printer Integration
**Priority:** P0 (Critical)

- [ ] **REQ-002.21:** Epson TM-T20 printer detected
- [ ] **REQ-002.22:** Star TSP143 printer detected
- [ ] **REQ-002.23:** ESC/POS commands work
- [ ] **REQ-002.24:** Receipt prints automatically after transaction
- [ ] **REQ-002.25:** Print quality acceptable
- [ ] **REQ-002.26:** Print speed <3 seconds
- [ ] **REQ-002.27:** Paper low warning displays
- [ ] **REQ-002.28:** Paper out error displays
- [ ] **REQ-002.29:** Printer offline error displays
- [ ] **REQ-002.30:** Fallback to browser print if thermal fails

### Browser Printing
**Priority:** P1 (High)

- [ ] **REQ-002.31:** Browser print works on Chrome
- [ ] **REQ-002.32:** Browser print works on Firefox
- [ ] **REQ-002.33:** Browser print works on Safari
- [ ] **REQ-002.34:** Browser print works on Edge
- [ ] **REQ-002.35:** Print preview displays correctly
- [ ] **REQ-002.36:** Print layout correct (no cutoff)

### Reprint Functionality
**Priority:** P1 (High)

- [ ] **REQ-002.37:** Reprint option in transaction history
- [ ] **REQ-002.38:** Reprint generates same receipt
- [ ] **REQ-002.39:** Reprint marked as "REPRINT" on receipt
- [ ] **REQ-002.40:** Reprint logged to audit trail

### Offline Receipt Support
**Priority:** P0 (Critical)

- [ ] **REQ-002.41:** Receipts generate while offline
- [ ] **REQ-002.42:** Receipts queue in IndexedDB
- [ ] **REQ-002.43:** Receipts sync when online
- [ ] **REQ-002.44:** No data loss during offline period

**Test Scenarios:**
- [ ] Print receipt on Epson TM-T20
- [ ] Print receipt on Star TSP143
- [ ] Print receipt via browser (Chrome)
- [ ] Print receipt via browser (Firefox)
- [ ] Reprint past transaction
- [ ] Print receipt while offline
- [ ] Verify receipt shows age verification
- [ ] Verify receipt shows manager override
- [ ] Simulate printer offline, verify fallback
- [ ] Simulate paper out, verify error

---

## Epic 9: Audit Log Immutability (REQ-001)

### Database-Level Enforcement
**Priority:** P0 (Critical)

- [ ] **REQ-001.1:** PostgreSQL trigger created
- [ ] **REQ-001.2:** Trigger prevents UPDATE on audit_log table
- [ ] **REQ-001.3:** Trigger prevents DELETE on audit_log table
- [ ] **REQ-001.4:** Attempted UPDATE throws error
- [ ] **REQ-001.5:** Attempted DELETE throws error
- [ ] **REQ-001.6:** Error message clear: "Audit logs are immutable"
- [ ] **REQ-001.7:** Audit log creation still works
- [ ] **REQ-001.8:** All existing audit paths work (ORDER_CREATION, PAYMENT_PROCESSING, etc.)
- [ ] **REQ-001.9:** Migration applied successfully
- [ ] **REQ-001.10:** Rollback script available

**Test Scenarios:**
- [ ] Create audit log (should succeed)
- [ ] Attempt to update audit log (should fail)
- [ ] Attempt to delete audit log (should fail)
- [ ] Verify error message
- [ ] Verify all audit log creation paths work

---

# PART 2: NON-FUNCTIONAL REQUIREMENTS

## Performance Requirements

### NFR-001: Checkout Time
**Target:** <2 seconds (scan to receipt)

- [ ] **NFR-001.1:** Barcode scan to cart: <500ms
- [ ] **NFR-001.2:** Payment authorization: <1s
- [ ] **NFR-001.3:** Receipt print: <3s
- [ ] **NFR-001.4:** Total checkout time: <2s (measured p95)

**Test Scenarios:**
- [ ] Measure 100 transactions, calculate p95
- [ ] Verify p95 <2 seconds

---

### NFR-002: API Response Time
**Target:** p95 <500ms

- [ ] **NFR-002.1:** GET /products: <200ms
- [ ] **NFR-002.2:** POST /orders: <500ms
- [ ] **NFR-002.3:** GET /orders/:id: <100ms
- [ ] **NFR-002.4:** POST /payments: <1000ms (includes external API)
- [ ] **NFR-002.5:** p95 across all endpoints: <500ms

**Test Scenarios:**
- [ ] Load test with 100 concurrent users
- [ ] Measure response times
- [ ] Calculate p95

---

### NFR-003: Page Load Time
**Target:** <1 second (Lighthouse score 90+)

- [ ] **NFR-003.1:** POS page load: <1s
- [ ] **NFR-003.2:** E-commerce homepage: <1s
- [ ] **NFR-003.3:** Product listing page: <1s
- [ ] **NFR-003.4:** Lighthouse Performance score: >90
- [ ] **NFR-003.5:** Lighthouse Accessibility score: >90
- [ ] **NFR-003.6:** Lighthouse Best Practices score: >90
- [ ] **NFR-003.7:** Lighthouse SEO score: >90

**Test Scenarios:**
- [ ] Run Lighthouse on POS page
- [ ] Run Lighthouse on e-commerce homepage
- [ ] Verify all scores >90

---

### NFR-004: Vector Search Performance
**Target:** <50ms

- [ ] **NFR-004.1:** Vector search query: <50ms
- [ ] **NFR-004.2:** Search with 1000+ products: <50ms
- [ ] **NFR-004.3:** Search with 10,000+ products: <100ms

**Test Scenarios:**
- [ ] Search with 1000 products, measure time
- [ ] Search with 10,000 products, measure time

---

### NFR-005: Real-Time Inventory Updates
**Target:** <5 seconds

- [ ] **NFR-005.1:** Inventory update after sale: <5s
- [ ] **NFR-005.2:** Inventory update after refund: <5s
- [ ] **NFR-005.3:** Inventory sync across locations: <5s

**Test Scenarios:**
- [ ] Process sale, measure time until inventory updates
- [ ] Process refund, measure time until inventory updates

---

## Scalability Requirements

### NFR-006: Multi-Store Support
**Target:** 10+ stores (80+ terminals)

- [ ] **NFR-006.1:** System supports 10 stores
- [ ] **NFR-006.2:** System supports 80 terminals
- [ ] **NFR-006.3:** Each store isolated (data separation)
- [ ] **NFR-006.4:** Cross-store reporting works
- [ ] **NFR-006.5:** Multi-location inventory works

**Test Scenarios:**
- [ ] Configure 10 stores
- [ ] Configure 80 terminals
- [ ] Process transactions across all stores
- [ ] Run cross-store reports

---

### NFR-007: Transaction Throughput
**Target:** 1,000 transactions/hour

- [ ] **NFR-007.1:** System handles 1,000 transactions/hour
- [ ] **NFR-007.2:** No performance degradation
- [ ] **NFR-007.3:** Database handles load
- [ ] **NFR-007.4:** API handles load

**Test Scenarios:**
- [ ] Load test: 1,000 transactions in 1 hour
- [ ] Monitor CPU, memory, database
- [ ] Verify no errors

---

### NFR-008: Concurrent Users
**Target:** 100 concurrent users

- [ ] **NFR-008.1:** System supports 100 concurrent users
- [ ] **NFR-008.2:** No performance degradation
- [ ] **NFR-008.3:** No connection pool exhaustion

**Test Scenarios:**
- [ ] Load test: 100 concurrent users
- [ ] Monitor response times
- [ ] Verify no errors

---

## Reliability Requirements

### NFR-010: System Uptime
**Target:** 99.9% (8.7 hours downtime/year)

- [ ] **NFR-010.1:** Uptime monitoring configured
- [ ] **NFR-010.2:** Uptime tracked monthly
- [ ] **NFR-010.3:** Downtime alerts configured
- [ ] **NFR-010.4:** Uptime >99.9% measured

**Test Scenarios:**
- [ ] Monitor uptime for 30 days
- [ ] Calculate uptime percentage
- [ ] Verify >99.9%

---

### NFR-011: Offline Mode Reliability
**Target:** No data loss

- [ ] **NFR-011.1:** Offline mode works reliably
- [ ] **NFR-011.2:** Transactions saved locally
- [ ] **NFR-011.3:** Sync works reliably
- [ ] **NFR-011.4:** Zero data loss verified

**Test Scenarios:**
- [ ] Process 100 transactions offline
- [ ] Reconnect and sync
- [ ] Verify all 100 transactions synced
- [ ] Verify zero data loss

---

### NFR-013: Daily Backups
**Target:** 30-day retention

- [ ] **NFR-013.1:** Automated daily backups configured
- [ ] **NFR-013.2:** Backups run daily at 2 AM
- [ ] **NFR-013.3:** 30-day retention enforced
- [ ] **NFR-013.4:** Backup restoration tested
- [ ] **NFR-013.5:** Backup verification automated

**Test Scenarios:**
- [ ] Verify backup runs daily
- [ ] Restore from backup
- [ ] Verify data integrity after restore
- [ ] Verify 30-day retention

---

## Security Requirements

### NFR-014: HTTPS Only
**Target:** TLS 1.3

- [ ] **NFR-014.1:** All traffic over HTTPS
- [ ] **NFR-014.2:** TLS 1.3 enabled
- [ ] **NFR-014.3:** HTTP redirects to HTTPS
- [ ] **NFR-014.4:** Valid SSL certificate
- [ ] **NFR-014.5:** Certificate auto-renewal configured

**Test Scenarios:**
- [ ] Access via HTTP (should redirect to HTTPS)
- [ ] Verify TLS 1.3 with SSL Labs
- [ ] Verify certificate valid

---

### NFR-015: JWT Authentication
**Target:** 15-min expiry

- [ ] **NFR-015.1:** JWT authentication implemented
- [ ] **NFR-015.2:** Token expiry: 15 minutes
- [ ] **NFR-015.3:** Refresh token works
- [ ] **NFR-015.4:** Invalid token rejected
- [ ] **NFR-015.5:** Expired token rejected
- [ ] **NFR-015.6:** Token stored securely (httpOnly cookie)

**Test Scenarios:**
- [ ] Login, verify JWT issued
- [ ] Wait 15 minutes, verify token expired
- [ ] Use refresh token
- [ ] Attempt request with invalid token (should fail)

---

### NFR-016: Role-Based Access Control
**Target:** 4 roles (cashier, manager, owner, admin)

- [ ] **NFR-016.1:** Cashier role: can process transactions
- [ ] **NFR-016.2:** Cashier role: cannot access reports
- [ ] **NFR-016.3:** Manager role: can process transactions
- [ ] **NFR-016.4:** Manager role: can access reports
- [ ] **NFR-016.5:** Manager role: can override prices
- [ ] **NFR-016.6:** Owner role: full access
- [ ] **NFR-016.7:** Admin role: system configuration access
- [ ] **NFR-016.8:** Role enforcement on API endpoints
- [ ] **NFR-016.9:** Role enforcement on UI

**Test Scenarios:**
- [ ] Login as cashier, verify limited access
- [ ] Login as manager, verify extended access
- [ ] Login as owner, verify full access
- [ ] Attempt unauthorized action (should fail)

---

### NFR-017: Payment Data Security
**Target:** PCI compliant

- [ ] **NFR-017.1:** Payment data tokenized
- [ ] **NFR-017.2:** No raw card data stored
- [ ] **NFR-017.3:** Stripe handles card data
- [ ] **NFR-017.4:** PAX terminal handles card data (P2PE)
- [ ] **NFR-017.5:** PCI compliance validated

**Test Scenarios:**
- [ ] Process card payment
- [ ] Verify no card data in database
- [ ] Verify only tokens stored
- [ ] PCI compliance audit

---

### NFR-018: Encryption at Rest
**Target:** AES-256

- [ ] **NFR-018.1:** Database encrypted at rest
- [ ] **NFR-018.2:** AES-256 encryption
- [ ] **NFR-018.3:** Encryption key managed securely
- [ ] **NFR-018.4:** Backups encrypted

**Test Scenarios:**
- [ ] Verify database encryption enabled
- [ ] Verify encryption algorithm (AES-256)
- [ ] Verify backup encryption

---

## Usability Requirements

### NFR-019: Cashier Training Time
**Target:** <30 minutes

- [ ] **NFR-019.1:** Training materials created
- [ ] **NFR-019.2:** Video tutorial available
- [ ] **NFR-019.3:** Quick reference guide available
- [ ] **NFR-019.4:** New cashier trained in <30 minutes
- [ ] **NFR-019.5:** Cashier can process transaction independently after training

**Test Scenarios:**
- [ ] Train new cashier
- [ ] Measure training time
- [ ] Verify <30 minutes
- [ ] Verify cashier can work independently

---

### NFR-020: Mobile Responsive
**Target:** Works on tablets and phones

- [ ] **NFR-020.1:** POS works on iPad
- [ ] **NFR-020.2:** POS works on Android tablet
- [ ] **NFR-020.3:** E-commerce works on iPhone
- [ ] **NFR-020.4:** E-commerce works on Android phone
- [ ] **NFR-020.5:** Touch targets >=44px
- [ ] **NFR-020.6:** Text readable on small screens
- [ ] **NFR-020.7:** No horizontal scrolling

**Test Scenarios:**
- [ ] Test POS on iPad
- [ ] Test POS on Android tablet
- [ ] Test e-commerce on iPhone
- [ ] Test e-commerce on Android phone
- [ ] Verify touch targets >=44px

---

### NFR-022: Animation Performance
**Target:** 60fps

- [ ] **NFR-022.1:** All animations 60fps
- [ ] **NFR-022.2:** No janky scrolling
- [ ] **NFR-022.3:** Smooth transitions
- [ ] **NFR-022.4:** No layout shift

**Test Scenarios:**
- [ ] Measure animation FPS
- [ ] Verify 60fps
- [ ] Test on low-end device

---

### NFR-023: Clear Error Messages
**Target:** No technical jargon

- [ ] **NFR-023.1:** All error messages user-friendly
- [ ] **NFR-023.2:** No stack traces shown to users
- [ ] **NFR-023.3:** Errors suggest solutions
- [ ] **NFR-023.4:** Errors logged for debugging

**Test Scenarios:**
- [ ] Trigger various errors
- [ ] Verify error messages clear
- [ ] Verify no technical jargon

---

## Maintainability Requirements

### NFR-024: Code Coverage
**Target:** >=80%

- [ ] **NFR-024.1:** Backend unit tests: >80% coverage
- [ ] **NFR-024.2:** Frontend unit tests: >80% coverage
- [ ] **NFR-024.3:** Integration tests: >80% coverage
- [ ] **NFR-024.4:** E2E tests: critical paths covered

**Test Scenarios:**
- [ ] Run coverage report
- [ ] Verify >80% coverage
- [ ] Identify gaps, add tests

---

### NFR-025: API Documentation
**Target:** OpenAPI/Swagger

- [ ] **NFR-025.1:** OpenAPI spec generated
- [ ] **NFR-025.2:** Swagger UI accessible
- [ ] **NFR-025.3:** All endpoints documented
- [ ] **NFR-025.4:** Request/response examples provided
- [ ] **NFR-025.5:** Authentication documented

**Test Scenarios:**
- [ ] Access Swagger UI
- [ ] Verify all endpoints listed
- [ ] Verify examples provided

---

### NFR-026: Monitoring
**Target:** Sentry or Loki + Grafana

- [ ] **NFR-026.1:** Error tracking configured (Sentry or Loki)
- [ ] **NFR-026.2:** Log aggregation configured (Loki)
- [ ] **NFR-026.3:** Metrics collection configured (Prometheus)
- [ ] **NFR-026.4:** Dashboards created (Grafana)
- [ ] **NFR-026.5:** Alerts configured
- [ ] **NFR-026.6:** Uptime monitoring configured (Uptime Kuma)

**Test Scenarios:**
- [ ] Trigger error, verify captured
- [ ] View logs in Grafana
- [ ] View metrics dashboard
- [ ] Test alert notification

---

### NFR-027: Structured Logging
**Target:** Searchable logs

- [ ] **NFR-027.1:** All logs structured (JSON)
- [ ] **NFR-027.2:** Logs include context (locationId, terminalId, userId)
- [ ] **NFR-027.3:** Logs searchable by field
- [ ] **NFR-027.4:** Log levels used correctly (info, warn, error)

**Test Scenarios:**
- [ ] Generate logs
- [ ] Search logs by locationId
- [ ] Search logs by error level
- [ ] Verify JSON format

---

# PART 3: INTEGRATION REQUIREMENTS

## Payment Integration

### Stripe Integration
**Priority:** P0 (Critical)

- [ ] **INT-001.1:** Stripe SDK installed
- [ ] **INT-001.2:** Stripe API keys configured
- [ ] **INT-001.3:** Payment intent creation works
- [ ] **INT-001.4:** Payment authorization works
- [ ] **INT-001.5:** Payment capture works
- [ ] **INT-001.6:** Refund works
- [ ] **INT-001.7:** Webhook configured
- [ ] **INT-001.8:** Webhook signature verification works
- [ ] **INT-001.9:** Error handling works
- [ ] **INT-001.10:** Idempotency works

**Test Scenarios:**
- [ ] Process payment with Stripe
- [ ] Process refund with Stripe
- [ ] Simulate payment declined
- [ ] Simulate network error
- [ ] Verify webhook received

---

### PAX Terminal Integration
**Priority:** P0 (Critical)

- [ ] **INT-002.1:** PAX SDK installed
- [ ] **INT-002.2:** PAX terminal registered
- [ ] **INT-002.3:** Terminal health check works
- [ ] **INT-002.4:** Sale transaction works
- [ ] **INT-002.5:** Refund transaction works
- [ ] **INT-002.6:** Void transaction works
- [ ] **INT-002.7:** EMV chip card works
- [ ] **INT-002.8:** Contactless (NFC) works
- [ ] **INT-002.9:** Magnetic stripe works
- [ ] **INT-002.10:** Fallback to Stripe works
- [ ] **INT-002.11:** Error handling works

**Test Scenarios:**
- [ ] Process payment with PAX (chip)
- [ ] Process payment with PAX (contactless)
- [ ] Process payment with PAX (stripe)
- [ ] Process refund with PAX
- [ ] Simulate PAX offline, verify fallback to Stripe

---

### Payment Router
**Priority:** P0 (Critical)

- [ ] **INT-003.1:** Payment router implemented
- [ ] **INT-003.2:** Automatic processor selection works
- [ ] **INT-003.3:** PAX preferred if available
- [ ] **INT-003.4:** Stripe fallback works
- [ ] **INT-003.5:** Offline mode fallback works
- [ ] **INT-003.6:** Processor health monitoring works

**Test Scenarios:**
- [ ] Process payment (PAX available, should use PAX)
- [ ] Process payment (PAX offline, should use Stripe)
- [ ] Process payment (both offline, should queue)

---

## Delivery Platform Integration

### Uber Eats Integration
**Priority:** P1 (High)

- [ ] **INT-004.1:** Uber Eats API credentials configured
- [ ] **INT-004.2:** Menu sync works
- [ ] **INT-004.3:** Webhook endpoint configured
- [ ] **INT-004.4:** Order ingestion works
- [ ] **INT-004.5:** Order status update works
- [ ] **INT-004.6:** Error handling works

**Test Scenarios:**
- [ ] Sync menu to Uber Eats
- [ ] Receive test order
- [ ] Update order status
- [ ] Verify driver dispatch

---

### DoorDash Integration
**Priority:** P1 (High)

- [ ] **INT-005.1:** DoorDash API credentials configured
- [ ] **INT-005.2:** Menu sync works
- [ ] **INT-005.3:** Webhook endpoint configured
- [ ] **INT-005.4:** Order ingestion works
- [ ] **INT-005.5:** Order status update works
- [ ] **INT-005.6:** Error handling works

**Test Scenarios:**
- [ ] Sync menu to DoorDash
- [ ] Receive test order
- [ ] Update order status
- [ ] Verify driver dispatch

---

## Back-Office Integration

### Transaction Sync
**Priority:** P0 (Critical)

- [ ] **INT-006.1:** Back-office API configured
- [ ] **INT-006.2:** Transaction sync works
- [ ] **INT-006.3:** Sync within 5 minutes
- [ ] **INT-006.4:** Retry logic works
- [ ] **INT-006.5:** Error handling works
- [ ] **INT-006.6:** Sync status tracking works

**Test Scenarios:**
- [ ] Process transaction, verify sync
- [ ] Simulate back-office offline, verify retry
- [ ] View sync status dashboard

---

### Product Sync
**Priority:** P1 (High)

- [ ] **INT-007.1:** Product sync (POS → back-office) works
- [ ] **INT-007.2:** Product sync (back-office → POS) works
- [ ] **INT-007.3:** Bi-directional sync works
- [ ] **INT-007.4:** Conflict resolution works (back-office wins)

**Test Scenarios:**
- [ ] Update product in POS, verify back-office updated
- [ ] Update product in back-office, verify POS updated
- [ ] Simultaneous update, verify conflict resolution

---

# PART 4: OBSERVABILITY REQUIREMENTS

## Logging

### Centralized Logging (Loki)
**Priority:** P1 (High)

- [ ] **OBS-001.1:** Loki installed and running
- [ ] **OBS-001.2:** Backend sends logs to Loki
- [ ] **OBS-001.3:** Frontend sends logs to Loki
- [ ] **OBS-001.4:** Logs include context (locationId, terminalId, userId)
- [ ] **OBS-001.5:** Logs searchable in Grafana
- [ ] **OBS-001.6:** Log retention: 30 days

**Test Scenarios:**
- [ ] Generate backend log, verify in Grafana
- [ ] Generate frontend log, verify in Grafana
- [ ] Search logs by locationId
- [ ] Search logs by error level

---

## Metrics

### Metrics Collection (Prometheus)
**Priority:** P1 (High)

- [ ] **OBS-002.1:** Prometheus installed and running
- [ ] **OBS-002.2:** Backend exposes /metrics endpoint
- [ ] **OBS-002.3:** Prometheus scrapes metrics
- [ ] **OBS-002.4:** Metrics visible in Grafana
- [ ] **OBS-002.5:** Key metrics tracked:
  - [ ] Transaction count
  - [ ] Transaction value
  - [ ] Payment success rate
  - [ ] API response time
  - [ ] Error rate
  - [ ] Active users

**Test Scenarios:**
- [ ] Process transaction, verify metrics updated
- [ ] View metrics in Grafana
- [ ] Create alert on high error rate

---

## Dashboards

### Grafana Dashboards
**Priority:** P1 (High)

- [ ] **OBS-003.1:** Grafana installed and running
- [ ] **OBS-003.2:** Loki data source configured
- [ ] **OBS-003.3:** Prometheus data source configured
- [ ] **OBS-003.4:** Log dashboard created
- [ ] **OBS-003.5:** Metrics dashboard created
- [ ] **OBS-003.6:** Error dashboard created
- [ ] **OBS-003.7:** Per-store dashboard created

**Test Scenarios:**
- [ ] View log dashboard
- [ ] View metrics dashboard
- [ ] View error dashboard
- [ ] Filter by store

---

## Uptime Monitoring

### Uptime Kuma
**Priority:** P1 (High)

- [ ] **OBS-004.1:** Uptime Kuma installed and running
- [ ] **OBS-004.2:** Monitors configured for all stores
- [ ] **OBS-004.3:** Health check interval: 5 minutes
- [ ] **OBS-004.4:** Slack notifications configured
- [ ] **OBS-004.5:** Email notifications configured
- [ ] **OBS-004.6:** Uptime >99.9% tracked

**Test Scenarios:**
- [ ] Add monitor for store
- [ ] Simulate downtime, verify alert
- [ ] View uptime history

---

# PART 5: DEPLOYMENT & OPERATIONS

## Deployment

### Production Deployment
**Priority:** P0 (Critical)

- [ ] **DEP-001.1:** Production environment configured
- [ ] **DEP-001.2:** Environment variables set
- [ ] **DEP-001.3:** Database migrations applied
- [ ] **DEP-001.4:** SSL certificate installed
- [ ] **DEP-001.5:** Domain configured
- [ ] **DEP-001.6:** Load balancer configured (if applicable)
- [ ] **DEP-001.7:** Firewall configured
- [ ] **DEP-001.8:** Backup configured
- [ ] **DEP-001.9:** Monitoring configured
- [ ] **DEP-001.10:** Health check endpoint works

**Test Scenarios:**
- [ ] Deploy to production
- [ ] Verify all services running
- [ ] Verify health check passes
- [ ] Process test transaction

---

### Rollback Plan
**Priority:** P0 (Critical)

- [ ] **DEP-002.1:** Rollback procedure documented
- [ ] **DEP-002.2:** Database rollback scripts available
- [ ] **DEP-002.3:** Application rollback tested
- [ ] **DEP-002.4:** Rollback time <15 minutes

**Test Scenarios:**
- [ ] Deploy new version
- [ ] Rollback to previous version
- [ ] Verify system functional after rollback

---

## Operations

### Backup & Recovery
**Priority:** P0 (Critical)

- [ ] **OPS-001.1:** Automated daily backups configured
- [ ] **OPS-001.2:** Backup retention: 30 days
- [ ] **OPS-001.3:** Backup restoration tested
- [ ] **OPS-001.4:** Recovery time objective (RTO): <1 hour
- [ ] **OPS-001.5:** Recovery point objective (RPO): <24 hours

**Test Scenarios:**
- [ ] Verify backup runs daily
- [ ] Restore from backup
- [ ] Verify data integrity
- [ ] Measure restoration time

---

### Incident Response
**Priority:** P0 (Critical)

- [ ] **OPS-002.1:** Incident response plan documented
- [ ] **OPS-002.2:** On-call rotation configured
- [ ] **OPS-002.3:** Escalation path defined
- [ ] **OPS-002.4:** Runbooks created for common issues
- [ ] **OPS-002.5:** Post-mortem template available

**Test Scenarios:**
- [ ] Simulate incident
- [ ] Follow incident response plan
- [ ] Verify escalation works
- [ ] Conduct post-mortem

---

# PART 6: SUCCESS METRICS

## Business Metrics

- [ ] **MET-001:** 10+ stores using the system (12 months)
- [ ] **MET-002:** $15K+ MRR (monthly recurring revenue)
- [ ] **MET-003:** <5% churn rate
- [ ] **MET-004:** 50%+ win rate vs NRS Plus
- [ ] **MET-005:** 4.5+ star customer rating

## Technical Metrics

- [ ] **MET-006:** 99.9% uptime
- [ ] **MET-007:** <2 second checkout time (p95)
- [ ] **MET-008:** <500ms API response time (p95)
- [ ] **MET-009:** <1 second page load time
- [ ] **MET-010:** <50ms vector search

## User Metrics

- [ ] **MET-011:** 30+ transactions/hour per terminal
- [ ] **MET-012:** <30 minute training time for new cashiers
- [ ] **MET-013:** 20%+ online sales (within 2 months)
- [ ] **MET-014:** 30%+ loyalty enrollment (within 3 months)

---

# SUMMARY

## Overall Progress

### Functional Requirements
- **Total:** 100+ requirements
- **Completed:** ___
- **In Progress:** ___
- **Not Started:** ___
- **Completion:** ___%

### Non-Functional Requirements
- **Total:** 50+ requirements
- **Completed:** ___
- **In Progress:** ___
- **Not Started:** ___
- **Completion:** ___%

### Integration Requirements
- **Total:** 20+ requirements
- **Completed:** ___
- **In Progress:** ___
- **Not Started:** ___
- **Completion:** ___%

### Observability Requirements
- **Total:** 15+ requirements
- **Completed:** ___
- **In Progress:** ___
- **Not Started:** ___
- **Completion:** ___%

---

## Critical Blockers

List any critical blockers preventing progress:

1. ___
2. ___
3. ___

---

## Next Steps

1. ___
2. ___
3. ___

---

**Document Version:** 1.0  
**Last Updated:** January 3, 2026  
**Maintained By:** QA Team  
**Review Frequency:** Weekly

---

**Notes:**
- This checklist should be reviewed weekly
- Update completion status as requirements are implemented
- Add new requirements as they are discovered
- Mark blockers and escalate immediately
- Use this as the single source of truth for testing progress



