import { 
  QsocialPost, 
  QsocialComment, 
  PrivacyLevel, 
  ContentType 
} from '../../types/qsocial';

/**
 * S3-compatible configuration for Storj/Filecoin
 */
export interface S3Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  forcePathStyle?: boolean;
}

/**
 * Storage result for Storj/Filecoin operations
 */
export interface StorjFilecoinResult {
  key: string;
  url: string;
  etag: string;
  size: number;
  metadata: Record<string, string>;
}

/**
 * File metadata for Storj/Filecoin storage
 */
export interface FileMetadata {
  contentType: string;
  privacyLevel: PrivacyLevel;
  authorId: string;
  timestamp: string;
  originalName: string;
  contentHash: string;
}

/**
 * S3-compatible client interface
 */
interface S3Client {
  putObject(params: {
    Bucket: string;
    Key: string;
    Body: ArrayBuffer | Uint8Array | string;
    ContentType?: string;
    Metadata?: Record<string, string>;
  }): Promise<{ ETag: string }>;
  
  getObject(params: {
    Bucket: string;
    Key: string;
  }): Promise<{ Body: ArrayBuffer; ContentType?: string; Metadata?: Record<string, string> }>;
  
  deleteObject(params: {
    Bucket: string;
    Key: string;
  }): Promise<void>;
  
  headObject(params: {
    Bucket: string;
    Key: string;
  }): Promise<{ ContentLength: number; ContentType?: string; Metadata?: Record<string, string> }>;
  
  listObjects(params: {
    Bucket: string;
    Prefix?: string;
    MaxKeys?: number;
  }): Promise<{ Contents: Array<{ Key: string; Size: number; LastModified: Date }> }>;
}

/**
 * Storj/Filecoin Storage Service using S3-compatible API
 */
export class StorjFilecoinService {
  private static client: S3Client | null = null;
  private static config: S3Config | null = null;
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 1000;

