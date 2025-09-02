/**
 * Mock KMS Service
 * 
 * Simulates a Key Management Service for standalone mode testing.
 * In production, this would be replaced with actual KMS integration.
 */

export class MockKMSService {
  constructor() {
    this.keys = new Map();
    this.initialized = false;
  }

  async initialize() {
    console.log('[MockKMSService] Initializing mock KMS...');
    this.initialized = true;
    console.log('[MockKMSService] Mock KMS initialized');
  }

  /**
   * Store a key in the mock KMS
   */
  async storeKey(keyId, keyMaterial, metadata = {}) {
    if (!this.initialized) {
      throw new Error('KMS service not initialized');
    }

    const keyEntry = {
      keyId,
      keyMaterial: Buffer.isBuffer(keyMaterial) ? keyMaterial.toString('hex') : keyMaterial,
      metadata: {
        ...metadata,
        storedAt: new Date().toISOString(),
        version: '1.0'
      },
      accessCount: 0
    };

    this.keys.set(keyId, keyEntry);
    
    console.log(`[MockKMSService] Stored key: ${keyId}`);
    return keyEntry;
  }

  /**
   * Retrieve a key from the mock KMS
   */
  async getKey(keyId) {
    if (!this.initialized) {
      throw new Error('KMS service not initialized');
    }

    const keyEntry = this.keys.get(keyId);
    
    if (!keyEntry) {
      console.warn(`[MockKMSService] Key not found: ${keyId}`);
      return null;
    }

    // Increment access count
    keyEntry.accessCount++;
    keyEntry.lastAccessed = new Date().toISOString();

    console.log(`[MockKMSService] Retrieved key: ${keyId} (accessed ${keyEntry.accessCount} times)`);
    
    // Return key data in expected format
    return {
      keyId: keyEntry.keyId,
      material: Buffer.isBuffer(keyEntry.keyMaterial) 
        ? keyEntry.keyMaterial 
        : Buffer.from(keyEntry.keyMaterial, 'hex'),
      metadata: keyEntry.metadata,
      createdAt: keyEntry.metadata.storedAt,
      lastUsed: keyEntry.lastAccessed,
      usageCount: keyEntry.accessCount
    };
  }

  /**
   * Delete a key from the mock KMS
   */
  async deleteKey(keyId) {
    if (!this.initialized) {
      throw new Error('KMS service not initialized');
    }

    const existed = this.keys.has(keyId);
    this.keys.delete(keyId);

    if (existed) {
      console.log(`[MockKMSService] Deleted key: ${keyId}`);
    } else {
      console.warn(`[MockKMSService] Attempted to delete non-existent key: ${keyId}`);
    }

    return existed;
  }

  /**
   * List all keys (for debugging)
   */
  async listKeys() {
    if (!this.initialized) {
      throw new Error('KMS service not initialized');
    }

    const keyList = Array.from(this.keys.entries()).map(([keyId, keyEntry]) => ({
      keyId,
      algorithm: keyEntry.metadata.algorithm,
      keyType: keyEntry.metadata.keyType,
      identityId: keyEntry.metadata.identityId,
      createdAt: keyEntry.metadata.storedAt,
      accessCount: keyEntry.accessCount,
      lastAccessed: keyEntry.lastAccessed
    }));

    return keyList;
  }

  /**
   * Rotate a key (generate new version)
   */
  async rotateKey(keyId) {
    if (!this.initialized) {
      throw new Error('KMS service not initialized');
    }

    const existingKey = this.keys.get(keyId);
    
    if (!existingKey) {
      throw new Error(`Key not found for rotation: ${keyId}`);
    }

    // Mark old key as rotated
    existingKey.metadata.rotated = true;
    existingKey.metadata.rotatedAt = new Date().toISOString();

    // Generate new key ID for rotated key
    const newKeyId = `${keyId}_rotated_${Date.now()}`;
    existingKey.metadata.replacedBy = newKeyId;

    console.log(`[MockKMSService] Key rotated: ${keyId} -> ${newKeyId}`);
    
    return {
      oldKeyId: keyId,
      newKeyId,
      rotatedAt: existingKey.metadata.rotatedAt
    };
  }

  /**
   * Get KMS statistics
   */
  async getStatistics() {
    const keys = Array.from(this.keys.values());
    
    const stats = {
      totalKeys: keys.length,
      byAlgorithm: {},
      byKeyType: {},
      totalAccesses: 0,
      rotatedKeys: 0
    };

    keys.forEach(key => {
      const { algorithm, keyType } = key.metadata;
      
      stats.byAlgorithm[algorithm] = (stats.byAlgorithm[algorithm] || 0) + 1;
      stats.byKeyType[keyType] = (stats.byKeyType[keyType] || 0) + 1;
      stats.totalAccesses += key.accessCount;
      
      if (key.metadata.rotated) {
        stats.rotatedKeys++;
      }
    });

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: this.initialized ? 'healthy' : 'not_initialized',
      service: 'MockKMSService',
      keyCount: this.keys.size,
      initialized: this.initialized
    };
  }

  /**
   * Simulate KMS encryption (for sensitive key material)
   */
  async encryptKeyMaterial(keyMaterial) {
    // Mock encryption - in real KMS this would use hardware encryption
    const mockEncrypted = Buffer.from(keyMaterial).toString('base64');
    return `kms_encrypted:${mockEncrypted}`;
  }

  /**
   * Simulate KMS decryption
   */
  async decryptKeyMaterial(encryptedKeyMaterial) {
    // Mock decryption
    if (!encryptedKeyMaterial.startsWith('kms_encrypted:')) {
      throw new Error('Invalid encrypted key material format');
    }
    
    const base64Data = encryptedKeyMaterial.replace('kms_encrypted:', '');
    return Buffer.from(base64Data, 'base64');
  }

  /**
   * Generate audit trail for key operations
   */
  async generateAuditTrail(keyId, operation, details = {}) {
    const auditEntry = {
      keyId,
      operation,
      timestamp: new Date().toISOString(),
      details,
      service: 'MockKMSService'
    };

    console.log(`[MockKMSService] Audit: ${JSON.stringify(auditEntry)}`);
    return auditEntry;
  }

  /**
   * Cleanup expired or unused keys
   */
  async cleanup(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days default
    const now = Date.now();
    let cleanedCount = 0;

    for (const [keyId, keyEntry] of this.keys.entries()) {
      const keyAge = now - new Date(keyEntry.metadata.storedAt).getTime();
      
      // Clean up old rotated keys or unused keys
      if (keyEntry.metadata.rotated && keyAge > maxAge) {
        this.keys.delete(keyId);
        cleanedCount++;
        console.log(`[MockKMSService] Cleaned up rotated key: ${keyId}`);
      }
    }

    console.log(`[MockKMSService] Cleanup completed: ${cleanedCount} keys removed`);
    return cleanedCount;
  }
}