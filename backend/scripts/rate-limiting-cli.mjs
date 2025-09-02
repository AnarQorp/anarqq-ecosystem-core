#!/usr/bin/env node

/**
 * Rate Limiting CLI Tool
 * 
 * Command-line interface for testing, monitoring, and managing
 * the comprehensive rate limiting system
 */

import { Command } from 'commander';
import RateLimitingService from '../services/RateLimitingService.mjs';
import QerberosIntegrationService from '../services/QerberosIntegrationService.mjs';
import { getEnvironmentConfig } from '../config/rateLimiting.mjs';

const program = new Command();

program
  .name('rate-limiting-cli')
  .description('CLI tool for rate limiting system management')
  .version('1.0.0');

// Initialize services
let rateLimitingService;
let qerberosService;

function initializeServices() {
  if (!rateLimitingService) {
    const config = getEnvironmentConfig();
    rateLimitingService = new RateLimitingService(config);
    qerberosService = new QerberosIntegrationService();
    
    // Connect services
    rateLimitingService.on('suspiciousActivity', (event) => {
      qerberosService.reportSuspiciousActivity(event);
    });
  }
}

// Test rate limiting for a specific identity
program
  .command('test-identity')
  .description('Test rate limiting for a specific identity')
  .option('-i, --identity <id>', 'Identity ID to test')
  .option('-s, --subid <id>', 'Subidentity ID')
  .option('-d, --dao <id>', 'DAO ID')
  .option('-e, --endpoint <endpoint>', 'Endpoint to test', 'GET /test')
  .option('-c, --count <number>', 'Number of requests to make', '10')
  .option('-r, --reputation <score>', 'Set reputation score', '0')
  .action(async (options) => {
    initializeServices();
    
    const { identity, subid, dao, endpoint, count, reputation } = options;
    
    if (!identity) {
      console.error('Error: Identity ID is required');
      process.exit(1);
    }
    
    // Set reputation if provided
    if (reputation !== '0') {
      await rateLimitingService.setReputation(identity, parseInt(reputation));
      console.log(`Set reputation for ${identity} to ${reputation}`);
    }
    
    const context = {
      squidId: identity,
      subId: subid,
      daoId: dao,
      endpoint,
      ip: '127.0.0.1',
      userAgent: 'rate-limiting-cli/1.0'
    };
    
    console.log(`Testing rate limiting for identity: ${identity}`);
    console.log(`Endpoint: ${endpoint}`);
    console.log(`Making ${count} requests...\n`);
    
    let allowed = 0;
    let denied = 0;
    
    for (let i = 1; i <= parseInt(count); i++) {
      const result = await rateLimitingService.checkRateLimit(context);
      
      if (result.allowed) {
        allowed++;
        console.log(`Request ${i}: ✅ ALLOWED (remaining: ${result.remaining || 'N/A'})`);
      } else {
        denied++;
        console.log(`Request ${i}: ❌ DENIED (reason: ${result.reason})`);
      }
    }
    
    console.log(`\nSummary: ${allowed} allowed, ${denied} denied`);
  });

// Test abuse detection
program
  .command('test-abuse')
  .description('Test abuse detection patterns')
  .option('-i, --identity <id>', 'Identity ID to test', 'test-abuse-identity')
  .option('-p, --pattern <type>', 'Abuse pattern to test', 'rapid-fire')
  .action(async (options) => {
    initializeServices();
    
    const { identity, pattern } = options;
    
    console.log(`Testing abuse detection pattern: ${pattern}`);
    console.log(`Identity: ${identity}\n`);
    
    switch (pattern) {
      case 'rapid-fire':
        await testRapidFire(identity);
        break;
      case 'suspicious-user-agent':
        await testSuspiciousUserAgent(identity);
        break;
      case 'pattern-similarity':
        await testPatternSimilarity(identity);
        break;
      default:
        console.error(`Unknown abuse pattern: ${pattern}`);
        console.log('Available patterns: rapid-fire, suspicious-user-agent, pattern-similarity');
        process.exit(1);
    }
  });

async function testRapidFire(identity) {
  console.log('Testing rapid fire detection...');
  
  const context = {
    squidId: identity,
    endpoint: 'GET /test',
    ip: '127.0.0.1',
    userAgent: 'test-client'
  };
  
  // Make rapid requests
  const promises = [];
  for (let i = 0; i < 150; i++) {
    promises.push(rateLimitingService.checkRateLimit(context));
  }
  
  await Promise.all(promises);
  
  // Test next request
  const result = await rateLimitingService.checkRateLimit(context);
  
  if (result.allowed) {
    console.log('❌ Rapid fire NOT detected');
  } else if (result.reason === 'ABUSE_DETECTED') {
    console.log('✅ Rapid fire detected successfully');
  } else {
    console.log(`⚠️  Request denied for different reason: ${result.reason}`);
  }
}

