# Encryption Key Management Guide

## Overview

The POS-Omni system uses AES-256-GCM encryption to protect sensitive audit log data. This guide covers key generation, backup, rotation, and recovery procedures.

**CRITICAL:** Losing the encryption key means **permanent data loss**. Audit logs cannot be decrypted without the key.

---

## Table of Contents

1. [Key Generation](#key-generation)
2. [Key Backup](#key-backup)
3. [Key Storage](#key-storage)
4. [Key Rotation](#key-rotation)
5. [Key Recovery](#key-recovery)
6. [Compliance Requirements](#compliance-requirements)
7. [Troubleshooting](#troubleshooting)

---

## Key Generation

### Initial Key Generation

Generate a new 256-bit (32-byte) encryption key:

```bash
# Generate key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Example output:
# Xk7v9w$2B5E8H@KbPeShVmYq3t6w9z$C&F)J@NcRfUjX
```

### Key Requirements

- **Length:** 32 bytes (256 bits)
- **Format:** Base64-encoded
- **Randomness:** Cryptographically secure (use `crypto.randomBytes`)
- **Uniqueness:** Each environment (dev/staging/prod) must have a unique key

---

## Key Backup

### Why Backup is Critical

**Liquor sales records must be retained for 7 years** (compliance requirement). Losing the encryption key means:
- ❌ Audit logs permanently unreadable
- ❌ Compliance violations
- ❌ Legal liability
- ❌ Investigation failures

### Backup Procedures

#### 1. Secure Key Storage Service (RECOMMENDED)

Use a dedicated key management service:

**AWS KMS (Key Management Service):**
```bash
# Store key in AWS Secrets Manager
aws secretsmanager create-secret \
  --name liquor-pos/audit-encryption-key \
  --description "Audit log encryption key for POS system" \
  --secret-string "YOUR_BASE64_KEY"

# Retrieve key
aws secretsmanager get-secret-value \
  --secret-id liquor-pos/audit-encryption-key \
  --query SecretString \
  --output text
```

**Azure Key Vault:**
```bash
# Store key
az keyvault secret set \
  --vault-name liquor-pos-vault \
  --name audit-encryption-key \
  --value "YOUR_BASE64_KEY"

# Retrieve key
az keyvault secret show \
  --vault-name liquor-pos-vault \
  --name audit-encryption-key \
  --query value \
  --output tsv
```

**HashiCorp Vault:**
```bash
# Store key
vault kv put secret/liquor-pos/audit-encryption-key value="YOUR_BASE64_KEY"

# Retrieve key
vault kv get -field=value secret/liquor-pos/audit-encryption-key
```

#### 2. Encrypted File Backup (Alternative)

If key management service is not available:

```bash
# Create encrypted backup
echo "YOUR_BASE64_KEY" | gpg --symmetric --armor > audit-key-backup.gpg

# Restore from backup
gpg --decrypt audit-key-backup.gpg
```

**Storage locations:**
- ✅ Encrypted USB drive in fireproof safe
- ✅ Encrypted cloud storage (separate from application)
- ✅ Physical printout in bank safe deposit box
- ❌ Same server as application
- ❌ Unencrypted file
- ❌ Version control (Git)

#### 3. Multi-Party Key Splitting (High Security)

Split key among multiple trusted parties using Shamir's Secret Sharing:

```bash
# Install ssss (Shamir's Secret Sharing Scheme)
npm install -g secrets.js-grempe

# Split key into 5 shares, require 3 to reconstruct
secrets.js share YOUR_BASE64_KEY 5 3

# Outputs 5 shares like:
# 801a8c0d...
# 802f3e1b...
# 803c5a2f...
# 804d7b3c...
# 805e9d4a...

# Reconstruct key (need any 3 shares)
secrets.js combine 801a8c0d... 802f3e1b... 803c5a2f...
```

**Distribution:**
- Share 1: CEO/Owner
- Share 2: IT Manager
- Share 3: Compliance Officer
- Share 4: External Auditor
- Share 5: Legal Counsel

---

## Key Storage

### Environment Variables

**Production:**
```bash
# .env.production (NEVER commit to Git)
AUDIT_LOG_ENCRYPTION_KEY=Xk7v9w$2B5E8H@KbPeShVmYq3t6w9z$C&F)J@NcRfUjX
```

**Docker:**
```bash
# Use Docker secrets
docker secret create audit_encryption_key ./key.txt

# In docker-compose.yml
services:
  backend:
    secrets:
      - audit_encryption_key
    environment:
      AUDIT_LOG_ENCRYPTION_KEY_FILE: /run/secrets/audit_encryption_key
```

**Kubernetes:**
```bash
# Create secret
kubectl create secret generic audit-encryption-key \
  --from-literal=key=YOUR_BASE64_KEY

# In deployment.yaml
env:
  - name: AUDIT_LOG_ENCRYPTION_KEY
    valueFrom:
      secretKeyRef:
        name: audit-encryption-key
        key: key
```

### Security Best Practices

✅ **DO:**
- Use environment variables or secret management
- Restrict access to key (principle of least privilege)
- Audit key access (who retrieved it, when)
- Rotate keys periodically (annually or after breach)
- Test key recovery procedure quarterly

❌ **DON'T:**
- Hardcode keys in source code
- Commit keys to version control
- Store keys in application logs
- Share keys via email/chat
- Use same key across environments

---

## Key Rotation

### When to Rotate

Rotate encryption keys:
- **Scheduled:** Annually (recommended)
- **Security incident:** Key potentially compromised
- **Personnel change:** Employee with key access leaves
- **Compliance requirement:** Regulatory mandate
- **Proactive:** Best practice for security

### Rotation Procedure

#### Step 1: Generate New Key

```bash
# Generate new key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Save as NEW_KEY
```

#### Step 2: Backup Current Key

```bash
# Backup current key before rotation
echo $AUDIT_LOG_ENCRYPTION_KEY > current-key-backup.txt

# Encrypt backup
gpg --symmetric --armor current-key-backup.txt

# Store securely (see Key Backup section)
```

#### Step 3: Set Environment Variables

```bash
# Set both keys for rotation
export AUDIT_LOG_ENCRYPTION_KEY="NEW_KEY"
export OLD_AUDIT_LOG_ENCRYPTION_KEY="CURRENT_KEY"
export DATABASE_URL="postgresql://..."
```

#### Step 4: Run Rotation Script

```bash
cd backend

# Backup database first!
pg_dump $DATABASE_URL > audit-logs-backup-$(date +%Y%m%d).sql

# Run rotation script
npm run rotate-key
```

**Expected output:**
```
🔄 Starting encryption key rotation...
✅ Key rotation mode active
📊 Found 1,234 audit log entries to re-encrypt
🔄 Processing batch 1/13...
✅ Progress: 100/1234 (8%)
...
✅ Progress: 1234/1234 (100%)
🎉 Key rotation complete!
✅ Successfully re-encrypted: 1,234 entries
```

#### Step 5: Verify Rotation

```bash
# Test decryption with new key only
unset OLD_AUDIT_LOG_ENCRYPTION_KEY

# Start application
npm run start:prod

# Verify audit logs are readable
curl -X GET http://localhost:3000/admin/audit-logs \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.data[0].details'

# Should return decrypted data
```

#### Step 6: Remove Old Key

```bash
# Once verified, remove old key from environment
# Update .env.production, Docker secrets, K8s secrets, etc.

# Keep old key in secure backup for 30 days (in case of issues)
```

### Rotation Rollback

If rotation fails:

```bash
# Restore database from backup
psql $DATABASE_URL < audit-logs-backup-YYYYMMDD.sql

# Revert to old key
export AUDIT_LOG_ENCRYPTION_KEY="OLD_KEY"
unset OLD_AUDIT_LOG_ENCRYPTION_KEY

# Restart application
npm run start:prod
```

---

## Key Recovery

### Scenario 1: Key Lost, Backup Available

```bash
# Retrieve from key management service
aws secretsmanager get-secret-value \
  --secret-id liquor-pos/audit-encryption-key \
  --query SecretString \
  --output text

# Or decrypt backup file
gpg --decrypt audit-key-backup.gpg

# Set environment variable
export AUDIT_LOG_ENCRYPTION_KEY="RECOVERED_KEY"

# Restart application
npm run start:prod
```

### Scenario 2: Key Lost, No Backup (DISASTER)

**Impact:**
- ❌ All encrypted audit logs are **permanently unreadable**
- ❌ Compliance violation (7-year retention requirement)
- ❌ Legal liability
- ❌ Cannot investigate past transactions

**Recovery Steps:**
1. **Acknowledge data loss** - Encrypted data cannot be recovered
2. **Generate new key** - For future audit logs
3. **Document incident** - For compliance/legal purposes
4. **Notify stakeholders** - Management, compliance, legal
5. **Review backup procedures** - Prevent future occurrences

**Mitigation:**
- Keep unencrypted audit logs for critical period (e.g., 90 days)
- Implement key backup procedures immediately
- Test recovery quarterly

### Scenario 3: Key Compromised

```bash
# Immediate actions:
# 1. Generate new key
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# 2. Rotate immediately (see Key Rotation section)
export AUDIT_LOG_ENCRYPTION_KEY="$NEW_KEY"
export OLD_AUDIT_LOG_ENCRYPTION_KEY="$COMPROMISED_KEY"
npm run rotate-key

# 3. Investigate breach
# - Review access logs
# - Identify how key was compromised
# - Assess data exposure
# - Notify affected parties if required

# 4. Update security procedures
```

---

## Compliance Requirements

### Liquor Sales Regulations

**Retention Period:** 7 years (varies by jurisdiction)

**Requirements:**
- ✅ Audit logs must be retained for 7 years
- ✅ Logs must be accessible for investigations
- ✅ Encryption keys must be backed up securely
- ✅ Key recovery must be tested regularly
- ✅ Key access must be audited

### Audit Trail

Document all key operations:

| Date | Operation | Performed By | Reason | Backup Verified |
|------|-----------|--------------|--------|-----------------|
| 2026-01-01 | Key Generated | IT Admin | Initial setup | ✅ Yes |
| 2027-01-01 | Key Rotated | IT Admin | Annual rotation | ✅ Yes |
| 2027-06-15 | Key Recovered | IT Manager | Server migration | ✅ Yes |

### Testing Schedule

| Test | Frequency | Last Performed | Next Due |
|------|-----------|----------------|----------|
| Key backup verification | Quarterly | 2026-01-01 | 2026-04-01 |
| Key recovery drill | Quarterly | 2026-01-01 | 2026-04-01 |
| Key rotation test | Annually | 2026-01-01 | 2027-01-01 |
| Disaster recovery | Annually | 2026-01-01 | 2027-01-01 |

---

## Troubleshooting

### Error: "AUDIT_LOG_ENCRYPTION_KEY is required"

**Cause:** Environment variable not set

**Solution:**
```bash
# Set environment variable
export AUDIT_LOG_ENCRYPTION_KEY="YOUR_BASE64_KEY"

# Or add to .env file
echo "AUDIT_LOG_ENCRYPTION_KEY=YOUR_BASE64_KEY" >> .env
```

### Error: "Encryption key must be 32 bytes"

**Cause:** Key is wrong length

**Solution:**
```bash
# Generate new 32-byte key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Error: "Decryption failed"

**Possible causes:**
1. Wrong key being used
2. Data corrupted
3. Key was rotated but OLD_AUDIT_LOG_ENCRYPTION_KEY not set

**Solution:**
```bash
# If key was recently rotated, set old key
export OLD_AUDIT_LOG_ENCRYPTION_KEY="PREVIOUS_KEY"

# Restart application
npm run start:prod

# Run rotation script to complete migration
npm run rotate-key
```

### Error: "Invalid ciphertext format"

**Cause:** Data not encrypted or corrupted

**Solution:**
```bash
# Check audit log entry
psql $DATABASE_URL -c "SELECT id, details FROM audit_logs WHERE id='ENTRY_ID';"

# If details field doesn't match format "iv:authTag:encryptedData", data may be corrupted
# Restore from database backup if available
```

---

## Quick Reference

### Generate Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Backup Key (AWS)
```bash
aws secretsmanager create-secret \
  --name liquor-pos/audit-encryption-key \
  --secret-string "$AUDIT_LOG_ENCRYPTION_KEY"
```

### Rotate Key
```bash
export AUDIT_LOG_ENCRYPTION_KEY="NEW_KEY"
export OLD_AUDIT_LOG_ENCRYPTION_KEY="OLD_KEY"
npm run rotate-key
```

### Recover Key (AWS)
```bash
aws secretsmanager get-secret-value \
  --secret-id liquor-pos/audit-encryption-key \
  --query SecretString --output text
```

### Test Decryption
```bash
curl -X GET http://localhost:3000/admin/audit-logs \
  -H "Authorization: Bearer $TOKEN" | jq '.data[0].details'
```

---

## Security Checklist

Before going to production:

- [ ] Encryption key generated with cryptographically secure random
- [ ] Key backed up in at least 2 secure locations
- [ ] Key stored in key management service (AWS/Azure/Vault)
- [ ] Key access restricted to authorized personnel only
- [ ] Key recovery procedure documented
- [ ] Key recovery tested successfully
- [ ] Key rotation procedure documented
- [ ] Compliance requirements reviewed
- [ ] Audit trail established
- [ ] Testing schedule defined
- [ ] Team trained on key management procedures

---

## Support

For questions or issues:
- **Documentation:** `backend/docs/ENCRYPTION_KEY_MANAGEMENT.md`
- **Script:** `backend/scripts/rotate-encryption-key.ts`
- **Service:** `backend/src/common/encryption.service.ts`

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-02  
**Maintained By:** Engineering Team

