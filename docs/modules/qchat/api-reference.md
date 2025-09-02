# Qchat API - API Reference

Instant Messaging Module for AnarQ&Q Ecosystem

**Version:** 1.0.0

## Base URL

- Development: `http://localhost:3000/api/qchat`
- Production: `https://api.q.network/qchat`

## Authentication

All endpoints require authentication via sQuid identity:

```
Authorization: Bearer <jwt-token>
x-squid-id: <squid-identity-id>
x-api-version: 1.0.0
```

## Standard Headers

- `x-squid-id`: sQuid identity ID
- `x-subid`: Subidentity ID (optional)
- `x-qonsent`: Consent token for permissions
- `x-sig`: Qlock signature for verification
- `x-ts`: Timestamp
- `x-api-version`: API version

## Standard Response Format

All responses follow this format:

```json
{
  "status": "ok|error",
  "code": "SUCCESS|ERROR_CODE",
  "message": "Human readable message",
  "data": {},
  "cid": "ipfs-content-id"
}
```

## Endpoints


### POST /rooms

**Create chat room**

Create a new chat room with specified configuration

#### Request Body

Content-Type: application/json

Schema: CreateRoomRequest

#### Responses

**201**: Room created successfully

Schema: CreateRoomResponse

**400**: 

**401**: 

**403**: 

**429**: 

**500**: 


### GET /rooms

**List chat rooms**

Get list of available chat rooms for user

#### Parameters

- **type** (query): Filter by room type
  - Type: string
  - Values: PUBLIC, PRIVATE, DAO, REPUTATION
- **limit** (query): Maximum rooms to return
  - Type: integer
- **offset** (query): Pagination offset
  - Type: integer
- **search** (query): Search room names and descriptions
  - Type: string

#### Responses

**200**: Rooms retrieved successfully

Schema: ListRoomsResponse

**401**: 

**500**: 


### GET /rooms/{roomId}

**Get room details**

Get detailed information about a specific chat room

#### Parameters

- **roomId** (path): Chat room ID
  - Required: Yes
  - Type: string

#### Responses

**200**: Room details retrieved successfully

Schema: RoomDetailsResponse

**401**: 

**403**: 

**404**: 

**500**: 


### PUT /rooms/{roomId}

**Update room settings**

Update chat room configuration (owner/admin only)

#### Parameters

- **roomId** (path): Chat room ID
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

Schema: UpdateRoomRequest

#### Responses

**200**: Room updated successfully

Schema: SuccessResponse

**400**: 

**401**: 

**403**: 

**404**: 

**500**: 


### DELETE /rooms/{roomId}

**Delete room**

Delete chat room (owner only)

#### Parameters

- **roomId** (path): Chat room ID
  - Required: Yes
  - Type: string

#### Responses

**200**: Room deleted successfully

Schema: SuccessResponse

**401**: 

**403**: 

**404**: 

**500**: 


### POST /rooms/{roomId}/join

**Join chat room**

Join a chat room (if permitted)

#### Parameters

- **roomId** (path): Chat room ID
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

```json
{
  "inviteCode": "string"
}
```

#### Responses

**200**: Joined room successfully

Schema: JoinRoomResponse

**400**: 

**401**: 

**403**: 

**404**: 

**409**: Already a member

Schema: ErrorResponse

**500**: 


### POST /rooms/{roomId}/leave

**Leave chat room**

Leave a chat room

#### Parameters

- **roomId** (path): Chat room ID
  - Required: Yes
  - Type: string

#### Responses

**200**: Left room successfully

Schema: SuccessResponse

**401**: 

**404**: 

**500**: 


### GET /rooms/{roomId}/messages

**Get message history**

Retrieve message history for a chat room

#### Parameters

- **roomId** (path): Chat room ID
  - Required: Yes
  - Type: string
- **limit** (query): Maximum messages to return
  - Type: integer
- **before** (query): Message ID to paginate before
  - Type: string
- **after** (query): Message ID to paginate after
  - Type: string
- **since** (query): Get messages since timestamp
  - Type: string

#### Responses

**200**: Message history retrieved successfully

Schema: MessageHistoryResponse

**401**: 

**403**: 

**404**: 

**500**: 


### POST /rooms/{roomId}/messages

**Send message**

Send a message to the chat room

#### Parameters

- **roomId** (path): Chat room ID
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

Schema: SendMessageRequest

#### Responses

**201**: Message sent successfully

Schema: SendMessageResponse

**400**: 

**401**: 

**403**: 

**404**: 

**429**: 

**500**: 


### PUT /rooms/{roomId}/messages/{messageId}

**Edit message**

Edit a previously sent message

#### Parameters

- **roomId** (path): Chat room ID
  - Required: Yes
  - Type: string
- **messageId** (path): Message ID
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

```json
{
  "content": "string"
}
```

#### Responses

**200**: Message edited successfully

Schema: SuccessResponse

**400**: 

**401**: 

**403**: 

**404**: 

**500**: 


### DELETE /rooms/{roomId}/messages/{messageId}

**Delete message**

Delete a message (sender or moderator only)

#### Parameters

- **roomId** (path): Chat room ID
  - Required: Yes
  - Type: string
- **messageId** (path): Message ID
  - Required: Yes
  - Type: string

#### Responses

**200**: Message deleted successfully

Schema: SuccessResponse

**401**: 

**403**: 

**404**: 

**500**: 


### POST /rooms/{roomId}/moderate

**Perform moderation action**

Perform moderation actions in the chat room

#### Parameters

- **roomId** (path): Chat room ID
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

Schema: ModerationRequest

#### Responses

**200**: Moderation action completed successfully

Schema: ModerationResponse

**400**: 

**401**: 

**403**: 

**404**: 

**500**: 


