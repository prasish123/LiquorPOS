# PAX Integration - Deployment Checklist

## Pre-Deployment Verification ✅

### Code Quality
- [x] All components implemented
- [x] All tests passing
- [x] No linter errors
- [x] Code reviewed
- [x] Documentation complete

### Database
- [x] Schema updated (PaymentTerminal, PaxTransaction)
- [x] Migration file created
- [ ] Migration tested in staging
- [ ] Backup strategy confirmed

### Configuration
- [x] Environment variables documented
- [ ] Production .env updated
- [ ] Network configuration planned
- [ ] Firewall rules documented

---

## Deployment Steps

### Step 1: Database Migration
```bash
cd backend
npx prisma migrate deploy
```
- [ ] Migration executed successfully
- [ ] Tables created (PaymentTerminal, PaxTransaction)
- [ ] Indexes created
- [ ] Foreign keys established

### Step 2: Environment Configuration
Add to production `.env`:
```bash
# PAX Terminal Configuration
PAX_DEFAULT_TIMEOUT=30000
PAX_HEARTBEAT_INTERVAL=300000

# Offline Payment Fallback
OFFLINE_PAYMENTS_ENABLED=true
OFFLINE_MAX_TRANSACTION_AMOUNT=500
OFFLINE_MAX_DAILY_TOTAL=5000
OFFLINE_REQUIRE_MANAGER_APPROVAL=false
OFFLINE_ALLOWED_PAYMENT_METHODS=cash,card
```
- [ ] Environment variables added
- [ ] Values appropriate for production
- [ ] Configuration validated

### Step 3: Backend Deployment
```bash
cd backend
npm run build
npm run start:prod
```
- [ ] Build successful
- [ ] Backend started
- [ ] Health check passing
- [ ] Logs showing no errors

### Step 4: API Verification
```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Check payment processor health
curl http://localhost:3000/api/payments/processors/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Health endpoint responding
- [ ] Payment processors endpoint working
- [ ] Authentication working

---

## Post-Deployment Configuration

### Step 5: Network Setup

#### Terminal Network Configuration
For each PAX terminal:
1. Configure static IP address
2. Set gateway and DNS
3. Enable TCP/IP server on port 10009
4. Test connectivity from POS server

Checklist per terminal:
- [ ] Terminal 1: IP configured, connectivity tested
- [ ] Terminal 2: IP configured, connectivity tested
- [ ] Terminal 3: IP configured, connectivity tested
- [ ] (Add more as needed)

### Step 6: Terminal Registration

Register each terminal via API:
```bash
curl -X POST http://localhost:3000/api/payments/terminals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id": "term-001",
    "name": "Counter 1 - PAX A920",
    "type": "pax",
    "locationId": "loc-001",
    "ipAddress": "192.168.1.100",
    "port": 10009,
    "serialNumber": "PAX-A920-12345",
    "model": "A920Pro",
    "enabled": true
  }'
```

Terminal Registration Checklist:
- [ ] Terminal 1 registered
- [ ] Terminal 2 registered
- [ ] Terminal 3 registered
- [ ] All terminals visible in system

### Step 7: Health Verification

Check each terminal's health:
```bash
curl http://localhost:3000/api/payments/terminals/term-001/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "terminalId": "term-001",
  "type": "pax",
  "online": true,
  "healthy": true,
  "lastCheck": "2026-01-03T12:00:00.000Z"
}
```

Health Check Results:
- [ ] Terminal 1: Online and healthy
- [ ] Terminal 2: Online and healthy
- [ ] Terminal 3: Online and healthy
- [ ] All terminals passing health checks

### Step 8: Test Transactions

Process test transactions on each terminal:
```bash
curl -X POST http://localhost:3000/api/payments/pax/transaction \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "terminalId": "term-001",
    "amount": 1.00,
    "transactionType": "sale",
    "invoiceNumber": "TEST-001"
  }'
