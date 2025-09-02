# Qindex API - API Reference

Indexing & Pointers Module for Q Ecosystem

**Version:** 1.0.0

## Base URL

- Development: `http://localhost:3000/api/qindex`
- Production: `https://api.q.network/qindex`

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


### POST /qindex/put

**Store indexed record**

#### Request Body

Content-Type: application/json

Schema: PutRecordRequest

#### Responses

**201**: Record stored successfully

Schema: PutRecordResponse

**400**: Invalid request

Schema: ErrorResponse


### GET /qindex/get/{key}

**Retrieve record by key**

#### Parameters

- **key** (path): 
  - Required: Yes
  - Type: string
- **version** (query): Specific version to retrieve
  - Type: string

#### Responses

**200**: Record retrieved successfully

Schema: GetRecordResponse

**404**: Record not found

Schema: ErrorResponse


### GET /qindex/list

**List records with filtering**

#### Parameters

- **prefix** (query): Key prefix filter
  - Type: string
- **limit** (query): 
  - Type: integer
- **offset** (query): 
  - Type: integer
- **sort** (query): 
  - Type: string
  - Values: created_asc, created_desc, updated_asc, updated_desc

#### Responses

**200**: Records listed successfully

Schema: ListRecordsResponse


### GET /qindex/history/{key}

**Get record history**

#### Parameters

- **key** (path): 
  - Required: Yes
  - Type: string
- **limit** (query): 
  - Type: integer

#### Responses

**200**: History retrieved successfully

Schema: HistoryResponse


### DELETE /qindex/delete/{key}

**Remove record**

#### Parameters

- **key** (path): 
  - Required: Yes
  - Type: string

#### Responses

**200**: Record deleted successfully

Schema: DeleteRecordResponse

**404**: Record not found

Schema: ErrorResponse



## Data Models


### HealthResponse

#### Properties

- **status** (string): 
- **timestamp** (string): 
- **version** (string): 


### PutRecordRequest

#### Properties

- **key** (string): Unique identifier for the record
  - Required: Yes
- **value** (object): Record data
  - Required: Yes
- **metadata** (object): 
- **options** (object): 


### PutRecordResponse

#### Properties

- **success** (boolean): 
- **key** (string): 
- **cid** (string): 
- **version** (string): 
- **timestamp** (string): 


### GetRecordRequest

#### Properties

- **key** (string): 
- **version** (string): 


### GetRecordResponse

#### Properties

- **key** (string): 
- **value** (object): 
- **metadata** (object): 
- **version** (string): 
- **cid** (string): 
- **timestamp** (string): 


### ListRecordsResponse

#### Properties

- **records** (array): 
- **total** (integer): 
- **hasMore** (boolean): 
- **nextCursor** (string): 


### RecordSummary

#### Properties

- **key** (string): 
- **cid** (string): 
- **version** (string): 
- **metadata** (object): 
- **createdAt** (string): 
- **updatedAt** (string): 


### HistoryResponse

#### Properties

- **key** (string): 
- **history** (array): 
- **total** (integer): 


### HistoryEntry

#### Properties

- **version** (string): 
- **cid** (string): 
- **timestamp** (string): 
- **operation** (string): 
  - Values: create, update, delete
- **metadata** (object): 


### DeleteRecordResponse

#### Properties

- **success** (boolean): 
- **key** (string): 
- **timestamp** (string): 


### ErrorResponse

#### Properties

- **error** (string): 
- **message** (string): 
- **code** (string): 
- **timestamp** (string): 



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
