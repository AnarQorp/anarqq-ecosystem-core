# Qlock Integration Examples


## MCP Integration

### Basic MCP Client
```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  name: 'qlock',
  version: '1.0.0',
  url: 'http://localhost:3020'
});

await client.connect();

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools);

// Call a tool
const result = await client.callTool('qlock.encrypt', {
  // tool parameters
});
console.log('Result:', result);
```

### MCP Server Integration
```javascript
import { MCPServer } from '@anarq/mcp-server';

const server = new MCPServer({
  name: 'my-integration',
  version: '1.0.0'
});

// Add qlock as a client
server.addClient('qlock', {
  url: 'http://localhost:3020',
  tools: ['qlock.encrypt']
});

await server.start();
```



## Cross-Module Integration

### Complete Workflow Example
```javascript
import { SquidClient } from '@anarq/squid-client';
import { QonsentClient } from '@anarq/qonsent-client';
import { QlockClient } from '@anarq/qlock-client';

async function completeWorkflow() {
  // 1. Authenticate with sQuid
  const squid = new SquidClient();
  const identity = await squid.authenticate('user-credentials');
  
  // 2. Check permissions with Qonsent
  const qonsent = new QonsentClient();
  const hasPermission = await qonsent.check({
    squidId: identity.squidId,
    resource: 'qlock:action',
    action: 'execute'
  });
  
  if (!hasPermission) {
    throw new Error('Permission denied');
  }
  
  // 3. Execute qlock operation
  const qlock = new QlockClient();
  const result = await qlock.performOperation({
    squidId: identity.squidId,
    // operation parameters
  });
  
  return result;
}
```

### Event-Driven Integration
```javascript
import { EventBus } from '@anarq/event-bus';

const eventBus = new EventBus();

// Listen for qlock events
eventBus.subscribe('q.qlock.*.v1', (event) => {
  console.log('Qlock event:', event);
  
  // React to specific events
  switch (event.type) {
    case 'q.qlock.created.v1':
      // Handle creation event
      break;
    case 'q.qlock.updated.v1':
      // Handle update event
      break;
  }
});

// Publish events to qlock
eventBus.publish('q.qlock.command.v1', {
  squidId: 'user-id',
  action: 'process',
  data: { /* command data */ }
});
```

