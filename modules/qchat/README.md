# Qchat - Instant Messaging Module

Qchat provides real-time instant messaging capabilities with end-to-end encryption, group management, and reputation-based access control for the AnarQ&Q ecosystem.

## Features

- **Real-time Messaging**: WebSocket-based instant messaging with low latency
- **End-to-End Encryption**: All messages encrypted using Qlock integration
- **Group Management**: Create and manage chat groups with role-based permissions
- **Reputation-based Access**: Anti-abuse protection using sQuid reputation scores
- **Message History**: Persistent message storage with IPFS integration
- **Moderation Tools**: Advanced moderation capabilities for group administrators
- **QKD Ready**: Prepared for future Quantum Key Distribution integration

## Run Modes

### Standalone Mode (Development/Demo)
```bash
npm run dev
# or
docker-compose up
```

In standalone mode, Qchat runs with mock services for:
- sQuid (identity verification)
- Qlock (encryption/decryption)
- Qonsent (permission checking)
- Qindex (message indexing)
- Qerberos (security monitoring)

### Integrated Mode (Production)
```bash
npm run start:integrated
```

In integrated mode, Qchat connects to real ecosystem services.

### Hybrid Mode (Staging)
```bash
npm run start:hybrid
```

In hybrid mode, some services are mocked while others are real (configurable).

## API Endpoints

### HTTP API
- `POST /api/qchat/rooms` - Create chat room
- `GET /api/qchat/rooms/{roomId}` - Get room details
- `POST /api/qchat/rooms/{roomId}/join` - Join room
- `POST /api/qchat/rooms/{roomId}/leave` - Leave room
- `GET /api/qchat/rooms/{roomId}/messages` - Get message history
- `POST /api/qchat/rooms/{roomId}/moderate` - Moderate room
- `GET /api/qchat/health` - Health check

### WebSocket Events
- `message` - Send/receive messages
- `typing` - Typing indicators
- `presence` - User presence updates
- `room:join` - Room join notifications
- `room:leave` - Room leave notifications
- `moderation` - Moderation actions

## MCP Tools

- `qchat.post` - Post message to room
- `qchat.subscribe` - Subscribe to room events
- `qchat.moderate` - Perform moderation actions
- `qchat.createRoom` - Create new chat room
- `qchat.history` - Get message history

## Environment Variables

```bash
# Server Configuration
QCHAT_PORT=3001
QCHAT_MODE=standalone|integrated|hybrid

# Service URLs (integrated mode)
SQUID_URL=http://localhost:3010
QLOCK_URL=http://localhost:3020
QONSENT_URL=http://localhost:3030
QINDEX_URL=http://localhost:3040
QERBEROS_URL=http://localhost:3050

# Security
QCHAT_JWT_SECRET=your-jwt-secret
QCHAT_ENCRYPTION_KEY=your-encryption-key

# Rate Limiting
QCHAT_RATE_LIMIT_WINDOW=60000
QCHAT_RATE_LIMIT_MAX=100

# WebSocket Configuration
QCHAT_WS_HEARTBEAT_INTERVAL=30000
QCHAT_WS_MAX_CONNECTIONS=1000
```

## Message Encryption

All messages are encrypted end-to-end using Qlock:
1. Message content encrypted with room-specific key
2. Room keys managed through Qlock key derivation
3. User keys derived from sQuid identity
4. Future QKD integration for quantum-safe encryption

## Group Management

### Room Types
- **PUBLIC**: Open to all users
- **PRIVATE**: Invitation only
- **DAO**: Restricted to DAO members
- **REPUTATION**: Minimum reputation required

### Roles
- **OWNER**: Full control over room
- **ADMIN**: Moderation capabilities
- **MEMBER**: Standard messaging
- **GUEST**: Limited access

## Anti-Abuse Protection

- Rate limiting per identity/subidentity
- Reputation-based message filtering
- Automatic spam detection
- Qerberos integration for threat monitoring
- Progressive penalties for violations

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Docker Deployment

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

## Integration Examples

### Basic Message Sending
```javascript
import { QchatClient } from '@anarq/qchat';

const client = new QchatClient({
  url: 'ws://localhost:3001',
  squidId: 'your-squid-id'
});

await client.connect();
await client.joinRoom('room-123');
await client.sendMessage('room-123', 'Hello, world!');
```

### Group Creation
```javascript
const room = await client.createRoom({
  name: 'My Chat Room',
  type: 'PRIVATE',
  description: 'A private chat room',
  maxMembers: 50
});
```

## Security Considerations

- All messages encrypted at rest and in transit
- Identity verification through sQuid required
- Permission checks via Qonsent for sensitive operations
- Audit logging through Qerberos for compliance
- Rate limiting and anti-abuse protection enabled by default

## Compliance

- GDPR compliant with data retention policies
- Message deletion and export capabilities
- Audit trail for all moderation actions
- Privacy controls for user data

## Future Enhancements

- Quantum Key Distribution (QKD) integration
- Advanced AI-powered moderation
- Voice and video calling capabilities
- File sharing integration with Qdrive
- Marketplace integration for premium features