# qnet - MCP Tools

QNET Network Infrastructure MCP Tools

## Overview

This module provides Model Context Protocol (MCP) tools for serverless integration with the Q ecosystem. MCP tools enable function-based interactions that are ideal for AI agents and serverless environments.

## Connection

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/qnet',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});

await client.connect();
```

## Tools


### qnet.ping

Ping network nodes to test connectivity and measure latency

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| nodeId | string | No | Target node identifier (optional, pings all nodes if not specified) |
| timeout | integer | No | Ping timeout in milliseconds |
| count | integer | No | Number of ping attempts |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| results | array | No |  |
| summary | object | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qnet.ping', {
  nodeId: "string",
  timeout: 0,
  count: 0,
});
console.log(result);
```


### qnet.capabilities

Get network capabilities and available services

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| nodeId | string | No | Specific node to query (optional, returns network-wide capabilities if not specified) |
| service | string | No | Filter by specific service type |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| services | array | No |  |
| protocols | array | No |  |
| regions | array | No |  |
| features | object | No |  |
| nodeCapabilities | object | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qnet.capabilities', {
  nodeId: "string",
  service: "string",
});
console.log(result);
```


### qnet.status

Get comprehensive network status and health information

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| includeMetrics | boolean | No | Include detailed performance metrics |
| includeTopology | boolean | No | Include network topology information |
| region | string | No | Filter by specific region |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| network | object | No |  |
| regions | object | No |  |
| services | object | No |  |
| metrics | object | No | Included if includeMetrics is true |
| topology | object | No | Included if includeTopology is true |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qnet.status', {
  includeMetrics: false,
  includeTopology: false,
  region: "string",
});
console.log(result);
```




## Resources

### Network Nodes

**URI**: qnet://nodes

List of all network nodes and their status

### Network Topology

**URI**: qnet://topology

Current network topology and connections

### Network Metrics

**URI**: qnet://metrics

Real-time network performance metrics





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
