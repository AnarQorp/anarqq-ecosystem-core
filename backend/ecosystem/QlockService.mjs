/**
 * Qlock Service - Ecosystem Encryption Standard
 * 
 * Provides encryption/decryption services for the AnarQ&Q ecosystem.
 * Supports multiple encryption levels and quantum-ready algorithms.
 */

import crypto from 'crypto';

export class QlockService {
  constructor() {
    this.encryptionKeys = new Map();
    this.algorithms = {
      'none': null,
      'standard': 'aes-256-gcm',
      'high': 'aes-256-gcm',
      'quantum': 'aes-256-gcm' // Future: quantum-ready algorithm
    };
  }

  /**
   * Encrypt file buffer based on encryption level
   * @param {Buffer} fileBuffer - File content to encrypt
   * @param {string} encryptionLevel - 'none', 'standard', 'high', 'quantum'
   * @param {Object} options - Encryption options
   * @returns {Promise<Object>} Encrypted data with metadata
   */
  async encrypt(fileBuffer, encryptionLevel = 'standard', options = {}) {
    try {
      // No encryption for public files
      if (encryptionLevel === 'none') {
        return {
          encryptedBuffer: fileBuffer,
          encryptionMetadata: {
            level: 'none',
            algorithm: null,
            keyId: null,
            iv: null,
            authTag: null
          }
        };
      }

      // Get algorithm for encryption level
      const algorithm = this.algorithms[encryptionLevel];
      if (!algorithm) {
        throw new Error(`Unsupported encryption level: ${encryptionLevel}`);
      }

      // Generate or retrieve encryption key
      const keyId = options.keyId || this.generateKeyId(options.squidId, encryptionLevel);
      const encryptionKey = await this.getOrCreateKey(keyId, encryptionLevel);

      // Generate initialization vector
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipher(algorithm, encryptionKey, iv);

      // Encrypt the file buffer
      const encryptedChunks = [];
      encryptedChunks.push(cipher.update(fileBuffer));
      encryptedChunks.push(cipher.final());

      const encryptedBuffer = Buffer.concat(encryptedChunks);

      // Get authentication tag for GCM mode
      const authTag = cipher.getAuthTag ? cipher.getAuthTag() : null;

      // Create encryption metadata
      const encryptionMetadata = {
        level: encryptionLevel,
        algorithm,
        keyId,
        iv: iv.toString('hex'),
        authTag: authTag ? authTag.toString('hex') : null,
        encryptedAt: new Date().toISOString(),
        version: '1.0'
      };

      console.log(`[Qlock] Encrypted file with ${encryptionLevel} level encryption`);

      return {
        encryptedBuffer,
        encryptionMetadata
      };

    } catch (error) {
      console.error('[Qlock] Encryption error:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt file buffer using encryption metadata
   * @param {Buffer} encryptedBuffer - Encrypted file content
   * @param {Object} encryptionMetadata - Metadata from encryption
   * @param {Object} options - Decryption options
   * @returns {Promise<Buffer>} Decrypted file buffer
   */
  async decrypt(encryptedBuffer, encryptionMetadata, options = {}) {
    try {
      // No decryption needed for unencrypted files
      if (encryptionMetadata.level === 'none') {
        return encryptedBuffer;
      }

      const { algorithm, keyId, iv, authTag } = encryptionMetadata;

      // Retrieve encryption key
      const encryptionKey = await this.getKey(keyId);
      if (!encryptionKey) {
        throw new Error(`Encryption key not found: ${keyId}`);
      }

      // Create decipher
      const decipher = crypto.createDecipher(algorithm, encryptionKey, Buffer.from(iv, 'hex'));

      // Set auth tag for GCM mode
      if (authTag && decipher.setAuthTag) {
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      }

      // Decrypt the buffer
      const decryptedChunks = [];
      decryptedChunks.push(decipher.update(encryptedBuffer));
      decryptedChunks.push(decipher.final());

      const decryptedBuffer = Buffer.concat(decryptedChunks);

      console.log(`[Qlock] Decrypted file with ${encryptionMetadata.level} level encryption`);

      return decryptedBuffer;

    } catch (error) {
      console.error('[Qlock] Decryption error:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate encryption key ID
   */
  generateKeyId(squidId, encryptionLevel) {
    const timestamp = Date.now();
    const data = `${squidId}:${encryptionLevel}:${timestamp}`;
    return `qlock_${crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)}`;
  }

  /**
   * Get or create encryption key
   */
  async getOrCreateKey(keyId, encryptionLevel) {
    // Check if key already exists
    let key = this.encryptionKeys.get(keyId);
    
    if (!key) {
      // Generate new key based on encryption level
      key = this.generateKey(encryptionLevel);
      
      // Store key (in production, this would be in secure key management)
      this.encryptionKeys.set(keyId, {
        key,
        level: encryptionLevel,
        createdAt: new Date().toISOString(),
        usageCount: 0
      });

      console.log(`[Qlock] Generated new encryption key: ${keyId}`);
    }

    // Increment usage count
    this.encryptionKeys.get(keyId).usageCount++;

    return key;
  }

  /**
   * Get existing encryption key
   */
  async getKey(keyId) {
    const keyData = this.encryptionKeys.get(keyId);
    return keyData ? keyData.key : null;
  }

  /**
   * Generate encryption key based on level
   */
  generateKey(encryptionLevel) {
    const keySizes = {
      'standard': 32, // 256 bits
      'high': 32,     // 256 bits
      'quantum': 32   // 256 bits (future: larger keys)
    };

    const keySize = keySizes[encryptionLevel] || 32;
    return crypto.randomBytes(keySize);
  }

  /**
   * Encrypt text data (for metadata, messages, etc.)
   * @param {string} text - Text to encrypt
   * @param {string} encryptionLevel - Encryption level
   * @param {Object} options - Options
   * @returns {Promise<Object>} Encrypted text with metadata
   */
  async encryptText(text, encryptionLevel = 'standard', options = {}) {
    const textBuffer = Buffer.from(text, 'utf8');
    const result = await this.encrypt(textBuffer, encryptionLevel, options);
    
    return {
      encryptedText: result.encryptedBuffer.toString('base64'),
      encryptionMetadata: result.encryptionMetadata
    };
  }

  /**
   * Decrypt text data
   * @param {string} encryptedText - Base64 encoded encrypted text
   * @param {Object} encryptionMetadata - Encryption metadata
   * @returns {Promise<string>} Decrypted text
   */
  async decryptText(encryptedText, encryptionMetadata) {
    const encryptedBuffer = Buffer.from(encryptedText, 'base64');
    const decryptedBuffer = await this.decrypt(encryptedBuffer, encryptionMetadata);
    
    return decryptedBuffer.toString('utf8');
  }

  /**
   * Generate file hash for integrity verification
   * @param {Buffer} fileBuffer - File content
   * @param {string} algorithm - Hash algorithm ('sha256', 'sha512')
   * @returns {string} File hash
   */
  generateFileHash(fileBuffer, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(fileBuffer).digest('hex');
  }

  /**
   * Verify file integrity
   * @param {Buffer} fileBuffer - File content
   * @param {string} expectedHash - Expected hash
   * @param {string} algorithm - Hash algorithm
   * @returns {boolean} True if integrity is verified
   */
  verifyFileIntegrity(fileBuffer, expectedHash, algorithm = 'sha256') {
    const actualHash = this.generateFileHash(fileBuffer, algorithm);
    return actualHash === expectedHash;
  }

  /**
   * Create secure file signature
   * @param {Buffer} fileBuffer - File content
   * @param {string} privateKey - Private key for signing (mock)
   * @returns {Object} Signature data
   */
  signFile(fileBuffer, privateKey = null) {
    // Mock implementation - in production would use actual cryptographic signing
    const fileHash = this.generateFileHash(fileBuffer);
    const timestamp = Date.now();
    const signatureData = `${fileHash}:${timestamp}`;
    
    const signature = crypto.createHash('sha256')
      .update(signatureData + (privateKey || 'mock-key'))
      .digest('hex');

    return {
      signature,
      algorithm: 'sha256',
      timestamp,
      fileHash
    };
  }

  /**
   * Verify file signature
   * @param {Buffer} fileBuffer - File content
   * @param {Object} signatureData - Signature data
   * @param {string} publicKey - Public key for verification (mock)
   * @returns {boolean} True if signature is valid
   */
  verifyFileSignature(fileBuffer, signatureData, publicKey = null) {
    try {
      const { signature, timestamp, fileHash } = signatureData;
      
      // Verify file hash
      const actualHash = this.generateFileHash(fileBuffer);
      if (actualHash !== fileHash) {
        return false;
      }

      // Verify signature (mock implementation)
      const signatureInput = `${fileHash}:${timestamp}`;
      const expectedSignature = crypto.createHash('sha256')
        .update(signatureInput + (publicKey || 'mock-key'))
        .digest('hex');

      return signature === expectedSignature;

    } catch (error) {
      console.error('[Qlock] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Get encryption statistics
   */
  async getEncryptionStats() {
    const keys = Array.from(this.encryptionKeys.values());
    
    const stats = {
      totalKeys: keys.length,
      byLevel: {},
      totalUsage: 0
    };

    keys.forEach(keyData => {
      stats.byLevel[keyData.level] = (stats.byLevel[keyData.level] || 0) + 1;
      stats.totalUsage += keyData.usageCount;
    });

    return stats;
  }

  /**
   * Rotate encryption keys (security best practice)
   */
  async rotateKeys(olderThanDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let rotatedCount = 0;

    for (const [keyId, keyData] of this.encryptionKeys.entries()) {
      const keyDate = new Date(keyData.createdAt);
      
      if (keyDate < cutoffDate) {
        // In production, you would re-encrypt data with new keys before deletion
        this.encryptionKeys.delete(keyId);
        rotatedCount++;
      }
    }

    console.log(`[Qlock] Rotated ${rotatedCount} encryption keys`);
    return rotatedCount;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = await this.getEncryptionStats();
    
    return {
      status: 'healthy',
      keyStore: {
        totalKeys: stats.totalKeys,
        byLevel: stats.byLevel,
        totalUsage: stats.totalUsage
      },
      algorithms: Object.keys(this.algorithms),
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let qlockServiceInstance = null;

export function getQlockService() {
  if (!qlockServiceInstance) {
    qlockServiceInstance = new QlockService();
  }
  return qlockServiceInstance;
}

export default QlockService;