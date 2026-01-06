import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';

export interface EnvironmentConfig {
  // Critical variables (MUST be set)
  AUDIT_LOG_ENCRYPTION_KEY: string;
  ALLOWED_ORIGINS: string;

  // Authentication
  JWT_SECRET: string;

  // Payment processing (optional for cash-only mode)
  STRIPE_SECRET_KEY?: string;

  // Database
  DATABASE_URL?: string;
  DATABASE_POOL_MIN?: number;
  DATABASE_POOL_MAX?: number;
  DATABASE_POOL_IDLE_TIMEOUT?: number;
  DATABASE_POOL_CONNECTION_TIMEOUT?: number;

  // Redis (optional)
  REDIS_URL?: string;

  // SSL (optional)
  SSL_KEY_PATH?: string;
  SSL_CERT_PATH?: string;

  // Other
  NODE_ENV?: string;
  PORT?: string;
  COOKIE_DOMAIN?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: Partial<EnvironmentConfig>;
}

@Injectable()
export class ConfigValidationService {
  private readonly logger = new Logger(ConfigValidationService.name);

  /**
   * Validate all environment variables at application startup
   * Fails fast if critical variables are missing or invalid
   */
  validateEnvironment(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const config: Partial<EnvironmentConfig> = {};

    // 1. AUDIT_LOG_ENCRYPTION_KEY (CRITICAL)
    const encryptionKey = process.env.AUDIT_LOG_ENCRYPTION_KEY;
    if (!encryptionKey) {
      errors.push(
        'AUDIT_LOG_ENCRYPTION_KEY is required. ' +
          "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
      );
    } else {
      try {
        const keyBuffer = Buffer.from(encryptionKey, 'base64');
        if (keyBuffer.length !== 32) {
          errors.push(
            `AUDIT_LOG_ENCRYPTION_KEY must be 32 bytes (256 bits). ` +
              `Provided key is ${keyBuffer.length} bytes.`,
          );
        } else {
          config.AUDIT_LOG_ENCRYPTION_KEY = encryptionKey;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`AUDIT_LOG_ENCRYPTION_KEY must be base64-encoded. ` + `Error: ${errorMessage}`);
      }
    }

    // 2. ALLOWED_ORIGINS (CRITICAL)
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    if (!allowedOrigins || allowedOrigins.trim() === '') {
      errors.push(
        'ALLOWED_ORIGINS is required for CORS. ' +
          'Set to comma-separated list of allowed origins (e.g., http://localhost:5173,https://app.example.com)',
      );
    } else {
      const origins = allowedOrigins
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o);
      if (origins.length === 0) {
        errors.push('ALLOWED_ORIGINS contains no valid origins');
      } else {
        // Validate URL format
        const invalidOrigins = origins.filter((origin) => {
          try {
            new URL(origin);
            return false;
          } catch {
            return true;
          }
        });

        if (invalidOrigins.length > 0) {
          errors.push(`ALLOWED_ORIGINS contains invalid URLs: ${invalidOrigins.join(', ')}`);
        } else {
          config.ALLOWED_ORIGINS = allowedOrigins;
        }
      }
    }

    // 3. JWT_SECRET (CRITICAL)
    const jwtSecret = process.env.JWT_SECRET;
    const nodeEnv = process.env.NODE_ENV || 'development';
    config.NODE_ENV = nodeEnv;

    if (!jwtSecret) {
      // Generate a secure random JWT secret if not provided
      const generatedSecret = randomBytes(32).toString('base64');
      config.JWT_SECRET = generatedSecret;

      if (nodeEnv === 'production') {
        errors.push(
          'JWT_SECRET must be explicitly set in production. ' +
            "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
        );
      } else {
        warnings.push(
          `JWT_SECRET not set. Auto-generated secure random secret for ${nodeEnv} environment. ` +
            'For production, set JWT_SECRET explicitly in environment variables.',
        );
        this.logger.warn(
          `Auto-generated JWT_SECRET for ${nodeEnv}. ` +
            'This secret will change on restart. Set JWT_SECRET in .env for persistence.',
        );
      }
    } else {
      // Validate JWT secret strength
      if (jwtSecret === 'your-secret-key-change-in-production') {
        errors.push(
          'JWT_SECRET is set to default insecure value. ' +
            "Generate a secure secret with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
        );
      } else if (jwtSecret.length < 32) {
        warnings.push(
          `JWT_SECRET is weak (${jwtSecret.length} characters). ` +
            'Recommended: 32+ characters or base64-encoded 32 bytes.',
        );
      }
      config.JWT_SECRET = jwtSecret;
    }

