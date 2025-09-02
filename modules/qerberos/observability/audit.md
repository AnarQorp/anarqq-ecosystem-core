# Qerberos Audit Specifications

This document defines the audit logging specifications and requirements for the Qerberos security and audit module.

## Audit Event Types

### System Events

#### Authentication Events
- **Type**: `authentication`
- **Subtypes**: `login`, `logout`, `token_refresh`, `mfa_challenge`
- **Required Fields**: `actor`, `method`, `result`, `ip_address`, `user_agent`
- **Retention**: 2 years

#### Authorization Events
- **Type**: `authorization`
- **Subtypes**: `permission_check`, `access_granted`, `access_denied`
- **Required Fields**: `actor`, `resource`, `permission`, `result`, `policy`
- **Retention**: 2 years

#### Configuration Events
- **Type**: `configuration`
- **Subtypes**: `policy_change`, `setting_update`, `key_rotation`
- **Required Fields**: `actor`, `component`, `old_value`, `new_value`
- **Retention**: 7 years

### Security Events

#### Anomaly Detection Events
- **Type**: `anomaly_detection`
- **Subtypes**: `behavioral_anomaly`, `statistical_anomaly`, `pattern_anomaly`
- **Required Fields**: `model`, `confidence`, `severity`, `affected_identity`
- **Retention**: 5 years

#### Risk Assessment Events
- **Type**: `risk_assessment`
- **Subtypes**: `score_calculated`, `threshold_exceeded`, `profile_updated`
- **Required Fields**: `identity`, `score`, `factors`, `model_version`
- **Retention**: 3 years

#### Security Alert Events
- **Type**: `security_alert`
- **Subtypes**: `alert_created`, `alert_updated`, `alert_resolved`
- **Required Fields**: `alert_id`, `severity`, `type`, `status`, `assignee`
- **Retention**: 5 years

### Data Events

#### Data Access Events
- **Type**: `data_access`
- **Subtypes**: `read`, `query`, `export`
- **Required Fields**: `actor`, `resource`, `operation`, `result`, `data_classification`
- **Retention**: 7 years

#### Data Modification Events
- **Type**: `data_modification`
- **Subtypes**: `create`, `update`, `delete`, `archive`
- **Required Fields**: `actor`, `resource`, `operation`, `before_state`, `after_state`
- **Retention**: 7 years

#### Data Transfer Events
- **Type**: `data_transfer`
- **Subtypes**: `export`, `import`, `sync`, `backup`
- **Required Fields**: `actor`, `source`, `destination`, `data_type`, `volume`
- **Retention**: 7 years

### Compliance Events

#### GDPR Events
- **Type**: `gdpr_compliance`
- **Subtypes**: `consent_given`, `consent_withdrawn`, `data_subject_request`, `data_deletion`
- **Required Fields**: `data_subject`, `legal_basis`, `processing_purpose`, `action`
- **Retention**: 7 years

#### SOC2 Events
- **Type**: `soc2_compliance`
- **Subtypes**: `control_test`, `exception_noted`, `remediation_completed`
- **Required Fields**: `control_id`, `test_result`, `evidence`, `auditor`
- **Retention**: 7 years

## Audit Event Schema

### Base Event Structure

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-02-08T15:30:00.000Z",
  "type": "authentication",
  "subtype": "login",
  "actor": {
    "squidId": "did:squid:user123",
    "subId": "work",
    "daoId": "dao:enterprise:acme"
  },
  "layer": "qerberos",
  "verdict": "ALLOW",
  "severity": "info",
  "details": {
    "method": "password",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "session_id": "sess_123456"
  },
  "context": {
    "request_id": "req_789012",
    "correlation_id": "corr_345678",
    "trace_id": "trace_901234"
  },
  "metadata": {
    "source": "qerberos-auth-service",
    "version": "1.0.0",
    "environment": "production"
  },
  "signature": "0x1234567890abcdef...",
  "ipfs_cid": "QmAuditEventCid123456789"
}
```

### Required Fields

All audit events must include:

1. **id**: Unique event identifier (UUID v4)
2. **timestamp**: Event timestamp in ISO 8601 format
3. **type**: Event type from predefined list
4. **actor**: Identity performing the action
5. **layer**: Service or component generating the event
6. **verdict**: Operation result (ALLOW, DENY, WARN)
7. **signature**: Cryptographic signature for integrity

### Optional Fields

Events may include:

1. **subtype**: More specific event classification
2. **severity**: Event severity (debug, info, warn, error, critical)
3. **details**: Event-specific additional information
4. **context**: Request context and correlation IDs
5. **metadata**: System metadata and versioning
6. **ipfs_cid**: IPFS content identifier for immutable storage

## Audit Trail Requirements

### Immutability

- All audit events are immutable once created
- Events are cryptographically signed using Ed25519
- Events are stored in IPFS for tamper-proof persistence
- Any modification attempts are logged as separate events

### Integrity

- Each event includes a cryptographic signature
- Event chains are linked using hash pointers
- Periodic integrity checks verify event authenticity
- Corrupted events trigger security alerts

### Completeness

- All security-relevant operations are audited
- Failed operations are logged with error details
- System events (startup, shutdown, errors) are logged
- Audit system health is continuously monitored

### Availability

- Audit logs are replicated across multiple regions
- 99.99% availability SLA for audit log access
- Automated failover for audit log ingestion
- Real-time monitoring of audit system health

## Audit Log Storage

### IPFS Storage

```
QmAuditRoot/
├── 2024/
│   ├── 02/
│   │   ├── 08/
│   │   │   ├── authentication/
│   │   │   │   ├── event-{uuid}.json
│   │   │   │   └── event-{uuid}.json.sig
│   │   │   ├── authorization/
│   │   │   ├── security_alert/
│   │   │   └── ...
│   │   └── ...
│   └── ...
└── indexes/
    ├── by-actor/
    ├── by-type/
    ├── by-severity/
    └── by-verdict/
