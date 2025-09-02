# Qflow JavaScript/TypeScript SDK

## Installation

```bash
npm install @qflow/client
# or
yarn add @qflow/client
```

## Quick Start

```typescript
import { QflowClient } from '@qflow/client';

const client = new QflowClient({
  baseURL: 'https://api.qflow.anarq.org/v1',
  token: 'your-squid-token',
  timeout: 30000
});

// Create and execute a flow
async function example() {
  try {
    // Create a flow
    const flow = await client.flows.create({
      name: 'Hello World Flow',
      description: 'A simple example flow',
      steps: [
        {
          id: 'hello',
          type: 'task',
          action: 'log-message',
          params: {
            message: 'Hello, World!'
          }
        }
      ],
      metadata: {
        tags: ['example'],
        category: 'tutorial'
      }
    });

    console.log('Flow created:', flow.id);

    // Start execution
    const execution = await client.executions.start(flow.id, {
      inputData: { user: 'developer' }
    });

    console.log('Execution started:', execution.executionId);

    // Monitor execution
    const status = await client.executions.getStatus(execution.executionId);
    console.log('Status:', status.status);

  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

## Configuration

### Basic Configuration

```typescript
const client = new QflowClient({
  baseURL: 'https://api.qflow.anarq.org/v1',
  token: 'your-squid-token'
});
```

### Advanced Configuration

```typescript
const client = new QflowClient({
  baseURL: 'https://api.qflow.anarq.org/v1',
  token: 'your-squid-token',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  headers: {
    'X-Client-Version': '1.0.0'
  },
  interceptors: {
    request: (config) => {
      console.log('Request:', config);
      return config;
    },
    response: (response) => {
      console.log('Response:', response.status);
      return response;
    }
  }
});
```

## API Reference

### Flow Management

#### Create Flow

```typescript
const flow = await client.flows.create({
  name: 'My Flow',
  description: 'Flow description',
  steps: [
    {
      id: 'step1',
      type: 'task',
      action: 'my-action',
      params: { key: 'value' }
    }
  ],
  metadata: {
    tags: ['tag1', 'tag2'],
    category: 'automation'
  }
});
```

#### List Flows

```typescript
const flows = await client.flows.list({
  limit: 20,
  offset: 0,
  daoSubnet: 'dao-123',
  status: 'active',
  tags: ['automation', 'email']
});

console.log('Total flows:', flows.pagination.total);
flows.flows.forEach(flow => {
  console.log(`${flow.name} (${flow.id})`);
});
```

#### Get Flow

```typescript
const flow = await client.flows.get('flow-id');
console.log('Flow:', flow.name);
console.log('Steps:', flow.steps.length);
```

#### Update Flow

```typescript
const updatedFlow = await client.flows.update('flow-id', {
  name: 'Updated Flow Name',
  description: 'Updated description',
  steps: [
    // Updated steps
  ]
});
```

#### Delete Flow

```typescript
await client.flows.delete('flow-id');
console.log('Flow deleted');
```

### Execution Management

#### Start Execution

```typescript
const execution = await client.executions.start('flow-id', {
  inputData: {
    user: 'john@example.com',
    action: 'register'
  },
  variables: {
    environment: 'production'
  },
  priority: 'high'
});

console.log('Execution ID:', execution.executionId);
```

#### Trigger from External Event

```typescript
const execution = await client.executions.trigger('flow-id', {
  eventType: 'webhook.github.push',
  payload: {
    repository: 'my-repo',
    branch: 'main',
    commits: [...]
  },
  source: 'github.com'
});
```

#### Get Execution Status

```typescript
const status = await client.executions.getStatus('execution-id');

console.log('Status:', status.status);
console.log('Progress:', status.progress + '%');
console.log('Current step:', status.currentStep);

if (status.error) {
  console.error('Error:', status.error.message);
}
```

#### Control Execution

```typescript
// Pause execution
await client.executions.pause('execution-id');

// Resume execution
await client.executions.resume('execution-id');

// Abort execution
await client.executions.abort('execution-id');
```

### Monitoring

#### Get Execution Logs

```typescript
const logs = await client.monitoring.getLogs('execution-id', {
  level: 'info',
  limit: 100,
  offset: 0
});

logs.logs.forEach(log => {
  console.log(`[${log.timestamp}] ${log.level}: ${log.message}`);
});
```

#### Get Execution Metrics

```typescript
const metrics = await client.monitoring.getMetrics('execution-id');

console.log('Duration:', metrics.duration + 'ms');
console.log('CPU usage:', metrics.resourceUsage.cpuUsagePercent + '%');
console.log('Memory usage:', metrics.resourceUsage.memoryUsageMB + 'MB');
```

#### System Health

```typescript
const health = await client.system.getHealth();

console.log('System status:', health.status);
console.log('Uptime:', health.uptime + 's');

