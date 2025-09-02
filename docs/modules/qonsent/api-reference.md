# Qonsent API - API Reference

Policies & Permissions module for Q ecosystem with UCAN policy engine

**Version:** 2.0.0

## Base URL

- Development: `http://localhost:3000/api/qonsent`
- Production: `https://api.q.network/qonsent`

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



## Data Models


### HealthResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **timestamp** (string): 
- **version** (string): 
- **dependencies** (object): 


### CheckPermissionRequest

#### Properties

- **resource** (string): Resource identifier (e.g., "qdrive:file:abc123")
  - Required: Yes
- **identity** (string): Identity DID
  - Required: Yes
- **action** (string): Action to check (e.g., "read", "write", "delete")
  - Required: Yes
- **context** (object): Additional context for permission check


### CheckPermissionResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **data** (object): 


### GrantPermissionRequest

#### Properties

- **resource** (string): Resource identifier
  - Required: Yes
- **identity** (string): Target identity DID
  - Required: Yes
- **permissions** (array): List of permissions to grant
  - Required: Yes
- **expiresAt** (string): Optional expiration time
- **conditions** (object): Additional conditions for the grant


### GrantPermissionResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **data** (object): 


### RevokePermissionRequest

#### Properties

- **resource** (string): Resource identifier
  - Required: Yes
- **identity** (string): Target identity DID
  - Required: Yes
- **permissions** (array): Specific permissions to revoke (if empty, revokes all)


### RevokePermissionResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **data** (object): 


### CreatePolicyRequest

#### Properties

- **name** (string): 
  - Required: Yes
- **description** (string): 
- **rules** (array): 
  - Required: Yes
- **scope** (string): 
  - Values: global, dao, resource


### CreatePolicyResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **data** (object): 


### ListPoliciesResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **data** (object): 


### DeletePolicyResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **data** (object): 


### ErrorResponse

#### Properties

- **status** (string): 
  - Values: error
- **code** (string): 
- **message** (string): 
- **details** (object): 
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
