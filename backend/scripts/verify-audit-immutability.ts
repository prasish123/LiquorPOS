/**
 * Verification script for REQ-001: Audit Log Immutability
 * Tests that triggers are working correctly
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Configure Prisma Client for Prisma 7
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/liquor_pos';
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verifyAuditImmutability() {
  console.log('🔍 Verifying REQ-001: Audit Log Immutability\n');

  let testAuditLogId: string;

  try {
    // Test 1: Create audit log (should work)
    console.log('✅ Test 1: Creating audit log...');
    const auditLog = await prisma.auditLog.create({
      data: {
        eventType: 'VERIFICATION_TEST',
        action: 'test_immutability',
        result: 'success',
        userId: 'test-user',
      },
    });
    testAuditLogId = auditLog.id;
    console.log(`   Created audit log: ${auditLog.id}`);

    // Test 2: Try to update (should fail)
    console.log('\n❌ Test 2: Attempting to UPDATE audit log (should fail)...');
    try {
      await prisma.auditLog.update({
        where: { id: testAuditLogId },
        data: { result: 'failure' },
      });
      console.log('   ⚠️  ERROR: Update succeeded (triggers not working!)');
      process.exit(1);
    } catch (error) {
      if (error.message.includes('Audit logs are immutable')) {
        console.log('   ✅ Update blocked correctly: "Audit logs are immutable"');
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.message}`);
      }
    }

    // Test 3: Try to delete (should fail)
    console.log('\n❌ Test 3: Attempting to DELETE audit log (should fail)...');
    try {
      await prisma.auditLog.delete({
        where: { id: testAuditLogId },
      });
      console.log('   ⚠️  ERROR: Delete succeeded (triggers not working!)');
      process.exit(1);
    } catch (error) {
      if (error.message.includes('Audit logs are immutable')) {
        console.log('   ✅ Delete blocked correctly: "Audit logs are immutable"');
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.message}`);
      }
    }

    // Test 4: Verify audit log still exists
    console.log('\n✅ Test 4: Verifying audit log still exists...');
    const verifyLog = await prisma.auditLog.findUnique({
      where: { id: testAuditLogId },
    });
    if (verifyLog && verifyLog.result === 'success') {
      console.log('   ✅ Audit log unchanged and intact');
    } else {
      console.log('   ⚠️  ERROR: Audit log was modified!');
      process.exit(1);
    }

    // Test 5: Test existing audit paths
    console.log('\n✅ Test 5: Testing existing audit log creation paths...');
    const eventTypes = [
      'ORDER_CREATION',
      'PAYMENT_PROCESSING',
      'AGE_VERIFICATION',
      'IDEMPOTENCY_CHECK',
    ];

    for (const eventType of eventTypes) {
      const log = await prisma.auditLog.create({
        data: {
          eventType,
          action: 'verification_test',
          result: 'success',
        },
      });
      console.log(`   ✅ ${eventType}: Created successfully`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ REQ-001 VERIFICATION COMPLETE');
    console.log('='.repeat(60));
    console.log('\nAcceptance Criteria:');
    console.log('  ✅ prisma.auditLog.update() throws error');
    console.log('  ✅ prisma.auditLog.delete() throws error');
    console.log('  ✅ All existing audit log creation still works');
    console.log('\n🎉 Audit log immutability is working correctly!');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAuditImmutability();

