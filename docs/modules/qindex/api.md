# Qindex API Documentation

## Overview
Indexing & Pointers Module for Q Ecosystem

## Base URL
`http://localhost:3006`

## Authentication
No authentication required

## Endpoints

### GET /health
Health check

**Operation ID:** `healthCheck`





**Responses:**
- **200**: Service is healthy


### POST /qindex/put
Store indexed record

**Operation ID:** `putRecord`



**Request Body:**
```json
{
  "$ref": "#/components/schemas/PutRecordRequest"
}
```

**Responses:**
- **201**: Record stored successfully
- **400**: Invalid request


### GET /qindex/get/{key}
Retrieve record by key

**Operation ID:** `getRecord`

**Parameters:**
- `key` (path): No description
- `version` (query): Specific version to retrieve



**Responses:**
- **200**: Record retrieved successfully
- **404**: Record not found


### GET /qindex/list
List records with filtering

**Operation ID:** `listRecords`

**Parameters:**
- `prefix` (query): Key prefix filter
- `limit` (query): No description
- `offset` (query): No description
- `sort` (query): No description



**Responses:**
- **200**: Records listed successfully


### GET /qindex/history/{key}
Get record history

**Operation ID:** `getRecordHistory`

**Parameters:**
- `key` (path): No description
- `limit` (query): No description



**Responses:**
- **200**: History retrieved successfully


### DELETE /qindex/delete/{key}
Remove record

**Operation ID:** `deleteRecord`

**Parameters:**
- `key` (path): No description



**Responses:**
- **200**: Record deleted successfully
- **404**: Record not found


## Error Codes
- **400**: Invalid request
- **404**: Record not found

## Rate Limits

- **Default**: 100 requests per minute per identity
- **Burst**: 200 requests per minute (temporary)
- **Premium**: 1000 requests per minute (with Qwallet payment)
- **Headers**: Rate limit information in `X-RateLimit-*` headers


## Examples

#### Health check

```bash
curl -X GET \
  "http://localhost:3006/health" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```


#### Store indexed record

```bash
curl -X POST \
  "http://localhost:3006/qindex/put" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d 'null'
```


#### Retrieve record by key

```bash
curl -X GET \
  "http://localhost:3006/qindex/get/{key}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

