/**
 * Complete example demonstrating @anarq/common-clients and @anarq/testing integration
 * 
 * This example shows how to:
 * 1. Set up HTTP clients with retry policies and circuit breakers
 * 2. Use mock services for testing
 * 3. Implement contract testing
 * 4. Generate test data
 * 5. Use test utilities
 */

import { 
  HttpClient, 
  RetryHandler, 
  CircuitBreaker, 
  ErrorCodes 
} from '@anarq/common-clients';

import { 
  MockSquidService, 
  MockQlockService, 
  MockQonsentService,
  ContractTester,
  Contract,
  TestDataGenerator,
  TestUtils
} from '@anarq/testing';

async function demonstrateHttpClientWithRetryAndCircuitBreaker() {
  console.log('=== HTTP Client with Retry and Circuit Breaker ===');
  
  // Create HTTP client with comprehensive configuration
  const client = new HttpClient({
    baseUrl: 'https://api.qecosystem.com',
    timeout: 30000,
    identity: {
      squidId: 'demo_user_123',
      subId: 'demo_sub_456'
    },
    defaultHeaders: {
      'x-api-version': 'v1',
      'Authorization': 'Bearer demo-token'
    },
    retryPolicy: {
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 5000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: [
        ErrorCodes.SERVICE_UNAVAILABLE,
        ErrorCodes.TIMEOUT_ERROR,
        ErrorCodes.IPFS_UNAVAILABLE
      ],
      retryableStatusCodes: [408, 429, 500, 502, 503, 504]
    },
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitoringWindow: 60000,
      halfOpenMaxCalls: 3,
      fallbackStrategy: 'REJECT'
    }
  });

  console.log('Client configured with:');
  console.log('- Base URL:', client.getConfig().baseUrl);
  console.log('- Identity:', client.getConfig().identity);
  console.log('- Circuit Breaker State:', client.getCircuitBreakerState());
  
  // Note: In a real scenario, you would make actual HTTP requests here
  // For demo purposes, we'll show the configuration
}

async function demonstrateMockServices() {
  console.log('\n=== Mock Services Demo ===');
  
  // Set up mock services
  const squidMock = new MockSquidService();
  const qlockMock = new MockQlockService();
  const qonsentMock = new MockQonsentService();
  
  // Generate test identity
  const testIdentity = TestDataGenerator.generateIdentityInfo({
    squidId: 'demo_user_789',
    displayName: 'Demo User',
    reputation: 150
  });
  
  // Add to mock service
  squidMock.addIdentity(testIdentity);
  
  // Test identity verification
  const verifyResult = await squidMock.verifyIdentity('demo_user_789');
  TestUtils.assertSuccess(verifyResult);
  console.log('Identity verified:', verifyResult.data?.displayName);
  
  // Test encryption/decryption
  const encryptResult = await qlockMock.encrypt('sensitive data');
  TestUtils.assertSuccess(encryptResult);
  
  const decryptResult = await qlockMock.decrypt(
    encryptResult.data!.encrypted,
    encryptResult.data!.key
  );
  TestUtils.assertSuccess(decryptResult);
  console.log('Encryption/Decryption successful:', decryptResult.data?.decrypted);
  
  // Test permission checking
  const permissionResult = await qonsentMock.check('test_user_1', 'qdrive', 'read');
  TestUtils.assertSuccess(permissionResult);
  console.log('Permission check:', permissionResult.data?.allowed ? 'ALLOWED' : 'DENIED');
}

async function demonstrateContractTesting() {
  console.log('\n=== Contract Testing Demo ===');
  
  const tester = new ContractTester();
  
  // Define a contract for user API
  const userContract: Contract = {
    name: 'GET /users/:id',
    description: 'Retrieve user information by ID',
    request: {
      method: 'GET',
      path: '/users/{id}',
      headers: {
        'x-api-version': 'v1',
        'x-squid-id': '*'
      }
    },
    response: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      schema: {
        type: 'object',
        required: ['status', 'code', 'message', 'data'],
        properties: {
          status: { enum: ['ok'] },
          code: { type: 'string' },
          message: { type: 'string' },
          data: {
            type: 'object',
            required: ['squidId', 'displayName'],
            properties: {
              squidId: { type: 'string' },
              displayName: { type: 'string' },
              reputation: { type: 'number' }
            }
          }
        }
      }
    }
  };
  
  tester.registerContract(userContract);
  
  // Test the contract with mock data
  const testResult = await tester.testContract(
    'GET /users/:id',
    {
      method: 'GET',
      path: '/users/demo_user_789',
      headers: {
        'x-api-version': 'v1',
        'x-squid-id': 'demo_user_789'
      }
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: TestUtils.createSuccessResponse({
        squidId: 'demo_user_789',
        displayName: 'Demo User',
        reputation: 150
      })
    }
  );
  
  console.log('Contract test result:');
  console.log('- Passed:', testResult.passed);
  console.log('- Errors:', testResult.errors);
  console.log('- Details:', testResult.details);
}

