import { orderRepository } from '../repositories/OrderRepository';
import { Product, Order } from '../../domain/types';
import { Logger } from '../services/LoggerService';
import { validateIds } from '../../utils/validation';

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
        // Validate UUIDs before proceeding
        validateIds(orderRequest.locationId, orderRequest.terminalId || '');
        
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

        // Save to local IndexedDB first (offline support)
        await orderRepository.save(order);

        // NEW: Also send to backend API
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            
            // Get CSRF token
            const csrfResponse = await fetch(`${API_URL}/auth/csrf-token`, {
                credentials: 'include',
            });
            const { csrfToken } = await csrfResponse.json();

            // Send order to backend
            const response = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken,
                },
                credentials: 'include', // Send JWT cookie
                body: JSON.stringify({
                    locationId: orderRequest.locationId,
                    terminalId: orderRequest.terminalId,
                    items: orderRequest.items,
                    paymentMethod: orderRequest.paymentMethod,
                    channel: orderRequest.channel,
                    ageVerified: orderRequest.ageVerified,
                    idempotencyKey: id, // Use order ID as idempotency key
                }),
            });

            if (response.ok) {
                Logger.info("Order synced to backend successfully", { orderId: id });
                // Mark as synced in IndexedDB
                order.synced = true;
                await orderRepository.save(order);
            } else {
                const errorText = await response.text();
                Logger.error("Failed to sync order to backend", undefined, { 
                    orderId: id, 
                    status: response.status,
                    errorText 
                });
                
                // Show warning toast for sync failure
                if (typeof window !== 'undefined') {
                    const { useToastStore } = await import('../../store/toastStore');
                    useToastStore.getState().addToast({
                        type: 'warning',
                        message: 'Transaction saved locally. Backend sync failed - will retry automatically.',
                        duration: 5000,
                    });
                }
            }
        } catch (error) {
            Logger.error("Error syncing order to backend", error instanceof Error ? error : undefined, { 
                orderId: id
            });
            // Order still saved locally, will sync later
        }

        return { id, success: true };
    }
}

export const api = new ApiClient();
