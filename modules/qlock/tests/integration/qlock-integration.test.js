/**
 * Qlock Integration Tests
 * 
 * Tests the complete Qlock module integration including all services.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { QlockModule } from '../../src/index.js';

describe('Qlock Integration Tests', () => {
  let qlock;
  let services;

  beforeAll(async () => {
    // Initialize Qlock module in standalone mode
    qlock = new QlockModule({
      port: 0, // Use random port for testing
      mode: 'standalone',
      pqcEnabled: true,
      auditEnabled: true
    });

    await qlock.initialize();
    services = qlock.getServices();
  });

  afterAll(async () => {
    if (qlock) {
      await qlock.stop();
    }
  });

  describe('Service Integration', () => {
    it('should have all required services initialized', () => {
      expect(services).toHaveProperty('encryption');
      expect(services).toHaveProperty('signature');
      expect(services).toHaveProperty('lock');
      expect(services).toHaveProperty('keyManagement');
      expect(services).toHaveProperty('event');
      expect(services).toHaveProperty('audit');
    });

    it('should have mock services in standalone mode', () => {
      expect(services).toHaveProperty('kms');
      expect(services).toHaveProperty('hsm');
      expect(services).toHaveProperty('squid');
      expect(services).toHaveProperty('qonsent');
    });
  });

  describe('End-to-End Encryption Flow', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const originalData = 'This is a test message for encryption';
      const identityId = 'squid_test_user';

      // Encrypt data
      const encryptResult = await services.encryption.encrypt(originalData, {
        algorithm: 'AES-256-GCM',
        identityId
      });

      expect(encryptResult).toHaveProperty('encryptedData');
      expect(encryptResult).toHaveProperty('keyId');
      expect(encryptResult).toHaveProperty('algorithm', 'AES-256-GCM');

      // Decrypt data
      const decryptResult = await services.encryption.decrypt(encryptResult.encryptedData, {
        keyId: encryptResult.keyId,
        identityId,
        metadata: encryptResult.metadata
      });

      expect(decryptResult.decryptedData).toBe(originalData);
      expect(decryptResult.verified).toBe(true);
    });

    it('should support post-quantum encryption', async () => {
      const originalData = 'Quantum-resistant test data';
      const identityId = 'squid_test_user';

      // Encrypt with Kyber-768
      const encryptResult = await services.encryption.encrypt(originalData, {
        algorithm: 'Kyber-768',
        identityId
      });

      expect(encryptResult.algorithm).toBe('Kyber-768');
      expect(encryptResult.metadata.quantumResistant).toBe(true);

      // Decrypt
      const decryptResult = await services.encryption.decrypt(encryptResult.encryptedData, {
        keyId: encryptResult.keyId,
        identityId,
        metadata: encryptResult.metadata
      });

      expect(decryptResult.decryptedData).toBe(originalData);
    });
  });

  describe('End-to-End Signature Flow', () => {
    it('should sign and verify data successfully', async () => {
      const originalData = 'This is a test message for signing';
      const identityId = 'squid_test_user';

      // Sign data
      const signResult = await services.signature.sign(originalData, {
        algorithm: 'ECDSA-P256',
        identityId
      });

      expect(signResult).toHaveProperty('signature');
      expect(signResult).toHaveProperty('publicKey');
      expect(signResult).toHaveProperty('algorithm', 'ECDSA-P256');

      // Verify signature
      const verifyResult = await services.signature.verify(
        originalData,
        signResult.signature,
        signResult.publicKey,
        {
          algorithm: signResult.algorithm,
          metadata: signResult.metadata
        }
      );

      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.algorithm).toBe('ECDSA-P256');
    });

    it('should support post-quantum signatures', async () => {
      const originalData = 'Quantum-resistant signature test';
      const identityId = 'squid_test_user';

      // Sign with Dilithium-3
      const signResult = await services.signature.sign(originalData, {
        algorithm: 'Dilithium-3',
        identityId
      });

      expect(signResult.algorithm).toBe('Dilithium-3');
      expect(signResult.metadata.quantumResistant).toBe(true);

      // Verify signature
      const verifyResult = await services.signature.verify(
        originalData,
        signResult.signature,
        signResult.publicKey,
        {
          algorithm: signResult.algorithm,
          metadata: signResult.metadata
        }
      );

      expect(verifyResult.valid).toBe(true);
    });
  });

  describe('End-to-End Lock Flow', () => {
    it('should acquire, extend, and release locks', async () => {
      const lockId = 'test_lock_integration';
      const identityId = 'squid_test_user';

      // Acquire lock
      const acquireResult = await services.lock.acquireLock(lockId, identityId, {
        ttl: 30000,
        metadata: { resource: 'test_resource' }
      });

      expect(acquireResult.acquired).toBe(true);
      expect(acquireResult.lockId).toBe(lockId);
      expect(acquireResult.owner).toBe(identityId);

      // Check lock status
      const statusResult = await services.lock.getLockStatus(lockId);
      expect(statusResult.exists).toBe(true);
      expect(statusResult.acquired).toBe(true);
      expect(statusResult.owner).toBe(identityId);

      // Extend lock
      const extendResult = await services.lock.extendLock(lockId, identityId, {
        ttl: 60000
      });

      expect(extendResult.extended).toBe(true);
      expect(extendResult.extension).toBe(60000);

      // Release lock
      const releaseResult = await services.lock.releaseLock(lockId, identityId);
      expect(releaseResult.released).toBe(true);
      expect(releaseResult.reason).toBe('manual');

      // Verify lock is released
      const finalStatus = await services.lock.getLockStatus(lockId);
      expect(finalStatus.exists).toBe(false);
    });

    it('should prevent duplicate lock acquisition', async () => {
      const lockId = 'test_lock_duplicate';
      const identityId1 = 'squid_user_1';
      const identityId2 = 'squid_user_2';

      // First user acquires lock
      const firstAcquire = await services.lock.acquireLock(lockId, identityId1, {
        ttl: 30000
      });
      expect(firstAcquire.acquired).toBe(true);

      // Second user tries to acquire same lock
      await expect(
        services.lock.acquireLock(lockId, identityId2, { ttl: 30000 })
      ).rejects.toThrow();

      // Clean up
      await services.lock.releaseLock(lockId, identityId1);
    });
  });

  describe('Event Publishing', () => {
    it('should publish events for operations', async () => {
      const initialEventCount = services.event.getRecentEvents().length;

      // Perform some operations that should generate events
      const identityId = 'squid_event_test';
      
      // Encryption should publish event
      await services.encryption.encrypt('test data', {
        algorithm: 'AES-256-GCM',
        identityId
      });

      // Lock should publish event
      const lockId = 'test_event_lock';
      await services.lock.acquireLock(lockId, identityId, { ttl: 10000 });
      await services.lock.releaseLock(lockId, identityId);

      // Check that events were published
      const finalEventCount = services.event.getRecentEvents().length;
      expect(finalEventCount).toBeGreaterThan(initialEventCount);

      // Check event statistics
      const stats = services.event.getEventStatistics();
      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.byTopic).toBeDefined();
    });
  });

  describe('Audit Logging', () => {
    it('should log operations for audit', async () => {
      const identityId = 'squid_audit_test';

      // Perform operations that should be audited
      await services.encryption.encrypt('audit test data', {
        algorithm: 'AES-256-GCM',
        identityId
      });

      // Check audit logs
      const auditLogs = services.audit.queryLogs({
        identityId,
        limit: 10
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      
      const encryptionLog = auditLogs.find(log => 
        log.type === 'ENCRYPTION' && log.operation === 'encrypt'
      );
      
      expect(encryptionLog).toBeDefined();
      expect(encryptionLog.actor.squidId).toBe(identityId);
      expect(encryptionLog.verdict).toBe('ALLOW');
    });
  });

  describe('Key Management Integration', () => {
    it('should manage keys across services', async () => {
      const identityId = 'squid_key_test';

      // Generate encryption key
      const encKey = await services.keyManagement.generateKey('AES-256-GCM', identityId);
      expect(encKey).toHaveProperty('keyId');
      expect(encKey.algorithm).toBe('AES-256-GCM');

      // Generate signing key
      const signKey = await services.keyManagement.generateSigningKey('ECDSA-P256', identityId);
      expect(signKey).toHaveProperty('keyId');
      expect(signKey.algorithm).toBe('ECDSA-P256');

      // Retrieve keys
      const retrievedEncKey = await services.keyManagement.getKey(encKey.keyId, identityId);
      expect(retrievedEncKey).toBeDefined();
      expect(retrievedEncKey.keyId).toBe(encKey.keyId);

      const retrievedSignKey = await services.keyManagement.getSigningKey(signKey.keyId, identityId);
      expect(retrievedSignKey).toBeDefined();
      expect(retrievedSignKey.keyId).toBe(signKey.keyId);

      // Check statistics
      const stats = await services.keyManagement.getStatistics();
      expect(stats.encryptionKeys.total).toBeGreaterThan(0);
      expect(stats.signingKeys.total).toBeGreaterThan(0);
    });
  });
});