# Qlock Event Catalog

This document describes all events published by the Qlock module.

## Event Naming Convention

All Qlock events follow the pattern: `q.qlock.<action>.<version>`

## Events

### Lock Events

#### q.qlock.lock.acquired.v1
Published when a distributed lock is successfully acquired.

**Payload:**
- `lockId` (string): Unique lock identifier
- `owner` (string): Identity ID that acquired the lock
- `resource` (string): Resource being locked
- `ttl` (integer): Lock TTL in milliseconds
- `acquiredAt` (string): ISO timestamp when lock was acquired
- `expiresAt` (string): ISO timestamp when lock expires
- `metadata` (object): Additional lock metadata

#### q.qlock.lock.released.v1
Published when a distributed lock is released.

**Payload:**
- `lockId` (string): Unique lock identifier
- `owner` (string): Identity ID that released the lock
- `resource` (string): Resource that was locked
- `releasedAt` (string): ISO timestamp when lock was released
- `duration` (integer): How long the lock was held (ms)
- `reason` (string): Reason for release (manual, expired, error)

#### q.qlock.lock.extended.v1
Published when a distributed lock TTL is extended.

**Payload:**
- `lockId` (string): Unique lock identifier
- `owner` (string): Identity ID that owns the lock
- `previousExpiry` (string): Previous expiry timestamp
- `newExpiry` (string): New expiry timestamp
- `extension` (integer): Extension duration in milliseconds
- `extendedAt` (string): ISO timestamp when extension occurred

#### q.qlock.lock.failed.v1
Published when lock acquisition fails.

**Payload:**
- `lockId` (string): Unique lock identifier
- `requestor` (string): Identity ID that requested the lock
- `reason` (string): Failure reason
- `currentOwner` (string): Current lock owner (if applicable)
- `failedAt` (string): ISO timestamp when failure occurred

### Encryption Events

#### q.qlock.encrypted.v1
Published when data is successfully encrypted.

**Payload:**
- `keyId` (string): Key identifier used
- `algorithm` (string): Encryption algorithm
- `identityId` (string): Identity that performed encryption
- `dataSize` (integer): Size of encrypted data
- `quantumResistant` (boolean): Whether quantum-resistant algorithm was used
- `encryptedAt` (string): ISO timestamp

#### q.qlock.decrypted.v1
Published when data is successfully decrypted.

**Payload:**
- `keyId` (string): Key identifier used
- `algorithm` (string): Encryption algorithm
- `identityId` (string): Identity that performed decryption
- `success` (boolean): Whether decryption was successful
- `decryptedAt` (string): ISO timestamp

### Signature Events

#### q.qlock.signed.v1
Published when data is digitally signed.

**Payload:**
- `keyId` (string): Signing key identifier
- `algorithm` (string): Signature algorithm
- `identityId` (string): Identity that performed signing
- `dataHash` (string): Hash of signed data
- `quantumResistant` (boolean): Whether quantum-resistant algorithm was used
- `signedAt` (string): ISO timestamp

#### q.qlock.verified.v1
Published when a signature is verified.

**Payload:**
- `algorithm` (string): Signature algorithm
- `valid` (boolean): Whether signature is valid
- `publicKey` (string): Public key used for verification
- `dataHash` (string): Hash of verified data
- `verifiedAt` (string): ISO timestamp

### Key Management Events

#### q.qlock.key.rotated.v1
Published when encryption keys are rotated.

**Payload:**
- `keyId` (string): Key identifier
- `algorithm` (string): Key algorithm
- `identityId` (string): Identity associated with key
- `previousKeyId` (string): Previous key identifier
- `rotatedAt` (string): ISO timestamp
- `reason` (string): Rotation reason (scheduled, manual, security)

#### q.qlock.key.generated.v1
Published when new keys are generated.

**Payload:**
- `keyId` (string): New key identifier
- `algorithm` (string): Key algorithm
- `keySize` (integer): Key size in bits
- `quantumResistant` (boolean): Whether key is quantum-resistant
- `identityId` (string): Associated identity
- `generatedAt` (string): ISO timestamp

### Security Events

#### q.qlock.security.alert.v1
Published when security anomalies are detected.

**Payload:**
- `alertType` (string): Type of security alert
- `severity` (string): Alert severity (low, medium, high, critical)
- `identityId` (string): Identity involved
- `resource` (string): Affected resource
- `details` (object): Alert details
- `detectedAt` (string): ISO timestamp

## Event Schema Validation

All events are validated against their respective JSON schemas located in the `events/` directory.

## Event Consumption

Events can be consumed through:
- Redis Streams
- WebSocket connections
- HTTP webhooks
- Message queue integrations