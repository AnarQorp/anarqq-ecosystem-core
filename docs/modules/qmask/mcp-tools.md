# qmask - MCP Tools

Privacy & Anonymization module with privacy profile management

## Overview

This module provides Model Context Protocol (MCP) tools for serverless integration with the Q ecosystem. MCP tools enable function-based interactions that are ideal for AI agents and serverless environments.

## Connection

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/qmask',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});

await client.connect();
```

## Tools


### qmask.apply

Apply privacy masking to data using a specified profile

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes | Data object to apply masking to |
| profileName | string | Yes | Name of the privacy profile to apply |
| context | object | No | Additional context for masking decisions |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| maskedData | object | No | Data with privacy masking applied |
| appliedRules | array | No | List of rules that were applied |
| riskScore | number | No | Re-identification risk score (0-1) |
| complianceFlags | array | No | Compliance requirements met |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qmask.apply', {
  data: {},
  profileName: "string",
  context: {},
});
console.log(result);
```


### qmask.profile

Manage privacy profiles - create, update, retrieve, or delete

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| action | string | Yes | Action to perform on the profile |
| profileName | string | No | Name of the profile (required for all actions except list) |
| profile | object | No | Profile data (required for create/update) |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| profile | object | No | Profile data (for get/create/update actions) |
| profiles | array | No | List of profiles (for list action) |
| message | string | No | Operation result message |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qmask.profile', {
  action: "create",
  profileName: "string",
  profile: {},
});
console.log(result);
```


### qmask.assess

Perform privacy impact assessment on data processing operations

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| operation | object | Yes |  |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| riskLevel | string | No | Overall privacy risk level |
| riskScore | number | No | Numerical risk score (0-1) |
| risks | array | No | Identified privacy risks |
| recommendations | array | No | Privacy protection recommendations |
| complianceRequirements | array | No | Applicable compliance requirements |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qmask.assess', {
  operation: {},
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
