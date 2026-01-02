# Alcohol Compliance & Regulatory Guide

## Overview

This guide provides comprehensive information about the alcohol compliance and regulatory features implemented in the Liquor POS system. The system ensures adherence to state-specific alcohol regulations, age verification requirements, and audit trail maintenance.

---

## Table of Contents

1. [State-Specific Regulations](#state-specific-regulations)
2. [Age Verification](#age-verification)
3. [ID Scanning Integration](#id-scanning-integration)
4. [Compliance Reporting](#compliance-reporting)
5. [Audit Trail](#audit-trail)
6. [API Reference](#api-reference)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## State-Specific Regulations

### Supported States

The system currently supports comprehensive regulations for:
- **Florida (FL)** - Primary implementation
- **California (CA)**
- **Texas (TX)**
- **New York (NY)**
- **Pennsylvania (PA)**

### Regulation Components

Each state regulation includes:

#### 1. Minimum Age Requirements
- All states enforce 21+ age requirement
- Automatic age calculation from date of birth
- Real-time validation at point of sale

#### 2. Sale Hours
- Day-specific operating hours
- Automatic time-based restrictions
- Sunday and holiday limitations

#### 3. Product Type Restrictions
- **Beer & Wine**: Varying restrictions by state
- **Spirits**: More stringent controls
- **Sunday Sales**: State-specific rules

#### 4. ID Requirements
- Acceptable ID types per state
- ID scanning requirements (e.g., NYC)
- Validation rules

#### 5. Tax Rates
- Beer (per gallon)
- Wine (per gallon)
- Spirits (per gallon)

### Example: Florida Regulations

```typescript
{
  state: 'Florida',
  stateCode: 'FL',
  minimumAge: 21,
  requiresIdScan: false, // Recommended but not required
  saleHours: {
    monday: { start: '07:00', end: '24:00' },
    // ... other days
  },
  restrictions: {
    spirits: ['Must be sold in licensed liquor stores'],
    sundaySales: true,
    holidayRestrictions: [],
  },
  taxRates: {
    beer: 0.48,
    wine: 2.25,
    spirits: 6.50,
  }
}
```

---

## Age Verification

### Verification Methods

#### 1. Manual Verification
- Cashier visually inspects ID
- Enters verification confirmation
- Suitable for low-volume operations

#### 2. ID Scanner
- Hardware scanner reads barcode
- Automatic data extraction
- Required in some jurisdictions (e.g., NYC)

#### 3. Mobile App
- Customer scans own ID
- Pre-verification for online orders
- Reduces checkout time

### Verification Process

```typescript
// 1. Check if items require age verification
const result = await complianceAgent.verifyCompliance(
  items,
  locationId,
  customerId,
  ageVerified,
  idVerification
);

// 2. Handle result
if (!result.saleAllowed) {
  throw new ForbiddenException(result.saleRestrictionReason);
}

// 3. Log compliance event
await complianceAgent.logComplianceEvent({
  transactionId,
  locationId,
  stateCode: result.stateCode,
  ageVerified: result.ageVerified,
  // ... other details
});
```

### Age Calculation

The system calculates age precisely:
- Accounts for leap years
- Considers exact birth date
- Handles edge cases (birthday today, etc.)

---

## ID Scanning Integration

### Supported Hardware

#### 1. IDScan.net Devices
- Professional-grade scanners
- API integration
- Real-time validation

#### 2. Generic PDF417 Scanners
- Reads 2D barcodes on IDs
- AAMVA standard format
- Works with most hardware

#### 3. Honeywell/Tokenworks
- Retail-grade scanners
- USB/Bluetooth connectivity
- Cost-effective solution

### Integration Setup

```typescript
import { IDScannerService } from './compliance/id-scanner.interface';

// Initialize scanner
const scannerService = new IDScannerService();
await scannerService.initialize({
  deviceType: 'idscan',
  apiKey: process.env.IDSCAN_API_KEY,
  apiEndpoint: 'https://api.idscan.net/v1',
  timeout: 5000,
  retryAttempts: 3,
  validateExpiration: true,
  validateAge: true,
  minimumAge: 21,
  storeRawData: true,
  encryptData: true,
});

// Scan ID
const result = await scannerService.scanID();

if (result.success && result.data) {
  // Use scanned data
  const idData = result.data;
  console.log(`Customer: ${idData.firstName} ${idData.lastName}`);
  console.log(`Age: ${idData.age}`);
  console.log(`ID Expires: ${idData.expirationDate}`);
}
```

### Scanned Data Structure

```typescript
interface ScannedIDData {
  // Personal
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  age: number;

  // ID Details
  idNumber: string;
  idType: 'drivers_license' | 'state_id' | 'passport' | 'military_id';
  issuingState: string;
  expirationDate: Date;

  // Address
  address: string;
  city: string;
  state: string;
  zipCode: string;

  // Validation
  isExpired: boolean;
  isValid: boolean;
  validationErrors: string[];

  // Metadata
  scanTimestamp: Date;
  scannerType: string;
}
```

---

## Compliance Reporting

### Generate Reports

```typescript
const report = await complianceAgent.generateComplianceReport(
  locationId,
  startDate,
  endDate
);

console.log('Summary:', report.summary);
// {
//   totalTransactions: 150,
//   ageVerifiedTransactions: 148,
//   idScannedTransactions: 145,
//   violations: 2
// }

console.log('Details:', report.details);
// Array of detailed compliance records
```

### Report Contents

#### Summary Metrics
- Total transactions
- Age-verified transactions
- ID-scanned transactions
- Violation count

#### Detailed Records
For each transaction:
- Transaction ID and timestamp
- Location and state
- Age verification status
- ID scanning status
- Customer information (encrypted)
- Employee ID
- Product types sold
- Compliance status (passed/failed/warning)
- Violation details

### Export Formats

Reports can be exported as:
- **JSON**: For API consumption
- **CSV**: For spreadsheet analysis
- **PDF**: For regulatory submission

---

## Audit Trail

### Logged Events

Every compliance-related action is logged:

1. **Age Verification**
   - Verification method
   - Result (passed/failed)
   - Customer ID (encrypted)
   - Employee ID

2. **ID Scanning**
   - Scan timestamp
   - Scanner type
   - Validation results
   - Raw data (encrypted)

3. **Violations**
   - Violation type
   - Timestamp
   - Location
   - Employee involved

4. **License Checks**
   - License validation
   - Expiration warnings
   - Renewal reminders

### Audit Log Structure

```typescript
{
  id: 'log-001',
  eventType: 'COMPLIANCE_CHECK',
  userId: 'emp-001',
  action: 'PASSED',
  resourceId: 'txn-001',
  result: 'success',
  details: 'encrypted-compliance-data',
  timestamp: '2026-01-02T12:00:00Z'
}
```

### Data Retention

- **Audit logs**: 7 years (regulatory requirement)
- **Transaction data**: 7 years
- **ID scans**: 90 days (privacy consideration)
- **Compliance reports**: Indefinite

---

## API Reference

### EnhancedComplianceAgent

#### `verifyCompliance()`

Comprehensive compliance verification.

```typescript
async verifyCompliance(
  items: OrderItemDto[],
  locationId: string,
  customerId?: string,
  ageVerified?: boolean,
  idVerification?: IDVerificationData,
): Promise<EnhancedComplianceResult>
```

**Returns:**
```typescript
{
  ageVerified: boolean;
  requiresAgeVerification: boolean;
  customerId?: string;
  customerAge?: number;
  stateCode: string;
  regulation: StateRegulation | null;
  saleAllowed: boolean;
  saleRestrictionReason?: string;
  idVerification?: IDVerificationData;
  warnings: string[];
}
```

#### `logComplianceEvent()`

Log compliance event for audit trail.

```typescript
async logComplianceEvent(
  reportData: ComplianceReportData,
): Promise<void>
```

#### `generateComplianceReport()`

Generate compliance report for date range.

```typescript
async generateComplianceReport(
  locationId: string,
  startDate: Date,
  endDate: Date,
): Promise<ComplianceReport>
```

#### `validateStateLicense()`

Validate location's alcohol license.

```typescript
async validateStateLicense(
  locationId: string,
): Promise<{
  valid: boolean;
  expiresIn?: number;
  warnings: string[];
}>
```

---

## Best Practices

### 1. Always Verify Age

```typescript
// ❌ Bad
if (customer.ageVerified) {
  // Process order
}

// ✅ Good
const compliance = await complianceAgent.verifyCompliance(
  items,
  locationId,
  customerId,
  ageVerified,
  idVerification
);

if (!compliance.saleAllowed) {
  throw new ForbiddenException(compliance.saleRestrictionReason);
}
```

### 2. Use ID Scanning Where Required

```typescript
const regulation = getStateRegulation(location.state);

if (regulation.requiresIdScan) {
  // Must use scanner
  const scanResult = await idScanner.scanID();
  if (!scanResult.success) {
    throw new Error('ID scanning required');
  }
}
```

### 3. Log All Compliance Events

```typescript
// Always log, even for successful transactions
await complianceAgent.logComplianceEvent({
  transactionId,
  locationId,
  stateCode,
  timestamp: new Date(),
  ageVerified: true,
  idScanned: true,
  complianceStatus: 'passed',
  violations: [],
});
```

### 4. Handle Warnings

```typescript
const result = await complianceAgent.verifyCompliance(/* ... */);

if (result.warnings.length > 0) {
  // Display warnings to cashier
  result.warnings.forEach(warning => {
    console.warn('Compliance Warning:', warning);
  });
}
```

### 5. Regular License Checks

```typescript
// Check license status daily
const licenseStatus = await complianceAgent.validateStateLicense(locationId);

if (!licenseStatus.valid) {
  // Alert management
  sendAlert('License issue', licenseStatus.warnings);
}

if (licenseStatus.expiresIn && licenseStatus.expiresIn < 30) {
  // Renewal reminder
  sendReminder('License renewal needed');
}
```

---

## Troubleshooting

### Common Issues

#### 1. "State regulations not found"

**Cause**: Location state not in supported states list.

**Solution**:
- Verify location.state is valid 2-letter code
- Add state to `state-regulations.ts` if needed
- Use default regulations as fallback

#### 2. "ID scanning required but not performed"

**Cause**: State requires ID scanning but manual verification used.

**Solution**:
- Configure ID scanner for location
- Train staff on scanner usage
- Update compliance settings

#### 3. "Age verification failed"

**Cause**: Customer under minimum age.

**Solution**:
- Verify customer date of birth is correct
- Confirm state minimum age requirement
- Refuse sale if customer is underage

#### 4. "Sale not allowed at this time"

**Cause**: Time-based restrictions in effect.

**Solution**:
- Check state sale hours
- Verify product type restrictions
- Wait until allowed hours

### Debug Mode

Enable debug logging:

```typescript
// In development
process.env.COMPLIANCE_DEBUG = 'true';

// Logs detailed compliance checks
```

### Testing

Use mock scanner for development:

```typescript
import { MockIDScanner } from './id-scanner.interface';

const scanner = new MockIDScanner();
await scanner.initialize(config);
const result = await scanner.scan();
// Returns realistic test data
```

---

## Regulatory Compliance Checklist

### Before Going Live

- [ ] Verify state license is current
- [ ] Configure correct state regulations
- [ ] Test age verification flow
- [ ] Set up ID scanner (if required)
- [ ] Train staff on compliance procedures
- [ ] Test audit logging
- [ ] Configure data retention policies
- [ ] Set up compliance reporting
- [ ] Review state-specific requirements
- [ ] Test holiday/Sunday restrictions

### Ongoing Compliance

- [ ] Daily license status check
- [ ] Weekly compliance report review
- [ ] Monthly staff training
- [ ] Quarterly regulation updates
- [ ] Annual license renewal
- [ ] Regular audit log review
- [ ] Update ID scanner firmware
- [ ] Monitor violation trends

---

## Support & Resources

### Internal Resources
- Technical documentation: `/docs`
- API reference: `/docs/api`
- Test suite: `/src/common/compliance/*.spec.ts`

### External Resources
- [TTB Regulations](https://www.ttb.gov/)
- [NIAAA Guidelines](https://www.niaaa.nih.gov/)
- State ABC Agencies
- AAMVA ID Standards

### Contact

For compliance questions:
- Technical: See system documentation
- Legal: Consult legal counsel
- Regulatory: Contact state ABC agency

---

**Last Updated**: January 2, 2026  
**Version**: 1.0.0  
**Compliance Level**: State-Specific (5 states)

