#!/usr/bin/env ts-node
/**
 * Test script to verify Loki integration
 * 
 * This script:
 * 1. Checks if Loki is running and accessible
 * 2. Sends test logs through the LoggerService
 * 3. Queries Loki to verify logs were received
 * 4. Reports the results
 * 
 * Usage:
 *   ts-node scripts/test-loki-integration.ts
 */

import axios from 'axios';
import { LoggerService } from '../src/common/logger.service';
import { getAppConfig } from '../src/config/app.config';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkLokiHealth(lokiUrl: string): Promise<TestResult> {
  try {
    const response = await axios.get(`${lokiUrl}/ready`, { timeout: 5000 });
    return {
      step: 'Loki Health Check',
      success: response.status === 200,
      message: response.status === 200 
        ? '✅ Loki is running and ready' 
        : `⚠️ Loki returned status ${response.status}`,
      details: { status: response.status, data: response.data },
    };
  } catch (error) {
    return {
      step: 'Loki Health Check',
      success: false,
      message: `❌ Failed to connect to Loki at ${lokiUrl}`,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function sendTestLogs(logger: LoggerService): Promise<TestResult> {
  try {
    const testId = `test-${Date.now()}`;
    
    // Send various log levels
    logger.debug(`Debug log - ${testId}`, { testId, level: 'debug' });
    logger.info(`Info log - ${testId}`, { testId, level: 'info' });
    logger.warn(`Warning log - ${testId}`, { testId, level: 'warn' });
    logger.error(`Error log - ${testId}`, undefined, { testId, level: 'error' });
    
    // Send structured log with metadata
    logger.info(`Structured log - ${testId}`, {
      testId,
      metadata: {
        user: 'test-user',
        action: 'test-action',
        timestamp: new Date().toISOString(),
      },
    });
    
    return {
      step: 'Send Test Logs',
      success: true,
      message: '✅ Sent 5 test logs successfully',
      details: { testId, count: 5 },
    };
  } catch (error) {
    return {
      step: 'Send Test Logs',
      success: false,
      message: '❌ Failed to send test logs',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function queryLokiLogs(lokiUrl: string, testId: string): Promise<TestResult> {
  try {
    // Wait for logs to be ingested (batching + processing time)
    console.log('⏳ Waiting 10 seconds for logs to be ingested...');
    await sleep(10000);
    
    // Query Loki for our test logs
    const now = Date.now();
    const start = now - 60000; // Last 1 minute
    const query = `{service="liquor-pos-backend"} |= "${testId}"`;
    
    const response = await axios.get(`${lokiUrl}/loki/api/v1/query_range`, {
      params: {
        query,
        start: start * 1000000, // nanoseconds
        end: now * 1000000,
        limit: 100,
      },
      timeout: 10000,
    });
    
    const data = response.data;
    const streams = data?.data?.result || [];
    const totalLogs = streams.reduce((sum: number, stream: any) => 
      sum + (stream.values?.length || 0), 0
    );
    
    if (totalLogs > 0) {
      return {
        step: 'Query Loki Logs',
        success: true,
        message: `✅ Found ${totalLogs} log(s) in Loki`,
        details: {
          testId,
          logsFound: totalLogs,
          streams: streams.length,
          query,
        },
      };
    } else {
      return {
        step: 'Query Loki Logs',
        success: false,
        message: '⚠️ No logs found in Loki (they may still be in the batch queue)',
        details: {
          testId,
          query,
          hint: 'Try running the test again or check Loki directly',
        },
      };
    }
  } catch (error) {
    return {
      step: 'Query Loki Logs',
      success: false,
      message: '❌ Failed to query Loki',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testLokiIntegration(): Promise<void> {
  console.log('🔍 Testing Loki Integration\n');
  console.log('=' .repeat(60));
  
  // Load configuration
  let config;
  try {
    config = getAppConfig();
    console.log('\n📋 Configuration:');
    console.log(`   Loki Enabled: ${config.observability.lokiEnabled}`);
    console.log(`   Loki URL: ${config.observability.lokiUrl || 'Not set'}`);
    console.log(`   Location ID: ${config.location.id}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Batch Interval: ${config.observability.lokiBatchInterval}ms`);
    console.log(`   Max Batch Size: ${config.observability.lokiMaxBatchSize}`);
  } catch (error) {
    console.error('\n❌ Failed to load configuration:', error);
    process.exit(1);
  }
  
  if (!config.observability.lokiEnabled) {
    console.error('\n❌ Loki is not enabled. Set LOKI_ENABLED=true in your environment.');
    process.exit(1);
  }
  
  if (!config.observability.lokiUrl) {
    console.error('\n❌ LOKI_URL is not set. Please configure it in your environment.');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n🧪 Running Tests:\n');
  
  // Test 1: Check Loki health
  const healthResult = await checkLokiHealth(config.observability.lokiUrl);
  results.push(healthResult);
  console.log(`${healthResult.message}`);
  if (!healthResult.success) {
    console.log(`   Details: ${JSON.stringify(healthResult.details, null, 2)}`);
  }
  
  if (!healthResult.success) {
    console.log('\n⚠️ Cannot proceed with tests - Loki is not accessible');
    printSummary();
    process.exit(1);
  }
  
  // Test 2: Send test logs
  console.log();
  const logger = new LoggerService('LokiIntegrationTest');
  const sendResult = await sendTestLogs(logger);
  results.push(sendResult);
  console.log(`${sendResult.message}`);
  if (sendResult.details?.testId) {
    console.log(`   Test ID: ${sendResult.details.testId}`);
  }
  
  if (!sendResult.success) {
    console.log(`   Details: ${JSON.stringify(sendResult.details, null, 2)}`);
    printSummary();
    process.exit(1);
  }
  
  // Test 3: Query Loki for logs
  console.log();
  const queryResult = await queryLokiLogs(
    config.observability.lokiUrl,
    sendResult.details?.testId
  );
  results.push(queryResult);
  console.log(`${queryResult.message}`);
  if (queryResult.details) {
    console.log(`   Details: ${JSON.stringify(queryResult.details, null, 2)}`);
  }
  
  // Print summary
  printSummary();
  
  // Exit with appropriate code
  const allPassed = results.every(r => r.success);
  process.exit(allPassed ? 0 : 1);
}

function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:\n');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`   ${index + 1}. ${icon} ${result.step}`);
  });
  
  console.log(`\n   Total: ${results.length} tests`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Loki integration is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the details above.');
  }
  
  console.log('\n' + '='.repeat(60));
}

// Run the test
testLokiIntegration().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});

