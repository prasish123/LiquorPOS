import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ComplianceAgent } from './compliance.agent';
import { PrismaService } from '../../prisma.service';
import { EncryptionService } from '../../common/encryption.service';
import { OrderItemDto } from '../dto/order.dto';

describe('ComplianceAgent', () => {
  let agent: ComplianceAgent;
  let prismaService: PrismaService;
  let encryptionService: EncryptionService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockEncryptionService = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceAgent,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    agent = module.get<ComplianceAgent>(ComplianceAgent);
    prismaService = module.get<PrismaService>(PrismaService);
    encryptionService = module.get<EncryptionService>(EncryptionService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('verifyAge', () => {
    const items: OrderItemDto[] = [
      {
        sku: 'WINE-001',
        quantity: 2,
        priceAtSale: 19.99,
      },
    ];

    it('should pass verification for non-age-restricted items', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: false,
      });

      const result = await agent.verifyAge(items);

      expect(result).toEqual({
        ageVerified: true,
        requiresAgeVerification: false,
      });
    });

    it('should throw error when age verification required but not provided', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
      });

      await expect(agent.verifyAge(items)).rejects.toThrow(ForbiddenException);
      await expect(agent.verifyAge(items)).rejects.toThrow(
        'Age verification required for alcohol purchases',
      );
    });

    it('should verify age when ageVerified flag is true and no customer ID', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
      });

      const result = await agent.verifyAge(items, undefined, true);

      expect(result).toEqual({
        ageVerified: true,
        requiresAgeVerification: true,
      });
    });

    it('should verify age with customer record when customer is over 21', async () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 25); // 25 years old

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'cust-001',
        dateOfBirth,
      });

      const result = await agent.verifyAge(items, 'cust-001', true);

      expect(result).toEqual({
        ageVerified: true,
        requiresAgeVerification: true,
        customerId: 'cust-001',
        customerAge: 25,
      });
    });

    it('should throw error when customer is under 21', async () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 18); // 18 years old

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'cust-001',
        dateOfBirth,
      });

      await expect(agent.verifyAge(items, 'cust-001', true)).rejects.toThrow(ForbiddenException);
      await expect(agent.verifyAge(items, 'cust-001', true)).rejects.toThrow(
        'Customer must be at least 21 years old',
      );
    });

    it('should handle customer exactly 21 years old', async () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 21); // Exactly 21 years old

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'cust-001',
        dateOfBirth,
      });

      const result = await agent.verifyAge(items, 'cust-001', true);

      expect(result.ageVerified).toBe(true);
      expect(result.customerAge).toBe(21);
    });

    it('should handle customer turning 21 tomorrow (still 20)', async () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 21);
      dateOfBirth.setDate(dateOfBirth.getDate() + 1); // Birthday is tomorrow

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'cust-001',
        dateOfBirth,
      });

      await expect(agent.verifyAge(items, 'cust-001', true)).rejects.toThrow(ForbiddenException);
    });

    it('should handle customer not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      const result = await agent.verifyAge(items, 'cust-001', true);

      expect(result).toEqual({
        ageVerified: true,
        requiresAgeVerification: true,
      });
    });

    it('should handle customer without dateOfBirth', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'cust-001',
        dateOfBirth: null,
      });

      const result = await agent.verifyAge(items, 'cust-001', true);

      expect(result).toEqual({
        ageVerified: true,
        requiresAgeVerification: true,
      });
    });

    it('should check all items for age restrictions', async () => {
      const multipleItems: OrderItemDto[] = [
        { sku: 'WINE-001', quantity: 2, priceAtSale: 19.99 },
        { sku: 'BEER-001', quantity: 3, priceAtSale: 5.99 },
        { sku: 'CHIPS-001', quantity: 1, priceAtSale: 2.99 },
      ];

      mockPrismaService.product.findUnique
        .mockResolvedValueOnce({
          id: 'prod-001',
          sku: 'WINE-001',
          ageRestricted: false,
        })
        .mockResolvedValueOnce({
          id: 'prod-002',
          sku: 'BEER-001',
          ageRestricted: true, // Second item is age-restricted
        });

      await expect(agent.verifyAge(multipleItems)).rejects.toThrow(ForbiddenException);
    });

    it('should handle mixed age-restricted and non-restricted items', async () => {
      const multipleItems: OrderItemDto[] = [
        { sku: 'CHIPS-001', quantity: 1, priceAtSale: 2.99 },
        { sku: 'WINE-001', quantity: 2, priceAtSale: 19.99 },
      ];

      mockPrismaService.product.findUnique
        .mockResolvedValueOnce({
          id: 'prod-001',
          sku: 'CHIPS-001',
          ageRestricted: false,
        })
        .mockResolvedValueOnce({
          id: 'prod-002',
          sku: 'WINE-001',
          ageRestricted: true,
        });

      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 25);

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'cust-001',
        dateOfBirth,
      });

      const result = await agent.verifyAge(multipleItems, 'cust-001', true);

      expect(result.ageVerified).toBe(true);
      expect(result.requiresAgeVerification).toBe(true);
    });

    it('should handle age calculation on leap year birthday', async () => {
      // Test edge case: birthday on Feb 29
      const dateOfBirth = new Date('2000-02-29'); // Leap year birthday
      const now = new Date('2021-02-28'); // Not a leap year, day before

      jest.useFakeTimers();
      jest.setSystemTime(now);

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'cust-001',
        dateOfBirth,
      });

      await expect(agent.verifyAge(items, 'cust-001', true)).rejects.toThrow(ForbiddenException);

      jest.useRealTimers();
    });
  });

  describe('logComplianceEvent', () => {
    it('should log successful age verification', async () => {
      mockEncryptionService.encrypt.mockReturnValue('encrypted-data');
      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'log-001',
      });

      await agent.logComplianceEvent('txn-001', 'cust-001', true, 'emp-001');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'AGE_VERIFICATION',
          userId: 'emp-001',
          action: 'VERIFIED',
          resourceId: 'txn-001',
          result: 'success',
          details: 'encrypted-data',
        },
      });

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
        JSON.stringify({ customerId: 'cust-001' }),
      );
    });

    it('should log failed age verification', async () => {
      mockEncryptionService.encrypt.mockReturnValue('encrypted-data');
      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'log-002',
      });

      await agent.logComplianceEvent('txn-002', 'cust-002', false, 'emp-001');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'AGE_VERIFICATION',
          userId: 'emp-001',
          action: 'FAILED',
          resourceId: 'txn-002',
          result: 'failure',
          details: 'encrypted-data',
        },
      });
    });

    it('should handle undefined customer ID', async () => {
      mockEncryptionService.encrypt.mockReturnValue('encrypted-data');
      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'log-003',
      });

      await agent.logComplianceEvent('txn-003', undefined, true, 'emp-001');

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
        JSON.stringify({ customerId: undefined }),
      );
    });

    it('should handle undefined employee ID', async () => {
      mockEncryptionService.encrypt.mockReturnValue('encrypted-data');
      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'log-004',
      });

      await agent.logComplianceEvent('txn-004', 'cust-001', true, undefined);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: undefined,
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      mockEncryptionService.encrypt.mockReturnValue('encrypted-data');
      mockPrismaService.auditLog.create.mockRejectedValue(new Error('Database error'));

      await expect(
        agent.logComplianceEvent('txn-005', 'cust-001', true, 'emp-001'),
      ).rejects.toThrow('Database error');
    });

    it('should handle encryption errors gracefully', async () => {
      mockEncryptionService.encrypt.mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      await expect(
        agent.logComplianceEvent('txn-006', 'cust-001', true, 'emp-001'),
      ).rejects.toThrow('Encryption failed');
    });
  });

  describe('Integration scenarios', () => {
    it('should complete full compliance flow with logging', async () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 25);

      const items: OrderItemDto[] = [{ sku: 'WINE-001', quantity: 2 }];

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'cust-001',
        dateOfBirth,
      });

      // Verify age
      const result = await agent.verifyAge(items, 'cust-001', true);
      expect(result.ageVerified).toBe(true);

      // Log compliance event
      mockEncryptionService.encrypt.mockReturnValue('encrypted-data');
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'log-001' });

      await agent.logComplianceEvent('txn-001', 'cust-001', true, 'emp-001');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'AGE_VERIFICATION',
          action: 'VERIFIED',
          result: 'success',
        }),
      });
    });

    it('should handle rejection flow with logging', async () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 18); // Under 21

      const items: OrderItemDto[] = [{ sku: 'WINE-001', quantity: 2 }];

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'cust-001',
        dateOfBirth,
      });

      // Verify age (should fail)
      await expect(agent.verifyAge(items, 'cust-001', true)).rejects.toThrow(ForbiddenException);

      // Log failed compliance event
      mockEncryptionService.encrypt.mockReturnValue('encrypted-data');
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'log-002' });

      await agent.logComplianceEvent('txn-002', 'cust-001', false, 'emp-001');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'AGE_VERIFICATION',
          action: 'FAILED',
          result: 'failure',
        }),
      });
    });

    it('should handle multiple compliance checks in sequence', async () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 30);

      const items: OrderItemDto[] = [{ sku: 'WINE-001', quantity: 2 }];

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'cust-001',
        dateOfBirth,
      });

      // Multiple verifications
      const result1 = await agent.verifyAge(items, 'cust-001', true);
      const result2 = await agent.verifyAge(items, 'cust-001', true);
      const result3 = await agent.verifyAge(items, 'cust-001', true);

      expect(result1.ageVerified).toBe(true);
      expect(result2.ageVerified).toBe(true);
      expect(result3.ageVerified).toBe(true);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty items array', async () => {
      const result = await agent.verifyAge([]);

      expect(result).toEqual({
        ageVerified: true,
        requiresAgeVerification: false,
      });
    });

    it('should handle product not found', async () => {
      const items: OrderItemDto[] = [{ sku: 'NONEXISTENT', quantity: 1 }];

      mockPrismaService.product.findUnique.mockResolvedValue(null);

      const result = await agent.verifyAge(items);

      expect(result).toEqual({
        ageVerified: true,
        requiresAgeVerification: false,
      });
    });

    it('should handle very old customer (100+ years)', async () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 105);

      const items: OrderItemDto[] = [{ sku: 'WINE-001', quantity: 1 }];

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'cust-001',
        dateOfBirth,
      });

      const result = await agent.verifyAge(items, 'cust-001', true);

      expect(result.ageVerified).toBe(true);
      expect(result.customerAge).toBe(105);
    });

    it('should handle invalid date of birth (future date)', async () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() + 1); // Future date

      const items: OrderItemDto[] = [{ sku: 'WINE-001', quantity: 1 }];

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'cust-001',
        dateOfBirth,
      });

      await expect(agent.verifyAge(items, 'cust-001', true)).rejects.toThrow(ForbiddenException);
    });
  });
});
