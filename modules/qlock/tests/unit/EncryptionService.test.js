/**
 * EncryptionService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncryptionService } from '../../src/services/EncryptionService.js';

describe('EncryptionService', () => {
  let encryptionService;
  let mockKeyManagement;

  beforeEach(() => {
    mockKeyManagement = {
      generateKey: vi.fn(),
      getKey: vi.fn()
    };

    encryptionService = new EncryptionService({
      keyManagement: mockKeyManagement,
      pqcEnabled: true
    });
  });

  describe('initialization', () => {
    it('should initialize with key management service', async () => {
      await expect(encryptionService.initialize()).resolves.not.toThrow();
    });

    it('should throw error without key management service', async () => {
      const service = new EncryptionService({});
      await expect(service.initialize()).rejects.toThrow('Key management service is required');
    });
  });

  describe('encryption', () => {
    beforeEach(async () => {
      await encryptionService.initialize();
      
      mockKeyManagement.generateKey.mockResolvedValue({
        keyId: 'test_key_123',
        material: Buffer.from('test-key-material'),
        algorithm: 'AES-256-GCM'
      });
    });

    it('should encrypt data with AES-256-GCM', async () => {
      const data = 'Hello, World!';
      const identityId = 'squid_test_user';

      const result = await encryptionService.encrypt(data, {
        algorithm: 'AES-256-GCM',
        identityId
      });

      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('keyId');
      expect(result).toHaveProperty('algorithm', 'AES-256-GCM');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('quantumResistant', false);
    });

    it('should encrypt data with Kyber-768 when PQC enabled', async () => {
      mockKeyManagement.generateKey.mockResolvedValue({
        keyId: 'test_kyber_key',
        material: Buffer.from('kyber-key-material'),
        publicKey: 'kyber-public-key',
        algorithm: 'Kyber-768'
      });

      const data = 'Quantum-resistant data';
      const identityId = 'squid_test_user';

      const result = await encryptionService.encrypt(data, {
        algorithm: 'Kyber-768',
        identityId
      });

      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('algorithm', 'Kyber-768');
      expect(result.metadata).toHaveProperty('quantumResistant', true);
    });

    it('should throw error for unsupported algorithm', async () => {
      const data = 'test data';
      const identityId = 'squid_test_user';

      await expect(
        encryptionService.encrypt(data, {
          algorithm: 'UNSUPPORTED_ALGO',
          identityId
        })
      ).rejects.toThrow('Unsupported encryption algorithm');
    });

    it('should throw error without identity ID', async () => {
      const data = 'test data';

      await expect(
        encryptionService.encrypt(data, {
          algorithm: 'AES-256-GCM'
        })
      ).rejects.toThrow('Identity ID is required for encryption');
    });
  });

  describe('decryption', () => {
    beforeEach(async () => {
      await encryptionService.initialize();
      
      mockKeyManagement.getKey.mockResolvedValue({
        keyId: 'test_key_123',
        material: Buffer.from('test-key-material'),
        algorithm: 'AES-256-GCM'
      });
    });

    it('should decrypt data successfully', async () => {
      // First encrypt some data
      const originalData = 'Hello, World!';
      const identityId = 'squid_test_user';

      mockKeyManagement.generateKey.mockResolvedValue({
        keyId: 'test_key_123',
        material: Buffer.from('test-key-material'),
        algorithm: 'AES-256-GCM'
      });

      const encryptResult = await encryptionService.encrypt(originalData, {
        algorithm: 'AES-256-GCM',
        identityId
      });

      // Then decrypt it
      const decryptResult = await encryptionService.decrypt(encryptResult.encryptedData, {
        keyId: encryptResult.keyId,
        identityId,
        metadata: encryptResult.metadata
      });

      expect(decryptResult).toHaveProperty('decryptedData', originalData);
      expect(decryptResult).toHaveProperty('verified', true);
    });

    it('should throw error without required parameters', async () => {
      await expect(
        encryptionService.decrypt('encrypted-data', {})
      ).rejects.toThrow('Key ID, identity ID, and metadata are required for decryption');
    });
  });

  describe('supported algorithms', () => {
    beforeEach(async () => {
      await encryptionService.initialize();
    });

    it('should return supported algorithms', () => {
      const algorithms = encryptionService.getSupportedAlgorithms();
      
      expect(algorithms).toBeInstanceOf(Array);
      expect(algorithms.length).toBeGreaterThan(0);
      
      const aes = algorithms.find(a => a.name === 'AES-256-GCM');
      expect(aes).toBeDefined();
      expect(aes.quantumResistant).toBe(false);
      
      const kyber = algorithms.find(a => a.name === 'Kyber-768');
      expect(kyber).toBeDefined();
      expect(kyber.quantumResistant).toBe(true);
    });
  });

  describe('health check', () => {
    beforeEach(async () => {
      await encryptionService.initialize();
    });

    it('should return health status', async () => {
      const health = await encryptionService.healthCheck();
      
      expect(health).toHaveProperty('status', 'healthy');
      expect(health).toHaveProperty('algorithms');
      expect(health).toHaveProperty('pqcEnabled', true);
    });
  });
});