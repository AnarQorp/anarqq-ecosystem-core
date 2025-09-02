/**
 * Key Management Service Tests
 * 
 * Comprehensive test suite for unified key management,
 * cryptographic standards, and security compliance.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KeyManagementService } from '../services/KeyManagementService.mjs';

describe('KeyManagementService', () => {
  let keyService;

  beforeEach(() => {
    keyService = new KeyManagementService({
      environment: 'test',
      kmsProvider: 'LOCAL_DEV',
      auditEnabled: true,
      rotationEnabled: false, // Disable for tests
      pqcEnabled: true
    });
  });

  afterEach(() => {
    keyService.removeAllListeners();
  });

  describe('Key Creation', () => {
    it('should create Ed25519 signing key', async () => {
      const keySpec = {
        usage: 'SIGNING',
        algorithm: 'Ed25519',
        owner: 'test-service',
        rotationSchedule: 'P30D'
      };

      const metadata = await keyService.createKey(keySpec);

      expect(metadata).toBeDefined();
      expect(metadata.keyId).toMatch(/^key_test_[a-f0-9]{16}$/);
      expect(metadata.usage).toBe('SIGNING');
      expect(metadata.algorithm).toBe('Ed25519');
      expect(metadata.status).toBe('ACTIVE');
      expect(metadata.version).toBe(1);
    });

    it('should create AES-256-GCM encryption key', async () => {
      const keySpec = {
        usage: 'ENCRYPTION',
        algorithm: 'AES-256-GCM',
        owner: 'test-service'
      };

      const metadata = await keyService.createKey(keySpec);

      expect(metadata.algorithm).toBe('AES-256-GCM');
      expect(metadata.usage).toBe('ENCRYPTION');
      expect(metadata.rotationSchedule).toBe('P90D'); // Default for encryption
    });

    it('should create post-quantum Dilithium key', async () => {
      const keySpec = {
        usage: 'SIGNING',
        algorithm: 'Dilithium2',
        owner: 'test-service'
      };

      const metadata = await keyService.createKey(keySpec);

      expect(metadata.algorithm).toBe('Dilithium2');
      
      // Verify PQC key material
      const keyData = keyService.keyStore.get(metadata.keyId);
      expect(keyData.keyMaterial.pqc).toBe(true);
    });

    it('should emit keyCreated event', async () => {
      let eventReceived = false;
      keyService.on('keyCreated', (event) => {
        eventReceived = true;
        expect(event.keyId).toBeDefined();
        expect(event.metadata).toBeDefined();
      });

      await keyService.createKey({
        usage: 'SIGNING',
        algorithm: 'Ed25519',
        owner: 'test-service'
      });

      expect(eventReceived).toBe(true);
    });

    it('should audit key creation', async () => {
      await keyService.createKey({
        usage: 'SIGNING',
        algorithm: 'Ed25519',
        owner: 'test-service'
      });

      const auditEvents = keyService.auditLog.filter(e => e.operation === 'CREATE');
      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0].result).toBe('SUCCESS');
    });
  });

  describe('Key Usage', () => {
    let signingKeyId;
    let encryptionKeyId;

    beforeEach(async () => {
      const signingKey = await keyService.createKey({
        usage: 'SIGNING',
        algorithm: 'Ed25519',
        owner: 'test-service'
      });
      signingKeyId = signingKey.keyId;

      const encryptionKey = await keyService.createKey({
        usage: 'ENCRYPTION',
        algorithm: 'AES-256-GCM',
        owner: 'test-service'
      });
      encryptionKeyId = encryptionKey.keyId;
    });

    it('should sign data with Ed25519 key', async () => {
      const data = 'test message to sign';
      const signature = await keyService.useKey(signingKeyId, 'SIGN', data);

      expect(signature).toBeDefined();
      expect(signature.algorithm).toBe('Ed25519');
      expect(signature.signature).toBeDefined();
      expect(signature.publicKey).toBeDefined();
      expect(signature.timestamp).toBeDefined();
      expect(signature.nonce).toBeDefined();
    });

    it('should encrypt and decrypt data with AES key', async () => {
      const plaintext = 'secret message';
      
      // Encrypt
      const encrypted = await keyService.useKey(encryptionKeyId, 'ENCRYPT', plaintext);
      expect(encrypted.algorithm).toBe('AES-256-GCM');
      expect(encrypted.encryptedData).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();

      // Decrypt
      const decrypted = await keyService.useKey(encryptionKeyId, 'DECRYPT', encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should derive key from base key', async () => {
      const derivationParams = {
        derivationPath: 'test/path/1',
        context: 'test-context'
      };

      const derived = await keyService.useKey(encryptionKeyId, 'DERIVE', derivationParams);

      expect(derived.derivedKey).toBeDefined();
      expect(derived.derivationPath).toBe('test/path/1');
      expect(derived.algorithm).toBe('HKDF-SHA256');
    });

    it('should reject usage of revoked key', async () => {
      await keyService.revokeKey(signingKeyId, 'TEST');

      await expect(
        keyService.useKey(signingKeyId, 'SIGN', 'test data')
      ).rejects.toThrow('Key not active');
    });

    it('should audit key usage', async () => {
      await keyService.useKey(signingKeyId, 'SIGN', 'test data');

      const auditEvents = keyService.auditLog.filter(e => e.operation === 'USE');
      expect(auditEvents.length).toBeGreaterThan(0);
      expect(auditEvents[0].result).toBe('SUCCESS');
    });
  });

  describe('Key Rotation', () => {
    let keyId;

    beforeEach(async () => {
      const key = await keyService.createKey({
        usage: 'SIGNING',
        algorithm: 'Ed25519',
        owner: 'test-service'
      });
      keyId = key.keyId;
    });

    it('should rotate key successfully', async () => {
      const rotationRequest = {
        reason: 'MANUAL',
        immediate: false,
        gracePeriod: 'P1D'
      };

      const result = await keyService.rotateKey(keyId, rotationRequest);

      expect(result.oldKeyId).toBe(keyId);
      expect(result.newKeyId).toBeDefined();
      expect(result.newKeyId).not.toBe(keyId);
      expect(result.migrationStatus).toBe('PENDING');
      expect(result.gracePeriodEnd).toBeDefined();

      // Verify old key is deprecated
      const oldKeyMetadata = await keyService.getKeyMetadata(keyId);
      expect(oldKeyMetadata.status).toBe('DEPRECATED');

      // Verify new key is active
      const newKeyMetadata = await keyService.getKeyMetadata(result.newKeyId);
      expect(newKeyMetadata.status).toBe('ACTIVE');
      expect(newKeyMetadata.version).toBe(2);
      expect(newKeyMetadata.previousKeyId).toBe(keyId);
    });

    it('should rotate to different algorithm', async () => {
      const rotationRequest = {
        reason: 'POLICY',
        newAlgorithm: 'ECDSA-secp256k1',
        immediate: true
      };

      const result = await keyService.rotateKey(keyId, rotationRequest);
      const newKeyMetadata = await keyService.getKeyMetadata(result.newKeyId);

      expect(newKeyMetadata.algorithm).toBe('ECDSA-secp256k1');
    });

    it('should emit keyRotated event', async () => {
      let eventReceived = false;
      keyService.on('keyRotated', (event) => {
        eventReceived = true;
        expect(event.oldKeyId).toBe(keyId);
        expect(event.newKeyId).toBeDefined();
      });

      await keyService.rotateKey(keyId, { reason: 'MANUAL', immediate: true });

      expect(eventReceived).toBe(true);
    });

    it('should audit key rotation', async () => {
      await keyService.rotateKey(keyId, { reason: 'MANUAL', immediate: true });

      const auditEvents = keyService.auditLog.filter(e => e.operation === 'ROTATE');
      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0].result).toBe('SUCCESS');
      expect(auditEvents[0].context.reason).toBe('MANUAL');
    });
  });

  describe('Key Revocation', () => {
    let keyId;

    beforeEach(async () => {
      const key = await keyService.createKey({
        usage: 'SIGNING',
        algorithm: 'Ed25519',
        owner: 'test-service'
      });
      keyId = key.keyId;
    });

    it('should revoke key successfully', async () => {
      await keyService.revokeKey(keyId, 'COMPROMISE');

      const metadata = await keyService.getKeyMetadata(keyId);
      expect(metadata.status).toBe('REVOKED');
      expect(metadata.revokedAt).toBeDefined();
      expect(metadata.revocationReason).toBe('COMPROMISE');
    });

    it('should emit keyRevoked event', async () => {
      let eventReceived = false;
      keyService.on('keyRevoked', (event) => {
        eventReceived = true;
        expect(event.keyId).toBe(keyId);
        expect(event.reason).toBe('COMPROMISE');
      });

      await keyService.revokeKey(keyId, 'COMPROMISE');

      expect(eventReceived).toBe(true);
    });

    it('should audit key revocation', async () => {
      await keyService.revokeKey(keyId, 'COMPROMISE');

      const auditEvents = keyService.auditLog.filter(e => e.operation === 'REVOKE');
      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0].result).toBe('SUCCESS');
      expect(auditEvents[0].context.reason).toBe('COMPROMISE');
    });
  });

  describe('Algorithm Support', () => {
    it('should support all classical algorithms', async () => {
      const algorithms = [
        'Ed25519',
        'ECDSA-secp256k1',
        'RSA-2048',
        'RSA-4096',
        'AES-256-GCM',
        'ChaCha20-Poly1305'
      ];

      for (const algorithm of algorithms) {
        const usage = algorithm.includes('AES') || algorithm.includes('ChaCha') ? 'ENCRYPTION' : 'SIGNING';
        
        const metadata = await keyService.createKey({
          usage,
          algorithm,
          owner: 'test-service'
        });

        expect(metadata.algorithm).toBe(algorithm);
      }
    });

    it('should support post-quantum algorithms', async () => {
      const pqcAlgorithms = [
        'Dilithium2',
        'Dilithium3',
        'Falcon-512',
        'Kyber512'
      ];

      for (const algorithm of pqcAlgorithms) {
        const usage = algorithm.includes('Kyber') ? 'ENCRYPTION' : 'SIGNING';
        
        const metadata = await keyService.createKey({
          usage,
          algorithm,
          owner: 'test-service'
        });

        expect(metadata.algorithm).toBe(algorithm);
        
        const keyData = keyService.keyStore.get(metadata.keyId);
        expect(keyData.keyMaterial.pqc).toBe(true);
      }
    });

    it('should reject unsupported algorithm', async () => {
      await expect(
        keyService.createKey({
          usage: 'SIGNING',
          algorithm: 'UNSUPPORTED_ALG',
          owner: 'test-service'
        })
      ).rejects.toThrow('Unsupported algorithm');
    });
  });

  describe('Environment Scoping', () => {
    it('should include environment in key ID', async () => {
      const metadata = await keyService.createKey({
        usage: 'SIGNING',
        algorithm: 'Ed25519',
        owner: 'test-service'
      });

      expect(metadata.keyId).toMatch(/^key_test_/);
      expect(metadata.environment).toBe('test');
    });

    it('should scope keys by environment', async () => {
      const devService = new KeyManagementService({ environment: 'dev' });
      const prodService = new KeyManagementService({ environment: 'prod' });

      const devKey = await devService.createKey({
        usage: 'SIGNING',
        algorithm: 'Ed25519',
        owner: 'test-service'
      });

      const prodKey = await prodService.createKey({
        usage: 'SIGNING',
        algorithm: 'Ed25519',
        owner: 'test-service'
      });

      expect(devKey.keyId).toMatch(/^key_dev_/);
      expect(prodKey.keyId).toMatch(/^key_prod_/);
      expect(devKey.environment).toBe('dev');
      expect(prodKey.environment).toBe('prod');
    });
  });

  describe('Audit Logging', () => {
    it('should create audit events for all operations', async () => {
      const key = await keyService.createKey({
        usage: 'SIGNING',
        algorithm: 'Ed25519',
        owner: 'test-service'
      });

      await keyService.useKey(key.keyId, 'SIGN', 'test data');
      await keyService.rotateKey(key.keyId, { reason: 'MANUAL', immediate: true });

      const auditEvents = keyService.auditLog;
      expect(auditEvents.length).toBeGreaterThanOrEqual(3); // CREATE, USE, ROTATE (and CREATE for new key)

      const operations = auditEvents.map(e => e.operation);
      expect(operations).toContain('CREATE');
      expect(operations).toContain('USE');
      expect(operations).toContain('ROTATE');
    });

    it('should include required audit fields', async () => {
      await keyService.createKey({
        usage: 'SIGNING',
        algorithm: 'Ed25519',
        owner: 'test-service'
      });

      const auditEvent = keyService.auditLog[0];
      
      expect(auditEvent.eventId).toBeDefined();
      expect(auditEvent.timestamp).toBeDefined();
      expect(auditEvent.keyId).toBeDefined();
      expect(auditEvent.operation).toBeDefined();
      expect(auditEvent.actor).toBeDefined();
      expect(auditEvent.result).toBeDefined();
      expect(auditEvent.context).toBeDefined();
      expect(auditEvent.context.environment).toBe('test');
    });

    it('should emit audit events', async () => {
      let auditEventReceived = false;
      keyService.on('auditEvent', (event) => {
        auditEventReceived = true;
        expect(event.operation).toBe('CREATE');
      });

      await keyService.createKey({
        usage: 'SIGNING',
        algorithm: 'Ed25519',
        owner: 'test-service'
      });

      expect(auditEventReceived).toBe(true);
    });
  });

  describe('Statistics and Health', () => {
    beforeEach(async () => {
      // Create test keys
      await keyService.createKey({
        usage: 'SIGNING',
        algorithm: 'Ed25519',
        owner: 'test-service'
      });

      await keyService.createKey({
        usage: 'ENCRYPTION',
        algorithm: 'AES-256-GCM',
        owner: 'test-service'
      });

      await keyService.createKey({
        usage: 'SIGNING',
        algorithm: 'Dilithium2',
        owner: 'test-service'
      });
    });

    it('should provide key statistics', async () => {
      const stats = await keyService.getStatistics();

      expect(stats.totalKeys).toBe(3);
      expect(stats.byStatus.ACTIVE).toBe(3);
      expect(stats.byAlgorithm['Ed25519']).toBe(1);
      expect(stats.byAlgorithm['AES-256-GCM']).toBe(1);
      expect(stats.byAlgorithm['Dilithium2']).toBe(1);
      expect(stats.byUsage.SIGNING).toBe(2);
      expect(stats.byUsage.ENCRYPTION).toBe(1);
      expect(stats.pqcKeys).toBe(1);
    });

    it('should provide health check', async () => {
      const health = await keyService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.provider).toBe('LOCAL_DEV');
      expect(health.environment).toBe('test');
      expect(health.features.auditEnabled).toBe(true);
      expect(health.features.pqcEnabled).toBe(true);
      expect(health.statistics).toBeDefined();
    });
  });

  describe('Duration Parsing', () => {
    it('should parse ISO 8601 durations correctly', () => {
      expect(keyService.parseDuration('P1D')).toBe(24 * 60 * 60 * 1000);
      expect(keyService.parseDuration('P30D')).toBe(30 * 24 * 60 * 60 * 1000);
      expect(keyService.parseDuration('PT1H')).toBe(60 * 60 * 1000);
      expect(keyService.parseDuration('P1Y')).toBe(365 * 24 * 60 * 60 * 1000);
    });

    it('should handle complex durations', () => {
      const duration = keyService.parseDuration('P1Y2M3DT4H5M6S');
      const expected = 
        365 * 24 * 60 * 60 * 1000 + // 1 year
        2 * 30 * 24 * 60 * 60 * 1000 + // 2 months
        3 * 24 * 60 * 60 * 1000 + // 3 days
        4 * 60 * 60 * 1000 + // 4 hours
        5 * 60 * 1000 + // 5 minutes
        6 * 1000; // 6 seconds
      
      expect(duration).toBe(expected);
    });

    it('should throw error for invalid duration', () => {
      expect(() => keyService.parseDuration('invalid')).toThrow('Invalid duration format');
    });
  });
});