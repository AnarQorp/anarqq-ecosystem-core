/**
 * Mock Qlock Service
 * Simulates Qlock encryption/decryption functionality
 */

import crypto from 'crypto';

export class MockQlockService {
  constructor(options = {}) {
    this.integrated = options.integrated || false;
    this.keys = new Map(); // Store keys for demo
  }

  async initialize() {
    console.log(`[MockQlock] Initializing ${this.integrated ? 'integrated' : 'standalone'} mode`);
    return true;
  }

  /**
   * Encrypt data
   */
  async encrypt({ data, recipientId, algorithm = 'AES-256-GCM' }) {
    try {
      console.log(`[MockQlock] Encrypting data for ${recipientId} with ${algorithm}`);

      // Generate encryption key and IV
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      const keyId = `key_${crypto.randomBytes(8).toString('hex')}`;

      // Store key for later decryption
      this.keys.set(keyId, { key, recipientId, algorithm });

      // Encrypt data
      const cipher = crypto.createCipher('aes-256-gcm', key);
      cipher.setAAD(Buffer.from(recipientId));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();

      const encryptedData = {
        data: encrypted,
        authTag: authTag.toString('hex'),
        iv: iv.toString('hex')
      };

      return {
        encryptedData: Buffer.from(JSON.stringify(encryptedData)).toString('base64'),
        keyId,
        algorithm,
        iv: iv.toString('hex')
      };

    } catch (error) {
      console.error('[MockQlock] Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data
   */
  async decrypt({ encryptedData, recipientId, algorithm = 'AES-256-GCM' }) {
    try {
      console.log(`[MockQlock] Decrypting data for ${recipientId}`);

      // For demo purposes, we'll simulate successful decryption
      // In a real implementation, this would use the actual encrypted data
      
      // Simulate decryption delay
      await new Promise(resolve => setTimeout(resolve, 10));

      // Return mock decrypted data
      if (encryptedData.includes('ENCRYPTED_ATTACHMENT')) {
        return {
          data: '[DECRYPTED_ATTACHMENT_CONTENT]'
        };
      }

      return {
        data: '[DECRYPTED_MESSAGE_CONTENT]'
      };

    } catch (error) {
      console.error('[MockQlock] Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Sign data
   */
  async sign({ data, signerId }) {
    try {
      console.log(`[MockQlock] Signing data for ${signerId}`);

      // Generate mock signature
      const signature = crypto
        .createHash('sha256')
        .update(data + signerId + Date.now())
        .digest('hex');

      return {
        signature: `sig_${signature.substring(0, 32)}`,
        algorithm: 'ECDSA-P256',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[MockQlock] Signing failed:', error);
      throw new Error('Signing failed');
    }
  }

  /**
   * Verify signature
   */
  async verify({ data, signature, signerId }) {
    try {
      console.log(`[MockQlock] Verifying signature for ${signerId}`);

      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 5));

      // For demo purposes, always return valid unless signature is obviously invalid
      const valid = signature && signature.startsWith('sig_') && signature.length > 10;

      return {
        valid,
        algorithm: 'ECDSA-P256',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[MockQlock] Verification failed:', error);
      return { valid: false };
    }
  }

  /**
   * Generate key
   */
  async generateKey({ algorithm = 'AES-256', purpose = 'encryption' }) {
    try {
      console.log(`[MockQlock] Generating ${algorithm} key for ${purpose}`);

      const keySize = algorithm.includes('256') ? 32 : 16;
      const key = crypto.randomBytes(keySize);
      const keyId = `key_${crypto.randomBytes(8).toString('hex')}`;

      // Store key
      this.keys.set(keyId, {
        key: key.toString('hex'),
        algorithm,
        purpose,
        createdAt: new Date().toISOString()
      });

      return {
        keyId,
        algorithm,
        purpose,
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('[MockQlock] Key generation failed:', error);
      throw new Error('Key generation failed');
    }
  }

  /**
   * Rotate key
   */
  async rotateKey(keyId) {
    try {
      console.log(`[MockQlock] Rotating key ${keyId}`);

      const oldKey = this.keys.get(keyId);
      if (!oldKey) {
        throw new Error('Key not found');
      }

      // Generate new key
      const newKey = await this.generateKey({
        algorithm: oldKey.algorithm,
        purpose: oldKey.purpose
      });

      // Mark old key as rotated
      oldKey.rotatedAt = new Date().toISOString();
      oldKey.replacedBy = newKey.keyId;

      return newKey;

    } catch (error) {
      console.error('[MockQlock] Key rotation failed:', error);
      throw new Error('Key rotation failed');
    }
  }

  /**
   * Get key info
   */
  async getKeyInfo(keyId) {
    try {
      const key = this.keys.get(keyId);
      if (!key) {
        throw new Error('Key not found');
      }

      return {
        keyId,
        algorithm: key.algorithm,
        purpose: key.purpose,
        createdAt: key.createdAt,
        rotatedAt: key.rotatedAt,
        replacedBy: key.replacedBy,
        status: key.rotatedAt ? 'ROTATED' : 'ACTIVE'
      };

    } catch (error) {
      console.error('[MockQlock] Failed to get key info:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mode: this.integrated ? 'integrated' : 'standalone',
      keyCount: this.keys.size
    };
  }

  async shutdown() {
    console.log('[MockQlock] Shutting down');
    this.keys.clear();
  }
}