# Qchat MCP Tools

## Overview
Qchat MCP Tools - Instant Messaging Module

## Available Tools

## qchat.post

Post message to chat room with end-to-end encryption

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "squidId": {
      "type": "string",
      "description": "Sender sQuid identity ID"
    },
    "roomId": {
      "type": "string",
      "description": "Chat room ID"
    },
    "content": {
      "type": "string",
      "description": "Message content (will be encrypted)"
    },
    "messageType": {
      "type": "string",
      "enum": [
        "TEXT",
        "IMAGE",
        "FILE",
        "SYSTEM",
        "REACTION"
      ],
      "default": "TEXT",
      "description": "Type of message"
    },
    "replyTo": {
      "type": "string",
      "description": "Message ID being replied to (optional)"
    },
    "mentions": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of mentioned sQuid IDs"
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
    },
    "ephemeral": {
      "type": "boolean",
      "default": false,
      "description": "Message disappears after reading"
    },
    "expiresIn": {
      "type": "integer",
      "description": "Message expiration in seconds (optional)"
    }
  },
  "required": [
    "squidId",
    "roomId",
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
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "encryptedCid": {
      "type": "string",
      "description": "IPFS CID of encrypted message"
    },
    "deliveryStatus": {
      "type": "string",
      "enum": [
        "SENT",
        "DELIVERED",
        "READ",
        "FAILED"
      ]
    },
    "recipients": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "squidId": {
            "type": "string"
          },
          "status": {
            "type": "string"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          }
        }
      }
    },
    "error": {
      "type": "string"
    }
  }
}
```


## qchat.subscribe

Subscribe to chat room events and messages

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "squidId": {
      "type": "string",
      "description": "Subscriber sQuid identity ID"
    },
    "roomId": {
      "type": "string",
      "description": "Chat room ID to subscribe to"
    },
    "eventTypes": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "MESSAGE",
          "TYPING",
          "PRESENCE",
          "JOIN",
          "LEAVE",
          "MODERATION"
        ]
      },
      "default": [
        "MESSAGE"
      ],
      "description": "Types of events to subscribe to"
    },
    "since": {
      "type": "string",
      "format": "date-time",
      "description": "Subscribe to events since timestamp"
    },
    "includeHistory": {
      "type": "boolean",
      "default": false,
      "description": "Include recent message history"
    },
    "historyLimit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20,
      "description": "Number of historical messages to include"
    }
  },
  "required": [
    "squidId",
    "roomId"
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
    "subscriptionId": {
      "type": "string"
    },
    "roomInfo": {
      "type": "object",
      "properties": {
        "roomId": {
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "type": {
          "type": "string"
        },
        "memberCount": {
          "type": "integer"
        },
        "permissions": {
          "type": "object"
        }
      }
    },
    "history": {
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
          "content": {
            "type": "string"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "messageType": {
            "type": "string"
          }
        }
      }
    },
    "websocketUrl": {
      "type": "string",
      "description": "WebSocket URL for real-time events"
    },
    "error": {
      "type": "string"
    }
  }
}
```


## qchat.moderate

Perform moderation actions in chat room

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "squidId": {
      "type": "string",
      "description": "Moderator sQuid identity ID"
    },
    "roomId": {
      "type": "string",
      "description": "Chat room ID"
    },
    "action": {
      "type": "string",
      "enum": [
        "MUTE",
        "UNMUTE",
        "KICK",
        "BAN",
        "UNBAN",
        "DELETE_MESSAGE",
        "PIN_MESSAGE",
        "UNPIN_MESSAGE",
        "WARN"
      ],
      "description": "Moderation action to perform"
    },
    "targetId": {
      "type": "string",
      "description": "Target sQuid ID or message ID"
    },
    "reason": {
      "type": "string",
      "description": "Reason for moderation action"
    },
    "duration": {
      "type": "integer",
      "description": "Duration in seconds for temporary actions (mute, ban)"
    },
    "severity": {
      "type": "string",
      "enum": [
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
      ],
      "default": "MEDIUM",
      "description": "Severity level of the violation"
    },
    "notifyUser": {
      "type": "boolean",
      "default": true,
      "description": "Notify the user about the action"
    },
    "escalateToQerberos": {
      "type": "boolean",
      "default": false,
      "description": "Report to Qerberos for security analysis"
    }
  },
  "required": [
    "squidId",
    "roomId",
    "action",
    "targetId"
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
    "actionId": {
      "type": "string"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "effectiveUntil": {
      "type": "string",
      "format": "date-time",
      "description": "When temporary action expires"
    },
    "auditCid": {
      "type": "string",
      "description": "IPFS CID of audit record"
    },
    "reputationImpact": {
      "type": "object",
      "properties": {
        "targetId": {
          "type": "string"
        },
        "previousScore": {
          "type": "number"
        },
        "newScore": {
          "type": "number"
        },
        "change": {
          "type": "number"
        }
      }
    },
    "error": {
      "type": "string"
    }
  }
}
```


## qchat.createRoom

Create new chat room with specified configuration

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "squidId": {
      "type": "string",
      "description": "Creator sQuid identity ID"
    },
    "name": {
      "type": "string",
      "maxLength": 100,
      "description": "Room name"
    },
    "description": {
      "type": "string",
      "maxLength": 500,
      "description": "Room description"
    },
    "type": {
      "type": "string",
      "enum": [
        "PUBLIC",
        "PRIVATE",
        "DAO",
        "REPUTATION"
      ],
      "default": "PUBLIC",
      "description": "Room access type"
    },
    "maxMembers": {
      "type": "integer",
      "minimum": 2,
      "maximum": 10000,
      "default": 100,
      "description": "Maximum number of members"
    },
    "encryptionLevel": {
      "type": "string",
      "enum": [
        "STANDARD",
        "HIGH",
        "QUANTUM"
      ],
      "default": "STANDARD",
      "description": "Encryption level for messages"
    },
    "moderationLevel": {
      "type": "string",
      "enum": [
        "NONE",
        "BASIC",
        "STRICT",
        "AI_ASSISTED"
      ],
      "default": "BASIC",
      "description": "Automatic moderation level"
    },
    "minReputation": {
      "type": "number",
      "description": "Minimum reputation required (for REPUTATION type)"
    },
    "daoId": {
      "type": "string",
      "description": "DAO ID (for DAO type rooms)"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Room tags for discovery"
    },
    "ephemeral": {
      "type": "boolean",
      "default": false,
      "description": "Room disappears when empty"
    },
    "messageRetention": {
      "type": "integer",
      "description": "Message retention period in days"
    }
  },
  "required": [
    "squidId",
    "name"
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
    "roomId": {
      "type": "string"
    },
    "name": {
      "type": "string"
    },
    "type": {
      "type": "string"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "inviteCode": {
      "type": "string",
      "description": "Invite code for private rooms"
    },
    "encryptionKey": {
      "type": "string",
      "description": "Room encryption key (encrypted for creator)"
    },
    "indexCid": {
      "type": "string",
      "description": "IPFS CID of room index record"
    },
    "websocketUrl": {
      "type": "string",
      "description": "WebSocket URL for real-time events"
    },
    "error": {
      "type": "string"
    }
  }
}
```


