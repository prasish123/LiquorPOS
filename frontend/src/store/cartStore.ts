import { create } from 'zustand';
import { Product } from '../domain/types';
import { CartItem } from '../domain/types';
import { CartLogic } from '../domain/CartLogic';

interface CartStore {
    items: CartItem[];
    addItem: (product: Product) => void;
    removeItem: (sku: string) => void;
    updateQuantity: (sku: string, quantity: number) => void;
    updateDiscount: (sku: string, discount: number) => void;
    clearCart: () => void;
    getTotal: () => number;
    getSubtotal: () => number;
    getTax: () => number;
    getTotalDiscount: () => number;
    hasAgeRestrictedItems: () => boolean;
}

export const useCartStore = create<CartStore>((set, get) => ({
    items: [],

    addItem: (product) => {
        const items = get().items;
        const existing = items.find((item) => item.sku === product.sku);

        if (existing) {
            set({
                items: items.map((item) =>
                    item.sku === product.sku
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                ),
            });
        } else {
            set({
                items: [...items, { ...product, quantity: 1, discount: 0 }],
            });
        }
    },

    removeItem: (sku) => {
        set({
            items: get().items.filter((item) => item.sku !== sku),
        });
    },

    updateQuantity: (sku, quantity) => {
        if (quantity <= 0) {
            get().removeItem(sku);
            return;
        }

        set({
            items: get().items.map((item) =>
                item.sku === sku ? { ...item, quantity } : item
            ),
        });
    },

    updateDiscount: (sku, discount) => {
        set({
            items: get().items.map((item) =>
                item.sku === sku ? { ...item, discount } : item
            ),
        });
    },

    clearCart: () => {
        set({ items: [] });
    },

    getSubtotal: () => {
        return CartLogic.getSubtotal(get().items);
    },

    getTotalDiscount: () => {
        return CartLogic.getTotalDiscount(get().items);
    },

    getTax: () => {
        return CartLogic.getTax(get().items);
    },

    getTotal: () => {
        return CartLogic.getTotal(get().items);
    },

    hasAgeRestrictedItems: () => {
        return CartLogic.hasAgeRestrictedItems(get().items);
    },
}));
