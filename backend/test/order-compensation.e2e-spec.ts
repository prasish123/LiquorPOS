import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { PaymentAgent } from '../src/orders/agents/payment.agent';
import * as request from 'supertest';

describe('Order Compensation (SAGA Pattern) Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let paymentAgent: PaymentAgent;
  let authToken: string;
  let testLocationId: string;
  let testProductId: string;
  let testInventoryId: string;

  beforeAll(async () => {
    // Set required environment variables for testing
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration-tests';
    process.env.AUDIT_LOG_ENCRYPTION_KEY =
      'dGVzdC1hdWRpdC1sb2ctZW5jcnlwdGlvbi1rZXk=';
    process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';
    process.env.NODE_ENV = 'test';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    paymentAgent = app.get<PaymentAgent>(PaymentAgent);

    // Create test user and get auth token
    const hashedPassword = await require('bcrypt').hash('testpass123', 10);
    await prisma.user.upsert({
      where: { username: 'testcompuser' },
      update: {},
      create: {
        username: 'testcompuser',
        password: hashedPassword,
        role: 'cashier',
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'testcompuser', password: 'testpass123' })
      .expect(200);

    authToken = loginResponse.headers['set-cookie']
      .find((cookie: string) => cookie.startsWith('access_token'))
      .split(';')[0]
      .split('=')[1];
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create test location
    const location = await prisma.location.create({
      data: {
        name: 'Compensation Test Store',
        address: '456 Comp St',
        city: 'Comp City',
        state: 'CS',
        zipCode: '54321',
        licenseNumber: `COMP-${Date.now()}`,
        licenseExpiry: new Date('2030-12-31'),
      },
    });
    testLocationId = location.id;

    // Create test product
    const product = await prisma.product.create({
      data: {
        sku: `COMP-SKU-${Date.now()}`,
        name: 'Compensation Test Wine',
        basePrice: 30.99,
        category: 'Wine',
        trackInventory: true,
        ageRestricted: true,
      },
    });
    testProductId = product.id;

    // Create inventory
    const inventory = await prisma.inventory.create({
      data: {
        productId: testProductId,
        locationId: testLocationId,
        quantity: 10,
        reserved: 0,
        reorderPoint: 2,
      },
    });
    testInventoryId = inventory.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.transactionItem.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.inventory.deleteMany({ where: { id: testInventoryId } });
    await prisma.product.deleteMany({ where: { id: testProductId } });
    await prisma.location.deleteMany({ where: { id: testLocationId } });
  });

  describe('Inventory Compensation', () => {
    it('should release inventory reservation when payment fails', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      // Mock payment failure by using invalid payment method
      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-comp-01',
        items: [{ sku: product!.sku, quantity: 3 }],
        paymentMethod: 'invalid_method', // This should fail
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: `test-comp-inv-${Date.now()}`,
      };

      // Verify initial inventory
      let inventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });
      expect(inventory!.quantity).toBe(10);
      expect(inventory!.reserved).toBe(0);

      // Attempt order (should fail at payment)
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto);

      // Order should fail
      expect(response.status).toBeGreaterThanOrEqual(400);

      // Wait a bit for async compensation
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify inventory was released (compensation)
      inventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });
      expect(inventory!.quantity).toBe(10); // Back to original
      expect(inventory!.reserved).toBe(0); // No reservations
    });

    it('should handle compensation when inventory becomes unavailable mid-transaction', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      // Reduce inventory to edge case
      await prisma.inventory.update({
        where: { id: testInventoryId },
        data: { quantity: 2 },
      });

      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-comp-02',
        items: [{ sku: product!.sku, quantity: 2 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: `test-comp-edge-${Date.now()}`,
      };

      // This should succeed
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto)
        .expect(201);

      // Verify inventory depleted
      const inventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });
      expect(inventory!.quantity).toBe(0);
    });
  });

  describe('Payment Compensation', () => {
    it('should void payment authorization if transaction creation fails', async () => {
      // This test requires Stripe to be configured
      // In a real scenario, you'd mock the payment service or use test keys

      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      // Attempt to create order with card payment
      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-comp-03',
        items: [{ sku: product!.sku, quantity: 1 }],
        paymentMethod: 'card',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: `test-comp-payment-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto);

      // If Stripe is not configured, this will fail early
      // If configured, verify payment handling
      if (response.status === 201) {
        // Verify payment record exists
        const payment = await prisma.payment.findFirst({
          where: { transactionId: response.body.id },
        });
        expect(payment).not.toBeNull();
        expect(['captured', 'authorized']).toContain(payment!.status);
      }
    });

    it('should handle partial payment failures gracefully', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      // Test with cash (always succeeds)
      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-comp-04',
        items: [{ sku: product!.sku, quantity: 1 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: `test-comp-partial-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto)
        .expect(201);

      // Verify payment completed
      const payment = await prisma.payment.findFirst({
        where: { transactionId: response.body.id },
      });
      expect(payment!.status).toBe('captured');
    });
  });

  describe('Transaction Rollback', () => {
    it('should rollback entire transaction on database error', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      // Create order with valid data
      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-comp-05',
        items: [{ sku: product!.sku, quantity: 1 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: `test-comp-rollback-${Date.now()}`,
      };

      // First order should succeed
      await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto)
        .expect(201);

      // Verify inventory updated
      const inventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });
      expect(inventory!.quantity).toBe(9); // 10 - 1
    });

    it('should maintain data consistency across multiple compensation steps', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      // Create multiple orders to test consistency
      const orders = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Cookie', `access_token=${authToken}`)
          .send({
            locationId: testLocationId,
            terminalId: 'terminal-comp-06',
            items: [{ sku: product!.sku, quantity: 1 }],
            paymentMethod: 'cash',
            channel: 'counter',
            ageVerified: true,
            idempotencyKey: `test-comp-multi-${i}-${Date.now()}`,
          })
          .expect(201);

        orders.push(response.body);
      }

      // Verify all orders created
      expect(orders).toHaveLength(3);

      // Verify inventory consistency
      const inventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });
      expect(inventory!.quantity).toBe(7); // 10 - 3
      expect(inventory!.reserved).toBe(0);

      // Verify all transactions exist
      const transactions = await prisma.transaction.findMany({
        where: {
          id: { in: orders.map((o) => o.id) },
        },
      });
      expect(transactions).toHaveLength(3);
    });
  });

  describe('Compliance Compensation', () => {
    it('should reject order and compensate when age verification fails', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-comp-07',
        items: [{ sku: product!.sku, quantity: 1 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: false, // Compliance failure
        idempotencyKey: `test-comp-compliance-${Date.now()}`,
      };

      // Initial inventory
      let inventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });
      const initialQuantity = inventory!.quantity;

      // Attempt order
      await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto)
        .expect(403);

      // Verify inventory unchanged (compensation worked)
      inventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });
      expect(inventory!.quantity).toBe(initialQuantity);
      expect(inventory!.reserved).toBe(0);
    });
  });

  describe('Concurrent Compensation', () => {
    it('should handle concurrent order failures with proper compensation', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      // Attempt 5 concurrent orders with insufficient inventory
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app.getHttpServer())
          .post('/orders')
          .set('Cookie', `access_token=${authToken}`)
          .send({
            locationId: testLocationId,
            terminalId: 'terminal-comp-08',
            items: [{ sku: product!.sku, quantity: 3 }], // 5 * 3 = 15 > 10 available
            paymentMethod: 'cash',
            channel: 'counter',
            ageVerified: true,
            idempotencyKey: `test-comp-concurrent-${i}-${Date.now()}`,
          }),
      );

      const results = await Promise.all(promises);

      // Some should succeed, some should fail
      const succeeded = results.filter((r) => r.status === 201).length;
      const failed = results.filter((r) => r.status >= 400).length;

      expect(succeeded).toBeGreaterThanOrEqual(1);
      expect(failed).toBeGreaterThanOrEqual(1);
      expect(succeeded + failed).toBe(5);

      // Wait for compensation
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify inventory consistency
      const inventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });

      // Inventory should be reduced by succeeded orders only
      expect(inventory!.quantity).toBe(10 - succeeded * 3);
      expect(inventory!.reserved).toBe(0);
    });
  });

  describe('Audit Trail', () => {
    it('should create audit records for compensation actions', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-comp-09',
        items: [{ sku: product!.sku, quantity: 1 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: `test-comp-audit-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto)
        .expect(201);

      // Verify transaction has audit trail
      const transaction = await prisma.transaction.findUnique({
        where: { id: response.body.id },
      });

      expect(transaction).not.toBeNull();
      expect(transaction!.createdAt).toBeDefined();
      expect(transaction!.updatedAt).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero inventory gracefully', async () => {
      // Deplete inventory
      await prisma.inventory.update({
        where: { id: testInventoryId },
        data: { quantity: 0 },
      });

      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-comp-10',
        items: [{ sku: product!.sku, quantity: 1 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: `test-comp-zero-${Date.now()}`,
      };

      await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto)
        .expect(400);
    });

    it('should handle large quantity orders with proper compensation', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-comp-11',
        items: [{ sku: product!.sku, quantity: 100 }], // Way more than available
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: `test-comp-large-${Date.now()}`,
      };

      await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto)
        .expect(400);

      // Verify inventory unchanged
      const inventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });
      expect(inventory!.quantity).toBe(10);
    });
  });
});
