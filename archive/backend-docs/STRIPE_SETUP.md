# Stripe Payment Integration Setup Guide

## Overview

The POS-Omni system uses Stripe for card payment processing. This guide covers setup, configuration, and testing.

## Prerequisites

1. **Stripe Account**: Sign up at [https://stripe.com](https://stripe.com)
2. **API Keys**: Get your keys from [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)

## Environment Configuration

### Development/Testing

Use Stripe **test mode** keys (they start with `sk_test_`):

```bash
STRIPE_SECRET_KEY=sk_test_51ABC...your_test_key_here
```

### Production

Use Stripe **live mode** keys (they start with `sk_test_`):

```bash
STRIPE_SECRET_KEY=sk_live_51ABC...your_live_key_here
```

⚠️ **CRITICAL**: Never commit API keys to version control. Always use environment variables.

## Payment Flow

### 1. Authorization (Reserve Funds)

When a customer initiates a purchase:

```typescript
const payment = await paymentAgent.authorize(
    100.00,           // Amount in dollars
    'card',           // Payment method
    {                 // Optional metadata
        locationId: 'loc-123',
        terminalId: 'term-456'
    }
);
```

**What happens:**
- Creates a Stripe Payment Intent with `capture_method: 'manual'`
- Authorizes the card but doesn't charge it yet
- Holds the funds for up to 7 days
- Returns `status: 'authorized'` with `processorId` (Stripe Payment Intent ID)

### 2. Capture (Complete Payment)

After order is confirmed and inventory is committed:

```typescript
await paymentAgent.capture(
    'payment-id',
    'pi_stripe_payment_intent_id'
);
```

**What happens:**
- Captures the authorized payment
- Transfers funds to your Stripe account
- Updates payment status to `captured`
- Stores card details (brand, last4) for receipts

### 3. Void/Refund (Compensation)

If order fails after payment authorization:

```typescript
await paymentAgent.void(payment);
```

**What happens:**
- If `authorized`: Cancels the payment intent (no charge)
- If `captured`: Creates a refund
- Releases funds back to customer
- Logs the compensation action

## Payment Methods

### Cash Payments

Cash payments bypass Stripe and are immediately marked as `captured`:

```typescript
const payment = await paymentAgent.authorize(50.00, 'cash');
// Returns: { status: 'captured', method: 'cash' }
```

### Card Payments

Card payments go through Stripe with authorization → capture flow:

```typescript
// Step 1: Authorize
const payment = await paymentAgent.authorize(100.00, 'card');
// Returns: { status: 'authorized', processorId: 'pi_...' }

// Step 2: Capture (after order confirmed)
await paymentAgent.capture(payment.paymentId, payment.processorId);
```

### Split Payments

For future implementation (cash + card):

```typescript
const payment = await paymentAgent.authorize(100.00, 'split', {
    cashAmount: 50.00,
    cardAmount: 50.00
});
```

## Error Handling

### User-Friendly Error Messages

The payment agent translates Stripe errors into customer-friendly messages:

| Stripe Error | User Message |
|--------------|--------------|
| `StripeCardError` | "Card declined: [reason]" |
| `StripeRateLimitError` | "Too many requests. Please try again in a moment." |
| `StripeInvalidRequestError` | "Invalid payment request. Please contact support." |
| `StripeAPIError` | "Payment service temporarily unavailable. Please try again." |
| `StripeConnectionError` | "Network error. Please check your connection and try again." |
| `StripeAuthenticationError` | "Payment configuration error. Please contact support." |

### Handling Payment Failures

```typescript
const payment = await paymentAgent.authorize(100.00, 'card');

if (payment.status === 'failed') {
    console.error(`Payment failed: ${payment.errorMessage}`);
    // Show error to user
    // Suggest alternative payment method (cash)
}
```

### Retry Logic

The Stripe SDK is configured with automatic retries:

```typescript
{
    maxNetworkRetries: 3,  // Retry failed requests up to 3 times
    timeout: 30000,        // 30 second timeout
}
```

## Testing

### Unit Tests

Run payment agent unit tests:

```bash
npm test -- payment.agent.spec.ts
```

### Integration Tests

Run end-to-end payment tests:

```bash
npm run test:e2e -- payment-integration.e2e-spec.ts
```

### Test Cards

Stripe provides test cards for different scenarios:

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 0069` | Expired card |
| `4000 0000 0000 0127` | Incorrect CVC |

More test cards: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)

### Testing Authorization Flow

```bash
# Test authorization
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "locationId": "loc-123",
    "items": [{"productId": "prod-123", "quantity": 1, "price": 29.99}],
    "paymentMethod": "card",
    "ageVerified": true,
    "idempotencyKey": "test-123"
  }'
