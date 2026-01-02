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
import { InventoryService } from './inventory.service';
import {
  CreateInventoryDto,
  UpdateInventoryDto,
  AdjustInventoryDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('inventory')
@ApiBearerAuth('JWT')
@Controller('api/inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * Create inventory record
   * POST /api/inventory
   */
  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ inventory: { limit: 50, ttl: 60000 } })
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Create inventory record',
    description:
      'Create a new inventory record for a product at a specific location.',
  })
  @ApiBody({ type: CreateInventoryDto })
  @ApiResponse({
    status: 201,
    description: 'Inventory record created successfully',
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
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
  })
  create(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.create(createInventoryDto);
  }

  /**
   * Get all inventory
   * GET /api/inventory?locationId=xxx
   */
  @Get()
  @ApiOperation({
    summary: 'List all inventory',
    description:
      'Retrieve all inventory records with optional location filter.',
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
    description: 'Inventory list retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findAll(@Query('locationId') locationId?: string) {
    return this.inventoryService.findAll(locationId);
  }

  /**
   * Get low stock items
   * GET /api/inventory/low-stock?locationId=xxx
   */
  @Get('low-stock')
  @ApiOperation({
    summary: 'Get low stock items',
    description: 'Retrieve inventory items below their reorder point.',
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
    description: 'Low stock items retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getLowStock(@Query('locationId') locationId?: string) {
    return this.inventoryService.getLowStock(locationId);
  }

  /**
   * Get inventory for a product
   * GET /api/inventory/product/:productId
   */
  @Get('product/:productId')
  @ApiOperation({
    summary: 'Get inventory by product',
    description:
      'Retrieve inventory records for a specific product across all locations.',
  })
  @ApiParam({
    name: 'productId',
    type: String,
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Product inventory retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findByProduct(@Param('productId') productId: string) {
    return this.inventoryService.findByProduct(productId);
  }

  /**
   * Get inventory for a location
   * GET /api/inventory/location/:locationId
   */
  @Get('location/:locationId')
  @ApiOperation({
    summary: 'Get inventory by location',
    description: 'Retrieve all inventory records for a specific location.',
  })
  @ApiParam({
    name: 'locationId',
    type: String,
    description: 'Location ID',
    example: 'loc-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Location inventory retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findByLocation(@Param('locationId') locationId: string) {
    return this.inventoryService.findByLocation(locationId);
  }

  /**
   * Adjust inventory
   * POST /api/inventory/adjust
   */
  @Post('adjust')
  @UseGuards(ThrottlerGuard)
  @Throttle({ inventory: { limit: 50, ttl: 60000 } })
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Adjust inventory',
    description:
      'Adjust inventory quantity with reason tracking (sale, restock, damage, count, etc.).',
  })
  @ApiBody({ type: AdjustInventoryDto })
  @ApiResponse({
    status: 200,
    description: 'Inventory adjusted successfully',
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
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
  })
  adjust(@Body() adjustInventoryDto: AdjustInventoryDto) {
    return this.inventoryService.adjust(adjustInventoryDto);
  }

  /**
   * Get inventory by ID
   * GET /api/inventory/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get inventory by ID',
    description: 'Retrieve a specific inventory record by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Inventory ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory record retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Inventory record not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  /**
   * Update inventory
   * PUT /api/inventory/:id
   */
  @Put(':id')
  @UseGuards(ThrottlerGuard)
  @Throttle({ inventory: { limit: 50, ttl: 60000 } })
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Update inventory record',
    description:
      'Update inventory settings such as reorder point and reorder quantity.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Inventory ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateInventoryDto })
  @ApiResponse({
    status: 200,
    description: 'Inventory updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Inventory record not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
  })
  update(
    @Param('id') id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(id, updateInventoryDto);
  }

  /**
   * Delete inventory
   * DELETE /api/inventory/:id
   */
  @Delete(':id')
  @UseGuards(ThrottlerGuard)
  @Throttle({ inventory: { limit: 50, ttl: 60000 } })
  @ApiSecurity('CSRF')
  @ApiOperation({
    summary: 'Delete inventory record',
    description: 'Remove an inventory record. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Inventory ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Inventory record not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
  })
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
