# QNET - Network Infrastructure API - API Reference

Network infrastructure services for the Q ecosystem

**Version:** 1.0.0

## Base URL

- Development: `http://localhost:3000/api/qnet`
- Production: `https://api.q.network/qnet`

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

Get service health status

#### Responses

**200**: Service health status

Schema: HealthResponse


### GET /nodes

**List network nodes**

Get list of all network nodes

#### Parameters

- **region** (query): Filter by region
  - Type: string
- **status** (query): Filter by status
  - Type: string
  - Values: active, inactive, degraded
- **tier** (query): Filter by tier
  - Type: string
  - Values: standard, premium

#### Responses

**200**: List of network nodes

Schema: NodesResponse


### GET /nodes/{nodeId}

**Get node details**

Get detailed information about a specific node

#### Parameters

- **nodeId** (path): Node identifier
  - Required: Yes
  - Type: string

#### Responses

**200**: Node details

Schema: NodeResponse

**404**: Node not found

Schema: ErrorResponse


### POST /nodes/{nodeId}/ping

**Ping node**

Ping a specific node to test connectivity

#### Parameters

- **nodeId** (path): Node identifier
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

Schema: PingRequest

#### Responses

**200**: Ping result

Schema: PingResponse


### GET /capabilities

**Get network capabilities**

Get available network capabilities and services

#### Responses

**200**: Network capabilities

Schema: CapabilitiesResponse


### GET /topology

**Get network topology**

Get current network topology information

#### Responses

**200**: Network topology

Schema: TopologyResponse


### GET /metrics

**Get network metrics**

Get network performance metrics

#### Parameters

- **timeRange** (query): Time range for metrics
  - Type: string
  - Values: 1h, 6h, 24h, 7d

#### Responses

**200**: Network metrics

Schema: MetricsResponse



## Data Models


### HealthResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 
- **timestamp** (string): 


### NodesResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### NodeResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (any): 


### NetworkNode

#### Properties

- **id** (string): 
- **name** (string): 
- **endpoint** (string): 
- **region** (string): 
- **type** (string): 
  - Values: primary, secondary, mesh, edge
- **tier** (string): 
  - Values: standard, premium
- **status** (string): 
  - Values: active, inactive, degraded
- **capabilities** (array): 
- **metrics** (object): 
- **lastSeen** (string): 


### PingRequest

#### Properties

- **timeout** (integer): 
- **count** (integer): 


### PingResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### CapabilitiesResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### TopologyResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### MetricsResponse

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
