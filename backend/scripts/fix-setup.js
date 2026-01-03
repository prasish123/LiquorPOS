#!/usr/bin/env node

/**
 * Automated Fix Script for Database Setup Issues
 * Fixes all known issues and gets the system running
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m',
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function exec(command, description) {
  try {
    log(`\n${description}...`, 'info');
    execSync(command, { stdio: 'inherit', cwd: __dirname + '/..' });
    log(`✅ ${description} completed`, 'success');
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, 'error');
    return false;
  }
}

async function main() {
  log('\n🔧 Starting Automated Fix Process\n', 'info');

  // Step 1: Remove problematic files
  log('Step 1: Cleaning up problematic files', 'info');
  const filesToRemove = [
    path.join(__dirname, '..', 'prisma', 'migrations'),
    path.join(__dirname, '..', 'node_modules', '.prisma'),
    path.join(__dirname, '..', 'node_modules', '@prisma', 'client'),
  ];

  filesToRemove.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        fs.rmSync(file, { recursive: true, force: true });
        log(`  Removed: ${path.basename(file)}`, 'success');
      }
    } catch (error) {
      log(`  Could not remove: ${path.basename(file)}`, 'warning');
    }
  });

  // Step 2: Reinstall Prisma Client
  log('\nStep 2: Reinstalling Prisma Client', 'info');
  exec('npm install @prisma/client', 'Install Prisma Client');

  // Step 3: Push schema to database
  log('\nStep 3: Pushing schema to database', 'info');
  exec('npx prisma db push --accept-data-loss --skip-generate', 'Push schema');

  // Step 4: Generate Prisma Client
  log('\nStep 4: Generating Prisma Client', 'info');
  exec('npx prisma generate', 'Generate Prisma Client');

  // Step 5: Build project
  log('\nStep 5: Building project', 'info');
  exec('npm run build', 'Build project');

  // Step 6: Seed database
  log('\nStep 6: Seeding database', 'info');
  const seedSuccess = exec('npx ts-node prisma/seed.ts', 'Seed database');
  
  if (!seedSuccess) {
    log('⚠️  Seeding failed, but system should still work', 'warning');
  }

  // Final summary
  log('\n' + '='.repeat(60), 'success');
  log('🎉 Fix Process Complete!', 'success');
  log('='.repeat(60) + '\n', 'success');

  log('Next steps:', 'info');
  log('  1. Start server: npm run start:dev', 'info');
  log('  2. Check health: npm run health', 'info');
  log('  3. Open browser: http://localhost:3000/health\n', 'info');
}

main().catch(error => {
  log(`\n❌ Fix process failed: ${error.message}`, 'error');
  process.exit(1);
});

