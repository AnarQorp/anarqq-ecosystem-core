# Qmail - Certified Messaging Module

Qmail is the certified messaging module of the AnarQ&Q ecosystem. It provides end-to-end encrypted messaging with cryptographic receipts, certified delivery, spam filtering, and comprehensive audit trails.

## Features

- **End-to-End Encryption**: Messages encrypted via Qlock with post-quantum cryptography support
- **Certified Delivery**: Cryptographic receipts and delivery confirmation
- **Spam Filtering**: AI-powered spam detection via Qerberos integration
- **Premium Services**: Enhanced messaging features via Qwallet integration
- **Message Retention**: Automated retention policies and GDPR compliance
- **Audit Trails**: Comprehensive message logging and compliance reporting

## Run Modes

### Standalone Mode
```bash
# Using Docker Compose
docker-compose up

# Using npm
npm install
npm run dev
```

### Integrated Mode
```bash
# With full ecosystem
npm run start:integrated
```

### Hybrid Mode
```bash
# With selective mocking
npm run start:hybrid
```

## API Endpoints

### HTTP API
- `POST /api/qmail/send` - Send encrypted message
- `GET /api/qmail/inbox/:squidId` - Get inbox messages
- `GET /api/qmail/message/:messageId` - Get specific message
- `POST /api/qmail/receipt/:messageId` - Generate delivery receipt
- `GET /api/qmail/receipts/:messageId` - Get message receipts
- `DELETE /api/qmail/message/:messageId` - Delete message (GDPR)

### MCP Tools
- `qmail.send` - Send encrypted message with delivery tracking
- `qmail.fetch` - Fetch messages from inbox
- `qmail.receipt` - Generate or verify delivery receipt

## Events Published
- `q.qmail.sent.v1` - Message sent successfully
- `q.qmail.delivered.v1` - Message delivered to recipient
- `q.qmail.receipt.generated.v1` - Delivery receipt generated
- `q.qmail.spam.detected.v1` - Spam message detected
- `q.qmail.retention.expired.v1` - Message retention expired

## Integration Requirements

### Identity (sQuid)
- Identity verification for message sending/receiving
- Subidentity support for delegated messaging

### Permissions (Qonsent)
- Permission checks for message access
- Contact list and blocking management

### Encryption (Qlock)
- End-to-end message encryption
- Cryptographic signature generation
- Key management and rotation

### Indexing (Qindex)
- Message indexing and searchability
- Thread and conversation tracking

### Audit (Qerberos)
- Message audit logging
- Spam detection and risk assessment
- Compliance reporting

### Privacy (Qmask)
- Message metadata anonymization
- Privacy profile application

### Payments (Qwallet)
- Premium messaging services
- Certified delivery fees
- Storage quota management

## Configuration

Environment variables:
- `QMAIL_ENCRYPTION_LEVEL` - Default encryption level (STANDARD/HIGH/QUANTUM)
- `QMAIL_RETENTION_DAYS` - Default message retention period
- `QMAIL_SPAM_THRESHOLD` - Spam detection sensitivity
- `QMAIL_PREMIUM_ENABLED` - Enable premium services

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint

# Build for production
npm run build
```

## Message Flow

1. **Send Message**: Client sends message via HTTP API or MCP tool
2. **Identity Verification**: sQuid verifies sender identity
3. **Permission Check**: Qonsent validates messaging permissions
4. **Spam Detection**: Qerberos analyzes message for spam/threats
5. **Encryption**: Qlock encrypts message content and metadata
6. **Storage**: Message stored in IPFS with CID indexing
7. **Indexing**: Qindex creates searchable message index
8. **Delivery**: Message delivered to recipient's inbox
9. **Receipt**: Cryptographic delivery receipt generated
10. **Audit**: Complete message flow logged for compliance

## Security Features

- **Zero-Knowledge Architecture**: Server cannot read message content
- **Forward Secrecy**: Message keys rotated regularly
- **Replay Protection**: Cryptographic nonces prevent replay attacks
- **Metadata Protection**: Message metadata encrypted and anonymized
- **Audit Logging**: Immutable audit trail for all operations