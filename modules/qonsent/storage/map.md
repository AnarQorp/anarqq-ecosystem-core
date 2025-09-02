# Qonsent Storage Mapping

This document describes how Qonsent data is mapped to IPFS storage.

## Storage Architecture

Qonsent uses a hybrid storage approach:
- **Hot Data**: Frequently accessed data in MongoDB for fast queries
- **Cold Data**: Historical and audit data in IPFS for immutability
- **Metadata**: Resource metadata and indexes in Qindex

## IPFS Content Mapping

### Policy Documents
```
/qonsent/policies/{policyId}/
├── policy.json          # Policy definition and rules
├── metadata.json        # Policy metadata (created, updated, etc.)
├── signatures/          # Cryptographic signatures
│   ├── issuer.sig      # Issuer signature
│   └── witnesses/      # Witness signatures
└── audit/              # Audit trail
    ├── created.json    # Creation audit
    ├── updated.json    # Update audit
    └── accessed.json   # Access audit
```

### Permission Grants
```
/qonsent/grants/{grantId}/
├── grant.json          # Grant details and permissions
├── conditions.json     # Grant conditions and constraints
├── signatures/         # Cryptographic proofs
│   ├── grantor.sig    # Grantor signature
│   └── grantee.sig    # Grantee acceptance (if required)
└── audit/             # Grant lifecycle audit
    ├── issued.json    # Issuance audit
    ├── used.json      # Usage audit
    └── revoked.json   # Revocation audit (if applicable)
```

### Audit Logs
```
/qonsent/audit/{date}/
├── {hour}/
│   ├── permissions.jsonl    # Permission check logs
│   ├── grants.jsonl        # Grant/revoke logs
│   ├── policies.jsonl      # Policy change logs
│   └── security.jsonl      # Security event logs
└── daily-summary.json      # Daily audit summary
```

### Event Logs
```
/qonsent/events/{date}/
├── {hour}/
│   ├── grant-issued.jsonl     # Grant issued events
│   ├── revoked.jsonl         # Permission revoked events
│   ├── policy-updated.jsonl  # Policy update events
│   └── security-alert.jsonl  # Security alert events
└── event-index.json          # Event index for fast lookup
```

## Content Addressing

### CID Generation
- All content is stored with deterministic CIDs
- Content is deduplicated automatically
- Version history is maintained through linked CIDs

### Content Types
- **dag-json**: Structured data (policies, grants, metadata)
- **raw**: Binary data (signatures, encrypted content)
- **dag-cbor**: Compact binary data for large datasets

### Linking Strategy
```json
{
  "policy": {
    "/": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
  },
  "previousVersion": {
    "/": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
  },
  "signatures": [
    {
      "/": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
    }
  ]
}
```

## Data Lifecycle

### Creation
1. Data is validated and structured
2. Content is encrypted if sensitive
3. CID is generated and stored
4. Metadata is indexed in Qindex
5. Event is published to event bus

### Updates
1. New version is created with link to previous
2. Previous version remains accessible
3. Index is updated with new CID
4. Change event is published

### Deletion
1. Soft delete: Mark as deleted in index
2. Hard delete: Remove from pinning (after retention period)
3. Audit trail is preserved
4. Deletion event is published

## Pinning Policies

### Critical Data (Permanent Pinning)
- Active policies and grants
- Current permission states
- Security audit logs
- Compliance records

### Important Data (Long-term Pinning)
- Historical policies (7 years)
- Grant history (7 years)
- Audit trails (7 years)
- Event logs (1 year)

### Temporary Data (Short-term Pinning)
- Session data (24 hours)
- Temporary grants (until expiration)
- Cache data (1 week)
- Debug logs (30 days)

## Replication Strategy

### Geographic Distribution
- Primary: US East (Virginia)
- Secondary: EU West (Ireland)
- Tertiary: Asia Pacific (Singapore)

### Replication Levels
- **Critical**: 5 replicas across 3 regions
- **Important**: 3 replicas across 2 regions
- **Standard**: 2 replicas in primary region
- **Temporary**: 1 replica in primary region

## Access Patterns

### Hot Path (MongoDB)
- Permission checks (high frequency)
- Active grant lookups
- Policy evaluations
- Real-time audit queries

### Warm Path (IPFS + Cache)
- Historical grant lookups
- Policy version history
- Audit report generation
- Compliance queries

### Cold Path (IPFS Only)
- Long-term audit storage
- Compliance archives
- Forensic investigations
- Data recovery scenarios

## Performance Optimization

### Caching Strategy
- Redis cache for frequent permission checks
- CDN for public policy documents
- Local cache for recently accessed data
- Precomputed indexes for common queries

### Query Optimization
- Compound indexes for multi-field queries
- Partial indexes for sparse data
- Text indexes for search functionality
- Geospatial indexes for location-based permissions

### Batch Operations
- Bulk grant operations
- Batch audit log processing
- Scheduled cleanup operations
- Periodic index rebuilding

## Monitoring and Alerting

### Storage Metrics
- IPFS node health and connectivity
- Pin success/failure rates
- Storage utilization and growth
- Replication status across regions

### Performance Metrics
- Query response times
- Cache hit/miss rates
- IPFS retrieval latency
- Index update performance

### Alerts
- Failed pinning operations
- Storage quota exceeded
- Replication failures
- Performance degradation