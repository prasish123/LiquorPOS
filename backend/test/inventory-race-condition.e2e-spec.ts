import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { InventoryAgent } from '../src/orders/agents/inventory.agent';

describe('Inventory Race Condition Prevention (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let inventoryAgent: InventoryAgent;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    inventoryAgent = app.get<InventoryAgent>(InventoryAgent);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Concurrent Reservation Prevention', () => {
    let testProductId: string;
    let testLocationId: string;
    let testInventoryId: string;

    beforeEach(async () => {
      // Create test location
      const location = await prisma.location.create({
        data: {
          name: 'Test Location',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          licenseNumber: 'TEST-123',
          licenseExpiry: new Date('2030-12-31'),
        },
      });
      testLocationId = location.id;

      // Create test product
      const product = await prisma.product.create({
        data: {
          sku: `TEST-${Date.now()}`,
          name: 'Test Product',
          basePrice: 10.0,
          category: 'Test',
          trackInventory: true,
        },
      });
      testProductId = product.id;

      // Create inventory with limited stock
      const inventory = await prisma.inventory.create({
        data: {
          productId: testProductId,
          locationId: testLocationId,
          quantity: 10,
          reserved: 0,
          reorderPoint: 5,
        },
      });
      testInventoryId = inventory.id;
    });

    afterEach(async () => {
      // Cleanup
      await prisma.inventory.deleteMany({
        where: { id: testInventoryId },
      });
      await prisma.product.deleteMany({
        where: { id: testProductId },
      });
      await prisma.location.deleteMany({
        where: { id: testLocationId },
      });
    });

    it('should prevent overselling when multiple concurrent requests try to reserve same inventory', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      if (!product) {
        throw new Error('Test product not found');
      }

      // Create 5 concurrent requests, each trying to reserve 3 items
      // Total requested: 15 items, but only 10 available
      // Expected: Some should succeed, some should fail, but total reserved should never exceed 10

      const concurrentRequests = Array.from({ length: 5 }, (_, i) => ({
        requestId: i + 1,
        items: [
          {
            sku: product.sku,
            quantity: 3,
          },
        ],
      }));

      const results = await Promise.allSettled(
        concurrentRequests.map((req) =>
          inventoryAgent.checkAndReserve(testLocationId, req.items),
        ),
      );

      // Count successes and failures
      const successes = results.filter((r) => r.status === 'fulfilled').length;
      const failures = results.filter((r) => r.status === 'rejected').length;

      // Verify results
      expect(successes).toBeGreaterThan(0); // At least some should succeed
      expect(failures).toBeGreaterThan(0); // At least some should fail (insufficient inventory)
      expect(successes + failures).toBe(5); // All requests completed

      // Verify inventory state
      const finalInventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });

      expect(finalInventory).not.toBeNull();
      if (finalInventory) {
        // Reserved should be exactly the amount successfully reserved
        expect(finalInventory.reserved).toBe(successes * 3);
        // Total quantity should remain unchanged
        expect(finalInventory.quantity).toBe(10);
        // Available should be correct
        const available = finalInventory.quantity - finalInventory.reserved;
        expect(available).toBeGreaterThanOrEqual(0);
        expect(available).toBeLessThan(3); // Not enough for another reservation of 3
      }
    });

    it('should handle exact capacity correctly with concurrent requests', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      if (!product) {
        throw new Error('Test product not found');
      }

      // Create 10 concurrent requests, each trying to reserve 1 item
      // Total requested: 10 items, exactly 10 available
      // Expected: All should succeed OR some fail due to timing, but never oversell

      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        requestId: i + 1,
        items: [
          {
            sku: product.sku,
            quantity: 1,
          },
        ],
      }));

      const results = await Promise.allSettled(
        concurrentRequests.map((req) =>
          inventoryAgent.checkAndReserve(testLocationId, req.items),
        ),
      );

      const successes = results.filter((r) => r.status === 'fulfilled').length;

      // Verify inventory state
      const finalInventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });

      expect(finalInventory).not.toBeNull();
      if (finalInventory) {
        // Reserved should equal number of successes
        expect(finalInventory.reserved).toBe(successes);
        // Should never exceed available quantity
        expect(finalInventory.reserved).toBeLessThanOrEqual(10);
        // Available should be non-negative
        const available = finalInventory.quantity - finalInventory.reserved;
        expect(available).toBeGreaterThanOrEqual(0);
      }
    });

    it('should maintain consistency during concurrent reserve and release operations', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      if (!product) {
        throw new Error('Test product not found');
      }

      // First, reserve some inventory
      const initialReservation = await inventoryAgent.checkAndReserve(
        testLocationId,
        [{ sku: product.sku, quantity: 5 }],
      );

      // Now run concurrent operations: some reserving, some releasing
      const operations = [
        // Try to reserve more
        inventoryAgent.checkAndReserve(testLocationId, [
          { sku: product.sku, quantity: 3 },
        ]),
        inventoryAgent.checkAndReserve(testLocationId, [
          { sku: product.sku, quantity: 2 },
        ]),
        // Release the initial reservation
        inventoryAgent.release(initialReservation, testLocationId),
        // Try to reserve again
        inventoryAgent.checkAndReserve(testLocationId, [
          { sku: product.sku, quantity: 4 },
        ]),
      ];

      const results = await Promise.allSettled(operations);

      // Verify final state is consistent
      const finalInventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });

      expect(finalInventory).not.toBeNull();
      if (finalInventory) {
        // Reserved should never exceed total quantity
        expect(finalInventory.reserved).toBeLessThanOrEqual(
          finalInventory.quantity,
        );
        // Reserved should be non-negative
        expect(finalInventory.reserved).toBeGreaterThanOrEqual(0);
        // Total quantity should remain unchanged
        expect(finalInventory.quantity).toBe(10);
      }
    });

    it('should handle transaction timeout gracefully', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      if (!product) {
        throw new Error('Test product not found');
      }

      // This test verifies that if a transaction takes too long,
      // it fails gracefully without corrupting data

      // Create a reservation that will hold a lock
      const reservation1Promise = inventoryAgent.checkAndReserve(
        testLocationId,
        [{ sku: product.sku, quantity: 5 }],
      );

      // Immediately try another reservation (might hit lock timeout)
      const reservation2Promise = inventoryAgent.checkAndReserve(
        testLocationId,
        [{ sku: product.sku, quantity: 5 }],
      );

      const results = await Promise.allSettled([
        reservation1Promise,
        reservation2Promise,
      ]);

      // At least one should succeed
      const successes = results.filter((r) => r.status === 'fulfilled').length;
      expect(successes).toBeGreaterThan(0);

      // Verify data consistency
      const finalInventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });

      expect(finalInventory).not.toBeNull();
      if (finalInventory) {
        expect(finalInventory.reserved).toBeLessThanOrEqual(10);
        expect(finalInventory.reserved).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Commit and Release Race Conditions', () => {
    let testProductId: string;
    let testLocationId: string;
    let testInventoryId: string;

    beforeEach(async () => {
      const location = await prisma.location.create({
        data: {
          name: 'Test Location 2',
          address: '456 Test Ave',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          licenseNumber: 'TEST-456',
          licenseExpiry: new Date('2030-12-31'),
        },
      });
      testLocationId = location.id;

      const product = await prisma.product.create({
        data: {
          sku: `TEST-COMMIT-${Date.now()}`,
          name: 'Test Product 2',
          basePrice: 10.0,
          category: 'Test',
          trackInventory: true,
        },
      });
      testProductId = product.id;

      const inventory = await prisma.inventory.create({
        data: {
          productId: testProductId,
          locationId: testLocationId,
          quantity: 20,
          reserved: 10, // Pre-reserved
          reorderPoint: 5,
        },
      });
      testInventoryId = inventory.id;
    });

    afterEach(async () => {
      await prisma.inventory.deleteMany({
        where: { id: testInventoryId },
      });
      await prisma.product.deleteMany({
        where: { id: testProductId },
      });
      await prisma.location.deleteMany({
        where: { id: testLocationId },
      });
    });

    it('should handle concurrent commit operations without data corruption', async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      if (!product) {
        throw new Error('Test product not found');
      }

      // Create multiple reservations to commit
      const reservations = Array.from({ length: 5 }, (_, i) => ({
        reservationId: `res-${i}`,
        items: [
          {
            sku: product.sku,
            quantity: 2,
            productId: testProductId,
          },
        ],
      }));

      // Commit all concurrently
      await Promise.all(
        reservations.map((res) => inventoryAgent.commit(res, testLocationId)),
      );

      // Verify final state
      const finalInventory = await prisma.inventory.findUnique({
        where: { id: testInventoryId },
      });

      expect(finalInventory).not.toBeNull();
      if (finalInventory) {
        // Quantity should be reduced by total committed (5 * 2 = 10)
        expect(finalInventory.quantity).toBe(10); // 20 - 10
        // Reserved should be reduced by total committed
        expect(finalInventory.reserved).toBe(0); // 10 - 10
      }
    });
  });
});
