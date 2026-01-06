import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { NetworkStatusService } from '../../common/network-status.service';
import { OfflineQueueService } from '../../common/offline-queue.service';
import { ConexxusHttpClient, ConexxusSalesData } from './conexxus-http.client';

export interface ConexxusSyncMetrics {
  pendingSyncs: number;
  failedSyncs: number;
  lastSuccessfulSync?: Date;
  lastSyncAttempt?: Date;
  totalSynced: number;
}

/**
 * Conexxus Offline Service
 * Implements store-and-forward pattern for Conexxus synchronization
 * Queues sync operations when offline and processes them when back online
 */
@Injectable()
export class ConexxusOfflineService {
  private readonly logger = new Logger(ConexxusOfflineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly networkStatus: NetworkStatusService,
    private readonly offlineQueue: OfflineQueueService,
    private readonly conexxusClient?: ConexxusHttpClient,
  ) {
    // Register handler for Conexxus sync operations
    this.offlineQueue.registerHandler('conexxus_sync', (payload) =>
      this.processSyncOperation(payload),
    );

    this.logger.log('Conexxus Offline Service initialized');
  }

  /**
   * Queue sales data for sync (store-and-forward)
   */
  async queueSalesData(salesData: ConexxusSalesData): Promise<string> {
    this.logger.log(
      `Queuing sales data for sync: ${salesData.date}, ${salesData.transactions.length} transactions`,
    );

    // If online and Conexxus is available, try immediate sync
    if (this.networkStatus.isConexxusAvailable() && this.conexxusClient) {
      try {
        await this.conexxusClient.pushSalesData(salesData);
        this.logger.log('Sales data synced immediately (online mode)');

        // Log successful sync
        await this.logSync(salesData, 'success');

        return 'synced-immediately';
      } catch (error) {
        this.logger.warn(
          'Immediate sync failed, queuing for later',
          error instanceof Error ? error.message : undefined,
        );
        // Fall through to queue the operation
      }
    }

    // Queue for later processing
    const queueId = await this.offlineQueue.enqueue(
      'conexxus_sync',
      {
        type: 'sales_data',
        data: salesData,
      },
      8, // High priority
      10, // Max 10 retry attempts
    );

    // Log queued sync
    await this.logSync(salesData, 'queued', queueId);

    this.logger.log(`Sales data queued for sync: ${queueId}`);
    return queueId;
  }

  /**
   * Queue inventory update for sync
   */
  async queueInventoryUpdate(
    locationId: string,
    updates: Array<{ sku: string; quantity: number }>,
  ): Promise<string> {
    this.logger.log(`Queuing inventory update for sync: ${locationId}, ${updates.length} items`);

    const queueId = await this.offlineQueue.enqueue(
      'conexxus_sync',
      {
        type: 'inventory_update',
        locationId,
        updates,
        timestamp: new Date().toISOString(),
      },
      7, // Medium-high priority
      5, // Max 5 retry attempts
    );

    this.logger.log(`Inventory update queued for sync: ${queueId}`);
    return queueId;
  }

  /**
   * Process a queued sync operation
   */
  private async processSyncOperation(payload: any): Promise<void> {
    const { type, data, locationId, updates } = payload;

    if (!this.conexxusClient) {
      throw new Error('Conexxus client not available');
    }

    // Check if Conexxus is available
    if (!this.networkStatus.isConexxusAvailable()) {
      throw new Error('Conexxus is not available, will retry later');
    }

    this.logger.log(`Processing ${type} sync operation`);

    switch (type) {
      case 'sales_data':
        await this.conexxusClient.pushSalesData(data);
        await this.logSync(data, 'success');
        this.logger.log(`Successfully synced sales data: ${data.date}`);
        break;

      case 'inventory_update':
        // This would call a Conexxus inventory update endpoint
        // For now, we'll just log it
        this.logger.log(`Syncing inventory update for ${locationId}: ${updates.length} items`);
        // await this.conexxusClient.updateInventory(locationId, updates);
        break;

      default:
        throw new Error(`Unknown sync operation type: ${type}`);
    }
  }

