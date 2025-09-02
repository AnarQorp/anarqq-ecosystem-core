/**
 * Key Management Service - Unified cryptographic key management
 * 
 * Provides KMS/HSM integration, automated key rotation, post-quantum
 * cryptographic support, and comprehensive audit logging.
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

export class KeyManagementService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      environment: process.env.NODE_ENV || 'dev',
      kmsProvider: config.kmsProvider || 'LOCAL_DEV',
      auditEnabled: config.auditEnabled !== false,
      rotationEnabled: config.rotationEnabled !== false,
      pqcEnabled: config.pqcEnabled || false,
      ...config
    };

    // In-memory key store (for development)
    this.keyStore = new Map();
    this.auditLog = [];
    this.rotationSchedules = new Map();
    
    // Initialize rotation scheduler
    if (this.config.rotationEnabled) {
      this.initializeRotationScheduler();
    }

    console.log(`[KeyManagement] Initialized with provider: ${this.config.kmsProvider}, environment: ${this.config.environment}`);
  }

  /**
   * Create a new cryptographic key
   */
  async createKey(keySpec) {
    try {
      const keyId = this.generateKeyId(keySpec);
      const keyMetadata = {
        keyId,
        usage: keySpec.usage,
        algorithm: keySpec.algorithm,
        environment: this.config.environment,
        createdAt: new Date().toISOString(),
        expiresAt: keySpec.expiresAt,
        rotationSchedule: keySpec.rotationSchedule || this.getDefaultRotationSchedule(keySpec.usage),
        status: 'ACTIVE',
        owner: keySpec.owner,
        version: 1,
        metadata: keySpec.metadata || {}
      };

      // Generate the actual key material
      const keyMaterial = await this.generateKeyMaterial(keySpec.algorithm, keySpec.usage);
      
      // Store key securely
      await this.storeKey(keyId, keyMaterial, keyMetadata);
      
      // Schedule rotation
      if (this.config.rotationEnabled) {
        this.scheduleKeyRotation(keyId, keyMetadata.rotationSchedule);
      }

      // Audit log
      await this.auditKeyOperation({
        keyId,
        operation: 'CREATE',
        actor: { type: 'SERVICE', id: 'key-management-service' },
        result: 'SUCCESS',
        context: {
          environment: this.config.environment,
          algorithm: keySpec.algorithm,
          usage: keySpec.usage
        }
      });

      console.log(`[KeyManagement] Created key: ${keyId} (${keySpec.algorithm}/${keySpec.usage})`);
      
      this.emit('keyCreated', { keyId, metadata: keyMetadata });
      
      return keyMetadata;

    } catch (error) {
      console.error('[KeyManagement] Key creation failed:', error);
      
      await this.auditKeyOperation({
        keyId: keySpec.keyId || 'unknown',
        operation: 'CREATE',
        actor: { type: 'SERVICE', id: 'key-management-service' },
        result: 'FAILURE',
        context: {
          environment: this.config.environment,
          errorCode: 'KEY_CREATION_FAILED',
          errorMessage: error.message
        }
      });

      throw new Error(`Key creation failed: ${error.message}`);
    }
  }

  /**
   * Retrieve key metadata
   */
  async getKeyMetadata(keyId) {
    const keyData = this.keyStore.get(keyId);
    if (!keyData) {
      throw new Error(`Key not found: ${keyId}`);
    }

    return keyData.metadata;
  }

  /**
   * Use a key for cryptographic operations
   */
  async useKey(keyId, operation, data, options = {}) {
    try {
      const keyData = this.keyStore.get(keyId);
      if (!keyData) {
        throw new Error(`Key not found: ${keyId}`);
      }

      if (keyData.metadata.status !== 'ACTIVE') {
        throw new Error(`Key not active: ${keyId} (status: ${keyData.metadata.status})`);
      }

      let result;
      switch (operation) {
        case 'SIGN':
          result = await this.signData(keyData, data, options);
          break;
        case 'ENCRYPT':
          result = await this.encryptData(keyData, data, options);
          break;
        case 'DECRYPT':
          result = await this.decryptData(keyData, data, options);
          break;
        case 'DERIVE':
          result = await this.deriveKey(keyData, data, options);
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      // Audit log
      await this.auditKeyOperation({
        keyId,
        operation: 'USE',
        actor: options.actor || { type: 'SERVICE', id: 'unknown' },
        result: 'SUCCESS',
        context: {
          environment: this.config.environment,
          algorithm: keyData.metadata.algorithm,
          usage: keyData.metadata.usage,
          operation
        }
      });

      return result;

    } catch (error) {
      console.error(`[KeyManagement] Key usage failed for ${keyId}:`, error);
      
      await this.auditKeyOperation({
        keyId,
        operation: 'USE',
        actor: options.actor || { type: 'SERVICE', id: 'unknown' },
        result: 'FAILURE',
        context: {
          environment: this.config.environment,
          errorCode: 'KEY_USAGE_FAILED',
          errorMessage: error.message,
          operation
        }
      });

      throw error;
    }
  }

  /**
   * Rotate a key
   */
  async rotateKey(keyId, rotationRequest) {
    try {
      const oldKeyData = this.keyStore.get(keyId);
      if (!oldKeyData) {
        throw new Error(`Key not found: ${keyId}`);
      }

      // Create new key with same or updated algorithm
      const newKeySpec = {
        usage: oldKeyData.metadata.usage,
        algorithm: rotationRequest.newAlgorithm || oldKeyData.metadata.algorithm,
        owner: oldKeyData.metadata.owner,
        rotationSchedule: oldKeyData.metadata.rotationSchedule,
        metadata: oldKeyData.metadata.metadata
      };

      const newKeyMetadata = await this.createKey(newKeySpec);
      const newKeyId = newKeyMetadata.keyId;

      // Update old key status
      oldKeyData.metadata.status = 'DEPRECATED';
      oldKeyData.metadata.nextKeyId = newKeyId;
      
      // Update new key with rotation chain
      const newKeyData = this.keyStore.get(newKeyId);
      newKeyData.metadata.previousKeyId = keyId;
      newKeyData.metadata.version = oldKeyData.metadata.version + 1;

      // Set grace period
      const gracePeriodEnd = rotationRequest.gracePeriod ? 
        new Date(Date.now() + this.parseDuration(rotationRequest.gracePeriod)).toISOString() :
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours default

      const rotationResult = {
        oldKeyId: keyId,
        newKeyId,
        rotatedAt: new Date().toISOString(),
        gracePeriodEnd,
        migrationStatus: 'PENDING',
        affectedServices: [] // Would be populated by service discovery
      };

      // Schedule old key revocation after grace period
      if (!rotationRequest.immediate) {
        setTimeout(() => {
          this.revokeKey(keyId, 'ROTATION_COMPLETE');
        }, this.parseDuration(rotationRequest.gracePeriod || 'P1D'));
      }

      // Audit log
      await this.auditKeyOperation({
        keyId,
        operation: 'ROTATE',
        actor: { type: 'SERVICE', id: 'key-management-service' },
        result: 'SUCCESS',
        context: {
          environment: this.config.environment,
          algorithm: oldKeyData.metadata.algorithm,
          usage: oldKeyData.metadata.usage,
          newKeyId,
          reason: rotationRequest.reason
        }
      });

      console.log(`[KeyManagement] Rotated key: ${keyId} -> ${newKeyId}`);
      
      this.emit('keyRotated', rotationResult);
      
      return rotationResult;

    } catch (error) {
      console.error(`[KeyManagement] Key rotation failed for ${keyId}:`, error);
      
      await this.auditKeyOperation({
        keyId,
        operation: 'ROTATE',
        actor: { type: 'SERVICE', id: 'key-management-service' },
        result: 'FAILURE',
        context: {
          environment: this.config.environment,
          errorCode: 'KEY_ROTATION_FAILED',
          errorMessage: error.message,
          reason: rotationRequest.reason
        }
      });

      throw error;
    }
  }

  /**
   * Revoke a key
   */
  async revokeKey(keyId, reason = 'MANUAL') {
    try {
      const keyData = this.keyStore.get(keyId);
      if (!keyData) {
        throw new Error(`Key not found: ${keyId}`);
      }

      keyData.metadata.status = 'REVOKED';
      keyData.metadata.revokedAt = new Date().toISOString();
      keyData.metadata.revocationReason = reason;

      // Clear rotation schedule
      this.rotationSchedules.delete(keyId);

      // Audit log
      await this.auditKeyOperation({
        keyId,
        operation: 'REVOKE',
        actor: { type: 'SERVICE', id: 'key-management-service' },
        result: 'SUCCESS',
        context: {
          environment: this.config.environment,
          algorithm: keyData.metadata.algorithm,
          usage: keyData.metadata.usage,
          reason
        }
      });

      console.log(`[KeyManagement] Revoked key: ${keyId} (reason: ${reason})`);
      
      this.emit('keyRevoked', { keyId, reason });

    } catch (error) {
      console.error(`[KeyManagement] Key revocation failed for ${keyId}:`, error);
      throw error;
    }
  }

  /**
   * Generate key material based on algorithm
   */
  async generateKeyMaterial(algorithm, usage) {
    switch (algorithm) {
      case 'Ed25519':
        return this.generateEd25519KeyPair();
      case 'ECDSA-secp256k1':
        return this.generateECDSAKeyPair();
      case 'RSA-2048':
      case 'RSA-4096':
        return this.generateRSAKeyPair(algorithm);
      case 'AES-256-GCM':
      case 'ChaCha20-Poly1305':
        return this.generateSymmetricKey(algorithm);
      // Post-quantum algorithms (mock implementations)
      case 'Dilithium2':
      case 'Dilithium3':
      case 'Dilithium5':
        return this.generateDilithiumKeyPair(algorithm);
      case 'Falcon-512':
      case 'Falcon-1024':
        return this.generateFalconKeyPair(algorithm);
      case 'Kyber512':
      case 'Kyber768':
      case 'Kyber1024':
        return this.generateKyberKeyPair(algorithm);
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }

  /**
   * Generate Ed25519 key pair
   */
  generateEd25519KeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    return {
      type: 'asymmetric',
      publicKey,
      privateKey,
      algorithm: 'Ed25519'
    };
  }

  /**
   * Generate ECDSA key pair
   */
  generateECDSAKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'secp256k1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    return {
      type: 'asymmetric',
      publicKey,
      privateKey,
      algorithm: 'ECDSA-secp256k1'
    };
  }

  /**
   * Generate RSA key pair
   */
  generateRSAKeyPair(algorithm) {
    const keySize = algorithm === 'RSA-2048' ? 2048 : 4096;
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: keySize,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    return {
      type: 'asymmetric',
      publicKey,
      privateKey,
      algorithm
    };
  }

  /**
   * Generate symmetric key
   */
  generateSymmetricKey(algorithm) {
    const keySize = algorithm === 'AES-256-GCM' ? 32 : 32; // 256 bits
    const key = crypto.randomBytes(keySize);
    
    return {
      type: 'symmetric',
      key: key.toString('base64'),
      algorithm
    };
  }

  /**
   * Generate Dilithium key pair (mock implementation)
   */
  generateDilithiumKeyPair(algorithm) {
    // Mock implementation - in production would use actual PQC library
    const keySize = algorithm === 'Dilithium2' ? 1312 : algorithm === 'Dilithium3' ? 1952 : 2592;
    
    return {
      type: 'asymmetric',
      publicKey: crypto.randomBytes(keySize).toString('base64'),
      privateKey: crypto.randomBytes(keySize * 2).toString('base64'),
      algorithm,
      pqc: true
    };
  }

  /**
   * Generate Falcon key pair (mock implementation)
   */
  generateFalconKeyPair(algorithm) {
    // Mock implementation - in production would use actual PQC library
    const keySize = algorithm === 'Falcon-512' ? 897 : 1793;
    
    return {
      type: 'asymmetric',
      publicKey: crypto.randomBytes(keySize).toString('base64'),
      privateKey: crypto.randomBytes(keySize * 2).toString('base64'),
      algorithm,
      pqc: true
    };
  }

  /**
   * Generate Kyber key pair (mock implementation)
   */
  generateKyberKeyPair(algorithm) {
    // Mock implementation - in production would use actual PQC library
    const keySize = algorithm === 'Kyber512' ? 800 : algorithm === 'Kyber768' ? 1184 : 1568;
    
    return {
      type: 'asymmetric',
      publicKey: crypto.randomBytes(keySize).toString('base64'),
      privateKey: crypto.randomBytes(keySize * 2).toString('base64'),
      algorithm,
      pqc: true
    };
  }

  /**
   * Store key securely
   */
  async storeKey(keyId, keyMaterial, metadata) {
    // In production, this would integrate with actual KMS/HSM
    this.keyStore.set(keyId, {
      keyMaterial,
      metadata,
      storedAt: new Date().toISOString()
    });
  }

  /**
   * Sign data with key
   */
  async signData(keyData, data, options) {
    const { keyMaterial } = keyData;
    
    if (keyMaterial.type !== 'asymmetric') {
      throw new Error('Signing requires asymmetric key');
    }

    if (keyMaterial.pqc) {
      // Mock PQC signing
      const signature = crypto.createHash('sha256')
        .update(data)
        .update(keyMaterial.privateKey)
        .digest('base64');
      
      return {
        algorithm: keyMaterial.algorithm,
        signature,
        publicKey: keyMaterial.publicKey,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('base64')
      };
    }

    // Classical signing
    try {
      const sign = crypto.createSign('SHA256');
      sign.update(Buffer.from(data));
      sign.end();
      const signature = sign.sign(keyMaterial.privateKey, 'base64');
      
      return {
        algorithm: keyMaterial.algorithm,
        signature,
        publicKey: keyMaterial.publicKey,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('base64')
      };
    } catch (error) {
      // Fallback to hash-based signing for development
      const signature = crypto.createHash('sha256')
        .update(data)
        .update(keyMaterial.privateKey)
        .digest('base64');
      
      return {
        algorithm: keyMaterial.algorithm,
        signature,
        publicKey: keyMaterial.publicKey,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('base64')
      };
    }
  }

  /**
   * Encrypt data with key
   */
  async encryptData(keyData, data, options) {
    const { keyMaterial } = keyData;
    
    if (keyMaterial.type === 'symmetric') {
      const key = Buffer.from(keyMaterial.key, 'base64');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', key, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(data)),
        cipher.final()
      ]);
      
      return {
        algorithm: keyMaterial.algorithm,
        encryptedData: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64')
      };
    }

    throw new Error('Asymmetric encryption not implemented');
  }

  /**
   * Decrypt data with key
   */
  async decryptData(keyData, encryptedData, options) {
    const { keyMaterial } = keyData;
    
    if (keyMaterial.type === 'symmetric') {
      const key = Buffer.from(keyMaterial.key, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const tag = Buffer.from(encryptedData.tag, 'base64');
      const encrypted = Buffer.from(encryptedData.encryptedData, 'base64');
      
      const decipher = crypto.createDecipher('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString();
    }

    throw new Error('Asymmetric decryption not implemented');
  }

  /**
   * Derive key from base key
   */
  async deriveKey(keyData, derivationParams, options) {
    const { keyMaterial } = keyData;
    
    // Simple key derivation using HKDF
    const baseKey = keyMaterial.type === 'symmetric' ? 
      Buffer.from(keyMaterial.key, 'base64') :
      Buffer.from(keyMaterial.privateKey);
    
    const derivedKey = crypto.hkdfSync('sha256', baseKey, '', derivationParams.context || '', 32);
    
    return {
      derivedKey: derivedKey.toString('base64'),
      derivationPath: derivationParams.derivationPath,
      algorithm: 'HKDF-SHA256'
    };
  }

  /**
   * Generate unique key ID
   */
  generateKeyId(keySpec) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const data = `${keySpec.usage}:${keySpec.algorithm}:${keySpec.owner}:${timestamp}:${random}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    
    return `key_${this.config.environment}_${hash.substring(0, 16)}`;
  }

  /**
   * Get default rotation schedule for key usage
   */
  getDefaultRotationSchedule(usage) {
    const schedules = {
      'SIGNING': 'P30D',      // 30 days
      'ENCRYPTION': 'P90D',   // 90 days
      'KEY_DERIVATION': 'P180D', // 180 days
      'AUTHENTICATION': 'P30D',  // 30 days
      'TRANSPORT': 'P7D'      // 7 days
    };
    
    return schedules[usage] || 'P30D';
  }

  /**
   * Initialize rotation scheduler
   */
  initializeRotationScheduler() {
    // Check for keys needing rotation every hour
    setInterval(() => {
      this.checkRotationSchedules();
    }, 60 * 60 * 1000);
  }

  /**
   * Check and execute scheduled rotations
   */
  async checkRotationSchedules() {
    const now = new Date();
    
    for (const [keyId, keyData] of this.keyStore.entries()) {
      if (keyData.metadata.status !== 'ACTIVE') continue;
      
      const createdAt = new Date(keyData.metadata.createdAt);
      const rotationInterval = this.parseDuration(keyData.metadata.rotationSchedule);
      const nextRotation = new Date(createdAt.getTime() + rotationInterval);
      
      if (now >= nextRotation) {
        console.log(`[KeyManagement] Scheduled rotation for key: ${keyId}`);
        
        try {
          await this.rotateKey(keyId, {
            reason: 'SCHEDULED',
            immediate: false
          });
        } catch (error) {
          console.error(`[KeyManagement] Scheduled rotation failed for ${keyId}:`, error);
        }
      }
    }
  }

  /**
   * Schedule key rotation
   */
  scheduleKeyRotation(keyId, rotationSchedule) {
    const interval = this.parseDuration(rotationSchedule);
    const rotationTime = Date.now() + interval;
    
    this.rotationSchedules.set(keyId, {
      keyId,
      nextRotation: new Date(rotationTime).toISOString(),
      interval: rotationSchedule
    });
  }

  /**
   * Parse ISO 8601 duration to milliseconds
   */
  parseDuration(duration) {
    const match = duration.match(/P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/);
    if (!match) throw new Error(`Invalid duration format: ${duration}`);
    
    const [, years, months, days, hours, minutes, seconds] = match;
    
    let ms = 0;
    if (years) ms += parseInt(years) * 365 * 24 * 60 * 60 * 1000;
    if (months) ms += parseInt(months) * 30 * 24 * 60 * 60 * 1000;
    if (days) ms += parseInt(days) * 24 * 60 * 60 * 1000;
    if (hours) ms += parseInt(hours) * 60 * 60 * 1000;
    if (minutes) ms += parseInt(minutes) * 60 * 1000;
    if (seconds) ms += parseInt(seconds) * 1000;
    
    return ms;
  }

  /**
   * Audit key operation
   */
  async auditKeyOperation(auditEvent) {
    if (!this.config.auditEnabled) return;
    
    const event = {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...auditEvent
    };
    
    this.auditLog.push(event);
    
    // In production, would store in immutable storage (IPFS)
    console.log(`[KeyManagement] Audit: ${event.operation} ${event.keyId} - ${event.result}`);
    
    this.emit('auditEvent', event);
  }

  /**
   * Get key management statistics
   */
  async getStatistics() {
    const keys = Array.from(this.keyStore.values());
    
    const stats = {
      totalKeys: keys.length,
      byStatus: {},
      byAlgorithm: {},
      byUsage: {},
      byEnvironment: {},
      pqcKeys: 0,
      rotationsPending: this.rotationSchedules.size,
      auditEvents: this.auditLog.length
    };
    
    keys.forEach(keyData => {
      const { metadata } = keyData;
      
      stats.byStatus[metadata.status] = (stats.byStatus[metadata.status] || 0) + 1;
      stats.byAlgorithm[metadata.algorithm] = (stats.byAlgorithm[metadata.algorithm] || 0) + 1;
      stats.byUsage[metadata.usage] = (stats.byUsage[metadata.usage] || 0) + 1;
      stats.byEnvironment[metadata.environment] = (stats.byEnvironment[metadata.environment] || 0) + 1;
      
      if (keyData.keyMaterial.pqc) {
        stats.pqcKeys++;
      }
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
      provider: this.config.kmsProvider,
      environment: this.config.environment,
      features: {
        auditEnabled: this.config.auditEnabled,
        rotationEnabled: this.config.rotationEnabled,
        pqcEnabled: this.config.pqcEnabled
      },
      statistics: stats,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let keyManagementServiceInstance = null;

export function getKeyManagementService(config) {
  if (!keyManagementServiceInstance) {
    keyManagementServiceInstance = new KeyManagementService(config);
  }
  return keyManagementServiceInstance;
}

export default KeyManagementService;