health.components.forEach(component => {
  console.log(`${component.component}: ${component.status}`);
});
```

#### System Metrics

```typescript
const metrics = await client.system.getMetrics();

console.log('Active executions:', metrics.activeExecutions);
console.log('Success rate:', metrics.successRate + '%');
console.log('Average execution time:', metrics.averageExecutionTime + 'ms');
```

### WebSocket Support

#### Real-time Execution Updates

```typescript
const ws = client.websocket.execution('execution-id');

ws.on('status', (update) => {
  console.log('Status update:', update.status);
});

ws.on('step', (step) => {
  console.log('Step completed:', step.stepId);
});

ws.on('error', (error) => {
  console.error('Execution error:', error);
});

ws.on('complete', (result) => {
  console.log('Execution completed:', result);
});

// Start listening
ws.connect();

// Stop listening
ws.disconnect();
```

#### System Metrics Stream

```typescript
const metricsWs = client.websocket.systemMetrics();

metricsWs.on('metrics', (metrics) => {
  console.log('System metrics:', metrics);
});

metricsWs.connect();
```

#### DAO Events

```typescript
const daoWs = client.websocket.daoEvents('dao-id');

daoWs.on('event', (event) => {
  console.log('DAO event:', event);
});

daoWs.connect();
```

## Error Handling

### Basic Error Handling

```typescript
try {
  const flow = await client.flows.create(flowDefinition);
} catch (error) {
  if (error instanceof QflowError) {
    console.error('Qflow error:', error.message);
    console.error('Status code:', error.statusCode);
    console.error('Request ID:', error.requestId);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Specific Error Types

```typescript
import { 
  QflowError, 
  ValidationError, 
  AuthenticationError, 
  PermissionError,
  NotFoundError,
  RateLimitError 
} from '@qflow/client';

try {
  await client.flows.create(flowDefinition);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.details);
  } else if (error instanceof AuthenticationError) {
    console.error('Authentication failed - check your token');
  } else if (error instanceof PermissionError) {
    console.error('Insufficient permissions');
  } else if (error instanceof NotFoundError) {
    console.error('Resource not found');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded, retry after:', error.retryAfter);
  }
}
```

### Retry Logic

```typescript
import { retry } from '@qflow/client/utils';

const result = await retry(
  () => client.flows.create(flowDefinition),
  {
    retries: 3,
    delay: 1000,
    backoff: 'exponential',
    retryCondition: (error) => error.statusCode >= 500
  }
);
```

## Advanced Usage

### Custom HTTP Client

```typescript
import axios from 'axios';

const customClient = axios.create({
  timeout: 60000,
  headers: {
    'User-Agent': 'MyApp/1.0.0'
  }
});

const client = new QflowClient({
  baseURL: 'https://api.qflow.anarq.org/v1',
  token: 'your-token',
  httpClient: customClient
});
```

### Middleware

```typescript
client.use('request', (config) => {
  // Add request timestamp
  config.headers['X-Request-Time'] = new Date().toISOString();
  return config;
});

client.use('response', (response) => {
  // Log response time
  console.log('Response time:', response.headers['x-response-time']);
  return response;
});
```

### Batch Operations

```typescript
// Create multiple flows
const flows = await Promise.all([
  client.flows.create(flow1Definition),
  client.flows.create(flow2Definition),
  client.flows.create(flow3Definition)
]);

// Start multiple executions
const executions = await Promise.all(
  flows.map(flow => 
    client.executions.start(flow.id, { inputData: {} })
  )
);
```

### Pagination Helper

```typescript
async function getAllFlows() {
  const allFlows = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const response = await client.flows.list({ limit, offset });
    allFlows.push(...response.flows);
    
    if (!response.pagination.hasMore) {
      break;
    }
    
    offset += limit;
  }

  return allFlows;
}
```

## TypeScript Support

### Type Definitions

```typescript
import { 
  FlowDefinition, 
  FlowStep, 
  ExecutionStatus, 
  ExecutionMetrics,
  LogEntry,
  HealthStatus 
} from '@qflow/client/types';

const flowDef: FlowDefinition = {
  name: 'Typed Flow',
  steps: [
    {
      id: 'step1',
      type: 'task',
      action: 'my-action',
      params: { key: 'value' }
    } as FlowStep
  ],
  metadata: {
    tags: ['typescript'],
    category: 'example'
  }
};
```

### Generic Types

```typescript
interface MyFlowInput {
  userId: string;
  email: string;
}

interface MyFlowOutput {
  success: boolean;
  message: string;
}

const execution = await client.executions.start<MyFlowInput, MyFlowOutput>(
  'flow-id',
  {
    inputData: {
      userId: 'user-123',
      email: 'user@example.com'
    }
  }
);
```

## Testing

### Mock Client

```typescript
import { MockQflowClient } from '@qflow/client/testing';

const mockClient = new MockQflowClient();

// Mock responses
mockClient.flows.create.mockResolvedValue({
  id: 'mock-flow-id',
  name: 'Mock Flow',
  // ... other properties
});

// Use in tests
const result = await mockClient.flows.create(flowDefinition);
expect(result.id).toBe('mock-flow-id');
```

### Integration Testing

```typescript
import { QflowClient } from '@qflow/client';

describe('Qflow Integration', () => {
  let client: QflowClient;

  beforeAll(() => {
    client = new QflowClient({
      baseURL: process.env.QFLOW_TEST_URL,
      token: process.env.QFLOW_TEST_TOKEN
    });
  });

  test('should create and execute flow', async () => {
    const flow = await client.flows.create(testFlowDefinition);
    expect(flow.id).toBeDefined();

    const execution = await client.executions.start(flow.id, {
      inputData: { test: true }
    });
    expect(execution.executionId).toBeDefined();

    // Wait for completion
    let status;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      status = await client.executions.getStatus(execution.executionId);
    } while (status.status === 'running');

    expect(status.status).toBe('completed');
  });
});
```

## Examples

### User Registration Flow

```typescript
const userRegistrationFlow = {
  name: 'User Registration',
  description: 'Complete user registration workflow',
  steps: [
    {
      id: 'validate-input',
      type: 'task',
      action: 'validate-schema',
      params: {
        schema: 'user-registration',
        data: '{{input.userData}}'
      },
      onSuccess: 'check-duplicate',
      onFailure: 'validation-error'
    },
    {
      id: 'check-duplicate',
      type: 'task',
      action: 'check-user-exists',
      params: {
        email: '{{input.userData.email}}'
      },
      onSuccess: 'create-user',
      onFailure: 'duplicate-error'
    },
    {
      id: 'create-user',
      type: 'module-call',
      action: 'user-service.create',
      params: {
        userData: '{{input.userData}}'
      },
      onSuccess: 'send-welcome-email',
      onFailure: 'creation-error'
    },
    {
      id: 'send-welcome-email',
      type: 'module-call',
      action: 'qmail.send-email',
      params: {
        template: 'welcome',
        recipient: '{{input.userData.email}}',
        variables: {
          name: '{{input.userData.name}}'
        }
      },
      onSuccess: 'registration-complete',
      onFailure: 'email-error'
    }
  ],
  metadata: {
    tags: ['user-management', 'registration'],
    category: 'user-workflows',
    requiredPermissions: ['user.create', 'email.send']
  }
};

// Create and execute
const flow = await client.flows.create(userRegistrationFlow);
const execution = await client.executions.start(flow.id, {
  inputData: {
    userData: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890'
    }
  }
});
```

### Data Processing Pipeline

```typescript
const dataProcessingFlow = {
  name: 'Data Processing Pipeline',
  steps: [
    {
      id: 'fetch-data',
      type: 'task',
      action: 'fetch-from-api',
      params: {
        url: '{{input.dataSource}}',
        headers: {
          'Authorization': 'Bearer {{secrets.apiToken}}'
        }
      },
      onSuccess: 'validate-data'
    },
    {
      id: 'validate-data',
      type: 'task',
      action: 'validate-json-schema',
      params: {
        schema: '{{input.schema}}',
        data: '{{steps.fetch-data.output}}'
      },
      onSuccess: 'transform-data'
    },
    {
      id: 'transform-data',
      type: 'parallel',
      action: 'execute-parallel',
      params: {
        steps: ['normalize-data', 'enrich-data', 'filter-data']
      },
      onSuccess: 'store-data'
    },
    {
      id: 'store-data',
      type: 'task',
      action: 'store-in-database',
      params: {
        table: '{{input.targetTable}}',
        data: '{{steps.transform-data.output}}'
      }
    }
  ]
};
```

## Best Practices

1. **Error Handling**: Always wrap API calls in try-catch blocks
2. **Rate Limiting**: Implement exponential backoff for rate limit errors
3. **Timeouts**: Set appropriate timeouts for long-running operations
4. **Logging**: Log important events and errors for debugging
5. **Testing**: Write comprehensive tests for your flows
6. **Security**: Never hardcode tokens in your code
7. **Performance**: Use pagination for large datasets
8. **Monitoring**: Monitor execution status and metrics

## Support

- **Documentation**: [https://docs.qflow.anarq.org](https://docs.qflow.anarq.org)
- **GitHub**: [https://github.com/anarq/qflow-js-client](https://github.com/anarq/qflow-js-client)
- **NPM**: [https://www.npmjs.com/package/@qflow/client](https://www.npmjs.com/package/@qflow/client)
- **Issues**: [https://github.com/anarq/qflow-js-client/issues](https://github.com/anarq/qflow-js-client/issues)