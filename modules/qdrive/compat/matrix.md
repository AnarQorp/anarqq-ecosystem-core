# Qdrive Compatibility Matrix

This document defines the compatibility requirements and integration versions for the Qdrive module with other Q ecosystem modules.

## Module Dependencies

### Required Dependencies

| Module | Version | Purpose | Integration Type | Status |
|--------|---------|---------|------------------|--------|
| sQuid | ^1.0.0 | Identity verification | HTTP API + Events | ✅ Required |
| Qonsent | ^1.0.0 | Access control | HTTP API + Events | ✅ Required |
| Qlock | ^1.0.0 | Encryption/decryption | MCP Tools | ✅ Required |
| Qindex | ^1.0.0 | File indexing | HTTP API + Events | ✅ Required |
| Qerberos | ^1.0.0 | Audit logging | HTTP API + Events | ✅ Required |

### Optional Dependencies

| Module | Version | Purpose | Integration Type | Status |
|--------|---------|---------|------------------|--------|
| Qwallet | ^1.0.0 | Payment processing | HTTP API + Events | 🔄 Optional |
| Qmask | ^1.0.0 | Privacy profiles | HTTP API + Events | 🔄 Optional |
| Qmarket | ^1.0.0 | Content marketplace | HTTP API + Events | 🔄 Optional |
| QNET | ^1.0.0 | Network optimization | HTTP API | 🔄 Optional |

### Infrastructure Dependencies

| Service | Version | Purpose | Status |
|---------|---------|---------|--------|
| IPFS | ^0.20.0 | Content storage | ✅ Required |
| Redis | ^7.0.0 | Caching and sessions | ✅ Required |
| Node.js | ^18.0.0 | Runtime environment | ✅ Required |

## Integration Specifications

### sQuid Integration

**Purpose**: Identity verification and ownership validation
**Integration Points**:
- File upload authorization
- File access control
- Ownership verification
- Subidentity support

**API Endpoints Used**:
```javascript
// sQuid endpoints called by Qdrive
const squidEndpoints = {
  verifyIdentity: 'POST /identity/verify',
  getIdentityInfo: 'GET /identity/{squidId}',
  validateSubidentity: 'POST /subidentity/validate',
  getReputationScore: 'GET /identity/{squidId}/reputation'
};
```

**Headers Required**:
```javascript
const requiredHeaders = {
  'x-squid-id': 'squid_abc123def456',
  'x-subid': 'sub_789xyz', // Optional
  'x-sig': 'qlock_signature',
  'x-ts': '1642248600000',
  'Authorization': 'Bearer jwt_token'
};
```

**Events Consumed**:
- `q.squid.reputation.updated.v1` - Update user reputation scores
- `q.squid.identity.suspended.v1` - Handle suspended identities

**Events Published**:
- `q.qdrive.file.created.v1` - Notify of new file uploads
- `q.qdrive.file.accessed.v1` - Track file access patterns

### Qonsent Integration

**Purpose**: Granular access control and permission management
**Integration Points**:
- File access authorization
- Sharing permission validation
- Privacy policy enforcement
- DAO-based access control

**API Endpoints Used**:
```javascript
const qonsentEndpoints = {
  checkPermission: 'POST /permissions/check',
  grantPermission: 'POST /permissions/grant',
  revokePermission: 'POST /permissions/revoke',
  listPermissions: 'GET /permissions/{resource}'
};
```

**Permission Policies**:
```javascript
const filePermissions = {
  'qdrive:file:upload': {
    conditions: ['identity_verified', 'storage_quota_available']
  },
  'qdrive:file:read': {
    conditions: ['owner_or_shared', 'not_expired']
  },
  'qdrive:file:share': {
    conditions: ['owner', 'sharing_limits_not_exceeded']
  },
  'qdrive:file:delete': {
    conditions: ['owner', 'not_shared_or_force']
  }
};
```

### Qlock Integration

**Purpose**: File encryption, decryption, and cryptographic signatures
**Integration Points**:
- File content encryption
- Metadata encryption
- Digital signatures
- Key management

**MCP Tools Used**:
```javascript
const qlockTools = {
  encrypt: 'qlock.encrypt',
  decrypt: 'qlock.decrypt',
  sign: 'qlock.sign',
  verify: 'qlock.verify'
};
```

**Encryption Configuration**:
```javascript
const encryptionConfig = {
  algorithm: 'AES-256-GCM',
  keyDerivation: 'PBKDF2',
  iterations: 100000,
  saltLength: 32,
  ivLength: 12,
  tagLength: 16
};
```

### Qindex Integration

**Purpose**: File metadata indexing and search capabilities
**Integration Points**:
- File metadata registration
- Search and discovery
- Tag-based organization
- Content categorization

**API Endpoints Used**:
```javascript
const qindexEndpoints = {
  putRecord: 'POST /records',
  getRecord: 'GET /records/{key}',
  listRecords: 'GET /records',
  deleteRecord: 'DELETE /records/{key}'
};
```

**Index Records**:
```javascript
const fileIndexRecord = {
  type: 'qdrive_file',
  key: `file:${cid}`,
  cid: fileCid,
  version: 1,
  tags: ['document', 'pdf', 'important'],
  metadata: {
    name: 'document.pdf',
    size: 1048576,
    mimeType: 'application/pdf',
    privacy: 'private',
    owner: 'squid_abc123def456'
  }
};
```

### Qerberos Integration

**Purpose**: Security monitoring and audit logging
**Integration Points**:
- File operation auditing
- Security event logging
- Risk assessment
- Anomaly detection

