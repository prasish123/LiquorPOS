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
    constructor(private prisma: PrismaService) { }

    /**
     * Check inventory availability and reserve items
     */
    async checkAndReserve(
        locationId: string,
        items: OrderItemDto[],
    ): Promise<InventoryReservation> {
        const reservationId = crypto.randomUUID();
        const reservedItems: InventoryReservation['items'] = [];

        for (const item of items) {
            // Find product by SKU
            const product = await this.prisma.product.findUnique({
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

            // Check available quantity (total - reserved)
            const available = inventory.quantity - inventory.reserved;
            if (available < item.quantity) {
                throw new BadRequestException(
                    `Insufficient inventory for ${product.name}. Available: ${available}, Requested: ${item.quantity}`,
                );
            }

            // Reserve inventory
            await this.prisma.inventory.update({
                where: { id: inventory.id },
                data: {
                    reserved: inventory.reserved + item.quantity,
                },
            });

            reservedItems.push({
                sku: item.sku,
                quantity: item.quantity,
                productId: product.id,
            });
        }

        return {
            reservationId,
            items: reservedItems,
        };
    }

    /**
     * Release reserved inventory (compensation)
     */
    async release(reservation: InventoryReservation, locationId: string): Promise<void> {
        for (const item of reservation.items) {
            const product = await this.prisma.product.findUnique({
                where: { sku: item.sku },
                include: {
                    inventory: {
                        where: { locationId },
                    },
                },
            });

            if (product && product.trackInventory && product.inventory[0]) {
                await this.prisma.inventory.update({
                    where: { id: product.inventory[0].id },
                    data: {
                        reserved: Math.max(0, product.inventory[0].reserved - item.quantity),
                    },
                });
            }
        }
    }

    /**
     * Commit reservation (convert reserved to sold)
     */
    async commit(reservation: InventoryReservation, locationId: string): Promise<void> {
        for (const item of reservation.items) {
            const product = await this.prisma.product.findUnique({
                where: { sku: item.sku },
                include: {
                    inventory: {
                        where: { locationId },
                    },
                },
            });

            if (product && product.trackInventory && product.inventory[0]) {
                const inventory = product.inventory[0];
                await this.prisma.inventory.update({
                    where: { id: inventory.id },
                    data: {
                        quantity: inventory.quantity - item.quantity,
                        reserved: Math.max(0, inventory.reserved - item.quantity),
                    },
                });
            }
        }
    }
}
