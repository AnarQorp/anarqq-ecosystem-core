# Qflow API Documentation

## Overview

The Qflow API provides comprehensive access to the serverless, distributed automation engine that serves as the universal coherence motor for the entire AnarQ & Q ecosystem. This RESTful API enables flow management, execution control, monitoring, and ecosystem integration.

## Base URL

- **Production**: `https://api.qflow.anarq.org/v1`
- **Staging**: `https://staging-api.qflow.anarq.org/v1`
- **Local Development**: `http://localhost:8080/v1`

## Authentication

All API endpoints require authentication using sQuid identity tokens. Include the token in the Authorization header:

```http
Authorization: Bearer <your-squid-token>
```

## Rate Limiting

API requests are rate-limited per identity and DAO subnet:
- **Standard users**: 1000 requests per hour
- **DAO subnet**: 10000 requests per hour
- **System integrations**: Custom limits

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Quick Start

### 1. Create a Flow

```bash
curl -X POST https://api.qflow.anarq.org/v1/flows \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hello World Flow",
    "description": "A simple example flow",
    "steps": [
      {
        "id": "hello",
        "type": "task",
        "action": "log-message",
        "params": {
          "message": "Hello, World!"
        }
      }
    ],
    "metadata": {
      "tags": ["example", "hello-world"],
      "category": "tutorial"
    }
  }'
```

### 2. Start Flow Execution

```bash
curl -X POST https://api.qflow.anarq.org/v1/flows/{flowId}/start \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "inputData": {
      "user": "developer"
    },
    "priority": "normal"
  }'
```

### 3. Monitor Execution

```bash
curl -X GET https://api.qflow.anarq.org/v1/executions/{executionId} \
  -H "Authorization: Bearer <your-token>"
```

## API Endpoints

### Flow Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/flows` | List flows |
| POST | `/flows` | Create flow |
| GET | `/flows/{flowId}` | Get flow details |
| PUT | `/flows/{flowId}` | Update flow |
| DELETE | `/flows/{flowId}` | Delete flow |

### Execution Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/flows/{flowId}/start` | Start flow execution |
| POST | `/flows/{flowId}/trigger` | Trigger from external event |
| GET | `/executions/{executionId}` | Get execution status |
| POST | `/executions/{executionId}/pause` | Pause execution |
| POST | `/executions/{executionId}/resume` | Resume execution |
| POST | `/executions/{executionId}/abort` | Abort execution |

### Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/executions/{executionId}/logs` | Get execution logs |
| GET | `/executions/{executionId}/metrics` | Get execution metrics |
| GET | `/system/health` | System health check |
| GET | `/system/metrics` | System-wide metrics |

### External Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/{flowId}` | Webhook endpoint |
| GET | `/schemas` | Get supported event schemas |

## WebSocket API

Real-time updates are available via WebSocket connections:

### Execution Updates
```javascript
const ws = new WebSocket('wss://api.qflow.anarq.org/ws/executions/{executionId}');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Execution update:', update);
};
```

### System Metrics
```javascript
const ws = new WebSocket('wss://api.qflow.anarq.org/ws/system/metrics');
ws.onmessage = (event) => {
  const metrics = JSON.parse(event.data);
  console.log('System metrics:', metrics);
};
```

### DAO Events
```javascript
const ws = new WebSocket('wss://api.qflow.anarq.org/ws/dao/{daoId}/events');
ws.onmessage = (event) => {
  const event = JSON.parse(event.data);
  console.log('DAO event:', event);
};
```

## Flow Definition Format

Flows are defined using JSON/YAML with the following structure:

```json
{
  "name": "Example Flow",
  "description": "An example automation flow",
  "version": "1.0.0",
  "steps": [
    {
      "id": "step1",
      "type": "task",
      "action": "validate-input",
      "params": {
        "schema": "user-registration"
      },
      "onSuccess": "step2",
      "onFailure": "error-handler"
    },
    {
      "id": "step2",
      "type": "module-call",
      "action": "qmail.send-email",
      "params": {
        "template": "welcome",
        "recipient": "{{input.email}}"
      }
    }
  ],
  "metadata": {
    "tags": ["user-management", "email"],
    "category": "automation",
    "visibility": "dao-only",
    "requiredPermissions": ["user.create", "email.send"]
  }
}
```

## Step Types

### Task
Execute a predefined action or function:
```json
{
  "id": "validate-data",
  "type": "task",
  "action": "validate-schema",
  "params": {
    "schema": "user-input",
    "data": "{{input.userData}}"
  }
}
```

### Condition
Conditional branching based on data or state:
```json
{
  "id": "check-user-type",
  "type": "condition",
  "action": "evaluate-expression",
  "params": {
    "expression": "input.userType === 'premium'"
  },
  "onSuccess": "premium-flow",
  "onFailure": "standard-flow"
}
```

