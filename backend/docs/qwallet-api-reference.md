# Qwallet API Reference

## 🌟 Overview

The Qwallet API provides comprehensive wallet functionality for the AnarQ&Q ecosystem, including transaction signing, token management, NFT minting, and fund transfers. All operations are tied to sQuid decentralized identities.

## 🔐 Authentication

All authenticated endpoints require the `X-Squid-ID` header:

```http
X-Squid-ID: your_squid_identity
```

## 📝 API Endpoints

### 1. Sign Transaction

Sign a transaction with sQuid identity (DID).

**Endpoint:** `POST /api/qwallet/sign`  
**Authentication:** Required

**Request Body:**
```json
{
  "action": "create_listing",
  "payload": {
    "title": "Digital Artwork",
    "price": 25.0,
    "currency": "QToken"
  },
  "timestamp": "2025-07-31T17:55:28.245Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction signed successfully",
  "data": {
    "signature": "e25f981d7a6b0c1eabb6...",
    "transactionId": "tx_6e1a4a8c24aa891e18e01f200ca1feb2",
    "metadata": {
      "squidId": "test_squid_123",
      "action": "create_listing",
      "walletAddress": "0x7f02585bb8475abcabfd929a9b8468b0eb79fc71",
      "timestamp": "2025-07-31T17:55:28.245Z",
      "gasEstimate": 100000,
      "nonce": "a1b2c3d4e5f6..."
    }
  }
}
```

### 2. Get Balance

Get token balance for a specific sQuid identity.

**Endpoint:** `GET /api/qwallet/balance/:squidId`  
**Authentication:** None

**Query Parameters:**
- `token` (optional): Token symbol (default: "QToken")

**Response:**
```json
{
  "success": true,
  "data": {
    "squidId": "test_squid_123",
    "token": "QToken",
    "balance": 1000,
    "tokenInfo": {
      "symbol": "$QToken",
      "decimals": 18,
      "contractAddress": "0x1234567890123456789012345678901234567890",
      "network": "anarq-chain",
      "type": "utility"
    },
    "walletAddress": "0x7f02585bb8475abcabfd929a9b8468b0eb79fc71",
    "lastUpdated": "2025-07-31T17:55:28.245Z"
  }
}
```

### 3. Get All Balances

Get all token balances for a sQuid identity.

