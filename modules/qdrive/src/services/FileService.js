import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import mime from 'mime-types';
import { logger } from '../utils/logger.js';
import { ValidationError, NotFoundError, PermissionError } from '../utils/errors.js';

export class FileService {
  constructor(services, config) {
    this.ipfs = services.ipfs;
    this.encryption = services.encryption;
    this.auth = services.auth;
    this.index = services.index;
    this.audit = services.audit;
    this.cache = services.cache;
    this.config = config;
  }

  async uploadFile(fileData, metadata, actor) {
    try {
      // Validate file
      this.validateFile(fileData);
      
      // Check permissions
      await this.auth.checkPermission(actor, 'qdrive:file:upload');
      
      // Prepare file metadata
      const fileMetadata = {
        id: uuidv4(),
        name: metadata.name || fileData.originalname,
        description: metadata.description || '',
        size: fileData.size,
        mimeType: fileData.mimetype,
        tags: metadata.tags || [],
        privacy: metadata.privacy || 'private',
        encrypted: metadata.encrypt !== false,
        owner: actor.squidId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        accessCount: 0,
        retentionPolicy: {
          days: metadata.retention || this.config.retention.defaultDays,
          deleteAt: this.calculateDeleteDate(metadata.retention),
          policy: 'delete'
        }
      };

      // Encrypt file if requested
      let fileBuffer = fileData.buffer;
      let encryptionInfo = null;
      
      if (fileMetadata.encrypted) {
        const encryptionResult = await this.encryption.encrypt(fileBuffer, actor.squidId);
        fileBuffer = encryptionResult.encryptedData;
        encryptionInfo = {
          algorithm: encryptionResult.algorithm,
          keyId: encryptionResult.keyId,
          iv: encryptionResult.iv
        };
      }

      // Upload to IPFS
      const ipfsResult = await this.ipfs.add(fileBuffer, {
        pin: true,
        wrapWithDirectory: false
      });
      
      const cid = ipfsResult.cid.toString();
      fileMetadata.cid = cid;
      
      if (encryptionInfo) {
        fileMetadata.encryption = encryptionInfo;
      }

      // Store metadata
      await this.storeFileMetadata(cid, fileMetadata);
      
      // Index the file
      await this.index.indexFile(fileMetadata);
      
      // Audit the upload
      await this.audit.logFileUpload(actor, fileMetadata);
      
      // Cache metadata
      await this.cache.setFileMetadata(cid, fileMetadata);

      logger.info(`File uploaded successfully: ${cid}`);
      
      return {
        cid,
        name: fileMetadata.name,
        size: fileMetadata.size,
        mimeType: fileMetadata.mimeType,
        encrypted: fileMetadata.encrypted,
        createdAt: fileMetadata.createdAt
      };
    } catch (error) {
      logger.error('File upload failed:', error);
      throw error;
    }
  }

