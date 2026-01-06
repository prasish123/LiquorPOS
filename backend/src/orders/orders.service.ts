import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderOrchestrator } from './order-orchestrator';
import { CreateOrderDto, UpdateOrderDto, OrderResponseDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private orchestrator: OrderOrchestrator,
  ) {}

  /**
   * Create a new order using the orchestrator pattern
   */
  async create(dto: CreateOrderDto): Promise<OrderResponseDto> {
    return await this.orchestrator.processOrder(dto);
  }

  /**
   * Find all orders with pagination
   */
  async findAll(page: number = 1, limit: number = 50, locationId?: string) {
    const skip = (page - 1) * limit;

    const where = locationId ? { locationId } : {};

    const [orders, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: true,
          location: true,
          customer: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find order by ID
   */
  async findOne(id: string) {
    const order = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        location: true,
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  /**
   * Update order (mainly for sync status)
   */
  async update(id: string, dto: UpdateOrderDto) {
    await this.findOne(id); // Check if exists

    return await this.prisma.transaction.update({
      where: { id },
      data: dto,
      include: {
        items: true,
        payments: true,
      },
    });
  }

  /**
   * Get orders by date range
   */
  async findByDateRange(startDate: Date, endDate: Date, locationId?: string) {
    const where: { createdAt: { gte: Date; lte: Date }; locationId?: string } = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (locationId) {
      where.locationId = locationId;
    }

    return await this.prisma.transaction.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get daily sales summary
   */
  async getDailySummary(date: Date, locationId?: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const where: {
      createdAt: { gte: Date; lte: Date };
      paymentStatus: string;
      locationId?: string;
    } = {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      paymentStatus: 'completed',
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const orders = await this.prisma.transaction.findMany({
      where,
      include: {
        items: true,
      },
    });

    const summary = {
      date: date.toISOString().split('T')[0],
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
      totalTax: orders.reduce((sum, order) => sum + order.tax, 0),
      totalDiscount: orders.reduce((sum, order) => sum + order.discount, 0),
      averageOrderValue: 0,
      itemsSold: orders.reduce((sum, order) => sum + order.items.length, 0),
    };

    summary.averageOrderValue =
      summary.totalOrders > 0 ? summary.totalRevenue / summary.totalOrders : 0;

    return summary;
  }
}
