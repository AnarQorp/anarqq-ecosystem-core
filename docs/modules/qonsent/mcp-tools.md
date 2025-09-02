# qonsent - MCP Tools

Policies & Permissions module with UCAN policy engine

## Overview

This module provides Model Context Protocol (MCP) tools for serverless integration with the Q ecosystem. MCP tools enable function-based interactions that are ideal for AI agents and serverless environments.

## Connection

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/qonsent',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});

await client.connect();
```

## Tools


### qonsent.check

Check if an identity has permission to perform an action on a resource

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| resource | string | Yes | Resource identifier (e.g., 'qdrive:file:abc123') |
| identity | string | Yes | Identity DID to check permissions for |
| action | string | Yes | Action to check (e.g., 'read', 'write', 'delete') |
| context | object | No | Additional context for permission check |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| allowed | boolean | No | Whether the action is allowed |
| reason | string | No | Reason for the decision |
| policy | object | No | Applied policy details |
| expiresAt | string | No | When the permission expires |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qonsent.check', {
  resource: "string",
  identity: "string",
  action: "string",
  context: {},
});
console.log(result);
```


### qonsent.grant

Grant permissions to an identity for a resource

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| resource | string | Yes | Resource identifier |
| identity | string | Yes | Target identity DID |
| permissions | array | Yes | List of permissions to grant |
| expiresAt | string | No | Optional expiration time |
| conditions | object | No | Additional conditions for the grant |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| grantId | string | No | Unique identifier for the grant |
| resource | string | No |  |
| identity | string | No |  |
| permissions | array | No |  |
| expiresAt | string | No |  |
| createdAt | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qonsent.grant', {
  resource: "string",
  identity: "string",
  permissions: [],
  expiresAt: "2024-01-01T00:00:00Z",
  conditions: {},
});
console.log(result);
```


### qonsent.revoke

Revoke permissions from an identity for a resource

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| resource | string | Yes | Resource identifier |
| identity | string | Yes | Target identity DID |
| permissions | array | No | Specific permissions to revoke (if empty, revokes all) |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| resource | string | No |  |
| identity | string | No |  |
| revokedPermissions | array | No |  |
| revokedAt | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qonsent.revoke', {
  resource: "string",
  identity: "string",
  permissions: [],
});
console.log(result);
```







## Error Handling

MCP tools return standardized error responses:

```javascript
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {}
}
```

## Best Practices

1. **Always check success status** before processing results
2. **Handle errors gracefully** with appropriate fallbacks
3. **Use idempotency keys** for write operations
4. **Implement retry logic** with exponential backoff
5. **Cache results** when appropriate to reduce API calls

## Integration Examples

See the [Integration Guide](./integration-guide.md) for complete examples.
