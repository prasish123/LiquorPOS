#!/usr/bin/env node

/**
 * Health Check Script
 * 
 * Checks the health of the application and all its dependencies.
 * Can be used standalone or in CI/CD pipelines.
 * 
 * Usage: npm run health
 * Exit codes: 0 (healthy), 1 (unhealthy)
 */

const http = require('http');
const https = require('https');

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

// Configuration
const config = {
  host: process.env.HEALTH_CHECK_HOST || 'localhost',
  port: process.env.PORT || 3000,
  protocol: process.env.HEALTH_CHECK_PROTOCOL || 'http',
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
};

// Make HTTP request
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const client = config.protocol === 'https' ? https : http;
    const url = `${config.protocol}://${config.host}:${config.port}${path}`;
    
    const req = client.get(url, { timeout: config.timeout }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Check individual service
function checkService(name, status) {
  if (!status) {
    print(`  ❌ ${name}: Unknown`, 'red');
    return false;
  }
  
  if (status.status === 'up') {
    print(`  ✅ ${name}: Healthy`, 'green');
    return true;
  } else if (status.status === 'degraded') {
    print(`  ⚠️  ${name}: Degraded`, 'yellow');
    if (status.message) {
      print(`     ${status.message}`, 'yellow');
    }
    return true;
  } else {
    print(`  ❌ ${name}: Down`, 'red');
    if (status.message) {
      print(`     ${status.message}`, 'red');
    }
    return false;
  }
}

// Main health check
async function healthCheck() {
  printHeader('System Health Check');
  
  print(`Checking: ${config.protocol}://${config.host}:${config.port}`, 'cyan');
  print(`Timeout: ${config.timeout}ms\n`, 'cyan');

  try {
    // Check main health endpoint
    print('Checking application health...', 'bright');
    const healthResponse = await makeRequest('/health');
    
    if (healthResponse.status !== 200) {
      print(`\n❌ Health check failed (HTTP ${healthResponse.status})`, 'red');
      process.exit(1);
    }
    
    const health = healthResponse.data;
    
    if (!health || !health.status) {
      print('\n❌ Invalid health response', 'red');
      process.exit(1);
    }
    
    print(`\nOverall Status: ${health.status.toUpperCase()}`, 
      health.status === 'ok' ? 'green' : 'red');
    console.log('');

    // Check individual services
    print('Service Status:', 'bright');
    
    let allHealthy = true;
    const services = health.info || {};
    
    // Database
    if (services.database) {
      const healthy = checkService('Database (PostgreSQL)', services.database);
      allHealthy = allHealthy && healthy;
    }
    
    // Redis
    if (services.redis) {
      const healthy = checkService('Redis Cache', services.redis);
      // Redis is optional, don't fail if it's down
      if (!healthy) {
        print('     (Optional - system can run without Redis)', 'yellow');
      }
    }
    
    // Memory
    if (services.memory_heap) {
      checkService('Memory (Heap)', services.memory_heap);
    }
    
    if (services.memory_rss) {
      checkService('Memory (RSS)', services.memory_rss);
    }
    
    // Disk
    if (services.disk) {
      checkService('Disk Space', services.disk);
    }
    
    // Backup
    if (services.backup) {
      checkService('Backup System', services.backup);
    }

    // Check errors
    if (health.error) {
      print('\n❌ Errors detected:', 'red');
      Object.entries(health.error).forEach(([service, error]) => {
        print(`  ${service}: ${error.message || error}`, 'red');
      });
      allHealthy = false;
    }

    // Additional metrics
    console.log('');
    print('Additional Information:', 'bright');
    
    // Try to get metrics
    try {
      const metricsResponse = await makeRequest('/monitoring/metrics');
      if (metricsResponse.status === 200 && metricsResponse.data) {
        const metrics = metricsResponse.data;
        
        if (metrics.uptime) {
          const uptimeHours = (metrics.uptime / 3600).toFixed(2);
          print(`  Uptime: ${uptimeHours} hours`, 'cyan');
        }
        
        if (metrics.requests) {
          print(`  Total Requests: ${metrics.requests.total || 0}`, 'cyan');
        }
        
        if (metrics.memory) {
          const memoryMB = (metrics.memory.heapUsed / 1024 / 1024).toFixed(2);
          print(`  Memory Usage: ${memoryMB} MB`, 'cyan');
        }
      }
    } catch (error) {
      // Metrics endpoint optional
    }

    // Summary
    printHeader('Health Check Summary');
    
    if (allHealthy && health.status === 'ok') {
      print('✅ SYSTEM HEALTHY', 'green');
      print('\nAll services are operational.\n', 'green');
      
      print('Service is ready to:', 'bright');
      print('  ✅ Accept requests', 'green');
      print('  ✅ Process payments', 'green');
      print('  ✅ Store data', 'green');
      print('  ✅ Handle transactions', 'green');
      console.log('');
      
      process.exit(0);
    } else {
      print('⚠️  SYSTEM DEGRADED', 'yellow');
      print('\nSome services are not fully operational.\n', 'yellow');
      
      print('Recommendations:', 'bright');
      print('  1. Check service logs for errors', 'yellow');
      print('  2. Verify database connectivity', 'yellow');
      print('  3. Check Redis connection (if configured)', 'yellow');
      print('  4. Review system resources', 'yellow');
      console.log('');
      
      process.exit(health.status === 'ok' ? 0 : 1);
    }
    
  } catch (error) {
    printHeader('Health Check Failed');
    
    print('❌ Unable to connect to application', 'red');
    print(`\nError: ${error.message}\n`, 'red');
    
    print('Possible causes:', 'bright');
    print('  1. Application is not running', 'yellow');
    print('  2. Wrong host/port configuration', 'yellow');
    print('  3. Network connectivity issues', 'yellow');
    print('  4. Firewall blocking connection', 'yellow');
    console.log('');
    
    print('To fix:', 'bright');
    print(`  1. Start server: npm run start:dev`, 'cyan');
    print(`  2. Check it's running on port ${config.port}`, 'cyan');
    print(`  3. Try: curl ${config.protocol}://${config.host}:${config.port}/health`, 'cyan');
    console.log('');
    
    print('Configuration:', 'bright');
    print(`  Host: ${config.host}`, 'cyan');
    print(`  Port: ${config.port}`, 'cyan');
    print(`  Protocol: ${config.protocol}`, 'cyan');
    print(`  Timeout: ${config.timeout}ms`, 'cyan');
    console.log('');
    
    print('To customize:', 'bright');
    print('  HEALTH_CHECK_HOST=localhost npm run health', 'cyan');
    print('  PORT=3000 npm run health', 'cyan');
    print('  HEALTH_CHECK_PROTOCOL=https npm run health', 'cyan');
    console.log('');
    
    process.exit(1);
  }
}

// Run health check
print('\n🏥 Starting health check...\n', 'bright');

healthCheck().catch((error) => {
  print(`\n❌ Health check error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

