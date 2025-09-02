/**
 * Qlock Mock Service
 * Mock implementation of Qlock cryptographic operations for standalone mode
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';

// Mock key storage
const mockKeys = new Map<string, {
  keyId: string;
  publicKey: string;
  privateKey: string;
  algorithm: string;
  createdAt: string;
  expiresAt?: string;
  purpose: string;
}>();

// Initialize with some test keys
const testKeyPair = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

mockKeys.set('test-signing-key', {
  keyId: 'test-signing-key',
  publicKey: testKeyPair.publicKey,
  privateKey: testKeyPair.privateKey,
  algorithm: 'RSA-PSS-SHA256',
  createdAt: new Date().toISOString(),
  purpose: 'signing'
});

const encryptionKeyPair = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

mockKeys.set('test-encryption-key', {
  keyId: 'test-encryption-key',
  publicKey: encryptionKeyPair.publicKey,
  privateKey: encryptionKeyPair.privateKey,
  algorithm: 'RSA-OAEP',
  createdAt: new Date().toISOString(),
  purpose: 'encryption'
});

/**
 * Sign data with Qlock
 */
export async function signData(data: string | Buffer, keyId: string = 'test-signing-key'): Promise<string> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const key = mockKeys.get(keyId);
    if (!key || key.purpose !== 'signing') {
      throw new Error(`Signing key not found: ${keyId}`);
    }

    // Check if key has expired
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      throw new Error(`Signing key expired: ${keyId}`);
    }

    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    
    // Create signature using RSA-PSS
    const signature = crypto.sign('sha256', dataBuffer, {
      key: key.privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
    });

    const signatureBase64 = signature.toString('base64');
    
    logger.debug('Data signed with Qlock mock', { keyId, dataLength: dataBuffer.length });
    return signatureBase64;

  } catch (error) {
    logger.error('Error signing data in Qlock mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      keyId
    });
    throw error;
  }
}

/**
 * Verify signature with Qlock
 */
export async function verifySignature(
  signature: string,
  data: string | Buffer | Record<string, any>,
  keyId: string = 'test-signing-key'
): Promise<boolean> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 80));

    const key = mockKeys.get(keyId);
    if (!key || key.purpose !== 'signing') {
      logger.debug('Signing key not found in Qlock mock', { keyId });
      return false;
    }

    // Check if key has expired
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      logger.debug('Signing key expired in Qlock mock', { keyId, expiresAt: key.expiresAt });
      return false;
    }

    let dataBuffer: Buffer;
    if (typeof data === 'string') {
      dataBuffer = Buffer.from(data, 'utf8');
    } else if (Buffer.isBuffer(data)) {
      dataBuffer = data;
    } else {
      // For objects, create canonical JSON representation
      const canonicalData = JSON.stringify(data, Object.keys(data).sort());
      dataBuffer = Buffer.from(canonicalData, 'utf8');
    }

    const signatureBuffer = Buffer.from(signature, 'base64');
    
    // Verify signature using RSA-PSS
    const isValid = crypto.verify('sha256', dataBuffer, {
      key: key.publicKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
    }, signatureBuffer);

    logger.debug('Signature verification result in Qlock mock', { keyId, isValid });
    return isValid;

  } catch (error) {
    logger.error('Error verifying signature in Qlock mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      keyId
    });
    return false;
  }
}

/**
 * Encrypt data with Qlock
 */
export async function encryptData(data: string | Buffer, keyId: string = 'test-encryption-key'): Promise<string> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 120));

    const key = mockKeys.get(keyId);
    if (!key || key.purpose !== 'encryption') {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    // Check if key has expired
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      throw new Error(`Encryption key expired: ${keyId}`);
    }

    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    
    // For RSA, we can only encrypt small amounts of data
    // In practice, we'd use hybrid encryption (RSA + AES)
    if (dataBuffer.length > 190) { // RSA 2048 can encrypt ~190 bytes
      // Simulate hybrid encryption
      const aesKey = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      
      // Encrypt data with AES
      const cipher = crypto.createCipher('aes-256-cbc', aesKey);
      let encryptedData = cipher.update(dataBuffer);
      encryptedData = Buffer.concat([encryptedData, cipher.final()]);
      
      // Encrypt AES key with RSA
      const encryptedKey = crypto.publicEncrypt({
        key: key.publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      }, aesKey);
      
      // Combine encrypted key, IV, and encrypted data
      const result = {
        encryptedKey: encryptedKey.toString('base64'),
        iv: iv.toString('base64'),
        encryptedData: encryptedData.toString('base64'),
        algorithm: 'RSA-OAEP+AES-256-CBC'
      };
      
      const resultBase64 = Buffer.from(JSON.stringify(result)).toString('base64');
      logger.debug('Data encrypted with hybrid encryption in Qlock mock', { keyId, dataLength: dataBuffer.length });
      return resultBase64;
    } else {
      // Direct RSA encryption for small data
      const encrypted = crypto.publicEncrypt({
        key: key.publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      }, dataBuffer);
      
      const encryptedBase64 = encrypted.toString('base64');
      logger.debug('Data encrypted with RSA in Qlock mock', { keyId, dataLength: dataBuffer.length });
      return encryptedBase64;
    }

  } catch (error) {
    logger.error('Error encrypting data in Qlock mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      keyId
    });
    throw error;
  }
}

