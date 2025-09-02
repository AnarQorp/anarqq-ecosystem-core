/**
 * Mock HSM Service
 * 
 * Simulates a Hardware Security Module for standalone mode testing.
 * In production, this would be replaced with actual HSM integration.
 */

export class MockHSMService {
  constructor() {
    this.keys = new Map();
    this.initialized = false;
    this.securityLevel = 'FIPS_140_2_LEVEL_3'; // Mock security level
  }

  async initialize() {
    console.log('[MockHSMService] Initializing mock HSM...');
    this.initialized = true;
    console.log(`[MockHSMService] Mock HSM initialized (Security Level: ${this.securityLevel})`);
  }

  /**
   * Store a signing key in the mock HSM
   */
  async storeKey(keyId, keyMaterial, metadata = {}) {
    if (!this.initialized) {
      throw new Error('HSM service not initialized');
    }

    // Simulate HSM key storage with enhanced security
    const keyEntry = {
      keyId,
      keyMaterial: this.encryptKeyMaterial(keyMaterial),
      metadata: {
        ...metadata,
        storedAt: new Date().toISOString(),
        securityLevel: this.securityLevel,
        tamperEvident: true,
        version: '1.0'
      },
      accessCount: 0,
      lastAccessed: null
    };

    this.keys.set(keyId, keyEntry);
    
    console.log(`[MockHSMService] Stored key in HSM: ${keyId}`);
    return keyEntry;
  }

  /**
   * Retrieve a key from the mock HSM
   */
  async getKey(keyId) {
    if (!this.initialized) {
      throw new Error('HSM service not initialized');
    }

    const keyEntry = this.keys.get(keyId);
    
    if (!keyEntry) {
      console.warn(`[MockHSMService] Key not found in HSM: ${keyId}`);
      return null;
    }

    // Increment access count and update last accessed
    keyEntry.accessCount++;
    keyEntry.lastAccessed = new Date().toISOString();

    console.log(`[MockHSMService] Retrieved key from HSM: ${keyId} (accessed ${keyEntry.accessCount} times)`);
    
    // Return decrypted key data
    return {
      keyId: keyEntry.keyId,
      privateKey: this.decryptKeyMaterial(keyEntry.keyMaterial),
      publicKey: keyEntry.metadata.publicKey,
      metadata: keyEntry.metadata,
      createdAt: keyEntry.metadata.storedAt,
      lastUsed: keyEntry.lastAccessed,
      usageCount: keyEntry.accessCount
    };
  }

  /**
   * Delete a key from the mock HSM
   */
  async deleteKey(keyId) {
    if (!this.initialized) {
      throw new Error('HSM service not initialized');
    }

    const existed = this.keys.has(keyId);
    
    if (existed) {
      // Simulate secure key deletion
      const keyEntry = this.keys.get(keyId);
      keyEntry.keyMaterial = null; // Secure wipe
      keyEntry.metadata.deleted = true;
      keyEntry.metadata.deletedAt = new Date().toISOString();
      
      this.keys.delete(keyId);
      console.log(`[MockHSMService] Securely deleted key from HSM: ${keyId}`);
    } else {
      console.warn(`[MockHSMService] Attempted to delete non-existent key: ${keyId}`);
    }

    return existed;
  }

  /**
   * Perform cryptographic operation in HSM
   */
  async performCryptoOperation(keyId, operation, data) {
    if (!this.initialized) {
      throw new Error('HSM service not initialized');
    }

    const keyEntry = this.keys.get(keyId);
    
    if (!keyEntry) {
      throw new Error(`Key not found in HSM: ${keyId}`);
    }

    // Simulate HSM-based cryptographic operations
    switch (operation) {
      case 'sign':
        return this.performSigning(keyEntry, data);
      case 'verify':
        return this.performVerification(keyEntry, data);
      case 'encrypt':
        return this.performEncryption(keyEntry, data);
      case 'decrypt':
        return this.performDecryption(keyEntry, data);
      default:
        throw new Error(`Unsupported HSM operation: ${operation}`);
    }
  }

