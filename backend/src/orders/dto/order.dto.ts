export class CreateOrderDto {
    locationId: string;
    terminalId?: string;
    employeeId?: string;
    customerId?: string;

    items: OrderItemDto[];

    // Payment
    paymentMethod: 'cash' | 'card' | 'split';

    // Source
    channel: 'counter' | 'web' | 'uber_eats' | 'doordash';

    // Compliance
    ageVerified?: boolean;
    ageVerifiedBy?: string;
    idScanned?: boolean;

    // POS Provided Totals (Source of Truth)
    subtotal?: number;
    tax?: number;
    total?: number;
}

export class OrderItemDto {
    sku: string;
    quantity: number;
    discount?: number;
    priceAtSale?: number;
}

export class UpdateOrderDto {
    paymentStatus?: 'completed' | 'refunded' | 'partial_refund';
    syncedToCloud?: boolean;
    syncedToBackOffice?: boolean;
}

export class OrderResponseDto {
    id: string;
    locationId: string;
    terminalId?: string;
    employeeId?: string;
    customerId?: string;

    subtotal: number;
    tax: number;
    discount: number;
    total: number;

    paymentMethod: string;
    paymentStatus: string;
    channel: string;

    ageVerified: boolean;
    idScanned: boolean;

    items: OrderItemResponseDto[];

    createdAt: Date;
}

export class OrderItemResponseDto {
    id: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    tax: number;
    total: number;
}
