# API Changes for DAO Dashboard Enhancement

## Overview

This document outlines the API changes and new endpoints required to support the enhanced DAO dashboard components. These changes extend the existing DAO and wallet services to provide comprehensive governance and economic data.

## New API Endpoints

### DAO Service Enhancements

#### Enhanced DAO Information

**Endpoint**: `GET /api/dao/:daoId`

**Enhanced Response**:
```typescript
interface EnhancedDAO extends DetailedDAO {
  tokenInfo?: {
    name: string;
    symbol: string;
    totalSupply: number;
    circulatingSupply: number;
    holderCount: number;
    contractAddress: string;
    type: 'user-based' | 'token-weighted' | 'nft-weighted';
    decimals?: number;
    network?: string;
  };
  economicMetrics?: {
    totalValueLocked: number;
    averageHolding: number;
    distributionIndex: number; // Gini coefficient for token distribution
  };
  governanceRules?: {
    votingMechanism: 'user-based' | 'token-weighted' | 'nft-weighted';
    quorumRequirement: number;
    votingPeriod: number;
    tokenRequirement?: {
      token: string;
      minimumBalance: number;
    };
  };
}
```

**Example Response**:
```json
{
  "id": "dao-123",
  "name": "Example DAO",
  "description": "A sample DAO for demonstration",
  "visibility": "public",
  "memberCount": 150,
  "createdAt": "2024-01-01T00:00:00Z",
  "tokenInfo": {
    "name": "Example Governance Token",
    "symbol": "EGT",
    "totalSupply": 1000000,
    "circulatingSupply": 750000,
    "holderCount": 150,
    "contractAddress": "0x1234567890123456789012345678901234567890",
    "type": "token-weighted",
    "decimals": 18,
    "network": "ethereum"
  },
  "economicMetrics": {
    "totalValueLocked": 2500000,
    "averageHolding": 5000,
    "distributionIndex": 0.65
  },
  "governanceRules": {
    "votingMechanism": "token-weighted",
    "quorumRequirement": 100000,
    "votingPeriod": 604800,
    "tokenRequirement": {
      "token": "EGT",
      "minimumBalance": 100
    }
  }
}
```

#### DAO Token Information

**Endpoint**: `GET /api/dao/:daoId/token-info`

**Response**:
```typescript
interface TokenInfo {
  name: string;
  symbol: string;
  totalSupply: number;
  circulatingSupply: number;
  holderCount: number;
  contractAddress: string;
  type: 'user-based' | 'token-weighted' | 'nft-weighted';
  decimals?: number;
  network?: string;
  priceInfo?: {
    currentPrice: number;
    currency: string;
    marketCap: number;
    volume24h: number;
  };
}
```

**Example Response**:
```json
{
  "name": "Example Governance Token",
  "symbol": "EGT",
  "totalSupply": 1000000,
  "circulatingSupply": 750000,
  "holderCount": 150,
  "contractAddress": "0x1234567890123456789012345678901234567890",
  "type": "token-weighted",
  "decimals": 18,
  "network": "ethereum",
  "priceInfo": {
    "currentPrice": 2.50,
    "currency": "USD",
    "marketCap": 1875000,
    "volume24h": 125000
  }
}
```

#### User Voting Power

**Endpoint**: `GET /api/dao/:daoId/voting-power/:squidId`

**Response**:
```typescript
interface VotingPower {
  squidId: string;
  daoId: string;
  tokenBalance: number;
  nftCount: number;
  votingWeight: number;
  percentageOfTotal: number;
  rank: number; // Ranking among all members
  lastUpdated: string;
  breakdown: {
    tokenWeight: number;
    nftWeight: number;
    bonusWeight: number; // For future enhancements
  };
}
```

**Example Response**:
```json
{
  "squidId": "did:squid:user123",
  "daoId": "dao-123",
  "tokenBalance": 5000,
  "nftCount": 3,
  "votingWeight": 5000,
  "percentageOfTotal": 3.33,
  "rank": 15,
  "lastUpdated": "2024-02-08T12:00:00Z",
  "breakdown": {
    "tokenWeight": 5000,
    "nftWeight": 0,
    "bonusWeight": 0
  }
}
```

#### DAO Analytics

**Endpoint**: `GET /api/dao/:daoId/analytics`

**Query Parameters**:
- `period`: `7d`, `30d`, `90d`, `1y` (default: `30d`)
- `metrics`: Comma-separated list of metrics to include

