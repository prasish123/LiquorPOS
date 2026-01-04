/**
 * Script to apply REQ-002 Receipt migration
 * This creates the Receipt table and updates Location
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
      '../prisma/migrations/20260103201530_receipt/migration.sql',
    );
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Applying receipt migration...');
    await pool.query(migrationSql);

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('Created:');
    console.log('  - Receipt table');
    console.log('  - Location.receiptHeader column');
    console.log('  - Location.receiptFooter column');
    console.log('');
    console.log('⚠️  Receipt printing feature is now available.');
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

