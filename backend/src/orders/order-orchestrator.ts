import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma.service';
import { Transaction } from '@prisma/client';
import {
  CreateOrderDto,
  OrderResponseDto,
  OrderItemResponseDto,
} from './dto/order.dto';
import { InventoryAgent, InventoryReservation } from './agents/inventory.agent';
import { PricingAgent, PricingResult } from './agents/pricing.agent';
import { ComplianceAgent, ComplianceResult } from './agents/compliance.agent';
import { PaymentAgent, PaymentResult } from './agents/payment.agent';
import { OfflinePaymentAgent, OfflinePaymentResult } from './agents/offline-payment.agent';
import { AuditService } from './audit.service';
import { NetworkStatusService } from '../common/network-status.service';
import { OfflineQueueService } from '../common/offline-queue.service';

interface OrderContext {
  order: CreateOrderDto;
  inventory?: InventoryReservation;
  pricing?: PricingResult;
  compliance?: ComplianceResult;
  payment?: PaymentResult | OfflinePaymentResult;
  transactionId?: string;
  offlineMode?: boolean;
}

@Injectable()
export class OrderOrchestrator {
  private readonly logger = new Logger(OrderOrchestrator.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private inventoryAgent: InventoryAgent,
    private pricingAgent: PricingAgent,
    private complianceAgent: ComplianceAgent,
    private paymentAgent: PaymentAgent,
    private offlinePaymentAgent: OfflinePaymentAgent,
    private auditService: AuditService,
    private networkStatus: NetworkStatusService,
    private offlineQueue: OfflineQueueService,
  ) {
    // Register handler for offline transaction processing
    this.offlineQueue.registerHandler('transaction', (payload) =>
      this.processOfflineTransaction(payload),
    );
  }

