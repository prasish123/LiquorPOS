import { db } from '../db';
import { Product } from '../../domain/types';

export class ProductRepository {

    async search(query: string): Promise<Product[]> {
        if (!query) {
            // Return all products if query is empty (limit to 50 for performance)
            return await db.products.limit(50).toArray();
        }

        // Dexie case-insensitive search
        return await db.products
            .filter(p => p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.sku.toLowerCase().includes(query.toLowerCase()))
            .limit(50)
            .toArray();
    }

    async getAll(): Promise<Product[]> {
        return await db.products.limit(100).toArray();
    }

    async findBySku(sku: string): Promise<Product | undefined> {
        return await db.products.where('sku').equals(sku).first();
    }

    async seedDefaults(): Promise<void> {
        const count = await db.products.count();
        // If we have only the initial few items or empty, let's re-seed with the full demo set
        if (count > 0 && count < 10) {
            console.log("Upgrading seed data to full demo set...");
            await db.products.clear();
        } else if (count >= 10) {
            return;
        }

        console.log("Seeding Dexie DB with full inventory...");
        const products: Product[] = [
            // WHISKEY & BOURBON
            { id: crypto.randomUUID(), sku: 'WHISKEY-001', name: 'Jack Daniels Old No.7', basePrice: 28.99, category: 'Whiskey', ageRestricted: true, inventory: 50 },
            { id: crypto.randomUUID(), sku: 'WHISKEY-002', name: 'Jameson Irish Whiskey', basePrice: 32.50, category: 'Whiskey', ageRestricted: true, inventory: 40 },
            { id: crypto.randomUUID(), sku: 'WHISKEY-003', name: 'Makers Mark Bourbon', basePrice: 38.00, category: 'Whiskey', ageRestricted: true, inventory: 35 },
            { id: crypto.randomUUID(), sku: 'WHISKEY-004', name: 'Bulleit Bourbon', basePrice: 42.00, category: 'Whiskey', ageRestricted: true, inventory: 25 },
            { id: crypto.randomUUID(), sku: 'WHISKEY-005', name: 'Macallan 12 Year', basePrice: 85.00, category: 'Whiskey', ageRestricted: true, inventory: 15 },
            { id: crypto.randomUUID(), sku: 'WHISKEY-006', name: 'Woodford Reserve', basePrice: 45.00, category: 'Whiskey', ageRestricted: true, inventory: 30 },

            // VODKA
            { id: crypto.randomUUID(), sku: 'VODKA-001', name: 'Titos Handmade Vodka', basePrice: 24.00, category: 'Vodka', ageRestricted: true, inventory: 100 },
            { id: crypto.randomUUID(), sku: 'VODKA-002', name: 'Grey Goose', basePrice: 45.00, category: 'Vodka', ageRestricted: true, inventory: 45 },
            { id: crypto.randomUUID(), sku: 'VODKA-003', name: 'Ketel One', basePrice: 34.00, category: 'Vodka', ageRestricted: true, inventory: 40 },
            { id: crypto.randomUUID(), sku: 'VODKA-004', name: 'Absolut Vodka', basePrice: 22.00, category: 'Vodka', ageRestricted: true, inventory: 60 },
            { id: crypto.randomUUID(), sku: 'VODKA-005', name: 'Belvedere Vodka', basePrice: 48.00, category: 'Vodka', ageRestricted: true, inventory: 20 },

            // TEQUILA & MEZCAL
            { id: crypto.randomUUID(), sku: 'TEQUILA-001', name: 'Casamigos Blanco', basePrice: 52.00, category: 'Tequila', ageRestricted: true, inventory: 30 },
            { id: crypto.randomUUID(), sku: 'TEQUILA-002', name: 'Don Julio 1942', basePrice: 165.00, category: 'Tequila', ageRestricted: true, inventory: 10 },
            { id: crypto.randomUUID(), sku: 'TEQUILA-003', name: 'Patron Silver', basePrice: 48.00, category: 'Tequila', ageRestricted: true, inventory: 40 },
            { id: crypto.randomUUID(), sku: 'TEQUILA-004', name: 'Espolon Reposado', basePrice: 29.00, category: 'Tequila', ageRestricted: true, inventory: 50 },
            { id: crypto.randomUUID(), sku: 'MEZCAL-001', name: 'Del Maguey Vida', basePrice: 39.00, category: 'Mezcal', ageRestricted: true, inventory: 20 },
            { id: crypto.randomUUID(), sku: 'MEZCAL-002', name: 'Ilegal Mezcal Joven', basePrice: 44.00, category: 'Mezcal', ageRestricted: true, inventory: 18 },

            // RUM
            { id: crypto.randomUUID(), sku: 'RUM-001', name: 'Bacardi Superior', basePrice: 18.00, category: 'Rum', ageRestricted: true, inventory: 80 },
            { id: crypto.randomUUID(), sku: 'RUM-002', name: 'Captain Morgan Spiced', basePrice: 21.00, category: 'Rum', ageRestricted: true, inventory: 75 },
            { id: crypto.randomUUID(), sku: 'RUM-003', name: 'Malibu Coconut Rum', basePrice: 19.50, category: 'Rum', ageRestricted: true, inventory: 60 },
            { id: crypto.randomUUID(), sku: 'RUM-004', name: 'Kraken Black Spiced', basePrice: 24.00, category: 'Rum', ageRestricted: true, inventory: 40 },

            // GIN
            { id: crypto.randomUUID(), sku: 'GIN-001', name: 'Bombay Sapphire', basePrice: 28.00, category: 'Gin', ageRestricted: true, inventory: 50 },
            { id: crypto.randomUUID(), sku: 'GIN-002', name: 'Tanqueray London Dry', basePrice: 26.00, category: 'Gin', ageRestricted: true, inventory: 45 },
            { id: crypto.randomUUID(), sku: 'GIN-003', name: 'Hendricks Gin', basePrice: 38.00, category: 'Gin', ageRestricted: true, inventory: 30 },

            // BEER & SELTZER
            { id: crypto.randomUUID(), sku: 'BEER-003', name: 'Corona Extra 6pk', basePrice: 11.00, category: 'Beer', ageRestricted: true, inventory: 120 },
            { id: crypto.randomUUID(), sku: 'BEER-004', name: 'Modelo Especial 12pk', basePrice: 18.00, category: 'Beer', ageRestricted: true, inventory: 100 },
            { id: crypto.randomUUID(), sku: 'BEER-005', name: 'Blue Moon 6pk', basePrice: 13.00, category: 'Beer', ageRestricted: true, inventory: 80 },
            { id: crypto.randomUUID(), sku: 'SELTZER-001', name: 'White Claw Variety', basePrice: 19.00, category: 'Seltzer', ageRestricted: true, inventory: 80 },
            { id: crypto.randomUUID(), sku: 'SELTZER-002', name: 'High Noon 8pk', basePrice: 22.00, category: 'Seltzer', ageRestricted: true, inventory: 60 },

            // READY TO DRINK
            { id: crypto.randomUUID(), sku: 'RTD-001', name: 'Jose Cuervo Margarita', basePrice: 14.00, category: 'Premixed', ageRestricted: true, inventory: 50 },
            { id: crypto.randomUUID(), sku: 'RTD-002', name: 'Skinnygirl Margarita', basePrice: 13.50, category: 'Premixed', ageRestricted: true, inventory: 40 },

            // WINE
            { id: crypto.randomUUID(), sku: 'WINE-003', name: 'Meiomi Pinot Noir', basePrice: 22.00, category: 'Wine', ageRestricted: true, inventory: 55 },
            { id: crypto.randomUUID(), sku: 'WINE-004', name: 'Kim Crawford Sauvignon', basePrice: 18.00, category: 'Wine', ageRestricted: true, inventory: 60 },
            { id: crypto.randomUUID(), sku: 'WINE-005', name: 'Josh Cabernet', basePrice: 16.00, category: 'Wine', ageRestricted: true, inventory: 70 },
        ];

        await db.products.bulkAdd(products);
        console.log("Seeding complete.");
    }
}

export const productRepository = new ProductRepository();
