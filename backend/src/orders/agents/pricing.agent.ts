import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { OrderItemDto } from '../dto/order.dto';

export interface PricingResult {
    items: Array<{
        sku: string;
        name: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        tax: number;
        total: number;
    }>;
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    total: number;
}

@Injectable()
export class PricingAgent {
    // Florida sales tax rate (example - should be configurable)
    private readonly TAX_RATE = 0.07; // 7%

    constructor(private prisma: PrismaService) { }

    /**
     * Calculate pricing for order items
     */
    async calculate(items: OrderItemDto[]): Promise<PricingResult> {
        const pricedItems: PricingResult['items'] = [];
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        for (const item of items) {
            // Get product details
            const product = await this.prisma.product.findUnique({
                where: { sku: item.sku },
            });

            if (!product) {
                throw new Error(`Product with SKU ${item.sku} not found`);
            }

            // Calculate item totals
            const unitPrice = product.basePrice;
            const discount = item.discount || 0;
            const itemSubtotal = unitPrice * item.quantity - discount;
            const itemTax = itemSubtotal * this.TAX_RATE;
            const itemTotal = itemSubtotal + itemTax;

            pricedItems.push({
                sku: item.sku,
                name: product.name,
                quantity: item.quantity,
                unitPrice,
                discount,
                tax: parseFloat(itemTax.toFixed(2)),
                total: parseFloat(itemTotal.toFixed(2)),
            });

            subtotal += itemSubtotal;
            totalDiscount += discount;
            totalTax += itemTax;
        }

        return {
            items: pricedItems,
            subtotal: parseFloat(subtotal.toFixed(2)),
            totalDiscount: parseFloat(totalDiscount.toFixed(2)),
            totalTax: parseFloat(totalTax.toFixed(2)),
            total: parseFloat((subtotal + totalTax).toFixed(2)),
        };
    }

    /**
     * Apply promotional discounts (future enhancement)
     */
    async applyPromotions(items: OrderItemDto[], customerId?: string): Promise<OrderItemDto[]> {
        // TODO: Implement promotional logic
        // - Buy 2 get 1 free
        // - Loyalty discounts
        // - Seasonal promotions
        return items;
    }
}