```

## Monitoring

### Stripe Dashboard

Monitor payments in real-time:
- **Test Mode**: [https://dashboard.stripe.com/test/payments](https://dashboard.stripe.com/test/payments)
- **Live Mode**: [https://dashboard.stripe.com/payments](https://dashboard.stripe.com/payments)

### Application Logs

Payment operations are logged with structured data:

```
[PaymentAgent] Payment authorized: payment-123, Stripe PI: pi_abc123, Amount: $100.00
[PaymentAgent] Payment captured: payment-123, Stripe PI: pi_abc123, Status: succeeded
[PaymentAgent] Payment refunded: payment-123, Refund ID: re_xyz789, Amount: $100.00
```

### Webhooks (Future Enhancement)

Configure webhooks to receive real-time updates:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

## Security Best Practices

### 1. API Key Management

✅ **DO:**
- Store keys in environment variables
- Use different keys for dev/staging/prod
- Rotate keys periodically
- Use secrets manager in production (AWS Secrets Manager, Azure Key Vault)

❌ **DON'T:**
- Commit keys to version control
- Share keys in chat/email
- Use production keys in development
- Log API keys

### 2. PCI Compliance

The current implementation is **PCI-DSS compliant** because:
- ✅ Card data never touches your server (Stripe handles it)
- ✅ Only tokenized references (Payment Intent IDs) are stored
- ✅ Card details (last4, brand) are stored only for receipts
- ✅ No CVV or full card numbers are stored

### 3. Idempotency

All payment operations use idempotency keys to prevent duplicate charges:

```typescript
idempotencyKey: crypto.randomUUID()
```

### 4. Amount Validation

Always validate amounts before processing:

```typescript
if (amount <= 0) {
    throw new Error('Invalid amount');
}
if (amount > 10000) {
    throw new Error('Amount exceeds maximum ($10,000)');
}
```

## Troubleshooting

### Issue: "STRIPE_SECRET_KEY environment variable is required"

**Solution:**
1. Check `.env` file exists in `backend/` directory
2. Verify `STRIPE_SECRET_KEY=sk_test_...` is set
3. Restart the application

### Issue: "Payment authorization failed"

**Possible causes:**
1. Invalid Stripe key
2. Network connectivity issues
3. Card declined (use test cards)
4. Stripe account not activated

**Solution:**
1. Check Stripe dashboard for error details
2. Verify API key is correct
3. Check application logs for detailed error
4. Test with Stripe test cards

### Issue: "Payment capture failed"

**Possible causes:**
1. Payment Intent already captured
2. Payment Intent expired (>7 days old)
3. Insufficient funds

**Solution:**
1. Check payment status in Stripe dashboard
2. Verify Payment Intent ID is correct
3. Check if authorization has expired

### Issue: Tests failing with Stripe errors

**Solution:**
1. Ensure `STRIPE_SECRET_KEY` is set in test environment
2. Use test mode keys (`sk_test_`)
3. Check network connectivity
4. Verify test data setup is correct

## API Reference

### PaymentAgent Methods

#### `authorize(amount, method, metadata?)`

Authorize a payment.

**Parameters:**
- `amount` (number): Amount in dollars (e.g., 100.00)
- `method` ('cash' | 'card' | 'split'): Payment method
- `metadata` (object, optional): Additional data to store with payment

**Returns:**
```typescript
{
    paymentId: string;
    method: string;
    amount: number;
    status: 'authorized' | 'captured' | 'failed';
    processorId?: string;  // Stripe Payment Intent ID
    cardType?: string;     // 'visa', 'mastercard', etc.
    last4?: string;        // Last 4 digits of card
    errorMessage?: string; // If status is 'failed'
}
```

#### `capture(paymentId, processorId?)`

Capture an authorized payment.

**Parameters:**
- `paymentId` (string): Internal payment ID
- `processorId` (string, optional): Stripe Payment Intent ID

**Returns:** `Promise<void>`

#### `void(payment)`

Cancel/refund a payment.

**Parameters:**
- `payment` (PaymentResult): Payment to void

**Returns:** `Promise<void>`

#### `refund(processorId, amount?, reason?)`

Create a refund for a captured payment.

**Parameters:**
- `processorId` (string): Stripe Payment Intent ID
- `amount` (number, optional): Partial refund amount (full refund if omitted)
- `reason` ('duplicate' | 'fraudulent' | 'requested_by_customer', optional)

**Returns:** `Promise<Stripe.Refund>`

## Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Terminal Documentation](https://stripe.com/docs/terminal)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [PCI Compliance Guide](https://stripe.com/docs/security/guide)
- [Stripe Node.js Library](https://github.com/stripe/stripe-node)

## Support

For Stripe-related issues:
- **Stripe Support**: [https://support.stripe.com](https://support.stripe.com)
- **Stripe Status**: [https://status.stripe.com](https://status.stripe.com)

For application issues:
- Check application logs
- Review this documentation
- Contact development team

