import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

export interface HealthStatus {
  status: 'up' | 'down' | 'degraded';
  connected: boolean;
  message: string;
  metrics: CacheMetrics;
  lastError?: string;
  lastErrorTime?: Date;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;
  private lastError: string | null = null;
  private lastErrorTime: Date | null = null;

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
    // Attempt connection (default to localhost:6379)
    // Using lazyConnect: true so it doesn't crash app on startup if Redis is missing
    this.client = new Redis({
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
    });

    this.client.on('error', (err) => {
      this.lastError = err.message;
      this.lastErrorTime = new Date();
      this.metrics.errors++;

      if (!this.isConnected) {
        // If never connected, log once
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
      this.logger.log('Redis reconnected successfully');
    });

    try {
      await this.client.connect();
      this.isConnected = true;
      this.logger.log('Redis connected successfully 🚀');
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
        message = 'Redis is healthy';
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
      metrics: {
        ...this.metrics,
        hitRate: Math.round(hitRate * 100) / 100,
      },
      lastError: this.lastError || undefined,
      lastErrorTime: this.lastErrorTime || undefined,
    };
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
