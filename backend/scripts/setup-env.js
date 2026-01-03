#!/usr/bin/env node

/**
 * Interactive Environment Setup Wizard
 * 
 * This script guides you through setting up your environment configuration.
 * It generates secure keys, validates inputs, and creates a .env file.
 * 
 * Usage: npm run setup:env
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Configuration object
const config = {};

// Helper function to ask questions
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

// Helper function to generate secure key
function generateKey() {
  return crypto.randomBytes(32).toString('base64');
}

// Helper function to print colored text
function print(text, color = 'reset') {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

// Helper function to print section header
function printHeader(text) {
  console.log('');
  print('='.repeat(60), 'cyan');
  print(text, 'bright');
  print('='.repeat(60), 'cyan');
  console.log('');
}

// Main setup function
async function setup() {
  print('\n🚀 POS-Omni Environment Setup Wizard\n', 'bright');
  print('This wizard will help you configure your environment.\n', 'blue');

  // Check if .env already exists
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    print('⚠️  Warning: .env file already exists!', 'yellow');
    const overwrite = await ask('Do you want to overwrite it? (yes/no): ');
    if (overwrite.toLowerCase() !== 'yes') {
      print('\n❌ Setup cancelled. Existing .env file preserved.', 'red');
      rl.close();
      return;
    }
  }

  // 1. Environment Type
  printHeader('1. Environment Configuration');
  print('Select your environment:', 'blue');
  print('  1) Development (local development)');
  print('  2) Staging (testing environment)');
  print('  3) Production (live environment)');
  const envChoice = await ask('\nChoice (1-3): ');
  
  config.NODE_ENV = envChoice === '3' ? 'production' : envChoice === '2' ? 'staging' : 'development';
  print(`✅ Environment: ${config.NODE_ENV}`, 'green');

  // 2. Encryption Key
  printHeader('2. Encryption Key (CRITICAL)');
  print('This key encrypts sensitive audit log data.', 'blue');
  print('⚠️  CRITICAL: Backup this key securely!', 'yellow');
  print('Losing this key means permanent data loss.\n', 'yellow');
  
  const genKey = await ask('Generate encryption key automatically? (yes/no): ');
  if (genKey.toLowerCase() === 'yes') {
    config.AUDIT_LOG_ENCRYPTION_KEY = generateKey();
    print(`✅ Generated: ${config.AUDIT_LOG_ENCRYPTION_KEY}`, 'green');
    print('\n⚠️  IMPORTANT: Save this key in a secure location!', 'yellow');
    print('   - Password manager (1Password, LastPass)', 'yellow');
    print('   - AWS Secrets Manager / Azure Key Vault', 'yellow');
    print('   - Encrypted backup in safe', 'yellow');
    await ask('\nPress Enter after you have saved the key...');
  } else {
    config.AUDIT_LOG_ENCRYPTION_KEY = await ask('Enter your encryption key: ');
  }

  // 3. CORS Origins
  printHeader('3. CORS Configuration');
  print('Enter allowed frontend origins (comma-separated).', 'blue');
  print('Example: http://localhost:5173,http://localhost:5174\n', 'blue');
  
  const defaultOrigins = config.NODE_ENV === 'production' 
    ? 'https://pos.yourdomain.com' 
    : 'http://localhost:5173';
  
  const origins = await ask(`Allowed origins [${defaultOrigins}]: `);
  config.ALLOWED_ORIGINS = origins || defaultOrigins;
  print(`✅ CORS origins: ${config.ALLOWED_ORIGINS}`, 'green');

  // 4. Database
  printHeader('4. Database Configuration');
  print('Enter PostgreSQL connection details.\n', 'blue');
  
  const dbHost = await ask('Database host [localhost]: ') || 'localhost';
  const dbPort = await ask('Database port [5432]: ') || '5432';
  const dbName = await ask('Database name [liquor_pos]: ') || 'liquor_pos';
  const dbUser = await ask('Database user [liquor_pos]: ') || 'liquor_pos';
  const dbPass = await ask('Database password: ');
  
  config.DATABASE_URL = `postgresql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`;
  print(`✅ Database: ${dbHost}:${dbPort}/${dbName}`, 'green');

  // 5. JWT Secret
  printHeader('5. JWT Secret');
  if (config.NODE_ENV === 'production') {
    print('Production requires an explicit JWT secret.', 'blue');
    const genJwt = await ask('Generate JWT secret automatically? (yes/no): ');
    if (genJwt.toLowerCase() === 'yes') {
      config.JWT_SECRET = generateKey();
      print(`✅ Generated: ${config.JWT_SECRET}`, 'green');
    } else {
      config.JWT_SECRET = await ask('Enter your JWT secret: ');
    }
  } else {
    print('JWT secret will be auto-generated in development.', 'blue');
    const setJwt = await ask('Set a custom JWT secret? (yes/no): ');
    if (setJwt.toLowerCase() === 'yes') {
      config.JWT_SECRET = await ask('Enter your JWT secret: ') || generateKey();
    }
  }

  // 6. Stripe
  printHeader('6. Payment Processing (Stripe)');
  print('Stripe is required for card payments.', 'blue');
  print('Get your API key from: https://dashboard.stripe.com/apikeys\n', 'blue');
  
  const useStripe = await ask('Configure Stripe now? (yes/no): ');
  if (useStripe.toLowerCase() === 'yes') {
    const stripeKey = await ask('Stripe secret key: ');
    if (stripeKey) {
      config.STRIPE_SECRET_KEY = stripeKey;
      
      // Validate format
      if (config.NODE_ENV === 'production' && !stripeKey.startsWith('sk_live_')) {
        print('⚠️  Warning: Using test key in production!', 'yellow');
      }
      print('✅ Stripe configured', 'green');
    }
  } else {
    print('⚠️  Skipping Stripe. Card payments will not work.', 'yellow');
  }

  // 7. Redis (Optional)
  printHeader('7. Redis Cache (Optional)');
  print('Redis improves performance but is not required.', 'blue');
  print('System will use in-memory cache if Redis is not available.\n', 'blue');
  
  const useRedis = await ask('Configure Redis? (yes/no): ');
  if (useRedis.toLowerCase() === 'yes') {
    config.REDIS_HOST = await ask('Redis host [localhost]: ') || 'localhost';
    config.REDIS_PORT = await ask('Redis port [6379]: ') || '6379';
    const redisPass = await ask('Redis password (optional): ');
    if (redisPass) {
      config.REDIS_PASSWORD = redisPass;
    }
    print('✅ Redis configured', 'green');
  }

  // 8. Sentry (Optional)
  printHeader('8. Error Tracking (Sentry - Optional)');
  print('Sentry provides advanced error tracking and monitoring.', 'blue');
  print('Sign up at: https://sentry.io (free tier available)\n', 'blue');
  
  const useSentry = await ask('Configure Sentry? (yes/no): ');
  if (useSentry.toLowerCase() === 'yes') {
    config.SENTRY_DSN = await ask('Sentry DSN: ');
    config.SENTRY_ENVIRONMENT = config.NODE_ENV;
    if (config.SENTRY_DSN) {
      print('✅ Sentry configured', 'green');
    }
  }

  // 9. Generate .env file
  printHeader('9. Generating .env File');
  
  let envContent = '# ============================================\n';
  envContent += '# POS-Omni Environment Configuration\n';
  envContent += `# Generated: ${new Date().toISOString()}\n`;
  envContent += '# ============================================\n\n';

  envContent += '# REQUIRED VARIABLES\n';
  envContent += `NODE_ENV=${config.NODE_ENV}\n`;
  envContent += `AUDIT_LOG_ENCRYPTION_KEY=${config.AUDIT_LOG_ENCRYPTION_KEY}\n`;
  envContent += `ALLOWED_ORIGINS=${config.ALLOWED_ORIGINS}\n`;
  envContent += `DATABASE_URL=${config.DATABASE_URL}\n`;
  if (config.JWT_SECRET) {
    envContent += `JWT_SECRET=${config.JWT_SECRET}\n`;
  }
  envContent += '\n';

  if (config.STRIPE_SECRET_KEY) {
    envContent += '# PAYMENT PROCESSING\n';
    envContent += `STRIPE_SECRET_KEY=${config.STRIPE_SECRET_KEY}\n\n`;
  }

  if (config.REDIS_HOST) {
    envContent += '# REDIS CONFIGURATION\n';
    envContent += `REDIS_HOST=${config.REDIS_HOST}\n`;
    envContent += `REDIS_PORT=${config.REDIS_PORT}\n`;
    if (config.REDIS_PASSWORD) {
      envContent += `REDIS_PASSWORD=${config.REDIS_PASSWORD}\n`;
    }
    envContent += '\n';
  }

  if (config.SENTRY_DSN) {
    envContent += '# MONITORING\n';
    envContent += `SENTRY_DSN=${config.SENTRY_DSN}\n`;
    envContent += `SENTRY_ENVIRONMENT=${config.SENTRY_ENVIRONMENT}\n`;
    envContent += 'SENTRY_TRACES_SAMPLE_RATE=1.0\n';
    envContent += 'SENTRY_PROFILES_SAMPLE_RATE=1.0\n\n';
  }

  envContent += '# LOGGING\n';
  envContent += 'LOG_LEVEL=info\n\n';

  envContent += '# SERVER\n';
  envContent += 'PORT=3000\n';

  // Write .env file
  fs.writeFileSync(envPath, envContent);
  print('✅ .env file created successfully!', 'green');

  // 10. Summary
  printHeader('Setup Complete! 🎉');
  print('Your environment is configured and ready to use.\n', 'green');
  
  print('Next steps:', 'bright');
  print('  1. Backup your encryption key securely', 'blue');
  print('  2. Setup database: npm run db:setup', 'blue');
  print('  3. Start server: npm run start:dev', 'blue');
  print('  4. Check health: npm run health\n', 'blue');

  print('Important files:', 'bright');
  print(`  - Configuration: ${envPath}`, 'blue');
  print('  - Documentation: backend/ENV_SETUP.md', 'blue');
  print('  - Setup guide: backend/SETUP.md\n', 'blue');

  if (!config.STRIPE_SECRET_KEY) {
    print('⚠️  Reminder: Stripe not configured. Card payments will not work.', 'yellow');
  }

  if (!config.REDIS_HOST) {
    print('ℹ️  Info: Redis not configured. Using in-memory cache.', 'blue');
  }

  rl.close();
}

// Run setup
setup().catch((error) => {
  print(`\n❌ Setup failed: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});

