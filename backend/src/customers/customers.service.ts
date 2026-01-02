import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  UpdateLoyaltyPointsDto,
  SearchCustomerDto,
} from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new customer
   */
  async create(dto: CreateCustomerDto) {
    const customer = await this.prisma.customer.create({
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        loyaltyPoints: 0,
        lifetimeValue: 0,
      },
    });

    // Publish customer created event
    this.eventEmitter.emit('customer.created', {
      customerId: customer.id,
      email: customer.email,
      timestamp: new Date(),
    });

    return customer;
  }

  /**
   * Find all customers with pagination
   */
  async findAll(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.customer.count(),
    ]);

    return {
      data: customers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find customer by ID
   */
  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        transactions: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  /**
   * Search customers by email, phone, or name
   */
  async search(dto: SearchCustomerDto) {
    const { query, limit = 20 } = dto;

    const customers = await this.prisma.customer.findMany({
      where: {
        OR: [
          { email: { contains: query } },
          { phone: { contains: query } },
          { firstName: { contains: query } },
          { lastName: { contains: query } },
        ],
      },
      take: limit,
    });

    return customers;
  }

  /**
   * Update customer
   */
  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id); // Check if exists

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });

    return updated;
  }

  /**
   * Update loyalty points
   */
  async updateLoyaltyPoints(id: string, dto: UpdateLoyaltyPointsDto) {
    const customer = await this.findOne(id);

    const newPoints = Math.max(0, customer.loyaltyPoints + dto.points);

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        loyaltyPoints: newPoints,
      },
    });

    // Publish loyalty points updated event
    this.eventEmitter.emit('customer.loyalty.updated', {
      customerId: id,
      pointsChange: dto.points,
      newPoints,
      reason: dto.reason,
      timestamp: new Date(),
    });

    // Log to event store
    await this.prisma.eventLog.create({
      data: {
        eventType: 'customer.loyalty.updated',
        aggregateId: id,
        payload: JSON.stringify({
          customerId: id,
          customerName: `${customer.firstName} ${customer.lastName}`,
          pointsChange: dto.points,
          oldPoints: customer.loyaltyPoints,
          newPoints,
          reason: dto.reason,
        }),
      },
    });

    return updated;
  }

  /**
   * Get customer transactions
   */
  async getTransactions(id: string, page: number = 1, limit: number = 20) {
    await this.findOne(id); // Check if exists

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { customerId: id },
        skip,
        take: limit,
        include: {
          items: true,
          location: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.transaction.count({
        where: { customerId: id },
      }),
    ]);

    return {
      data: transactions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update customer lifetime value (called after order completion)
   */
  async updateLifetimeValue(id: string, orderTotal: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return; // Silent fail if customer not found
    }

    await this.prisma.customer.update({
      where: { id },
      data: {
        lifetimeValue: customer.lifetimeValue + orderTotal,
      },
    });
  }

  /**
   * Delete customer
   */
  async remove(id: string) {
    await this.findOne(id); // Check if exists

    // Check if customer has transactions
    const transactionCount = await this.prisma.transaction.count({
      where: { customerId: id },
    });

    if (transactionCount > 0) {
      throw new Error('Cannot delete customer with existing transactions');
    }

    await this.prisma.customer.delete({
      where: { id },
    });

    return { message: 'Customer deleted successfully' };
  }

  /**
   * Get top customers by lifetime value
   */
  async getTopCustomers(limit: number = 10) {
    const customers = await this.prisma.customer.findMany({
      take: limit,
      orderBy: {
        lifetimeValue: 'desc',
      },
    });

    return customers;
  }
}
