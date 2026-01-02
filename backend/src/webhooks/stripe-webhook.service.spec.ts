import { Test, TestingModule } from '@nestjs/testing';
import { StripeWebhookService } from './stripe-webhook.service';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../prisma.service';
import Stripe from 'stripe';

describe('StripeWebhookService', () => {
  let service: StripeWebhookService;
  let prismaService: PrismaService;
  let webhooksService: WebhooksService;

  const mockPrismaService = {
    payment: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    order: {
      update: jest.fn(),
    },
    transaction: {
      findUnique: jest.fn(),
    },
    eventLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockWebhooksService = {
    storeWebhookEvent: jest.fn(),
    markEventProcessed: jest.fn(),
  };

  beforeEach(async () => {
    // Set environment variables for testing
    process.env.STRIPE_SECRET_KEY = 'sk_test_123456789';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeWebhookService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WebhooksService,
          useValue: mockWebhooksService,
        },
      ],
    }).compile();

    service = module.get<StripeWebhookService>(StripeWebhookService);
    prismaService = module.get<PrismaService>(PrismaService);
    webhooksService = module.get<WebhooksService>(WebhooksService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  describe('initialization', () => {
    it('should initialize with Stripe credentials', () => {
      expect(service).toBeDefined();
    });

    it('should warn if STRIPE_SECRET_KEY is not configured', () => {
      delete process.env.STRIPE_SECRET_KEY;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Re-create service without key
      new StripeWebhookService(prismaService, webhooksService);

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should warn if STRIPE_WEBHOOK_SECRET is not configured', () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Re-create service without webhook secret
      new StripeWebhookService(prismaService, webhooksService);

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('processWebhook', () => {
    it('should throw error if Stripe is not initialized', async () => {
      delete process.env.STRIPE_SECRET_KEY;
      const uninitializedService = new StripeWebhookService(
        prismaService,
        webhooksService,
      );

      const rawBody = Buffer.from('{}');
      const signature = 'test_signature';

      await expect(
        uninitializedService.processWebhook(rawBody, signature),
      ).rejects.toThrow('Stripe not initialized');
    });

    it('should process webhook without signature verification if secret not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const serviceWithoutSecret = new StripeWebhookService(
        prismaService,
        webhooksService,
      );

      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 10000,
            status: 'succeeded',
          },
        },
      };

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      const signature = 'test_signature';

      mockWebhooksService.storeWebhookEvent.mockResolvedValue('event_123');
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'payment_123',
        status: 'authorized',
      });
      mockPrismaService.payment.update.mockResolvedValue({});
      mockPrismaService.eventLog.create.mockResolvedValue({});

      await serviceWithoutSecret.processWebhook(rawBody, signature);

      expect(mockWebhooksService.storeWebhookEvent).toHaveBeenCalledWith(
        'stripe',
        'payment_intent.succeeded',
        'evt_test_123',
        mockEvent,
      );
      expect(mockWebhooksService.markEventProcessed).toHaveBeenCalledWith(
        'event_123',
        true,
      );
    });
  });

  describe('payment_intent.succeeded', () => {
    it('should update payment status to captured', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 10000,
            status: 'succeeded',
          } as Stripe.PaymentIntent,
        },
      };

      mockWebhooksService.storeWebhookEvent.mockResolvedValue('event_123');
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'payment_123',
        status: 'authorized',
        processorId: 'pi_test_123',
      });
      mockPrismaService.payment.update.mockResolvedValue({});
      mockPrismaService.eventLog.create.mockResolvedValue({});

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      await service.processWebhook(rawBody, 'test_signature');

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment_123' },
        data: { status: 'captured' },
      });
    });

    it('should handle payment not found in database', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 10000,
            status: 'succeeded',
          } as Stripe.PaymentIntent,
        },
      };

      mockWebhooksService.storeWebhookEvent.mockResolvedValue('event_123');
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      await service.processWebhook(rawBody, 'test_signature');

      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
      expect(mockWebhooksService.markEventProcessed).toHaveBeenCalledWith(
        'event_123',
        true,
      );
    });
  });

  describe('payment_intent.payment_failed', () => {
    it('should update payment status to failed and mark order as failed', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 10000,
            status: 'failed',
            last_payment_error: {
              message: 'Insufficient funds',
              code: 'insufficient_funds',
            },
          } as Stripe.PaymentIntent,
        },
      };

      mockWebhooksService.storeWebhookEvent.mockResolvedValue('event_123');
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'payment_123',
        transactionId: 'txn_123',
        processorId: 'pi_test_123',
      });
      mockPrismaService.payment.update.mockResolvedValue({});
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        id: 'txn_123',
        order: { id: 'order_123' },
      });
      mockPrismaService.order.update.mockResolvedValue({});
      mockPrismaService.eventLog.create.mockResolvedValue({});

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      await service.processWebhook(rawBody, 'test_signature');

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment_123' },
        data: { status: 'failed' },
      });
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order_123' },
        data: { status: 'failed' },
      });
    });
  });

  describe('charge.refunded', () => {
    it('should log refund event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_test_123',
            payment_intent: 'pi_test_123',
            amount_refunded: 10000,
            refunds: {
              data: [{ reason: 'requested_by_customer' }],
            },
          } as Stripe.Charge,
        },
      };

      mockWebhooksService.storeWebhookEvent.mockResolvedValue('event_123');
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'payment_123',
        processorId: 'pi_test_123',
      });
      mockPrismaService.eventLog.create.mockResolvedValue({});

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      await service.processWebhook(rawBody, 'test_signature');

      expect(mockPrismaService.eventLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'payment.refunded',
          aggregateId: 'payment_123',
        }),
      });
    });
  });

  describe('charge.dispute.created', () => {
    it('should log dispute creation event', async () => {
      const mockCharge = {
        id: 'ch_test_123',
        payment_intent: 'pi_test_123',
      } as Stripe.Charge;

      const mockEvent = {
        id: 'evt_test_123',
        type: 'charge.dispute.created',
        data: {
          object: {
            id: 'dp_test_123',
            charge: 'ch_test_123',
            amount: 10000,
            reason: 'fraudulent',
            status: 'needs_response',
            evidence_details: {
              due_by: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
            },
          } as Stripe.Dispute,
        },
      };

      // Mock Stripe charge retrieval
      const mockStripe = {
        charges: {
          retrieve: jest.fn().mockResolvedValue(mockCharge),
        },
      };
      (service as any).stripe = mockStripe;

      mockWebhooksService.storeWebhookEvent.mockResolvedValue('event_123');
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'payment_123',
        processorId: 'pi_test_123',
      });
      mockPrismaService.eventLog.create.mockResolvedValue({});

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      await service.processWebhook(rawBody, 'test_signature');

      expect(mockPrismaService.eventLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'payment.dispute.created',
          aggregateId: 'payment_123',
        }),
      });
    });
  });

  describe('charge.dispute.closed', () => {
    it('should log dispute resolution', async () => {
      const mockCharge = {
        id: 'ch_test_123',
        payment_intent: 'pi_test_123',
      } as Stripe.Charge;

      const mockEvent = {
        id: 'evt_test_123',
        type: 'charge.dispute.closed',
        data: {
          object: {
            id: 'dp_test_123',
            charge: 'ch_test_123',
            status: 'won',
          } as Stripe.Dispute,
        },
      };

      const mockStripe = {
        charges: {
          retrieve: jest.fn().mockResolvedValue(mockCharge),
        },
      };
      (service as any).stripe = mockStripe;

      mockWebhooksService.storeWebhookEvent.mockResolvedValue('event_123');
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'payment_123',
        processorId: 'pi_test_123',
      });
      mockPrismaService.eventLog.create.mockResolvedValue({});

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      await service.processWebhook(rawBody, 'test_signature');

      expect(mockPrismaService.eventLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'payment.dispute.closed',
          aggregateId: 'payment_123',
        }),
      });
    });
  });

  describe('error handling', () => {
    it('should mark event as failed on processing error', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 10000,
            status: 'succeeded',
          } as Stripe.PaymentIntent,
        },
      };

      mockWebhooksService.storeWebhookEvent.mockResolvedValue('event_123');
      mockPrismaService.payment.findFirst.mockRejectedValue(
        new Error('Database error'),
      );

      const rawBody = Buffer.from(JSON.stringify(mockEvent));

      await expect(
        service.processWebhook(rawBody, 'test_signature'),
      ).rejects.toThrow('Database error');

      expect(mockWebhooksService.markEventProcessed).toHaveBeenCalledWith(
        'event_123',
        false,
        'Database error',
      );
    });
  });

  describe('unhandled event types', () => {
    it('should log unhandled event types without error', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'customer.created',
        data: {
          object: {} as any,
        },
      };

      mockWebhooksService.storeWebhookEvent.mockResolvedValue('event_123');

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      await service.processWebhook(rawBody, 'test_signature');

      expect(mockWebhooksService.markEventProcessed).toHaveBeenCalledWith(
        'event_123',
        true,
      );
    });
  });
});
