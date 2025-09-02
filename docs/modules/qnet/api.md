# Qnet API Documentation

## Overview
Network infrastructure services for the Q ecosystem

## Base URL
`http://localhost:3014`

## Authentication
- **BearerAuth**: bearer authentication
- **ApiKeyAuth**: API Key in header

## Endpoints

### GET /health
Health check

**Operation ID:** `getHealth`





**Responses:**
- **200**: Service health status


### GET /nodes
List network nodes

**Operation ID:** `listNodes`

**Parameters:**
- `region` (query): Filter by region
- `status` (query): Filter by status
- `tier` (query): Filter by tier



**Responses:**
- **200**: List of network nodes


### GET /nodes/{nodeId}
Get node details

**Operation ID:** `getNode`

**Parameters:**
- `nodeId` (path): Node identifier



**Responses:**
- **200**: Node details
- **404**: Node not found


### POST /nodes/{nodeId}/ping
Ping node

**Operation ID:** `pingNode`

**Parameters:**
- `nodeId` (path): Node identifier

**Request Body:**
```json
{
  "$ref": "#/components/schemas/PingRequest"
}
```

**Responses:**
- **200**: Ping result


### GET /capabilities
Get network capabilities

**Operation ID:** `getCapabilities`





**Responses:**
- **200**: Network capabilities


### GET /topology
Get network topology

**Operation ID:** `getTopology`





**Responses:**
- **200**: Network topology


### GET /metrics
Get network metrics

**Operation ID:** `getMetrics`

**Parameters:**
- `timeRange` (query): Time range for metrics



**Responses:**
- **200**: Network metrics


## Error Codes
- **404**: Node not found

## Rate Limits

- **Default**: 100 requests per minute per identity
- **Burst**: 200 requests per minute (temporary)
- **Premium**: 1000 requests per minute (with Qwallet payment)
- **Headers**: Rate limit information in `X-RateLimit-*` headers


## Examples

#### Health check

```bash
curl -X GET \
  "http://localhost:3014/health" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```


#### List network nodes

```bash
curl -X GET \
  "http://localhost:3014/nodes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```


#### Get node details

```bash
curl -X GET \
  "http://localhost:3014/nodes/{nodeId}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

