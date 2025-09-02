# Qwallet IPFS Storage Mapping

This document describes how Qwallet data is mapped to IPFS for decentralized storage and content addressing.

## Storage Strategy

Qwallet uses a hybrid storage approach:
- **Hot Data**: Frequently accessed data stored in traditional databases
- **Cold Data**: Historical and audit data stored in IPFS
- **Immutable Data**: Transaction records and audit logs stored in IPFS with CID references

## IPFS Content Types

### Payment Intents
- **Path**: `/qwallet/intents/{intentId}`
- **CID Pattern**: `Qm...` (Base58 encoded)
- **Content**: Encrypted payment intent data
- **Retention**: 30 days after expiration
- **Pinning**: Temporary (unpinned after settlement)

```json
{
  "intentId": "intent_abc123def456",
  "actor": {
    "squidId": "did:squid:alice123",
    "subId": "personal"
  },
  "amount": 100.50,
  "currency": "QToken",
  "recipient": "did:squid:bob456",
  "purpose": "Service payment",
  "metadata": {},
  "createdAt": "2024-01-15T10:30:00.000Z",
  "expiresAt": "2024-01-15T11:30:00.000Z",
  "signature": "0x1234567890abcdef..."
}
```

### Transaction Records
- **Path**: `/qwallet/transactions/{transactionId}`
- **CID Pattern**: `Qm...` (Base58 encoded)
- **Content**: Complete transaction data with blockchain proof
- **Retention**: Permanent (7 years minimum for compliance)
- **Pinning**: Permanent

```json
{
  "transactionId": "tx_def456ghi789",
  "intentId": "intent_abc123def456",
  "type": "PAYMENT",
  "from": {
    "squidId": "did:squid:alice123",
    "walletAddress": "0x1234567890abcdef..."
  },
  "to": {
    "squidId": "did:squid:bob456",
    "walletAddress": "0xabcdef1234567890..."
  },
  "amount": 100.50,
  "currency": "QToken",
  "fees": {
    "network": 0.001,
    "platform": 0.005,
    "total": 0.006
  },
  "status": "SETTLED",
  "blockchainTx": {
    "hash": "0xabcdef1234567890...",
    "blockNumber": 12345678,
    "gasUsed": 21000
  },
  "audit": {
    "riskScore": 15,
    "complianceChecks": ["AML", "KYC"],
    "auditTrail": [...]
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "settledAt": "2024-01-15T10:32:00.000Z",
  "signature": "0x1234567890abcdef..."
}
```

### Audit Logs
- **Path**: `/qwallet/audit/{date}/{eventId}`
- **CID Pattern**: `Qm...` (Base58 encoded)
- **Content**: Immutable audit event data
- **Retention**: 7 years (regulatory requirement)
- **Pinning**: Permanent

```json
{
  "eventId": "audit_ghi789jkl012",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "actor": {
    "squidId": "did:squid:alice123",
    "subId": "personal"
  },
  "action": "PAYMENT_CREATED",
  "resource": "intent_abc123def456",
  "details": {
    "amount": 100.50,
    "currency": "QToken",
    "recipient": "did:squid:bob456",
    "riskScore": 15
  },
  "verdict": "ALLOW",
  "signature": "0x1234567890abcdef..."
}
```

### Wallet Snapshots
- **Path**: `/qwallet/wallets/{squidId}/snapshots/{timestamp}`
- **CID Pattern**: `Qm...` (Base58 encoded)
- **Content**: Periodic wallet state snapshots
- **Retention**: 2 years
- **Pinning**: Temporary (monthly snapshots kept permanently)

```json
{
  "walletId": "wallet_jkl012mno345",
  "owner": {
    "squidId": "did:squid:alice123"
  },
  "address": "0x1234567890abcdef...",
  "balances": {
    "QToken": 1000.50,
    "PI": 50.25
  },
  "limits": {
    "daily": {
      "amount": 1000.00,
      "used": 100.50,
      "resetAt": "2024-01-16T00:00:00.000Z"
    }
  },
  "snapshotAt": "2024-01-15T23:59:59.000Z",
  "signature": "0x1234567890abcdef..."
}
```

## Content Addressing Strategy

### CID Generation
- **Algorithm**: SHA-256
- **Codec**: DAG-CBOR for structured data
- **Multihash**: sha2-256
- **Version**: CIDv1 (Base32 encoded for URLs)

### Content Encryption
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with identity-specific salt
- **IV**: Random 96-bit initialization vector
- **Authentication**: HMAC-SHA256

### Content Verification
- **Integrity**: CID verification ensures content integrity
- **Authenticity**: Digital signatures verify content authenticity
- **Timestamp**: Blockchain timestamps provide temporal proof

## Pinning Policies

### Permanent Pinning
- Transaction records (compliance requirement)
- Monthly wallet snapshots
- Critical audit events
- Regulatory reports

### Temporary Pinning
- Active payment intents (until expiration)
- Daily wallet snapshots (30 days)
- Non-critical audit events (1 year)
- Fee calculation data (90 days)

### Conditional Pinning
- High-value transactions (>10,000 QToken)
- Disputed transactions
- Fraud investigation data
- Legal hold requirements

## Garbage Collection

### Automatic Cleanup
- Expired payment intents (after 30 days)
- Temporary snapshots (after retention period)
- Cached fee calculations (after 90 days)
- Non-permanent audit logs (after 1 year)

### Manual Cleanup
- Legal compliance requirements
- User data deletion requests (GDPR)
- Storage optimization
- Migration to new formats

## Access Patterns

### Hot Access (Database)
- Current wallet balances
- Active payment intents
- Recent transaction history (30 days)
- Real-time spending limits

### Warm Access (IPFS + Cache)
- Historical transactions (30 days - 2 years)
- Audit logs (current year)
- Wallet snapshots (current month)
- Fee calculation history

### Cold Access (IPFS Only)
- Archived transactions (>2 years)
- Historical audit logs (>1 year)
- Old wallet snapshots (>1 month)
- Compliance archives

## Data Migration

### Format Versioning
- Schema version included in all IPFS content
- Backward compatibility maintained for 2 versions
- Migration tools for format upgrades
- Validation of migrated content

### Content Migration
- Gradual migration from old to new formats
- Parallel storage during transition periods
- Verification of migrated content integrity
- Rollback procedures for failed migrations

## Performance Optimization

### Caching Strategy
- Frequently accessed CIDs cached locally
- LRU eviction policy for cache management
- Pre-warming cache for predictable access patterns
- Cache invalidation on content updates

### Batch Operations
- Bulk pinning/unpinning operations
- Batch content retrieval
- Parallel upload/download operations
- Connection pooling for IPFS operations

### Content Distribution
- Multiple IPFS nodes for redundancy
- Geographic distribution for performance
- Load balancing across IPFS gateways
- CDN integration for public content

## Security Considerations

### Access Control
- Identity-based access control for private content
- Encryption keys tied to sQuid identities
- Permission checks before content access
- Audit logging for all access attempts

### Data Protection
- End-to-end encryption for sensitive data
- Key rotation for long-term storage
- Secure key storage in HSM
- Regular security audits of stored content

### Compliance
- GDPR compliance for EU users
- Data residency requirements
- Audit trail for regulatory reporting
- Right to erasure implementation