# Squid MCP Tools

## Overview
sQuid Identity & Subidentities MCP Tools

## Available Tools

## squid.verifyIdentity

Verify identity ownership and authenticity

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "identityId": {
      "type": "string",
      "format": "uuid",
      "description": "Identity DID to verify"
    },
    "signature": {
      "type": "string",
      "description": "Cryptographic signature for verification"
    },
    "message": {
      "type": "string",
      "description": "Message that was signed"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp of the verification request"
    }
  },
  "required": [
    "identityId",
    "signature",
    "message"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "verified": {
      "type": "boolean",
      "description": "Whether the identity is verified"
    },
    "identity": {
      "$ref": "#/definitions/Identity"
    },
    "verificationLevel": {
      "type": "string",
      "enum": [
        "UNVERIFIED",
        "BASIC",
        "ENHANCED",
        "INSTITUTIONAL"
      ]
    },
    "reputation": {
      "type": "number",
      "minimum": 0,
      "maximum": 1000
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```


## squid.activeContext

Get active identity context for current session

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Session identifier"
    },
    "includeSubidentities": {
      "type": "boolean",
      "default": false,
      "description": "Include subidentities in the context"
    }
  }
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "activeIdentity": {
      "$ref": "#/definitions/Identity"
    },
    "subidentities": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/Identity"
      }
    },
    "permissions": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "sessionInfo": {
      "type": "object",
      "properties": {
        "sessionId": {
          "type": "string"
        },
        "startedAt": {
          "type": "string",
          "format": "date-time"
        },
        "lastActivity": {
          "type": "string",
          "format": "date-time"
        }
      }
    }
  }
}
```


## Usage Examples

### squid.verifyIdentity Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('squid');

const result = await client.callTool('squid.verifyIdentity', {
  "identityId": "string",
  "signature": "string",
  "message": "string",
  "timestamp": "string"
});

console.log(result);
// Expected output structure:
// {
  "verified": true,
  "identity": null,
  "verificationLevel": "UNVERIFIED",
  "reputation": 123,
  "timestamp": "string"
}
```


### squid.activeContext Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('squid');

const result = await client.callTool('squid.activeContext', {
  "sessionId": "string",
  "includeSubidentities": true
});

console.log(result);
// Expected output structure:
// {
  "activeIdentity": null,
  "subidentities": [
    null
  ],
  "permissions": [
    "string"
  ],
  "sessionInfo": {
    "sessionId": "string",
    "startedAt": "string",
    "lastActivity": "string"
  }
}
```


## Integration Guide

## Installation

```bash
npm install @anarq/squid-client
```

## Configuration

```javascript
import { SquidClient } from '@anarq/squid-client';

const client = new SquidClient({
  url: 'http://localhost:3010',
  apiKey: process.env.SQUID_API_KEY,
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

