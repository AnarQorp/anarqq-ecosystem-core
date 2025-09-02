/**
 * Encryption Service
 * Handles message encryption/decryption via Qlock integration
 */

import crypto from 'crypto';

export class EncryptionService {
  constructor(qlockService) {
    this.qlock = qlockService;
  }

  /**
   * Encrypt message content
   */
  async encryptMessage(content, recipientId, encryptionLevel = 'STANDARD') {
    try {
      console.log(`[EncryptionService] Encrypting message for ${recipientId} with ${encryptionLevel} encryption`);

      // Use Qlock service for encryption
      const result = await this.qlock.encrypt({
        data: content,
        recipientId,
        algorithm: this.getAlgorithmForLevel(encryptionLevel)
      });

      return {
        data: result.encryptedData,
        keyId: result.keyId,
        algorithm: result.algorithm,
        iv: result.iv
      };

    } catch (error) {
      console.error('[EncryptionService] Failed to encrypt message:', error);
      throw new Error('Message encryption failed');
    }
  }

  /**
   * Decrypt message content
   */
  async decryptMessage(encryptedData, recipientId, encryptionLevel = 'STANDARD') {
    try {
      console.log(`[EncryptionService] Decrypting message for ${recipientId}`);

      // Use Qlock service for decryption
      const result = await this.qlock.decrypt({
        encryptedData,
        recipientId,
        algorithm: this.getAlgorithmForLevel(encryptionLevel)
      });

      return result.data;

    } catch (error) {
      console.error('[EncryptionService] Failed to decrypt message:', error);
      throw new Error('Message decryption failed');
    }
  }

  /**
   * Encrypt attachment
   */
  async encryptAttachment(attachment, recipientId, encryptionLevel = 'STANDARD') {
    try {
      console.log(`[EncryptionService] Encrypting attachment ${attachment.name} for ${recipientId}`);

      // For demo purposes, we'll simulate attachment encryption
      // In production, this would handle large file encryption efficiently
      const encryptedData = await this.qlock.encrypt({
        data: attachment.data || `[ENCRYPTED_ATTACHMENT:${attachment.name}]`,
        recipientId,
        algorithm: this.getAlgorithmForLevel(encryptionLevel)
      });

      return {
        name: attachment.name,
        cid: attachment.cid,
        size: attachment.size,
        mimeType: attachment.mimeType,
        encryptionKey: encryptedData.keyId,
        checksum: attachment.checksum || this.generateChecksum(attachment.name)
      };

    } catch (error) {
      console.error('[EncryptionService] Failed to encrypt attachment:', error);
      throw new Error('Attachment encryption failed');
    }
  }

  /**
   * Sign message for integrity verification
   */
  async signMessage(messageId, senderId) {
    try {
      console.log(`[EncryptionService] Signing message ${messageId} by ${senderId}`);

      const result = await this.qlock.sign({
        data: messageId,
        signerId: senderId
      });

      return result.signature;

    } catch (error) {
      console.error('[EncryptionService] Failed to sign message:', error);
      throw new Error('Message signing failed');
    }
  }

  /**
   * Verify message signature
   */
  async verifySignature(messageId, signature, senderId) {
    try {
      console.log(`[EncryptionService] Verifying signature for message ${messageId}`);

      const result = await this.qlock.verify({
        data: messageId,
        signature,
        signerId: senderId
      });

      return result.valid;

    } catch (error) {
      console.error('[EncryptionService] Failed to verify signature:', error);
      return false;
    }
  }

  /**
   * Generate encryption key for message
   */
  async generateMessageKey(encryptionLevel = 'STANDARD') {
    try {
      const keySize = this.getKeySizeForLevel(encryptionLevel);
      return crypto.randomBytes(keySize);
    } catch (error) {
      console.error('[EncryptionService] Failed to generate message key:', error);
      throw new Error('Key generation failed');
    }
  }

  /**
   * Get encryption algorithm for level
   */
  getAlgorithmForLevel(level) {
    switch (level) {
      case 'STANDARD':
        return 'AES-256-GCM';
      case 'HIGH':
        return 'AES-256-GCM-ENHANCED';
      case 'QUANTUM':
        return 'KYBER-AES-256-GCM';
      default:
        return 'AES-256-GCM';
    }
  }

  /**
   * Get key size for encryption level
   */
  getKeySizeForLevel(level) {
    switch (level) {
      case 'STANDARD':
        return 32; // 256 bits
      case 'HIGH':
        return 32; // 256 bits
      case 'QUANTUM':
        return 48; // 384 bits for post-quantum
      default:
        return 32;
    }
  }

  /**
   * Generate checksum for data integrity
   */
  generateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify data integrity
   */
  verifyChecksum(data, expectedChecksum) {
    const actualChecksum = this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Generate secure random IV
   */
  generateIV(size = 16) {
    return crypto.randomBytes(size);
  }

  /**
   * Generate secure random salt
   */
  generateSalt(size = 32) {
    return crypto.randomBytes(size);
  }
}