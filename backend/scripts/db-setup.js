#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * Unified script to setup the database:
 * 1. Run migrations
 * 2. Generate Prisma client
 * 3. Seed database (optional)
 * 
 * Usage: npm run db:setup
 */

const { execSync } = require('child_process');
const readline = require('readline');

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

function execCommand(command, description) {
  try {
    print(`\n${description}...`, 'blue');
    execSync(command, { stdio: 'inherit', cwd: __dirname + '/..' });
    print(`✅ ${description} completed`, 'green');
    return true;
  } catch (error) {
    print(`❌ ${description} failed`, 'red');
    return false;
  }
}

async function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function setup() {
  printHeader('Database Setup');
  
  print('This script will setup your database:\n', 'blue');
  print('  1. Run database migrations', 'cyan');
  print('  2. Generate Prisma client', 'cyan');
  print('  3. Seed database (optional)', 'cyan');
  console.log('');

  // Check if DATABASE_URL is set
  require('dotenv').config();
  if (!process.env.DATABASE_URL) {
    print('❌ DATABASE_URL not found in environment', 'red');
    print('\nPlease set DATABASE_URL in your .env file:', 'yellow');
    print('  DATABASE_URL=postgresql://user:password@host:5432/database', 'yellow');
    print('\nOr run: npm run setup:env', 'yellow');
    process.exit(1);
  }

  print(`Database: ${process.env.DATABASE_URL.split('@')[1] || 'configured'}`, 'cyan');
  console.log('');

  const proceed = await ask('Continue with database setup? (yes/no): ');
  if (proceed.toLowerCase() !== 'yes') {
    print('\n❌ Setup cancelled', 'red');
    process.exit(0);
  }

  // Step 1: Run migrations
  printHeader('Step 1: Running Migrations');
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  const migrateCommand = nodeEnv === 'production' 
    ? 'npx prisma migrate deploy'
    : 'npx prisma migrate dev';
  
  print(`Environment: ${nodeEnv}`, 'cyan');
  print(`Command: ${migrateCommand}`, 'cyan');
  
  const migrateSuccess = execCommand(migrateCommand, 'Running migrations');
  
  if (!migrateSuccess) {
    print('\n❌ Migration failed. Please check the error above.', 'red');
    print('\nCommon issues:', 'yellow');
    print('  - Database server not running', 'yellow');
    print('  - Invalid DATABASE_URL', 'yellow');
    print('  - Insufficient permissions', 'yellow');
    print('  - Network connectivity issues', 'yellow');
    process.exit(1);
  }

  // Step 2: Generate Prisma Client
  printHeader('Step 2: Generating Prisma Client');
  
  const generateSuccess = execCommand(
    'npx prisma generate',
    'Generating Prisma client'
  );
  
  if (!generateSuccess) {
    print('\n❌ Prisma client generation failed', 'red');
    process.exit(1);
  }

  // Step 3: Seed database (optional)
  printHeader('Step 3: Seeding Database');
  
  print('Seeding adds initial data to your database:', 'blue');
  print('  - Sample products', 'cyan');
  print('  - Admin user', 'cyan');
  print('  - Locations', 'cyan');
  console.log('');
  
  const seed = await ask('Seed database with sample data? (yes/no): ');
  
  if (seed.toLowerCase() === 'yes') {
    const seedSuccess = execCommand('npm run seed', 'Seeding database');
    
    if (!seedSuccess) {
      print('\n⚠️  Seeding failed, but database is setup', 'yellow');
      print('You can seed later with: npm run seed', 'yellow');
    }
  } else {
    print('⏭️  Skipping seeding', 'yellow');
  }

  // Success summary
  printHeader('Setup Complete! 🎉');
  
  print('Your database is ready to use.\n', 'green');
  
  print('What was done:', 'bright');
  print('  ✅ Database migrations applied', 'green');
  print('  ✅ Prisma client generated', 'green');
  if (seed.toLowerCase() === 'yes') {
    print('  ✅ Database seeded with sample data', 'green');
  }
  console.log('');
  
  print('Next steps:', 'bright');
  print('  1. Start server: npm run start:dev', 'cyan');
  print('  2. Check health: npm run health', 'cyan');
  print('  3. View database: npx prisma studio', 'cyan');
  console.log('');
  
  print('Useful commands:', 'bright');
  print('  - View data: npx prisma studio', 'cyan');
  print('  - Check migrations: npm run migrate:status', 'cyan');
  print('  - Seed again: npm run seed', 'cyan');
  console.log('');
}

// Run setup
setup().catch((error) => {
  print(`\n❌ Setup failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

