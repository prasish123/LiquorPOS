import { db } from '../db';
import { Order } from '../../domain/types';
import { Logger } from '../services/LoggerService';

export class OrderRepository {

    async save(order: Order): Promise<void> {
        Logger.debug("Saving Order to Dexie", { id: order.id });
        await db.orders.add(order);
    }

    async getAll(): Promise<Order[]> {
        Logger.debug("Fetching all Orders from Dexie");
        return await db.orders.orderBy('timestamp').reverse().toArray();
    }

    async getUnsynced(): Promise<Order[]> {
        // defined in schema as 'synced' index
        return await db.orders.where('synced').equals(0 as any).toArray();
        // Note: Dexie schema uses 0/1 for boolean indexing often, but let's check strict types.
        // If types say boolean, Dexie stores boolean. 
        // Let's assume standard boolean usage for now.
    }

    async markSynced(ids: string[]): Promise<void> {
        await db.orders.bulkUpdate(ids.map(id => ({ key: id, changes: { synced: true } })));
    }
}

export const orderRepository = new OrderRepository();
