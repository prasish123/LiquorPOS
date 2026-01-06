import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { BackupService } from '../backup/backup.service';

@Injectable()
export class BackupHealthIndicator extends HealthIndicator {
  constructor(private backupService: BackupService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const stats = await this.backupService.getBackupStats();

      // Check if last backup was within 25 hours (allowing 1 hour grace period)
      const lastBackupAge = stats.lastBackupTime
        ? Date.now() - stats.lastBackupTime.getTime()
        : Infinity;
      const maxAge = 25 * 60 * 60 * 1000; // 25 hours in milliseconds

      // Check for recent failures
      const hasRecentFailures = stats.failedBackupsLast24h > 0;

      const result = {
        totalBackups: stats.totalBackups,
        lastBackupTime: stats.lastBackupTime?.toISOString() || 'never',
        lastBackupStatus: stats.lastBackupStatus || 'none',
        lastBackupAge: lastBackupAge === Infinity ? 'never' : Math.floor(lastBackupAge / 1000 / 60), // minutes
        failedBackupsLast24h: stats.failedBackupsLast24h,
        totalSize: this.formatBytes(stats.totalSize),
      };

      // If no backups exist yet, consider it healthy (initial state)
      if (stats.totalBackups === 0 && !hasRecentFailures) {
        return this.getStatus(key, true, {
          ...result,
          status: 'initial_state',
          message: 'No backups yet - this is normal for new installations',
        });
      }

      // Determine health status for existing backup systems
      const isHealthy = lastBackupAge < maxAge && !hasRecentFailures;

      if (isHealthy) {
        return this.getStatus(key, true, result);
      }

      // Build error message
      const errors: string[] = [];
      if (lastBackupAge >= maxAge) {
        errors.push(`Last backup was ${Math.floor(lastBackupAge / 1000 / 60 / 60)} hours ago`);
      }
      if (hasRecentFailures) {
        errors.push(`${stats.failedBackupsLast24h} failed backups in last 24h`);
      }

      throw new HealthCheckError(
        'Backup check failed',
        this.getStatus(key, false, {
          ...result,
          errors,
        }),
      );
    } catch (error) {
      // Allow degraded mode for backup service issues (e.g., psql not found)
      return this.getStatus(key, true, {
        status: 'degraded',
        warning: 'Backup service unavailable',
        error: error.message,
        message: 'Application is operational without backup monitoring',
      });
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
