import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface WebhookEvent {
  id: string;
  type: string;
  provider: 'stripe' | 'other';
  eventId: string;
  payload: any;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  retryCount: number;
  createdAt: Date;
}

/**
 * Webhooks Service
 *
 * Manages webhook event storage, processing, and retry logic.
 * Provides a unified interface for handling webhooks from multiple providers.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Store webhook event for processing and audit trail
   */
  async storeWebhookEvent(
    provider: 'stripe' | 'other',
    eventType: string,
    eventId: string,
    payload: any,
  ): Promise<string> {
    try {
      // Check if event already processed (idempotency)
      const existing = await this.prisma.eventLog.findFirst({
        where: {
          eventType: `webhook.${provider}.${eventType}`,
          aggregateId: eventId,
        },
      });

      if (existing) {
        this.logger.log(`Webhook event ${eventId} already processed, skipping`);
        return existing.id;
      }

      // Store new event
      const event = await this.prisma.eventLog.create({
        data: {
          eventType: `webhook.${provider}.${eventType}`,
          aggregateId: eventId,
          payload: JSON.stringify(payload),
          metadata: JSON.stringify({
            provider,
            receivedAt: new Date().toISOString(),
          }),
          processed: false,
        },
      });

      this.logger.log(
        `Stored webhook event: ${event.id}, Type: ${eventType}, Provider: ${provider}`,
      );

      return event.id;
    } catch (error) {
      this.logger.error(
        `Failed to store webhook event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Mark webhook event as processed
   */
  async markEventProcessed(eventId: string, success: boolean, error?: string): Promise<void> {
    try {
      await this.prisma.eventLog.update({
        where: { id: eventId },
        data: {
          processed: success,
          processedAt: new Date(),
          metadata: error
            ? JSON.stringify({ error, processedAt: new Date().toISOString() })
            : JSON.stringify({ processedAt: new Date().toISOString() }),
        },
      });

      this.logger.log(`Marked webhook event ${eventId} as ${success ? 'processed' : 'failed'}`);
    } catch (error) {
      this.logger.error(
        `Failed to mark event as processed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Get unprocessed webhook events for retry
   */
  async getUnprocessedEvents(limit: number = 100): Promise<any[]> {
    try {
      const events = await this.prisma.eventLog.findMany({
        where: {
          eventType: {
            startsWith: 'webhook.',
          },
          processed: false,
        },
        orderBy: {
          timestamp: 'asc',
        },
        take: limit,
      });

      return events;
    } catch (error) {
      this.logger.error(
        `Failed to get unprocessed events: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(provider?: 'stripe' | 'other'): Promise<{
    total: number;
    processed: number;
    failed: number;
    pending: number;
  }> {
    try {
      const whereClause = provider
        ? {
            eventType: {
              startsWith: `webhook.${provider}.`,
            },
          }
        : {
            eventType: {
              startsWith: 'webhook.',
            },
          };

      const [total, processed, failed] = await Promise.all([
        this.prisma.eventLog.count({ where: whereClause }),
        this.prisma.eventLog.count({
          where: { ...whereClause, processed: true },
        }),
        this.prisma.eventLog.count({
          where: {
            ...whereClause,
            processed: false,
            metadata: {
              contains: 'error',
            },
          },
        }),
      ]);

      return {
        total,
        processed,
        failed,
        pending: total - processed,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get webhook stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      return { total: 0, processed: 0, failed: 0, pending: 0 };
    }
  }
}