    // 4. STRIPE_SECRET_KEY (Optional - warn if missing)
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      warnings.push(
        'STRIPE_SECRET_KEY not configured. Card payments will fail. ' +
          'Cash payments will continue to work. ' +
          'Get your key from: https://dashboard.stripe.com/apikeys',
      );
    } else {
      // Validate Stripe key format
      if (!stripeKey.startsWith('sk_test_') && !stripeKey.startsWith('sk_live_')) {
        warnings.push(
          'STRIPE_SECRET_KEY has unexpected format. ' +
            'Should start with sk_test_ (test mode) or sk_live_ (live mode)',
        );
      }

      if (nodeEnv === 'production' && stripeKey.startsWith('sk_test_')) {
        warnings.push(
          'STRIPE_SECRET_KEY is in test mode but NODE_ENV is production. ' +
            'Use sk_live_ key for production.',
        );
      }

      config.STRIPE_SECRET_KEY = stripeKey;
    }

    // 5. DATABASE_URL (REQUIRED - PostgreSQL)
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      errors.push(
        'DATABASE_URL is required. PostgreSQL connection string must be provided. ' +
          'Example: postgresql://user:password@localhost:5432/liquor_pos ' +
          'See docs/POSTGRESQL_MIGRATION_GUIDE.md for setup instructions.',
      );
    } else if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
      errors.push(
        'DATABASE_URL must be a PostgreSQL connection string. ' +
          'SQLite is no longer supported. ' +
          'See docs/POSTGRESQL_MIGRATION_GUIDE.md for migration instructions.',
      );
    } else {
      config.DATABASE_URL = databaseUrl;
    }

    // 5a. Connection Pool Configuration (Optional)
    const poolMin = process.env.DATABASE_POOL_MIN;
    const poolMax = process.env.DATABASE_POOL_MAX;
    const poolIdleTimeout = process.env.DATABASE_POOL_IDLE_TIMEOUT;
    const poolConnectionTimeout = process.env.DATABASE_POOL_CONNECTION_TIMEOUT;

    if (poolMin) {
      const minValue = parseInt(poolMin, 10);
      if (isNaN(minValue) || minValue < 1) {
        warnings.push('DATABASE_POOL_MIN must be a positive integer. Using default.');
      } else if (minValue > 50) {
        warnings.push(
          'DATABASE_POOL_MIN is very high (>50). This may consume excessive resources.',
        );
      } else {
        config.DATABASE_POOL_MIN = minValue;
      }
    }

    if (poolMax) {
      const maxValue = parseInt(poolMax, 10);
      if (isNaN(maxValue) || maxValue < 1) {
        warnings.push('DATABASE_POOL_MAX must be a positive integer. Using default.');
      } else if (maxValue > 100) {
        warnings.push('DATABASE_POOL_MAX is very high (>100). This may overwhelm PostgreSQL.');
      } else {
        config.DATABASE_POOL_MAX = maxValue;
      }
    }

    // Validate min <= max
    if (config.DATABASE_POOL_MIN && config.DATABASE_POOL_MAX) {
      if (config.DATABASE_POOL_MIN > config.DATABASE_POOL_MAX) {
        errors.push('DATABASE_POOL_MIN cannot be greater than DATABASE_POOL_MAX.');
      }
    }

    if (poolIdleTimeout) {
      const timeoutValue = parseInt(poolIdleTimeout, 10);
      if (isNaN(timeoutValue) || timeoutValue < 1000) {
        warnings.push('DATABASE_POOL_IDLE_TIMEOUT must be at least 1000ms. Using default.');
      } else {
        config.DATABASE_POOL_IDLE_TIMEOUT = timeoutValue;
      }
    }

    if (poolConnectionTimeout) {
      const timeoutValue = parseInt(poolConnectionTimeout, 10);
      if (isNaN(timeoutValue) || timeoutValue < 1000) {
        warnings.push('DATABASE_POOL_CONNECTION_TIMEOUT must be at least 1000ms. Using default.');
      } else {
        config.DATABASE_POOL_CONNECTION_TIMEOUT = timeoutValue;
      }
    }

    // 6. REDIS_URL (Optional)
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      warnings.push(
        'REDIS_URL not configured. Token blacklisting and caching will use in-memory storage. ' +
          'For production, configure Redis for distributed caching.',
      );
    } else {
      config.REDIS_URL = redisUrl;
    }

    // 7. SSL Configuration (Optional but recommended for production)
    const sslKeyPath = process.env.SSL_KEY_PATH;
    const sslCertPath = process.env.SSL_CERT_PATH;

    if (nodeEnv === 'production' && (!sslKeyPath || !sslCertPath)) {
      warnings.push(
        'SSL not configured (SSL_KEY_PATH and SSL_CERT_PATH). ' +
          'HTTPS is recommended for production. ' +
          'Alternatively, use a reverse proxy (nginx, Apache) for SSL termination.',
      );
    }

    if (sslKeyPath) config.SSL_KEY_PATH = sslKeyPath;
    if (sslCertPath) config.SSL_CERT_PATH = sslCertPath;

    // 8. PORT (Optional)
    const port = process.env.PORT;
    if (port) {
      const portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        errors.push(`PORT must be a valid port number (1-65535). Got: ${port}`);
      } else {
        config.PORT = port;
      }
    }

    // 9. COOKIE_DOMAIN (Optional)
    const cookieDomain = process.env.COOKIE_DOMAIN;
    if (cookieDomain) {
      config.COOKIE_DOMAIN = cookieDomain;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      config,
    };
  }

  /**
   * Log validation results and throw error if validation failed
   */
  validateAndThrow(): EnvironmentConfig {
    const result = this.validateEnvironment();

    // Log warnings
    if (result.warnings.length > 0) {
      this.logger.warn('⚠️  Environment Configuration Warnings:');
      result.warnings.forEach((warning, index) => {
        this.logger.warn(`  ${index + 1}. ${warning}`);
      });
    }

    // Log errors and throw if validation failed
    if (!result.valid) {
      this.logger.error('❌ Environment Configuration Errors:');
      result.errors.forEach((error, index) => {
        this.logger.error(`  ${index + 1}. ${error}`);
      });

      throw new Error(
        `Environment validation failed with ${result.errors.length} error(s). ` +
          'Please fix the above errors and restart the application.',
      );
    }

    // Log success
    this.logger.log('✅ Environment configuration validated successfully');

    return result.config as EnvironmentConfig;
  }

  /**
   * Get validated configuration (for use in other services)
   */
  getConfig(): EnvironmentConfig {
    return this.validateAndThrow();
  }
}
