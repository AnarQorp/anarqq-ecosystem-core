# Qmarket IPFS Storage Mapping

This document describes how the Qmarket module maps and manages content storage using IPFS and other decentralized storage solutions.

## Storage Architecture

### Content Types and Storage Strategy

| Content Type | Storage Method | Pinning Policy | Replication | Access Pattern |
|--------------|----------------|----------------|-------------|----------------|
| Digital Art | IPFS + Filecoin | Permanent | 3 nodes | Hot |
| Media Files | IPFS + Storj | Conditional | 2 nodes | Warm |
| Documents | IPFS | Temporary | 1 node | Cold |
| Software | IPFS + Arweave | Permanent | 3 nodes | Hot |
| Data Sets | IPFS + Filecoin | Conditional | 2 nodes | Warm |
| Services | Metadata only | N/A | N/A | Hot |

### Storage Mapping Structure

```
qmarket://
├── listings/
│   ├── {listingId}/
│   │   ├── content/          # Main content file
│   │   ├── metadata/         # Listing metadata
│   │   ├── thumbnails/       # Preview images
│   │   ├── licenses/         # License documents
│   │   └── analytics/        # Usage analytics
├── purchases/
│   ├── {purchaseId}/
│   │   ├── receipt/          # Purchase receipt
│   │   ├── license/          # Digital license
│   │   └── access_logs/      # Access tracking
└── marketplace/
    ├── categories/           # Category metadata
    ├── stats/               # Marketplace statistics
    └── featured/            # Featured content
```

## IPFS Integration

### Content Addressing
- **Primary CID**: Main content identifier for the listed item
- **Metadata CID**: Separate CID for listing metadata
- **Thumbnail CID**: Preview image or video thumbnail
- **License CID**: Digital license document

### CID Generation Strategy
```javascript
// Content CID - actual file content
const contentCid = await ipfs.add(fileBuffer, {
  cidVersion: 1,
  hashAlg: 'sha2-256',
  pin: true
});

// Metadata CID - listing information
const metadataCid = await ipfs.add(JSON.stringify(metadata), {
  cidVersion: 1,
  hashAlg: 'sha2-256',
  pin: true
});

// Composite CID - links all related content
const compositeCid = await ipfs.dag.put({
  content: contentCid,
  metadata: metadataCid,
  thumbnail: thumbnailCid,
  license: licenseCid
}, {
  format: 'dag-cbor',
  hashAlg: 'sha2-256'
});
```

### IPFS Node Configuration
```json
{
  "Addresses": {
    "Swarm": [
      "/ip4/0.0.0.0/tcp/4001",
      "/ip6/::/tcp/4001",
      "/ip4/0.0.0.0/udp/4001/quic",
      "/ip6/::/udp/4001/quic"
    ],
    "API": "/ip4/127.0.0.1/tcp/5001",
    "Gateway": "/ip4/127.0.0.1/tcp/8080"
  },
  "Bootstrap": [
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa"
  ],
  "Datastore": {
    "StorageMax": "10GB",
    "StorageGCWatermark": 90,
    "GCPeriod": "1h"
  },
  "Reprovider": {
    "Interval": "12h",
    "Strategy": "all"
  }
}
```

## Pinning Strategies

### Automatic Pinning Rules
1. **High-Value Content** (>100 QToken): Permanent pinning on 3 nodes
2. **Medium-Value Content** (10-100 QToken): Conditional pinning on 2 nodes
3. **Low-Value Content** (<10 QToken): Temporary pinning on 1 node
4. **Popular Content** (>100 views): Upgrade to permanent pinning
5. **DAO Content**: Enhanced pinning based on DAO tier

### Pinning Service Integration
```javascript
const pinningServices = {
  primary: {
    name: 'Pinata',
    endpoint: 'https://api.pinata.cloud',
    priority: 1
  },
  secondary: {
    name: 'Web3.Storage',
    endpoint: 'https://api.web3.storage',
    priority: 2
  },
  tertiary: {
    name: 'NFT.Storage',
    endpoint: 'https://api.nft.storage',
    priority: 3
  }
};
```

### Dynamic Pinning Management
```javascript
class PinningManager {
  async evaluatePinning(listingId, metrics) {
    const listing = await this.getListing(listingId);
    const currentPolicy = await this.getPinningPolicy(listingId);
    
    // Evaluate upgrade conditions
    if (metrics.viewCount > 100 && currentPolicy.level < 2) {
      await this.upgradePinning(listingId, 'popular_content');
    }
    
    // Evaluate downgrade conditions
    if (metrics.lastAccessed < Date.now() - 90 * 24 * 60 * 60 * 1000) {
      await this.downgradePinning(listingId, 'inactive_content');
    }
  }
}
```

