# Qdrive Audit Specifications

This document defines the audit logging requirements and specifications for the Qdrive file storage module.

## Audit Event Categories

### File Operations

All file operations are audited with the following event types:

#### FILE_UPLOAD
**Description**: File uploaded to Qdrive
**Trigger**: Successful file upload completion
**Data Collected**:
```json
{
  "eventType": "FILE_UPLOAD",
  "timestamp": "2024-01-15T10:30:00Z",
  "actor": {
    "squidId": "squid_abc123def456",
    "subId": "sub_789xyz",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  },
  "resource": {
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "name": "document.pdf",
    "size": 1048576,
    "mimeType": "application/pdf",
    "encrypted": true,
    "privacy": "private"
  },
  "context": {
    "uploadSource": "web",
    "sessionId": "sess_xyz789",
    "requestId": "req_abc123"
  },
  "outcome": "SUCCESS",
  "riskScore": 0.1
}
```

#### FILE_ACCESS
**Description**: File accessed or downloaded
**Trigger**: File retrieval request
**Data Collected**:
```json
{
  "eventType": "FILE_ACCESS",
  "timestamp": "2024-01-15T10:35:00Z",
  "actor": {
    "squidId": "squid_def456ghi789",
    "ipAddress": "192.168.1.101",
    "userAgent": "curl/7.68.0"
  },
  "resource": {
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "owner": "squid_abc123def456",
    "accessType": "download",
    "privacy": "private"
  },
  "authorization": {
    "method": "share_link",
    "shareId": "share_xyz789abc123",
    "permissions": ["read", "download"]
  },
  "outcome": "SUCCESS",
  "riskScore": 0.2
}
```

#### FILE_SHARE
**Description**: File shared with other users
**Trigger**: Share link creation
**Data Collected**:
```json
{
  "eventType": "FILE_SHARE",
  "timestamp": "2024-01-15T10:40:00Z",
  "actor": {
    "squidId": "squid_abc123def456",
    "ipAddress": "192.168.1.100"
  },
  "resource": {
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "shareId": "share_xyz789abc123"
  },
  "sharing": {
    "recipients": ["squid_def456ghi789", "squid_ghi789jkl012"],
    "permissions": ["read", "download"],
    "expiresAt": "2024-02-15T10:40:00Z",
    "passwordProtected": false
  },
  "outcome": "SUCCESS",
  "riskScore": 0.3
}
```

#### FILE_DELETE
**Description**: File deleted from Qdrive
**Trigger**: File deletion request or retention policy
**Data Collected**:
```json
{
  "eventType": "FILE_DELETE",
  "timestamp": "2024-01-15T10:45:00Z",
  "actor": {
    "squidId": "squid_abc123def456",
    "ipAddress": "192.168.1.100"
  },
  "resource": {
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "name": "document.pdf",
    "size": 1048576
  },
  "deletion": {
    "reason": "user_request",
    "retentionPolicy": "delete",
    "forceDelete": false,
    "sharesRevoked": 2
  },
  "outcome": "SUCCESS",
  "riskScore": 0.1
}
```

### Security Events

#### AUTH_FAILURE
**Description**: Authentication failure
**Trigger**: Invalid credentials or expired tokens
**Data Collected**:
```json
{
  "eventType": "AUTH_FAILURE",
  "timestamp": "2024-01-15T10:50:00Z",
  "actor": {
    "squidId": "squid_invalid123",
    "ipAddress": "192.168.1.102",
    "userAgent": "curl/7.68.0"
  },
  "authentication": {
    "method": "bearer_token",
    "failureReason": "token_expired",
    "attemptCount": 3
  },
  "outcome": "FAILURE",
  "riskScore": 0.7
}
```

#### ACCESS_DENIED
**Description**: Access denied due to insufficient permissions
**Trigger**: Qonsent permission check failure
**Data Collected**:
```json
{
  "eventType": "ACCESS_DENIED",
  "timestamp": "2024-01-15T10:55:00Z",
  "actor": {
    "squidId": "squid_def456ghi789",
    "ipAddress": "192.168.1.103"
  },
  "resource": {
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "owner": "squid_abc123def456",
    "privacy": "private"
  },
  "authorization": {
    "requiredPermission": "read",
    "denialReason": "not_shared",
    "policyId": "policy_private_files"
  },
  "outcome": "DENIED",
  "riskScore": 0.5
}
```

#### SUSPICIOUS_ACTIVITY
**Description**: Suspicious activity detected
**Trigger**: Anomaly detection algorithms
**Data Collected**:
```json
{
  "eventType": "SUSPICIOUS_ACTIVITY",
  "timestamp": "2024-01-15T11:00:00Z",
  "actor": {
    "squidId": "squid_suspicious123",
    "ipAddress": "192.168.1.104"
  },
  "activity": {
    "type": "rapid_file_access",
    "description": "100 files accessed in 60 seconds",
    "pattern": "automated_scraping",
    "confidence": 0.85
  },
  "context": {
    "timeWindow": "60s",
    "fileCount": 100,
    "uniqueOwners": 50
  },
  "outcome": "FLAGGED",
  "riskScore": 0.9
}
```

### System Events

#### RETENTION_APPLIED
**Description**: Retention policy applied to files
**Trigger**: Scheduled retention policy execution
**Data Collected**:
```json
{
  "eventType": "RETENTION_APPLIED",
  "timestamp": "2024-01-15T11:05:00Z",
  "actor": {
    "squidId": "system",
    "component": "retention_service"
  },
  "retention": {
    "policyId": "policy_365_days",
    "filesProcessed": 1500,
    "filesDeleted": 250,
    "filesArchived": 100,
    "filesAnonymized": 50,
    "totalSizeFreed": 5368709120
  },
  "outcome": "SUCCESS",
  "riskScore": 0.0
}
```

