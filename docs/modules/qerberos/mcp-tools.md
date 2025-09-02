# qerberos - MCP Tools

Qerberos Security & Audit MCP Tools

## Overview

This module provides Model Context Protocol (MCP) tools for serverless integration with the Q ecosystem. MCP tools enable function-based interactions that are ideal for AI agents and serverless environments.

## Connection

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/qerberos',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});

await client.connect();
```

## Tools


### qerberos.audit

Log an audit event to the immutable audit trail

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| type | string | Yes | Event type (e.g., 'access', 'modification', 'deletion') |
| ref | string | Yes | Reference to the resource or operation |
| actor | object | Yes | Identity reference of the actor |
| layer | string | Yes | Layer or service that generated the event |
| verdict | string | Yes | Verdict of the operation |
| details | object | No | Additional event details |
| cid | string | No | IPFS CID if applicable |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | string | No | Audit event ID |
| cid | string | No | IPFS CID of the audit event |
| timestamp | string | No | Event timestamp |
| signature | string | No | Cryptographic signature of the event |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qerberos.audit', {
  type: "string",
  ref: "string",
  actor: {},
  layer: "string",
  verdict: "ALLOW",
  details: {},
  cid: "string",
});
console.log(result);
```


### qerberos.riskScore

Calculate risk score for an identity or operation

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| identity | string | Yes | Identity ID to assess |
| operation | string | No | Operation being performed (optional) |
| context | object | No | Additional context for risk assessment |
| factors | array | No | Specific risk factors to consider |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| identity | string | No | Identity ID |
| score | number | No | Risk score (0 = low risk, 1 = high risk) |
| level | string | No | Risk level classification |
| factors | array | No | Risk factors and their contributions |
| timestamp | string | No | Assessment timestamp |
| expiresAt | string | No | When the risk score expires |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qerberos.riskScore', {
  identity: "string",
  operation: "string",
  context: {},
  factors: [],
});
console.log(result);
```


### qerberos.detectAnomaly

Detect anomalies in data using ML-based analysis

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | object | Yes | Data to analyze for anomalies |
| model | string | No | ML model to use for detection (optional) |
| threshold | number | No | Anomaly threshold (optional, default: 0.8) |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| anomalies | array | No | Detected anomalies |
| summary | object | No | Summary of anomaly detection results |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qerberos.detectAnomaly', {
  data: {},
  model: "string",
  threshold: 0,
});
console.log(result);
```


### qerberos.getAlerts

Retrieve active security alerts and anomalies

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| severity | string | No | Filter by alert severity (optional) |
| status | string | No | Filter by alert status (optional) |
| limit | integer | No | Maximum number of alerts to return (optional, default: 100) |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| alerts | array | No | Security alerts |
| totalCount | integer | No | Total number of alerts matching criteria |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qerberos.getAlerts', {
  severity: "low",
  status: "active",
  limit: 0,
});
console.log(result);
```


### qerberos.complianceReport

Generate automated compliance report

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| type | string | No | Report type (optional, default: gdpr) |
| startDate | string | No | Report start date (optional) |
| endDate | string | No | Report end date (optional) |
| format | string | No | Report format (optional, default: json) |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| reportId | string | No | Report ID |
| type | string | No | Report type |
| period | object | No | Report period |
| summary | object | No | Report summary |
| violations | array | No | Compliance violations found |
| recommendations | array | No | Compliance recommendations |
| generatedAt | string | No | Report generation timestamp |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qerberos.complianceReport', {
  type: "gdpr",
  startDate: "2024-01-01T00:00:00Z",
  endDate: "2024-01-01T00:00:00Z",
  format: "json",
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
