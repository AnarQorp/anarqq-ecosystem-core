# qlock - MCP Tools

Qlock encryption, signatures, and distributed locks

## Overview

This module provides Model Context Protocol (MCP) tools for serverless integration with the Q ecosystem. MCP tools enable function-based interactions that are ideal for AI agents and serverless environments.

## Connection

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/qlock',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});

await client.connect();
```

## Tools


### qlock.encrypt

Encrypt data using specified algorithm and key

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | string | Yes | Data to encrypt (base64 encoded for binary data) |
| algorithm | string | No | Encryption algorithm to use |
| keyId | string | No | Key identifier (optional, will generate if not provided) |
| identityId | string | Yes | Identity ID for key derivation |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qlock.encrypt', {
  data: "string",
  algorithm: "AES-256-GCM",
  keyId: "string",
  identityId: "string",
});
console.log(result);
```


### qlock.decrypt

Decrypt data using private key

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| encryptedData | string | Yes | Encrypted data to decrypt |
| keyId | string | Yes | Key identifier used for encryption |
| identityId | string | Yes | Identity ID for key derivation |
| metadata | object | No | Encryption metadata |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qlock.decrypt', {
  encryptedData: "string",
  keyId: "string",
  identityId: "string",
  metadata: {},
});
console.log(result);
```


### qlock.sign

Create digital signature for data

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | string | Yes | Data to sign |
| algorithm | string | No | Signature algorithm to use |
| identityId | string | Yes | Identity ID for signing key |
| keyId | string | No | Specific key ID (optional) |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qlock.sign', {
  data: "string",
  algorithm: "ECDSA-P256",
  identityId: "string",
  keyId: "string",
});
console.log(result);
```


### qlock.verify

Verify digital signature

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | string | Yes | Original data that was signed |
| signature | string | Yes | Digital signature to verify |
| publicKey | string | Yes | Public key for verification |
| algorithm | string | No | Signature algorithm used |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qlock.verify', {
  data: "string",
  signature: "string",
  publicKey: "string",
  algorithm: "string",
});
console.log(result);
```


### qlock.lock

Acquire or release distributed lock

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| action | string | Yes | Lock action to perform |
| lockId | string | Yes | Lock identifier |
| ttl | integer | No | Lock TTL in milliseconds |
| identityId | string | Yes | Identity acquiring the lock |
| metadata | object | No | Additional lock metadata |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qlock.lock', {
  action: "acquire",
  lockId: "string",
  ttl: 0,
  identityId: "string",
  metadata: {},
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