async function testSuspiciousUserAgent(identity) {
  console.log('Testing suspicious user agent detection...');
  
  const context = {
    squidId: identity,
    endpoint: 'GET /test',
    ip: '127.0.0.1',
    userAgent: 'malicious-bot/1.0'
  };
  
  const result = await rateLimitingService.checkRateLimit(context);
  
  if (result.allowed) {
    console.log('❌ Suspicious user agent NOT detected');
  } else if (result.reason === 'ABUSE_DETECTED') {
    console.log('✅ Suspicious user agent detected successfully');
  } else {
    console.log(`⚠️  Request denied for different reason: ${result.reason}`);
  }
}

async function testPatternSimilarity(identity) {
  console.log('Testing pattern similarity detection...');
  
  const context = {
    squidId: identity,
    endpoint: 'GET /test',
    method: 'GET',
    userAgent: 'identical-pattern-test',
    ip: '127.0.0.1'
  };
  
  // Make many identical requests
  for (let i = 0; i < 15; i++) {
    await rateLimitingService.checkRateLimit(context);
  }
  
  const result = await rateLimitingService.checkRateLimit(context);
  
  if (result.allowed) {
    console.log('❌ Pattern similarity NOT detected');
  } else if (result.reason === 'ABUSE_DETECTED') {
    console.log('✅ Pattern similarity detected successfully');
  } else {
    console.log(`⚠️  Request denied for different reason: ${result.reason}`);
  }
}

// Test circuit breaker
program
  .command('test-circuit-breaker')
  .description('Test circuit breaker functionality')
  .option('-e, --endpoint <endpoint>', 'Endpoint to test', 'GET /test-endpoint')
  .action(async (options) => {
    initializeServices();
    
    const { endpoint } = options;
    
    console.log(`Testing circuit breaker for endpoint: ${endpoint}\n`);
    
    // Record failures to open circuit
    console.log('Recording failures to open circuit breaker...');
    for (let i = 1; i <= 5; i++) {
      await rateLimitingService.recordCircuitBreakerFailure(endpoint);
      console.log(`Failure ${i} recorded`);
    }
    
    // Test request with open circuit
    const context = {
      squidId: 'test-circuit-identity',
      endpoint,
      ip: '127.0.0.1'
    };
    
    const result = await rateLimitingService.checkRateLimit(context);
    
    if (result.allowed) {
      console.log('❌ Circuit breaker did NOT open');
    } else if (result.reason === 'CIRCUIT_BREAKER_OPEN') {
      console.log('✅ Circuit breaker opened successfully');
    } else {
      console.log(`⚠️  Request denied for different reason: ${result.reason}`);
    }
  });

// Monitor statistics
program
  .command('monitor')
  .description('Monitor rate limiting statistics')
  .option('-i, --interval <seconds>', 'Monitoring interval in seconds', '5')
  .action(async (options) => {
    initializeServices();
    
    const interval = parseInt(options.interval) * 1000;
    
    console.log(`Monitoring rate limiting statistics (interval: ${options.interval}s)`);
    console.log('Press Ctrl+C to stop\n');
    
    const monitor = setInterval(async () => {
      const rateLimitStats = rateLimitingService.getStatistics();
      const qerberosStats = qerberosService.getStatistics();
      const qerberosHealth = await qerberosService.getHealthStatus();
      
      console.clear();
      console.log('=== Rate Limiting Statistics ===');
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log(`Rate Limit Entries: ${rateLimitStats.rateLimitEntries}`);
      console.log(`Circuit Breaker Entries: ${rateLimitStats.circuitBreakerEntries}`);
      console.log(`Behavior Pattern Entries: ${rateLimitStats.behaviorPatternEntries}`);
      console.log(`Cost Tracking Entries: ${rateLimitStats.costTrackingEntries}`);
      console.log(`Reputation Entries: ${rateLimitStats.reputationEntries}`);
      
      console.log('\n=== Qerberos Integration ===');
      console.log(`Enabled: ${qerberosStats.enabled}`);
      console.log(`Queue Size: ${qerberosStats.queueSize}`);
      console.log(`Health Status: ${qerberosHealth.status}`);
      
      if (qerberosHealth.error) {
        console.log(`Error: ${qerberosHealth.error}`);
      }
    }, interval);
    
    process.on('SIGINT', () => {
      clearInterval(monitor);
      console.log('\nMonitoring stopped');
      process.exit(0);
    });
  });

