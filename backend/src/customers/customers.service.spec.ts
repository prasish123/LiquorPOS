import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';

describe('CustomersService', () => {
    let service: CustomersService;
    let prisma: PrismaService;
    let eventEmitter: EventEmitter2;

    const mockPrismaService = {
        customer: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
        },
        transaction: {
            findMany: jest.fn(),
            count: jest.fn(),
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
                CustomersService,
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

        service = module.get<CustomersService>(CustomersService);
        prisma = module.get<PrismaService>(PrismaService);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);

        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a customer successfully', async () => {
            const createDto = {
                email: 'test@example.com',
                phone: '555-1234',
                firstName: 'John',
                lastName: 'Doe',
            };

            const expectedResult = {
                id: 'cust-1',
                ...createDto,
                loyaltyPoints: 0,
                lifetimeValue: 0,
                ageVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.customer.create.mockResolvedValue(expectedResult);

            const result = await service.create(createDto);

            expect(result).toEqual(expectedResult);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'customer.created',
                expect.objectContaining({
                    customerId: 'cust-1',
                    email: 'test@example.com',
                }),
            );
        });
    });

    describe('findAll', () => {
        it('should return paginated customers', async () => {
            const mockCustomers = [
                { id: 'cust-1', firstName: 'John', lastName: 'Doe' },
                { id: 'cust-2', firstName: 'Jane', lastName: 'Smith' },
            ];

            mockPrismaService.customer.findMany.mockResolvedValue(mockCustomers);
            mockPrismaService.customer.count.mockResolvedValue(10);

            const result = await service.findAll(1, 2);

            expect(result.data).toEqual(mockCustomers);
            expect(result.meta).toEqual({
                page: 1,
                limit: 2,
                total: 10,
                totalPages: 5,
            });
        });
    });

    describe('search', () => {
        it('should search customers by query', async () => {
            const mockCustomers = [
                { id: 'cust-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            ];

            mockPrismaService.customer.findMany.mockResolvedValue(mockCustomers);

            const result = await service.search({ query: 'john', limit: 20 });

            expect(result).toEqual(mockCustomers);
            expect(prisma.customer.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [
                        { email: { contains: 'john' } },
                        { phone: { contains: 'john' } },
                        { firstName: { contains: 'john' } },
                        { lastName: { contains: 'john' } },
                    ],
                },
                take: 20,
            });
        });
    });

    describe('updateLoyaltyPoints', () => {
        it('should update loyalty points and emit event', async () => {
            const mockCustomer = {
                id: 'cust-1',
                firstName: 'John',
                lastName: 'Doe',
                loyaltyPoints: 100,
            };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
            mockPrismaService.customer.update.mockResolvedValue({
                ...mockCustomer,
                loyaltyPoints: 150,
            });

            const result = await service.updateLoyaltyPoints('cust-1', {
                points: 50,
                reason: 'purchase',
            });

            expect(result.loyaltyPoints).toBe(150);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'customer.loyalty.updated',
                expect.objectContaining({
                    customerId: 'cust-1',
                    pointsChange: 50,
                    newPoints: 150,
                    reason: 'purchase',
                }),
            );
            expect(prisma.eventLog.create).toHaveBeenCalled();
        });

        it('should not allow negative loyalty points', async () => {
            const mockCustomer = {
                id: 'cust-1',
                firstName: 'John',
                lastName: 'Doe',
                loyaltyPoints: 10,
            };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
            mockPrismaService.customer.update.mockResolvedValue({
                ...mockCustomer,
                loyaltyPoints: 0,
            });

            const result = await service.updateLoyaltyPoints('cust-1', {
                points: -20,
                reason: 'correction',
            });

            expect(result.loyaltyPoints).toBe(0);
        });
    });

    describe('updateLifetimeValue', () => {
        it('should update customer lifetime value', async () => {
            const mockCustomer = {
                id: 'cust-1',
                lifetimeValue: 100.0,
            };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
            mockPrismaService.customer.update.mockResolvedValue({
                ...mockCustomer,
                lifetimeValue: 150.0,
            });

            await service.updateLifetimeValue('cust-1', 50.0);

            expect(prisma.customer.update).toHaveBeenCalledWith({
                where: { id: 'cust-1' },
                data: { lifetimeValue: 150.0 },
            });
        });

        it('should silently fail if customer not found', async () => {
            mockPrismaService.customer.findUnique.mockResolvedValue(null);

            await expect(
                service.updateLifetimeValue('cust-999', 50.0),
            ).resolves.not.toThrow();
        });
    });

    describe('getTopCustomers', () => {
        it('should return top customers by lifetime value', async () => {
            const mockCustomers = [
                { id: 'cust-1', firstName: 'John', lifetimeValue: 1000 },
                { id: 'cust-2', firstName: 'Jane', lifetimeValue: 800 },
            ];

            mockPrismaService.customer.findMany.mockResolvedValue(mockCustomers);

            const result = await service.getTopCustomers(2);

            expect(result).toEqual(mockCustomers);
            expect(prisma.customer.findMany).toHaveBeenCalledWith({
                take: 2,
                orderBy: { lifetimeValue: 'desc' },
            });
        });
    });

    describe('remove', () => {
        it('should delete customer with no transactions', async () => {
            const mockCustomer = { id: 'cust-1', firstName: 'John' };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
            mockPrismaService.transaction.count.mockResolvedValue(0);
            mockPrismaService.customer.delete.mockResolvedValue(mockCustomer);

            const result = await service.remove('cust-1');

            expect(result.message).toBe('Customer deleted successfully');
        });

        it('should throw error when customer has transactions', async () => {
            const mockCustomer = { id: 'cust-1', firstName: 'John' };

            mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
            mockPrismaService.transaction.count.mockResolvedValue(5);

            await expect(service.remove('cust-1')).rejects.toThrow(
                'Cannot delete customer with existing transactions',
            );
        });
    });
});
