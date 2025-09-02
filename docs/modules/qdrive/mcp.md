# Qdrive MCP Tools

## Overview
Decentralized file storage with IPFS integration and encryption

## Available Tools

## qdrive.put

Upload file with metadata to Qdrive

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "file": {
      "type": "string",
      "description": "Base64 encoded file content or file path"
    },
    "filename": {
      "type": "string",
      "description": "Name of the file"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "description": {
          "type": "string",
          "description": "File description"
        },
        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "File tags for categorization"
        },
        "privacy": {
          "type": "string",
          "enum": [
            "public",
            "private",
            "dao-only"
          ],
          "default": "private",
          "description": "Privacy level of the file"
        },
        "retention": {
          "type": "integer",
          "description": "Retention period in days"
        }
      }
    },
    "encrypt": {
      "type": "boolean",
      "default": true,
      "description": "Whether to encrypt the file"
    }
  },
  "required": [
    "file",
    "filename"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "cid": {
      "type": "string",
      "description": "IPFS Content ID"
    },
    "name": {
      "type": "string"
    },
    "size": {
      "type": "integer"
    },
    "mimeType": {
      "type": "string"
    },
    "encrypted": {
      "type": "boolean"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "error": {
      "type": "string",
      "description": "Error message if success is false"
    }
  }
}
```


## qdrive.get

Retrieve file by CID from Qdrive

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "cid": {
      "type": "string",
      "description": "IPFS Content ID of the file"
    },
    "format": {
      "type": "string",
      "enum": [
        "base64",
        "url",
        "metadata"
      ],
      "default": "base64",
      "description": "Format to return the file in"
    }
  },
  "required": [
    "cid"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "cid": {
      "type": "string"
    },
    "content": {
      "type": "string",
      "description": "File content (base64 encoded if format=base64)"
    },
    "url": {
      "type": "string",
      "description": "Download URL if format=url"
    },
    "metadata": {
      "type": "object",
      "description": "File metadata"
    },
    "error": {
      "type": "string",
      "description": "Error message if success is false"
    }
  }
}
```


## qdrive.metadata

Get or update file metadata

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "cid": {
      "type": "string",
      "description": "IPFS Content ID of the file"
    },
    "operation": {
      "type": "string",
      "enum": [
        "get",
        "update"
      ],
      "default": "get",
      "description": "Operation to perform"
    },
    "updates": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "description": {
          "type": "string"
        },
        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "privacy": {
          "type": "string",
          "enum": [
            "public",
            "private",
            "dao-only"
          ]
        }
      },
      "description": "Metadata updates (required if operation=update)"
    }
  },
  "required": [
    "cid"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "cid": {
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "description": {
          "type": "string"
        },
        "size": {
          "type": "integer"
        },
        "mimeType": {
          "type": "string"
        },
        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "privacy": {
          "type": "string"
        },
        "encrypted": {
          "type": "boolean"
        },
        "owner": {
          "type": "string"
        },
        "createdAt": {
          "type": "string",
          "format": "date-time"
        },
        "updatedAt": {
          "type": "string",
          "format": "date-time"
        }
      }
    },
    "error": {
      "type": "string",
      "description": "Error message if success is false"
    }
  }
}
```


## qdrive.list

List files with optional filters

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20,
      "description": "Maximum number of files to return"
    },
    "offset": {
      "type": "integer",
      "minimum": 0,
      "default": 0,
      "description": "Number of files to skip"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Filter by tags"
    },
    "privacy": {
      "type": "string",
      "enum": [
        "public",
        "private",
        "dao-only"
      ],
      "description": "Filter by privacy level"
    },
    "sort": {
      "type": "string",
      "enum": [
        "created_at",
        "name",
        "size"
      ],
      "default": "created_at",
      "description": "Sort field"
    },
    "order": {
      "type": "string",
      "enum": [
        "asc",
        "desc"
      ],
      "default": "desc",
      "description": "Sort order"
    }
  }
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "cid": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "size": {
            "type": "integer"
          },
          "mimeType": {
            "type": "string"
          },
          "tags": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "privacy": {
            "type": "string"
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      }
    },
    "pagination": {
      "type": "object",
      "properties": {
        "total": {
          "type": "integer"
        },
        "limit": {
          "type": "integer"
        },
        "offset": {
          "type": "integer"
        },
        "hasMore": {
          "type": "boolean"
        }
      }
    },
    "error": {
      "type": "string",
      "description": "Error message if success is false"
    }
  }
}
```


## qdrive.share

Create sharing link for a file

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "cid": {
      "type": "string",
      "description": "IPFS Content ID of the file"
    },
    "recipients": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "sQuid IDs of recipients"
    },
    "permissions": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "read",
          "download",
          "share"
        ]
      },
      "default": [
        "read"
      ],
      "description": "Permissions to grant"
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time",
      "description": "Share expiration time"
    },
    "password": {
      "type": "string",
      "description": "Optional password protection"
    }
  },
  "required": [
    "cid"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "shareId": {
      "type": "string"
    },
    "shareUrl": {
      "type": "string"
    },
    "recipients": {
      "type": "array",
      "items": {
        "type": "string"
      }
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
    "error": {
      "type": "string",
      "description": "Error message if success is false"
    }
  }
}
```


## qdrive.delete

Delete a file from Qdrive

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "cid": {
      "type": "string",
      "description": "IPFS Content ID of the file to delete"
    },
    "force": {
      "type": "boolean",
      "default": false,
      "description": "Force deletion even if file is shared"
    }
  },
  "required": [
    "cid"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "cid": {
      "type": "string"
    },
    "deletedAt": {
      "type": "string",
      "format": "date-time"
    },
    "error": {
      "type": "string",
      "description": "Error message if success is false"
    }
  }
}
```


## Usage Examples

### qdrive.put Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qdrive');

const result = await client.callTool('qdrive.put', {
  "file": "string",
  "filename": "string",
  "metadata": {
    "description": "string",
    "tags": [
      "string"
    ],
    "privacy": "public",
    "retention": 123
  },
  "encrypt": true
});

console.log(result);
// Expected output structure:
// {
  "success": true,
  "cid": "string",
  "name": "string",
  "size": 123,
  "mimeType": "string",
  "encrypted": true,
  "createdAt": "string",
  "error": "string"
}
```


### qdrive.get Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qdrive');

const result = await client.callTool('qdrive.get', {
  "cid": "string",
  "format": "base64"
});

console.log(result);
// Expected output structure:
// {
  "success": true,
  "cid": "string",
  "content": "string",
  "url": "string",
  "metadata": {},
  "error": "string"
}
```


## Integration Guide

## Installation

```bash
npm install @anarq/qdrive-client
```

## Configuration

```javascript
import { QdriveClient } from '@anarq/qdrive-client';

const client = new QdriveClient({
  url: 'http://localhost:3008',
  apiKey: process.env.QDRIVE_API_KEY,
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

