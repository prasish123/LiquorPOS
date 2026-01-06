# 🧪 QA TESTING GUIDE - Florida Liquor Store POS

**Date:** January 5, 2026  
**Status:** Ready for Testing  
**Application:** http://localhost:5173  
**API:** http://localhost:3000

---

## 🚀 QUICK START

### 1. Verify Application is Running

```powershell
# Check frontend
Start-Process "http://localhost:5173"

# Check backend health
Invoke-WebRequest -Uri "http://localhost:3000/health"
```

**Expected Results:**
- ✅ Frontend opens in browser
- ✅ Backend returns `{"status":"ok"}`

---

## 👥 TEST ACCOUNTS

### Cashier Account
- **Username:** `cashier@liquorpos.com`
- **Password:** `cashier123`
- **Role:** Cashier
- **Permissions:** Sales, Age Verification, Payments

### Manager Account
- **Username:** `manager@liquorpos.com`
- **Password:** `manager123`
- **Role:** Manager
- **Permissions:** Reports, Inventory, Price Overrides

### Admin Account
- **Username:** `admin@liquorpos.com`
- **Password:** `admin123`
- **Role:** Admin
- **Permissions:** Full System Access

---

## 📋 TEST SCENARIOS

### Scenario 1: Cashier - Complete Sale Flow

**User Story:** US-001 - Process a sale with age verification

**Steps:**
1. Login as cashier
2. Navigate to POS screen
3. Scan/enter product barcode
4. Verify age (21+ for liquor)
5. Process payment (cash or card)
6. Print receipt
7. Complete transaction

**Expected Results:**
- ✅ Product added to cart
- ✅ Age verification prompt appears
- ✅ Payment processes successfully
- ✅ Receipt generated
- ✅ Transaction saved to database

**PRD Compliance:**
- Age verification logged
- Florida 7% tax applied
- Audit trail created

---

### Scenario 2: Cashier - Offline Mode

**User Story:** US-004 - Handle offline sales

**Steps:**
1. Login as cashier
2. Disconnect internet (or simulate offline)
3. Process a sale
4. Complete payment
5. Reconnect internet
6. Verify sync

**Expected Results:**
- ✅ Sale completes offline
- ✅ Transaction queued for sync
- ✅ Auto-sync when online
- ✅ No data loss

**PRD Compliance:**
- Offline queue working
- Auto-sync functional
- Data integrity maintained

---

### Scenario 3: Manager - View Reports

**User Story:** US-010 - Access real-time reports

**Steps:**
1. Login as manager
2. Navigate to Reports
3. View daily sales
4. Check inventory levels
5. Review low stock alerts

**Expected Results:**
- ✅ Reports load quickly (<500ms)
- ✅ Data is accurate
- ✅ Charts render correctly
- ✅ Export functionality works

**PRD Compliance:**
- Real-time data
- Performance targets met
- Role-based access enforced

---

### Scenario 4: Manager - Inventory Management

**User Story:** US-011 - Manage inventory

**Steps:**
1. Login as manager
2. Navigate to Inventory
3. Update stock levels
4. Set low stock threshold
5. Verify alerts

**Expected Results:**
- ✅ Stock updates save
- ✅ Alerts trigger correctly
- ✅ Changes sync to database
- ✅ Audit log created

**PRD Compliance:**
- Inventory tracking accurate
- Alerts functional
- Audit trail complete

---

### Scenario 5: Admin - User Management

**User Story:** US-012 - Manage users

**Steps:**
1. Login as admin
2. Navigate to Users
3. Create new user
4. Assign role
5. Set permissions
6. Verify access

**Expected Results:**
- ✅ User created successfully
- ✅ Role assigned correctly
- ✅ Permissions enforced
- ✅ Login works

**PRD Compliance:**
- Role-based access control
- Security enforced
- Audit trail created

---

### Scenario 6: Admin - System Configuration

**User Story:** US-013 - Configure system

**Steps:**
1. Login as admin
2. Navigate to Settings
3. Update tax rate
4. Configure integrations
5. Set business rules
6. Save changes

**Expected Results:**
- ✅ Settings save correctly
- ✅ Changes apply immediately
- ✅ Validation works
- ✅ Audit log created

**PRD Compliance:**
- Configuration management
- Validation enforced
- Changes tracked

---

## 🔒 SECURITY TESTING

### Test 1: Role-Based Access Control

**Steps:**
1. Login as cashier
2. Try to access admin pages
3. Try to access manager reports
4. Verify access denied

**Expected Results:**
- ✅ Cashier cannot access admin pages
- ✅ Cashier cannot access manager reports
- ✅ Appropriate error messages
- ✅ No unauthorized access

---

### Test 2: Age Verification Compliance

**Steps:**
1. Login as cashier
2. Add liquor product to cart
3. Verify age verification required
4. Complete verification
5. Check audit log

**Expected Results:**
- ✅ Age verification mandatory
- ✅ Cannot bypass verification
- ✅ Verification logged
- ✅ Audit trail complete

---

### Test 3: Payment Security

**Steps:**
1. Process card payment
2. Verify card details encrypted
3. Check transaction log
4. Verify PCI compliance

**Expected Results:**
- ✅ Card details encrypted
- ✅ No plain text storage
- ✅ Secure transmission
- ✅ Audit trail complete

---

## ⚡ PERFORMANCE TESTING

