/**
 * Encryption Handlers
 * 
 * HTTP request handlers for encryption and decryption operations.
 */

import crypto from 'crypto';

export function createEncryptionHandlers(services) {
  const { encryption, audit, event } = services;

  /**
   * Handle encryption requests
   */
  const encrypt = async (req, res) => {
    const requestId = crypto.randomUUID();
    const { squidId } = req.identity;
    
    try {
      const { data, algorithm, keyId, compression } = req.body;
      
      if (!data) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_MISSING_DATA',
          message: 'Data is required for encryption',
          requestId
        });
      }

      // Perform encryption
      const result = await encryption.encrypt(data, {
        algorithm,
        identityId: squidId,
        keyId,
        compression
      });

      // Log audit event
      await audit.logEncryption('encrypt', squidId, {
        algorithm: result.algorithm,
        keyId: result.keyId,
        dataSize: Buffer.byteLength(data, 'utf8'),
        quantumResistant: result.metadata.quantumResistant,
        success: true,
        requestId
      });

      // Publish event
      await event.publishEncrypted({
        keyId: result.keyId,
        algorithm: result.algorithm,
        identityId: squidId,
        dataSize: Buffer.byteLength(data, 'utf8'),
        quantumResistant: result.metadata.quantumResistant
      });

      res.json({
        status: 'ok',
        code: 'ENCRYPTION_SUCCESS',
        message: 'Data encrypted successfully',
        data: {
          encryptedData: result.encryptedData,
          keyId: result.keyId,
          algorithm: result.algorithm,
          metadata: result.metadata
        },
        requestId
      });

    } catch (error) {
      console.error('[EncryptionHandler] Encryption failed:', error);

      // Log audit event for failure
      await audit.logEncryption('encrypt', squidId, {
        algorithm: req.body.algorithm,
        error: error.message,
        success: false,
        requestId
      });

      res.status(500).json({
        status: 'error',
        code: 'ENCRYPTION_FAILED',
        message: error.message,
        requestId
      });
    }
  };

  /**
   * Handle decryption requests
   */
  const decrypt = async (req, res) => {
    const requestId = crypto.randomUUID();
    const { squidId } = req.identity;
    
    try {
      const { encryptedData, keyId, metadata } = req.body;
      
      if (!encryptedData || !keyId || !metadata) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_MISSING_FIELDS',
          message: 'Encrypted data, key ID, and metadata are required for decryption',
          requestId
        });
      }

      // Perform decryption
      const result = await encryption.decrypt(encryptedData, {
        keyId,
        identityId: squidId,
        metadata
      });

      // Log audit event
      await audit.logEncryption('decrypt', squidId, {
        algorithm: metadata.algorithm,
        keyId,
        success: result.verified,
        requestId
      });

      // Publish event
      await event.publishDecrypted({
        keyId,
        algorithm: metadata.algorithm,
        identityId: squidId,
        success: result.verified
      });

      res.json({
        status: 'ok',
        code: 'DECRYPTION_SUCCESS',
        message: 'Data decrypted successfully',
        data: {
          decryptedData: result.decryptedData,
          verified: result.verified
        },
        requestId
      });

    } catch (error) {
      console.error('[EncryptionHandler] Decryption failed:', error);

      // Log audit event for failure
      await audit.logEncryption('decrypt', squidId, {
        algorithm: req.body.metadata?.algorithm,
        keyId: req.body.keyId,
        error: error.message,
        success: false,
        requestId
      });

      res.status(500).json({
        status: 'error',
        code: 'DECRYPTION_FAILED',
        message: error.message,
        requestId
      });
    }
  };

  /**
   * Get supported encryption algorithms
   */
  const getAlgorithms = async (req, res) => {
    try {
      const algorithms = encryption.getSupportedAlgorithms();
      
      res.json({
        status: 'ok',
        code: 'ALGORITHMS_RETRIEVED',
        message: 'Supported algorithms retrieved successfully',
        data: {
          algorithms
        }
      });

    } catch (error) {
      console.error('[EncryptionHandler] Failed to get algorithms:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'ALGORITHMS_FAILED',
        message: error.message
      });
    }
  };

  return {
    encrypt,
    decrypt,
    getAlgorithms
  };
}