  /**
   * Process order using SAGA pattern
   * Each step can be compensated if a later step fails
   */
  async processOrder(dto: CreateOrderDto): Promise<OrderResponseDto> {
    const context: OrderContext = { order: dto };

    try {
      this.logger.log(`Processing order for location ${dto.locationId}`);

      // Step 1: Inventory check and reservation
      this.logger.debug('Step 1: Checking and reserving inventory');
      context.inventory = await this.inventoryAgent.checkAndReserve(
        dto.locationId,
        dto.items,
      );

      // Step 2: Calculate pricing (or use POS provided values)
      this.logger.debug('Step 2: Determining pricing');
      if (dto.subtotal !== undefined && dto.total !== undefined) {
        // Trust POS values
        this.logger.debug('Using POS provided pricing (Source of Truth)');
        context.pricing = {
          subtotal: dto.subtotal,
          totalTax: dto.tax || 0,
          totalDiscount: 0, // Simplified for now
          total: dto.total,
          items: dto.items.map((item) => ({
            sku: item.sku,
            name: 'Item ' + item.sku,
            quantity: item.quantity,
            unitPrice: item.priceAtSale || 0,
            discount: item.discount || 0,
            tax: 0,
            total: (item.priceAtSale || 0) * item.quantity,
          })),
        };
      } else {
        context.pricing = await this.pricingAgent.calculate(
          dto.items,
          dto.locationId,
        );
      }

      // Step 3: Compliance check (age verification)
      this.logger.debug('Step 3: Verifying compliance');
      context.compliance = await this.complianceAgent.verifyAge(
        dto.items,
        dto.customerId,
        dto.ageVerified,
      );

      // Step 4: Process payment (with offline fallback)
      this.logger.debug('Step 4: Processing payment');
      
      // Check if we're online and Stripe is available
      const isStripeAvailable = this.networkStatus.isStripeAvailable();
      const isOnline = this.networkStatus.isOnline();
      
      if (!isStripeAvailable && dto.paymentMethod === 'card') {
        this.logger.warn('Stripe unavailable, attempting offline payment authorization');
        
        // Try offline payment
        context.payment = await this.offlinePaymentAgent.authorizeOffline(
          context.pricing.total,
          dto.paymentMethod,
          dto.locationId,
          {
            employeeId: dto.employeeId,
            terminalId: dto.terminalId,
          },
        );
        context.offlineMode = true;
        
        if (context.payment.status === 'failed') {
          throw new Error(
            context.payment.errorMessage || 'Offline payment authorization failed',
          );
        }
        
        // Queue payment capture for when we're back online
        if ('requiresOnlineCapture' in context.payment && context.payment.requiresOnlineCapture) {
          await this.offlineQueue.enqueue(
            'payment_capture',
            {
              paymentId: context.payment.paymentId,
              processorId: context.payment.processorId,
              amount: context.payment.amount,
              locationId: dto.locationId,
            },
            9, // High priority
          );
        }
      } else {
        // Normal online payment processing
        context.payment = await this.paymentAgent.authorize(
          context.pricing.total,
          dto.paymentMethod,
        );
        context.offlineMode = false;
        
        if (context.payment.status === 'failed') {
          throw new Error('Payment authorization failed');
        }
      }

      // Step 5: Create transaction record
      this.logger.debug('Step 5: Creating transaction record');
      const transaction = await this.createTransaction(context);
      context.transactionId = transaction.id;

      // Step 6: Commit inventory (deduct from stock)
      this.logger.debug('Step 6: Committing inventory');
      await this.inventoryAgent.commit(context.inventory, dto.locationId);

      // Step 7: Capture payment (if card and not offline)
      if (dto.paymentMethod === 'card' && !context.offlineMode) {
        this.logger.debug('Step 7: Capturing payment');
        await this.paymentAgent.capture(
          context.payment.paymentId,
          context.payment.processorId,
        );
      } else if (context.offlineMode) {
        this.logger.log('Skipping payment capture (offline mode - will capture when online)');
      }

      // Step 8: Create payment record
      // Convert OfflinePaymentResult to PaymentResult if needed
      const paymentRecord: PaymentResult = {
        paymentId: context.payment.paymentId,
        method: context.payment.method,
        amount: context.payment.amount,
        status: context.payment.status === 'offline_pending' ? 'authorized' : context.payment.status,
        processorId: context.payment.processorId,
      };
      await this.paymentAgent.createPaymentRecord(
        transaction.id,
        paymentRecord,
      );

      // Step 9: Log payment processing to audit trail
      await this.auditService.logPaymentProcessing(
        transaction.id,
        dto.paymentMethod,
        context.pricing.total,
        'success',
        {
          userId: dto.employeeId,
          ipAddress: undefined, // Will be set by controller
          userAgent: undefined,
        },
        {
          paymentId: context.payment.paymentId,
          processorId: context.payment.processorId,
        },
      );

      // Step 10: Log compliance event
      await this.complianceAgent.logComplianceEvent(
        transaction.id,
        dto.customerId,
        context.compliance.ageVerified,
        dto.employeeId,
      );

      // Step 11: Publish event
      this.logger.debug('Step 11: Publishing order.created event');
      await this.publishOrderCreatedEvent(transaction);

      this.logger.log(`Order ${transaction.id} processed successfully`);

      // Return formatted response
      return this.formatOrderResponse(transaction, context.pricing);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Order processing failed: ${errorMessage}`, errorStack);

      // Log failed payment processing
      if (context.payment) {
        await this.auditService.logPaymentProcessing(
          context.transactionId || 'unknown',
          dto.paymentMethod,
          context.pricing?.total || 0,
          'failure',
          {
            userId: dto.employeeId,
            ipAddress: undefined,
            userAgent: undefined,
          },
          {
            error: errorMessage,
          },
        );
      }

      // Compensation (SAGA pattern)
      await this.compensate(
        context,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * Create transaction record in database
   */
  private async createTransaction(context: OrderContext) {
    const { order, pricing } = context;

    if (!pricing) {
      throw new Error('Pricing information is required');
    }

    return await this.prisma.transaction.create({
      data: {
        locationId: order.locationId,
        terminalId: order.terminalId,
        employeeId: order.employeeId,
        customerId: order.customerId,

        subtotal: pricing.subtotal,
        tax: pricing.totalTax,
        discount: pricing.totalDiscount,
        total: pricing.total,

        paymentMethod: order.paymentMethod,
        paymentStatus: 'completed',
        channel: order.channel,

        ageVerified: order.ageVerified || false,
        ageVerifiedBy: order.ageVerifiedBy,
        idScanned: order.idScanned || false,

        idempotencyKey: order.idempotencyKey,

        items: {
          create: pricing.items.map((item) => ({
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            tax: item.tax,
            total: item.total,
          })),
        },
      },
      include: {
        items: true,
        location: true,
        customer: true,
      },
    });
  }

  /**
   * Compensate failed transaction (rollback)
   */
  private async compensate(context: OrderContext, error: Error): Promise<void> {
    this.logger.warn('Starting compensation for failed order');

    // Release inventory reservation
    if (context.inventory) {
      this.logger.debug('Compensating: Releasing inventory reservation');
      try {
        await this.inventoryAgent.release(
          context.inventory,
          context.order.locationId,
        );
      } catch (err) {
        this.logger.error('Failed to release inventory', err);
      }
    }

    // Void payment
    if (context.payment && context.payment.status !== 'failed') {
      this.logger.debug('Compensating: Voiding payment');
      try {
        // Convert OfflinePaymentResult to PaymentResult if needed
        const paymentToVoid: PaymentResult = {
          paymentId: context.payment.paymentId,
          method: context.payment.method,
          amount: context.payment.amount,
          status: context.payment.status === 'offline_pending' ? 'authorized' : context.payment.status,
          processorId: context.payment.processorId,
        };
        await this.paymentAgent.void(paymentToVoid);
      } catch (err) {
        this.logger.error('Failed to void payment', err);
      }
    }

    // Log failed transaction
    if (context.transactionId) {
      try {
        await this.prisma.transaction.update({
          where: { id: context.transactionId },
          data: { paymentStatus: 'refunded' },
        });
      } catch (err) {
        this.logger.error('Failed to update transaction status', err);
      }
    }

    // Publish failure event
    void this.eventEmitter.emit('order.failed', {
      order: context.order,
      error: error.message,
      timestamp: new Date(),
    });
  }

  /**
   * Publish order created event
   */
  private async publishOrderCreatedEvent(
    transaction: Transaction & { items: unknown[] },
  ): Promise<void> {
    void this.eventEmitter.emit('order.created', {
      transactionId: transaction.id,
      locationId: transaction.locationId,
      total: transaction.total,
      channel: transaction.channel,
      timestamp: transaction.createdAt,
    });

    // Also log to event store
    await this.prisma.eventLog.create({
      data: {
        eventType: 'order.created',
        aggregateId: transaction.id,
        locationId: transaction.locationId,
        payload: JSON.stringify({
          transactionId: transaction.id,
          total: transaction.total,
          itemCount: transaction.items.length,
        }),
      },
    });
  }

  /**
   * Format transaction for API response
   */
  private formatOrderResponse(
    transaction: Transaction,
    pricing: PricingResult,
  ): OrderResponseDto {
    const items: OrderItemResponseDto[] = pricing.items.map((item) => ({
      id: crypto.randomUUID(),
      ...item,
    }));

    return {
      id: transaction.id,
      locationId: transaction.locationId,
      terminalId: transaction.terminalId || undefined,
      employeeId: transaction.employeeId || undefined,
      customerId: transaction.customerId || undefined,

      subtotal: Number(transaction.subtotal),
      tax: Number(transaction.tax),
      discount: Number(transaction.discount),
      total: Number(transaction.total),

      paymentMethod: transaction.paymentMethod,
      paymentStatus: transaction.paymentStatus,
      channel: transaction.channel,

      ageVerified: transaction.ageVerified,
      idScanned: transaction.idScanned,

      items,

      createdAt: transaction.createdAt,
    };
  }

  /**
   * Process offline transaction (called by queue processor)
   */
  private async processOfflineTransaction(payload: any): Promise<void> {
    this.logger.log(`Processing offline transaction: ${payload.transactionId}`);

    // This would handle any post-processing needed for offline transactions
    // For example, syncing with external systems when back online
    
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: payload.transactionId },
      include: { items: true },
    });

    if (!transaction) {
      throw new Error(`Transaction ${payload.transactionId} not found`);
    }

    // Publish event for external systems
    await this.publishOrderCreatedEvent(transaction);

    this.logger.log(`Offline transaction ${payload.transactionId} processed successfully`);
  }
}