  /**
   * Initialize the S3-compatible client for Storj/Filecoin
   */
  static async initialize(config: S3Config): Promise<void> {
    this.config = config;
    
    try {
      // Dynamic import to avoid dependency issues
      const AWS = await this.importAWSSDK();
      
      this.client = new AWS.S3({
        endpoint: config.endpoint,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region,
        s3ForcePathStyle: config.forcePathStyle || true,
        signatureVersion: 'v4'
      });

      console.log(`[StorjFilecoin] Initialized S3-compatible client for endpoint: ${config.endpoint}`);
    } catch (error) {
      console.error('[StorjFilecoin] Failed to initialize S3 client:', error);
      throw new Error(`Failed to initialize Storj/Filecoin client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Dynamic import of AWS SDK to avoid dependency issues
   */
  private static async importAWSSDK(): Promise<any> {
    try {
      // Try to import AWS SDK v3 first
      const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      
      // Create a wrapper that matches our S3Client interface
      return {
        S3: class {
          private s3Client: any;
          
          constructor(config: any) {
            this.s3Client = new S3Client({
              endpoint: config.endpoint,
              credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey
              },
              region: config.region,
              forcePathStyle: config.s3ForcePathStyle
            });
          }
          
          async putObject(params: any) {
            const command = new PutObjectCommand(params);
            const result = await this.s3Client.send(command);
            return { ETag: result.ETag };
          }
          
          async getObject(params: any) {
            const command = new GetObjectCommand(params);
            const result = await this.s3Client.send(command);
            const body = await this.streamToArrayBuffer(result.Body);
            return {
              Body: body,
              ContentType: result.ContentType,
              Metadata: result.Metadata
            };
          }
          
          async deleteObject(params: any) {
            const command = new DeleteObjectCommand(params);
            await this.s3Client.send(command);
          }
          
          async headObject(params: any) {
            const command = new HeadObjectCommand(params);
            const result = await this.s3Client.send(command);
            return {
              ContentLength: result.ContentLength,
              ContentType: result.ContentType,
              Metadata: result.Metadata
            };
          }
          
          async listObjects(params: any) {
            const command = new ListObjectsV2Command(params);
            const result = await this.s3Client.send(command);
            return {
              Contents: result.Contents || []
            };
          }
          
          private async streamToArrayBuffer(stream: any): Promise<ArrayBuffer> {
            if (stream instanceof ArrayBuffer) {
              return stream;
            }
            
            const chunks: Uint8Array[] = [];
            const reader = stream.getReader();
            
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
              }
            } finally {
              reader.releaseLock();
            }
            
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;
            
            for (const chunk of chunks) {
              result.set(chunk, offset);
              offset += chunk.length;
            }
            
            return result.buffer;
          }
        }
      };
    } catch (error) {
      console.warn('[StorjFilecoin] AWS SDK v3 not available, trying v2...');
      
      try {
        // Fallback to AWS SDK v2
        const AWS = await import('aws-sdk');
        return AWS;
      } catch (v2Error) {
        console.error('[StorjFilecoin] Neither AWS SDK v3 nor v2 available');
        throw new Error('AWS SDK not available. Please install @aws-sdk/client-s3 or aws-sdk');
      }
    }
  }

  /**
   * Upload post content to Storj/Filecoin
   */
  static async uploadPostContent(post: Omit<QsocialPost, 'id' | 'storjCid'>): Promise<StorjFilecoinResult> {
    if (!this.client || !this.config) {
      throw new Error('StorjFilecoin service not initialized');
    }

    const key = this.generateContentKey('post', post.authorId, Date.now());
    const metadata = this.createFileMetadata(post.content, post.contentType, post.privacyLevel, post.authorId);
    
    try {
      const contentBuffer = new TextEncoder().encode(JSON.stringify({
        title: post.title,
        content: post.content,
        contentType: post.contentType,
        tags: post.tags,
        metadata
      }));

      const result = await this.retryOperation(async () => {
        return await this.client!.putObject({
          Bucket: this.config!.bucket,
          Key: key,
          Body: contentBuffer,
          ContentType: 'application/json',
          Metadata: this.metadataToS3Format(metadata)
        });
      });

      console.log(`[StorjFilecoin] Post content uploaded successfully. Key: ${key}, ETag: ${result.ETag}`);

      return {
        key,
        url: this.generatePublicUrl(key),
        etag: result.ETag,
        size: contentBuffer.byteLength,
        metadata: this.metadataToS3Format(metadata)
      };

    } catch (error) {
      console.error('[StorjFilecoin] Error uploading post content:', error);
      throw new Error(`Failed to upload post content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload comment content to Storj/Filecoin
   */
  static async uploadCommentContent(comment: Omit<QsocialComment, 'id' | 'storjCid'>): Promise<StorjFilecoinResult> {
    if (!this.client || !this.config) {
      throw new Error('StorjFilecoin service not initialized');
    }

    const key = this.generateContentKey('comment', comment.authorId, Date.now());
    const metadata = this.createFileMetadata(comment.content, ContentType.TEXT, comment.privacyLevel, comment.authorId);
    
    try {
      const contentBuffer = new TextEncoder().encode(JSON.stringify({
        content: comment.content,
        postId: comment.postId,
        parentCommentId: comment.parentCommentId,
        depth: comment.depth,
        metadata
      }));

      const result = await this.retryOperation(async () => {
        return await this.client!.putObject({
          Bucket: this.config!.bucket,
          Key: key,
          Body: contentBuffer,
          ContentType: 'application/json',
          Metadata: this.metadataToS3Format(metadata)
        });
      });

      console.log(`[StorjFilecoin] Comment content uploaded successfully. Key: ${key}, ETag: ${result.ETag}`);

      return {
        key,
        url: this.generatePublicUrl(key),
        etag: result.ETag,
        size: contentBuffer.byteLength,
        metadata: this.metadataToS3Format(metadata)
      };

    } catch (error) {
      console.error('[StorjFilecoin] Error uploading comment content:', error);
      throw new Error(`Failed to upload comment content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download content from Storj/Filecoin
   */
  static async downloadContent(key: string): Promise<{
    content: any;
    metadata: FileMetadata;
    verified: boolean;
  }> {
    if (!this.client || !this.config) {
      throw new Error('StorjFilecoin service not initialized');
    }

    try {
      const result = await this.retryOperation(async () => {
        return await this.client!.getObject({
          Bucket: this.config!.bucket,
          Key: key
        });
      });

      const contentText = new TextDecoder().decode(result.Body);
      const contentData = JSON.parse(contentText);
      
      // Extract metadata
      const metadata = contentData.metadata || this.s3FormatToMetadata(result.Metadata || {});
      
      // Verify content integrity if hash is available
      let verified = true;
      if (metadata.contentHash) {
        const actualHash = await this.generateContentHash(contentData.content || contentData.title);
        verified = actualHash === metadata.contentHash;
      }

      console.log(`[StorjFilecoin] Content downloaded successfully. Key: ${key}, Verified: ${verified}`);

      return {
        content: contentData,
        metadata,
        verified
      };

    } catch (error) {
      console.error(`[StorjFilecoin] Error downloading content (${key}):`, error);
      throw new Error(`Failed to download content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete content from Storj/Filecoin
   */
  static async deleteContent(key: string): Promise<void> {
    if (!this.client || !this.config) {
      throw new Error('StorjFilecoin service not initialized');
    }

    try {
      await this.retryOperation(async () => {
        await this.client!.deleteObject({
          Bucket: this.config!.bucket,
          Key: key
        });
      });

      console.log(`[StorjFilecoin] Content deleted successfully. Key: ${key}`);

    } catch (error) {
      console.error(`[StorjFilecoin] Error deleting content (${key}):`, error);
      throw new Error(`Failed to delete content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if content exists
   */
  static async contentExists(key: string): Promise<boolean> {
    if (!this.client || !this.config) {
      return false;
    }

    try {
      await this.client.headObject({
        Bucket: this.config.bucket,
        Key: key
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List content with prefix
   */
  static async listContent(prefix: string = '', maxKeys: number = 100): Promise<Array<{
    key: string;
    size: number;
    lastModified: Date;
  }>> {
    if (!this.client || !this.config) {
      throw new Error('StorjFilecoin service not initialized');
    }

    try {
      const result = await this.client.listObjects({
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      });

      return result.Contents.map(item => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified
      }));

    } catch (error) {
      console.error('[StorjFilecoin] Error listing content:', error);
      throw new Error(`Failed to list content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup old content based on age
   */
  static async cleanupOldContent(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.client || !this.config) {
      throw new Error('StorjFilecoin service not initialized');
    }

    try {
      const allContent = await this.listContent();
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const item of allContent) {
        const age = now - item.lastModified.getTime();
        if (age > maxAgeMs) {
          keysToDelete.push(item.key);
        }
      }

      // Delete old content
      for (const key of keysToDelete) {
        try {
          await this.deleteContent(key);
        } catch (error) {
          console.warn(`[StorjFilecoin] Failed to delete old content ${key}:`, error);
        }
      }

      console.log(`[StorjFilecoin] Cleaned up ${keysToDelete.length} old content items`);
      return keysToDelete.length;

    } catch (error) {
      console.error('[StorjFilecoin] Error during cleanup:', error);
      throw new Error(`Failed to cleanup old content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate content key for storage
   */
  private static generateContentKey(type: 'post' | 'comment', authorId: string, timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const authorHash = authorId.slice(-8); // Last 8 characters of author ID
    const randomSuffix = Math.random().toString(36).substr(2, 8);
    
    return `qsocial/${type}s/${year}/${month}/${day}/${authorHash}_${timestamp}_${randomSuffix}.json`;
  }

  /**
   * Generate public URL for content
   */
  private static generatePublicUrl(key: string): string {
    if (!this.config) {
      throw new Error('StorjFilecoin service not initialized');
    }
    
    return `${this.config.endpoint}/${this.config.bucket}/${key}`;
  }

  /**
   * Create file metadata
   */
  private static createFileMetadata(
    content: string,
    contentType: ContentType,
    privacyLevel: PrivacyLevel,
    authorId: string
  ): FileMetadata {
    return {
      contentType: contentType,
      privacyLevel,
      authorId,
      timestamp: new Date().toISOString(),
      originalName: `qsocial-${contentType}-${Date.now()}`,
      contentHash: '' // Will be set by generateContentHash
    };
  }

  /**
   * Convert metadata to S3 format
   */
  private static metadataToS3Format(metadata: FileMetadata): Record<string, string> {
    return {
      'content-type': metadata.contentType,
      'privacy-level': metadata.privacyLevel,
      'author-id': metadata.authorId,
      'timestamp': metadata.timestamp,
      'original-name': metadata.originalName,
      'content-hash': metadata.contentHash
    };
  }

  /**
   * Convert S3 metadata format back to FileMetadata
   */
  private static s3FormatToMetadata(s3Metadata: Record<string, string>): FileMetadata {
    return {
      contentType: s3Metadata['content-type'] as ContentType || ContentType.TEXT,
      privacyLevel: s3Metadata['privacy-level'] as PrivacyLevel || PrivacyLevel.PUBLIC,
      authorId: s3Metadata['author-id'] || '',
      timestamp: s3Metadata['timestamp'] || new Date().toISOString(),
      originalName: s3Metadata['original-name'] || '',
      contentHash: s3Metadata['content-hash'] || ''
    };
  }

  /**
   * Generate content hash for integrity verification
   */
  private static async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Retry operation with exponential backoff
   */
  private static async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxAttempts) {
          throw lastError;
        }

        const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[StorjFilecoin] Attempt ${attempt} failed, retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    totalObjects: number;
    totalSize: number;
    oldestObject?: Date;
    newestObject?: Date;
  }> {
    if (!this.client || !this.config) {
      throw new Error('StorjFilecoin service not initialized');
    }

    try {
      const allContent = await this.listContent();
      
      let totalSize = 0;
      let oldestDate: Date | undefined;
      let newestDate: Date | undefined;

      for (const item of allContent) {
        totalSize += item.size;
        
        if (!oldestDate || item.lastModified < oldestDate) {
          oldestDate = item.lastModified;
        }
        
        if (!newestDate || item.lastModified > newestDate) {
          newestDate = item.lastModified;
        }
      }

      return {
        totalObjects: allContent.length,
        totalSize,
        oldestObject: oldestDate,
        newestObject: newestDate
      };

    } catch (error) {
      console.error('[StorjFilecoin] Error getting storage stats:', error);
      throw new Error(`Failed to get storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test connection to Storj/Filecoin
   */
  static async testConnection(): Promise<boolean> {
    if (!this.client || !this.config) {
      return false;
    }

    try {
      // Try to list objects to test connection
      await this.client.listObjects({
        Bucket: this.config.bucket,
        MaxKeys: 1
      });
      
      console.log('[StorjFilecoin] Connection test successful');
      return true;
    } catch (error) {
      console.error('[StorjFilecoin] Connection test failed:', error);
      return false;
    }
  }
}