### Test 1: Checkout Speed

**Requirement:** <2 seconds per transaction

**Steps:**
1. Start timer
2. Scan product
3. Process payment
4. Complete transaction
5. Stop timer

**Expected Results:**
- ✅ Total time <2 seconds
- ✅ No lag or delays
- ✅ Smooth user experience

---

### Test 2: API Response Time

**Requirement:** <500ms average

**Steps:**
1. Use browser DevTools
2. Monitor network requests
3. Measure API response times
4. Calculate average

**Expected Results:**
- ✅ Average response <500ms
- ✅ No timeouts
- ✅ Consistent performance

---

### Test 3: Page Load Time

**Requirement:** <1 second

**Steps:**
1. Clear browser cache
2. Load application
3. Measure load time
4. Test multiple pages

**Expected Results:**
- ✅ Initial load <1 second
- ✅ Page transitions smooth
- ✅ No performance issues

---

## 🔌 INTEGRATION TESTING

### Test 1: Database Persistence

**Steps:**
1. Create transaction
2. Restart application
3. Verify data persists
4. Check data integrity

**Expected Results:**
- ✅ Data persists after restart
- ✅ No data loss
- ✅ Data integrity maintained

---

### Test 2: Stripe Payment Gateway

**Steps:**
1. Process card payment
2. Verify Stripe API call
3. Check payment status
4. Verify transaction record

**Expected Results:**
- ✅ Payment processes successfully
- ✅ Stripe integration works
- ✅ Transaction recorded
- ✅ Receipt generated

---

### Test 3: Offline Sync

**Steps:**
1. Go offline
2. Create transactions
3. Go online
4. Verify auto-sync

**Expected Results:**
- ✅ Transactions queue offline
- ✅ Auto-sync when online
- ✅ No data loss
- ✅ Sync status visible

---

## 📊 COMPLIANCE TESTING

### Test 1: Age Verification Logging

**Steps:**
1. Complete age verification
2. Check audit log
3. Verify all details logged
4. Test log retention

**Expected Results:**
- ✅ Verification logged
- ✅ Timestamp recorded
- ✅ User ID captured
- ✅ Product ID captured

---

### Test 2: Tax Calculation

**Steps:**
1. Add products to cart
2. Verify tax calculation
3. Check tax rate (7% Florida)
4. Verify receipt shows tax

**Expected Results:**
- ✅ Tax calculated correctly
- ✅ 7% rate applied
- ✅ Tax shown on receipt
- ✅ Tax recorded in database

---

### Test 3: Audit Trail

**Steps:**
1. Perform various actions
2. Check audit log
3. Verify all actions logged
4. Test log search/filter

**Expected Results:**
- ✅ All actions logged
- ✅ Timestamps accurate
- ✅ User attribution correct
- ✅ Search/filter works

---

## 🐛 BUG REPORTING TEMPLATE

### Bug Report Format

```markdown
**Bug ID:** BUG-001
**Severity:** Critical/High/Medium/Low
**Status:** New

**Title:** [Brief description]

**Environment:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Browser: [Chrome/Firefox/Edge]
- OS: Windows 11

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots:**
[Attach screenshots]

**Console Errors:**
[Paste any console errors]

**Additional Notes:**
[Any other relevant information]
```

---

## ✅ TEST COMPLETION CHECKLIST

### Functional Testing
- [ ] Login/Logout
- [ ] Role-based access
- [ ] Cashier workflows
- [ ] Manager workflows
- [ ] Admin workflows
- [ ] Payment processing
- [ ] Offline mode
- [ ] Age verification

### Integration Testing
- [ ] Database persistence
- [ ] Stripe integration
- [ ] Offline sync
- [ ] API endpoints

### Security Testing
- [ ] Access control
- [ ] Age verification
- [ ] Payment security
- [ ] Data encryption

### Performance Testing
- [ ] Checkout speed
- [ ] API response time
- [ ] Page load time
- [ ] Concurrent users

### Compliance Testing
- [ ] Age verification logging
- [ ] Tax calculation
- [ ] Audit trails
- [ ] Data retention

---

## 📞 SUPPORT CONTACTS

**Development Team:** Available for bug fixes  
**QA Lead:** Coordinate testing efforts  
**Product Manager:** Clarify requirements  
**Reliability Engineer:** Performance issues

---

## 🎯 SUCCESS CRITERIA

### Pass Criteria
- ✅ All critical user flows work
- ✅ No blocking bugs
- ✅ Performance targets met
- ✅ Security requirements met
- ✅ Compliance features work
- ✅ Integration points functional

### Fail Criteria
- ❌ Critical bugs found
- ❌ Performance targets missed
- ❌ Security vulnerabilities
- ❌ Compliance failures
- ❌ Data loss or corruption

---

## 📝 FINAL SIGN-OFF

After completing all tests:

```markdown
**QA Testing Complete**

**Date:** [Date]
**Tester:** [Name]
**Result:** PASS/FAIL

**Summary:**
- Total Tests: [Number]
- Passed: [Number]
- Failed: [Number]
- Blocked: [Number]

**Critical Issues:** [List or None]

**Recommendation:** APPROVE/REJECT for production

**Signature:** [Name]
```

---

**READY TO BEGIN TESTING!**

Start with Scenario 1 and work through each test systematically.

Good luck! 🚀


