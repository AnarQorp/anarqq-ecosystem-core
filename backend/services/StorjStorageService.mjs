/**
 * Storj Storage Service with AnarQ&Q Ecosystem Integration
 * 
 * Provides file storage using Storj with S3-compatible API.
 * Fully integrated with AnarQ&Q ecosystem services following Q∞ architecture:
 * Entry → Process (Qonsent → Qlock → Storj → IPFS) → Output (Qindex → Qerberos → QNET)
 */

import AWS from 'aws-sdk';
import crypto from 'crypto';
import path from 'path';
import { create as createIPFS } from 'ipfs-http-client';
import { 
  getQonsentService, 
  getQlockService, 
  getQindexService, 
  getQerberosService, 
  getQNETService 
} from '../ecosystem/index.mjs';

export class StorjStorageService {
  constructor(config) {
    this.config = {
      accessKeyId: config.accessKeyId || process.env.STORJ_ACCESS_KEY_ID,
      secretAccessKey: config.secretAccessKey || process.env.STORJ_SECRET_ACCESS_KEY,
      endpoint: config.endpoint || process.env.STORJ_ENDPOINT || 'https://gateway.storjshare.io',
      bucket: config.bucket || process.env.STORJ_BUCKET || 'qsocial-files',
      region: config.region || process.env.STORJ_REGION || 'us-east-1'
    };

    // Configure S3 client for Storj
    this.s3 = new AWS.S3({
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      endpoint: this.config.endpoint,
      region: this.config.region,
      s3ForcePathStyle: true,
      signatureVersion: 'v4'
    });

    // Initialize IPFS client for CID generation
    this.ipfs = null;
    this.initIPFS();
  }

  /**
   * Initialize IPFS client
   */
  async initIPFS() {
    try {
      this.ipfs = createIPFS({
        host: process.env.IPFS_HOST || 'localhost',
        port: parseInt(process.env.IPFS_PORT || '5001'),
        protocol: process.env.IPFS_PROTOCOL || 'http',
        apiPath: process.env.IPFS_API_PATH || '/api/v0'
      });
      
      // Test connection
      await this.ipfs.id();
      console.log('IPFS client initialized successfully');
    } catch (error) {
      console.warn('IPFS client initialization failed:', error.message);
      this.ipfs = null;
    }
  }

