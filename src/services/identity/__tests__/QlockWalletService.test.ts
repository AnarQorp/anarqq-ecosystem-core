/**
 * QlockWalletService Tests
 * 
 * Tests for the enhanced Qlock integration layer including transaction signing,
 * signature verification, key management, and fallback mechanisms.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QlockWalletService, qlockWalletService } from '../QlockWalletService';
import { identityQlockService } from '../IdentityQlockService';
import * as QlockAPI from '@/api/qlock';
import { IdentityType } from '@/types/identity';

// Mock the dependencies
vi.mock('../IdentityQlockService');
vi.mock('@/api/qlock');

describe('QlockWalletService', () => {
  let service: QlockWalletService;
  
  const mockIdentityId = 'did:squid:root:test-identity';
  const mockTransaction = {
    to: '0x1234567890123456789012345678901234567890',
    value: '1000000000000000000', // 1 ETH in wei
    data: '0x',
    gasLimit: '21000',
    gasPrice: '20000000000',
    nonce: 1,
    chainId: 1,
    identityId: mockIdentityId,
    timestamp: new Date().toISOString()
  };

  const mockKeyPair = {
    publicKey: 'mock_public_key',
    privateKey: 'mock_private_key',
    algorithm: 'QUANTUM' as const,
    keySize: 512,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  const mockTypedData = {
    domain: {
      name: 'Test DApp',
      version: '1',
      chainId: 1,
      verifyingContract: '0x1234567890123456789012345678901234567890'
    },
    types: {
      Person: [
        { name: 'name', type: 'string' },
        { name: 'wallet', type: 'address' }
      ]
    },
    primaryType: 'Person',
    message: {
      name: 'Alice',
      wallet: '0x1234567890123456789012345678901234567890'
    }
  };

  beforeEach(() => {
    service = new QlockWalletService();
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(identityQlockService.getKeysForIdentity).mockResolvedValue(mockKeyPair);
    vi.mocked(identityQlockService.signForIdentity).mockResolvedValue({
      success: true,
      signature: 'mock_signature',
      identityId: mockIdentityId
    });
    vi.mocked(identityQlockService.verifyForIdentity).mockResolvedValue({
      success: true,
      valid: true,
      identityId: mockIdentityId
    });
    vi.mocked(identityQlockService.validateKeyIsolation).mockResolvedValue(true);
    vi.mocked(identityQlockService.rotateKeysForIdentity).mockResolvedValue(true);
    
    vi.mocked(QlockAPI.getAlgorithms).mockResolvedValue({
      algorithms: [
        { id: 'QUANTUM', name: 'Quantum', keySize: 512, quantumResistant: true }
      ]
    });
    vi.mocked(QlockAPI.verify).mockResolvedValue({
      success: true,
      valid: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Transaction Signing', () => {
    it('should successfully sign a transaction', async () => {
      const result = await service.signTransaction(mockIdentityId, mockTransaction);
      
      expect(result.success).toBe(true);
      expect(result.signature).toBe('mock_signature');
      expect(result.identityId).toBe(mockIdentityId);
      expect(result.fallbackUsed).toBe(false);
      expect(result.transactionHash).toBeDefined();
      
      expect(identityQlockService.signForIdentity).toHaveBeenCalledWith(
        mockIdentityId,
        expect.stringContaining(mockTransaction.to)
      );
    });

    it('should handle signing failure and use fallback', async () => {
      // Mock signing failure
      vi.mocked(identityQlockService.signForIdentity).mockResolvedValue({
        success: false,
        error: 'Signing failed',
        identityId: mockIdentityId
      });

      const result = await service.signTransaction(mockIdentityId, mockTransaction);
      
      expect(result.success).toBe(true); // Should succeed with fallback
      expect(result.fallbackUsed).toBe(true);
      expect(result.signature).toBeDefined();
    });

    it('should reject signing for identity without key access', async () => {
      vi.mocked(identityQlockService.getKeysForIdentity).mockResolvedValue(null);
      
      const result = await service.signTransaction(mockIdentityId, mockTransaction);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('access to signing keys');
    });

    it('should handle expired keys', async () => {
      const expiredKeyPair = {
        ...mockKeyPair,
        expiresAt: new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
      };
      vi.mocked(identityQlockService.getKeysForIdentity).mockResolvedValue(expiredKeyPair);
      
      const result = await service.signTransaction(mockIdentityId, mockTransaction);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('access to signing keys');
    });
  });

  describe('Message Signing', () => {
    it('should successfully sign a message', async () => {
      const message = 'Hello, World!';
      const result = await service.signMessage(mockIdentityId, message);
      
      expect(result.success).toBe(true);
      expect(result.signature).toBe('mock_signature');
      expect(result.identityId).toBe(mockIdentityId);
      expect(result.fallbackUsed).toBe(false);
      
      expect(identityQlockService.signForIdentity).toHaveBeenCalledWith(
        mockIdentityId,
        message
      );
    });

    it('should use fallback when Qlock is unavailable', async () => {
      // Mock Qlock unavailability
      vi.mocked(QlockAPI.getAlgorithms).mockRejectedValue(new Error('Service unavailable'));
      
      const message = 'Hello, World!';
      const result = await service.signMessage(mockIdentityId, message);
      
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
    });
  });

  describe('Typed Data Signing', () => {
    it('should successfully sign typed data', async () => {
      const result = await service.signTypedData(mockIdentityId, mockTypedData);
      
      expect(result.success).toBe(true);
      expect(result.signature).toBe('mock_signature');
      expect(result.identityId).toBe(mockIdentityId);
      expect(result.fallbackUsed).toBe(false);
      
      expect(identityQlockService.signForIdentity).toHaveBeenCalledWith(
        mockIdentityId,
        expect.stringContaining('1901') // EIP-712 prefix
      );
    });

    it('should handle typed data signing errors', async () => {
      vi.mocked(identityQlockService.signForIdentity).mockResolvedValue({
        success: false,
        error: 'Invalid typed data',
        identityId: mockIdentityId
      });
      
      const result = await service.signTypedData(mockIdentityId, mockTypedData);
      
      expect(result.success).toBe(true); // Should succeed with fallback
      expect(result.fallbackUsed).toBe(true);
    });
  });

  describe('Signature Verification', () => {
    it('should successfully verify transaction signature', async () => {
      const signature = 'mock_signature';
      const publicKey = 'mock_public_key';
      
      const result = await service.verifyTransactionSignature(
        mockTransaction,
        signature,
        publicKey
      );
      
      expect(result.valid).toBe(true);
      expect(result.identityId).toBe(mockIdentityId);
      expect(result.publicKey).toBe(publicKey);
      expect(result.trustLevel).toBe('HIGH'); // ROOT identity
      
      expect(identityQlockService.verifyForIdentity).toHaveBeenCalledWith(
        mockIdentityId,
        expect.stringContaining(mockTransaction.to),
        signature,
        publicKey
      );
    });

    it('should successfully verify message signature', async () => {
      const message = 'Hello, World!';
      const signature = 'mock_signature';
      const publicKey = 'mock_public_key';
      
      const result = await service.verifyMessageSignature(message, signature, publicKey);
      
      expect(result.valid).toBe(true);
      expect(result.publicKey).toBe(publicKey);
      expect(result.trustLevel).toBe('MEDIUM');
      
      expect(QlockAPI.verify).toHaveBeenCalledWith(message, signature, publicKey);
    });

    it('should handle verification failures', async () => {
      vi.mocked(identityQlockService.verifyForIdentity).mockResolvedValue({
        success: true,
        valid: false,
        error: 'Invalid signature',
        identityId: mockIdentityId
      });
      
      const result = await service.verifyTransactionSignature(
        mockTransaction,
        'invalid_signature',
        'mock_public_key'
      );
      
      expect(result.valid).toBe(false);
      expect(result.trustLevel).toBe('UNTRUSTED');
    });
  });

  describe('Signature Integrity Validation', () => {
    it('should validate signature integrity', async () => {
      const signature = '0x' + 'a'.repeat(128); // Valid hex signature
      
      const result = await service.validateSignatureIntegrity(mockIdentityId, signature);
      
      expect(result).toBe(true);
    });

    it('should reject invalid signature format', async () => {
      const invalidSignature = 'invalid_signature_format';
      
      const result = await service.validateSignatureIntegrity(mockIdentityId, invalidSignature);
      
      expect(result).toBe(false);
    });

    it('should reject signature for identity without keys', async () => {
      vi.mocked(identityQlockService.getKeysForIdentity).mockResolvedValue(null);
      
      const signature = '0x' + 'a'.repeat(128);
      const result = await service.validateSignatureIntegrity(mockIdentityId, signature);
      
      expect(result).toBe(false);
    });
  });

  describe('Key Management', () => {
    it('should get signing keys for identity', async () => {
      const keys = await service.getSigningKeys(mockIdentityId);
      
      expect(keys).toEqual(mockKeyPair);
      expect(identityQlockService.getKeysForIdentity).toHaveBeenCalledWith(mockIdentityId);
    });

    it('should rotate signing keys', async () => {
      const result = await service.rotateSigningKeys(mockIdentityId);
      
      expect(result).toBe(true);
      expect(identityQlockService.rotateKeysForIdentity).toHaveBeenCalledWith(mockIdentityId);
    });

    it('should validate key access', async () => {
      const result = await service.validateKeyAccess(mockIdentityId);
      
      expect(result).toBe(true);
      expect(identityQlockService.getKeysForIdentity).toHaveBeenCalledWith(mockIdentityId);
      expect(identityQlockService.validateKeyIsolation).toHaveBeenCalledWith(mockIdentityId);
    });

    it('should reject key access for expired keys', async () => {
      const expiredKeyPair = {
        ...mockKeyPair,
        expiresAt: new Date(Date.now() - 1000).toISOString()
      };
      vi.mocked(identityQlockService.getKeysForIdentity).mockResolvedValue(expiredKeyPair);
      
      const result = await service.validateKeyAccess(mockIdentityId);
      
      expect(result).toBe(false);
    });
  });

  describe('Service Health and Fallback', () => {
    it('should check service health successfully', async () => {
      const health = await service.checkServiceHealth();
      
      expect(health.available).toBe(true);
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.capabilities).toContain('SIGN');
      expect(QlockAPI.getAlgorithms).toHaveBeenCalled();
    });

    it('should detect service unavailability', async () => {
      vi.mocked(QlockAPI.getAlgorithms).mockRejectedValue(new Error('Service down'));
      
      const health = await service.checkServiceHealth();
      
      expect(health.available).toBe(false);
      expect(health.lastError).toBe('Service down');
      expect(health.errorCount).toBeGreaterThan(0);
    });

    it('should check if Qlock is available', async () => {
      const isAvailable = await service.isQlockAvailable();
      
      expect(isAvailable).toBe(true);
    });

    it('should enable fallback mode', async () => {
      await service.enableFallbackMode();
      
      // Verify fallback mode is active by checking signing behavior
      const result = await service.signMessage(mockIdentityId, 'test');
      expect(result.fallbackUsed).toBe(true);
    });

    it('should disable fallback mode when service is available', async () => {
      await service.enableFallbackMode();
      await service.disableFallbackMode();
      
      // Verify normal mode is restored
      const result = await service.signMessage(mockIdentityId, 'test');
      expect(result.fallbackUsed).toBe(false);
    });

    it('should recover from service failure', async () => {
      // Simulate service failure
      vi.mocked(QlockAPI.getAlgorithms).mockRejectedValue(new Error('Service down'));
      await service.checkServiceHealth();
      
      // Simulate service recovery
      vi.mocked(QlockAPI.getAlgorithms).mockResolvedValue({
        algorithms: [
          { id: 'QUANTUM', name: 'Quantum', keySize: 512, quantumResistant: true }
        ]
      });
      
      const recovered = await service.recoverFromFailure();
      
      expect(recovered).toBe(true);
    });
  });

  describe('Fallback Signing', () => {
    it('should sign with fallback keys', async () => {
      const result = await service.signWithFallback(mockIdentityId, 'test data');
      
      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
      expect(result.method).toBe('EMERGENCY_KEYS');
      expect(result.securityWarning).toContain('emergency keys');
    });

    it('should handle fallback signing failure', async () => {
      // Mock crypto.subtle to fail
      const originalCrypto = global.crypto;
      global.crypto = {
        ...originalCrypto,
        subtle: {
          ...originalCrypto.subtle,
          digest: vi.fn().mockRejectedValue(new Error('Crypto failure'))
        }
      };
      
      const result = await service.signWithFallback(mockIdentityId, 'test data');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Crypto failure');
      
      // Restore crypto
      global.crypto = originalCrypto;
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(identityQlockService.signForIdentity).mockRejectedValue(
        new Error('Network error')
      );
      
      const result = await service.signTransaction(mockIdentityId, mockTransaction);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle invalid transaction data', async () => {
      const invalidTransaction = {
        ...mockTransaction,
        to: 'invalid_address'
      };
      
      const result = await service.signTransaction(mockIdentityId, invalidTransaction);
      
      // Should still attempt to sign but may fail validation
      expect(result).toBeDefined();
      expect(result.identityId).toBe(mockIdentityId);
    });

    it('should handle service timeout', async () => {
      vi.mocked(QlockAPI.getAlgorithms).mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 6000)
        )
      );
      
      const health = await service.checkServiceHealth();
      
      expect(health.available).toBe(false);
      expect(health.lastError).toBe('Timeout');
    });
  });
});