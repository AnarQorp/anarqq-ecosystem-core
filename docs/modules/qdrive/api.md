# Qdrive API Documentation

## Overview
Decentralized file storage with IPFS integration and encryption

## Base URL
`http://localhost:3008`

## Authentication
- **squidAuth**: bearer authentication

## Endpoints

### GET /health
Health check

**Operation ID:** `healthCheck`





**Responses:**
- **200**: Service is healthy


### POST /files
Upload file

**Operation ID:** `uploadFile`



**Request Body:**
```json
{}
```

**Responses:**
- **201**: File uploaded successfully
- **400**: Invalid request
- **413**: File too large


### GET /files
List user files

**Operation ID:** `listFiles`

**Parameters:**
- `limit` (query): No description
- `offset` (query): No description
- `tags` (query): No description
- `privacy` (query): No description
- `sort` (query): No description
- `order` (query): No description



**Responses:**
- **200**: Files retrieved successfully


### GET /files/{cid}
Download file

**Operation ID:** `downloadFile`

**Parameters:**
- `cid` (path): IPFS Content ID
- `download` (query): Force download instead of inline display



**Responses:**
- **200**: File content
- **404**: File not found


### DELETE /files/{cid}
Delete file

**Operation ID:** `deleteFile`

**Parameters:**
- `cid` (path): IPFS Content ID



**Responses:**
- **200**: File deleted successfully
- **404**: File not found


### GET /files/{cid}/metadata
Get file metadata

**Operation ID:** `getFileMetadata`

**Parameters:**
- `cid` (path): IPFS Content ID



**Responses:**
- **200**: File metadata


### PUT /files/{cid}/metadata
Update file metadata

**Operation ID:** `updateFileMetadata`

**Parameters:**
- `cid` (path): IPFS Content ID

**Request Body:**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "privacy": {
      "type": "string",
      "enum": [
        "public",
        "private",
        "dao-only"
      ]
    }
  }
}
```

**Responses:**
- **200**: Metadata updated successfully


### POST /files/{cid}/share
Create sharing link

**Operation ID:** `shareFile`

**Parameters:**
- `cid` (path): IPFS Content ID

**Request Body:**
```json
{
  "type": "object",
  "properties": {
    "recipients": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "sQuid IDs of recipients"
    },
    "permissions": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "read",
          "download",
          "share"
        ]
      },
      "default": [
        "read"
      ]
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time",
      "description": "Share expiration time"
    },
    "password": {
      "type": "string",
      "description": "Optional password protection"
    }
  }
}
```

**Responses:**
- **201**: Share link created


### GET /storage/summary
Get storage summary

**Operation ID:** `getStorageSummary`





**Responses:**
- **200**: Storage summary


## Error Codes
- **400**: Invalid request
- **413**: File too large
- **404**: File not found

## Rate Limits

- **Default**: 100 requests per minute per identity
- **Burst**: 200 requests per minute (temporary)
- **Premium**: 1000 requests per minute (with Qwallet payment)
- **Headers**: Rate limit information in `X-RateLimit-*` headers


## Examples

#### Health check

```bash
curl -X GET \
  "http://localhost:3008/health" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```


#### Upload file

```bash
curl -X POST \
  "http://localhost:3008/files" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{}'
```


#### Download file

```bash
curl -X GET \
  "http://localhost:3008/files/{cid}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