**API Endpoints Used**:
```javascript
const qerberosEndpoints = {
  audit: 'POST /audit',
  riskScore: 'POST /risk/score',
  reportAnomaly: 'POST /anomaly'
};
```

**Audit Events**:
```javascript
const auditEvents = [
  'file_upload',
  'file_access',
  'file_share',
  'file_delete',
  'auth_failure',
  'access_denied',
  'suspicious_activity'
];
```

## Version Compatibility

### API Version Support

| Qdrive Version | sQuid API | Qonsent API | Qlock MCP | Qindex API | Qerberos API |
|----------------|-----------|-------------|-----------|------------|--------------|
| 1.0.0 | v1 | v1 | v1 | v1 | v1 |
| 1.1.0 | v1, v2 | v1 | v1 | v1, v2 | v1 |
| 1.2.0 | v2 | v1, v2 | v1, v2 | v2 | v1, v2 |

### Breaking Changes

#### Version 1.1.0
- **sQuid**: Added support for subidentity delegation
- **Qindex**: Enhanced search capabilities with full-text indexing
- **Backward Compatibility**: Full compatibility with v1.0.0 APIs

#### Version 1.2.0
- **Qonsent**: New UCAN-based permission system
- **Qlock**: Post-quantum cryptography support
- **Qerberos**: Enhanced risk scoring algorithms
- **Backward Compatibility**: Deprecated v1 APIs, supported until v2.0.0

### Migration Paths

#### From v1.0.0 to v1.1.0
```bash
# No breaking changes, automatic upgrade
npm update @anarq/qdrive
```

#### From v1.1.0 to v1.2.0
```bash
# Update configuration for new Qonsent policies
npm update @anarq/qdrive
node scripts/migrate-permissions.js
```

## Testing Compatibility

### Contract Tests

Each integration has contract tests to ensure compatibility:

```javascript
// Example contract test for sQuid integration
describe('sQuid Integration Contract', () => {
  test('should verify identity with valid token', async () => {
    const response = await squidClient.verifyIdentity({
      squidId: 'squid_test123',
      token: 'valid_jwt_token'
    });
    
    expect(response).toMatchSchema(identityVerificationSchema);
    expect(response.verified).toBe(true);
  });
});
```

### Integration Test Matrix

| Test Scenario | sQuid | Qonsent | Qlock | Qindex | Qerberos | Status |
|---------------|-------|---------|-------|--------|----------|--------|
| File Upload | ✅ | ✅ | ✅ | ✅ | ✅ | Passing |
| File Access | ✅ | ✅ | ✅ | ✅ | ✅ | Passing |
| File Sharing | ✅ | ✅ | ❌ | ✅ | ✅ | Failing |
| File Deletion | ✅ | ✅ | ✅ | ✅ | ✅ | Passing |

### Mock Services

For standalone testing, Qdrive includes mock implementations:

```javascript
const mockServices = {
  squid: new MockSquidService(),
  qonsent: new MockQonsentService(),
  qlock: new MockQlockService(),
  qindex: new MockQindexService(),
  qerberos: new MockQerberosService()
};
```

## Deployment Configurations

### Standalone Mode
```yaml
# docker-compose.yml
services:
  qdrive:
    environment:
      - QDRIVE_MODE=standalone
      - USE_MOCK_SERVICES=true
```

### Integrated Mode
```yaml
# docker-compose.yml
services:
  qdrive:
    environment:
      - QDRIVE_MODE=integrated
      - SQUID_API_URL=http://squid:3000
      - QONSENT_API_URL=http://qonsent:3000
      - QLOCK_API_URL=http://qlock:3000
      - QINDEX_API_URL=http://qindex:3000
      - QERBEROS_API_URL=http://qerberos:3000
```

### Hybrid Mode
```yaml
# docker-compose.yml
services:
  qdrive:
    environment:
      - QDRIVE_MODE=hybrid
      - SQUID_API_URL=http://squid:3000
      - QONSENT_API_URL=http://qonsent:3000
      - USE_MOCK_QLOCK=true
      - USE_MOCK_QINDEX=true
      - USE_MOCK_QERBEROS=true
```

## Error Handling

### Service Unavailability

When dependent services are unavailable:

```javascript
const fallbackStrategies = {
  squid: 'cache_last_known_identity',
  qonsent: 'deny_by_default',
  qlock: 'store_unencrypted_with_warning',
  qindex: 'skip_indexing_with_retry',
  qerberos: 'local_audit_log_with_sync'
};
```

### Version Mismatches

When API versions are incompatible:

```javascript
const versionHandling = {
  newer_api: 'use_latest_compatible_version',
  older_api: 'use_compatibility_layer',
  unsupported_api: 'fail_with_clear_error_message'
};
```

## Performance Considerations

### Latency Requirements

| Integration | Max Latency | Timeout | Retry Policy |
|-------------|-------------|---------|--------------|
| sQuid | 100ms | 5s | 3 retries, exponential backoff |
| Qonsent | 50ms | 3s | 3 retries, exponential backoff |
| Qlock | 200ms | 10s | 2 retries, linear backoff |
| Qindex | 100ms | 5s | 3 retries, exponential backoff |
| Qerberos | 500ms | 15s | 1 retry, no backoff |

### Caching Strategies

```javascript
const cachingStrategies = {
  squid_identity: {
    ttl: 300, // 5 minutes
    strategy: 'write_through'
  },
  qonsent_permissions: {
    ttl: 60, // 1 minute
    strategy: 'write_behind'
  },
  qindex_metadata: {
    ttl: 3600, // 1 hour
    strategy: 'read_through'
  }
};
```