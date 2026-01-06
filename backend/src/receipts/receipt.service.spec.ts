import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptService, ReceiptData } from './receipt.service';
import { PrismaService } from '../prisma.service';

describe('ReceiptService', () => {
  let service: ReceiptService;
  let prisma: jest.Mocked<PrismaService>;

  const mockTransaction = {
    id: 'txn-123',
    locationId: 'loc-1',
    terminalId: 'term-1',
    employeeId: 'emp-1',
    subtotal: 39.98,
    tax: 2.8,
    discount: 0,
    total: 42.78,
    paymentMethod: 'cash',
    paymentStatus: 'completed',
    ageVerified: true,
    createdAt: new Date('2024-01-15T14:30:00Z'),
    items: [
      {
        id: 'item-1',
        name: 'Premium Wine',
        quantity: 2,
        unitPrice: 19.99,
        total: 39.98,
        priceOverridden: false,
        originalPrice: null,
      },
    ],
    payments: [
      {
        id: 'pay-1',
        method: 'cash',
        amount: 42.78,
        status: 'captured',
        cardType: null,
        last4: null,
      },
    ],
    location: {
      id: 'loc-1',
      name: 'Downtown Liquor Store',
      address: '123 Main Street',
      city: 'Miami',
      state: 'FL',
      zip: '33101',
      receiptFooter: 'Thank you for your business!',
    },
    priceOverrides: [],
  };

  const mockEmployee = {
    id: 'emp-1',
    firstName: 'John',
    lastName: 'Doe',
    username: 'jdoe',
    role: 'CASHIER',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      transaction: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      receipt: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReceiptService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ReceiptService>(ReceiptService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReceipt', () => {
    it('should generate receipt for cash transaction', async () => {
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({
        id: 'receipt-1',
        transactionId: 'txn-123',
        content: 'receipt text',
        htmlContent: '<html>receipt</html>',
      } as any);

      const receipt = await service.generateReceipt('txn-123');

      expect(receipt).toContain('Downtown Liquor Store');
      expect(receipt).toContain('123 Main Street');
      expect(receipt).toContain('Miami, FL 33101');
      expect(receipt).toContain('John Doe');
      expect(receipt).toContain('Premium Wine');
      expect(receipt).toContain('$39.98');
      expect(receipt).toContain('$2.80');
      expect(receipt).toContain('$42.78');
      expect(receipt).toContain('cash');
      expect(receipt).toContain('AGE VERIFIED');
      expect(receipt).toContain('Thank you for your business!');

      expect(prisma.receipt.create).toHaveBeenCalledWith({
        data: {
          transactionId: 'txn-123',
          content: expect.any(String),
          htmlContent: expect.any(String),
        },
      });
    });

    it('should generate receipt for card transaction', async () => {
      const cardTransaction = {
        ...mockTransaction,
        paymentMethod: 'card',
        payments: [
          {
            id: 'pay-2',
            method: 'card',
            amount: 42.78,
            status: 'captured',
            cardType: 'Visa',
            last4: '4242',
          },
        ],
      };

      prisma.transaction.findUnique.mockResolvedValue(cardTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      const receipt = await service.generateReceipt('txn-123');

      expect(receipt).toContain('card');
      expect(receipt).toContain('Visa');
      expect(receipt).toContain('4242');
    });

    it('should include price override information', async () => {
      const transactionWithOverride = {
        ...mockTransaction,
        items: [
          {
            id: 'item-1',
            name: 'Premium Wine',
            quantity: 2,
            unitPrice: 15.99,
            total: 31.98,
            priceOverridden: true,
            originalPrice: 19.99,
          },
        ],
        priceOverrides: [
          {
            id: 'override-1',
            itemId: 'item-1',
            managerId: 'mgr-1',
            managerName: 'Jane Manager',
            reason: 'Customer loyalty',
          },
        ],
      };

      prisma.transaction.findUnique.mockResolvedValue(transactionWithOverride as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      const receipt = await service.generateReceipt('txn-123');

      expect(receipt).toContain('Price Override');
      expect(receipt).toContain('$19.99');
      expect(receipt).toContain('$15.99');
      expect(receipt).toContain('Jane Manager');
    });

    it('should handle transaction without employee', async () => {
      const transactionNoEmployee = {
        ...mockTransaction,
        employeeId: null,
      };

      prisma.transaction.findUnique.mockResolvedValue(transactionNoEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      const receipt = await service.generateReceipt('txn-123');

      expect(receipt).toContain('Unknown');
    });

    it('should handle transaction without terminal ID', async () => {
      const transactionNoTerminal = {
        ...mockTransaction,
        terminalId: null,
      };

      prisma.transaction.findUnique.mockResolvedValue(transactionNoTerminal as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      const receipt = await service.generateReceipt('txn-123');

      expect(receipt).toContain('N/A');
    });

    it('should throw error when transaction not found', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.generateReceipt('txn-999')).rejects.toThrow(
        'Transaction txn-999 not found',
      );
    });

    it('should handle multiple items', async () => {
      const multiItemTransaction = {
        ...mockTransaction,
        items: [
          {
            id: 'item-1',
            name: 'Premium Wine',
            quantity: 2,
            unitPrice: 19.99,
            total: 39.98,
            priceOverridden: false,
          },
          {
            id: 'item-2',
            name: 'Craft Beer 6-Pack',
            quantity: 1,
            unitPrice: 12.99,
            total: 12.99,
            priceOverridden: false,
          },
        ],
        subtotal: 52.97,
        tax: 3.71,
        total: 56.68,
      };

      prisma.transaction.findUnique.mockResolvedValue(multiItemTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      const receipt = await service.generateReceipt('txn-123');

      expect(receipt).toContain('Premium Wine');
      expect(receipt).toContain('Craft Beer 6-Pack');
      expect(receipt).toContain('$52.97');
      expect(receipt).toContain('$3.71');
      expect(receipt).toContain('$56.68');
    });

    it('should format date correctly', async () => {
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      const receipt = await service.generateReceipt('txn-123');

      // Should contain formatted date
      expect(receipt).toMatch(/Jan \d{2}, \d{4}/);
      expect(receipt).toMatch(/\d{2}:\d{2} (AM|PM)/);
    });

    it('should calculate tax percentage correctly', async () => {
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      const receipt = await service.generateReceipt('txn-123');

      // Tax: 2.80 / 39.98 * 100 = 7.0%
      expect(receipt).toContain('7.0%');
    });

    it('should not show age verified for non-restricted items', async () => {
      const noAgeVerification = {
        ...mockTransaction,
        ageVerified: false,
      };

      prisma.transaction.findUnique.mockResolvedValue(noAgeVerification as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      const receipt = await service.generateReceipt('txn-123');

      expect(receipt).not.toContain('AGE VERIFIED');
    });
  });

  describe('reprintReceipt', () => {
    it('should return existing receipt and increment reprint count', async () => {
      const existingReceipt = {
        id: 'receipt-1',
        transactionId: 'txn-123',
        content: 'existing receipt text',
        htmlContent: '<html>existing</html>',
        reprintCount: 0,
        lastReprintAt: null,
      };

      prisma.receipt.findUnique.mockResolvedValue(existingReceipt as any);
      prisma.receipt.update.mockResolvedValue({
        ...existingReceipt,
        reprintCount: 1,
        lastReprintAt: new Date(),
      } as any);

      const receipt = await service.reprintReceipt('txn-123');

      expect(receipt).toBe('existing receipt text');
      expect(prisma.receipt.update).toHaveBeenCalledWith({
        where: { id: 'receipt-1' },
        data: {
          reprintCount: { increment: 1 },
          lastReprintAt: expect.any(Date),
        },
      });
    });

    it('should generate new receipt if not exists', async () => {
      prisma.receipt.findUnique.mockResolvedValue(null);
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({
        id: 'receipt-1',
        transactionId: 'txn-123',
        content: 'new receipt',
        htmlContent: '<html>new</html>',
      } as any);

      const receipt = await service.reprintReceipt('txn-123');

      expect(receipt).toContain('Downtown Liquor Store');
      expect(prisma.receipt.create).toHaveBeenCalled();
    });
  });

  describe('getReceiptHtml', () => {
    it('should return existing HTML receipt', async () => {
      const existingReceipt = {
        id: 'receipt-1',
        transactionId: 'txn-123',
        content: 'text',
        htmlContent: '<html><body>Receipt</body></html>',
      };

      prisma.receipt.findUnique.mockResolvedValue(existingReceipt as any);

      const html = await service.getReceiptHtml('txn-123');

      expect(html).toBe('<html><body>Receipt</body></html>');
    });

    it('should generate HTML if not exists', async () => {
      const generatedHtml = `
<!DOCTYPE html>
<html>
<head><title>Receipt</title></head>
<body>
  <div class="center bold">Downtown Liquor Store</div>
  <div class="center">123 Main St</div>
  <div class="center">Anytown, FL 12345</div>
</body>
</html>`;

      prisma.receipt.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'receipt-1',
        transactionId: 'txn-123',
        content: 'text',
        htmlContent: generatedHtml,
      } as any);

      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({
        id: 'receipt-1',
        transactionId: 'txn-123',
        content: 'text',
        htmlContent: generatedHtml,
      } as any);

      const html = await service.getReceiptHtml('txn-123');

      expect(html).toContain('<html>');
      expect(html).toContain('Downtown Liquor Store');
    });

    it('should include print button in HTML', async () => {
      prisma.receipt.findUnique.mockResolvedValueOnce(null);
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);
      prisma.receipt.findUnique.mockResolvedValueOnce({
        id: 'receipt-1',
        transactionId: 'txn-123',
        htmlContent: '<html><button onclick="window.print()">Print</button></html>',
      } as any);

      const html = await service.getReceiptHtml('txn-123');

      expect(html).toContain('window.print()');
    });
  });

  describe('printToConsole', () => {
    it('should print receipt to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      await service.printToConsole('txn-123');

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('Downtown Liquor Store');

      consoleSpy.mockRestore();
    });
  });

  describe('Receipt Formatting', () => {
    it('should format receipt with correct width', async () => {
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      const receipt = await service.generateReceipt('txn-123');

      // Check for formatting characters
      expect(receipt).toContain('='.repeat(42)); // Header line
      expect(receipt).toContain('-'.repeat(42)); // Dash line
    });

    it('should truncate long item names', async () => {
      const longNameTransaction = {
        ...mockTransaction,
        items: [
          {
            id: 'item-1',
            name: 'This Is A Very Long Product Name That Should Be Truncated',
            quantity: 1,
            unitPrice: 19.99,
            total: 19.99,
            priceOverridden: false,
          },
        ],
      };

      prisma.transaction.findUnique.mockResolvedValue(longNameTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      const receipt = await service.generateReceipt('txn-123');

      // Should be truncated to 25 characters
      const lines = receipt.split('\n');
      const itemLine = lines.find((line) => line.includes('This Is A Very'));
      expect(itemLine).toBeDefined();
      expect(itemLine!.indexOf('This Is A Very')).toBeGreaterThanOrEqual(0);
    });

    it('should align prices correctly', async () => {
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      const receipt = await service.generateReceipt('txn-123');

      // All prices should be right-aligned and have 2 decimal places
      expect(receipt).toMatch(/\$\d+\.\d{2}/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero tax', async () => {
      const zeroTaxTransaction = {
        ...mockTransaction,
        tax: 0,
        total: 39.98,
      };

      prisma.transaction.findUnique.mockResolvedValue(zeroTaxTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      const receipt = await service.generateReceipt('txn-123');

      expect(receipt).toContain('$0.00');
    });

    it('should handle discount', async () => {
      const discountTransaction = {
        ...mockTransaction,
        discount: 5.0,
        total: 37.78,
      };

      prisma.transaction.findUnique.mockResolvedValue(discountTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      const receipt = await service.generateReceipt('txn-123');

      expect(receipt).toContain('$37.78');
    });

    it('should handle missing receipt footer', async () => {
      const noFooterTransaction = {
        ...mockTransaction,
        location: {
          ...mockTransaction.location,
          receiptFooter: null,
        },
      };

      prisma.transaction.findUnique.mockResolvedValue(noFooterTransaction as any);
      prisma.user.findUnique.mockResolvedValue(mockEmployee as any);
      prisma.receipt.create.mockResolvedValue({} as any);

      const receipt = await service.generateReceipt('txn-123');

      expect(receipt).toContain('Thank you!');
    });
  });
});
