# Qchat IPFS Storage Mapping

This document describes how Qchat data is mapped to IPFS storage for decentralized, content-addressed storage.

## Storage Architecture

Qchat uses IPFS for persistent storage of encrypted messages, room metadata, and audit records. All content is encrypted before being stored in IPFS, ensuring privacy and security.

## Content Types and Mapping

### 1. Chat Messages
**Path Pattern**: `/qchat/messages/{roomId}/{messageId}`
**IPFS Structure**:
```
{
  "messageId": "qchat_msg_abc123",
  "roomId": "qchat_room_xyz789",
  "senderId": "squid_user_456",
  "encryptedContent": "base64-encrypted-content",
  "messageType": "TEXT",
  "timestamp": "2024-01-01T00:00:00Z",
  "signature": "cryptographic-signature",
  "attachments": [
    {
      "name": "document.pdf",
      "cid": "QmAttachmentCID123",
      "size": 1024,
      "mimeType": "application/pdf",
      "encryptionKey": "encrypted-key"
    }
  ],
  "metadata": {
    "encryptionLevel": "STANDARD",
    "replyTo": "qchat_msg_def456",
    "mentions": ["squid_user_789"],
    "expiresAt": "2024-01-02T00:00:00Z"
  }
}
```

### 2. Room Configuration
**Path Pattern**: `/qchat/rooms/{roomId}/config`
**IPFS Structure**:
```
{
  "roomId": "qchat_room_xyz789",
  "name": "General Discussion",
  "description": "Open discussion room",
  "type": "PUBLIC",
  "createdAt": "2024-01-01T00:00:00Z",
  "createdBy": "squid_user_123",
  "settings": {
    "maxMembers": 100,
    "encryptionLevel": "STANDARD",
    "moderationLevel": "BASIC",
    "messageRetention": 365,
    "ephemeral": false
  },
  "permissions": {
    "defaultRole": "MEMBER",
    "roles": {
      "OWNER": ["qchat:room:*"],
      "ADMIN": ["qchat:room:moderate", "qchat:room:admin"],
      "MEMBER": ["qchat:message:send", "qchat:message:react"],
      "GUEST": ["qchat:message:send"]
    }
  },
  "encryptionKey": "encrypted-room-key",
  "signature": "cryptographic-signature"
}
```

### 3. Room Member List
**Path Pattern**: `/qchat/rooms/{roomId}/members`
**IPFS Structure**:
```
{
  "roomId": "qchat_room_xyz789",
  "members": [
    {
      "squidId": "squid_user_123",
      "role": "OWNER",
      "joinedAt": "2024-01-01T00:00:00Z",
      "permissions": ["qchat:room:*"],
      "encryptedKey": "user-specific-room-key"
    },
    {
      "squidId": "squid_user_456",
      "role": "MEMBER",
      "joinedAt": "2024-01-01T01:00:00Z",
      "permissions": ["qchat:message:send", "qchat:message:react"],
      "encryptedKey": "user-specific-room-key"
    }
  ],
  "memberCount": 2,
  "lastUpdated": "2024-01-01T01:00:00Z",
  "signature": "cryptographic-signature"
}
```

### 4. Message History Index
**Path Pattern**: `/qchat/rooms/{roomId}/history/{date}`
**IPFS Structure**:
```
{
  "roomId": "qchat_room_xyz789",
  "date": "2024-01-01",
  "messages": [
    {
      "messageId": "qchat_msg_abc123",
      "cid": "QmMessageCID123",
      "timestamp": "2024-01-01T10:00:00Z",
      "senderId": "squid_user_456",
      "messageType": "TEXT",
      "deleted": false
    },
    {
      "messageId": "qchat_msg_def456",
      "cid": "QmMessageCID456",
      "timestamp": "2024-01-01T10:05:00Z",
      "senderId": "squid_user_789",
      "messageType": "IMAGE",
      "deleted": false
    }
  ],
  "messageCount": 2,
  "signature": "cryptographic-signature"
}
```

### 5. Moderation Records
**Path Pattern**: `/qchat/moderation/{actionId}`
**IPFS Structure**:
```
{
  "actionId": "qchat_mod_abc123",
  "roomId": "qchat_room_xyz789",
  "moderatorId": "squid_admin_123",
  "targetId": "squid_user_456",
  "action": "MUTE",
  "reason": "Spam violation",
  "severity": "MEDIUM",
  "timestamp": "2024-01-01T12:00:00Z",
  "duration": 3600,
  "effectiveUntil": "2024-01-01T13:00:00Z",
  "evidence": [
    {
      "type": "MESSAGE",
      "cid": "QmEvidenceCID123",
      "description": "Spam message content"
    }
  ],
  "reputationImpact": {
    "targetId": "squid_user_456",
    "previousScore": 0.75,
    "newScore": 0.65,
    "change": -0.10
  },
  "signature": "cryptographic-signature"
}
```

