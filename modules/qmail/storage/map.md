# Qmail IPFS Storage Mapping

This document describes how Qmail integrates with IPFS for decentralized message storage.

## Storage Architecture

### Message Storage Structure
```
IPFS Root
├── messages/
│   ├── {messageId}/
│   │   ├── content.enc          # Encrypted message content
│   │   ├── metadata.enc         # Encrypted metadata
│   │   ├── attachments/         # Encrypted attachments
│   │   │   ├── {attachmentId}.enc
│   │   │   └── manifest.json    # Attachment manifest
│   │   └── signature.json       # Message signature
│   └── indices/
│       ├── sender_{squidId}/    # Sender message index
│       ├── recipient_{squidId}/ # Recipient message index
│       └── thread_{threadId}/   # Thread/conversation index
├── receipts/
│   ├── {receiptId}/
│   │   ├── receipt.enc          # Encrypted receipt data
│   │   ├── signature.json       # Receipt signature
│   │   └── verification.json    # Verification data
└── audit/
    ├── {date}/                  # Daily audit logs
    │   ├── message_events.enc   # Message lifecycle events
    │   ├── access_events.enc    # Access events
    │   └── security_events.enc  # Security events
```

## Content Addressing

### Message CIDs
- **Format**: `Qm{hash}` (IPFS v0) or `bafy{hash}` (IPFS v1)
- **Content**: Encrypted message bundle (content + metadata + attachments)
- **Immutability**: Messages are immutable once stored
- **Versioning**: New versions create new CIDs

### Receipt CIDs
- **Format**: Same as message CIDs
- **Content**: Cryptographic receipt with signatures
- **Linking**: Receipts link to original message CIDs
- **Verification**: Self-contained verification data

## Encryption Strategy

### Message Encryption
```javascript
// Message encryption flow
1. Generate unique message key (AES-256)
2. Encrypt content with message key
3. Encrypt message key with recipient's public key
4. Store encrypted content + encrypted key in IPFS
5. Return IPFS CID for retrieval
```

### Key Management
- **Message Keys**: Unique per message, never reused
- **Recipient Keys**: Retrieved from sQuid identity service
- **Sender Keys**: Used for message signing
- **Attachment Keys**: Separate keys per attachment

### Encryption Levels
```
STANDARD:
- Content: AES-256-GCM
- Key Size: 256 bits
- IV: Random 96 bits

HIGH:
- Content: AES-256-GCM + ChaCha20-Poly1305
- Key Size: 256 bits
- Key Rotation: Per message
- Forward Secrecy: Ephemeral keys

QUANTUM:
- Content: AES-256-GCM + Kyber-768
- Key Exchange: Kyber-1024
- Signatures: Dilithium-3
- Post-Quantum Safe: Yes
```

## Pinning Policies

### Message Pinning
- **Sender Copy**: Pinned for retention period
- **Recipient Copy**: Pinned until read + grace period
- **Archive Copy**: Long-term pinning for compliance
- **Backup Copies**: Geographic distribution

### Receipt Pinning
- **Legal Receipts**: Permanent pinning
- **Delivery Receipts**: Pinned for audit period
- **Read Receipts**: Pinned for compliance period

### Attachment Pinning
- **Small Files (<1MB)**: Pinned with message
- **Large Files (>1MB)**: Separate pinning policy
- **Media Files**: Content-addressed deduplication
- **Temporary Files**: Short-term pinning

## Access Patterns

### Message Retrieval
1. **By Message ID**: Direct CID lookup
2. **By Sender**: Index-based retrieval
3. **By Recipient**: Index-based retrieval
4. **By Thread**: Conversation-based retrieval
5. **By Date Range**: Time-based index queries

### Search Optimization
- **Metadata Indices**: Encrypted searchable indices
- **Full-Text Search**: Client-side after decryption
- **Tag-Based Search**: Encrypted tag indices
- **Faceted Search**: Multi-dimensional indices

## Data Lifecycle

### Message Lifecycle
```
1. Creation → Encryption → IPFS Storage → Indexing
2. Delivery → Receipt Generation → Audit Logging
3. Reading → Access Logging → Receipt Update
4. Retention → Archive/Delete → Cleanup
```

### Retention Policies
- **Standard Messages**: 2 years default
- **Legal Hold**: Indefinite retention
- **Compliance Messages**: Per regulation requirements
- **Temporary Messages**: User-defined expiration

### Deletion Process
```
1. Mark for deletion in index
2. Remove from active pinning
3. Generate deletion certificate
4. Audit log deletion event
5. Garbage collection after grace period
```

## Performance Optimization

### Caching Strategy
- **Hot Data**: Recent messages cached locally
- **Warm Data**: Frequently accessed messages
- **Cold Data**: Archive storage with slower retrieval
- **Cache Invalidation**: Time-based and event-based

### Content Delivery
- **Geographic Distribution**: Multiple IPFS nodes
- **Load Balancing**: Distribute requests across nodes
- **Compression**: Content compression before encryption
- **Deduplication**: Attachment-level deduplication

### Bandwidth Optimization
- **Lazy Loading**: Load message content on demand
- **Progressive Loading**: Load metadata first, content second
- **Compression**: Gzip compression for text content
- **Delta Sync**: Incremental updates for large conversations

## Security Considerations

### Access Control
- **CID Privacy**: CIDs not exposed without authorization
- **Content Encryption**: All content encrypted before IPFS
- **Key Isolation**: Keys never stored with content
- **Access Logging**: All access attempts logged

### Integrity Protection
- **Content Hashing**: SHA-256 hashes for all content
- **Signature Verification**: All messages cryptographically signed
- **Tamper Detection**: Integrity checks on retrieval
- **Version Control**: Immutable version history

### Privacy Protection
- **Metadata Encryption**: All metadata encrypted
- **Traffic Analysis**: Resistant to traffic analysis
- **Timing Attacks**: Randomized access patterns
- **Size Obfuscation**: Padded content to hide sizes

## Monitoring and Metrics

### Storage Metrics
- **Total Storage**: Aggregate storage usage
- **Growth Rate**: Storage growth over time
- **Pinning Status**: Pin success/failure rates
- **Retrieval Latency**: Average retrieval times

### Performance Metrics
- **Upload Speed**: Message upload performance
- **Download Speed**: Message retrieval performance
- **Cache Hit Rate**: Local cache effectiveness
- **Error Rates**: Storage/retrieval error rates

### Cost Metrics
- **Storage Costs**: IPFS storage costs
- **Bandwidth Costs**: Data transfer costs
- **Pinning Costs**: Pin service costs
- **Optimization Savings**: Cost reduction from optimization

## Disaster Recovery

### Backup Strategy
- **Multi-Region**: Backups across multiple regions
- **Multi-Provider**: Multiple IPFS providers
- **Incremental Backups**: Daily incremental backups
- **Full Backups**: Weekly full backups

### Recovery Procedures
- **Data Corruption**: Restore from backup CIDs
- **Node Failure**: Failover to backup nodes
- **Network Partition**: Local cache fallback
- **Complete Failure**: Full system restore

### Business Continuity
- **RTO Target**: 4 hours maximum downtime
- **RPO Target**: 1 hour maximum data loss
- **Degraded Mode**: Read-only access during recovery
- **Communication**: User notification during outages