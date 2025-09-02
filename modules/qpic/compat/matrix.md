# QpiC Compatibility Matrix

This document describes the compatibility requirements and integration versions for the QpiC Media Management module.

## Module Dependencies

### Core Dependencies

| Module | Version | Required | Purpose | Integration Type |
|--------|---------|----------|---------|------------------|
| sQuid | 2.0.x | Yes | Identity verification | HTTP API |
| Qonsent | 2.0.x | Yes | Permission checking | HTTP API |
| Qlock | 2.0.x | Yes | Encryption/signatures | MCP Tools |
| Qindex | 2.0.x | Yes | Media indexing | HTTP API |
| Qerberos | 2.0.x | Yes | Audit logging | HTTP API |
| Qmask | 2.0.x | Optional | Privacy protection | HTTP API |
| Qmarket | 2.0.x | Optional | Marketplace integration | HTTP API |

### Infrastructure Dependencies

| Service | Version | Required | Purpose |
|---------|---------|----------|---------|
| MongoDB | 7.0+ | Yes | Metadata storage |
| Redis | 7.0+ | Yes | Caching and sessions |
| IPFS | 0.20+ | Yes | Content storage |
| FFmpeg | 6.0+ | Yes | Video transcoding |
| ImageMagick | 7.1+ | Yes | Image processing |
| ClamAV | 1.0+ | Optional | Virus scanning |

## API Compatibility

### HTTP API Versions

#### QpiC API v1
- **Status**: Current
- **Supported**: Yes
- **Deprecation**: None planned
- **Breaking Changes**: None

#### QpiC API v2 (Future)
- **Status**: Planned
- **Features**: Enhanced streaming, WebRTC support
- **Migration Path**: Backward compatible

### MCP Tool Versions

| Tool | Version | Status | Changes |
|------|---------|--------|---------|
| qpic.upload | 1.0 | Stable | Initial implementation |
| qpic.transcode | 1.0 | Stable | Initial implementation |
| qpic.optimize | 1.0 | Stable | Initial implementation |
| qpic.metadata | 1.0 | Stable | Initial implementation |
| qpic.license | 1.0 | Stable | Initial implementation |

## Event Schema Compatibility

### Published Events

| Event | Schema Version | Status | Backward Compatible |
|-------|----------------|--------|-------------------|
| q.qpic.media.uploaded.v1 | 1.0 | Stable | N/A |
| q.qpic.media.deleted.v1 | 1.0 | Stable | N/A |
| q.qpic.transcode.started.v1 | 1.0 | Stable | N/A |
| q.qpic.transcode.completed.v1 | 1.0 | Stable | N/A |
| q.qpic.license.created.v1 | 1.0 | Stable | N/A |

### Consumed Events

| Event | Source | Schema Version | Required |
|-------|--------|----------------|----------|
| q.squid.identity.updated.v1 | sQuid | 1.0 | No |
| q.qonsent.permission.revoked.v1 | Qonsent | 1.0 | No |
| q.qmarket.listing.created.v1 | Qmarket | 1.0 | No |

## Integration Patterns

### sQuid Integration
```yaml
integration_type: HTTP API
endpoints:
  - POST /api/v1/verify
  - GET /api/v1/identity/{id}/context
headers:
  - x-squid-id
  - x-subid
  - x-dao-id
authentication: Bearer token
timeout: 5s
retry_policy: exponential_backoff
```

### Qonsent Integration
```yaml
integration_type: HTTP API
endpoints:
  - POST /api/v1/check
  - POST /api/v1/grant
  - POST /api/v1/revoke
headers:
  - x-qonsent-token
authentication: Service token
timeout: 3s
retry_policy: exponential_backoff
```

### Qlock Integration
```yaml
integration_type: MCP Tools
tools:
  - qlock.encrypt
  - qlock.decrypt
  - qlock.sign
  - qlock.verify
authentication: MCP session
timeout: 10s
retry_policy: linear_backoff
```

### Qindex Integration
```yaml
integration_type: HTTP API
endpoints:
  - POST /api/v1/put
  - GET /api/v1/get
  - DELETE /api/v1/delete
authentication: Service token
timeout: 5s
retry_policy: exponential_backoff
```

## Version Compatibility Matrix

### QpiC 2.0.x Compatibility

