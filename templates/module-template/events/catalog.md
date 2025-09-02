# Event Catalog - {{MODULE_NAME}}

This document describes all events published by the {{MODULE_NAME}} module.

## Event Naming Convention

All events follow the Q ecosystem naming convention:
```
q.<module>.<action>.<version>
```

## Published Events

### q.{{MODULE_NAME}}.example.created.v1

**Description**: Published when a new example resource is created.

**Topic**: `q.{{MODULE_NAME}}.example.created.v1`

**Schema**: See `example.created.v1.event.json`

**Payload Example**:
```json
{
  "eventId": "123e4567-e89b-12d3-a456-426614174000",
  "eventType": "q.{{MODULE_NAME}}.example.created.v1",
  "timestamp": "2023-01-01T00:00:00Z",
  "source": "{{MODULE_NAME}}",
  "actor": {
    "squidId": "123e4567-e89b-12d3-a456-426614174001",
    "subId": "123e4567-e89b-12d3-a456-426614174002"
  },
  "data": {
    "resourceId": "123e4567-e89b-12d3-a456-426614174003",
    "name": "Example Resource",
    "cid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
  },
  "metadata": {
    "correlationId": "123e4567-e89b-12d3-a456-426614174004",
    "traceId": "trace-123",
    "version": "1.0"
  }
}
```

**Consumers**: 
- Qindex (for resource indexing)
- Qerberos (for audit logging)
- Other modules that need to react to resource creation

### q.{{MODULE_NAME}}.example.updated.v1

**Description**: Published when an example resource is updated.

**Topic**: `q.{{MODULE_NAME}}.example.updated.v1`

**Schema**: See `example.updated.v1.event.json`

**Payload Example**:
```json
{
  "eventId": "123e4567-e89b-12d3-a456-426614174005",
  "eventType": "q.{{MODULE_NAME}}.example.updated.v1",
  "timestamp": "2023-01-01T01:00:00Z",
  "source": "{{MODULE_NAME}}",
  "actor": {
    "squidId": "123e4567-e89b-12d3-a456-426614174001"
  },
  "data": {
    "resourceId": "123e4567-e89b-12d3-a456-426614174003",
    "changes": {
      "name": {
        "from": "Old Name",
        "to": "New Name"
      }
    },
    "newCid": "QmNewContentId123",
    "prevCid": "QmOldContentId123"
  },
  "metadata": {
    "correlationId": "123e4567-e89b-12d3-a456-426614174006",
    "traceId": "trace-124",
    "version": "1.0"
  }
}
```

### q.{{MODULE_NAME}}.example.deleted.v1

**Description**: Published when an example resource is deleted.

**Topic**: `q.{{MODULE_NAME}}.example.deleted.v1`

**Schema**: See `example.deleted.v1.event.json`

**Payload Example**:
```json
{
  "eventId": "123e4567-e89b-12d3-a456-426614174007",
  "eventType": "q.{{MODULE_NAME}}.example.deleted.v1",
  "timestamp": "2023-01-01T02:00:00Z",
  "source": "{{MODULE_NAME}}",
  "actor": {
    "squidId": "123e4567-e89b-12d3-a456-426614174001"
  },
  "data": {
    "resourceId": "123e4567-e89b-12d3-a456-426614174003",
    "deletedCid": "QmDeletedContentId123",
    "reason": "user_request"
  },
  "metadata": {
    "correlationId": "123e4567-e89b-12d3-a456-426614174008",
    "traceId": "trace-125",
    "version": "1.0"
  }
}
```

## Event Schema Evolution

### Versioning Strategy

- **Major Version**: Breaking changes to event structure
- **Minor Version**: Backward-compatible additions
- **Patch Version**: Bug fixes and clarifications

### Compatibility Matrix

| Event Version | Schema Version | Supported Until |
|---------------|----------------|-----------------|
| v1.0 | 1.0.0 | 2025-01-01 |

### Migration Guide

When upgrading event schemas:

1. **Backward Compatibility**: New versions should be backward compatible when possible
2. **Deprecation Notice**: Provide 6 months notice before removing old versions
3. **Consumer Updates**: Coordinate with event consumers for schema updates
4. **Testing**: Validate schema changes with contract tests

## Event Publishing Guidelines

### Required Fields

All events must include:
- `eventId`: Unique event identifier
- `eventType`: Event type following naming convention
- `timestamp`: ISO 8601 timestamp
- `source`: Source module name
- `actor`: Identity reference of the actor
- `data`: Event-specific data
- `metadata`: Event metadata

### Best Practices

1. **Idempotency**: Events should be idempotent and safe to replay
2. **Ordering**: Don't rely on event ordering across different resources
3. **Size Limits**: Keep event payloads under 1MB
4. **Sensitive Data**: Don't include sensitive data in events
5. **Correlation**: Use correlationId to track related events

## Monitoring and Alerting

### Event Metrics

- Event publish rate
- Event processing latency
- Failed event deliveries
- Schema validation errors

### Alerts

- High event failure rate (>1%)
- Event processing delays (>30s)
- Schema validation failures
- Consumer lag (>1000 events)

## Testing Events

### Contract Tests

All events have contract tests that validate:
- Schema compliance
- Required field presence
- Data type validation
- Format validation

### Integration Tests

Event integration tests verify:
- Event publishing works correctly
- Consumers receive events
- Event ordering (where applicable)
- Error handling

Run event tests:
```bash
npm run test:events
```