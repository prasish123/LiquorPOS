import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../prisma.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    eventLog: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('storeWebhookEvent', () => {
    it('should store a new webhook event', async () => {
      const mockEvent = {
        id: 'event_123',
        eventType: 'webhook.stripe.payment_intent.succeeded',
        aggregateId: 'evt_test_123',
        payload: '{"test": "data"}',
        processed: false,
      };

      mockPrismaService.eventLog.findFirst.mockResolvedValue(null);
      mockPrismaService.eventLog.create.mockResolvedValue(mockEvent);

      const result = await service.storeWebhookEvent(
        'stripe',
        'payment_intent.succeeded',
        'evt_test_123',
        { test: 'data' },
      );

      expect(result).toBe('event_123');
      expect(mockPrismaService.eventLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'webhook.stripe.payment_intent.succeeded',
          aggregateId: 'evt_test_123',
          payload: JSON.stringify({ test: 'data' }),
          processed: false,
        }),
      });
    });

    it('should skip storing duplicate events (idempotency)', async () => {
      const existingEvent = {
        id: 'existing_event_123',
        eventType: 'webhook.stripe.payment_intent.succeeded',
        aggregateId: 'evt_test_123',
      };

      mockPrismaService.eventLog.findFirst.mockResolvedValue(existingEvent);

      const result = await service.storeWebhookEvent(
        'stripe',
        'payment_intent.succeeded',
        'evt_test_123',
        { test: 'data' },
      );

      expect(result).toBe('existing_event_123');
      expect(mockPrismaService.eventLog.create).not.toHaveBeenCalled();
    });

    it('should handle storage errors', async () => {
      mockPrismaService.eventLog.findFirst.mockResolvedValue(null);
      mockPrismaService.eventLog.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.storeWebhookEvent(
          'stripe',
          'payment_intent.succeeded',
          'evt_test_123',
          { test: 'data' },
        ),
      ).rejects.toThrow('Database error');
    });
  });

  describe('markEventProcessed', () => {
    it('should mark event as processed successfully', async () => {
      mockPrismaService.eventLog.update.mockResolvedValue({});

      await service.markEventProcessed('event_123', true);

      expect(mockPrismaService.eventLog.update).toHaveBeenCalledWith({
        where: { id: 'event_123' },
        data: expect.objectContaining({
          processed: true,
          processedAt: expect.any(Date),
        }),
      });
    });

    it('should mark event as failed with error message', async () => {
      mockPrismaService.eventLog.update.mockResolvedValue({});

      await service.markEventProcessed('event_123', false, 'Processing failed');

      expect(mockPrismaService.eventLog.update).toHaveBeenCalledWith({
        where: { id: 'event_123' },
        data: expect.objectContaining({
          processed: false,
          processedAt: expect.any(Date),
          metadata: expect.stringContaining('Processing failed'),
        }),
      });
    });

    it('should handle update errors gracefully', async () => {
      mockPrismaService.eventLog.update.mockRejectedValue(
        new Error('Update failed'),
      );

      // Should not throw
      await expect(
        service.markEventProcessed('event_123', true),
      ).resolves.not.toThrow();
    });
  });

  describe('getUnprocessedEvents', () => {
    it('should return unprocessed webhook events', async () => {
      const mockEvents = [
        {
          id: 'event_1',
          eventType: 'webhook.stripe.payment_intent.succeeded',
          processed: false,
        },
        {
          id: 'event_2',
          eventType: 'webhook.stripe.charge.refunded',
          processed: false,
        },
      ];

      mockPrismaService.eventLog.findMany.mockResolvedValue(mockEvents);

      const result = await service.getUnprocessedEvents();

      expect(result).toEqual(mockEvents);
      expect(mockPrismaService.eventLog.findMany).toHaveBeenCalledWith({
        where: {
          eventType: { startsWith: 'webhook.' },
          processed: false,
        },
        orderBy: { timestamp: 'asc' },
        take: 100,
      });
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.eventLog.findMany.mockResolvedValue([]);

      await service.getUnprocessedEvents(50);

      expect(mockPrismaService.eventLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('should return empty array on error', async () => {
      mockPrismaService.eventLog.findMany.mockRejectedValue(
        new Error('Query failed'),
      );

      const result = await service.getUnprocessedEvents();

      expect(result).toEqual([]);
    });
  });

  describe('getWebhookStats', () => {
    it('should return webhook statistics for all providers', async () => {
      mockPrismaService.eventLog.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // processed
        .mockResolvedValueOnce(5); // failed

      const result = await service.getWebhookStats();

      expect(result).toEqual({
        total: 100,
        processed: 80,
        failed: 5,
        pending: 20,
      });
    });

    it('should return statistics for specific provider', async () => {
      mockPrismaService.eventLog.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(45) // processed
        .mockResolvedValueOnce(2); // failed

      const result = await service.getWebhookStats('stripe');

      expect(result).toEqual({
        total: 50,
        processed: 45,
        failed: 2,
        pending: 5,
      });

      expect(mockPrismaService.eventLog.count).toHaveBeenCalledWith({
        where: {
          eventType: { startsWith: 'webhook.stripe.' },
        },
      });
    });

    it('should return zeros on error', async () => {
      mockPrismaService.eventLog.count.mockRejectedValue(
        new Error('Query failed'),
      );

      const result = await service.getWebhookStats();

      expect(result).toEqual({
        total: 0,
        processed: 0,
        failed: 0,
        pending: 0,
      });
    });
  });
});