// Load test
program
  .command('load-test')
  .description('Perform load testing on rate limiting system')
  .option('-c, --concurrent <number>', 'Number of concurrent identities', '10')
  .option('-r, --requests <number>', 'Requests per identity', '50')
  .option('-d, --delay <ms>', 'Delay between requests in ms', '100')
  .action(async (options) => {
    initializeServices();
    
    const { concurrent, requests, delay } = options;
    
    console.log(`Load testing rate limiting system:`);
    console.log(`Concurrent identities: ${concurrent}`);
    console.log(`Requests per identity: ${requests}`);
    console.log(`Delay between requests: ${delay}ms\n`);
    
    const startTime = Date.now();
    let totalRequests = 0;
    let totalAllowed = 0;
    let totalDenied = 0;
    
    const promises = [];
    
    for (let i = 0; i < parseInt(concurrent); i++) {
      const promise = loadTestIdentity(i, parseInt(requests), parseInt(delay));
      promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    
    // Aggregate results
    results.forEach(result => {
      totalRequests += result.total;
      totalAllowed += result.allowed;
      totalDenied += result.denied;
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    const requestsPerSecond = totalRequests / duration;
    
    console.log('\n=== Load Test Results ===');
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Allowed: ${totalAllowed} (${((totalAllowed / totalRequests) * 100).toFixed(1)}%)`);
    console.log(`Denied: ${totalDenied} (${((totalDenied / totalRequests) * 100).toFixed(1)}%)`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log(`Requests/second: ${requestsPerSecond.toFixed(2)}`);
  });

async function loadTestIdentity(identityIndex, requestCount, delay) {
  const identity = `load-test-identity-${identityIndex}`;
  let allowed = 0;
  let denied = 0;
  
  for (let i = 0; i < requestCount; i++) {
    const context = {
      squidId: identity,
      endpoint: 'GET /load-test',
      ip: '127.0.0.1',
      userAgent: 'load-test-client'
    };
    
    const result = await rateLimitingService.checkRateLimit(context);
    
    if (result.allowed) {
      allowed++;
    } else {
      denied++;
    }
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return { total: requestCount, allowed, denied };
}

// Clear all data
program
  .command('clear')
  .description('Clear all rate limiting data')
  .option('--confirm', 'Confirm the operation')
  .action(async (options) => {
    if (!options.confirm) {
      console.log('This will clear all rate limiting data. Use --confirm to proceed.');
      return;
    }
    
    initializeServices();
    
    rateLimitingService.rateLimitStore.clear();
    rateLimitingService.reputationStore.clear();
    rateLimitingService.circuitBreakerStore.clear();
    rateLimitingService.behaviorPatternStore.clear();
    rateLimitingService.costTrackingStore.clear();
    
    qerberosService.clearQueue();
    
    console.log('✅ All rate limiting data cleared');
  });

// Set reputation
program
  .command('set-reputation')
  .description('Set reputation score for an identity')
  .option('-i, --identity <id>', 'Identity ID', required=true)
  .option('-s, --score <number>', 'Reputation score', required=true)
  .action(async (options) => {
    initializeServices();
    
    const { identity, score } = options;
    
    if (!identity) {
      console.error('Error: Identity ID is required');
      process.exit(1);
    }
    
    if (isNaN(score)) {
      console.error('Error: Score must be a number');
      process.exit(1);
    }
    
    await rateLimitingService.setReputation(identity, parseInt(score));
    console.log(`✅ Set reputation for ${identity} to ${score}`);
  });

// Get reputation
program
  .command('get-reputation')
  .description('Get reputation score for an identity')
  .option('-i, --identity <id>', 'Identity ID', required=true)
  .action(async (options) => {
    initializeServices();
    
    const { identity } = options;
    
    if (!identity) {
      console.error('Error: Identity ID is required');
      process.exit(1);
    }
    
    const reputation = await rateLimitingService.getReputation(identity);
    const level = rateLimitingService.getReputationLevel(reputation);
    
    console.log(`Identity: ${identity}`);
    console.log(`Reputation Score: ${reputation}`);
    console.log(`Reputation Level: ${level}`);
  });

program.parse();

export default program;