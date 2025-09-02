import { describe, it, expect } from 'vitest';
import { validator } from '../validation/validator.js';
import type { LockSig, EncryptionEnvelope, DistributedLock } from '../types/lock.js';

describe('Lock Schema Validation', () => {
  describe('LockSig', () => {
    it('should validate a valid LockSig', () => {
      const validLockSig: LockSig = {
        alg: 'Ed25519',
        pub: 'SGVsbG8gV29ybGQ=',
        sig: 'YWJjZGVmZw==',
        ts: Math.floor(Date.now() / 1000),
        nonce: 'MTIzNDU2Nzg5MA==',
      };

      const result = validator.validateLockSig(validLockSig);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validLockSig);
    });

    it('should validate LockSig with optional kid', () => {
      const validLockSig: LockSig = {
        alg: 'ECDSA',
        pub: 'SGVsbG8gV29ybGQ=',
        sig: 'YWJjZGVmZw==',
        ts: Math.floor(Date.now() / 1000),
        nonce: 'MTIzNDU2Nzg5MA==',
        kid: 'key_123',
      };

      const result = validator.validateLockSig(validLockSig);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validLockSig);
    });

    it('should reject LockSig with invalid algorithm', () => {
      const invalidLockSig = {
        alg: 'INVALID_ALG',
        pub: 'SGVsbG8gV29ybGQ=',
        sig: 'YWJjZGVmZw==',
        ts: Math.floor(Date.now() / 1000),
        nonce: 'MTIzNDU2Nzg5MA==',
      };

      const result = validator.validateLockSig(invalidLockSig);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('must be equal to one of the allowed values');
    });

    it('should reject LockSig with invalid base64 public key', () => {
      const invalidLockSig = {
        alg: 'Ed25519',
        pub: 'invalid_base64!',
        sig: 'YWJjZGVmZw==',
        ts: Math.floor(Date.now() / 1000),
        nonce: 'MTIzNDU2Nzg5MA==',
      };

      const result = validator.validateLockSig(invalidLockSig);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('pattern');
    });
  });

  describe('EncryptionEnvelope', () => {
    it('should validate a valid EncryptionEnvelope', () => {
      const validEnvelope: EncryptionEnvelope = {
        algorithm: 'AES-256-GCM',
        encryptedData: 'SGVsbG8gV29ybGQ=',
        iv: 'MTIzNDU2Nzg5MA==',
      };

      const result = validator.validateEncryptionEnvelope(validEnvelope);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validEnvelope);
    });

    it('should validate EncryptionEnvelope with optional fields', () => {
      const validEnvelope: EncryptionEnvelope = {
        algorithm: 'ChaCha20-Poly1305',
        encryptedData: 'SGVsbG8gV29ybGQ=',
        iv: 'MTIzNDU2Nzg5MA==',
        keyId: 'key_456',
        aad: 'YWRkaXRpb25hbA==',
        tag: 'dGFnZGF0YQ==',
      };

      const result = validator.validateEncryptionEnvelope(validEnvelope);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validEnvelope);
    });

    it('should reject EncryptionEnvelope with invalid algorithm', () => {
      const invalidEnvelope = {
        algorithm: 'INVALID_ALGORITHM',
        encryptedData: 'SGVsbG8gV29ybGQ=',
        iv: 'MTIzNDU2Nzg5MA==',
      };

      const result = validator.validateEncryptionEnvelope(invalidEnvelope);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('must be equal to one of the allowed values');
    });
  });

  describe('DistributedLock', () => {
    it('should validate a valid DistributedLock', () => {
      const validLock: DistributedLock = {
        lockId: 'lock_123',
        resource: 'user_profile_456',
        holder: 'user123',
        acquiredAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-01-01T01:00:00Z',
        status: 'ACQUIRED',
      };

      const result = validator.validateDistributedLock(validLock);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validLock);
    });

    it('should validate DistributedLock with metadata', () => {
      const validLock: DistributedLock = {
        lockId: 'lock_456',
        resource: 'file_789',
        holder: 'user456',
        acquiredAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-01-01T01:00:00Z',
        status: 'RELEASED',
        metadata: { reason: 'user_action', priority: 'high' },
      };

      const result = validator.validateDistributedLock(validLock);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validLock);
    });

    it('should reject DistributedLock with invalid status', () => {
      const invalidLock = {
        lockId: 'lock_123',
        resource: 'user_profile_456',
        holder: 'user123',
        acquiredAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-01-01T01:00:00Z',
        status: 'INVALID_STATUS',
      };

      const result = validator.validateDistributedLock(invalidLock);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('must be equal to one of the allowed values');
    });

    it('should reject DistributedLock with invalid date format', () => {
      const invalidLock = {
        lockId: 'lock_123',
        resource: 'user_profile_456',
        holder: 'user123',
        acquiredAt: 'invalid-date',
        expiresAt: '2024-01-01T01:00:00Z',
        status: 'ACQUIRED',
      };

      const result = validator.validateDistributedLock(invalidLock);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('format');
    });
  });
});