# QpiC Event Catalog

This document describes all events published by the QpiC (Media Management) module.

## Event Naming Convention

All QpiC events follow the pattern: `q.qpic.<action>.<version>`

## Published Events

### Media Events

#### q.qpic.media.uploaded.v1
Published when a media file is successfully uploaded and processed.

**Payload:**
```json
{
  "mediaId": "string",
  "cid": "string",
  "filename": "string",
  "format": "string",
  "size": "number",
  "uploadedBy": "string",
  "metadata": "object",
  "timestamp": "string"
}
```

#### q.qpic.media.deleted.v1
Published when a media file is deleted.

**Payload:**
```json
{
  "mediaId": "string",
  "deletedBy": "string",
  "timestamp": "string"
}
```

### Transcoding Events

#### q.qpic.transcode.started.v1
Published when a transcoding job is started.

**Payload:**
```json
{
  "jobId": "string",
  "mediaId": "string",
  "profiles": "array",
  "requestedBy": "string",
  "timestamp": "string"
}
```

#### q.qpic.transcode.completed.v1
Published when a transcoding job is completed.

**Payload:**
```json
{
  "jobId": "string",
  "mediaId": "string",
  "results": "array",
  "duration": "number",
  "timestamp": "string"
}
```

#### q.qpic.transcode.failed.v1
Published when a transcoding job fails.

**Payload:**
```json
{
  "jobId": "string",
  "mediaId": "string",
  "error": "object",
  "timestamp": "string"
}
```

### Optimization Events

#### q.qpic.optimized.v1
Published when media optimization is completed.

**Payload:**
```json
{
  "mediaId": "string",
  "optimizations": "array",
  "results": "object",
  "timestamp": "string"
}
```

### License Events

#### q.qpic.license.created.v1
Published when a media license is created.

**Payload:**
```json
{
  "licenseId": "string",
  "mediaId": "string",
  "type": "string",
  "licensor": "string",
  "licensee": "string",
  "timestamp": "string"
}
```

#### q.qpic.license.transferred.v1
Published when a media license is transferred.

**Payload:**
```json
{
  "licenseId": "string",
  "mediaId": "string",
  "from": "string",
  "to": "string",
  "timestamp": "string"
}
```

### Privacy Events

#### q.qpic.privacy.applied.v1
Published when privacy profile is applied to media.

**Payload:**
```json
{
  "mediaId": "string",
  "profileName": "string",
  "fieldsRedacted": "array",
  "riskScore": "number",
  "timestamp": "string"
}
```

## Event Signatures

All events are signed using Qlock for authenticity verification. The signature is included in the event headers:

```
x-qlock-signature: <signature>
x-qlock-timestamp: <timestamp>
x-qlock-nonce: <nonce>
```

## Event Routing

Events are published to the Q ecosystem event bus with the following routing:
- Topic: Event name (e.g., `q.qpic.media.uploaded.v1`)
- Partition: Based on `mediaId` for media events, `jobId` for job events
- Headers: Include identity context (`x-squid-id`, `x-subid`, `x-dao-id`)

## Consuming Events

External modules can subscribe to QpiC events for integration:

### Qindex Integration
- Subscribes to `q.qpic.media.uploaded.v1` to index new media
- Subscribes to `q.qpic.media.deleted.v1` to remove from index

### Qmarket Integration
- Subscribes to `q.qpic.license.created.v1` to list licensed media
- Subscribes to `q.qpic.media.uploaded.v1` for marketplace listings

### Qerberos Integration
- Subscribes to all QpiC events for audit logging
- Monitors for suspicious activity patterns

### Qonsent Integration
- Subscribes to `q.qpic.media.uploaded.v1` to apply access policies
- Monitors license events for permission updates