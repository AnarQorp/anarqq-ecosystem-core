# Qmail Audit Specifications

This document defines the audit logging requirements and specifications for the Qmail module.

## Audit Event Categories

### Message Lifecycle Events
- **MESSAGE_CREATED**: Message created and encrypted
- **MESSAGE_SENT**: Message successfully sent
- **MESSAGE_DELIVERED**: Message delivered to recipient
- **MESSAGE_READ**: Message read by recipient
- **MESSAGE_REPLIED**: Message replied to
- **MESSAGE_FORWARDED**: Message forwarded
- **MESSAGE_DELETED**: Message deleted
- **MESSAGE_EXPIRED**: Message expired due to retention policy

### Access Events
- **MESSAGE_ACCESS**: Message accessed/viewed
- **ATTACHMENT_DOWNLOAD**: Attachment downloaded
- **SEARCH_PERFORMED**: Message search performed
- **INBOX_ACCESSED**: Inbox accessed
- **RECEIPT_GENERATED**: Delivery receipt generated
- **RECEIPT_VERIFIED**: Delivery receipt verified

### Security Events
- **AUTH_SUCCESS**: Successful authentication
- **AUTH_FAILED**: Failed authentication attempt
- **AUTHZ_GRANTED**: Authorization granted
- **AUTHZ_DENIED**: Authorization denied
- **SPAM_DETECTED**: Spam message detected
- **THREAT_DETECTED**: Security threat detected
- **ENCRYPTION_UPGRADED**: Message encryption upgraded
- **KEY_ROTATED**: Encryption key rotated

### Administrative Events
- **RETENTION_POLICY_APPLIED**: Retention policy applied
- **GDPR_REQUEST_PROCESSED**: GDPR request processed
- **LEGAL_HOLD_APPLIED**: Legal hold applied
- **LEGAL_HOLD_RELEASED**: Legal hold released
- **BACKUP_CREATED**: Backup created
- **BACKUP_RESTORED**: Backup restored

### System Events
- **SERVICE_STARTED**: Qmail service started
- **SERVICE_STOPPED**: Qmail service stopped
- **HEALTH_CHECK_FAILED**: Health check failed
- **DEPENDENCY_UNAVAILABLE**: External dependency unavailable
- **PERFORMANCE_DEGRADED**: Performance degradation detected
- **ERROR_OCCURRED**: System error occurred

## Audit Event Schema

### Base Event Structure
```json
{
  "eventId": "evt_1234567890abcdef",
  "timestamp": "2024-01-15T10:30:00.123Z",
  "eventType": "MESSAGE_SENT",
  "category": "MESSAGE_LIFECYCLE",
  "severity": "INFO",
  "actor": {
    "squidId": "squid_alice_123",
    "subId": "sub_work_456",
    "ipAddress": "hash:abc123def456",
    "userAgent": "hash:def456ghi789",
    "sessionId": "sess_xyz789"
  },
  "resource": {
    "type": "MESSAGE",
    "id": "msg_1234567890abcdef",
    "path": "/api/qmail/send"
  },
  "action": {
    "operation": "SEND",
    "method": "POST",
    "outcome": "SUCCESS"
  },
  "context": {
    "recipientId": "squid_bob_456",
    "encryptionLevel": "HIGH",
    "certifiedDelivery": true,
    "messageSize": 1024,
    "attachmentCount": 2
  },
  "metadata": {
    "requestId": "req_abc123def456",
    "correlationId": "corr_xyz789abc123",
    "serviceVersion": "1.0.0",
    "nodeId": "qmail_node_01"
  },
  "compliance": {
    "gdprApplicable": true,
    "retentionPeriod": "P7Y",
    "legalHold": false,
    "dataClassification": "CONFIDENTIAL"
  }
}
```

### Message Lifecycle Event Details
```json
{
  "eventType": "MESSAGE_SENT",
  "details": {
    "messageId": "msg_1234567890abcdef",
    "senderId": "squid_alice_123",
    "recipientId": "squid_bob_456",
    "subject": "hash:subject_hash_123",
    "encryptionLevel": "HIGH",
    "priority": "NORMAL",
    "deliveryTracking": "track_abc123def456",
    "ipfsCid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "totalSize": 1048576,
    "attachmentCount": 2,
    "spamScore": 0.01,
    "riskScore": 0.05,
    "processingTime": 150.5
  }
}
```

### Security Event Details
```json
{
  "eventType": "SPAM_DETECTED",
  "details": {
    "messageId": "msg_suspicious_123",
    "senderId": "squid_suspicious_456",
    "spamScore": 0.95,
    "riskScore": 0.87,
    "detectionRules": [
      "SUSPICIOUS_LINKS",
      "BULK_SENDER",
      "REPUTATION_LOW"
    ],
    "action": "BLOCKED",
    "notificationSent": true,
    "escalated": false
  }
}
```

### Access Event Details
```json
{
  "eventType": "MESSAGE_ACCESS",
  "details": {
    "messageId": "msg_1234567890abcdef",
    "accessType": "READ",
    "decryptionSuccessful": true,
    "accessDuration": 45.2,
    "deviceInfo": {
      "type": "MOBILE",
      "os": "iOS",
      "browser": "Safari",
      "fingerprint": "hash:device_fp_123"
    },
    "location": {
      "country": "US",
      "region": "CA",
      "city": "hash:city_123"
    }
  }
}
```