## Content Delivery Optimization

### QNET Integration
- **Gateway Selection**: Optimal IPFS gateway based on user location
- **CDN Integration**: Content delivery network for popular items
- **Edge Caching**: Regional caching for frequently accessed content
- **Load Balancing**: Distribute requests across multiple gateways

### Access URL Generation
```javascript
function generateAccessUrl(cid, listingId, userLocation) {
  const gateway = selectOptimalGateway(userLocation);
  const accessToken = generateAccessToken(listingId, userContext);
  
  return `${gateway.url}/ipfs/${cid}?token=${accessToken}&listing=${listingId}`;
}
```

### Performance Optimization
- **Preloading**: Preload popular content to edge nodes
- **Compression**: Automatic content compression for faster delivery
- **Format Optimization**: Convert media to optimal formats
- **Bandwidth Adaptation**: Adjust quality based on connection speed

## Data Retention and Lifecycle

### Retention Policies by Content Type
```json
{
  "digital-art": {
    "retention": "permanent",
    "backup": "required",
    "archival": "filecoin"
  },
  "media": {
    "retention": "2_years",
    "backup": "optional",
    "archival": "storj"
  },
  "documents": {
    "retention": "1_year",
    "backup": "optional",
    "archival": "ipfs_only"
  },
  "software": {
    "retention": "permanent",
    "backup": "required",
    "archival": "arweave"
  },
  "data": {
    "retention": "5_years",
    "backup": "required",
    "archival": "filecoin"
  }
}
```

### Garbage Collection
- **Automated GC**: Remove unpinned content after retention period
- **Grace Period**: 30-day grace period before permanent deletion
- **Backup Verification**: Ensure backups exist before deletion
- **User Notification**: Notify users before content expiration

### Content Migration
- **Hot to Warm**: Move less-accessed content to cheaper storage
- **Warm to Cold**: Archive old content to long-term storage
- **Cold to Archive**: Permanent archival for compliance
- **Restoration**: On-demand restoration from archives

## Security and Access Control

### Encryption at Rest
- **Content Encryption**: All content encrypted before IPFS storage
- **Key Management**: Qlock integration for key management
- **Access Keys**: Per-purchase access key generation
- **Key Rotation**: Regular rotation of encryption keys

### Access Control Integration
```javascript
class ContentAccessController {
  async validateAccess(cid, userContext) {
    // Check Qonsent permissions
    const hasPermission = await qonsent.checkAccess(
      userContext.squidId,
      `content:${cid}`,
      'read'
    );
    
    if (!hasPermission) {
      throw new Error('Access denied');
    }
    
    // Generate time-limited access token
    return this.generateAccessToken(cid, userContext);
  }
}
```

### Content Integrity
- **Hash Verification**: Verify content integrity on access
- **Signature Validation**: Validate creator signatures
- **Tamper Detection**: Detect unauthorized modifications
- **Audit Trail**: Log all content access and modifications

## Monitoring and Analytics

### Storage Metrics
- **Storage Usage**: Track total storage consumption
- **Pinning Costs**: Monitor pinning service costs
- **Access Patterns**: Analyze content access patterns
- **Performance Metrics**: Gateway response times and availability

### Cost Optimization
- **Usage-Based Pricing**: Adjust pinning based on actual usage
- **Bulk Discounts**: Negotiate better rates for high-volume content
- **Regional Optimization**: Use cheaper storage in appropriate regions
- **Lifecycle Management**: Automatic tier transitions to reduce costs

### Alerting and Notifications
- **Storage Limits**: Alert when approaching storage quotas
- **Cost Thresholds**: Notify when costs exceed budgets
- **Performance Issues**: Alert on gateway failures or slow responses
- **Security Events**: Immediate notification of security incidents

## Disaster Recovery

### Backup Strategy
- **Multi-Region Replication**: Content replicated across regions
- **Cross-Provider Backup**: Backup to multiple storage providers
- **Metadata Backup**: Separate backup of listing metadata
- **Recovery Testing**: Regular disaster recovery testing

### Recovery Procedures
1. **Identify Scope**: Determine extent of data loss
2. **Prioritize Recovery**: Recover high-value content first
3. **Restore from Backup**: Use most recent available backup
4. **Verify Integrity**: Validate recovered content integrity
5. **Update Indexes**: Refresh search and discovery indexes
6. **Notify Users**: Inform affected users of recovery status

### Business Continuity
- **Failover Procedures**: Automatic failover to backup systems
- **Service Degradation**: Graceful degradation during outages
- **Communication Plan**: User communication during incidents
- **Recovery Time Objectives**: Target recovery times by content type