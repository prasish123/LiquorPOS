import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface QueuedOperation {
  id: string;
  type: 'transaction' | 'payment_capture' | 'conexxus_sync' | 'inventory_update';
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  completedAt?: Date;
  error?: string;
  priority: number; // Higher = more important
}

export interface OfflineQueueMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  successRate: number;
}

/**
 * Offline Queue Service
 * Handles queuing of operations when offline or when external services are unavailable
 * Implements store-and-forward pattern with automatic retry logic
 */
@Injectable()
export class OfflineQueueService implements OnModuleInit {
  private readonly logger = new Logger(OfflineQueueService.name);
  private isProcessing = false;
  private readonly MAX_CONCURRENT_OPERATIONS = 5;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.validateConfig();
    this.logger.log('Offline Queue Service initialized');
    // Process any pending operations on startup
    await this.processQueue();
  }

  /**
   * Validate configuration on startup
   */
  private validateConfig(): void {
    const errors: string[] = [];

    if (this.MAX_CONCURRENT_OPERATIONS <= 0) {
      errors.push('MAX_CONCURRENT_OPERATIONS must be greater than 0');
    }

    if (this.MAX_CONCURRENT_OPERATIONS > 20) {
      this.logger.warn(
        `MAX_CONCURRENT_OPERATIONS is very high (${this.MAX_CONCURRENT_OPERATIONS}). May impact performance.`,
      );
    }

    if (errors.length > 0) {
      const errorMessage = `Offline Queue Service configuration errors:\n${errors.map((e) => `  - ${e}`).join('\n')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.log('Offline Queue Service configuration validated successfully');
  }

  /**
   * Add operation to offline queue
   */
  async enqueue(
    type: QueuedOperation['type'],
    payload: any,
    priority: number = 5,
    maxAttempts: number = 5,
  ): Promise<string> {
    try {
      const queueItem = await this.prisma.eventLog.create({
        data: {
          eventType: `offline.queue.${type}`,
          aggregateId: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          payload: JSON.stringify({
            type,
            payload,
            status: 'pending',
            attempts: 0,
            maxAttempts,
            priority,
            createdAt: new Date().toISOString(),
          }),
          metadata: JSON.stringify({
            queuedBy: 'offline-queue-service',
            priority,
          }),
          processed: false,
        },
      });

      this.logger.log(`Queued ${type} operation: ${queueItem.id}`);
      return queueItem.id;
    } catch (error) {
      this.logger.error(
        `Failed to enqueue ${type} operation`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Process queued operations (runs every 2 minutes)
   */
  @Cron(CronExpression.EVERY_2_MINUTES)
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Queue processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      // Get pending operations ordered by priority and creation time
      const pendingOps = await this.prisma.eventLog.findMany({
        where: {
          eventType: {
            startsWith: 'offline.queue.',
          },
          processed: false,
        },
        orderBy: [
          { timestamp: 'asc' }, // FIFO within same priority
        ],
        take: this.MAX_CONCURRENT_OPERATIONS,
      });

      if (pendingOps.length === 0) {
        this.logger.debug('No pending operations in queue');
        return;
      }

      this.logger.log(`Processing ${pendingOps.length} queued operations`);

      // Process operations in parallel (up to MAX_CONCURRENT_OPERATIONS)
      const results = await Promise.allSettled(
        pendingOps.map((op) => this.processOperation(op)),
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `Queue processing completed: ${successful} successful, ${failed} failed`,
      );
    } catch (error) {
      this.logger.error(
        'Error processing queue',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queued operation
   */
  private async processOperation(eventLog: any): Promise<void> {
    const operationData = JSON.parse(eventLog.payload);
    const { type, payload, attempts, maxAttempts } = operationData;

    this.logger.log(
      `Processing ${type} operation ${eventLog.id} (attempt ${attempts + 1}/${maxAttempts})`,
    );

    try {
      // Update status to processing
      operationData.status = 'processing';
      operationData.attempts = attempts + 1;
      operationData.lastAttemptAt = new Date().toISOString();

      await this.prisma.eventLog.update({
        where: { id: eventLog.id },
        data: {
          payload: JSON.stringify(operationData),
        },
      });

      // Process based on type
      await this.executeOperation(type, payload);

      // Mark as completed
      operationData.status = 'completed';
      operationData.completedAt = new Date().toISOString();

      await this.prisma.eventLog.update({
        where: { id: eventLog.id },
        data: {
          payload: JSON.stringify(operationData),
          processed: true,
          processedAt: new Date(),
        },
      });

      this.logger.log(`Successfully processed ${type} operation ${eventLog.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to process ${type} operation ${eventLog.id}: ${errorMessage}`,
        errorStack,
      );

      operationData.status = 'failed';
      operationData.error = errorMessage;

      // If max attempts reached, mark as permanently failed
      if (operationData.attempts >= maxAttempts) {
        this.logger.error(
          `Operation ${eventLog.id} failed permanently after ${maxAttempts} attempts`,
        );
        operationData.status = 'failed';
        await this.prisma.eventLog.update({
          where: { id: eventLog.id },
          data: {
            payload: JSON.stringify(operationData),
            processed: true, // Mark as processed to stop retrying
            processedAt: new Date(),
          },
        });
      } else {
        // Will retry on next queue processing
        await this.prisma.eventLog.update({
          where: { id: eventLog.id },
          data: {
            payload: JSON.stringify(operationData),
          },
        });
      }

      throw error;
    }
  }

  /**
   * Execute the actual operation based on type
   * This is a placeholder - actual implementation will be injected via handlers
   */
  private async executeOperation(
    type: QueuedOperation['type'],
    payload: any,
  ): Promise<void> {
    // This will be implemented by registering handlers
    // For now, we'll just log that the operation would be executed
    this.logger.debug(
      `Executing ${type} operation with payload: ${JSON.stringify(payload).substring(0, 100)}...`,
    );

    // Actual execution will be delegated to registered handlers
    // See registerHandler method below
    const handler = this.handlers.get(type);
    if (handler) {
      await handler(payload);
    } else {
      throw new Error(`No handler registered for operation type: ${type}`);
    }
  }

  // Handler registry
  private handlers = new Map<
    QueuedOperation['type'],
    (payload: any) => Promise<void>
  >();

  /**
   * Register a handler for a specific operation type
   */
  registerHandler(
    type: QueuedOperation['type'],
    handler: (payload: any) => Promise<void>,
  ): void {
    this.handlers.set(type, handler);
    this.logger.log(`Registered handler for ${type} operations`);
  }

  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<OfflineQueueMetrics> {
    const allOps = await this.prisma.eventLog.findMany({
      where: {
        eventType: {
          startsWith: 'offline.queue.',
        },
      },
    });

    const pending = allOps.filter((op) => {
      const data = JSON.parse(op.payload);
      return data.status === 'pending' && !op.processed;
    }).length;

    const processing = allOps.filter((op) => {
      const data = JSON.parse(op.payload);
      return data.status === 'processing';
    }).length;

    const completed = allOps.filter((op) => {
      const data = JSON.parse(op.payload);
      return data.status === 'completed';
    }).length;

    const failed = allOps.filter((op) => {
      const data = JSON.parse(op.payload);
      return data.status === 'failed' && op.processed;
    }).length;

    const totalProcessed = completed + failed;
    const successRate = totalProcessed > 0 ? completed / totalProcessed : 0;

    return {
      pending,
      processing,
      completed,
      failed,
      totalProcessed,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  /**
   * Get pending operations count
   */
  async getPendingCount(): Promise<number> {
    const count = await this.prisma.eventLog.count({
      where: {
        eventType: {
          startsWith: 'offline.queue.',
        },
        processed: false,
      },
    });

    return count;
  }

  /**
   * Clear completed operations older than specified days
   */
  async cleanupCompleted(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.eventLog.deleteMany({
      where: {
        eventType: {
          startsWith: 'offline.queue.',
        },
        processed: true,
        processedAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} completed operations older than ${olderThanDays} days`,
    );

    return result.count;
  }

  /**
   * Retry failed operations
   */
  async retryFailed(): Promise<number> {
    const failedOps = await this.prisma.eventLog.findMany({
 