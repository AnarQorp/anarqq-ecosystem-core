# IPFS Storage Mapping - {{MODULE_NAME}}

This document defines how the {{MODULE_NAME}} module maps data to IPFS storage and manages content addressing.

## Storage Architecture

The {{MODULE_NAME}} module uses IPFS for content-addressable storage with the following principles:

- **Content Addressing**: All data is addressed by its cryptographic hash (CID)
- **Immutability**: Content is immutable once stored
- **Deduplication**: Identical content shares the same CID
- **Distributed**: Content is distributed across IPFS network

## Data Types and Storage Mapping

### Resource Data

**Type**: Primary module resources
**Storage Pattern**: Direct IPFS storage with metadata wrapper
**CID Format**: `Qm...` (SHA-256, Base58)

```json
{
  "type": "{{MODULE_NAME}}_resource",
  "version": "1.0",
  "metadata": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Resource Name",
    "created": "2023-01-01T00:00:00Z",
    "owner": {
      "squidId": "123e4567-e89b-12d3-a456-426614174001"
    }
  },
  "data": {
    // Actual resource data
  },
  "signatures": {
    "owner": "signature-from-qlock",
    "module": "module-signature"
  }
}
```

### Configuration Data

**Type**: Module configuration and settings
**Storage Pattern**: Encrypted configuration objects
**CID Format**: `Qm...` (SHA-256, Base58)

```json
{
  "type": "{{MODULE_NAME}}_config",
  "version": "1.0",
  "encrypted": true,
  "keyId": "config-key-id",
  "data": "encrypted-configuration-data"
}
```

### Audit Logs

**Type**: Audit and activity logs
**Storage Pattern**: Append-only log entries
**CID Format**: `Qm...` (SHA-256, Base58)

```json
{
  "type": "{{MODULE_NAME}}_audit",
  "version": "1.0",
  "timestamp": "2023-01-01T00:00:00Z",
  "entries": [
    {
      "id": "log-entry-id",
      "event": "resource_created",
      "actor": "squid-id",
      "details": {}
    }
  ],
  "prevCid": "previous-log-cid"
}
```

### User Data

**Type**: User-specific data and preferences
**Storage Pattern**: Encrypted per-user storage
**CID Format**: `Qm...` (SHA-256, Base58)

```json
{
  "type": "{{MODULE_NAME}}_user_data",
  "version": "1.0",
  "userId": "squid-id",
  "encrypted": true,
  "keyId": "user-specific-key-id",
  "data": "encrypted-user-data"
}
```

## Storage Operations

### Store Operation

```javascript
async function storeData(data, options = {}) {
  // 1. Validate data structure
  const validatedData = validateDataStructure(data);
  
  // 2. Apply encryption if required
  let processedData = validatedData;
  if (options.encrypt) {
    processedData = await qlock.encrypt(validatedData, {
      keyId: options.keyId,
      algorithm: 'AES-256-GCM'
    });
  }
  
  // 3. Add metadata wrapper
  const wrappedData = {
    type: `{{MODULE_NAME}}_${options.type}`,
    version: '1.0',
    timestamp: new Date().toISOString(),
    metadata: options.metadata || {},
    data: processedData
  };
  
  // 4. Store in IPFS
  const cid = await ipfs.add(JSON.stringify(wrappedData));
  
  // 5. Register in Qindex for discoverability
  await qindex.put({
    key: options.indexKey,
    cid: cid.toString(),
    type: options.type,
    tags: options.tags || []
  });
  
  // 6. Apply pinning policy
  await applyPinningPolicy(cid, options.type);
  
  return cid.toString();
}
```

### Retrieve Operation

```javascript
async function retrieveData(cid, options = {}) {
  // 1. Fetch from IPFS
  const rawData = await ipfs.cat(cid);
  const wrappedData = JSON.parse(rawData.toString());
  
  // 2. Validate data structure
  validateDataStructure(wrappedData);
  
  // 3. Decrypt if necessary
  let data = wrappedData.data;
  if (wrappedData.encrypted) {
    data = await qlock.decrypt(data, {
      keyId: wrappedData.keyId
    });
  }
  
  // 4. Apply privacy masking if required
  if (options.applyMask) {
    data = await qmask.apply(data, options.maskProfile);
  }
  
  return {
    ...wrappedData,
    data
  };
}
```

## Content Addressing Strategy

### CID Generation

- **Hash Function**: SHA-256
- **Encoding**: Base58 (default) or Base32 (for case-insensitive systems)
- **Multicodec**: JSON for structured data, Raw for binary data
- **Version**: CIDv1 for new content, CIDv0 for compatibility

### Content Types

| Data Type | Multicodec | Hash | Encoding |
|-----------|------------|------|----------|
| JSON Data | `json` | `sha2-256` | `base58btc` |
| Binary Files | `raw` | `sha2-256` | `base58btc` |
| Encrypted Data | `raw` | `sha2-256` | `base58btc` |
| Metadata | `json` | `sha2-256` | `base58btc` |

