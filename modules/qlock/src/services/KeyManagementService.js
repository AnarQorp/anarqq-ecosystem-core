/**
 * Key Management Service
 * 
 * Provides secure key generation, storage, rotation, and access control
 * with KMS/HSM integration and post-quantum cryptographic support.
 */

import crypto from 'crypto';

export class KeyManagementService {
  constructor(options = {}) {
    this.kms = options.kms;
    this.hsm = options.hsm;
    this.pqcEnabled = options.pqcEnabled || false;
    
    // Key storage (in production, this would be in KMS/HSM)
    this.keys = new Map();
    this.signingKeys = new Map();
    
    // Key rotation schedules
    this.rotationSchedules = {
      development: 24 * 60 * 60 * 1000, // 1 day
      staging: 7 * 24 * 60 * 60 * 1000, // 1 week
      production: 30 * 24 * 60 * 60 * 1000 // 1 month
    };
    
    this.environment = process.env.NODE_ENV || 'development';
    this.rotationInterval = null;
  }

  async initialize() {
    console.log('[KeyManagementService] Initializing...');
    
    if (!this.kms) {
      throw new Error('KMS service is required');
    }
    
    // Initialize KMS/HSM connections
    await this.kms.initialize();
    
    if (this.hsm) {
      await this.hsm.initialize();
    }
    
    // Start key rotation scheduler
    this.startKeyRotationScheduler();
    
    console.log(`[KeyManagementService] Initialized for ${this.environment} environment`);
    console.log(`[KeyManagementService] Key rotation interval: ${this.rotationSchedules[this.environment]}ms`);
  }

  /**
   * Generate encryption key
   */
  async generateKey(algorithm, identityId, options = {}) {
    const keyId = this.generateKeyId(algorithm, identityId);
    
    try {
      let keyMaterial;
      let publicKey = null;
      
      // Generate key based on algorithm
      switch (algorithm) {
        case 'AES-256-GCM':
        case 'ChaCha20-Poly1305':
          keyMaterial = await this.generateSymmetricKey(algorithm);
          break;
          
        case 'Kyber-768':
          if (!this.pqcEnabled) {
            throw new Error('Post-quantum cryptography is not enabled');
          }
          const kyberKeys = await this.generateKyberKeys();
          keyMaterial = kyberKeys.privateKey;
          publicKey = kyberKeys.publicKey;
          break;
          
        default:
          throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
      }
      
      // Store key in KMS
      await this.kms.storeKey(keyId, keyMaterial, {
        algorithm,
        identityId,
        keyType: 'encryption',
        environment: this.environment,
        createdAt: new Date().toISOString()
      });
      
      // Create key metadata
      const keyData = {
        keyId,
        algorithm,
        identityId,
        keyType: 'encryption',
        material: keyMaterial,
        publicKey,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        usageCount: 0,
        rotationDue: new Date(Date.now() + this.rotationSchedules[this.environment]).toISOString()
      };
      
      this.keys.set(keyId, keyData);
      
      console.log(`[KeyManagementService] Generated encryption key: ${keyId} for ${identityId}`);
      
      return keyData;
      
    } catch (error) {
      console.error('[KeyManagementService] Key generation failed:', error);
      throw new Error(`Key generation failed: ${error.message}`);
    }
  }

  /**
   * Generate signing key
   */
  async generateSigningKey(algorithm, identityId, options = {}) {
    const keyId = this.generateKeyId(algorithm, identityId, 'signing');
    
    try {
      let keyPair;
      
      // Generate key pair based on algorithm
      switch (algorithm) {
        case 'ECDSA-P256':
          keyPair = await this.generateECDSAKeys();
          break;
          
        case 'RSA-PSS':
          keyPair = await this.generateRSAKeys();
          break;
          
        case 'Dilithium-3':
          if (!this.pqcEnabled) {
            throw new Error('Post-quantum cryptography is not enabled');
          }
          keyPair = await this.generateDilithiumKeys();
          break;
          
        case 'Falcon-512':
          if (!this.pqcEnabled) {
            throw new Error('Post-quantum cryptography is not enabled');
          }
          keyPair = await this.generateFalconKeys();
          break;
          
        default:
          throw new Error(`Unsupported signature algorithm: ${algorithm}`);
      }
      
      // Store private key in KMS/HSM
      const storageService = this.hsm || this.kms;
      await storageService.storeKey(keyId, keyPair.privateKey, {
        algorithm,
        identityId,
        keyType: 'signing',
        environment: this.environment,
        createdAt: new Date().toISOString()
      });
      
      // Create key metadata
      const keyData = {
        keyId,
        algorithm,
        identityId,
        keyType: 'signing',
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        usageCount: 0,
        rotationDue: new Date(Date.now() + this.rotationSchedules[this.environment]).toISOString()
      };
      
      this.signingKeys.set(keyId, keyData);
      
      console.log(`[KeyManagementService] Generated signing key: ${keyId} for ${identityId}`);
      
      return keyData;
      
    } catch (error) {
      console.error('[KeyManagementService] Signing key generation failed:', error);
      throw new Error(`Signing key generation failed: ${error.message}`);
    }
  }