  /**
   * Upload file following Q∞ Architecture: Entry → Process → Output
   * Integrates with all AnarQ&Q ecosystem services
   */
  async uploadFile(fileBuffer, metadata = {}) {
    const uploadStartTime = Date.now();
    
    try {
      // ===== ENTRY PHASE =====
      const fileId = this.generateFileId();
      const filename = metadata.filename || `file_${fileId}`;
      const contentType = metadata.contentType || 'application/octet-stream';
      const userId = metadata.userId || 'anonymous';
      const visibility = metadata.visibility || 'private';
      const daoId = metadata.daoId || null;

      console.log(`[Q∞ Entry] Starting upload for ${filename} by ${userId}`);

      // Log upload start event
      const qerberosService = getQerberosService();
      await qerberosService.logEvent({
        action: 'file_upload_start',
        squidId: userId,
        resourceId: fileId,
        contentType,
        fileSize: fileBuffer.length,
        metadata: { filename, visibility }
      });

      // ===== PROCESS PHASE =====
      
      // 1. Generate Qonsent Privacy Profile
      console.log(`[Q∞ Process] Generating Qonsent privacy profile...`);
      const qonsentService = getQonsentService();
      const qonsentProfile = await qonsentService.generateProfile({
        squidId: userId,
        visibility,
        dataType: this.classifyDataType(contentType),
        daoId,
        customRules: metadata.accessRules || {}
      });

      // 2. Encrypt file with Qlock
      console.log(`[Q∞ Process] Encrypting file with Qlock...`);
      const qlockService = getQlockService();
      const encryptionResult = await qlockService.encrypt(
        fileBuffer, 
        qonsentProfile.encryptionLevel,
        { squidId: userId, keyId: metadata.keyId }
      );

      // 3. Generate IPFS CID (before upload for integrity)
      let ipfsCid = null;
      if (this.ipfs) {
        try {
          console.log(`[Q∞ Process] Generating IPFS CID...`);
          ipfsCid = await this.generateIPFSCid(encryptionResult.encryptedBuffer);
          console.log(`Generated IPFS CID: ${ipfsCid}`);
        } catch (error) {
          console.warn('IPFS CID generation failed:', error.message);
        }
      }

      // 4. Upload encrypted file to Storj
      const storjKey = this.generateStorjKey(userId, fileId, filename);
      const uploadMetadata = {
        originalName: filename,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        fileId,
        qonsentProfileId: qonsentProfile.profileId,
        encryptionLevel: qonsentProfile.encryptionLevel,
        ipfsCid,
        visibility,
        daoId,
        ...metadata
      };

      console.log(`[Q∞ Process] Uploading to Storj: ${storjKey}`);
      const uploadParams = {
        Bucket: this.config.bucket,
        Key: storjKey,
        Body: encryptionResult.encryptedBuffer,
        ContentType: contentType,
        Metadata: uploadMetadata,
        ServerSideEncryption: 'AES256'
      };

      const uploadResult = await this.s3.upload(uploadParams).promise();

      // 5. Prepare for Filecoin
      let filecoinData = null;
      if (ipfsCid) {
        try {
          filecoinData = await this.prepareForFilecoin(ipfsCid, encryptionResult.encryptedBuffer);
        } catch (error) {
          console.warn('Filecoin preparation failed:', error.message);
        }
      }

      // 6. Generate thumbnail for images
      let thumbnailUrl = null;
      if (contentType.startsWith('image/')) {
        try {
          thumbnailUrl = await this.generateThumbnailUrl(storjKey);
        } catch (error) {
          console.warn('Thumbnail generation failed:', error.message);
        }
      }

      // ===== OUTPUT PHASE =====

      // 7. Register in Qindex
      console.log(`[Q∞ Output] Registering in Qindex...`);
      const qindexService = getQindexService();
      const indexResult = await qindexService.registerFile({
        cid: ipfsCid,
        squidId: userId,
        visibility,
        contentType,
        timestamp: uploadMetadata.uploadedAt,
        qonsentProfile,
        storjUrl: uploadResult.Location,
        fileSize: fileBuffer.length,
        originalName: filename,
        encryptionMetadata: encryptionResult.encryptionMetadata
      });

      // 8. Route through QNET
      console.log(`[Q∞ Output] Setting up QNET routing...`);
      const qnetService = getQNETService();
      const routingResult = await qnetService.routeFile({
        cid: ipfsCid,
        storjUrl: uploadResult.Location,
        accessLevel: visibility,
        squidId: userId,
        daoId,
        requestorId: userId
      });

      // 9. Log successful upload
      await qerberosService.logEvent({
        action: 'file_upload_success',
        squidId: userId,
        resourceId: fileId,
        contentType,
        fileSize: fileBuffer.length,
        metadata: {
          filename,
          visibility,
          ipfsCid,
          indexId: indexResult.indexId,
          routingId: routingResult.routingId,
          processingTime: Date.now() - uploadStartTime
        }
      });

      // Compile final result
      const result = {
        success: true,
        fileId,
        storjUrl: uploadResult.Location,
        storjKey,
        fileSize: fileBuffer.length,
        contentType,
        metadata: uploadMetadata,
        
        // Ecosystem integration results
        qonsent: {
          profileId: qonsentProfile.profileId,
          visibility: qonsentProfile.visibility,
          encryptionLevel: qonsentProfile.encryptionLevel
        },
        qlock: {
          encrypted: true,
          encryptionLevel: encryptionResult.encryptionMetadata.level,
          keyId: encryptionResult.encryptionMetadata.keyId
        },
        ipfs: {
          cid: ipfsCid,
          generated: !!ipfsCid
        },
        qindex: {
          indexId: indexResult.indexId,
          searchable: indexResult.searchable
        },
        qnet: {
          routingId: routingResult.routingId,
          routedUrl: routingResult.routedUrl,
          accessToken: routingResult.accessToken
        },
        filecoin: filecoinData,
        thumbnailUrl,
        
        // Performance metrics
        processingTime: Date.now() - uploadStartTime
      };

      console.log(`[Q∞ Complete] File upload completed: ${fileId} (${result.processingTime}ms)`);
      return result;

    } catch (error) {
      console.error('[Q∞ Error] File upload failed:', error);
      
      // Log error event
      try {
        const qerberosService = getQerberosService();
        await qerberosService.logEvent({
          action: 'file_upload_error',
          squidId: metadata.userId || 'anonymous',
          resourceId: metadata.filename || 'unknown',
          contentType: metadata.contentType || 'unknown',
          metadata: {
            error: error.message,
            processingTime: Date.now() - uploadStartTime
          }
        });
      } catch (logError) {
        console.error('Failed to log error event:', logError);
      }

      return {
        success: false,
        error: error.message,
        fileId: null,
        storjUrl: null,
        processingTime: Date.now() - uploadStartTime
      };
    }
  }