**Endpoint:** `GET /api/qwallet/balances/:squidId`  
**Authentication:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "squidId": "test_squid_123",
    "walletAddress": "0x7f02585bb8475abcabfd929a9b8468b0eb79fc71",
    "balances": {
      "QToken": {
        "balance": 1000,
        "tokenInfo": {
          "symbol": "$QToken",
          "decimals": 18,
          "contractAddress": "0x1234567890123456789012345678901234567890",
          "network": "anarq-chain",
          "type": "utility"
        }
      },
      "PI": {
        "balance": 50,
        "tokenInfo": {
          "symbol": "$PI",
          "decimals": 8,
          "contractAddress": "0x0987654321098765432109876543210987654321",
          "network": "pi-network",
          "type": "currency"
        }
      }
    },
    "lastUpdated": "2025-07-31T17:55:28.245Z"
  }
}
```

### 4. Transfer Funds

Transfer tokens between sQuid identities.

**Endpoint:** `POST /api/qwallet/transfer`  
**Authentication:** Required

**Request Body:**
```json
{
  "toId": "recipient_squid_456",
  "amount": 50.0,
  "token": "QToken"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transfer completed successfully",
  "data": {
    "transactionId": "tx_3a8ca31983aad9b4d2d758c75e69330d",
    "fromSquidId": "sender_squid_123",
    "toSquidId": "recipient_squid_456",
    "amount": 50,
    "token": "QToken",
    "fromBalance": 950,
    "toBalance": 1050,
    "timestamp": "2025-07-31T17:55:28.245Z",
    "gasEstimate": 21000
  }
}
```

### 5. Mint NFT

Mint an NFT from metadata and content CID.

**Endpoint:** `POST /api/qwallet/mint`  
**Authentication:** Required

**Request Body:**
```json
{
  "name": "Test Digital Art NFT",
  "description": "A beautiful test artwork for the AnarQ&Q ecosystem",
  "image": "https://example.com/test-art.png",
  "attributes": [
    {
      "trait_type": "Category",
      "value": "Digital Art"
    },
    {
      "trait_type": "Rarity",
      "value": "Common"
    }
  ],
  "contentCid": "QmTestNFTCID123456789",
  "contractType": "general"
}
```

**Response:**
```json
{
  "success": true,
  "message": "NFT minted successfully",
  "data": {
    "tokenId": "nft_5a50fe67a540b06d10a26330",
    "contractAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
    "owner": "0x7f02585bb8475abcabfd929a9b8468b0eb79fc71",
    "creator": "test_squid_123",
    "metadata": {
      "name": "Test Digital Art NFT",
      "description": "A beautiful test artwork for the AnarQ&Q ecosystem",
      "image": "https://example.com/test-art.png",
      "attributes": [
        {
          "trait_type": "Category",
          "value": "Digital Art"
        },
        {
          "trait_type": "Rarity",
          "value": "Common"
        },
        {
          "trait_type": "Creator",
          "value": "test_squid_123"
        },
        {
          "trait_type": "Minted At",
          "value": "2025-07-31T17:55:28.245Z"
        },
        {
          "trait_type": "Contract Type",
          "value": "general"
        }
      ]
    },
    "mintedAt": "2025-07-31T17:55:28.245Z",
    "transactionId": "tx_8a9304ab7e640278e8e20091c3db436f",
    "gasEstimate": 200000
  }
}
```

### 6. List User NFTs

Get all NFTs owned by a sQuid identity.

**Endpoint:** `GET /api/qwallet/nfts/:squidId`  
**Authentication:** None

**Query Parameters:**
- `limit` (optional): Number of NFTs to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "squidId": "test_squid_123",
    "walletAddress": "0x7f02585bb8475abcabfd929a9b8468b0eb79fc71",
    "nfts": [
      {
        "tokenId": "nft_5a50fe67a540b06d10a26330",
        "contractAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
        "name": "Test Digital Art NFT",
        "description": "A beautiful test artwork for the AnarQ&Q ecosystem",
        "image": "https://example.com/test-art.png",
        "attributes": [
          {
            "trait_type": "Category",
            "value": "Digital Art"
          }
        ],
        "contentCid": "QmTestNFTCID123456789",
        "mintedAt": "2025-07-31T17:55:28.245Z",
        "status": "active"
      }
    ],
    "pagination": {
      "total": 1,
      "activeCount": 1,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

### 7. Get Specific NFT

Get detailed information about a specific NFT.

**Endpoint:** `GET /api/qwallet/nft/:tokenId`  
**Authentication:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenId": "nft_5a50fe67a540b06d10a26330",
    "contractAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
    "owner": "0x7f02585bb8475abcabfd929a9b8468b0eb79fc71",
    "creator": "test_squid_123",
    "contentCid": "QmTestNFTCID123456789",
    "metadata": {
      "name": "Test Digital Art NFT",
      "description": "A beautiful test artwork for the AnarQ&Q ecosystem",
      "image": "https://example.com/test-art.png",
      "attributes": [...]
    },
    "mintedAt": "2025-07-31T17:55:28.245Z",
    "network": "anarq-chain",
    "standard": "ERC-721",
    "status": "active"
  }
}
```

### 8. Get Wallet Information

Get complete wallet information for a sQuid identity.

