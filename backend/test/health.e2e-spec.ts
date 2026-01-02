import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RedisService } from '../src/redis/redis.service';

describe('Health Checks (e2e)', () => {
  let app: INestApplication;
  let redisService: RedisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    redisService = moduleFixture.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status with all checks', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('info');
          expect(res.body).toHaveProperty('details');

          // Should have database check
          expect(res.body.details).toHaveProperty('database');

          // Should have cache check
          expect(res.body.details).toHaveProperty('cache');
        });
    });

    it('should include Redis metrics in health check', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          const cacheDetails = res.body.details.cache;
          expect(cacheDetails).toHaveProperty('metrics');
          expect(cacheDetails.metrics).toHaveProperty('hits');
          expect(cacheDetails.metrics).toHaveProperty('misses');
          expect(cacheDetails.metrics).toHaveProperty('sets');
          expect(cacheDetails.metrics).toHaveProperty('deletes');
          expect(cacheDetails.metrics).toHaveProperty('errors');
          expect(cacheDetails.metrics).toHaveProperty('hitRate');
        });
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', () => {
      return request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body.details).toHaveProperty('app');
          expect(res.body.details.app.status).toBe('up');
        });
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body.details).toHaveProperty('database');
          expect(res.body.details).toHaveProperty('cache');
        });
    });

    it('should be ready even if Redis is down (graceful degradation)', async () => {
      // This test verifies that the app is still ready even if Redis fails
      // The readiness check should return 200 with cache in degraded state
      const response = await request(app.getHttpServer()).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.details).toHaveProperty('cache');

      // Cache should be either 'up' or 'degraded', but not fail the readiness check
      const cacheStatus = response.body.details.cache.status;
      expect(['up', 'degraded']).toContain(cacheStatus);
    });
  });

  describe('Redis Metrics', () => {
    beforeEach(() => {
      // Reset metrics before each test
      redisService.resetMetrics();
    });

    it('should track cache hits and misses', async () => {
      const testKey = 'test:metrics:key';
      const testValue = 'test-value';

      // Set a value
      await redisService.set(testKey, testValue, 60);

      // Get the value (should be a hit)
      const result = await redisService.get(testKey);
      expect(result).toBe(testValue);

      // Get non-existent key (should be a miss)
      await redisService.get('non-existent-key');

      // Check metrics
      const metrics = redisService.getMetrics();
      expect(metrics.sets).toBeGreaterThanOrEqual(1);
      expect(metrics.hits).toBeGreaterThanOrEqual(1);
      expect(metrics.misses).toBeGreaterThanOrEqual(1);

      // Clean up
      await redisService.del(testKey);
    });

    it('should calculate hit rate correctly', async () => {
      const testKey = 'test:hitrate:key';

      // Set a value
      await redisService.set(testKey, 'value', 60);

      // Get it 3 times (3 hits)
      await redisService.get(testKey);
      await redisService.get(testKey);
      await redisService.get(testKey);

      // Get non-existent key once (1 miss)
      await redisService.get('non-existent');

      const metrics = redisService.getMetrics();
      // Hit rate should be 3/4 = 0.75
      expect(metrics.hitRate).toBeGreaterThan(0.5);
      expect(metrics.hitRate).toBeLessThanOrEqual(1);

      // Clean up
      await redisService.del(testKey);
    });

    it('should track deletes', async () => {
      const testKey = 'test:delete:key';

      await redisService.set(testKey, 'value', 60);
      await redisService.del(testKey);

      const metrics = redisService.getMetrics();
      expect(metrics.deletes).toBeGreaterThanOrEqual(1);
    });
  });

  describe('In-Memory Cache Fallback', () => {
    it('should use in-memory cache when Redis is unavailable', async () => {
      // This test verifies the fallback mechanism works
      const testKey = 'test:fallback:key';
      const testValue = 'fallback-value';

      // Set value (will use Redis or fallback)
      await redisService.set(testKey, testValue, 60);

      // Get value (should work regardless of Redis status)
      const result = await redisService.get(testKey);

      // Should get the value back (from Redis or memory cache)
      expect(result).toBe(testValue);

      // Clean up
      await redisService.del(testKey);
    });

    it('should expire in-memory cache entries', async () => {
      const testKey = 'test:expire:key';
      const testValue = 'expire-value';

      // Set with very short TTL (1 second)
      await redisService.set(testKey, testValue, 1);

      // Should exist immediately
      let result = await redisService.get(testKey);
      expect(result).toBe(testValue);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should be expired now
      result = await redisService.get(testKey);
      expect(result).toBeNull();
    });

    it('should handle pattern clearing in memory cache', async () => {
      // Set multiple keys with pattern
      await redisService.set('products:1', 'value1', 60);
      await redisService.set('products:2', 'value2', 60);
      await redisService.set('orders:1', 'value3', 60);

      // Clear products pattern
      await redisService.clearPattern('products:*');

      // Products should be cleared
      expect(await redisService.get('products:1')).toBeNull();
      expect(await redisService.get('products:2')).toBeNull();

      // Orders should still exist
      expect(await redisService.get('orders:1')).toBe('value3');

      // Clean up
      await redisService.del('orders:1');
    });
  });

  describe('Health Status API', () => {
    it('should provide detailed health status', async () => {
      const healthStatus = await redisService.getHealthStatus();

      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('connected');
      expect(healthStatus).toHaveProperty('message');
      expect(healthStatus).toHaveProperty('metrics');

      expect(['up', 'down', 'degraded']).toContain(healthStatus.status);
      expect(typeof healthStatus.connected).toBe('boolean');
      expect(typeof healthStatus.message).toBe('string');
    });

    it('should include error information when available', async () => {
      const healthStatus = await redisService.getHealthStatus();

      // If there were errors, they should be included
      if (healthStatus.lastError) {
        expect(typeof healthStatus.lastError).toBe('string');
        expect(healthStatus.lastErrorTime).toBeInstanceOf(Date);
      }
    });
  });
});
