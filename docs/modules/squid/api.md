# Squid API Documentation

## Overview
Identity & Subidentities management for Q ecosystem

## Base URL
`http://localhost:3001`

## Authentication
- **SquidAuth**: API Key in header

## Endpoints

### GET /health
Health check endpoint

**Operation ID:** `getHealth`





**Responses:**
- **200**: Service health status


### POST /identity
Create new root identity

**Operation ID:** `createIdentity`



**Request Body:**
```json
{
  "$ref": "#/components/schemas/CreateIdentityRequest"
}
```

**Responses:**
- **201**: Identity created successfully
- **400**: Invalid request


### GET /identity/{identityId}
Get identity information

**Operation ID:** `getIdentity`

**Parameters:**
- `identityId` (path): No description



**Responses:**
- **200**: Identity information
- **404**: Identity not found


### POST /identity/{identityId}/subidentity
Create subidentity

**Operation ID:** `createSubidentity`

**Parameters:**
- `identityId` (path): No description

**Request Body:**
```json
{
  "$ref": "#/components/schemas/CreateSubidentityRequest"
}
```

**Responses:**
- **201**: Subidentity created successfully
- **400**: Invalid request
- **403**: Insufficient permissions


### PUT /identity/{identityId}/verify
Submit identity verification

**Operation ID:** `submitVerification`

**Parameters:**
- `identityId` (path): No description

**Request Body:**
```json
{
  "$ref": "#/components/schemas/VerificationRequest"
}
```

**Responses:**
- **200**: Verification submitted successfully
- **400**: Invalid verification data


### GET /identity/{identityId}/reputation
Get identity reputation

**Operation ID:** `getReputation`

**Parameters:**
- `identityId` (path): No description



**Responses:**
- **200**: Reputation information


## Error Codes
- **400**: Invalid request
- **404**: Identity not found
- **403**: Insufficient permissions
- **400**: Invalid verification data

## Rate Limits

- **Default**: 100 requests per minute per identity
- **Burst**: 200 requests per minute (temporary)
- **Premium**: 1000 requests per minute (with Qwallet payment)
- **Headers**: Rate limit information in `X-RateLimit-*` headers


## Examples

#### Health check endpoint

```bash
curl -X GET \
  "http://localhost:3001/health" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```


#### Create new root identity

```bash
curl -X POST \
  "http://localhost:3001/identity" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d 'null'
```


#### Get identity information

```bash
curl -X GET \
  "http://localhost:3001/identity/{identityId}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

