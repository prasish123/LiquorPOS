import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto, @Req() req: Request) {
    const user = (req as Request & { user?: { id?: string } }).user;
    const context = {
      userId: user?.id,
      ipAddress:
        req.ip || (req.connection as { remoteAddress?: string })?.remoteAddress,
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      // Log failed order creation
      await this.auditService.logOrderCreation('unknown', 'failure', context, {
        error: errorMessage,
        idempotencyKey: createOrderDto.idempotencyKey,
      });

      throw error;
    }
  }

  @Get()
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
  getDailySummary(
    @Query('date') date: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.ordersService.getDailySummary(new Date(date), locationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }
}
