# Known Limitations

## Overview

This document lists features that are planned but not yet implemented, known workarounds, and current system limitations.

---

## Missing Features

### Delivery Platform Integration

**Status:** Not Implemented

**Description:**
- Uber Eats integration
- DoorDash integration
- Automatic menu sync
- Order webhook handling

**Workaround:**
- Manual order entry from delivery platforms
- Use tablet/phone to view delivery orders
- Manually update inventory after delivery orders

**Priority:** Medium (Phase 2)

**Estimated Implementation:** 2-3 weeks

---

### Hardware Security Module (HSM)

**Status:** Not Implemented

**Description:**
- HSM for encryption key storage
- Hardware-based key protection
- FIPS 140-2 compliance

**Workaround:**
- Software-based encryption (AES-256)
- Secure key storage in environment variables
- Regular key rotation

**Priority:** Low (Enterprise feature)

**Notes:**
- Current encryption is sufficient for liquor stores
- HSM adds significant cost and complexity
- Consider for enterprise deployments only

---

### Mobile Manager App

**Status:** Not Implemented

**Description:**
- Native iOS/Android app for store managers
- Real-time notifications
- Remote inventory management
- Sales dashboard

**Workaround:**
- Use web interface on mobile browser
- Responsive design works on tablets/phones
- Email notifications for critical alerts

**Priority:** Medium (Phase 3)

**Estimated Implementation:** 4-6 weeks

---

### Advanced Analytics

**Status:** Partially Implemented

**Description:**
- Predictive inventory management
- Customer behavior analysis
- Sales forecasting
- AI-powered recommendations

**Current Status:**
- Basic reporting available
- Sales by product/category
- Inventory levels
- Transaction history

**Workaround:**
- Export data to Excel/Google Sheets
- Use third-party analytics tools
- Manual analysis

**Priority:** Medium (Phase 3)

---

### Multi-Store Management

**Status:** Partially Implemented

**Description:**
- Centralized dashboard for multiple stores
- Cross-store inventory transfer
- Consolidated reporting
- Chain-wide analytics

**Current Status:**
- Single store fully supported
- Multiple stores require separate instances
- No cross-store features

**Workaround:**
- Deploy separate instance per store
- Manual consolidation of reports
- Use external tools for chain management

**Priority:** High (Phase 2)

**Estimated Implementation:** 3-4 weeks

---

### Loyalty Program

**Status:** Not Implemented

**Description:**
- Customer loyalty points
- Rewards program
- Automatic discounts
- Member tiers

**Workaround:**
- Manual discount entry
- Track loyalty externally
- Use third-party loyalty platform

**Priority:** Low (Phase 4)

---

## Current Limitations

### Performance

**Limitation:** Not optimized for >10,000 products

**Details:**
- Product search may slow down with large catalogs
- Inventory queries not fully optimized
- No pagination on some endpoints

**Workaround:**
- Use product categories to organize
- Implement search filters
- Regular database maintenance

**Impact:** Low for typical liquor stores (500-2000 products)

**Fix Planned:** Phase 2 (database optimization)

---

### Offline Mode

**Limitation:** Limited offline functionality

**Details:**
- Frontend can cache products
- Transactions queue for sync
- No offline inventory updates
- No offline user management

**Workaround:**
- Ensure stable internet connection
- Use mobile hotspot as backup
- Process critical transactions first

**Impact:** Medium if internet is unreliable

**Fix Planned:** Phase 2 (enhanced offline mode)

---

### Reporting

**Limitation:** Limited report customization

**Details:**
- Pre-defined report templates only
- No custom report builder
- Limited date range options
- No scheduled reports

**Workaround:**
- Export data to CSV
- Use Excel/Google Sheets for custom reports
- API available for custom integrations

**Impact:** Low for basic needs, Medium for advanced users

**Fix Planned:** Phase 3 (report builder)

---

### User Management

**Limitation:** Basic role-based access control

**Details:**
- Only 3 roles: admin, manager, cashier
- No custom permission sets
- No department-based access
- No time-based access restrictions

