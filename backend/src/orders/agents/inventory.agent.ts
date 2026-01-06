import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { OrderItemDto } from '../dto/order.dto';

export interface InventoryReservation {
  reservationId: string;
  items: Array<{
    sku: string;
    quantity: number;
    productId: string;
  }>;
}

@Injectable()
export class InventoryAgent {
  constructor(private prisma: PrismaService) {}

  /**
   * Check inventory availability and reserve items
   * Uses database transaction with row-level locking to prevent race conditions
   */
  async checkAndReserve(locationId: string, items: OrderItemDto[]): Promise<InventoryReservation> {
    const reservationId = crypto.randomUUID();
    const reservedItems: InventoryReservation['items'] = [];

    // Use interactive transaction with row-level locking to prevent race conditions
    await this.prisma.$transaction(
      async (tx) => {
        for (const item of items) {
          // Find product by SKU
          const product = await tx.product.findUnique({
            where: { sku: item.sku },
            include: {
              inventory: {
                where: { locationId },
              },
            },
          });

          if (!product) {
            throw new BadRequestException(`Product with SKU ${item.sku} not found`);
          }

          // Check if we track inventory for this product
          if (!product.trackInventory) {
            reservedItems.push({
              sku: item.sku,
              quantity: item.quantity,
              productId: product.id,
            });
            continue;
          }

          const inventory = product.inventory[0];
          if (!inventory) {
            throw new BadRequestException(
              `No inventory found for product ${item.sku} at this location`,
            );
          }

          // CRITICAL: Use SELECT FOR UPDATE to lock the row and prevent concurrent modifications
          // This prevents race conditions where multiple requests try to reserve the same inventory
          const lockedInventory = await tx.$queryRaw<
            Array<{ id: string; quantity: number; reserved: number }>
          >`
            SELECT id, quantity, reserved 
            FROM "Inventory" 
            WHERE id = ${inventory.id}
            FOR UPDATE
          `;

          if (!lockedInventory || lockedInventory.length === 0) {
            throw new BadRequestException(`Failed to lock inventory for product ${item.sku}`);
          }

          const locked = lockedInventory[0];

          // Check available quantity with locked data (total - reserved)
          const available = locked.quantity - locked.reserved;
          if (available < item.quantity) {
            throw new BadRequestException(
              `Insufficient inventory for ${product.name}. Available: ${available}, Requested: ${item.quantity}`,
            );
          }

          // Atomically reserve inventory within the locked transaction
          await tx.inventory.update({
            where: { id: locked.id },
            data: {
              reserved: locked.reserved + item.quantity,
            },
          });

          reservedItems.push({
            sku: item.sku,
            quantity: item.quantity,
            productId: product.id,
          });
        }
      },
      {
        isolationLevel: 'Serializable', // Highest isolation level to prevent phantom reads
        maxWait: 5000, // Wait up to 5 seconds for lock
        timeout: 10000, // Transaction timeout 10 seconds
      },
    );

    return {
      reservationId,
      items: reservedItems,
    };
  }

  /**
   * Release reserved inventory (compensation)
   * Uses transaction with row locking to ensure atomic release
   */
  async release(reservation: InventoryReservation, locationId: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        for (const item of reservation.items) {
          const product = await tx.product.findUnique({
            where: { sku: item.sku },
            include: {
              inventory: {
                where: { locationId },
              },
            },
          });

          if (product && product.trackInventory && product.inventory[0]) {
            // Lock the inventory row before updating
            const lockedInventory = await tx.$queryRaw<Array<{ id: string; reserved: number }>>`
              SELECT id, reserved 
              FROM "Inventory" 
              WHERE id = ${product.inventory[0].id}
              FOR UPDATE
            `;

            if (lockedInventory && lockedInventory.length > 0) {
              const locked = lockedInventory[0];
              await tx.inventory.update({
                where: { id: locked.id },
                data: {
                  reserved: Math.max(0, locked.reserved - item.quantity),
                },
              });
            }
          }
        }
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      },
    );
  }

  /**
   * Commit reservation (convert reserved to sold)
   * Uses transaction with row locking to ensure atomic commit
   */
  async commit(reservation: InventoryReservation, locationId: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        for (const item of reservation.items) {
          const product = await tx.product.findUnique({
            where: { sku: item.sku },
            include: {
              inventory: {
                where: { locationId },
              },
            },
          });

          if (product && product.trackInventory && product.inventory[0]) {
            // Lock the inventory row before updating
            const lockedInventory = await tx.$queryRaw<
              Array<{ id: string; quantity: number; reserved: number }>
            >`
              SELECT id, quantity, reserved 
              FROM "Inventory" 
              WHERE id = ${product.inventory[0].id}
              FOR UPDATE
            `;

            if (lockedInventory && lockedInventory.length > 0) {
              const locked = lockedInventory[0];
              await tx.inventory.update({
                where: { id: locked.id },
                data: {
                  quantity: locked.quantity - item.quantity,
                  reserved: Math.max(0, locked.reserved - item.quantity),
                },
              });
            }
          }
        }
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      },
    );
  }
}
