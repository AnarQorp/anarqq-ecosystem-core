# @anarq/testing

Testing utilities, mock services, and contract testing framework for the Q ecosystem.

## Features

- **Mock Services**: Pre-built mocks for all Q ecosystem modules
- **Contract Testing**: JSON Schema-based contract validation
- **Test Data Generation**: Realistic test data generators
- **Test Utilities**: Common testing patterns and helpers
- **Q Response Validation**: Validate Q ecosystem response formats

## Installation

```bash
npm install @anarq/testing
```

## Usage

### Mock Services

```typescript
import { MockSquidService, MockQlockService, MockQonsentService } from '@anarq/testing';

// Mock sQuid identity service
const squidMock = new MockSquidService();
const identity = await squidMock.verifyIdentity('test_user_1');

// Mock Qlock encryption service
const qlockMock = new MockQlockService();
const encrypted = await qlockMock.encrypt('sensitive data');
const decrypted = await qlockMock.decrypt(encrypted.data.encrypted, encrypted.data.key);

// Mock Qonsent permission service
const qonsentMock = new MockQonsentService();
const permission = await qonsentMock.check('test_user_1', 'qdrive', 'read');
```

### Contract Testing

```typescript
import { ContractTester, Contract } from '@anarq/testing';

const tester = new ContractTester();

// Define a contract
const contract: Contract = {
  name: 'GET /users/:id',
  description: 'Get user by ID',
  request: {
    method: 'GET',
    path: '/users/123',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      }
    }
  },
  response: {
    status: 200,
    schema: {
      type: 'object',
      required: ['status', 'code', 'message', 'data'],
      properties: {
        status: { enum: ['ok'] },
        code: { type: 'string' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        }
      }
    }
  }
};

tester.registerContract(contract);

// Test the contract
const result = await tester.testContract('GET /users/:id', 
  { method: 'GET', path: '/users/123' },
  { 
    status: 200, 
    body: { 
      status: 'ok', 
      code: 'SUCCESS', 
      message: 'User found', 
      data: { id: '123', name: 'John Doe' } 
    } 
  }
);

console.log(result.passed); // true/false
console.log(result.errors); // validation errors if any
```

### Test Data Generation

```typescript
import { TestDataGenerator } from '@anarq/testing';

// Generate test identities
const identity = TestDataGenerator.generateIdentityInfo({
  displayName: 'Custom Test User',
  reputation: 500
});

// Generate test data batches
const identities = TestDataGenerator.generateIdentityBatch(10);
const records = TestDataGenerator.generateIndexRecordBatch(5);

// Generate complete test scenarios
const scenario = TestDataGenerator.generateScenario('user_workflow');
console.log(scenario.identities); // Array of test identities
console.log(scenario.consents);   // Array of test consents
console.log(scenario.records);    // Array of test records
console.log(scenario.events);     // Array of test audit events

// Deterministic test data with seed
const deterministicData = TestDataGenerator.withSeed(12345, () => 
  TestDataGenerator.generateIdentityInfo()
);
```

### Test Utilities

```typescript
import { TestUtils } from '@anarq/testing';

// Assert response formats
const response = await someApiCall();
TestUtils.assertSuccess(response); // Throws if not successful
TestUtils.assertError(response);   // Throws if not error
TestUtils.assertErrorCode(response, 'QONSENT_DENIED');

// Timing utilities
await TestUtils.wait(1000); // Wait 1 second

await TestUtils.waitFor(
  () => someCondition(),
  5000, // timeout
  100   // check interval
);

const { result, duration } = await TestUtils.measureTime(async () => {
  return await someExpensiveOperation();
});

// Retry with backoff
const result = await TestUtils.retry(
  async () => await unreliableOperation(),
  3,   // max attempts
  100  // base delay
);

// Response validation
const validation = TestUtils.validateQResponse(response);
if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
}

// Test environment setup
const env = TestUtils.createTestEnvironment();
env.addCleanup(() => cleanupDatabase());
env.addCleanup(() => resetMocks());

// Later...
env.cleanup(); // Runs all cleanup functions
```

### Spies and Mocks

```typescript
import { TestUtils } from '@anarq/testing';

// Create a spy function
const spy = TestUtils.createSpy((x: number) => x * 2);

spy(5); // Returns 10
spy(3); // Returns 6

console.log(spy.callCount); // 2
console.log(spy.calls);     // [[5], [3]]

spy.reset(); // Clear call history
```

## Mock Services

### MockSquidService

Provides mock identity verification, subidentity management, and reputation tracking.

**Methods:**
- `verifyIdentity(squidId: string)`
- `getActiveContext(squidId: string, subId?: string)`
- `createSubIdentity(squidId: string, displayName: string)`
- `updateReputation(squidId: string, delta: number)`
- `reset()` - Reset to initial test data
- `addIdentity(identity: IdentityInfo)` - Add custom test identity

### MockQlockService

Provides mock encryption, signatures, and distributed locking.

**Methods:**
- `encrypt(data: string, publicKey?: string)`
- `decrypt(encrypted: string, key: string)`
- `sign(data: string, privateKey?: string)`
- `verify(data: string, signature: LockSig)`
- `lock(resource: string, owner: string, ttl?: number)`
- `unlock(resource: string, owner: string)`
- `reset()` - Clear all locks
- `cleanExpiredLocks()` - Remove expired locks

### MockQonsentService

Provides mock permission checking, granting, and policy management.

**Methods:**
- `check(squidId: string, resource: string, action: string, scope?: string)`
- `grant(squidId: string, resource: string, action: string, scope?: string, expiresAt?: string)`
- `revoke(squidId: string, resource: string, action: string, scope?: string)`
- `listPermissions(squidId: string)`
- `createPolicy(policy: any)`
- `getPolicy(policyCid: string)`
- `reset()` - Reset to initial test data
- `addGrant(grant: PermissionGrant)` - Add custom test grant

## Contract Testing

The contract testing framework validates:

- **Request/Response Schemas**: JSON Schema validation
- **HTTP Status Codes**: Expected vs actual status codes
- **Headers**: Required and optional header validation
- **Q Response Format**: Validates Q ecosystem response structure

### OpenAPI Integration

```typescript
import { ContractTester } from '@anarq/testing';

// Generate contracts from OpenAPI spec
const openApiSpec = { /* your OpenAPI specification */ };
const contracts = tester.generateContractsFromOpenAPI(openApiSpec);
tester.registerContracts(contracts);

// Test all contracts
const results = await tester.testAllContracts(async (contract) => {
  // Make actual API call based on contract
  const response = await fetch(contract.request.path, {
    method: contract.request.method,
    body: JSON.stringify(contract.request.body)
  });
  
  return {
    request: contract.request,
    response: {
      status: response.status,
      body: await response.json()
    }
  };
});
```

## Test Data Generation

### Available Generators

- `generateIdentityRef()` - Basic identity reference
- `generateIdentityInfo()` - Full identity with metadata
- `generateConsentRef()` - Permission consent reference
- `generateLockSig()` - Cryptographic signature
- `generateIndexRecord()` - Index record entry
- `generateAuditEvent()` - Audit log event
- `generateMaskProfile()` - Privacy mask profile
- `generateHttpRequest()` - HTTP request object
- `generateHttpResponse()` - HTTP response object

### Batch Generation

- `generateIdentityBatch(count)` - Multiple identities
- `generateIndexRecordBatch(count)` - Multiple records
- `generateAuditEventBatch(count)` - Multiple events
- `generateScenario(name)` - Complete test scenario

## Testing

```bash
npm test
```

## Building

```bash
npm run build
```

## License

MIT