  /**
   * Get encryption key
   */
  async getKey(keyId, identityId = null) {
    const keyData = this.keys.get(keyId);
    
    if (!keyData) {
      // Try to load from KMS
      try {
        const kmsKey = await this.kms.getKey(keyId);
        if (kmsKey) {
          this.keys.set(keyId, kmsKey);
          return kmsKey;
        }
      } catch (error) {
        console.error('[KeyManagementService] Failed to load key from KMS:', error);
      }
      
      return null;
    }
    
    // Verify access if identity is provided
    if (identityId && keyData.identityId !== identityId) {
      console.warn(`[KeyManagementService] Access denied: ${identityId} cannot access key ${keyId}`);
      return null;
    }
    
    // Update usage statistics
    keyData.lastUsed = new Date().toISOString();
    keyData.usageCount++;
    
    return keyData;
  }

  /**
   * Get signing key
   */
  async getSigningKey(keyId, identityId = null) {
    const keyData = this.signingKeys.get(keyId);
    
    if (!keyData) {
      // Try to load from KMS/HSM
      try {
        const storageService = this.hsm || this.kms;
        const storedKey = await storageService.getKey(keyId);
        if (storedKey) {
          this.signingKeys.set(keyId, storedKey);
          return storedKey;
        }
      } catch (error) {
        console.error('[KeyManagementService] Failed to load signing key:', error);
      }
      
      return null;
    }
    
    // Verify access if identity is provided
    if (identityId && keyData.identityId !== identityId) {
      console.warn(`[KeyManagementService] Access denied: ${identityId} cannot access signing key ${keyId}`);
      return null;
    }
    
    // Update usage statistics
    keyData.lastUsed = new Date().toISOString();
    keyData.usageCount++;
    
    return keyData;
  }

  /**
   * Rotate keys that are due for rotation
   */
  async rotateKeys() {
    const now = Date.now();
    let rotatedCount = 0;
    
    // Rotate encryption keys
    for (const [keyId, keyData] of this.keys.entries()) {
      const rotationDue = new Date(keyData.rotationDue).getTime();
      
      if (now >= rotationDue) {
        try {
          await this.rotateKey(keyId, keyData);
          rotatedCount++;
        } catch (error) {
          console.error(`[KeyManagementService] Failed to rotate key ${keyId}:`, error);
        }
      }
    }
    
    // Rotate signing keys
    for (const [keyId, keyData] of this.signingKeys.entries()) {
      const rotationDue = new Date(keyData.rotationDue).getTime();
      
      if (now >= rotationDue) {
        try {
          await this.rotateSigningKey(keyId, keyData);
          rotatedCount++;
        } catch (error) {
          console.error(`[KeyManagementService] Failed to rotate signing key ${keyId}:`, error);
        }
      }
    }
    
    if (rotatedCount > 0) {
      console.log(`[KeyManagementService] Rotated ${rotatedCount} keys`);
    }
    
    return rotatedCount;
  }

  /**
   * Rotate a specific encryption key
   */
  async rotateKey(keyId, oldKeyData) {
    const newKeyId = this.generateKeyId(oldKeyData.algorithm, oldKeyData.identityId);
    
    // Generate new key
    const newKeyData = await this.generateKey(oldKeyData.algorithm, oldKeyData.identityId);
    
    // Mark old key as rotated
    oldKeyData.rotated = true;
    oldKeyData.rotatedAt = new Date().toISOString();
    oldKeyData.replacedBy = newKeyId;
    
    // Keep old key for a grace period (for decryption of old data)
    setTimeout(() => {
      this.keys.delete(keyId);
      this.kms.deleteKey(keyId);
    }, 7 * 24 * 60 * 60 * 1000); // 7 days grace period
    
    console.log(`[KeyManagementService] Rotated encryption key: ${keyId} -> ${newKeyId}`);
    
    return newKeyData;
  }

  /**
   * Rotate a specific signing key
   */
  async rotateSigningKey(keyId, oldKeyData) {
    const newKeyId = this.generateKeyId(oldKeyData.algorithm, oldKeyData.identityId, 'signing');
    
    // Generate new signing key
    const newKeyData = await this.generateSigningKey(oldKeyData.algorithm, oldKeyData.identityId);
    
    // Mark old key as rotated
    oldKeyData.rotated = true;
    oldKeyData.rotatedAt = new Date().toISOString();
    oldKeyData.replacedBy = newKeyId;
    
    // Keep old key for verification of old signatures
    setTimeout(() => {
      this.signingKeys.delete(keyId);
      const storageService = this.hsm || this.kms;
      storageService.deleteKey(keyId);
    }, 30 * 24 * 60 * 60 * 1000); // 30 days grace period
    
    console.log(`[KeyManagementService] Rotated signing key: ${keyId} -> ${newKeyId}`);
    
    return newKeyData;
  }

