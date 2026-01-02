import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

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
      // Suppress tough errors to keep console clean if not using Redis
      if (!this.isConnected) {
        // If never connected, just warn once
      } else {
        this.logger.warn(`Redis connection error: ${err.message}`);
      }
      this.isConnected = false;
    });

    try {
      await this.client.connect();
      this.isConnected = true;
      this.logger.log('Redis connected successfully 🚀');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      this.logger.warn(
        'Redis connection failed (running in memory-only mode): ' +
          errorMessage,
      );
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(
    key: string,
    value: string,
    ttlSeconds: number = 3600,
  ): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      this.logger.warn(`Cache set failed: ${errorMessage}`);
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.del(key);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      this.logger.warn(`Cache del failed: ${errorMessage}`);
    }
  }

  /**
   * Delete keys by pattern (e.g. products:*)
   * Warning: performance intensive on large datasets, use carefully
   */
  async clearPattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      this.logger.warn(`Cache clear pattern failed: ${errorMessage}`);
    }
  }
}