### GET /rooms/{roomId}/members

**Get room members**

Get list of room members with their roles

#### Parameters

- **roomId** (path): Chat room ID
  - Required: Yes
  - Type: string
- **limit** (query): Maximum members to return
  - Type: integer
- **role** (query): Filter by role
  - Type: string
  - Values: OWNER, ADMIN, MEMBER, GUEST

#### Responses

**200**: Members retrieved successfully

Schema: MembersResponse

**401**: 

**403**: 

**404**: 

**500**: 


### GET /websocket

**WebSocket endpoint**

WebSocket endpoint for real-time messaging

#### Parameters

- **token** (query): Authentication token
  - Required: Yes
  - Type: string
- **roomId** (query): Initial room to join
  - Type: string

#### Responses

**101**: WebSocket connection established

**401**: Unauthorized

**403**: Forbidden


### GET /health

**Health check**

Check service health and dependencies

#### Responses

**200**: Service is healthy

Schema: HealthResponse

**503**: Service is unhealthy

Schema: HealthResponse



## Data Models


### CreateRoomRequest

#### Properties

- **name** (string): Room name
  - Required: Yes
- **description** (string): Room description
- **type** (string): Room access type
  - Values: PUBLIC, PRIVATE, DAO, REPUTATION
- **maxMembers** (integer): Maximum number of members
- **encryptionLevel** (string): Encryption level for messages
  - Values: STANDARD, HIGH, QUANTUM
- **moderationLevel** (string): Automatic moderation level
  - Values: NONE, BASIC, STRICT, AI_ASSISTED
- **minReputation** (number): Minimum reputation required (for REPUTATION type)
- **daoId** (string): DAO ID (for DAO type rooms)
- **tags** (array): Room tags for discovery
- **ephemeral** (boolean): Room disappears when empty
- **messageRetention** (integer): Message retention period in days


### CreateRoomResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### ListRoomsResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### RoomSummary

#### Properties

- **roomId** (string): 
- **name** (string): 
- **description** (string): 
- **type** (string): 
- **memberCount** (integer): 
- **maxMembers** (integer): 
- **lastActivity** (string): 
- **tags** (array): 
- **encryptionLevel** (string): 
- **isJoined** (boolean): 


### RoomDetailsResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (any): 


### RoomDetails

#### Properties

- **roomId** (string): 
- **name** (string): 
- **description** (string): 
- **type** (string): 
- **createdAt** (string): 
- **createdBy** (string): 
- **memberCount** (integer): 
- **maxMembers** (integer): 
- **encryptionLevel** (string): 
- **moderationLevel** (string): 
- **messageRetention** (integer): 
- **tags** (array): 
- **permissions** (object): 
- **userRole** (string): 
  - Values: OWNER, ADMIN, MEMBER, GUEST
- **lastActivity** (string): 


### UpdateRoomRequest

#### Properties

- **name** (string): 
- **description** (string): 
- **maxMembers** (integer): 
- **moderationLevel** (string): 
  - Values: NONE, BASIC, STRICT, AI_ASSISTED
- **messageRetention** (integer): 
- **tags** (array): 


### JoinRoomResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### SendMessageRequest

#### Properties

- **content** (string): Message content
  - Required: Yes
- **messageType** (string): Type of message
  - Values: TEXT, IMAGE, FILE, SYSTEM, REACTION
- **replyTo** (string): Message ID being replied to
- **mentions** (array): Array of mentioned sQuid IDs
- **attachments** (array): File attachments
- **ephemeral** (boolean): Message disappears after reading
- **expiresIn** (integer): Message expiration in seconds


### SendMessageResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### MessageHistoryResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### ChatMessage

#### Properties

- **messageId** (string): 
- **senderId** (string): 
- **senderName** (string): 
- **content** (string): 
- **messageType** (string): 
- **timestamp** (string): 
- **editedAt** (string): 
- **replyTo** (string): 
- **mentions** (array): 
- **attachments** (array): 
- **reactions** (object): 
- **deliveryStatus** (string): 
- **encryptionLevel** (string): 
- **deleted** (boolean): 


### Attachment

#### Properties

- **name** (string): 
- **cid** (string): IPFS CID
- **size** (integer): 
- **mimeType** (string): 
- **thumbnail** (string): Thumbnail CID for images/videos


### ModerationRequest

#### Properties

- **action** (string): Moderation action to perform
  - Required: Yes
  - Values: MUTE, UNMUTE, KICK, BAN, UNBAN, DELETE_MESSAGE, PIN_MESSAGE, UNPIN_MESSAGE, WARN
- **targetId** (string): Target sQuid ID or message ID
  - Required: Yes
- **reason** (string): Reason for moderation action
- **duration** (integer): Duration in seconds for temporary actions
- **severity** (string): Severity level of the violation
  - Values: LOW, MEDIUM, HIGH, CRITICAL
- **notifyUser** (boolean): Notify the user about the action


### ModerationResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### MembersResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### SuccessResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### ErrorResponse

#### Properties

- **status** (string): 
  - Values: error
- **code** (string): 
- **message** (string): 
- **details** (object): 
- **timestamp** (string): 
- **requestId** (string): 


### HealthResponse

#### Properties

- **status** (string): 
  - Values: healthy, degraded, unhealthy
- **timestamp** (string): 
- **version** (string): 
- **dependencies** (object): 
- **metrics** (object): 



## Error Codes

Common error codes returned by this module:

- `INVALID_REQUEST`: Malformed request
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Rate limit exceeded
- `INTERNAL_ERROR`: Server error

## Rate Limiting

- **Per Identity**: 100 requests per minute
- **Per Subidentity**: 50 requests per minute
- **Per DAO**: 500 requests per minute

Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp
