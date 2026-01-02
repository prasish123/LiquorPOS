#!/usr/bin/env node

/**
 * Agentic Fix Loop for Load Testing
 * Automatically detects issues and attempts to fix them
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MAX_ITERATIONS = 5;

console.log('🤖 Agentic Fix Loop - Automated Load Test Troubleshooting\n');
console.log('━'.repeat(60));

class AgenticFixLoop {
  constructor() {
    this.iteration = 0;
    this.issues = [];
    this.fixes = [];
  }

  async run() {
    console.log('Starting automated fix loop...\n');

    while (this.iteration < MAX_ITERATIONS) {
      this.iteration++;
      console.log(`\n🔄 Iteration ${this.iteration}/${MAX_ITERATIONS}`);
      console.log('━'.repeat(60));

      // Detect issues
      const issues = await this.detectIssues();
      
      if (issues.length === 0) {
        console.log('\n✅ No issues detected! System is ready for load testing.');
        this.printSummary();
        return true;
      }

      console.log(`\n⚠️  Found ${issues.length} issue(s):`);
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue.description}`);
      });

      // Attempt to fix issues
      console.log('\n🔧 Attempting to fix issues...');
      const fixResults = await this.fixIssues(issues);

      // Check if all fixes succeeded
      const allFixed = fixResults.every(result => result.success);
      if (allFixed) {
        console.log('\n✅ All issues fixed! Validating...');
        // Wait a bit for services to stabilize
        await this.sleep(2000);
      } else {
        console.log('\n⚠️  Some issues could not be fixed automatically');
        const failedFixes = fixResults.filter(r => !r.success);
        failedFixes.forEach(fix => {
          console.log(`   ❌ ${fix.issue}: ${fix.error}`);
        });
      }
    }

    console.log('\n❌ Maximum iterations reached. Manual intervention required.');
    this.printSummary();
    return false;
  }

  async detectIssues() {
    const issues = [];

    // Check 1: Server running
    try {
      await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
    } catch (error) {
      issues.push({
        type: 'server_not_running',
        description: 'Backend server is not running',
        severity: 'critical',
        fix: 'startServer',
      });
    }

    // Check 2: Database connection
    try {
      await axios.get(`${BASE_URL}/health/db`, { timeout: 3000 });
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') {
        issues.push({
          type: 'database_error',
          description: 'Database connection issue',
          severity: 'critical',
          fix: 'checkDatabase',
        });
      }
    }

    // Check 3: Artillery installed
    try {
      execSync('npx artillery --version', { stdio: 'ignore' });
    } catch (error) {
      issues.push({
        type: 'artillery_missing',
        description: 'Artillery is not installed',
        severity: 'critical',
        fix: 'installArtillery',
      });
    }

    // Check 4: Test files exist
    const requiredFiles = [
      'test/load/load-test.yml',
      'test/load/helpers/auth-helper.js',
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        issues.push({
          type: 'missing_file',
          description: `Required file missing: ${file}`,
          severity: 'high',
          fix: 'createMissingFiles',
          data: { file },
        });
      }
    }

    // Check 5: Authentication
    try {
      const csrfResponse = await axios.get(`${BASE_URL}/auth/csrf-token`, {
        withCredentials: true,
        timeout: 3000,
      });
      const csrfToken = csrfResponse.data.csrfToken;

      await axios.post(
        `${BASE_URL}/auth/login`,
        { username: 'admin', password: 'admin123' },
        {
          headers: { 'x-csrf-token': csrfToken },
          withCredentials: true,
          timeout: 3000,
        }
      );
    } catch (error) {
      if (error.response?.status === 401) {
        issues.push({
          type: 'auth_failed',
          description: 'Authentication failed - database may need seeding',
          severity: 'high',
          fix: 'seedDatabase',
        });
      }
    }

    // Check 6: Results directory
    if (!fs.existsSync('test/load/results')) {
      issues.push({
        type: 'missing_directory',
        description: 'Results directory missing',
        severity: 'low',
        fix: 'createDirectories',
      });
    }

    return issues;
  }

  async fixIssues(issues) {
    const results = [];

    for (const issue of issues) {
      try {
        const fixMethod = this[issue.fix];
        if (fixMethod) {
          console.log(`   🔧 Fixing: ${issue.description}`);
          await fixMethod.call(this, issue);
          results.push({ issue: issue.description, success: true });
          this.fixes.push(issue.description);
          console.log(`   ✅ Fixed: ${issue.description}`);
        } else {
          results.push({
            issue: issue.description,
            success: false,
            error: 'No fix method available',
          });
        }
      } catch (error) {
        results.push({
          issue: issue.description,
          success: false,
          error: error.message,
        });
        console.log(`   ❌ Failed to fix: ${issue.description} - ${error.message}`);
      }
    }

    return results;
  }

  // Fix methods

  async startServer() {
    console.log('      ⚠️  Cannot automatically start server');
    console.log('      Please run: npm run start:dev');
    throw new Error('Manual intervention required');
  }

  async checkDatabase() {
    console.log('      Checking database migrations...');
    try {
      execSync('npx prisma migrate status', { stdio: 'inherit' });
      console.log('      ℹ️  If migrations are pending, run: npm run migrate:deploy');
    } catch (error) {
      throw new Error('Database check failed');
    }
  }

  async installArtillery() {
    console.log('      Installing Artillery...');
    execSync('npm install --save-dev artillery', { stdio: 'inherit' });
  }

  async createMissingFiles(issue) {
    console.log(`      ⚠️  Cannot automatically create: ${issue.data.file}`);
    console.log('      Please ensure all test files are present');
    throw new Error('Manual intervention required');
  }

  async seedDatabase() {
    console.log('      Seeding database...');
    try {
      execSync('npm run db:seed', { stdio: 'inherit' });
      await this.sleep(3000); // Wait for seeding to complete
    } catch (error) {
      throw new Error('Database seeding failed');
    }
  }

  async createDirectories() {
    console.log('      Creating results directory...');
    fs.mkdirSync('test/load/results', { recursive: true });
  }

  // Utility methods

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  printSummary() {
    console.log('\n━'.repeat(60));
    console.log('📊 Summary');
    console.log('━'.repeat(60));
    console.log(`Iterations: ${this.iteration}/${MAX_ITERATIONS}`);
    console.log(`Fixes applied: ${this.fixes.length}`);
    
    if (this.fixes.length > 0) {
      console.log('\nFixes applied:');
      this.fixes.forEach((fix, idx) => {
        console.log(`   ${idx + 1}. ${fix}`);
      });
    }

    console.log('\n📚 Next Steps:');
    console.log('   1. Ensure backend server is running: npm run start:dev');
    console.log('   2. Validate setup: npm run load-test:validate');
    console.log('   3. Run load tests: npm run load-test');
    console.log('━'.repeat(60));
  }
}

// Run the agentic fix loop
async function main() {
  const fixLoop = new AgenticFixLoop();
  const success = await fixLoop.run();
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});

