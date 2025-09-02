# Idempotency and Retry Infrastructure

This document describes the comprehensive idempotency and retry infrastructure implemented for the Q ecosystem modules.

## Overview

The infrastructure provides:

- **Idempotency Key Support**: Request fingerprinting and duplicate detection
- **Exponential Backoff Retry Policies**: Configurable retry strategies with circuit breaker patterns
- **Response Caching**: State management for idempotent operations
- **Monitoring and Analytics**: Comprehensive metrics collection and analysis
- **Module-Specific Policies**: Tailored retry policies for different Q modules

## Core Components

### 1. IdempotencyManager

Handles duplicate request detection and response caching.

```typescript
import { IdempotencyManager } from '@anarq/common-clients';

const manager = new IdempotencyManager({
  defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
  maxRecords: 10000,
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  includeBodyInFingerprint: true,
  fingerprintHeaders: ['x-squid-id', 'x-subid', 'x-qonsent']
});

// Generate idempotency key
const key = manager.generateIdempotencyKey();

// Create request fingerprint
const fingerprint = manager.createRequestFingerprint(
  'POST',
  '/api/payment',
  headers,
  body
);

// Check for duplicates
const { isDuplicate, record } = await manager.checkDuplicate(key, fingerprint);
```

### 2. RetryHandler and RetryPolicyManager

Provides exponential backoff retry logic with configurable policies.

```typescript
import { RetryHandler, RetryPolicyManager } from '@anarq/common-clients';

// Use predefined policies
const policy = RetryPolicyManager.forModule('qwallet'); // Conservative for payments
const handler = new RetryHandler(policy);

// Execute with retry
const result = await handler.execute(async () => {
  return await someApiCall();
});

// Create custom policy
const customPolicy = RetryPolicyManager.createCustom({
  maxAttempts: 5,
  baseDelay: 200,
  maxDelay: 10000,
  backoffMultiplier: 1.8,
  jitter: true
});
```

### 3. CircuitBreaker

Provides fault tolerance with circuit breaker pattern.

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
  return await unreliableService();
});
```

### 4. IdempotentHttpClient

HTTP client with integrated idempotency, retry, and circuit breaker support.

```typescript
import { IdempotentHttpClient } from '@anarq/common-clients';

const client = new IdempotentHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  retryPolicy: RetryPolicyManager.STANDARD,
  circuitBreaker: {
    failureThreshold: 3,
    recoveryTimeout: 30000,
    monitoringWindow: 60000,
    halfOpenMaxCalls: 2,
    fallbackStrategy: 'REJECT'
  }
});

// Make idempotent request
const response = await client.post('/payment', paymentData, {
  'Idempotency-Key': 'payment-12345'
});
```

### 5. ClientFactory

Factory for creating configured clients with best practices.

```typescript
import { ClientFactory } from '@anarq/common-clients';

// Create module-specific client
const qwalletClient = ClientFactory.createModuleClient('qwallet', 'https://qwallet.api.com');

// Create custom client
const client = ClientFactory.createHttpClient({
  baseUrl: 'https://api.example.com',
  module: 'qmail',
  criticality: 'HIGH',
  realTime: true,
  userFacing: true
});

// Get global statistics
const retryStats = ClientFactory.getGlobalRetryStats();
const idempotencyStats = ClientFactory.getGlobalIdempotencyStats();
```

### 6. RetryMonitor

Monitoring and analytics for retry operations and idempotency.

```typescript
import { RetryMonitor } from '@anarq/common-clients';

const monitor = new RetryMonitor();

// Track retry operation
monitor.startRetryOperation('op1', 'payment', policy, 'qwallet');
monitor.recordRetryAttempt('op1', 1, error, 1000, false);
monitor.completeRetryOperation('op1', true);

// Track idempotency operation
monitor.recordIdempotencyOperation('idem1', 'key123', 'upload', false, false, 'qdrive');

// Get statistics
const stats = monitor.getRetryStats();
const idempotencyStats = monitor.getIdempotencyStats();
```

## Predefined Retry Policies

### Policy Types

- **CONSERVATIVE**: Minimal retries for critical operations (2 attempts, 1s base delay)
- **STANDARD**: Balanced approach for most scenarios (3 attempts, 100ms base delay)
- **AGGRESSIVE**: Maximum retries for non-critical operations (5 attempts, 50ms base delay)
- **FAST**: Optimized for real-time operations (3 attempts, 25ms base delay, 1s max delay)
- **NO_RETRY**: Fail-fast for critical operations (1 attempt, no retries)

### Module-Specific Policies

Different Q modules use appropriate retry policies:

- **Critical Modules** (qlock, qwallet, qerberos): CONSERVATIVE
- **Fast Modules** (squid, qonsent): FAST
- **Storage Modules** (qdrive, qpic, qindex): AGGRESSIVE
- **Business Modules** (qmarket, qmail, qchat): STANDARD
- **Network Modules** (qnet): AGGRESSIVE
- **Governance Modules** (dao): CONSERVATIVE

## Error Handling

### Standardized Error Codes

```typescript
enum ErrorCodes {
  // Authentication & Authorization
  QLOCK_AUTH_FAIL = 'QLOCK_AUTH_FAIL',
  QONSENT_DENIED = 'QONSENT_DENIED',
  SQUID_IDENTITY_INVALID = 'SQUID_IDENTITY_INVALID',
  
