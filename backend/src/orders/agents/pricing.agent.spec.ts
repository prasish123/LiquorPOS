import { Test, TestingModule } from '@nestjs/testing';
import { PricingAgent } from './pricing.agent';
import { PrismaService } from '../../prisma.service';
import { OrderItemDto } from '../dto/order.dto';

describe('PricingAgent', () => {
  let agent: PricingAgent;
  let prisma: PrismaService;

  const mockProduct = {
    id: 'prod-1',
    sku: 'WINE-001',
    name: 'Test Wine',
    basePrice: 19.99,
    cost: 10.0,
    category: 'wine',
    trackInventory: true,
    ageRestricted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingAgent,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findUnique: jest.fn(),
            },
            location: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    agent = module.get<PricingAgent>(PricingAgent);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('calculate', () => {
    const orderItems: OrderItemDto[] = [
      {
        sku: 'WINE-001',
        quantity: 2,
      },
    ];

    beforeEach(() => {
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct);
    });

    it('should calculate pricing with default tax rate when no locationId provided', async () => {
      const result = await agent.calculate(orderItems);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        sku: 'WINE-001',
        name: 'Test Wine',
        quantity: 2,
        unitPrice: 19.99,
        discount: 0,
      });

      // Subtotal: 19.99 * 2 = 39.98
      expect(result.subtotal).toBe(39.98);

      // Tax: 39.98 * 0.07 = 2.80 (rounded)
      expect(result.totalTax).toBe(2.8);

      // Total: 39.98 + 2.80 = 42.78
      expect(result.total).toBe(42.78);
    });

    it('should calculate pricing with location-specific tax rate', async () => {
      const locationId = 'loc-miami';

      // Miami-Dade County: 7% state + 1% county = 8%
      jest.spyOn(prisma.location, 'findUnique').mockResolvedValue({
        id: locationId,
        name: 'Miami Store',
        address: '123 Main St',
        city: 'Miami',
        state: 'FL',
        zip: '33101',
        taxRate: 0.07, // State tax
        countyTaxRate: 0.01, // County tax
        licenseNumber: 'FL-12345',
        licenseExpiry: new Date('2025-12-31'),
        createdAt: new Date(),
      });

      const result = await agent.calculate(orderItems, locationId);

      // Subtotal: 19.99 * 2 = 39.98
      expect(result.subtotal).toBe(39.98);

      // Tax: 39.98 * 0.08 = 3.20 (rounded)
      expect(result.totalTax).toBe(3.2);

      // Total: 39.98 + 3.20 = 43.18
      expect(result.total).toBe(43.18);

      expect(prisma.location.findUnique).toHaveBeenCalledWith({
        where: { id: locationId },
        select: { taxRate: true, countyTaxRate: true },
      });
    });

    it('should use default tax rate when location not found', async () => {
      const locationId = 'loc-nonexistent';

      jest.spyOn(prisma.location, 'findUnique').mockResolvedValue(null);

      const result = await agent.calculate(orderItems, locationId);

      // Should fall back to default 7% tax
      expect(result.totalTax).toBe(2.8);
      expect(result.total).toBe(42.78);
    });

    it('should use default tax rate when database error occurs', async () => {
      const locationId = 'loc-error';

      jest
        .spyOn(prisma.location, 'findUnique')
        .mockRejectedValue(new Error('Database error'));

      const result = await agent.calculate(orderItems, locationId);

      // Should fall back to default 7% tax
      expect(result.totalTax).toBe(2.8);
      expect(result.total).toBe(42.78);
    });

    it('should handle location with only state tax (no county tax)', async () => {
      const locationId = 'loc-orlando';

      // Orange County: 6.5% state only
      jest.spyOn(prisma.location, 'findUnique').mockResolvedValue({
        id: locationId,
        name: 'Orlando Store',
        address: '456 Park Ave',
        city: 'Orlando',
        state: 'FL',
        zip: '32801',
        taxRate: 0.065, // State tax
        countyTaxRate: null, // No county tax
        licenseNumber: 'FL-67890',
        licenseExpiry: new Date('2025-12-31'),
        createdAt: new Date(),
      });

      const result = await agent.calculate(orderItems, locationId);

      // Tax: 39.98 * 0.065 = 2.60 (rounded)
      expect(result.totalTax).toBe(2.6);
      expect(result.total).toBe(42.58);
    });

    it('should calculate pricing for multiple items', async () => {
      const multipleItems: OrderItemDto[] = [
        { sku: 'WINE-001', quantity: 2 },
        { sku: 'BEER-001', quantity: 6 },
      ];

      jest.spyOn(prisma.product, 'findUnique').mockImplementation((args) => {
        if (args?.where?.sku === 'WINE-001') {
          return Promise.resolve(mockProduct);
        }
        if (args?.where?.sku === 'BEER-001') {
          return Promise.resolve({
            ...mockProduct,
            sku: 'BEER-001',
            name: 'Test Beer',
            basePrice: 8.99,
          });
        }
        return Promise.resolve(null);
      });

      const result = await agent.calculate(multipleItems);

      expect(result.items).toHaveLength(2);

      // Wine: 19.99 * 2 = 39.98
      // Beer: 8.99 * 6 = 53.94
      // Subtotal: 93.92
      expect(result.subtotal).toBe(93.92);

      // Tax: 93.92 * 0.07 = 6.57 (rounded)
      expect(result.totalTax).toBe(6.57);

      // Total: 93.92 + 6.57 = 100.49
      expect(result.total).toBe(100.49);
    });

    it('should apply discounts before calculating tax', async () => {
      const itemsWithDiscount: OrderItemDto[] = [
        {
          sku: 'WINE-001',
          quantity: 2,
          discount: 5.0, // $5 off
        },
      ];

      const result = await agent.calculate(itemsWithDiscount);

      // Subtotal: (19.99 * 2) - 5.00 = 34.98
      expect(result.subtotal).toBe(34.98);
      expect(result.totalDiscount).toBe(5.0);

      // Tax: 34.98 * 0.07 = 2.45 (rounded)
      expect(result.totalTax).toBe(2.45);

      // Total: 34.98 + 2.45 = 37.43
      expect(result.total).toBe(37.43);
    });

    it('should throw error when product not found', async () => {
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(null);

      await expect(agent.calculate(orderItems)).rejects.toThrow(
        'Product with SKU WINE-001 not found',
      );
    });

    it('should handle zero tax rate locations', async () => {
      const locationId = 'loc-tax-free';

      // Tax-free zone (hypothetical)
      jest.spyOn(prisma.location, 'findUnique').mockResolvedValue({
        id: locationId,
        name: 'Tax Free Store',
        address: '789 Duty Free Rd',
        city: 'Airport',
        state: 'FL',
        zip: '33000',
        taxRate: 0.0, // No tax
        countyTaxRate: null,
        licenseNumber: 'FL-00000',
        licenseExpiry: new Date('2025-12-31'),
        createdAt: new Date(),
      });

      const result = await agent.calculate(orderItems, locationId);

      // No tax applied
      expect(result.totalTax).toBe(0);
      expect(result.total).toBe(39.98); // Just subtotal
    });

    it('should round tax and total to 2 decimal places', async () => {
      // Create scenario that would result in many decimal places
      const itemsWithOddPricing: OrderItemDto[] = [
        { sku: 'WINE-001', quantity: 3 }, // 19.99 * 3 = 59.97
      ];

      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
        ...mockProduct,
        basePrice: 19.99,
      });

      const result = await agent.calculate(itemsWithOddPricing);

      // Subtotal: 59.97
      expect(result.subtotal).toBe(59.97);

      // Tax: 59.97 * 0.07 = 4.1979 → 4.20 (rounded)
      expect(result.totalTax).toBe(4.2);

      // Total: 59.97 + 4.20 = 64.17
      expect(result.total).toBe(64.17);

      // Verify all values are properly rounded (max 2 decimal places)
      expect(result.subtotal).toBe(parseFloat(result.subtotal.toFixed(2)));
      expect(result.totalTax).toBe(parseFloat(result.totalTax.toFixed(2)));
      expect(result.total).toBe(parseFloat(result.total.toFixed(2)));

      // Verify no more than 2 decimal places
      expect(result.subtotal.toFixed(2)).toBe('59.97');
      expect(result.totalTax.toFixed(2)).toBe('4.20');
      expect(result.total.toFixed(2)).toBe('64.17');
    });

    it('should handle high tax rate locations', async () => {
      const locationId = 'loc-high-tax';

      // High tax location: 7% state + 3% county = 10%
      jest.spyOn(prisma.location, 'findUnique').mockResolvedValue({
        id: locationId,
        name: 'High Tax Store',
        address: '321 Tax St',
        city: 'Taxville',
        state: 'FL',
        zip: '33200',
        taxRate: 0.07,
        countyTaxRate: 0.03,
        licenseNumber: 'FL-11111',
        licenseExpiry: new Date('2025-12-31'),
        createdAt: new Date(),
      });

      const result = await agent.calculate(orderItems, locationId);

      // Tax: 39.98 * 0.10 = 4.00 (rounded)
      expect(result.totalTax).toBe(4.0);
      expect(result.total).toBe(43.98);
    });
  });

  describe('applyPromotions', () => {
    it('should return items unchanged (not yet implemented)', () => {
      const items: OrderItemDto[] = [{ sku: 'WINE-001', quantity: 2 }];
      const result = agent.applyPromotions(items, 'customer-123');
      expect(result).toEqual(items);
    });
  });
});
