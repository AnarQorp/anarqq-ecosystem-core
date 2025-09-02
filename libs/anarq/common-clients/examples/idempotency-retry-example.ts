/**
 * Example demonstrating idempotency and retry infrastructure usage
 */

import { 
  ClientFactory,
  IdempotentHttpClient,
  RetryPolicyManager,
  IdempotencyManager,
  RetryMonitor
} from '../src/index.js';

// Example 1: Basic HTTP client with idempotency and retry
async function basicExample() {
  console.log('=== Basic HTTP Client Example ===');
  
  const client = ClientFactory.createHttpClient({
    baseUrl: 'https://api.example.com',
    module: 'qwallet',
    criticality: 'HIGH',
    timeout: 10000
  });

  try {
    // Make an idempotent POST request
    const response = await client.post('/payments', {
      amount: 100,
      currency: 'USD',
      recipient: 'user123'
    }, {
      'Idempotency-Key': 'payment-12345'
    });

    console.log('Payment response:', response);

    // Making the same request again will return cached response
    const cachedResponse = await client.post('/payments', {
      amount: 100,
      currency: 'USD',
      recipient: 'user123'
    }, {
      'Idempotency-Key': 'payment-12345'
    });

    console.log('Cached response:', cachedResponse);
    console.log('Responses are identical:', JSON.stringify(response) === JSON.stringify(cachedResponse));

  } catch (error) {
    console.error('Request failed:', error);
  } finally {
    client.shutdown();
  }
}

// Example 2: Module-specific clients with different retry policies
async function moduleSpecificExample() {
  console.log('\n=== Module-Specific Clients Example ===');
  
  // Create clients for different modules
  const qwalletClient = ClientFactory.createModuleClient('qwallet', 'https://qwallet.api.com');
  const qindexClient = ClientFactory.createModuleClient('qindex', 'https://qindex.api.com');
  const qdriveClient = ClientFactory.createModuleClient('qdrive', 'https://qdrive.api.com');

  console.log('Qwallet retry policy:', qwalletClient.getRetryConfig());
  console.log('Qindex retry policy:', qindexClient.getRetryConfig());
  console.log('Qdrive retry policy:', qdriveClient.getRetryConfig());

  // Cleanup
  qwalletClient.shutdown();
  qindexClient.shutdown();
  qdriveClient.shutdown();
}

// Example 3: Custom retry policies and monitoring
async function customRetryExample() {
  console.log('\n=== Custom Retry Policy Example ===');
  
  // Create custom retry policy
  const customPolicy = RetryPolicyManager.createCustom({
    maxAttempts: 5,
    baseDelay: 200,
    maxDelay: 10000,
    backoffMultiplier: 1.8,
    jitter: true,
    retryableErrors: ['SERVICE_UNAVAILABLE', 'TIMEOUT_ERROR'],
    retryableStatusCodes: [503, 504, 429]
  });

  console.log('Custom retry policy:', customPolicy);

  // Get recommendations for different contexts
  const recommendations = RetryPolicyManager.getRecommendations({
    module: 'qmail',
    criticality: 'MEDIUM',
    realTime: false,
    userFacing: true
  });

  console.log('Recommended policy:', recommendations.recommended);
  console.log('Alternative policies:', recommendations.alternatives);
}

// Example 4: Monitoring and statistics
async function monitoringExample() {
  console.log('\n=== Monitoring Example ===');
  
  const monitor = new RetryMonitor();
  const idempotencyManager = new IdempotencyManager();

  // Simulate some operations
  monitor.startRetryOperation('op1', 'payment', RetryPolicyManager.CONSERVATIVE, 'qwallet');
  monitor.recordRetryAttempt('op1', 1, new Error('Service unavailable'), 1000, false);
  monitor.recordRetryAttempt('op1', 2, undefined, 0, true);
  monitor.completeRetryOperation('op1', true);

  monitor.recordIdempotencyOperation('idem1', 'key123', 'upload', false, false, 'qdrive', 250);
  monitor.updateIdempotencyStatus('idem1', 'COMPLETED', 250);

  monitor.recordIdempotencyOperation('idem2', 'key124', 'upload', true, true, 'qdrive', 50);
  monitor.updateIdempotencyStatus('idem2', 'COMPLETED', 50);

  // Get statistics
  const retryStats = monitor.getRetryStats();
  const idempotencyStats = monitor.getIdempotencyStats();

  console.log('Retry statistics:', retryStats);
  console.log('Idempotency statistics:', idempotencyStats);

  // Cleanup
  monitor.shutdown();
  idempotencyManager.shutdown();
}

