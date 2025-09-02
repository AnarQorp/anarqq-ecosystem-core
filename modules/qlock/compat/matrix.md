# Qlock Compatibility Matrix

This document defines the compatibility requirements and integration versions for the Qlock module with other Q ecosystem services.

## Service Dependencies

### Required Services

| Service | Version | Purpose | Fallback |
|---------|---------|---------|----------|
| sQuid | >= 1.0.0 | Identity verification | Mock service |
| Qonsent | >= 1.0.0 | Permission checking | Mock service |
| KMS/HSM | >= 1.0.0 | Key management | Mock service |
| Event Bus | >= 1.0.0 | Event publishing | In-memory |

### Optional Services

| Service | Version | Purpose | Fallback |
|---------|---------|---------|----------|
| Qerberos | >= 1.0.0 | Security monitoring | Local logging |
| Qindex | >= 1.0.0 | Metadata indexing | Skip indexing |
| IPFS | >= 0.20.0 | Content storage | Local storage |
| Redis | >= 6.0.0 | Distributed locks | In-memory |

## API Compatibility

### HTTP API Versions

| Version | Status | Supported Until | Breaking Changes |
|---------|--------|-----------------|------------------|
| v1.0 | Current | TBD | Initial release |
| v0.9 | Deprecated | 2025-06-01 | Legacy format |

### MCP Tool Versions

| Tool | Version | Schema Version | Compatibility |
|------|---------|----------------|---------------|
| qlock.encrypt | 1.0 | 1.0 | Backward compatible |
| qlock.decrypt | 1.0 | 1.0 | Backward compatible |
| qlock.sign | 1.0 | 1.0 | Backward compatible |
| qlock.verify | 1.0 | 1.0 | Backward compatible |
| qlock.lock | 1.0 | 1.0 | Backward compatible |

### Event Schema Versions

| Event Topic | Version | Schema | Compatibility |
|-------------|---------|--------|---------------|
| q.qlock.lock.acquired.v1 | 1.0 | lock.event.json | Forward compatible |
| q.qlock.lock.released.v1 | 1.0 | lock.event.json | Forward compatible |
| q.qlock.encrypted.v1 | 1.0 | encryption.event.json | Forward compatible |
| q.qlock.signed.v1 | 1.0 | signature.event.json | Forward compatible |

## Cryptographic Algorithm Support

### Encryption Algorithms

| Algorithm | Status | Quantum Resistant | Key Size | Notes |
|-----------|--------|-------------------|----------|-------|
| AES-256-GCM | Stable | No | 256 bits | Default |
| ChaCha20-Poly1305 | Stable | No | 256 bits | High performance |
| Kyber-768 | Beta | Yes | 1184 bytes | Post-quantum |
| Kyber-1024 | Planned | Yes | 1568 bytes | Future |

### Signature Algorithms

| Algorithm | Status | Quantum Resistant | Key Size | Notes |
|-----------|--------|-------------------|----------|-------|
| ECDSA-P256 | Stable | No | 256 bits | Default |
| RSA-PSS | Stable | No | 2048+ bits | Legacy support |
| Dilithium-3 | Beta | Yes | 1952 bytes | Post-quantum |
| Falcon-512 | Beta | Yes | 897 bytes | Post-quantum |

## Integration Patterns

### sQuid Integration

```typescript
// Identity verification
const identity = await squidService.verifyIdentity(squidId, signature, timestamp);
if (!identity.valid) {
  throw new AuthenticationError('Invalid identity');
}

// Permission checking via Qonsent
const permission = await qonsentService.checkPermission(squidId, 'qlock:encrypt');
if (!permission.allowed) {
  throw new AuthorizationError('Permission denied');
}
```

### Event Bus Integration

```typescript
// Publishing events
await eventService.publishEvent({
  topic: 'q.qlock.encrypted.v1',
  payload: {
    keyId: 'qlock_key_123',
    algorithm: 'AES-256-GCM',
    identityId: 'squid_user_456'
  }
});

// Consuming events
eventService.subscribe('q.qlock.*', (event) => {
  console.log('Qlock event:', event);
});
```

### KMS/HSM Integration

```typescript
// Key storage
await kmsService.storeKey(keyId, keyMaterial, {
  algorithm: 'AES-256-GCM',
  environment: 'production'
});

// HSM operations
const signature = await hsmService.performCryptoOperation(keyId, 'sign', data);
```

## Version Compatibility

### Backward Compatibility

| Component | v1.0 | v0.9 | v0.8 |
|-----------|------|------|------|
| HTTP API | ✅ | ✅ | ❌ |
| MCP Tools | ✅ | ⚠️ | ❌ |
| Events | ✅ | ✅ | ❌ |
| Schemas | ✅ | ✅ | ❌ |

