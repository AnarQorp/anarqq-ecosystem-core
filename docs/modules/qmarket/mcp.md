# Qmarket MCP Tools

## Overview
Content Marketplace Module - MCP Tools for marketplace operations

## Available Tools

## qmarket.list

Create a marketplace listing for digital content

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Title of the listing",
      "minLength": 3,
      "maxLength": 100
    },
    "description": {
      "type": "string",
      "description": "Detailed description of the content",
      "minLength": 10,
      "maxLength": 1000
    },
    "price": {
      "type": "number",
      "description": "Price in the specified currency",
      "minimum": 0.01
    },
    "currency": {
      "type": "string",
      "description": "Currency for the listing",
      "enum": [
        "QToken",
        "PI"
      ],
      "default": "QToken"
    },
    "category": {
      "type": "string",
      "description": "Content category",
      "enum": [
        "digital-art",
        "media",
        "documents",
        "software",
        "data",
        "services"
      ],
      "default": "media"
    },
    "tags": {
      "type": "array",
      "description": "Tags for better discoverability",
      "items": {
        "type": "string"
      },
      "maxItems": 10
    },
    "fileCid": {
      "type": "string",
      "description": "IPFS CID of the content to be listed"
    },
    "fileMetadata": {
      "type": "object",
      "description": "Metadata about the file",
      "properties": {
        "contentType": {
          "type": "string",
          "description": "MIME type of the content"
        },
        "fileSize": {
          "type": "integer",
          "description": "File size in bytes"
        },
        "thumbnailUrl": {
          "type": "string",
          "description": "URL to thumbnail image"
        }
      }
    },
    "visibility": {
      "type": "string",
      "description": "Who can see and purchase this listing",
      "enum": [
        "public",
        "dao-only",
        "private"
      ],
      "default": "public"
    },
    "daoId": {
      "type": "string",
      "description": "DAO ID if visibility is dao-only"
    },
    "mintNFT": {
      "type": "boolean",
      "description": "Whether to mint an NFT for this listing",
      "default": true
    },
    "enableResale": {
      "type": "boolean",
      "description": "Allow buyers to resell this item",
      "default": true
    },
    "royaltyPercentage": {
      "type": "number",
      "description": "Royalty percentage for resales",
      "minimum": 0,
      "maximum": 50,
      "default": 5
    }
  },
  "required": [
    "title",
    "description",
    "price",
    "fileCid"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "listingId": {
      "type": "string",
      "description": "Unique identifier for the created listing"
    },
    "accessUrl": {
      "type": "string",
      "description": "URL to access the listing"
    },
    "nft": {
      "type": "object",
      "description": "NFT information if minted",
      "properties": {
        "tokenId": {
          "type": "string"
        },
        "contractAddress": {
          "type": "string"
        }
      }
    },
    "ecosystem": {
      "type": "object",
      "description": "Integration details with other Q modules"
    },
    "error": {
      "type": "string",
      "description": "Error message if operation failed"
    }
  }
}
```


## qmarket.purchase

Purchase a marketplace listing

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "listingId": {
      "type": "string",
      "description": "ID of the listing to purchase"
    },
    "paymentMethod": {
      "type": "string",
      "description": "Payment method to use",
      "enum": [
        "QToken",
        "PI"
      ],
      "default": "QToken"
    }
  },
  "required": [
    "listingId"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "purchaseId": {
      "type": "string",
      "description": "Unique identifier for the purchase"
    },
    "accessUrl": {
      "type": "string",
      "description": "URL to access the purchased content"
    },
    "price": {
      "type": "number",
      "description": "Amount paid"
    },
    "currency": {
      "type": "string",
      "description": "Currency used for payment"
    },
    "paymentResult": {
      "type": "object",
      "description": "Payment processing details"
    },
    "purchasedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp of purchase"
    },
    "error": {
      "type": "string",
      "description": "Error message if operation failed"
    }
  }
}
```


## qmarket.license

