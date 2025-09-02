# QpiC Storage Mapping

This document describes how QpiC manages media storage across different storage providers and IPFS integration.

## Storage Architecture

### Primary Storage: IPFS
- All media files stored in IPFS with content addressing
- Encrypted before storage using Qlock encryption
- Automatic pinning policies for content persistence
- Distributed replication across multiple nodes

### Secondary Storage: Local Cache
- Frequently accessed files cached locally
- Transcoded versions cached for performance
- Automatic cache eviction based on LRU policy
- Cache warming for popular content

### Backup Storage: Multiple Providers
- Redundant storage across multiple IPFS nodes
- Cloud storage backup for critical content
- Geographic distribution for disaster recovery

## IPFS Integration

### Content Addressing
```
Original File → Qlock Encryption → IPFS Storage → CID Generation
```

### Pinning Strategy
- **Permanent Pinning**: Licensed content, user-uploaded originals
- **Temporary Pinning**: Transcoded versions, thumbnails (30 days)
- **Conditional Pinning**: Based on access patterns and popularity

### Node Configuration
```yaml
ipfs_config:
  api_url: "http://localhost:5001"
  gateway_url: "http://localhost:8080"
  pinning_service: "pinata"  # or "web3.storage", "nft.storage"
  replication_factor: 3
  gc_policy: "auto"
```

## File Organization

### Directory Structure in IPFS
```
/qpic/
├── media/
│   ├── originals/
│   │   └── {year}/{month}/{mediaId}/
│   │       ├── original.{ext}
│   │       └── metadata.json
│   ├── transcoded/
│   │   └── {mediaId}/
│   │       ├── web-optimized.mp4
│   │       ├── mobile-optimized.mp4
│   │       └── thumbnails/
│   └── licenses/
│       └── {licenseId}.json
├── profiles/
│   └── transcoding/
│       ├── web-optimized.json
│       ├── mobile-optimized.json
│       └── print-quality.json
└── temp/
    └── processing/
        └── {jobId}/
```

### Metadata Storage
- Technical metadata stored alongside media files
- Descriptive metadata in MongoDB for fast querying
- Privacy-filtered metadata cached in Redis

## Storage Policies

### Retention Policies
```json
{
  "media_originals": {
    "retention": "permanent",
    "backup_required": true,
    "encryption": "required"
  },
  "transcoded_versions": {
    "retention": "1_year",
    "backup_required": false,
    "regenerate_on_demand": true
  },
  "thumbnails": {
    "retention": "6_months",
    "backup_required": false,
    "cache_priority": "high"
  },
  "temporary_files": {
    "retention": "7_days",
    "backup_required": false,
    "auto_cleanup": true
  }
}
```

### Access Patterns
- **Hot Storage**: Recently uploaded, frequently accessed
- **Warm Storage**: Older content with occasional access
- **Cold Storage**: Archive content, rarely accessed

## Content Delivery

### CDN Integration
- Popular content distributed to CDN edges
- Geographic optimization for global access
- Cache invalidation on content updates

### Streaming Optimization
- Adaptive bitrate streaming for video content
- Progressive download for large files
- Range request support for partial content

## Data Migration

### IPFS Node Migration
```bash
# Export content from old node
ipfs pin ls --type=recursive > pinned_content.txt

# Import to new node
cat pinned_content.txt | xargs -I {} ipfs pin add {}
```

### Storage Provider Migration
- Gradual migration with dual-write strategy
- Content verification during migration
- Rollback procedures for failed migrations

## Monitoring and Metrics

### Storage Metrics
- Total storage usage per user/DAO
- IPFS pin status and health
- Cache hit/miss ratios
- Storage cost tracking

### Performance Metrics
- Upload/download speeds
- Transcoding processing times
- IPFS retrieval latency
- Cache performance

## Backup and Recovery

### Backup Strategy
- Daily incremental backups of metadata
- Weekly full backups of critical content
- Cross-region replication for disaster recovery

### Recovery Procedures
- Point-in-time recovery for metadata
- Content recovery from IPFS network
- Emergency procedures for data loss

## Security Considerations

### Encryption
- All content encrypted before IPFS storage
- Separate encryption keys per media file
- Key rotation and escrow procedures

### Access Control
- IPFS gateway access restrictions
- Content addressing prevents enumeration
- Permission-based content serving

### Audit Trail
- All storage operations logged
- Content access tracking
- Integrity verification procedures