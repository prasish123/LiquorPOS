# Minimal Files to Update - Test Implementation

**Phase:** 0 - Critical Unit Tests  
**Date:** January 4, 2026

---

## Files to Create/Update

### Test Files (3 files)

#### 1. Payment Router Service Tests
**File:** `backend/src/payments/payment-router.service.spec.ts`  
**Action:** CREATE NEW  
**Lines:** ~500  
**Tests:** 20+  
**Purpose:** Test payment routing logic, fallbacks, and error handling

#### 2. Receipt Service Tests
**File:** `backend/src/receipts/receipt.service.spec.ts`  
**Action:** CREATE NEW  
**Lines:** ~600  
**Tests:** 25+  
**Purpose:** Test receipt generation, formatting, and reprinting

#### 3. Orders Service Tests
**File:** `backend/src/orders/orders.service.spec.ts`  
**Action:** UPDATE EXISTING  
**Lines:** ~400 (was 39)  
**Tests:** 15+  
**Purpose:** Test CRUD operations, pagination, filtering, summaries

---

## Documentation Files (Optional but Recommended)

### Analysis Documents
1. `TEST_GAP_ANALYSIS.md` - Full analysis with risk classification
2. `TEST_GAP_SUMMARY.md` - Executive summary
3. `TEST_GAP_CHECKLIST.md` - Implementation checklist

### Implementation Documents
4. `TEST_IMPLEMENTATION_SUMMARY.md` - Implementation details
5. `VERIFICATION_INSTRUCTIONS.md` - Verification guide
6. `IMPLEMENTATION_COMPLETE.md` - Completion summary
7. `DELIVERABLES_SUMMARY.md` - Deliverables list

---

## Verification Command

```bash
cd backend
npm run test:cov
```

**Expected:** All tests pass, coverage >50%

---

## Summary

**Minimal Files:** 3 test files  
**Total Lines:** ~1,500 lines of test code  
**Test Cases:** 60+ tests  
**Coverage Impact:** +13-18% (37% → 50%+)

---

**Status:** ✅ All files created/updated  
**Next:** Run verification command

