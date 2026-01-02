import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { StripeWebhookService } from './stripe-webhook.service';

/**
 * Webhooks Controller
 *
 * Handles incoming webhooks from external payment processors.
 * This endpoint is public (no auth) but secured via signature verification.
 *
 * CRITICAL: This endpoint requires raw body parsing for signature verification.
 * The main.ts file must be configured to preserve raw body for this route.
 */
@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly stripeWebhookService: StripeWebhookService) {}

  /**
   * Stripe Webhook Endpoint
   * POST /webhooks/stripe
   *
   * Receives and processes webhook events from Stripe.
   *
   * Events handled:
   * - payment_intent.succeeded: Payment completed successfully
   * - payment_intent.payment_failed: Payment failed (async)
   * - payment_intent.canceled: Payment was canceled
   * - charge.refunded: Refund processed
   * - charge.dispute.created: Dispute/chargeback initiated
   * - charge.dispute.closed: Dispute resolved
   * - payment_intent.amount_capturable_updated: Authorization amount changed
   *
   * @param signature - Stripe signature header for verification
   * @param req - Raw request object (needed for signature verification)
   * @returns 200 OK on success, 400 on verification failure
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe webhook endpoint',
    description:
      'Receives webhook events from Stripe for payment status updates, refunds, disputes, and failures. ' +
      'This endpoint is secured via Stripe signature verification.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook received and processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook signature or malformed payload',
  })
  @ApiExcludeEndpoint() // Hide from public API docs (external endpoint)
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    this.logger.log('Received Stripe webhook');

    if (!signature) {
      this.logger.error('Missing stripe-signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }

    // Get raw body for signature verification
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('Missing raw body for signature verification');
      throw new BadRequestException('Invalid request body');
    }

    try {
      // Process the webhook (includes signature verification)
      await this.stripeWebhookService.processWebhook(rawBody, signature);

      this.logger.log('Stripe webhook processed successfully');
      return { received: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Stripe webhook processing failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Return 400 for signature verification failures
      // Stripe will retry on 5xx errors but not 4xx
      if (
        errorMessage.includes('signature') ||
        errorMessage.includes('verification')
      ) {
        throw new BadRequestException('Webhook signature verification failed');
      }

      // Re-throw other errors (will result in 500, triggering Stripe retry)
      throw error;
    }
  }

  /**
   * Health check endpoint for webhook system
   * GET /webhooks/health
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook system health check',
    description: 'Verify webhook system is operational',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook system is healthy',
  })
  async health(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
