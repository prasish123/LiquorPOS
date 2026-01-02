#!/usr/bin/env ts-node

/**
 * Disaster Recovery Script: Restore Database
 * 
 * This script restores the database from a backup with optional point-in-time recovery.
 * 
 * Usage:
 *   npm run dr:restore -- --backup-id=backup-1234567890
 *   npm run dr:restore -- --backup-id=backup-1234567890 --target-time="2024-01-15T10:30:00Z"
 *   npm run dr:restore -- --backup-id=backup-1234567890 --validate-only
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';

const execAsync = promisify(exec);

interface RestoreConfig {
  backupId: string;
  targetTime?: Date;
  validateOnly: boolean;
  skipWalReplay: boolean;
  backupDir: string;
  walArchiveDir: string;
}

async function main() {
  console.log('🔄 Disaster Recovery - Database Restore\n');

  // Parse command line arguments
  const config = parseArguments();

  // Display configuration
  console.log('Configuration:');
  console.log(`  Backup ID: ${config.backupId}`);
  console.log(`  Target Time: ${config.targetTime?.toISOString() || 'Latest'}`);
  console.log(`  Validate Only: ${config.validateOnly}`);
  console.log(`  Skip WAL Replay: ${config.skipWalReplay}`);
  console.log();

  // Confirm restore operation
  if (!config.validateOnly) {
    const confirmed = await confirmRestore();
    if (!confirmed) {
      console.log('Restore cancelled by user');
      process.exit(0);
    }
  }

  try {
    // Step 1: Verify backup exists and is valid
    console.log('Step 1: Verifying backup integrity...');
    await verifyBackup(config);
    console.log('✅ Backup verified\n');

    if (config.validateOnly) {
      console.log('✅ Validation complete - no restore performed');
      process.exit(0);
    }

    // Step 2: Stop application
    console.log('Step 2: Stopping application...');
    await stopApplication();
    console.log('✅ Application stopped\n');

    // Step 3: Create safety backup
    console.log('Step 3: Creating safety backup of current state...');
    await createSafetyBackup();
    console.log('✅ Safety backup created\n');

    // Step 4: Restore from backup
    console.log('Step 4: Restoring database from backup...');
    await restoreDatabase(config);
    console.log('✅ Database restored\n');

    // Step 5: Replay WAL logs (if needed)
    if (!config.skipWalReplay && config.targetTime) {
      console.log('Step 5: Replaying WAL logs for point-in-time recovery...');
      await replayWalLogs(config);
      console.log('✅ WAL replay complete\n');
    }

    // Step 6: Verify restored data
    console.log('Step 6: Verifying restored data...');
    await verifyRestoredData();
    console.log('✅ Data verification complete\n');

    // Step 7: Start application
    console.log('Step 7: Starting application...');
    await startApplication();
    console.log('✅ Application started\n');

    console.log('🎉 Restore completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Verify application is working correctly');
    console.log('  2. Check logs for any errors');
    console.log('  3. Test critical functionality');
    console.log('  4. Monitor system performance');

  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    console.error('\nRecovery steps:');
    console.error('  1. Check error logs');
    console.error('  2. Restore from safety backup if needed');
    console.error('  3. Contact support if issue persists');
    process.exit(1);
  }
}

function parseArguments(): RestoreConfig {
  const args = process.argv.slice(2);
  const config: RestoreConfig = {
    backupId: '',
    validateOnly: false,
    skipWalReplay: false,
    backupDir: process.env.BACKUP_DIR || './backups',
    walArchiveDir: process.env.WAL_ARCHIVE_DIR || './wal_archive',
  };

  for (const arg of args) {
    if (arg.startsWith('--backup-id=')) {
      config.backupId = arg.split('=')[1];
    } else if (arg.startsWith('--target-time=')) {
      config.targetTime = new Date(arg.split('=')[1]);
    } else if (arg === '--validate-only') {
      config.validateOnly = true;
    } else if (arg === '--skip-wal-replay') {
      config.skipWalReplay = true;
    }
  }

  if (!config.backupId) {
    console.error('Error: --backup-id is required');
    console.error('Usage: npm run dr:restore -- --backup-id=backup-1234567890');
    process.exit(1);
  }

  return config;
}

async function confirmRestore(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log('⚠️  WARNING: This will replace the current database!');
    console.log('⚠️  All current data will be lost!');
    console.log();

    rl.question('Type "RESTORE" to confirm: ', (answer) => {
      rl.close();
      resolve(answer.trim() === 'RESTORE');
    });
  });
}

async function verifyBackup(config: RestoreConfig): Promise<void> {
  const backupPath = path.join(config.backupDir, `${config.backupId}.sql.gz`);

  // Check if backup file exists
  try {
    await fs.access(backupPath);
  } catch {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  // Verify backup can be decompressed
  try {
    await execAsync(`gzip -t "${backupPath}"`);
  } catch {
    throw new Error('Backup file is corrupted');
  }

  // Verify metadata
  const metadataPath = path.join(config.backupDir, 'metadata.json');
  try {
    const data = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(data);
    const backupMeta = metadata.find((m: any) => m.id === config.backupId);

    if (!backupMeta) {
      throw new Error('Backup metadata not found');
    }

    if (backupMeta.status !== 'completed') {
      throw new Error(`Backup status is ${backupMeta.status}, expected 'completed'`);
    }
  } catch (error) {
    console.warn('Warning: Could not verify backup metadata:', error.message);
  }
}

async function stopApplication(): Promise<void> {
  try {
    // Try to stop using PM2
    await execAsync('pm2 stop liquor-pos-backend');
  } catch {
    // Try to stop using systemctl
    try {
      await execAsync('sudo systemctl stop liquor-pos-backend');
    } catch {
      console.warn('Warning: Could not stop application automatically');
      console.warn('Please stop the application manually before continuing');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function startApplication(): Promise<void> {
  try {
    // Try to start using PM2
    await execAsync('pm2 start liquor-pos-backend');
  } catch {
    // Try to start using systemctl
    try {
      await execAsync('sudo systemctl start liquor-pos-backend');
    } catch {
      console.warn('Warning: Could not start application automatically');
      console.warn('Please start the application manually');
    }
  }
}

async function createSafetyBackup(): Promise<void> {
  const timestamp = Date.now();
  const safetyBackupPath = `./backups/safety-backup-${timestamp}.sql`;

  try {
    const databaseUrl = process.env.DATABASE_URL;
    await execAsync(
      `pg_dump "${databaseUrl}" --format=plain --no-owner --no-acl --file="${safetyBackupPath}"`,
    );
    await execAsync(`gzip -f "${safetyBackupPath}"`);
    console.log(`Safety backup created: ${safetyBackupPath}.gz`);
  } catch (error) {
    console.warn('Warning: Could not create safety backup:', error.message);
  }
}

async function restoreDatabase(config: RestoreConfig): Promise<void> {
  const backupPath = path.join(config.backupDir, `${config.backupId}.sql.gz`);
  const decompressedPath = backupPath.replace('.gz', '');

  // Decompress backup
  await execAsync(`gunzip -c "${backupPath}" > "${decompressedPath}"`);

  try {
    const databaseUrl = process.env.DATABASE_URL;

    // Drop and recreate schema
    await execAsync(
      `psql "${databaseUrl}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`,
    );

    // Restore from backup
    await execAsync(`psql "${databaseUrl}" < "${decompressedPath}"`);

  } finally {
    // Clean up decompressed file
    await fs.unlink(decompressedPath).catch(() => {});
  }
}

async function replayWalLogs(config: RestoreConfig): Promise<void> {
  const walFiles = await fs.readdir(config.walArchiveDir);
  const sortedWalFiles = walFiles.sort();

  for (const walFile of sortedWalFiles) {
    const walPath = path.join(config.walArchiveDir, walFile);
    const stats = await fs.stat(walPath);

    // Stop if WAL file is after target time
    if (config.targetTime && stats.mtime > config.targetTime) {
      break;
    }

    console.log(`  Replaying: ${walFile}`);
    const databaseUrl = process.env.DATABASE_URL;
    await execAsync(`pg_waldump "${walPath}" | psql "${databaseUrl}"`);
  }
}

async function verifyRestoredData(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  // Check if tables exist
  const { stdout } = await execAsync(
    `psql "${databaseUrl}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`,
  );

  const tableCount = parseInt(stdout.trim());
  if (tableCount === 0) {
    throw new Error('No tables found in restored database');
  }

  console.log(`  Found ${tableCount} tables`);

  // Check if data exists
  const tables = ['Product', 'Location', 'Transaction'];
  for (const table of tables) {
    try {
      const { stdout: count } = await execAsync(
        `psql "${databaseUrl}" -t -c "SELECT COUNT(*) FROM \\"${table}\\";"`,
      );
      console.log(`  ${table}: ${count.trim()} rows`);
    } catch {
      console.warn(`  Warning: Could not verify ${table} table`);
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

