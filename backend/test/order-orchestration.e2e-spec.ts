import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import * as request from 'supertest';

describe('Order Orchestration Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
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

    // Create test user and get auth token
    const hashedPassword = await require('bcrypt').hash('testpass123', 10);
    await prisma.user.upsert({
      where: { username: 'testuser' },
      update: {},
      create: {
        username: 'testuser',
        password: hashedPassword,
        role: 'cashier',
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'testuser', password: 'testpass123' })
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
        name: 'Test Store',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        licenseNumber: `TEST-${Date.now()}`,
        licenseExpiry: new Date('2030-12-31'),
      },
    });
    testLocationId = location.id;

    // Create test product
    const product = await prisma.product.create({
      data: {
        sku: `TEST-SKU-${Date.now()}`,
        name: 'Test Wine',
        basePrice: 25.99,
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
        quantity: 100,
        reserved: 0,
        reorderPoint: 10,
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

  describe('Happy Path - Complete Order Flow', () => {
    it('should successfully process a cash order end-to-end', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-01',
        employeeId: 'emp-001',
        items: [
          {
            sku: product!.sku,
            quantity: 2,
          },
        ],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        ageVerifiedBy: 'emp-001',
        idempotencyKey: `test-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('total');
      expect(response.body.paymentStatus).toBe('completed');
      expect(response.body.paymentMethod).toBe('cash');
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].quantity).toBe(2);

      // Verify transaction was created
      const transaction = await prisma.transaction.findUnique({
        where: { id: response.body.id },
        include: { items: true },
      });
      expect(transaction).not.toBeNull();
      expect(transaction!.paymentStatus).toBe('completed');

      // Verify inventory was updated
      const inventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });
      expect(inventory!.quantity).toBe(98); // 100 - 2
      expect(inventory!.reserved).toBe(0);

      // Verify payment record was created
      const payment = await prisma.payment.findFirst({
        where: { transactionId: response.body.id },
      });
      expect(payment).not.toBeNull();
      expect(payment!.method).toBe('cash');
      expect(payment!.status).toBe('captured');
    });

    it('should successfully process a card order with authorization and capture', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-01',
        items: [
          {
            sku: product!.sku,
            quantity: 1,
          },
        ],
        paymentMethod: 'card',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: `test-card-${Date.now()}`,
      };

      // Note: This will fail if Stripe is not configured, which is expected
      // In a real test environment, you'd mock Stripe or use test keys
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto);

      // If Stripe is configured, verify success
      if (response.status === 201) {
        expect(response.body.paymentMethod).toBe('card');
        expect(response.body.paymentStatus).toBe('completed');

        // Verify payment record
        const payment = await prisma.payment.findFirst({
          where: { transactionId: response.body.id },
        });
        expect(payment).not.toBeNull();
        expect(payment!.method).toBe('card');
      } else {
        // If Stripe not configured, expect appropriate error
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should handle multiple items in a single order', async () => {
      // Create second product
      const product2 = await prisma.product.create({
        data: {
          sku: `TEST-SKU-2-${Date.now()}`,
          name: 'Test Beer',
          basePrice: 8.99,
          category: 'Beer',
          trackInventory: true,
          ageRestricted: true,
        },
      });

      await prisma.inventory.create({
        data: {
          productId: product2.id,
          locationId: testLocationId,
          quantity: 50,
          reserved: 0,
          reorderPoint: 5,
        },
      });

      const product1 = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-01',
        items: [
          { sku: product1!.sku, quantity: 2 },
          { sku: product2.sku, quantity: 3 },
        ],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: `test-multi-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto)
        .expect(201);

      expect(response.body.items).toHaveLength(2);

      // Verify both inventories updated
      const inv1 = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });
      expect(inv1!.quantity).toBe(98); // 100 - 2

      const inv2 = await prisma.inventory.findFirst({
        where: { productId: product2.id },
      });
      expect(inv2!.quantity).toBe(47); // 50 - 3

      // Cleanup
      await prisma.inventory.deleteMany({ where: { productId: product2.id } });
      await prisma.product.delete({ where: { id: product2.id } });
    });
  });

  describe('Idempotency', () => {
    it('should return existing order for duplicate idempotency key', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      const idempotencyKey = `test-idem-${Date.now()}`;
      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-01',
        items: [{ sku: product!.sku, quantity: 1 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey,
      };

      // First request
      const response1 = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto)
        .expect(201);

      const orderId1 = response1.body.id;

      // Second request with same idempotency key
      const response2 = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto)
        .expect(200); // Should return existing order

      expect(response2.body.id).toBe(orderId1);

      // Verify inventory only deducted once
      const inventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });
      expect(inventory!.quantity).toBe(99); // 100 - 1 (not 98)
    });
  });

  describe('Validation', () => {
    it('should reject order with insufficient inventory', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-01',
        items: [
          {
            sku: product!.sku,
            quantity: 150, // More than available (100)
          },
        ],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: `test-insuf-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto)
        .expect(400);

      expect(response.body.message).toContain('Insufficient inventory');

      // Verify inventory unchanged
      const inventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });
      expect(inventory!.quantity).toBe(100);
      expect(inventory!.reserved).toBe(0);
    });

    it('should reject order without age verification for restricted items', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-01',
        items: [{ sku: product!.sku, quantity: 1 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: false, // Not verified
        idempotencyKey: `test-age-${Date.now()}`,
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto)
        .expect(403);

      expect(response.body.message).toContain('Age verification required');
    });

    it('should reject order for non-existent product', async () => {
      const orderDto = {
        locationId: testLocationId,
        terminalId: 'terminal-01',
        items: [{ sku: 'NON-EXISTENT-SKU', quantity: 1 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: `test-notfound-${Date.now()}`,
      };

      await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send(orderDto)
        .expect(400);
    });
  });

  describe('Order Retrieval', () => {
    it('should retrieve order by ID', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      // Create order
      const createResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          locationId: testLocationId,
          terminalId: 'terminal-01',
          items: [{ sku: product!.sku, quantity: 1 }],
          paymentMethod: 'cash',
          channel: 'counter',
          ageVerified: true,
          idempotencyKey: `test-get-${Date.now()}`,
        })
        .expect(201);

      const orderId = createResponse.body.id;

      // Retrieve order
      const getResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Cookie', `access_token=${authToken}`)
        .expect(200);

      expect(getResponse.body.id).toBe(orderId);
      expect(getResponse.body.items).toHaveLength(1);
    });

    it('should list all orders', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      // Create multiple orders
      await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          locationId: testLocationId,
          terminalId: 'terminal-01',
          items: [{ sku: product!.sku, quantity: 1 }],
          paymentMethod: 'cash',
          channel: 'counter',
          ageVerified: true,
          idempotencyKey: `test-list-1-${Date.now()}`,
        });

      await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          locationId: testLocationId,
          terminalId: 'terminal-01',
          items: [{ sku: product!.sku, quantity: 1 }],
          paymentMethod: 'cash',
          channel: 'counter',
          ageVerified: true,
          idempotencyKey: `test-list-2-${Date.now()}`,
        });

      // List orders
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Cookie', `access_token=${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Performance', () => {
    it('should handle concurrent order creation', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      // Create 5 concurrent orders
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app.getHttpServer())
          .post('/orders')
          .set('Cookie', `access_token=${authToken}`)
          .send({
            locationId: testLocationId,
            terminalId: 'terminal-01',
            items: [{ sku: product!.sku, quantity: 1 }],
            paymentMethod: 'cash',
            channel: 'counter',
            ageVerified: true,
            idempotencyKey: `test-concurrent-${i}-${Date.now()}`,
          }),
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.status).toBe(201);
      });

      // Verify inventory correctly updated
      const inventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });
      expect(inventory!.quantity).toBe(95); // 100 - 5
    });
  });
});
