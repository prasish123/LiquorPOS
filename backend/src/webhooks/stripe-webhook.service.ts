import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';
import { WebhooksService } from './webhooks.service';

/**
 * Stripe Webhook Service
 *
 * Handles Stripe webhook events with signature verification and event processing.
 *
 * Critical Events Handled:
 * - payment_intent.succeeded: Payment completed successfully
 * - payment_intent.payment_failed: Async payment failure
 * - payment_intent.canceled: Payment was canceled
 * - charge.refunded: Customer-initiated or merchant refund
 * - charge.dispute.created: Chargeback/dispute initiated
 * - charge.dispute.closed: Dispute resolved
 * - payment_intent.amount_capturable_updated: Authorization amount changed
 * - charge.failed: Charge attempt failed
 */
@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);
  private stripe: Stripe | null = null;
  private webhookSecret: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooksService: WebhooksService,
  ) {
    this.initializeStripe();
  }

  /**
   * Initialize Stripe client and webhook secret
   */
  private initializeStripe(): void {
    if (!process.env.STRIPE_SECRET_KEY) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured. Stripe webhooks will not work.',
      );
      return;
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      this.logger.warn(
        'STRIPE_WEBHOOK_SECRET not configured. Webhook signature verification will be skipped. ' +
          'This is INSECURE for production!',
      );
    }

    try {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-12-15.clover',
        timeout: 30000,
        maxNetworkRetries: 3,
        typescript: true,
      });

      this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;

      this.logger.log(
        `Stripe webhook service initialized. Signature verification: ${this.webhookSecret ? 'ENABLED' : 'DISABLED (INSECURE)'}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize Stripe webhook service', error);
      throw error;
    }
  }

  /**
   * Process incoming Stripe webhook
   *
   * @param rawBody - Raw request body (Buffer)
   * @param signature - Stripe signature header
   */
  async processWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature (if configured)
      if (this.webhookSecret) {
        event = this.stripe.webhooks.constructEvent(
          rawBody,
          signature,
          this.webhookSecret,
        );
        this.logger.log(`Webhook signature verified: ${event.type}`);
      } else {
        // Parse without verification (INSECURE - only for development)
        event = JSON.parse(rawBody.toString()) as Stripe.Event;
        this.logger.warn(
          `Webhook processed WITHOUT signature verification: ${event.type} (INSECURE)`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Webhook signature verification failed: ${errorMessage}`,
      );
      throw new BadRequestException('Webhook signature verification failed');
    }

    // Store webhook event for audit trail
    const eventId = await this.webhooksService.storeWebhookEvent(
      'stripe',
      event.type,
      event.id,
      event,
    );

    try {
      // Process the event based on type
      await this.handleWebhookEvent(event);

      // Mark as processed
      await this.webhooksService.markEventProcessed(eventId, true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to process webhook event ${event.id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Mark as failed
      await this.webhooksService.markEventProcessed(
        eventId,
        false,
        errorMessage,
      );

      // Re-throw to trigger Stripe retry
      throw error;
    }
  }

  /**
   * Handle webhook event based on type
   */
  private async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type}, ID: ${event.id}`);

    switch (event.type) {
      // Payment succeeded (async confirmation)
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;

      // Payment failed (async failure)
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object);
        break;

      // Payment canceled
      case 'payment_intent.canceled':
        await this.handlePaymentIntentCanceled(event.data.object);
        break;

      // Charge refunded (customer-initiated or merchant)
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object);
        break;

      // Dispute created (chargeback)
      case 'charge.dispute.created':
        await this.handleDisputeCreated(event.data.object);
        break;

      // Dispute closed (resolved)
      case 'charge.dispute.closed':
        await this.handleDisputeClosed(event.data.object);
        break;

      // Authorization amount changed
      case 'payment_intent.amount_capturable_updated':
        await this.handleAmountCapturableUpdated(event.data.object);
        break;

      // Charge failed
      case 'charge.failed':
        await this.handleChargeFailed(event.data.object);
        break;

      // Capture failed (after authorization)
      case 'payment_intent.capture_failed':
        await this.handleCaptureFailed(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  /**
   * Handle payment_intent.succeeded event
   * Payment completed successfully (async confirmation)
   */
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    this.logger.log(
      `Payment succeeded: ${paymentIntent.id}, Amount: $${paymentIntent.amount / 100}`,
    );

    try {
      // Update payment status in database
      const payment = await this.prisma.payment.findFirst({
        where: { processorId: paymentIntent.id },
      });

      if (!payment) {
        this.logger.warn(
          `Payment not found in database: ${paymentIntent.id}. May be processed before DB insert.`,
        );
        return;
      }

      // Update payment status to captured if not already
      if (payment.status !== 'captured') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'captured',
          },
        });

        this.logger.log(`Updated payment ${payment.id} status to captured`);
      }

      // Log event for audit trail
      await this.prisma.eventLog.create({
        data: {
          eventType: 'payment.succeeded',
          aggregateId: payment.id,
          payload: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            status: paymentIntent.status,
          }),
          processed: true,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle payment_intent.succeeded: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Handle payment_intent.payment_failed event
   * Async payment failure (after initial authorization)
   */
  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    this.logger.error(
      `Payment failed: ${paymentIntent.id}, Reason: ${paymentIntent.last_payment_error?.message || 'Unknown'}`,
    );

    try {
      // Update payment status in database
      const payment = await this.prisma.payment.findFirst({
        where: { processorId: paymentIntent.id },
      });

      if (!payment) {
        this.logger.warn(`Payment not found in database: ${paymentIntent.id}`);
        return;
      }

      // Update payment status to failed
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
        },
      });

      // Get the transaction to potentially void the order
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: payment.transactionId },
        include: { order: true },
      });

      if (transaction?.order) {
        // Mark order as failed if payment failed
        await this.prisma.order.update({
          where: { id: transaction.order.id },
          data: {
            status: 'failed',
          },
        });

        this.logger.log(
          `Marked order ${transaction.order.id} as failed due to payment failure`,
        );
      }

      // Log event for audit trail
      await this.prisma.eventLog.create({
        data: {
          eventType: 'payment.failed',
          aggregateId: payment.id,
          payload: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            error: paymentIntent.last_payment_error?.message,
            errorCode: paymentIntent.last_payment_error?.code,
          }),
          processed: true,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle payment_intent.payment_failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Handle payment_intent.canceled event
   */
  private async handlePaymentIntentCanceled(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    this.logger.log(`Payment canceled: ${paymentIntent.id}`);

    try {
      const payment = await this.prisma.payment.findFirst({
        where: { processorId: paymentIntent.id },
      });

      if (!payment) {
        this.logger.warn(`Payment not found in database: ${paymentIntent.id}`);
        return;
      }

      // Update payment status
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed', // Use 'failed' as we don't have 'canceled' status
        },
      });

      // Log event
      await this.prisma.eventLog.create({
        data: {
          eventType: 'payment.canceled',
          aggregateId: payment.id,
          payload: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            canceledAt: new Date().toISOString(),
          }),
          processed: true,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle payment_intent.canceled: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Handle charge.refunded event
   * Customer-initiated or merchant refund
   */
  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    this.logger.log(
      `Charge refunded: ${charge.id}, Amount: $${charge.amount_refunded / 100}`,
    );

    try {
      // Find payment by charge's payment intent
      const payment = await this.prisma.payment.findFirst({
        where: { processorId: charge.payment_intent as string },
      });

      if (!payment) {
        this.logger.warn(
          `Payment not found for charge: ${charge.id}, PI: ${charge.payment_intent}`,
        );
        return;
      }

      // Log refund event
      await this.prisma.eventLog.create({
        data: {
          eventType: 'payment.refunded',
          aggregateId: payment.id,
          payload: JSON.stringify({
            chargeId: charge.id,
            paymentIntentId: charge.payment_intent,
            amountRefunded: charge.amount_refunded / 100,
            refundReason: charge.refunds?.data[0]?.reason || 'unknown',
          }),
          processed: true,
          processedAt: new Date(),
        },
      });

      this.logger.log(`Logged refund event for payment ${payment.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to handle charge.refunded: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Handle charge.dispute.created event
   * Chargeback/dispute initiated by customer
   */
  private async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    this.logger.error(
      `DISPUTE CREATED: ${dispute.id}, Charge: ${dispute.charge}, ` +
        `Amount: $${dispute.amount / 100}, Reason: ${dispute.reason}`,
    );

    try {
      // Find payment by charge ID
      const charge = await this.stripe?.charges.retrieve(
        dispute.charge as string,
      );
      const payment = await this.prisma.payment.findFirst({
        where: { processorId: charge?.payment_intent as string },
      });

      if (!payment) {
        this.logger.warn(`Payment not found for dispute: ${dispute.id}`);
        return;
      }

      // Log dispute event (CRITICAL - needs immediate attention)
      await this.prisma.eventLog.create({
        data: {
          eventType: 'payment.dispute.created',
          aggregateId: payment.id,
          payload: JSON.stringify({
            disputeId: dispute.id,
            chargeId: dispute.charge,
            amount: dispute.amount / 100,
            reason: dispute.reason,
            status: dispute.status,
            evidenceDueBy: dispute.evidence_details?.due_by,
          }),
          processed: true,
          processedAt: new Date(),
        },
      });

      // TODO: Send alert to merchant/admin about dispute
      this.logger.error(
        `⚠️ CRITICAL: Dispute requires attention! Payment: ${payment.id}, ` +
          `Evidence due by: ${dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toISOString() : 'N/A'}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle charge.dispute.created: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Handle charge.dispute.closed event
   * Dispute resolved (won or lost)
   */
  private async handleDisputeClosed(dispute: Stripe.Dispute): Promise<void> {
    this.logger.log(`Dispute closed: ${dispute.id}, Status: ${dispute.status}`);

    try {
      const charge = await this.stripe?.charges.retrieve(
        dispute.charge as string,
      );
      const payment = await this.prisma.payment.findFirst({
        where: { processorId: charge?.payment_intent as string },
      });

      if (!payment) {
        this.logger.warn(`Payment not found for dispute: ${dispute.id}`);
        return;
      }

      // Log dispute resolution
      await this.prisma.eventLog.create({
        data: {
          eventType: 'payment.dispute.closed',
          aggregateId: payment.id,
          payload: JSON.stringify({
            disputeId: dispute.id,
            status: dispute.status,
            outcome: dispute.status === 'won' ? 'merchant_won' : 'customer_won',
          }),
          processed: true,
          processedAt: new Date(),
        },
      });

      this.logger.log(
        `Dispute ${dispute.id} closed with status: ${dispute.status}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle charge.dispute.closed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Handle payment_intent.amount_capturable_updated event
   * Authorization amount changed
   */
  private async handleAmountCapturableUpdated(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    this.logger.log(
      `Amount capturable updated: ${paymentIntent.id}, ` +
        `New amount: $${paymentIntent.amount_capturable ? paymentIntent.amount_capturable / 100 : 0}`,
    );

    try {
      const payment = await this.prisma.payment.findFirst({
        where: { processorId: paymentIntent.id },
      });

      if (!payment) {
        this.logger.warn(`Payment not found: ${paymentIntent.id}`);
        return;
      }

      // Log the change
      await this.prisma.eventLog.create({
        data: {
          eventType: 'payment.amount_updated',
          aggregateId: payment.id,
          payload: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            oldAmount: payment.amount,
            newAmount: paymentIntent.amount_capturable
              ? paymentIntent.amount_capturable / 100
              : 0,
          }),
          processed: true,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle amount_capturable_updated: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Handle charge.failed event
   */
  private async handleChargeFailed(charge: Stripe.Charge): Promise<void> {
    this.logger.error(
      `Charge failed: ${charge.id}, Reason: ${charge.failure_message || 'Unknown'}`,
    );

    try {
      const payment = await this.prisma.payment.findFirst({
        where: { processorId: charge.payment_intent as string },
      });

      if (!payment) {
        this.logger.warn(`Payment not found for charge: ${charge.id}`);
        return;
      }

      // Log charge failure
      await this.prisma.eventLog.create({
        data: {
          eventType: 'payment.charge.failed',
          aggregateId: payment.id,
          payload: JSON.stringify({
            chargeId: charge.id,
            failureCode: charge.failure_code,
            failureMessage: charge.failure_message,
          }),
          processed: true,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle charge.failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Handle payment_intent.capture_failed event
   */
  private async handleCaptureFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    this.logger.error(
      `Capture failed: ${paymentIntent.id}, Reason: ${paymentIntent.last_payment_error?.message || 'Unknown'}`,
    );

    try {
      const payment = await this.prisma.payment.findFirst({
        where: { processorId: paymentIntent.id },
      });

      if (!payment) {
        this.logger.warn(`Payment not found: ${paymentIntent.id}`);
        return;
      }

      // Update payment status to failed
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
        },
      });

      // Log capture failure
      await this.prisma.eventLog.create({
        data: {
          eventType: 'payment.capture.failed',
          aggregateId: payment.id,
          payload: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            error: paymentIntent.last_payment_error?.message,
            errorCode: paymentIntent.last_payment_error?.code,
          }),
          processed: true,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle capture_failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
