# Qflow JavaScript SDK Examples

## Quick Start

```javascript
import { QflowClient } from '@qflow/client';

const client = new QflowClient({
  baseURL: 'https://api.qflow.anarq.org/v1',
  token: 'your-squid-token'
});

// Create a simple flow
const flow = await client.flows.create({
  name: 'Hello World',
  steps: [{
    id: 'hello',
    type: 'task',
    action: 'log-message',
    params: { message: 'Hello, World!' }
  }]
});

// Execute the flow
const execution = await client.executions.start(flow.id);
console.log('Execution started:', execution.executionId);
```

## Advanced Examples

### User Registration Flow

```javascript
const userFlow = await client.flows.create({
  name: 'User Registration',
  steps: [
    {
      id: 'validate',
      type: 'task',
      action: 'validate-email',
      params: { email: '{{input.email}}' },
      onSuccess: 'create-user'
    },
    {
      id: 'create-user',
      type: 'module-call',
      action: 'user-service.create',
      params: { userData: '{{input}}' },
      onSuccess: 'send-welcome'
    },
    {
      id: 'send-welcome',
      type: 'module-call',
      action: 'qmail.send-email',
      params: {
        template: 'welcome',
        recipient: '{{input.email}}'
      }
    }
  ]
});
```

### Real-time Monitoring

```javascript
const ws = client.websocket.execution(executionId);

ws.on('status', (update) => {
  console.log('Status:', update.status);
});

ws.on('complete', (result) => {
  console.log('Completed:', result);
});

ws.connect();
```
