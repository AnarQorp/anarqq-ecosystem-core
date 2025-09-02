# Qwallet API Documentation

## Overview
Payments & Fees Module for AnarQ&Q Ecosystem

## Base URL
`http://localhost:3000`

## Authentication
- **squidAuth**: bearer authentication

## Endpoints

### GET /health
Health check

**Operation ID:** `healthCheck`





**Responses:**
- **200**: Service is healthy


### POST /intents
Create payment intent

**Operation ID:** `createPaymentIntent`



**Request Body:**
```json
{
  "$ref": "#/components/schemas/CreatePaymentIntentRequest"
}
```

**Responses:**
- **201**: Payment intent created
- **400**: Invalid request


### POST /sign
Sign transaction

**Operation ID:** `signTransaction`



**Request Body:**
```json
{
  "$ref": "#/components/schemas/SignTransactionRequest"
}
```

**Responses:**
- **200**: Transaction signed


### POST /pay
Process payment

**Operation ID:** `processPayment`



**Request Body:**
```json
{
  "$ref": "#/components/schemas/ProcessPaymentRequest"
}
```

**Responses:**
- **200**: Payment processed


### GET /quote
Get payment quote

**Operation ID:** `getPaymentQuote`

**Parameters:**
- `amount` (query): No description
- `currency` (query): No description
- `network` (query): No description



**Responses:**
- **200**: Payment quote


### GET /balance/{squidId}
Get balance

**Operation ID:** `getBalance`

**Parameters:**
- `squidId` (path): No description
- `currency` (query): No description



**Responses:**
- **200**: Balance information


### GET /transactions/{squidId}
Get transaction history

**Operation ID:** `getTransactionHistory`

**Parameters:**
- `squidId` (path): No description
- `limit` (query): No description
- `offset` (query): No description



**Responses:**
- **200**: Transaction history


## Error Codes
- **400**: Invalid request

## Rate Limits

- **Default**: 100 requests per minute per identity
- **Burst**: 200 requests per minute (temporary)
- **Premium**: 1000 requests per minute (with Qwallet payment)
- **Headers**: Rate limit information in `X-RateLimit-*` headers


## Examples

#### Health check

```bash
curl -X GET \
  "http://localhost:3000/health" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```


#### Create payment intent

```bash
curl -X POST \
  "http://localhost:3000/intents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d 'null'
```


#### Sign transaction

```bash
curl -X POST \
  "http://localhost:3000/sign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d 'null'
```

