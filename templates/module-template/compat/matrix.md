# Compatibility Matrix - {{MODULE_NAME}}

This document defines the compatibility matrix for the {{MODULE_NAME}} module with other Q ecosystem modules and external dependencies.

## Q Ecosystem Module Compatibility

### Core Dependencies

| Module | Version | Compatibility | Status | Notes |
|--------|---------|---------------|--------|-------|
| sQuid | 1.0.x | ✅ Required | Active | Identity verification and subidentity management |
| Qlock | 1.0.x | ✅ Required | Active | Encryption, signatures, and time-locks |
| Qonsent | 1.0.x | ✅ Required | Active | Permission checking and policy enforcement |
| Qindex | 1.0.x | ✅ Required | Active | Resource indexing and discovery |
| Qerberos | 1.0.x | ✅ Required | Active | Security audit and anomaly detection |

### Optional Dependencies

| Module | Version | Compatibility | Status | Notes |
|--------|---------|---------------|--------|-------|
| Qmask | 1.0.x | ✅ Optional | Active | Privacy profiles and data anonymization |
| Qwallet | 1.0.x | ✅ Optional | Active | Payment processing (if module supports payments) |
| Qdrive | 1.0.x | ✅ Optional | Active | File storage integration |
| QpiC | 1.0.x | ✅ Optional | Active | Media processing integration |
| Qmarket | 1.0.x | ✅ Optional | Active | Marketplace integration |
| Qmail | 1.0.x | ✅ Optional | Active | Messaging integration |
| Qchat | 1.0.x | ✅ Optional | Active | Chat integration |
| QNET | 1.0.x | ✅ Optional | Active | Network infrastructure |
| DAO/Communities | 1.0.x | ✅ Optional | Active | Governance integration |

### Compatibility Legend

- ✅ **Compatible**: Fully compatible and tested
- ⚠️ **Partial**: Partially compatible with limitations
- ❌ **Incompatible**: Not compatible
- 🔄 **In Progress**: Compatibility work in progress
- 📋 **Planned**: Planned for future release

## API Version Compatibility

### HTTP API Versions