Manage digital licenses for purchased content

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "description": "License action to perform",
      "enum": [
        "create",
        "verify",
        "revoke",
        "transfer"
      ]
    },
    "purchaseId": {
      "type": "string",
      "description": "Purchase ID for license operations"
    },
    "listingId": {
      "type": "string",
      "description": "Listing ID for license operations"
    },
    "licenseType": {
      "type": "string",
      "description": "Type of license to create",
      "enum": [
        "personal",
        "commercial",
        "resale",
        "derivative"
      ],
      "default": "personal"
    },
    "transferTo": {
      "type": "string",
      "description": "sQuid ID to transfer license to (for transfer action)"
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time",
      "description": "License expiration date (optional)"
    }
  },
  "required": [
    "action"
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "licenseId": {
      "type": "string",
      "description": "Unique identifier for the license"
    },
    "licenseType": {
      "type": "string",
      "description": "Type of license"
    },
    "status": {
      "type": "string",
      "description": "Current license status",
      "enum": [
        "active",
        "expired",
        "revoked",
        "transferred"
      ]
    },
    "holder": {
      "type": "string",
      "description": "Current license holder sQuid ID"
    },
    "permissions": {
      "type": "array",
      "description": "List of permissions granted by this license",
      "items": {
        "type": "string"
      }
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time"
    },
    "error": {
      "type": "string",
      "description": "Error message if operation failed"
    }
  }
}
```


## qmarket.search

Search marketplace listings

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query text"
    },
    "category": {
      "type": "string",
      "description": "Filter by category",
      "enum": [
        "digital-art",
        "media",
        "documents",
        "software",
        "data",
        "services"
      ]
    },
    "minPrice": {
      "type": "number",
      "description": "Minimum price filter",
      "minimum": 0
    },
    "maxPrice": {
      "type": "number",
      "description": "Maximum price filter",
      "minimum": 0
    },
    "currency": {
      "type": "string",
      "description": "Filter by currency",
      "enum": [
        "QToken",
        "PI"
      ]
    },
    "tags": {
      "type": "array",
      "description": "Filter by tags",
      "items": {
        "type": "string"
      }
    },
    "limit": {
      "type": "integer",
      "description": "Number of results to return",
      "minimum": 1,
      "maximum": 100,
      "default": 20
    },
    "sortBy": {
      "type": "string",
      "description": "Sort field",
      "enum": [
        "createdAt",
        "updatedAt",
        "price",
        "title",
        "viewCount"
      ],
      "default": "createdAt"
    },
    "sortOrder": {
      "type": "string",
      "description": "Sort order",
      "enum": [
        "asc",
        "desc"
      ],
      "default": "desc"
    }
  }
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "listings": {
      "type": "array",
      "description": "Array of matching listings",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "title": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "price": {
            "type": "number"
          },
          "currency": {
            "type": "string"
          },
          "category": {
            "type": "string"
          },
          "tags": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      }
    },
    "pagination": {
      "type": "object",
      "properties": {
        "total": {
          "type": "integer"
        },
        "hasMore": {
          "type": "boolean"
        }
      }
    },
    "error": {
      "type": "string",
      "description": "Error message if operation failed"
    }
  }
}
```


## Usage Examples

### qmarket.list Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qmarket');

const result = await client.callTool('qmarket.list', {
  "title": "string",
  "description": "string",
  "price": 123,
  "currency": "QToken",
  "category": "digital-art",
  "tags": [
    "string"
  ],
  "fileCid": "string",
  "fileMetadata": {
    "contentType": "string",
    "fileSize": 123,
    "thumbnailUrl": "string"
  },
  "visibility": "public",
  "daoId": "string",
  "mintNFT": true,
  "enableResale": true,
  "royaltyPercentage": 123
});

console.log(result);
// Expected output structure:
// {
  "success": true,
  "listingId": "string",
  "accessUrl": "string",
  "nft": {
    "tokenId": "string",
    "contractAddress": "string"
  },
  "ecosystem": {},
  "error": "string"
}
```


### qmarket.purchase Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qmarket');

const result = await client.callTool('qmarket.purchase', {
  "listingId": "string",
  "paymentMethod": "QToken"
});

console.log(result);
// Expected output structure:
// {
  "success": true,
  "purchaseId": "string",
  "accessUrl": "string",
  "price": 123,
  "currency": "string",
  "paymentResult": {},
  "purchasedAt": "string",
  "error": "string"
}
```


## Integration Guide

## Installation

```bash
npm install @anarq/qmarket-client
```

## Configuration

```javascript
import { QmarketClient } from '@anarq/qmarket-client';

const client = new QmarketClient({
  url: 'http://localhost:3080',
  apiKey: process.env.QMARKET_API_KEY,
  timeout: 30000
});
```

## Error Handling

```javascript
try {
  const result = await client.callTool('toolName', params);
} catch (error) {
  if (error.code === 'TIMEOUT') {
    // Handle timeout
  } else if (error.code === 'AUTH_FAILED') {
    // Handle authentication failure
  } else {
    // Handle other errors
  }
}
```


## Error Handling

## Common Error Codes

- **INVALID_INPUT**: Input parameters don't match schema
- **AUTH_FAILED**: Authentication or authorization failed
- **RESOURCE_NOT_FOUND**: Requested resource doesn't exist
- **RATE_LIMIT_EXCEEDED**: Too many requests
- **SERVICE_UNAVAILABLE**: Service temporarily unavailable
- **TIMEOUT**: Request timed out

## Error Response Format

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {
    "field": "Additional error details"
  }
}
```

