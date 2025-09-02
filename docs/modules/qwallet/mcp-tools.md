# qwallet - MCP Tools

Qwallet MCP Tools - Payments & Fees Module

## Overview

This module provides Model Context Protocol (MCP) tools for serverless integration with the Q ecosystem. MCP tools enable function-based interactions that are ideal for AI agents and serverless environments.

## Connection

```javascript
import { MCPClient } from '@anarq/mcp-client';

const client = new MCPClient({
  serverUrl: 'http://localhost:3000/mcp/qwallet',
  authentication: {
    squidId: 'your-squid-id',
    token: 'your-jwt-token'
  }
});

await client.connect();
```

## Tools


### wallet.sign

Sign transaction with sQuid identity

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| squidId | string | Yes | sQuid identity ID |
| intentId | string | Yes | Payment intent ID to sign |
| signature | string | Yes | Cryptographic signature |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| transactionId | string | No |  |
| signature | string | No |  |
| gasEstimate | number | No |  |
| error | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('wallet.sign', {
  squidId: "string",
  intentId: "string",
  signature: "string",
});
console.log(result);
```


### wallet.pay

Process payment transaction

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| squidId | string | Yes | sQuid identity ID |
| transactionId | string | Yes | Signed transaction ID |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| transactionId | string | No |  |
| status | string | No |  |
| settlementHash | string | No |  |
| settledAt | string | No |  |
| error | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('wallet.pay', {
  squidId: "string",
  transactionId: "string",
});
console.log(result);
```


### wallet.quote

Get payment quote with fees and timing

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| amount | number | Yes | Payment amount |
| currency | string | Yes | Payment currency |
| network | string | No | Target blockchain network |
| priority | string | No | Transaction priority |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| amount | number | No |  |
| currency | string | No |  |
| fees | object | No |  |
| estimatedTime | string | No |  |
| exchangeRate | number | No |  |
| error | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('wallet.quote', {
  amount: 0,
  currency: "QToken",
  network: "string",
  priority: "low",
});
console.log(result);
```


### wallet.balance

Get wallet balance for sQuid identity

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| squidId | string | Yes | sQuid identity ID |
| currency | string | No | Currency to check (optional, returns all if not specified) |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| squidId | string | No |  |
| balances | object | No |  |
| walletAddress | string | No |  |
| lastUpdated | string | No |  |
| error | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('wallet.balance', {
  squidId: "string",
  currency: "QToken",
});
console.log(result);
```


### wallet.intent

Create payment intent

#### Input

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| squidId | string | Yes | sQuid identity ID |
| amount | number | Yes | Payment amount |
| currency | string | Yes | Payment currency |
| recipient | string | Yes | Recipient sQuid ID or wallet address |
| purpose | string | No | Payment purpose description |
| metadata | object | No | Additional payment metadata |
| expiresIn | integer | No | Expiration time in seconds (default: 3600) |

#### Output

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | No |  |
| intentId | string | No |  |
| amount | number | No |  |
| currency | string | No |  |
| recipient | string | No |  |
| status | string | No |  |
| createdAt | string | No |  |
| expiresAt | string | No |  |
| error | string | No |  |

#### Usage Example

```javascript
const result = await mcpClient.callTool('wallet.intent', {
  squidId: "string",
  amount: 0,
  currency: "QToken",
  recipient: "string",
  purpose: "string",
  metadata: {},
  expiresIn: 0,
});
console.log(result);
```




## Resources

### Transaction History

**URI**: qwallet://transactions

Access to transaction history and payment records

### Wallet Balances

**URI**: qwallet://balances

Access to wallet balance information

### Payment Intents

**URI**: qwallet://intents

Access to payment intent management




## Prompts

### payment-summary

Generate payment summary for identity

#### Arguments

- **squidId**: sQuid identity ID (required)
- **period**: Time period (7d, 30d, 90d)

### transaction-analysis

Analyze transaction patterns and spending

#### Arguments

- **squidId**: sQuid identity ID (required)
- **analysisType**: Type of analysis (spending, income, patterns)



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
