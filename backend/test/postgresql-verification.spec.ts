/**
 * PostgreSQL Migration Verification Tests
 *
 * These tests verify that the PostgreSQL migration is working correctly:
 * - Database connection
 * - Concurrent writes
 * - Connection pooling
 * - Transaction isolation
 * - Performance benchmarks
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma.service';
import { ConfigModule } from '@nestjs/config';

describe('PostgreSQL Migration Verification', () => {
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

  describe('Database Connection', () => {
    it('should connect to PostgreSQL', async () => {
      // Verify connection by running a simple query
      const result = await prismaService.$queryRaw`SELECT 1 as value`;
      expect(result).toEqual([{ value: 1 }]);
    });

    it('should use PostgreSQL (not SQLite)', async () => {
      // Check database type
      const result = await prismaService.$queryRaw`SELECT version()`;
      const version = (result as any)[0].version;
      expect(version).toContain('PostgreSQL');
      expect(version).not.toContain('SQLite');
    });

    it('should have correct connection URL', () => {
      const databaseUrl = process.env.DATABASE_URL;
      expect(databaseUrl).toBeDefined();
      expect(
        databaseUrl?.startsWith('postgresql://') ||
          databaseUrl?.startsWith('postgres://'),
      ).toBe(true);
    });
  });

  describe('Concurrent Writes', () => {
    it('should handle concurrent user creation', async () => {
      // Create 10 users concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        prismaService.user.create({
          data: {
            username: `concurrent_user_${i}_${Date.now()}`,
            password: 'hashed_password',
            firstName: 'Test',
            lastName: 'User',
            role: 'CASHIER',
          },
        }),
      );

      const users = await Promise.all(promises);
      expect(users).toHaveLength(10);
      expect(users.every((u) => u.id)).toBe(true);

      // Cleanup
      await prismaService.user.deleteMany({
        where: {
          username: {
            startsWith: 'concurrent_user_',
          },
        },
      });
    });

    it('should handle concurrent transaction creation', async () => {
      // Create test location
      const location = await prismaService.location.create({
        data: {
          name: 'Test Location',
          address: '123 Test St',
          city: 'Test City',
          state: 'FL',
          zip: '12345',
        },
      });

      // Create 20 transactions concurrently (simulating multiple cashiers)
      const promises = Array.from({ length: 20 }, (_, i) =>
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
      expect(transactions).toHaveLength(20);
      expect(transactions.every((t) => t.id)).toBe(true);

      // Cleanup
      await prismaService.transaction.deleteMany({
        where: { locationId: location.id },
      });
      await prismaService.location.delete({
        where: { id: location.id },
      });
    });

    it('should handle concurrent inventory updates', async () => {
      // Create test data
      const location = await prismaService.location.create({
        data: {
          name: 'Test Location',
          address: '123 Test St',
          city: 'Test City',
          state: 'FL',
          zip: '12345',
        },
      });

      const product = await prismaService.product.create({
        data: {
          sku: `TEST-SKU-${Date.now()}`,
          name: 'Test Product',
          category: 'wine',
          basePrice: 20.0,
          cost: 10.0,
        },
      });

      const inventory = await prismaService.inventory.create({
        data: {
          productId: product.id,
          locationId: location.id,
          quantity: 100,
        },
      });

      // Simulate 10 concurrent sales (inventory decrements)
      const promises = Array.from({ length: 10 }, () =>
        prismaService.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: {
              decrement: 1,
            },
          },
        }),
      );

      await Promise.all(promises);

      // Verify final quantity
      const updatedInventory = await prismaService.inventory.findUnique({
        where: { id: inventory.id },
      });
      expect(updatedInventory?.quantity).toBe(90);

      // Cleanup
      await prismaService.inventory.delete({ where: { id: inventory.id } });
      await prismaService.product.delete({ where: { id: product.id } });
      await prismaService.location.delete({ where: { id: location.id } });
    });
  });

  describe('Transaction Isolation', () => {
    it('should maintain ACID properties', async () => {
      const location = await prismaService.location.create({
        data: {
          name: 'Test Location',
          address: '123 Test St',
          city: 'Test City',
          state: 'FL',
          zip: '12345',
        },
      });

      // Test transaction rollback
      try {
        await prismaService.$transaction(async (tx) => {
          await tx.transaction.create({
            data: {
              locationId: location.id,
              subtotal: 100,
              tax: 7,
              total: 107,
              paymentMethod: 'cash',
              paymentStatus: 'completed',
              channel: 'counter',
            },
          });

          // Force error to trigger rollback
          throw new Error('Test rollback');
        });
      } catch (error) {
        // Expected error
      }

      // Verify transaction was rolled back
      const transactions = await prismaService.transaction.findMany({
        where: { locationId: location.id },
      });
      expect(transactions).toHaveLength(0);

      // Cleanup
      await prismaService.location.delete({ where: { id: location.id } });
    });

    it('should handle nested transactions', async () => {
      const location = await prismaService.location.create({
        data: {
          name: 'Test Location',
          address: '123 Test St',
          city: 'Test City',
          state: 'FL',
          zip: '12345',
        },
      });

      const product = await prismaService.product.create({
        data: {
          sku: `TEST-SKU-${Date.now()}`,
          name: 'Test Product',
          category: 'wine',
          basePrice: 20.0,
          cost: 10.0,
        },
      });

      // Create transaction with items in a single database transaction
      const result = await prismaService.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
          data: {
            locationId: location.id,
            subtotal: 20,
            tax: 1.4,
            total: 21.4,
            paymentMethod: 'cash',
            paymentStatus: 'completed',
            channel: 'counter',
          },
        });

        const item = await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            sku: product.sku,
            name: product.name,
            quantity: 1,
            unitPrice: 20,
            tax: 1.4,
            total: 21.4,
          },
        });

        return { transaction, item };
      });

      expect(result.transaction.id).toBeDefined();
      expect(result.item.transactionId).toBe(result.transaction.id);

      // Cleanup
      await prismaService.transactionItem.deleteMany({
        where: { transactionId: result.transaction.id },
      });
      await prismaService.transaction.delete({
        where: { id: result.transaction.id },
      });
      await prismaService.product.delete({ where: { id: product.id } });
      await prismaService.location.delete({ where: { id: location.id } });
    });
  });

  describe('Performance', () => {
    it('should handle bulk inserts efficiently', async () => {
      const startTime = Date.now();

      // Create 100 users
      const users = Array.from({ length: 100 }, (_, i) => ({
        username: `bulk_user_${i}_${Date.now()}`,
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        role: 'CASHIER' as const,
      }));

      await prismaService.user.createMany({
        data: users,
      });

      const duration = Date.now() - startTime;

      // Should complete in less than 5 seconds
      expect(duration).toBeLessThan(5000);

      // Cleanup
      await prismaService.user.deleteMany({
        where: {
          username: {
            startsWith: 'bulk_user_',
          },
        },
      });
    });

    it('should query large datasets efficiently', async () => {
      // Create test location
      const location = await prismaService.location.create({
        data: {
          name: 'Test Location',
          address: '123 Test St',
          city: 'Test City',
          state: 'FL',
          zip: '12345',
        },
      });

      // Create 1000 transactions
      const transactions = Array.from({ length: 1000 }, (_, i) => ({
        locationId: location.id,
        subtotal: 100 + i,
        tax: 7 + i * 0.07,
        total: 107 + i * 1.07,
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        channel: 'counter',
      }));

      await prismaService.transaction.createMany({
        data: transactions,
      });

      // Query with pagination
      const startTime = Date.now();
      const results = await prismaService.transaction.findMany({
        where: { locationId: location.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(100);
      // Should complete in less than 1 second (with proper indexes)
      expect(duration).toBeLessThan(1000);

      // Cleanup
      await prismaService.transaction.deleteMany({
        where: { locationId: location.id },
      });
      await prismaService.location.delete({ where: { id: location.id } });
    }, 30000); // 30 second timeout for this test
  });

  describe('Connection Pooling', () => {
    it('should reuse connections from pool', async () => {
      // Make multiple queries in sequence
      const queries = Array.from(
        { length: 10 },
        () => prismaService.$queryRaw`SELECT 1 as value`,
      );

      const startTime = Date.now();
      await Promise.all(queries);
      const duration = Date.now() - startTime;

      // With connection pooling, should be fast (< 100ms)
      // Without pooling, would take 500-1000ms (50-100ms per connection)
      expect(duration).toBeLessThan(100);
    });

    it('should handle connection pool exhaustion gracefully', async () => {
      // Create more concurrent requests than pool size
      const promises = Array.from(
        { length: 50 },
        () => prismaService.$queryRaw`SELECT pg_sleep(0.1)`,
      );

      // Should not throw error, just queue requests
      await expect(Promise.all(promises)).resolves.toBeDefined();
    }, 10000); // 10 second timeout
  });

  describe('Schema Validation', () => {
    it('should have all required tables', async () => {
      const tables = await prismaService.$queryRaw<{ tablename: string }[]>`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `;

      const tableNames = tables.map((t) => t.tablename);

      expect(tableNames).toContain('User');
      expect(tableNames).toContain('Product');
      expect(tableNames).toContain('Inventory');
      expect(tableNames).toContain('Location');
      expect(tableNames).toContain('Transaction');
      expect(tableNames).toContain('TransactionItem');
      expect(tableNames).toContain('Payment');
      expect(tableNames).toContain('Customer');
      expect(tableNames).toContain('EventLog');
      expect(tableNames).toContain('AuditLog');
    });

    it('should have proper indexes', async () => {
      const indexes = await prismaService.$queryRaw<
        { tablename: string; indexname: string }[]
      >`
        SELECT 
          tablename,
          indexname
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `;

      const indexNames = indexes.map((i) => i.indexname);

      // Check for critical indexes
      expect(
        indexNames.some((name) => name.includes('Transaction_locationId')),
      ).toBe(true);
      expect(
        indexNames.some((name) => name.includes('Transaction_createdAt')),
      ).toBe(true);
      expect(indexNames.some((name) => name.includes('Product_sku'))).toBe(
        true,
      );
    });
  });
});
