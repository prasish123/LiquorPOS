import { Controller, Get, Post, Body, Param, Query, Patch, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiSecurity,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma.service';

@ApiTags('orders')
@ApiBearerAuth('JWT')
@ApiSecurity('CSRF')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ orders: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Create a new order',
    description:
      'Process a new order with items, payment, and customer information. ' +
      'Supports idempotency via idempotencyKey. Includes age verification for alcohol sales.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        locationId: 'loc-001',
        terminalId: 'term-001',
        employeeId: 'emp-001',
        customerId: 'cust-001',
        subtotal: 39.98,
        tax: 2.8,
        discount: 0,
        total: 42.78,
        paymentMethod: 'card',
        paymentStatus: 'completed',
        channel: 'in-store',
        ageVerified: true,
        idScanned: true,
        items: [
          {
            sku: 'WINE-001',
            quantity: 2,
            price: 19.99,
          },
        ],
        createdAt: '2026-01-02T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - CSRF token invalid',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - Rate limit exceeded (30 requests/minute)',
  })
  async create(@Body() createOrderDto: CreateOrderDto, @Req() req: Request) {
    const user = (req as Request & { user?: { id?: string } }).user;
    const context = {
      userId: user?.id,
      ipAddress: req.ip || (req.connection as { remoteAddress?: string })?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    // Check for existing transaction with same idempotency key
    const existingTransaction = await this.prisma.transaction.findUnique({
      where: { idempotencyKey: createOrderDto.idempotencyKey },
      include: {
        items: true,
        payments: true,
      },
    });

    if (existingTransaction) {
      // Log idempotency check
      await this.auditService.logIdempotencyCheck(
        createOrderDto.idempotencyKey,
        true,
        existingTransaction.id,
        context,
      );

      // Return cached response
      return {
        id: existingTransaction.id,
        locationId: existingTransaction.locationId,
        terminalId: existingTransaction.terminalId,
        employeeId: existingTransaction.employeeId,
        customerId: existingTransaction.customerId,
        subtotal: existingTransaction.subtotal,
        tax: existingTransaction.tax,
        discount: existingTransaction.discount,
        total: existingTransaction.total,
        paymentMethod: existingTransaction.paymentMethod,
        paymentStatus: existingTransaction.paymentStatus,
        channel: existingTransaction.channel,
        ageVerified: existingTransaction.ageVerified,
        idScanned: existingTransaction.idScanned,
        items: existingTransaction.items,
        createdAt: existingTransaction.createdAt,
      };
    }

    // Process new order
    try {
      const result = await this.ordersService.create(createOrderDto);

      // Log successful order creation
      await this.auditService.logOrderCreation(result.id, 'success', context, {
        total: result.total,
        itemCount: result.items.length,
        paymentMethod: result.paymentMethod,
      });

      // Log idempotency check for new request
      await this.auditService.logIdempotencyCheck(
        createOrderDto.idempotencyKey,
        false,
        result.id,
        context,
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Log failed order creation
      await this.auditService.logOrderCreation('unknown', 'failure', context, {
        error: errorMessage,
        idempotencyKey: createOrderDto.idempotencyKey,
      });

      throw error;
    }
  }

  @Get()
  @ApiOperation({
    summary: 'List all orders',
    description: 'Retrieve a paginated list of orders with optional location filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 50)',
    example: 50,
  })
  @ApiQuery({
    name: 'locationId',
    required: false,
    type: String,
    description: 'Filter by location ID',
    example: 'loc-001',
  })
  @ApiResponse({
    status: 200,
    description: 'List of orders retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('locationId') locationId?: string,
  ) {
    return this.ordersService.findAll(
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 50,
      locationId,
    );
  }

  @Get('summary/daily')
  @ApiOperation({
    summary: 'Get daily sales summary',
    description: 'Retrieve aggregated sales data for a specific date',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    type: String,
    description: 'Date in ISO format (YYYY-MM-DD)',
    example: '2026-01-02',
  })
  @ApiQuery({
    name: 'locationId',
    required: false,
    type: String,
    description: 'Filter by location ID',
    example: 'loc-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily summary retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getDailySummary(@Query('date') date: string, @Query('locationId') locationId?: string) {
    return this.ordersService.getDailySummary(new Date(date), locationId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Retrieve detailed information about a specific order',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Order ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Order retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update order',
    description: 'Update order status or other mutable fields',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Order ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateOrderDto })
  @ApiResponse({
    status: 200,
    description: 'Order updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - CSRF token invalid',
  })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }
}
