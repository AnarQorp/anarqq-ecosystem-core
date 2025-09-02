# Qdrive IPFS Storage Mapping

This document describes how Qdrive maps files to IPFS storage and manages content addressing.

## Storage Architecture

### IPFS Integration

Qdrive uses IPFS as the primary storage backend with the following architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Qdrive API    │    │   IPFS Node     │    │   Pinning       │
│                 │    │                 │    │   Service       │
│ - File Upload   │───▶│ - Content Store │───▶│ - Pin Management│
│ - File Retrieval│    │ - DHT Routing   │    │ - Replication   │
│ - Metadata      │    │ - Gateway       │    │ - Garbage GC    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Content Addressing

Files are stored using IPFS Content IDs (CIDs):

**CID Structure**:
- **Version**: CIDv1 (preferred) or CIDv0 (legacy)
- **Codec**: dag-pb for files, dag-cbor for metadata
- **Hash**: SHA-256 (default) or Blake2b-256
- **Format**: Base32 encoding for CIDv1

**Example CIDs**:
```
CIDv0: QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
CIDv1: bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
```

## File Storage Process

### 1. File Preparation

Before storing in IPFS, files undergo preparation:

```javascript
// File preparation pipeline
const prepareFile = async (file, metadata, options) => {
  // 1. Validate file
  await validateFile(file);
  
  // 2. Encrypt if requested (default: true)
  const encryptedFile = options.encrypt 
    ? await qlock.encrypt(file, metadata.owner)
    : file;
  
  // 3. Generate metadata
  const fileMetadata = {
    name: metadata.name,
    size: file.size,
    mimeType: file.mimetype,
    encrypted: options.encrypt,
    owner: metadata.owner,
    privacy: metadata.privacy,
    tags: metadata.tags,
    createdAt: new Date().toISOString()
  };
  
  // 4. Create IPFS object
  const ipfsObject = {
    file: encryptedFile,
    metadata: fileMetadata
  };
  
  return ipfsObject;
};
```

### 2. IPFS Storage

Files are added to IPFS with specific options:

```javascript
// IPFS add options
const addOptions = {
  pin: true,                    // Pin immediately
  wrapWithDirectory: false,     // Store file directly
  chunker: 'size-262144',      // 256KB chunks
  cidVersion: 1,               // Use CIDv1
  hashAlg: 'sha2-256',         // SHA-256 hashing
  rawLeaves: true,             // Use raw leaves for efficiency
  progress: (bytes) => {       // Progress callback
    console.log(`Uploaded ${bytes} bytes`);
  }
};

// Add file to IPFS
const result = await ipfs.add(fileBuffer, addOptions);
const cid = result.cid.toString();
```

### 3. Metadata Storage

File metadata is stored separately in IPFS:

```javascript
// Metadata object structure
const metadataObject = {
  version: '1.0',
  file: {
    cid: fileCid,
    name: metadata.name,
    size: metadata.size,
    mimeType: metadata.mimeType,
    encrypted: metadata.encrypted
  },
  ownership: {
    owner: metadata.owner,
    privacy: metadata.privacy,
    createdAt: metadata.createdAt
  },
  retention: {
    days: metadata.retentionDays,
    deleteAt: calculateDeleteDate(metadata.retentionDays),
    policy: 'delete'
  },
  indexing: {
    tags: metadata.tags,
    searchable: metadata.privacy === 'public',
    indexed: false  // Updated by Qindex
  }
};

// Store metadata in IPFS
const metadataBuffer = Buffer.from(JSON.stringify(metadataObject));
const metadataResult = await ipfs.add(metadataBuffer, {
  pin: true,
  cidVersion: 1
});
```

## Content Discovery

### IPFS Gateway Access

Files can be accessed through IPFS gateways:

**Public Gateways** (for public files only):
- `https://ipfs.io/ipfs/{cid}`
- `https://gateway.pinata.cloud/ipfs/{cid}`
- `https://cloudflare-ipfs.com/ipfs/{cid}`

**Private Gateway** (for all files):
- `https://gateway.qdrive.anarq.org/ipfs/{cid}`
- Requires authentication for private files
- Handles decryption for encrypted files

### DHT Routing

Files are discoverable through IPFS DHT:

```javascript
// DHT provider records
const providerRecord = {
  cid: fileCid,
  providers: [
    '/ip4/10.0.0.1/tcp/4001/p2p/QmNodeId1',
    '/ip4/10.0.0.2/tcp/4001/p2p/QmNodeId2'
  ],
  timestamp: new Date().toISOString()
};

// Announce to DHT
await ipfs.dht.provide(cid);
```

## Pinning Strategy

### Pinning Policies

Different pinning strategies based on file characteristics:

