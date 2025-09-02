# Qonsent Observability and Audit Specifications

This document defines the observability, monitoring, and audit requirements for the Qonsent module.

## Audit Logging

### Audit Event Types

#### Permission Events
- `PERMISSION_CHECK`: Permission check performed
- `PERMISSION_GRANTED`: Permission granted to identity
- `PERMISSION_REVOKED`: Permission revoked from identity
- `PERMISSION_EXPIRED`: Permission automatically expired

#### Policy Events
- `POLICY_CREATED`: New policy created
- `POLICY_UPDATED`: Existing policy modified
- `POLICY_DELETED`: Policy removed
- `POLICY_APPLIED`: Policy applied to resource

#### Security Events
- `AUTH_SUCCESS`: Successful authentication
- `AUTH_FAILURE`: Failed authentication attempt
- `ACCESS_DENIED`: Access denied due to insufficient permissions
- `SUSPICIOUS_ACTIVITY`: Unusual access patterns detected

#### System Events
- `SERVICE_STARTED`: Qonsent service started
- `SERVICE_STOPPED`: Qonsent service stopped
- `CONFIG_CHANGED`: Configuration updated
- `ERROR_OCCURRED`: System error encountered

### Audit Log Format

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "eventType": "PERMISSION_CHECK",
  "severity": "INFO",
  "actor": {
    "identity": "did:squid:alice",
    "subidentity": "did:squid:alice:work",
    "ipAddress": "192.168.1.100",
    "userAgent": "QonsentsClient/1.0"
  },
  "resource": {
    "id": "qdrive:file:abc123",
    "type": "file",
    "owner": "did:squid:bob"
  },
  "action": {
    "type": "read",
    "result": "ALLOWED",
    "reason": "Direct permission grant",
    "policy": "policy_456"
  },
  "context": {
    "requestId": "req_789",
    "sessionId": "sess_012",
    "daoContext": "dao_345",
    "apiVersion": "v1"
  },
  "metadata": {
    "responseTime": 15,
    "cacheHit": true,
    "source": "qonsent-api"
  },
  "signature": "0x1234567890abcdef...",
  "cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
}
```

### Audit Storage

#### Immediate Storage (Hot)
- MongoDB for real-time queries and recent events
- Retention: 30 days
- Indexed for fast searching and filtering

#### Long-term Storage (Cold)
- IPFS for immutable audit trail
- Retention: 7 years (compliance requirement)
- Compressed and encrypted

#### Qerberos Integration
- Real-time streaming to Qerberos for security analysis
- Anomaly detection and threat intelligence
- Automated incident response triggers

## Metrics and Monitoring

### Service Level Indicators (SLIs)

#### Availability
- **Uptime**: Service availability percentage
- **Health Check**: Endpoint response success rate
- **Dependency Health**: External service availability

#### Latency
- **Permission Check**: p50, p95, p99 response times
- **Grant Operation**: Time to complete permission grants
- **Revoke Operation**: Time to complete permission revocations

#### Throughput
- **Requests per Second**: Total API requests
- **Permission Checks**: Permission validation rate
- **Event Publishing**: Event publication rate

#### Error Rates
- **HTTP Errors**: 4xx and 5xx response rates
- **Authentication Failures**: Failed auth attempts
- **Permission Denials**: Access denied rate

### Service Level Objectives (SLOs)

```json
{
  "availability": {
    "target": 99.9,
    "measurement": "uptime_percentage",
    "window": "30d"
  },
  "latency": {
    "permission_check_p99": {
      "target": 200,
      "unit": "ms",
      "window": "5m"
    },
    "grant_operation_p95": {
      "target": 500,
      "unit": "ms",
      "window": "5m"
    }
  },
  "error_rate": {
    "target": 0.1,
    "unit": "percentage",
    "window": "5m"
  }
}
```

### Metrics Collection

#### Application Metrics
```typescript
// Permission check metrics
permission_checks_total{result="allowed|denied", resource_type="file|listing"}
permission_check_duration_seconds{operation="check|grant|revoke"}
permission_cache_hits_total{cache_type="redis|memory"}

// Policy metrics
policies_total{scope="global|dao|resource", status="active|inactive"}
policy_evaluations_total{result="match|no_match", policy_type="ucan|simple"}

