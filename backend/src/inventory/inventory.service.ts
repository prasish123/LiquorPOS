import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma.service';
import { CreateInventoryDto, UpdateInventoryDto, AdjustInventoryDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create inventory record
   */
  async create(dto: CreateInventoryDto) {
    // Check if inventory already exists for this product/location
    const existing = await this.prisma.inventory.findUnique({
      where: {
        productId_locationId: {
          productId: dto.productId,
          locationId: dto.locationId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Inventory record already exists for this product/location');
    }

    const inventory = await this.prisma.inventory.create({
      data: {
        productId: dto.productId,
        locationId: dto.locationId,
        quantity: dto.quantity,
        reserved: dto.reserved || 0,
        reorderPoint: dto.reorderPoint,
      },
      include: {
        product: true,
        location: true,
      },
    });

    return inventory;
  }

  /**
   * Get all inventory records
   */
  async findAll(locationId?: string) {
    const where = locationId ? { locationId } : {};

    const inventory = await this.prisma.inventory.findMany({
      where,
      include: {
        product: true,
        location: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return inventory;
  }

  /**
   * Get inventory by ID
   */
  async findOne(id: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id },
      include: {
        product: true,
        location: true,
      },
    });

    if (!inventory) {
      throw new NotFoundException(`Inventory with ID ${id} not found`);
    }

    return inventory;
  }

  /**
   * Get inventory for a specific product
   */
  async findByProduct(productId: string) {
    const inventory = await this.prisma.inventory.findMany({
      where: { productId },
      include: {
        location: true,
      },
    });

    return inventory;
  }

  /**
   * Get inventory for a specific location
   */
  async findByLocation(locationId: string) {
    const inventory = await this.prisma.inventory.findMany({
      where: { locationId },
      include: {
        product: true,
      },
    });

    return inventory;
  }

  /**
   * Update inventory
   */
  async update(id: string, dto: UpdateInventoryDto) {
    await this.findOne(id); // Check if exists

    const updated = await this.prisma.inventory.update({
      where: { id },
      data: dto,
      include: {
        product: true,
        location: true,
      },
    });

    return updated;
  }

  /**
   * Adjust inventory (add or subtract stock)
   */
  async adjust(dto: AdjustInventoryDto) {
    const inventory = await this.prisma.inventory.findUnique({
      where: {
        productId_locationId: {
          productId: dto.productId,
          locationId: dto.locationId,
        },
      },
      include: {
        product: true,
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    const newQuantity = inventory.quantity + dto.adjustment;

    if (newQuantity < 0) {
      throw new BadRequestException('Adjustment would result in negative inventory');
    }

    const updated = await this.prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: newQuantity,
      },
      include: {
        product: true,
        location: true,
      },
    });

    // Publish inventory adjustment event
    void this.eventEmitter.emit('inventory.adjusted', {
      inventoryId: inventory.id,
      productId: dto.productId,
      locationId: dto.locationId,
      adjustment: dto.adjustment,
      newQuantity,
      reason: dto.reason,
      timestamp: new Date(),
    });

    // Log to event store
    await this.prisma.eventLog.create({
      data: {
        eventType: 'inventory.adjusted',
        aggregateId: inventory.id,
        locationId: dto.locationId,
        payload: JSON.stringify({
          productId: dto.productId,
          productName: inventory.product.name,
          adjustment: dto.adjustment,
          oldQuantity: inventory.quantity,
          newQuantity,
          reason: dto.reason,
        }),
      },
    });

    return updated;
  }

  /**
   * Get low stock items
   */
  async getLowStock(locationId?: string) {
    const where: any = {
      reorderPoint: {
        not: null,
      },
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const inventory = await this.prisma.inventory.findMany({
      where,
      include: {
        product: true,
        location: true,
      },
    });

    // Filter for items where quantity <= reorderPoint
    const lowStock = inventory.filter(
      (item) => item.reorderPoint !== null && item.quantity <= item.reorderPoint,
    );

    return lowStock;
  }

  /**
   * Reserve inventory (used by order orchestrator)
   */
  async reserve(productId: string, locationId: string, quantity: number) {
    const inventory = await this.prisma.inventory.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    const availableQuantity = inventory.quantity - inventory.reserved;

    if (availableQuantity < quantity) {
      throw new BadRequestException('Insufficient inventory available');
    }

    const updated = await this.prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        reserved: inventory.reserved + quantity,
      },
    });

    return updated;
  }

  /**
   * Release reserved inventory (used by order orchestrator on failure)
   */
  async release(productId: string, locationId: string, quantity: number) {
    const inventory = await this.prisma.inventory.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    const updated = await this.prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        reserved: Math.max(0, inventory.reserved - quantity),
      },
    });

    return updated;
  }

  /**
   * Commit reserved inventory (deduct from stock)
   */
  async commit(productId: string, locationId: string, quantity: number) {
    const inventory = await this.prisma.inventory.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    const updated = await this.prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: inventory.quantity - quantity,
        reserved: inventory.reserved - quantity,
      },
    });

    // Publish inventory updated event
    void this.eventEmitter.emit('inventory.updated', {
      inventoryId: inventory.id,
      productId,
      locationId,
      quantityChange: -quantity,
      newQuantity: updated.quantity,
      timestamp: new Date(),
    });

    return updated;
  }

  /**
   * Delete inventory record
   */
  async remove(id: string) {
    await this.findOne(id); // Check if exists

    await this.prisma.inventory.delete({
      where: { id },
    });

    return { message: 'Inventory record deleted successfully' };
  }
}
