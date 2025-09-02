# Dao API Documentation

## Overview
Decentralized Autonomous Organization governance module for the Q ecosystem

## Base URL
`http://localhost:3014`

## Authentication
- **BearerAuth**: bearer authentication

## Endpoints

### GET /health
Health check endpoint

**Operation ID:** `getHealth`





**Responses:**
- **200**: Service is healthy


### GET /api/v1/daos
List all DAOs

**Operation ID:** `listDAOs`

**Parameters:**
- `limit` (query): No description
- `offset` (query): No description
- `visibility` (query): No description



**Responses:**
- **200**: List of DAOs


### GET /api/v1/daos/{daoId}
Get DAO details

**Operation ID:** `getDAO`

**Parameters:**
- `daoId` (path): No description



**Responses:**
- **200**: DAO details
- **404**: DAO not found


### POST /api/v1/daos/{daoId}/join
Join a DAO

**Operation ID:** `joinDAO`

**Parameters:**
- `daoId` (path): No description

**Request Body:**
```json
{
  "$ref": "#/components/schemas/JoinDAORequest"
}
```

**Responses:**
- **200**: Successfully joined DAO
- **400**: Invalid request


### GET /api/v1/daos/{daoId}/proposals
List proposals for a DAO

**Operation ID:** `listProposals`

**Parameters:**
- `daoId` (path): No description
- `status` (query): No description
- `limit` (query): No description
- `offset` (query): No description



**Responses:**
- **200**: List of proposals


### POST /api/v1/daos/{daoId}/proposals
Create a new proposal

**Operation ID:** `createProposal`

**Parameters:**
- `daoId` (path): No description

**Request Body:**
```json
{
  "$ref": "#/components/schemas/CreateProposalRequest"
}
```

**Responses:**
- **201**: Proposal created successfully


### POST /api/v1/daos/{daoId}/proposals/{proposalId}/vote
Vote on a proposal

**Operation ID:** `voteOnProposal`

**Parameters:**
- `daoId` (path): No description
- `proposalId` (path): No description

**Request Body:**
```json
{
  "$ref": "#/components/schemas/VoteRequest"
}
```

**Responses:**
- **200**: Vote cast successfully


### POST /api/v1/daos/{daoId}/proposals/{proposalId}/execute
Execute an approved proposal

**Operation ID:** `executeProposal`

**Parameters:**
- `daoId` (path): No description
- `proposalId` (path): No description

**Request Body:**
```json
{
  "$ref": "#/components/schemas/ExecuteProposalRequest"
}
```

**Responses:**
- **200**: Proposal executed successfully


### GET /api/v1/daos/{daoId}/results
Get voting results for a DAO

**Operation ID:** `getResults`

**Parameters:**
- `daoId` (path): No description



**Responses:**
- **200**: Voting results


## Error Codes
- **404**: DAO not found
- **400**: Invalid request

## Rate Limits

- **Default**: 100 requests per minute per identity
- **Burst**: 200 requests per minute (temporary)
- **Premium**: 1000 requests per minute (with Qwallet payment)
- **Headers**: Rate limit information in `X-RateLimit-*` headers


## Examples

#### Health check endpoint

```bash
curl -X GET \
  "http://localhost:3014/health" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```


#### List all DAOs

```bash
curl -X GET \
  "http://localhost:3014/api/v1/daos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```


#### Get DAO details

```bash
curl -X GET \
  "http://localhost:3014/api/v1/daos/{daoId}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