## qchat.history

Get message history for chat room

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "squidId": {
      "type": "string",
      "description": "Requester sQuid identity ID"
    },
    "roomId": {
      "type": "string",
      "description": "Chat room ID"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 50,
      "description": "Maximum messages to return"
    },
    "before": {
      "type": "string",
      "description": "Message ID to paginate before"
    },
    "after": {
      "type": "string",
      "description": "Message ID to paginate after"
    },
    "since": {
      "type": "string",
      "format": "date-time",
      "description": "Get messages since timestamp"
    },
    "until": {
      "type": "string",
      "format": "date-time",
      "description": "Get messages until timestamp"
    },
    "messageTypes": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "TEXT",
          "IMAGE",
          "FILE",
          "SYSTEM",
          "REACTION"
        ]
      },
      "description": "Filter by message types"
    },
    "fromUser": {
      "type": "string",
      "description": "Filter messages from specific user"
    },
    "includeDeleted": {
      "type": "boolean",
      "default": false,
      "description": "Include deleted messages (for moderators)"
    }
  },
  "required": [
    "squidId",
    "roomId"
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
          "content": {
            "type": "string"
          },
          "messageType": {
            "type": "string"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "editedAt": {
            "type": "string",
            "format": "date-time"
          },
          "replyTo": {
            "type": "string"
          },
          "mentions": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "attachments": {
            "type": "array"
          },
          "reactions": {
            "type": "object"
          },
          "deliveryStatus": {
            "type": "string"
          },
          "encryptionLevel": {
            "type": "string"
          },
          "deleted": {
            "type": "boolean"
          }
        }
      }
    },
    "totalCount": {
      "type": "integer"
    },
    "hasMore": {
      "type": "boolean"
    },
    "nextCursor": {
      "type": "string",
      "description": "Cursor for next page"
    },
    "roomInfo": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "memberCount": {
          "type": "integer"
        },
        "permissions": {
          "type": "object"
        }
      }
    },
    "error": {
      "type": "string"
    }
  }
}
```


## Usage Examples

### qchat.post Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qchat');

const result = await client.callTool('qchat.post', {
  "squidId": "string",
  "roomId": "string",
  "content": "string",
  "messageType": "TEXT",
  "replyTo": "string",
  "mentions": [
    "string"
  ],
  "attachments": [
    {
      "name": "string",
      "cid": "string",
      "size": 123,
      "mimeType": "string"
    }
  ],
  "ephemeral": true,
  "expiresIn": 123
});

console.log(result);
// Expected output structure:
// {
  "success": true,
  "messageId": "string",
  "timestamp": "string",
  "encryptedCid": "string",
  "deliveryStatus": "SENT",
  "recipients": [
    {
      "squidId": "string",
      "status": "string",
      "timestamp": "string"
    }
  ],
  "error": "string"
}
```


### qchat.subscribe Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qchat');

const result = await client.callTool('qchat.subscribe', {
  "squidId": "string",
  "roomId": "string",
  "eventTypes": [
    "MESSAGE"
  ],
  "since": "string",
  "includeHistory": true,
  "historyLimit": 123
});

console.log(result);
// Expected output structure:
// {
  "success": true,
  "subscriptionId": "string",
  "roomInfo": {
    "roomId": "string",
    "name": "string",
    "type": "string",
    "memberCount": 123,
    "permissions": {}
  },
  "history": [
    {
      "messageId": "string",
      "senderId": "string",
      "content": "string",
      "timestamp": "string",
      "messageType": "string"
    }
  ],
  "websocketUrl": "string",
  "error": "string"
}
```


## Integration Guide

## Installation

```bash
npm install @anarq/qchat-client
```

## Configuration

```javascript
import { QchatClient } from '@anarq/qchat-client';

const client = new QchatClient({
  url: 'http://localhost:3001',
  apiKey: process.env.QCHAT_API_KEY,
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

