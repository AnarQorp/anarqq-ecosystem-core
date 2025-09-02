# QpiC API - API Reference

Media Management module for Q ecosystem with transcoding, optimization, and marketplace integration

**Version:** 2.0.0

## Base URL

- Development: `http://localhost:3000/api/qpic`
- Production: `https://api.q.network/qpic`

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


### MediaMetadata

#### Properties

- **technical** (object): 
- **descriptive** (object): 
- **rights** (object): 
- **provenance** (object): 


### MediaFile

#### Properties

- **id** (string): Unique media identifier
  - Required: Yes
- **cid** (string): IPFS Content Identifier
  - Required: Yes
- **filename** (string): Original filename
  - Required: Yes
- **format** (string): MIME type
  - Required: Yes
- **size** (integer): File size in bytes
  - Required: Yes
- **status** (string): Media processing status
  - Required: Yes
  - Values: uploading, processing, ready, failed, deleted
- **metadata** (any): 
- **thumbnails** (array): 
- **formats** (array): 
- **privacy** (object): 
- **access** (object): 
- **marketplace** (object): 


### TranscodingProfile

#### Properties

- **name** (string): Profile name
  - Required: Yes
- **format** (string): Output format
  - Required: Yes
  - Values: mp4, webm, jpg, jpeg, png, webp, avif, mp3, aac, opus, flac
- **quality** (string): Quality level
  - Values: low, medium, high, ultra
- **resolution** (string): Resolution (e.g., '1920x1080', '720p')
- **bitrate** (string): Bitrate (e.g., '2000k', '128k')
- **options** (object): Additional transcoding options


### TranscodingJob

#### Properties

- **jobId** (string): Job identifier
- **mediaId** (string): Source media identifier
- **status** (string): Job status
  - Values: queued, processing, completed, failed, cancelled
- **progress** (number): Completion percentage
- **profiles** (array): 
- **results** (array): 
- **createdAt** (string): 
- **completedAt** (string): 
- **estimatedTime** (integer): Estimated completion time in seconds


### MediaLicense

#### Properties

- **id** (string): License identifier
  - Required: Yes
- **mediaId** (string): Associated media identifier
  - Required: Yes
- **type** (string): License type
  - Required: Yes
  - Values: exclusive, non-exclusive, royalty-free, rights-managed, creative-commons
- **status** (string): License status
  - Required: Yes
  - Values: active, expired, revoked, pending
- **licensee** (string): Licensee identity
- **usage** (array): Allowed usage types
- **territory** (string): Geographic territory
- **duration** (string): License duration
- **price** (object): 
- **restrictions** (array): Usage restrictions
- **attribution** (object): 
- **contractCid** (string): IPFS CID of license contract
- **createdAt** (string): 
- **expiresAt** (string): 


### ApiResponse

#### Properties

- **status** (string): Response status
  - Values: ok, error
- **code** (string): Response code
- **message** (string): Human readable message
- **data** (object): Response data
- **cid** (string): IPFS Content Identifier (when applicable)
- **timestamp** (string): Response timestamp


### ErrorResponse

#### Properties

- **status** (string): Response status
  - Values: error
- **code** (string): Error code
- **message** (string): Error message
- **details** (object): Error details
- **timestamp** (string): Error timestamp



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
