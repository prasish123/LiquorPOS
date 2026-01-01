import { productRepository } from '../repositories/ProductRepository';
import { orderRepository } from '../repositories/OrderRepository';
import { Product, Order, CartItem } from '../../domain/types';
import { Logger } from '../services/LoggerService';

// Re-export types for compatibility
export type { Product };

export interface CreateOrderRequest {
    locationId: string;
    terminalId?: string;
    items: { sku: string; quantity: number; discount: number; priceAtSale: number }[];
    paymentMethod: 'cash' | 'card' | 'split';
    channel: 'counter';
    ageVerified?: boolean;
    subtotal: number;
    tax: number;
    total: number;
}

export interface OrderResponse {
    id: string;
    success: boolean;
}

class ApiClient {
    // ... search methods ...

    async createOrder(orderRequest: CreateOrderRequest): Promise<OrderResponse> {
        const id = crypto.randomUUID();
        const timestamp = Date.now();

        // 1. Simple Mapping: Trust the POS calculations
        const order: Order = {
            id,
            timestamp,
            items: orderRequest.items.map(item => ({
                sku: item.sku,
                quantity: item.quantity,
                priceAtSale: item.priceAtSale,
                discount: item.discount
            })),
            subtotal: orderRequest.subtotal,
            tax: orderRequest.tax,
            total: orderRequest.total,
            paymentMethod: orderRequest.paymentMethod,
            ageVerified: orderRequest.ageVerified || false,
            synced: false
        };

        Logger.info("Persisting order (POS Source of Truth)", {
            orderId: order.id,
            total: order.total,
            items: order.items.length
        });

        await orderRepository.save(order);

        return { id, success: true };
    }
}

export const api = new ApiClient();
