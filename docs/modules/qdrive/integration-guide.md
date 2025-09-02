# Qdrive API - Integration Guide

This guide provides examples and patterns for integrating qdrive with other systems.

## Integration Patterns

### HTTP API Integration

The most common integration pattern using REST APIs:

```javascript
import axios from 'axios';

class qdriveClient {
  constructor(options = {}) {
    this.client = axios.create({
      baseURL: options.baseURL || 'http://localhost:3000/api/qdrive',
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '1.0.0',
        ...options.headers
      }
    });

    // Add authentication interceptor
    this.client.interceptors.request.use((config) => {
      if (options.squidId) {
        config.headers['x-squid-id'] = options.squidId;
      }
      if (options.token) {
        config.headers['Authorization'] = `Bearer ${options.token}`;
      }
      return config;
    });

    // Add error handling interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Usage
const client = new qdriveClient({
  squidId: 'your-squid-id',
  token: 'your-jwt-token'
});

const health = await client.healthCheck();
console.log(health);
```

### MCP Integration

For serverless and AI agent integration:

```javascript
import { MCPClient } from '@anarq/mcp-client';

class qdriveMCPClient {
  constructor(options = {}) {
    this.client = new MCPClient({
      serverUrl: options.serverUrl || 'http://localhost:3000/mcp/qdrive',
      authentication: {
        squidId: options.squidId,
        token: options.token
      }
    });
  }

  async connect() {
    await this.client.connect();
    console.log('Connected to qdrive MCP server');
  }

  async disconnect() {
    await this.client.disconnect();
  }

  async callTool(toolName, params) {
    try {
      const result = await this.client.callTool(toolName, params);
      if (!result.success) {
        throw new Error(result.error || 'Tool call failed');
      }
      return result;
    } catch (error) {
      console.error(`Tool call failed: ${toolName}`, error);
      throw error;
    }
  }
}

// Usage
const mcpClient = new qdriveMCPClient({
  squidId: 'your-squid-id',
  token: 'your-jwt-token'
});

await mcpClient.connect();
// Use MCP tools...
await mcpClient.disconnect();
```


## HTTP API Integration

```javascript
import axios from 'axios';

const qdriveClient = axios.create({
  baseURL: 'http://localhost:3000/api/qdrive',
  headers: {
    'x-squid-id': 'your-squid-id',
    'x-api-version': '1.0.0'
  }
});

// Example API call
const response = await qdriveClient.get('/health');
console.log(response.data);
```


## MCP Integration

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/qdrive'
});

await client.connect();

```



## Event-Driven Integration

Subscribe to module events for real-time updates:

```javascript
import { EventBusClient } from '@anarq/event-bus';

const eventBus = new EventBusClient({
  url: 'ws://localhost:3001/events'
});

// Subscribe to module events
eventBus.subscribe('q.qdrive.*.v1', (event) => {
  console.log('Received event:', event);
  
  switch (event.type) {
    case 'q.qdrive.created.v1':
      handleCreated(event.data);
      break;
    case 'q.qdrive.updated.v1':
      handleUpdated(event.data);
      break;
    case 'q.qdrive.deleted.v1':
      handleDeleted(event.data);
      break;
  }
});

function handleCreated(data) {
  // Handle creation event
  console.log('Resource created:', data);
}

function handleUpdated(data) {
  // Handle update event
  console.log('Resource updated:', data);
}

function handleDeleted(data) {
  // Handle deletion event
  console.log('Resource deleted:', data);
}
```

## Cross-Module Integration

### With sQuid (Identity)

```javascript
import { sQuidClient } from '@anarq/squid';
import { qdriveClient } from '@anarq/qdrive';

// Verify identity before module operations
const identity = await sQuidClient.verifyIdentity(squidId);
if (!identity.valid) {
  throw new Error('Invalid identity');
}

// Use verified identity with module
const client = new qdriveClient({
  squidId: identity.squidId,
  token: identity.token
});
```

### With Qonsent (Permissions)

```javascript
import { QonsentClient } from '@anarq/qonsent';

