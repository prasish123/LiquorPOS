import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma.service';
import { OrderOrchestrator } from './order-orchestrator';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: jest.Mocked<PrismaService>;
  let orchestrator: jest.Mocked<OrderOrchestrator>;

  const mockOrder = {
    id: 'order-1',
    locationId: 'loc-1',
    terminalId: 'term-1',
    employeeId: 'emp-1',
    customerId: null,
    subtotal: 50.0,
    tax: 3.5,
    discount: 0,
    total: 53.5,
    paymentMethod: 'cash',
    paymentStatus: 'completed',
    channel: 'counter',
    ageVerified: true,
    idempotencyKey: 'idem-1',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        sku: 'WINE-001',
        name: 'Red Wine',
        quantity: 2,
        unitPrice: 25.0,
        total: 50.0,
      },
    ],
    payments: [
      {
        id: 'pay-1',
        method: 'cash',
        amount: 53.5,
        status: 'captured',
      },
    ],
    location: {
      id: 'loc-1',
      name: 'Store 1',
      address: '123 Main St',
      city: 'Miami',
      state: 'FL',
      zip: '33101',
    },
    customer: null,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      transaction: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockOrderOrchestrator = {
      processOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OrderOrchestrator, useValue: mockOrderOrchestrator },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get(PrismaService);
    orchestrator = module.get(OrderOrchestrator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create order via orchestrator', async () => {
      const createDto: CreateOrderDto = {
        locationId: 'loc-1',
        terminalId: 'term-1',
        items: [{ sku: 'WINE-001', quantity: 2 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: 'idem-1',
      };

      orchestrator.processOrder.mockResolvedValue(mockOrder as any);

      const result = await service.create(createDto);

      expect(result).toEqual(mockOrder);
      expect(orchestrator.processOrder).toHaveBeenCalledWith(createDto);
    });

    it('should propagate orchestrator errors', async () => {
      const createDto: CreateOrderDto = {
        locationId: 'loc-1',
        items: [{ sku: 'INVALID', quantity: 1 }],
        paymentMethod: 'cash',
        channel: 'counter',
        ageVerified: true,
        idempotencyKey: 'idem-2',
      };

      orchestrator.processOrder.mockRejectedValue(new Error('Product not found'));

      await expect(service.create(createDto)).rejects.toThrow('Product not found');
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const orders = [mockOrder, { ...mockOrder, id: 'order-2' }];

      prisma.transaction.findMany.mockResolvedValue(orders as any);
      prisma.transaction.count.mockResolvedValue(2);

      const result = await service.findAll(1, 50);

      expect(result).toEqual({
        data: orders,
        meta: {
          page: 1,
          limit: 50,
          total: 2,
          totalPages: 1,
        },
      });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 50,
        include: {
          items: true,
          location: true,
          customer: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should filter by location', async () => {
      prisma.transaction.findMany.mockResolvedValue([mockOrder] as any);
      prisma.transaction.count.mockResolvedValue(1);

      await service.findAll(1, 50, 'loc-1');

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { locationId: 'loc-1' },
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      prisma.transaction.findMany.mockResolvedValue([mockOrder] as any);
      prisma.transaction.count.mockResolvedValue(100);

      const result = await service.findAll(3, 20);

      expect(result.meta).toEqual({
        page: 3,
        limit: 20,
        total: 100,
        totalPages: 5,
      });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3-1) * 20
          take: 20,
        }),
      );
    });

    it('should handle empty results', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const result = await service.findAll(1, 50);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return order by ID', async () => {
      prisma.transaction.findUnique.mockResolvedValue(mockOrder as any);

      const result = await service.findOne('order-1');

      expect(result).toEqual(mockOrder);
      expect(prisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        include: {
          items: true,
          payments: true,
          location: true,
          customer: true,
        },
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.findOne('order-999')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('order-999')).rejects.toThrow(
        'Order with ID order-999 not found',
      );
    });
  });

  describe('update', () => {
    it('should update order', async () => {
      const updateDto: UpdateOrderDto = {
        paymentStatus: 'refunded',
      };

      const updatedOrder = { ...mockOrder, paymentStatus: 'refunded' };

      prisma.transaction.findUnique.mockResolvedValue(mockOrder as any);
      prisma.transaction.update.mockResolvedValue(updatedOrder as any);

      const result = await service.update('order-1', updateDto);

      expect(result.paymentStatus).toBe('refunded');
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: updateDto,
        include: {
          items: true,
          payments: true,
        },
      });
    });

    it('should throw NotFoundException when updating non-existent order', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.update('order-999', { paymentStatus: 'refunded' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByDateRange', () => {
    it('should return orders within date range', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      prisma.transaction.findMany.mockResolvedValue([mockOrder] as any);

      const result = await service.findByDateRange(startDate, endDate);

      expect(result).toEqual([mockOrder]);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          items: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should filter by location and date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      prisma.transaction.findMany.mockResolvedValue([mockOrder] as any);

      await service.findByDateRange(startDate, endDate, 'loc-1');

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
            locationId: 'loc-1',
          },
        }),
      );
    });

    it('should handle empty date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-01');

      prisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.findByDateRange(startDate, endDate);

      expect(result).toEqual([]);
    });
  });

  describe('getDailySummary', () => {
    it('should calculate daily summary', async () => {
      const date = new Date('2024-01-15');
      const orders = [
        mockOrder,
        {
          ...mockOrder,
          id: 'order-2',
          total: 100.0,
          tax: 7.0,
          discount: 5.0,
          items: [{ id: 'item-2' }, { id: 'item-3' }],
        },
      ];

      prisma.transaction.findMany.mockResolvedValue(orders as any);

      const result = await service.getDailySummary(date);

      expect(result).toEqual({
        date: '2024-01-15',
        totalOrders: 2,
        totalRevenue: 153.5, // 53.5 + 100.0
        totalTax: 10.5, // 3.5 + 7.0
        totalDiscount: 5.0,
        averageOrderValue: 76.75, // 153.5 / 2
        itemsSold: 3, // 1 + 2 items
      });
    });

    it('should filter by location', async () => {
      const date = new Date('2024-01-15');

      prisma.transaction.findMany.mockResolvedValue([mockOrder] as any);

      await service.getDailySummary(date, 'loc-1');

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          locationId: 'loc-1',
        }),
        include: {
          items: true,
        },
      });
    });

    it('should only include completed orders', async () => {
      const date = new Date('2024-01-15');

      prisma.transaction.findMany.mockResolvedValue([mockOrder] as any);

      await service.getDailySummary(date);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          paymentStatus: 'completed',
        }),
        include: {
          items: true,
        },
      });
    });

    it('should handle day with no orders', async () => {
      const date = new Date('2024-01-15');

      prisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.getDailySummary(date);

      expect(result).toEqual({
        date: '2024-01-15',
        totalOrders: 0,
        totalRevenue: 0,
        totalTax: 0,
        totalDiscount: 0,
        averageOrderValue: 0,
        itemsSold: 0,
      });
    });

    it('should set correct date boundaries', async () => {
      const date = new Date('2024-01-15T14:30:00Z');

      prisma.transaction.findMany.mockResolvedValue([]);

      await service.getDailySummary(date);

      const callArgs = prisma.transaction.findMany.mock.calls[0][0];
      const where = callArgs.where;

      // Start of day
      expect(where.createdAt.gte.getHours()).toBe(0);
      expect(where.createdAt.gte.getMinutes()).toBe(0);
      expect(where.createdAt.gte.getSeconds()).toBe(0);

      // End of day
      expect(where.createdAt.lte.getHours()).toBe(23);
      expect(where.createdAt.lte.getMinutes()).toBe(59);
      expect(where.createdAt.lte.getSeconds()).toBe(59);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large page numbers', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(100);

      const result = await service.findAll(1000, 50);

      expect(result.data).toEqual([]);
      expect(result.meta.page).toBe(1000);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 49950, // (1000-1) * 50
        }),
      );
    });
  });
});
