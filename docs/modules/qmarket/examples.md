# Qmarket Integration Examples


## HTTP API Integration

### JavaScript/Node.js Example
```javascript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3080',
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

class QmarketClient:
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
client = QmarketClient('http://localhost:3080', 'your-squid-id')
status = client.health_check()
print(f"Service status: {status['status']}")
```



## MCP Integration

### Basic MCP Client
```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  name: 'qmarket',
  version: '1.0.0',
  url: 'http://localhost:3080'
});

await client.connect();

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools);

// Call a tool
const result = await client.callTool('qmarket.list', {
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

// Add qmarket as a client
server.addClient('qmarket', {
  url: 'http://localhost:3080',
  tools: ['qmarket.list']
});

await server.start();
```



## Cross-Module Integration

### Complete Workflow Example
```javascript
import { SquidClient } from '@anarq/squid-client';
import { QonsentClient } from '@anarq/qonsent-client';
import { QmarketClient } from '@anarq/qmarket-client';

async function completeWorkflow() {
  // 1. Authenticate with sQuid
  const squid = new SquidClient();
  const identity = await squid.authenticate('user-credentials');
  
  // 2. Check permissions with Qonsent
  const qonsent = new QonsentClient();
  const hasPermission = await qonsent.check({
    squidId: identity.squidId,
    resource: 'qmarket:action',
    action: 'execute'
  });
  
  if (!hasPermission) {
    throw new Error('Permission denied');
  }
  
  // 3. Execute qmarket operation
  const qmarket = new QmarketClient();
  const result = await qmarket.performOperation({
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

// Listen for qmarket events
eventBus.subscribe('q.qmarket.*.v1', (event) => {
  console.log('Qmarket event:', event);
  
  // React to specific events
  switch (event.type) {
    case 'q.qmarket.created.v1':
      // Handle creation event
      break;
    case 'q.qmarket.updated.v1':
      // Handle update event
      break;
  }
});

// Publish events to qmarket
eventBus.publish('q.qmarket.command.v1', {
  squidId: 'user-id',
  action: 'process',
  data: { /* command data */ }
});
```

