# Qmarket API - API Reference

Content Marketplace Module for AnarQ&Q Ecosystem

**Version:** 1.0.0

## Base URL

- Development: `http://localhost:3000/api/qmarket`
- Production: `https://api.q.network/qmarket`

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


### POST /api/listings

**Create marketplace listing**

#### Request Body

Content-Type: application/json

Schema: CreateListingRequest

#### Responses

**201**: Listing created successfully

Schema: ListingResponse

**400**: Invalid request data

Schema: ErrorResponse

**401**: Unauthorized

Schema: ErrorResponse


### GET /api/listings

**Search marketplace listings**

#### Parameters

- **query** (query): Search query
  - Type: string
- **category** (query): Filter by category
  - Type: string
  - Values: digital-art, media, documents, software, data, services
- **minPrice** (query): Minimum price filter
  - Type: number
- **maxPrice** (query): Maximum price filter
  - Type: number
- **currency** (query): Filter by currency
  - Type: string
  - Values: QToken, PI
- **tags** (query): Filter by tags (comma-separated)
  - Type: string
- **status** (query): Filter by status
  - Type: string
  - Values: active, sold, expired, deleted
- **limit** (query): Number of results to return
  - Type: integer
- **offset** (query): Number of results to skip
  - Type: integer
- **sortBy** (query): Sort field
  - Type: string
  - Values: createdAt, updatedAt, price, title, viewCount
- **sortOrder** (query): Sort order
  - Type: string
  - Values: asc, desc

#### Responses

**200**: Search results

Schema: SearchResponse


### GET /api/listings/{listingId}

**Get listing details**

#### Parameters

- **listingId** (path): Listing ID
  - Required: Yes
  - Type: string

#### Responses

**200**: Listing details

Schema: ListingResponse

**404**: Listing not found

Schema: ErrorResponse


### PUT /api/listings/{listingId}

**Update listing**

#### Parameters

- **listingId** (path): Listing ID
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

Schema: UpdateListingRequest

#### Responses

**200**: Listing updated successfully

Schema: ListingResponse

**400**: Invalid request data

Schema: ErrorResponse

**401**: Unauthorized

Schema: ErrorResponse

**403**: Forbidden - not listing owner

Schema: ErrorResponse

**404**: Listing not found

Schema: ErrorResponse


### DELETE /api/listings/{listingId}

**Delete listing**

#### Parameters

- **listingId** (path): Listing ID
  - Required: Yes
  - Type: string

#### Responses

**200**: Listing deleted successfully

Schema: SuccessResponse

**401**: Unauthorized

Schema: ErrorResponse

**403**: Forbidden - not listing owner

Schema: ErrorResponse

**404**: Listing not found

Schema: ErrorResponse


### POST /api/listings/{listingId}/purchase

**Purchase listing**

#### Parameters

- **listingId** (path): Listing ID
  - Required: Yes
  - Type: string

#### Request Body

Content-Type: application/json

Schema: PurchaseRequest

#### Responses

**200**: Purchase completed successfully

Schema: PurchaseResponse

**400**: Invalid request or purchase not allowed

Schema: ErrorResponse

**401**: Unauthorized

Schema: ErrorResponse

**402**: Payment required or failed

Schema: ErrorResponse

**404**: Listing not found

Schema: ErrorResponse


### GET /api/purchases

**Get purchase history**

#### Parameters

- **limit** (query): Number of results to return
  - Type: integer
- **offset** (query): Number of results to skip
  - Type: integer

#### Responses

**200**: Purchase history

Schema: PurchaseHistoryResponse

**401**: Unauthorized

Schema: ErrorResponse


### GET /api/sales

**Get sales history**

#### Parameters

- **limit** (query): Number of results to return
  - Type: integer
- **offset** (query): Number of results to skip
  - Type: integer

#### Responses

**200**: Sales history

Schema: SalesHistoryResponse

**401**: Unauthorized

Schema: ErrorResponse


### GET /api/stats

**Get marketplace statistics**

#### Responses

**200**: Marketplace statistics

Schema: MarketplaceStatsResponse



## Data Models


### HealthResponse

#### Properties

- **status** (string): 
  - Values: healthy, degraded, unhealthy
- **timestamp** (string): 
- **version** (string): 
- **marketplace** (object): 


### CreateListingRequest

#### Properties

- **title** (string): 
  - Required: Yes
- **description** (string): 
  - Required: Yes
- **price** (number): 
  - Required: Yes
- **currency** (string): 
  - Values: QToken, PI
- **category** (string): 
  - Values: digital-art, media, documents, software, data, services
- **tags** (array): 
- **fileCid** (string): IPFS CID of the content
  - Required: Yes
- **fileMetadata** (object): 
- **visibility** (string): 
  - Values: public, dao-only, private
- **daoId** (string): Required if visibility is dao-only
- **mintNFT** (boolean): 
- **enableResale** (boolean): 
- **royaltyPercentage** (number): 


### UpdateListingRequest

#### Properties

- **title** (string): 
- **description** (string): 
- **price** (number): 
- **tags** (array): 
- **status** (string): 
  - Values: active, paused, expired


### PurchaseRequest

#### Properties

- **paymentMethod** (string): 
  - Values: QToken, PI


### ListingResponse

#### Properties

- **success** (boolean): 
- **listing** (any): 
- **processingTime** (number): 


### SearchResponse

#### Properties

- **success** (boolean): 
- **listings** (array): 
- **pagination** (any): 


### PurchaseResponse

#### Properties

- **success** (boolean): 
- **purchaseId** (string): 
- **listingId** (string): 
- **price** (number): 
- **currency** (string): 
- **accessUrl** (string): 
- **paymentResult** (object): 
- **purchasedAt** (string): 


### PurchaseHistoryResponse

#### Properties

- **success** (boolean): 
- **purchases** (array): 
- **total** (integer): 
- **pagination** (any): 


### SalesHistoryResponse

#### Properties

- **success** (boolean): 
- **sales** (array): 
- **summary** (object): 
- **pagination** (any): 


### MarketplaceStatsResponse

#### Properties

- **success** (boolean): 
- **stats** (object): 


### Listing

#### Properties

- **id** (string): 
- **title** (string): 
- **description** (string): 
- **price** (number): 
- **currency** (string): 
- **category** (string): 
- **tags** (array): 
- **status** (string): 
- **fileCid** (string): 
- **fileMetadata** (object): 
- **accessUrl** (string): 
- **nft** (object): 
- **ecosystem** (object): 
- **stats** (object): 
- **createdAt** (string): 
- **updatedAt** (string): 


### Purchase

#### Properties

- **purchaseId** (string): 
- **listingId** (string): 
- **title** (string): 
- **price** (number): 
- **currency** (string): 
- **sellerId** (string): 
- **status** (string): 
- **purchasedAt** (string): 
- **accessUrl** (string): 


### Sale

#### Properties

- **purchaseId** (string): 
- **listingId** (string): 
- **title** (string): 
- **price** (number): 
- **currency** (string): 
- **buyerId** (string): 
- **status** (string): 
- **soldAt** (string): 


### Pagination

#### Properties

- **total** (integer): 
- **limit** (integer): 
- **offset** (integer): 
- **hasMore** (boolean): 


### SuccessResponse

#### Properties

- **success** (boolean): 
- **message** (string): 


### ErrorResponse

#### Properties

- **success** (boolean): 
  - Values: false
- **error** (string): 
- **code** (string): 
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