**Workaround:**
- Use existing roles
- Create multiple accounts if needed
- Manual access control procedures

**Impact:** Low for small stores

**Fix Planned:** Phase 3 (advanced RBAC)

---

### Inventory Management

**Limitation:** No automatic reordering

**Details:**
- Manual purchase orders
- No supplier integration
- No automatic low-stock alerts
- No demand forecasting

**Workaround:**
- Set up low-stock reports
- Manual monitoring
- Use external inventory management tools

**Impact:** Medium

**Fix Planned:** Phase 2 (basic automation)

---

## Known Issues

### Browser Compatibility

**Issue:** Limited support for older browsers

**Affected:**
- Internet Explorer (not supported)
- Safari < 14 (partial support)
- Chrome < 90 (partial support)

**Workaround:**
- Use modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Update browser to latest version

**Fix:** Not planned (modern browsers only)

---

### Barcode Scanner

**Issue:** Some USB scanners require configuration

**Details:**
- Scanner must emulate keyboard input
- Some scanners need driver installation
- Wireless scanners may have lag

**Workaround:**
- Use keyboard-emulation mode
- Test scanner before purchase
- Recommended models: Zebra DS2208, Honeywell Voyager 1200g

**Fix:** Documentation update (Phase 1)

---

### Receipt Printer

**Issue:** Limited printer support

**Details:**
- Supports ESC/POS protocol only
- USB and network printers only
- No Bluetooth printer support

**Workaround:**
- Use compatible printers (Epson TM-T20, Star TSP143)
- Use network printing for flexibility
- Email receipts as alternative

**Fix:** Bluetooth support (Phase 3)

---

### Tax Calculation

**Issue:** Manual tax rate configuration

**Details:**
- No automatic tax rate lookup
- Must manually configure state/county/city rates
- No automatic tax rate updates

**Workaround:**
- Configure tax rates during setup
- Update manually when rates change
- Use tax calculation service API (future)

**Fix:** Tax rate API integration (Phase 2)

---

## Workarounds Summary

### Quick Reference

| Limitation | Workaround | Priority |
|------------|------------|----------|
| No delivery integration | Manual order entry | Medium |
| Limited offline mode | Stable internet + backup | High |
| No custom reports | Export to CSV/Excel | Low |
| No auto reordering | Manual monitoring | Medium |
| Limited multi-store | Separate instances | High |
| No loyalty program | Manual tracking | Low |
| Basic user roles | Use existing roles | Low |
| No mobile app | Use web on mobile | Medium |

---

## Feature Requests

To request a feature or report an issue:

1. Check if already listed above
2. Check GitHub issues
3. Create new issue with:
   - Clear description
   - Use case
   - Priority level
   - Proposed workaround

---

## Roadmap

### Phase 1 (Current) - Core POS
- ✅ Product management
- ✅ Inventory tracking
- ✅ Checkout & payments
- ✅ User authentication
- ✅ Basic reporting
- ✅ Age verification
- ✅ Audit logging

### Phase 2 (Next 3 months)
- Multi-store management
- Enhanced offline mode
- Delivery platform integration
- Inventory automation
- Performance optimization
- Tax rate API integration

### Phase 3 (3-6 months)
- Mobile manager app
- Advanced analytics
- Custom report builder
- Advanced RBAC
- Bluetooth printer support

### Phase 4 (6-12 months)
- Loyalty program
- Customer portal
- E-commerce integration
- Advanced forecasting
- AI recommendations

---

## Getting Help

### Documentation
- [Setup Guide](setup.md)
- [Configuration Guide](configuration.md)
- [Deployment Guide](deployment.md)
- [Architecture Overview](architecture.md)

### Support
- GitHub Issues
- Email support
- Community forum

---

## Contributing

Want to help implement missing features?

1. Check roadmap above
2. Review architecture documentation
3. Create GitHub issue to discuss
4. Submit pull request

---

**Last Updated:** January 3, 2026
**Version:** 1.0

