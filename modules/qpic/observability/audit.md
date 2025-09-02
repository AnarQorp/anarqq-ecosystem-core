# QpiC Audit and Observability

This document describes the audit logging and observability requirements for the QpiC Media Management module.

## Audit Logging

### Audit Events

All QpiC operations generate audit events that are sent to Qerberos for immutable logging:

#### Media Operations
```json
{
  "type": "MEDIA_UPLOADED",
  "ref": "media_123456",
  "actor": {
    "squidId": "user_abc123",
    "subId": "sub_def456",
    "daoId": "dao_ghi789"
  },
  "layer": "qpic",
  "verdict": "ALLOW",
  "details": {
    "filename": "sunset.jpg",
    "size": 2048576,
    "format": "image/jpeg",
    "privacy_applied": true,
    "virus_scan_result": "clean"
  },
  "cid": "QmXoYpizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Access Operations
```json
{
  "type": "MEDIA_ACCESSED",
  "ref": "media_123456",
  "actor": {
    "squidId": "user_xyz789"
  },
  "layer": "qpic",
  "verdict": "ALLOW",
  "details": {
    "access_type": "download",
    "permission_source": "qonsent_grant_abc123",
    "client_ip": "192.168.1.100",
    "user_agent": "Mozilla/5.0..."
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

#### Transcoding Operations
```json
{
  "type": "TRANSCODE_STARTED",
  "ref": "job_789012",
  "actor": {
    "squidId": "user_abc123"
  },
  "layer": "qpic",
  "verdict": "ALLOW",
  "details": {
    "media_id": "media_123456",
    "profiles": ["web-optimized", "mobile-optimized"],
    "estimated_time": 300,
    "worker_id": "worker_001"
  },
  "timestamp": "2024-01-15T10:40:00Z"
}
```

#### License Operations
```json
{
  "type": "LICENSE_CREATED",
  "ref": "license_345678",
  "actor": {
    "squidId": "user_abc123"
  },
  "layer": "qpic",
  "verdict": "ALLOW",
  "details": {
    "media_id": "media_123456",
    "license_type": "non-exclusive",
    "licensee": "user_def456",
    "price": {
      "amount": 50,
      "currency": "USD"
    },
    "territory": "worldwide",
    "duration": "1 year"
  },
  "timestamp": "2024-01-15T10:45:00Z"
}
```

### Audit Event Types

#### Media Management
- `MEDIA_UPLOADED` - Media file uploaded
- `MEDIA_ACCESSED` - Media file accessed/downloaded
- `MEDIA_UPDATED` - Media metadata updated
- `MEDIA_DELETED` - Media file deleted
- `METADATA_EXTRACTED` - Metadata extraction completed
- `PRIVACY_APPLIED` - Privacy profile applied

#### Processing Operations
- `TRANSCODE_STARTED` - Transcoding job started
- `TRANSCODE_COMPLETED` - Transcoding job completed
- `TRANSCODE_FAILED` - Transcoding job failed
- `OPTIMIZATION_APPLIED` - Media optimization completed
- `THUMBNAIL_GENERATED` - Thumbnail generation completed

#### License Management
- `LICENSE_CREATED` - Media license created
- `LICENSE_TRANSFERRED` - License ownership transferred
- `LICENSE_REVOKED` - License revoked
- `LICENSE_EXPIRED` - License expired
- `USAGE_TRACKED` - License usage tracked

#### Security Events
- `VIRUS_DETECTED` - Malware detected in upload
- `SUSPICIOUS_ACCESS` - Unusual access pattern detected
- `PERMISSION_DENIED` - Access denied by Qonsent
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `AUTHENTICATION_FAILED` - Authentication failure

## Metrics and Monitoring

### Service Level Indicators (SLIs)

#### Availability
- **Uptime**: Service availability percentage
- **Error Rate**: Percentage of failed requests
- **Response Time**: P50, P95, P99 response times

#### Performance
- **Upload Speed**: Average upload throughput
- **Download Speed**: Average download throughput
- **Transcoding Time**: Average transcoding duration
- **Cache Hit Rate**: Percentage of cache hits

#### Business Metrics
- **Media Files**: Total number of media files
- **Storage Usage**: Total storage consumed
- **Active Users**: Number of active users
- **License Revenue**: Revenue from media licenses

### Service Level Objectives (SLOs)

```yaml
slos:
  availability:
    target: 99.9%
    measurement_window: 30d
    error_budget: 0.1%
  
  latency:
    upload_p95: 5s
    download_p95: 2s
    api_p99: 200ms
    measurement_window: 7d
  
  throughput:
    uploads_per_second: 100
    downloads_per_second: 1000
    transcoding_jobs_per_hour: 500
```

### Alerting Rules

#### Critical Alerts
- Service down for > 1 minute
- Error rate > 5% for > 5 minutes
- P99 latency > 1s for > 10 minutes
- Storage usage > 90%

#### Warning Alerts
- Error rate > 1% for > 15 minutes
- P95 latency > 500ms for > 15 minutes
- Cache hit rate < 80%
- Transcoding queue depth > 100

### Dashboards

#### Operational Dashboard
- Service health overview
- Request rate and error rate
- Response time percentiles
- Active transcoding jobs
- Storage usage trends

#### Business Dashboard
- Media upload trends
- User activity metrics
- License revenue tracking
- Popular content analytics
- Geographic usage patterns

## Distributed Tracing

### Trace Context
All requests include distributed tracing context:

```
x-trace-id: 550e8400-e29b-41d4-a716-446655440000
x-span-id: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
x-parent-span-id: 6ba7b811-9dad-11d1-80b4-00c04fd430c8
```

### Span Attributes
- `service.name`: qpic
- `service.version`: 2.0.0
- `operation.name`: media.upload, media.transcode, etc.
- `user.squid_id`: User identity
- `media.id`: Media identifier
- `media.format`: Media format
- `media.size`: File size

### Trace Sampling
- 100% sampling for errors
- 10% sampling for successful operations
- 100% sampling for operations > 5s duration

## Log Aggregation

### Log Levels
- **ERROR**: Service errors, failed operations
- **WARN**: Performance degradation, rate limits
- **INFO**: Normal operations, business events
- **DEBUG**: Detailed debugging information

### Log Format
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "service": "qpic",
  "version": "2.0.0",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "span_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "message": "Media uploaded successfully",
  "fields": {
    "media_id": "media_123456",
    "user_id": "user_abc123",
    "file_size": 2048576,
    "processing_time": 1.5
  }
}
```

### Log Retention
- **ERROR/WARN**: 1 year
- **INFO**: 6 months
- **DEBUG**: 30 days

## Compliance Reporting

### GDPR Compliance
- Data processing activity logs
- Consent tracking and withdrawal
- Data subject access request logs
- Right to erasure execution logs

### SOC 2 Compliance
- Access control audit logs
- Security incident logs
- Change management logs
- Backup and recovery logs

### Custom Reports
- Media usage reports
- License compliance reports
- Security assessment reports
- Performance trend reports