## Audit Data Protection

### Data Minimization
- **PII Hashing**: All PII hashed with salt before logging
- **Content Exclusion**: Message content never logged in plaintext
- **Metadata Encryption**: Sensitive metadata encrypted in audit logs
- **Retention Limits**: Audit logs subject to retention policies

### Privacy Protection
- **IP Address Hashing**: IP addresses hashed for privacy
- **Location Anonymization**: Location data anonymized to region level
- **Device Fingerprinting**: Device info hashed and anonymized
- **User Agent Hashing**: User agents hashed to prevent tracking

### Access Control
- **Role-Based Access**: Audit log access based on roles
- **Need-to-Know**: Access limited to necessary personnel
- **Audit Trail**: All audit log access is itself audited
- **Encryption**: Audit logs encrypted at rest and in transit

## Compliance Requirements

### GDPR Compliance
- **Data Subject Rights**: Support for DSR processing
- **Right to Erasure**: Audit log anonymization on request
- **Data Portability**: Audit log export in standard format
- **Consent Tracking**: Consent changes tracked in audit logs
- **Breach Notification**: Automated breach detection and notification

### SOX Compliance
- **Financial Messages**: Enhanced audit for financial communications
- **Retention Requirements**: 7-year retention for financial records
- **Immutability**: Audit logs immutable and tamper-evident
- **Access Controls**: Strict access controls for financial audit data
- **Reporting**: Automated SOX compliance reporting

### HIPAA Compliance
- **Healthcare Messages**: Enhanced audit for healthcare communications
- **Minimum Necessary**: Audit logs contain minimum necessary information
- **Access Logging**: All access to healthcare messages logged
- **Breach Detection**: Automated detection of potential breaches
- **Risk Assessment**: Regular risk assessments of audit systems

### Industry Standards
- **ISO 27001**: Information security management compliance
- **PCI DSS**: Payment card industry compliance (when applicable)
- **NIST Framework**: Cybersecurity framework compliance
- **SOC 2**: Service organization control compliance

## Audit Log Storage

### IPFS Integration
- **Immutable Storage**: Audit logs stored immutably in IPFS
- **Content Addressing**: Each audit log has unique CID
- **Distributed Storage**: Logs replicated across multiple nodes
- **Integrity Verification**: Cryptographic integrity verification

### Retention Policies
- **Standard Retention**: 7 years for most audit events
- **Legal Hold**: Indefinite retention for legal proceedings
- **Compliance Retention**: Per regulatory requirements
- **Automatic Deletion**: Secure deletion after retention period

### Backup and Recovery
- **Geographic Distribution**: Backups across multiple regions
- **Encryption**: All backups encrypted with separate keys
- **Recovery Testing**: Regular recovery testing procedures
- **Disaster Recovery**: Comprehensive disaster recovery plan

## Monitoring and Alerting

### Real-time Monitoring
- **Security Events**: Real-time monitoring of security events
- **Anomaly Detection**: ML-based anomaly detection
- **Threshold Alerts**: Configurable threshold-based alerts
- **Trend Analysis**: Long-term trend analysis and reporting

### Alert Categories
- **Critical**: Immediate response required (security breaches)
- **High**: Response within 1 hour (authentication failures)
- **Medium**: Response within 4 hours (performance issues)
- **Low**: Response within 24 hours (informational events)

### Notification Channels
- **Email**: Email notifications for critical events
- **SMS**: SMS alerts for security incidents
- **Slack**: Team notifications for operational events
- **Webhook**: API webhooks for system integration

## Audit Analytics

### Security Analytics
- **Threat Detection**: Pattern-based threat detection
- **User Behavior**: Anomalous user behavior detection
- **Attack Patterns**: Known attack pattern recognition
- **Risk Scoring**: Dynamic risk scoring based on behavior

### Operational Analytics
- **Performance Metrics**: System performance analysis
- **Usage Patterns**: User and system usage patterns
- **Capacity Planning**: Resource usage and capacity planning
- **Cost Analysis**: Cost analysis and optimization

### Compliance Analytics
- **Compliance Scoring**: Automated compliance scoring
- **Gap Analysis**: Compliance gap identification
- **Trend Reporting**: Compliance trend reporting
- **Audit Preparation**: Automated audit preparation reports

## Integration Points

### Qerberos Integration
- **Event Publishing**: Publish audit events to Qerberos
- **Risk Assessment**: Receive risk assessments from Qerberos
- **Threat Intelligence**: Integrate threat intelligence feeds
- **Incident Response**: Coordinate incident response activities

### External SIEM Integration
- **Log Forwarding**: Forward audit logs to external SIEM
- **Standard Formats**: Support for standard log formats (CEF, LEEF)
- **Real-time Streaming**: Real-time log streaming capabilities
- **API Integration**: RESTful API for log retrieval

### Compliance Tools
- **GRC Platforms**: Integration with governance, risk, and compliance platforms
- **Audit Tools**: Integration with audit management tools
- **Reporting Tools**: Integration with compliance reporting tools
- **Legal Discovery**: Support for legal discovery processes