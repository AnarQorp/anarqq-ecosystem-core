# Qonsent Event Catalog

This document describes all events published by the Qonsent module.

## Event Naming Convention

All events follow the pattern: `q.qonsent.<action>.<version>`

## Published Events

### q.qonsent.grant.issued.v1

**Description**: Published when a permission grant is issued to an identity.

**Payload Schema**: [grant-issued.event.json](./grant-issued.event.json)

**Example**:
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "qonsent",
  "type": "q.qonsent.grant.issued.v1",
  "data": {
    "grantId": "grant_123",
    "resource": "qdrive:file:abc123",
    "identity": "did:squid:alice",
    "permissions": ["read", "write"],
    "grantedBy": "did:squid:owner",
    "expiresAt": "2024-01-16T10:30:00Z"
  }
}
```

### q.qonsent.revoked.v1

**Description**: Published when permissions are revoked from an identity.

**Payload Schema**: [revoked.event.json](./revoked.event.json)

**Example**:
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2024-01-15T11:00:00Z",
  "source": "qonsent",
  "type": "q.qonsent.revoked.v1",
  "data": {
    "resource": "qdrive:file:abc123",
    "identity": "did:squid:alice",
    "revokedPermissions": ["write"],
    "revokedBy": "did:squid:owner",
    "reason": "Access no longer needed"
  }
}
```

### q.qonsent.policy.updated.v1

**Description**: Published when a policy is created, updated, or deleted.

**Payload Schema**: [policy-updated.event.json](./policy-updated.event.json)

**Example**:
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2024-01-15T12:00:00Z",
  "source": "qonsent",
  "type": "q.qonsent.policy.updated.v1",
  "data": {
    "policyId": "policy_456",
    "action": "created",
    "policy": {
      "name": "DAO Member Access",
      "scope": "dao",
      "rules": [...]
    },
    "updatedBy": "did:squid:admin"
  }
}
```

## Event Consumption

### Subscribing to Events

```typescript
import { EventBus } from '@anarq/common-clients';

const eventBus = new EventBus();

// Subscribe to all Qonsent events
eventBus.subscribe('q.qonsent.*', (event) => {
  console.log('Qonsent event received:', event);
});

// Subscribe to specific event types
eventBus.subscribe('q.qonsent.grant.issued.v1', (event) => {
  console.log('Permission granted:', event.data);
});
```

### Event Filtering

Events can be filtered by:
- Resource pattern (e.g., `qdrive:*`)
- Identity pattern (e.g., `did:squid:alice`)
- Permission type (e.g., `write`, `admin`)
- DAO context

## Event Retention

- Events are retained for 90 days by default
- Audit events are retained for 7 years for compliance
- Events are stored in IPFS with CID references for immutability