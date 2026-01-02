#!/usr/bin/env ts-node
/**
 * SQLite to PostgreSQL Migration Script
 * 
 * This script migrates data from SQLite to PostgreSQL database.
 * 
 * Usage:
 *   SQLITE_URL=file:./dev.db DATABASE_URL=postgresql://... npm run migrate:sqlite-to-postgres
 * 
 * Features:
 * - Migrates all tables in order (respects foreign keys)
 * - Uses upsert to handle existing records
 * - Provides progress feedback
 * - Handles errors gracefully
 * - Validates data integrity after migration
 */

import { PrismaClient } from '@prisma/client';

interface MigrationStats {
  users: number;
  locations: number;
  products: number;
  productImages: number;
  inventory: number;
  customers: number;
  transactions: number;
  transactionItems: number;
  payments: number;
  eventLogs: number;
  auditLogs: number;
}

async function migrateSQLiteToPostgres() {
  const sqliteUrl = process.env.SQLITE_URL || 'file:./dev.db';
  const postgresUrl = process.env.DATABASE_URL;

  if (!postgresUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  if (!postgresUrl.startsWith('postgresql://') && !postgresUrl.startsWith('postgres://')) {
    console.error('❌ DATABASE_URL must be a PostgreSQL connection string');
    process.exit(1);
  }

  console.log('🔄 Starting migration from SQLite to PostgreSQL...');
  console.log(`📦 Source: ${sqliteUrl}`);
  console.log(`📦 Destination: ${postgresUrl.replace(/:[^:@]+@/, ':****@')}`);
  console.log('');

  // Connect to SQLite (source)
  // Note: In Prisma 7, we set the DATABASE_URL environment variable
  const originalUrl = process.env.DATABASE_URL;
  
  process.env.DATABASE_URL = sqliteUrl;
  const sqlite = new PrismaClient();

  // Connect to PostgreSQL (destination)
  process.env.DATABASE_URL = postgresUrl;
  const postgres = new PrismaClient();
  
  // Restore original URL
  process.env.DATABASE_URL = originalUrl || '';

  const stats: MigrationStats = {
    users: 0,
    locations: 0,
    products: 0,
    productImages: 0,
    inventory: 0,
    customers: 0,
    transactions: 0,
    transactionItems: 0,
    payments: 0,
    eventLogs: 0,
    auditLogs: 0,
  };

  try {
    // Test connections
    console.log('🔌 Testing database connections...');
    await sqlite.$connect();
    await postgres.$connect();
    console.log('✅ Connected to both databases');
    console.log('');

    // 1. Migrate Users
    console.log('👤 Migrating users...');
    const users = await sqlite.user.findMany();
    for (const user of users) {
      await postgres.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      });
      stats.users++;
    }
    console.log(`✅ Migrated ${stats.users} users`);

    // 2. Migrate Locations
    console.log('📍 Migrating locations...');
    const locations = await sqlite.location.findMany();
    for (const location of locations) {
      await postgres.location.upsert({
        where: { id: location.id },
        update: location,
        create: location,
      });
      stats.locations++;
    }
    console.log(`✅ Migrated ${stats.locations} locations`);

    // 3. Migrate Products
    console.log('🍷 Migrating products...');
    const products = await sqlite.product.findMany();
    for (const product of products) {
      await postgres.product.upsert({
        where: { id: product.id },
        update: product,
        create: product,
      });
      stats.products++;
    }
    console.log(`✅ Migrated ${stats.products} products`);

    // 4. Migrate Product Images
    console.log('🖼️  Migrating product images...');
    const images = await sqlite.productImage.findMany();
    for (const image of images) {
      await postgres.productImage.upsert({
        where: { id: image.id },
        update: image,
        create: image,
      });
      stats.productImages++;
    }
    console.log(`✅ Migrated ${stats.productImages} product images`);

    // 5. Migrate Inventory
    console.log('📦 Migrating inventory...');
    const inventory = await sqlite.inventory.findMany();
    for (const inv of inventory) {
      await postgres.inventory.upsert({
        where: { id: inv.id },
        update: inv,
        create: inv,
      });
      stats.inventory++;
    }
    console.log(`✅ Migrated ${stats.inventory} inventory records`);

    // 6. Migrate Customers
    console.log('👥 Migrating customers...');
    const customers = await sqlite.customer.findMany();
    for (const customer of customers) {
      await postgres.customer.upsert({
        where: { id: customer.id },
        update: customer,
        create: customer,
      });
      stats.customers++;
    }
    console.log(`✅ Migrated ${stats.customers} customers`);

    // 7. Migrate Transactions (with items and payments)
    console.log('💰 Migrating transactions...');
    const transactions = await sqlite.transaction.findMany({
      include: {
        items: true,
        payments: true,
      },
    });

    for (const transaction of transactions) {
      const { items, payments, ...txData } = transaction;

      // Migrate transaction
      await postgres.transaction.upsert({
        where: { id: transaction.id },
        update: txData,
        create: txData,
      });
      stats.transactions++;

      // Migrate transaction items
      for (const item of items) {
        await postgres.transactionItem.upsert({
          where: { id: item.id },
          update: item,
          create: item,
        });
        stats.transactionItems++;
      }

      // Migrate payments
      for (const payment of payments) {
        await postgres.payment.upsert({
          where: { id: payment.id },
          update: payment,
          create: payment,
        });
        stats.payments++;
      }
    }
    console.log(`✅ Migrated ${stats.transactions} transactions`);
    console.log(`   ├─ ${stats.transactionItems} transaction items`);
    console.log(`   └─ ${stats.payments} payments`);

    // 8. Migrate Event Logs
    console.log('📝 Migrating event logs...');
    const eventLogs = await sqlite.eventLog.findMany();
    for (const log of eventLogs) {
      await postgres.eventLog.upsert({
        where: { id: log.id },
        update: log,
        create: log,
      });
      stats.eventLogs++;
    }
    console.log(`✅ Migrated ${stats.eventLogs} event logs`);

    // 9. Migrate Audit Logs
    console.log('🔒 Migrating audit logs...');
    const auditLogs = await sqlite.auditLog.findMany();
    for (const log of auditLogs) {
      await postgres.auditLog.upsert({
        where: { id: log.id },
        update: log,
        create: log,
      });
      stats.auditLogs++;
    }
    console.log(`✅ Migrated ${stats.auditLogs} audit logs`);

    // Validate migration
    console.log('');
    console.log('🔍 Validating migration...');
    const validation = await validateMigration(sqlite, postgres);
    
    if (validation.success) {
      console.log('✅ Migration validation passed');
    } else {
      console.error('❌ Migration validation failed:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      throw new Error('Migration validation failed');
    }

    // Print summary
    console.log('');
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('📊 Migration Summary:');
    console.log('┌─────────────────────┬────────┐');
    console.log('│ Table               │ Count  │');
    console.log('├─────────────────────┼────────┤');
    console.log(`│ Users               │ ${String(stats.users).padStart(6)} │`);
    console.log(`│ Locations           │ ${String(stats.locations).padStart(6)} │`);
    console.log(`│ Products            │ ${String(stats.products).padStart(6)} │`);
    console.log(`│ Product Images      │ ${String(stats.productImages).padStart(6)} │`);
    console.log(`│ Inventory           │ ${String(stats.inventory).padStart(6)} │`);
    console.log(`│ Customers           │ ${String(stats.customers).padStart(6)} │`);
    console.log(`│ Transactions        │ ${String(stats.transactions).padStart(6)} │`);
    console.log(`│ Transaction Items   │ ${String(stats.transactionItems).padStart(6)} │`);
    console.log(`│ Payments            │ ${String(stats.payments).padStart(6)} │`);
    console.log(`│ Event Logs          │ ${String(stats.eventLogs).padStart(6)} │`);
    console.log(`│ Audit Logs          │ ${String(stats.auditLogs).padStart(6)} │`);
    console.log('└─────────────────────┴────────┘');
    console.log('');
    console.log('✅ All data migrated successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Verify data in PostgreSQL database');
    console.log('2. Update DATABASE_URL in .env to PostgreSQL connection string');
    console.log('3. Test application with PostgreSQL');
    console.log('4. Backup SQLite database (for rollback if needed)');
    console.log('5. Remove SQLite database after confirming PostgreSQL works');

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check database connections');
    console.error('2. Verify PostgreSQL is running');
    console.error('3. Check DATABASE_URL is correct');
    console.error('4. Ensure PostgreSQL schema is up to date (run migrations)');
    console.error('5. Check PostgreSQL logs for errors');
    throw error;
  } finally {
    await sqlite.$disconnect();
    await postgres.$disconnect();
  }
}