**Response**:
```typescript
interface DAOAnalytics {
  daoId: string;
  period: string;
  generatedAt: string;
  proposalMetrics: {
    totalProposals: number;
    activeProposals: number;
    completedProposals: number;
    quorumReachRate: number;
    averageParticipation: number;
    averageTimeToQuorum: number | null;
    participationTrend: 'increasing' | 'decreasing' | 'stable';
  };
  membershipMetrics: {
    totalMembers: number;
    activeMembers: number;
    newMembers: number;
    memberRetention: number;
  };
  economicMetrics: {
    tokenHolders: number;
    averageHolding: number;
    tokenDistribution: {
      top10Percent: number;
      top25Percent: number;
      bottom50Percent: number;
    };
    nftMetrics: {
      totalNFTs: number;
      uniqueHolders: number;
      averageNFTsPerHolder: number;
    };
  };
}
```

**Example Response**:
```json
{
  "daoId": "dao-123",
  "period": "30d",
  "generatedAt": "2024-02-08T12:00:00Z",
  "proposalMetrics": {
    "totalProposals": 25,
    "activeProposals": 3,
    "completedProposals": 22,
    "quorumReachRate": 88.0,
    "averageParticipation": 125.5,
    "averageTimeToQuorum": 48.5,
    "participationTrend": "increasing"
  },
  "membershipMetrics": {
    "totalMembers": 150,
    "activeMembers": 120,
    "newMembers": 15,
    "memberRetention": 92.5
  },
  "economicMetrics": {
    "tokenHolders": 150,
    "averageHolding": 5000,
    "tokenDistribution": {
      "top10Percent": 45.2,
      "top25Percent": 68.7,
      "bottom50Percent": 8.3
    },
    "nftMetrics": {
      "totalNFTs": 450,
      "uniqueHolders": 89,
      "averageNFTsPerHolder": 5.1
    }
  }
}
```

#### Proposal Analytics

**Endpoint**: `GET /api/dao/:daoId/proposals/:proposalId/analytics`

**Response**:
```typescript
interface ProposalAnalytics extends Proposal {
  votingBreakdown: {
    byWeight: Record<string, number>;
    byCount: Record<string, number>;
    uniqueVoters: number;
    totalWeight: number;
  };
  participationMetrics: {
    voterTurnout: number; // Percentage of eligible voters
    weightTurnout: number; // Percentage of total voting weight
    timeToQuorum: number | null; // Minutes to reach quorum
    votingPattern: 'early' | 'late' | 'consistent';
  };
  quorumStatus: {
    required: number;
    current: number;
    achieved: boolean;
    projectedCompletion: string | null;
  };
  demographics: {
    votersByRole: Record<string, number>;
    votersByTenure: Record<string, number>;
    geographicDistribution?: Record<string, number>;
  };
}
```

### Qwallet Service Enhancements

#### Enhanced Balance Information

**Endpoint**: `GET /api/wallet/:squidId/balance/:token`

**Enhanced Response**:
```typescript
interface EnhancedBalance extends Balance {
  tokenInfo: {
    symbol: string;
    decimals: number;
    contractAddress: string;
    network: string;
    type: 'governance' | 'utility' | 'reward';
    metadata?: {
      name: string;
      description: string;
      image: string;
      website: string;
    };
  };
  historicalData?: {
    previousBalance: number;
    change24h: number;
    changePercentage24h: number;
    lastUpdated: string;
  };
  stakingInfo?: {
    stakedAmount: number;
    rewards: number;
    lockPeriod: number;
    unlockDate: string;
  };
}
```

#### DAO-Specific NFTs

**Endpoint**: `GET /api/wallet/:squidId/nfts`

**Query Parameters**:
- `daoId`: Filter NFTs by DAO (optional)
- `limit`: Number of NFTs to return (default: 50)
- `offset`: Pagination offset (default: 0)

**Enhanced Response**:
```typescript
interface EnhancedNFT extends NFT {
  daoInfo?: {
    daoId: string;
    daoName: string;
    role: string; // Role when NFT was minted
    mintedBy: string;
    mintDate: string;
  };
  governance?: {
    votingWeight: number;
    specialRights: string[];
    expirationDate?: string;
  };
  rarity?: {
    rank: number;
    totalSupply: number;
    rarityScore: number;
  };
}
```

#### Wallet Analytics

**Endpoint**: `GET /api/wallet/:squidId/analytics`

**Query Parameters**:
- `period`: `7d`, `30d`, `90d`, `1y` (default: `30d`)
- `includeDAOs`: Include DAO-specific analytics (default: true)