### Parallel
Execute multiple steps concurrently:
```json
{
  "id": "parallel-processing",
  "type": "parallel",
  "action": "execute-parallel",
  "params": {
    "steps": ["send-email", "update-database", "log-event"]
  }
}
```

### Module Call
Call other ecosystem modules:
```json
{
  "id": "send-notification",
  "type": "module-call",
  "action": "qmail.send-notification",
  "params": {
    "recipient": "{{input.userId}}",
    "message": "Welcome to the platform!"
  }
}
```

## Error Handling

The API uses standard HTTP status codes and provides detailed error information:

```json
{
  "error": "Validation failed",
  "details": {
    "field": "steps[0].action",
    "message": "Action 'invalid-action' is not supported"
  },
  "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
}
```

### Common Error Codes

- **400 Bad Request**: Invalid request parameters or body
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists or conflicting state
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

## Pagination

List endpoints support pagination using `limit` and `offset` parameters:

```bash
curl "https://api.qflow.anarq.org/v1/flows?limit=20&offset=40" \
  -H "Authorization: Bearer <your-token>"
```

Response includes pagination metadata:
```json
{
  "flows": [...],
  "pagination": {
    "limit": 20,
    "offset": 40,
    "total": 150,
    "hasMore": true
  }
}
```

## Filtering and Searching

### Flow Filtering
```bash
# Filter by DAO subnet
curl "https://api.qflow.anarq.org/v1/flows?daoSubnet=dao-123"

# Filter by tags
curl "https://api.qflow.anarq.org/v1/flows?tags=email,automation"

# Filter by status
curl "https://api.qflow.anarq.org/v1/flows?status=active"
```

### Log Filtering
```bash
# Filter logs by level
curl "https://api.qflow.anarq.org/v1/executions/{id}/logs?level=error"

# Limit log entries
curl "https://api.qflow.anarq.org/v1/executions/{id}/logs?limit=50&offset=100"
```

## Webhooks

External systems can trigger flows via webhooks:

```bash
curl -X POST https://api.qflow.anarq.org/v1/webhooks/{flowId} \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=..." \
  -d '{
    "eventType": "github.push",
    "repository": "my-repo",
    "branch": "main",
    "commits": [...]
  }'
```

### Webhook Security

Webhooks support signature verification:
1. Generate HMAC-SHA256 signature using your webhook secret
2. Include signature in `X-Webhook-Signature` header
3. Qflow verifies the signature before processing

## SDK Examples

### JavaScript/Node.js

```javascript
const QflowClient = require('@qflow/client');

const client = new QflowClient({
  baseURL: 'https://api.qflow.anarq.org/v1',
  token: 'your-squid-token'
});

// Create and start a flow
async function runFlow() {
  const flow = await client.flows.create({
    name: 'Data Processing Flow',
    steps: [
      {
        id: 'process',
        type: 'task',
        action: 'process-data',
        params: { source: 'database' }
      }
    ]
  });

  const execution = await client.flows.start(flow.id, {
    inputData: { batchId: '12345' }
  });

  console.log('Execution started:', execution.executionId);
}
```

### Python

```python
from qflow_client import QflowClient

client = QflowClient(
    base_url='https://api.qflow.anarq.org/v1',
    token='your-squid-token'
)

# Create and start a flow
flow = client.flows.create({
    'name': 'Data Processing Flow',
    'steps': [{
        'id': 'process',
        'type': 'task',
        'action': 'process-data',
        'params': {'source': 'database'}
    }]
})

execution = client.flows.start(flow['id'], {
    'inputData': {'batchId': '12345'}
})

print(f"Execution started: {execution['executionId']}")
```

## Best Practices

### 1. Flow Design
- Keep flows modular and reusable
- Use meaningful step IDs and descriptions
- Implement proper error handling
- Set appropriate timeouts and retry policies

### 2. Security
- Always use HTTPS in production
- Rotate authentication tokens regularly
- Validate webhook signatures
- Use least-privilege permissions

### 3. Performance
- Use pagination for large result sets
- Implement client-side caching where appropriate
- Monitor execution metrics
- Set appropriate resource limits

### 4. Monitoring
- Use WebSocket connections for real-time updates
- Implement proper logging and alerting
- Monitor system health endpoints
- Track execution metrics

## Support

- **Documentation**: [https://docs.qflow.anarq.org](https://docs.qflow.anarq.org)
- **GitHub**: [https://github.com/anarq/qflow](https://github.com/anarq/qflow)
- **Support Email**: support@anarq.org
- **Community**: [https://community.anarq.org](https://community.anarq.org)

## Changelog

### v1.0.0 (Current)
- Initial API release
- Flow management endpoints
- Execution control
- Real-time monitoring
- Webhook integration
- Multi-tenant DAO support