# Qmarket API Documentation

## Overview
Content Marketplace Module for AnarQ&Q Ecosystem

## Base URL
`http://localhost:3008`

## Authentication
- **squidAuth**: bearer authentication

## Endpoints

### GET /health
Health check endpoint

**Operation ID:** `healthCheck`





**Responses:**
- **200**: Service is healthy


### POST /api/listings
Create marketplace listing

**Operation ID:** `createListing`



**Request Body:**
```json
{
  "$ref": "#/components/schemas/CreateListingRequest"
}
```

**Responses:**
- **201**: Listing created successfully
- **400**: Invalid request data
- **401**: Unauthorized


### GET /api/listings
Search marketplace listings

**Operation ID:** `searchListings`

**Parameters:**
- `query` (query): Search query
- `category` (query): Filter by category
- `minPrice` (query): Minimum price filter
- `maxPrice` (query): Maximum price filter
- `currency` (query): Filter by currency
- `tags` (query): Filter by tags (comma-separated)
- `status` (query): Filter by status
- `limit` (query): Number of results to return
- `offset` (query): Number of results to skip
- `sortBy` (query): Sort field
- `sortOrder` (query): Sort order



**Responses:**
- **200**: Search results


### GET /api/listings/{listingId}
Get listing details

**Operation ID:** `getListing`

**Parameters:**
- `listingId` (path): Listing ID



**Responses:**
- **200**: Listing details
- **404**: Listing not found


### PUT /api/listings/{listingId}
Update listing

**Operation ID:** `updateListing`

**Parameters:**
- `listingId` (path): Listing ID

**Request Body:**
```json
{
  "$ref": "#/components/schemas/UpdateListingRequest"
}
```

**Responses:**
- **200**: Listing updated successfully
- **400**: Invalid request data
- **401**: Unauthorized
- **403**: Forbidden - not listing owner
- **404**: Listing not found


### DELETE /api/listings/{listingId}
Delete listing

**Operation ID:** `deleteListing`

**Parameters:**
- `listingId` (path): Listing ID



**Responses:**
- **200**: Listing deleted successfully
- **401**: Unauthorized
- **403**: Forbidden - not listing owner
- **404**: Listing not found


### POST /api/listings/{listingId}/purchase
Purchase listing

**Operation ID:** `purchaseListing`

**Parameters:**
- `listingId` (path): Listing ID

**Request Body:**
```json
{
  "$ref": "#/components/schemas/PurchaseRequest"
}
```

**Responses:**
- **200**: Purchase completed successfully
- **400**: Invalid request or purchase not allowed
- **401**: Unauthorized
- **402**: Payment required or failed
- **404**: Listing not found


### GET /api/purchases
Get purchase history

**Operation ID:** `getPurchaseHistory`

**Parameters:**
- `limit` (query): Number of results to return
- `offset` (query): Number of results to skip



**Responses:**
- **200**: Purchase history
- **401**: Unauthorized


### GET /api/sales
Get sales history

**Operation ID:** `getSalesHistory`

**Parameters:**
- `limit` (query): Number of results to return
- `offset` (query): Number of results to skip



**Responses:**
- **200**: Sales history
- **401**: Unauthorized


### GET /api/stats
Get marketplace statistics

**Operation ID:** `getMarketplaceStats`





**Responses:**
- **200**: Marketplace statistics


## Error Codes
- **400**: Invalid request data
- **401**: Unauthorized
- **404**: Listing not found
- **403**: Forbidden - not listing owner
- **400**: Invalid request or purchase not allowed
- **402**: Payment required or failed

## Rate Limits

- **Default**: 100 requests per minute per identity
- **Burst**: 200 requests per minute (temporary)
- **Premium**: 1000 requests per minute (with Qwallet payment)
- **Headers**: Rate limit information in `X-RateLimit-*` headers


## Examples

#### Health check endpoint

```bash
curl -X GET \
  "http://localhost:3008/health" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```


#### Create marketplace listing

```bash
curl -X POST \
  "http://localhost:3008/api/listings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d 'null'
```


#### Get listing details

```bash
curl -X GET \
  "http://localhost:3008/api/listings/{listingId}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

