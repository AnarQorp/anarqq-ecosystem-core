# Qchat Event Catalog

This document describes all events published by the Qchat module following the Q ecosystem event naming convention: `q.<module>.<action>.<version>`

## Event Categories

### Room Events
- `q.qchat.room.created.v1` - New chat room created
- `q.qchat.room.updated.v1` - Room settings updated
- `q.qchat.room.deleted.v1` - Room deleted
- `q.qchat.room.joined.v1` - User joined room
- `q.qchat.room.left.v1` - User left room

### Message Events
- `q.qchat.message.sent.v1` - Message sent to room
- `q.qchat.message.edited.v1` - Message edited
- `q.qchat.message.deleted.v1` - Message deleted
- `q.qchat.message.reaction.added.v1` - Reaction added to message
- `q.qchat.message.reaction.removed.v1` - Reaction removed from message

### Presence Events
- `q.qchat.presence.online.v1` - User came online
- `q.qchat.presence.offline.v1` - User went offline
- `q.qchat.presence.typing.v1` - User started/stopped typing

### Moderation Events
- `q.qchat.moderation.action.v1` - Moderation action performed
- `q.qchat.moderation.appeal.v1` - Moderation action appealed
- `q.qchat.moderation.resolved.v1` - Moderation appeal resolved

### Security Events
- `q.qchat.security.violation.v1` - Security violation detected
- `q.qchat.security.spam.v1` - Spam message detected
- `q.qchat.security.abuse.v1` - Abuse pattern detected

## Event Schemas

Each event follows a standardized structure:

```json
{
  "eventId": "unique-event-id",
  "topic": "q.qchat.action.v1",
  "timestamp": "2024-01-01T00:00:00Z",
  "source": "qchat",
  "version": "1.0.0",
  "actor": {
    "squidId": "squid_user_123",
    "subId": "sub_456",
    "daoId": "dao_789"
  },
  "data": {
    // Event-specific data
  },
  "metadata": {
    "correlationId": "correlation-id",
    "causationId": "causation-id",
    "signature": "cryptographic-signature",
    "cid": "ipfs-content-id"
  }
}
```

## Event Delivery

- Events are published to the Q ecosystem event bus
- All events are signed cryptographically
- Events are stored immutably in IPFS
- Consumers can subscribe to specific event types
- Event replay is supported for system recovery

## Event Retention

- Events are retained according to data governance policies
- Security events have extended retention periods
- Personal data in events follows GDPR compliance rules
- Event deletion is supported for data subject requests

## Integration Points

### sQuid Integration
- All events include actor identity information
- Identity verification is performed before event publishing

### Qerberos Integration
- Security events are automatically forwarded to Qerberos
- Moderation events trigger security analysis
- Abuse patterns are detected and reported

### Qindex Integration
- Events are indexed for searchability
- Event history is maintained for audit purposes
- Cross-references are created for related events

### Qonsent Integration
- Event publishing respects user consent preferences
- Privacy settings control event data inclusion
- Consent withdrawal triggers event data anonymization