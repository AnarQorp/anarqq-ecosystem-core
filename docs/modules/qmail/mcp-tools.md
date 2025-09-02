# qmail - MCP Tools

Qmail MCP Tools - Certified Messaging Module

## Overview

This module provides Model Context Protocol (MCP) tools for serverless integration with the Q ecosystem. MCP tools enable function-based interactions that are ideal for AI agents and serverless environments.

## Connection

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/qmail',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});

await client.connect();
```

## Tools


### qmail.send

Send encrypted message with certified delivery

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| squidId | string | Yes | Sender sQuid identity ID |
| recipientId | string | Yes | Recipient sQuid identity ID |
| subject | string | Yes | Message subject |
| content | string | Yes | Message content (will be encrypted) |
| encryptionLevel | string | No | Encryption level |
| priority | string | No | Message priority |
| certifiedDelivery | boolean | No | Request certified delivery receipt |
| expiresIn | integer | No | Message expiration in seconds (optional) |
| attachments | array | No | File attachments (IPFS CIDs) |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| messageId | string | No |  |
| status | string | No |  |
| encryptedCid | string | No | IPFS CID of encrypted message |
| deliveryTracking | string | No | Delivery tracking ID |
| timestamp | string | No |  |
| expiresAt | string | No |  |
| error | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qmail.send', {
  squidId: "string",
  recipientId: "string",
  subject: "string",
  content: "string",
  encryptionLevel: "STANDARD",
  priority: "LOW",
  certifiedDelivery: false,
  expiresIn: 0,
  attachments: [],
});
console.log(result);
```


### qmail.fetch

Fetch messages from inbox with decryption

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| squidId | string | Yes | Recipient sQuid identity ID |
| folder | string | No | Message folder |
| limit | integer | No | Maximum messages to fetch |
| offset | integer | No | Pagination offset |
| unreadOnly | boolean | No | Fetch only unread messages |
| since | string | No | Fetch messages since timestamp |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| messages | array | No |  |
| totalCount | integer | No |  |
| unreadCount | integer | No |  |
| hasMore | boolean | No |  |
| error | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qmail.fetch', {
  squidId: "string",
  folder: "INBOX",
  limit: 0,
  offset: 0,
  unreadOnly: false,
  since: "2024-01-01T00:00:00Z",
});
console.log(result);
```


### qmail.receipt

Generate or verify delivery receipt

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| messageId | string | Yes | Message ID for receipt |
| squidId | string | Yes | Recipient sQuid identity ID |
| action | string | Yes | Receipt action |
| receiptData | string | No | Receipt data for verification (base64 encoded) |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| receiptId | string | No |  |
| receiptData | string | No | Cryptographic receipt (base64 encoded) |
| timestamp | string | No |  |
| verified | boolean | No | Receipt verification result |
| signature | string | No | Cryptographic signature |
| error | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qmail.receipt', {
  messageId: "string",
  squidId: "string",
  action: "GENERATE",
  receiptData: "string",
});
console.log(result);
```


### qmail.search

Search messages with encrypted content support

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| squidId | string | Yes | Searcher sQuid identity ID |
| query | string | Yes | Search query |
| folder | string | No | Search scope |
| dateRange | object | No | Date range filter |
| limit | integer | No | Maximum results |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| results | array | No |  |
| totalMatches | integer | No |  |
| searchTime | number | No | Search time in milliseconds |
| error | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qmail.search', {
  squidId: "string",
  query: "string",
  folder: "ALL",
  dateRange: {},
  limit: 0,
});
console.log(result);
```




## Resources

### Message Store

**URI**: qmail://messages

Access to encrypted message storage and retrieval

### Delivery Receipts

**URI**: qmail://receipts

Access to cryptographic delivery receipts

### Message Audit Trail

**URI**: qmail://audit

Access to message audit logs and compliance data




## Prompts

### message-summary

Generate message summary for identity

#### Arguments

- **squidId**: sQuid identity ID (required)
- **period**: Time period (7d, 30d, 90d)

### compliance-report

Generate GDPR compliance report

#### Arguments

- **squidId**: sQuid identity ID (required)
- **reportType**: Report type (retention, deletion, access)



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
