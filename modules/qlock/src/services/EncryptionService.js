/**
 * Encryption Service
 * 
 * Provides encryption and decryption services with support for multiple algorithms
 * including post-quantum cryptographic algorithms.
 */

import crypto from 'crypto';

export class EncryptionService {
  constructor(options = {}) {
    this.keyManagement = options.keyManagement;
    this.pqcEnabled = options.pqcEnabled || false;
    
    // Supported algorithms
    this.algorithms = {
      'AES-256-GCM': {
        keySize: 32,
        ivSize: 16,
        tagSize: 16,
        quantumResistant: false,
        encrypt: this.encryptAES.bind(this),
        decrypt: this.decryptAES.bind(this)
      },
      'ChaCha20-Poly1305': {
        keySize: 32,
        ivSize: 12,
        tagSize: 16,
        quantumResistant: false,
        encrypt: this.encryptChaCha20.bind(this),
        decrypt: this.decryptChaCha20.bind(this)
      }
    };

    // Add post-quantum algorithms if enabled
    if (this.pqcEnabled) {
      this.algorithms['Kyber-768'] = {
        keySize: 1184, // Kyber-768 public key size
        quantumResistant: true,
        encrypt: this.encryptKyber.bind(this),
        decrypt: this.decryptKyber.bind(this)
      };
    }
  }

