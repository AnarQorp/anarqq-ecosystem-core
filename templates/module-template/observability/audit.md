# Audit Specifications - {{MODULE_NAME}}

This document defines the audit logging and monitoring specifications for the {{MODULE_NAME}} module.

## Audit Logging Strategy

The {{MODULE_NAME}} module implements comprehensive audit logging following Q ecosystem standards:

- **Immutable Logs**: All audit events stored immutably in IPFS
- **Real-time Processing**: Events processed and analyzed in real-time
- **Compliance Ready**: Logs structured for regulatory compliance
- **Tamper Proof**: Cryptographic integrity protection

## Audit Event Categories

### Authentication Events

**Event Type**: `AUTHENTICATION`
**Qerberos Integration**: Yes
**Retention**: 7 years

```json
{
  "type": "AUTHENTICATION",
  "subtype": "LOGIN_SUCCESS|LOGIN_FAILURE|LOGOUT|TOKEN_REFRESH",
  "timestamp": "2023-01-01T00:00:00Z",
  "actor": {
    "squidId": "123e4567-e89b-12d3-a456-426614174000",
    "subId": "123e4567-e89b-12d3-a456-426614174001",
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  },
  "details": {
    "method": "squid_identity",
    "success": true,
    "reason": "valid_credentials",
    "sessionId": "session-123",
    "mfa": false
  },
  "metadata": {
    "module": "{{MODULE_NAME}}",
    "version": "1.0",
    "correlationId": "corr-123"
  }
}
```

### Authorization Events

**Event Type**: `AUTHORIZATION`
**Qerberos Integration**: Yes
**Retention**: 7 years

```json
{
  "type": "AUTHORIZATION",
  "subtype": "PERMISSION_GRANTED|PERMISSION_DENIED|ROLE_ASSIGNED|ROLE_REVOKED",
  "timestamp": "2023-01-01T00:00:00Z",
  "actor": {
    "squidId": "123e4567-e89b-12d3-a456-426614174000",
    "subId": "123e4567-e89b-12d3-a456-426614174001"
  },
  "resource": {
    "type": "{{MODULE_NAME}}_resource",
    "id": "resource-123",
    "path": "/api/v1/resources/123"
  },
  "details": {
    "permission": "{{MODULE_NAME}}:read",
    "granted": true,
    "reason": "valid_qonsent_token",
    "policyId": "policy-123",
    "scope": "resource:read"
  },
  "metadata": {
    "module": "{{MODULE_NAME}}",
    "version": "1.0",
    "correlationId": "corr-124"
  }
}
```

### Data Access Events

**Event Type**: `DATA_ACCESS`
**Qerberos Integration**: Yes
**Retention**: 7 years

```json
{
  "type": "DATA_ACCESS",
  "subtype": "READ|WRITE|DELETE|EXPORT|IMPORT",
  "timestamp": "2023-01-01T00:00:00Z",
  "actor": {
    "squidId": "123e4567-e89b-12d3-a456-426614174000",
    "subId": "123e4567-e89b-12d3-a456-426614174001"
  },
  "resource": {
    "type": "{{MODULE_NAME}}_resource",
    "id": "resource-123",
    "cid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
    "classification": "confidential"
  },
  "details": {
    "operation": "read",
    "success": true,
    "recordCount": 1,
    "dataSize": 1024,
    "encrypted": true,
    "masked": false
  },
  "metadata": {
    "module": "{{MODULE_NAME}}",
    "version": "1.0",
    "correlationId": "corr-125"
  }
}
```

### Security Events

**Event Type**: `SECURITY`
**Qerberos Integration**: Yes
**Retention**: 10 years

