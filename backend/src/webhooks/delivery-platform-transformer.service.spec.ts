import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DeliveryPlatformTransformerService } from './delivery-platform-transformer.service';
import { PrismaService } from '../prisma.service';
import { UberEatsWebhookDto } from './dto/ubereats-webhook.dto';
import { DoorDashWebhookDto } from './dto/doordash-webhook.dto';

describe('DeliveryPlatformTransformerService', () => {
  let service: DeliveryPlatformTransformerService;
  let prismaService: PrismaService;

  const mockLocation = {
    id: 'loc-123',
    name: 'Test Store',
    address: '123 Main St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    phone: '555-0100',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryPlatformTransformerService,
        {
          provide: PrismaService,
          useValue: {
            location: {
              findFirst: jest.fn().mockResolvedValue(mockLocation),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DeliveryPlatformTransformerService>(DeliveryPlatformTransformerService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('transformUberEatsOrder', () => {
    it('should transform valid Uber Eats order to CreateOrderDto', async () => {
      const uberEatsPayload: UberEatsWebhookDto = {
        event_type: 'orders.notification',
        event_id: 'evt_ubereats_123',
        order_id: 'order_ubereats_456',
        store_id: 'store_ubereats_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            title: 'Grey Goose Vodka 750ml',
            quantity: 2,
            price: 1999,
            external_data: 'VODKA-GREY-GOOSE-750ML',
          },
          {
            id: 'item-2',
            title: 'Corona Extra 12oz',
            quantity: 6,
            price: 899,
            external_data: 'BEER-CORONA-12OZ',
          },
        ],
        payment: {
          total: 9392,
          subtotal: 8996,
          tax: 396,
          tip: 0,
        },
        customer: {
          first_name: 'John',
          last_name: 'Doe',
          phone: '+1234567890',
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      const result = await service.transformUberEatsOrder(uberEatsPayload);

      expect(result).toMatchObject({
        locationId: 'loc-123',
        channel: 'uber_eats',
        paymentMethod: 'card',
        items: [
          {
            sku: 'VODKA-GREY-GOOSE-750ML',
            quantity: 2,
            priceAtSale: 19.99,
            discount: 0,
          },
          {
            sku: 'BEER-CORONA-12OZ',
            quantity: 6,
            priceAtSale: 8.99,
            discount: 0,
          },
        ],
        subtotal: 89.96,
        tax: 3.96,
        total: 93.92,
        ageVerified: true,
        ageVerifiedBy: 'Uber Eats Platform',
        idScanned: false,
      });

      expect(result.idempotencyKey).toBe('uber_eats:evt_ubereats_123:order_ubereats_456');
    });

    it('should use fallback SKU when external_data is missing', async () => {
      const uberEatsPayload: UberEatsWebhookDto = {
        event_type: 'orders.notification',
        event_id: 'evt_ubereats_123',
        order_id: 'order_ubereats_456',
        store_id: 'store_ubereats_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            title: 'Unknown Product',
            quantity: 1,
            price: 1000,
            // No external_data
          },
        ],
        payment: {
          total: 1000,
          subtotal: 1000,
          tax: 0,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      const result = await service.transformUberEatsOrder(uberEatsPayload);

      expect(result.items[0].sku).toBe('UBEREATS-item-1');
    });

    it('should reject non-created status orders', async () => {
      const uberEatsPayload: UberEatsWebhookDto = {
        event_type: 'orders.notification',
        event_id: 'evt_ubereats_123',
        order_id: 'order_ubereats_456',
        store_id: 'store_ubereats_789',
        status: 'cancelled',
        items: [
          {
            id: 'item-1',
            title: 'Product',
            quantity: 1,
            price: 1000,
          },
        ],
        payment: {
          total: 1000,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      await expect(service.transformUberEatsOrder(uberEatsPayload)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject orders with no items', async () => {
      const uberEatsPayload: UberEatsWebhookDto = {
        event_type: 'orders.notification',
        event_id: 'evt_ubereats_123',
        order_id: 'order_ubereats_456',
        store_id: 'store_ubereats_789',
        status: 'created',
        items: [],
        payment: {
          total: 0,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      await expect(service.transformUberEatsOrder(uberEatsPayload)).rejects.toThrow(
        'Order must contain at least one item',
      );
    });

    it('should handle missing optional payment fields', async () => {
      const uberEatsPayload: UberEatsWebhookDto = {
        event_type: 'orders.notification',
        event_id: 'evt_ubereats_123',
        order_id: 'order_ubereats_456',
        store_id: 'store_ubereats_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            title: 'Product',
            quantity: 1,
            price: 1000,
          },
        ],
        payment: {
          total: 1000,
          // Missing subtotal and tax
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      const result = await service.transformUberEatsOrder(uberEatsPayload);

      expect(result.subtotal).toBe(0);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(10.0);
    });
  });

  describe('transformDoorDashOrder', () => {
    it('should transform valid DoorDash order to CreateOrderDto', async () => {
      const doorDashPayload: DoorDashWebhookDto = {
        event_type: 'order.created',
        event_id: 'evt_doordash_123',
        order_id: 'order_doordash_456',
        store_id: 'store_doordash_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            name: 'Jack Daniels 750ml',
            quantity: 1,
            unit_price: 2499,
            external_id: 'WHISKEY-JACK-DANIELS-750ML',
          },
          {
            id: 'item-2',
            name: 'Budweiser 12oz 12-Pack',
            quantity: 2,
            unit_price: 1299,
            external_id: 'BEER-BUDWEISER-12OZ-12PK',
          },
        ],
        order_value: {
          subtotal: 5097,
          tax: 357,
          total: 5454,
          delivery_fee: 0,
          tip: 0,
        },
        consumer: {
          first_name: 'Jane',
          last_name: 'Smith',
          phone_number: '+1987654321',
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      const result = await service.transformDoorDashOrder(doorDashPayload);

      expect(result).toMatchObject({
        locationId: 'loc-123',
        channel: 'doordash',
        paymentMethod: 'card',
        items: [
          {
            sku: 'WHISKEY-JACK-DANIELS-750ML',
            quantity: 1,
            priceAtSale: 24.99,
            discount: 0,
          },
          {
            sku: 'BEER-BUDWEISER-12OZ-12PK',
            quantity: 2,
            priceAtSale: 12.99,
            discount: 0,
          },
        ],
        subtotal: 50.97,
        tax: 3.57,
        total: 54.54,
        ageVerified: true,
        ageVerifiedBy: 'DoorDash Platform',
        idScanned: false,
      });

      expect(result.idempotencyKey).toBe('doordash:evt_doordash_123:order_doordash_456');
    });

    it('should use fallback SKU when external_id is missing', async () => {
      const doorDashPayload: DoorDashWebhookDto = {
        event_type: 'order.created',
        event_id: 'evt_doordash_123',
        order_id: 'order_doordash_456',
        store_id: 'store_doordash_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            name: 'Unknown Product',
            quantity: 1,
            unit_price: 1000,
            // No external_id
          },
        ],
        order_value: {
          subtotal: 1000,
          tax: 0,
          total: 1000,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      const result = await service.transformDoorDashOrder(doorDashPayload);

      expect(result.items[0].sku).toBe('DOORDASH-item-1');
    });

    it('should reject non-created status orders', async () => {
      const doorDashPayload: DoorDashWebhookDto = {
        event_type: 'order.created',
        event_id: 'evt_doordash_123',
        order_id: 'order_doordash_456',
        store_id: 'store_doordash_789',
        status: 'cancelled',
        items: [
          {
            id: 'item-1',
            name: 'Product',
            quantity: 1,
            unit_price: 1000,
          },
        ],
        order_value: {
          subtotal: 1000,
          tax: 0,
          total: 1000,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      await expect(service.transformDoorDashOrder(doorDashPayload)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject orders with no items', async () => {
      const doorDashPayload: DoorDashWebhookDto = {
        event_type: 'order.created',
        event_id: 'evt_doordash_123',
        order_id: 'order_doordash_456',
        store_id: 'store_doordash_789',
        status: 'created',
        items: [],
        order_value: {
          subtotal: 0,
          tax: 0,
          total: 0,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      await expect(service.transformDoorDashOrder(doorDashPayload)).rejects.toThrow(
        'Order must contain at least one item',
      );
    });

    it('should handle location mapping failure gracefully', async () => {
      // Mock both calls to findFirst to return null (first for store mapping, second for default location)
      jest
        .spyOn(prismaService.location, 'findFirst')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const doorDashPayload: DoorDashWebhookDto = {
        event_type: 'order.created',
        event_id: 'evt_doordash_123',
        order_id: 'order_doordash_456',
        store_id: 'store_doordash_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            name: 'Product',
            quantity: 1,
            unit_price: 1000,
          },
        ],
        order_value: {
          subtotal: 1000,
          tax: 0,
          total: 1000,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      await expect(service.transformDoorDashOrder(doorDashPayload)).rejects.toThrow(
        'Failed to map store to location',
      );
    });
  });

  describe('currency conversion', () => {
    it('should correctly convert cents to dollars', async () => {
      const uberEatsPayload: UberEatsWebhookDto = {
        event_type: 'orders.notification',
        event_id: 'evt_123',
        order_id: 'order_456',
        store_id: 'store_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            title: 'Product',
            quantity: 1,
            price: 1234, // $12.34
          },
        ],
        payment: {
          total: 1234,
          subtotal: 1100,
          tax: 134,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      const result = await service.transformUberEatsOrder(uberEatsPayload);

      expect(result.items[0].priceAtSale).toBe(12.34);
      expect(result.subtotal).toBe(11.0);
      expect(result.tax).toBe(1.34);
      expect(result.total).toBe(12.34);
    });

    it('should handle rounding correctly', async () => {
      const uberEatsPayload: UberEatsWebhookDto = {
        event_type: 'orders.notification',
        event_id: 'evt_123',
        order_id: 'order_456',
        store_id: 'store_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            title: 'Product',
            quantity: 1,
            price: 1999, // $19.99
          },
        ],
        payment: {
          total: 1999,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      const result = await service.transformUberEatsOrder(uberEatsPayload);

      expect(result.items[0].priceAtSale).toBe(19.99);
      expect(result.total).toBe(19.99);
    });
  });

  describe('idempotency key generation', () => {
    it('should generate unique idempotency keys for different platforms', async () => {
      const uberEatsPayload: UberEatsWebhookDto = {
        event_type: 'orders.notification',
        event_id: 'evt_123',
        order_id: 'order_456',
        store_id: 'store_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            title: 'Product',
            quantity: 1,
            price: 1000,
          },
        ],
        payment: {
          total: 1000,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      const doorDashPayload: DoorDashWebhookDto = {
        event_type: 'order.created',
        event_id: 'evt_123',
        order_id: 'order_456',
        store_id: 'store_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            name: 'Product',
            quantity: 1,
            unit_price: 1000,
          },
        ],
        order_value: {
          subtotal: 1000,
          tax: 0,
          total: 1000,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      const uberEatsResult = await service.transformUberEatsOrder(uberEatsPayload);
      const doorDashResult = await service.transformDoorDashOrder(doorDashPayload);

      expect(uberEatsResult.idempotencyKey).toBe('uber_eats:evt_123:order_456');
      expect(doorDashResult.idempotencyKey).toBe('doordash:evt_123:order_456');
      expect(uberEatsResult.idempotencyKey).not.toBe(doorDashResult.idempotencyKey);
    });
  });
});
