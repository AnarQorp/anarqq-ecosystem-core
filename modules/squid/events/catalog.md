# sQuid Event Catalog

This document describes all events published by the sQuid module.

## Event Naming Convention

All sQuid events follow the pattern: `q.squid.<action>.<version>`

## Published Events

### q.squid.created.v1

Published when a new root identity is created.

**Topic**: `q.squid.created.v1`
**Schema**: [identity-created.event.json](./identity-created.event.json)

**Payload**:
```json
{
  "eventId": "uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "v1",
  "source": "squid",
  "type": "identity.created",
  "data": {
    "identity": { /* Identity object */ },
    "creator": {
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "sessionId": "session-uuid"
    }
  }
}
```

### q.squid.sub.created.v1

Published when a new subidentity is created.

**Topic**: `q.squid.sub.created.v1`
**Schema**: [subidentity-created.event.json](./subidentity-created.event.json)

**Payload**:
```json
{
  "eventId": "uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "v1",
  "source": "squid",
  "type": "subidentity.created",
  "data": {
    "identity": { /* Subidentity object */ },
    "parentId": "parent-uuid",
    "creator": {
      "identityId": "creator-uuid",
      "ip": "192.168.1.1",
      "sessionId": "session-uuid"
    }
  }
}
```

### q.squid.reputation.updated.v1

Published when an identity's reputation score is updated.

**Topic**: `q.squid.reputation.updated.v1`
**Schema**: [reputation-updated.event.json](./reputation-updated.event.json)

**Payload**:
```json
{
  "eventId": "uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "v1",
  "source": "squid",
  "type": "reputation.updated",
  "data": {
    "identityId": "identity-uuid",
    "previousScore": 100,
    "newScore": 150,
    "reason": "positive_interaction",
    "metadata": {
      "module": "qmail",
      "action": "message_sent",
      "details": {}
    }
  }
}
```

### q.squid.verified.v1

Published when an identity verification is approved.

**Topic**: `q.squid.verified.v1`
**Schema**: [identity-verified.event.json](./identity-verified.event.json)

**Payload**:
```json
{
  "eventId": "uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "v1",
  "source": "squid",
  "type": "identity.verified",
  "data": {
    "identityId": "identity-uuid",
    "verificationLevel": "ENHANCED",
    "approvedBy": "verifier-uuid",
    "documents": ["ipfs-hash-1", "ipfs-hash-2"],
    "metadata": {
      "kycProvider": "provider-name",
      "verificationMethod": "document_review"
    }
  }
}
```

## Event Consumers

These events are typically consumed by:

- **Qindex**: For identity indexing and search
- **Qerberos**: For security auditing and monitoring
- **Qonsent**: For permission management updates
- **Qwallet**: For payment authorization updates
- **Analytics Services**: For usage tracking and insights

## Event Guarantees

- **At-least-once delivery**: Events may be delivered multiple times
- **Ordering**: Events are ordered by timestamp within each topic
- **Retention**: Events are retained for 30 days by default
- **Schema Evolution**: Backward compatible schema changes only