  async initialize() {
    console.log('[EncryptionService] Initializing...');
    
    if (!this.keyManagement) {
      throw new Error('Key management service is required');
    }
    
    console.log(`[EncryptionService] Initialized with ${Object.keys(this.algorithms).length} algorithms`);
    console.log(`[EncryptionService] Post-quantum support: ${this.pqcEnabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Encrypt data using specified algorithm
   */
  async encrypt(data, options = {}) {
    const {
      algorithm = 'AES-256-GCM',
      identityId,
      keyId,
      compression = false
    } = options;

    if (!this.algorithms[algorithm]) {
      throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
    }

    if (!identityId) {
      throw new Error('Identity ID is required for encryption');
    }

    try {
      // Get or generate encryption key
      const key = keyId 
        ? await this.keyManagement.getKey(keyId)
        : await this.keyManagement.generateKey(algorithm, identityId);

      if (!key) {
        throw new Error('Failed to obtain encryption key');
      }

      // Prepare data
      let dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      
      // Apply compression if requested
      if (compression) {
        dataBuffer = await this.compressData(dataBuffer);
      }

      // Encrypt using algorithm-specific method
      const algorithmConfig = this.algorithms[algorithm];
      const encryptionResult = await algorithmConfig.encrypt(dataBuffer, key);

      // Create metadata
      const metadata = {
        algorithm,
        keyId: key.keyId,
        keySize: algorithmConfig.keySize,
        quantumResistant: algorithmConfig.quantumResistant,
        compressed: compression,
        encryptedAt: new Date().toISOString(),
        version: '1.0',
        ...encryptionResult.metadata
      };

      return {
        encryptedData: encryptionResult.encryptedData,
        keyId: key.keyId,
        algorithm,
        metadata
      };

    } catch (error) {
      console.error('[EncryptionService] Encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using metadata
   */
  async decrypt(encryptedData, options = {}) {
    const {
      keyId,
      identityId,
      metadata
    } = options;

    if (!keyId || !identityId || !metadata) {
      throw new Error('Key ID, identity ID, and metadata are required for decryption');
    }

    const { algorithm } = metadata;
    
    if (!this.algorithms[algorithm]) {
      throw new Error(`Unsupported decryption algorithm: ${algorithm}`);
    }

    try {
      // Get decryption key
      const key = await this.keyManagement.getKey(keyId, identityId);
      
      if (!key) {
        throw new Error('Decryption key not found or access denied');
      }

      // Decrypt using algorithm-specific method
      const algorithmConfig = this.algorithms[algorithm];
      const decryptionResult = await algorithmConfig.decrypt(encryptedData, key, metadata);

      let decryptedData = decryptionResult.decryptedData;

      // Decompress if needed
      if (metadata.compressed) {
        decryptedData = await this.decompressData(decryptedData);
      }

      return {
        decryptedData: decryptedData.toString('utf8'),
        verified: decryptionResult.verified || true
      };

    } catch (error) {
      console.error('[EncryptionService] Decryption failed:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * AES-256-GCM encryption
   */
  async encryptAES(data, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key.material, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: Buffer.concat([iv, authTag, encrypted]).toString('base64'),
      metadata: {
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      }
    };
  }

  /**
   * AES-256-GCM decryption
   */
  async decryptAES(encryptedData, key, metadata) {
    const buffer = Buffer.from(encryptedData, 'base64');
    const iv = buffer.subarray(0, 16);
    const authTag = buffer.subarray(16, 32);
    const encrypted = buffer.subarray(32);
    
    const decipher = crypto.createDecipher('aes-256-gcm', key.material, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return {
      decryptedData: decrypted,
      verified: true
    };
  }

  /**
   * ChaCha20-Poly1305 encryption (mock implementation)
   */
  async encryptChaCha20(data, key) {
    // Mock implementation - in production would use actual ChaCha20-Poly1305
    const nonce = crypto.randomBytes(12);
    
    // For demo, use AES as placeholder
    const cipher = crypto.createCipher('aes-256-gcm', key.material, Buffer.concat([nonce, Buffer.alloc(4)]));
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: Buffer.concat([nonce, authTag, encrypted]).toString('base64'),
      metadata: {
        nonce: nonce.toString('hex'),
        authTag: authTag.toString('hex')
      }
    };
  }

  /**
   * ChaCha20-Poly1305 decryption (mock implementation)
   */
  async decryptChaCha20(encryptedData, key, metadata) {
    const buffer = Buffer.from(encryptedData, 'base64');
    const nonce = buffer.subarray(0, 12);
    const authTag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    
    // For demo, use AES as placeholder
    const decipher = crypto.createDecipher('aes-256-gcm', key.material, Buffer.concat([nonce, Buffer.alloc(4)]));
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return {
      decryptedData: decrypted,
      verified: true
    };
  }

  /**
   * Kyber-768 encryption (mock implementation)
   */
  async encryptKyber(data, key) {
    // Mock post-quantum encryption
    // In production, this would use actual Kyber-768 implementation
    console.log('[EncryptionService] Using mock Kyber-768 encryption');
    
    // For demo, use enhanced AES with larger key
    const enhancedKey = crypto.pbkdf2Sync(key.material, 'kyber-salt', 100000, 32, 'sha512');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher('aes-256-gcm', enhancedKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: Buffer.concat([iv, authTag, encrypted]).toString('base64'),
      metadata: {
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        pqcAlgorithm: 'Kyber-768'
      }
    };
  }

  /**
   * Kyber-768 decryption (mock implementation)
   */
  async decryptKyber(encryptedData, key, metadata) {
    console.log('[EncryptionService] Using mock Kyber-768 decryption');
    
    const buffer = Buffer.from(encryptedData, 'base64');
    const iv = buffer.subarray(0, 16);
    const authTag = buffer.subarray(16, 32);
    const encrypted = buffer.subarray(32);
    
    const enhancedKey = crypto.pbkdf2Sync(key.material, 'kyber-salt', 100000, 32, 'sha512');
    
    const decipher = crypto.createDecipher('aes-256-gcm', enhancedKey, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return {
      decryptedData: decrypted,
      verified: true
    };
  }

  /**
   * Compress data (optional)
   */
  async compressData(data) {
    // Mock compression - in production would use zlib or similar
    return data;
  }

  /**
   * Decompress data (optional)
   */
  async decompressData(data) {
    // Mock decompression - in production would use zlib or similar
    return data;
  }

  /**
   * Get supported algorithms
   */
  getSupportedAlgorithms() {
    return Object.keys(this.algorithms).map(name => ({
      name,
      keySize: this.algorithms[name].keySize,
      quantumResistant: this.algorithms[name].quantumResistant
    }));
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      algorithms: this.getSupportedAlgorithms(),
      pqcEnabled: this.pqcEnabled
    };
  }
}