# Qdrive Event Catalog

This document describes all events published by the Qdrive module.

## Event Naming Convention

All Qdrive events follow the pattern: `q.qdrive.<action>.<version>`

## Events

### q.qdrive.file.created.v1

**Description**: Published when a file is successfully uploaded to Qdrive.

**Payload Schema**: [file-created.event.json](./file-created.event.json)

**Example**:
```json
{
  "topic": "q.qdrive.file.created.v1",
  "timestamp": "2024-01-15T10:30:00Z",
  "actor": {
    "squidId": "squid_abc123def456",
    "subId": "sub_789xyz"
  },
  "data": {
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "name": "document.pdf",
    "size": 1048576,
    "mimeType": "application/pdf",
    "encrypted": true,
    "privacy": "private",
    "tags": ["document", "important"]
  }
}
```

### q.qdrive.file.accessed.v1

**Description**: Published when a file is downloaded or accessed.

**Payload Schema**: [file-accessed.event.json](./file-accessed.event.json)

**Example**:
```json
{
  "topic": "q.qdrive.file.accessed.v1",
  "timestamp": "2024-01-15T10:35:00Z",
  "actor": {
    "squidId": "squid_abc123def456"
  },
  "data": {
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "accessType": "download",
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.100"
  }
}
```

### q.qdrive.file.shared.v1

**Description**: Published when a file is shared with other users.

**Payload Schema**: [file-shared.event.json](./file-shared.event.json)

**Example**:
```json
{
  "topic": "q.qdrive.file.shared.v1",
  "timestamp": "2024-01-15T10:40:00Z",
  "actor": {
    "squidId": "squid_abc123def456"
  },
  "data": {
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "shareId": "share_xyz789abc123",
    "recipients": ["squid_def456ghi789"],
    "permissions": ["read", "download"],
    "expiresAt": "2024-02-15T10:40:00Z"
  }
}
```

### q.qdrive.file.deleted.v1

**Description**: Published when a file is deleted from Qdrive.

**Payload Schema**: [file-deleted.event.json](./file-deleted.event.json)

**Example**:
```json
{
  "topic": "q.qdrive.file.deleted.v1",
  "timestamp": "2024-01-15T10:45:00Z",
  "actor": {
    "squidId": "squid_abc123def456"
  },
  "data": {
    "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "name": "document.pdf",
    "reason": "user_request",
    "retentionPolicy": "delete"
  }
}
```

### q.qdrive.retention.applied.v1

**Description**: Published when a retention policy is applied to files.

**Payload Schema**: [retention-applied.event.json](./retention-applied.event.json)

**Example**:
```json
{
  "topic": "q.qdrive.retention.applied.v1",
  "timestamp": "2024-01-15T10:50:00Z",
  "actor": {
    "squidId": "system"
  },
  "data": {
    "policyId": "policy_retention_365",
    "filesProcessed": 150,
    "filesDeleted": 25,
    "filesArchived": 10,
    "filesAnonymized": 5,
    "totalSizeFreed": 1073741824
  }
}
```

## Event Consumption

### Subscribers

These modules typically subscribe to Qdrive events:

- **Qindex**: Indexes file metadata for search and discovery
- **Qerberos**: Logs file operations for security auditing
- **Qwallet**: Tracks storage usage for billing
- **Qmarket**: Updates content listings when files are modified
- **Qonsent**: Updates access permissions when files are shared

### Event Processing

All events include:
- **topic**: Event type identifier
- **timestamp**: ISO 8601 timestamp
- **actor**: Identity information (squidId, optional subId)
- **data**: Event-specific payload
- **signature**: Cryptographic signature (added by event bus)
- **cid**: Content ID of the event (added by event bus)

### Error Handling

If event processing fails:
1. Events are retried with exponential backoff
2. Failed events are logged to dead letter queue
3. Alerts are sent to monitoring systems
4. Manual intervention may be required for critical events