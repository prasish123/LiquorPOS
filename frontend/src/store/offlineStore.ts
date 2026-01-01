import { create } from 'zustand';
import { db } from '../lib/db';

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
            await db.execute({
                sql: `INSERT INTO pending_orders (id, timestamp, items, total, paymentMethod) VALUES (?, ?, ?, ?, ?)`,
                args: [order.id, order.timestamp, JSON.stringify(order.items), order.total, order.paymentMethod]
            });
            console.log('Order saved to offline DB');
        } catch (error) {
            console.error('Failed to save offline order:', error);
        }
    },

    syncOrders: async () => {
        try {
            const result = await db.execute('SELECT * FROM pending_orders WHERE synced = 0');
            const orders = result.rows;

            if (orders.length === 0) return;

            console.log(`Syncing ${orders.length} offline orders...`);

            for (const row of orders) {
                const order = {
                    id: row.id,
                    items: JSON.parse(row.items as string),
                    total: row.total,
                    paymentMethod: row.paymentMethod,
                };

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
                        await db.execute({
                            sql: 'DELETE FROM pending_orders WHERE id = ?',
                            args: [row.id]
                        });
                        console.log(`Synced and removed order ${row.id}`);
                    }
                } catch (err) {
                    console.error(`Failed to sync order ${row.id}`, err);
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
