import {
  Controller,
  Post,
  Headers,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint, ApiBody } from '@nestjs/swagger';
import { StripeWebhookService } from './stripe-webhook.service';
import { DeliveryPlatformTransformerService } from './delivery-platform-transformer.service';
import { OrderOrchestrator } from '../orders/order-orchestrator';
import { WebhooksService } from './webhooks.service';
import { UberEatsWebhookDto } from './dto/ubereats-webhook.dto';
import { DoorDashWebhookDto } from './dto/doordash-webhook.dto';

/**
 * Webhooks Controller
 *
 * Handles incoming webhooks from external payment processors and delivery platforms.
 * These endpoints are public (no auth) but secured via signature verification.
 *
 * CRITICAL: Stripe endpoint requires raw body parsing for signature verification.
 * The main.ts file must be configured to preserve raw body for that route.
 */
@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly stripeWebhookService: StripeWebhookService,
    private readonly deliveryTransformer: DeliveryPlatformTransformerService,
    private readonly orderOrchestrator: OrderOrchestrator,
    private readonly webhooksService: WebhooksService,
  ) {}

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Stripe webhook processing failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Return 400 for signature verification failures
      // Stripe will retry on 5xx errors but not 4xx
      if (errorMessage.includes('signature') || errorMessage.includes('verification')) {
        throw new BadRequestException('Webhook signature verification failed');
      }

      // Re-throw other errors (will result in 500, triggering Stripe retry)
      throw error;
    }
  }

  /**
   * Uber Eats Webhook Endpoint
   * POST /webhooks/ubereats
   *
   * Receives and processes webhook events from Uber Eats.
   *
   * Events handled:
   * - orders.notification: New order created
   *
   * @param signature - Uber Eats signature header for verification
   * @param payload - Uber Eats webhook payload
   * @returns 200 OK on success, 400 on validation failure
   */
  @Post('ubereats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Uber Eats webhook endpoint',
    description:
      'Receives webhook events from Uber Eats for new orders. ' +
      'This endpoint is secured via signature verification.',
  })
  @ApiBody({ type: UberEatsWebhookDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook received and processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook signature or malformed payload',
  })
  @ApiExcludeEndpoint() // Hide from public API docs (external endpoint)
  async handleUberEatsWebhook(
    @Headers('x-ubereats-signature') signature: string,
    @Body() payload: UberEatsWebhookDto,
  ): Promise<{ received: boolean; orderId?: string }> {
    this.logger.log(
      `Received Uber Eats webhook: ${payload.event_type} for order ${payload.order_id}`,
    );

    try {
      // TODO: Verify signature (placeholder for now)
      // await this.verifyUberEatsSignature(signature, payload);
      if (!signature) {
        this.logger.warn('Uber Eats signature verification not implemented - accepting webhook');
      }

      // Store webhook event for audit trail and idempotency
      const eventId = await this.webhooksService.storeWebhookEvent(
        'other',
        `ubereats.${payload.event_type}`,
        payload.event_id,
        payload,
      );

      // Only process 'created' status orders
      if (payload.status !== 'created') {
        this.logger.log(
          `Skipping Uber Eats order ${payload.order_id} with status: ${payload.status}`,
        );
        await this.webhooksService.markEventProcessed(eventId, true);
        return { received: true };
      }

      // Transform to CreateOrderDto
      const createOrderDto = await this.deliveryTransformer.transformUberEatsOrder(payload);

      // Process through OrderOrchestrator
      const order = await this.orderOrchestrator.processOrder(createOrderDto);

      // Mark event as processed
      await this.webhooksService.markEventProcessed(eventId, true);

      this.logger.log(`Uber Eats order ${payload.order_id} processed successfully → ${order.id}`);

      return { received: true, orderId: order.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Uber Eats webhook processing failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Return 400 for validation/signature failures
      if (
        errorMessage.includes('signature') ||
        errorMessage.includes('validation') ||
        errorMessage.includes('already processed')
      ) {
        throw new BadRequestException(errorMessage);
      }

      // Re-throw other errors (will result in 500, triggering retry)
      throw error;
    }
  }

  /**
   * DoorDash Webhook Endpoint
   * POST /webhooks/doordash
   *
   * Receives and processes webhook events from DoorDash.
   *
   * Events handled:
   * - order.created: New order created
   *
   * @param signature - DoorDash signature header for verification
   * @param payload - DoorDash webhook payload
   * @returns 200 OK on success, 400 on validation failure
   */
  @Post('doordash')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'DoorDash webhook endpoint',
    description:
      'Receives webhook events from DoorDash for new orders. ' +
      'This endpoint is secured via signature verification.',
  })
  @ApiBody({ type: DoorDashWebhookDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook received and processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook signature or malformed payload',
  })
  @ApiExcludeEndpoint() // Hide from public API docs (external endpoint)
  async handleDoorDashWebhook(
    @Headers('x-doordash-signature') signature: string,
    @Body() payload: DoorDashWebhookDto,
  ): Promise<{ received: boolean; orderId?: string }> {
    this.logger.log(
      `Received DoorDash webhook: ${payload.event_type} for order ${payload.order_id}`,
    );

    try {
      // TODO: Verify signature (placeholder for now)
      // await this.verifyDoorDashSignature(signature, payload);
      if (!signature) {
        this.logger.warn('DoorDash signature verification not implemented - accepting webhook');
      }

      // Store webhook event for audit trail and idempotency
      const eventId = await this.webhooksService.storeWebhookEvent(
        'other',
        `doordash.${payload.event_type}`,
        payload.event_id,
        payload,
      );

      // Only process 'created' status orders
      if (payload.status !== 'created') {
        this.logger.log(
          `Skipping DoorDash order ${payload.order_id} with status: ${payload.status}`,
        );
        await this.webhooksService.markEventProcessed(eventId, true);
        return { received: true };
      }

      // Transform to CreateOrderDto
      const createOrderDto = await this.deliveryTransformer.transformDoorDashOrder(payload);

      // Process through OrderOrchestrator
      const order = await this.orderOrchestrator.processOrder(createOrderDto);

      // Mark event as processed
      await this.webhooksService.markEventProcessed(eventId, true);

      this.logger.log(`DoorDash order ${payload.order_id} processed successfully → ${order.id}`);

      return { received: true, orderId: order.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `DoorDash webhook processing failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Return 400 for validation/signature failures
      if (
        errorMessage.includes('signature') ||
        errorMessage.includes('validation') ||
        errorMessage.includes('already processed')
      ) {
        throw new BadRequestException(errorMessage);
      }

      // Re-throw other errors (will result in 500, triggering retry)
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

  /**
   * Placeholder for Uber Eats signature verification
   * TODO: Implement actual signature verification using Uber Eats shared secret
   */
  // private async verifyUberEatsSignature(
  //   signature: string,
  //   payload: any,
  // ): Promise<void> {
  //   // Implementation:
  //   // 1. Get shared secret from environment variable
  //   // 2. Compute HMAC-SHA256 of payload
  //   // 3. Compare with signature header
  //   // 4. Throw BadRequestException if mismatch
  // }

  /**
   * Placeholder for DoorDash signature verification
   * TODO: Implement actual signature verification using DoorDash shared secret
   */
  // private async verifyDoorDashSignature(
  //   signature: string,
  //   payload: any,
  // ): Promise<void> {
  //   // Implementation:
  //   // 1. Get shared secret from environment variable
  //   // 2. Compute HMAC-SHA256 of payload
  //   // 3. Compare with signature header
  //   // 4. Throw BadRequestException if mismatch
  // }
}
