import { orderRepository } from '../repositories/OrderRepository';
import { Logger } from '../services/LoggerService';
import { Order } from '../../domain/types';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const LOCATION_ID = import.meta.env.VITE_LOCATION_ID || 'loc-001';
const MAX_RETRIES = 3; // Per sync attempt
const ABSOLUTE_MAX_RETRIES = 10; // Across all sync cycles
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second

interface FailureRecord {
    orderId: string;
    attemptCount: number;
    lastAttempt: number;
    lastError: string;
    markedFailed: boolean;
}

interface SyncDB extends DBSchema {
    failures: {
        key: string;
        value: FailureRecord;
    };
}

export class SyncService {
    private isSyncing = false;
    private db: IDBPDatabase<SyncDB> | null = null;

    async init(): Promise<void> {
        try {
            this.db = await openDB<SyncDB>('sync-service-db', 1, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains('failures')) {
                        db.createObjectStore('failures', { keyPath: 'orderId' });
                    }
                },
            });
        } catch (error) {
            Logger.error('Failed to initialize sync service database', error as Error);
        }
    }

    async syncOrders(): Promise<void> {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            if (!this.db) await this.init();

            const unsyncedOrders = await orderRepository.getUnsynced();
            if (unsyncedOrders.length === 0) {
                return;
            }

            Logger.info(`Found ${unsyncedOrders.length} orders to sync...`);

            const syncedIds: string[] = [];

            for (const order of unsyncedOrders) {
                // Check if order has been permanently failed
                const failureRecord = await this.getFailureRecord(order.id);

                if (failureRecord?.markedFailed) {
                    Logger.warn(`Order ${order.id} is permanently failed, skipping`);
                    continue;
                }

                try {
                    await this.uploadOrderWithRetry(order);
                    syncedIds.push(order.id);

                    // Clear failure record on success
                    await this.clearFailureRecord(order.id);
                } catch (error) {
                    await this.recordFailure(order.id, error as Error);
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

    private async uploadOrderWithRetry(order: Order, attempt = 0): Promise<void> {
        try {
            await this.uploadOrder(order);
        } catch (error) {
            if (attempt < MAX_RETRIES - 1) {
                // Exponential backoff: 1s, 2s, 4s
                const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
                Logger.info(`Retrying order ${order.id} in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.uploadOrderWithRetry(order, attempt + 1);
            }
            throw error; // Max retries exceeded for this sync cycle
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
            idempotencyKey: order.id, // Use order ID as idempotency key
        };

        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${await response.text()}`);
        }
    }

    private async getFailureRecord(orderId: string): Promise<FailureRecord | undefined> {
        if (!this.db) return undefined;
        return await this.db.get('failures', orderId);
    }

    private async recordFailure(orderId: string, error: Error): Promise<void> {
        if (!this.db) return;

        const existing = await this.getFailureRecord(orderId);
        const attemptCount = (existing?.attemptCount || 0) + 1;
        const markedFailed = attemptCount >= ABSOLUTE_MAX_RETRIES;

        const record: FailureRecord = {
            orderId,
            attemptCount,
            lastAttempt: Date.now(),
            lastError: error.message,
            markedFailed,
        };

        await this.db.put('failures', record);

        if (markedFailed) {
            Logger.error(
                `Order ${orderId} permanently failed after ${attemptCount} attempts. ` +
                `Last error: ${error.message}. Manual intervention required.`,
                error
            );
        } else {
            Logger.error(
                `Failed to sync order ${orderId} (attempt ${attemptCount}/${ABSOLUTE_MAX_RETRIES})`,
                error
            );
        }
    }

    private async clearFailureRecord(orderId: string): Promise<void> {
        if (!this.db) return;
        await this.db.delete('failures', orderId);
    }
}

export const syncService = new SyncService();

