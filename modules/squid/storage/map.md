# sQuid IPFS Storage Mapping

This document describes how sQuid identity data is mapped to IPFS storage.

## Storage Architecture

sQuid uses IPFS for decentralized, content-addressed storage of identity data, ensuring immutability and verifiability.

### Content Types

#### Identity Metadata
- **Path Pattern**: `/squid/identity/{did}/metadata.json`
- **Content**: Complete identity object with metadata
- **Encryption**: AES-256-GCM with identity-specific keys
- **Pinning**: Permanent for active identities

#### Identity Proofs
- **Path Pattern**: `/squid/identity/{did}/proofs/{timestamp}.json`
- **Content**: Cryptographic proofs and signatures
- **Encryption**: None (proofs are public)
- **Pinning**: Permanent

#### KYC Documents
- **Path Pattern**: `/squid/identity/{did}/kyc/{document-hash}.enc`
- **Content**: Encrypted KYC documents and verification data
- **Encryption**: AES-256-GCM with restricted access keys
- **Pinning**: Permanent with compliance retention

#### Audit Logs
- **Path Pattern**: `/squid/audit/{year}/{month}/{day}/{event-id}.json`
- **Content**: Immutable audit log entries
- **Encryption**: AES-256-GCM
- **Pinning**: 7-year retention policy

#### Reputation History
- **Path Pattern**: `/squid/identity/{did}/reputation/{timestamp}.json`
- **Content**: Reputation change events and calculations
- **Encryption**: None (reputation is public)
- **Pinning**: Permanent

## IPFS Integration

### Node Configuration
```json
{
  "Addresses": {
    "Swarm": [
      "/ip4/0.0.0.0/tcp/4001",
      "/ip6/::/tcp/4001",
      "/ip4/0.0.0.0/udp/4001/quic",
      "/ip6/::/udp/4001/quic"
    ],
    "Announce": [],
    "NoAnnounce": [],
    "API": "/ip4/127.0.0.1/tcp/5001",
    "Gateway": "/ip4/127.0.0.1/tcp/8080"
  },
  "Discovery": {
    "MDNS": {
      "Enabled": true,
      "Interval": 10
    }
  },
  "Routing": {
    "Type": "dhtclient"
  },
  "Reprovider": {
    "Interval": "12h",
    "Strategy": "all"
  },
  "Datastore": {
    "StorageMax": "10GB",
    "StorageGCWatermark": 90,
    "GCPeriod": "1h"
  },
  "Experimental": {
    "FilestoreEnabled": true,
    "UrlstoreEnabled": true,
    "ShardingEnabled": true,
    "Libp2pStreamMounting": true
  }
}
```

### Content Addressing

#### Identity CID Generation
```javascript
// Example CID generation for identity
const identityData = {
  did: "identity-123",
  name: "Test Identity",
  // ... other fields
};

const cid = await ipfs.add(JSON.stringify(identityData), {
  cidVersion: 1,
  hashAlg: 'sha2-256',
  pin: true
});
```

#### Merkle DAG Structure
```
Identity Root CID
├── metadata.json (identity data)
├── proofs/
│   ├── creation-proof.json
│   ├── verification-proof.json
│   └── signature-proof.json
├── kyc/
│   ├── documents/
│   │   ├── passport.enc
│   │   └── utility-bill.enc
│   └── verification-results.enc
├── reputation/
│   ├── 2024-01-01-score-update.json
│   ├── 2024-01-15-score-update.json
│   └── current-score.json
└── audit/
    ├── creation-event.json
    ├── verification-event.json
    └── access-events/
```

## Data Lifecycle Management

### Creation Phase
1. Identity data is validated and encrypted
2. Content is added to IPFS with permanent pinning
3. CID is recorded in local database for quick access
4. Merkle proof is generated for integrity verification

### Update Phase
1. New version of identity data is created
2. Previous version remains immutable in IPFS
3. Version history is maintained through linked CIDs
4. Update event is logged to audit trail

### Access Phase
1. CID is retrieved from local database
2. Content is fetched from IPFS network
3. Integrity is verified using Merkle proofs
4. Decryption is performed using Qlock integration
5. Access event is logged for audit

### Archival Phase
1. Old versions are moved to cold storage
2. Pinning is transferred to archival nodes
3. Access patterns are monitored
4. Compliance retention is enforced

## Performance Optimization

### Caching Strategy
- **Hot Data**: Recent identity data cached locally
- **Warm Data**: Frequently accessed data cached in Redis
- **Cold Data**: Archived data retrieved on-demand from IPFS

### Pinning Strategy
```json
{
  "pinning_policies": {
    "identity_metadata": {
      "policy": "permanent",
      "replication_factor": 3,
      "geographic_distribution": ["us-east", "eu-west", "asia-pacific"]
    },
    "kyc_documents": {
      "policy": "compliance_retention",
      "retention_period": "P7Y",
      "replication_factor": 5,
      "encryption_required": true
    },
    "audit_logs": {
      "policy": "time_based",
      "retention_period": "P7Y",
      "replication_factor": 3,
      "immutable": true
    },
    "reputation_history": {
      "policy": "permanent",
      "replication_factor": 2,
      "public_access": true
    }
  }
}
```

### Network Optimization
- **Content Routing**: DHT optimization for faster discovery
- **Bitswap**: Efficient block exchange with peers
- **Preloading**: Predictive content fetching
- **Compression**: GZIP compression for large datasets

## Security Considerations

### Encryption at Rest
- All sensitive data encrypted before IPFS storage
- Keys managed through Qlock integration
- Per-identity encryption keys for data isolation
- Regular key rotation for active identities

### Access Control
- IPFS content is public by default
- Sensitive data is encrypted before storage
- Access control enforced at application layer
- Audit logging for all access attempts

### Integrity Verification
- Merkle proofs for content integrity
- Digital signatures for authenticity
- Hash verification on content retrieval
- Tamper detection through CID validation

## Disaster Recovery

### Backup Strategy
- **Primary**: Local IPFS node with full pinning
- **Secondary**: Remote IPFS cluster for redundancy
- **Tertiary**: Cold storage backup for compliance

### Recovery Procedures
1. **Node Failure**: Automatic failover to cluster nodes
2. **Data Corruption**: Restore from Merkle DAG structure
3. **Network Partition**: Local cache serves critical data
4. **Complete Loss**: Restore from cold storage backups

### Testing
- Monthly disaster recovery drills
- Automated backup integrity verification
- Network partition simulation
- Data corruption detection testing

## Monitoring and Metrics

### IPFS Node Metrics
- Storage utilization and growth
- Network connectivity and peer count
- Content retrieval latency
- Pinning service health

### Content Metrics
- CID resolution success rate
- Content availability across network
- Replication factor compliance
- Access pattern analysis

### Performance Metrics
- Average retrieval time by content type
- Cache hit rates for different data tiers
- Network bandwidth utilization
- Storage cost per identity

## Compliance and Governance

### Data Residency
- Geographic pinning for regulatory compliance
- Data sovereignty requirements
- Cross-border data transfer controls
- Jurisdiction-specific retention policies

### Right to be Forgotten
- Encrypted data becomes inaccessible when keys are destroyed
- Audit trail preservation for compliance
- Selective data removal procedures
- User consent management integration

### Regulatory Reporting
- Storage utilization reports
- Data access audit trails
- Compliance violation detection
- Automated regulatory submissions