| API Version | Status | Supported Until | Breaking Changes | Migration Guide |
|-------------|--------|-----------------|------------------|-----------------|
| v1.0 | ✅ Current | 2025-12-31 | None | N/A |
| v0.9 | ⚠️ Deprecated | 2024-06-30 | Authentication headers | [Migration Guide v0.9→v1.0](#migration-v09-v10) |

### MCP Tool Versions

| Tool Version | Status | Supported Until | Breaking Changes | Migration Guide |
|--------------|--------|-----------------|------------------|-----------------|
| 1.0 | ✅ Current | 2025-12-31 | None | N/A |

### Event Schema Versions

| Schema Version | Status | Supported Until | Breaking Changes | Migration Guide |
|----------------|--------|-----------------|------------------|-----------------|
| v1 | ✅ Current | 2025-12-31 | None | N/A |

## External Dependencies

### Node.js Runtime

| Node.js Version | Compatibility | Status | Notes |
|-----------------|---------------|--------|-------|
| 20.x | ✅ Recommended | Active | LTS version, fully tested |
| 18.x | ✅ Supported | Active | Previous LTS, supported |
| 16.x | ⚠️ Limited | EOL | Security updates only |
| 14.x | ❌ Unsupported | EOL | Not supported |

### Package Dependencies

| Package | Version | Compatibility | Purpose | Notes |
|---------|---------|---------------|---------|-------|
| express | ^4.18.0 | ✅ Compatible | HTTP server | Stable API |
| @anarq/common-schemas | ^1.0.0 | ✅ Required | Common schemas | Q ecosystem standard |
| @anarq/common-clients | ^1.0.0 | ✅ Required | Service clients | Q ecosystem standard |
| @anarq/testing | ^1.0.0 | ✅ Required | Testing utilities | Development only |
| ajv | ^8.12.0 | ✅ Compatible | JSON Schema validation | Stable API |
| vitest | ^0.34.0 | ✅ Compatible | Testing framework | Development only |

### Infrastructure Dependencies

| Service | Version | Compatibility | Purpose | Notes |
|---------|---------|---------------|---------|-------|
| IPFS | 0.20.x+ | ✅ Compatible | Content storage | Kubo implementation |
| Redis | 7.x | ✅ Compatible | Caching and sessions | Optional |
| Docker | 20.x+ | ✅ Compatible | Containerization | For deployment |

## Integration Patterns

### Service Communication

#### HTTP API Integration
```javascript
// Standard HTTP client configuration
const serviceClient = new HttpClient({
  baseURL: process.env.SERVICE_URL,
  timeout: 5000,
  headers: {
    'x-api-version': '1.0',
    'x-squid-id': identity.squidId,
    'x-subid': identity.subId
  }
});
```

#### MCP Tool Integration
```javascript
// MCP tool usage pattern
const result = await mcpClient.callTool('service.operation', {
  squidId: identity.squidId,
  data: requestData
});
```

#### Event Integration
```javascript
// Event publishing pattern
await eventBus.publish('q.{{MODULE_NAME}}.resource.created.v1', {
  eventId: uuid(),
  timestamp: new Date().toISOString(),
  actor: identity,
  data: resourceData
});
```

### Authentication Integration

#### sQuid Identity Verification
```javascript
// Identity verification pattern
const verification = await squidClient.verifyIdentity({
  squidId: req.headers['x-squid-id'],
  subId: req.headers['x-subid'],
  signature: req.headers['x-sig'],
  timestamp: req.headers['x-ts']
});
```

#### Qonsent Permission Checking
```javascript
// Permission checking pattern
const permission = await qonsentClient.checkPermission({
  token: req.headers['x-qonsent'],
  scope: '{{MODULE_NAME}}:read',
  resource: req.path,
  context: { squidId: identity.squidId }
});
```

### Storage Integration

#### IPFS Content Storage
```javascript
// IPFS storage pattern
const cid = await ipfs.add(JSON.stringify(data));
await qindex.put({
  key: resourceKey,
  cid: cid.toString(),
  type: 'resource',
  tags: ['{{MODULE_NAME}}']
});
```

#### Qindex Resource Registration
```javascript
// Resource indexing pattern
await qindex.put({
  key: `{{MODULE_NAME}}:${resourceId}`,
  cid: contentCid,
  type: '{{MODULE_NAME}}_resource',
  metadata: { owner: identity.squidId }
});
```

## Version Migration Guides

### Migration v0.9→v1.0 {#migration-v09-v10}

#### Breaking Changes
1. **Authentication Headers**: Changed from `Authorization` to `x-squid-id`
2. **Response Format**: Standardized response format with `status`, `code`, `message`
3. **Error Codes**: New standardized error code format

#### Migration Steps

1. **Update Authentication Headers**
   ```javascript
   // Old (v0.9)
   headers: {
     'Authorization': `Bearer ${token}`
   }
   
   // New (v1.0)
   headers: {
     'x-squid-id': identity.squidId,
     'x-subid': identity.subId,
     'x-api-version': '1.0'
   }
   ```

2. **Update Response Handling**
   ```javascript
   // Old (v0.9)
   if (response.success) {
     return response.data;
   }
   
   // New (v1.0)
   if (response.status === 'ok') {
     return response.data;
   }
   ```

3. **Update Error Handling**
   ```javascript
   // Old (v0.9)
   if (error.code === 'AUTH_FAILED') {
     // Handle auth error
   }
   
   // New (v1.0)
   if (error.code === 'SQUID_IDENTITY_INVALID') {
     // Handle auth error
   }
   ```

## Testing Compatibility

### Contract Testing

```javascript
// Contract test example
describe('sQuid Integration Contract', () => {
  it('should verify identity with correct headers', async () => {
    const response = await request(app)
      .get('/api/v1/resources')
      .set('x-squid-id', validSquidId)
      .set('x-api-version', '1.0')
      .expect(200);
    
    expect(response.body.status).toBe('ok');
  });
});
```

### Integration Testing

```javascript
// Integration test example
describe('Multi-Module Integration', () => {
  it('should create resource with full ecosystem integration', async () => {
    // 1. Authenticate with sQuid
    const identity = await squidClient.verifyIdentity(testIdentity);
    
    // 2. Check permissions with Qonsent
    const permission = await qonsentClient.checkPermission({
      scope: '{{MODULE_NAME}}:write',
      context: identity
    });
    
    // 3. Create resource
    const resource = await moduleClient.createResource(resourceData);
    
    // 4. Verify indexing in Qindex
    const indexed = await qindexClient.get(resource.id);
    expect(indexed.cid).toBe(resource.cid);
    
    // 5. Verify audit in Qerberos
    const auditEvents = await qerberosClient.queryEvents({
      type: 'BUSINESS',
      ref: resource.id
    });
    expect(auditEvents).toHaveLength(1);
  });
});
```

## Compatibility Monitoring

### Automated Compatibility Checks

```javascript
// Compatibility monitoring
class CompatibilityMonitor {
  async checkServiceCompatibility() {
    const services = ['squid', 'qlock', 'qonsent', 'qindex', 'qerberos'];
    const results = {};
    
    for (const service of services) {
      try {
        const client = this.getServiceClient(service);
        const health = await client.health();
        const version = await client.version();
        
        results[service] = {
          status: 'compatible',
          version: version.version,
          apiVersion: version.apiVersion,
          lastCheck: new Date().toISOString()
        };
      } catch (error) {
        results[service] = {
          status: 'incompatible',
          error: error.message,
          lastCheck: new Date().toISOString()
        };
      }
    }
    
    return results;
  }
}
```

### Compatibility Alerts

```javascript
// Alert configuration for compatibility issues
const compatibilityAlerts = {
  'service_incompatible': {
    condition: 'service.status === "incompatible"',
    severity: 'critical',
    notification: ['ops-team', 'dev-team']
  },
  'version_mismatch': {
    condition: 'service.version !== expected_version',
    severity: 'warning',
    notification: ['dev-team']
  },
  'deprecated_api': {
    condition: 'api.deprecated === true',
    severity: 'medium',
    notification: ['dev-team']
  }
};
```

## Support and Maintenance

### Compatibility Support Policy

- **Current Version**: Full support and compatibility
- **Previous Version**: Security updates and critical bug fixes
- **Deprecated Versions**: Security updates only for 6 months
- **EOL Versions**: No support

### Upgrade Recommendations

1. **Regular Updates**: Update dependencies monthly
2. **Security Updates**: Apply security updates immediately
3. **Major Versions**: Plan major version upgrades quarterly
4. **Testing**: Test compatibility before production deployment
5. **Rollback Plan**: Always have a rollback plan for upgrades

### Getting Help

- **Documentation**: Check module documentation first
- **Compatibility Issues**: Report via GitHub issues
- **Integration Support**: Contact Q ecosystem team
- **Emergency Support**: Use emergency contact for critical issues