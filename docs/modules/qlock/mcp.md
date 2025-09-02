# Qlock MCP Tools

## Overview
Qlock encryption, signatures, and distributed locks

## Available Tools

## qlock.encrypt

Encrypt data using specified algorithm and key

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "string",
      "description": "Data to encrypt (base64 encoded for binary data)"
    },
    "algorithm": {
      "type": "string",
      "enum": [
        "AES-256-GCM",
        "ChaCha20-Poly1305",
        "Kyber-768",
        "Dilithium-3"
      ],
      "default": "AES-256-GCM",
      "description": "Encryption algorithm to use"
    },
    "keyId": {
      "type": "string",
      "description": "Key identifier (optional, will generate if not provided)"
    },
    "identityId": {
      "type": "string",
      "description": "Identity ID for key derivation"
    }
  },
  "required": [
    "data",
    "identityId"
  ]
}
```

**Output Schema:**
```json
undefined
```


## qlock.decrypt

Decrypt data using private key

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "encryptedData": {
      "type": "string",
      "description": "Encrypted data to decrypt"
    },
    "keyId": {
      "type": "string",
      "description": "Key identifier used for encryption"
    },
    "identityId": {
      "type": "string",
      "description": "Identity ID for key derivation"
    },
    "metadata": {
      "type": "object",
      "description": "Encryption metadata"
    }
  },
  "required": [
    "encryptedData",
    "keyId",
    "identityId"
  ]
}
```

**Output Schema:**
```json
undefined
```


## qlock.sign

Create digital signature for data

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "string",
      "description": "Data to sign"
    },
    "algorithm": {
      "type": "string",
      "enum": [
        "ECDSA-P256",
        "RSA-PSS",
        "Dilithium-3",
        "Falcon-512"
      ],
      "default": "ECDSA-P256",
      "description": "Signature algorithm to use"
    },
    "identityId": {
      "type": "string",
      "description": "Identity ID for signing key"
    },
    "keyId": {
      "type": "string",
      "description": "Specific key ID (optional)"
    }
  },
  "required": [
    "data",
    "identityId"
  ]
}
```

**Output Schema:**
```json
undefined
```


## qlock.verify

Verify digital signature

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "string",
      "description": "Original data that was signed"
    },
    "signature": {
      "type": "string",
      "description": "Digital signature to verify"
    },
    "publicKey": {
      "type": "string",
      "description": "Public key for verification"
    },
    "algorithm": {
      "type": "string",
      "description": "Signature algorithm used"
    }
  },
  "required": [
    "data",
    "signature",
    "publicKey"
  ]
}
```

**Output Schema:**
```json
undefined
```


## qlock.lock

Acquire or release distributed lock

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": [
        "acquire",
        "release",
        "extend"
      ],
      "description": "Lock action to perform"
    },
    "lockId": {
      "type": "string",
      "description": "Lock identifier"
    },
    "ttl": {
      "type": "integer",
      "default": 30000,
      "description": "Lock TTL in milliseconds"
    },
    "identityId": {
      "type": "string",
      "description": "Identity acquiring the lock"
    },
    "metadata": {
      "type": "object",
      "description": "Additional lock metadata"
    }
  },
  "required": [
    "action",
    "lockId",
    "identityId"
  ]
}
```

**Output Schema:**
```json
undefined
```


## Usage Examples

### qlock.encrypt Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qlock');

const result = await client.callTool('qlock.encrypt', {
  "data": "string",
  "algorithm": "AES-256-GCM",
  "keyId": "string",
  "identityId": "string"
});

console.log(result);
// Expected output structure:
// {}
```


### qlock.decrypt Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qlock');

const result = await client.callTool('qlock.decrypt', {
  "encryptedData": "string",
  "keyId": "string",
  "identityId": "string",
  "metadata": {}
});

console.log(result);
// Expected output structure:
// {}
```


## Integration Guide

## Installation

```bash
npm install @anarq/qlock-client
```

## Configuration

```javascript
import { QlockClient } from '@anarq/qlock-client';

const client = new QlockClient({
  url: 'http://localhost:3020',
  apiKey: process.env.QLOCK_API_KEY,
  timeout: 30000
});
```

## Error Handling

```javascript
try {
  const result = await client.callTool('toolName', params);
} catch (error) {
  if (error.code === 'TIMEOUT') {
    // Handle timeout
  } else if (error.code === 'AUTH_FAILED') {
    // Handle authentication failure
  } else {
    // Handle other errors
  }
}
```


## Error Handling

## Common Error Codes

- **INVALID_INPUT**: Input parameters don't match schema
- **AUTH_FAILED**: Authentication or authorization failed
- **RESOURCE_NOT_FOUND**: Requested resource doesn't exist
- **RATE_LIMIT_EXCEEDED**: Too many requests
- **SERVICE_UNAVAILABLE**: Service temporarily unavailable
- **TIMEOUT**: Request timed out

## Error Response Format

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {
    "field": "Additional error details"
  }
}
```

