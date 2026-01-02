import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import { LoggerService } from '../../common/logger.service';
import { CircuitBreaker, CircuitState } from './circuit-breaker';
import { PrismaService } from '../../prisma.service';

export interface ConexxusConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  circuitBreaker?: {
    failureThreshold?: number;
    successThreshold?: number;
    timeout?: number;
  };
}

export interface ConexxusItem {
  sku: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
}

export interface ConexxusSalesData {
  date: string;
  locationId: string;
  transactions: Array<{
    id: string;
    timestamp: string;
    total: number;
    items: Array<{
      sku: string;
      quantity: number;
      price: number;
    }>;
  }>;
  summary?: {
    totalOrders: number;
    totalRevenue: number;
    totalTax: number;
    totalDiscount: number;
    averageOrderValue: number;
    itemsSold: number;
  };
}

export interface ConexxusResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * HTTP client for Conexxus REST API integration
 * Replaces file-based integration with robust HTTP communication
 *
 * Features:
 * - Circuit breaker pattern to prevent cascading failures
 * - Automatic retries with exponential backoff
 * - Event logging for sync failures
 * - Connection pool limits
 * - Comprehensive error handling
 */
@Injectable()
export class ConexxusHttpClient {
  private readonly logger = new LoggerService('ConexxusHttpClient');
  private readonly client: AxiosInstance;
  private readonly config: ConexxusConfig;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly prisma?: PrismaService;

  constructor(config?: Partial<ConexxusConfig>, prisma?: PrismaService) {
    // Validate environment variables
    this.validateEnvironment();

    this.config = {
      baseURL: process.env.CONEXXUS_API_URL || '',
      apiKey: process.env.CONEXXUS_API_KEY,
      timeout: parseInt(process.env.CONEXXUS_TIMEOUT || '30000', 10),
      retries: parseInt(process.env.CONEXXUS_RETRIES || '3', 10),
      retryDelay: parseInt(process.env.CONEXXUS_RETRY_DELAY || '1000', 10),
      circuitBreaker: {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000, // 1 minute
      },
      ...config,
    };

    this.prisma = prisma;

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      'ConexxusAPI',
      this.config.circuitBreaker,
    );

    this.logger.log('Conexxus HTTP client initialized', {
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      retries: this.config.retries,
      circuitBreaker: this.config.circuitBreaker,
    });