  /**
   * Classify data type for Qonsent profile
   */
  classifyDataType(contentType) {
    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('video/')) return 'video';
    if (contentType.startsWith('audio/')) return 'audio';
    if (contentType.includes('pdf')) return 'document';
    if (contentType.startsWith('text/')) return 'text';
    return 'media';
  }

  /**
   * Generate IPFS CID for file content
   */
  async generateIPFSCid(fileBuffer) {
    if (!this.ipfs) {
      throw new Error('IPFS client not available');
    }

    // Add file to IPFS (only for CID generation, not pinning)
    const result = await this.ipfs.add(fileBuffer, {
      onlyHash: true, // Only generate CID, don't store
      cidVersion: 1,
      hashAlg: 'sha2-256'
    });

    return result.cid.toString();
  }

  /**
   * Download file from Storj
   */
  async downloadFile(storjKey) {
    try {
      const params = {
        Bucket: this.config.bucket,
        Key: storjKey
      };

      console.log(`Downloading file from Storj: ${storjKey}`);
      const result = await this.s3.getObject(params).promise();
      
      return {
        success: true,
        buffer: result.Body,
        contentType: result.ContentType,
        metadata: result.Metadata,
        lastModified: result.LastModified
      };

    } catch (error) {
      console.error('File download error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get file metadata from Storj
   */
  async getFileMetadata(storjKey) {
    try {
      const params = {
        Bucket: this.config.bucket,
        Key: storjKey
      };

      const result = await this.s3.headObject(params).promise();
      
      return {
        success: true,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        lastModified: result.LastModified,
        metadata: result.Metadata,
        etag: result.ETag
      };

    } catch (error) {
      console.error('Get metadata error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete file from Storj
   */
  async deleteFile(storjKey) {
    try {
      const params = {
        Bucket: this.config.bucket,
        Key: storjKey
      };

      console.log(`Deleting file from Storj: ${storjKey}`);
      await this.s3.deleteObject(params).promise();
      
      return {
        success: true,
        message: 'File deleted successfully'
      };

    } catch (error) {
      console.error('File delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List files in bucket
   */
  async listFiles(prefix = '', maxKeys = 100) {
    try {
      const params = {
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      };

      const result = await this.s3.listObjectsV2(params).promise();
      
      return {
        success: true,
        files: result.Contents.map(file => ({
          key: file.Key,
          size: file.Size,
          lastModified: file.LastModified,
          etag: file.ETag
        })),
        isTruncated: result.IsTruncated,
        nextContinuationToken: result.NextContinuationToken
      };

    } catch (error) {
      console.error('List files error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate signed URL for direct access
   */
  async generateSignedUrl(storjKey, expiresIn = 3600) {
    try {
      const params = {
        Bucket: this.config.bucket,
        Key: storjKey,
        Expires: expiresIn
      };

      const signedUrl = this.s3.getSignedUrl('getObject', params);
      
      return {
        success: true,
        signedUrl,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
      };

    } catch (error) {
      console.error('Signed URL generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health check for Storj and IPFS connections
   */
  async healthCheck() {
    const health = {
      storj: false,
      ipfs: false,
      bucket: false,
      timestamp: new Date().toISOString()
    };

    // Test Storj connection
    try {
      await this.s3.headBucket({ Bucket: this.config.bucket }).promise();
      health.storj = true;
      health.bucket = true;
    } catch (error) {
      console.error('Storj health check failed:', error.message);
    }

    // Test IPFS connection
    try {
      if (this.ipfs) {
        await this.ipfs.id();
        health.ipfs = true;
      }
    } catch (error) {
      console.error('IPFS health check failed:', error.message);
    }

    return health;
  }

  /**
   * Generate unique file ID
   */
  generateFileId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate Storj storage key
   */
  generateStorjKey(userId, fileId, filename) {
    const ext = path.extname(filename);
    const timestamp = Date.now();
    return `qsocial/${userId}/${timestamp}_${fileId}${ext}`;
  }

  /**
   * Generate thumbnail URL (placeholder implementation)
   */
  async generateThumbnailUrl(storjKey) {
    // In production, you would generate actual thumbnails
    const thumbnailKey = storjKey.replace(/\.[^.]+$/, '_thumbnail.jpg');
    return `${this.config.endpoint}/${this.config.bucket}/${thumbnailKey}`;
  }

  /**
   * Prepare file for Filecoin storage
   */
  async prepareForFilecoin(ipfsCid, fileBuffer) {
    // Placeholder implementation for Filecoin preparation
    // In production, this would:
    // 1. Upload to IPFS node with pinning
    // 2. Create Filecoin deal
    // 3. Monitor deal status
    
    console.log(`Preparing file for Filecoin: ${ipfsCid}`);
    
    return {
      filecoinCid: ipfsCid,
      dealStatus: 'prepared',
      estimatedCost: '0.001 FIL',
      estimatedDuration: '518400', // 6 months in seconds
      preparedAt: new Date().toISOString()
    };
  }
}

// Singleton instance
let storjServiceInstance = null;

export function getStorjStorageService(config = {}) {
  if (!storjServiceInstance) {
    storjServiceInstance = new StorjStorageService(config);
  }
  return storjServiceInstance;
}

export default StorjStorageService;