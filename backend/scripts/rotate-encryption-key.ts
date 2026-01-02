/**
 * Encryption Key Rotation Script
 * 
 * This script re-encrypts all audit log entries with a new encryption key.
 * 
 * Usage:
 *   1. Generate new key: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *   2. Set environment variables:
 *      - AUDIT_LOG_ENCRYPTION_KEY=<new_key>
 *      - OLD_AUDIT_LOG_ENCRYPTION_KEY=<old_key>
 *      - DATABASE_URL=<database_connection_string>
 *   3. Run: npm run rotate-key
 * 
 * IMPORTANT:
 *   - Backup your database before running this script
 *   - Keep the old key until rotation is complete
 *   - Test on staging environment first
 */

import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../src/common/encryption.service';
import { Logger } from '@nestjs/common';

const logger = new Logger('KeyRotation');

async function rotateEncryptionKey() {
  logger.log('🔄 Starting encryption key rotation...');

  // Validate environment
  if (!process.env.AUDIT_LOG_ENCRYPTION_KEY) {
    throw new Error(
      'AUDIT_LOG_ENCRYPTION_KEY (new key) is required',
    );
  }

  if (!process.env.OLD_AUDIT_LOG_ENCRYPTION_KEY) {
    throw new Error(
      'OLD_AUDIT_LOG_ENCRYPTION_KEY (old key) is required for rotation',
    );
  }

  // Initialize services
  const prisma = new PrismaClient();
  const encryption = new EncryptionService();
  
  // Manually call onModuleInit to initialize keys
  encryption.onModuleInit();

  if (!encryption.isKeyRotationActive()) {
    throw new Error(
      'Key rotation mode not active. Ensure OLD_AUDIT_LOG_ENCRYPTION_KEY is set correctly.',
    );
  }

  logger.log('✅ Key rotation mode active');

  try {
    // Get all audit logs with encrypted details
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        details: {
          not: null,
        },
      },
      select: {
        id: true,
        details: true,
      },
    });

    logger.log(`📊 Found ${auditLogs.length} audit log entries to re-encrypt`);

    if (auditLogs.length === 0) {
      logger.log('✅ No entries to rotate');
      return;
    }

    // Process in batches
    const batchSize = 100;
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < auditLogs.length; i += batchSize) {
      const batch = auditLogs.slice(i, i + batchSize);
      
      logger.log(
        `🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(auditLogs.length / batchSize)}...`,
      );

      // Process batch in parallel
      const updates = batch.map(async (log) => {
        try {
          if (!log.details) {
            return null;
          }

          // Re-encrypt with new key
          const reEncrypted = encryption.reEncrypt(log.details);

          if (!reEncrypted) {
            logger.warn(`⚠️  Skipping entry ${log.id} (empty details)`);
            return null;
          }

          // Update database
          await prisma.auditLog.update({
            where: { id: log.id },
            data: { details: reEncrypted },
          });

          processed++;
          return log.id;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          logger.error(`❌ Failed to re-encrypt entry ${log.id}: ${errorMessage}`);
          failed++;
          return null;
        }
      });

      await Promise.all(updates);

      // Progress update
      logger.log(
        `✅ Progress: ${processed}/${auditLogs.length} (${Math.round((processed / auditLogs.length) * 100)}%)`,
      );
    }

    logger.log('');
    logger.log('🎉 Key rotation complete!');
    logger.log(`✅ Successfully re-encrypted: ${processed} entries`);
    if (failed > 0) {
      logger.warn(`⚠️  Failed to re-encrypt: ${failed} entries`);
    }
    logger.log('');
    logger.log('📝 Next steps:');
    logger.log('  1. Verify audit logs are accessible');
    logger.log('  2. Remove OLD_AUDIT_LOG_ENCRYPTION_KEY from environment');
    logger.log('  3. Backup the new key securely');
    logger.log('  4. Update key backup documentation');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`❌ Key rotation failed: ${errorMessage}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
rotateEncryptionKey()
  .then(() => {
    logger.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Script failed:', error);
    process.exit(1);
  });

