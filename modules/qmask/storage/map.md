# Qmask IPFS Storage Mapping

## Overview

Qmask uses IPFS for storing privacy-related artifacts while maintaining data sovereignty and compliance requirements.

## Storage Categories

### Privacy Profiles
- **Path Pattern**: `/qmask/profiles/{profile-name}/{version}`
- **Content Type**: JSON (privacy profile definitions)
- **Encryption**: Encrypted with profile-specific keys
- **Retention**: Permanent (until explicitly deleted)
- **Replication**: 3 nodes minimum

### Privacy Assessments
- **Path Pattern**: `/qmask/assessments/{assessment-id}`
- **Content Type**: JSON (assessment results and metadata)
- **Encryption**: Encrypted with assessment-specific keys
- **Retention**: 3 years
- **Replication**: 2 nodes minimum

### Compliance Reports
- **Path Pattern**: `/qmask/compliance/reports/{report-type}/{date}`
- **Content Type**: JSON/PDF (compliance reports)
- **Encryption**: Encrypted with compliance keys
- **Retention**: 7 years (regulatory requirement)
- **Replication**: 3 nodes minimum (high availability)

### Audit Logs
- **Path Pattern**: `/qmask/audit/{year}/{month}/{day}/{log-id}`
- **Content Type**: JSON (structured audit events)
- **Encryption**: Encrypted with audit keys
- **Retention**: 7 years (immutable)
- **Replication**: 5 nodes minimum (critical data)

### Data Subject Requests
- **Path Pattern**: `/qmask/dsr/{request-id}`
- **Content Type**: JSON (DSR details and responses)
- **Encryption**: Encrypted with DSR-specific keys
- **Retention**: 6 years (GDPR requirement)
- **Replication**: 3 nodes minimum

## Content Addressing

### CID Generation
- All content uses SHA-256 for content addressing
- Deterministic CIDs for identical content
- Version-specific CIDs for profile updates
- Merkle DAG structure for large documents

### Metadata Structure
```json
{
  "qmask": {
    "version": "2.0.0",
    "type": "privacy-profile|assessment|report|audit|dsr",
    "created": "ISO 8601 timestamp",
    "creator": "sQuid identity",
    "encryption": {
      "algorithm": "AES-256-GCM",
      "keyId": "key identifier"
    },
    "compliance": ["GDPR", "CCPA", "HIPAA"],
    "retention": {
      "period": "ISO 8601 duration",
      "policy": "delete|archive|retain"
    }
  }
}
```

## Encryption Strategy

### Key Hierarchy
- **Master Key**: Stored in Qlock keystore
- **Category Keys**: Derived for each storage category
- **Content Keys**: Unique per document/assessment
- **Rotation**: Automatic key rotation every 90 days

### Encryption Process
1. Generate unique content key
2. Encrypt content with AES-256-GCM
3. Encrypt content key with category key
4. Store encrypted content and key in IPFS
5. Record CID and key reference in database

## Access Control

### Permission Model
- **Read**: Requires `qmask:storage:read` permission
- **Write**: Requires `qmask:storage:write` permission
- **Delete**: Requires `qmask:storage:delete` permission
- **Admin**: Full access to all storage operations

### Identity-Based Access
- Content creators have full access to their content
- Shared profiles require explicit permission grants
- System profiles accessible to all authenticated users
- Compliance data restricted to authorized personnel

## Data Lifecycle Management

### Retention Policies
```yaml
privacy_profiles:
  retention: permanent
  action: soft_delete  # Mark as inactive

assessments:
  retention: P3Y  # 3 years
  action: archive

compliance_reports:
  retention: P7Y  # 7 years
  action: archive

audit_logs:
  retention: P7Y  # 7 years
  action: retain  # Never delete

dsr_records:
  retention: P6Y  # 6 years
  action: secure_delete
```

### Garbage Collection
- Automated cleanup of expired content
- Grace period before permanent deletion
- Secure deletion with cryptographic erasure
- Audit trail for all deletion operations

## Backup and Recovery

### Backup Strategy
- **Primary**: IPFS cluster with 3+ nodes
- **Secondary**: Encrypted backups to cloud storage
- **Tertiary**: Offline backup for critical data
- **Frequency**: Continuous replication, daily snapshots

### Recovery Procedures
1. **Node Failure**: Automatic failover to healthy nodes
2. **Data Corruption**: Restore from content-addressed backups
3. **Disaster Recovery**: Restore from offline backups
4. **Point-in-Time Recovery**: Use IPFS version history

## Performance Optimization

### Caching Strategy
- **Hot Data**: Frequently accessed profiles cached locally
- **Warm Data**: Recent assessments cached in Redis
- **Cold Data**: Archived content retrieved on-demand
- **Cache TTL**: 1 hour for profiles, 24 hours for reports

### Content Distribution
- **Geographic Distribution**: Nodes in multiple regions
- **Load Balancing**: Distribute requests across nodes
- **Bandwidth Optimization**: Compress large documents
- **Prefetching**: Anticipate access patterns

## Monitoring and Metrics

### Storage Metrics
- **Capacity**: Total storage used per category
- **Growth Rate**: Storage growth over time
- **Access Patterns**: Frequency and timing of access
- **Performance**: Read/write latency and throughput

### Health Monitoring
- **Node Status**: Monitor IPFS node health
- **Replication Status**: Verify content replication
- **Encryption Status**: Validate encryption integrity
- **Compliance Status**: Check retention policy adherence

## Integration Points

### Qindex Integration
- Register all stored content in Qindex
- Enable search and discovery of privacy artifacts
- Maintain content relationships and dependencies
- Support content lifecycle events

### Qerberos Integration
- Log all storage operations for audit
- Monitor access patterns for anomalies
- Generate compliance reports
- Alert on policy violations

### Qlock Integration
- Manage encryption keys for all content
- Handle key rotation and escrow
- Provide cryptographic operations
- Ensure key security and compliance