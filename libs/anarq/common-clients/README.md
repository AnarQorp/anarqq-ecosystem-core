# @anarq/common-clients

Common HTTP/MCP client libraries with retry policies, circuit breakers, and error handling for the Q ecosystem.

## Features

- **HTTP Client**: RESTful API client with Q ecosystem standards
- **MCP Client**: Model Context Protocol client for serverless functions
- **Retry Policies**: Exponential backoff with jitter
- **Circuit Breakers**: Fault tolerance and graceful degradation
- **Error Handling**: Standardized error codes and responses
- **Request Tracing**: Correlation IDs and distributed tracing support

## Installation

```bash
npm install @anarq/common-clients
```

## Usage

### HTTP Client

```typescript
import { HttpClient } from '@anarq/common-clients';

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  identity: {
    squidId: 'user123',
    subId: 'sub456'
  },
  retryPolicy: {
    maxAttempts: 3,
    baseDelay: 100,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: ['SERVICE_UNAVAILABLE', 'TIMEOUT_ERROR'],
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

// Make requests
const response = await client.get('/users/123');
const created = await client.post('/users', { name: 'John Doe' });
```

### MCP Client

```typescript
import { McpClient } from '@anarq/common-clients';

const mcpClient = new McpClient({
  tools: [
    {
      name: 'qlock.encrypt',
      description: 'Encrypt data using Qlock',
      inputSchema: { type: 'object', properties: { data: { type: 'string' } } },
      outputSchema: { type: 'object', properties: { encrypted: { type: 'string' } } }
    }
  ],
  identity: {
    squidId: 'user123'
  },
  timeout: 30000,
  retryPolicy: {
    maxAttempts: 3,
    baseDelay: 100,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: ['SERVICE_UNAVAILABLE'],
    retryableStatusCodes: [500, 502, 503, 504]
  }
});

// Call MCP tools
const result = await mcpClient.callTool('qlock.encrypt', { 
  data: 'sensitive information' 
});
```

### Circuit Breaker

```typescript
import { CircuitBreaker } from '@anarq/common-clients';

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 30000,
  monitoringWindow: 60000,
  halfOpenMaxCalls: 3,
  fallbackStrategy: 'REJECT'
});

const result = await circuitBreaker.execute(async () => {
  // Your potentially failing operation
  return await someUnreliableService();
});
```

### Retry Handler

```typescript
import { RetryHandler } from '@anarq/common-clients';

const retryHandler = new RetryHandler({
  maxAttempts: 3,
  baseDelay: 100,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: ['SERVICE_UNAVAILABLE'],
  retryableStatusCodes: [500, 502, 503, 504]
});

const result = await retryHandler.execute(async () => {
  // Your operation that might need retrying
  return await someOperation();
});
```

## Q Ecosystem Standards

### Standard Headers

All HTTP requests include Q ecosystem standard headers:

- `x-squid-id`: Primary identity identifier
- `x-subid`: Subidentity identifier (optional)
- `x-qonsent`: Consent token (optional)
- `x-sig`: Qlock signature (optional)
- `x-ts`: Timestamp
- `x-api-version`: API version

### Standard Response Format

```typescript
interface QResponse<T> {
  status: 'ok' | 'error';
  code: string;
  message: string;
  data?: T;
  cid?: string; // IPFS content identifier
}
```

### Error Codes

Standardized error codes across the Q ecosystem:

- `QLOCK_AUTH_FAIL`: Authentication failure
- `QONSENT_DENIED`: Permission denied
- `SQUID_IDENTITY_INVALID`: Invalid identity
- `QINDEX_NOT_FOUND`: Resource not found
- `SERVICE_UNAVAILABLE`: Service unavailable
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `TIMEOUT_ERROR`: Request timeout
- `CIRCUIT_BREAKER_OPEN`: Circuit breaker protection

## Configuration

### Retry Policy

```typescript
interface RetryPolicy {
  maxAttempts: number;        // Maximum retry attempts
  baseDelay: number;          // Base delay in milliseconds
  maxDelay: number;           // Maximum delay in milliseconds
  backoffMultiplier: number;  // Exponential backoff multiplier
  jitter: boolean;            // Add randomization to delays
  retryableErrors: string[];  // Error codes to retry
  retryableStatusCodes: number[]; // HTTP status codes to retry
}
```

### Circuit Breaker

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;     // Failures before opening circuit
  recoveryTimeout: number;      // Time before attempting recovery
  monitoringWindow: number;     // Window for failure counting
  halfOpenMaxCalls: number;     // Max calls in half-open state
  fallbackStrategy: 'CACHE' | 'MOCK' | 'QUEUE' | 'REJECT';
}
```

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