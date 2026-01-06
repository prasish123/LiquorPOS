import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryService } from '../../inventory/inventory.service';
import { OrdersService } from '../../orders/orders.service';
import { ProductsService } from '../../products/products.service';
import { LoggerService } from '../../common/logger.service';
import { PrismaService } from '../../prisma.service';
import { ConexxusHttpClient, ConexxusItem, ConexxusSalesData } from './conexxus-http.client';
import { CircuitState } from './circuit-breaker';

export interface SyncMetrics {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errors: Array<{ item?: string; error: string }>;
}

export interface HealthStatus {
  isHealthy: boolean;
  lastSyncTime?: Date;
  lastSyncStatus?: 'success' | 'partial' | 'failed';
  lastError?: string;
  apiConnection: boolean;
}

/**
 * Conexxus Integration Service
 * Handles synchronization with Conexxus back-office system via REST API
 *
 * Features:
 * - REST API integration (replaces file-based)
 * - Automatic retries with exponential backoff
 * - Comprehensive error handling
 * - Health monitoring
 * - Metrics tracking
 */
@Injectable()
export class ConexxusService {
  private readonly logger = new LoggerService('ConexxusService');
  private readonly httpClient: ConexxusHttpClient | null;
  private readonly isEnabled: boolean;

  // Health tracking
  private lastSyncTime?: Date;
  private lastSyncStatus?: 'success' | 'partial' | 'failed';
  private lastError?: string;
  private syncMetrics: SyncMetrics[] = [];
  private readonly maxMetricsHistory = 100;

