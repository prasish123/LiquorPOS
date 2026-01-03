import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Initialize Prisma client with adapter for Prisma 7
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/liquor_pos';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Seeding database...');

    // Create a location
    const location = await prisma.location.upsert({
        where: { id: 'loc-001' },
        update: {},
        create: {
            id: 'loc-001',
            name: 'Main Store',
            address: '123 Main St',
            city: 'Miami',
            state: 'FL',
            zip: '33101',
            taxRate: 0.07, // 7% Florida state tax
            countyTaxRate: 0.015, // 1.5% Miami-Dade county tax
            licenseNumber: 'FL-LIQ-12345',
            licenseExpiry: new Date('2026-12-31'),
        },
    });
    console.log('✅ Created location:', location.name);

    // Create sample products
    const products = [
        {
            sku: 'WINE-001',
            upc: '012345678901',
            name: 'Cabernet Sauvignon 2020',
            description: 'Full-bodied red wine from Napa Valley',
            category: 'wine',
            abv: 13.5,
            volumeMl: 750,
            caseSize: 12,
            basePrice: 24.99,
            cost: 15.00,
            ageRestricted: true,
        },
        {
            sku: 'BEER-001',
            upc: '012345678902',
            name: 'Craft IPA 6-Pack',
            description: 'Hoppy India Pale Ale',
            category: 'beer',
            abv: 6.5,
            volumeMl: 355,
            caseSize: 24,
            basePrice: 12.99,
            cost: 8.00,
            ageRestricted: true,
        },
        {
            sku: 'SPIRITS-001',
            upc: '012345678903',
            name: 'Premium Vodka 750ml',
            description: 'Smooth premium vodka',
            category: 'spirits',
            abv: 40.0,
            volumeMl: 750,
            caseSize: 6,
            basePrice: 29.99,
            cost: 18.00,
            ageRestricted: true,
        },
        {
            sku: 'MIXER-001',
            upc: '012345678904',
            name: 'Tonic Water 4-Pack',
            description: 'Premium tonic water',
            category: 'mixers',
            volumeMl: 200,
            caseSize: 24,
            basePrice: 5.99,
            cost: 3.00,
            ageRestricted: false,
        },
        {
            sku: 'SNACK-001',
            upc: '012345678905',
            name: 'Mixed Nuts',
            description: 'Roasted and salted mixed nuts',
            category: 'snacks',
            caseSize: 12,
            basePrice: 4.99,
            cost: 2.50,
            ageRestricted: false,
        },
    ];

    for (const productData of products) {
        const product = await prisma.product.upsert({
            where: { sku: productData.sku },
            update: {},
            create: {
                ...productData,
                searchText: `${productData.name} ${productData.description} ${productData.category}`.toLowerCase(),
            },
        });

        // Create inventory for this product
        await prisma.inventory.upsert({
            where: {
                productId_locationId: {
                    productId: product.id,
                    locationId: location.id,
                },
            },
            update: {},
            create: {
                productId: product.id,
                locationId: location.id,
                quantity: 100,
                reserved: 0,
                reorderPoint: 20,
            },
        });

        console.log(`✅ Created product: ${product.name}`);
    }

    // Create a sample customer
    const customer = await prisma.customer.upsert({
        where: { email: 'john.doe@example.com' },
        update: {},
        create: {
            email: 'john.doe@example.com',
            phone: '+1-305-555-0123',
            firstName: 'John',
            lastName: 'Doe',
            ageVerified: true,
            dateOfBirth: new Date('1985-06-15'),
            loyaltyPoints: 0,
            lifetimeValue: 0,
        },
    });
    console.log('✅ Created customer:', customer.firstName, customer.lastName);

    // Create Users
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            pin: '1234',
        },
    });
    console.log('✅ Created user: admin');

    const manager = await prisma.user.upsert({
        where: { username: 'manager' },
        update: {},
        create: {
            username: 'manager',
            password: hashedPassword,
            firstName: 'Manager',
            lastName: 'User',
            role: 'MANAGER',
            pin: '5678',
        },
    });
    console.log('✅ Created user: manager');

    const cashier = await prisma.user.upsert({
        where: { username: 'cashier' },
        update: {},
        create: {
            username: 'cashier',
            password: hashedPassword,
            firstName: 'Cashier',
            lastName: 'One',
            role: 'CASHIER',
            pin: '0000',
        },
    });
    console.log('✅ Created user: cashier');

    console.log('🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
