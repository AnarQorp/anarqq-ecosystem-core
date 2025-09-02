# qindex - MCP Tools

Qindex MCP Tools for indexing and pointer management

## Overview

This module provides Model Context Protocol (MCP) tools for serverless integration with the Q ecosystem. MCP tools enable function-based interactions that are ideal for AI agents and serverless environments.

## Connection

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/qindex',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});

await client.connect();
```

## Tools


### qindex.put

Store an indexed record with optional metadata and encryption

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| key | string | Yes | Unique identifier for the record |
| value | object | Yes | Record data to store |
| metadata | object | No |  |
| options | object | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qindex.put', {
  key: "string",
  value: {},
  metadata: {},
  options: {},
});
console.log(result);
```


### qindex.get

Retrieve a record by key with optional version specification

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| key | string | Yes | Record key to retrieve |
| version | string | No | Specific version to retrieve (optional) |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qindex.get', {
  key: "string",
  version: "string",
});
console.log(result);
```


### qindex.list

List records with filtering and pagination

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| prefix | string | No | Key prefix filter |
| tags | array | No | Filter by tags |
| limit | integer | No | Maximum number of records to return |
| offset | integer | No | Number of records to skip |
| sort | string | No | Sort order |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qindex.list', {
  prefix: "string",
  tags: [],
  limit: 0,
  offset: 0,
  sort: "created_asc",
});
console.log(result);
```


### qindex.history

Get the version history of a record

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| key | string | Yes | Record key to get history for |
| limit | integer | No | Maximum number of history entries to return |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qindex.history', {
  key: "string",
  limit: 0,
});
console.log(result);
```


### qindex.delete

Remove a record from the index

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| key | string | Yes | Record key to delete |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qindex.delete', {
  key: "string",
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