**Response**:
```typescript
interface WalletAnalytics {
  squidId: string;
  period: string;
  generatedAt: string;
  portfolioValue: {
    totalValue: number;
    currency: string;
    change24h: number;
    changePercentage24h: number;
  };
  tokenMetrics: {
    totalTokens: number;
    uniqueTokenTypes: number;
    governanceTokens: number;
    utilityTokens: number;
  };
  nftMetrics: {
    totalNFTs: number;
    uniqueCollections: number;
    daoNFTs: number;
    estimatedValue: number;
  };
  daoParticipation: {
    totalDAOs: number;
    activeDAOs: number;
    governanceActions: number;
    votingPowerTotal: number;
  };
  activityMetrics: {
    transactionCount: number;
    averageTransactionValue: number;
    mostActiveDAO: string;
    lastActivity: string;
  };
}
```

## Modified Endpoints

### Enhanced Proposal Data

**Endpoint**: `GET /api/dao/:daoId/proposals`

**Enhanced Response**: Each proposal now includes additional analytics data:

```typescript
interface EnhancedProposal extends Proposal {
  analytics?: {
    participationRate: number;
    weightedParticipation: number;
    voterDemographics: {
      byRole: Record<string, number>;
      byTenure: Record<string, number>;
    };
    votingPattern: 'early' | 'late' | 'consistent';
    timeToQuorum?: number;
  };
  extendedResults?: {
    detailedBreakdown: Record<string, {
      count: number;
      weight: number;
      percentage: number;
      weightPercentage: number;
    }>;
    voterList?: Array<{
      squidId: string;
      option: string;
      weight: number;
      timestamp: string;
    }>;
  };
}
```

### Enhanced Membership Data

**Endpoint**: `GET /api/dao/:daoId/membership/:squidId`

**Enhanced Response**:
```typescript
interface EnhancedMembership extends Membership {
  economicProfile: {
    tokenBalance: number;
    nftCount: number;
    votingWeight: number;
    stakingAmount: number;
    rewardsEarned: number;
  };
  participationMetrics: {
    proposalsVoted: number;
    proposalsCreated: number;
    averageParticipation: number;
    lastActivity: string;
  };
  reputation: {
    score: number;
    rank: number;
    badges: string[];
    achievements: Array<{
      type: string;
      name: string;
      earnedAt: string;
    }>;
  };
}
```

## WebSocket Events

### Real-time Updates

The enhanced dashboard supports real-time updates through WebSocket connections:

#### Connection

```typescript
// Connect to WebSocket
const ws = new WebSocket('wss://api.anarq.com/ws');

// Subscribe to DAO updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'dao',
  daoId: 'dao-123'
}));

// Subscribe to wallet updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'wallet',
  squidId: 'did:squid:user123'
}));
```

#### Event Types

```typescript
interface WebSocketEvent {
  type: string;
  channel: string;
  data: any;
  timestamp: string;
}

// DAO Events
interface DAOEvent extends WebSocketEvent {
  channel: 'dao';
  daoId: string;
  data: {
    type: 'proposal_created' | 'proposal_updated' | 'vote_cast' | 'member_joined' | 'token_transfer';
    payload: any;
  };
}

// Wallet Events
interface WalletEvent extends WebSocketEvent {
  channel: 'wallet';
  squidId: string;
  data: {
    type: 'balance_updated' | 'nft_received' | 'nft_transferred' | 'staking_updated';
    payload: any;
  };
}
```

#### Example Events

```json
{
  "type": "event",
  "channel": "dao",
  "daoId": "dao-123",
  "timestamp": "2024-02-08T12:00:00Z",
  "data": {
    "type": "vote_cast",
    "payload": {
      "proposalId": "prop-456",
      "voter": "did:squid:user123",
      "option": "approve",
      "weight": 5000,
      "newTotals": {
        "approve": 125000,
        "reject": 45000,
        "abstain": 10000
      }
    }
  }
}
```

```json
{
  "type": "event",
  "channel": "wallet",
  "squidId": "did:squid:user123",
  "timestamp": "2024-02-08T12:00:00Z",
  "data": {
    "type": "nft_received",
    "payload": {
      "tokenId": "789",
      "contractAddress": "0x1234567890123456789012345678901234567890",
      "from": "0x0987654321098765432109876543210987654321",
      "metadata": {
        "name": "DAO Membership NFT",
        "description": "Grants voting rights in Example DAO",
        "image": "https://example.com/nft/789.png"
      }
    }
  }
}
```

## Error Handling

### Error Response Format

All API endpoints follow a consistent error response format:

```typescript
interface APIError {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}
```

### Error Codes

#### DAO Service Errors

- `DAO_NOT_FOUND`: DAO with specified ID does not exist
- `DAO_ACCESS_DENIED`: User does not have permission to access DAO
- `TOKEN_INFO_UNAVAILABLE`: Token information cannot be retrieved
- `ANALYTICS_INSUFFICIENT_DATA`: Not enough data to generate analytics
- `VOTING_POWER_CALCULATION_FAILED`: Unable to calculate voting power

#### Wallet Service Errors

