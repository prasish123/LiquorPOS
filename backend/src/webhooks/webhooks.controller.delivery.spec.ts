import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { StripeWebhookService } from './stripe-webhook.service';
import { DeliveryPlatformTransformerService } from './delivery-platform-transformer.service';
import { OrderOrchestrator } from '../orders/order-orchestrator';
import { WebhooksService } from './webhooks.service';
import { UberEatsWebhookDto } from './dto/ubereats-webhook.dto';
import { DoorDashWebhookDto } from './dto/doordash-webhook.dto';
import { CreateOrderDto } from '../orders/dto/order.dto';

describe('WebhooksController - Delivery Platforms', () => {
  let controller: WebhooksController;
  let deliveryTransformer: DeliveryPlatformTransformerService;
  let orderOrchestrator: OrderOrchestrator;
  let webhooksService: WebhooksService;

  const mockCreateOrderDto: CreateOrderDto = {
    locationId: 'loc-123',
    items: [
      {
        sku: 'TEST-SKU-001',
        quantity: 1,
        priceAtSale: 19.99,
        discount: 0,
      },
    ],
    paymentMethod: 'card',
    channel: 'uber_eats',
    subtotal: 19.99,
    tax: 1.40,
    total: 21.39,
    ageVerified: true,
    ageVerifiedBy: 'Uber Eats Platform',
    idScanned: false,
    idempotencyKey: 'uber_eats:evt_123:order_456',
  };

  const mockOrderResponse = {
    id: 'order-123',
    locationId: 'loc-123',
    terminalId: undefined,
    employeeId: undefined,
    customerId: undefined,
    subtotal: 19.99,
    tax: 1.40,
    discount: 0,
    total: 21.39,
    paymentMethod: 'card',
    paymentStatus: 'completed',
    channel: 'uber_eats',
    ageVerified: true,
    idScanned: false,
    items: [],
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        {
          provide: StripeWebhookService,
          useValue: {
            processWebhook: jest.fn(),
          },
        },
        {
          provide: DeliveryPlatformTransformerService,
          useValue: {
            transformUberEatsOrder: jest.fn(),
            transformDoorDashOrder: jest.fn(),
          },
        },
        {
          provide: OrderOrchestrator,
          useValue: {
            processOrder: jest.fn(),
          },
        },
        {
          provide: WebhooksService,
          useValue: {
            storeWebhookEvent: jest.fn(),
            markEventProcessed: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    deliveryTransformer = module.get<DeliveryPlatformTransformerService>(
      DeliveryPlatformTransformerService,
    );
    orderOrchestrator = module.get<OrderOrchestrator>(OrderOrchestrator);
    webhooksService = module.get<WebhooksService>(WebhooksService);
  });

  describe('handleUberEatsWebhook', () => {
    it('should successfully process valid Uber Eats webhook', async () => {
      const payload: UberEatsWebhookDto = {
        event_type: 'orders.notification',
        event_id: 'evt_ubereats_123',
        order_id: 'order_ubereats_456',
        store_id: 'store_ubereats_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            title: 'Test Product',
            quantity: 1,
            price: 1999,
            external_data: 'TEST-SKU-001',
          },
        ],
        payment: {
          total: 2139,
          subtotal: 1999,
          tax: 140,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      jest
        .spyOn(webhooksService, 'storeWebhookEvent')
        .mockResolvedValue('event-123');
      jest
        .spyOn(deliveryTransformer, 'transformUberEatsOrder')
        .mockResolvedValue(mockCreateOrderDto);
      jest
        .spyOn(orderOrchestrator, 'processOrder')
        .mockResolvedValue(mockOrderResponse);

      const result = await controller.handleUberEatsWebhook(
        'test-signature',
        payload,
      );

      expect(result).toEqual({
        received: true,
        orderId: 'order-123',
      });

      expect(webhooksService.storeWebhookEvent).toHaveBeenCalledWith(
        'other',
        'ubereats.orders.notification',
        'evt_ubereats_123',
        payload,
      );

      expect(deliveryTransformer.transformUberEatsOrder).toHaveBeenCalledWith(
        payload,
      );

      expect(orderOrchestrator.processOrder).toHaveBeenCalledWith(
        mockCreateOrderDto,
      );

      expect(webhooksService.markEventProcessed).toHaveBeenCalledWith(
        'event-123',
        true,
      );
    });

    it('should skip non-created status orders', async () => {
      const payload: UberEatsWebhookDto = {
        event_type: 'orders.notification',
        event_id: 'evt_ubereats_cancelled_123',
        order_id: 'order_ubereats_cancelled_456',
        store_id: 'store_ubereats_789',
        status: 'cancelled',
        items: [
          {
            id: 'item-1',
            title: 'Test Product',
            quantity: 1,
            price: 1999,
          },
        ],
        payment: {
          total: 1999,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      jest
        .spyOn(webhooksService, 'storeWebhookEvent')
        .mockResolvedValue('event-123');

      const result = await controller.handleUberEatsWebhook(
        'test-signature',
        payload,
      );

      expect(result).toEqual({
        received: true,
      });

      expect(deliveryTransformer.transformUberEatsOrder).not.toHaveBeenCalled();
      expect(orderOrchestrator.processOrder).not.toHaveBeenCalled();
      expect(webhooksService.markEventProcessed).toHaveBeenCalledWith(
        'event-123',
        true,
      );
    });

    it('should handle transformation errors', async () => {
      const payload: UberEatsWebhookDto = {
        event_type: 'orders.notification',
        event_id: 'evt_ubereats_error_123',
        order_id: 'order_ubereats_error_456',
        store_id: 'store_ubereats_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            title: 'Test Product',
            quantity: 1,
            price: 1999,
          },
        ],
        payment: {
          total: 1999,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      jest
        .spyOn(webhooksService, 'storeWebhookEvent')
        .mockResolvedValue('event-123');
      jest
        .spyOn(deliveryTransformer, 'transformUberEatsOrder')
        .mockRejectedValue(new BadRequestException('Transformation failed'));

      await expect(
        controller.handleUberEatsWebhook('test-signature', payload),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleDoorDashWebhook', () => {
    it('should successfully process valid DoorDash webhook', async () => {
      const payload: DoorDashWebhookDto = {
        event_type: 'order.created',
        event_id: 'evt_doordash_123',
        order_id: 'order_doordash_456',
        store_id: 'store_doordash_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            name: 'Test Product',
            quantity: 1,
            unit_price: 1999,
            external_id: 'TEST-SKU-001',
          },
        ],
        order_value: {
          subtotal: 1999,
          tax: 140,
          total: 2139,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      const doorDashOrderDto: CreateOrderDto = {
        ...mockCreateOrderDto,
        channel: 'doordash',
        idempotencyKey: 'doordash:evt_123:order_456',
      };

      jest
        .spyOn(webhooksService, 'storeWebhookEvent')
        .mockResolvedValue('event-123');
      jest
        .spyOn(deliveryTransformer, 'transformDoorDashOrder')
        .mockResolvedValue(doorDashOrderDto);
      jest
        .spyOn(orderOrchestrator, 'processOrder')
        .mockResolvedValue({ ...mockOrderResponse, channel: 'doordash' });

      const result = await controller.handleDoorDashWebhook(
        'test-signature',
        payload,
      );

      expect(result).toEqual({
        received: true,
        orderId: 'order-123',
      });

      expect(webhooksService.storeWebhookEvent).toHaveBeenCalledWith(
        'other',
        'doordash.order.created',
        'evt_doordash_123',
        payload,
      );

      expect(deliveryTransformer.transformDoorDashOrder).toHaveBeenCalledWith(
        payload,
      );

      expect(orderOrchestrator.processOrder).toHaveBeenCalledWith(
        doorDashOrderDto,
      );

      expect(webhooksService.markEventProcessed).toHaveBeenCalledWith(
        'event-123',
        true,
      );
    });

    it('should skip non-created status orders', async () => {
      const payload: DoorDashWebhookDto = {
        event_type: 'order.created',
        event_id: 'evt_doordash_delivered_123',
        order_id: 'order_doordash_delivered_456',
        store_id: 'store_doordash_789',
        status: 'delivered',
        items: [
          {
            id: 'item-1',
            name: 'Test Product',
            quantity: 1,
            unit_price: 1999,
          },
        ],
        order_value: {
          subtotal: 1999,
          tax: 0,
          total: 1999,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      jest
        .spyOn(webhooksService, 'storeWebhookEvent')
        .mockResolvedValue('event-123');

      const result = await controller.handleDoorDashWebhook(
        'test-signature',
        payload,
      );

      expect(result).toEqual({
        received: true,
      });

      expect(deliveryTransformer.transformDoorDashOrder).not.toHaveBeenCalled();
      expect(orderOrchestrator.processOrder).not.toHaveBeenCalled();
      expect(webhooksService.markEventProcessed).toHaveBeenCalledWith(
        'event-123',
        true,
      );
    });

    it('should handle order processing errors', async () => {
      const payload: DoorDashWebhookDto = {
        event_type: 'order.created',
        event_id: 'evt_doordash_error_123',
        order_id: 'order_doordash_error_456',
        store_id: 'store_doordash_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            name: 'Test Product',
            quantity: 1,
            unit_price: 1999,
          },
        ],
        order_value: {
          subtotal: 1999,
          tax: 0,
          total: 1999,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      jest
        .spyOn(webhooksService, 'storeWebhookEvent')
        .mockResolvedValue('event-123');
      jest
        .spyOn(deliveryTransformer, 'transformDoorDashOrder')
        .mockResolvedValue(mockCreateOrderDto);
      jest
        .spyOn(orderOrchestrator, 'processOrder')
        .mockRejectedValue(new Error('Order processing failed'));

      await expect(
        controller.handleDoorDashWebhook('test-signature', payload),
      ).rejects.toThrow('Order processing failed');
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate events gracefully', async () => {
      const payload: UberEatsWebhookDto = {
        event_type: 'orders.notification',
        event_id: 'evt_duplicate_123',
        order_id: 'order_duplicate_456',
        store_id: 'store_ubereats_789',
        status: 'created',
        items: [
          {
            id: 'item-1',
            title: 'Test Product',
            quantity: 1,
            price: 1999,
          },
        ],
        payment: {
          total: 1999,
        },
        created_at: '2025-01-02T12:00:00Z',
      };

      // Simulate duplicate event detection by throwing error
      jest
        .spyOn(webhooksService, 'storeWebhookEvent')
        .mockRejectedValue(new BadRequestException('Event already processed'));

      await expect(
        controller.handleUberEatsWebhook('test-signature', payload),
      ).rejects.toThrow(BadRequestException);

      expect(deliveryTransformer.transformUberEatsOrder).not.toHaveBeenCalled();
      expect(orderOrchestrator.processOrder).not.toHaveBeenCalled();
    });
  });
});

