# sQuid Identity API - API Reference

Identity & Subidentities management for Q ecosystem

**Version:** 1.0.0

## Base URL

- Development: `http://localhost:3000/api/squid`
- Production: `https://api.q.network/squid`

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

**Health check endpoint**

#### Responses

**200**: Service health status

Schema: HealthResponse


### POST /identity

**Create new root identity**

#### Request Body

Content-Type: application/json

Schema: CreateIdentityRequest

#### Responses

**201**: Identity created successfully

Schema: IdentityResponse

**400**: Invalid request

Schema: ErrorResponse


### GET /identity/{identityId}

**Get identity information**

#### Parameters

- **identityId** (path): 
  - Required: Yes
  - Type: string

#### Responses

**200**: Identity information

Schema: IdentityResponse

**404**: Identity not found

Schema: ErrorResponse


### POST /identity/{identityId}/subidentity

**Create subidentity**

#### Parameters

- **identityId** (path): 
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

Schema: CreateSubidentityRequest

#### Responses

**201**: Subidentity created successfully

Schema: IdentityResponse

**400**: Invalid request

Schema: ErrorResponse

**403**: Insufficient permissions

Schema: ErrorResponse


### PUT /identity/{identityId}/verify

**Submit identity verification**

#### Parameters

- **identityId** (path): 
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

Schema: VerificationRequest

#### Responses

**200**: Verification submitted successfully

Schema: IdentityResponse

**400**: Invalid verification data

Schema: ErrorResponse


### GET /identity/{identityId}/reputation

**Get identity reputation**

#### Parameters

- **identityId** (path): 
  - Required: Yes
  - Type: string

#### Responses

**200**: Reputation information

Schema: ReputationResponse



## Data Models


### HealthResponse

#### Properties

- **status** (string): 
  - Required: Yes
  - Values: healthy, degraded, unhealthy
- **timestamp** (string): 
  - Required: Yes
- **version** (string): 
  - Required: Yes
- **dependencies** (object): 


### CreateIdentityRequest

#### Properties

- **name** (string): 
  - Required: Yes
- **metadata** (object): 


### CreateSubidentityRequest

#### Properties

- **name** (string): 
  - Required: Yes
- **type** (string): 
  - Required: Yes
  - Values: DAO, ENTERPRISE, CONSENTIDA, AID
- **description** (string): 
- **metadata** (object): 


### VerificationRequest

#### Properties

- **fullName** (string): 
  - Required: Yes
- **dateOfBirth** (string): 
  - Required: Yes
- **documentType** (string): 
  - Required: Yes
  - Values: passport, drivers_license, national_id
- **documentNumber** (string): 
  - Required: Yes


### IdentityResponse

#### Properties

- **status** (string): 
  - Required: Yes
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (any): 
  - Required: Yes
- **cid** (string): 


### ReputationResponse

#### Properties

- **status** (string): 
  - Required: Yes
  - Values: ok, error
- **data** (object): 
  - Required: Yes


### Identity

#### Properties

- **did** (string): 
  - Required: Yes
- **name** (string): 
  - Required: Yes
- **type** (string): 
  - Required: Yes
  - Values: ROOT, DAO, ENTERPRISE, CONSENTIDA, AID
- **parentId** (string): 
- **rootId** (string): 
- **status** (string): 
  - Required: Yes
  - Values: ACTIVE, INACTIVE, SUSPENDED, DELETED, PENDING_VERIFICATION
- **verificationLevel** (string): 
  - Values: UNVERIFIED, BASIC, ENHANCED, INSTITUTIONAL
- **reputation** (number): 
- **createdAt** (string): 
  - Required: Yes
- **updatedAt** (string): 
- **metadata** (object): 


### ErrorResponse

#### Properties

- **status** (string): 
  - Required: Yes
  - Values: error
- **code** (string): 
  - Required: Yes
- **message** (string): 
  - Required: Yes
- **details** (object): 
- **timestamp** (string): 
- **requestId** (string): 
- **retryable** (boolean): 



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
