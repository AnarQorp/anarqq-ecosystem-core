# Qlock IPFS Storage Mapping

This document describes how Qlock stores data in IPFS and manages content addressing.

## Storage Strategy

Qlock uses IPFS for immutable storage of:
- Encrypted data blobs
- Audit logs
- Key metadata (not key material)
- Event logs
- Configuration snapshots

## Content Addressing

### Encrypted Data
- **Path**: `/qlock/encrypted/{algorithm}/{keyId}/{timestamp}`
- **CID**: Content-addressed by encrypted data hash
- **Metadata**: Stored separately with reference to data CID

### Audit Logs
- **Path**: `/qlock/audit/{date}/{identity}/{sequence}`
- **CID**: Content-addressed by audit entry hash
- **Retention**: 7 years for compliance

### Key Metadata
- **Path**: `/qlock/keys/{environment}/{identity}/{keyId}/metadata`
- **CID**: Content-addressed by metadata hash
- **Note**: Key material is NEVER stored in IPFS, only in KMS/HSM

### Event Logs
- **Path**: `/qlock/events/{topic}/{date}/{sequence}`
- **CID**: Content-addressed by event payload hash
- **Retention**: 1 year for operational history

## Pinning Policies

### Critical Data (Permanent Pinning)
- Audit logs (compliance requirement)
- Key metadata for active keys
- Configuration snapshots

### Operational Data (Temporary Pinning)
- Event logs (1 year retention)
- Performance metrics (90 days)
- Debug logs (30 days)

### Encrypted Data (User-Controlled)
- Pinned based on user/DAO policies
- Default: 2 years for active data
- Archived data: 7 years with cold storage

## Replication Strategy

### Geographic Distribution
- Primary: User's preferred region
- Secondary: 2 additional regions for redundancy
- Compliance: Data residency requirements respected

### Access Patterns
- **Hot**: Frequently accessed (< 1 hour)
- **Warm**: Occasionally accessed (< 1 week)
- **Cold**: Rarely accessed (> 1 month)

## Garbage Collection

### Automated Cleanup
- Expired temporary pins removed daily
- Orphaned content identified weekly
- User notification before deletion

### Manual Cleanup
- Admin tools for emergency cleanup
- Bulk operations for data migration
- Compliance-driven deletion

## Content Verification

### Integrity Checks
- CID verification on retrieval
- Periodic integrity scans
- Corruption detection and repair

### Access Control
- IPFS content is public by design
- Encryption provides confidentiality
- Access control via Qonsent integration

## Performance Optimization

### Caching Strategy
- Local cache for frequently accessed data
- CDN integration for global distribution
- Predictive prefetching for user patterns

### Bandwidth Management
- Compression for large payloads
- Delta sync for incremental updates
- Throttling for fair resource usage

## Monitoring and Metrics

### Storage Metrics
- Total storage usage per identity/DAO
- Pin count and distribution
- Access frequency and patterns

### Performance Metrics
- Retrieval latency by region
- Upload success rates
- Bandwidth utilization

### Cost Metrics
- Storage costs by data type
- Bandwidth costs by operation
- Pinning service costs

## Backup and Recovery

### Backup Strategy
- Daily snapshots of critical data
- Cross-region replication
- Encrypted backup verification

### Recovery Procedures
- Point-in-time recovery for audit logs
- Bulk data restoration procedures
- Emergency access protocols

## Compliance and Legal

### Data Retention
- Automatic enforcement of retention policies
- Legal hold capabilities
- Secure deletion verification

### Audit Trail
- Complete access history
- Modification tracking
- Compliance reporting

### Privacy Protection
- Encryption key separation
- Metadata minimization
- Right to erasure support