### 6. User Presence Data
**Path Pattern**: `/qchat/presence/{squidId}/{date}`
**IPFS Structure**:
```
{
  "squidId": "squid_user_456",
  "date": "2024-01-01",
  "sessions": [
    {
      "sessionId": "session_abc123",
      "startTime": "2024-01-01T09:00:00Z",
      "endTime": "2024-01-01T17:00:00Z",
      "rooms": ["qchat_room_xyz789", "qchat_room_abc456"],
      "messageCount": 25,
      "lastActivity": "2024-01-01T16:45:00Z"
    }
  ],
  "totalOnlineTime": 28800,
  "signature": "cryptographic-signature"
}
```

## Encryption Strategy

### Message Content Encryption
1. **Room Key Generation**: Each room has a unique encryption key derived from Qlock
2. **User Key Derivation**: Individual user keys derived from sQuid identity + room key
3. **Content Encryption**: Message content encrypted with user-specific room key
4. **Key Distribution**: Room keys encrypted for each authorized member

### Metadata Protection
- Non-sensitive metadata (timestamps, message IDs) stored in plaintext for indexing
- Sensitive metadata (user mentions, content previews) encrypted
- Search indices use encrypted tokens for privacy-preserving search

## IPFS Integration

### Content Addressing
- All content stored with deterministic CIDs
- Content deduplication through IPFS native features
- Immutable storage ensures audit trail integrity

### Pinning Strategy
- Critical data (room configs, moderation records) pinned permanently
- Message content pinned based on retention policies
- Temporary data (presence, typing indicators) not pinned

### Replication
- Multi-node replication for high availability
- Geographic distribution for performance
- Backup nodes for disaster recovery

## Data Lifecycle Management

### Message Retention
```
Message Type -> Retention Period -> Action
Regular Messages: 2 years -> Archive to cold storage
System Messages: 7 years -> Archive to cold storage
Moderation Records: 10 years -> Permanent retention
Audit Events: 10 years -> Permanent retention
Presence Data: 30 days -> Delete
Temporary Files: 7 days -> Delete
```

### Garbage Collection
1. **Reference Counting**: Track CID references across all data structures
2. **Orphan Detection**: Identify unreferenced content
3. **Grace Period**: 30-day grace period before deletion
4. **Secure Deletion**: Cryptographic erasure of encryption keys

### GDPR Compliance
- **Right to Erasure**: Remove user data and re-encrypt remaining data
- **Data Portability**: Export user data in standard JSON format
- **Consent Withdrawal**: Anonymize user data while preserving audit integrity

## Performance Optimization

### Caching Strategy
- Frequently accessed content cached locally
- Message history cached by room and date
- User presence data cached in memory
- Search indices cached for fast queries

### Batch Operations
- Bulk message storage for performance
- Batch member updates for large rooms
- Aggregated presence updates
- Bulk moderation actions

### Compression
- Message content compressed before encryption
- JSON metadata compressed using gzip
- Image attachments optimized and compressed
- Video attachments transcoded for efficiency

## Monitoring and Analytics

### Storage Metrics
- Total storage usage per room
- Message storage growth rates
- Attachment storage distribution
- Pinning cost analysis

### Performance Metrics
- IPFS retrieval latency
- Content availability rates
- Replication success rates
- Garbage collection efficiency

### Privacy-Preserving Analytics
- Aggregated usage statistics without personal data
- Room activity patterns (anonymized)
- Message type distribution
- Storage optimization opportunities

## Backup and Recovery

### Backup Strategy
- Daily incremental backups of all pinned content
- Weekly full backups to multiple locations
- Real-time replication for critical data
- Cross-region backup distribution

### Recovery Procedures
1. **Data Loss Detection**: Automated monitoring for missing content
2. **Recovery Initiation**: Automatic recovery from backup nodes
3. **Integrity Verification**: Cryptographic verification of recovered data
4. **Service Restoration**: Gradual service restoration with monitoring

### Disaster Recovery
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 1 hour
- Automated failover to backup regions
- Manual intervention procedures for catastrophic failures