```

### Indexing Strategy

1. **Temporal Index**: Events indexed by timestamp
2. **Actor Index**: Events indexed by actor identity
3. **Type Index**: Events indexed by event type
4. **Severity Index**: Events indexed by severity level
5. **Verdict Index**: Events indexed by operation result

### Retention Policies

| Event Type | Retention Period | Archive After | Delete After |
|------------|------------------|---------------|--------------|
| Authentication | 2 years | 1 year | 2 years |
| Authorization | 2 years | 1 year | 2 years |
| Configuration | 7 years | 2 years | 7 years |
| Security Events | 5 years | 2 years | 5 years |
| Data Events | 7 years | 2 years | 7 years |
| Compliance Events | 7 years | 3 years | 7 years |

## Audit Query Interface

### Query API

```http
GET /audit/search?type=authentication&start=2024-02-01&end=2024-02-08
GET /audit/search?actor=did:squid:user123&severity=error
GET /audit/search?verdict=DENY&limit=100&offset=0
```

### Query Parameters

- **type**: Filter by event type
- **subtype**: Filter by event subtype
- **actor**: Filter by actor identity
- **layer**: Filter by service layer
- **verdict**: Filter by operation result
- **severity**: Filter by severity level
- **start**: Start timestamp (ISO 8601)
- **end**: End timestamp (ISO 8601)
- **limit**: Maximum results (default: 100, max: 1000)
- **offset**: Result offset for pagination

### Response Format

```json
{
  "status": "ok",
  "code": "SUCCESS",
  "message": "Audit events retrieved successfully",
  "data": {
    "events": [...],
    "totalCount": 1500,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  },
  "timestamp": "2024-02-08T15:30:00.000Z"
}
```

## Compliance Reporting

### GDPR Compliance

#### Data Subject Rights
- **Right of Access**: Provide all audit events for a data subject
- **Right to Rectification**: Log corrections to personal data
- **Right to Erasure**: Cryptographic deletion of personal data
- **Right to Portability**: Export audit data in machine-readable format

#### Processing Records
- **Article 30 Records**: Automated generation of processing records
- **Legal Basis**: Track legal basis for each processing activity
- **Data Categories**: Classify and track personal data categories
- **Retention Periods**: Enforce retention periods per data category

### SOC2 Compliance

#### Security Controls
- **Access Controls**: Log all access control decisions
- **Change Management**: Audit all system changes
- **Incident Response**: Track security incident handling
- **Monitoring**: Continuous monitoring and alerting

#### Availability Controls
- **System Monitoring**: Track system availability and performance
- **Backup Procedures**: Audit backup and recovery operations
- **Capacity Management**: Monitor resource utilization
- **Disaster Recovery**: Test and document recovery procedures

### Custom Compliance

#### Configurable Rules
- **Custom Event Types**: Define organization-specific event types
- **Custom Retention**: Set custom retention periods
- **Custom Reports**: Generate custom compliance reports
- **Custom Alerts**: Configure custom compliance alerts

## Audit System Monitoring

### Health Metrics

- **Event Ingestion Rate**: Events per second
- **Storage Utilization**: IPFS storage usage
- **Query Performance**: Average query response time
- **Replication Health**: Cross-region replication status
- **Integrity Violations**: Failed integrity checks

### Alerting

#### Critical Alerts
- **Audit System Down**: Immediate notification
- **Integrity Violation**: Tampered audit events detected
- **Storage Full**: Audit storage capacity exceeded
- **Replication Failure**: Cross-region replication failed

#### Warning Alerts
- **High Ingestion Rate**: Unusual event volume
- **Slow Queries**: Query performance degraded
- **Storage Warning**: Storage capacity at 80%
- **Retention Violation**: Events not deleted per policy

### Performance Optimization

#### Caching Strategy
- **Hot Data**: Recent events cached in Redis
- **Query Cache**: Frequent queries cached
- **Index Cache**: Index data cached for fast access
- **Result Cache**: Query results cached temporarily

#### Batch Processing
- **Event Batching**: Process events in batches
- **Index Updates**: Update indexes in batches
- **Cleanup Operations**: Batch cleanup of expired events
- **Report Generation**: Generate reports in batches

## Security Considerations

### Access Control

- **Identity Verification**: All access requires sQuid identity
- **Permission Checking**: Fine-grained permissions via Qonsent
- **Audit Trail**: All audit access is itself audited
- **Encryption**: Sensitive audit data is encrypted

### Threat Protection

- **Injection Attacks**: Input validation and parameterized queries
- **Privilege Escalation**: Strict permission enforcement
- **Data Exfiltration**: Rate limiting and access monitoring
- **Tampering**: Cryptographic signatures and integrity checks

### Incident Response

- **Detection**: Automated detection of audit anomalies
- **Containment**: Immediate isolation of compromised systems
- **Investigation**: Forensic analysis of audit trails
- **Recovery**: Restore audit system integrity
- **Lessons Learned**: Update procedures based on incidents