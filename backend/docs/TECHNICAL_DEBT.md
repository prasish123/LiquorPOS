# Technical Debt & Future Enhancements

This document tracks technical debt items and planned enhancements that were previously marked as TODO comments in the codebase. Each item should be tracked in your issue tracker (GitHub Issues, Jira, etc.) with appropriate priority and timeline.

---

## Active Technical Debt Items

### TD-001: Implement Promotional Logic in Pricing Agent

**Location:** `src/orders/agents/pricing.agent.ts:120` (method: `applyPromotions`)  
**Priority:** 🟡 Medium  
**Effort:** 3-5 days  
**Created:** 2026-01-02  
**Status:** Planned

**Description:**

The `PricingAgent.applyPromotions()` method currently returns items unchanged. Full promotional logic needs to be implemented to support:

1. **Buy X Get Y Free Promotions**
   - Example: Buy 2 bottles, get 1 free
   - Requires promotion rules engine
   - Must apply to lowest-priced item

2. **Loyalty Discounts**
   - Customer tier-based discounts (Bronze, Silver, Gold, Platinum)
   - Points-based rewards
   - Birthday month specials
   - Integration with customer loyalty system

3. **Seasonal Promotions**
   - Holiday specials
   - End-of-season clearance
   - Time-limited offers
   - Category-specific promotions

**Technical Requirements:**

- [ ] Design promotion rules schema
- [ ] Create `Promotion` database model
- [ ] Implement promotion rules engine
- [ ] Add promotion validation logic
- [ ] Support stackable vs non-stackable promotions
- [ ] Add promotion conflict resolution
- [ ] Implement promotion expiry logic
- [ ] Add audit logging for applied promotions
- [ ] Create promotion management API
- [ ] Add unit tests (target: 90% coverage)
- [ ] Add integration tests for promotion scenarios
- [ ] Document promotion rules in user guide

**Database Schema (Proposed):**

```prisma
model Promotion {
  id          String   @id @default(uuid())
  name        String
  description String?
  type        PromotionType // BUY_X_GET_Y, PERCENTAGE_OFF, FIXED_AMOUNT, LOYALTY
  rules       Json     // Flexible rules structure
  startDate   DateTime
  endDate     DateTime
  active      Boolean  @default(true)
  priority    Int      @default(0)
  stackable   Boolean  @default(false)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum PromotionType {
  BUY_X_GET_Y
  PERCENTAGE_OFF
  FIXED_AMOUNT
  LOYALTY_DISCOUNT
  SEASONAL
}
```

**Implementation Steps:**

1. **Phase 1: Foundation (1-2 days)**
   - Create `Promotion` model in Prisma schema
   - Generate and apply migration
   - Create `PromotionService` with CRUD operations
   - Add promotion management endpoints

2. **Phase 2: Rules Engine (2-3 days)**
   - Implement promotion rules parser
   - Create promotion evaluation logic
   - Add promotion conflict resolution
   - Implement stackable promotion logic

3. **Phase 3: Integration (1-2 days)**
   - Integrate with `PricingAgent.applyPromotions()`
   - Add promotion audit logging
   - Update order processing flow
   - Add promotion details to receipts

4. **Phase 4: Testing & Documentation (1 day)**
   - Write unit tests
   - Write integration tests
   - Document promotion API
   - Create user guide for promotion management

**Example Usage (After Implementation):**

```typescript
// Apply promotions to order items
const promotedItems = await pricingAgent.applyPromotions(
  items,
  customerId, // For loyalty discounts
);

// Result includes applied promotions
// Item with promotion:
{
  sku: 'WINE-001',
  quantity: 3,
  price: 19.99,
  originalPrice: 19.99,
  discount: 19.99, // Third item free
  promotions: [
    {
      id: 'promo-123',
      name: 'Buy 2 Get 1 Free',
      type: 'BUY_X_GET_Y',
      appliedDiscount: 19.99,
    }
  ]
}
```

**Dependencies:**
- Customer loyalty system (if implementing loyalty discounts)
- Product categorization (for category-specific promotions)
- Audit logging system (already implemented)

**Risks:**
- Promotion conflicts (multiple promotions on same item)
- Performance impact (complex rule evaluation)
- Edge cases (fractional quantities, returns with promotions)

**Acceptance Criteria:**
- [ ] Can create, update, delete promotions via API
- [ ] Buy X Get Y promotions work correctly
- [ ] Loyalty discounts apply based on customer tier
- [ ] Seasonal promotions activate/deactivate automatically
- [ ] Promotion conflicts are resolved correctly
- [ ] Non-stackable promotions are enforced
- [ ] Audit logs record all applied promotions
- [ ] Performance: < 50ms overhead per order
- [ ] Test coverage: > 90%
- [ ] Documentation complete

**Related Issues:**
- None (first promotion-related issue)

**Notes:**
- Consider using a rules engine library (e.g., `json-rules-engine`)
- Ensure promotion logic is testable and maintainable
- Plan for A/B testing of promotions in future
- Consider promotion analytics and reporting

---

## Completed Technical Debt Items

### ✅ TD-000: Example Completed Item

**Completed:** 2026-01-01  
**Resolution:** Implemented in PR #123

---

## How to Use This Document

### Adding New Technical Debt

When you identify technical debt or a future enhancement:

1. **Remove the TODO comment from code**
2. **Add an entry to this document** with:
   - Unique ID (TD-XXX)
   - Location in codebase
   - Priority (🔴 High, 🟡 Medium, 🟢 Low)
   - Effort estimate
   - Detailed description
   - Technical requirements
   - Implementation steps
   - Acceptance criteria

3. **Create a ticket in your issue tracker** (GitHub Issues, Jira, etc.)
   - Link to this document
   - Assign priority and milestone
   - Add relevant labels

4. **Track progress** in your issue tracker

### Completing Technical Debt

When technical debt is resolved:

1. **Move the item** from "Active" to "Completed" section
2. **Add completion date** and resolution details
3. **Close the ticket** in your issue tracker
4. **Update related documentation**

### Prioritization Guidelines

**🔴 High Priority:**
- Security vulnerabilities
- Data integrity issues
- Performance bottlenecks
- Blocking future features

**🟡 Medium Priority:**
- Feature enhancements
- Code quality improvements
- Technical improvements
- Non-critical bugs

**🟢 Low Priority:**
- Nice-to-have features
- Code cleanup
- Documentation improvements
- Optimization opportunities

---

## Technical Debt Metrics

### Current Status (as of 2026-01-02)

| Metric | Value |
|--------|-------|
| Total Active Items | 1 |
| High Priority | 0 |
| Medium Priority | 1 |
| Low Priority | 0 |
| Total Estimated Effort | 3-5 days |

### Historical Trends

| Date | Active Items | Completed This Month |
|------|--------------|----------------------|
| 2026-01-02 | 1 | 0 |

---

## Review Schedule

This document should be reviewed:
- **Weekly:** During sprint planning
- **Monthly:** During retrospectives
- **Quarterly:** For strategic planning

---

## Related Documentation

- [Development Roadmap](./ROADMAP.md) (if exists)
- [Architecture Decision Records](./ADR/) (if exists)
- [Contributing Guide](../CONTRIBUTING.md) (if exists)

---

**Last Updated:** 2026-01-02  
**Maintained By:** Development Team  
**Review Frequency:** Weekly