```json
{
  "type": "SECURITY",
  "subtype": "THREAT_DETECTED|ANOMALY_DETECTED|POLICY_VIOLATION|INTRUSION_ATTEMPT",
  "timestamp": "2023-01-01T00:00:00Z",
  "actor": {
    "squidId": "123e4567-e89b-12d3-a456-426614174000",
    "ip": "192.168.1.100",
    "userAgent": "Suspicious-Bot/1.0"
  },
  "details": {
    "threatType": "rate_limit_exceeded",
    "severity": "medium",
    "riskScore": 75,
    "blocked": true,
    "countermeasures": ["rate_limit", "temporary_block"],
    "evidence": {
      "requestCount": 1000,
      "timeWindow": "1m",
      "pattern": "automated"
    }
  },
  "metadata": {
    "module": "{{MODULE_NAME}}",
    "version": "1.0",
    "correlationId": "corr-126"
  }
}
```

### System Events

**Event Type**: `SYSTEM`
**Qerberos Integration**: Yes
**Retention**: 3 years

```json
{
  "type": "SYSTEM",
  "subtype": "SERVICE_START|SERVICE_STOP|CONFIG_CHANGE|ERROR|PERFORMANCE_ALERT",
  "timestamp": "2023-01-01T00:00:00Z",
  "details": {
    "event": "service_start",
    "version": "1.0.0",
    "environment": "production",
    "configuration": {
      "changed": ["rate_limit_config"],
      "previous": { "max": 100 },
      "current": { "max": 200 }
    },
    "performance": {
      "startupTime": "2.5s",
      "memoryUsage": "256MB",
      "cpuUsage": "5%"
    }
  },
  "metadata": {
    "module": "{{MODULE_NAME}}",
    "version": "1.0",
    "correlationId": "corr-127"
  }
}
```

### Business Events

**Event Type**: `BUSINESS`
**Qerberos Integration**: Optional
**Retention**: 5 years

```json
{
  "type": "BUSINESS",
  "subtype": "RESOURCE_CREATED|RESOURCE_UPDATED|RESOURCE_DELETED|TRANSACTION_COMPLETED",
  "timestamp": "2023-01-01T00:00:00Z",
  "actor": {
    "squidId": "123e4567-e89b-12d3-a456-426614174000",
    "subId": "123e4567-e89b-12d3-a456-426614174001"
  },
  "resource": {
    "type": "{{MODULE_NAME}}_resource",
    "id": "resource-123",
    "cid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
  },
  "details": {
    "operation": "create",
    "success": true,
    "changes": {
      "name": { "from": null, "to": "New Resource" },
      "status": { "from": null, "to": "active" }
    },
    "businessImpact": "new_resource_available"
  },
  "metadata": {
    "module": "{{MODULE_NAME}}",
    "version": "1.0",
    "correlationId": "corr-128"
  }
}
```

## Audit Event Structure

### Standard Fields

All audit events must include these standard fields:

```typescript
interface AuditEvent {
  // Required fields
  type: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_ACCESS' | 'SECURITY' | 'SYSTEM' | 'BUSINESS';
  subtype: string;
  timestamp: string; // ISO 8601 format
  
  // Optional but recommended
  actor?: {
    squidId?: string;
    subId?: string;
    daoId?: string;
    ip?: string;
    userAgent?: string;
    sessionId?: string;
  };
  
  resource?: {
    type: string;
    id: string;
    cid?: string;
    path?: string;
    classification?: 'public' | 'internal' | 'confidential' | 'restricted';
  };
  
  details: Record<string, any>; // Event-specific details
  
  metadata: {
    module: string;
    version: string;
    correlationId?: string;
    traceId?: string;
    requestId?: string;
  };
}
```

### Event Correlation

Events are correlated using:

- **Correlation ID**: Links related events across operations
- **Trace ID**: Links events across distributed system calls
- **Request ID**: Links events within a single request
- **Session ID**: Links events within a user session

## Audit Logging Implementation

### Event Generation