```javascript
// Pinning policies
const pinningPolicies = {
  public: {
    strategy: 'replicate',
    minReplicas: 3,
    geoDistribution: ['us-east', 'eu-west', 'asia-pacific'],
    priority: 'normal'
  },
  private: {
    strategy: 'secure',
    minReplicas: 2,
    geoDistribution: ['us-east', 'eu-west'],
    priority: 'high',
    encryption: 'required'
  },
  'dao-only': {
    strategy: 'community',
    minReplicas: 2,
    geoDistribution: 'dao-preference',
    priority: 'normal'
  }
};
```

### Pin Management

Automated pin management based on usage patterns:

```javascript
// Pin lifecycle management
const managePins = async () => {
  // 1. Identify unused files
  const unusedFiles = await findUnusedFiles(30); // 30 days
  
  // 2. Reduce replicas for cold storage
  for (const file of unusedFiles) {
    if (file.accessCount === 0 && file.age > 90) {
      await reduceReplicas(file.cid, 1);
    }
  }
  
  // 3. Increase replicas for hot files
  const hotFiles = await findHotFiles();
  for (const file of hotFiles) {
    if (file.accessCount > 100) {
      await increaseReplicas(file.cid, 5);
    }
  }
  
  // 4. Apply retention policies
  await applyRetentionPolicies();
};
```

## Data Retention and Lifecycle

### Retention Policies

Files follow automated retention policies:

**Policy Types**:
- **Delete**: Permanently remove file and metadata
- **Archive**: Move to cold storage, reduce replicas
- **Anonymize**: Remove identifying metadata, keep file

**Retention Schedules**:
```javascript
const retentionSchedules = {
  'user-files': {
    default: 365,      // 1 year
    minimum: 30,       // 30 days
    maximum: 3650      // 10 years
  },
  'temp-files': {
    default: 7,        // 7 days
    minimum: 1,        // 1 day
    maximum: 30        // 30 days
  },
  'shared-files': {
    default: 730,      // 2 years
    minimum: 90,       // 90 days
    maximum: 3650      // 10 years
  }
};
```

### Garbage Collection

Automated cleanup of unpinned content:

```javascript
// Garbage collection process
const garbageCollection = async () => {
  // 1. Identify unpinned content
  const unpinnedContent = await ipfs.pin.ls({ type: 'indirect' });
  
  // 2. Check retention policies
  for (const { cid } of unpinnedContent) {
    const metadata = await getFileMetadata(cid);
    
    if (shouldDelete(metadata)) {
      // 3. Remove from IPFS
      await ipfs.pin.rm(cid);
      await ipfs.block.rm(cid);
      
      // 4. Update indexes
      await qindex.remove(cid);
      
      // 5. Log deletion
      await qerberos.audit({
        action: 'file_deleted',
        cid,
        reason: 'retention_policy',
        timestamp: new Date().toISOString()
      });
    }
  }
};
```

## Performance Optimization

### Caching Strategy

Multi-layer caching for improved performance:

```javascript
// Cache hierarchy
const cacheHierarchy = {
  l1: {
    type: 'memory',
    size: '1GB',
    ttl: 300,          // 5 minutes
    items: 'hot-files'
  },
  l2: {
    type: 'redis',
    size: '10GB',
    ttl: 3600,         // 1 hour
    items: 'warm-files'
  },
  l3: {
    type: 'local-disk',
    size: '100GB',
    ttl: 86400,        // 24 hours
    items: 'recent-files'
  }
};
```

### Content Delivery

Optimized content delivery based on file type:

```javascript
// Delivery optimization
const deliveryStrategies = {
  'image/*': {
    compression: 'webp',
    resize: 'on-demand',
    cache: 'aggressive'
  },
  'video/*': {
    transcoding: 'adaptive',
    streaming: 'hls',
    cache: 'edge'
  },
  'application/pdf': {
    preview: 'generate',
    compression: 'lossless',
    cache: 'normal'
  },
  'text/*': {
    encoding: 'utf-8',
    minification: 'whitespace',
    cache: 'normal'
  }
};
```

## Monitoring and Metrics

### Storage Metrics

Key metrics tracked for storage management:

```javascript
// Storage metrics
const storageMetrics = {
  totalFiles: 0,
  totalSize: 0,
  pinnedFiles: 0,
  pinnedSize: 0,
  replicationFactor: 0,
  accessPatterns: {},
  storageEfficiency: 0,
  garbageCollectionStats: {}
};
```

### Health Monitoring

Continuous monitoring of IPFS node health:

```javascript
// Health checks
const healthChecks = {
  ipfsNode: () => ipfs.id(),
  pinningService: () => checkPinningService(),
  gatewayAccess: () => testGatewayAccess(),
  dhtConnectivity: () => checkDHTConnectivity(),
  storageQuota: () => checkStorageQuota()
};
```