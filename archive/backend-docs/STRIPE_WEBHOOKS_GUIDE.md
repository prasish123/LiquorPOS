# Stripe Webhooks Implementation Guide

## Overview

This guide covers the complete Stripe webhook implementation for the POS-Omni system. Webhooks enable real-time notifications about payment events, including async failures, refunds, disputes, and chargebacks.

## Table of Contents

1. [Why Webhooks Are Critical](#why-webhooks-are-critical)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [Webhook Events Handled](#webhook-events-handled)
5. [Security](#security)
6. [Testing](#testing)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Why Webhooks Are Critical

### Without Webhooks, You Miss:

1. **Async Payment Failures**
   - Payments that fail after initial authorization
   - Network issues during capture
   - Insufficient funds discovered later
   - Card expiration between auth and capture

2. **Customer-Initiated Refunds**
   - Chargebacks filed directly with bank
   - Disputes initiated through Stripe dashboard
   - Refunds requested through customer portal

3. **Disputes/Chargebacks**
   - Fraud claims
   - Product not received claims
   - Unauthorized transaction claims
   - **Evidence deadlines** (typically 7-14 days)

4. **Failed Captures**
   - Authorization expired (>7 days)
   - Card canceled between auth and capture
   - Account closed
   - Capture amount exceeds authorization

### Business Impact

| Issue | Without Webhooks | With Webhooks |
|-------|------------------|---------------|
| Async Failures | Inventory committed, payment never received | Automatic order cancellation, inventory released |
| Chargebacks | Discover weeks later, miss evidence deadline | Immediate notification, time to respond |
| Refunds | Manual reconciliation required | Automatic tracking and reporting |
| Failed Captures | Order marked complete, payment failed | Order status updated, customer notified |

---

## Architecture

### Components

```
┌─────────────────┐
│  Stripe Server  │
└────────┬────────┘
         │ HTTPS POST (webhook event)
         │ + signature header
         ↓
┌─────────────────────────────────────┐
│  WebhooksController                 │
│  POST /webhooks/stripe              │
│  - Receives raw body                │
│  - Validates signature              │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  StripeWebhookService               │
│  - Verifies signature               │
│  - Routes to event handlers         │
│  - Updates payment/order status     │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  WebhooksService                    │
│  - Stores events (audit trail)      │
│  - Tracks processing status         │
│  - Provides retry mechanism         │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Database (EventLog)                │
│  - Event history                    │
│  - Processing status                │
│  - Error tracking                   │
└─────────────────────────────────────┘
```

### Event Flow

1. **Stripe sends webhook** → Raw JSON payload + signature header
2. **Controller receives** → Preserves raw body for verification
3. **Signature verification** → Validates authenticity using webhook secret
4. **Event storage** → Stores in EventLog for audit trail (idempotent)
5. **Event processing** → Routes to appropriate handler based on event type
6. **Database updates** → Updates payment/order status
7. **Response** → Returns 200 OK (or 400/500 for retry)

---

## Setup Instructions

### 1. Configure Stripe Webhook Endpoint

#### Development (using Stripe CLI)

```bash
# Install Stripe CLI
# Windows (Scoop)
scoop install stripe

# macOS (Homebrew)
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:3000/webhooks/stripe

# Copy the webhook signing secret (starts with whsec_)
# Output: > Ready! Your webhook signing secret is whsec_xxxxx
```

#### Production (Stripe Dashboard)

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter your endpoint URL: `https://your-domain.com/webhooks/stripe`
4. Select events to listen for (see [Webhook Events](#webhook-events-handled))
5. Copy the **Signing secret** (starts with `whsec_`)

### 2. Set Environment Variables

Add to your `.env` file:

```bash
# Stripe API Key (required for payment processing)
STRIPE_SECRET_KEY=sk_live_xxxxx  # or sk_test_xxxxx for testing

# Stripe Webhook Secret (required for webhook signature verification)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

⚠️ **CRITICAL**: Never commit these secrets to version control!

### 3. Verify Configuration

Start your application and check logs:

```bash
npm run start:dev
```

Expected log output:

```
[StripeWebhookService] Stripe webhook service initialized. Signature verification: ENABLED
```

If you see `DISABLED (INSECURE)`, the webhook secret is not configured.

### 4. Test Webhook Endpoint

#### Using Stripe CLI

```bash
# Trigger a test event
stripe trigger payment_intent.succeeded

# Trigger specific scenarios
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
stripe trigger charge.dispute.created
```

#### Using cURL

```bash
curl -X POST http://localhost:3000/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test_signature" \
  -d '{
    "id": "evt_test_123",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_123",
        "amount": 10000,
        "status": "succeeded"
      }
    }
  }'
```

---

## Webhook Events Handled

### Payment Lifecycle Events

| Event | Description | Action Taken |
|-------|-------------|--------------|
| `payment_intent.succeeded` | Payment completed successfully | Update payment status to `captured` |
| `payment_intent.payment_failed` | Payment failed after authorization | Mark payment as `failed`, cancel order |
| `payment_intent.canceled` | Payment was canceled | Mark payment as `failed` |
| `payment_intent.capture_failed` | Capture attempt failed | Mark payment as `failed`, log error |
| `payment_intent.amount_capturable_updated` | Authorization amount changed | Log change for reconciliation |

### Refund Events

| Event | Description | Action Taken |
|-------|-------------|--------------|
| `charge.refunded` | Refund processed (full or partial) | Log refund event with amount and reason |

### Dispute Events (CRITICAL)

| Event | Description | Action Taken |
|-------|-------------|--------------|
| `charge.dispute.created` | Chargeback/dispute initiated | **🚨 CRITICAL ALERT** - Log dispute, note evidence deadline |
| `charge.dispute.closed` | Dispute resolved (won/lost) | Log resolution outcome |

### Charge Events

| Event | Description | Action Taken |
|-------|-------------|--------------|
| `charge.failed` | Charge attempt failed | Log failure with reason code |

### Event Selection in Stripe Dashboard

When configuring your webhook endpoint, select these events:

- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `payment_intent.canceled`
- ✅ `payment_intent.capture_failed`
- ✅ `payment_intent.amount_capturable_updated`
- ✅ `charge.refunded`
- ✅ `charge.dispute.created` ⚠️ CRITICAL
- ✅ `charge.dispute.closed`
- ✅ `charge.failed`

---

## Security

### Signature Verification

Every webhook request is verified using HMAC-SHA256 signature:

```typescript
// Automatic verification in StripeWebhookService
const event = stripe.webhooks.constructEvent(
  rawBody,           // Raw request body (Buffer)
  signature,         // stripe-signature header
  webhookSecret      // STRIPE_WEBHOOK_SECRET env var
);
```

### Security Features

1. **Signature Verification**
   - Prevents replay attacks
   - Ensures authenticity
   - Validates payload integrity

2. **Idempotency**
   - Duplicate events are detected by `event.id`
   - Prevents double-processing
   - Safe for Stripe retries

3. **Raw Body Preservation**
   - Required for signature verification
   - Configured in `main.ts`
   - Applied only to webhook route

4. **CSRF Exemption**
   - Webhooks skip CSRF validation
   - Protected by signature instead
   - Path: `/webhooks/*`

### Best Practices

✅ **DO:**
- Always verify webhook signatures in production
- Use HTTPS for webhook endpoints
- Store webhook secret securely (environment variables)
- Log all webhook events for audit trail
- Implement idempotency checks

❌ **DON'T:**
- Skip signature verification (except local development)
- Commit webhook secrets to version control
- Process webhooks without idempotency
- Trust webhook data without verification
- Expose webhook endpoint details publicly

---

## Testing

### Unit Tests

Run webhook service tests:

```bash
# Test webhook signature verification
npm test -- stripe-webhook.service.spec.ts

# Test webhook storage and retrieval
npm test -- webhooks.service.spec.ts
```

Expected output:

```
StripeWebhookService
  ✓ should initialize with Stripe credentials
  ✓ should verify webhook signatures
  ✓ should handle payment_intent.succeeded
  ✓ should handle payment_intent.payment_failed
  ✓ should handle charge.refunded
  ✓ should handle charge.dispute.created
  ✓ should handle charge.dispute.closed
  ✓ should mark events as processed
  ✓ should handle duplicate events (idempotency)

Test Suites: 2 passed, 2 total
Tests:       25 passed, 25 total
```

### Integration Tests

Run end-to-end webhook tests:

```bash
npm run test:e2e -- webhooks-integration.e2e-spec.ts
```

### Manual Testing with Stripe CLI

```bash
# Start webhook forwarding
stripe listen --forward-to http://localhost:3000/webhooks/stripe

# In another terminal, trigger events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
stripe trigger charge.dispute.created
```

### Testing Scenarios

#### 1. Successful Payment

```bash
stripe trigger payment_intent.succeeded
```

Expected:
- Payment status updated to `captured`
- Event logged in database
- 200 OK response

#### 2. Failed Payment

```bash
stripe trigger payment_intent.payment_failed
```

Expected:
- Payment status updated to `failed`
- Order status updated to `failed`
- Event logged with error details

#### 3. Refund

```bash
stripe trigger charge.refunded
```

Expected:
- Refund event logged
- Amount and reason recorded

#### 4. Dispute (Chargeback)

```bash
stripe trigger charge.dispute.created
```

Expected:
- **CRITICAL alert logged**
- Evidence deadline recorded
- Dispute details stored

---

## Monitoring

### Application Logs

Webhook events are logged with structured data:

```
[StripeWebhookService] Webhook signature verified: payment_intent.succeeded
[StripeWebhookService] Processing webhook event: payment_intent.succeeded, ID: evt_abc123
[StripeWebhookService] Payment succeeded: pi_abc123, Amount: $100.00
[WebhooksService] Stored webhook event: event_123, Type: payment_intent.succeeded, Provider: stripe
[WebhooksService] Marked webhook event event_123 as processed
```

### Critical Alerts

Disputes trigger critical log messages:

```
[StripeWebhookService] ⚠️ CRITICAL: Dispute requires attention! 
  Payment: payment_123
  Evidence due by: 2026-01-08T12:00:00.000Z
```

### Database Monitoring

Query webhook statistics:

```sql
-- Total webhooks received
SELECT COUNT(*) FROM "EventLog" 
WHERE "eventType" LIKE 'webhook.stripe.%';

-- Processed vs pending
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN processed = true THEN 1 ELSE 0 END) as processed,
  SUM(CASE WHEN processed = false THEN 1 ELSE 0 END) as pending
FROM "EventLog" 
WHERE "eventType" LIKE 'webhook.stripe.%';

-- Recent disputes (CRITICAL)
SELECT * FROM "EventLog" 
WHERE "eventType" = 'payment.dispute.created'
ORDER BY "timestamp" DESC 
LIMIT 10;

-- Failed webhooks (need retry)
SELECT * FROM "EventLog" 
WHERE "eventType" LIKE 'webhook.%' 
  AND processed = false
  AND "metadata" LIKE '%error%'
ORDER BY "timestamp" DESC;
```

### Stripe Dashboard

Monitor webhooks in Stripe Dashboard:

- **Test Mode**: [https://dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)
- **Live Mode**: [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)

View:
- Webhook delivery attempts
- Response codes
- Retry history
- Failed deliveries

---

## Troubleshooting

### Issue: "Missing stripe-signature header"

**Cause**: Webhook request doesn't include signature header

**Solution**:
1. Verify Stripe is sending webhooks to correct endpoint
2. Check for proxy/load balancer stripping headers
3. Ensure endpoint URL is correct in Stripe dashboard

### Issue: "Webhook signature verification failed"

**Cause**: Invalid or mismatched webhook secret

**Solution**:
1. Verify `STRIPE_WEBHOOK_SECRET` in `.env` matches Stripe dashboard
2. Ensure you're using the correct secret (test vs live mode)
3. Check for whitespace in environment variable
4. Restart application after changing secret

```bash
# Verify secret is loaded
echo $STRIPE_WEBHOOK_SECRET

# Should start with whsec_
```

### Issue: "Payment not found in database"

**Cause**: Webhook received before payment record created

**Solution**:
- This is normal for very fast webhooks
- Service logs warning but doesn't fail
- Payment will be updated when record exists
- No action needed (handled gracefully)

### Issue: Webhooks not being received

**Cause**: Endpoint not reachable or misconfigured

**Solution**:

1. **Check endpoint is running**:
   ```bash
   curl http://localhost:3000/webhooks/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

2. **Verify Stripe CLI forwarding**:
   ```bash
   stripe listen --forward-to http://localhost:3000/webhooks/stripe
   # Should show: Ready! Your webhook signing secret is whsec_xxxxx
   ```

3. **Check firewall/network**:
   - Ensure port 3000 is accessible
   - Check for proxy/load balancer issues
   - Verify SSL certificate (production)

4. **Review Stripe Dashboard**:
   - Check webhook delivery attempts
   - Look for failed deliveries
   - Review error messages

### Issue: Duplicate webhook processing

**Cause**: Stripe retries on 5xx errors

**Solution**:
- Idempotency is built-in (checks `event.id`)
- Duplicate events are automatically skipped
- Check logs for: "Webhook event already processed, skipping"
- No action needed (working as designed)

### Issue: High webhook failure rate

**Cause**: Application errors during processing

**Solution**:

1. **Check application logs**:
   ```bash
   # Look for errors
   grep "Failed to process webhook" logs/app.log
   ```

2. **Query failed events**:
   ```sql
   SELECT * FROM "EventLog" 
   WHERE "eventType" LIKE 'webhook.%' 
     AND processed = false
   ORDER BY "timestamp" DESC 
   LIMIT 20;
   ```

3. **Common causes**:
   - Database connection issues
   - Invalid payment data
   - Stripe API errors
   - Network timeouts

4. **Retry failed events**:
   ```typescript
   // Use WebhooksService.getUnprocessedEvents()
   // Implement retry logic in scheduled task
   ```

---

## Webhook Retry Logic

### Stripe's Retry Behavior

Stripe automatically retries failed webhooks:

- **Initial attempt**: Immediate
- **Retry 1**: After 5 minutes
- **Retry 2**: After 1 hour
- **Retry 3**: After 3 hours
- **Retry 4**: After 6 hours
- **Retry 5**: After 12 hours
- **Final retry**: After 24 hours

### Response Codes

| Code | Meaning | Stripe Action |
|------|---------|---------------|
| 200 | Success | No retry |
| 400 | Client error (bad signature) | No retry |
| 500 | Server error | Retry with backoff |
| Timeout | No response | Retry with backoff |

### Application Retry

For events that failed processing (not delivery):

```typescript
// Scheduled task (runs every hour)
@Cron('0 * * * *')
async retryFailedWebhooks() {
  const failed = await webhooksService.getUnprocessedEvents(50);
  
  for (const event of failed) {
    try {
      // Re-process event
      await stripeWebhookService.handleWebhookEvent(JSON.parse(event.payload));
      await webhooksService.markEventProcessed(event.id, true);
    } catch (error) {
      // Log and continue
      logger.error(`Retry failed for event ${event.id}: ${error.message}`);
    }
  }
}
```

---

## Production Checklist

Before deploying to production:

- [ ] `STRIPE_SECRET_KEY` configured (live mode)
- [ ] `STRIPE_WEBHOOK_SECRET` configured (from Stripe dashboard)
- [ ] Webhook endpoint URL configured in Stripe dashboard
- [ ] HTTPS enabled for webhook endpoint
- [ ] All critical events selected in Stripe dashboard
- [ ] Webhook signature verification enabled
- [ ] Application logs configured for monitoring
- [ ] Database backup enabled (for EventLog)
- [ ] Alert system configured for disputes
- [ ] Unit tests passing (25/25)
- [ ] Integration tests passing
- [ ] Manual webhook testing completed
- [ ] Stripe CLI testing completed
- [ ] Documentation reviewed by team

---

## Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Event Types Reference](https://stripe.com/docs/api/events/types)
- [Webhook Security Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Handling Disputes](https://stripe.com/docs/disputes)

---

## Support

### For Stripe Issues

- **Stripe Support**: [https://support.stripe.com](https://support.stripe.com)
- **Stripe Status**: [https://status.stripe.com](https://status.stripe.com)
- **Stripe Community**: [https://community.stripe.com](https://community.stripe.com)

### For Application Issues

1. Check application logs
2. Review this documentation
3. Test with Stripe CLI
4. Check database EventLog table
5. Contact development team

---

**Document Version**: 1.0.0  
**Last Updated**: January 1, 2026  
**Author**: AI Assistant (Agentic Fix Loop)