```javascript
import { QerberosClient } from '@anarq/common-clients';

class AuditLogger {
  constructor() {
    this.qerberos = new QerberosClient({
      baseURL: process.env.QERBEROS_URL
    });
  }

  async logEvent(eventData) {
    const auditEvent = {
      ...eventData,
      timestamp: new Date().toISOString(),
      metadata: {
        module: '{{MODULE_NAME}}',
        version: '1.0',
        ...eventData.metadata
      }
    };

    // Validate event structure
    this.validateEvent(auditEvent);

    // Send to Qerberos
    await this.qerberos.logAuditEvent(auditEvent);

    // Store locally for backup
    await this.storeLocalBackup(auditEvent);
  }

  async logAuthentication(actor, success, details = {}) {
    await this.logEvent({
      type: 'AUTHENTICATION',
      subtype: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
      actor,
      details: {
        success,
        ...details
      }
    });
  }

  async logDataAccess(actor, resource, operation, details = {}) {
    await this.logEvent({
      type: 'DATA_ACCESS',
      subtype: operation.toUpperCase(),
      actor,
      resource,
      details: {
        operation,
        ...details
      }
    });
  }

  async logSecurityEvent(actor, threatType, severity, details = {}) {
    await this.logEvent({
      type: 'SECURITY',
      subtype: 'THREAT_DETECTED',
      actor,
      details: {
        threatType,
        severity,
        ...details
      }
    });
  }
}
```

### Event Validation

```javascript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const auditEventSchema = {
  type: 'object',
  required: ['type', 'subtype', 'timestamp', 'details', 'metadata'],
  properties: {
    type: {
      type: 'string',
      enum: ['AUTHENTICATION', 'AUTHORIZATION', 'DATA_ACCESS', 'SECURITY', 'SYSTEM', 'BUSINESS']
    },
    subtype: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    actor: {
      type: 'object',
      properties: {
        squidId: { type: 'string', format: 'uuid' },
        subId: { type: 'string', format: 'uuid' },
        ip: { type: 'string', format: 'ipv4' }
      }
    },
    resource: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        id: { type: 'string' },
        cid: { type: 'string' }
      }
    },
    details: { type: 'object' },
    metadata: {
      type: 'object',
      required: ['module', 'version'],
      properties: {
        module: { type: 'string' },
        version: { type: 'string' }
      }
    }
  }
};

const ajv = new Ajv();
addFormats(ajv);
const validateAuditEvent = ajv.compile(auditEventSchema);

function validateEvent(event) {
  const valid = validateAuditEvent(event);
  if (!valid) {
    throw new Error(`Invalid audit event: ${JSON.stringify(validateAuditEvent.errors)}`);
  }
}
```

## Monitoring and Alerting

### Key Metrics

#### Security Metrics
- Authentication failure rate
- Authorization denial rate
- Security event frequency
- Anomaly detection alerts
- Failed access attempts

#### Performance Metrics
- Audit log processing latency
- Event throughput
- Storage utilization
- Query response time
- System availability

#### Compliance Metrics
- Log completeness
- Retention compliance
- Access audit coverage
- Data classification accuracy
- Policy violation rate

### Alert Conditions

#### Critical Alerts (P1)
- Multiple authentication failures (>10 in 5 minutes)
- Security breach detected
- Audit logging system failure
- Data exfiltration detected
- Unauthorized admin access

#### High Priority Alerts (P2)
- Unusual access patterns
- Policy violations
- Performance degradation (>5s response time)
- Storage capacity warnings (>80%)
- Service availability issues

#### Medium Priority Alerts (P3)
- Configuration changes
- Elevated error rates
- Capacity planning warnings
- Compliance violations
- Performance warnings

### Alert Configuration

```json
{
  "alerts": {
    "authentication_failures": {
      "condition": "count > 10 in 5m",
      "severity": "critical",
      "notification": ["security-team", "on-call"]
    },
    "security_events": {
      "condition": "severity >= high",
      "severity": "critical",
      "notification": ["security-team", "ciso"]
    },
    "audit_log_failures": {
      "condition": "error_rate > 1%",
      "severity": "high",
      "notification": ["ops-team", "compliance-team"]
    },
    "performance_degradation": {
      "condition": "p95_latency > 5s",
      "severity": "medium",
      "notification": ["ops-team"]
    }
  }
}
```

