import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  UpdateLoyaltyPointsDto,
  SearchCustomerDto,
} from './dto/customer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /**
   * Create a new customer
   * POST /api/customers
   */
  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  /**
   * Get all customers
   * GET /api/customers?page=1&limit=50
   */
  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.customersService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  /**
   * Search customers
   * GET /api/customers/search?query=john&limit=20
   */
  @Get('search')
  search(@Query() searchDto: SearchCustomerDto) {
    return this.customersService.search(searchDto);
  }

  /**
   * Get top customers by lifetime value
   * GET /api/customers/top?limit=10
   */
  @Get('top')
  getTopCustomers(@Query('limit') limit?: string) {
    return this.customersService.getTopCustomers(limit ? parseInt(limit) : 10);
  }

  /**
   * Get customer by ID
   * GET /api/customers/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  /**
   * Get customer transactions
   * GET /api/customers/:id/transactions?page=1&limit=20
   */
  @Get(':id/transactions')
  getTransactions(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.getTransactions(
      id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  /**
   * Update customer
   * PUT /api/customers/:id
   */
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  /**
   * Update loyalty points
   * POST /api/customers/:id/loyalty
   */
  @Post(':id/loyalty')
  updateLoyaltyPoints(
    @Param('id') id: string,
    @Body() updateLoyaltyPointsDto: UpdateLoyaltyPointsDto,
  ) {
    return this.customersService.updateLoyaltyPoints(
      id,
      updateLoyaltyPointsDto,
    );
  }

  /**
   * Delete customer
   * DELETE /api/customers/:id
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
