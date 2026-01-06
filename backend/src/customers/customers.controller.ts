import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
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
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  UpdateLoyaltyPointsDto,
  SearchCustomerDto,
} from './dto/customer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('customers')
@ApiBearerAuth('JWT')
@Controller('api/customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /**
   * Create a new customer
   * POST /api/customers
   */
  @Post()
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Create a new customer',
    description: 'Register a new customer with contact information and loyalty program enrollment.',
  })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token',
  })
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  /**
   * Get all customers
   * GET /api/customers?page=1&limit=50
   */
  @Get()
  @ApiOperation({
    summary: 'List all customers',
    description: 'Retrieve a paginated list of all customers.',
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
  @ApiResponse({
    status: 200,
    description: 'Customer list retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.customersService.findAll(page ? parseInt(page) : 1, limit ? parseInt(limit) : 50);
  }

  /**
   * Search customers
   * GET /api/customers/search?query=john&limit=20
   */
  @Get('search')
  @ApiOperation({
    summary: 'Search customers',
    description: 'Search customers by name, email, or phone number.',
  })
  @ApiQuery({
    name: 'query',
    required: true,
    type: String,
    description: 'Search query string',
    example: 'john',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum results (default: 20)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  search(@Query() searchDto: SearchCustomerDto) {
    return this.customersService.search(searchDto);
  }

  /**
   * Get top customers by lifetime value
   * GET /api/customers/top?limit=10
   */
  @Get('top')
  @ApiOperation({
    summary: 'Get top customers',
    description: 'Retrieve top customers ranked by lifetime value.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum results (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Top customers retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getTopCustomers(@Query('limit') limit?: string) {
    return this.customersService.getTopCustomers(limit ? parseInt(limit) : 10);
  }

  /**
   * Get customer by ID
   * GET /api/customers/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get customer by ID',
    description: 'Retrieve detailed information about a specific customer.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Customer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  /**
   * Get customer transactions
   * GET /api/customers/:id/transactions?page=1&limit=20
   */
  @Get(':id/transactions')
  @ApiOperation({
    summary: 'Get customer transactions',
    description: 'Retrieve purchase history for a specific customer.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Customer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
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
    description: 'Items per page (default: 20)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
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
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Update customer',
    description: 'Update customer information including contact details and loyalty tier.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Customer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({
    status: 200,
    description: 'Customer updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token',
  })
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(id, updateCustomerDto);
  }

  /**
   * Update loyalty points
   * POST /api/customers/:id/loyalty
   */
  @Post(':id/loyalty')
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Update loyalty points',
    description: 'Add or subtract loyalty points for a customer.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Customer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateLoyaltyPointsDto })
  @ApiResponse({
    status: 200,
    description: 'Loyalty points updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token',
  })
  updateLoyaltyPoints(
    @Param('id') id: string,
    @Body() updateLoyaltyPointsDto: UpdateLoyaltyPointsDto,
  ) {
    return this.customersService.updateLoyaltyPoints(id, updateLoyaltyPointsDto);
  }

  /**
   * Delete customer
   * DELETE /api/customers/:id
   */
  @Delete(':id')
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Delete customer',
    description: 'Remove a customer from the system. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Customer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token',
  })
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
