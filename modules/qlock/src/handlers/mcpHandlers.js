/**
 * MCP Handlers
 * 
 * Model Context Protocol handlers for Qlock tools.
 */

import crypto from 'crypto';

export function createMCPHandlers(services) {
  const { encryption, signature, lock, audit } = services;

  /**
   * Handle MCP tool calls
   */
  const handleMCPCall = async (req, res) => {
    const requestId = crypto.randomUUID();
    const { squidId } = req.identity;
    const { tool } = req.params;
    const toolInput = req.body;
    
    try {
      let result;
      
      switch (tool) {
        case 'qlock.encrypt':
          result = await handleEncryptTool(toolInput, squidId, requestId);
          break;
          
        case 'qlock.decrypt':
          result = await handleDecryptTool(toolInput, squidId, requestId);
          break;
          
        case 'qlock.sign':
          result = await handleSignTool(toolInput, squidId, requestId);
          break;
          
        case 'qlock.verify':
          result = await handleVerifyTool(toolInput, squidId, requestId);
          break;
          
        case 'qlock.lock':
          result = await handleLockTool(toolInput, squidId, requestId);
          break;
          
        default:
          return res.status(400).json({
            status: 'error',
            code: 'UNSUPPORTED_TOOL',
            message: `Unsupported MCP tool: ${tool}`,
            requestId
          });
      }

      res.json({
        status: 'ok',
        code: 'MCP_TOOL_SUCCESS',
        message: `MCP tool ${tool} executed successfully`,
        data: result,
        requestId
      });

    } catch (error) {
      console.error(`[MCPHandler] Tool ${tool} failed:`, error);

      res.status(500).json({
        status: 'error',
        code: 'MCP_TOOL_FAILED',
        message: error.message,
        tool,
        requestId
      });
    }
  };

  /**
   * Handle qlock.encrypt tool
   */
  const handleEncryptTool = async (input, squidId, requestId) => {
    const { data, algorithm, keyId, identityId } = input;
    
    if (!data || !identityId) {
      throw new Error('Data and identityId are required for encryption');
    }

    const result = await encryption.encrypt(data, {
      algorithm,
      identityId,
      keyId
    });

    // Log audit event
    await audit.logEncryption('mcp_encrypt', squidId, {
      algorithm: result.algorithm,
      keyId: result.keyId,
      dataSize: Buffer.byteLength(data, 'utf8'),
      quantumResistant: result.metadata.quantumResistant,
      success: true,
      requestId
    });

    return {
      encryptedData: result.encryptedData,
      keyId: result.keyId,
      algorithm: result.algorithm,
      metadata: result.metadata
    };
  };

  /**
   * Handle qlock.decrypt tool
   */
  const handleDecryptTool = async (input, squidId, requestId) => {
    const { encryptedData, keyId, identityId, metadata } = input;
    
    if (!encryptedData || !keyId || !identityId || !metadata) {
      throw new Error('EncryptedData, keyId, identityId, and metadata are required for decryption');
    }

    const result = await encryption.decrypt(encryptedData, {
      keyId,
      identityId,
      metadata
    });

    // Log audit event
    await audit.logEncryption('mcp_decrypt', squidId, {
      algorithm: metadata.algorithm,
      keyId,
      success: result.verified,
      requestId
    });

    return {
      decryptedData: result.decryptedData,
      verified: result.verified
    };
  };

  /**
   * Handle qlock.sign tool
   */
  const handleSignTool = async (input, squidId, requestId) => {
    const { data, algorithm, identityId, keyId } = input;
    
    if (!data || !identityId) {
      throw new Error('Data and identityId are required for signing');
    }

    const result = await signature.sign(data, {
      algorithm,
      identityId,
      keyId
    });

    // Calculate data hash for audit
    const dataHash = crypto.createHash('sha256').update(data).digest('hex');

    // Log audit event
    await audit.logSignature('mcp_sign', squidId, {
      algorithm: result.algorithm,
      keyId: result.keyId,
      dataHash,
      quantumResistant: result.metadata.quantumResistant,
      success: true,
      requestId
    });

    return {
      signature: result.signature,
      algorithm: result.algorithm,
      publicKey: result.publicKey,
      keyId: result.keyId,
      metadata: result.metadata
    };
  };

  /**
   * Handle qlock.verify tool
   */
  const handleVerifyTool = async (input, squidId, requestId) => {
    const { data, signature: sig, publicKey, algorithm } = input;
    
    if (!data || !sig || !publicKey) {
      throw new Error('Data, signature, and publicKey are required for verification');
    }

    const result = await signature.verify(data, sig, publicKey, {
      algorithm
    });

    // Calculate data hash for audit
    const dataHash = crypto.createHash('sha256').update(data).digest('hex');

    // Log audit event
    await audit.logSignature('mcp_verify', squidId, {
      algorithm: result.algorithm,
      dataHash,
      valid: result.valid,
      success: true,
      requestId
    });

    return {
      valid: result.valid,
      algorithm: result.algorithm,
      verifiedAt: result.verifiedAt,
      details: result.details
    };
  };

  /**
   * Handle qlock.lock tool
   */
  const handleLockTool = async (input, squidId, requestId) => {
    const { action, lockId, ttl, identityId, metadata } = input;
    
    if (!action || !lockId || !identityId) {
      throw new Error('Action, lockId, and identityId are required for lock operations');
    }

    let result;
    
    switch (action) {
      case 'acquire':
        result = await lock.acquireLock(lockId, identityId, {
          ttl,
          metadata
        });
        
        // Log audit event
        await audit.logLock('mcp_acquire', squidId, {
          lockId,
          resource: metadata?.resource || lockId,
          ttl: result.ttl,
          success: result.acquired,
          requestId
        });
        
        break;
        
      case 'release':
        result = await lock.releaseLock(lockId, identityId);
        
        // Log audit event
        await audit.logLock('mcp_release', squidId, {
          lockId,
          duration: result.duration,
          reason: result.reason,
          success: result.released,
          requestId
        });
        
        break;
        
      case 'extend':
        result = await lock.extendLock(lockId, identityId, { ttl });
        
        // Log audit event
        await audit.logLock('mcp_extend', squidId, {
          lockId,
          ttl: result.extension,
          success: result.extended,
          requestId
        });
        
        break;
        
      case 'status':
        result = await lock.getLockStatus(lockId);
        break;
        
      default:
        throw new Error(`Unsupported lock action: ${action}`);
    }

    return result;
  };

  /**
   * Get available MCP tools
   */
  const getTools = async (req, res) => {
    try {
      const tools = [
        {
          name: 'qlock.encrypt',
          description: 'Encrypt data using specified algorithm and key',
          inputSchema: {
            type: 'object',
            properties: {
              data: { type: 'string', description: 'Data to encrypt' },
              algorithm: { 
                type: 'string', 
                enum: ['AES-256-GCM', 'ChaCha20-Poly1305', 'Kyber-768'],
                default: 'AES-256-GCM'
              },
              keyId: { type: 'string', description: 'Key identifier (optional)' },
              identityId: { type: 'string', description: 'Identity ID for key derivation' }
            },
            required: ['data', 'identityId']
          }
        },
        {
          name: 'qlock.decrypt',
          description: 'Decrypt data using private key',
          inputSchema: {
            type: 'object',
            properties: {
              encryptedData: { type: 'string', description: 'Encrypted data to decrypt' },
              keyId: { type: 'string', description: 'Key identifier used for encryption' },
              identityId: { type: 'string', description: 'Identity ID for key derivation' },
              metadata: { type: 'object', description: 'Encryption metadata' }
            },
            required: ['encryptedData', 'keyId', 'identityId', 'metadata']
          }
        },
        {
          name: 'qlock.sign',
          description: 'Create digital signature for data',
          inputSchema: {
            type: 'object',
            properties: {
              data: { type: 'string', description: 'Data to sign' },
              algorithm: { 
                type: 'string', 
                enum: ['ECDSA-P256', 'RSA-PSS', 'Dilithium-3', 'Falcon-512'],
                default: 'ECDSA-P256'
              },
              identityId: { type: 'string', description: 'Identity ID for signing key' },
              keyId: { type: 'string', description: 'Specific key ID (optional)' }
            },
            required: ['data', 'identityId']
          }
        },
        {
          name: 'qlock.verify',
          description: 'Verify digital signature',
          inputSchema: {
            type: 'object',
            properties: {
              data: { type: 'string', description: 'Original data that was signed' },
              signature: { type: 'string', description: 'Digital signature to verify' },
              publicKey: { type: 'string', description: 'Public key for verification' },
              algorithm: { type: 'string', description: 'Signature algorithm used' }
            },
            required: ['data', 'signature', 'publicKey']
          }
        },
        {
          name: 'qlock.lock',
          description: 'Acquire or release distributed lock',
          inputSchema: {
            type: 'object',
            properties: {
              action: { 
                type: 'string', 
                enum: ['acquire', 'release', 'extend', 'status'],
                description: 'Lock action to perform'
              },
              lockId: { type: 'string', description: 'Lock identifier' },
              ttl: { type: 'integer', default: 30000, description: 'Lock TTL in milliseconds' },
              identityId: { type: 'string', description: 'Identity acquiring the lock' },
              metadata: { type: 'object', description: 'Additional lock metadata' }
            },
            required: ['action', 'lockId', 'identityId']
          }
        }
      ];

      res.json({
        status: 'ok',
        code: 'MCP_TOOLS_RETRIEVED',
        message: 'MCP tools retrieved successfully',
        data: { tools }
      });

    } catch (error) {
      console.error('[MCPHandler] Failed to get tools:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'MCP_TOOLS_FAILED',
        message: error.message
      });
    }
  };

  return {
    handleMCPCall,
    getTools
  };
}