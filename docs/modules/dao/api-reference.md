# DAO/Communities Governance API - API Reference

Decentralized Autonomous Organization governance module for the Q ecosystem

**Version:** 1.0.0

## Base URL

- Development: `http://localhost:3000/api/dao`
- Production: `https://api.q.network/dao`

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

**200**: Service is healthy

Schema: HealthResponse


### GET /api/v1/daos

**List all DAOs**

#### Parameters

- **limit** (query): 
  - Type: integer
- **offset** (query): 
  - Type: integer
- **visibility** (query): 
  - Type: string
  - Values: public, dao-only, private

#### Responses

**200**: List of DAOs

Schema: DAOListResponse


### GET /api/v1/daos/{daoId}

**Get DAO details**

#### Parameters

- **daoId** (path): 
  - Required: Yes
  - Type: string

#### Responses

**200**: DAO details

Schema: DAOResponse

**404**: DAO not found

Schema: ErrorResponse


### POST /api/v1/daos/{daoId}/join

**Join a DAO**

#### Parameters

- **daoId** (path): 
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

Schema: JoinDAORequest

#### Responses

**200**: Successfully joined DAO

Schema: JoinDAOResponse

**400**: Invalid request

Schema: ErrorResponse


### GET /api/v1/daos/{daoId}/proposals

**List proposals for a DAO**

#### Parameters

- **daoId** (path): 
  - Required: Yes
  - Type: string
- **status** (query): 
  - Type: string
  - Values: active, closed, executed, all
- **limit** (query): 
  - Type: integer
- **offset** (query): 
  - Type: integer

#### Responses

**200**: List of proposals

Schema: ProposalListResponse


### POST /api/v1/daos/{daoId}/proposals

**Create a new proposal**

#### Parameters

- **daoId** (path): 
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

Schema: CreateProposalRequest

#### Responses

**201**: Proposal created successfully

Schema: ProposalResponse


### POST /api/v1/daos/{daoId}/proposals/{proposalId}/vote

**Vote on a proposal**

#### Parameters

- **daoId** (path): 
  - Required: Yes
  - Type: string
- **proposalId** (path): 
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

Schema: VoteRequest

#### Responses

**200**: Vote cast successfully

Schema: VoteResponse


### POST /api/v1/daos/{daoId}/proposals/{proposalId}/execute

**Execute an approved proposal**

#### Parameters

- **daoId** (path): 
  - Required: Yes
  - Type: string
- **proposalId** (path): 
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

Schema: ExecuteProposalRequest

#### Responses

**200**: Proposal executed successfully

Schema: ExecuteProposalResponse


### GET /api/v1/daos/{daoId}/results

**Get voting results for a DAO**

#### Parameters

- **daoId** (path): 
  - Required: Yes
  - Type: string

#### Responses

**200**: Voting results

Schema: ResultsResponse



## Data Models


### HealthResponse

#### Properties

- **status** (string): 
  - Values: healthy, degraded, unhealthy
- **timestamp** (string): 
- **version** (string): 
- **dependencies** (object): 


### DAO

#### Properties

- **id** (string): 
- **name** (string): 
- **description** (string): 
- **visibility** (string): 
  - Values: public, dao-only, private
- **memberCount** (integer): 
- **quorum** (integer): 
- **proposalCount** (integer): 
- **activeProposals** (integer): 
- **tokenRequirement** (object): 
- **governanceRules** (object): 
- **createdAt** (string): 
- **isActive** (boolean): 


### Proposal

#### Properties

- **id** (string): 
- **daoId** (string): 
- **title** (string): 
- **description** (string): 
- **options** (array): 
- **createdBy** (string): 
- **createdAt** (string): 
- **expiresAt** (string): 
- **status** (string): 
  - Values: active, closed, executed
- **voteCount** (integer): 
- **quorum** (integer): 
- **results** (object): 


### Vote

#### Properties

- **id** (string): 
- **proposalId** (string): 
- **option** (string): 
- **weight** (number): 
- **timestamp** (string): 


### DAOListResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### DAOResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (any): 


### JoinDAORequest

#### Properties

- **userId** (string): 
  - Required: Yes
- **signature** (string): 
  - Required: Yes


### JoinDAOResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### CreateProposalRequest

#### Properties

- **title** (string): 
  - Required: Yes
- **description** (string): 
  - Required: Yes
- **options** (array): 
- **duration** (integer): 
- **minQuorum** (integer): 
- **creatorId** (string): 
  - Required: Yes
- **signature** (string): 
  - Required: Yes


### ProposalResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (any): 


### ProposalListResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### VoteRequest

#### Properties

- **voterId** (string): 
  - Required: Yes
- **option** (string): 
  - Required: Yes
- **signature** (string): 
  - Required: Yes


### VoteResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### ExecuteProposalRequest

#### Properties

- **executorId** (string): 
  - Required: Yes
- **signature** (string): 
  - Required: Yes


### ExecuteProposalResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### ResultsResponse

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
