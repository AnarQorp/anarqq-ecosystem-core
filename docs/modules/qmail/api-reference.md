# Qmail API - API Reference

Certified Messaging Module for AnarQ&Q Ecosystem

**Version:** 1.0.0

## Base URL

- Development: `http://localhost:3000/api/qmail`
- Production: `https://api.q.network/qmail`

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


### POST /send

**Send encrypted message**

Send an encrypted message with certified delivery tracking

#### Request Body

Content-Type: application/json

Schema: SendMessageRequest

#### Responses

**200**: Message sent successfully

Schema: SendMessageResponse

**400**: 

**401**: 

**403**: 

**429**: 

**500**: 


### GET /inbox/{squidId}

**Get inbox messages**

Retrieve messages from user's inbox with decryption

#### Parameters

- **squidId** (path): sQuid identity ID
  - Required: Yes
  - Type: string
- **folder** (query): Message folder
  - Type: string
  - Values: INBOX, SENT, DRAFTS, SPAM, TRASH
- **limit** (query): Maximum messages to return
  - Type: integer
- **offset** (query): Pagination offset
  - Type: integer
- **unreadOnly** (query): Return only unread messages
  - Type: boolean

#### Responses

**200**: Messages retrieved successfully

Schema: InboxResponse

**401**: 

**403**: 

**404**: 

**500**: 


### GET /message/{messageId}

**Get specific message**

Retrieve and decrypt a specific message

#### Parameters

- **messageId** (path): Message ID
  - Required: Yes
  - Type: string

#### Responses

**200**: Message retrieved successfully

Schema: MessageResponse

**401**: 

**403**: 

**404**: 

**500**: 


### DELETE /message/{messageId}

**Delete message**

Delete message (GDPR compliance)

#### Parameters

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


### POST /receipt/{messageId}

**Generate delivery receipt**

Generate cryptographic delivery receipt

#### Parameters

- **messageId** (path): Message ID
  - Required: Yes
  - Type: string

#### Responses

**200**: Receipt generated successfully

Schema: ReceiptResponse

**401**: 

**403**: 

**404**: 

**500**: 


### GET /receipts/{messageId}

**Get message receipts**

Get all delivery receipts for a message

#### Parameters

- **messageId** (path): Message ID
  - Required: Yes
  - Type: string

#### Responses

**200**: Receipts retrieved successfully

Schema: ReceiptsResponse

**401**: 

**403**: 

**404**: 

**500**: 


### POST /search

**Search messages**

Search encrypted messages with metadata

#### Request Body

Content-Type: application/json

Schema: SearchRequest

#### Responses

**200**: Search completed successfully

Schema: SearchResponse

**400**: 

**401**: 

**403**: 

**500**: 


### GET /health

**Health check**

Check service health and dependencies

#### Responses

**200**: Service is healthy

Schema: HealthResponse

**503**: Service is unhealthy

Schema: HealthResponse



## Data Models


### SendMessageRequest

#### Properties

- **recipientId** (string): Recipient sQuid identity ID
  - Required: Yes
- **subject** (string): Message subject
  - Required: Yes
- **content** (string): Message content (will be encrypted)
  - Required: Yes
- **encryptionLevel** (string): Encryption level
  - Values: STANDARD, HIGH, QUANTUM
- **priority** (string): Message priority
  - Values: LOW, NORMAL, HIGH, URGENT
- **certifiedDelivery** (boolean): Request certified delivery receipt
- **expiresIn** (integer): Message expiration in seconds
- **attachments** (array): File attachments


### SendMessageResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### InboxResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### MessageResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (any): 


### Message

#### Properties

- **messageId** (string): 
- **senderId** (string): 
- **recipientId** (string): 
- **subject** (string): 
- **content** (string): Decrypted content
- **encryptionLevel** (string): 
- **priority** (string): 
- **status** (string): 
  - Values: UNREAD, READ, REPLIED, FORWARDED, DELETED
- **timestamp** (string): 
- **expiresAt** (string): 
- **attachments** (array): 
- **deliveryReceipt** (boolean): 
- **signature** (string): Message signature


### Attachment

#### Properties

- **name** (string): 
- **cid** (string): IPFS CID
- **size** (integer): 
- **mimeType** (string): 
- **encryptionKey** (string): Encrypted attachment key


### ReceiptResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### ReceiptsResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### SearchRequest

#### Properties

- **query** (string): Search query
  - Required: Yes
- **folder** (string): 
  - Values: ALL, INBOX, SENT, DRAFTS
- **dateRange** (object): 
- **limit** (integer): 


### SearchResponse

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
