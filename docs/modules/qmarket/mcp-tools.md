# qmarket - MCP Tools

Content Marketplace Module - MCP Tools for marketplace operations

## Overview

This module provides Model Context Protocol (MCP) tools for serverless integration with the Q ecosystem. MCP tools enable function-based interactions that are ideal for AI agents and serverless environments.

## Connection

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/qmarket',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});

await client.connect();
```

## Tools


### qmarket.list

Create a marketplace listing for digital content

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| title | string | Yes | Title of the listing |
| description | string | Yes | Detailed description of the content |
| price | number | Yes | Price in the specified currency |
| currency | string | No | Currency for the listing |
| category | string | No | Content category |
| tags | array | No | Tags for better discoverability |
| fileCid | string | Yes | IPFS CID of the content to be listed |
| fileMetadata | object | No | Metadata about the file |
| visibility | string | No | Who can see and purchase this listing |
| daoId | string | No | DAO ID if visibility is dao-only |
| mintNFT | boolean | No | Whether to mint an NFT for this listing |
| enableResale | boolean | No | Allow buyers to resell this item |
| royaltyPercentage | number | No | Royalty percentage for resales |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| listingId | string | No | Unique identifier for the created listing |
| accessUrl | string | No | URL to access the listing |
| nft | object | No | NFT information if minted |
| ecosystem | object | No | Integration details with other Q modules |
| error | string | No | Error message if operation failed |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qmarket.list', {
  title: "string",
  description: "string",
  price: 0,
  currency: "QToken",
  category: "digital-art",
  tags: [],
  fileCid: "string",
  fileMetadata: {},
  visibility: "public",
  daoId: "string",
  mintNFT: false,
  enableResale: false,
  royaltyPercentage: 0,
});
console.log(result);
```


### qmarket.purchase

Purchase a marketplace listing

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| listingId | string | Yes | ID of the listing to purchase |
| paymentMethod | string | No | Payment method to use |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| purchaseId | string | No | Unique identifier for the purchase |
| accessUrl | string | No | URL to access the purchased content |
| price | number | No | Amount paid |
| currency | string | No | Currency used for payment |
| paymentResult | object | No | Payment processing details |
| purchasedAt | string | No | Timestamp of purchase |
| error | string | No | Error message if operation failed |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qmarket.purchase', {
  listingId: "string",
  paymentMethod: "QToken",
});
console.log(result);
```


### qmarket.license

Manage digital licenses for purchased content

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| action | string | Yes | License action to perform |
| purchaseId | string | No | Purchase ID for license operations |
| listingId | string | No | Listing ID for license operations |
| licenseType | string | No | Type of license to create |
| transferTo | string | No | sQuid ID to transfer license to (for transfer action) |
| expiresAt | string | No | License expiration date (optional) |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| licenseId | string | No | Unique identifier for the license |
| licenseType | string | No | Type of license |
| status | string | No | Current license status |
| holder | string | No | Current license holder sQuid ID |
| permissions | array | No | List of permissions granted by this license |
| createdAt | string | No |  |
| expiresAt | string | No |  |
| error | string | No | Error message if operation failed |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qmarket.license', {
  action: "create",
  purchaseId: "string",
  listingId: "string",
  licenseType: "personal",
  transferTo: "string",
  expiresAt: "2024-01-01T00:00:00Z",
});
console.log(result);
```


### qmarket.search

Search marketplace listings

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| query | string | No | Search query text |
| category | string | No | Filter by category |
| minPrice | number | No | Minimum price filter |
| maxPrice | number | No | Maximum price filter |
| currency | string | No | Filter by currency |
| tags | array | No | Filter by tags |
| limit | integer | No | Number of results to return |
| sortBy | string | No | Sort field |
| sortOrder | string | No | Sort order |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| listings | array | No | Array of matching listings |
| pagination | object | No |  |
| error | string | No | Error message if operation failed |

#### Usage Example

```javascript
const result = await mcpClient.callTool('qmarket.search', {
  query: "string",
  category: "digital-art",
  minPrice: 0,
  maxPrice: 0,
  currency: "QToken",
  tags: [],
  limit: 0,
  sortBy: "createdAt",
  sortOrder: "asc",
});
console.log(result);
```




## Resources

### Marketplace Listings

**URI**: qmarket://listings

Access to marketplace listings and search functionality

### Purchase History

**URI**: qmarket://purchases

Access to user's purchase history and licenses

### Sales History

**URI**: qmarket://sales

Access to user's sales history and revenue analytics




## Prompts

### create-listing-guide

Guide for creating effective marketplace listings

#### Arguments

- **contentType**: Type of content being listed (required)

### pricing-strategy

Suggestions for pricing digital content

#### Arguments

- **category**: Content category (required)
- **fileSize**: File size in bytes



## Error Handling

MCP tools return standardized error responses:

```javascript
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {}
}
```

## Best Practices

1. **Always check success status** before processing results
2. **Handle errors gracefully** with appropriate fallbacks
3. **Use idempotency keys** for write operations
4. **Implement retry logic** with exponential backoff
5. **Cache results** when appropriate to reduce API calls

## Integration Examples

See the [Integration Guide](./integration-guide.md) for complete examples.