    // Create axios instance with connection limits
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRedirects: 5,
      maxContentLength: 50 * 1024 * 1024, // 50MB
      maxBodyLength: 50 * 1024 * 1024, // 50MB
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'POS-Omni/1.0',
        ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
      },
      // Connection pool limits
      httpAgent: undefined, // Let axios use defaults
      httpsAgent: undefined,
    });

    // Configure retry logic
    axiosRetry(this.client, {
      retries: this.config.retries,
      retryDelay: (retryCount) => {
        const delay = this.config.retryDelay! * Math.pow(2, retryCount - 1);
        this.logger.warn(`Retry attempt ${retryCount} after ${delay}ms`);
        return delay;
      },
      retryCondition: (error: AxiosError) => {
        // Retry on network errors or 5xx server errors
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response?.status !== undefined && error.response.status >= 500)
        );
      },
      onRetry: (retryCount, error, requestConfig) => {
        this.logger.warn(
          `Retrying request to ${requestConfig.url} (attempt ${retryCount}/${this.config.retries})`,
          {
            error: error.message,
            status: error.response?.status,
          },
        );
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(
          `HTTP Request: ${config.method?.toUpperCase()} ${config.url}`,
          {
            headers: config.headers,
          },
        );
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', error.stack);
        return Promise.reject(error);
      },
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(
          `HTTP Response: ${response.status} ${response.config.url}`,
          {
            status: response.status,
            data: response.data,
          },
        );
        return response;
      },
      (error: AxiosError) => {
        this.logError(error);
        return Promise.reject(this.transformError(error));
      },
    );
  }

  /**
   * Validate environment variables at startup
   */
  private validateEnvironment(): void {
    const errors: string[] = [];

    // Check CONEXXUS_API_URL
    if (!process.env.CONEXXUS_API_URL) {
      errors.push('CONEXXUS_API_URL is not configured');
    } else if (process.env.CONEXXUS_API_URL.includes('example.com')) {
      errors.push(
        'CONEXXUS_API_URL points to example domain. Please configure a real API URL.',
      );
    } else if (
      !process.env.CONEXXUS_API_URL.startsWith('http://') &&
      !process.env.CONEXXUS_API_URL.startsWith('https://')
    ) {
      errors.push('CONEXXUS_API_URL must start with http:// or https://');
    }

    // Check CONEXXUS_API_KEY
    if (!process.env.CONEXXUS_API_KEY) {
      errors.push('CONEXXUS_API_KEY is not configured');
    } else if (process.env.CONEXXUS_API_KEY.length < 10) {
      errors.push('CONEXXUS_API_KEY appears to be invalid (too short)');
    }

    if (errors.length > 0) {
      const errorMessage = `Conexxus configuration errors:\n${errors.map((e) => `  - ${e}`).join('\n')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.log('Conexxus environment validation passed');
  }

  /**
   * Fetch inventory items from Conexxus API with circuit breaker protection
   */
  async fetchInventoryItems(): Promise<ConexxusItem[]> {
    return this.circuitBreaker.execute(async () => {
      try {
        this.logger.log('Fetching inventory items from Conexxus API');

        const response = await this.client.get<
          ConexxusResponse<ConexxusItem[]>
        >('/api/v1/inventory/items');

        if (!response.data.success) {
          throw new Error(
            response.data.error || 'Failed to fetch inventory items',
          );
        }

        const items = response.data.data || [];
        this.logger.log(`Successfully fetched ${items.length} inventory items`);

        return items;
      } catch (error) {
        await this.logSyncFailure('fetch_inventory', error);
        this.logger.error(
          'Failed to fetch inventory items',
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
    });
  }

  /**
   * Push sales data to Conexxus API with circuit breaker protection
   */
  async pushSalesData(salesData: ConexxusSalesData): Promise<void> {
    return this.circuitBreaker.execute(async () => {
      try {
        this.logger.log(`Pushing sales data for ${salesData.date}`, {
          locationId: salesData.locationId,
          transactionCount: salesData.transactions.length,
        });

        const response = await this.client.post<ConexxusResponse<void>>(
          '/api/v1/sales/push',
          salesData,
        );

        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to push sales data');
        }

        this.logger.log('Successfully pushed sales data to Conexxus');
      } catch (error) {
        await this.logSyncFailure('push_sales', error, salesData);
        this.logger.error(
          'Failed to push sales data',
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
    });
  }

  /**
   * Health check for Conexxus API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get<
        ConexxusResponse<{ status: string }>
      >('/api/v1/health', {
        timeout: 5000, // Short timeout for health checks
        'axios-retry': {
          retries: 1, // Only retry once for health checks
        },
      } as AxiosRequestConfig);

      const isHealthy =
        response.data.success && response.data.data?.status === 'ok';

      if (isHealthy) {
        this.logger.debug('Conexxus API health check passed');
      } else {
        this.logger.warn('Conexxus API health check failed', {
          response: response.data,
        });
      }

      return isHealthy;
    } catch (error) {
      this.logger.error(
        'Conexxus API health check error',
        error instanceof Error ? error.message : undefined,
      );
      return false;
    }
  }

  /**
   * Test connection to Conexxus API
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    latency?: number;
  }> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.healthCheck();
      const latency = Date.now() - startTime;

      if (isHealthy) {
        return {
          success: true,
          message: 'Connection successful',
          latency,
        };
      } else {
        return {
          success: false,
          message: 'API returned unhealthy status',
          latency,
        };
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        message: `Connection failed: ${errorMessage}`,
        latency,
      };
    }
  }

  /**
   * Log axios errors with detailed information
   */
  private logError(error: AxiosError): void {
    if (error.response) {
      // Server responded with error status
      this.logger.error('HTTP Error Response', undefined, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method,
      });
    } else if (error.request) {
      // Request made but no response received
      this.logger.error('HTTP No Response', undefined, {
        url: error.config?.url,
        method: error.config?.method,
        message: error.message,
      });
    } else {
      // Error in request setup
      this.logger.error('HTTP Request Setup Error', undefined, {
        message: error.message,
      });
    }
  }

  /**
   * Transform axios error to a more user-friendly format
   */
  private transformError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      if (status === 401) {
        return new Error('Conexxus API authentication failed. Check API key.');
      } else if (status === 403) {
        return new Error('Conexxus API access forbidden. Check permissions.');
      } else if (status === 404) {
        return new Error(
          `Conexxus API endpoint not found: ${error.config?.url}`,
        );
      } else if (status === 429) {
        return new Error('Conexxus API rate limit exceeded. Try again later.');
      } else if (status >= 500) {
        return new Error(
          `Conexxus API server error (${status}). Try again later.`,
        );
      } else {
        const errorMessage = data?.error || data?.message || error.message;
        return new Error(`Conexxus API error (${status}): ${errorMessage}`);
      }
    } else if (error.request) {
      if (error.code === 'ECONNABORTED') {
        return new Error(
          `Conexxus API request timeout after ${this.config.timeout}ms`,
        );
      } else if (error.code === 'ECONNREFUSED') {
        return new Error('Conexxus API connection refused. Check API URL.');
      } else if (error.code === 'ENOTFOUND') {
        return new Error('Conexxus API host not found. Check API URL.');
      } else {
        return new Error(`Conexxus API network error: ${error.message}`);
      }
    } else {
      return new Error(`Conexxus API request error: ${error.message}`);
    }
  }

  /**
   * Log sync failure to EventLog table for audit trail
   */
  private async logSyncFailure(
    operation: string,
    error: any,
    data?: any,
  ): Promise<void> {
    if (!this.prisma) {
      return; // Prisma not available, skip logging
    }

    try {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      await this.prisma.eventLog.create({
        data: {
          eventType: `conexxus.sync.failed.${operation}`,
          aggregateId: `conexxus-${Date.now()}`,
          payload: JSON.stringify({
            operation,
            error: errorMessage,
            stack: errorStack,
            data: data ? JSON.stringify(data).substring(0, 1000) : undefined,
            circuitBreakerState: this.circuitBreaker.getState(),
            timestamp: new Date().toISOString(),
          }),
          metadata: JSON.stringify({
            baseURL: this.config.baseURL,
            timeout: this.config.timeout,
            retries: this.config.retries,
          }),
          processed: false,
        },
      });

      this.logger.log(`Logged sync failure to EventLog: ${operation}`);
    } catch (logError) {
      this.logger.error(
        'Failed to log sync failure to EventLog',
        logError instanceof Error ? logError.stack : undefined,
      );
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Get current configuration (for debugging)
   */
  getConfig(): Readonly<ConexxusConfig> {
    return { ...this.config };
  }
}
