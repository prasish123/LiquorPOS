import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockPrismaService = {
    inventory: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    eventLog: {
      create: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create inventory successfully', async () => {
      const createDto = {
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 100,
        reserved: 0,
        reorderPoint: 10,
      };

      const expectedResult = {
        id: 'inv-1',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.inventory.findUnique.mockResolvedValue(null);
      mockPrismaService.inventory.create.mockResolvedValue(expectedResult);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(prisma.inventory.create).toHaveBeenCalledWith({
        data: {
          productId: createDto.productId,
          locationId: createDto.locationId,
          quantity: createDto.quantity,
          reserved: 0,
          reorderPoint: createDto.reorderPoint,
        },
        include: {
          product: true,
          location: true,
        },
      });
    });

    it('should throw error if inventory already exists', async () => {
      const createDto = {
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 100,
      };

      mockPrismaService.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        ...createDto,
      });

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reserve', () => {
    it('should reserve inventory successfully', async () => {
      const mockInventory = {
        id: 'inv-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 100,
        reserved: 10,
      };

      mockPrismaService.inventory.findUnique.mockResolvedValue(mockInventory);
      mockPrismaService.inventory.update.mockResolvedValue({
        ...mockInventory,
        reserved: 15,
      });

      const result = await service.reserve('prod-1', 'loc-1', 5);

      expect(result.reserved).toBe(15);
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { reserved: 15 },
      });
    });

    it('should throw error when insufficient inventory', async () => {
      const mockInventory = {
        id: 'inv-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 100,
        reserved: 95,
      };

      mockPrismaService.inventory.findUnique.mockResolvedValue(mockInventory);

      await expect(service.reserve('prod-1', 'loc-1', 10)).rejects.toThrow(
        'Insufficient inventory available',
      );
    });

    it('should throw error when inventory not found', async () => {
      mockPrismaService.inventory.findUnique.mockResolvedValue(null);

      await expect(service.reserve('prod-1', 'loc-1', 5)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('release', () => {
    it('should release reserved inventory', async () => {
      const mockInventory = {
        id: 'inv-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 100,
        reserved: 10,
      };

      mockPrismaService.inventory.findUnique.mockResolvedValue(mockInventory);
      mockPrismaService.inventory.update.mockResolvedValue({
        ...mockInventory,
        reserved: 5,
      });

      const result = await service.release('prod-1', 'loc-1', 5);

      expect(result.reserved).toBe(5);
    });

    it('should not go below zero when releasing', async () => {
      const mockInventory = {
        id: 'inv-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 100,
        reserved: 3,
      };

      mockPrismaService.inventory.findUnique.mockResolvedValue(mockInventory);
      mockPrismaService.inventory.update.mockResolvedValue({
        ...mockInventory,
        reserved: 0,
      });

      const result = await service.release('prod-1', 'loc-1', 10);

      expect(result.reserved).toBe(0);
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { reserved: 0 },
      });
    });
  });

  describe('commit', () => {
    it('should commit reserved inventory', async () => {
      const mockInventory = {
        id: 'inv-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 100,
        reserved: 10,
      };

      mockPrismaService.inventory.findUnique.mockResolvedValue(mockInventory);
      mockPrismaService.inventory.update.mockResolvedValue({
        ...mockInventory,
        quantity: 95,
        reserved: 5,
      });

      const result = await service.commit('prod-1', 'loc-1', 5);

      expect(result.quantity).toBe(95);
      expect(result.reserved).toBe(5);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'inventory.updated',
        expect.objectContaining({
          inventoryId: 'inv-1',
          productId: 'prod-1',
          locationId: 'loc-1',
          quantityChange: -5,
        }),
      );
    });
  });

  describe('getLowStock', () => {
    it('should return items below reorder point', async () => {
      const mockInventory = [
        {
          id: 'inv-1',
          productId: 'prod-1',
          quantity: 5,
          reorderPoint: 10,
          product: { name: 'Product 1' },
          location: { name: 'Location 1' },
        },
        {
          id: 'inv-2',
          productId: 'prod-2',
          quantity: 15,
          reorderPoint: 10,
          product: { name: 'Product 2' },
          location: { name: 'Location 1' },
        },
      ];

      mockPrismaService.inventory.findMany.mockResolvedValue(mockInventory);

      const result = await service.getLowStock();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('inv-1');
    });
  });

  describe('adjust', () => {
    it('should adjust inventory and log event', async () => {
      const mockInventory = {
        id: 'inv-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 100,
        product: { name: 'Test Product' },
      };

      const adjustDto = {
        productId: 'prod-1',
        locationId: 'loc-1',
        adjustment: 10,
        reason: 'restock',
      };

      mockPrismaService.inventory.findUnique.mockResolvedValue(mockInventory);
      mockPrismaService.inventory.update.mockResolvedValue({
        ...mockInventory,
        quantity: 110,
      });

      const result = await service.adjust(adjustDto);

      expect(result.quantity).toBe(110);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'inventory.adjusted',
        expect.objectContaining({
          adjustment: 10,
          newQuantity: 110,
          reason: 'restock',
        }),
      );
      expect(prisma.eventLog.create).toHaveBeenCalled();
    });

    it('should throw error when adjustment results in negative inventory', async () => {
      const mockInventory = {
        id: 'inv-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 5,
      };

      const adjustDto = {
        productId: 'prod-1',
        locationId: 'loc-1',
        adjustment: -10,
        reason: 'damage',
      };

      mockPrismaService.inventory.findUnique.mockResolvedValue(mockInventory);

      await expect(service.adjust(adjustDto)).rejects.toThrow(
        'Adjustment would result in negative inventory',
      );
    });
  });
});
