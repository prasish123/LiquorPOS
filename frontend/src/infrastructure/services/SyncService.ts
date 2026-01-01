import { orderRepository } from '../repositories/OrderRepository';
import { Logger } from '../services/LoggerService';
import { Order } from '../../domain/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const LOCATION_ID = import.meta.env.VITE_LOCATION_ID || 'loc-001';

export class SyncService {
    private isSyncing = false;

    async syncOrders(): Promise<void> {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            const unsyncedOrders = await orderRepository.getUnsynced();
            if (unsyncedOrders.length === 0) {
                return;
            }

            Logger.info(`Found ${unsyncedOrders.length} orders to sync...`);

            const syncedIds: string[] = [];

            for (const order of unsyncedOrders) {
                try {
                    await this.uploadOrder(order);
                    syncedIds.push(order.id);
                } catch (error) {
                    Logger.error(`Failed to sync order ${order.id}`, error as Error);
                    // Continue with next order, don't abort entire batch
                }
            }

            if (syncedIds.length > 0) {
                await orderRepository.markSynced(syncedIds);
                Logger.info(`Successfully synced ${syncedIds.length} orders.`);
            }
        } catch (error) {
            Logger.error('Critical error during syncOrders', error as Error);
        } finally {
            this.isSyncing = false;
        }
    }

    private async uploadOrder(order: Order): Promise<void> {
        const payload = {
            locationId: LOCATION_ID,
            terminalId: import.meta.env.VITE_TERMINAL_ID || 'term-01',
            items: order.items.map(item => ({
                sku: item.sku,
                quantity: item.quantity,
                discount: item.discount || 0
            })),
            paymentMethod: order.paymentMethod,
            channel: 'counter',
            ageVerified: order.ageVerified,
            // TODO: Backend strictly needs to accept createdAt to respect offline time
            // For now, backend will timestamp it as NOW.
        };

        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${token}` // Future
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${await response.text()}`);
        }
    }
}

export const syncService = new SyncService();
