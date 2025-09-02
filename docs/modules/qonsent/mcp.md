# Qonsent MCP Tools

## Overview
Policies & Permissions module with UCAN policy engine

## Available Tools

## qonsent.check

Check if an identity has permission to perform an action on a resource

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "resource": {
      "type": "string",
      "description": "Resource identifier (e.g., 'qdrive:file:abc123')"
    },
    "identity": {
      "type": "string",
      "description": "Identity DID to check permissions for"
    },
    "action": {
      "type": "string",
      "description": "Action to check (e.g., 'read', 'write', 'delete')"
    },
    "context": {
      "type": "object",
      "description": "Additional context for permission check",
      "additionalProperties": true
    }
  },
  "required": [
    "resource",
    "identity",
    "action"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "allowed": {
      "type": "boolean",
      "description": "Whether the action is allowed"
    },
    "reason": {
      "type": "string",
      "description": "Reason for the decision"
    },
    "policy": {
      "type": "object",
      "description": "Applied policy details"
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time",
      "description": "When the permission expires"
    }
  }
}
```


## qonsent.grant

Grant permissions to an identity for a resource

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "resource": {
      "type": "string",
      "description": "Resource identifier"
    },
    "identity": {
      "type": "string",
      "description": "Target identity DID"
    },
    "permissions": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of permissions to grant"
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time",
      "description": "Optional expiration time"
    },
    "conditions": {
      "type": "object",
      "description": "Additional conditions for the grant",
      "additionalProperties": true
    }
  },
  "required": [
    "resource",
    "identity",
    "permissions"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "grantId": {
      "type": "string",
      "description": "Unique identifier for the grant"
    },
    "resource": {
      "type": "string"
    },
    "identity": {
      "type": "string"
    },
    "permissions": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```


## qonsent.revoke

Revoke permissions from an identity for a resource

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "resource": {
      "type": "string",
      "description": "Resource identifier"
    },
    "identity": {
      "type": "string",
      "description": "Target identity DID"
    },
    "permissions": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Specific permissions to revoke (if empty, revokes all)"
    }
  },
  "required": [
    "resource",
    "identity"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "resource": {
      "type": "string"
    },
    "identity": {
      "type": "string"
    },
    "revokedPermissions": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "revokedAt": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```


## Usage Examples

### qonsent.check Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qonsent');

const result = await client.callTool('qonsent.check', {
  "resource": "string",
  "identity": "string",
  "action": "string",
  "context": {}
});

console.log(result);
// Expected output structure:
// {
  "allowed": true,
  "reason": "string",
  "policy": {},
  "expiresAt": "string"
}
```


### qonsent.grant Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qonsent');

const result = await client.callTool('qonsent.grant', {
  "resource": "string",
  "identity": "string",
  "permissions": [
    "string"
  ],
  "expiresAt": "string",
  "conditions": {}
});

console.log(result);
// Expected output structure:
// {
  "grantId": "string",
  "resource": "string",
  "identity": "string",
  "permissions": [
    "string"
  ],
  "expiresAt": "string",
  "createdAt": "string"
}
```


## Integration Guide

## Installation

```bash
npm install @anarq/qonsent-client
```

## Configuration

```javascript
import { QonsentClient } from '@anarq/qonsent-client';

const client = new QonsentClient({
  url: 'http://localhost:3030',
  apiKey: process.env.QONSENT_API_KEY,
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

