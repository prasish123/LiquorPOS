import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LoggerService } from './common/logger.service';

export interface ConnectionPoolConfig {
  min: number;
  max: number;
  idleTimeout: number;
  connectionTimeout: number;
}

export interface ConnectionPoolMetrics {
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalConnections: number;
  poolSize: number;
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;
  private readonly logger = new LoggerService('PrismaService');
  private poolConfig: ConnectionPoolConfig;

  constructor() {
    // Get connection pool configuration from environment
    this.poolConfig = this.loadPoolConfig();

    // Build DATABASE_URL with connection pool parameters
    const databaseUrl = this.buildDatabaseUrl();

    // Initialize Prisma with PostgreSQL connection pooling
    // Note: In Prisma 7, connection URL is set via environment variable
    // and connection pooling is configured via URL parameters
    process.env.DATABASE_URL = databaseUrl;
    
    this.prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    // Log connection pool configuration
    this.logger.log(
      `Connection pool configured: min=${this.poolConfig.min}, max=${this.poolConfig.max}, ` +
        `idleTimeout=${this.poolConfig.idleTimeout}ms, connectionTimeout=${this.poolConfig.connectionTimeout}ms`,
    );

    // Log slow queries in development
    if (process.env.NODE_ENV !== 'production') {
      this.prisma.$on('query' as never, (e: any) => {
        if (e.duration > 1000) {
          this.logger.warn(`Slow query detected: ${e.duration}ms - ${e.query}`);
        }
      });
    }
  }

  private loadPoolConfig(): ConnectionPoolConfig {
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Default pool sizes based on environment
    const defaults = {
      development: {
        min: 2,
        max: 10,
        idleTimeout: 10000,
        connectionTimeout: 5000,
      },
      test: { min: 1, max: 5, idleTimeout: 5000, connectionTimeout: 3000 },
      production: {
        min: 5,
        max: 20,
        idleTimeout: 30000,
        connectionTimeout: 10000,
      },
    };

    const envDefaults =
      defaults[nodeEnv as keyof typeof defaults] || defaults.development;

    return {
      min: parseInt(
        process.env.DATABASE_POOL_MIN || String(envDefaults.min),
        10,
      ),
      max: parseInt(
        process.env.DATABASE_POOL_MAX || String(envDefaults.max),
        10,
      ),
      idleTimeout: parseInt(
        process.env.DATABASE_POOL_IDLE_TIMEOUT ||
          String(envDefaults.idleTimeout),
        10,
      ),
      connectionTimeout: parseInt(
        process.env.DATABASE_POOL_CONNECTION_TIMEOUT ||
          String(envDefaults.connectionTimeout),
        10,
      ),
    };
  }

  private buildDatabaseUrl(): string {
    const baseUrl = process.env.DATABASE_URL;

    if (!baseUrl) {
      throw new Error('DATABASE_URL is required');
    }

    // Parse existing URL
    const url = new URL(baseUrl);

    // Add connection pool parameters if not already present
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', String(this.poolConfig.max));
    }

    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set(
        'pool_timeout',
        String(Math.floor(this.poolConfig.connectionTimeout / 1000)),
      );
    }

    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set(
        'connect_timeout',
        String(Math.floor(this.poolConfig.connectionTimeout / 1000)),
      );
    }

    return url.toString();
  }

  getPoolConfig(): ConnectionPoolConfig {
    return { ...this.poolConfig };
  }

  async onModuleInit() {
    await this.prisma.$connect();
    this.logger.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    this.logger.log('👋 Database disconnected');
  }

  // Delegate all Prisma client properties
  get product() {
    return this.prisma.product;
  }

  get productImage() {
    return this.prisma.productImage;
  }

  get inventory() {
    return this.prisma.inventory;
  }

  get location() {
    return this.prisma.location;
  }

  get transaction() {
    return this.prisma.transaction;
  }

  get transactionItem() {
    return this.prisma.transactionItem;
  }

  get payment() {
    return this.prisma.payment;
  }

  get customer() {
    return this.prisma.customer;
  }

  get eventLog() {
    return this.prisma.eventLog;
  }

  get auditLog() {
    return this.prisma.auditLog;
  }

  get user() {
    return this.prisma.user;
  }

  // Expose $transaction for advanced operations
  get $transaction() {
    return this.prisma.$transaction.bind(this.prisma);
  }

  // Expose other Prisma client methods for health checks and utilities
  $connect() {
    return this.prisma.$connect();
  }

  $disconnect() {
    return this.prisma.$disconnect();
  }

  $executeRaw(...args: Parameters<PrismaClient['$executeRaw']>) {
    return this.prisma.$executeRaw(...args);
  }

  $queryRaw(...args: Parameters<PrismaClient['$queryRaw']>) {
    return this.prisma.$queryRaw(...args);
  }

  /**
   * Get connection pool metrics from PostgreSQL
   * Requires PostgreSQL connection
   */
  async getPoolMetrics(): Promise<ConnectionPoolMetrics> {
    try {
      // Query PostgreSQL for connection statistics
      const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;

      const totalConnections = Number(result[0]?.count || 0);

      // Query for active connections
      const activeResult = await this.prisma.$queryRaw<
        Array<{ count: bigint }>
      >`
        SELECT count(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND state = 'active'
      `;

      const activeConnections = Number(activeResult[0]?.count || 0);

      // Query for idle connections
      const idleResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND state = 'idle'
      `;

      const idleConnections = Number(idleResult[0]?.count || 0);

      return {
        activeConnections,
        idleConnections,
        waitingRequests: 0, // Not directly measurable in PostgreSQL
        totalConnections,
        poolSize: this.poolConfig.max,
      };
    } catch (error) {
      this.logger.error(`Failed to get pool metrics: ${error}`);
      return {
        activeConnections: 0,
        idleConnections: 0,
        waitingRequests: 0,
        totalConnections: 0,
        poolSize: this.poolConfig.max,
      };
    }
  }

  /**
   * Check if connection pool is healthy
   */
  async isPoolHealthy(): Promise<boolean> {
    try {
      const metrics = await this.getPoolMetrics();

      // Pool is unhealthy if we're at or near max connections
      const utilizationPercent =
        (metrics.totalConnections / metrics.poolSize) * 100;

      if (utilizationPercent >= 90) {
        this.logger.warn(
          `Connection pool utilization high: ${utilizationPercent.toFixed(1)}% ` +
            `(${metrics.totalConnections}/${metrics.poolSize})`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Pool health check failed: ${error}`);
      return false;
    }
  }
}
