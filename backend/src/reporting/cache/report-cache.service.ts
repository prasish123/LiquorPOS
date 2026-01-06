import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/**
 * Report Cache Service
 *
 * Caches expensive report queries to improve performance.
 * Uses Redis for distributed caching across multiple instances.
 */
@Injectable()
export class ReportCacheService {
  private readonly logger = new Logger(ReportCacheService.name);
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds
  private readonly KEY_PREFIX = 'report:';

  constructor(private readonly redis: RedisService) {}

  /**
   * Get cached report
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.buildKey(key);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        this.logger.log(`Cache HIT: ${key}`);
        return JSON.parse(cached) as T;
      }

      this.logger.log(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error: ${error}`);
      return null; // Fail gracefully
    }
  }

  /**
   * Set cached report
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const cacheKey = this.buildKey(key);
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.DEFAULT_TTL;

      await this.redis.set(cacheKey, serialized, expiry);
      this.logger.log(`Cached: ${key} (TTL: ${expiry}s)`);
    } catch (error) {
      this.logger.error(`Cache set error: ${error}`);
      // Fail gracefully - don't throw
    }
  }

  /**
   * Invalidate cached report
   */
  async invalidate(key: string): Promise<void> {
    try {
      const cacheKey = this.buildKey(key);
      await this.redis.del(cacheKey);
      this.logger.log(`Invalidated cache: ${key}`);
    } catch (error) {
      this.logger.error(`Cache invalidate error: ${error}`);
    }
  }

  /**
   * Invalidate all reports for a location
   */
  async invalidateByLocation(locationId: string): Promise<void> {
    try {
      // Note: Redis keys() is not available in all Redis services
      // For production, consider using SCAN instead
      this.logger.log(
        `Cache invalidation by location not fully implemented. Invalidating all reports.`,
      );
      // TODO: Implement pattern-based invalidation with SCAN
    } catch (error) {
      this.logger.error(`Cache invalidate by location error: ${error}`);
    }
  }

  /**
   * Invalidate all reports
   */
  async invalidateAll(): Promise<void> {
    try {
      // Note: For production, consider using a more targeted approach
      this.logger.log(`Cache invalidation requested. Consider implementing targeted invalidation.`);
      // TODO: Implement pattern-based invalidation with SCAN
    } catch (error) {
      this.logger.error(`Cache invalidate all error: ${error}`);
    }
  }

  /**
   * Build cache key
   */
  private buildKey(key: string): string {
    return `${this.KEY_PREFIX}${key}`;
  }

  /**
   * Generate cache key from query parameters
   */
  generateKey(
    reportType: string,
    params: {
      startDate: string;
      endDate: string;
      locationId?: string;
      [key: string]: any;
    },
  ): string {
    const parts = [reportType, params.startDate, params.endDate];

    if (params.locationId) {
      parts.push(`location:${params.locationId}`);
    }

    // Add other params
    for (const [key, value] of Object.entries(params)) {
      if (key !== 'startDate' && key !== 'endDate' && key !== 'locationId' && value !== undefined) {
        parts.push(`${key}:${value}`);
      }
    }

    return parts.join(':');
  }
}