- `WALLET_NOT_FOUND`: Wallet with specified sQuid ID does not exist
- `BALANCE_UNAVAILABLE`: Token balance cannot be retrieved
- `NFT_METADATA_FAILED`: NFT metadata cannot be loaded
- `INSUFFICIENT_PERMISSIONS`: User lacks permission for wallet operation

#### Example Error Response

```json
{
  "error": {
    "code": "DAO_NOT_FOUND",
    "message": "DAO with ID 'dao-123' does not exist or has been deleted",
    "details": {
      "daoId": "dao-123",
      "suggestions": [
        "Verify the DAO ID is correct",
        "Check if the DAO is still active",
        "Ensure you have access permissions"
      ]
    },
    "timestamp": "2024-02-08T12:00:00Z",
    "requestId": "req-abc123"
  }
}
```

## Rate Limiting

### Rate Limits

- **Standard endpoints**: 100 requests per minute per IP
- **Analytics endpoints**: 20 requests per minute per IP
- **WebSocket connections**: 5 connections per IP
- **Authenticated requests**: 200 requests per minute per user

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1644336000
X-RateLimit-Retry-After: 60
```

## Authentication

### Enhanced Authentication

All enhanced endpoints require authentication using the existing sQuid identity system:

```http
Authorization: Bearer <squid-token>
X-Squid-ID: did:squid:user123
```

### Permission Levels

- **Public**: Basic DAO information (no authentication required)
- **Member**: DAO member data and basic analytics
- **Moderator**: Enhanced analytics and member management
- **Admin**: Full analytics and administrative functions
- **Owner**: Complete access to all DAO data and functions

## Caching

### Cache Headers

```http
Cache-Control: public, max-age=300
ETag: "abc123"
Last-Modified: Thu, 08 Feb 2024 12:00:00 GMT
```

### Cache Strategy

- **DAO Information**: 5 minutes
- **Token Information**: 5 minutes
- **Voting Power**: 2 minutes
- **Analytics**: 15 minutes
- **Proposal Data**: 1 minute (active), 1 hour (closed)
- **NFT Metadata**: 1 hour

## Migration Guide

### Backward Compatibility

All existing API endpoints remain functional. New fields are added as optional properties to maintain backward compatibility.

### Client Updates

```typescript
// Before: Basic DAO data
interface DAO {
  id: string;
  name: string;
  memberCount: number;
}

// After: Enhanced DAO data (backward compatible)
interface EnhancedDAO extends DAO {
  tokenInfo?: TokenInfo;
  economicMetrics?: EconomicMetrics;
  governanceRules?: GovernanceRules;
}
```

### Migration Steps

1. **Phase 1**: Deploy enhanced API endpoints alongside existing ones
2. **Phase 2**: Update client applications to use new data fields
3. **Phase 3**: Deprecate old endpoints (with 6-month notice)
4. **Phase 4**: Remove deprecated endpoints

## Testing

### API Testing

```bash
# Test enhanced DAO endpoint
curl -H "Authorization: Bearer <token>" \
     https://api.anarq.com/api/dao/dao-123

# Test token information endpoint
curl -H "Authorization: Bearer <token>" \
     https://api.anarq.com/api/dao/dao-123/token-info

# Test voting power endpoint
curl -H "Authorization: Bearer <token>" \
     https://api.anarq.com/api/dao/dao-123/voting-power/did:squid:user123

# Test analytics endpoint
curl -H "Authorization: Bearer <token>" \
     "https://api.anarq.com/api/dao/dao-123/analytics?period=30d&metrics=proposals,members"
```

### WebSocket Testing

```javascript
// Test WebSocket connection
const ws = new WebSocket('wss://api.anarq.com/ws');

ws.onopen = () => {
  console.log('Connected to WebSocket');
  
  // Subscribe to DAO updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'dao',
    daoId: 'dao-123'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received event:', data);
};
```

## Documentation

### OpenAPI Specification

The complete API specification is available in OpenAPI 3.0 format:

- **Development**: `https://dev-api.anarq.com/docs`
- **Staging**: `https://staging-api.anarq.com/docs`
- **Production**: `https://api.anarq.com/docs`

### Postman Collection

A comprehensive Postman collection is available for testing all endpoints:

```bash
# Import Postman collection
curl -o anarq-dao-api.json https://api.anarq.com/postman/collection.json
```

## Support

For API-related questions or issues:

- **Documentation**: [API Documentation](https://docs.anarq.com/api)
- **GitHub Issues**: [Report API Issues](https://github.com/anarq/api/issues)
- **Discord**: #api-support channel
- **Email**: api-support@anarq.com

---

This document will be updated as new API features are added or existing ones are modified. Always refer to the latest version for accurate information.