/**
 * Decrypt data with Qlock
 */
export async function decryptData(encryptedData: string, keyId: string = 'test-encryption-key'): Promise<Buffer> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 120));

    const key = mockKeys.get(keyId);
    if (!key || key.purpose !== 'encryption') {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    // Check if key has expired
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      throw new Error(`Encryption key expired: ${keyId}`);
    }

    try {
      // Try to parse as hybrid encryption first
      const hybridData = JSON.parse(Buffer.from(encryptedData, 'base64').toString());
      
      if (hybridData.algorithm === 'RSA-OAEP+AES-256-CBC') {
        // Decrypt AES key with RSA
        const encryptedKey = Buffer.from(hybridData.encryptedKey, 'base64');
        const aesKey = crypto.privateDecrypt({
          key: key.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        }, encryptedKey);
        
        // Decrypt data with AES
        const iv = Buffer.from(hybridData.iv, 'base64');
        const encryptedDataBuffer = Buffer.from(hybridData.encryptedData, 'base64');
        
        const decipher = crypto.createDecipher('aes-256-cbc', aesKey);
        let decrypted = decipher.update(encryptedDataBuffer);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        logger.debug('Data decrypted with hybrid decryption in Qlock mock', { keyId });
        return decrypted;
      }
    } catch {
      // Not hybrid encryption, try direct RSA decryption
    }

    // Direct RSA decryption
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    const decrypted = crypto.privateDecrypt({
      key: key.privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    }, encryptedBuffer);

    logger.debug('Data decrypted with RSA in Qlock mock', { keyId });
    return decrypted;

  } catch (error) {
    logger.error('Error decrypting data in Qlock mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      keyId
    });
    throw error;
  }
}

/**
 * Generate hash of data
 */
export async function hashData(data: string | Buffer, algorithm: string = 'sha256'): Promise<string> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 20));

    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    const hash = crypto.createHash(algorithm).update(dataBuffer).digest('hex');
    
    logger.debug('Data hashed in Qlock mock', { algorithm, dataLength: dataBuffer.length });
    return hash;

  } catch (error) {
    logger.error('Error hashing data in Qlock mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      algorithm
    });
    throw error;
  }
}

/**
 * Generate random bytes
 */
export async function generateRandomBytes(length: number): Promise<Buffer> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 30));

    const randomBytes = crypto.randomBytes(length);
    
    logger.debug('Random bytes generated in Qlock mock', { length });
    return randomBytes;

  } catch (error) {
    logger.error('Error generating random bytes in Qlock mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      length
    });
    throw error;
  }
}

/**
 * Create new key pair
 */
export async function createKeyPair(
  keyId: string,
  algorithm: string = 'RSA-PSS-SHA256',
  purpose: string = 'signing',
  expiresAt?: string
): Promise<{ keyId: string; publicKey: string }> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    let keyPair;
    if (algorithm.startsWith('RSA')) {
      keyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
    } else {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    mockKeys.set(keyId, {
      keyId,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      algorithm,
      createdAt: new Date().toISOString(),
      expiresAt,
      purpose
    });

    logger.info('Key pair created in Qlock mock', { keyId, algorithm, purpose });
    return {
      keyId,
      publicKey: keyPair.publicKey
    };

  } catch (error) {
    logger.error('Error creating key pair in Qlock mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      keyId,
      algorithm
    });
    throw error;
  }
}

/**
 * Get public key
 */
export async function getPublicKey(keyId: string): Promise<string | null> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 40));

    const key = mockKeys.get(keyId);
    if (!key) {
      return null;
    }

    // Check if key has expired
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return null;
    }

    return key.publicKey;

  } catch (error) {
    logger.error('Error getting public key from Qlock mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      keyId
    });
    return null;
  }
}

/**
 * List all keys
 */
export async function listKeys(): Promise<Array<{
  keyId: string;
  algorithm: string;
  purpose: string;
  createdAt: string;
  expiresAt?: string;
}>> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 60));

    const keys = Array.from(mockKeys.values()).map(key => ({
      keyId: key.keyId,
      algorithm: key.algorithm,
      purpose: key.purpose,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt
    }));

    return keys;

  } catch (error) {
    logger.error('Error listing keys from Qlock mock', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
}

/**
 * Delete key
 */
export async function deleteKey(keyId: string): Promise<boolean> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));

    const deleted = mockKeys.delete(keyId);
    
    if (deleted) {
      logger.info('Key deleted from Qlock mock', { keyId });
    }
    
    return deleted;

  } catch (error) {
    logger.error('Error deleting key from Qlock mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      keyId
    });
    return false;
  }
}