  constructor(
    private inventoryService: InventoryService,
    private ordersService: OrdersService,
    private productsService: ProductsService,
    private prisma: PrismaService,
  ) {
    // Check if Conexxus is configured
    this.isEnabled = !!(process.env.CONEXXUS_API_URL && process.env.CONEXXUS_API_KEY);

    if (this.isEnabled) {
      try {
        this.httpClient = new ConexxusHttpClient(this.prisma);
        this.logger.log('Conexxus service initialized with HTTP client and circuit breaker');
      } catch (error) {
        this.httpClient = null;
        this.isEnabled = false;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to initialize Conexxus HTTP client: ${errorMessage}. Integration disabled.`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    } else {
      this.httpClient = null;
      this.logger.warn('Conexxus integration disabled: API URL or API Key not configured');
    }
  }

  /**
   * Sync inventory from Conexxus REST API
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async syncInventory(): Promise<SyncMetrics> {
    const metrics: SyncMetrics = {
      startTime: new Date(),
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      errors: [],
    };

    // Skip if Conexxus is not enabled
    if (!this.isEnabled || !this.httpClient) {
      this.logger.debug('Conexxus sync skipped: integration not enabled');
      metrics.endTime = new Date();
      metrics.duration = 0;
      return metrics;
    }

    this.logger.log('Starting scheduled Conexxus inventory sync via REST API');

    try {
      // Fetch items from Conexxus API
      const items = await this.httpClient.fetchInventoryItems();

      if (!items || items.length === 0) {
        this.logger.warn('No items returned from Conexxus API');
        this.updateSyncStatus('success', metrics);
        return metrics;
      }

      this.logger.log(`Received ${items.length} items from Conexxus API`);
      metrics.itemsProcessed = items.length;

      // Process each item
      for (const item of items) {
        try {
          await this.processInventoryItem(item);
          metrics.itemsSucceeded++;
        } catch (error) {
          metrics.itemsFailed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          metrics.errors.push({
            item: item.sku,
            error: errorMessage,
          });

          this.logger.warn(`Failed to process item ${item.sku}`, {
            sku: item.sku,
            error: errorMessage,
          });
        }
      }

      // Determine sync status
      const status =
        metrics.itemsFailed === 0 ? 'success' : metrics.itemsSucceeded > 0 ? 'partial' : 'failed';

      this.updateSyncStatus(status, metrics);

      this.logger.log('Conexxus inventory sync completed', {
        processed: metrics.itemsProcessed,
        succeeded: metrics.itemsSucceeded,
        failed: metrics.itemsFailed,
        status,
      });

      return metrics;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;

      metrics.errors.push({
        error: `Sync failed: ${errorMessage}`,
      });

      this.updateSyncStatus('failed', metrics, errorMessage);

      this.logger.error('Conexxus inventory sync failed', stack, {
        error: errorMessage,
        processed: metrics.itemsProcessed,
        succeeded: metrics.itemsSucceeded,
        failed: metrics.itemsFailed,
      });

      throw error;
    } finally {
      metrics.endTime = new Date();
      metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
      this.addMetrics(metrics);
    }
  }

  /**
   * Process a single inventory item
   */
  private async processInventoryItem(item: ConexxusItem): Promise<void> {
    // Validate item data
    if (!item.sku) {
      throw new Error('Item missing SKU');
    }

    if (!item.name) {
      throw new Error('Item missing name');
    }

    if (typeof item.price !== 'number' || item.price < 0) {
      throw new Error('Item has invalid price');
    }

    try {
      // Try to find existing product
      const existingProduct = await this.productsService.findBySku(item.sku);

      // Update existing product
      await this.productsService.update(existingProduct.id, {
        name: item.name,
        basePrice: item.price,
        category: item.category || existingProduct.category,
        description: item.description || existingProduct.description || undefined,
      });

      this.logger.debug(`Updated product ${item.sku}`, {
        sku: item.sku,
        name: item.name,
        price: item.price,
      });
    } catch (error) {
      // Product not found, create new one
      if (error instanceof Error && error.message.includes('not found')) {
        await this.productsService.create({
          sku: item.sku,
          name: item.name,
          basePrice: item.price,
          category: item.category || 'Conexxus',
          description: item.description || 'Imported from Conexxus',
          cost: item.price * 0.7, // Estimate 30% margin
          trackInventory: true,
          ageRestricted: false,
        });

        this.logger.debug(`Created new product ${item.sku}`, {
          sku: item.sku,
          name: item.name,
          price: item.price,
        });
      } else {
        // Re-throw other errors
        throw error;
      }
    }
  }

  /**
   * Push daily sales to Conexxus REST API
   * Runs daily at 11:30 PM
   */
  @Cron('0 30 23 * * *')
  async pushSales(date: Date = new Date()): Promise<void> {
    // Skip if Conexxus is not enabled
    if (!this.isEnabled || !this.httpClient) {
      this.logger.debug('Conexxus sales push skipped: integration not enabled');
      return;
    }

    this.logger.log(`Starting scheduled daily sales push to Conexxus for ${date.toDateString()}`);

    try {
      // Get daily sales summary
      const salesSummary = await this.ordersService.getDailySummary(date);

      if (!salesSummary || salesSummary.totalOrders === 0) {
        this.logger.log('No sales data to push for this date');
        return;
      }

      // Transform to Conexxus format
      const salesData: ConexxusSalesData = {
        date: date.toISOString().split('T')[0],
        locationId: process.env.LOCATION_ID || 'default',
        transactions: [], // Summary data, not individual transactions
        summary: {
          totalOrders: salesSummary.totalOrders,
          totalRevenue: salesSummary.totalRevenue,
          totalTax: salesSummary.totalTax,
          totalDiscount: salesSummary.totalDiscount,
          averageOrderValue: salesSummary.averageOrderValue,
          itemsSold: salesSummary.itemsSold,
        },
      };

      // Push to Conexxus API
      await this.httpClient.pushSalesData(salesData);

      this.logger.log('Successfully pushed sales data to Conexxus', {
        date: salesData.date,
        transactionCount: salesData.transactions.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Failed to push sales data to Conexxus', stack, {
        date: date.toDateString(),
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Manual sync trigger (for testing or on-demand sync)
   */
  async triggerManualSync(): Promise<SyncMetrics> {
    this.logger.log('Manual inventory sync triggered');
    return await this.syncInventory();
  }

  /**
   * Test connection to Conexxus API
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    latency?: number;
  }> {
    // Check if enabled
    if (!this.isEnabled || !this.httpClient) {
      return {
        success: false,
        message: 'Conexxus integration not enabled: API URL or API Key not configured',
      };
    }

    this.logger.log('Testing connection to Conexxus API');

    try {
      const result = await this.httpClient.testConnection();

      this.logger.log('Connection test completed', {
        success: result.success,
        message: result.message,
        latency: result.latency,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('Connection test failed', undefined, {
        error: errorMessage,
      });

      return {
        success: false,
        message: `Connection test failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Get health status of Conexxus integration
   */
  async getHealthStatus(): Promise<HealthStatus> {
    // If not enabled, return disabled status
    if (!this.isEnabled || !this.httpClient) {
      return {
        isHealthy: true, // Not unhealthy, just disabled
        lastSyncTime: this.lastSyncTime,
        lastSyncStatus: this.lastSyncStatus,
        lastError: 'Integration not enabled',
        apiConnection: false,
      };
    }

    // Check circuit breaker state
    const circuitStats = this.httpClient.getCircuitBreakerStats();
    const isCircuitOpen = circuitStats.state === CircuitState.OPEN;

    if (isCircuitOpen) {
      return {
        isHealthy: false,
        lastSyncTime: this.lastSyncTime,
        lastSyncStatus: this.lastSyncStatus,
        lastError: `Circuit breaker is OPEN (${circuitStats.failureCount} failures). Service unavailable.`,
        apiConnection: false,
      };
    }

    const apiConnection = await this.httpClient.healthCheck();

    return {
      isHealthy: apiConnection && (!this.lastSyncStatus || this.lastSyncStatus !== 'failed'),
      lastSyncTime: this.lastSyncTime,
      lastSyncStatus: this.lastSyncStatus,
      lastError: this.lastError,
      apiConnection,
    };
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats() {
    if (!this.httpClient) {
      return null;
    }
    return this.httpClient.getCircuitBreakerStats();
  }

  /**
   * Get sync metrics history
   */
  getSyncMetrics(limit: number = 10): SyncMetrics[] {
    return this.syncMetrics.slice(-limit);
  }

  /**
   * Get latest sync metrics
   */
  getLatestSyncMetrics(): SyncMetrics | undefined {
    return this.syncMetrics[this.syncMetrics.length - 1];
  }

  /**
   * Update sync status tracking
   */
  private updateSyncStatus(
    status: 'success' | 'partial' | 'failed',
    metrics: SyncMetrics,
    error?: string,
  ): void {
    this.lastSyncTime = new Date();
    this.lastSyncStatus = status;
    this.lastError = error;

    if (status === 'failed') {
      this.logger.error('Sync failed', undefined, {
        error,
        metrics,
      });
    } else if (status === 'partial') {
      this.logger.warn('Sync completed with errors', {
        succeeded: metrics.itemsSucceeded,
        failed: metrics.itemsFailed,
      });
    } else {
      this.logger.log('Sync completed successfully', {
        itemsProcessed: metrics.itemsProcessed,
      });
    }
  }

  /**
   * Add metrics to history
   */
  private addMetrics(metrics: SyncMetrics): void {
    this.syncMetrics.push(metrics);

    // Keep only recent metrics
    if (this.syncMetrics.length > this.maxMetricsHistory) {
      this.syncMetrics = this.syncMetrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Clear metrics history (for testing)
   */
  clearMetrics(): void {
    this.syncMetrics = [];
    this.lastSyncTime = undefined;
    this.lastSyncStatus = undefined;
    this.lastError = undefined;
  }
}
