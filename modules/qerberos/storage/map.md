# Qerberos IPFS Storage Mapping

This document describes how Qerberos maps its data structures to IPFS storage for immutable audit trails and secure data persistence.

## Storage Architecture

Qerberos uses IPFS as the primary storage backend for:

1. **Audit Events** - Immutable audit trail entries
2. **Security Alerts** - Security incident records
3. **Risk Assessments** - Risk scoring results
4. **Compliance Reports** - Regulatory compliance documentation
5. **Anomaly Detection Results** - ML-based anomaly detection outputs

## Data Structure Mapping

### Audit Events

**Path Pattern**: `/qerberos/audit/{year}/{month}/{day}/{event-id}`

**IPFS Structure**:
```
QmAuditRoot/
├── 2024/
│   ├── 02/
│   │   ├── 08/
│   │   │   ├── audit-event-{uuid}.json
│   │   │   ├── audit-event-{uuid}.json.sig
│   │   │   └── ...
│   │   └── ...
│   └── ...
└── index.json
```

**Content Format**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "access",
  "ref": "file:QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  "actor": {
    "squidId": "did:squid:user123",
    "subId": "work"
  },
  "layer": "qdrive",
  "verdict": "ALLOW",
  "details": {
    "operation": "download",
    "fileSize": 1024,
    "fileName": "document.pdf"
  },
  "timestamp": "2024-02-08T15:30:00.000Z",
  "signature": "0x1234567890abcdef...",
  "ipfsCid": "QmAuditEventCid123456789"
}
```

### Security Alerts

**Path Pattern**: `/qerberos/alerts/{severity}/{year}/{month}/{alert-id}`

**IPFS Structure**:
```
QmAlertsRoot/
├── critical/
│   ├── 2024/
│   │   ├── 02/
│   │   │   ├── alert-{uuid}.json
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── high/
├── medium/
├── low/
└── index.json
```

### Risk Assessments

**Path Pattern**: `/qerberos/risk/{identity-hash}/{timestamp}`

**IPFS Structure**:
```
QmRiskRoot/
├── identity-hashes/
│   ├── {hash-prefix}/
│   │   ├── risk-assessment-{timestamp}.json
│   │   └── ...
│   └── ...
└── index.json
```

### Compliance Reports

**Path Pattern**: `/qerberos/compliance/{type}/{year}/{quarter}/{report-id}`

**IPFS Structure**:
```
QmComplianceRoot/
├── gdpr/
│   ├── 2024/
│   │   ├── Q1/
│   │   │   ├── report-{uuid}.json
│   │   │   ├── report-{uuid}.pdf
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── soc2/
├── custom/
└── index.json
```

### Anomaly Detection Results

**Path Pattern**: `/qerberos/anomalies/{model}/{year}/{month}/{day}/{analysis-id}`

**IPFS Structure**:
```
QmAnomaliesRoot/
├── behavioral_v2.1/
│   ├── 2024/
│   │   ├── 02/
│   │   │   ├── 08/
│   │   │   │   ├── analysis-{uuid}.json
│   │   │   │   └── ...
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── statistical_v1.5/
└── index.json
```

## Content Addressing

### CID Generation

All content is addressed using IPFS CIDs with the following specifications:

- **Hash Function**: SHA-256
- **CID Version**: CIDv1
- **Multicodec**: dag-json for structured data, raw for binary data
- **Multibase**: base32 encoding for text representation

### Content Integrity

Each stored object includes:

1. **Content Hash**: SHA-256 hash of the content
2. **Signature**: Ed25519 signature using Qlock
3. **Timestamp**: RFC3339 timestamp
4. **Version**: Schema version for forward compatibility

### Verification Process

```javascript
// Verify content integrity
async function verifyContent(cid, expectedHash, signature) {
  // 1. Retrieve content from IPFS
  const content = await ipfs.cat(cid);
  
  // 2. Verify content hash
  const actualHash = sha256(content);
  if (actualHash !== expectedHash) {
    throw new Error('Content hash mismatch');
  }
  
  // 3. Verify signature
  const signatureValid = await qlock.verify(signature, content);
  if (!signatureValid) {
    throw new Error('Invalid signature');
  }
  
  return true;
}
```

## Indexing Strategy

### Primary Indexes

1. **Temporal Index**: Events indexed by timestamp for chronological queries
2. **Identity Index**: Events indexed by actor identity for user-specific queries
3. **Type Index**: Events indexed by type for category-specific queries
4. **Severity Index**: Alerts indexed by severity for priority-based queries

### Index Structure

```json
{
  "version": "1.0.0",
  "created": "2024-02-08T15:30:00.000Z",
  "updated": "2024-02-08T15:30:00.000Z",
  "indexes": {
    "temporal": {
      "2024-02-08": [
        "QmAuditEvent1...",
        "QmAuditEvent2...",
        "..."
      ]
    },
    "identity": {
      "did:squid:user123": [
        "QmAuditEvent1...",
        "QmAuditEvent3...",
        "..."
      ]
    },
    "type": {
      "access": [
        "QmAuditEvent1...",
        "QmAuditEvent4...",
        "..."
      ]
    }
  }
}
```

### Index Updates

Indexes are updated atomically using IPFS DAG operations:

1. **Read** current index
2. **Update** index with new entries
3. **Write** new index version
4. **Update** root pointer

## Replication Strategy

### Geographic Distribution

Content is replicated across multiple geographic regions:

- **Primary**: US East (Virginia)
- **Secondary**: EU West (Ireland)
- **Tertiary**: Asia Pacific (Singapore)

### Replication Policies

```json
{
  "audit_events": {
    "replication_factor": 3,
    "regions": ["us-east-1", "eu-west-1", "ap-southeast-1"],
    "consistency": "strong"
  },
  "security_alerts": {
    "replication_factor": 3,
    "regions": ["us-east-1", "eu-west-1", "ap-southeast-1"],
    "consistency": "strong"
  },
  "compliance_reports": {
    "replication_factor": 5,
    "regions": ["us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1"],
    "consistency": "strong"
  }
}
```

## Access Patterns

### Read Patterns

1. **Recent Events**: Most queries are for recent events (last 30 days)
2. **Identity-based**: Queries filtered by specific identities
3. **Compliance Queries**: Periodic queries for compliance reporting
4. **Alert Queries**: Real-time queries for active alerts

### Write Patterns

1. **Append-only**: All writes are append-only operations
2. **Batch Writes**: Events written in batches for efficiency
3. **Immediate Consistency**: Critical events require immediate consistency
4. **Eventual Consistency**: Non-critical events can use eventual consistency

## Performance Optimization

### Caching Strategy

1. **Hot Data**: Recent events cached in Redis
2. **Warm Data**: Frequently accessed events cached locally
3. **Cold Data**: Archived events accessed directly from IPFS

### Query Optimization

1. **Index Utilization**: All queries use appropriate indexes
2. **Result Pagination**: Large result sets are paginated
3. **Parallel Queries**: Multiple indexes queried in parallel
4. **Result Caching**: Query results cached for repeated access

## Data Lifecycle Management

### Retention Policies

1. **Audit Events**: 7 years retention for compliance
2. **Security Alerts**: 5 years retention for security analysis
3. **Risk Assessments**: 2 years retention for trend analysis
4. **Compliance Reports**: 10 years retention for regulatory requirements

### Archival Process

1. **Hot Storage**: 0-90 days (immediate access)
2. **Warm Storage**: 90 days - 2 years (fast access)
3. **Cold Storage**: 2-7 years (slower access)
4. **Archive Storage**: 7+ years (compliance only)

### Garbage Collection

Automated garbage collection removes:

1. **Expired Content**: Content past retention period
2. **Orphaned Objects**: Objects with no references
3. **Duplicate Content**: Identical content with multiple CIDs
4. **Corrupted Data**: Data that fails integrity checks

## Security Considerations

### Access Control

1. **Identity-based Access**: Access controlled by sQuid identity
2. **Permission-based Access**: Fine-grained permissions via Qonsent
3. **Audit Trail**: All access logged for security monitoring
4. **Encryption**: Sensitive data encrypted before storage

### Threat Mitigation

1. **Content Tampering**: Prevented by cryptographic signatures
2. **Unauthorized Access**: Prevented by access control policies
3. **Data Loss**: Prevented by geographic replication
4. **Service Disruption**: Mitigated by distributed architecture

### Compliance

1. **GDPR**: Right to erasure implemented through cryptographic deletion
2. **SOC2**: Comprehensive audit trails and access controls
3. **Data Residency**: Geographic restrictions enforced
4. **Encryption**: Data encrypted at rest and in transit