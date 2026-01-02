import { Test, TestingModule } from '@nestjs/testing';
import { PaymentAgent, PaymentResult } from './payment.agent';
import { PrismaService } from '../../prisma.service';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');

describe('PaymentAgent', () => {
  let paymentAgent: PaymentAgent;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;
  let mockStripe: jest.Mocked<Stripe>;

  const mockPrismaService = {
    payment: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Reset environment
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';

    // Clear all mocks
    jest.clearAllMocks();

    // Setup Stripe mock
    mockStripe = {
      paymentIntents: {
        create: jest.fn(),
        capture: jest.fn(),
        cancel: jest.fn(),
      },
      refunds: {
        create: jest.fn(),
      },
    } as any;

    (Stripe as any).mockImplementation(() => mockStripe);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentAgent,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    paymentAgent = module.get<PaymentAgent>(PaymentAgent);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  describe('Cash Payments', () => {
    it('should authorize cash payment immediately', async () => {
      const result = await paymentAgent.authorize(100.0, 'cash');

      expect(result).toMatchObject({
        method: 'cash',
        amount: 100.0,
        status: 'captured',
      });
      expect(result.paymentId).toBeDefined();
      expect(result.processorId).toBeUndefined();
    });

    it('should void cash payment without error', async () => {
      const payment: PaymentResult = {
        paymentId: 'test-payment-id',
        method: 'cash',
        amount: 50.0,
        status: 'captured',
      };

      await expect(paymentAgent.void(payment)).resolves.not.toThrow();
    });
  });

  describe('Card Payments - Authorization', () => {
    it('should authorize card payment with Stripe', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'usd',
        status: 'requires_capture',
      };

      mockStripe.paymentIntents.create.mockResolvedValue(
        mockPaymentIntent as any,
      );

      const result = await paymentAgent.authorize(100.0, 'card', {
        locationId: 'loc-1',
      });

      expect(result).toMatchObject({
        method: 'card',
        amount: 100.0,
        status: 'authorized',
        processorId: 'pi_test_123',
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 10000, // $100.00 in cents
        currency: 'usd',
        capture_method: 'manual',
        payment_method_types: ['card'],
        metadata: expect.objectContaining({
          paymentId: expect.any(String),
          locationId: 'loc-1',
        }),
        description: expect.stringContaining('POS Transaction'),
      });
    });

    it('should throw error if Stripe key not configured', async () => {
      delete process.env.STRIPE_SECRET_KEY;

      // Create new instance without Stripe
      const module = await Test.createTestingModule({
        providers: [
          PaymentAgent,
          { provide: PrismaService, useValue: mockPrismaService },
        ],
      }).compile();

      const agent = module.get<PaymentAgent>(PaymentAgent);

      await expect(agent.authorize(100.0, 'card')).rejects.toThrow(
        'STRIPE_SECRET_KEY environment variable is required',
      );
    });

    it('should handle Stripe card declined error', async () => {
      const cardError = {
        type: 'StripeCardError',
        message: 'Your card was declined',
      };
      Object.setPrototypeOf(cardError, Stripe.errors.StripeCardError.prototype);

      mockStripe.paymentIntents.create.mockRejectedValue(cardError);

      const result = await paymentAgent.authorize(100.0, 'card');

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('Card declined');
    });

    it('should handle Stripe network error', async () => {
      const networkError = {
        type: 'StripeConnectionError',
        message: 'Network error',
      };
      Object.setPrototypeOf(
        networkError,
        Stripe.errors.StripeConnectionError.prototype,
      );

      mockStripe.paymentIntents.create.mockRejectedValue(networkError);

      const result = await paymentAgent.authorize(100.0, 'card');

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('Network error');
    });

    it('should convert amount to cents correctly', async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test',
        amount: 12345,
      } as any);

      await paymentAgent.authorize(123.45, 'card');

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 12345,
        }),
      );
    });
  });

  describe('Card Payments - Capture', () => {
    it('should capture authorized payment', async () => {
      const mockCapturedIntent = {
        id: 'pi_test_123',
        status: 'succeeded',
        charges: {
          data: [
            {
              payment_method_details: {
                card: {
                  brand: 'visa',
                  last4: '4242',
                },
              },
            },
          ],
        },
      };

      mockStripe.paymentIntents.capture.mockResolvedValue(
        mockCapturedIntent as any,
      );

      await paymentAgent.capture('payment-123', 'pi_test_123');

      expect(mockStripe.paymentIntents.capture).toHaveBeenCalledWith(
        'pi_test_123',
      );
      expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith({
        where: { processorId: 'pi_test_123' },
        data: {
          cardType: 'visa',
          last4: '4242',
          status: 'captured',
        },
      });
    });

    it('should handle capture without processor ID (cash)', async () => {
      await expect(paymentAgent.capture('payment-123')).resolves.not.toThrow();
      expect(mockStripe.paymentIntents.capture).not.toHaveBeenCalled();
    });

    it('should throw error on capture failure', async () => {
      mockStripe.paymentIntents.capture.mockRejectedValue(
        new Error('Capture failed'),
      );

      await expect(
        paymentAgent.capture('payment-123', 'pi_test_123'),
      ).rejects.toThrow('Capture failed');
    });
  });

  describe('Card Payments - Void/Cancel', () => {
    it('should cancel authorized payment', async () => {
      const payment: PaymentResult = {
        paymentId: 'payment-123',
        method: 'card',
        amount: 100.0,
        status: 'authorized',
        processorId: 'pi_test_123',
      };

      mockStripe.paymentIntents.cancel.mockResolvedValue({
        id: 'pi_test_123',
        status: 'canceled',
      } as any);

      await paymentAgent.void(payment);

      expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith(
        'pi_test_123',
      );
    });

    it('should refund captured payment', async () => {
      const payment: PaymentResult = {
        paymentId: 'payment-123',
        method: 'card',
        amount: 100.0,
        status: 'captured',
        processorId: 'pi_test_123',
      };

      mockStripe.refunds.create.mockResolvedValue({
        id: 'ref_123',
        amount: 10000,
        status: 'succeeded',
      } as any);

      await paymentAgent.void(payment);

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        reason: 'requested_by_customer',
      });
    });

    it('should not throw on void failure (log only)', async () => {
      const payment: PaymentResult = {
        paymentId: 'payment-123',
        method: 'card',
        amount: 100.0,
        status: 'authorized',
        processorId: 'pi_test_123',
      };

      mockStripe.paymentIntents.cancel.mockRejectedValue(
        new Error('Cancel failed'),
      );

      // Should not throw - compensation failures should be logged
      await expect(paymentAgent.void(payment)).resolves.not.toThrow();
    });
  });

  describe('Refunds', () => {
    it('should create full refund', async () => {
      mockStripe.refunds.create.mockResolvedValue({
        id: 'ref_123',
        amount: 10000,
        status: 'succeeded',
      } as any);

      const refund = await paymentAgent.refund('pi_test_123');

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        reason: 'requested_by_customer',
      });
      expect(refund.id).toBe('ref_123');
    });

    it('should create partial refund', async () => {
      mockStripe.refunds.create.mockResolvedValue({
        id: 'ref_123',
        amount: 5000,
        status: 'succeeded',
      } as any);

      await paymentAgent.refund('pi_test_123', 50.0, 'duplicate');

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 5000,
        reason: 'duplicate',
      });
    });

    it('should throw error on refund failure', async () => {
      mockStripe.refunds.create.mockRejectedValue(new Error('Refund failed'));

      await expect(paymentAgent.refund('pi_test_123')).rejects.toThrow(
        'Refund failed',
      );
    });
  });

  describe('Database Operations', () => {
    it('should create payment record with all fields', async () => {
      const payment: PaymentResult = {
        paymentId: 'payment-123',
        method: 'card',
        amount: 100.0,
        status: 'captured',
        processorId: 'pi_test_123',
        cardType: 'visa',
        last4: '4242',
      };

      await paymentAgent.createPaymentRecord('txn-123', payment);

      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          transactionId: 'txn-123',
          method: 'card',
          amount: 100.0,
          status: 'captured',
          processorId: 'pi_test_123',
          cardType: 'visa',
          last4: '4242',
        },
      });
    });

    it('should create cash payment record', async () => {
      const payment: PaymentResult = {
        paymentId: 'payment-123',
        method: 'cash',
        amount: 50.0,
        status: 'captured',
      };

      await paymentAgent.createPaymentRecord('txn-123', payment);

      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          transactionId: 'txn-123',
          method: 'cash',
          amount: 50.0,
          status: 'captured',
          processorId: undefined,
          cardType: undefined,
          last4: undefined,
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should provide user-friendly error messages', async () => {
      const createStripeError = (type: string, prototype: any) => {
        const error = { type, message: `${type} message` };
        Object.setPrototypeOf(error, prototype);
        return error;
      };

      const errorCases = [
        {
          error: createStripeError(
            'StripeCardError',
            Stripe.errors.StripeCardError.prototype,
          ),
          expectedMessage: 'Card declined',
        },
        {
          error: createStripeError(
            'StripeRateLimitError',
            Stripe.errors.StripeRateLimitError.prototype,
          ),
          expectedMessage: 'Too many requests',
        },
        {
          error: createStripeError(
            'StripeInvalidRequestError',
            Stripe.errors.StripeInvalidRequestError.prototype,
          ),
          expectedMessage: 'Invalid payment request',
        },
        {
          error: createStripeError(
            'StripeAPIError',
            Stripe.errors.StripeAPIError.prototype,
          ),
          expectedMessage: 'temporarily unavailable',
        },
        {
          error: createStripeError(
            'StripeConnectionError',
            Stripe.errors.StripeConnectionError.prototype,
          ),
          expectedMessage: 'Network error',
        },
        {
          error: createStripeError(
            'StripeAuthenticationError',
            Stripe.errors.StripeAuthenticationError.prototype,
          ),
          expectedMessage: 'configuration error',
        },
      ];

      for (const { error, expectedMessage } of errorCases) {
        mockStripe.paymentIntents.create.mockRejectedValue(error);

        const result = await paymentAgent.authorize(100.0, 'card');

        expect(result.status).toBe('failed');
        expect(result.errorMessage).toContain(expectedMessage);
      }
    });
  });
});
