#!/usr/bin/env node

/**
 * Simple Rate Limiting Test Script
 * 
 * Tests the rate limiting system functionality
 */

import RateLimitingService from '../services/RateLimitingService.mjs';
import QerberosIntegrationService from '../services/QerberosIntegrationService.mjs';

async function testRateLimiting() {
  console.log('🧪 Testing Rate Limiting System\n');

  // Initialize services
  const rateLimitingService = new RateLimitingService({
    baseLimits: {
      identity: { requests: 5, window: 60000 }, // 5 per minute for testing
      subidentity: { requests: 3, window: 60000 },
      dao: { requests: 10, window: 60000 },
      anonymous: { requests: 2, window: 60000 }
    }
  });

  const qerberosService = new QerberosIntegrationService({
    enabled: false // Disable for testing
  });

  // Connect services
  rateLimitingService.on('suspiciousActivity', (event) => {
    console.log('🚨 Suspicious activity detected:', event.type);
  });

  // Test 1: Basic rate limiting
  console.log('Test 1: Basic Identity Rate Limiting');
  const context = {
    squidId: 'test-user-1',
    endpoint: 'GET /api/test',
    ip: '127.0.0.1',
    userAgent: 'test-client/1.0'
  };

  for (let i = 1; i <= 7; i++) {
    const result = await rateLimitingService.checkRateLimit(context);
    console.log(`Request ${i}: ${result.allowed ? '✅ ALLOWED' : '❌ DENIED'} (remaining: ${result.remaining || 'N/A'})`);
  }

  console.log('\nTest 2: Reputation-based Rate Limiting');
  // Set high reputation
  await rateLimitingService.setReputation('test-user-2', 100);
  
  const highRepContext = {
    squidId: 'test-user-2',
    endpoint: 'GET /api/test',
    ip: '127.0.0.1',
    userAgent: 'test-client/1.0'
  };

  for (let i = 1; i <= 12; i++) {
    const result = await rateLimitingService.checkRateLimit(highRepContext);
    console.log(`Request ${i}: ${result.allowed ? '✅ ALLOWED' : '❌ DENIED'} (remaining: ${result.remaining || 'N/A'})`);
  }

  console.log('\nTest 3: Abuse Detection');
  const abuseContext = {
    squidId: 'test-abuser',
    endpoint: 'GET /api/test',
    ip: '127.0.0.1',
    userAgent: 'malicious-bot/1.0'
  };

  const result = await rateLimitingService.checkRateLimit(abuseContext);
  console.log(`Abuse test: ${result.allowed ? '✅ ALLOWED' : '❌ DENIED'} (reason: ${result.reason})`);

  console.log('\nTest 4: Circuit Breaker');
  const endpoint = 'GET /failing-service';
  
  // Trigger failures
  for (let i = 0; i < 5; i++) {
    await rateLimitingService.recordCircuitBreakerFailure(endpoint);
  }

  const circuitContext = {
    squidId: 'test-user-3',
    endpoint,
    ip: '127.0.0.1'
  };

  const circuitResult = await rateLimitingService.checkRateLimit(circuitContext);
  console.log(`Circuit breaker test: ${circuitResult.allowed ? '✅ ALLOWED' : '❌ DENIED'} (reason: ${circuitResult.reason})`);

  console.log('\nTest 5: Cost Control');
  const costService = new RateLimitingService({
    costControl: {
      maxInvocationsPerMinute: 3,
      maxInvocationsPerHour: 100
    }
  });

  const costContext = {
    squidId: 'test-cost-user',
    endpoint: 'GET /api/expensive',
    ip: '127.0.0.1'
  };

  for (let i = 1; i <= 5; i++) {
    const result = await costService.checkRateLimit(costContext);
    console.log(`Cost control ${i}: ${result.allowed ? '✅ ALLOWED' : '❌ DENIED'} (reason: ${result.reason})`);
  }

  console.log('\n✅ Rate Limiting Tests Complete!');
  
  // Show statistics
  const stats = rateLimitingService.getStatistics();
  console.log('\n📊 Statistics:');
  console.log(`- Rate limit entries: ${stats.rateLimitEntries}`);
  console.log(`- Circuit breaker entries: ${stats.circuitBreakerEntries}`);
  console.log(`- Behavior pattern entries: ${stats.behaviorPatternEntries}`);
  console.log(`- Cost tracking entries: ${stats.costTrackingEntries}`);
}

// Run tests
testRateLimiting().catch(console.error);