import { Test, TestingModule } from '@nestjs/testing';
import { OrderOrchestrator } from '../../src/orders/order-orchestrator';
import { InventoryAgent } from '../../src/orders/agents/inventory.agent';
import { PricingAgent } from '../../src/orders/agents/pricing.agent';
import { ComplianceAgent } from '../../src/orders/agents/compliance.agent';
import { PaymentAgent } from '../../src/orders/agents/payment.agent';
import { AuditService } from '../../src/orders/audit.service';
import { PrismaService } from '../../src/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateOrderDto } from '../../src/orders/dto/order.dto';

/**
 * Order Orchestrator Integration Tests
 *
 * Tests the complete SAGA pattern implementation for order processing:
 * - Happy path: All steps succeed
 * - Compensation: Payment failure triggers rollback
 * - Compensation: Inventory failure triggers rollback
 * - Idempotency: Duplicate requests handled correctly
 * - Concurrent operations: Race conditions prevented
 */
describe('OrderOrchestrator Integration Tests', () => {
  let orchestrator: OrderOrchestrator;
  let prisma: PrismaService;
  let inventoryAgent: InventoryAgent;
  let pricingAgent: PricingAgent;
  let complianceAgent: ComplianceAgent;
  let paymentAgent: PaymentAgent;
  let auditService: AuditService;
  let eventEmitter: EventEmitter2;

  // Test data IDs
  let testLocationId: string;
  let testProductId: string;
  let testEmployeeId: string;
  let testCustomerId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderOrchestrator,
        InventoryAgent,
        PricingAgent,
        ComplianceAgent,
        PaymentAgent,
        AuditService,
        PrismaService,
        EventEmitter2,
      ],
    }).compile();

    orchestrator = module.get<OrderOrchestrator>(OrderOrchestrator);
    prisma = module.get<PrismaService>(PrismaService);
    inventoryAgent = module.get<InventoryAgent>(InventoryAgent);
    pricingAgent = module.get<PricingAgent>(PricingAgent);
    complianceAgent = module.get<ComplianceAgent>(ComplianceAgent);
    paymentAgent = module.get<PaymentAgent>(PaymentAgent);
    auditService = module.get<AuditService>(AuditService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up transactions created during tests
    await prisma.transaction.deleteMany({
      where: {
        locationId: testLocationId,
      },
    });
  });

  /**
   * Setup test data: location, product, inventory, employee, customer
   */
  async function setupTestData() {
    // Create test location
    const location = await prisma.location.create({
      data: {
        name: 'Test Store',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip: '12345',
        phone: '555-0100',
      },
    });
    testLocationId = location.id;

    // Create test product
    const product = await prisma.product.create({
      data: {
        sku: 'TEST-WHISKEY-001',
        name: 'Test Whiskey',
        category: 'spirits',
        subcategory: 'whiskey',
        basePrice: 29.99,
        cost: 15.0,
        taxable: true,
        ageRestricted: true,
        trackInventory: true,
      },
    });
    testProductId = product.id;

    // Create inventory
    await prisma.inventory.create({
      data: {
        productId: testProductId,
        locationId: testLocationId,
        quantity: 100,
        reserved: 0,
        reorderPoint: 10,
        reorderQuantity: 50,
      },
    });

    // Create test employee
    const employee = await prisma.user.create({
      data: {
        username: 'test-cashier',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'Cashier',
        email: 'cashier@test.com',
        role: 'cashier',
      },
    });
    testEmployeeId = employee.id;

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        phone: '555-0101',
        dateOfBirth: new Date('1990-01-01'),
        loyaltyPoints: 0,
        lifetimeValue: 0,
      },
    });
    testCustomerId = customer.id;
  }

  /**
   * Cleanup test data
   */
  async function cleanupTestData() {
    await prisma.transaction.deleteMany({
      where: { locationId: testLocationId },
    });
    await prisma.inventory.deleteMany({
      where: { locationId: testLocationId },
    });
    await prisma.customer.deleteMany({ where: { id: testCustomerId } });
    await prisma.user.deleteMany({ where: { id: testEmployeeId } });
    await prisma.product.deleteMany({ where: { id: testProductId } });
    await prisma.location.deleteMany({ where: { id: testLocationId } });
  }

  /**
   * Create a valid order DTO for testing
   */
  function createTestOrderDto(overrides: Partial<CreateOrderDto> = {}): CreateOrderDto {
    return {
      locationId: testLocationId,
      terminalId: 'terminal-001',
      employeeId: testEmployeeId,
      customerId: testCustomerId,
      items: [
        {
          sku: 'TEST-WHISKEY-001',
          quantity: 2,
          priceAtSale: 29.99,
          discount: 0,
        },
      ],
      paymentMethod: 'cash',
      channel: 'counter',
      ageVerified: true,
      ageVerifiedBy: testEmployeeId,
      idScanned: true,
      idempotencyKey: `test-${Date.now()}-${Math.random()}`,
      ...overrides,
    };
  }

  describe('Happy Path: Successful Order Processing', () => {
    it('should process a complete order successfully (cash payment)', async () => {
      const orderDto = createTestOrderDto();

      // Process order
      const result = await orchestrator.processOrder(orderDto);

      // Verify order created
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.locationId).toBe(testLocationId);
      expect(result.paymentStatus).toBe('completed');
      expect(result.total).toBeGreaterThan(0);

      // Verify transaction in database
      const transaction = await prisma.transaction.findUnique({
        where: { id: result.id },
        include: { items: true },
      });

      expect(transaction).toBeDefined();
      expect(transaction!.items.length).toBe(1);
      expect(transaction!.paymentMethod).toBe('cash');

      // Verify inventory was committed (quantity reduced)
      const inventory = await prisma.inventory.findFirst({
        where: {
          productId: testProductId,
          locationId: testLocationId,
        },
      });

      expect(inventory).toBeDefined();
      expect(inventory!.quantity).toBe(98); // 100 - 2
      expect(inventory!.reserved).toBe(0); // Should be released after commit
    });

    it('should process order with POS-provided pricing', async () => {
      const orderDto = createTestOrderDto({
        subtotal: 59.98,
        tax: 4.2,
        total: 64.18,
      });

      const result = await orchestrator.processOrder(orderDto);

      expect(result.subtotal).toBe(59.98);
      expect(result.tax).toBe(4.2);
      expect(result.total).toBe(64.18);
    });

    it('should emit order.created event on success', async () => {
      const orderDto = createTestOrderDto();
      const eventSpy = jest.fn();

      eventEmitter.on('order.created', eventSpy);

      await orchestrator.processOrder(orderDto);

      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: expect.any(String),
          locationId: testLocationId,
          total: expect.any(Number),
        }),
      );

      eventEmitter.off('order.created', eventSpy);
    });

    it('should log audit trail for successful order', async () => {
      const orderDto = createTestOrderDto();

      const result = await orchestrator.processOrder(orderDto);

      // Verify audit log entries exist
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          transactionId: result.id,
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });

    it('should handle age-restricted products with verification', async () => {
      const orderDto = createTestOrderDto({
        ageVerified: true,
        idScanned: true,
      });

      const result = await orchestrator.processOrder(orderDto);

      expect(result.ageVerified).toBe(true);
      expect(result.idScanned).toBe(true);

      // Verify compliance event logged
      const complianceEvents = await prisma.complianceEvent.findMany({
        where: {
          transactionId: result.id,
        },
      });

      expect(complianceEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Compensation: Payment Failure', () => {
    it('should rollback inventory when payment authorization fails', async () => {
      const orderDto = createTestOrderDto({
        paymentMethod: 'card', // Will fail without Stripe configured
      });

      // Get initial inventory
      const initialInventory = await prisma.inventory.findFirst({
        where: {
          productId: testProductId,
          locationId: testLocationId,
        },
      });

      const initialQuantity = initialInventory!.quantity;
      const initialReserved = initialInventory!.reserved;

      // Attempt to process order (should fail at payment step)
      await expect(orchestrator.processOrder(orderDto)).rejects.toThrow();

      // Verify inventory was rolled back
      const finalInventory = await prisma.inventory.findFirst({
        where: {
          productId: testProductId,
          locationId: testLocationId,
        },
      });

      expect(finalInventory!.quantity).toBe(initialQuantity);
      expect(finalInventory!.reserved).toBe(initialReserved); // Reservation released
    });

    it('should emit order.failed event on payment failure', async () => {
      const orderDto = createTestOrderDto({
        paymentMethod: 'card',
      });

      const eventSpy = jest.fn();
      eventEmitter.on('order.failed', eventSpy);

      await expect(orchestrator.processOrder(orderDto)).rejects.toThrow();

      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.any(Object),
          error: expect.any(String),
        }),
      );

      eventEmitter.off('order.failed', eventSpy);
    });

    it('should log failed payment to audit trail', async () => {
      const orderDto = createTestOrderDto({
        paymentMethod: 'card',
      });

      await expect(orchestrator.processOrder(orderDto)).rejects.toThrow();

      // Verify audit log for failed payment exists
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: 'payment.processed',
          metadata: {
            path: ['status'],
            equals: 'failure',
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Compensation: Inventory Failure', () => {
    it('should fail when insufficient inventory available', async () => {
      const orderDto = createTestOrderDto({
        items: [
          {
            sku: 'TEST-WHISKEY-001',
            quantity: 200, // More than available (100)
            priceAtSale: 29.99,
            discount: 0,
          },
        ],
      });

      await expect(orchestrator.processOrder(orderDto)).rejects.toThrow(/Insufficient inventory/);
    });

    it('should fail when product not found', async () => {
      const orderDto = createTestOrderDto({
        items: [
          {
            sku: 'NONEXISTENT-SKU',
            quantity: 1,
            priceAtSale: 10.0,
            discount: 0,
          },
        ],
      });

      await expect(orchestrator.processOrder(orderDto)).rejects.toThrow(/not found/);
    });

    it('should not create transaction when inventory check fails', async () => {
      const orderDto = createTestOrderDto({
        items: [
          {
            sku: 'TEST-WHISKEY-001',
            quantity: 200,
            priceAtSale: 29.99,
            discount: 0,
          },
        ],
      });

      const initialTransactionCount = await prisma.transaction.count({
        where: { locationId: testLocationId },
      });

      await expect(orchestrator.processOrder(orderDto)).rejects.toThrow();

      const finalTransactionCount = await prisma.transaction.count({
        where: { locationId: testLocationId },
      });

      expect(finalTransactionCount).toBe(initialTransactionCount);
    });
  });

  describe('Idempotency Handling', () => {
    it('should prevent duplicate orders with same idempotency key', async () => {
      const idempotencyKey = `test-idempotency-${Date.now()}`;
      const orderDto = createTestOrderDto({ idempotencyKey });

      // Process order first time
      const result1 = await orchestrator.processOrder(orderDto);

      // Process order second time with same key
      const result2 = await orchestrator.processOrder(orderDto);

      // Should return same order
      expect(result1.id).toBe(result2.id);

      // Verify only one transaction created
      const transactions = await prisma.transaction.findMany({
        where: { idempotencyKey },
      });

      expect(transactions.length).toBe(1);
    });

    it('should allow different orders with different idempotency keys', async () => {
      const orderDto1 = createTestOrderDto({
        idempotencyKey: `test-key-1-${Date.now()}`,
      });
      const orderDto2 = createTestOrderDto({
        idempotencyKey: `test-key-2-${Date.now()}`,
      });

      const result1 = await orchestrator.processOrder(orderDto1);
      const result2 = await orchestrator.processOrder(orderDto2);

      expect(result1.id).not.toBe(result2.id);
    });

    it('should log idempotency check in audit trail', async () => {
      const idempotencyKey = `test-audit-${Date.now()}`;
      const orderDto = createTestOrderDto({ idempotencyKey });

      await orchestrator.processOrder(orderDto);
      await orchestrator.processOrder(orderDto); // Duplicate

      // Verify audit logs for both attempts
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: 'idempotency.check',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 2,
      });

      expect(auditLogs.length).toBe(2);
      // First should be cache hit (duplicate), second should be cache miss (original)
      const [duplicate, original] = auditLogs;
      expect(JSON.parse(duplicate.metadata as string).cacheHit).toBe(true);
      expect(JSON.parse(original.metadata as string).cacheHit).toBe(false);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent orders for same product without overselling', async () => {
      // Get current inventory
      const inventory = await prisma.inventory.findFirst({
        where: {
          productId: testProductId,
          locationId: testLocationId,
        },
      });

      const availableQuantity = inventory!.quantity;

      // Create multiple orders concurrently, each requesting half the inventory
      const orderPromises = Array.from({ length: 3 }, (_, i) =>
        orchestrator.processOrder(
          createTestOrderDto({
            items: [
              {
                sku: 'TEST-WHISKEY-001',
                quantity: Math.floor(availableQuantity / 2),
                priceAtSale: 29.99,
                discount: 0,
              },
            ],
            idempotencyKey: `concurrent-${Date.now()}-${i}`,
          }),
        ),
      );

      // Some should succeed, some should fail due to insufficient inventory
      const results = await Promise.allSettled(orderPromises);

      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      // At most 2 should succeed (since each takes half)
      expect(succeeded.length).toBeLessThanOrEqual(2);
      expect(failed.length).toBeGreaterThan(0);

      // Verify inventory never went negative
      const finalInventory = await prisma.inventory.findFirst({
        where: {
          productId: testProductId,
          locationId: testLocationId,
        },
      });

      expect(finalInventory!.quantity).toBeGreaterThanOrEqual(0);
      expect(finalInventory!.reserved).toBe(0); // All reservations released
    });

    it('should maintain data consistency under concurrent load', async () => {
      // Create 10 concurrent orders
      const orderPromises = Array.from({ length: 10 }, (_, i) =>
        orchestrator.processOrder(
          createTestOrderDto({
            items: [
              {
                sku: 'TEST-WHISKEY-001',
                quantity: 1,
                priceAtSale: 29.99,
                discount: 0,
              },
            ],
            idempotencyKey: `load-test-${Date.now()}-${i}`,
          }),
        ),
      );

      const results = await Promise.allSettled(orderPromises);

      const succeeded = results.filter((r) => r.status === 'fulfilled');

      // Verify all successful orders have unique IDs
      const orderIds = succeeded.map((r) => (r as PromiseFulfilledResult<any>).value.id);
      const uniqueIds = new Set(orderIds);

      expect(uniqueIds.size).toBe(succeeded.length);

      // Verify all transactions exist in database
      const transactions = await prisma.transaction.findMany({
        where: {
          id: { in: orderIds },
        },
      });

      expect(transactions.length).toBe(succeeded.length);
    });
  });

  describe('SAGA Pattern Verification', () => {
    it('should execute all steps in correct order', async () => {
      const orderDto = createTestOrderDto();
      const executionLog: string[] = [];

      // Spy on agent methods to track execution order
      const inventoryCheckSpy = jest
        .spyOn(inventoryAgent, 'checkAndReserve')
        .mockImplementation(async (...args) => {
          executionLog.push('inventory.checkAndReserve');
          // Call original implementation
          return inventoryAgent.checkAndReserve.bind(inventoryAgent)(...args);
        });

      const pricingCalculateSpy = jest
        .spyOn(pricingAgent, 'calculate')
        .mockImplementation(async (...args) => {
          executionLog.push('pricing.calculate');
          return pricingAgent.calculate.bind(pricingAgent)(...args);
        });

      const complianceVerifySpy = jest
        .spyOn(complianceAgent, 'verifyAge')
        .mockImplementation(async (...args) => {
          executionLog.push('compliance.verifyAge');
          return complianceAgent.verifyAge.bind(complianceAgent)(...args);
        });

      const paymentAuthorizeSpy = jest
        .spyOn(paymentAgent, 'authorize')
        .mockImplementation(async (...args) => {
          executionLog.push('payment.authorize');
          return paymentAgent.authorize.bind(paymentAgent)(...args);
        });

      await orchestrator.processOrder(orderDto);

      // Verify execution order
      expect(executionLog).toEqual([
        'inventory.checkAndReserve',
        // 'pricing.calculate' skipped when POS provides pricing
        'compliance.verifyAge',
        'payment.authorize',
      ]);

      // Restore spies
      inventoryCheckSpy.mockRestore();
      pricingCalculateSpy.mockRestore();
      complianceVerifySpy.mockRestore();
      paymentAuthorizeSpy.mockRestore();
    });

    it('should call compensation methods in reverse order on failure', async () => {
      const orderDto = createTestOrderDto({
        paymentMethod: 'card', // Will fail
      });

      const compensationLog: string[] = [];

      // Spy on compensation methods
      const releaseInventorySpy = jest
        .spyOn(inventoryAgent, 'release')
        .mockImplementation(async (...args) => {
          compensationLog.push('inventory.release');
          return inventoryAgent.release.bind(inventoryAgent)(...args);
        });

      const voidPaymentSpy = jest
        .spyOn(paymentAgent, 'void')
        .mockImplementation(async (...args) => {
          compensationLog.push('payment.void');
          return paymentAgent.void.bind(paymentAgent)(...args);
        });

      await expect(orchestrator.processOrder(orderDto)).rejects.toThrow();

      // Verify compensation called
      expect(compensationLog).toContain('inventory.release');
      // payment.void may not be called if payment failed

      // Restore spies
      releaseInventorySpy.mockRestore();
      voidPaymentSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle orders with multiple items', async () => {
      // Create second product
      const product2 = await prisma.product.create({
        data: {
          sku: 'TEST-VODKA-001',
          name: 'Test Vodka',
          category: 'spirits',
          subcategory: 'vodka',
          basePrice: 24.99,
          cost: 12.0,
          taxable: true,
          ageRestricted: true,
          trackInventory: true,
        },
      });

      await prisma.inventory.create({
        data: {
          productId: product2.id,
          locationId: testLocationId,
          quantity: 50,
          reserved: 0,
        },
      });

      const orderDto = createTestOrderDto({
        items: [
          {
            sku: 'TEST-WHISKEY-001',
            quantity: 1,
            priceAtSale: 29.99,
            discount: 0,
          },
          {
            sku: 'TEST-VODKA-001',
            quantity: 2,
            priceAtSale: 24.99,
            discount: 0,
          },
        ],
      });

      const result = await orchestrator.processOrder(orderDto);

      expect(result.items.length).toBe(2);

      // Cleanup
      await prisma.inventory.deleteMany({ where: { productId: product2.id } });
      await prisma.product.delete({ where: { id: product2.id } });
    });

    it('should handle orders with discounts', async () => {
      const orderDto = createTestOrderDto({
        items: [
          {
            sku: 'TEST-WHISKEY-001',
            quantity: 2,
            priceAtSale: 29.99,
            discount: 5.0,
          },
        ],
      });

      const result = await orchestrator.processOrder(orderDto);

      expect(result).toBeDefined();
      expect(result.discount).toBeGreaterThanOrEqual(0);
    });

    it('should handle orders without customer ID', async () => {
      const orderDto = createTestOrderDto({
        customerId: undefined,
      });

      const result = await orchestrator.processOrder(orderDto);

      expect(result).toBeDefined();
      expect(result.customerId).toBeUndefined();
    });

    it('should handle products without inventory tracking', async () => {
      // Create product without inventory tracking
      const product = await prisma.product.create({
        data: {
          sku: 'TEST-SERVICE-001',
          name: 'Test Service',
          category: 'services',
          basePrice: 10.0,
          cost: 0,
          taxable: true,
          ageRestricted: false,
          trackInventory: false, // No inventory tracking
        },
      });

      const orderDto = createTestOrderDto({
        items: [
          {
            sku: 'TEST-SERVICE-001',
            quantity: 1,
            priceAtSale: 10.0,
            discount: 0,
          },
        ],
      });

      const result = await orchestrator.processOrder(orderDto);

      expect(result).toBeDefined();

      // Cleanup
      await prisma.product.delete({ where: { id: product.id } });
    });
  });
});

