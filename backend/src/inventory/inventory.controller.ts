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
import { InventoryService } from './inventory.service';
import {
  CreateInventoryDto,
  UpdateInventoryDto,
  AdjustInventoryDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * Create inventory record
   * POST /api/inventory
   */
  @Post()
  create(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.create(createInventoryDto);
  }

  /**
   * Get all inventory
   * GET /api/inventory?locationId=xxx
   */
  @Get()
  findAll(@Query('locationId') locationId?: string) {
    return this.inventoryService.findAll(locationId);
  }

  /**
   * Get low stock items
   * GET /api/inventory/low-stock?locationId=xxx
   */
  @Get('low-stock')
  getLowStock(@Query('locationId') locationId?: string) {
    return this.inventoryService.getLowStock(locationId);
  }

  /**
   * Get inventory for a product
   * GET /api/inventory/product/:productId
   */
  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.inventoryService.findByProduct(productId);
  }

  /**
   * Get inventory for a location
   * GET /api/inventory/location/:locationId
   */
  @Get('location/:locationId')
  findByLocation(@Param('locationId') locationId: string) {
    return this.inventoryService.findByLocation(locationId);
  }

  /**
   * Adjust inventory
   * POST /api/inventory/adjust
   */
  @Post('adjust')
  adjust(@Body() adjustInventoryDto: AdjustInventoryDto) {
    return this.inventoryService.adjust(adjustInventoryDto);
  }

  /**
   * Get inventory by ID
   * GET /api/inventory/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  /**
   * Update inventory
   * PUT /api/inventory/:id
   */
  @Put(':id')
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
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
