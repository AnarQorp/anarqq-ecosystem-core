# Qwallet API - API Reference

Payments & Fees Module for AnarQ&Q Ecosystem

**Version:** 1.0.0

## Base URL

- Development: `http://localhost:3000/api/qwallet`
- Production: `https://api.q.network/qwallet`

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

**Health check**

#### Responses

**200**: Service is healthy

Schema: HealthResponse


### POST /intents

**Create payment intent**

#### Request Body

Content-Type: application/json

Schema: CreatePaymentIntentRequest

#### Responses

**201**: Payment intent created

Schema: PaymentIntentResponse

**400**: Invalid request

Schema: ErrorResponse


### POST /sign

**Sign transaction**

#### Request Body

Content-Type: application/json

Schema: SignTransactionRequest

#### Responses

**200**: Transaction signed

Schema: SignTransactionResponse


### POST /pay

**Process payment**

#### Request Body

Content-Type: application/json

Schema: ProcessPaymentRequest

#### Responses

**200**: Payment processed

Schema: ProcessPaymentResponse


### GET /quote

**Get payment quote**

#### Parameters

- **amount** (query): 
  - Required: Yes
  - Type: number
- **currency** (query): 
  - Required: Yes
  - Type: string
  - Values: QToken, PI
- **network** (query): 
  - Type: string

#### Responses

**200**: Payment quote

Schema: PaymentQuoteResponse


### GET /balance/{squidId}

**Get balance**

#### Parameters

- **squidId** (path): 
  - Required: Yes
  - Type: string
- **currency** (query): 
  - Type: string
  - Values: QToken, PI

#### Responses

**200**: Balance information

Schema: BalanceResponse


### GET /transactions/{squidId}

**Get transaction history**

#### Parameters

- **squidId** (path): 
  - Required: Yes
  - Type: string
- **limit** (query): 
  - Type: integer
- **offset** (query): 
  - Type: integer

#### Responses

**200**: Transaction history

Schema: TransactionHistoryResponse



## Data Models


### HealthResponse

#### Properties

- **status** (string): 
  - Values: healthy, degraded, unhealthy
- **timestamp** (string): 
- **version** (string): 
- **dependencies** (object): 


### CreatePaymentIntentRequest

#### Properties

- **amount** (number): 
  - Required: Yes
- **currency** (string): 
  - Required: Yes
  - Values: QToken, PI
- **recipient** (string): 
  - Required: Yes
- **purpose** (string): 
- **metadata** (object): 
- **expiresIn** (integer): Expiration time in seconds


### PaymentIntentResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### SignTransactionRequest

#### Properties

- **intentId** (string): 
  - Required: Yes
- **signature** (string): 


### SignTransactionResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### ProcessPaymentRequest

#### Properties

- **transactionId** (string): 
  - Required: Yes


### ProcessPaymentResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### PaymentQuoteResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### BalanceResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### TransactionHistoryResponse

#### Properties

- **status** (string): 
  - Values: ok, error
- **code** (string): 
- **message** (string): 
- **data** (object): 


### Transaction

#### Properties

- **id** (string): 
- **type** (string): 
- **amount** (number): 
- **currency** (string): 
- **status** (string): 
- **timestamp** (string): 
- **metadata** (object): 


### ErrorResponse

#### Properties

- **status** (string): 
  - Values: error
- **code** (string): 
- **message** (string): 
- **details** (object): 
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
