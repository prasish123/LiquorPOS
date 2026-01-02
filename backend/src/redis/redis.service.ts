import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

export interface SentinelInfo {
  enabled: boolean;
  masterName?: string;
  sentinels?: Array<{ host: string; port: number }>;
  currentMaster?: { host: string; port: number };
  failoverCount: number;
  lastFailover?: Date;
}

export interface HealthStatus {
  status: 'up' | 'down' | 'degraded';
  connected: boolean;
  message: string;
  metrics: CacheMetrics;
  lastError?: string;
  lastErrorTime?: Date;
  sentinel?: SentinelInfo;
  mode: 'standalone' | 'sentinel';
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;
  private lastError: string | null = null;
  private lastErrorTime: Date | null = null;
  private mode: 'standalone' | 'sentinel' = 'standalone';

  // Sentinel tracking
  private sentinelInfo: SentinelInfo = {
    enabled: false,
    failoverCount: 0,
  };

  // Cache metrics
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  // Simple in-memory LRU cache as fallback
  private memoryCache = new Map<string, { value: string; expires: number }>();
  private readonly MAX_MEMORY_CACHE_SIZE = 100;
  private cleanupInterval?: NodeJS.Timeout;

  async onModuleInit() {
    // Determine if we should use Sentinel or standalone mode
    const useSentinel = this.shouldUseSentinel();

    if (useSentinel) {
      this.logger.log('Initializing Redis with Sentinel configuration...');
      this.initializeSentinel();
    } else {
      this.logger.log('Initializing Redis in standalone mode...');
      this.initializeStandalone();
    }

    // Setup event handlers
    this.setupEventHandlers();

    // Attempt connection
    try {
      await this.client.connect();
      this.isConnected = true;
      const modeStr = this.mode === 'sentinel' ? 'Sentinel' : 'standalone';
      this.logger.log(`Redis connected successfully in ${modeStr} mode 🚀`);

      if (this.mode === 'sentinel') {
        await this.updateSentinelInfo();
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      this.lastError = errorMessage;
      this.lastErrorTime = new Date();
      this.logger.error(
        `Redis connection failed (running in degraded mode with in-memory cache): ${errorMessage}`,
      );
      this.isConnected = false;
    }

    // Start periodic cleanup of expired memory cache entries
    this.cleanupInterval = setInterval(() => this.cleanupMemoryCache(), 60000); // Every minute
  }

  /**
   * Determine if Sentinel should be used based on environment variables
   */
  private shouldUseSentinel(): boolean {
    return !!(
      process.env.REDIS_SENTINEL_ENABLED === 'true' &&
      process.env.REDIS_SENTINEL_MASTER_NAME &&
      process.env.REDIS_SENTINELS
    );
  }

  /**
   * Initialize Redis in standalone mode
   */
  private initializeStandalone(): void {
    this.mode = 'standalone';

    const config: RedisOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.warn(
            'Redis connection failed too many times, disabling caching for this session.',
          );
          return null; // Stop retrying
        }
        return Math.min(times * 100, 2000); // Backoff
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    };

