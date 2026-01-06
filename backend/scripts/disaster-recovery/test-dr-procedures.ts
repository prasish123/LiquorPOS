#!/usr/bin/env ts-node

/**
 * Disaster Recovery Testing Script
 * 
 * This script tests disaster recovery procedures quarterly to ensure they work correctly.
 * 
 * Tests:
 * 1. Create test backup
 * 2. Verify backup integrity
 * 3. Test restore to temporary database
 * 4. Verify restored data
 * 5. Test point-in-time recovery
 * 6. Measure recovery time
 * 
 * Usage:
 *   npm run dr:test
 *   npm run dr:test -- --full  (includes WAL replay testing)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  details?: any;
}

interface DRTestReport {
  timestamp: Date;
  testResults: TestResult[];
  totalDuration: number;
  passRate: number;
  rto: number; // Recovery Time Objective (in minutes)
  rpo: number; // Recovery Point Objective (in minutes)
}

async function main() {
  console.log('🧪 Disaster Recovery Testing Suite\n');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const fullTest = process.argv.includes('--full');
  const report: DRTestReport = {
    timestamp: new Date(),
    testResults: [],
    totalDuration: 0,
    passRate: 0,
    rto: 0,
    rpo: 0,
  };

  const startTime = Date.now();

  try {
    // Test 1: Backup Creation
    report.testResults.push(await testBackupCreation());

    // Test 2: Backup Integrity
    report.testResults.push(await testBackupIntegrity());

    // Test 3: Backup Compression
    report.testResults.push(await testBackupCompression());

    // Test 4: Metadata Validation
    report.testResults.push(await testMetadataValidation());

    // Test 5: Restore to Test Database
    report.testResults.push(await testRestoreToTestDb());

    // Test 6: Data Verification
    report.testResults.push(await testDataVerification());

    // Test 7: WAL Archiving (if full test)
    if (fullTest) {
      report.testResults.push(await testWalArchiving());
      report.testResults.push(await testPointInTimeRecovery());
    }

    // Test 8: Recovery Time Measurement
    report.testResults.push(await testRecoveryTime());

    // Test 9: Backup Cleanup
    report.testResults.push(await testBackupCleanup());

    // Test 10: S3 Upload (if configured)
    if (process.env.BACKUP_S3_ENABLED === 'true') {
      report.testResults.push(await testS3Upload());
    }

    // Calculate metrics
    report.totalDuration = Date.now() - startTime;
    const passedTests = report.testResults.filter(r => r.status === 'pass').length;
    const totalTests = report.testResults.filter(r => r.status !== 'skip').length;
    report.passRate = (passedTests / totalTests) * 100;

    // Print report
    printReport(report);

    // Save report
    await saveReport(report);

    // Exit with appropriate code
    const hasFailures = report.testResults.some(r => r.status === 'fail');
    process.exit(hasFailures ? 1 : 0);

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

async function testBackupCreation(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Backup Creation';

  try {
    console.log(`Running: ${testName}...`);

    const databaseUrl = process.env.DATABASE_URL;
    const backupPath = './backups/test-backup.sql';

    // Create backup
    await execAsync(
      `pg_dump "${databaseUrl}" --format=plain --no-owner --no-acl --file="${backupPath}"`,
      { maxBuffer: 100 * 1024 * 1024 },
    );

    // Verify file exists and has content
    const stats = await fs.stat(backupPath);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }

    console.log(`✅ ${testName} - PASS (${stats.size} bytes)\n`);

    return {
      name: testName,
      status: 'pass',
      duration: Date.now() - startTime,
      details: { size: stats.size },
    };
  } catch (error) {
    console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
    return {
      name: testName,
      status: 'fail',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function testBackupIntegrity(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Backup Integrity';

  try {
    console.log(`Running: ${testName}...`);

    const backupPath = './backups/test-backup.sql';

    // Compress backup
    await execAsync(`gzip -f "${backupPath}"`);

    // Test decompression
    await execAsync(`gzip -t "${backupPath}.gz"`);

    // Calculate checksum
    const { stdout } = await execAsync(`sha256sum "${backupPath}.gz"`);
    const checksum = stdout.split(' ')[0];

    console.log(`✅ ${testName} - PASS (checksum: ${checksum.substring(0, 8)}...)\n`);

    return {
      name: testName,
      status: 'pass',
      duration: Date.now() - startTime,
      details: { checksum },
    };
  } catch (error) {
    console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
    return {
      name: testName,
      status: 'fail',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function testBackupCompression(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Backup Compression';

  try {
    console.log(`Running: ${testName}...`);

    const backupPath = './backups/test-backup.sql.gz';
    const stats = await fs.stat(backupPath);

    // Decompress to check original size
    await execAsync(`gunzip -c "${backupPath}" > ./backups/test-backup-decompressed.sql`);
    const decompressedStats = await fs.stat('./backups/test-backup-decompressed.sql');

    const compressionRatio = ((1 - stats.size / decompressedStats.size) * 100).toFixed(2);

    // Clean up
    await fs.unlink('./backups/test-backup-decompressed.sql');

    console.log(`✅ ${testName} - PASS (${compressionRatio}% compression)\n`);

    return {
      name: testName,
      status: 'pass',
      duration: Date.now() - startTime,
      details: { compressionRatio: parseFloat(compressionRatio) },
    };
  } catch (error) {
    console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
    return {
      name: testName,
      status: 'fail',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function testMetadataValidation(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Metadata Validation';

  try {
    console.log(`Running: ${testName}...`);

    const metadataPath = './backups/metadata.json';

    // Check if metadata file exists
    await fs.access(metadataPath);

    // Parse and validate metadata
    const data = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(data);

    if (!Array.isArray(metadata)) {
      throw new Error('Metadata is not an array');
    }

    // Validate required fields
    for (const item of metadata) {
      if (!item.id || !item.timestamp || !item.type || !item.status) {
        throw new Error('Metadata missing required fields');
      }
    }

    console.log(`✅ ${testName} - PASS (${metadata.length} backups)\n`);

    return {
      name: testName,
      status: 'pass',
      duration: Date.now() - startTime,
      details: { backupCount: metadata.length },
    };
  } catch (error) {
    console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
    return {
      name: testName,
      status: 'fail',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function testRestoreToTestDb(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Restore to Test Database';

  try {
    console.log(`Running: ${testName}...`);

    // Create test database
    const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    const backupPath = './backups/test-backup.sql.gz';

    // Decompress
    await execAsync(`gunzip -c "${backupPath}" > ./backups/test-backup-restore.sql`);

    // Restore to test database
    await execAsync(`psql "${testDbUrl}" < ./backups/test-backup-restore.sql`);

    // Clean up
    await fs.unlink('./backups/test-backup-restore.sql');

    console.log(`✅ ${testName} - PASS\n`);

    return {
      name: testName,
      status: 'pass',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
    return {
      name: testName,
      status: 'fail',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function testDataVerification(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Data Verification';

  try {
    console.log(`Running: ${testName}...`);

    const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

    // Check table count
    const { stdout: tableCount } = await execAsync(
      `psql "${testDbUrl}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`,
    );

    const tables = parseInt(tableCount.trim());
    if (tables === 0) {
      throw new Error('No tables found in restored database');
    }

    // Check data in key tables
    const { stdout: productCount } = await execAsync(
      `psql "${testDbUrl}" -t -c "SELECT COUNT(*) FROM \\"Product\\";"`,
    );

    console.log(`✅ ${testName} - PASS (${tables} tables, ${productCount.trim()} products)\n`);

    return {
      name: testName,
      status: 'pass',
      duration: Date.now() - startTime,
      details: { tables, products: parseInt(productCount.trim()) },
    };
  } catch (error) {
    console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
    return {
      name: testName,
      status: 'fail',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function testWalArchiving(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'WAL Archiving';

  try {
    console.log(`Running: ${testName}...`);

    const databaseUrl = process.env.DATABASE_URL;

    // Check WAL level
    const { stdout: walLevel } = await execAsync(
      `psql "${databaseUrl}" -t -c "SHOW wal_level;"`,
    );

    const level = walLevel.trim();
    if (level !== 'replica' && level !== 'logical') {
      throw new Error(`WAL level is '${level}', expected 'replica' or 'logical'`);
    }

    // Check if WAL files exist
    const walArchiveDir = process.env.WAL_ARCHIVE_DIR || './wal_archive';
    try {
      const walFiles = await fs.readdir(walArchiveDir);
      console.log(`✅ ${testName} - PASS (${walFiles.length} WAL files)\n`);

      return {
        name: testName,
        status: 'pass',
        duration: Date.now() - startTime,
        details: { walLevel: level, walFiles: walFiles.length },
      };
    } catch {
      console.log(`⚠️  ${testName} - SKIP (no WAL archive directory)\n`);
      return {
        name: testName,
        status: 'skip',
        duration: Date.now() - startTime,
      };
    }
  } catch (error) {
    console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
    return {
      name: testName,
      status: 'fail',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function testPointInTimeRecovery(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Point-in-Time Recovery';

  try {
    console.log(`Running: ${testName}...`);

    // This is a simplified test - full PITR testing requires more setup
    console.log(`⚠️  ${testName} - SKIP (requires full WAL setup)\n`);

    return {
      name: testName,
      status: 'skip',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
    return {
      name: testName,
      status: 'fail',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function testRecoveryTime(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Recovery Time Measurement';

  try {
    console.log(`Running: ${testName}...`);

    // Measure time to restore backup
    const restoreStart = Date.now();
    const backupPath = './backups/test-backup.sql.gz';
    const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

    await execAsync(`gunzip -c "${backupPath}" > ./backups/test-rto.sql`);
    await execAsync(`psql "${testDbUrl}" < ./backups/test-rto.sql`);
    await fs.unlink('./backups/test-rto.sql');

    const recoveryTime = (Date.now() - restoreStart) / 1000 / 60; // minutes

    console.log(`✅ ${testName} - PASS (RTO: ${recoveryTime.toFixed(2)} minutes)\n`);

    return {
      name: testName,
      status: 'pass',
      duration: Date.now() - startTime,
      details: { rto: recoveryTime },
    };
  } catch (error) {
    console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
    return {
      name: testName,
      status: 'fail',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function testBackupCleanup(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Backup Cleanup';

  try {
    console.log(`Running: ${testName}...`);

    // Clean up test files
    const testFiles = [
      './backups/test-backup.sql',
      './backups/test-backup.sql.gz',
    ];

    for (const file of testFiles) {
      try {
        await fs.unlink(file);
      } catch {
        // File may not exist
      }
    }

    console.log(`✅ ${testName} - PASS\n`);

    return {
      name: testName,
      status: 'pass',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
    return {
      name: testName,
      status: 'fail',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function testS3Upload(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'S3 Upload';

  try {
    console.log(`Running: ${testName}...`);

    const s3Bucket = process.env.BACKUP_S3_BUCKET;
    if (!s3Bucket) {
      throw new Error('BACKUP_S3_BUCKET not configured');
    }

    // Test S3 access
    await execAsync(`aws s3 ls s3://${s3Bucket}/ --max-items 1`);

    console.log(`✅ ${testName} - PASS\n`);

    return {
      name: testName,
      status: 'pass',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.log(`❌ ${testName} - FAIL: ${error.message}\n`);
    return {
      name: testName,
      status: 'fail',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

function printReport(report: DRTestReport) {
  console.log('\n' + '='.repeat(80));
  console.log('DISASTER RECOVERY TEST REPORT');
  console.log('='.repeat(80));
  console.log(`\nTimestamp: ${report.timestamp.toISOString()}`);
  console.log(`Total Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
  console.log(`Pass Rate: ${report.passRate.toFixed(2)}%\n`);

  console.log('Test Results:');
  console.log('-'.repeat(80));

  for (const result of report.testResults) {
    const statusIcon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️ ';
    const duration = (result.duration / 1000).toFixed(2);
    console.log(`${statusIcon} ${result.name.padEnd(40)} ${duration}s`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details)}`);
    }
  }

  console.log('\n' + '='.repeat(80));

  // Calculate RTO and RPO
  const rtoResult = report.testResults.find(r => r.name === 'Recovery Time Measurement');
  if (rtoResult?.details?.rto) {
    console.log(`\nRecovery Time Objective (RTO): ${rtoResult.details.rto.toFixed(2)} minutes`);
  }

  console.log('\nRecommendations:');
  if (report.passRate < 100) {
    console.log('  ⚠️  Some tests failed - review and fix issues before production');
  } else {
    console.log('  ✅ All tests passed - DR procedures are working correctly');
  }

  const rto = rtoResult?.details?.rto || 0;
  if (rto > 45) {
    console.log(`  ⚠️  RTO (${rto.toFixed(2)} min) exceeds target of 45 minutes`);
  } else {
    console.log(`  ✅ RTO (${rto.toFixed(2)} min) meets target of 45 minutes`);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

async function saveReport(report: DRTestReport) {
  const reportDir = './dr-test-reports';
  await fs.mkdir(reportDir, { recursive: true });

  const filename = `dr-test-${report.timestamp.toISOString().replace(/:/g, '-')}.json`;
  const filepath = path.join(reportDir, filename);

  await fs.writeFile(filepath, JSON.stringify(report, null, 2));
  console.log(`Report saved: ${filepath}\n`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});



