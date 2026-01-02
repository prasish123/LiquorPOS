#!/usr/bin/env ts-node
/**
 * Webhook Verification Script
 * 
 * Verifies webhook configuration and tests webhook endpoint functionality.
 * 
 * Usage:
 *   npm run verify:webhooks
 *   ts-node scripts/verify-webhooks.ts
 */

import * as dotenv from 'dotenv';
import Stripe from 'stripe';
import axios from 'axios';
import * as crypto from 'crypto';

// Load environment variables
dotenv.config();

interface VerificationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

function addResult(check: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
  results.push({ check, status, message, details });
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('WEBHOOK VERIFICATION REPORT');
  console.log('='.repeat(80) + '\n');

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${index + 1}. ${icon} ${result.check}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log();

    if (result.status === 'PASS') passCount++;
    else if (result.status === 'FAIL') failCount++;
    else warnCount++;
  });

  console.log('='.repeat(80));
  console.log(`SUMMARY: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`);
  console.log('='.repeat(80) + '\n');

  if (failCount > 0) {
    console.log('❌ VERIFICATION FAILED - Please fix the issues above');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('⚠️ VERIFICATION PASSED WITH WARNINGS');
    process.exit(0);
  } else {
    console.log('✅ ALL CHECKS PASSED');
    process.exit(0);
  }
}

async function verifyEnvironmentVariables() {
  console.log('Checking environment variables...');

  // Check STRIPE_SECRET_KEY
  if (process.env.STRIPE_SECRET_KEY) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key.startsWith('sk_test_')) {
      addResult(
        'STRIPE_SECRET_KEY',
        'WARN',
        'Using test mode key (recommended for development)',
        { mode: 'test' }
      );
    } else if (key.startsWith('sk_live_')) {
      addResult(
        'STRIPE_SECRET_KEY',
        'PASS',
        'Using live mode key (production)',
        { mode: 'live' }
      );
    } else {
      addResult(
        'STRIPE_SECRET_KEY',
        'FAIL',
        'Invalid Stripe secret key format',
        { format: 'Should start with sk_test_ or sk_live_' }
      );
    }
  } else {
    addResult(
      'STRIPE_SECRET_KEY',
      'FAIL',
      'STRIPE_SECRET_KEY not configured',
      { required: true }
    );
  }

  // Check STRIPE_WEBHOOK_SECRET
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (secret.startsWith('whsec_')) {
      addResult(
        'STRIPE_WEBHOOK_SECRET',
        'PASS',
        'Webhook secret configured correctly',
        { signatureVerification: 'ENABLED' }
      );
    } else {
      addResult(
        'STRIPE_WEBHOOK_SECRET',
        'FAIL',
        'Invalid webhook secret format',
        { format: 'Should start with whsec_' }
      );
    }
  } else {
    addResult(
      'STRIPE_WEBHOOK_SECRET',
      'WARN',
      'STRIPE_WEBHOOK_SECRET not configured - signature verification DISABLED (INSECURE for production)',
      { signatureVerification: 'DISABLED', security: 'INSECURE' }
    );
  }
}

