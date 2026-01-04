/**
 * Script to apply REQ-001 Audit Log Immutability migration
 * This creates PostgreSQL triggers to prevent modification/deletion of audit logs
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/liquor_pos';
  
  console.log('🔄 Connecting to database...');
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    // Read migration SQL
    const migrationPath = path.join(
      __dirname,
      '../prisma/migrations/20260103193315_audit_log_immutability/migration.sql'
    );
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Applying audit log immutability migration...');
    await pool.query(migrationSql);

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('Audit log triggers created:');
    console.log('  - audit_log_prevent_update');
    console.log('  - audit_log_prevent_delete');
    console.log('');
    console.log('⚠️  Audit logs are now immutable and cannot be modified or deleted.');

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