## Audit Data Integration

### Qerberos Integration

All audit events are sent to Qerberos for centralized security monitoring:

```javascript
// Audit event structure for Qerberos
const auditEvent = {
  type: 'qdrive_audit',
  ref: cid || 'system',
  actor: {
    squidId: actor.squidId,
    subId: actor.subId,
    ipAddress: actor.ipAddress
  },
  layer: 'storage',
  verdict: outcome, // 'ALLOW', 'DENY', 'WARN'
  details: {
    eventType: 'FILE_UPLOAD',
    resource: resourceData,
    context: contextData,
    riskScore: calculatedRiskScore
  },
  cid: eventCid, // CID of the audit event itself
  timestamp: new Date().toISOString()
};

// Send to Qerberos
await qerberos.audit(auditEvent);
```

### Risk Scoring

Each audit event includes a risk score calculated based on:

**Risk Factors**:
- **Actor reputation**: Historical behavior patterns
- **Resource sensitivity**: File privacy level and content type
- **Access patterns**: Frequency and timing of operations
- **Geographic anomalies**: Unusual location-based access
- **Technical indicators**: User agent, IP reputation, etc.

**Risk Score Calculation**:
```javascript
const calculateRiskScore = (event) => {
  let score = 0.0;
  
  // Actor factors (0.0 - 0.4)
  score += getActorRiskScore(event.actor);
  
  // Resource factors (0.0 - 0.3)
  score += getResourceRiskScore(event.resource);
  
  // Behavioral factors (0.0 - 0.3)
  score += getBehavioralRiskScore(event.context);
  
  // Cap at 1.0
  return Math.min(score, 1.0);
};
```

**Risk Thresholds**:
- **0.0 - 0.3**: Low risk (normal operation)
- **0.3 - 0.6**: Medium risk (monitor closely)
- **0.6 - 0.8**: High risk (alert security team)
- **0.8 - 1.0**: Critical risk (immediate response)

## Compliance Requirements

### GDPR Compliance

**Data Subject Rights**:
- **Right to Access**: Users can request all audit logs related to their files
- **Right to Rectification**: Incorrect audit data can be corrected
- **Right to Erasure**: Audit logs are deleted when files are permanently deleted
- **Right to Portability**: Audit logs can be exported in structured format

**Data Minimization**:
- Only necessary data is logged for security and compliance
- Personal data in logs is minimized and pseudonymized where possible
- Automatic deletion of audit logs after retention period

**Consent Management**:
- Users consent to audit logging as part of service terms
- Granular consent for different types of audit data
- Easy consent withdrawal with impact explanation

### SOC 2 Compliance

**Security Controls**:
- **CC6.1**: Logical access controls implemented and monitored
- **CC6.2**: Transmission and disposal of confidential information protected
- **CC6.3**: Access to system resources monitored and logged
- **CC7.1**: System boundaries defined and monitored

**Audit Requirements**:
- Immutable audit logs stored in tamper-evident format
- Regular audit log reviews and analysis
- Automated alerting for security events
- Annual third-party audit of logging controls

### Data Retention

**Audit Log Retention Periods**:
- **Security events**: 7 years
- **Access logs**: 2 years
- **System events**: 1 year
- **Debug logs**: 30 days

**Retention Implementation**:
```javascript
const retentionPolicies = {
  security_events: {
    period: '7y',
    action: 'archive',
    location: 'cold_storage'
  },
  access_logs: {
    period: '2y',
    action: 'delete',
    location: null
  },
  system_events: {
    period: '1y',
    action: 'delete',
    location: null
  },
  debug_logs: {
    period: '30d',
    action: 'delete',
    location: null
  }
};
```

## Monitoring and Alerting

### Real-time Monitoring

**Key Metrics**:
- Audit event volume and types
- Risk score distribution
- Failed authentication attempts
- Suspicious activity patterns
- System performance impact

**Dashboards**:
- Security operations center (SOC) dashboard
- File access patterns dashboard
- Risk assessment dashboard
- Compliance status dashboard

### Automated Alerting

**Alert Conditions**:
```javascript
const alertConditions = {
  high_risk_activity: {
    condition: 'risk_score > 0.8',
    action: 'immediate_alert',
    recipients: ['security-team@anarq.org']
  },
  auth_failure_spike: {
    condition: 'auth_failures > 10 in 5m',
    action: 'security_alert',
    recipients: ['security-team@anarq.org']
  },
  mass_file_access: {
    condition: 'file_access > 100 in 1m from single_ip',
    action: 'rate_limit_alert',
    recipients: ['ops-team@anarq.org']
  },
  retention_failure: {
    condition: 'retention_job_failed',
    action: 'compliance_alert',
    recipients: ['compliance-team@anarq.org']
  }
};
```

### Incident Response

**Automated Response Actions**:
- Rate limiting for suspicious IPs
- Temporary account suspension for high-risk activities
- File access restriction for compromised accounts
- Escalation to human analysts for critical events

**Response Procedures**:
1. **Detection**: Automated monitoring identifies anomaly
2. **Analysis**: Risk assessment and pattern matching
3. **Containment**: Automated protective measures activated
4. **Investigation**: Human analyst reviews event details
5. **Resolution**: Appropriate remediation actions taken
6. **Documentation**: Incident documented for future reference