async function verifyStripeConnection() {
  console.log('Testing Stripe API connection...');

  if (!process.env.STRIPE_SECRET_KEY) {
    addResult(
      'Stripe Connection',
      'FAIL',
      'Cannot test - STRIPE_SECRET_KEY not configured'
    );
    return;
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    });

    // Test API connection by retrieving account
    const account = await stripe.accounts.retrieve();
    
    addResult(
      'Stripe Connection',
      'PASS',
      'Successfully connected to Stripe API',
      {
        accountId: account.id,
        country: account.country,
        currency: account.default_currency,
      }
    );
  } catch (error) {
    addResult(
      'Stripe Connection',
      'FAIL',
      `Failed to connect to Stripe: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

async function verifyWebhookEndpoint() {
  console.log('Testing webhook endpoint...');

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const webhookUrl = `${baseUrl}/webhooks/stripe`;

  try {
    // Test health endpoint first
    const healthResponse = await axios.post(`${baseUrl}/webhooks/health`);
    
    if (healthResponse.status === 200) {
      addResult(
        'Webhook Health Endpoint',
        'PASS',
        'Webhook system is operational',
        { url: `${baseUrl}/webhooks/health`, response: healthResponse.data }
      );
    } else {
      addResult(
        'Webhook Health Endpoint',
        'WARN',
        `Unexpected status code: ${healthResponse.status}`,
        { url: `${baseUrl}/webhooks/health` }
      );
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
      addResult(
        'Webhook Health Endpoint',
        'FAIL',
        'Cannot connect to application - is it running?',
        { url: baseUrl, error: 'Connection refused' }
      );
    } else {
      addResult(
        'Webhook Health Endpoint',
        'FAIL',
        `Failed to reach webhook endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { url: baseUrl }
      );
    }
  }

  // Test webhook endpoint (expect 400 without valid signature)
  try {
    const testPayload = {
      id: 'evt_test_verification',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_verification',
          amount: 10000,
          status: 'succeeded',
        },
      },
    };

    const response = await axios.post(webhookUrl, testPayload, {
      headers: {
        'stripe-signature': 'invalid_signature',
      },
      validateStatus: () => true, // Don't throw on any status
    });

    if (response.status === 400) {
      addResult(
        'Webhook Signature Verification',
        'PASS',
        'Webhook endpoint correctly rejects invalid signatures',
        { url: webhookUrl, status: 400 }
      );
    } else if (response.status === 200) {
      addResult(
        'Webhook Signature Verification',
        'WARN',
        'Webhook endpoint accepts requests without valid signature (signature verification may be disabled)',
        { url: webhookUrl, status: 200, security: 'INSECURE' }
      );
    } else {
      addResult(
        'Webhook Signature Verification',
        'WARN',
        `Unexpected response: ${response.status}`,
        { url: webhookUrl, status: response.status }
      );
    }
  } catch (error) {
    addResult(
      'Webhook Signature Verification',
      'FAIL',
      `Failed to test webhook endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { url: webhookUrl }
    );
  }
}

async function verifyStripeWebhookConfiguration() {
  console.log('Checking Stripe webhook configuration...');

  if (!process.env.STRIPE_SECRET_KEY) {
    addResult(
      'Stripe Webhook Configuration',
      'FAIL',
      'Cannot check - STRIPE_SECRET_KEY not configured'
    );
    return;
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    });

    // List webhook endpoints
    const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });

    if (webhookEndpoints.data.length === 0) {
      addResult(
        'Stripe Webhook Configuration',
        'WARN',
        'No webhook endpoints configured in Stripe dashboard',
        { 
          action: 'Configure webhook endpoint at https://dashboard.stripe.com/webhooks',
          endpoints: 0
        }
      );
    } else {
      const activeEndpoints = webhookEndpoints.data.filter(ep => ep.status === 'enabled');
      
      addResult(
        'Stripe Webhook Configuration',
        activeEndpoints.length > 0 ? 'PASS' : 'WARN',
        `Found ${webhookEndpoints.data.length} webhook endpoint(s), ${activeEndpoints.length} enabled`,
        {
          total: webhookEndpoints.data.length,
          enabled: activeEndpoints.length,
          endpoints: webhookEndpoints.data.map(ep => ({
            url: ep.url,
            status: ep.status,
            events: ep.enabled_events.length,
          })),
        }
      );

      // Check for critical events
      const criticalEvents = [
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'charge.refunded',
        'charge.dispute.created',
      ];

      activeEndpoints.forEach((endpoint, index) => {
        const missingEvents = criticalEvents.filter(
          event => !endpoint.enabled_events.includes(event)
        );

        if (missingEvents.length === 0) {
          addResult(
            `Webhook Events (Endpoint ${index + 1})`,
            'PASS',
            'All critical events configured',
            { url: endpoint.url, events: endpoint.enabled_events.length }
          );
        } else {
          addResult(
            `Webhook Events (Endpoint ${index + 1})`,
            'WARN',
            `Missing ${missingEvents.length} critical event(s)`,
            { 
              url: endpoint.url,
              missing: missingEvents,
              configured: endpoint.enabled_events.length
            }
          );
        }
      });
    }
  } catch (error) {
    addResult(
      'Stripe Webhook Configuration',
      'FAIL',
      `Failed to check webhook configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

async function main() {
  console.log('\n🔍 Starting Webhook Verification...\n');

  try {
    await verifyEnvironmentVariables();
    await verifyStripeConnection();
    await verifyWebhookEndpoint();
    await verifyStripeWebhookConfiguration();
  } catch (error) {
    console.error('Verification failed with error:', error);
    addResult(
      'Verification Process',
      'FAIL',
      `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  printResults();
}

// Run verification
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

