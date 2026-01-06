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
  // Default tax rate fallback (Florida state tax)
  private readonly DEFAULT_TAX_RATE = 0.07; // 7%

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate pricing for order items with location-specific tax rate
   * @param items - Order items to price
   * @param locationId - Location ID for tax rate lookup (optional)
   */
  async calculate(items: OrderItemDto[], locationId?: string): Promise<PricingResult> {
    // Get location-specific tax rate
    const taxRate = await this.getTaxRate(locationId);

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
      const itemTax = itemSubtotal * taxRate;
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
   * Get tax rate for a specific location
   * @param locationId - Location ID to lookup tax rate
   * @returns Combined tax rate (state + county if applicable)
   */
  private async getTaxRate(locationId?: string): Promise<number> {
    if (!locationId) {
      return this.DEFAULT_TAX_RATE;
    }

    try {
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
        select: { taxRate: true, countyTaxRate: true },
      });

      if (!location) {
        // Location not found, use default
        return this.DEFAULT_TAX_RATE;
      }

      // Combine state and county tax rates
      const stateTax = location.taxRate;
      const countyTax = location.countyTaxRate || 0;
      return stateTax + countyTax;
    } catch (error) {
      // Database error, use default rate
      return this.DEFAULT_TAX_RATE;
    }
  }

  /**
   * Apply promotional discounts (future enhancement)
   *
   * @see docs/TECHNICAL_DEBT.md#TD-001 for implementation plan
   * @param items - Order items to apply promotions to
   * @param _customerId - Customer ID for loyalty discounts (not yet implemented)
   * @returns Items with promotions applied (currently returns unchanged)
   */
  applyPromotions(items: OrderItemDto[], _customerId?: string): OrderItemDto[] {
    // Promotional logic not yet implemented
    // Tracked as TD-001 in docs/TECHNICAL_DEBT.md
    // Future features:
    // - Buy X Get Y Free promotions
    // - Loyalty tier discounts
    // - Seasonal/time-limited promotions
    return items;
  }
}
