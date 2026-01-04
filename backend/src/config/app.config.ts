/**
 * Application Configuration
 * Centralized configuration with type safety and defaults
 */

export interface AppConfig {
  // Environment
  nodeEnv: 'development' | 'production' | 'test';
  port: number;

  // Redis Configuration
  redis: {
    memoryCacheSize: number;
    cleanupIntervalMs: number;
    maxRetryAttempts: number;
    retryBackoffMs: number;
    maxRetriesPerRequest: number;
  };

  // Conexxus Configuration
  conexxus: {
    uploadTimeoutMs: number;
    healthCheckTimeoutMs: number;
    maxMetricsHistory: number;
    syncSchedule: string;
    salesPushSchedule: string;
  };

  // System Configuration
  system: {
    diskPath: string;
    diskUsageThreshold: number;
    idScanDelayMs: number;
  };

  // Backup Configuration
  backup: {
    maxAgeHours: number;
    statsWindowHours: number;
    schedule: string;
    cleanupSchedule: string;
  };

  // Offline Queue Configuration
  offlineQueue: {
    cleanupDays: number;
    processSchedule: string;
  };

  // Network Configuration
  network: {
    checkSchedule: string;
  };

  // Business Rules
  businessRules: {
    defaultProductMargin: number;
    maxOrderQuantity: number;
    maxTransactionAmount: number;
  };

  // Observability Configuration
  observability: {
    lokiUrl?: string;
    lokiEnabled: boolean;
    lokiBatchInterval: number;
    lokiMaxBatchSize: number;
    lokiMaxRetries: number;
  };

  // Location Configuration
  location: {
    id: string;
  };
}

/**
 * Get application configuration from environment variables
 * with sensible defaults
 */
export function getAppConfig(): AppConfig {
  return {
    nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
    port: parseInt(process.env.PORT || '3000', 10),

    redis: {
      memoryCacheSize: parseInt(
        process.env.REDIS_MEMORY_CACHE_SIZE || '100',
        10,
      ),
      cleanupIntervalMs: parseInt(
        process.env.REDIS_CLEANUP_INTERVAL_MS || '60000',
        10,
      ),
      maxRetryAttempts: parseInt(
        process.env.REDIS_MAX_RETRY_ATTEMPTS || '3',
        10,
      ),
      retryBackoffMs: parseInt(
        process.env.REDIS_RETRY_BACKOFF_MS || '2000',
        10,
      ),
      maxRetriesPerRequest: parseInt(
        process.env.REDIS_MAX_RETRIES_PER_REQUEST || '3',
        10,
      ),
    },

    conexxus: {
      uploadTimeoutMs: parseInt(
        process.env.CONEXXUS_UPLOAD_TIMEOUT || '60000',
        10,
      ),
      healthCheckTimeoutMs: parseInt(
        process.env.CONEXXUS_HEALTH_CHECK_TIMEOUT || '5000',
        10,
      ),
      maxMetricsHistory: parseInt(
        process.env.CONEXXUS_MAX_METRICS_HISTORY || '100',
        10,
      ),
      syncSchedule: process.env.CONEXXUS_SYNC_SCHEDULE || '0 * * * *',
      salesPushSchedule:
        process.env.CONEXXUS_SALES_PUSH_SCHEDULE || '0 30 23 * * *',
    },

    system: {
      diskPath:
        process.env.DISK_PATH ||
        (process.platform === 'win32' ? 'C:\\' : '/'),
      diskUsageThreshold: parseFloat(
        process.env.DISK_USAGE_THRESHOLD || '0.9',
      ),
      idScanDelayMs: parseInt(process.env.ID_SCAN_DELAY_MS || '500', 10),
    },

    backup: {
      maxAgeHours: parseInt(process.env.BACKUP_MAX_AGE_HOURS || '25', 10),
      statsWindowHours: parseInt(
        process.env.BACKUP_STATS_WINDOW_HOURS || '24',
        10,
      ),
      schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
      cleanupSchedule: process.env.BACKUP_CLEANUP_SCHEDULE || '0 * * * *',
    },

    offlineQueue: {
      cleanupDays: parseInt(process.env.OFFLINE_QUEUE_CLEANUP_DAYS || '7', 10),
      processSchedule:
        process.env.OFFLINE_QUEUE_PROCESS_SCHEDULE || '*/5 * * * *',
    },

    network: {
      checkSchedule: process.env.NETWORK_CHECK_SCHEDULE || '*/30 * * * *',
    },

    businessRules: {
      defaultProductMargin: parseFloat(
        process.env.DEFAULT_PRODUCT_MARGIN || '0.3',
      ),
      maxOrderQuantity: parseInt(process.env.MAX_ORDER_QUANTITY || '1000', 10),
      maxTransactionAmount: parseInt(
        process.env.MAX_TRANSACTION_AMOUNT || '100000',
        10,
      ),
    },

    observability: {
      lokiUrl: process.env.LOKI_URL,
      lokiEnabled: process.env.LOKI_ENABLED === 'true',
      lokiBatchInterval: parseInt(
        process.env.LOKI_BATCH_INTERVAL || '5000',
        10,
      ),
      lokiMaxBatchSize: parseInt(process.env.LOKI_MAX_BATCH_SIZE || '100', 10),
      lokiMaxRetries: parseInt(process.env.LOKI_MAX_RETRIES || '3', 10),
    },

    location: {
      id: process.env.LOCATION_ID || 'default-location',
    },
  };
}

