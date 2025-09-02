# Qmask Event Catalog

This document describes all events published by the Qmask module.

## Event Naming Convention

All events follow the pattern: `q.qmask.<action>.<version>`

## Published Events

### q.qmask.applied.v1

**Description**: Published when privacy masking is applied to data

**Payload Schema**:
```json
{
  "eventId": "string",
  "timestamp": "ISO 8601 datetime",
  "actor": {
    "squidId": "string",
    "subId": "string (optional)"
  },
  "profileName": "string",
  "riskScore": "number (0-1)",
  "complianceFlags": ["string"],
  "rulesApplied": "number",
  "dataSize": "number (bytes)"
}
```

**Example**:
```json
{
  "eventId": "evt-qmask-applied-1234567890",
  "timestamp": "2024-01-15T10:30:00Z",
  "actor": {
    "squidId": "squid-user-123",
    "subId": "sub-456"
  },
  "profileName": "gdpr-basic",
  "riskScore": 0.3,
  "complianceFlags": ["GDPR"],
  "rulesApplied": 4,
  "dataSize": 1024
}
```

### q.qmask.profile.created.v1

**Description**: Published when a new privacy profile is created

**Payload Schema**:
```json
{
  "eventId": "string",
  "timestamp": "ISO 8601 datetime",
  "actor": {
    "squidId": "string",
    "subId": "string (optional)"
  },
  "profileName": "string",
  "version": "string",
  "ruleCount": "number",
  "complianceFlags": ["string"]
}
```

### q.qmask.profile.updated.v1

**Description**: Published when a privacy profile is updated

**Payload Schema**:
```json
{
  "eventId": "string",
  "timestamp": "ISO 8601 datetime",
  "actor": {
    "squidId": "string",
    "subId": "string (optional)"
  },
  "profileName": "string",
  "oldVersion": "string",
  "newVersion": "string",
  "changes": ["string"]
}
```

### q.qmask.profile.deleted.v1

**Description**: Published when a privacy profile is deleted

**Payload Schema**:
```json
{
  "eventId": "string",
  "timestamp": "ISO 8601 datetime",
  "actor": {
    "squidId": "string",
    "subId": "string (optional)"
  },
  "profileName": "string",
  "version": "string"
}
```

### q.qmask.assessment.completed.v1

**Description**: Published when a privacy impact assessment is completed

**Payload Schema**:
```json
{
  "eventId": "string",
  "timestamp": "ISO 8601 datetime",
  "actor": {
    "squidId": "string",
    "subId": "string (optional)"
  },
  "assessmentId": "string",
  "operationType": "string",
  "riskLevel": "string",
  "riskScore": "number (0-1)",
  "complianceRequirements": ["string"]
}
```

### q.qmask.dsr.created.v1

**Description**: Published when a data subject request is created

**Payload Schema**:
```json
{
  "eventId": "string",
  "timestamp": "ISO 8601 datetime",
  "actor": {
    "squidId": "string",
    "subId": "string (optional)"
  },
  "requestId": "string",
  "requestType": "string",
  "dataSubject": "string",
  "urgency": "string"
}
```

### q.qmask.dsr.completed.v1

**Description**: Published when a data subject request is completed

**Payload Schema**:
```json
{
  "eventId": "string",
  "timestamp": "ISO 8601 datetime",
  "actor": {
    "squidId": "string",
    "subId": "string (optional)"
  },
  "requestId": "string",
  "requestType": "string",
  "dataSubject": "string",
  "status": "string",
  "processingTime": "number (milliseconds)"
}
```

## Event Consumption

Other modules can subscribe to these events for:

- **Qerberos**: Audit logging of privacy operations
- **Qindex**: Indexing privacy profiles and assessments
- **Qonsent**: Permission updates based on privacy decisions
- **Analytics**: Privacy metrics and compliance reporting

## Event Reliability

- All events are published with at-least-once delivery guarantee
- Events include correlation IDs for tracing
- Failed event publishing triggers alerts
- Event schemas are versioned for backward compatibility