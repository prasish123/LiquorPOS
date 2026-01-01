import { CartItem } from './types';

export class CartLogic {
    private static readonly TAX_RATE = 0.07; // 7% Florida sales tax

    static getSubtotal(items: CartItem[]): number {
        return items.reduce(
            (sum, item) => sum + item.basePrice * item.quantity - item.discount,
            0
        );
    }

    static getTotalDiscount(items: CartItem[]): number {
        return items.reduce((sum, item) => sum + item.discount, 0);
    }

    static getTax(items: CartItem[]): number {
        const subtotal = this.getSubtotal(items);
        return subtotal * this.TAX_RATE;
    }

    static getTotal(items: CartItem[]): number {
        const subtotal = this.getSubtotal(items);
        const tax = this.getTax(items);
        return subtotal + tax;
    }

    static hasAgeRestrictedItems(items: CartItem[]): boolean {
        return items.some((item) => item.ageRestricted);
    }
}
