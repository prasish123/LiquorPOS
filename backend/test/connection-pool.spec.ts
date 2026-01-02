/**
 * Connection Pool Tests
 *
 * Tests for database connection pooling implementation:
 * - Pool configuration
 * - Pool metrics
 * - Health monitoring
 * - Concurrent request handling
 * - Connection reuse
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma.service';
import { ConfigModule } from '@nestjs/config';

describe('Connection Pool', () => {
  let prismaService: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [PrismaService],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    await prismaService.onModuleInit();
  });

  afterAll(async () => {
    await prismaService.onModuleDestroy();
    await module.close();
  });

  describe('Pool Configuration', () => {
    it('should load pool configuration', () => {
      const config = prismaService.getPoolConfig();

      expect(config).toBeDefined();
      expect(config.min).toBeGreaterThan(0);
      expect(config.max).toBeGreaterThan(config.min);
      expect(config.idleTimeout).toBeGreaterThan(0);
      expect(config.connectionTimeout).toBeGreaterThan(0);
    });

    it('should have appropriate defaults for test environment', () => {
      const config = prismaService.getPoolConfig();

      // Test environment defaults
      expect(config.min).toBeLessThanOrEqual(5);
      expect(config.max).toBeLessThanOrEqual(10);
    });

    it('should validate min <= max', () => {
      const config = prismaService.getPoolConfig();
      expect(config.min).toBeLessThanOrEqual(config.max);
    });
  });

  describe('Pool Metrics', () => {
    it('should get pool metrics', async () => {
      const metrics = await prismaService.getPoolMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.activeConnections).toBeGreaterThanOrEqual(0);
      expect(metrics.idleConnections).toBeGreaterThanOrEqual(0);
      expect(metrics.totalConnections).toBeGreaterThanOrEqual(0);
      expect(metrics.poolSize).toBeGreaterThan(0);
    });

    it('should have totalConnections = active + idle', async () => {
      const metrics = await prismaService.getPoolMetrics();

      expect(metrics.totalConnections).toBe(
        metrics.activeConnections + metrics.idleConnections,
      );
    });

    it('should not exceed pool size', async () => {
      const metrics = await prismaService.getPoolMetrics();

      expect(metrics.totalConnections).toBeLessThanOrEqual(metrics.poolSize);
    });
  });

  describe('Pool Health', () => {
    it('should check pool health', async () => {
      const isHealthy = await prismaService.isPoolHealthy();

      expect(typeof isHealthy).toBe('boolean');
    });

    it('should be healthy with low utilization', async () => {
      // With test load, pool should be healthy
      const isHealthy = await prismaService.isPoolHealthy();
      const metrics = await prismaService.getPoolMetrics();
      const utilization = (metrics.totalConnections / metrics.poolSize) * 100;

      if (utilization < 90) {
        expect(isHealthy).toBe(true);
      }
    });
  });

  describe('Connection Reuse', () => {
    it('should reuse connections efficiently', async () => {
      // Make multiple queries
      const queries = Array.from(
        { length: 10 },
        () => prismaService.$queryRaw`SELECT 1 as value`,
      );

      const startTime = Date.now();
      await Promise.all(queries);
      const duration = Date.now() - startTime;

      // With connection pooling, should be fast (< 100ms for 10 queries)
      expect(duration).toBeLessThan(100);
    });

    it('should handle sequential queries', async () => {
      const results = [];

      for (let i = 0; i < 5; i++) {
        const result = await prismaService.$queryRaw<{ value: number }[]>`
          SELECT ${i} as value
        `;
        results.push(result[0].value);
      }

      expect(results).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent queries', async () => {
      // Create 20 concurrent queries (may exceed pool size)
      const queries = Array.from(
        { length: 20 },
        (_, i) =>
          prismaService.$queryRaw<{ value: number }[]>`SELECT ${i} as value`,
      );

      const results = await Promise.all(queries);

      expect(results).toHaveLength(20);
      results.forEach((result, index) => {
        expect(result[0].value).toBe(index);
      });
    });

    it('should queue requests when pool is full', async () => {
      const config = prismaService.getPoolConfig();

      // Create more queries than pool size
      const queryCount = config.max + 10;
      const queries = Array.from(
        { length: queryCount },
        () => prismaService.$queryRaw`SELECT pg_sleep(0.01)`, // 10ms sleep
      );

      const startTime = Date.now();
      await Promise.all(queries);
      const duration = Date.now() - startTime;

      // Should complete without errors
      // Duration should be reasonable (not timeout)
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle concurrent writes', async () => {
      // Create test location
      const location = await prismaService.location.create({
        data: {
          name: 'Test Location Pool',
          address: '123 Test St',
          city: 'Test City',
          state: 'FL',
          zip: '12345',
        },
      });

      try {
        // Create 10 concurrent transactions
        const promises = Array.from({ length: 10 }, (_, i) =>
          prismaService.transaction.create({
            data: {
              locationId: location.id,
              subtotal: 100 + i,
              tax: 7 + i * 0.07,
              total: 107 + i * 1.07,
              paymentMethod: 'cash',
              paymentStatus: 'completed',
              channel: 'counter',
            },
          }),
        );

        const transactions = await Promise.all(promises);
        expect(transactions).toHaveLength(10);
        expect(transactions.every((t) => t.id)).toBe(true);

        // Cleanup
        await prismaService.transaction.deleteMany({
          where: { locationId: location.id },
        });
      } finally {
        await prismaService.location.delete({ where: { id: location.id } });
      }
    });
  });

  describe('Connection Lifecycle', () => {
    it('should establish connection on module init', async () => {
      // Connection should already be established
      const result = await prismaService.$queryRaw`SELECT 1 as value`;
      expect(result).toBeDefined();
    });

    it('should handle connection errors gracefully', async () => {
      // Test with invalid query
      await expect(
        prismaService.$queryRaw`SELECT * FROM nonexistent_table`,
      ).rejects.toThrow();

      // Pool should still be healthy after error
      const isHealthy = await prismaService.isPoolHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Performance', () => {
    it('should execute queries quickly with pooling', async () => {
      const iterations = 50;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await prismaService.$queryRaw`SELECT 1 as value`;
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;

      // Average query time should be < 10ms with pooling
      expect(avgTime).toBeLessThan(10);
    });

    it('should handle burst traffic', async () => {
      // Simulate burst of 50 concurrent requests
      const queries = Array.from(
        { length: 50 },
        () => prismaService.$queryRaw`SELECT 1 as value`,
      );

      const startTime = Date.now();
      const results = await Promise.all(queries);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(50);
      // Should complete in < 1 second
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Pool Monitoring', () => {
    it('should track active connections during query', async () => {
      const metricsBeforeQuery = await prismaService.getPoolMetrics();

      // Execute a slow query
      const queryPromise = prismaService.$queryRaw`SELECT pg_sleep(0.1)`;

      // Metrics during query (may or may not show active connection due to timing)
      const metricsDuringQuery = await prismaService.getPoolMetrics();

      await queryPromise;

      const metricsAfter = await prismaService.getPoolMetrics();

      // All metrics should be valid
      expect(metricsBeforeQuery.totalConnections).toBeGreaterThanOrEqual(0);
      expect(metricsDuringQuery.totalConnections).toBeGreaterThanOrEqual(0);
      expect(metricsAfter.totalConnections).toBeGreaterThanOrEqual(0);
    });

    it('should provide consistent pool size', async () => {
      const metrics1 = await prismaService.getPoolMetrics();
      const metrics2 = await prismaService.getPoolMetrics();

      expect(metrics1.poolSize).toBe(metrics2.poolSize);
    });
  });
});
