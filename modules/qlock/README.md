# Qlock - Encryption & Signatures Module

Qlock provides encryption, digital signatures, time-locks, and distributed mutex services for the Q ecosystem. It supports post-quantum cryptographic algorithms and integrates with KMS/HSM for secure key management.

## Features

- **Encryption/Decryption**: Multi-algorithm encryption with post-quantum readiness
- **Digital Signatures**: Cryptographic signing and verification
- **Time-locks**: Temporal access controls
- **Distributed Locks**: Mutex coordination across services
- **Key Management**: KMS/HSM integration with automatic rotation
- **Audit Logging**: Security event tracking and compliance

## Run Modes

### Standalone Mode
```bash
# Development with mocks
npm run dev

# Docker deployment
docker compose up
```

### Integrated Mode
```bash
# With real ecosystem services
npm run start:integrated
```

## API Interfaces

### HTTP API
- `POST /encrypt` - Encrypt data
- `POST /decrypt` - Decrypt data
- `POST /sign` - Sign data
- `POST /verify` - Verify signature
- `POST /lock` - Acquire distributed lock
- `DELETE /lock/:lockId` - Release lock

### MCP Tools
- `qlock.encrypt` - Encrypt data with specified algorithm
- `qlock.decrypt` - Decrypt data with private key
- `qlock.sign` - Create digital signature
- `qlock.verify` - Verify digital signature
- `qlock.lock` - Acquire/release distributed lock

## Configuration

Environment variables:
- `QLOCK_KMS_ENDPOINT` - KMS service endpoint
- `QLOCK_HSM_ENABLED` - Enable HSM integration
- `QLOCK_KEY_ROTATION_SCHEDULE` - Key rotation schedule
- `QLOCK_PQC_ENABLED` - Enable post-quantum cryptography
- `QLOCK_AUDIT_ENABLED` - Enable audit logging

## Security

- All keys are managed through KMS/HSM
- Post-quantum algorithms (Kyber, Dilithium) supported
- Automatic key rotation with configurable schedules
- Comprehensive audit logging for compliance
- Environment-specific key scoping