| QpiC Version | sQuid | Qonsent | Qlock | Qindex | Qerberos | Qmask | Qmarket |
|--------------|-------|---------|-------|--------|----------|-------|---------|
| 2.0.0 | 2.0.x | 2.0.x | 2.0.x | 2.0.x | 2.0.x | 2.0.x | 2.0.x |
| 2.0.1 | 2.0.x | 2.0.x | 2.0.x | 2.0.x | 2.0.x | 2.0.x | 2.0.x |
| 2.1.0 | 2.0.x+ | 2.0.x+ | 2.0.x+ | 2.0.x+ | 2.0.x+ | 2.0.x+ | 2.0.x+ |

### Legacy Support

| Legacy Version | Support Status | End of Life | Migration Path |
|----------------|----------------|-------------|----------------|
| 1.x | Deprecated | 2024-12-31 | Automated migration tool |
| 0.x | Unsupported | 2024-06-30 | Manual migration required |

## Feature Compatibility

### Media Format Support

| Format | Read | Write | Transcode | Optimize | Notes |
|--------|------|-------|-----------|----------|-------|
| JPEG | ✅ | ✅ | ✅ | ✅ | Full support |
| PNG | ✅ | ✅ | ✅ | ✅ | Full support |
| WebP | ✅ | ✅ | ✅ | ✅ | Full support |
| AVIF | ✅ | ✅ | ✅ | ✅ | Requires libavif |
| HEIC | ✅ | ❌ | ✅ | ✅ | Read-only |
| MP4 | ✅ | ✅ | ✅ | ✅ | Full support |
| WebM | ✅ | ✅ | ✅ | ✅ | Full support |
| AVI | ✅ | ❌ | ✅ | ✅ | Legacy format |
| MP3 | ✅ | ✅ | ✅ | ✅ | Full support |
| FLAC | ✅ | ✅ | ✅ | ✅ | Full support |
| PDF | ✅ | ❌ | ❌ | ✅ | Preview generation |

### Transcoding Profile Compatibility

| Profile | Video Codecs | Audio Codecs | Container | Status |
|---------|--------------|--------------|-----------|--------|
| web-optimized | H.264, VP9 | AAC, Opus | MP4, WebM | Stable |
| mobile-optimized | H.264 | AAC | MP4 | Stable |
| streaming-hls | H.264, H.265 | AAC | HLS | Beta |
| streaming-dash | H.264, VP9 | AAC, Opus | DASH | Beta |

## Deployment Compatibility

### Container Platforms

| Platform | Version | Status | Notes |
|----------|---------|--------|-------|
| Docker | 20.10+ | Supported | Recommended |
| Podman | 4.0+ | Supported | Alternative to Docker |
| Kubernetes | 1.25+ | Supported | Helm charts available |
| Docker Compose | 2.0+ | Supported | Development setup |

### Operating Systems

| OS | Version | Status | Notes |
|----|---------|--------|-------|
| Ubuntu | 20.04+ | Supported | Primary development OS |
| Debian | 11+ | Supported | Production deployment |
| CentOS | 8+ | Supported | Enterprise deployment |
| Alpine | 3.16+ | Supported | Container base image |
| macOS | 12+ | Supported | Development only |
| Windows | 10+ | Limited | Development only |

### Cloud Platforms

| Platform | Status | Services Used | Notes |
|----------|--------|---------------|-------|
| AWS | Supported | ECS, S3, CloudFront | Full integration |
| Google Cloud | Supported | GKE, Cloud Storage | Full integration |
| Azure | Supported | AKS, Blob Storage | Full integration |
| DigitalOcean | Supported | Kubernetes, Spaces | Basic integration |

## Migration Guidelines

### Upgrading from 1.x to 2.x

1. **Database Migration**
   ```bash
   npm run migrate:v2
   ```

2. **Configuration Updates**
   - Update environment variables
   - Migrate transcoding profiles
   - Update API endpoints

3. **API Changes**
   - New authentication headers
   - Updated response formats
   - New error codes

4. **Testing**
   - Run compatibility tests
   - Verify integrations
   - Performance testing

### Breaking Changes

#### Version 2.0.0
- Authentication now requires sQuid integration
- Media IDs changed from numeric to string format
- Event schema updated with new fields
- Transcoding profiles restructured

#### Version 2.1.0 (Planned)
- New streaming protocols support
- Enhanced metadata extraction
- Improved privacy controls

## Support Matrix

### Support Levels

- **Full Support**: Bug fixes, security updates, new features
- **Maintenance**: Bug fixes and security updates only
- **Deprecated**: Security updates only, migration recommended
- **Unsupported**: No updates, immediate migration required

### Contact Information

- **Technical Support**: support@q-ecosystem.com
- **Integration Help**: integrations@q-ecosystem.com
- **Security Issues**: security@q-ecosystem.com