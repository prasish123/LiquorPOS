import { Logger } from '@nestjs/common';

const logger = new Logger('EnvironmentValidation');

interface EnvValidationError {
  variable: string;
  issue: string;
  severity: 'critical' | 'warning';
}

/**
 * Validates environment variables at application startup
 * Exits process if critical variables are missing or invalid
 */
export function validateEnvironment(): void {
  const errors: EnvValidationError[] = [];
  const warnings: EnvValidationError[] = [];

  // Critical variables (application won't start without these)
  const criticalVars = ['DATABASE_URL', 'JWT_SECRET', 'AUDIT_LOG_ENCRYPTION_KEY'];

  // Important variables (application will start but features may be limited)
  const importantVars = ['REDIS_URL', 'REDIS_HOST', 'REDIS_PASSWORD'];

  // Optional variables (nice to have)
  const optionalVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SENTRY_DSN',
    'OPENAI_API_KEY',
  ];

  // Check critical variables
  for (const varName of criticalVars) {
    const value = process.env[varName];

    if (!value) {
      errors.push({
        variable: varName,
        issue: 'Not set',
        severity: 'critical',
      });
    } else if (value.includes('REPLACE') || value.includes('changeme')) {
      errors.push({
        variable: varName,
        issue: 'Using placeholder/default value',
        severity: 'critical',
      });
    } else {
      // Specific validations
      if (varName === 'JWT_SECRET' && value.length < 32) {
        errors.push({
          variable: varName,
          issue: 'Too short (minimum 32 characters)',
          severity: 'critical',
        });
      }

      if (varName === 'AUDIT_LOG_ENCRYPTION_KEY' && value.length < 32) {
        errors.push({
          variable: varName,
          issue: 'Too short (minimum 32 characters)',
          severity: 'critical',
        });
      }

      if (
        varName === 'DATABASE_URL' &&
        !value.startsWith('postgresql://') &&
        !value.startsWith('file:')
      ) {
        errors.push({
          variable: varName,
          issue: 'Invalid format (must start with postgresql:// or file:)',
          severity: 'critical',
        });
      }
    }
  }

  // Check important variables
  for (const varName of importantVars) {
    const value = process.env[varName];

    if (!value) {
      warnings.push({
        variable: varName,
        issue: 'Not set - some features may not work',
        severity: 'warning',
      });
    } else if (value.includes('changeme')) {
      warnings.push({
        variable: varName,
        issue: 'Using default value - should be changed in production',
        severity: 'warning',
      });
    }
  }

  // Check NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    warnings.push({
      variable: 'NODE_ENV',
      issue: 'Not set - defaulting to development',
      severity: 'warning',
    });
  } else if (nodeEnv === 'production') {
    // Additional production checks
    if (!process.env.SENTRY_DSN) {
      warnings.push({
        variable: 'SENTRY_DSN',
        issue: 'Not set - error tracking disabled in production',
        severity: 'warning',
      });
    }

    if (process.env.LOG_LEVEL === 'debug') {
      warnings.push({
        variable: 'LOG_LEVEL',
        issue: 'Set to debug in production - may impact performance',
        severity: 'warning',
      });
    }
  }

  // Check backup configuration
  if (process.env.BACKUP_ENABLED !== 'false') {
    if (!process.env.BACKUP_DIR) {
      warnings.push({
        variable: 'BACKUP_DIR',
        issue: 'Not set - using default ./backups',
        severity: 'warning',
      });
    }
  }

  // Report results
  logger.log('========================================');
  logger.log('Environment Validation');
  logger.log('========================================');

  if (errors.length === 0 && warnings.length === 0) {
    logger.log('✓ All environment variables are properly configured');
    logger.log('========================================');
    return;
  }

  // Display errors
  if (errors.length > 0) {
    logger.error('❌ CRITICAL ERRORS:');
    for (const error of errors) {
      logger.error(`  - ${error.variable}: ${error.issue}`);
    }
    logger.error('');
  }

  // Display warnings
  if (warnings.length > 0) {
    logger.warn('⚠️  WARNINGS:');
    for (const warning of warnings) {
      logger.warn(`  - ${warning.variable}: ${warning.issue}`);
    }
    logger.warn('');
  }

  logger.log('========================================');

  // Exit if critical errors
  if (errors.length > 0) {
    logger.error('Application cannot start due to critical environment errors');
    logger.error('Please fix the errors above and restart the application');
    logger.error('');
    logger.error('Quick fixes:');
    logger.error('  1. Copy ENV_TEMPLATE.txt to .env');
    logger.error('  2. Generate secrets:');
    logger.error(
      "     JWT_SECRET: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"",
    );
    logger.error(
      "     AUDIT_LOG_ENCRYPTION_KEY: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
    logger.error('  3. Set DATABASE_URL to your database connection string');
    logger.error('');
    process.exit(1);
  }
}

/**
 * Validates that all required environment variables are set
 * Can be used in tests or other contexts
 */
export function isEnvironmentValid(): boolean {
  const criticalVars = ['DATABASE_URL', 'JWT_SECRET', 'AUDIT_LOG_ENCRYPTION_KEY'];

  for (const varName of criticalVars) {
    const value = process.env[varName];
    if (!value || value.includes('REPLACE') || value.includes('changeme')) {
      return false;
    }
  }

  return true;
}

/**
 * Gets environment info for debugging
 */
export function getEnvironmentInfo(): Record<string, any> {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    hasDatabase: !!process.env.DATABASE_URL,
    hasRedis: !!process.env.REDIS_URL || !!process.env.REDIS_HOST,
    hasStripe: !!process.env.STRIPE_SECRET_KEY,
    hasSentry: !!process.env.SENTRY_DSN,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    backupEnabled: process.env.BACKUP_ENABLED !== 'false',
  };
}
