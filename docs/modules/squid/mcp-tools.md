# squid - MCP Tools

sQuid Identity & Subidentities MCP Tools

## Overview

This module provides Model Context Protocol (MCP) tools for serverless integration with the Q ecosystem. MCP tools enable function-based interactions that are ideal for AI agents and serverless environments.

## Connection

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/squid',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});

await client.connect();
```

## Tools


### squid.verifyIdentity

Verify identity ownership and authenticity

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| identityId | string | Yes | Identity DID to verify |
| signature | string | Yes | Cryptographic signature for verification |
| message | string | Yes | Message that was signed |
| timestamp | string | No | Timestamp of the verification request |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| verified | boolean | No | Whether the identity is verified |
| identity | any | No |  |
| verificationLevel | string | No |  |
| reputation | number | No |  |
| timestamp | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('squid.verifyIdentity', {
  identityId: "string",
  signature: "string",
  message: "string",
  timestamp: "2024-01-01T00:00:00Z",
});
console.log(result);
```


### squid.activeContext

Get active identity context for current session

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| sessionId | string | No | Session identifier |
| includeSubidentities | boolean | No | Include subidentities in the context |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| activeIdentity | any | No |  |
| subidentities | array | No |  |
| permissions | array | No |  |
| sessionInfo | object | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('squid.activeContext', {
  sessionId: "string",
  includeSubidentities: false,
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
