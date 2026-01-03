#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * Validates environment configuration without starting the server.
 * Useful for CI/CD pipelines and pre-deployment checks.
 * 
 * Usage: npm run validate:env
 * Exit codes: 0 (success), 1 (failure)
 */

require('dotenv').config();

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function print(text, color = 'reset') {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

function printHeader(text) {
  console.log('');
  print('='.repeat(60), 'cyan');
  print(text, 'bright');
  print('='.repeat(60), 'cyan');
  console.log('');
}

// Validation results
const errors = [];
const warnings = [];
const info = [];

// Helper to validate required variable
function validateRequired(name, value, validator = null) {
  if (!value) {
    errors.push(`${name} is required`);
    return false;
  }
  
  if (validator) {
    const result = validator(value);
    if (result !== true) {
      errors.push(`${name}: ${result}`);
      return false;
    }
  }
  
  return true;
}

// Helper to validate optional variable
function validateOptional(name, value, validator = null) {
  if (!value) {
    return false;
  }
  
  if (validator) {
    const result = validator(value);
    if (result !== true) {
      warnings.push(`${name}: ${result}`);
      return false;
    }
  }
  
  return true;
}

// Validators
const validators = {
  encryptionKey: (value) => {
    try {
      const buffer = Buffer.from(value, 'base64');
      if (buffer.length !== 32) {
        return `Must be 32 bytes (256 bits), got ${buffer.length} bytes`;
      }
      return true;
    } catch (error) {
      return 'Must be valid base64-encoded string';
    }
  },
  
  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return 'Must be a valid URL';
    }
  },
  
  databaseUrl: (value) => {
    if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
      return 'Must be a PostgreSQL connection string (postgresql://...)';
    }
    return true;
  },
  
  stripeKey: (value) => {
    if (!value.startsWith('sk_test_') && !value.startsWith('sk_live_')) {
      return 'Should start with sk_test_ or sk_live_';
    }
    return true;
  },
  
  port: (value) => {
    const port = parseInt(value, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return 'Must be a valid port number (1-65535)';
    }
    return true;
  },
  
  jwtSecret: (value) => {
    if (value === 'your-secret-key-change-in-production') {
      return 'Default JWT secret is not allowed';
    }
    if (value.length < 32) {
      return 'Should be at least 32 characters for security';
    }
    return true;
  },
};

