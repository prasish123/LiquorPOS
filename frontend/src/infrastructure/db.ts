import Dexie, { Table } from 'dexie';
import { Product, Order } from '../domain/types';

export class POSDatabase extends Dexie {
    // Strongly typed tables
    products!: Table<Product, string>; // id is primary key
    orders!: Table<Order, string>;

    constructor() {
        super('POSDatabase');

        // Define Version 1 Schema
        this.version(1).stores({
            products: 'id, &sku, name, category, ageRestricted', // &sku = unique index
            orders: 'id, timestamp, synced'
        });
    }
}

export const db = new POSDatabase();
