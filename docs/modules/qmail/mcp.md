# Qmail MCP Tools

## Overview
Qmail MCP Tools - Certified Messaging Module

## Available Tools

## qmail.send

Send encrypted message with certified delivery

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "squidId": {
      "type": "string",
      "description": "Sender sQuid identity ID"
    },
    "recipientId": {
      "type": "string",
      "description": "Recipient sQuid identity ID"
    },
    "subject": {
      "type": "string",
      "maxLength": 200,
      "description": "Message subject"
    },
    "content": {
      "type": "string",
      "description": "Message content (will be encrypted)"
    },
    "encryptionLevel": {
      "type": "string",
      "enum": [
        "STANDARD",
        "HIGH",
        "QUANTUM"
      ],
      "default": "STANDARD",
      "description": "Encryption level"
    },
    "priority": {
      "type": "string",
      "enum": [
        "LOW",
        "NORMAL",
        "HIGH",
        "URGENT"
      ],
      "default": "NORMAL",
      "description": "Message priority"
    },
    "certifiedDelivery": {
      "type": "boolean",
      "default": true,
      "description": "Request certified delivery receipt"
    },
    "expiresIn": {
      "type": "integer",
      "description": "Message expiration in seconds (optional)"
    },
    "attachments": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "cid": {
            "type": "string"
          },
          "size": {
            "type": "integer"
          },
          "mimeType": {
            "type": "string"
          }
        }
      },
      "description": "File attachments (IPFS CIDs)"
    }
  },
  "required": [
    "squidId",
    "recipientId",
    "subject",
    "content"
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
    "messageId": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "SENT",
        "QUEUED",
        "FAILED"
      ]
    },
    "encryptedCid": {
      "type": "string",
      "description": "IPFS CID of encrypted message"
    },
    "deliveryTracking": {
      "type": "string",
      "description": "Delivery tracking ID"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time"
    },
    "error": {
      "type": "string"
    }
  }
}
```


## qmail.fetch

Fetch messages from inbox with decryption

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "squidId": {
      "type": "string",
      "description": "Recipient sQuid identity ID"
    },
    "folder": {
      "type": "string",
      "enum": [
        "INBOX",
        "SENT",
        "DRAFTS",
        "SPAM",
        "TRASH"
      ],
      "default": "INBOX",
      "description": "Message folder"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20,
      "description": "Maximum messages to fetch"
    },
    "offset": {
      "type": "integer",
      "minimum": 0,
      "default": 0,
      "description": "Pagination offset"
    },
    "unreadOnly": {
      "type": "boolean",
      "default": false,
      "description": "Fetch only unread messages"
    },
    "since": {
      "type": "string",
      "format": "date-time",
      "description": "Fetch messages since timestamp"
    }
  },
  "required": [
    "squidId"
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
    "messages": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "messageId": {
            "type": "string"
          },
          "senderId": {
            "type": "string"
          },
          "subject": {
            "type": "string"
          },
          "content": {
            "type": "string"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "status": {
            "type": "string"
          },
          "priority": {
            "type": "string"
          },
          "attachments": {
            "type": "array"
          },
          "deliveryReceipt": {
            "type": "boolean"
          },
          "encryptionLevel": {
            "type": "string"
          }
        }
      }
    },
    "totalCount": {
      "type": "integer"
    },
    "unreadCount": {
      "type": "integer"
    },
    "hasMore": {
      "type": "boolean"
    },
    "error": {
      "type": "string"
    }
  }
}
```


## qmail.receipt

Generate or verify delivery receipt

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "messageId": {
      "type": "string",
      "description": "Message ID for receipt"
    },
    "squidId": {
      "type": "string",
      "description": "Recipient sQuid identity ID"
    },
    "action": {
      "type": "string",
      "enum": [
        "GENERATE",
        "VERIFY"
      ],
      "description": "Receipt action"
    },
    "receiptData": {
      "type": "string",
      "description": "Receipt data for verification (base64 encoded)"
    }
  },
  "required": [
    "messageId",
    "squidId",
    "action"
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
    "receiptId": {
      "type": "string"
    },
    "receiptData": {
      "type": "string",
      "description": "Cryptographic receipt (base64 encoded)"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "verified": {
      "type": "boolean",
      "description": "Receipt verification result"
    },
    "signature": {
      "type": "string",
      "description": "Cryptographic signature"
    },
    "error": {
      "type": "string"
    }
  }
}
```


## qmail.search

Search messages with encrypted content support

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "squidId": {
      "type": "string",
      "description": "Searcher sQuid identity ID"
    },
    "query": {
      "type": "string",
      "description": "Search query"
    },
    "folder": {
      "type": "string",
      "enum": [
        "ALL",
        "INBOX",
        "SENT",
        "DRAFTS"
      ],
      "default": "ALL",
      "description": "Search scope"
    },
    "dateRange": {
      "type": "object",
      "properties": {
        "from": {
          "type": "string",
          "format": "date-time"
        },
        "to": {
          "type": "string",
          "format": "date-time"
        }
      },
      "description": "Date range filter"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 50,
      "default": 10,
      "description": "Maximum results"
    }
  },
  "required": [
    "squidId",
    "query"
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
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "messageId": {
            "type": "string"
          },
          "subject": {
            "type": "string"
          },
          "snippet": {
            "type": "string"
          },
          "senderId": {
            "type": "string"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "relevanceScore": {
            "type": "number"
          }
        }
      }
    },
    "totalMatches": {
      "type": "integer"
    },
    "searchTime": {
      "type": "number",
      "description": "Search time in milliseconds"
    },
    "error": {
      "type": "string"
    }
  }
}
```


## Usage Examples

### qmail.send Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qmail');

const result = await client.callTool('qmail.send', {
  "squidId": "string",
  "recipientId": "string",
  "subject": "string",
  "content": "string",
  "encryptionLevel": "STANDARD",
  "priority": "LOW",
  "certifiedDelivery": true,
  "expiresIn": 123,
  "attachments": [
    {
      "name": "string",
      "cid": "string",
      "size": 123,
      "mimeType": "string"
    }
  ]
});

console.log(result);
// Expected output structure:
// {
  "success": true,
  "messageId": "string",
  "status": "SENT",
  "encryptedCid": "string",
  "deliveryTracking": "string",
  "timestamp": "string",
  "expiresAt": "string",
  "error": "string"
}
```


### qmail.fetch Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qmail');

const result = await client.callTool('qmail.fetch', {
  "squidId": "string",
  "folder": "INBOX",
  "limit": 123,
  "offset": 123,
  "unreadOnly": true,
  "since": "string"
});

console.log(result);
// Expected output structure:
// {
  "success": true,
  "messages": [
    {
      "messageId": "string",
      "senderId": "string",
      "subject": "string",
      "content": "string",
      "timestamp": "string",
      "status": "string",
      "priority": "string",
      "attachments": [
        {}
      ],
      "deliveryReceipt": true,
      "encryptionLevel": "string"
    }
  ],
  "totalCount": 123,
  "unreadCount": 123,
  "hasMore": true,
  "error": "string"
}
```


## Integration Guide

## Installation

```bash
npm install @anarq/qmail-client
```

## Configuration

```javascript
import { QmailClient } from '@anarq/qmail-client';

const client = new QmailClient({
  url: 'http://localhost:3090',
  apiKey: process.env.QMAIL_API_KEY,
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

