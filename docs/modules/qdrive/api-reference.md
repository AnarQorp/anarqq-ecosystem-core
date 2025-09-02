# Qdrive API - API Reference

Decentralized file storage with IPFS integration and encryption

**Version:** 1.0.0

## Base URL

- Development: `http://localhost:3000/api/qdrive`
- Production: `https://api.q.network/qdrive`

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


### GET /health

**Health check**

#### Responses

**200**: Service is healthy

Schema: HealthResponse


### POST /files

**Upload file**

#### Request Body

#### Responses

**201**: File uploaded successfully

Schema: FileUploadResponse

**400**: Invalid request

Schema: ErrorResponse

**413**: File too large

Schema: ErrorResponse


### GET /files

**List user files**

#### Parameters

- **limit** (query): 
  - Type: integer
- **offset** (query): 
  - Type: integer
- **tags** (query): 
  - Type: array
- **privacy** (query): 
  - Type: string
  - Values: public, private, dao-only
- **sort** (query): 
  - Type: string
  - Values: created_at, name, size
- **order** (query): 
  - Type: string
  - Values: asc, desc

#### Responses

**200**: Files retrieved successfully

Schema: FileListResponse


### GET /files/{cid}

**Download file**

#### Parameters

- **cid** (path): IPFS Content ID
  - Required: Yes
  - Type: string
- **download** (query): Force download instead of inline display
  - Type: boolean

#### Responses

**200**: File content

**404**: File not found

Schema: ErrorResponse


### DELETE /files/{cid}

**Delete file**

#### Parameters

- **cid** (path): IPFS Content ID
  - Required: Yes
  - Type: string

#### Responses

**200**: File deleted successfully

Schema: SuccessResponse

**404**: File not found

Schema: ErrorResponse


### GET /files/{cid}/metadata

**Get file metadata**

#### Parameters

- **cid** (path): IPFS Content ID
  - Required: Yes
  - Type: string

#### Responses

**200**: File metadata

Schema: FileMetadata


### PUT /files/{cid}/metadata

**Update file metadata**

#### Parameters

- **cid** (path): IPFS Content ID
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

```json
{
  "name": "string",
  "description": "string",
  "tags": [],
  "privacy": "public"
}
```

#### Responses

**200**: Metadata updated successfully

Schema: FileMetadata


### POST /files/{cid}/share

**Create sharing link**

#### Parameters

- **cid** (path): IPFS Content ID
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

```json
{
  "recipients": [],
  "permissions": [],
  "expiresAt": "2024-01-01T00:00:00Z",
  "password": "string"
}
```

#### Responses

**201**: Share link created

Schema: ShareResponse


### GET /storage/summary

**Get storage summary**

#### Responses

**200**: Storage summary

Schema: StorageSummary



## Data Models


### HealthResponse

#### Properties

- **status** (string): 
  - Values: healthy, degraded, unhealthy
- **timestamp** (string): 
- **version** (string): 
- **dependencies** (object): 


### FileUploadResponse

#### Properties

- **status** (string): 
  - Values: ok
- **code** (string): 
- **message** (string): 
- **data** (object): 
- **cid** (string): IPFS Content ID


### FileListResponse

#### Properties

- **status** (string): 
  - Values: ok
- **code** (string): 
- **message** (string): 
- **data** (object): 


### FileMetadata

#### Properties

- **cid** (string): IPFS Content ID
- **name** (string): 
- **description** (string): 
- **size** (integer): 
- **mimeType** (string): 
- **tags** (array): 
- **privacy** (string): 
  - Values: public, private, dao-only
- **encrypted** (boolean): 
- **owner** (string): sQuid ID of owner
- **createdAt** (string): 
- **updatedAt** (string): 
- **accessCount** (integer): 
- **lastAccessed** (string): 
- **retentionPolicy** (object): 


### ShareResponse

#### Properties

- **status** (string): 
  - Values: ok
- **code** (string): 
- **message** (string): 
- **data** (object): 


### StorageSummary

#### Properties

- **status** (string): 
  - Values: ok
- **code** (string): 
- **message** (string): 
- **data** (object): 


### SuccessResponse

#### Properties

- **status** (string): 
  - Values: ok
- **code** (string): 
- **message** (string): 
- **timestamp** (string): 


### ErrorResponse

#### Properties

- **status** (string): 
  - Values: error
- **code** (string): 
- **message** (string): 
- **details** (object): 
- **timestamp** (string): 
- **requestId** (string): 
- **retryable** (boolean): 
- **suggestedActions** (array): 



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
