/**
 * Script to apply REQ-003 Price Override migration
 * This creates the PriceOverride table and updates TransactionItem
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:password@localhost:5432/liquor_pos';

  console.log('🔄 Connecting to database...');
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    // Read migration SQL
    const migrationPath = path.join(
      __dirname,
      '../prisma/migrations/20260103195414_price_override/migration.sql',
    );
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Applying price override migration...');
    await pool.query(migrationSql);

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('Created:');
    console.log('  - OverrideReason enum');
    console.log('  - PriceOverride table');
    console.log('  - TransactionItem.originalPrice column');
    console.log('  - TransactionItem.priceOverridden column');
    console.log('');
    console.log('⚠️  Manager price override feature is now available.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
applyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

