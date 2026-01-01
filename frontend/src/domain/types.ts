export interface Product {
    id: string;
    sku: string;
    name: string;
    basePrice: number;
    category: string;
    ageRestricted: boolean; // boolean is easier to work with than 0/1 in JS
    inventory: number;
}

export interface CartItem extends Product {
    quantity: number;
    discount: number;
}

export interface Order {
    id: string;
    timestamp: number;
    items: {
        sku: string; // Reference by SKU to save space
        quantity: number;
        priceAtSale: number;
        discount: number;
    }[];
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: 'cash' | 'card' | 'split';
    ageVerified: boolean;
    synced: boolean;
}