async function validateMigration(
  sqlite: PrismaClient,
  postgres: PrismaClient,
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Count records in each database
    const sqliteCounts = {
      users: await sqlite.user.count(),
      locations: await sqlite.location.count(),
      products: await sqlite.product.count(),
      productImages: await sqlite.productImage.count(),
      inventory: await sqlite.inventory.count(),
      customers: await sqlite.customer.count(),
      transactions: await sqlite.transaction.count(),
      transactionItems: await sqlite.transactionItem.count(),
      payments: await sqlite.payment.count(),
      eventLogs: await sqlite.eventLog.count(),
      auditLogs: await sqlite.auditLog.count(),
    };

    const postgresCounts = {
      users: await postgres.user.count(),
      locations: await postgres.location.count(),
      products: await postgres.product.count(),
      productImages: await postgres.productImage.count(),
      inventory: await postgres.inventory.count(),
      customers: await postgres.customer.count(),
      transactions: await postgres.transaction.count(),
      transactionItems: await postgres.transactionItem.count(),
      payments: await postgres.payment.count(),
      eventLogs: await postgres.eventLog.count(),
      auditLogs: await postgres.auditLog.count(),
    };

    // Compare counts
    for (const [table, count] of Object.entries(sqliteCounts)) {
      const postgresCount = postgresCounts[table as keyof typeof postgresCounts];
      if (count !== postgresCount) {
        errors.push(
          `${table}: SQLite has ${count} records, PostgreSQL has ${postgresCount} records`,
        );
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  } catch (error) {
    errors.push(`Validation error: ${error}`);
    return {
      success: false,
      errors,
    };
  }
}

// Run migration
if (require.main === module) {
  migrateSQLiteToPostgres()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateSQLiteToPostgres };

