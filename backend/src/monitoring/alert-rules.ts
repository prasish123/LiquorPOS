/**
 * Alert Rules Configuration
 *
 * Defines thresholds and severity levels for all system alerts.
 * Centralized configuration makes it easy to tune alerting without code changes.
 */

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertRule {
  threshold: number;
  severity: AlertSeverity;
  description: string;
  runbook?: string;
}

export interface AlertRules {
  database: {
    slowQuery: AlertRule;
    connectionPoolUtilization: AlertRule;
    queryFailureRate: AlertRule;
    connectionTimeout: AlertRule;
  };
  api: {
    errorRate: AlertRule;
    p95Latency: AlertRule;
    p99Latency: AlertRule;
    requestRate: AlertRule;
  };
  business: {
    orderFailureRate: AlertRule;
    paymentFailureRate: AlertRule;
    zeroRevenue: AlertRule;
    inventoryOutOfStock: AlertRule;
  };
  cache: {
    hitRate: AlertRule;
    connectionFailure: AlertRule;
    memoryUsage: AlertRule;
  };
  system: {
    memoryUsage: AlertRule;
    diskUsage: AlertRule;
    cpuUsage: AlertRule;
  };
  security: {
    failedLoginRate: AlertRule;
    bruteForceAttempts: AlertRule;
    unauthorizedAccess: AlertRule;
  };
  backup: {
    backupFailed: AlertRule;
    backupMissing: AlertRule;
    backupIntegrityFailed: AlertRule;
  };
}

/**
 * Alert rules with thresholds and severity levels
 *
 * Thresholds are tuned for a typical POS system:
 * - Low traffic: 10-100 req/min
 * - Medium traffic: 100-1000 req/min
 * - High traffic: 1000+ req/min
 */
export const ALERT_RULES: AlertRules = {
  // Database alerts
  database: {
    slowQuery: {
      threshold: 1000, // 1 second
      severity: 'high',
      description: 'Database query taking longer than 1 second',
      runbook: 'Check query execution plan, add indexes if needed',
    },
    connectionPoolUtilization: {
      threshold: 0.9, // 90%
      severity: 'critical',
      description: 'Connection pool is 90% utilized',
      runbook: 'Increase pool size or investigate connection leaks',
    },
    queryFailureRate: {
      threshold: 0.05, // 5%
      severity: 'high',
      description: 'More than 5% of queries are failing',
      runbook: 'Check database connectivity and query syntax',
    },
    connectionTimeout: {
      threshold: 5000, // 5 seconds
      severity: 'critical',
      description: 'Database connection timeout exceeded',
      runbook: 'Check database availability and network connectivity',
    },
  },

  // API alerts
  api: {
    errorRate: {
      threshold: 0.05, // 5%
      severity: 'high',
      description: 'More than 5% of API requests are failing',
      runbook: 'Check application logs for error patterns',
    },
    p95Latency: {
      threshold: 3000, // 3 seconds
      severity: 'medium',
      description: '95th percentile latency exceeds 3 seconds',
      runbook: 'Investigate slow endpoints and optimize performance',
    },
    p99Latency: {
      threshold: 5000, // 5 seconds
      severity: 'high',
      description: '99th percentile latency exceeds 5 seconds',
      runbook: 'Investigate slow endpoints and optimize performance',
    },
    requestRate: {
      threshold: 10000, // 10k req/min
      severity: 'medium',
      description: 'Request rate exceeds normal capacity',
      runbook: 'Check for traffic spike or potential DDoS',
    },
  },

  // Business alerts
  business: {
    orderFailureRate: {
      threshold: 0.02, // 2%
      severity: 'critical',
      description: 'More than 2% of orders are failing',
      runbook: 'Check payment gateway and inventory availability',
    },
    paymentFailureRate: {
      threshold: 0.01, // 1%
      severity: 'critical',
      description: 'More than 1% of payments are failing',
      runbook: 'Check payment gateway status and API keys',
    },
    zeroRevenue: {
      threshold: 3600000, // 1 hour in milliseconds
      severity: 'critical',
      description: 'No revenue for 1 hour during business hours',
      runbook: 'Check if orders are being processed',
    },
    inventoryOutOfStock: {
      threshold: 0.1, // 10% of products
      severity: 'medium',
      description: 'More than 10% of products are out of stock',
      runbook: 'Review inventory levels and reorder',
    },
  },

  // Cache alerts
  cache: {
    hitRate: {
      threshold: 0.8, // 80%
      severity: 'medium',
      description: 'Cache hit rate below 80%',
      runbook: 'Review cache strategy and TTL settings',
    },
    connectionFailure: {
      threshold: 1, // Any failure
      severity: 'high',
      description: 'Redis connection failure detected',
      runbook: 'Check Redis availability and network connectivity',
    },
    memoryUsage: {
      threshold: 0.9, // 90%
      severity: 'high',
      description: 'Redis memory usage exceeds 90%',
      runbook: 'Increase Redis memory or review eviction policy',
    },
  },

  // System alerts
  system: {
    memoryUsage: {
      threshold: 0.85, // 85%
      severity: 'high',
      description: 'System memory usage exceeds 85%',
      runbook: 'Check for memory leaks and optimize memory usage',
    },
    diskUsage: {
      threshold: 0.9, // 90%
      severity: 'critical',
      description: 'Disk usage exceeds 90%',
      runbook: 'Clean up old logs and backups, increase disk space',
    },
    cpuUsage: {
      threshold: 0.8, // 80%
      severity: 'medium',
      description: 'CPU usage exceeds 80%',
      runbook: 'Check for CPU-intensive operations and optimize',
    },
  },

  // Security alerts
  security: {
    failedLoginRate: {
      threshold: 5, // 5 failed attempts
      severity: 'medium',
      description: 'Multiple failed login attempts detected',
      runbook: 'Review login attempts and consider blocking IP',
    },
    bruteForceAttempts: {
      threshold: 10, // 10 attempts in 15 minutes
      severity: 'high',
      description: 'Potential brute force attack detected',
      runbook: 'Block IP address and review security logs',
    },
    unauthorizedAccess: {
      threshold: 1, // Any unauthorized access
      severity: 'critical',
      description: 'Unauthorized access attempt detected',
      runbook: 'Review access logs and security configuration',
    },
  },

  // Backup alerts
  backup: {
    backupFailed: {
      threshold: 1, // Any failure
      severity: 'high',
      description: 'Backup operation failed',
      runbook: 'Check backup logs and storage availability',
    },
    backupMissing: {
      threshold: 25 * 60 * 60 * 1000, // 25 hours in milliseconds
      severity: 'critical',
      description: 'No backup in last 25 hours',
      runbook: 'Check backup schedule and run manual backup',
    },
    backupIntegrityFailed: {
      threshold: 1, // Any failure
      severity: 'critical',
      description: 'Backup integrity check failed',
      runbook: 'Verify backup data and re-run backup',
    },
  },
};

/**
 * Get alert severity color for UI/notifications
 */
export function getAlertColor(severity: AlertSeverity): string {
  const colors: Record<AlertSeverity, string> = {
    low: '#36a64f', // green
    medium: '#ff9900', // orange
    high: '#ff0000', // red
    critical: '#8b0000', // dark red
  };
  return colors[severity];
}

/**
 * Get alert emoji for notifications
 */
export function getAlertEmoji(severity: AlertSeverity): string {
  const emojis: Record<AlertSeverity, string> = {
    low: 'ℹ️',
    medium: '⚠️',
    high: '🚨',
    critical: '🔥',
  };
  return emojis[severity];
}

/**
 * Check if alert should be sent to PagerDuty
 */
export function shouldPageOnCall(severity: AlertSeverity): boolean {
  return severity === 'critical';
}

/**
 * Get alert escalation delay in minutes
 */
export function getEscalationDelay(severity: AlertSeverity): number {
  const delays: Record<AlertSeverity, number> = {
    low: 60, // 1 hour
    medium: 30, // 30 minutes
    high: 15, // 15 minutes
    critical: 5, // 5 minutes
  };
  return delays[severity];
}
