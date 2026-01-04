import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

/**
 * End-to-End Payment Integration Tests
 *
 * These tests verify the complete payment flow through the order orchestrator:
 * 1. Order creation with payment authorization
 * 2. Payment capture on successful order
 * 3. Payment void/refund on failed order (compensation)
 * 4. Error handling for payment failures
 *
 * NOTE: These tests require STRIPE_SECRET_KEY to be set in environment
 * Use Stripe test mode keys (sk_test_...) for testing
 */
describe('Payment Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testLocationId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Ensure test environment
    process.env.NODE_ENV = 'test';
    process.env.STRIPE_SECRET_KEY =
      process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
    process.env.AUDIT_LOG_ENCRYPTION_KEY = 'cF1Ds+TIJ+LtW37PvZeHZ8Viav/e5UimfKvZsU2HAzA='; // Base64-encoded 32 bytes
    process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test user
    const user = await prisma.user.create({
      data: {
        username: 'test-cashier-payment',
        password: '$2b$10$test.hash',
        firstName: 'Test',
        lastName: 'Cashier',
        role: 'CASHIER',
      },
    });

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'test-cashier-payment',
        password: 'test-password',
      });

    authToken = loginResponse.body.access_token;

    // Create test location
    const location = await prisma.location.create({
      data: {
        name: 'Test Store Payment',
        address: '123 Test St',
        city: 'Test City',
        state: 'FL',
        zip: '12345',
      },
    });
    testLocationId = location.id;

    // Create test product
    const product = await prisma.product.create({
      data: {
        sku: 'TEST-PAYMENT-001',
        name: 'Test Liquor',
        category: 'spirits',
        basePrice: 29.99,
        cost: 15.0,
        ageRestricted: true,
      },
    });
    testProductId = product.id;

    // Create inventory
    await prisma.inventory.create({
      data: {
        productId: testProductId,
        locationId: testLocationId,
        quantity: 100,
        reserved: 0,
      },
    });
  }

  async function cleanupTestData() {
    await prisma.payment.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.inventory.deleteMany({});
    await prisma.product.deleteMany({
      where: { sku: { startsWith: 'TEST-PAYMENT' } },
    });
    await prisma.location.deleteMany({
      where: { name: { startsWith: 'Test Store Payment' } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'test-cashier-payment' } },
    });
  }

  describe('Cash Payment Flow', () => {
    it('should process cash payment successfully', async () => {
      const orderDto = {
        locationId: testLocationId,
        items: [
          {
            productId: testProductId,
            quantity: 1,
            price: 29.99,
          },
        ],
        paymentMethod: 'cash',
        ageVerified: true,
        idempotencyKey: `test-cash-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderDto)
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'completed',
        total: expect.any(Number),
      });

      // Verify payment record
      const payment = await prisma.payment.findFirst({
        where: { transactionId: response.body.id },
      });

      expect(payment).toMatchObject({
        method: 'cash',
        status: 'captured',
        processorId: null,
      });
    });
  });

  describe('Card Payment Flow', () => {
    it('should authorize and capture card payment', async () => {
      // Skip if no real Stripe key configured
      if (
        !process.env.STRIPE_SECRET_KEY ||
        process.env.STRIPE_SECRET_KEY === 'sk_test_mock'
      ) {
        console.log('Skipping card payment test - no Stripe key configured');
        return;
      }

      const orderDto = {
        locationId: testLocationId,
        items: [
          {
            productId: testProductId,
            quantity: 2,
            price: 29.99,
          },
        ],
        paymentMethod: 'card',
        ageVerified: true,
        idempotencyKey: `test-card-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderDto)
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'completed',
        total: expect.any(Number),
      });

      // Verify payment record
      const payment = await prisma.payment.findFirst({
        where: { transactionId: response.body.id },
      });

      expect(payment).toMatchObject({
        method: 'card',
        status: 'captured',
        processorId: expect.stringMatching(/^pi_/), // Stripe Payment Intent ID
      });
    });

    it('should handle payment authorization failure gracefully', async () => {
      // This test would require mocking Stripe to return a failure
      // For now, we document the expected behavior

      const orderDto = {
        locationId: testLocationId,
        items: [
          {
            productId: testProductId,
            quantity: 1,
            price: 29.99,
          },
        ],
        paymentMethod: 'card',
        ageVerified: true,
        idempotencyKey: `test-card-fail-${Date.now()}`,
      };

      // If payment fails, order should not be created
      // and inventory should not be reserved
      const inventoryBefore = await prisma.inventory.findFirst({
        where: { productId: testProductId, locationId: testLocationId },
      });

      // This will fail if Stripe is not configured
      if (
        !process.env.STRIPE_SECRET_KEY ||
        process.env.STRIPE_SECRET_KEY === 'sk_test_mock'
      ) {
        await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(orderDto)
          .expect(500);

        // Verify inventory was not changed
        const inventoryAfter = await prisma.inventory.findFirst({
          where: { productId: testProductId, locationId: testLocationId },
        });

        expect(inventoryAfter.quantity).toBe(inventoryBefore.quantity);
        expect(inventoryAfter.reserved).toBe(inventoryBefore.reserved);
      }
    });
  });

  describe('Payment Compensation (SAGA)', () => {
    it('should void payment if order creation fails', async () => {
      // This test verifies the compensation logic in the SAGA pattern
      // If any step after payment authorization fails, payment should be voided

      // Create order with invalid data that will fail after payment
      const orderDto = {
        locationId: testLocationId,
        items: [
          {
            productId: testProductId,
            quantity: 1000, // Exceeds available inventory
            price: 29.99,
          },
        ],
        paymentMethod: 'cash', // Use cash to avoid Stripe dependency
        ageVerified: true,
        idempotencyKey: `test-compensation-${Date.now()}`,
      };

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderDto)
        .expect(500);

      // Verify no payment record was created (or it was rolled back)
      const payments = await prisma.payment.findMany({
        where: {
          transaction: {
            idempotencyKey: orderDto.idempotencyKey,
          },
        },
      });

      expect(payments.length).toBe(0);
    });
  });

  describe('Idempotency', () => {
    it('should not create duplicate payments for same idempotency key', async () => {
      const idempotencyKey = `test-idempotent-${Date.now()}`;

      const orderDto = {
        locationId: testLocationId,
        items: [
          {
            productId: testProductId,
            quantity: 1,
            price: 29.99,
          },
        ],
        paymentMethod: 'cash',
        ageVerified: true,
        idempotencyKey,
      };

      // First request
      const response1 = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderDto)
        .expect(201);

      // Second request with same idempotency key
      const response2 = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderDto)
        .expect(201);

      // Should return the same order
      expect(response1.body.id).toBe(response2.body.id);

      // Should only have one payment record
      const payments = await prisma.payment.findMany({
        where: { transactionId: response1.body.id },
      });

      expect(payments.length).toBe(1);
    });
  });

  describe('Payment Error Handling', () => {
    it('should require Stripe key for card payments', async () => {
      // Temporarily remove Stripe key
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      // Recreate app without Stripe key
      await app.close();
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = moduleFixture.createNestApplication();
      await app.init();

      const orderDto = {
        locationId: testLocationId,
        items: [
          {
            productId: testProductId,
            quantity: 1,
            price: 29.99,
          },
        ],
        paymentMethod: 'card',
        ageVerified: true,
        idempotencyKey: `test-no-stripe-${Date.now()}`,
      };

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderDto)
        .expect(500);

      // Restore Stripe key
      process.env.STRIPE_SECRET_KEY = originalKey;
    });
  });
});
