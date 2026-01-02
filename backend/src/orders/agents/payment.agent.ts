import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import Stripe from 'stripe';

export interface PaymentResult {
  paymentId: string;
  method: string;
  amount: number;
  status: 'authorized' | 'captured' | 'failed';
  processorId?: string;
  cardType?: string;
  last4?: string;
  errorMessage?: string;
}

export interface StripeConfig {
  apiVersion: '2024-12-18.acacia';
  timeout: 30000; // 30 seconds
  maxRetries: 3;
}

@Injectable()
export class PaymentAgent {
  private readonly logger = new Logger(PaymentAgent.name);
  private stripe: Stripe | null = null;

  constructor(private prisma: PrismaService) {
    this.initializeStripe();
  }

  /**
   * Initialize Stripe client with proper configuration
   */
  private initializeStripe(): void {
    if (!process.env.STRIPE_SECRET_KEY) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured. Card payments will fail. ' +
          'Cash payments will continue to work.',
      );
      return;
    }

    try {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-12-18.acacia',
        timeout: 30000,
        maxNetworkRetries: 3,
        typescript: true,
      });
      this.logger.log('Stripe client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Stripe client', error);
      throw error;
    }
  }

  /**
   * Authorize payment with Stripe Terminal or Payment Intent
   */
  async authorize(
    amount: number,
    method: 'cash' | 'card' | 'split',
    metadata?: Record<string, string>,
  ): Promise<PaymentResult> {
    const paymentId = crypto.randomUUID();

    // For cash, immediately mark as captured
    if (method === 'cash') {
      this.logger.log(`Cash payment authorized: ${paymentId} for $${amount}`);
      return {
        paymentId,
        method,
        amount,
        status: 'captured',
      };
    }

    // Card payment requires Stripe
    if (!this.stripe) {
      const error =
        'STRIPE_SECRET_KEY environment variable is required for card payments';
      this.logger.error(error);
      throw new Error(error);
    }

    try {
      // Create Payment Intent for card payment
      // Using manual capture for authorization flow (capture happens later)
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        capture_method: 'manual', // Authorize now, capture later
        payment_method_types: ['card'],
        metadata: {
          paymentId,
          ...metadata,
        },
        description: `POS Transaction ${paymentId}`,
      });

      this.logger.log(
        `Payment authorized: ${paymentId}, Stripe PI: ${paymentIntent.id}, Amount: $${amount}`,
      );

      return {
        paymentId,
        method,
        amount,
        status: 'authorized',
        processorId: paymentIntent.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Payment authorization failed: ${errorMessage}`,
        errorStack,
      );

      // Handle specific Stripe errors (check both instanceof and type property for testing)
      if (
        error instanceof Stripe.errors.StripeError ||
        (error &&
          typeof error === 'object' &&
          'type' in error &&
          typeof error.type === 'string' &&
          error.type.startsWith('Stripe'))
      ) {
        return {
          paymentId,
          method,
          amount,
          status: 'failed',
          errorMessage: this.getStripeErrorMessage(
            error as Stripe.errors.StripeError,
          ),
        };
      }

      throw error;
    }
  }

  /**
   * Capture authorized payment
   */
  async capture(paymentId: string, processorId?: string): Promise<void> {
    if (!processorId) {
      this.logger.warn(
        `No processor ID for payment ${paymentId}, assuming cash`,
      );
      return;
    }

    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const paymentIntent =
        await this.stripe.paymentIntents.capture(processorId);

      this.logger.log(
        `Payment captured: ${paymentId}, Stripe PI: ${processorId}, ` +
          `Status: ${paymentIntent.status}`,
      );

      // Update payment record with card details if available
      if (paymentIntent.charges.data.length > 0) {
        const charge = paymentIntent.charges.data[0];
        const paymentMethod = charge?.payment_method_details;

        if (paymentMethod?.card) {
          await this.prisma.payment.updateMany({
            where: { processorId },
            data: {
              cardType: String(paymentMethod.card.brand),
              last4: String(paymentMethod.card.last4),
              status: 'captured',
            },
          });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Payment capture failed: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Void/cancel payment (compensation for failed orders)
   */
  async void(payment: PaymentResult): Promise<void> {
    if (payment.method === 'cash') {
      this.logger.log(
        `Cash payment void requested: ${payment.paymentId} (no action needed)`,
      );
      return;
    }

    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    if (!payment.processorId) {
      this.logger.warn(
        `No processor ID for payment ${payment.paymentId}, cannot void`,
      );
      return;
    }

    try {
      if (payment.status === 'authorized') {
        // Cancel uncaptured payment intent
        await this.stripe.paymentIntents.cancel(payment.processorId);
        this.logger.log(
          `Payment canceled: ${payment.paymentId}, PI: ${payment.processorId}`,
        );
      } else if (payment.status === 'captured') {
        // Refund captured payment
        const refund = await this.stripe.refunds.create({
          payment_intent: payment.processorId,
          reason: 'requested_by_customer',
        });
        this.logger.log(
          `Payment refunded: ${payment.paymentId}, ` +
            `Refund ID: ${refund.id}, Amount: $${refund.amount / 100}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Payment void/refund failed: ${errorMessage}`,
        errorStack,
      );

      // Don't throw on void failures - log and continue
      // This prevents compensation failures from blocking order cancellation
      if (error instanceof Stripe.errors.StripeError) {
        this.logger.error(
          `Stripe error details: ${this.getStripeErrorMessage(error)}`,
        );
      }
    }
  }

  /**
   * Refund a captured payment (for returns/cancellations)
   */
  async refund(
    processorId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
  ): Promise<Stripe.Refund> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: processorId,
        reason: reason || 'requested_by_customer',
      };

      // Partial refund if amount specified
      if (amount) {
        refundParams.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundParams);

      this.logger.log(
        `Refund created: ${refund.id}, PI: ${processorId}, ` +
          `Amount: $${refund.amount / 100}, Status: ${refund.status}`,
      );

      return refund;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Refund failed: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Get user-friendly error message from Stripe error
   */
  private getStripeErrorMessage(error: Stripe.errors.StripeError): string {
    switch (error.type) {
      case 'StripeCardError':
        return `Card declined: ${error.message}`;
      case 'StripeRateLimitError':
        return 'Too many requests. Please try again in a moment.';
      case 'StripeInvalidRequestError':
        return 'Invalid payment request. Please contact support.';
      case 'StripeAPIError':
        return 'Payment service temporarily unavailable. Please try again.';
      case 'StripeConnectionError':
        return 'Network error. Please check your connection and try again.';
      case 'StripeAuthenticationError':
        return 'Payment configuration error. Please contact support.';
      default:
        return 'Payment processing error. Please try again or use cash.';
    }
  }

  /**
   * Create payment record in database
   */
  async createPaymentRecord(
    transactionId: string,
    payment: PaymentResult,
  ): Promise<void> {
    await this.prisma.payment.create({
      data: {
        transactionId,
        method: payment.method,
        amount: payment.amount,
        status: payment.status,
        processorId: payment.processorId,
        cardType: payment.cardType,
        last4: payment.last4,
      },
    });

    this.logger.log(
      `Payment record created: Transaction ${transactionId}, ` +
        `Method: ${payment.method}, Amount: $${payment.amount}`,
    );
  }
}
