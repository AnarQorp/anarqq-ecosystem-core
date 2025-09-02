/**
 * Lock Signature - Cryptographic signature structure
 */
export interface LockSig {
  /** Cryptographic algorithm used (e.g., 'Ed25519', 'ECDSA', 'Dilithium') */
  alg: string;
  /** Public key in base64 format */
  pub: string;
  /** Signature in base64 format */
  sig: string;
  /** Timestamp when signature was created (Unix timestamp) */
  ts: number;
  /** Cryptographic nonce for replay protection */
  nonce: string;
  /** Optional key identifier */
  kid?: string;
}

/**
 * Encryption Envelope - Structure for encrypted data
 */
export interface EncryptionEnvelope {
  /** Encryption algorithm used */
  algorithm: string;
  /** Encrypted data in base64 format */
  encryptedData: string;
  /** Initialization vector in base64 format */
  iv: string;
  /** Optional key identifier */
  keyId?: string;
  /** Optional additional authenticated data */
  aad?: string;
  /** Authentication tag for AEAD modes */
  tag?: string;
}

/**
 * Distributed Lock - Structure for distributed mutex operations
 */
export interface DistributedLock {
  /** Lock identifier */
  lockId: string;
  /** Resource being locked */
  resource: string;
  /** Lock holder identity */
  holder: string;
  /** Lock acquisition timestamp */
  acquiredAt: string;
  /** Lock expiration timestamp */
  expiresAt: string;
  /** Lock status */
  status: 'ACQUIRED' | 'RELEASED' | 'EXPIRED';
  /** Optional lock metadata */
  metadata?: Record<string, any>;
}