// Check permissions before operations
const hasPermission = await QonsentClient.check({
  squidId: 'user-squid-id',
  resource: 'qdrive:resource:123',
  action: 'read'
});

if (!hasPermission) {
  throw new Error('Permission denied');
}

// Proceed with operation
const result = await qdriveClient.getResource('123');
```

### With Qlock (Encryption)

```javascript
import { QlockClient } from '@anarq/qlock';

// Encrypt data before storage
const encryptedData = await QlockClient.encrypt({
  data: sensitiveData,
  squidId: 'user-squid-id',
  purpose: 'qdrive-storage'
});

// Store encrypted data
await qdriveClient.store({
  data: encryptedData,
  metadata: { encrypted: true }
});
```

## Error Handling Patterns

### Retry with Exponential Backoff

```javascript
async function retryOperation(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Check if error is retryable
      if (error.response?.status >= 500 || error.code === 'ECONNRESET') {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Don't retry client errors
      }
    }
  }
}

// Usage
const result = await retryOperation(async () => {
  return await qdriveClient.someOperation();
});
```

### Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async call(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Usage
const circuitBreaker = new CircuitBreaker();

const result = await circuitBreaker.call(async () => {
  return await qdriveClient.someOperation();
});
```

## Testing Integration

### Unit Tests

```javascript
import { jest } from '@jest/globals';
import { qdriveClient } from '@anarq/qdrive';

// Mock the HTTP client
jest.mock('axios');

describe('qdrive Integration', () => {
  let client;

  beforeEach(() => {
    client = new qdriveClient({
      squidId: 'test-squid-id',
      token: 'test-token'
    });
  });

  test('should handle successful API call', async () => {
    const mockResponse = { data: { status: 'ok', data: {} } };
    axios.get.mockResolvedValue(mockResponse);

    const result = await client.healthCheck();
    expect(result.status).toBe('ok');
  });

  test('should handle API errors', async () => {
    const mockError = new Error('Network error');
    axios.get.mockRejectedValue(mockError);

    await expect(client.healthCheck()).rejects.toThrow('Network error');
  });
});
```

### Integration Tests

```javascript
import { qdriveClient } from '@anarq/qdrive';

describe('qdrive Integration Tests', () => {
  let client;

  beforeAll(async () => {
    // Start test server
    await startTestServer();
    
    client = new qdriveClient({
      baseURL: 'http://localhost:3001/api/qdrive',
      squidId: 'test-squid-id',
      token: 'test-token'
    });
  });

  afterAll(async () => {
    await stopTestServer();
  });

  test('should perform end-to-end operation', async () => {
    // Test actual integration
    const health = await client.healthCheck();
    expect(health.status).toBe('ok');
  });
});
```

## Best Practices

1. **Always authenticate requests** with valid sQuid identity
2. **Handle errors gracefully** with appropriate fallbacks
3. **Implement retry logic** for transient failures
4. **Use circuit breakers** for external service calls
5. **Cache responses** when appropriate
6. **Monitor integration health** with metrics and alerts
7. **Test integration thoroughly** with unit and integration tests
8. **Follow rate limits** to avoid throttling
9. **Use idempotency keys** for write operations
10. **Log integration events** for debugging and monitoring

## Performance Optimization

### Connection Pooling

```javascript
import axios from 'axios';
import { Agent } from 'http';

const client = axios.create({
  httpAgent: new Agent({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 5
  })
});
```

### Response Caching

```javascript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function cachedRequest(key, requestFn) {
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const result = await requestFn();
  cache.set(key, result);
  return result;
}
```

### Batch Operations

```javascript
// Batch multiple operations together
const operations = [
  { type: 'create', data: data1 },
  { type: 'update', id: 'id1', data: data2 },
  { type: 'delete', id: 'id2' }
];

const results = await qdriveClient.batch(operations);
```
