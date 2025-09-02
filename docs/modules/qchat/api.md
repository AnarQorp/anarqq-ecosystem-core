# Qchat API Documentation

## Overview
Instant Messaging Module for AnarQ&Q Ecosystem

## Base URL
`http://localhost:3001/api/qchat`

## Authentication
- **squidAuth**: bearer authentication

## Endpoints

### POST /rooms
Create chat room

**Operation ID:** `createRoom`



**Request Body:**
```json
{
  "$ref": "#/components/schemas/CreateRoomRequest"
}
```

**Responses:**
- **201**: Room created successfully
- **400**: undefined
- **401**: undefined
- **403**: undefined
- **429**: undefined
- **500**: undefined


### GET /rooms
List chat rooms

**Operation ID:** `listRooms`

**Parameters:**
- `type` (query): Filter by room type
- `limit` (query): Maximum rooms to return
- `offset` (query): Pagination offset
- `search` (query): Search room names and descriptions



**Responses:**
- **200**: Rooms retrieved successfully
- **401**: undefined
- **500**: undefined


### GET /rooms/{roomId}
Get room details

**Operation ID:** `getRoomDetails`

**Parameters:**
- `roomId` (path): Chat room ID



**Responses:**
- **200**: Room details retrieved successfully
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **500**: undefined


### PUT /rooms/{roomId}
Update room settings

**Operation ID:** `updateRoom`

**Parameters:**
- `roomId` (path): Chat room ID

**Request Body:**
```json
{
  "$ref": "#/components/schemas/UpdateRoomRequest"
}
```

**Responses:**
- **200**: Room updated successfully
- **400**: undefined
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **500**: undefined


### DELETE /rooms/{roomId}
Delete room

**Operation ID:** `deleteRoom`

**Parameters:**
- `roomId` (path): Chat room ID



**Responses:**
- **200**: Room deleted successfully
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **500**: undefined


### POST /rooms/{roomId}/join
Join chat room

**Operation ID:** `joinRoom`

**Parameters:**
- `roomId` (path): Chat room ID

**Request Body:**
```json
{
  "type": "object",
  "properties": {
    "inviteCode": {
      "type": "string",
      "description": "Invite code for private rooms"
    }
  }
}
```

**Responses:**
- **200**: Joined room successfully
- **400**: undefined
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **409**: Already a member
- **500**: undefined


### POST /rooms/{roomId}/leave
Leave chat room

**Operation ID:** `leaveRoom`

**Parameters:**
- `roomId` (path): Chat room ID



**Responses:**
- **200**: Left room successfully
- **401**: undefined
- **404**: undefined
- **500**: undefined


### GET /rooms/{roomId}/messages
Get message history

**Operation ID:** `getMessageHistory`

**Parameters:**
- `roomId` (path): Chat room ID
- `limit` (query): Maximum messages to return
- `before` (query): Message ID to paginate before
- `after` (query): Message ID to paginate after
- `since` (query): Get messages since timestamp



**Responses:**
- **200**: Message history retrieved successfully
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **500**: undefined


### POST /rooms/{roomId}/messages
Send message

**Operation ID:** `sendMessage`

**Parameters:**
- `roomId` (path): Chat room ID

**Request Body:**
```json
{
  "$ref": "#/components/schemas/SendMessageRequest"
}
```

**Responses:**
- **201**: Message sent successfully
- **400**: undefined
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **429**: undefined
- **500**: undefined


### PUT /rooms/{roomId}/messages/{messageId}
Edit message

**Operation ID:** `editMessage`

**Parameters:**
- `roomId` (path): Chat room ID
- `messageId` (path): Message ID

**Request Body:**
```json
{
  "type": "object",
  "properties": {
    "content": {
      "type": "string",
      "description": "New message content"
    }
  },
  "required": [
    "content"
  ]
}
```

**Responses:**
- **200**: Message edited successfully
- **400**: undefined
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **500**: undefined


### DELETE /rooms/{roomId}/messages/{messageId}
Delete message

**Operation ID:** `deleteMessage`

**Parameters:**
- `roomId` (path): Chat room ID
- `messageId` (path): Message ID



**Responses:**
- **200**: Message deleted successfully
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **500**: undefined


### POST /rooms/{roomId}/moderate
Perform moderation action

**Operation ID:** `moderateRoom`

**Parameters:**
- `roomId` (path): Chat room ID

**Request Body:**
```json
{
  "$ref": "#/components/schemas/ModerationRequest"
}
```

**Responses:**
- **200**: Moderation action completed successfully
- **400**: undefined
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **500**: undefined


### GET /rooms/{roomId}/members
Get room members

**Operation ID:** `getRoomMembers`

**Parameters:**
- `roomId` (path): Chat room ID
- `limit` (query): Maximum members to return
- `role` (query): Filter by role



**Responses:**
- **200**: Members retrieved successfully
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **500**: undefined


### GET /websocket
WebSocket endpoint

**Operation ID:** `websocketConnect`

**Parameters:**
- `token` (query): Authentication token
- `roomId` (query): Initial room to join



**Responses:**
- **101**: WebSocket connection established
- **401**: Unauthorized
- **403**: Forbidden


### GET /health
Health check

**Operation ID:** `healthCheck`





**Responses:**
- **200**: Service is healthy
- **503**: Service is unhealthy


## Error Codes
- **400**: undefined
- **401**: undefined
- **403**: undefined
- **429**: undefined
- **500**: undefined
- **404**: undefined
- **409**: Already a member
- **401**: Unauthorized
- **403**: Forbidden
- **503**: Service is unhealthy

## Rate Limits

- **Default**: 100 requests per minute per identity
- **Burst**: 200 requests per minute (temporary)
- **Premium**: 1000 requests per minute (with Qwallet payment)
- **Headers**: Rate limit information in `X-RateLimit-*` headers


## Examples

#### Create chat room

```bash
curl -X POST \
  "http://localhost:3001/api/qchat/rooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d 'null'
```


#### Get room details

```bash
curl -X GET \
  "http://localhost:3001/api/qchat/rooms/{roomId}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```


#### Join chat room

```bash
curl -X POST \
  "http://localhost:3001/api/qchat/rooms/{roomId}/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
  "inviteCode": "string"
}'
```

