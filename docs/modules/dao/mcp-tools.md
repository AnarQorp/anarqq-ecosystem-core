# dao - MCP Tools

DAO/Communities governance tools for the Q ecosystem

## Overview

This module provides Model Context Protocol (MCP) tools for serverless integration with the Q ecosystem. MCP tools enable function-based interactions that are ideal for AI agents and serverless environments.

## Connection

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/dao',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});

await client.connect();
```

## Tools


### dao.vote

Cast a vote on a DAO proposal

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| daoId | string | Yes | DAO identifier |
| proposalId | string | Yes | Proposal identifier |
| voterId | string | Yes | Voter's sQuid identity |
| option | string | Yes | Voting option (e.g., 'Yes', 'No', 'Abstain') |
| signature | string | Yes | Cryptographic signature of the vote |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| voteId | string | No |  |
| weight | number | No |  |
| timestamp | string | No |  |
| proposalStatus | object | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('dao.vote', {
  daoId: "string",
  proposalId: "string",
  voterId: "string",
  option: "string",
  signature: "string",
});
console.log(result);
```


### dao.propose

Create a new proposal in a DAO

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| daoId | string | Yes | DAO identifier |
| title | string | Yes | Proposal title |
| description | string | Yes | Detailed proposal description |
| options | array | No | Voting options |
| duration | integer | No | Voting duration in milliseconds (optional) |
| creatorId | string | Yes | Creator's sQuid identity |
| signature | string | Yes | Cryptographic signature of the proposal |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| proposalId | string | No |  |
| title | string | No |  |
| expiresAt | string | No |  |
| quorum | integer | No |  |
| status | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('dao.propose', {
  daoId: "string",
  title: "string",
  description: "string",
  options: [],
  duration: 0,
  creatorId: "string",
  signature: "string",
});
console.log(result);
```


### dao.execute

Execute an approved DAO proposal

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| daoId | string | Yes | DAO identifier |
| proposalId | string | Yes | Proposal identifier |
| executorId | string | Yes | Executor's sQuid identity |
| signature | string | Yes | Cryptographic signature of the execution request |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| proposalId | string | No |  |
| executedAt | string | No |  |
| executionResult | object | No | Result of the proposal execution |
| transactionHash | string | No | Blockchain transaction hash (if applicable) |

#### Usage Example

```javascript
const result = await mcpClient.callTool('dao.execute', {
  daoId: "string",
  proposalId: "string",
  executorId: "string",
  signature: "string",
});
console.log(result);
```


### dao.getProposal

Get detailed information about a specific proposal

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| daoId | string | Yes | DAO identifier |
| proposalId | string | Yes | Proposal identifier |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| proposal | object | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('dao.getProposal', {
  daoId: "string",
  proposalId: "string",
});
console.log(result);
```


### dao.getDAOInfo

Get information about a DAO

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| daoId | string | Yes | DAO identifier |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| dao | object | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('dao.getDAOInfo', {
  daoId: "string",
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