**Endpoint:** `GET /api/qwallet/wallet/:squidId`  
**Authentication:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x7f02585bb8475abcabfd929a9b8468b0eb79fc71",
    "balances": {
      "QToken": 950,
      "PI": 50
    },
    "nftCount": 1,
    "transactionCount": 3,
    "createdAt": "2025-07-31T17:55:28.239Z",
    "isActive": true
  }
}
```

### 9. Get Transaction History

Get transaction history for a sQuid identity.

**Endpoint:** `GET /api/qwallet/transactions/:squidId`  
**Authentication:** None

**Query Parameters:**
- `limit` (optional): Number of transactions to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "squidId": "test_squid_123",
    "transactions": [
      {
        "id": "tx_8a9304ab7e640278e8e20091c3db436f",
        "type": "nft_mint",
        "squidId": "test_squid_123",
        "walletAddress": "0x7f02585bb8475abcabfd929a9b8468b0eb79fc71",
        "tokenId": "nft_5a50fe67a540b06d10a26330",
        "contractAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
        "timestamp": "2025-07-31T17:55:28.245Z",
        "status": "completed",
        "gasEstimate": 200000
      },
      {
        "id": "tx_3a8ca31983aad9b4d2d758c75e69330d",
        "type": "transfer_funds",
        "fromSquidId": "test_squid_123",
        "toSquidId": "recipient_squid_456",
        "amount": 50,
        "token": "QToken",
        "timestamp": "2025-07-31T17:55:28.240Z",
        "status": "completed",
        "gasEstimate": 21000
      }
    ],
    "pagination": {
      "total": 3,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

### 10. Health Check

Check the health status of the Qwallet service.

**Endpoint:** `GET /api/qwallet/health`  
**Authentication:** None

**Response:**
```json
{
  "status": "healthy",
  "wallets": {
    "total": 2,
    "active": 2
  },
  "transactions": {
    "total": 5,
    "pending": 0
  },
  "nfts": {
    "total": 1
  },
  "supportedTokens": ["QToken", "PI"],
  "timestamp": "2025-07-31T17:55:28.245Z"
}
```

## 🚨 Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Human-readable error description"
}
```

### Common Error Codes

| Status Code | Description |
|-------------|-------------|
| `400` | Bad Request - Invalid parameters or insufficient balance |
| `401` | Unauthorized - Missing or invalid sQuid ID |
| `404` | Not Found - Resource not found |
| `500` | Internal Server Error - Server-side error |

## 📊 Rate Limits

Currently no rate limits are enforced, but production deployment should implement:

- **Transaction Signing**: 100 requests/minute per sQuid ID
- **Balance Queries**: 1000 requests/minute per IP
- **NFT Operations**: 50 requests/minute per sQuid ID
- **Transfers**: 20 requests/minute per sQuid ID

## 🔧 SDK Integration

### JavaScript/Node.js Example

```javascript
const QwalletAPI = {
  baseURL: 'http://localhost:3001/api/qwallet',
  
  async signTransaction(squidId, action, payload) {
    const response = await fetch(`${this.baseURL}/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Squid-ID': squidId
      },
      body: JSON.stringify({ action, payload })
    });
    return response.json();
  },
  
  async getBalance(squidId, token = 'QToken') {
    const response = await fetch(`${this.baseURL}/balance/${squidId}?token=${token}`);
    return response.json();
  },
  
  async transferFunds(fromId, toId, amount, token = 'QToken') {
    const response = await fetch(`${this.baseURL}/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Squid-ID': fromId
      },
      body: JSON.stringify({ toId, amount, token })
    });
    return response.json();
  },
  
  async mintNFT(squidId, metadata) {
    const response = await fetch(`${this.baseURL}/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Squid-ID': squidId
      },
      body: JSON.stringify(metadata)
    });
    return response.json();
  },
  
  async listUserNFTs(squidId, limit = 50, offset = 0) {
    const response = await fetch(`${this.baseURL}/nfts/${squidId}?limit=${limit}&offset=${offset}`);
    return response.json();
  }
};

// Usage example
const result = await QwalletAPI.signTransaction('my_squid_id', 'create_listing', {
  title: 'My Digital Art',
  price: 25.0
});
```

## 🔗 Related Documentation

- [Qwallet Implementation Summary](./qwallet-implementation-summary.md)
- [AnarQ&Q Ecosystem Overview](../../README.md)
- [sQuid Identity System](../squid/README.md)
- [Qmarket Integration](./qmarket-integration-summary.md)

---

**Built with ❤️ for the decentralized future**