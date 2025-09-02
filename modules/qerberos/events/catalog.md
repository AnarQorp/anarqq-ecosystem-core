# Qerberos Event Catalog

This document describes all events published by the Qerberos security and audit module.

## Event Naming Convention

All Qerberos events follow the pattern: `q.qerberos.<action>.<version>`

## Published Events

### q.qerberos.audit.logged.v1

**Description**: Published when an audit event is successfully logged to the immutable audit trail.

**Payload Schema**: [audit-logged.event.json](./audit-logged.event.json)

**Example**:
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-02-08T15:30:00.000Z",
  "auditEventId": "audit_123456",
  "type": "access",
  "actor": {
    "squidId": "did:squid:user123",
    "subId": "work"
  },
  "layer": "qdrive",
  "verdict": "ALLOW",
  "ipfsCid": "QmAuditEventCid123456789"
}
```

### q.qerberos.alert.created.v1

**Description**: Published when a new security alert is created.

**Payload Schema**: [alert-created.event.json](./alert-created.event.json)

**Example**:
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2024-02-08T15:30:00.000Z",
  "alertId": "alert_789012",
  "type": "anomaly",
  "severity": "high",
  "title": "Unusual File Access Pattern Detected",
  "affectedIdentities": ["did:squid:user123"],
  "source": {
    "module": "qerberos",
    "component": "anomaly_detector"
  }
}
```

### q.qerberos.anomaly.detected.v1

**Description**: Published when an anomaly is detected by the ML-based detection system.

**Payload Schema**: [anomaly-detected.event.json](./anomaly-detected.event.json)

**Example**:
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2024-02-08T15:30:00.000Z",
  "anomalyId": "anomaly_345678",
  "type": "behavioral",
  "severity": "high",
  "confidence": 0.92,
  "description": "Unusual access pattern detected",
  "affectedIdentity": "did:squid:user123",
  "modelInfo": {
    "name": "behavioral_anomaly_detector",
    "version": "2.1.0"
  }
}
```

### q.qerberos.risk.scored.v1

**Description**: Published when a risk score is calculated for an identity or operation.

**Payload Schema**: [risk-scored.event.json](./risk-scored.event.json)

**Example**:
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440003",
  "timestamp": "2024-02-08T15:30:00.000Z",
  "identity": "did:squid:user123",
  "score": 0.35,
  "level": "medium",
  "operation": "file_access",
  "factors": [
    {
      "name": "login_frequency",
      "weight": 0.2,
      "value": 0.8
    }
  ],
  "expiresAt": "2024-02-08T16:30:00.000Z"
}
```

### q.qerberos.compliance.violation.v1

**Description**: Published when a compliance violation is detected.

**Payload Schema**: [compliance-violation.event.json](./compliance-violation.event.json)

**Example**:
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440004",
  "timestamp": "2024-02-08T15:30:00.000Z",
  "violationId": "violation_901234",
  "type": "gdpr",
  "severity": "high",
  "description": "Personal data processed without explicit consent",
  "affectedData": {
    "type": "personal_data",
    "subjects": ["did:squid:user123"]
  },
  "regulation": "GDPR Article 6",
  "recommendations": [
    "Obtain explicit consent from data subject",
    "Review data processing policies"
  ]
}
```

## Event Consumption

### Subscribing to Events

Events can be consumed through the event bus system:

```javascript
// Subscribe to all Qerberos events
eventBus.subscribe('q.qerberos.*', handler);

// Subscribe to specific event types
eventBus.subscribe('q.qerberos.alert.created.v1', alertHandler);
eventBus.subscribe('q.qerberos.anomaly.detected.v1', anomalyHandler);
```

### Event Processing Guidelines

1. **Idempotency**: Event handlers should be idempotent to handle duplicate events
2. **Error Handling**: Implement proper error handling and retry logic
3. **Ordering**: Events may not arrive in strict chronological order
4. **Schema Validation**: Always validate event payloads against schemas
5. **Versioning**: Handle multiple event versions gracefully

### Security Considerations

- All events contain cryptographic signatures for integrity verification
- Sensitive data in events is encrypted or redacted
- Event access is controlled through Qonsent permissions
- Audit trails are maintained for all event processing

## Event Schemas

All event schemas are defined in JSON Schema format and stored in this directory:

- [audit-logged.event.json](./audit-logged.event.json)
- [alert-created.event.json](./alert-created.event.json)
- [anomaly-detected.event.json](./anomaly-detected.event.json)
- [risk-scored.event.json](./risk-scored.event.json)
- [compliance-violation.event.json](./compliance-violation.event.json)

## Testing Events

Event schemas and handlers can be tested using the provided test utilities:

```bash
# Test event schema validation
npm run test:events

# Test event publishing and consumption
npm run test:integration
```