async function demonstrateTestDataGeneration() {
  console.log('\n=== Test Data Generation Demo ===');
  
  // Generate various test data types
  const identity = TestDataGenerator.generateIdentityInfo();
  const consent = TestDataGenerator.generateConsentRef();
  const signature = TestDataGenerator.generateLockSig();
  const record = TestDataGenerator.generateIndexRecord();
  const event = TestDataGenerator.generateAuditEvent();
  const maskProfile = TestDataGenerator.generateMaskProfile();
  
  console.log('Generated test data:');
  console.log('- Identity:', identity.squidId, identity.displayName);
  console.log('- Consent:', consent.policyCid, consent.scope);
  console.log('- Signature:', signature.alg, signature.sig.substring(0, 20) + '...');
  console.log('- Record:', record.type, record.key);
  console.log('- Event:', event.type, event.verdict);
  console.log('- Mask Profile:', maskProfile.name, maskProfile.rules.length, 'rules');
  
  // Generate batch data
  const identityBatch = TestDataGenerator.generateIdentityBatch(5);
  console.log('Generated batch of', identityBatch.length, 'identities');
  
  // Generate complete scenario
  const scenario = TestDataGenerator.generateScenario('demo_workflow');
  console.log('Generated scenario with:');
  console.log('- Identities:', scenario.identities.length);
  console.log('- Consents:', scenario.consents.length);
  console.log('- Records:', scenario.records.length);
  console.log('- Events:', scenario.events.length);
}

async function demonstrateTestUtilities() {
  console.log('\n=== Test Utilities Demo ===');
  
  // Demonstrate timing utilities
  const { result, duration } = await TestUtils.measureTime(async () => {
    await TestUtils.wait(100);
    return 'Timed operation completed';
  });
  
  console.log('Timing test:', result, 'took', duration, 'ms');
  
  // Demonstrate retry utility
  let attemptCount = 0;
  const retryResult = await TestUtils.retry(async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error('Simulated failure');
    }
    return 'Success after retries';
  }, 3, 10);
  
  console.log('Retry test:', retryResult, 'after', attemptCount, 'attempts');
  
  // Demonstrate spy functionality
  const spy = TestUtils.createSpy((x: number, y: number) => x + y);
  
  console.log('Spy results:', spy(5, 3), spy(10, 20));
  console.log('Spy call count:', spy.callCount);
  console.log('Spy calls:', spy.calls);
  
  // Demonstrate response validation
  const validResponse = TestUtils.createSuccessResponse({ test: 'data' });
  const validation = TestUtils.validateQResponse(validResponse);
  console.log('Response validation:', validation.valid ? 'VALID' : 'INVALID');
  
  // Demonstrate test environment
  const env = TestUtils.createTestEnvironment();
  env.addCleanup(() => console.log('Cleanup function 1 executed'));
  env.addCleanup(() => console.log('Cleanup function 2 executed'));
  
  console.log('Running cleanup functions:');
  env.cleanup();
}

async function demonstrateIntegratedWorkflow() {
  console.log('\n=== Integrated Workflow Demo ===');
  
  // Create a complete testing scenario
  const scenario = TestDataGenerator.generateScenario('integrated_test');
  const identity = scenario.identities[0];
  
  // Set up mock services
  const squidMock = new MockSquidService();
  const qlockMock = new MockQlockService();
  const qonsentMock = new MockQonsentService();
  
  squidMock.addIdentity(identity);
  
  // Set up HTTP client with circuit breaker
  const circuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    recoveryTimeout: 5000,
    monitoringWindow: 10000,
    halfOpenMaxCalls: 2,
    fallbackStrategy: 'REJECT'
  });
  
  // Simulate a complete workflow
  console.log('1. Verifying identity...');
  const verifyResult = await squidMock.verifyIdentity(identity.squidId);
  TestUtils.assertSuccess(verifyResult);
  
  console.log('2. Checking permissions...');
  await qonsentMock.grant(identity.squidId, 'qdrive', 'write', 'personal');
  const permissionResult = await qonsentMock.check(identity.squidId, 'qdrive', 'write', 'personal');
  TestUtils.assertSuccess(permissionResult);
  
  console.log('3. Encrypting data...');
  const encryptResult = await qlockMock.encrypt('workflow test data');
  TestUtils.assertSuccess(encryptResult);
  
  console.log('4. Testing circuit breaker protection...');
  const protectedResult = await circuitBreaker.execute(async () => {
    return TestUtils.createSuccessResponse({
      workflow: 'completed',
      identity: identity.squidId,
      encrypted: encryptResult.data?.encrypted
    });
  });
  
  TestUtils.assertSuccess(protectedResult);
  console.log('Workflow completed successfully!');
  console.log('Result:', protectedResult.data);
}

// Main execution
async function main() {
  try {
    await demonstrateHttpClientWithRetryAndCircuitBreaker();
    await demonstrateMockServices();
    await demonstrateContractTesting();
    await demonstrateTestDataGeneration();
    await demonstrateTestUtilities();
    await demonstrateIntegratedWorkflow();
    
    console.log('\n=== Demo Complete ===');
    console.log('All demonstrations completed successfully!');
    
  } catch (error) {
    console.error('Demo failed:', error);
    process.exit(1);
  }
}

// Export for use as a module
export {
  demonstrateHttpClientWithRetryAndCircuitBreaker,
  demonstrateMockServices,
  demonstrateContractTesting,
  demonstrateTestDataGeneration,
  demonstrateTestUtilities,
  demonstrateIntegratedWorkflow
};

// Run if called directly
if (require.main === module) {
  main();
}