// Main validation function
function validate() {
  printHeader('Environment Validation');
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  print(`Environment: ${nodeEnv}`, 'cyan');
  console.log('');

  // 1. AUDIT_LOG_ENCRYPTION_KEY (CRITICAL)
  print('Checking AUDIT_LOG_ENCRYPTION_KEY...', 'bright');
  if (validateRequired('AUDIT_LOG_ENCRYPTION_KEY', process.env.AUDIT_LOG_ENCRYPTION_KEY, validators.encryptionKey)) {
    print('  ✅ Valid encryption key', 'green');
  }

  // 2. ALLOWED_ORIGINS (REQUIRED)
  print('\nChecking ALLOWED_ORIGINS...', 'bright');
  if (validateRequired('ALLOWED_ORIGINS', process.env.ALLOWED_ORIGINS)) {
    const origins = process.env.ALLOWED_ORIGINS.split(',');
    let allValid = true;
    origins.forEach(origin => {
      const trimmed = origin.trim();
      if (validators.url(trimmed) !== true) {
        errors.push(`ALLOWED_ORIGINS contains invalid URL: ${trimmed}`);
        allValid = false;
      }
    });
    if (allValid) {
      print(`  ✅ ${origins.length} valid origin(s)`, 'green');
    }
  }

  // 3. DATABASE_URL (REQUIRED)
  print('\nChecking DATABASE_URL...', 'bright');
  if (validateRequired('DATABASE_URL', process.env.DATABASE_URL, validators.databaseUrl)) {
    print('  ✅ Valid PostgreSQL connection string', 'green');
  }

  // 4. JWT_SECRET
  print('\nChecking JWT_SECRET...', 'bright');
  if (nodeEnv === 'production') {
    if (validateRequired('JWT_SECRET', process.env.JWT_SECRET, validators.jwtSecret)) {
      print('  ✅ Valid JWT secret', 'green');
    }
  } else {
    if (process.env.JWT_SECRET) {
      if (validators.jwtSecret(process.env.JWT_SECRET) === true) {
        print('  ✅ Custom JWT secret configured', 'green');
      } else {
        warnings.push('JWT_SECRET: ' + validators.jwtSecret(process.env.JWT_SECRET));
        print('  ⚠️  JWT secret has issues (will auto-generate)', 'yellow');
      }
    } else {
      info.push('JWT_SECRET not set - will be auto-generated in development');
      print('  ℹ️  Will be auto-generated', 'cyan');
    }
  }

  // 5. STRIPE_SECRET_KEY (OPTIONAL)
  print('\nChecking STRIPE_SECRET_KEY...', 'bright');
  if (validateOptional('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY, validators.stripeKey)) {
    if (nodeEnv === 'production' && process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
      warnings.push('Using Stripe test key in production environment');
      print('  ⚠️  Using test key in production!', 'yellow');
    } else {
      print('  ✅ Stripe configured', 'green');
    }
  } else if (!process.env.STRIPE_SECRET_KEY) {
    warnings.push('STRIPE_SECRET_KEY not configured - card payments will fail');
    print('  ⚠️  Not configured (card payments will fail)', 'yellow');
  }

  // 6. REDIS (OPTIONAL)
  print('\nChecking Redis configuration...', 'bright');
  if (process.env.REDIS_HOST) {
    print('  ✅ Redis configured', 'green');
    if (process.env.REDIS_SENTINEL_ENABLED === 'true') {
      print('  ✅ Sentinel mode enabled (high availability)', 'green');
    }
  } else {
    info.push('Redis not configured - will use in-memory cache');
    print('  ℹ️  Not configured (will use in-memory cache)', 'cyan');
  }

  // 7. SENTRY (OPTIONAL)
  print('\nChecking Sentry configuration...', 'bright');
  if (process.env.SENTRY_DSN) {
    print('  ✅ Sentry configured', 'green');
  } else {
    info.push('Sentry not configured - using built-in monitoring');
    print('  ℹ️  Not configured (using built-in monitoring)', 'cyan');
  }

  // 8. PORT (OPTIONAL)
  print('\nChecking PORT...', 'bright');
  if (process.env.PORT) {
    if (validators.port(process.env.PORT) === true) {
      print(`  ✅ Port ${process.env.PORT}`, 'green');
    }
  } else {
    print('  ℹ️  Using default port 3000', 'cyan');
  }

  // 9. SSL/TLS (PRODUCTION)
  if (nodeEnv === 'production') {
    print('\nChecking SSL/TLS configuration...', 'bright');
    if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
      print('  ✅ SSL/TLS configured', 'green');
    } else {
      warnings.push('SSL/TLS not configured for production');
      print('  ⚠️  Not configured (recommended for production)', 'yellow');
    }
  }

  // Print summary
  printHeader('Validation Summary');

  if (errors.length === 0) {
    print('✅ VALIDATION PASSED', 'green');
    print(`\nAll required environment variables are properly configured.\n`, 'green');
  } else {
    print('❌ VALIDATION FAILED', 'red');
    print(`\n${errors.length} error(s) found:\n`, 'red');
    errors.forEach((error, i) => {
      print(`  ${i + 1}. ${error}`, 'red');
    });
    console.log('');
  }

  if (warnings.length > 0) {
    print(`⚠️  ${warnings.length} warning(s):\n`, 'yellow');
    warnings.forEach((warning, i) => {
      print(`  ${i + 1}. ${warning}`, 'yellow');
    });
    console.log('');
  }

  if (info.length > 0) {
    print(`ℹ️  ${info.length} info message(s):\n`, 'cyan');
    info.forEach((msg, i) => {
      print(`  ${i + 1}. ${msg}`, 'cyan');
    });
    console.log('');
  }

  // Print next steps
  if (errors.length === 0) {
    print('Next steps:', 'bright');
    print('  1. Setup database: npm run db:setup', 'cyan');
    print('  2. Start server: npm run start:dev', 'cyan');
    print('  3. Check health: npm run health', 'cyan');
    console.log('');
  } else {
    print('To fix errors:', 'bright');
    print('  1. Update your .env file', 'cyan');
    print('  2. Run: npm run validate:env', 'cyan');
    print('  3. See: backend/ENV_SETUP.md for help', 'cyan');
    console.log('');
  }

  // Exit with appropriate code
  process.exit(errors.length > 0 ? 1 : 0);
}

// Run validation
try {
  validate();
} catch (error) {
  print(`\n❌ Validation error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
}

