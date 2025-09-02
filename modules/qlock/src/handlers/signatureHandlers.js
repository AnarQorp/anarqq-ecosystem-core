/**
 * Signature Handlers
 * 
 * HTTP request handlers for digital signature operations.
 */

import crypto from 'crypto';

export function createSignatureHandlers(services) {
  const { signature, audit, event } = services;

  /**
   * Handle signing requests
   */
  const sign = async (req, res) => {
    const requestId = crypto.randomUUID();
    const { squidId } = req.identity;
    
    try {
      const { 
        data, 
        algorithm, 
        keyId, 
        hashAlgorithm, 
        includeTimestamp, 
        includeCertChain 
      } = req.body;
      
      if (!data) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_MISSING_DATA',
          message: 'Data is required for signing',
          requestId
        });
      }

      // Calculate data hash for audit
      const dataHash = crypto.createHash('sha256').update(data).digest('hex');

      // Perform signing
      const result = await signature.sign(data, {
        algorithm,
        identityId: squidId,
        keyId,
        hashAlgorithm,
        includeTimestamp,
        includeCertChain
      });

      // Log audit event
      await audit.logSignature('sign', squidId, {
        algorithm: result.algorithm,
        keyId: result.keyId,
        dataHash,
        quantumResistant: result.metadata.quantumResistant,
        success: true,
        requestId
      });

      // Publish event
      await event.publishSigned({
        keyId: result.keyId,
        algorithm: result.algorithm,
        identityId: squidId,
        dataHash,
        quantumResistant: result.metadata.quantumResistant
      });

      res.json({
        status: 'ok',
        code: 'SIGNING_SUCCESS',
        message: 'Data signed successfully',
        data: {
          signature: result.signature,
          algorithm: result.algorithm,
          publicKey: result.publicKey,
          keyId: result.keyId,
          metadata: result.metadata
        },
        requestId
      });

    } catch (error) {
      console.error('[SignatureHandler] Signing failed:', error);

      // Log audit event for failure
      await audit.logSignature('sign', squidId, {
        algorithm: req.body.algorithm,
        error: error.message,
        success: false,
        requestId
      });

      res.status(500).json({
        status: 'error',
        code: 'SIGNING_FAILED',
        message: error.message,
        requestId
      });
    }
  };

  /**
   * Handle signature verification requests
   */
  const verify = async (req, res) => {
    const requestId = crypto.randomUUID();
    const { squidId } = req.identity;
    
    try {
      const { data, signature: sig, publicKey, algorithm, metadata } = req.body;
      
      if (!data || !sig || !publicKey) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_MISSING_FIELDS',
          message: 'Data, signature, and public key are required for verification',
          requestId
        });
      }

      // Calculate data hash for audit
      const dataHash = crypto.createHash('sha256').update(data).digest('hex');

      // Perform verification
      const result = await signature.verify(data, sig, publicKey, {
        algorithm,
        metadata
      });

      // Log audit event
      await audit.logSignature('verify', squidId, {
        algorithm: result.algorithm,
        dataHash,
        valid: result.valid,
        success: true,
        requestId
      });

      // Publish event
      await event.publishVerified({
        algorithm: result.algorithm,
        valid: result.valid,
        publicKey,
        dataHash
      });

      res.json({
        status: 'ok',
        code: 'VERIFICATION_SUCCESS',
        message: 'Signature verification completed',
        data: {
          valid: result.valid,
          algorithm: result.algorithm,
          verifiedAt: result.verifiedAt,
          details: result.details
        },
        requestId
      });

    } catch (error) {
      console.error('[SignatureHandler] Verification failed:', error);

      // Log audit event for failure
      await audit.logSignature('verify', squidId, {
        algorithm: req.body.algorithm,
        error: error.message,
        success: false,
        requestId
      });

      res.status(500).json({
        status: 'error',
        code: 'VERIFICATION_FAILED',
        message: error.message,
        requestId
      });
    }
  };

  /**
   * Get supported signature algorithms
   */
  const getAlgorithms = async (req, res) => {
    try {
      const algorithms = signature.getSupportedAlgorithms();
      
      res.json({
        status: 'ok',
        code: 'ALGORITHMS_RETRIEVED',
        message: 'Supported signature algorithms retrieved successfully',
        data: {
          algorithms
        }
      });

    } catch (error) {
      console.error('[SignatureHandler] Failed to get algorithms:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'ALGORITHMS_FAILED',
        message: error.message
      });
    }
  };

  return {
    sign,
    verify,
    getAlgorithms
  };
}