  async getFile(cid, actor, options = {}) {
    try {
      // Get file metadata
      const metadata = await this.getFileMetadata(cid);
      
      // Check access permissions
      await this.auth.checkFileAccess(actor, metadata);
      
      // Get file content from IPFS
      let fileContent = await this.ipfs.get(cid);
      
      // Decrypt if necessary
      if (metadata.encrypted && metadata.encryption) {
        fileContent = await this.encryption.decrypt(
          fileContent,
          metadata.encryption.keyId,
          metadata.encryption.iv,
          actor.squidId
        );
      }
      
      // Update access tracking
      await this.updateAccessCount(cid);
      
      // Audit the access
      await this.audit.logFileAccess(actor, metadata, options.accessType || 'download');
      
      return {
        content: fileContent,
        metadata: {
          name: metadata.name,
          size: metadata.size,
          mimeType: metadata.mimeType,
          lastAccessed: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error(`File retrieval failed for CID ${cid}:`, error);
      throw error;
    }
  }

  async getFileMetadata(cid) {
    try {
      // Try cache first
      let metadata = await this.cache.getFileMetadata(cid);
      
      if (!metadata) {
        // Load from storage
        metadata = await this.loadFileMetadata(cid);
        
        if (!metadata) {
          throw new NotFoundError(`File not found: ${cid}`);
        }
        
        // Cache for future requests
        await this.cache.setFileMetadata(cid, metadata);
      }
      
      return metadata;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`Failed to get metadata for CID ${cid}:`, error);
      throw new Error('Failed to retrieve file metadata');
    }
  }

  async updateFileMetadata(cid, updates, actor) {
    try {
      const metadata = await this.getFileMetadata(cid);
      
      // Check ownership
      if (metadata.owner !== actor.squidId) {
        throw new PermissionError('Only file owner can update metadata');
      }
      
      // Apply updates
      const updatedMetadata = {
        ...metadata,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Validate updates
      this.validateMetadataUpdates(updatedMetadata);
      
      // Store updated metadata
      await this.storeFileMetadata(cid, updatedMetadata);
      
      // Update index
      await this.index.updateFile(updatedMetadata);
      
      // Clear cache
      await this.cache.deleteFileMetadata(cid);
      
      // Audit the update
      await this.audit.logMetadataUpdate(actor, cid, updates);
      
      return updatedMetadata;
    } catch (error) {
      logger.error(`Metadata update failed for CID ${cid}:`, error);
      throw error;
    }
  }

  async deleteFile(cid, actor, options = {}) {
    try {
      const metadata = await this.getFileMetadata(cid);
      
      // Check ownership
      if (metadata.owner !== actor.squidId) {
        throw new PermissionError('Only file owner can delete file');
      }
      
      // Check if file is shared and force is not specified
      if (metadata.shares && metadata.shares.length > 0 && !options.force) {
        throw new PermissionError('Cannot delete shared file without force flag');
      }
      
      // Remove from IPFS
      await this.ipfs.unpin(cid);
      
      // Remove from index
      await this.index.removeFile(cid);
      
      // Remove metadata
      await this.deleteFileMetadata(cid);
      
      // Clear cache
      await this.cache.deleteFileMetadata(cid);
      
      // Audit the deletion
      await this.audit.logFileDeletion(actor, metadata, options.reason || 'user_request');
      
      logger.info(`File deleted successfully: ${cid}`);
      
      return {
        cid,
        deletedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`File deletion failed for CID ${cid}:`, error);
      throw error;
    }
  }

  async listFiles(actor, filters = {}) {
    try {
      const files = await this.index.listFiles(actor.squidId, filters);
      
      // Audit the list operation
      await this.audit.logFileList(actor, filters);
      
      return files;
    } catch (error) {
      logger.error('File listing failed:', error);
      throw error;
    }
  }

  async shareFile(cid, shareData, actor) {
    try {
      const metadata = await this.getFileMetadata(cid);
      
      // Check ownership
      if (metadata.owner !== actor.squidId) {
        throw new PermissionError('Only file owner can share file');
      }
      
      // Create share record
      const share = {
        shareId: uuidv4(),
        cid,
        recipients: shareData.recipients,
        permissions: shareData.permissions || ['read'],
        expiresAt: shareData.expiresAt,
        password: shareData.password,
        createdAt: new Date().toISOString(),
        createdBy: actor.squidId
      };
      
      // Store share record
      await this.storeShareRecord(share);
      
      // Update file metadata with share info
      if (!metadata.shares) {
        metadata.shares = [];
      }
      metadata.shares.push({
        shareId: share.shareId,
        recipient: shareData.recipients[0], // For backwards compatibility
        permissions: share.permissions,
        expiresAt: share.expiresAt,
        createdAt: share.createdAt
      });
      
      await this.storeFileMetadata(cid, metadata);
      
      // Clear cache
      await this.cache.deleteFileMetadata(cid);
      
      // Audit the share
      await this.audit.logFileShare(actor, cid, shareData);
      
      return {
        shareId: share.shareId,
        shareUrl: `${this.config.baseUrl}/files/${cid}?share=${share.shareId}`,
        recipients: share.recipients,
        permissions: share.permissions,
        expiresAt: share.expiresAt,
        createdAt: share.createdAt
      };
    } catch (error) {
      logger.error(`File sharing failed for CID ${cid}:`, error);
      throw error;
    }
  }

  // Helper methods
  validateFile(fileData) {
    if (!fileData || !fileData.buffer) {
      throw new ValidationError('No file data provided');
    }
    
    if (fileData.size > this.config.storage.maxFileSize) {
      throw new ValidationError(`File too large. Maximum size: ${this.config.storage.maxFileSize} bytes`);
    }
    
    if (!this.isAllowedMimeType(fileData.mimetype)) {
      throw new ValidationError(`File type not allowed: ${fileData.mimetype}`);
    }
  }

  isAllowedMimeType(mimeType) {
    return this.config.storage.allowedMimeTypes.some(allowed => {
      if (allowed.endsWith('/*')) {
        return mimeType.startsWith(allowed.slice(0, -1));
      }
      return mimeType === allowed;
    });
  }

  validateMetadataUpdates(metadata) {
    if (metadata.name && metadata.name.length > 255) {
      throw new ValidationError('File name too long');
    }
    
    if (metadata.description && metadata.description.length > 1000) {
      throw new ValidationError('Description too long');
    }
    
    if (metadata.tags && metadata.tags.length > 20) {
      throw new ValidationError('Too many tags');
    }
  }

  calculateDeleteDate(retentionDays) {
    const days = retentionDays || this.config.retention.defaultDays;
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + days);
    return deleteDate.toISOString();
  }

  async updateAccessCount(cid) {
    try {
      const metadata = await this.getFileMetadata(cid);
      metadata.accessCount = (metadata.accessCount || 0) + 1;
      metadata.lastAccessed = new Date().toISOString();
      
      await this.storeFileMetadata(cid, metadata);
      await this.cache.deleteFileMetadata(cid); // Clear cache to force reload
    } catch (error) {
      logger.error(`Failed to update access count for ${cid}:`, error);
      // Don't throw - this is not critical
    }
  }

  // Storage methods (to be implemented based on storage backend)
  async storeFileMetadata(cid, metadata) {
    // Store metadata in IPFS as a separate object
    const metadataBuffer = Buffer.from(JSON.stringify(metadata));
    const metadataResult = await this.ipfs.add(metadataBuffer, { pin: true });
    
    // Store mapping in cache/database
    await this.cache.setMetadataMapping(cid, metadataResult.cid.toString());
  }

  async loadFileMetadata(cid) {
    try {
      const metadataCid = await this.cache.getMetadataMapping(cid);
      if (!metadataCid) {
        return null;
      }
      
      const metadataBuffer = await this.ipfs.get(metadataCid);
      return JSON.parse(metadataBuffer.toString());
    } catch (error) {
      logger.error(`Failed to load metadata for ${cid}:`, error);
      return null;
    }
  }

  async deleteFileMetadata(cid) {
    const metadataCid = await this.cache.getMetadataMapping(cid);
    if (metadataCid) {
      await this.ipfs.unpin(metadataCid);
      await this.cache.deleteMetadataMapping(cid);
    }
  }

  async storeShareRecord(share) {
    await this.cache.setShareRecord(share.shareId, share);
  }

  async getShareRecord(shareId) {
    return await this.cache.getShareRecord(shareId);
  }
}