    this.client = new Redis(config);
    this.logger.log('Redis client initialized in standalone mode', {
      host: config.host,
      port: config.port,
    });
  }

  /**
   * Initialize Redis with Sentinel configuration
   */
  private initializeSentinel(): void {
    this.mode = 'sentinel';
    this.sentinelInfo.enabled = true;

    // Parse sentinel nodes from environment variable
    // Format: "host1:port1,host2:port2,host3:port3"
    const sentinelsStr = process.env.REDIS_SENTINELS || '';
    const sentinels = sentinelsStr.split(',').map((s) => {
      const [host, port] = s.trim().split(':');
      return { host, port: parseInt(port, 10) };
    });

    if (sentinels.length < 3) {
      this.logger.warn(
        `Redis Sentinel requires minimum 3 nodes for high availability. ` +
          `Found ${sentinels.length} nodes. Falling back to standalone mode.`,
      );
      this.initializeStandalone();
      return;
    }

    const masterName = process.env.REDIS_SENTINEL_MASTER_NAME || 'mymaster';

    this.sentinelInfo.masterName = masterName;
    this.sentinelInfo.sentinels = sentinels;

    const config: RedisOptions = {
      sentinels,
      name: masterName,
      password: process.env.REDIS_PASSWORD || undefined,
      sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD || undefined,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 5) {
          this.logger.error(
            'Redis Sentinel connection failed too many times, disabling caching for this session.',
          );
          return null; // Stop retrying
        }
        return Math.min(times * 200, 3000); // Backoff
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      sentinelRetryStrategy: (times) => {
        if (times > 5) {
          return null;
        }
        return Math.min(times * 200, 3000);
      },
      // Sentinel-specific options
      sentinelMaxConnections: 10,
      enableOfflineQueue: true,
      connectTimeout: 10000, // 10 seconds
    };

    this.client = new Redis(config);

    this.logger.log('Redis client initialized with Sentinel', {
      masterName,
      sentinels: sentinels.map((s) => `${s.host}:${s.port}`).join(', '),
    });
  }

  /**
   * Setup event handlers for Redis client
   */
  private setupEventHandlers(): void {
    this.client.on('error', (err) => {
      this.lastError = err.message;
      this.lastErrorTime = new Date();
      this.metrics.errors++;

      if (!this.isConnected) {
        this.logger.error(
          `Redis connection failed: ${err.message}. Running in degraded mode with in-memory cache fallback.`,
        );
      } else {
        this.logger.error(
          `Redis connection error: ${err.message}. Falling back to in-memory cache.`,
        );
      }
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      const modeStr = this.mode === 'sentinel' ? 'Sentinel' : 'standalone';
      this.logger.log(`Redis connected successfully (${modeStr} mode)`);
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client is ready to accept commands');
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', (delay: number) => {
      this.logger.log(`Redis reconnecting in ${delay}ms...`);
    });

    // Sentinel-specific events
    if (this.mode === 'sentinel') {
      this.client.on(
        '+switch-master',
        (
          masterName: string,
          oldHost: string,
          oldPort: string,
          newHost: string,
          newPort: string,
        ) => {
          this.sentinelInfo.failoverCount++;
          this.sentinelInfo.lastFailover = new Date();
          this.sentinelInfo.currentMaster = {
            host: newHost,
            port: parseInt(newPort, 10),
          };

          this.logger.warn(
            `🔄 Redis Sentinel failover detected! ` +
              `Master switched from ${oldHost}:${oldPort} to ${newHost}:${newPort}`,
            {
              masterName,
              oldMaster: `${oldHost}:${oldPort}`,
              newMaster: `${newHost}:${newPort}`,
              failoverCount: this.sentinelInfo.failoverCount,
            },
          );
        },
      );

      this.client.on('+sentinel', (sentinel: any) => {
        this.logger.log('New Sentinel discovered', { sentinel });
      });

      this.client.on('-sentinel', (sentinel: any) => {
        this.logger.warn('Sentinel removed', { sentinel });
      });
    }
  }

  /**
   * Update Sentinel information from Redis
   */
  private async updateSentinelInfo(): Promise<void> {
    if (this.mode !== 'sentinel' || !this.isConnected) {
      return;
    }

    try {
      // Get current master info using call method

      const info = await (this.client as any).sentinel(
        'master',
        this.sentinelInfo.masterName!,
      );
      if (info && Array.isArray(info)) {
        const host = info[3] as string; // ip field
        const port = parseInt(info[5] as string, 10); // port field
        this.sentinelInfo.currentMaster = { host, port };
      }
    } catch (error) {
      this.logger.warn('Failed to update Sentinel info', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async onModuleDestroy() {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Disconnect Redis client
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Get value from cache (with fallback to in-memory cache)
   */
  async get(key: string): Promise<string | null> {
    // Try Redis first if connected
    if (this.isConnected) {
      try {
        const value = await this.client.get(key);
        if (value !== null) {
          this.metrics.hits++;
          return value;
        }
        this.metrics.misses++;
        return null;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Redis get failed: ${errorMessage}`);
        this.metrics.errors++;
        this.lastError = errorMessage;
        this.lastErrorTime = new Date();
        // Fall through to memory cache
      }
    }

    // Fallback to in-memory cache
    const cached = this.memoryCache.get(key);
    if (cached) {
      if (cached.expires > Date.now()) {
        this.metrics.hits++;
        return cached.value;
      } else {
        // Expired
        this.memoryCache.delete(key);
      }
    }

    this.metrics.misses++;
    return null;
  }

  /**
   * Set value in cache with TTL (with fallback to in-memory cache)
   */
  async set(
    key: string,
    value: string,
    ttlSeconds: number = 3600,
  ): Promise<void> {
    this.metrics.sets++;

    // Try Redis first if connected
    if (this.isConnected) {
      try {
        await this.client.set(key, value, 'EX', ttlSeconds);
        // Also update memory cache for faster access
        this.setMemoryCache(key, value, ttlSeconds);
        return;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        this.logger.warn(`Redis set failed: ${errorMessage}`);
        this.metrics.errors++;
        this.lastError = errorMessage;
        this.lastErrorTime = new Date();
        // Fall through to memory cache
      }
    }

    // Fallback to in-memory cache only
    this.setMemoryCache(key, value, ttlSeconds);
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    this.metrics.deletes++;

    // Delete from memory cache
    this.memoryCache.delete(key);

    // Try Redis if connected
    if (this.isConnected) {
      try {
        await this.client.del(key);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        this.logger.warn(`Redis del failed: ${errorMessage}`);
        this.metrics.errors++;
        this.lastError = errorMessage;
        this.lastErrorTime = new Date();
      }
    }
  }

  /**
   * Delete keys by pattern (e.g. products:*)
   * Warning: performance intensive on large datasets, use carefully
   */
  async clearPattern(pattern: string): Promise<void> {
    // Clear matching keys from memory cache
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    );
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        this.metrics.deletes++;
      }
    }

    // Try Redis if connected
    if (this.isConnected) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        this.logger.warn(`Redis clear pattern failed: ${errorMessage}`);
        this.metrics.errors++;
        this.lastError = errorMessage;
        this.lastErrorTime = new Date();
      }
    }
  }

  /**
   * Get health status of Redis connection
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0;

    let status: 'up' | 'down' | 'degraded' = 'down';
    let message = 'Redis is disconnected';

    if (this.isConnected) {
      // Try a ping to verify connection is actually working
      try {
        await this.client.ping();
        status = 'up';
        const modeStr = this.mode === 'sentinel' ? 'Sentinel' : 'standalone';
        message = `Redis is healthy (${modeStr} mode)`;

        // Update Sentinel info if in Sentinel mode
        if (this.mode === 'sentinel') {
          await this.updateSentinelInfo();
        }
      } catch (error) {
        status = 'degraded';
        message = 'Redis connection unstable';
        this.isConnected = false;
      }
    } else {
      status = 'degraded';
      message = 'Running in degraded mode with in-memory cache fallback';
    }

    return {
      status,
      connected: this.isConnected,
      message,
      mode: this.mode,
      metrics: {
        ...this.metrics,
        hitRate: Math.round(hitRate * 100) / 100,
      },
      lastError: this.lastError || undefined,
      lastErrorTime: this.lastErrorTime || undefined,
      sentinel: this.mode === 'sentinel' ? { ...this.sentinelInfo } : undefined,
    };
  }

  /**
   * Get Sentinel information (if in Sentinel mode)
   */
  getSentinelInfo(): SentinelInfo | null {
    return this.mode === 'sentinel' ? { ...this.sentinelInfo } : null;
  }

  /**
   * Get current Redis mode
   */
  getMode(): 'standalone' | 'sentinel' {
    return this.mode;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  /**
   * Set value in memory cache with TTL
   */
  private setMemoryCache(key: string, value: string, ttlSeconds: number): void {
    // Implement simple LRU eviction
    if (this.memoryCache.size >= this.MAX_MEMORY_CACHE_SIZE) {
      // Remove oldest entry (first key)
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expires <= now) {
        this.memoryCache.delete(key);
      }
    }
  }
}
