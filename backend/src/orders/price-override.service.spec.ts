import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PriceOverrideService, PriceOverrideRequest } from './price-override.service';
import { PrismaService } from '../prisma.service';
import { PinAuthService } from '../auth/pin-auth.service';
import { AuditService } from './audit.service';
import { OverrideReason } from '@prisma/client';

describe('PriceOverrideService', () => {
  let service: PriceOverrideService;
  let prisma: jest.Mocked<PrismaService>;
  let pinAuth: jest.Mocked<PinAuthService>;
  let auditService: jest.Mocked<AuditService>;

  const mockManager = {
    userId: 'mgr-1',
    firstName: 'John',
    lastName: 'Manager',
    role: 'MANAGER',
  };

  const mockTransaction = {
    id: 'txn-1',
    subtotal: 100.0,
    tax: 7.0,
    total: 107.0,
    items: [
      {
        id: 'item-1',
        sku: 'WINE-001',
        name: 'Test Wine',
        quantity: 2,
        unitPrice: 50.0,
        total: 100.0,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceOverrideService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            transaction: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            transactionItem: {
              update: jest.fn(),
            },
            priceOverride: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: PinAuthService,
          useValue: {
            authenticateByPin: jest.fn(),
            validateManagerRole: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logPriceOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PriceOverrideService>(PriceOverrideService);
    prisma = module.get(PrismaService);
    pinAuth = module.get(PinAuthService);
    auditService = module.get(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestOverride', () => {
    const baseRequest: PriceOverrideRequest = {
      transactionId: 'txn-1',
      itemSku: 'WINE-001',
      originalPrice: 50.0,
      overridePrice: 40.0,
      reason: 'PRICE_MATCH' as OverrideReason,
      reasonNotes: 'Competitor price match',
      managerPin: '1234',
      cashierId: 'cashier-1',
      terminalId: 'term-1',
    };

    it('should successfully process price override', async () => {
      pinAuth.authenticateByPin.mockResolvedValue(mockManager as any);
      pinAuth.validateManagerRole.mockResolvedValue(true);
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.user.findUnique.mockResolvedValue({
        id: 'cashier-1',
        firstName: 'Jane',
        lastName: 'Cashier',
      } as any);

      const mockOverride = {
        id: 'override-1',
        transactionId: 'txn-1',
        itemId: 'item-1',
        originalPrice: 50.0,
        overridePrice: 40.0,
        reason: 'PRICE_MATCH',
        managerName: 'John Manager',
      };

      prisma.priceOverride.create.mockResolvedValue(mockOverride as any);
      prisma.transactionItem.update.mockResolvedValue({} as any);
      prisma.transaction.update.mockResolvedValue({} as any);

      const result = await service.requestOverride(baseRequest);

      expect(result).toEqual({
        overrideId: 'override-1',
        approved: true,
        managerName: 'John Manager',
        newPrice: 40.0,
      });

      expect(pinAuth.authenticateByPin).toHaveBeenCalledWith('1234');
      expect(pinAuth.validateManagerRole).toHaveBeenCalledWith('mgr-1');
      expect(auditService.logPriceOverride).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-manager', async () => {
      pinAuth.authenticateByPin.mockResolvedValue({
        ...mockManager,
        role: 'CASHIER',
      } as any);
      pinAuth.validateManagerRole.mockResolvedValue(false);

      await expect(service.requestOverride(baseRequest)).rejects.toThrow(ForbiddenException);
      await expect(service.requestOverride(baseRequest)).rejects.toThrow(
        'Only managers and admins can override prices',
      );
    });

    it('should throw error for invalid PIN', async () => {
      pinAuth.authenticateByPin.mockRejectedValue(new Error('Invalid PIN'));

      await expect(service.requestOverride(baseRequest)).rejects.toThrow('Invalid PIN');
    });

    it('should throw error for negative price', async () => {
      const invalidRequest = {
        ...baseRequest,
        overridePrice: -10.0,
      };

      pinAuth.authenticateByPin.mockResolvedValue(mockManager as any);
      pinAuth.validateManagerRole.mockResolvedValue(true);

      await expect(service.requestOverride(invalidRequest)).rejects.toThrow(
        'Override price cannot be negative',
      );
    });

    it('should throw error for non-existent transaction', async () => {
      pinAuth.authenticateByPin.mockResolvedValue(mockManager as any);
      pinAuth.validateManagerRole.mockResolvedValue(true);
      prisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.requestOverride(baseRequest)).rejects.toThrow(
        'Transaction txn-1 not found',
      );
    });

    it('should throw error for non-existent item', async () => {
      pinAuth.authenticateByPin.mockResolvedValue(mockManager as any);
      pinAuth.validateManagerRole.mockResolvedValue(true);
      prisma.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        items: [{ ...mockTransaction.items[0], sku: 'DIFFERENT-SKU' }],
      } as any);

      await expect(service.requestOverride(baseRequest)).rejects.toThrow(
        'Item WINE-001 not found in transaction',
      );
    });

    it('should update transaction totals correctly', async () => {
      pinAuth.authenticateByPin.mockResolvedValue(mockManager as any);
      pinAuth.validateManagerRole.mockResolvedValue(true);
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.user.findUnique.mockResolvedValue({
        id: 'cashier-1',
        firstName: 'Jane',
        lastName: 'Cashier',
      } as any);
      prisma.priceOverride.create.mockResolvedValue({
        id: 'override-1',
        managerName: 'John Manager',
      } as any);
      prisma.transactionItem.update.mockResolvedValue({} as any);
      prisma.transaction.update.mockResolvedValue({} as any);

      await service.requestOverride(baseRequest);

      // Original: 50.0 * 2 = 100.0 subtotal
      // Override: 40.0 * 2 = 80.0 subtotal
      // Difference: 20.0
      // New subtotal: 100.0 - 20.0 = 80.0
      // New tax: 80.0 * (7.0 / 100.0) = 5.6
      // New total: 80.0 + 5.6 = 85.6

      expect(prisma.transactionItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: {
          originalPrice: 50.0,
          unitPrice: 40.0,
          priceOverridden: true,
          total: 80.0, // 40.0 * 2
        },
      });

      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'txn-1' },
        data: {
          subtotal: 80.0,
          tax: 5.6,
          total: 85.6,
        },
      });
    });

    it('should handle cashier without ID', async () => {
      const requestWithoutCashier = {
        ...baseRequest,
        cashierId: undefined,
      };

      pinAuth.authenticateByPin.mockResolvedValue(mockManager as any);
      pinAuth.validateManagerRole.mockResolvedValue(true);
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.priceOverride.create.mockResolvedValue({
        id: 'override-1',
        managerName: 'John Manager',
      } as any);
      prisma.transactionItem.update.mockResolvedValue({} as any);
      prisma.transaction.update.mockResolvedValue({} as any);

      await service.requestOverride(requestWithoutCashier);

      expect(prisma.priceOverride.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cashierName: 'Unknown',
        }),
      });
    });

    it('should handle non-existent cashier', async () => {
      pinAuth.authenticateByPin.mockResolvedValue(mockManager as any);
      pinAuth.validateManagerRole.mockResolvedValue(true);
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.priceOverride.create.mockResolvedValue({
        id: 'override-1',
        managerName: 'John Manager',
      } as any);
      prisma.transactionItem.update.mockResolvedValue({} as any);
      prisma.transaction.update.mockResolvedValue({} as any);

      await service.requestOverride(baseRequest);

      expect(prisma.priceOverride.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cashierName: 'Unknown',
        }),
      });
    });

    it('should warn on large discount (>50%)', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const largeDiscountRequest = {
        ...baseRequest,
        originalPrice: 100.0,
        overridePrice: 40.0, // 60% discount
      };

      pinAuth.authenticateByPin.mockResolvedValue(mockManager as any);
      pinAuth.validateManagerRole.mockResolvedValue(true);
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.priceOverride.create.mockResolvedValue({
        id: 'override-1',
        managerName: 'John Manager',
      } as any);
      prisma.transactionItem.update.mockResolvedValue({} as any);
      prisma.transaction.update.mockResolvedValue({} as any);

      await service.requestOverride(largeDiscountRequest);

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('60.0% discount'));

      consoleWarnSpy.mockRestore();
    });

    it('should allow zero price override', async () => {
      const zeroRequest = {
        ...baseRequest,
        overridePrice: 0,
      };

      pinAuth.authenticateByPin.mockResolvedValue(mockManager as any);
      pinAuth.validateManagerRole.mockResolvedValue(true);
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.priceOverride.create.mockResolvedValue({
        id: 'override-1',
        managerName: 'John Manager',
      } as any);
      prisma.transactionItem.update.mockResolvedValue({} as any);
      prisma.transaction.update.mockResolvedValue({} as any);

      const result = await service.requestOverride(zeroRequest);

      expect(result.newPrice).toBe(0);
    });

    it('should handle price increase', async () => {
      const increaseRequest = {
        ...baseRequest,
        originalPrice: 40.0,
        overridePrice: 50.0, // Price increase
      };

      pinAuth.authenticateByPin.mockResolvedValue(mockManager as any);
      pinAuth.validateManagerRole.mockResolvedValue(true);
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.priceOverride.create.mockResolvedValue({
        id: 'override-1',
        managerName: 'John Manager',
      } as any);
      prisma.transactionItem.update.mockResolvedValue({} as any);
      prisma.transaction.update.mockResolvedValue({} as any);

      const result = await service.requestOverride(increaseRequest);

      expect(result.newPrice).toBe(50.0);
    });
  });

  describe('getTransactionOverrides', () => {
    it('should return all overrides for transaction', async () => {
      const mockOverrides = [
        {
          id: 'override-1',
          transactionId: 'txn-1',
          originalPrice: 50.0,
          overridePrice: 40.0,
          reason: 'PRICE_MATCH',
          approvedAt: new Date(),
        },
        {
          id: 'override-2',
          transactionId: 'txn-1',
          originalPrice: 30.0,
          overridePrice: 25.0,
          reason: 'DAMAGED',
          approvedAt: new Date(),
        },
      ];

      prisma.priceOverride.findMany.mockResolvedValue(mockOverrides as any);

      const result = await service.getTransactionOverrides('txn-1');

      expect(result).toEqual(mockOverrides);
      expect(prisma.priceOverride.findMany).toHaveBeenCalledWith({
        where: { transactionId: 'txn-1' },
        orderBy: { approvedAt: 'desc' },
      });
    });

    it('should return empty array for transaction without overrides', async () => {
      prisma.priceOverride.findMany.mockResolvedValue([]);

      const result = await service.getTransactionOverrides('txn-1');

      expect(result).toEqual([]);
    });
  });

  describe('getManagerOverrideStats', () => {
    it('should return override statistics', async () => {
      const mockOverrides = [
        {
          id: 'override-1',
          originalPrice: 100.0,
          overridePrice: 80.0,
          reason: 'PRICE_MATCH',
          approvedAt: new Date(),
        },
        {
          id: 'override-2',
          originalPrice: 50.0,
          overridePrice: 40.0,
          reason: 'DAMAGED',
          approvedAt: new Date(),
        },
        {
          id: 'override-3',
          originalPrice: 30.0,
          overridePrice: 25.0,
          reason: 'PRICE_MATCH',
          approvedAt: new Date(),
        },
      ];

      prisma.priceOverride.findMany.mockResolvedValue(mockOverrides as any);

      const result = await service.getManagerOverrideStats('mgr-1', 30);

      expect(result).toEqual({
        totalOverrides: 3,
        totalDiscount: 35.0, // (100-80) + (50-40) + (30-25)
        averageDiscount: 11.67, // 35 / 3 (rounded)
        reasonBreakdown: {
          PRICE_MATCH: 2,
          DAMAGED: 1,
        },
      });
    });

    it('should filter by date range', async () => {
      prisma.priceOverride.findMany.mockResolvedValue([]);

      await service.getManagerOverrideStats('mgr-1', 7);

      const callArgs = prisma.priceOverride.findMany.mock.calls[0][0];
      expect(callArgs.where.approvedAt.gte).toBeInstanceOf(Date);
    });

    it('should return zero values when no overrides', async () => {
      prisma.priceOverride.findMany.mockResolvedValue([]);

      const result = await service.getManagerOverrideStats('mgr-1', 30);

      expect(result).toEqual({
        totalOverrides: 0,
        totalDiscount: 0,
        averageDiscount: 0,
        reasonBreakdown: {},
      });
    });

    it('should handle custom date ranges', async () => {
      prisma.priceOverride.findMany.mockResolvedValue([]);

      await service.getManagerOverrideStats('mgr-1', 90);

      expect(prisma.priceOverride.findMany).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small price differences', async () => {
      const request = {
        ...baseRequest,
        originalPrice: 10.01,
        overridePrice: 10.0,
      };

      pinAuth.authenticateByPin.mockResolvedValue(mockManager as any);
      pinAuth.validateManagerRole.mockResolvedValue(true);
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.priceOverride.create.mockResolvedValue({
        id: 'override-1',
        managerName: 'John Manager',
      } as any);
      prisma.transactionItem.update.mockResolvedValue({} as any);
      prisma.transaction.update.mockResolvedValue({} as any);

      const result = await service.requestOverride(request);

      expect(result.newPrice).toBe(10.0);
    });

    it('should handle very large prices', async () => {
      const request = {
        ...baseRequest,
        originalPrice: 9999.99,
        overridePrice: 8888.88,
      };

      pinAuth.authenticateByPin.mockResolvedValue(mockManager as any);
      pinAuth.validateManagerRole.mockResolvedValue(true);
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.priceOverride.create.mockResolvedValue({
        id: 'override-1',
        managerName: 'John Manager',
      } as any);
      prisma.transactionItem.update.mockResolvedValue({} as any);
      prisma.transaction.update.mockResolvedValue({} as any);

      const result = await service.requestOverride(request);

      expect(result.newPrice).toBe(8888.88);
    });

    it('should handle items with quantity > 1', async () => {
      const transactionWithMultipleItems = {
        ...mockTransaction,
        items: [
          {
            ...mockTransaction.items[0],
            quantity: 5,
            total: 250.0, // 50.0 * 5
          },
        ],
      };

      pinAuth.authenticateByPin.mockResolvedValue(mockManager as any);
      pinAuth.validateManagerRole.mockResolvedValue(true);
      prisma.transaction.findUnique.mockResolvedValue(transactionWithMultipleItems as any);
      prisma.priceOverride.create.mockResolvedValue({
        id: 'override-1',
        managerName: 'John Manager',
      } as any);
      prisma.transactionItem.update.mockResolvedValue({} as any);
      prisma.transaction.update.mockResolvedValue({} as any);

      await service.requestOverride(baseRequest);

      expect(prisma.transactionItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          total: 200.0, // 40.0 * 5
        }),
      });
    });
  });
});
