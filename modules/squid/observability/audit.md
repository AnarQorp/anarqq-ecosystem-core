# sQuid Audit Specifications

This document defines the audit logging requirements and specifications for the sQuid identity module.

## Audit Events

All sQuid operations generate audit events that are logged immutably for security and compliance purposes.

### Event Categories

#### Identity Operations
- `IDENTITY_CREATED` - New root identity created
- `IDENTITY_UPDATED` - Identity metadata updated
- `IDENTITY_DELETED` - Identity marked as deleted
- `IDENTITY_ACCESSED` - Identity information accessed

#### Subidentity Operations
- `SUBIDENTITY_CREATED` - New subidentity created
- `SUBIDENTITY_UPDATED` - Subidentity metadata updated
- `SUBIDENTITY_DELETED` - Subidentity marked as deleted

#### Verification Operations
- `VERIFICATION_SUBMITTED` - KYC verification submitted
- `VERIFICATION_APPROVED` - KYC verification approved
- `VERIFICATION_REJECTED` - KYC verification rejected

#### Reputation Operations
- `REPUTATION_UPDATED` - Reputation score changed
- `REPUTATION_QUERIED` - Reputation information accessed

#### Authentication Operations
- `AUTH_SUCCESS` - Successful authentication
- `AUTH_FAILURE` - Failed authentication attempt
- `AUTH_EXPIRED` - Expired authentication token used

#### Security Events
- `RATE_LIMIT_EXCEEDED` - Rate limit violation
- `SUSPICIOUS_ACTIVITY` - Anomalous behavior detected
- `PERMISSION_DENIED` - Unauthorized access attempt

## Audit Log Format

Each audit event follows a standardized format:

```json
{
  "eventId": "uuid",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "module": "squid",
  "version": "1.0.0",
  "eventType": "IDENTITY_CREATED",
  "severity": "INFO|WARN|ERROR|CRITICAL",
  "actor": {
    "identityId": "uuid",
    "subidentityId": "uuid",
    "sessionId": "uuid",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "deviceFingerprint": "hash"
  },
  "target": {
    "identityId": "uuid",
    "resourceType": "identity|subidentity|reputation",
    "resourceId": "uuid"
  },
  "operation": {
    "action": "create|read|update|delete",
    "method": "POST|GET|PUT|DELETE",
    "endpoint": "/identity",
    "parameters": {},
    "result": "success|failure",
    "statusCode": 201,
    "duration": 150
  },
  "context": {
    "requestId": "uuid",
    "correlationId": "uuid",
    "traceId": "uuid",
    "parentSpanId": "uuid"
  },
  "data": {
    "before": {},
    "after": {},
    "changes": {},
    "metadata": {}
  },
  "compliance": {
    "gdpr": {
      "lawfulBasis": "consent|contract|legal_obligation",
      "dataSubject": "uuid",
      "processingPurpose": "identity_management"
    },
    "retention": {
      "category": "audit_log",
      "retentionPeriod": "P7Y",
      "deleteAfter": "2031-01-01T00:00:00.000Z"
    }
  },
  "security": {
    "classification": "internal|confidential|restricted",
    "encryption": "AES-256-GCM",
    "integrity": "SHA-256",
    "signature": "digital_signature"
  }
}
```

## Audit Storage

### Immutable Storage
- All audit logs are stored immutably in IPFS
- Each log entry receives a unique CID (Content Identifier)
- Log tampering is cryptographically detectable

### Retention Policies
- **Audit Logs**: 7 years retention (compliance requirement)
- **Security Events**: 10 years retention
- **Access Logs**: 2 years retention
- **Debug Logs**: 90 days retention

### Encryption
- All audit logs are encrypted at rest using AES-256-GCM
- Encryption keys are managed through Qlock integration
- Key rotation occurs monthly for active logs

## Compliance Integration

### GDPR Compliance
- Data subject identification in all relevant logs
- Lawful basis tracking for data processing
- Right to erasure support (with audit trail preservation)
- Data portability support for audit data

### SOC2 Compliance
- Comprehensive access logging
- Change management tracking
- Security incident documentation
- Regular audit log reviews

### Industry Standards
- ISO 27001 audit trail requirements
- NIST Cybersecurity Framework logging
- PCI DSS audit requirements (where applicable)

## Monitoring and Alerting

### Real-time Monitoring
- Failed authentication attempts (>5 in 5 minutes)
- Privilege escalation attempts
- Unusual access patterns
- Data export activities

### Alert Thresholds
- **Critical**: Security breaches, data exfiltration
- **High**: Multiple failed authentications, permission violations
- **Medium**: Rate limit violations, unusual activity patterns
- **Low**: Configuration changes, routine access

### Integration Points
- **Qerberos**: Security event correlation and analysis
- **SIEM Systems**: Log forwarding and analysis
- **Incident Response**: Automated ticket creation
- **Compliance Tools**: Regulatory reporting

## Audit Query Interface

### Query Capabilities
- Time-based queries (date ranges)
- Actor-based queries (specific identities)
- Event type filtering
- Severity level filtering
- Full-text search in log data

### API Endpoints
```
GET /audit/events?from=2024-01-01&to=2024-01-31
GET /audit/events/identity/{identityId}
GET /audit/events/type/{eventType}
GET /audit/search?q=query&limit=100
```

### Access Controls
- Audit log access requires special permissions
- Read-only access for most users
- Administrative access for compliance officers
- Automated access for monitoring systems

## Performance Considerations

### Log Volume Management
- Expected volume: 10,000-100,000 events per day
- Batch processing for high-volume periods
- Compression for long-term storage
- Archival to cold storage after 1 year

### Query Performance
- Indexed fields: timestamp, eventType, actor.identityId
- Materialized views for common queries
- Caching for frequently accessed data
- Pagination for large result sets

## Disaster Recovery

### Backup Strategy
- Real-time replication to secondary storage
- Daily backups to geographically distributed locations
- Weekly backup integrity verification
- Monthly disaster recovery testing

### Recovery Procedures
- Point-in-time recovery capabilities
- Automated failover to backup systems
- Data consistency verification
- Recovery time objective: 4 hours
- Recovery point objective: 15 minutes