  /**
   * Log sync operation for audit trail
   */
  private async logSync(
    salesData: ConexxusSalesData,
    status: 'queued' | 'success' | 'failed',
    queueId?: string,
  ): Promise<void> {
    try {
      await this.prisma.eventLog.create({
        data: {
          eventType: `conexxus.sync.${status}`,
          aggregateId: `conexxus-${salesData.date}-${salesData.locationId}`,
          locationId: salesData.locationId,
          payload: JSON.stringify({
            date: salesData.date,
            transactionCount: salesData.transactions.length,
            summary: salesData.summary,
            queueId,
            timestamp: new Date().toISOString(),
          }),
          metadata: JSON.stringify({
            status,
            networkStatus: this.networkStatus.getStatus(),
          }),
          processed: status === 'success',
          processedAt: status === 'success' ? new Date() : null,
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to log sync operation',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Get sync metrics
   */
  async getMetrics(locationId?: string): Promise<ConexxusSyncMetrics> {
    const queueMetrics = await this.offlineQueue.getMetrics();

    const where: any = {
      eventType: {
        startsWith: 'conexxus.sync.',
      },
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const syncLogs = await this.prisma.eventLog.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: 100,
    });

    const successfulSyncs = syncLogs.filter((log) => log.eventType.endsWith('.success'));
    const failedSyncs = syncLogs.filter((log) => log.eventType.endsWith('.failed'));

    return {
      pendingSyncs: queueMetrics.pending,
      failedSyncs: failedSyncs.length,
      lastSuccessfulSync: successfulSyncs[0]?.timestamp,
      lastSyncAttempt: syncLogs[0]?.timestamp,
      totalSynced: successfulSyncs.length,
    };
  }

  /**
   * Get pending syncs
   */
  async getPendingSyncs(locationId?: string): Promise<
    Array<{
      id: string;
      type: string;
      date: string;
      transactionCount: number;
      queuedAt: Date;
    }>
  > {
    const where: any = {
      eventType: 'conexxus.sync.queued',
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const pending = await this.prisma.eventLog.findMany({
      where,
      orderBy: {
        timestamp: 'asc',
      },
    });

    return pending.map((p) => {
      const data = JSON.parse(p.payload);
      return {
        id: p.id,
        type: 'sales_data',
        date: data.date,
        transactionCount: data.transactionCount || 0,
        queuedAt: p.timestamp,
      };
    });
  }

  /**
   * Manually trigger sync of pending operations
   */
  async syncPending(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    this.logger.log('Manually triggering sync of pending operations');

    // Check if Conexxus is available
    if (!this.networkStatus.isConexxusAvailable()) {
      throw new Error('Conexxus is not available');
    }

    // Trigger queue processing
    await this.offlineQueue.processQueue();

    // Get updated metrics
    const metrics = await this.offlineQueue.getMetrics();

    return {
      processed: metrics.totalProcessed,
      successful: metrics.completed,
      failed: metrics.failed,
    };
  }

  /**
   * Create sales data from transactions for a specific date
   */
  async createSalesDataFromTransactions(
    locationId: string,
    date: Date,
  ): Promise<ConexxusSalesData> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        locationId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        items: true,
      },
    });

    // Calculate summary
    const summary = {
      totalOrders: transactions.length,
      totalRevenue: transactions.reduce((sum, t) => sum + t.total, 0),
      totalTax: transactions.reduce((sum, t) => sum + t.tax, 0),
      totalDiscount: transactions.reduce((sum, t) => sum + t.discount, 0),
      averageOrderValue:
        transactions.length > 0
          ? transactions.reduce((sum, t) => sum + t.total, 0) / transactions.length
          : 0,
      itemsSold: transactions.reduce(
        (sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0),
        0,
      ),
    };

    const salesData: ConexxusSalesData = {
      date: date.toISOString().split('T')[0],
      locationId,
      transactions: transactions.map((t) => ({
        id: t.id,
        timestamp: t.createdAt.toISOString(),
        total: t.total,
        items: t.items.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
          price: item.unitPrice,
        })),
      })),
      summary,
    };

    return salesData;
  }

  /**
   * Queue end-of-day sales data for sync
   */
  async queueEndOfDaySync(locationId: string, date?: Date): Promise<string> {
    const syncDate = date || new Date();
    syncDate.setDate(syncDate.getDate() - 1); // Previous day

    this.logger.log(
      `Queuing end-of-day sync for ${locationId} on ${syncDate.toISOString().split('T')[0]}`,
    );

    const salesData = await this.createSalesDataFromTransactions(locationId, syncDate);

    return this.queueSalesData(salesData);
  }
}