// Security metrics
auth_attempts_total{result="success|failure", method="bearer|signature"}
suspicious_activities_total{type="rate_limit|pattern_anomaly|geo_anomaly"}
```

#### System Metrics
```typescript
// Resource utilization
process_cpu_usage_percent
process_memory_usage_bytes
process_open_file_descriptors

// Database metrics
mongodb_connections_active
mongodb_operations_total{operation="find|insert|update|delete"}
mongodb_query_duration_seconds

// IPFS metrics
ipfs_pins_total{status="pinned|failed"}
ipfs_retrieval_duration_seconds
ipfs_storage_bytes_total
```

### Alerting Rules

#### Critical Alerts
- Service down for > 1 minute
- Error rate > 5% for > 2 minutes
- Permission check latency p99 > 1s for > 5 minutes
- Database connection failures

#### Warning Alerts
- Error rate > 1% for > 5 minutes
- Permission check latency p95 > 500ms for > 10 minutes
- High memory usage (> 80%)
- IPFS pinning failures

#### Security Alerts
- Authentication failure rate > 10% for > 1 minute
- Suspicious activity detected
- Unauthorized access attempts
- Policy tampering detected

## Health Checks

### Endpoint: `/health`

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "2.0.0",
  "uptime": 86400,
  "dependencies": {
    "mongodb": {
      "status": "up",
      "latency": 5,
      "lastCheck": "2024-01-15T10:29:55.000Z"
    },
    "redis": {
      "status": "up",
      "latency": 2,
      "lastCheck": "2024-01-15T10:29:55.000Z"
    },
    "squid": {
      "status": "up",
      "latency": 25,
      "lastCheck": "2024-01-15T10:29:50.000Z"
    },
    "qerberos": {
      "status": "degraded",
      "latency": 150,
      "lastCheck": "2024-01-15T10:29:50.000Z",
      "error": "High latency detected"
    },
    "ipfs": {
      "status": "up",
      "latency": 10,
      "lastCheck": "2024-01-15T10:29:55.000Z"
    }
  },
  "metrics": {
    "requestCount": 1000000,
    "errorRate": 0.05,
    "avgResponseTime": 45,
    "cacheHitRate": 0.85
  }
}
```

### Health Check Logic
1. **Healthy**: All dependencies up, error rate < 1%
2. **Degraded**: Some dependencies slow, error rate 1-5%
3. **Unhealthy**: Critical dependencies down, error rate > 5%

## Distributed Tracing

### Trace Context
All requests include distributed tracing headers:
- `x-trace-id`: Unique trace identifier
- `x-span-id`: Current span identifier
- `x-parent-span-id`: Parent span identifier

### Span Attributes
```json
{
  "service.name": "qonsent",
  "service.version": "2.0.0",
  "operation.name": "permission.check",
  "resource.id": "qdrive:file:abc123",
  "identity.id": "did:squid:alice",
  "permission.type": "read",
  "result": "allowed",
  "cache.hit": true,
  "db.query.duration": 15,
  "policy.id": "policy_456"
}
```

### Trace Sampling
- **Production**: 1% sampling rate
- **Staging**: 10% sampling rate
- **Development**: 100% sampling rate
- **Error Traces**: Always sampled

## Dashboard and Visualization

### Operational Dashboard
- Service health and availability
- Request rate and latency trends
- Error rate and types
- Dependency status

### Security Dashboard
- Authentication success/failure rates
- Permission grant/deny trends
- Suspicious activity alerts
- Policy compliance status

### Business Dashboard
- Permission usage by resource type
- Most accessed resources
- User activity patterns
- Policy effectiveness metrics

## Compliance and Reporting

### Automated Reports
- Daily security summary
- Weekly performance report
- Monthly compliance report
- Quarterly audit summary

### Compliance Requirements
- **GDPR**: Data access and processing logs
- **SOC2**: Security control evidence
- **HIPAA**: Healthcare data access logs
- **Custom**: Organization-specific requirements

### Data Retention
- **Audit Logs**: 7 years
- **Metrics**: 1 year
- **Traces**: 30 days
- **Health Checks**: 90 days