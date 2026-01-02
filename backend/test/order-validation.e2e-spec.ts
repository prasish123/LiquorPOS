import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Order Validation (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Enable validation pipe (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    // Get auth token for protected endpoints
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'admin123',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /orders - CreateOrderDto Validation', () => {
    const validOrder = {
      locationId: 'c1234567890123456789012345',
      terminalId: 'c9876543210987654321098765',
      items: [
        {
          sku: 'WINE-001',
          quantity: 2,
          priceAtSale: 19.99,
        },
      ],
      paymentMethod: 'card',
      channel: 'counter',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      ageVerified: true,
      ageVerifiedBy: 'John Doe',
    };

    describe('Required Fields', () => {
      it('should reject order without locationId', () => {
        const invalidOrder = { ...validOrder };
        delete (invalidOrder as any).locationId;

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('Location ID is required');
          });
      });

      it('should reject order without items', () => {
        const invalidOrder = { ...validOrder };
        delete (invalidOrder as any).items;

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('Items must be an array');
          });
      });

      it('should reject order without paymentMethod', () => {
        const invalidOrder = { ...validOrder };
        delete (invalidOrder as any).paymentMethod;

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('Payment method is required');
          });
      });

      it('should reject order without channel', () => {
        const invalidOrder = { ...validOrder };
        delete (invalidOrder as any).channel;

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('Channel is required');
          });
      });

      it('should reject order without idempotencyKey', () => {
        const invalidOrder = { ...validOrder };
        delete (invalidOrder as any).idempotencyKey;

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('Idempotency key is required');
          });
      });
    });

    describe('ID Format Validation', () => {
      it('should reject invalid locationId format', () => {
        const invalidOrder = {
          ...validOrder,
          locationId: 'invalid-id',
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('Location ID must be a valid');
          });
      });

      it('should accept valid UUID locationId', () => {
        const validOrderWithUUID = {
          ...validOrder,
          locationId: '550e8400-e29b-41d4-a716-446655440001',
          idempotencyKey: '550e8400-e29b-41d4-a716-446655440002',
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(validOrderWithUUID)
          .expect(201);
      });

      it('should accept valid CUID locationId', () => {
        const validOrderWithCUID = {
          ...validOrder,
          locationId: 'c1234567890123456789012345',
          idempotencyKey: '550e8400-e29b-41d4-a716-446655440003',
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(validOrderWithCUID)
          .expect(201);
      });
    });

    describe('Items Array Validation', () => {
      it('should reject order with empty items array', () => {
        const invalidOrder = {
          ...validOrder,
          items: [],
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('at least 1 item');
          });
      });

      it('should reject order with more than 100 items', () => {
        const items = Array(101)
          .fill(null)
          .map((_, i) => ({
            sku: `WINE-${i.toString().padStart(3, '0')}`,
            quantity: 1,
            priceAtSale: 19.99,
          }));

        const invalidOrder = {
          ...validOrder,
          items,
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('cannot contain more than 100');
          });
      });
    });

    describe('SKU Validation', () => {
      it('should reject invalid SKU format', () => {
        const invalidOrder = {
          ...validOrder,
          items: [
            {
              sku: 'a', // Too short
              quantity: 1,
            },
          ],
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('SKU must be a valid');
          });
      });

      it('should accept valid SKU formats', () => {
        const validSKUs = ['WINE-001', 'BEER-CORONA-12OZ', 'VODKA-GREY-GOOSE'];

        for (const sku of validSKUs) {
          const order = {
            ...validOrder,
            items: [{ sku, quantity: 1, priceAtSale: 19.99 }],
            idempotencyKey: `test-${sku}-${Date.now()}`,
          };

          request(app.getHttpServer())
            .post('/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send(order)
            .expect(201);
        }
      });
    });

    describe('Quantity Validation', () => {
      it('should reject quantity of 0', () => {
        const invalidOrder = {
          ...validOrder,
          items: [
            {
              sku: 'WINE-001',
              quantity: 0,
            },
          ],
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('Quantity must be between 1');
          });
      });

      it('should reject negative quantity', () => {
        const invalidOrder = {
          ...validOrder,
          items: [
            {
              sku: 'WINE-001',
              quantity: -5,
            },
          ],
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('Quantity must be between 1');
          });
      });

      it('should reject quantity over 1000', () => {
        const invalidOrder = {
          ...validOrder,
          items: [
            {
              sku: 'WINE-001',
              quantity: 1001,
            },
          ],
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('Quantity must be between');
          });
      });

      it('should reject non-integer quantity', () => {
        const invalidOrder = {
          ...validOrder,
          items: [
            {
              sku: 'WINE-001',
              quantity: 2.5,
            },
          ],
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400);
      });
    });

    describe('Payment Method Validation', () => {
      it('should reject invalid payment method', () => {
        const invalidOrder = {
          ...validOrder,
          paymentMethod: 'bitcoin',
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('Payment method must be');
          });
      });

      it('should accept valid payment methods', () => {
        const validMethods = ['cash', 'card', 'split'];

        for (const method of validMethods) {
          const order = {
            ...validOrder,
            paymentMethod: method,
            idempotencyKey: `test-${method}-${Date.now()}`,
          };

          request(app.getHttpServer())
            .post('/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send(order)
            .expect(201);
        }
      });
    });

    describe('Channel Validation', () => {
      it('should reject invalid channel', () => {
        const invalidOrder = {
          ...validOrder,
          channel: 'invalid_channel',
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('Channel must be');
          });
      });

      it('should accept valid channels', () => {
        const validChannels = ['counter', 'web', 'uber_eats', 'doordash'];

        for (const channel of validChannels) {
          const order = {
            ...validOrder,
            channel,
            idempotencyKey: `test-${channel}-${Date.now()}`,
          };

          request(app.getHttpServer())
            .post('/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send(order)
            .expect(201);
        }
      });
    });

    describe('Monetary Amount Validation', () => {
      it('should reject negative subtotal', () => {
        const invalidOrder = {
          ...validOrder,
          subtotal: -10.0,
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400);
      });

      it('should reject excessively large amounts', () => {
        const invalidOrder = {
          ...validOrder,
          total: 200000, // Over 100k limit
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('reasonable amount');
          });
      });

      it('should reject amounts with more than 2 decimal places', () => {
        const invalidOrder = {
          ...validOrder,
          items: [
            {
              sku: 'WINE-001',
              quantity: 1,
              priceAtSale: 19.999, // 3 decimal places
            },
          ],
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400);
      });
    });

    describe('Idempotency Key Validation', () => {
      it('should reject invalid idempotency key format', () => {
        const invalidOrder = {
          ...validOrder,
          idempotencyKey: 'short',
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('Idempotency key must be');
          });
      });

      it('should accept UUID v4 idempotency key', () => {
        const order = {
          ...validOrder,
          idempotencyKey: '550e8400-e29b-41d4-a716-446655440099',
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(order)
          .expect(201);
      });

      it('should accept custom format idempotency key', () => {
        const order = {
          ...validOrder,
          idempotencyKey: 'order-2024-01-01-abc123def456',
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(order)
          .expect(201);
      });
    });

    describe('Age Verification Validation', () => {
      it('should reject non-boolean ageVerified', () => {
        const invalidOrder = {
          ...validOrder,
          ageVerified: 'yes',
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain(
              'Age verified must be a boolean',
            );
          });
      });

      it('should reject ageVerifiedBy that is too short', () => {
        const invalidOrder = {
          ...validOrder,
          ageVerifiedBy: 'A',
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain('at least 2 characters');
          });
      });

      it('should reject ageVerifiedBy that is too long', () => {
        const invalidOrder = {
          ...validOrder,
          ageVerifiedBy: 'A'.repeat(101),
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidOrder)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain(
              'must not exceed 100 characters',
            );
          });
      });
    });

    describe('Complex Validation Scenarios', () => {
      it('should validate multiple items correctly', () => {
        const order = {
          ...validOrder,
          items: [
            { sku: 'WINE-001', quantity: 2, priceAtSale: 19.99 },
            { sku: 'BEER-001', quantity: 6, priceAtSale: 8.99 },
            { sku: 'VODKA-001', quantity: 1, priceAtSale: 29.99 },
          ],
          idempotencyKey: 'multi-item-test-' + Date.now(),
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(order)
          .expect(201);
      });

      it('should reject if any item in array is invalid', () => {
        const order = {
          ...validOrder,
          items: [
            { sku: 'WINE-001', quantity: 2, priceAtSale: 19.99 },
            { sku: 'X', quantity: 1 }, // Invalid SKU
          ],
        };

        return request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(order)
          .expect(400);
      });
    });
  });

  describe('PATCH /orders/:id - UpdateOrderDto Validation', () => {
    it('should reject invalid payment status', () => {
      return request(app.getHttpServer())
        .patch('/orders/test-order-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentStatus: 'invalid_status' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Payment status must be');
        });
    });

    it('should accept valid payment status', () => {
      const validStatuses = ['completed', 'refunded', 'partial_refund'];

      for (const status of validStatuses) {
        request(app.getHttpServer())
          .patch('/orders/test-order-id')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ paymentStatus: status })
          .expect(200);
      }
    });

    it('should reject non-boolean syncedToCloud', () => {
      return request(app.getHttpServer())
        .patch('/orders/test-order-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ syncedToCloud: 'true' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('must be a boolean');
        });
    });
  });
});
