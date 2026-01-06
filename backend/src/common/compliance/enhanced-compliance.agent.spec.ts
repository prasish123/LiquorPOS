import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { EnhancedComplianceAgent } from './enhanced-compliance.agent';
import { PrismaService } from '../../prisma.service';
import { EncryptionService } from '../encryption.service';
import { OrderItemDto } from '../../orders/dto/order.dto';

describe('EnhancedComplianceAgent', () => {
  let agent: EnhancedComplianceAgent;
  let prismaService: PrismaService;
  let encryptionService: EncryptionService;

  const mockPrismaService = {
    location: {
      findUnique: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
  };

  const mockEncryptionService = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedComplianceAgent,
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

    agent = module.get<EnhancedComplianceAgent>(EnhancedComplianceAgent);
    prismaService = module.get<PrismaService>(PrismaService);
    encryptionService = module.get<EncryptionService>(EncryptionService);

    jest.clearAllMocks();
  });

  describe('verifyCompliance', () => {
    const items: OrderItemDto[] = [
      {
        sku: 'WINE-001',
        quantity: 2,
        priceAtSale: 19.99,
      },
    ];

    const locationId = 'loc-001';

    it('should pass for non-age-restricted items', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue({
        id: locationId,
        state: 'FL',
      });

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: false,
      });

      const result = await agent.verifyCompliance(items, locationId);

      expect(result.ageVerified).toBe(true);
      expect(result.requiresAgeVerification).toBe(false);
      expect(result.saleAllowed).toBe(true);
    });

    it('should throw error when location not found', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue(null);

      await expect(agent.verifyCompliance(items, locationId)).rejects.toThrow(BadRequestException);
    });

    it('should enforce state-specific minimum age', async () => {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - 20); // 20 years old

      mockPrismaService.location.findUnique.mockResolvedValue({
        id: locationId,
        state: 'FL',
      });

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
        category: 'wine',
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'cust-001',
        dateOfBirth,
      });

      await expect(agent.verifyCompliance(items, locationId, 'cust-001', true)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(agent.verifyCompliance(items, locationId, 'cust-001', true)).rejects.toThrow(
        'must be at least 21 years old',
      );
    });

    it('should validate ID type for state', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue({
        id: locationId,
        state: 'FL',
      });

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
        category: 'wine',
      });

      const idVerification = {
        idType: 'drivers_license',
        verificationMethod: 'scanner' as const,
      };

      const result = await agent.verifyCompliance(
        items,
        locationId,
        undefined,
        true,
        idVerification,
      );

      expect(result.ageVerified).toBe(true);
      expect(result.idVerification).toEqual(idVerification);
    });

    it('should warn when ID scanning required but not performed', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue({
        id: locationId,
        state: 'NY', // NY requires ID scanning
      });

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
        category: 'wine',
      });

      const idVerification = {
        idType: 'drivers_license',
        verificationMethod: 'manual' as const,
      };

      const result = await agent.verifyCompliance(
        items,
        locationId,
        undefined,
        true,
        idVerification,
      );

      expect(result.warnings.some((w) => w.includes('requires ID scanning'))).toBe(true);
    });

    it('should check time-based restrictions', async () => {
      // This test would need to mock the current time
      // For now, we verify the structure is correct
      mockPrismaService.location.findUnique.mockResolvedValue({
        id: locationId,
        state: 'TX',
      });

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-001',
        sku: 'WINE-001',
        ageRestricted: true,
        category: 'spirits',
      });

      // Test would check Sunday restrictions for spirits in TX
      const result = await agent.verifyCompliance(items, locationId, undefined, true);

      expect(result.stateCode).toBe('TX');
      expect(result.regulation).toBeDefined();
    });
  });

  describe('logComplianceEvent', () => {
    it('should log compliance event with encrypted details', async () => {
      mockEncryptionService.encrypt.mockReturnValue('encrypted-data');
      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'log-001',
      });

      const reportData = {
        transactionId: 'txn-001',
        locationId: 'loc-001',
        stateCode: 'FL',
        timestamp: new Date(),
        ageVerified: true,
        idScanned: true,
        idType: 'drivers_license',
        customerId: 'cust-001',
        customerAge: 25,
        employeeId: 'emp-001',
        productTypes: ['wine'],
        totalAmount: 39.98,
        complianceStatus: 'passed' as const,
        violations: [],
      };

      await agent.logComplianceEvent(reportData);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'COMPLIANCE_CHECK',
          userId: 'emp-001',
          action: 'PASSED',
          resourceId: 'txn-001',
          result: 'success',
        }),
      });

      expect(mockEncryptionService.encrypt).toHaveBeenCalled();
    });

    it('should log failed compliance with violations', async () => {
      mockEncryptionService.encrypt.mockReturnValue('encrypted-data');
      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'log-002',
      });

      const reportData = {
        transactionId: 'txn-002',
        locationId: 'loc-001',
        stateCode: 'FL',
        timestamp: new Date(),
        ageVerified: false,
        idScanned: false,
        customerId: 'cust-002',
        employeeId: 'emp-001',
        productTypes: ['spirits'],
        totalAmount: 49.99,
        complianceStatus: 'failed' as const,
        violations: ['Age not verified'],
      };

      await agent.logComplianceEvent(reportData);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'FAILED',
          result: 'failure',
        }),
      });
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate report with summary and details', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      mockPrismaService.location.findUnique.mockResolvedValue({
        id: 'loc-001',
        state: 'FL',
      });

      mockPrismaService.transaction.findMany.mockResolvedValue([
        {
          id: 'txn-001',
          locationId: 'loc-001',
          ageVerified: true,
          idScanned: true,
          total: 39.98,
          createdAt: new Date('2026-01-15'),
          items: [{ sku: 'WINE-001' }],
          customer: {
            dateOfBirth: new Date('1990-01-01'),
          },
        },
        {
          id: 'txn-002',
          locationId: 'loc-001',
          ageVerified: false,
          idScanned: false,
          total: 49.99,
          createdAt: new Date('2026-01-20'),
          items: [{ sku: 'BEER-001' }],
          customer: null,
        },
      ]);

      mockPrismaService.product.findMany.mockResolvedValue([
        { category: 'wine', ageRestricted: true },
        { category: 'beer', ageRestricted: true },
      ]);

      const report = await agent.generateComplianceReport('loc-001', startDate, endDate);

      expect(report.summary.totalTransactions).toBe(2);
      expect(report.summary.ageVerifiedTransactions).toBe(1);
      expect(report.summary.violations).toBeGreaterThan(0);
      expect(report.details).toHaveLength(2);
    });
  });

  describe('validateStateLicense', () => {
    it('should validate active license', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60); // 60 days from now

      mockPrismaService.location.findUnique.mockResolvedValue({
        id: 'loc-001',
        licenseNumber: 'FL-12345',
        licenseExpiry: futureDate,
      });

      const result = await agent.validateStateLicense('loc-001');

      expect(result.valid).toBe(true);
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when license expires soon', async () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 15); // 15 days from now

      mockPrismaService.location.findUnique.mockResolvedValue({
        id: 'loc-001',
        licenseNumber: 'FL-12345',
        licenseExpiry: soonDate,
      });

      const result = await agent.validateStateLicense('loc-001');

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('expires in'))).toBe(true);
    });

    it('should fail when license is expired', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

      mockPrismaService.location.findUnique.mockResolvedValue({
        id: 'loc-001',
        licenseNumber: 'FL-12345',
        licenseExpiry: pastDate,
      });

      const result = await agent.validateStateLicense('loc-001');

      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('License has expired');
    });

    it('should fail when no license number', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue({
        id: 'loc-001',
        licenseNumber: null,
        licenseExpiry: null,
      });

      const result = await agent.validateStateLicense('loc-001');

      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('No license number on file');
    });
  });
});
