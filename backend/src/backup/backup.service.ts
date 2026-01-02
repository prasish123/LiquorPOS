import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from '../common/logger.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  type: 'full' | 'incremental' | 'wal';
  size: number;
  checksum: string;
  status: 'in_progress' | 'completed' | 'failed';
  location: string;
  retentionUntil: Date;
}

export interface RestoreOptions {
  backupId: string;
  targetTime?: Date;
  validateOnly?: boolean;
  skipWalReplay?: boolean;
}

export interface BackupStats {
  totalBackups: number;
  lastBackupTime: Date | null;
  lastBackupStatus: string;
  totalSize: number;
  oldestBackup: Date | null;
  failedBackupsLast24h: number;
}

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new LoggerService('BackupService');
  private backupDir: string;
  private walArchiveDir: string;
  private retentionDays: number;
  private enabled: boolean;
  private s3Enabled: boolean;
  private s3Bucket: string;
  private backupMetadata: Map<string, BackupMetadata> = new Map();

  constructor(private configService: ConfigService) {
    this.backupDir = this.configService.get<string>(
      'BACKUP_DIR',
      './backups',
    );
    this.walArchiveDir = this.configService.get<string>(
      'WAL_ARCHIVE_DIR',
      './wal_archive',
    );
    this.retentionDays = this.configService.get<number>(
      'BACKUP_RETENTION_DAYS',
      30,
    );
    this.enabled = this.configService.get<boolean>('BACKUP_ENABLED', true);
    this.s3Enabled = this.configService.get<boolean>('BACKUP_S3_ENABLED', false);
    this.s3Bucket = this.configService.get<string>('BACKUP_S3_BUCKET', '');
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('Backup service is disabled');
      return;
    }

    // Create backup directories
    await this.ensureDirectories();

    // Load existing backup metadata
    await this.loadBackupMetadata();

    this.logger.log(
      `Backup service initialized: dir=${this.backupDir}, retention=${this.retentionDays} days`,
    );

    // Verify PostgreSQL connection and WAL archiving
    await this.verifyBackupConfiguration();
  }

  /**
   * Daily full backup at 2 AM
   */
  @Cron('0 2 * * *', {
    name: 'daily-backup',
    timeZone: 'America/New_York',
  })
  async performDailyBackup() {
    if (!this.enabled) return;

    this.logger.log('Starting daily full backup...');
    try {
      const backupId = await this.createFullBackup();
      this.logger.log(`Daily backup completed: ${backupId}`);

      // Clean up old backups
      await this.cleanupOldBackups();
    } catch (error) {
      this.logger.error('Daily backup failed', error);
      // Alert monitoring system
      await this.sendBackupAlert('daily_backup_failed', error);
    }
  }

  /**
   * Hourly WAL archive verification
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'wal-verification',
  })
  async verifyWalArchiving() {
    if (!this.enabled) return;

    try {
      const walFiles = await fs.readdir(this.walArchiveDir);
      const recentWal = walFiles.filter((f) => {
        const stat = fs.stat(path.join(this.walArchiveDir, f));
        return Date.now() - stat['mtimeMs'] < 3600000; // Last hour
      });

      if (recentWal.length === 0) {
        this.logger.warn('No WAL files archived in the last hour');
        await this.sendBackupAlert('wal_archiving_stalled', null);
      }
    } catch (error) {
      this.logger.error('WAL verification failed', error);
    }
  }

  /**
   * Create a full database backup
   */
  async createFullBackup(): Promise<string> {
    const backupId = `backup-${Date.now()}`;
    const timestamp = new Date();
    const filename = `${backupId}.sql`;
    const filepath = path.join(this.backupDir, filename);

    const metadata: BackupMetadata = {
      id: backupId,
      timestamp,
      type: 'full',
      size: 0,
      checksum: '',
      status: 'in_progress',
      location: filepath,
      retentionUntil: new Date(
        Date.now() + this.retentionDays * 24 * 60 * 60 * 1000,
      ),
    };

    this.backupMetadata.set(backupId, metadata);

    try {
      // Get database connection URL
      const databaseUrl = this.getDatabaseUrl();

      // Create backup using pg_dump
      this.logger.log(`Creating backup: ${filename}`);
      const { stdout, stderr } = await execAsync(
        `pg_dump "${databaseUrl}" --format=plain --no-owner --no-acl --file="${filepath}"`,
        { maxBuffer: 100 * 1024 * 1024 }, // 100MB buffer
      );

      if (stderr) {
        this.logger.warn(`pg_dump warnings: ${stderr}`);
      }

      // Compress the backup
      await execAsync(`gzip -f "${filepath}"`);
      const compressedPath = `${filepath}.gz`;

      // Calculate checksum
      const fileBuffer = await fs.readFile(compressedPath);
      const checksum = crypto
        .createHash('sha256')
        .update(fileBuffer)
        .digest('hex');

      // Update metadata
      const stats = await fs.stat(compressedPath);
      metadata.size = stats.size;
      metadata.checksum = checksum;
      metadata.status = 'completed';
      metadata.location = compressedPath;

      this.logger.log(
        `Backup created: ${backupId} (${this.formatBytes(stats.size)}, checksum: ${checksum.substring(0, 8)}...)`,
      );

      // Upload to S3 if enabled
      if (this.s3Enabled) {
        await this.uploadToS3(compressedPath, backupId);
      }

      // Save metadata
      await this.saveBackupMetadata();

      return backupId;
    } catch (error) {
      metadata.status = 'failed';
      this.logger.error(`Backup failed: ${backupId}`, error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreFromBackup(options: RestoreOptions): Promise<void> {
    const { backupId, targetTime, validateOnly, skipWalReplay } = options;

    this.logger.log(`Starting restore: backupId=${backupId}, targetTime=${targetTime}, validateOnly=${validateOnly}`);

    const metadata = this.backupMetadata.get(backupId);
    if (!metadata) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    if (metadata.status !== 'completed') {
      throw new Error(`Backup is not completed: ${backupId}`);
    }

    try {
      // Verify backup integrity
      await this.verifyBackupIntegrity(metadata);

      if (validateOnly) {
        this.logger.log('Validation successful, skipping actual restore');
        return;
      }

      // WARNING: This will drop the existing database
      this.logger.warn('⚠️  RESTORING DATABASE - THIS WILL DROP EXISTING DATA');

      // Decompress backup
      const decompressedPath = metadata.location.replace('.gz', '');
      await execAsync(`gunzip -c "${metadata.location}" > "${decompressedPath}"`);

      // Get database connection
      const databaseUrl = this.getDatabaseUrl();

      // Drop and recreate database (in production, use a different approach)
      this.logger.log('Dropping existing database...');
      await execAsync(`psql "${databaseUrl}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`);

      // Restore from backup
      this.logger.log('Restoring from backup...');
      await execAsync(`psql "${databaseUrl}" < "${decompressedPath}"`);

      // Replay WAL logs if needed
      if (!skipWalReplay && targetTime) {
        await this.replayWalLogs(targetTime);
      }

      // Clean up decompressed file
      await fs.unlink(decompressedPath);

      this.logger.log('✅ Restore completed successfully');
    } catch (error) {
      this.logger.error('Restore failed', error);
      throw error;
    }
  }

  /**
   * Point-in-time recovery using WAL logs
   */
  async replayWalLogs(targetTime: Date): Promise<void> {
    this.logger.log(`Replaying WAL logs up to ${targetTime.toISOString()}`);

    try {
      const walFiles = await fs.readdir(this.walArchiveDir);
      const sortedWalFiles = walFiles.sort();

      for (const walFile of sortedWalFiles) {
        const walPath = path.join(this.walArchiveDir, walFile);
        const stats = await fs.stat(walPath);

        // Stop if WAL file is after target time
        if (stats.mtime > targetTime) {
          break;
        }

        this.logger.log(`Replaying WAL: ${walFile}`);
        const databaseUrl = this.getDatabaseUrl();
        await execAsync(`pg_waldump "${walPath}" | psql "${databaseUrl}"`);
      }

      this.logger.log('WAL replay completed');
    } catch (error) {
      this.logger.error('WAL replay failed', error);
      throw error;
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackupIntegrity(metadata: BackupMetadata): Promise<boolean> {
    this.logger.log(`Verifying backup integrity: ${metadata.id}`);

    try {
      // Check file exists
      await fs.access(metadata.location);

      // Verify checksum
      const fileBuffer = await fs.readFile(metadata.location);
      const checksum = crypto
        .createHash('sha256')
        .update(fileBuffer)
        .digest('hex');

      if (checksum !== metadata.checksum) {
        throw new Error(
          `Checksum mismatch: expected ${metadata.checksum}, got ${checksum}`,
        );
      }

      // Verify can decompress
      await execAsync(`gzip -t "${metadata.location}"`);

      this.logger.log('✅ Backup integrity verified');
      return true;
    } catch (error) {
      this.logger.error('Backup integrity check failed', error);
      throw error;
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<BackupStats> {
    const backups = Array.from(this.backupMetadata.values());
    const completedBackups = backups.filter((b) => b.status === 'completed');

    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const failedBackupsLast24h = backups.filter(
      (b) => b.status === 'failed' && b.timestamp.getTime() > last24h,
    ).length;

    return {
      totalBackups: completedBackups.length,
      lastBackupTime: completedBackups.length > 0
        ? completedBackups[completedBackups.length - 1].timestamp
        : null,
      lastBackupStatus: backups.length > 0
        ? backups[backups.length - 1].status
        : 'none',
      totalSize: completedBackups.reduce((sum, b) => sum + b.size, 0),
      oldestBackup: completedBackups.length > 0
        ? completedBackups[0].timestamp
        : null,
      failedBackupsLast24h,
    };
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<BackupMetadata[]> {
    return Array.from(this.backupMetadata.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  /**
   * Clean up old backups based on retention policy
   */
  private async cleanupOldBackups(): Promise<void> {
    this.logger.log('Cleaning up old backups...');

    const now = Date.now();
    let deletedCount = 0;

    for (const [id, metadata] of this.backupMetadata.entries()) {
      if (metadata.retentionUntil.getTime() < now) {
        try {
          await fs.unlink(metadata.location);
          this.backupMetadata.delete(id);
          deletedCount++;
          this.logger.log(`Deleted old backup: ${id}`);
        } catch (error) {
          this.logger.error(`Failed to delete backup: ${id}`, error);
        }
      }
    }

    if (deletedCount > 0) {
      await this.saveBackupMetadata();
      this.logger.log(`Cleaned up ${deletedCount} old backups`);
    }
  }

  /**
   * Upload backup to S3
   */
  private async uploadToS3(filepath: string, backupId: string): Promise<void> {
    if (!this.s3Enabled) return;

    this.logger.log(`Uploading to S3: ${backupId}`);

    try {
      // Use AWS CLI for upload (requires AWS CLI installed and configured)
      const s3Key = `backups/${backupId}.sql.gz`;
      await execAsync(
        `aws s3 cp "${filepath}" "s3://${this.s3Bucket}/${s3Key}" --storage-class STANDARD_IA`,
      );

      this.logger.log(`Uploaded to S3: s3://${this.s3Bucket}/${s3Key}`);
    } catch (error) {
      this.logger.error('S3 upload failed', error);
      // Don't throw - local backup still exists
    }
  }

  /**
   * Verify backup configuration
   */
  private async verifyBackupConfiguration(): Promise<void> {
    try {
      const databaseUrl = this.getDatabaseUrl();

      // Check if WAL archiving is enabled
      const { stdout } = await execAsync(
        `psql "${databaseUrl}" -t -c "SHOW wal_level;"`,
      );

      const walLevel = stdout.trim();
      if (walLevel !== 'replica' && walLevel !== 'logical') {
        this.logger.warn(
          `WAL level is '${walLevel}'. For point-in-time recovery, set wal_level to 'replica' or 'logical'`,
        );
      }

      this.logger.log('✅ Backup configuration verified');
    } catch (error) {
      this.logger.error('Failed to verify backup configuration', error);
    }
  }

  /**
   * Ensure backup directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
    await fs.mkdir(this.walArchiveDir, { recursive: true });
  }

  /**
   * Load backup metadata from disk
   */
  private async loadBackupMetadata(): Promise<void> {
    const metadataPath = path.join(this.backupDir, 'metadata.json');

    try {
      const data = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(data);

      for (const item of metadata) {
        item.timestamp = new Date(item.timestamp);
        item.retentionUntil = new Date(item.retentionUntil);
        this.backupMetadata.set(item.id, item);
      }

      this.logger.log(`Loaded ${this.backupMetadata.size} backup records`);
    } catch (error) {
      // File doesn't exist yet
      this.logger.log('No existing backup metadata found');
    }
  }

  /**
   * Save backup metadata to disk
   */
  private async saveBackupMetadata(): Promise<void> {
    const metadataPath = path.join(this.backupDir, 'metadata.json');
    const data = Array.from(this.backupMetadata.values());

    await fs.writeFile(metadataPath, JSON.stringify(data, null, 2));
  }

  /**
   * Get database URL from config
   */
  private getDatabaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL') || 'file:./dev.db';
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Send backup alert to monitoring system
   */
  private async sendBackupAlert(
    type: string,
    error: any,
  ): Promise<void> {
    this.logger.error(`BACKUP ALERT: ${type}`, error);

    // Import MonitoringService dynamically to avoid circular dependency
    try {
      const { MonitoringService } = await import('../monitoring/monitoring.service.js');
      const monitoring = new MonitoringService(this.configService);
      await monitoring.sendBackupAlert(type, error);
    } catch (err) {
      this.logger.error('Failed to send backup alert', err);
    }
  }
}

