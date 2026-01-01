import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database with sample data...\n');

    // Create location
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
            licenseNumber: 'FL-LIQ-12345',
            licenseExpiry: new Date('2026-12-31'),
        },
    });
    console.log('✅ Location:', location.name);

    // Create products
    const productsData = [
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

    for (const data of productsData) {
        const product = await prisma.product.upsert({
            where: { sku: data.sku },
            update: {},
            create: {
                ...data,
                searchText: `${data.name} ${data.description} ${data.category}`.toLowerCase(),
            },
        });

        // Create inventory
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

        console.log(`✅ Product: ${product.name} (${product.sku})`);
    }

    // Create customer
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
    console.log('✅ Customer:', customer.firstName, customer.lastName);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - 1 location`);
    console.log(`   - ${productsData.length} products with inventory`);
    console.log(`   - 1 customer`);
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