### CID Examples

```
# Resource data
QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco

# Configuration data
QmYwAPJzv5CZsnA8rdpxmPI1coEqrXDcSRCoqp2H5aqMLz

# Audit log
QmZTR5bcpQD7cFgTorqxZDYaew1Wqgfbd2ud9QqGPAkK2V
```

## Data Lifecycle Management

### Creation

1. **Validation**: Validate data structure and constraints
2. **Encryption**: Apply encryption based on data classification
3. **Wrapping**: Add metadata wrapper with type and version
4. **Storage**: Store in IPFS and get CID
5. **Indexing**: Register in Qindex for discoverability
6. **Pinning**: Apply appropriate pinning policy

### Updates

1. **Immutability**: Original content remains unchanged
2. **New Version**: Create new version with updated data
3. **Linking**: Link new version to previous version
4. **Indexing**: Update index to point to new version
5. **Cleanup**: Schedule old version for garbage collection (if appropriate)

### Deletion

1. **Soft Delete**: Mark as deleted in index, keep content
2. **Hard Delete**: Remove from pinning, allow garbage collection
3. **Audit Trail**: Maintain audit trail of deletion
4. **Compliance**: Follow data retention and deletion policies

## Pinning Policies

See `pinning.policy.json` for detailed pinning configuration.

### Policy Types

- **Permanent**: Critical data that must never be garbage collected
- **Temporary**: Data with expiration date
- **Conditional**: Data pinned based on access patterns
- **Replicated**: Data replicated across multiple nodes

### Pinning Strategy

```javascript
const pinningPolicies = {
  'user_data': {
    type: 'permanent',
    replication: 3,
    locations: ['local', 'backup', 'archive']
  },
  'temp_files': {
    type: 'temporary',
    ttl: '7d',
    replication: 1
  },
  'audit_logs': {
    type: 'permanent',
    replication: 5,
    locations: ['local', 'backup', 'archive', 'compliance', 'disaster-recovery']
  }
};
```

## Performance Optimization

### Caching Strategy

- **Local Cache**: Frequently accessed content cached locally
- **CDN Integration**: Popular content served via CDN
- **Preloading**: Predictive content preloading
- **Compression**: Content compression for large files

### Access Patterns

- **Hot Data**: Frequently accessed, kept in fast storage
- **Warm Data**: Occasionally accessed, standard storage
- **Cold Data**: Rarely accessed, archived storage

## Security Considerations

### Encryption

- **At Rest**: All sensitive data encrypted before IPFS storage
- **Key Management**: Encryption keys managed via Qlock/KMS
- **Access Control**: Decryption keys tied to Qonsent permissions

### Privacy

- **Data Masking**: Personal data masked via Qmask profiles
- **Anonymization**: PII anonymized for analytics
- **Right to Erasure**: Cryptographic erasure via key deletion

### Integrity

- **Content Verification**: CID provides cryptographic integrity
- **Signature Verification**: Content signatures verified via Qlock
- **Audit Trail**: All access logged via Qerberos

## Monitoring and Metrics

### Storage Metrics

- **Storage Usage**: Total storage consumed
- **Growth Rate**: Storage growth over time
- **Access Patterns**: Content access frequency
- **Cache Hit Rate**: Local cache effectiveness

### Performance Metrics

- **Retrieval Latency**: Time to retrieve content
- **Storage Latency**: Time to store content
- **Bandwidth Usage**: Network bandwidth consumption
- **Error Rates**: Storage/retrieval error rates

### Alerts

- **Storage Quota**: Alert when approaching storage limits
- **Performance Degradation**: Alert on slow operations
- **Replication Failures**: Alert on pinning/replication issues
- **Security Events**: Alert on unauthorized access attempts

## Backup and Recovery

### Backup Strategy

- **Automated Backups**: Regular automated backups
- **Geographic Distribution**: Backups in multiple locations
- **Versioning**: Multiple backup versions maintained
- **Verification**: Regular backup integrity verification

### Recovery Procedures

1. **Identify Loss**: Detect data loss or corruption
2. **Assess Impact**: Determine scope of data loss
3. **Select Recovery Point**: Choose appropriate backup version
4. **Restore Data**: Restore from backup
5. **Verify Integrity**: Verify restored data integrity
6. **Update Indexes**: Update Qindex with restored content

## Compliance and Governance

### Data Retention

- **Retention Policies**: Automated data retention enforcement
- **Legal Holds**: Support for legal hold requirements
- **Compliance Reporting**: Automated compliance reports

### Data Governance

- **Data Classification**: Automatic data classification
- **Access Logging**: Complete access audit trail
- **Policy Enforcement**: Automated policy enforcement
- **Violation Detection**: Automated policy violation detection