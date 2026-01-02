import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../common/logger.service';
import * as Sentry from '@sentry/node';

export interface Alert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  details?: any;
  timestamp: Date;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new LoggerService('MonitoringService');
  private sentryEnabled: boolean;
  private slackWebhook: string;

  constructor(private configService: ConfigService) {
    this.sentryEnabled = !!this.configService.get('SENTRY_DSN');
    this.slackWebhook = this.configService.get('SLACK_WEBHOOK_URL', '');
  }

  /**
   * Send alert to monitoring systems
   */
  async sendAlert(alert: Alert): Promise<void> {
    this.logger.warn(`ALERT [${alert.severity}]: ${alert.type} - ${alert.message}`, alert.details);

    // Send to Sentry
    if (this.sentryEnabled) {
      Sentry.captureMessage(alert.message, {
        level: this.mapSeverityToSentryLevel(alert.severity),
        tags: {
          alert_type: alert.type,
          severity: alert.severity,
        },
        extra: alert.details,
      });
    }

    // Send to Slack
    if (this.slackWebhook) {
      await this.sendSlackAlert(alert);
    }

    // Send to email (if configured)
    // await this.sendEmailAlert(alert);

    // Send to PagerDuty for critical alerts
    if (alert.severity === 'critical') {
      await this.sendPagerDutyAlert(alert);
    }
  }

  /**
   * Send backup-specific alerts
   */
  async sendBackupAlert(type: string, error?: any): Promise<void> {
    const alert: Alert = {
      severity: this.getBackupAlertSeverity(type),
      type: `backup.${type}`,
      message: this.getBackupAlertMessage(type),
      details: error ? { error: error.message, stack: error.stack } : undefined,
      timestamp: new Date(),
    };

    await this.sendAlert(alert);
  }

  /**
   * Send to Slack
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    if (!this.slackWebhook) return;

    try {
      const color = this.getSlackColor(alert.severity);
      const emoji = this.getAlertEmoji(alert.severity);

      const payload = {
        attachments: [
          {
            color,
            title: `${emoji} ${alert.type.toUpperCase()}`,
            text: alert.message,
            fields: [
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Timestamp',
                value: alert.timestamp.toISOString(),
                short: true,
              },
            ],
            footer: 'Liquor POS Monitoring',
            ts: Math.floor(alert.timestamp.getTime() / 1000),
          },
        ],
      };

      if (alert.details) {
        payload.attachments[0].fields.push({
          title: 'Details',
          value: JSON.stringify(alert.details, null, 2),
          short: false,
        } as any);
      }

      const response = await fetch(this.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }
    } catch (error) {
      this.logger.error('Failed to send Slack alert', error);
    }
  }

  /**
   * Send to PagerDuty (for critical alerts)
   */
  private async sendPagerDutyAlert(alert: Alert): Promise<void> {
    const pagerDutyKey = this.configService.get('PAGERDUTY_INTEGRATION_KEY');
    if (!pagerDutyKey) return;

    try {
      const payload = {
        routing_key: pagerDutyKey,
        event_action: 'trigger',
        payload: {
          summary: `${alert.type}: ${alert.message}`,
          severity: alert.severity,
          source: 'liquor-pos-backend',
          timestamp: alert.timestamp.toISOString(),
          custom_details: alert.details,
        },
      };

      const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`PagerDuty API error: ${response.statusText}`);
      }
    } catch (error) {
      this.logger.error('Failed to send PagerDuty alert', error);
    }
  }

  /**
   * Map severity to Sentry level
   */
  private mapSeverityToSentryLevel(severity: string): Sentry.SeverityLevel {
    const mapping: Record<string, Sentry.SeverityLevel> = {
      low: 'info',
      medium: 'warning',
      high: 'error',
      critical: 'fatal',
    };
    return mapping[severity] || 'error';
  }

  /**
   * Get Slack color for severity
   */
  private getSlackColor(severity: string): string {
    const colors: Record<string, string> = {
      low: '#36a64f', // green
      medium: '#ff9900', // orange
      high: '#ff0000', // red
      critical: '#8b0000', // dark red
    };
    return colors[severity] || '#808080';
  }

  /**
   * Get emoji for alert severity
   */
  private getAlertEmoji(severity: string): string {
    const emojis: Record<string, string> = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔥',
    };
    return emojis[severity] || '⚠️';
  }

  /**
   * Get backup alert severity
   */
  private getBackupAlertSeverity(type: string): Alert['severity'] {
    const severities: Record<string, Alert['severity']> = {
      daily_backup_failed: 'high',
      wal_archiving_stalled: 'medium',
      backup_storage_full: 'high',
      backup_integrity_failed: 'critical',
      restore_failed: 'critical',
    };
    return severities[type] || 'medium';
  }

  /**
   * Get backup alert message
   */
  private getBackupAlertMessage(type: string): string {
    const messages: Record<string, string> = {
      daily_backup_failed: 'Daily backup failed to complete',
      wal_archiving_stalled: 'WAL archiving has stalled - no new WAL files in last hour',
      backup_storage_full: 'Backup storage is running low on space',
      backup_integrity_failed: 'Backup integrity check failed - backup may be corrupted',
      restore_failed: 'Database restore operation failed',
    };
    return messages[type] || `Backup alert: ${type}`;
  }
}

