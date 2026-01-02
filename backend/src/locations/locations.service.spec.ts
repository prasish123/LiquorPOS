import { Test, TestingModule } from '@nestjs/testing';
import { LocationsService } from './locations.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('LocationsService', () => {
  let service: LocationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    location: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    transaction: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a location successfully', async () => {
      const createDto = {
        name: 'Main Store',
        address: '123 Main St',
        city: 'Miami',
        state: 'FL',
        zip: '33101',
        licenseNumber: 'FL-LIQ-12345',
        licenseExpiry: '2026-12-31',
      };

      const expectedResult = {
        id: 'loc-1',
        ...createDto,
        licenseExpiry: new Date('2026-12-31'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.location.create.mockResolvedValue(expectedResult);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return all locations with inventory and transaction counts', async () => {
      const mockLocations = [
        {
          id: 'loc-1',
          name: 'Main Store',
          inventory: [{ id: 'inv-1', productId: 'prod-1', quantity: 100 }],
          _count: { transactions: 50 },
        },
      ];

      mockPrismaService.location.findMany.mockResolvedValue(mockLocations);

      const result = await service.findAll();

      expect(result).toEqual(mockLocations);
      expect(prisma.location.findMany).toHaveBeenCalledWith({
        include: {
          inventory: {
            select: {
              id: true,
              productId: true,
              quantity: true,
            },
          },
          _count: {
            select: {
              transactions: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
    });
  });

  describe('getExpiringLicenses', () => {
    it('should return locations with licenses expiring within 30 days', async () => {
      const mockLocations = [
        {
          id: 'loc-1',
          name: 'Main Store',
          licenseExpiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        },
      ];

      mockPrismaService.location.findMany.mockResolvedValue(mockLocations);

      const result = await service.getExpiringLicenses();

      expect(result).toEqual(mockLocations);
      expect(prisma.location.findMany).toHaveBeenCalledWith({
        where: {
          licenseExpiry: {
            lte: expect.any(Date) as Date,
            gte: expect.any(Date) as Date,
          },
        },
        orderBy: {
          licenseExpiry: 'asc',
        },
      });
    });
  });

  describe('getExpiredLicenses', () => {
    it('should return locations with expired licenses', async () => {
      const mockLocations = [
        {
          id: 'loc-1',
          name: 'Old Store',
          licenseExpiry: new Date('2020-01-01'),
        },
      ];

      mockPrismaService.location.findMany.mockResolvedValue(mockLocations);

      const result = await service.getExpiredLicenses();

      expect(result).toEqual(mockLocations);
      expect(prisma.location.findMany).toHaveBeenCalledWith({
        where: {
          licenseExpiry: {
            lt: expect.any(Date) as Date,
          },
        },
        orderBy: {
          licenseExpiry: 'desc',
        },
      });
    });
  });

  describe('remove', () => {
    it('should delete location with no transactions', async () => {
      const mockLocation = { id: 'loc-1', name: 'Main Store' };

      mockPrismaService.location.findUnique.mockResolvedValue(mockLocation);
      mockPrismaService.transaction.count.mockResolvedValue(0);
      mockPrismaService.location.delete.mockResolvedValue(mockLocation);

      const result = await service.remove('loc-1');

      expect(result.message).toBe('Location deleted successfully');
    });

    it('should throw error when location has transactions', async () => {
      const mockLocation = { id: 'loc-1', name: 'Main Store' };

      mockPrismaService.location.findUnique.mockResolvedValue(mockLocation);
      mockPrismaService.transaction.count.mockResolvedValue(10);

      await expect(service.remove('loc-1')).rejects.toThrow(
        'Cannot delete location with existing transactions',
      );
    });

    it('should throw NotFoundException when location does not exist', async () => {
      mockPrismaService.location.findUnique.mockResolvedValue(null);

      await expect(service.remove('loc-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
