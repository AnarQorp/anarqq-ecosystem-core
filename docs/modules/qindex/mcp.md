# Qindex MCP Tools

## Overview
Qindex MCP Tools for indexing and pointer management

## Available Tools

## qindex.put

Store an indexed record with optional metadata and encryption

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "description": "Unique identifier for the record"
    },
    "value": {
      "type": "object",
      "description": "Record data to store"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "contentType": {
          "type": "string",
          "description": "MIME type of the content"
        },
        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Tags for categorization and search"
        },
        "ttl": {
          "type": "integer",
          "description": "Time to live in seconds"
        }
      }
    },
    "options": {
      "type": "object",
      "properties": {
        "encrypt": {
          "type": "boolean",
          "default": false,
          "description": "Whether to encrypt the record"
        },
        "pin": {
          "type": "boolean",
          "default": true,
          "description": "Whether to pin in IPFS"
        }
      }
    }
  },
  "required": [
    "key",
    "value"
  ]
}
```

**Output Schema:**
```json
undefined
```


## qindex.get

Retrieve a record by key with optional version specification

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "description": "Record key to retrieve"
    },
    "version": {
      "type": "string",
      "description": "Specific version to retrieve (optional)"
    }
  },
  "required": [
    "key"
  ]
}
```

**Output Schema:**
```json
undefined
```


## qindex.list

List records with filtering and pagination

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "prefix": {
      "type": "string",
      "description": "Key prefix filter"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Filter by tags"
    },
    "limit": {
      "type": "integer",
      "default": 50,
      "maximum": 1000,
      "description": "Maximum number of records to return"
    },
    "offset": {
      "type": "integer",
      "default": 0,
      "description": "Number of records to skip"
    },
    "sort": {
      "type": "string",
      "enum": [
        "created_asc",
        "created_desc",
        "updated_asc",
        "updated_desc"
      ],
      "default": "created_desc",
      "description": "Sort order"
    }
  }
}
```

**Output Schema:**
```json
undefined
```


## qindex.history

Get the version history of a record

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "description": "Record key to get history for"
    },
    "limit": {
      "type": "integer",
      "default": 50,
      "maximum": 1000,
      "description": "Maximum number of history entries to return"
    }
  },
  "required": [
    "key"
  ]
}
```

**Output Schema:**
```json
undefined
```


## qindex.delete

Remove a record from the index

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "description": "Record key to delete"
    }
  },
  "required": [
    "key"
  ]
}
```

**Output Schema:**
```json
undefined
```


## Usage Examples

### qindex.put Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qindex');

const result = await client.callTool('qindex.put', {
  "key": "string",
  "value": {},
  "metadata": {
    "contentType": "string",
    "tags": [
      "string"
    ],
    "ttl": 123
  },
  "options": {
    "encrypt": true,
    "pin": true
  }
});

console.log(result);
// Expected output structure:
// {}
```


### qindex.get Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qindex');

const result = await client.callTool('qindex.get', {
  "key": "string",
  "version": "string"
});

console.log(result);
// Expected output structure:
// {}
```


## Integration Guide

## Installation

```bash
npm install @anarq/qindex-client
```

## Configuration

```javascript
import { QindexClient } from '@anarq/qindex-client';

const client = new QindexClient({
  url: 'http://localhost:3040',
  apiKey: process.env.QINDEX_API_KEY,
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

