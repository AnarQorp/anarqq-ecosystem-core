# Qmail API Documentation

## Overview
Certified Messaging Module for AnarQ&Q Ecosystem

## Base URL
`http://localhost:3000/api/qmail`

## Authentication
- **squidAuth**: bearer authentication

## Endpoints

### POST /send
Send encrypted message

**Operation ID:** `sendMessage`



**Request Body:**
```json
{
  "$ref": "#/components/schemas/SendMessageRequest"
}
```

**Responses:**
- **200**: Message sent successfully
- **400**: undefined
- **401**: undefined
- **403**: undefined
- **429**: undefined
- **500**: undefined


### GET /inbox/{squidId}
Get inbox messages

**Operation ID:** `getInboxMessages`

**Parameters:**
- `squidId` (path): sQuid identity ID
- `folder` (query): Message folder
- `limit` (query): Maximum messages to return
- `offset` (query): Pagination offset
- `unreadOnly` (query): Return only unread messages



**Responses:**
- **200**: Messages retrieved successfully
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **500**: undefined


### GET /message/{messageId}
Get specific message

**Operation ID:** `getMessage`

**Parameters:**
- `messageId` (path): Message ID



**Responses:**
- **200**: Message retrieved successfully
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **500**: undefined


### DELETE /message/{messageId}
Delete message

**Operation ID:** `deleteMessage`

**Parameters:**
- `messageId` (path): Message ID



**Responses:**
- **200**: Message deleted successfully
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **500**: undefined


### POST /receipt/{messageId}
Generate delivery receipt

**Operation ID:** `generateReceipt`

**Parameters:**
- `messageId` (path): Message ID



**Responses:**
- **200**: Receipt generated successfully
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **500**: undefined


### GET /receipts/{messageId}
Get message receipts

**Operation ID:** `getMessageReceipts`

**Parameters:**
- `messageId` (path): Message ID



**Responses:**
- **200**: Receipts retrieved successfully
- **401**: undefined
- **403**: undefined
- **404**: undefined
- **500**: undefined


### POST /search
Search messages

**Operation ID:** `searchMessages`



**Request Body:**
```json
{
  "$ref": "#/components/schemas/SearchRequest"
}
```

**Responses:**
- **200**: Search completed successfully
- **400**: undefined
- **401**: undefined
- **403**: undefined
- **500**: undefined


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
- **503**: Service is unhealthy

## Rate Limits

- **Default**: 100 requests per minute per identity
- **Burst**: 200 requests per minute (temporary)
- **Premium**: 1000 requests per minute (with Qwallet payment)
- **Headers**: Rate limit information in `X-RateLimit-*` headers


## Examples

#### Send encrypted message

```bash
curl -X POST \
  "http://localhost:3000/api/qmail/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d 'null'
```


#### Get inbox messages

```bash
curl -X GET \
  "http://localhost:3000/api/qmail/inbox/{squidId}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```


#### Get specific message

```bash
curl -X GET \
  "http://localhost:3000/api/qmail/message/{messageId}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

