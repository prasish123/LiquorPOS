#!/usr/bin/env node

/**
 * Validation script for load test setup
 * Checks that all prerequisites are met before running load tests
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USERNAME = process.env.TEST_USERNAME || 'admin';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123';

console.log('🔍 Validating Load Test Setup...\n');

async function validateServerRunning() {
  console.log('1️⃣  Checking if server is running...');
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    if (response.status === 200) {
      console.log('   ✅ Server is running and healthy\n');
      return true;
    }
  } catch (error) {
    console.error('   ❌ Server is not running or not responding');
    console.error(`   Error: ${error.message}`);
    console.error(`   Please start the server with: npm run start:dev\n`);
    return false;
  }
}

async function validateAuthentication() {
  console.log('2️⃣  Checking authentication...');
  try {
    // Get CSRF token
    const csrfResponse = await axios.get(`${BASE_URL}/auth/csrf-token`, {
      withCredentials: true,
    });
    const csrfToken = csrfResponse.data.csrfToken;

    // Try to login
    const loginResponse = await axios.post(
      `${BASE_URL}/auth/login`,
      {
        username: TEST_USERNAME,
        password: TEST_PASSWORD,
      },
      {
        headers: {
          'x-csrf-token': csrfToken,
        },
        withCredentials: true,
      }
    );

    if (loginResponse.status === 200 && loginResponse.data.user) {
      console.log(`   ✅ Authentication successful (User: ${loginResponse.data.user.username})\n`);
      return true;
    }
  } catch (error) {
    console.error('   ❌ Authentication failed');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || 'Unknown error'}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    console.error('   Please ensure the database is seeded with: npm run db:seed\n');
    return false;
  }
}

async function validateDatabase() {
  console.log('3️⃣  Checking database...');
  try {
    // Try to fetch products (requires auth, so we'll check orders endpoint)
    const response = await axios.get(`${BASE_URL}/health/db`, { timeout: 5000 });
    if (response.status === 200) {
      console.log('   ✅ Database is connected and accessible\n');
      return true;
    }
  } catch (error) {
    console.error('   ❌ Database check failed');
    console.error(`   Error: ${error.message}`);
    console.error('   Please ensure the database is running and migrated\n');
    return false;
  }
}

function validateTestFiles() {
  console.log('4️⃣  Checking test files...');
  const requiredFiles = [
    'load-test.yml',
    'stress-test.yml',
    'spike-test.yml',
    'helpers/auth-helper.js',
    'helpers/test-data-generator.js',
  ];

  let allFilesExist = true;
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.error(`   ❌ ${file} not found`);
      allFilesExist = false;
    }
  }

  if (allFilesExist) {
    console.log('   ✅ All test files present\n');
  } else {
    console.error('   ❌ Some test files are missing\n');
  }

  return allFilesExist;
}

function validateArtillery() {
  console.log('5️⃣  Checking Artillery installation...');
  try {
    const { execSync } = require('child_process');
    const version = execSync('npx artillery --version', { encoding: 'utf-8' }).trim();
    console.log(`   ✅ Artillery is installed (version: ${version})\n`);
    return true;
  } catch (error) {
    console.error('   ❌ Artillery is not installed');
    console.error('   Please install with: npm install --save-dev artillery\n');
    return false;
  }
}

async function validateEndpoints() {
  console.log('6️⃣  Checking critical endpoints...');
  
  const endpoints = [
    { path: '/health', method: 'GET', requiresAuth: false },
    { path: '/auth/csrf-token', method: 'GET', requiresAuth: false },
  ];

  let allEndpointsOk = true;
  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        timeout: 5000,
      });
      console.log(`   ✅ ${endpoint.method} ${endpoint.path} (${response.status})`);
    } catch (error) {
      console.error(`   ❌ ${endpoint.method} ${endpoint.path} failed`);
      allEndpointsOk = false;
    }
  }

  if (allEndpointsOk) {
    console.log('   ✅ All endpoints accessible\n');
  } else {
    console.error('   ❌ Some endpoints are not accessible\n');
  }

  return allEndpointsOk;
}

async function main() {
  const checks = [
    validateTestFiles(),
    validateArtillery(),
    await validateServerRunning(),
    await validateDatabase(),
    await validateEndpoints(),
    await validateAuthentication(),
  ];

  const allPassed = checks.every(check => check === true);

  console.log('━'.repeat(60));
  if (allPassed) {
    console.log('✅ All validation checks passed!');
    console.log('\n🚀 You can now run load tests:');
    console.log('   npm run load-test          - Standard load test');
    console.log('   npm run load-test:report   - Load test with HTML report');
    console.log('   npm run load-test:stress   - Stress test');
    console.log('   npm run load-test:spike    - Spike test');
    process.exit(0);
  } else {
    console.log('❌ Some validation checks failed');
    console.log('\n⚠️  Please fix the issues above before running load tests');
    process.exit(1);
  }
}

// Run validation
main().catch(error => {
  console.error('\n💥 Validation script error:', error.message);
  process.exit(1);
});

