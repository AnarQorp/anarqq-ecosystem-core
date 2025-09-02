import { logger } from '../utils/logger.js';
import { EncryptionError } from '../utils/errors.js';

export class EncryptionService {
  constructor(qlockService, config) {
    this.qlock = qlockService;
    this.config = config;
  }

  async encrypt(data, keyId) {
    try {
      logger.debug(`Encrypting data with key: ${keyId}`);
      
      const result = await this.qlock.encrypt(data, keyId);
      
      if (!result.success) {
        throw new EncryptionError(`Encryption failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw error instanceof EncryptionError ? error : new EncryptionError(error.message);
    }
  }

  async decrypt(encryptedData, keyId, iv, actorId) {
    try {
      logger.debug(`Decrypting data with key: ${keyId}`);
      
      const result = await this.qlock.decrypt(encryptedData, keyId, iv);
      
      if (!result.success) {
        throw new EncryptionError(`Decryption failed: ${result.error}`);
      }
      
      return result.decryptedData;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw error instanceof EncryptionError ? error : new EncryptionError(error.message);
    }
  }

  async sign(data, keyId) {
    try {
      logger.debug(`Signing data with key: ${keyId}`);
      
      const result = await this.qlock.sign(data, keyId);
      
      if (!result.success) {
        throw new EncryptionError(`Signing failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Signing failed:', error);
      throw error instanceof EncryptionError ? error : new EncryptionError(error.message);
    }
  }

  async verify(data, signature, publicKey) {
    try {
      logger.debug('Verifying signature');
      
      const result = await this.qlock.verify(data, signature, publicKey);
      
      if (!result.success) {
        throw new EncryptionError(`Verification failed: ${result.error}`);
      }
      
      return result.valid;
    } catch (error) {
      logger.error('Verification failed:', error);
      throw error instanceof EncryptionError ? error : new EncryptionError(error.message);
    }
  }
}