  /**
   * Generate symmetric key
   */
  async generateSymmetricKey(algorithm) {
    const keySize = algorithm === 'AES-256-GCM' ? 32 : 32; // 256 bits
    return crypto.randomBytes(keySize);
  }

  /**
   * Generate ECDSA key pair (mock implementation)
   */
  async generateECDSAKeys() {
    // Mock ECDSA key generation
    const privateKey = crypto.randomBytes(32).toString('hex');
    const publicKey = crypto.createHash('sha256').update(privateKey).digest('hex');
    
    return { privateKey, publicKey };
  }

  /**
   * Generate RSA key pair (mock implementation)
   */
  async generateRSAKeys() {
    // Mock RSA key generation
    const privateKey = crypto.randomBytes(256).toString('hex'); // 2048-bit equivalent
    const publicKey = crypto.createHash('sha256').update(privateKey).digest('hex');
    
    return { privateKey, publicKey };
  }

  /**
   * Generate Kyber key pair (mock implementation)
   */
  async generateKyberKeys() {
    console.log('[KeyManagementService] Generating mock Kyber-768 keys');
    
    // Mock post-quantum key generation
    const privateKey = crypto.randomBytes(1632); // Kyber-768 private key size
    const publicKey = crypto.randomBytes(1184); // Kyber-768 public key size
    
    return { 
      privateKey: privateKey.toString('hex'), 
      publicKey: publicKey.toString('hex') 
    };
  }

  /**
   * Generate Dilithium key pair (mock implementation)
   */
  async generateDilithiumKeys() {
    console.log('[KeyManagementService] Generating mock Dilithium-3 keys');
    
    // Mock post-quantum signature key generation
    const privateKey = crypto.randomBytes(4000); // Dilithium-3 private key size
    const publicKey = crypto.randomBytes(1952); // Dilithium-3 public key size
    
    return { 
      privateKey: privateKey.toString('hex'), 
      publicKey: publicKey.toString('hex') 
    };
  }

  /**
   * Generate Falcon key pair (mock implementation)
   */
  async generateFalconKeys() {
    console.log('[KeyManagementService] Generating mock Falcon-512 keys');
    
    // Mock post-quantum signature key generation
    const privateKey = crypto.randomBytes(1281); // Falcon-512 private key size
    const publicKey = crypto.randomBytes(897); // Falcon-512 public key size
    
    return { 
      privateKey: privateKey.toString('hex'), 
      publicKey: publicKey.toString('hex') 
    };
  }

  /**
   * Generate unique key ID
   */
  generateKeyId(algorithm, identityId, keyType = 'encryption') {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const data = `${algorithm}:${identityId}:${keyType}:${timestamp}:${random}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    
    return `qlock_${keyType}_${hash.substring(0, 16)}`;
  }

  /**
   * Start key rotation scheduler
   */
  startKeyRotationScheduler() {
    const rotationInterval = this.rotationSchedules[this.environment];
    const checkInterval = Math.min(rotationInterval / 10, 60 * 60 * 1000); // Check every hour max
    
    this.rotationInterval = setInterval(async () => {
      try {
        await this.rotateKeys();
      } catch (error) {
        console.error('[KeyManagementService] Key rotation scheduler error:', error);
      }
    }, checkInterval);
    
    console.log(`[KeyManagementService] Key rotation scheduler started (check interval: ${checkInterval}ms)`);
  }

  /**
   * Get key statistics
   */
  async getStatistics() {
    const encryptionKeys = Array.from(this.keys.values());
    const signingKeys = Array.from(this.signingKeys.values());
    
    const stats = {
      encryptionKeys: {
        total: encryptionKeys.length,
        byAlgorithm: {},
        totalUsage: 0
      },
      signingKeys: {
        total: signingKeys.length,
        byAlgorithm: {},
        totalUsage: 0
      },
      environment: this.environment,
      rotationInterval: this.rotationSchedules[this.environment]
    };
    
    // Analyze encryption keys
    encryptionKeys.forEach(key => {
      stats.encryptionKeys.byAlgorithm[key.algorithm] = 
        (stats.encryptionKeys.byAlgorithm[key.algorithm] || 0) + 1;
      stats.encryptionKeys.totalUsage += key.usageCount;
    });
    
    // Analyze signing keys
    signingKeys.forEach(key => {
      stats.signingKeys.byAlgorithm[key.algorithm] = 
        (stats.signingKeys.byAlgorithm[key.algorithm] || 0) + 1;
      stats.signingKeys.totalUsage += key.usageCount;
    });
    
    return stats;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = await this.getStatistics();
    
    return {
      status: 'healthy',
      kmsConnected: await this.kms.healthCheck(),
      hsmConnected: this.hsm ? await this.hsm.healthCheck() : false,
      statistics: stats,
      pqcEnabled: this.pqcEnabled
    };
  }

  /**
   * Shutdown cleanup
   */
  async shutdown() {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }
    
    console.log('[KeyManagementService] Shutdown complete');
  }
}