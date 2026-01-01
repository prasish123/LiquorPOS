import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    create(@Body() createOrderDto: CreateOrderDto) {
        return this.ordersService.create(createOrderDto);
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
        return this.ordersService.getDailySummary(
            new Date(date),
            locationId,
        );
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