  /**
   * Generate key pair in HSM
   */
  async generateKeyPair(algorithm, keyId, metadata = {}) {
    if (!this.initialized) {
      throw new Error('HSM service not initialized');
    }

    console.log(`[MockHSMService] Generating ${algorithm} key pair in HSM: ${keyId}`);

    let keyPair;
    
    switch (algorithm) {
      case 'ECDSA-P256':
        keyPair = this.generateECDSAKeyPair();
        break;
      case 'RSA-PSS':
        keyPair = this.generateRSAKeyPair();
        break;
      case 'Dilithium-3':
        keyPair = this.generateDilithiumKeyPair();
        break;
      case 'Falcon-512':
        keyPair = this.generateFalconKeyPair();
        break;
      default:
        throw new Error(`Unsupported key generation algorithm: ${algorithm}`);
    }

    // Store in HSM
    await this.storeKey(keyId, keyPair.privateKey, {
      ...metadata,
      algorithm,
      publicKey: keyPair.publicKey,
      generatedInHSM: true
    });

    return {
      keyId,
      publicKey: keyPair.publicKey,
      algorithm,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Mock key material encryption (HSM internal)
   */
  encryptKeyMaterial(keyMaterial) {
    // Simulate HSM hardware encryption
    const encrypted = Buffer.from(keyMaterial).toString('base64');
    return `hsm_encrypted:${encrypted}:${Date.now()}`;
  }

  /**
   * Mock key material decryption (HSM internal)
   */
  decryptKeyMaterial(encryptedKeyMaterial) {
    if (!encryptedKeyMaterial.startsWith('hsm_encrypted:')) {
      throw new Error('Invalid HSM encrypted key material');
    }
    
    const parts = encryptedKeyMaterial.split(':');
    const base64Data = parts[1];
    return Buffer.from(base64Data, 'base64').toString();
  }

  /**
   * Mock ECDSA key pair generation
   */
  generateECDSAKeyPair() {
    const privateKey = Buffer.from(Array.from({length: 32}, () => Math.floor(Math.random() * 256)));
    const publicKey = Buffer.from(Array.from({length: 64}, () => Math.floor(Math.random() * 256)));
    
    return {
      privateKey: privateKey.toString('hex'),
      publicKey: publicKey.toString('hex')
    };
  }

  /**
   * Mock RSA key pair generation
   */
  generateRSAKeyPair() {
    const privateKey = Buffer.from(Array.from({length: 256}, () => Math.floor(Math.random() * 256)));
    const publicKey = Buffer.from(Array.from({length: 256}, () => Math.floor(Math.random() * 256)));
    
    return {
      privateKey: privateKey.toString('hex'),
      publicKey: publicKey.toString('hex')
    };
  }

  /**
   * Mock Dilithium key pair generation
   */
  generateDilithiumKeyPair() {
    console.log('[MockHSMService] Generating mock Dilithium-3 key pair in HSM');
    
    const privateKey = Buffer.from(Array.from({length: 4000}, () => Math.floor(Math.random() * 256)));
    const publicKey = Buffer.from(Array.from({length: 1952}, () => Math.floor(Math.random() * 256)));
    
    return {
      privateKey: privateKey.toString('hex'),
      publicKey: publicKey.toString('hex')
    };
  }

  /**
   * Mock Falcon key pair generation
   */
  generateFalconKeyPair() {
    console.log('[MockHSMService] Generating mock Falcon-512 key pair in HSM');
    
    const privateKey = Buffer.from(Array.from({length: 1281}, () => Math.floor(Math.random() * 256)));
    const publicKey = Buffer.from(Array.from({length: 897}, () => Math.floor(Math.random() * 256)));
    
    return {
      privateKey: privateKey.toString('hex'),
      publicKey: publicKey.toString('hex')
    };
  }

  /**
   * Mock HSM signing operation
   */
  performSigning(keyEntry, data) {
    const privateKey = this.decryptKeyMaterial(keyEntry.keyMaterial);
    const signature = Buffer.from(`hsm_signature:${privateKey}:${data}`).toString('base64');
    
    keyEntry.accessCount++;
    keyEntry.lastAccessed = new Date().toISOString();
    
    return {
      signature,
      algorithm: keyEntry.metadata.algorithm,
      signedInHSM: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Mock HSM verification operation
   */
  performVerification(keyEntry, { data, signature }) {
    const publicKey = keyEntry.metadata.publicKey;
    const expectedSignature = Buffer.from(`hsm_signature:${publicKey}:${data}`).toString('base64');
    
    keyEntry.accessCount++;
    keyEntry.lastAccessed = new Date().toISOString();
    
    return {
      valid: signature === expectedSignature,
      verifiedInHSM: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Mock HSM encryption operation
   */
  performEncryption(keyEntry, data) {
    const publicKey = keyEntry.metadata.publicKey;
    const encrypted = Buffer.from(`hsm_encrypted:${publicKey}:${data}`).toString('base64');
    
    keyEntry.accessCount++;
    keyEntry.lastAccessed = new Date().toISOString();
    
    return {
      encryptedData: encrypted,
      encryptedInHSM: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Mock HSM decryption operation
   */
  performDecryption(keyEntry, encryptedData) {
    const privateKey = this.decryptKeyMaterial(keyEntry.keyMaterial);
    
    // Mock decryption logic
    const decrypted = Buffer.from(encryptedData, 'base64').toString();
    
    keyEntry.accessCount++;
    keyEntry.lastAccessed = new Date().toISOString();
    
    return {
      decryptedData: decrypted.replace(`hsm_encrypted:${privateKey}:`, ''),
      decryptedInHSM: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get HSM statistics
   */
  async getStatistics() {
    const keys = Array.from(this.keys.values());
    
    const stats = {
      totalKeys: keys.length,
      securityLevel: this.securityLevel,
      byAlgorithm: {},
      totalOperations: 0,
      averageOperationsPerKey: 0
    };

    keys.forEach(key => {
      const algorithm = key.metadata.algorithm;
      stats.byAlgorithm[algorithm] = (stats.byAlgorithm[algorithm] || 0) + 1;
      stats.totalOperations += key.accessCount;
    });

    if (keys.length > 0) {
      stats.averageOperationsPerKey = Math.round(stats.totalOperations / keys.length);
    }

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = await this.getStatistics();
    
    return {
      status: this.initialized ? 'healthy' : 'not_initialized',
      service: 'MockHSMService',
      securityLevel: this.securityLevel,
      keyCount: this.keys.size,
      initialized: this.initialized,
      statistics: stats
    };
  }

  /**
   * Simulate HSM tamper detection
   */
  async checkTamperEvidence() {
    // Mock tamper detection - always returns secure for mock
    return {
      tamperDetected: false,
      lastCheck: new Date().toISOString(),
      securityStatus: 'secure',
      integrityVerified: true
    };
  }

  /**
   * Simulate HSM backup/restore
   */
  async createBackup() {
    const backup = {
      timestamp: new Date().toISOString(),
      keyCount: this.keys.size,
      securityLevel: this.securityLevel,
      backupId: `hsm_backup_${Date.now()}`
    };

    console.log(`[MockHSMService] Created HSM backup: ${backup.backupId}`);
    return backup;
  }
}