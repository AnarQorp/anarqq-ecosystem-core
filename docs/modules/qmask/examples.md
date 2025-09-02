# Qmask Integration Examples


## HTTP API Integration

### JavaScript/Node.js Example
```javascript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3060',
  headers: {
    'Content-Type': 'application/json',
    'x-squid-id': 'your-squid-id',
    'x-api-version': '1.0'
  }
});

// Example API call
async function example() {
  try {
    const response = await client.get('/health');
    console.log('Service status:', response.data.status);
  } catch (error) {
    console.error('API call failed:', error.response?.data);
  }
}
```

### Python Example
```python
import requests

class QmaskClient:
    def __init__(self, base_url, squid_id):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'x-squid-id': squid_id,
            'x-api-version': '1.0'
        }
    
    def health_check(self):
        response = requests.get(f"{self.base_url}/health", headers=self.headers)
        return response.json()

# Usage
client = QmaskClient('http://localhost:3060', 'your-squid-id')
status = client.health_check()
print(f"Service status: {status['status']}")
```



## MCP Integration

### Basic MCP Client
```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  name: 'qmask',
  version: '1.0.0',
  url: 'http://localhost:3060'
});

await client.connect();

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools);

// Call a tool
const result = await client.callTool('qmask.apply', {
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

// Add qmask as a client
server.addClient('qmask', {
  url: 'http://localhost:3060',
  tools: ['qmask.apply']
});

await server.start();
```



## Cross-Module Integration

### Complete Workflow Example
```javascript
import { SquidClient } from '@anarq/squid-client';
import { QonsentClient } from '@anarq/qonsent-client';
import { QmaskClient } from '@anarq/qmask-client';

async function completeWorkflow() {
  // 1. Authenticate with sQuid
  const squid = new SquidClient();
  const identity = await squid.authenticate('user-credentials');
  
  // 2. Check permissions with Qonsent
  const qonsent = new QonsentClient();
  const hasPermission = await qonsent.check({
    squidId: identity.squidId,
    resource: 'qmask:action',
    action: 'execute'
  });
  
  if (!hasPermission) {
    throw new Error('Permission denied');
  }
  
  // 3. Execute qmask operation
  const qmask = new QmaskClient();
  const result = await qmask.performOperation({
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

// Listen for qmask events
eventBus.subscribe('q.qmask.*.v1', (event) => {
  console.log('Qmask event:', event);
  
  // React to specific events
  switch (event.type) {
    case 'q.qmask.created.v1':
      // Handle creation event
      break;
    case 'q.qmask.updated.v1':
      // Handle update event
      break;
  }
});

// Publish events to qmask
eventBus.publish('q.qmask.command.v1', {
  squidId: 'user-id',
  action: 'process',
  data: { /* command data */ }
});
```

