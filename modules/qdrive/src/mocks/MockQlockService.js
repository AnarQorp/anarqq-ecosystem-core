import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export class MockQlockService {
  constructor() {
    this.keys = new Map();
    this.algorithm = 'aes-256-gcm';
  }

  async encrypt(data, keyId) {
    logger.debug(`[MockQlock] Encrypting data with key: ${keyId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Generate or retrieve key
      let key = this.keys.get(keyId);
      if (!key) {
        key = crypto.randomBytes(32);
        this.keys.set(keyId, key);
      }
      
      // Generate IV
      const iv = crypto.randomBytes(12);
      
      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from(keyId));
      
      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(data),
        cipher.final()
      ]);
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine encrypted data and tag
      const encryptedData = Buffer.concat([encrypted, tag]);
      
      return {
        success: true,
        encryptedData,
        algorithm: this.algorithm,
        keyId,
        iv: iv.toString('hex'),
        metadata: {
          originalSize: data.length,
          encryptedSize: encryptedData.length
        }
      };
    } catch (error) {
      logger.error('[MockQlock] Encryption failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async decrypt(encryptedData, keyId, iv) {
    logger.debug(`[MockQlock] Decrypting data with key: ${keyId}`);
    
    await new Promise(resolve => setTimeout(resolve, 80));
    
    try {
      // Get key
      const key = this.keys.get(keyId);
      if (!key) {
        throw new Error('Key not found');
      }
      
      // Split encrypted data and tag
      const tag = encryptedData.slice(-16);
      const encrypted = encryptedData.slice(0, -16);
      
      // Create decipher
      const decipher = crypto.createDecipher(this.algorithm, key);
      decipher.setAAD(Buffer.from(keyId));
      decipher.setAuthTag(tag);
      
      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return {
        success: true,
        decryptedData: decrypted,
        metadata: {
          decryptedSize: decrypted.length
        }
      };
    } catch (error) {
      logger.error('[MockQlock] Decryption failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sign(data, keyId) {
    logger.debug(`[MockQlock] Signing data with key: ${keyId}`);
    
    await new Promise(resolve => setTimeout(resolve, 60));
    
    try {
      // Generate or retrieve signing key
      let keyPair = this.keys.get(`${keyId}_sign`);
      if (!keyPair) {
        keyPair = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        this.keys.set(`${keyId}_sign`, keyPair);
      }
      
      // Create signature
      const signature = crypto.sign('sha256', data, keyPair.privateKey);
      
      return {
        success: true,
        signature: signature.toString('base64'),
        algorithm: 'RSA-SHA256',
        keyId,
        publicKey: keyPair.publicKey
      };
    } catch (error) {
      logger.error('[MockQlock] Signing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async verify(data, signature, publicKey) {
    logger.debug('[MockQlock] Verifying signature');
    
    await new Promise(resolve => setTimeout(resolve, 40));
    
    try {
      const isValid = crypto.verify(
        'sha256',
        data,
        publicKey,
        Buffer.from(signature, 'base64')
      );
      
      return {
        success: true,
        valid: isValid
      };
    } catch (error) {
      logger.error('[MockQlock] Verification failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateKey(keyId, algorithm = 'aes-256-gcm') {
    logger.debug(`[MockQlock] Generating key: ${keyId}`);
    
    await new Promise(resolve => setTimeout(resolve, 30));
    
    const key = crypto.randomBytes(32);
    this.keys.set(keyId, key);
    
    return {
      success: true,
      keyId,
      algorithm,
      created: new Date().toISOString()
    };
  }

  async rotateKey(keyId) {
    logger.debug(`[MockQlock] Rotating key: ${keyId}`);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const oldKey = this.keys.get(keyId);
    const newKey = crypto.randomBytes(32);
    
    // Store new key
    this.keys.set(keyId, newKey);
    
    // Archive old key
    this.keys.set(`${keyId}_archived_${Date.now()}`, oldKey);
    
    return {
      success: true,
      keyId,
      rotated: new Date().toISOString()
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      service: 'mock-qlock',
      keys: this.keys.size,
      algorithms: [this.algorithm, 'RSA-SHA256'],
      timestamp: new Date().toISOString()
    };
  }
}