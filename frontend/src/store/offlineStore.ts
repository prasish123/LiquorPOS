import { create } from 'zustand';
import { db } from '../infrastructure/db';

interface OfflineOrder {
    id: string;
    timestamp: number;
    items: any[];
    total: number;
    paymentMethod: string;
}

interface OfflineStore {
    isOnline: boolean;
    setOnline: (online: boolean) => void;
    saveOrderRequest: (order: OfflineOrder) => Promise<void>;
    syncOrders: () => Promise<void>;
}

export const useOfflineStore = create<OfflineStore>((set) => ({
    isOnline: navigator.onLine,

    setOnline: (online) => set({ isOnline: online }),

    saveOrderRequest: async (order) => {
        try {
            await db.orders.add({
                id: order.id,
                timestamp: order.timestamp,
                items: order.items,
                subtotal: 0,
                tax: 0,
                total: order.total,
                paymentMethod: order.paymentMethod as 'cash' | 'card' | 'split',
                ageVerified: false,
                synced: false
            });
            console.log('Order saved to offline DB');
        } catch (error) {
            console.error('Failed to save offline order:', error);
        }
    },

    syncOrders: async () => {
        try {
            const orders = await db.orders.where('synced').equals(0).toArray();

            if (orders.length === 0) return;

            console.log(`Syncing ${orders.length} offline orders...`);

            for (const order of orders) {
                try {
                    const response = await fetch('http://localhost:3000/api/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            locationId: 'loc-001',
                            terminalId: 'terminal-01',
                            items: order.items,
                            paymentMethod: order.paymentMethod,
                            channel: 'offline-sync',
                        }),
                    });

                    if (response.ok) {
                        await db.orders.delete(order.id);
                        console.log(`Synced and removed order ${order.id}`);
                    }
                } catch (err) {
                    console.error(`Failed to sync order ${order.id}`, err);
                }
            }
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }
}));

// Listen for online status
window.addEventListener('online', () => {
    useOfflineStore.getState().setOnline(true);
    useOfflineStore.getState().syncOrders();
});
window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnline(false);
});
