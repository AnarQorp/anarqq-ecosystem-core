# Qwallet MCP Tools

## Overview
Qwallet MCP Tools - Payments & Fees Module

## Available Tools

## wallet.sign

Sign transaction with sQuid identity

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "squidId": {
      "type": "string",
      "description": "sQuid identity ID"
    },
    "intentId": {
      "type": "string",
      "description": "Payment intent ID to sign"
    },
    "signature": {
      "type": "string",
      "description": "Cryptographic signature"
    }
  },
  "required": [
    "squidId",
    "intentId",
    "signature"
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
    "transactionId": {
      "type": "string"
    },
    "signature": {
      "type": "string"
    },
    "gasEstimate": {
      "type": "number"
    },
    "error": {
      "type": "string"
    }
  }
}
```


## wallet.pay

Process payment transaction

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "squidId": {
      "type": "string",
      "description": "sQuid identity ID"
    },
    "transactionId": {
      "type": "string",
      "description": "Signed transaction ID"
    }
  },
  "required": [
    "squidId",
    "transactionId"
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
    "transactionId": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "SETTLED",
        "FAILED"
      ]
    },
    "settlementHash": {
      "type": "string"
    },
    "settledAt": {
      "type": "string",
      "format": "date-time"
    },
    "error": {
      "type": "string"
    }
  }
}
```


## wallet.quote

Get payment quote with fees and timing

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "amount": {
      "type": "number",
      "minimum": 0.01,
      "description": "Payment amount"
    },
    "currency": {
      "type": "string",
      "enum": [
        "QToken",
        "PI"
      ],
      "description": "Payment currency"
    },
    "network": {
      "type": "string",
      "description": "Target blockchain network"
    },
    "priority": {
      "type": "string",
      "enum": [
        "low",
        "normal",
        "high"
      ],
      "default": "normal",
      "description": "Transaction priority"
    }
  },
  "required": [
    "amount",
    "currency"
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
    "amount": {
      "type": "number"
    },
    "currency": {
      "type": "string"
    },
    "fees": {
      "type": "object",
      "properties": {
        "network": {
          "type": "number"
        },
        "platform": {
          "type": "number"
        },
        "total": {
          "type": "number"
        }
      }
    },
    "estimatedTime": {
      "type": "string"
    },
    "exchangeRate": {
      "type": "number"
    },
    "error": {
      "type": "string"
    }
  }
}
```


## wallet.balance

Get wallet balance for sQuid identity

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "squidId": {
      "type": "string",
      "description": "sQuid identity ID"
    },
    "currency": {
      "type": "string",
      "enum": [
        "QToken",
        "PI"
      ],
      "description": "Currency to check (optional, returns all if not specified)"
    }
  },
  "required": [
    "squidId"
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
    "squidId": {
      "type": "string"
    },
    "balances": {
      "type": "object",
      "additionalProperties": {
        "type": "number"
      }
    },
    "walletAddress": {
      "type": "string"
    },
    "lastUpdated": {
      "type": "string",
      "format": "date-time"
    },
    "error": {
      "type": "string"
    }
  }
}
```


## wallet.intent

Create payment intent

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "squidId": {
      "type": "string",
      "description": "sQuid identity ID"
    },
    "amount": {
      "type": "number",
      "minimum": 0.01,
      "description": "Payment amount"
    },
    "currency": {
      "type": "string",
      "enum": [
        "QToken",
        "PI"
      ],
      "description": "Payment currency"
    },
    "recipient": {
      "type": "string",
      "description": "Recipient sQuid ID or wallet address"
    },
    "purpose": {
      "type": "string",
      "description": "Payment purpose description"
    },
    "metadata": {
      "type": "object",
      "description": "Additional payment metadata"
    },
    "expiresIn": {
      "type": "integer",
      "description": "Expiration time in seconds (default: 3600)"
    }
  },
  "required": [
    "squidId",
    "amount",
    "currency",
    "recipient"
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
    "intentId": {
      "type": "string"
    },
    "amount": {
      "type": "number"
    },
    "currency": {
      "type": "string"
    },
    "recipient": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "PENDING",
        "SIGNED",
        "SETTLED",
        "FAILED",
        "EXPIRED"
      ]
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
      "type": "string"
    }
  }
}
```


## Usage Examples

### wallet.sign Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qwallet');

const result = await client.callTool('wallet.sign', {
  "squidId": "string",
  "intentId": "string",
  "signature": "string"
});

console.log(result);
// Expected output structure:
// {
  "success": true,
  "transactionId": "string",
  "signature": "string",
  "gasEstimate": 123,
  "error": "string"
}
```


### wallet.pay Example

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient('qwallet');

const result = await client.callTool('wallet.pay', {
  "squidId": "string",
  "transactionId": "string"
});

console.log(result);
// Expected output structure:
// {
  "success": true,
  "transactionId": "string",
  "status": "SETTLED",
  "settlementHash": "string",
  "settledAt": "string",
  "error": "string"
}
```


## Integration Guide

## Installation

```bash
npm install @anarq/qwallet-client
```

## Configuration

```javascript
import { QwalletClient } from '@anarq/qwallet-client';

const client = new QwalletClient({
  url: 'http://localhost:3000',
  apiKey: process.env.QWALLET_API_KEY,
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

