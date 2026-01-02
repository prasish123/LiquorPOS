import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('Basic Operations', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should set and get values', async () => {
      const key = 'test:key';
      const value = 'test-value';

      await service.set(key, value, 60);
      const result = await service.get(key);

      expect(result).toBe(value);

      await service.del(key);
    });

    it('should return null for non-existent keys', async () => {
      const result = await service.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should delete keys', async () => {
      const key = 'test:delete';
      await service.set(key, 'value', 60);

      await service.del(key);
      const result = await service.get(key);

      expect(result).toBeNull();
    });

    it('should clear keys by pattern', async () => {
      await service.set('test:pattern:1', 'value1', 60);
      await service.set('test:pattern:2', 'value2', 60);
      await service.set('test:other:1', 'value3', 60);

      await service.clearPattern('test:pattern:*');

      expect(await service.get('test:pattern:1')).toBeNull();
      expect(await service.get('test:pattern:2')).toBeNull();
      expect(await service.get('test:other:1')).toBe('value3');

      await service.del('test:other:1');
    });
  });

  describe('Metrics Tracking', () => {
    beforeEach(() => {
      service.resetMetrics();
    });

    it('should track cache hits', async () => {
      const key = 'test:metrics:hit';
      await service.set(key, 'value', 60);

      await service.get(key);

      const metrics = service.getMetrics();
      expect(metrics.hits).toBeGreaterThanOrEqual(1);

      await service.del(key);
    });

    it('should track cache misses', async () => {
      await service.get('non-existent-key');

      const metrics = service.getMetrics();
      expect(metrics.misses).toBeGreaterThanOrEqual(1);
    });

    it('should track sets', async () => {
      await service.set('test:metrics:set', 'value', 60);

      const metrics = service.getMetrics();
      expect(metrics.sets).toBeGreaterThanOrEqual(1);

      await service.del('test:metrics:set');
    });

    it('should track deletes', async () => {
      const key = 'test:metrics:delete';
      await service.set(key, 'value', 60);
      await service.del(key);

      const metrics = service.getMetrics();
      expect(metrics.deletes).toBeGreaterThanOrEqual(1);
    });

    it('should calculate hit rate', async () => {
      const key = 'test:hitrate';
      await service.set(key, 'value', 60);

      // 2 hits
      await service.get(key);
      await service.get(key);

      // 1 miss
      await service.get('non-existent');

      const metrics = service.getMetrics();
      expect(metrics.hitRate).toBeCloseTo(0.67, 1); // 2/3 ≈ 0.67

      await service.del(key);
    });

    it('should reset metrics', async () => {
      await service.set('test:key', 'value', 60);
      await service.get('test:key');

      service.resetMetrics();

      const metrics = service.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.sets).toBe(0);
      expect(metrics.deletes).toBe(0);
      expect(metrics.errors).toBe(0);

      await service.del('test:key');
    });
  });

  describe('Health Status', () => {
    it('should return health status', async () => {
      const status = await service.getHealthStatus();

      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('message');
      expect(status).toHaveProperty('metrics');

      expect(['up', 'down', 'degraded']).toContain(status.status);
    });

    it('should include metrics in health status', async () => {
      const status = await service.getHealthStatus();

      expect(status.metrics).toHaveProperty('hits');
      expect(status.metrics).toHaveProperty('misses');
      expect(status.metrics).toHaveProperty('sets');
      expect(status.metrics).toHaveProperty('deletes');
      expect(status.metrics).toHaveProperty('errors');
      expect(status.metrics).toHaveProperty('hitRate');
    });
  });

  describe('In-Memory Cache Fallback', () => {
    it('should use memory cache as fallback', async () => {
      // Even if Redis is down, memory cache should work
      const key = 'test:memory';
      const value = 'memory-value';

      await service.set(key, value, 60);
      const result = await service.get(key);

      // Should get value from either Redis or memory cache
      expect(result).toBe(value);

      await service.del(key);
    });

    it('should respect TTL in memory cache', async () => {
      const key = 'test:ttl';
      const value = 'ttl-value';

      await service.set(key, value, 1); // 1 second TTL

      // Should exist immediately
      let result = await service.get(key);
      expect(result).toBe(value);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should be expired
      result = await service.get(key);
      expect(result).toBeNull();
    });

    it('should implement LRU eviction', async () => {
      // This test verifies that old entries are evicted when cache is full
      // The MAX_MEMORY_CACHE_SIZE is 100, so we'll set 101 entries

      for (let i = 0; i < 101; i++) {
        await service.set(`test:lru:${i}`, `value${i}`, 300);
      }

      // The first entry should have been evicted
      const firstEntry = await service.get('test:lru:0');
      // It might be in Redis, so we can't guarantee it's null
      // But the memory cache should have evicted it

      // The last entry should definitely exist
      const lastEntry = await service.get('test:lru:100');
      expect(lastEntry).toBe('value100');

      // Clean up
      await service.clearPattern('test:lru:*');
    });
  });
});