**Legend:**
- ✅ Fully compatible
- ⚠️ Compatible with warnings
- ❌ Not compatible

### Forward Compatibility

| Component | v1.1 | v1.2 | v2.0 |
|-----------|------|------|------|
| HTTP API | ✅ | ✅ | ⚠️ |
| MCP Tools | ✅ | ✅ | ⚠️ |
| Events | ✅ | ✅ | ✅ |
| Schemas | ✅ | ✅ | ⚠️ |

## Environment Compatibility

### Development Environment

| Component | Requirement | Mock Available |
|-----------|-------------|----------------|
| sQuid | Optional | ✅ |
| Qonsent | Optional | ✅ |
| KMS | Optional | ✅ |
| HSM | Optional | ✅ |
| Redis | Optional | In-memory |
| IPFS | Optional | Local storage |

### Staging Environment

| Component | Requirement | Configuration |
|-----------|-------------|---------------|
| sQuid | Required | Staging instance |
| Qonsent | Required | Staging instance |
| KMS | Required | Staging keys |
| HSM | Optional | Staging HSM |
| Redis | Required | Staging cluster |
| IPFS | Required | Staging network |

### Production Environment

| Component | Requirement | Configuration |
|-----------|-------------|---------------|
| sQuid | Required | Production instance |
| Qonsent | Required | Production instance |
| KMS | Required | Production keys |
| HSM | Required | Production HSM |
| Redis | Required | Production cluster |
| IPFS | Required | Production network |

## Migration Paths

### From v0.9 to v1.0

1. **API Changes**: Update endpoint paths from `/v0.9/` to `/v1/`
2. **Schema Updates**: Update request/response schemas
3. **Event Format**: Update event payload format
4. **Configuration**: Update configuration file format

### From v1.0 to v1.1

1. **New Features**: Additional MCP tools available
2. **Enhanced Security**: Improved key rotation
3. **Performance**: Optimized algorithms
4. **Backward Compatible**: No breaking changes

## Testing Compatibility

### Unit Tests

| Test Suite | Coverage | Dependencies |
|------------|----------|--------------|
| Encryption | 95% | Mock KMS |
| Signature | 95% | Mock HSM |
| Locks | 90% | In-memory |
| Integration | 85% | All mocks |

### Integration Tests

| Test Type | Services | Environment |
|-----------|---------|-------------|
| Service Integration | All required | Staging |
| API Compatibility | HTTP + MCP | Staging |
| Event Flow | Event Bus | Staging |
| End-to-End | Full stack | Staging |

### Performance Tests

| Test Type | Target | Environment |
|-----------|--------|-------------|
| Encryption | 1000 ops/sec | Load test |
| Signing | 500 ops/sec | Load test |
| Locks | 10000 ops/sec | Load test |
| API | 2000 req/sec | Load test |

## Deployment Compatibility

### Container Platforms

| Platform | Version | Status | Notes |
|----------|---------|--------|-------|
| Docker | >= 20.0 | ✅ | Recommended |
| Kubernetes | >= 1.20 | ✅ | Helm charts available |
| Docker Compose | >= 2.0 | ✅ | Development |

### Operating Systems

| OS | Version | Status | Notes |
|----|---------|--------|-------|
| Linux | Ubuntu 20.04+ | ✅ | Primary |
| Linux | CentOS 8+ | ✅ | Supported |
| macOS | 11+ | ✅ | Development |
| Windows | 10+ | ⚠️ | Limited support |

### Node.js Versions

| Version | Status | Notes |
|---------|--------|-------|
| 18.x | ✅ | Recommended |
| 20.x | ✅ | Latest |
| 16.x | ⚠️ | Deprecated |
| 14.x | ❌ | Not supported |

## Security Compatibility

### TLS Versions

| Version | Status | Notes |
|---------|--------|-------|
| TLS 1.3 | ✅ | Recommended |
| TLS 1.2 | ✅ | Supported |
| TLS 1.1 | ❌ | Deprecated |
| TLS 1.0 | ❌ | Not supported |

### Cipher Suites

| Cipher Suite | Status | Notes |
|--------------|--------|-------|
| ECDHE-RSA-AES256-GCM-SHA384 | ✅ | Recommended |
| ECDHE-RSA-AES128-GCM-SHA256 | ✅ | Supported |
| DHE-RSA-AES256-SHA | ❌ | Deprecated |

## Monitoring Compatibility

### Metrics Formats

| Format | Status | Notes |
|--------|--------|-------|
| Prometheus | ✅ | Primary |
| StatsD | ✅ | Supported |
| JSON | ✅ | API endpoint |
| OpenTelemetry | 🚧 | Planned |

### Log Formats

| Format | Status | Notes |
|--------|--------|-------|
| JSON | ✅ | Structured |
| Plain text | ✅ | Development |
| Syslog | ✅ | System integration |