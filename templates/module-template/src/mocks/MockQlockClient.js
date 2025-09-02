/**
 * Mock Qlock Client
 * 
 * Mock implementation of Qlock encryption service for development and testing
 */

import crypto from 'crypto';

export class MockQlockClient {
  constructor(options = {}) {
    this.options = options;
    this.keys = new Map();
    this.locks = new Map();
    
    // Create some test keys
    this.createTestKeys();
  }

  createTestKeys() {
    const testKeys = [
      {
        keyId: 'test-key-1',
        algorithm: 'AES-256-GCM',
        publicKey: 'mock-public-key-1',
        privateKey: 'mock-private-key-1'
      },
      {
        keyId: 'test-key-2',
        algorithm: 'RSA-2048',
        publicKey: 'mock-public-key-2',
        privateKey: 'mock-private-key-2'
      }
    ];

    testKeys.forEach(key => {
      this.keys.set(key.keyId, key);
    });
  }

  /**
   * Encrypt data
   */
  async encrypt(data, options = {}) {
    await this.delay(30);

    const {
      keyId = 'test-key-1',
      algorithm = 'AES-256-GCM',
      context = {}
    } = options;

    // Mock encryption (just base64 encode for demo)
    const encrypted = Buffer.from(JSON.stringify(data)).toString('base64');
    const iv = crypto.randomBytes(16).toString('hex');
    const tag = crypto.randomBytes(16).toString('hex');

    return {
      encrypted,
      keyId,
      algorithm,
      iv,
      tag,
      context
    };
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData, options = {}) {
    await this.delay(30);

    const { keyId, encrypted } = encryptedData;
    
    if (!this.keys.has(keyId)) {
      throw new Error('Key not found');
    }

    // Mock decryption (base64 decode)
    try {
      const decrypted = JSON.parse(Buffer.from(encrypted, 'base64').toString());
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  /**
   * Sign data
   */
  async sign(data, options = {}) {
    await this.delay(25);

    const {
      keyId = 'test-key-2',
      algorithm = 'RSA-SHA256'
    } = options;

    if (!this.keys.has(keyId)) {
      throw new Error('Key not found');
    }

    // Mock signature
    const dataHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    const signature = `mock-signature-${dataHash.substring(0, 16)}`;

    return {
      signature,
      keyId,
      algorithm,
      timestamp: Date.now()
    };
  }

  /**
   * Verify signature
   */
  async verifySignature({ signature, data, publicKey, keyId }) {
    await this.delay(25);

    // Mock verification (always pass for test signatures)
    if (signature.startsWith('mock-signature-')) {
      return {
        valid: true,
        keyId,
        timestamp: Date.now()
      };
    }

    return {
      valid: false,
      reason: 'invalid_signature'
    };
  }

  /**
   * Acquire distributed lock
   */
  async lock(resource, options = {}) {
    await this.delay(20);

    const {
      ttl = 30000, // 30 seconds
      timeout = 5000 // 5 seconds
    } = options;

    const lockId = `lock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Check if resource is already locked
    if (this.locks.has(resource)) {
      const existingLock = this.locks.get(resource);
      if (existingLock.expiresAt > Date.now()) {
        throw new Error('Resource already locked');
      }
    }

    const lock = {
      lockId,
      resource,
      acquiredAt: Date.now(),
      expiresAt: Date.now() + ttl,
      ttl
    };

    this.locks.set(resource, lock);

    // Auto-release after TTL
    setTimeout(() => {
      if (this.locks.get(resource)?.lockId === lockId) {
        this.locks.delete(resource);
      }
    }, ttl);

    return lock;
  }

  /**
   * Release distributed lock
   */
  async unlock(resource, lockId) {
    await this.delay(15);

    const lock = this.locks.get(resource);
    
    if (!lock) {
      throw new Error('Lock not found');
    }

    if (lock.lockId !== lockId) {
      throw new Error('Invalid lock ID');
    }

    this.locks.delete(resource);

    return {
      released: true,
      resource,
      lockId,
      releasedAt: Date.now()
    };
  }

  /**
   * Generate key pair
   */
  async generateKeyPair(algorithm = 'RSA-2048') {
    await this.delay(100);

    const keyId = `key-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    const keyPair = {
      keyId,
      algorithm,
      publicKey: `mock-public-${keyId}`,
      privateKey: `mock-private-${keyId}`,
      createdAt: new Date().toISOString()
    };

    this.keys.set(keyId, keyPair);

    return {
      keyId,
      publicKey: keyPair.publicKey,
      algorithm,
      createdAt: keyPair.createdAt
    };
  }

  /**
   * Health check
   */
  async health() {
    return {
      status: 'healthy',
      version: '1.0.0-mock',
      timestamp: new Date().toISOString(),
      keys: this.keys.size,
      activeLocks: this.locks.size
    };
  }

  /**
   * Simulate network delay
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}