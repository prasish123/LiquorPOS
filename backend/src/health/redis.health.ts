import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const client = this.redisService.getClient();
      await client.ping();
      return this.getStatus(key, true, { mode: 'connected' });
    } catch (error) {
      // Allow degraded mode - app has in-memory fallback
      return this.getStatus(key, true, {
        mode: 'degraded',
        fallback: 'in-memory cache',
        warning: 'Redis unavailable, using fallback',
      });
    }
  }
}
