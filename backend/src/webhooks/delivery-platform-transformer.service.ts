import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CreateOrderDto, OrderItemDto } from '../orders/dto/order.dto';
import { UberEatsWebhookDto } from './dto/ubereats-webhook.dto';
import { DoorDashWebhookDto } from './dto/doordash-webhook.dto';
import { PrismaService } from '../prisma.service';

/**
 * Delivery Platform Transformer Service
 *
 * Transforms platform-specific webhook payloads into standardized CreateOrderDto
 * for processing by OrderOrchestrator.
 *
 * Responsibilities:
 * - Map platform-specific fields to CreateOrderDto
 * - Convert currency (cents → dollars)
 * - Generate platform-specific idempotency keys
 * - Map store IDs to location IDs
 * - Handle missing/optional fields
 *
 * Does NOT:
 * - Process payments (handled by OrderOrchestrator)
 * - Calculate pricing (uses platform-provided values)
 * - Check inventory (handled by OrderOrchestrator)
 */
@Injectable()
export class DeliveryPlatformTransformerService {
  private readonly logger = new Logger(DeliveryPlatformTransformerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Transform Uber Eats webhook payload to CreateOrderDto
   */
  async transformUberEatsOrder(
    payload: UberEatsWebhookDto,
  ): Promise<CreateOrderDto> {
    this.logger.log(`Transforming Uber Eats order: ${payload.order_id}`);

    // Only process 'created' status orders
    if (payload.status !== 'created') {
      throw new BadRequestException(
        `Cannot process Uber Eats order with status: ${payload.status}`,
      );
    }

    // Map store ID to location ID
    const locationId = await this.mapStoreToLocation(
      'uber_eats',
      payload.store_id,
    );

    // Transform items
    const items: OrderItemDto[] = payload.items.map((item) => ({
      sku: item.external_data || `UBEREATS-${item.id}`,
      quantity: item.quantity,
      priceAtSale: this.centsToDecimal(item.price),
      discount: 0, // Uber Eats doesn't provide per-item discounts
    }));

    // Validate items array
    if (items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    if (items.length > 100) {
      throw new BadRequestException('Order cannot contain more than 100 items');
    }

    // Generate platform-specific idempotency key
    const idempotencyKey = this.generateIdempotencyKey(
      'uber_eats',
      payload.event_id,
      payload.order_id,
    );

    // Build CreateOrderDto
    const createOrderDto: CreateOrderDto = {
      locationId,
      terminalId: undefined, // Delivery orders don't have terminals
      employeeId: undefined, // Delivery orders don't have employees
      customerId: undefined, // Could be mapped if customer tracking is needed

      items,

      paymentMethod: 'card', // Uber Eats orders are pre-paid
      channel: 'uber_eats',

      // Use platform-provided totals (Source of Truth)
      subtotal: this.centsToDecimal(payload.payment.subtotal || 0),
      tax: this.centsToDecimal(payload.payment.tax || 0),
      total: this.centsToDecimal(payload.payment.total),

      // Compliance: Delivery platforms should verify age
      // Mark as verified since platform handles this
      ageVerified: true,
      ageVerifiedBy: 'Uber Eats Platform',
      idScanned: false, // Platform verification, not physical scan

      idempotencyKey,
    };

    this.logger.log(
      `Transformed Uber Eats order ${payload.order_id} → ${idempotencyKey}`,
    );

    return createOrderDto;
  }

  /**
   * Transform DoorDash webhook payload to CreateOrderDto
   */
  async transformDoorDashOrder(
    payload: DoorDashWebhookDto,
  ): Promise<CreateOrderDto> {
    this.logger.log(`Transforming DoorDash order: ${payload.order_id}`);

    // Only process 'created' status orders
    if (payload.status !== 'created') {
      throw new BadRequestException(
        `Cannot process DoorDash order with status: ${payload.status}`,
      );
    }

    // Map store ID to location ID
    const locationId = await this.mapStoreToLocation(
      'doordash',
      payload.store_id,
    );

    // Transform items
    const items: OrderItemDto[] = payload.items.map((item) => ({
      sku: item.external_id || `DOORDASH-${item.id}`,
      quantity: item.quantity,
      priceAtSale: this.centsToDecimal(item.unit_price),
      discount: 0, // DoorDash doesn't provide per-item discounts
    }));

    // Validate items array
    if (items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    if (items.length > 100) {
      throw new BadRequestException('Order cannot contain more than 100 items');
    }

    // Generate platform-specific idempotency key
    const idempotencyKey = this.generateIdempotencyKey(
      'doordash',
      payload.event_id,
      payload.order_id,
    );

    // Build CreateOrderDto
    const createOrderDto: CreateOrderDto = {
      locationId,
      terminalId: undefined, // Delivery orders don't have terminals
      employeeId: undefined, // Delivery orders don't have employees
      customerId: undefined, // Could be mapped if customer tracking is needed

      items,

      paymentMethod: 'card', // DoorDash orders are pre-paid
      channel: 'doordash',

      // Use platform-provided totals (Source of Truth)
      subtotal: this.centsToDecimal(payload.order_value.subtotal),
      tax: this.centsToDecimal(payload.order_value.tax),
      total: this.centsToDecimal(payload.order_value.total),

      // Compliance: Delivery platforms should verify age
      // Mark as verified since platform handles this
      ageVerified: true,
      ageVerifiedBy: 'DoorDash Platform',
      idScanned: false, // Platform verification, not physical scan

      idempotencyKey,
    };

    this.logger.log(
      `Transformed DoorDash order ${payload.order_id} → ${idempotencyKey}`,
    );

    return createOrderDto;
  }

  /**
   * Map platform store ID to internal location ID
   * Uses database lookup with fallback to default location
   */
  private async mapStoreToLocation(
    platform: 'uber_eats' | 'doordash',
    storeId: string,
  ): Promise<string> {
    try {
      // Try to find location by external store mapping
      // This would require a store_mappings table or metadata field
      const location = await this.prisma.location.findFirst({
        where: {
          // Assuming locations have a metadata field for external mappings
          // Adjust based on actual schema
          name: {
            contains: storeId,
          },
        },
      });

      if (location) {
        this.logger.debug(
          `Mapped ${platform} store ${storeId} → location ${location.id}`,
        );
        return location.id;
      }

      // Fallback: Use first available location
      const defaultLocation = await this.prisma.location.findFirst({
        orderBy: { createdAt: 'asc' },
      });

      if (!defaultLocation) {
        throw new BadRequestException(
          'No locations found in system. Please create a location first.',
        );
      }

      this.logger.warn(
        `No mapping found for ${platform} store ${storeId}, using default location ${defaultLocation.id}`,
      );

      return defaultLocation.id;
    } catch (error) {
      this.logger.error(
        `Failed to map store to location: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Failed to map store to location');
    }
  }

  /**
   * Convert cents to decimal dollars
   */
  private centsToDecimal(cents: number): number {
    return Math.round(cents) / 100;
  }

  /**
   * Generate platform-specific idempotency key
   * Format: {platform}:{event_id}:{order_id}
   */
  private generateIdempotencyKey(
    platform: 'uber_eats' | 'doordash',
    eventId: string,
    orderId: string,
  ): string {
    // Create a deterministic key that's unique per platform event
    return `${platform}:${eventId}:${orderId}`;
  }
}

