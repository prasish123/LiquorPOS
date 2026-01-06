import { Test, TestingModule } from '@nestjs/testing';
import { OrderOrchestrator } from './order-orchestrator';
import { PrismaService } from '../prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryAgent } from './agents/inventory.agent';
import { PricingAgent } from './agents/pricing.agent';
import { ComplianceAgent } from './agents/compliance.agent';
import { PaymentAgent } from './agents/payment.agent';
import { AuditService } from './audit.service';
import { CreateOrderDto } from './dto/order.dto';

describe('OrderOrchestrator', () => {
  let orchestrator: OrderOrchestrator;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let inventoryAgent: InventoryAgent;
  let pricingAgent: PricingAgent;
  let complianceAgent: ComplianceAgent;
  let paymentAgent: PaymentAgent;
  let auditService: AuditService;

  const mockPrismaService = {
    transaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transactionItem: {
      createMany: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    eventLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockInventoryAgent = {
    checkAndReserve: jest.fn(),
    release: jest.fn(),
    commit: jest.fn(),
  };

  const mockPricingAgent = {
    calculate: jest.fn(),
  };

  const mockComplianceAgent = {
    verifyAge: jest.fn(),
    logComplianceEvent: jest.fn(),
  };

  const mockPaymentAgent = {
    authorize: jest.fn(),
    capture: jest.fn(),
    void: jest.fn(),
    refund: jest.fn(),
    createPaymentRecord: jest.fn(),
  };

  const mockAuditService = {
    logOrderCreated: jest.fn(),
    logOrderFailed: jest.fn(),
    logCompensation: jest.fn(),
    logPaymentProcessing: jest.fn(),
  };

  const mockOfflinePaymentAgent = {
    authorize: jest.fn(),
  };

  const mockNetworkStatusService = {
    isOnline: jest.fn().mockReturnValue(true),
  };

  const mockOfflineQueueService = {
    registerHandler: jest.fn(),
    queueOperation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderOrchestrator,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: InventoryAgent, useValue: mockInventoryAgent },
        { provide: PricingAgent, useValue: mockPricingAgent },
        { provide: ComplianceAgent, useValue: mockComplianceAgent },
        { provide: PaymentAgent, useValue: mockPaymentAgent },
        { provide: 'OfflinePaymentAgent', useValue: mockOfflinePaymentAgent },
        { provide: AuditService, useValue: mockAuditService },
        { provide: 'NetworkStatusService', useValue: mockNetworkStatusService },
        { provide: 'OfflineQueueService', useValue: mockOfflineQueueService },
      ],
    }).compile();

    orchestrator = module.get<OrderOrchestrator>(OrderOrchestrator);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    inventoryAgent = module.get<InventoryAgent>(InventoryAgent);
    pricingAgent = module.get<PricingAgent>(PricingAgent);
    complianceAgent = module.get<ComplianceAgent>(ComplianceAgent);
    paymentAgent = module.get<PaymentAgent>(PaymentAgent);
    auditService = module.get<AuditService>(AuditService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('processOrder - Happy Path', () => {
    it('should successfully process a cash order', async () => {
      const orderDto: CreateOrderDto = {
        locationId: 'loc-1',
        terminalId: 'term-1',
        items: [{ sku: 'SKU-001', quantity: 2 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: 'test-key-1',
      };

      // Mock successful responses
      mockInventoryAgent.checkAndReserve.mockResolvedValue({
        reservations: [
          {
            productId: 'prod-1',
            sku: 'SKU-001',
            quantity: 2,
            inventoryId: 'inv-1',
          },
        ],
      });

      mockPricingAgent.calculate.mockResolvedValue({
        subtotal: 50.0,
        totalTax: 5.0,
        totalDiscount: 0,
        total: 55.0,
        items: [
          {
            sku: 'SKU-001',
            name: 'Test Product',
            quantity: 2,
            unitPrice: 25.0,
            discount: 0,
            tax: 5.0,
            total: 55.0,
          },
        ],
      });

      mockComplianceAgent.verifyAge.mockResolvedValue({
        verified: true,
        requiresVerification: true,
      });

      mockPaymentAgent.authorize.mockResolvedValue({
        status: 'completed',
        transactionId: 'pay-1',
        amount: 55.0,
      });

      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'txn-1',
        locationId: 'loc-1',
        terminalId: 'term-1',
        subtotal: 50.0,
        tax: 5.0,
        total: 55.0,
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        channel: 'counter',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      });

      mockPrismaService.transactionItem.createMany.mockResolvedValue({
        count: 1,
      });

      mockPrismaService.payment.create.mockResolvedValue({
        id: 'pay-1',
        transactionId: 'txn-1',
        method: 'cash',
        amount: 55.0,
        status: 'captured',
      });

      const result = await orchestrator.processOrder(orderDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('txn-1');
      expect(result.paymentStatus).toBe('completed');
      expect(inventoryAgent.checkAndReserve).toHaveBeenCalledWith('loc-1', orderDto.items);
      expect(pricingAgent.calculate).toHaveBeenCalledWith(orderDto.items, orderDto.locationId);
      expect(complianceAgent.verifyAge).toHaveBeenCalled();
      expect(paymentAgent.authorize).toHaveBeenCalled();
      expect(inventoryAgent.commit).toHaveBeenCalled();
    });

    it('should use POS-provided pricing when available', async () => {
      const orderDto: CreateOrderDto = {
        locationId: 'loc-1',
        terminalId: 'term-1',
        items: [{ sku: 'SKU-001', quantity: 2, priceAtSale: 25.0 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        subtotal: 50.0,
        tax: 5.0,
        total: 55.0,
        idempotencyKey: 'test-key-2',
      };

      mockInventoryAgent.checkAndReserve.mockResolvedValue({
        reservations: [
          {
            productId: 'prod-1',
            sku: 'SKU-001',
            quantity: 2,
            inventoryId: 'inv-1',
          },
        ],
      });

      mockComplianceAgent.verifyAge.mockResolvedValue({
        verified: true,
        requiresVerification: true,
      });

      mockPaymentAgent.authorize.mockResolvedValue({
        status: 'completed',
        transactionId: 'pay-1',
        amount: 55.0,
      });

      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'txn-2',
        locationId: 'loc-1',
        subtotal: 50.0,
        tax: 5.0,
        total: 55.0,
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        createdAt: new Date(),
        items: [],
      });

      mockPrismaService.transactionItem.createMany.mockResolvedValue({
        count: 1,
      });

      mockPrismaService.payment.create.mockResolvedValue({
        id: 'pay-1',
      });

      await orchestrator.processOrder(orderDto);

      // Should NOT call pricing agent
      expect(pricingAgent.calculate).not.toHaveBeenCalled();
    });
  });

  describe('processOrder - Compensation Scenarios', () => {
    it('should compensate inventory when payment fails', async () => {
      const orderDto: CreateOrderDto = {
        locationId: 'loc-1',
        terminalId: 'term-1',
        items: [{ sku: 'SKU-001', quantity: 2 }],
        paymentMethod: 'card',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: 'test-key-3',
      };

      mockInventoryAgent.checkAndReserve.mockResolvedValue({
        reservations: [
          {
            productId: 'prod-1',
            sku: 'SKU-001',
            quantity: 2,
            inventoryId: 'inv-1',
          },
        ],
      });

      mockPricingAgent.calculate.mockResolvedValue({
        subtotal: 50.0,
        totalTax: 5.0,
        totalDiscount: 0,
        total: 55.0,
        items: [],
      });

      mockComplianceAgent.verifyAge.mockResolvedValue({
        verified: true,
        requiresVerification: true,
      });

      // Payment fails
      mockPaymentAgent.authorize.mockResolvedValue({
        status: 'failed',
        error: 'Card declined',
      });

      await expect(orchestrator.processOrder(orderDto)).rejects.toThrow();

      // Should release inventory
      expect(inventoryAgent.release).toHaveBeenCalled();
    });

    it('should compensate inventory when compliance check fails', async () => {
      const orderDto: CreateOrderDto = {
        locationId: 'loc-1',
        terminalId: 'term-1',
        items: [{ sku: 'SKU-001', quantity: 2 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: false,
        idempotencyKey: 'test-key-4',
      };

      mockInventoryAgent.checkAndReserve.mockResolvedValue({
        reservations: [
          {
            productId: 'prod-1',
            sku: 'SKU-001',
            quantity: 2,
            inventoryId: 'inv-1',
          },
        ],
      });

      mockPricingAgent.calculate.mockResolvedValue({
        subtotal: 50.0,
        totalTax: 5.0,
        totalDiscount: 0,
        total: 55.0,
        items: [],
      });

      // Compliance fails
      mockComplianceAgent.verifyAge.mockRejectedValue(new Error('Age verification required'));

      await expect(orchestrator.processOrder(orderDto)).rejects.toThrow();

      // Should release inventory
      expect(inventoryAgent.release).toHaveBeenCalled();
    });

    it('should void payment if transaction creation fails', async () => {
      const orderDto: CreateOrderDto = {
        locationId: 'loc-1',
        terminalId: 'term-1',
        items: [{ sku: 'SKU-001', quantity: 2 }],
        paymentMethod: 'card',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: 'test-key-5',
      };

      mockInventoryAgent.checkAndReserve.mockResolvedValue({
        reservations: [
          {
            productId: 'prod-1',
            sku: 'SKU-001',
            quantity: 2,
            inventoryId: 'inv-1',
          },
        ],
      });

      mockPricingAgent.calculate.mockResolvedValue({
        subtotal: 50.0,
        totalTax: 5.0,
        totalDiscount: 0,
        total: 55.0,
        items: [],
      });

      mockComplianceAgent.verifyAge.mockResolvedValue({
        verified: true,
        requiresVerification: true,
      });

      mockPaymentAgent.authorize.mockResolvedValue({
        status: 'authorized',
        transactionId: 'pay-1',
        amount: 55.0,
      });

      // Transaction creation fails
      mockPrismaService.transaction.create.mockRejectedValue(new Error('Database error'));

      await expect(orchestrator.processOrder(orderDto)).rejects.toThrow();

      // Should void payment and release inventory
      expect(paymentAgent.void).toHaveBeenCalledWith({
        status: 'authorized',
        transactionId: 'pay-1',
        amount: 55.0,
      });
      expect(inventoryAgent.release).toHaveBeenCalled();
    });
  });

  describe('processOrder - Idempotency', () => {
    it('should handle duplicate idempotency key at database level', async () => {
      // Reset mocks from previous tests
      jest.clearAllMocks();

      const orderDto: CreateOrderDto = {
        locationId: 'loc-1',
        terminalId: 'term-1',
        items: [{ sku: 'SKU-001', quantity: 2 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: 'duplicate-key',
      };

      mockInventoryAgent.checkAndReserve.mockResolvedValue({
        reservations: [
          {
            productId: 'prod-1',
            sku: 'SKU-001',
            quantity: 2,
            inventoryId: 'inv-1',
          },
        ],
      });

      mockPricingAgent.calculate.mockResolvedValue({
        subtotal: 50.0,
        totalTax: 5.0,
        totalDiscount: 0,
        total: 55.0,
        items: [],
      });

      mockComplianceAgent.verifyAge.mockResolvedValue({
        verified: true,
        requiresVerification: true,
      });

      mockPaymentAgent.authorize.mockResolvedValue({
        status: 'completed',
        transactionId: 'pay-1',
        amount: 55.0,
      });

      // Database rejects with unique constraint error
      mockPrismaService.transaction.create.mockRejectedValue({
        code: 'P2002', // Prisma unique constraint error code
        meta: { target: ['idempotencyKey'] },
      });

      // Idempotency is handled at database level, so this should throw
      await expect(orchestrator.processOrder(orderDto)).rejects.toMatchObject({
        code: 'P2002',
      });

      // Should have attempted to compensate
      expect(inventoryAgent.release).toHaveBeenCalled();
    });
  });

  describe('processOrder - Validation', () => {
    it('should reject order with insufficient inventory', async () => {
      const orderDto: CreateOrderDto = {
        locationId: 'loc-1',
        terminalId: 'term-1',
        items: [{ sku: 'SKU-001', quantity: 100 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: 'test-key-6',
      };

      mockInventoryAgent.checkAndReserve.mockRejectedValue(
        new Error('Insufficient inventory for SKU-001'),
      );

      await expect(orchestrator.processOrder(orderDto)).rejects.toThrow('Insufficient inventory');
    });

    it('should reject order without age verification for restricted items', async () => {
      const orderDto: CreateOrderDto = {
        locationId: 'loc-1',
        terminalId: 'term-1',
        items: [{ sku: 'SKU-001', quantity: 1 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: false,
        idempotencyKey: 'test-key-7',
      };

      mockInventoryAgent.checkAndReserve.mockResolvedValue({
        reservations: [
          {
            productId: 'prod-1',
            sku: 'SKU-001',
            quantity: 1,
            inventoryId: 'inv-1',
          },
        ],
      });

      mockPricingAgent.calculate.mockResolvedValue({
        subtotal: 25.0,
        totalTax: 2.5,
        totalDiscount: 0,
        total: 27.5,
        items: [],
      });

      mockComplianceAgent.verifyAge.mockRejectedValue(
        new Error('Age verification required for restricted items'),
      );

      await expect(orchestrator.processOrder(orderDto)).rejects.toThrow(
        'Age verification required',
      );

      expect(inventoryAgent.release).toHaveBeenCalled();
    });
  });

  describe('processOrder - Event Publishing', () => {
    it('should publish order created event on success', async () => {
      const orderDto: CreateOrderDto = {
        locationId: 'loc-1',
        terminalId: 'term-1',
        items: [{ sku: 'SKU-001', quantity: 1 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: 'test-key-8',
      };

      mockInventoryAgent.checkAndReserve.mockResolvedValue({
        reservations: [
          {
            productId: 'prod-1',
            sku: 'SKU-001',
            quantity: 1,
            inventoryId: 'inv-1',
          },
        ],
      });

      mockPricingAgent.calculate.mockResolvedValue({
        subtotal: 25.0,
        totalTax: 2.5,
        totalDiscount: 0,
        total: 27.5,
        items: [],
      });

      mockComplianceAgent.verifyAge.mockResolvedValue({
        verified: true,
        requiresVerification: true,
      });

      mockPaymentAgent.authorize.mockResolvedValue({
        status: 'completed',
        transactionId: 'pay-1',
        amount: 27.5,
      });

      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'txn-1',
        locationId: 'loc-1',
        subtotal: 25.0,
        tax: 2.5,
        total: 27.5,
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        createdAt: new Date(),
        items: [],
      });

      mockPrismaService.transactionItem.createMany.mockResolvedValue({
        count: 1,
      });

      mockPrismaService.payment.create.mockResolvedValue({
        id: 'pay-1',
      });

      await orchestrator.processOrder(orderDto);

      expect(eventEmitter.emit).toHaveBeenCalledWith('order.created', expect.any(Object));
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const orderDto: CreateOrderDto = {
        locationId: 'loc-1',
        terminalId: 'term-1',
        items: [{ sku: 'SKU-001', quantity: 1 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: 'test-key-9',
      };

      mockInventoryAgent.checkAndReserve.mockRejectedValue(new Error('Unexpected database error'));

      await expect(orchestrator.processOrder(orderDto)).rejects.toThrow(
        'Unexpected database error',
      );
    });

    it('should log compensation failures', async () => {
      const orderDto: CreateOrderDto = {
        locationId: 'loc-1',
        terminalId: 'term-1',
        items: [{ sku: 'SKU-001', quantity: 1 }],
        paymentMethod: 'card',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: 'test-key-10',
      };

      mockInventoryAgent.checkAndReserve.mockResolvedValue({
        reservations: [
          {
            productId: 'prod-1',
            sku: 'SKU-001',
            quantity: 1,
            inventoryId: 'inv-1',
          },
        ],
      });

      mockPricingAgent.calculate.mockResolvedValue({
        subtotal: 25.0,
        totalTax: 2.5,
        totalDiscount: 0,
        total: 27.5,
        items: [],
      });

      mockComplianceAgent.verifyAge.mockRejectedValue(new Error('Compliance check failed'));

      // Release also fails
      mockInventoryAgent.release.mockRejectedValue(new Error('Release failed'));

      await expect(orchestrator.processOrder(orderDto)).rejects.toThrow();

      // Should still attempt compensation
      expect(inventoryAgent.release).toHaveBeenCalled();
    });
  });
});
