# qchat - MCP Tools

Qchat MCP Tools - Instant Messaging Module

## Overview

This module provides Model Context Protocol (MCP) tools for serverless integration with the Q ecosystem. MCP tools enable function-based interactions that are ideal for AI agents and serverless environments.

## Connection

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/qchat',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});

await client.connect();
```

## Tools


### qchat.post

Post message to chat room with end-to-end encryption

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| squidId | string | Yes | Sender sQuid identity ID |
| roomId | string | Yes | Chat room ID |
| content | string | Yes | Message content (will be encrypted) |
| messageType | string | No | Type of message |
| replyTo | string | No | Message ID being replied to (optional) |
| mentions | array | No | Array of mentioned sQuid IDs |
| attachments | array | No | File attachments (IPFS CIDs) |
| ephemeral | boolean | No | Message disappears after reading |
| expiresIn | integer | No | Message expiration in seconds (optional) |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| messageId | string | No |  |
| timestamp | string | No |  |
| encryptedCid | string | No | IPFS CID of encrypted message |
| deliveryStatus | string | No |  |
| recipients | array | No |  |
| error | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qchat.post', {
  squidId: "string",
  roomId: "string",
  content: "string",
  messageType: "TEXT",
  replyTo: "string",
  mentions: [],
  attachments: [],
  ephemeral: false,
  expiresIn: 0,
});
console.log(result);
```


### qchat.subscribe

Subscribe to chat room events and messages

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| squidId | string | Yes | Subscriber sQuid identity ID |
| roomId | string | Yes | Chat room ID to subscribe to |
| eventTypes | array | No | Types of events to subscribe to |
| since | string | No | Subscribe to events since timestamp |
| includeHistory | boolean | No | Include recent message history |
| historyLimit | integer | No | Number of historical messages to include |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| subscriptionId | string | No |  |
| roomInfo | object | No |  |
| history | array | No |  |
| websocketUrl | string | No | WebSocket URL for real-time events |
| error | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qchat.subscribe', {
  squidId: "string",
  roomId: "string",
  eventTypes: [],
  since: "2024-01-01T00:00:00Z",
  includeHistory: false,
  historyLimit: 0,
});
console.log(result);
```


### qchat.moderate

Perform moderation actions in chat room

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| squidId | string | Yes | Moderator sQuid identity ID |
| roomId | string | Yes | Chat room ID |
| action | string | Yes | Moderation action to perform |
| targetId | string | Yes | Target sQuid ID or message ID |
| reason | string | No | Reason for moderation action |
| duration | integer | No | Duration in seconds for temporary actions (mute, ban) |
| severity | string | No | Severity level of the violation |
| notifyUser | boolean | No | Notify the user about the action |
| escalateToQerberos | boolean | No | Report to Qerberos for security analysis |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| actionId | string | No |  |
| timestamp | string | No |  |
| effectiveUntil | string | No | When temporary action expires |
| auditCid | string | No | IPFS CID of audit record |
| reputationImpact | object | No |  |
| error | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qchat.moderate', {
  squidId: "string",
  roomId: "string",
  action: "MUTE",
  targetId: "string",
  reason: "string",
  duration: 0,
  severity: "LOW",
  notifyUser: false,
  escalateToQerberos: false,
});
console.log(result);
```


### qchat.createRoom

Create new chat room with specified configuration

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| squidId | string | Yes | Creator sQuid identity ID |
| name | string | Yes | Room name |
| description | string | No | Room description |
| type | string | No | Room access type |
| maxMembers | integer | No | Maximum number of members |
| encryptionLevel | string | No | Encryption level for messages |
| moderationLevel | string | No | Automatic moderation level |
| minReputation | number | No | Minimum reputation required (for REPUTATION type) |
| daoId | string | No | DAO ID (for DAO type rooms) |
| tags | array | No | Room tags for discovery |
| ephemeral | boolean | No | Room disappears when empty |
| messageRetention | integer | No | Message retention period in days |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| roomId | string | No |  |
| name | string | No |  |
| type | string | No |  |
| createdAt | string | No |  |
| inviteCode | string | No | Invite code for private rooms |
| encryptionKey | string | No | Room encryption key (encrypted for creator) |
| indexCid | string | No | IPFS CID of room index record |
| websocketUrl | string | No | WebSocket URL for real-time events |
| error | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qchat.createRoom', {
  squidId: "string",
  name: "string",
  description: "string",
  type: "PUBLIC",
  maxMembers: 0,
  encryptionLevel: "STANDARD",
  moderationLevel: "NONE",
  minReputation: 0,
  daoId: "string",
  tags: [],
  ephemeral: false,
  messageRetention: 0,
});
console.log(result);
```


### qchat.history

Get message history for chat room

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| squidId | string | Yes | Requester sQuid identity ID |
| roomId | string | Yes | Chat room ID |
| limit | integer | No | Maximum messages to return |
| before | string | No | Message ID to paginate before |
| after | string | No | Message ID to paginate after |
| since | string | No | Get messages since timestamp |
| until | string | No | Get messages until timestamp |
| messageTypes | array | No | Filter by message types |
| fromUser | string | No | Filter messages from specific user |
| includeDeleted | boolean | No | Include deleted messages (for moderators) |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| messages | array | No |  |
| totalCount | integer | No |  |
| hasMore | boolean | No |  |
| nextCursor | string | No | Cursor for next page |
| roomInfo | object | No |  |
| error | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qchat.history', {
  squidId: "string",
  roomId: "string",
  limit: 0,
  before: "string",
  after: "string",
  since: "2024-01-01T00:00:00Z",
  until: "2024-01-01T00:00:00Z",
  messageTypes: [],
  fromUser: "string",
  includeDeleted: false,
});
console.log(result);
```




## Resources

### Chat Rooms

**URI**: qchat://rooms

Access to chat room management and configuration

### Message Store

**URI**: qchat://messages

Access to encrypted message storage and retrieval

### User Presence

**URI**: qchat://presence

Access to real-time user presence and activity data

### Moderation Tools

**URI**: qchat://moderation

Access to moderation actions and audit logs




## Prompts

### room-summary

Generate chat room activity summary

#### Arguments

- **roomId**: Chat room ID (required)
- **period**: Time period (1h, 24h, 7d, 30d)

### moderation-report

Generate moderation activity report

#### Arguments

- **roomId**: Chat room ID (required)
- **period**: Time period (24h, 7d, 30d)

### user-activity

Generate user activity summary

#### Arguments

- **squidId**: sQuid identity ID (required)
- **roomId**: Specific room ID (optional)



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