  // Network & Services
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  
  // Business Logic
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  DEPENDENCY_MISSING = 'DEPENDENCY_MISSING'
}
```

### Error Response Format

```typescript
interface QError extends Error {
  code: ErrorCodes;
  statusCode?: number;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
  retryable: boolean;
  suggestedActions?: string[];
}
```

## Configuration Examples

### Basic Configuration

```typescript
const client = ClientFactory.createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  module: 'qmail'
});
```

### Advanced Configuration

```typescript
const client = ClientFactory.createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 15000,
  identity: {
    squidId: 'user123',
    subId: 'sub456',
    daoId: 'dao789'
  },
  retryPolicy: {
    maxAttempts: 4,
    baseDelay: 500,
    maxDelay: 20000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: ['SERVICE_UNAVAILABLE', 'TIMEOUT_ERROR'],
    retryableStatusCodes: [503, 504, 429]
  },
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTimeout: 60000,
    monitoringWindow: 120000,
    halfOpenMaxCalls: 3,
    fallbackStrategy: 'CACHE'
  },
  idempotency: {
    defaultTtl: 3600000, // 1 hour
    maxRecords: 5000,
    includeBodyInFingerprint: true,
    fingerprintHeaders: ['x-squid-id', 'x-subid', 'x-qonsent']
  }
});
```

## Best Practices

### 1. Idempotency Keys

- Use meaningful, unique keys: `payment-${userId}-${timestamp}`
- Include operation context: `upload-${fileId}-${version}`
- Avoid predictable patterns for security

### 2. Retry Policies

- Use module-specific policies: `RetryPolicyManager.forModule('qwallet')`
- Consider operation criticality: `RetryPolicyManager.forCriticality('HIGH')`
- Enable jitter to prevent thundering herd: `jitter: true`

### 3. Circuit Breakers

- Set appropriate thresholds based on service reliability
- Use different strategies for different failure modes
- Monitor circuit breaker state and adjust thresholds

### 4. Monitoring

- Track retry success rates by module and error type
- Monitor idempotency cache hit rates
- Set up alerts for circuit breaker trips

### 5. Error Handling

- Use standardized error codes for consistent handling
- Provide actionable error messages and suggestions
- Log errors with sufficient context for debugging

## Integration with Q Modules

### Example: Qwallet Integration

```typescript
const qwalletClient = ClientFactory.createModuleClient('qwallet', 'https://qwallet.api.com');

// Make payment with idempotency
const payment = await qwalletClient.post('/payments', {
  amount: 100,
  currency: 'USD',
  recipient: 'user123'
}, {
  'Idempotency-Key': `payment-${userId}-${Date.now()}`,
  'x-squid-id': userId,
  'x-qonsent': consentToken
});
```

### Example: Qindex Integration

```typescript
const qindexClient = ClientFactory.createModuleClient('qindex', 'https://qindex.api.com');

// Index document with retry
const indexResult = await qindexClient.post('/index', {
  type: 'document',
  key: 'doc123',
  cid: 'QmHash...',
  metadata: { title: 'Document Title' }
});
```

## Monitoring and Analytics

### Retry Statistics

```typescript
const retryStats = monitor.getRetryStats('qwallet');
console.log({
  totalOperations: retryStats.totalOperations,
  successRate: retryStats.successfulOperations / retryStats.totalOperations,
  averageAttempts: retryStats.averageAttempts,
  mostCommonErrors: retryStats.mostCommonErrors
});
```

### Idempotency Statistics

```typescript
const idempotencyStats = monitor.getIdempotencyStats('qdrive');
console.log({
  duplicateRate: idempotencyStats.duplicateRate,
  cacheHitRate: idempotencyStats.cacheHitRate,
  averageProcessingTime: idempotencyStats.averageProcessingTime
});
```

## Testing

The infrastructure includes comprehensive tests covering:

- Idempotency key generation and conflict detection
- Request fingerprinting and duplicate detection
- Retry logic with various error scenarios
- Circuit breaker state transitions
- Integration between components
- Performance and capacity limits

Run tests with:

```bash
npm test
```

## Performance Considerations

### Memory Usage

- Idempotency records are automatically cleaned up based on TTL
- Circuit breakers maintain minimal state
- Retry handlers are stateless

### Network Efficiency

- Jitter prevents thundering herd problems
- Circuit breakers prevent cascading failures
- Idempotency reduces duplicate processing

### Latency Impact

- Fast policies minimize retry delays for real-time operations
- Circuit breakers fail fast when services are down
- Response caching eliminates duplicate processing

## Security Considerations

- Idempotency keys should not be predictable
- Request fingerprints include security headers
- Error messages don't expose sensitive information
- Audit logging tracks all retry and idempotency operations

## Migration Guide

### From Existing Retry Logic

1. Replace custom retry logic with `RetryHandler`
2. Use `RetryPolicyManager` for consistent policies
3. Add monitoring with `RetryMonitor`

### Adding Idempotency

1. Replace HTTP clients with `IdempotentHttpClient`
2. Add idempotency keys to write operations
3. Configure appropriate TTL and fingerprint headers

### Enabling Circuit Breakers

1. Add circuit breaker configuration to client config
2. Monitor circuit breaker state and adjust thresholds
3. Implement fallback strategies for open circuits

## Troubleshooting

### Common Issues

1. **Idempotency Key Conflicts**: Ensure keys are unique per operation
2. **Circuit Breaker Trips**: Check service health and adjust thresholds
3. **Retry Exhaustion**: Review retry policies and error handling
4. **Memory Usage**: Monitor idempotency cache size and TTL settings

### Debugging

- Enable detailed logging for retry attempts
- Monitor circuit breaker state changes
- Track idempotency cache hit/miss rates
- Analyze error patterns and retry success rates

## Future Enhancements

- Distributed idempotency with Redis backend
- Machine learning-based retry policy optimization
- Advanced circuit breaker strategies
- Integration with observability platforms
- Automatic policy tuning based on historical data