/**
 * Validate configuration values
 * Throws error if configuration is invalid
 */
export function validateAppConfig(config: AppConfig): void {
  const errors: string[] = [];

  // Validate Redis config
  if (config.redis.memoryCacheSize < 1 || config.redis.memoryCacheSize > 10000) {
    errors.push('REDIS_MEMORY_CACHE_SIZE must be between 1 and 10000');
  }

  if (config.redis.maxRetryAttempts < 0 || config.redis.maxRetryAttempts > 10) {
    errors.push('REDIS_MAX_RETRY_ATTEMPTS must be between 0 and 10');
  }

  // Validate system config
  if (
    config.system.diskUsageThreshold < 0 ||
    config.system.diskUsageThreshold > 1
  ) {
    errors.push('DISK_USAGE_THRESHOLD must be between 0 and 1');
  }

  // Validate business rules
  if (
    config.businessRules.defaultProductMargin < 0 ||
    config.businessRules.defaultProductMargin > 1
  ) {
    errors.push('DEFAULT_PRODUCT_MARGIN must be between 0 and 1');
  }

  if (config.businessRules.maxOrderQuantity < 1) {
    errors.push('MAX_ORDER_QUANTITY must be at least 1');
  }

  if (config.businessRules.maxTransactionAmount < 1) {
    errors.push('MAX_TRANSACTION_AMOUNT must be at least 1');
  }

  // Validate backup config
  if (config.backup.maxAgeHours < 1) {
    errors.push('BACKUP_MAX_AGE_HOURS must be at least 1');
  }

  if (config.backup.statsWindowHours < 1) {
    errors.push('BACKUP_STATS_WINDOW_HOURS must be at least 1');
  }

  // Validate offline queue config
  if (config.offlineQueue.cleanupDays < 1) {
    errors.push('OFFLINE_QUEUE_CLEANUP_DAYS must be at least 1');
  }

  // Validate observability config
  if (config.observability.lokiEnabled && !config.observability.lokiUrl) {
    errors.push('LOKI_URL is required when LOKI_ENABLED is true');
  }

  if (config.observability.lokiBatchInterval < 100) {
    errors.push('LOKI_BATCH_INTERVAL must be at least 100ms');
  }

  if (config.observability.lokiMaxBatchSize < 1) {
    errors.push('LOKI_MAX_BATCH_SIZE must be at least 1');
  }

  if (config.observability.lokiMaxRetries < 0) {
    errors.push('LOKI_MAX_RETRIES must be at least 0');
  }

  // Validate location config
  if (!config.location.id || config.location.id.trim() === '') {
    errors.push('LOCATION_ID must be set to a non-empty string');
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
  }
}

/**
 * Get and validate configuration
 * Call this at application startup
 */
export function getValidatedConfig(): AppConfig {
  const config = getAppConfig();
  validateAppConfig(config);
  return config;
}