// Example 5: Error handling and circuit breaker
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');
  
  const client = ClientFactory.createHttpClient({
    baseUrl: 'https://unreliable-api.example.com',
    retryPolicy: RetryPolicyManager.AGGRESSIVE,
    circuitBreaker: {
      failureThreshold: 3,
      recoveryTimeout: 5000,
      monitoringWindow: 10000,
      halfOpenMaxCalls: 2,
      fallbackStrategy: 'REJECT'
    }
  });

  try {
    // This will trigger retries and potentially circuit breaker
    const response = await client.post('/unreliable-endpoint', {
      data: 'test'
    });
    
    console.log('Unexpected success:', response);
  } catch (error) {
    console.log('Expected failure:', error.message);
    console.log('Circuit breaker state:', client.getCircuitBreakerState());
  } finally {
    client.shutdown();
  }
}

// Example 6: Global statistics and factory management
async function globalStatsExample() {
  console.log('\n=== Global Statistics Example ===');
  
  // Create multiple clients
  const client1 = ClientFactory.createHttpClient({
    baseUrl: 'https://api1.example.com',
    module: 'qmail'
  });

  const client2 = ClientFactory.createHttpClient({
    baseUrl: 'https://api2.example.com',
    module: 'qindex'
  });

  // Simulate some operations (in real usage, these would be actual HTTP calls)
  console.log('Simulating operations...');

  // Get global statistics
  const globalRetryStats = ClientFactory.getGlobalRetryStats();
  const globalIdempotencyStats = ClientFactory.getGlobalIdempotencyStats();

  console.log('Global retry stats:', globalRetryStats);
  console.log('Global idempotency stats:', globalIdempotencyStats);

  // Cleanup individual clients
  client1.shutdown();
  client2.shutdown();

  // Cleanup global resources
  ClientFactory.shutdown();
}

// Example 7: Advanced idempotency scenarios
async function advancedIdempotencyExample() {
  console.log('\n=== Advanced Idempotency Example ===');
  
  const idempotencyManager = new IdempotencyManager({
    defaultTtl: 60000, // 1 minute
    maxRecords: 1000,
    includeBodyInFingerprint: true,
    fingerprintHeaders: ['x-squid-id', 'x-subid', 'content-type']
  });

  // Example of request fingerprinting
  const fingerprint1 = idempotencyManager.createRequestFingerprint(
    'POST',
    '/api/upload',
    { 'x-squid-id': 'user123', 'content-type': 'application/json' },
    { file: 'document.pdf', metadata: { size: 1024 } }
  );

  const fingerprint2 = idempotencyManager.createRequestFingerprint(
    'POST',
    '/api/upload',
    { 'x-squid-id': 'user123', 'content-type': 'application/json' },
    { file: 'document.pdf', metadata: { size: 1024 } }
  );

  console.log('Fingerprints match:', fingerprint1 === fingerprint2);

  // Example of idempotency key conflict detection
  const idempotencyKey = 'upload-doc-123';
  
  try {
    // Store first request
    await idempotencyManager.storeProcessingRecord(idempotencyKey, fingerprint1);
    
    // Try to store different request with same key (should fail)
    const differentFingerprint = idempotencyManager.createRequestFingerprint(
      'POST',
      '/api/upload',
      { 'x-squid-id': 'user123', 'content-type': 'application/json' },
      { file: 'different.pdf', metadata: { size: 2048 } }
    );
    
    await idempotencyManager.checkDuplicate(idempotencyKey, differentFingerprint);
  } catch (error) {
    console.log('Expected idempotency conflict:', error.message);
  }

  // Get manager statistics
  const stats = idempotencyManager.getStats();
  console.log('Idempotency manager stats:', stats);

  idempotencyManager.shutdown();
}

// Run all examples
async function runAllExamples() {
  try {
    await basicExample();
    await moduleSpecificExample();
    await customRetryExample();
    await monitoringExample();
    await errorHandlingExample();
    await globalStatsExample();
    await advancedIdempotencyExample();
    
    console.log('\n=== All examples completed successfully! ===');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Export for use in other files
export {
  basicExample,
  moduleSpecificExample,
  customRetryExample,
  monitoringExample,
  errorHandlingExample,
  globalStatsExample,
  advancedIdempotencyExample,
  runAllExamples
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}