## Compliance and Reporting

### Regulatory Compliance

#### GDPR Compliance
- **Data Subject Rights**: Automated DSR processing
- **Right to Erasure**: Cryptographic erasure support
- **Data Portability**: Standardized export formats
- **Consent Management**: Consent tracking and withdrawal
- **Processing Records**: Article 30 compliance documentation

#### SOC2 Compliance
- **Security Controls**: Comprehensive security logging
- **Availability Controls**: System availability monitoring
- **Processing Integrity**: Data integrity verification
- **Confidentiality Controls**: Access control logging
- **Privacy Controls**: Privacy event tracking

### Automated Reporting

#### Daily Reports
- Security event summary
- Performance metrics
- System health status
- Compliance violations
- Capacity utilization

#### Weekly Reports
- Trend analysis
- Security posture assessment
- Performance trends
- Capacity planning
- Compliance status

#### Monthly Reports
- Executive summary
- Risk assessment
- Compliance certification
- Performance benchmarks
- Capacity forecasting

### Report Generation

```javascript
class ReportGenerator {
  async generateSecurityReport(period) {
    const events = await this.qerberos.queryEvents({
      type: 'SECURITY',
      timeRange: period
    });

    return {
      summary: {
        totalEvents: events.length,
        criticalEvents: events.filter(e => e.details.severity === 'critical').length,
        threatsBlocked: events.filter(e => e.details.blocked).length
      },
      trends: this.analyzeTrends(events),
      recommendations: this.generateRecommendations(events)
    };
  }

  async generateComplianceReport(period) {
    const auditEvents = await this.qerberos.queryEvents({
      timeRange: period
    });

    return {
      coverage: this.calculateAuditCoverage(auditEvents),
      violations: this.identifyViolations(auditEvents),
      retention: this.checkRetentionCompliance(auditEvents),
      dataSubjectRights: this.trackDSRCompliance(auditEvents)
    };
  }
}
```

## Data Retention and Archival

### Retention Policies

| Event Type | Retention Period | Archive Location | Compliance Requirement |
|------------|------------------|------------------|------------------------|
| Authentication | 7 years | IPFS + Backup | SOX, GDPR |
| Authorization | 7 years | IPFS + Backup | SOX, GDPR |
| Data Access | 7 years | IPFS + Backup | SOX, GDPR |
| Security | 10 years | IPFS + Backup + Archive | SOX, Regulatory |
| System | 3 years | IPFS + Backup | Operational |
| Business | 5 years | IPFS + Backup | Business |

### Archival Process

1. **Identification**: Identify events eligible for archival
2. **Validation**: Verify event integrity and completeness
3. **Compression**: Compress events for efficient storage
4. **Encryption**: Encrypt archived events
5. **Storage**: Store in long-term archive storage
6. **Verification**: Verify successful archival
7. **Cleanup**: Remove from active storage

### Data Lifecycle Management

```javascript
class AuditDataLifecycle {
  async archiveOldEvents() {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);

    const oldEvents = await this.qerberos.queryEvents({
      timestamp: { $lt: cutoffDate.toISOString() }
    });

    for (const event of oldEvents) {
      await this.archiveEvent(event);
    }
  }

  async archiveEvent(event) {
    // Compress and encrypt
    const compressedEvent = await this.compressEvent(event);
    const encryptedEvent = await this.encryptEvent(compressedEvent);

    // Store in archive
    const archiveCid = await this.storeInArchive(encryptedEvent);

    // Update index
    await this.updateArchiveIndex(event.id, archiveCid);

    // Remove from active storage
    await this.removeFromActiveStorage(event.id);
  }
}
```