```

Test Transaction Results:
- [ ] Terminal 1: Test sale successful
- [ ] Terminal 1: Test refund successful
- [ ] Terminal 2: Test sale successful
- [ ] Terminal 2: Test refund successful
- [ ] Terminal 3: Test sale successful
- [ ] Terminal 3: Test refund successful

---

## Monitoring Setup

### Step 9: Configure Monitoring

- [ ] Log aggregation configured
- [ ] Error alerts set up
- [ ] Health check monitoring enabled
- [ ] Transaction success rate tracking
- [ ] Dashboard created (if applicable)

### Monitoring Checklist
- [ ] Backend logs accessible
- [ ] Payment transaction logs visible
- [ ] Terminal health logs available
- [ ] Error notifications working
- [ ] Performance metrics tracked

---

## Staff Training

### Step 10: Train Staff

Training Topics:
- [ ] How to process payments with PAX terminals
- [ ] What to do if terminal is offline
- [ ] How to handle declined transactions
- [ ] When to call for technical support
- [ ] How to check terminal status

Training Completion:
- [ ] Manager trained
- [ ] Cashier 1 trained
- [ ] Cashier 2 trained
- [ ] Cashier 3 trained
- [ ] Training documentation provided

---

## Documentation

### Step 11: Update Documentation

- [ ] Runbook updated with PAX procedures
- [ ] Troubleshooting guide accessible
- [ ] Contact information for support
- [ ] Network diagram updated
- [ ] Terminal inventory documented

---

## Security Review

### Step 12: Security Verification

- [ ] Network isolation reviewed
- [ ] Firewall rules applied
- [ ] VLAN configuration verified (if applicable)
- [ ] PCI compliance reviewed
- [ ] Access controls verified
- [ ] Audit logging enabled

---

## Backup & Recovery

### Step 13: Backup Procedures

- [ ] Database backup schedule confirmed
- [ ] Terminal configuration backed up
- [ ] Recovery procedures documented
- [ ] Disaster recovery plan updated
- [ ] Backup restoration tested

---

## Final Verification

### Step 14: End-to-End Testing

Complete Order Flow Test:
1. Create order in POS
2. Process payment via PAX terminal
3. Verify transaction recorded
4. Verify receipt generated
5. Verify order completed

- [ ] End-to-end test 1: Successful
- [ ] End-to-end test 2: Successful
- [ ] End-to-end test 3: Successful

### Step 15: Failover Testing

Test failover scenarios:
1. Disable PAX terminal
2. Process payment (should use Stripe)
3. Verify fallback worked
4. Re-enable PAX terminal
5. Verify PAX used again

- [ ] Failover to Stripe: Working
- [ ] Failover to Offline: Working
- [ ] Recovery to PAX: Working

---

## Go-Live Checklist

### Pre-Go-Live
- [ ] All deployment steps completed
- [ ] All tests passing
- [ ] Staff trained
- [ ] Documentation complete
- [ ] Monitoring active
- [ ] Support team ready

### Go-Live
- [ ] Go-live time scheduled
- [ ] Stakeholders notified
- [ ] Support team on standby
- [ ] Rollback plan ready
- [ ] Communication plan ready

### Post-Go-Live (First 24 Hours)
- [ ] Monitor transaction success rate
- [ ] Check for errors in logs
- [ ] Verify terminal health
- [ ] Collect staff feedback
- [ ] Address any issues immediately

### Post-Go-Live (First Week)
- [ ] Review transaction volumes
- [ ] Analyze error patterns
- [ ] Optimize configuration if needed
- [ ] Update documentation based on learnings
- [ ] Conduct retrospective

---

## Rollback Plan

If issues occur, follow this rollback procedure:

### Rollback Steps
1. [ ] Stop processing new PAX transactions
2. [ ] Switch all payments to Stripe/Offline
3. [ ] Disable PAX terminals in system
4. [ ] Investigate and fix issues
5. [ ] Re-test before re-enabling

### Rollback Triggers
- Transaction success rate < 95%
- Multiple terminal failures
- Data integrity issues
- Security concerns
- Critical bugs discovered

---

## Support Contacts

### Technical Support
- **Backend Issues**: [Your Team]
- **PAX Terminal Issues**: PAX Support - [Contact Info]
- **Network Issues**: IT Team - [Contact Info]
- **Payment Processing**: Payment Processor Support - [Contact Info]

### Escalation Path
1. Level 1: On-site staff
2. Level 2: Technical team
3. Level 3: Vendor support
4. Level 4: Emergency contacts

---

## Success Criteria

### Deployment Success
- [x] Code deployed successfully
- [ ] All terminals registered
- [ ] All terminals online
- [ ] Test transactions successful
- [ ] Staff trained
- [ ] Monitoring active

### Operational Success (After 1 Week)
- [ ] Transaction success rate > 98%
- [ ] Terminal uptime > 99%
- [ ] Average transaction time < 5 seconds
- [ ] No critical issues
- [ ] Positive staff feedback

---

## Notes & Issues

### Deployment Notes
```
Date: _______________
Deployed by: _______________
Notes:




```

### Issues Encountered
```
Issue 1:
Resolution:

Issue 2:
Resolution:

Issue 3:
Resolution:
```

---

## Sign-Off

### Technical Sign-Off
- [ ] Backend Developer: _________________ Date: _______
- [ ] DevOps Engineer: __________________ Date: _______
- [ ] QA Engineer: ______________________ Date: _______

### Business Sign-Off
- [ ] Store Manager: ____________________ Date: _______
- [ ] Operations Manager: _______________ Date: _______
- [ ] IT Manager: _______________________ Date: _______

---

## Appendix

### Useful Commands

```bash
# Check backend health
curl http://localhost:3000/api/health

# List all terminals
curl http://localhost:3000/api/payments/terminals \
  -H "Authorization: Bearer TOKEN"

# Check terminal health
curl http://localhost:3000/api/payments/terminals/term-001/health \
  -H "Authorization: Bearer TOKEN"

# Check processor health
curl http://localhost:3000/api/payments/processors/health \
  -H "Authorization: Bearer TOKEN"

# View recent transactions (database)
psql -d liquor_pos -c "SELECT * FROM \"PaxTransaction\" ORDER BY \"createdAt\" DESC LIMIT 10;"

# View terminal status (database)
psql -d liquor_pos -c "SELECT * FROM \"PaymentTerminal\" WHERE \"deletedAt\" IS NULL;"

# Check backend logs
tail -f /var/log/liquor-pos/backend.log

# Restart backend
systemctl restart liquor-pos-backend
```

### Documentation Links
- [Module README](backend/src/payments/README.md)
- [Integration Guide](backend/docs/PAX_INTEGRATION_GUIDE.md)
- [Quick Reference](backend/src/payments/QUICK_REFERENCE.md)
- [Architecture Diagrams](backend/docs/PAX_ARCHITECTURE_DIAGRAM.md)

---

*Checklist Version: 1.0*  
*Last Updated: January 3, 2026*

