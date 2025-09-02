// Import IPFS utilities and dependencies
import { getActiveIdentity } from '../../lib/squid';
import { 
  QsocialPost, 
  QsocialComment, 
  PrivacyLevel, 
  ContentType 
} from '../../types/qsocial';
import { StorjFilecoinService, StorjFilecoinResult } from './StorjFilecoinService';

/**
 * Dynamic IPFS imports to avoid dependency issues during testing
 */
class IPFSImports {
  private static ipfsUtils: any = null;
  private static ipfsApi: any = null;

  static async getIPFSUtils() {
    if (!this.ipfsUtils) {
      try {
        this.ipfsUtils = await import('../../utils/ipfs');
      } catch (error) {
        console.error('[QsocialStorage] Failed to import IPFS utils:', error);
        throw new Error('IPFS utilities not available');
      }
    }
    return this.ipfsUtils;
  }

  static async getIPFSApi() {
    if (!this.ipfsApi) {
      try {
        this.ipfsApi = await import('../../api/ipfs');
      } catch (error) {
        console.error('[QsocialStorage] Failed to import IPFS API:', error);
        throw new Error('IPFS API not available');
      }
    }
    return this.ipfsApi;
  }

  static async uploadToIPFS<T = any>(data: T, options?: any): Promise<string> {
    const utils = await this.getIPFSUtils();
    return utils.uploadToIPFS(data, options);
  }

  static async getFromIPFS<T = any>(cid: string, options?: any): Promise<T> {
    const utils = await this.getIPFSUtils();
    return utils.getFromIPFS(cid, options);
  }

  static async uploadEncryptedFile(data: ArrayBuffer, name: string): Promise<string> {
    const api = await this.getIPFSApi();
    return api.uploadEncryptedFile(data, name);
  }

  static async downloadAndDecryptFile(cid: string): Promise<{ data: ArrayBuffer; metadata: any }> {
    const api = await this.getIPFSApi();
    return api.downloadAndDecryptFile(cid);
  }

  static async getFileMetadata(cid: string): Promise<any> {
    const api = await this.getIPFSApi();
    return api.getFileMetadata(cid);
  }
}

/**
 * Storage metadata for content integrity verification
 */
export interface StorageMetadata {
  contentHash: string;
  contentType: ContentType;
  privacyLevel: PrivacyLevel;
  authorId: string;
  timestamp: string;
  originalSize: number;
  version: string;
}

/**
 * Storage result interface
 */
export interface StorageResult {
  ipfsHash: string;
  storjKey?: string;
  metadata: StorageMetadata;
  isEncrypted: boolean;
  fallbackUsed?: boolean;
  storageMethod: 'ipfs' | 'storj' | 'fallback';
}

/**
 * Content package for storage
 */
interface ContentPackage {
  content: string;
  metadata: StorageMetadata;
  attachments?: {
    name: string;
    data: ArrayBuffer;
    type: string;
  }[];
}

/**
 * Qsocial Storage Service
 * Handles IPFS integration for posts and comments with encryption and fallback mechanisms
 */
export class QsocialStorageService {
  private static readonly STORAGE_VERSION = '1.0.0';
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 1000;

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
   * Verify content integrity using hash
   */
  private static async verifyContentIntegrity(content: string, expectedHash: string): Promise<boolean> {
    const actualHash = await this.generateContentHash(content);
    return actualHash === expectedHash;
  }

  /**
   * Create storage metadata
   */
  private static async createStorageMetadata(
    content: string,
    contentType: ContentType,
    privacyLevel: PrivacyLevel,
    authorId: string
  ): Promise<StorageMetadata> {
    const contentHash = await this.generateContentHash(content);
    
    return {
      contentHash,
      contentType,
      privacyLevel,
      authorId,
      timestamp: new Date().toISOString(),
      originalSize: new TextEncoder().encode(content).length,
      version: this.STORAGE_VERSION
    };
  }

  /**
   * Store post content to IPFS with encryption based on privacy level
   */
  static async storePostContent(post: Omit<QsocialPost, 'id' | 'ipfsHash'>): Promise<StorageResult> {
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('No active identity found for content storage');
    }

    try {
      const metadata = await this.createStorageMetadata(
        post.content,
        post.contentType,
        post.privacyLevel,
        post.authorId
      );

      const contentPackage: ContentPackage = {
        content: post.content,
        metadata,
        // TODO: Add support for media attachments
      };

      let ipfsHash: string;
      let isEncrypted = false;

      // Determine storage method based on privacy level
      switch (post.privacyLevel) {
        case PrivacyLevel.PUBLIC:
          // Store publicly on IPFS
          ipfsHash = await this.storePublicContent(contentPackage);
          break;
          
        case PrivacyLevel.COMMUNITY:
        case PrivacyLevel.PRIVATE:
          // Store encrypted content
          ipfsHash = await this.storeEncryptedContent(contentPackage);
          isEncrypted = true;
          break;
          
        default:
          throw new Error(`Unsupported privacy level: ${post.privacyLevel}`);
      }

      console.log(`[QsocialStorage] Post content stored successfully. IPFS Hash: ${ipfsHash}, Encrypted: ${isEncrypted}`);

      // Also try to store to Storj/Filecoin as backup
      let storjKey: string | undefined;
      try {
        const storjResult = await StorjFilecoinService.uploadPostContent(post);
        storjKey = storjResult.key;
        console.log(`[QsocialStorage] Post content also stored to Storj/Filecoin. Key: ${storjKey}`);
      } catch (storjError) {
        console.warn('[QsocialStorage] Failed to store to Storj/Filecoin, continuing with IPFS only:', storjError);
      }

      return {
        ipfsHash,
        storjKey,
        metadata,
        isEncrypted,
        storageMethod: 'ipfs' as const
      };

    } catch (error) {
      console.error('[QsocialStorage] Error storing post content:', error);
      
      // Attempt fallback storage
      try {
        const fallbackResult = await this.fallbackStorage(post.content, post.privacyLevel);
        return {
          ...fallbackResult,
          fallbackUsed: true
        };
      } catch (fallbackError) {
        console.error('[QsocialStorage] Fallback storage also failed:', fallbackError);
        throw new Error(`Failed to store post content: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Store comment content to IPFS
   */
  static async storeCommentContent(comment: Omit<QsocialComment, 'id' | 'ipfsHash'>): Promise<StorageResult> {
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('No active identity found for content storage');
    }

    try {
      const metadata = await this.createStorageMetadata(
        comment.content,
        ContentType.TEXT, // Comments are always text
        comment.privacyLevel,
        comment.authorId
      );

      const contentPackage: ContentPackage = {
        content: comment.content,
        metadata
      };

      let ipfsHash: string;
      let isEncrypted = false;

      // Determine storage method based on privacy level
      switch (comment.privacyLevel) {
        case PrivacyLevel.PUBLIC:
          ipfsHash = await this.storePublicContent(contentPackage);
          break;
          
        case PrivacyLevel.COMMUNITY:
        case PrivacyLevel.PRIVATE:
          ipfsHash = await this.storeEncryptedContent(contentPackage);
          isEncrypted = true;
          break;
          
        default:
          throw new Error(`Unsupported privacy level: ${comment.privacyLevel}`);
      }

      console.log(`[QsocialStorage] Comment content stored successfully. IPFS Hash: ${ipfsHash}, Encrypted: ${isEncrypted}`);

      // Also try to store to Storj/Filecoin as backup
      let storjKey: string | undefined;
      try {
        const storjResult = await StorjFilecoinService.uploadCommentContent(comment);
        storjKey = storjResult.key;
        console.log(`[QsocialStorage] Comment content also stored to Storj/Filecoin. Key: ${storjKey}`);
      } catch (storjError) {
        console.warn('[QsocialStorage] Failed to store comment to Storj/Filecoin, continuing with IPFS only:', storjError);
      }

      return {
        ipfsHash,
        storjKey,
        metadata,
        isEncrypted,
        storageMethod: 'ipfs' as const
      };

    } catch (error) {
      console.error('[QsocialStorage] Error storing comment content:', error);
      
      // Attempt fallback storage
      try {
        const fallbackResult = await this.fallbackStorage(comment.content, comment.privacyLevel);
        return {
          ...fallbackResult,
          fallbackUsed: true
        };
      } catch (fallbackError) {
        console.error('[QsocialStorage] Fallback storage also failed:', fallbackError);
        throw new Error(`Failed to store comment content: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Retrieve content from Storj/Filecoin
   */
  static async retrieveContentFromStorj(storjKey: string): Promise<{
    content: string;
    metadata: StorageMetadata;
    verified: boolean;
  }> {
    try {
      const result = await StorjFilecoinService.downloadContent(storjKey);
      
      // Convert Storj metadata to our StorageMetadata format
      const metadata: StorageMetadata = {
        contentHash: result.metadata.contentHash,
        contentType: result.metadata.contentType as ContentType,
        privacyLevel: result.metadata.privacyLevel,
        authorId: result.metadata.authorId,
        timestamp: result.metadata.timestamp,
        originalSize: 0, // Not available from Storj metadata
        version: this.STORAGE_VERSION
      };

      // Extract content from the stored data
      const content = result.content.content || result.content.title || '';

      console.log(`[QsocialStorage] Content retrieved from Storj/Filecoin. Key: ${storjKey}, Verified: ${result.verified}`);

      return {
        content,
        metadata,
        verified: result.verified
      };

    } catch (error) {
      console.error(`[QsocialStorage] Error retrieving content from Storj/Filecoin (${storjKey}):`, error);
      throw new Error(`Failed to retrieve content from Storj/Filecoin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve and verify content from IPFS with Storj/Filecoin fallback
   */
  static async retrieveContentWithFallback(
    ipfsHash: string, 
    storjKey?: string, 
    isEncrypted: boolean = false
  ): Promise<{
    content: string;
    metadata: StorageMetadata;
    verified: boolean;
    source: 'ipfs' | 'storj' | 'fallback';
  }> {
    // Try IPFS first
    try {
      const result = await this.retrieveContent(ipfsHash, isEncrypted);
      return {
        ...result,
        source: 'ipfs' as const
      };
    } catch (ipfsError) {
      console.warn(`[QsocialStorage] Failed to retrieve from IPFS (${ipfsHash}), trying Storj/Filecoin...`);
      
      // Try Storj/Filecoin if available
      if (storjKey) {
        try {
          const result = await this.retrieveContentFromStorj(storjKey);
          return {
            ...result,
            source: 'storj' as const
          };
        } catch (storjError) {
          console.warn(`[QsocialStorage] Failed to retrieve from Storj/Filecoin (${storjKey}), trying fallback...`);
        }
      }

      // Try fallback storage if IPFS hash indicates fallback
      if (ipfsHash.startsWith('fallback:')) {
        try {
          const fallbackKey = ipfsHash.replace('fallback:', '');
          const result = await this.retrieveFallbackContent(fallbackKey, isEncrypted);
          return {
            ...result,
            source: 'fallback' as const
          };
        } catch (fallbackError) {
          console.error(`[QsocialStorage] All storage methods failed for content retrieval`);
        }
      }

      throw new Error(`Failed to retrieve content from all available storage methods`);
    }
  }

  /**
   * Retrieve and verify content from IPFS
   */
  static async retrieveContent(ipfsHash: string, isEncrypted: boolean = false): Promise<{
    content: string;
    metadata: StorageMetadata;
    verified: boolean;
  }> {
    try {
      let contentPackage: ContentPackage;

      if (isEncrypted) {
        // Retrieve encrypted content
        const result = await IPFSImports.downloadAndDecryptFile(ipfsHash);
        contentPackage = JSON.parse(new TextDecoder().decode(result.data));
      } else {
        // Retrieve public content
        contentPackage = await IPFSImports.getFromIPFS<ContentPackage>(ipfsHash);
      }

      if (!contentPackage || !contentPackage.content || !contentPackage.metadata) {
        throw new Error('Invalid content package retrieved from IPFS');
      }

      // Verify content integrity
      const verified = await this.verifyContentIntegrity(
        contentPackage.content,
        contentPackage.metadata.contentHash
      );

      if (!verified) {
        console.warn(`[QsocialStorage] Content integrity verification failed for IPFS hash: ${ipfsHash}`);
      }

      console.log(`[QsocialStorage] Content retrieved successfully. Hash: ${ipfsHash}, Verified: ${verified}`);

      return {
        content: contentPackage.content,
        metadata: contentPackage.metadata,
        verified
      };

    } catch (error) {
      console.error(`[QsocialStorage] Error retrieving content from IPFS (${ipfsHash}):`, error);
      throw new Error(`Failed to retrieve content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store public content to IPFS
   */
  private static async storePublicContent(contentPackage: ContentPackage): Promise<string> {
    return await this.retryOperation(async () => {
      return await IPFSImports.uploadToIPFS(contentPackage);
    });
  }

  /**
   * Store encrypted content to IPFS
   */
  private static async storeEncryptedContent(contentPackage: ContentPackage): Promise<string> {
    return await this.retryOperation(async () => {
      const contentJson = JSON.stringify(contentPackage);
      const contentBuffer = new TextEncoder().encode(contentJson);
      
      // Use the existing encrypted file upload
      return await IPFSImports.uploadEncryptedFile(contentBuffer.buffer, `qsocial-content-${Date.now()}.json`);
    });
  }

  /**
   * Fallback storage mechanism (local storage or alternative IPFS node)
   */
  private static async fallbackStorage(content: string, privacyLevel: PrivacyLevel): Promise<StorageResult> {
    console.log('[QsocialStorage] Attempting fallback storage...');
    
    // For now, we'll use local storage as fallback
    // In production, this could be an alternative IPFS node or temporary database storage
    const fallbackKey = `qsocial_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('No active identity for fallback storage');
    }

    const metadata = await this.createStorageMetadata(
      content,
      ContentType.TEXT,
      privacyLevel,
      identity.did
    );

    const contentPackage: ContentPackage = {
      content,
      metadata
    };

    // Store in localStorage (encrypted if needed)
    if (privacyLevel === PrivacyLevel.PUBLIC) {
      localStorage.setItem(fallbackKey, JSON.stringify(contentPackage));
    } else {
      // For private/community content, we should encrypt before storing
      // This is a simplified fallback - in production, use proper encryption
      const encryptedContent = btoa(JSON.stringify(contentPackage));
      localStorage.setItem(fallbackKey, encryptedContent);
    }

    console.log(`[QsocialStorage] Content stored in fallback storage with key: ${fallbackKey}`);

    return {
      ipfsHash: `fallback:${fallbackKey}`,
      metadata,
      isEncrypted: privacyLevel !== PrivacyLevel.PUBLIC,
      storageMethod: 'fallback' as const
    };
  }

  /**
   * Retrieve content from fallback storage
   */
  static async retrieveFallbackContent(fallbackKey: string, isEncrypted: boolean = false): Promise<{
    content: string;
    metadata: StorageMetadata;
    verified: boolean;
  }> {
    try {
      const storedData = localStorage.getItem(fallbackKey);
      if (!storedData) {
        throw new Error('Fallback content not found');
      }

      let contentPackage: ContentPackage;
      
      if (isEncrypted) {
        const decryptedData = atob(storedData);
        contentPackage = JSON.parse(decryptedData);
      } else {
        contentPackage = JSON.parse(storedData);
      }

      // Verify content integrity
      const verified = await this.verifyContentIntegrity(
        contentPackage.content,
        contentPackage.metadata.contentHash
      );

      return {
        content: contentPackage.content,
        metadata: contentPackage.metadata,
        verified
      };

    } catch (error) {
      console.error(`[QsocialStorage] Error retrieving fallback content (${fallbackKey}):`, error);
      throw new Error(`Failed to retrieve fallback content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if content exists and is accessible
   */
  static async checkContentAvailability(ipfsHash: string, isEncrypted: boolean = false): Promise<boolean> {
    try {
      if (ipfsHash.startsWith('fallback:')) {
        const fallbackKey = ipfsHash.replace('fallback:', '');
        return localStorage.getItem(fallbackKey) !== null;
      }

      if (isEncrypted) {
        const metadata = await IPFSImports.getFileMetadata(ipfsHash);
        return !!metadata;
      } else {
        // Try to get just metadata without full content
        const result = await IPFSImports.getFromIPFS<{ metadata: StorageMetadata }>(ipfsHash);
        return !!result?.metadata;
      }
    } catch (error) {
      console.error(`[QsocialStorage] Error checking content availability (${ipfsHash}):`, error);
      return false;
    }
  }

  /**
   * Clean up fallback storage (remove old entries)
   */
  static cleanupFallbackStorage(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('qsocial_fallback_')) {
          try {
            const timestampMatch = key.match(/qsocial_fallback_(\d+)_/);
            if (timestampMatch) {
              const timestamp = parseInt(timestampMatch[1]);
              if (now - timestamp > maxAgeMs) {
                keysToRemove.push(key);
              }
            }
          } catch (error) {
            // If we can't parse the timestamp, remove the key
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`[QsocialStorage] Cleaned up fallback storage key: ${key}`);
      });

      if (keysToRemove.length > 0) {
        console.log(`[QsocialStorage] Cleaned up ${keysToRemove.length} fallback storage entries`);
      }

    } catch (error) {
      console.error('[QsocialStorage] Error during fallback storage cleanup:', error);
    }
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
        console.log(`[QsocialStorage] Attempt ${attempt} failed, retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Storage management utilities
   */
  static async manageStorage(): Promise<{
    ipfsStats: any;
    storjStats: any;
    fallbackStats: any;
    cleanupResults: any;
  }> {
    const results = {
      ipfsStats: null,
      storjStats: null,
      fallbackStats: this.getStorageStats(),
      cleanupResults: {
        fallbackCleaned: 0,
        storjCleaned: 0
      }
    };

    try {
      // Get Storj/Filecoin statistics
      results.storjStats = await StorjFilecoinService.getStorageStats();
    } catch (error) {
      console.warn('[QsocialStorage] Failed to get Storj/Filecoin stats:', error);
    }

    try {
      // Cleanup old fallback storage
      this.cleanupFallbackStorage();
      
      // Cleanup old Storj/Filecoin content (30 days)
      const storjCleaned = await StorjFilecoinService.cleanupOldContent(30 * 24 * 60 * 60 * 1000);
      results.cleanupResults.storjCleaned = storjCleaned;
    } catch (error) {
      console.warn('[QsocialStorage] Failed to cleanup storage:', error);
    }

    return results;
  }

  /**
   * Initialize storage services
   */
  static async initializeStorageServices(storjConfig?: any): Promise<void> {
    try {
      if (storjConfig) {
        await StorjFilecoinService.initialize(storjConfig);
        console.log('[QsocialStorage] Storj/Filecoin service initialized');
      }
    } catch (error) {
      console.warn('[QsocialStorage] Failed to initialize Storj/Filecoin service:', error);
    }
  }

  /**
   * Test all storage connections
   */
  static async testStorageConnections(): Promise<{
    ipfs: boolean;
    storj: boolean;
    fallback: boolean;
  }> {
    const results = {
      ipfs: false,
      storj: false,
      fallback: true // Fallback (localStorage) is always available
    };

    // Test IPFS connection
    try {
      await IPFSImports.uploadToIPFS('test', {});
      results.ipfs = true;
    } catch (error) {
      console.warn('[QsocialStorage] IPFS connection test failed:', error);
    }

    // Test Storj/Filecoin connection
    try {
      results.storj = await StorjFilecoinService.testConnection();
    } catch (error) {
      console.warn('[QsocialStorage] Storj/Filecoin connection test failed:', error);
    }

    return results;
  }

  /**
   * Get storage statistics
   */
  static getStorageStats(): {
    fallbackEntries: number;
    fallbackSizeBytes: number;
  } {
    let fallbackEntries = 0;
    let fallbackSizeBytes = 0;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('qsocial_fallback_')) {
          fallbackEntries++;
          const value = localStorage.getItem(key);
          if (value) {
            fallbackSizeBytes += new TextEncoder().encode(value).length;
          }
        }
      }
    } catch (error) {
      console.error('[QsocialStorage] Error calculating storage stats:', error);
    }

    return {
      fallbackEntries,
      fallbackSizeBytes
    };
  }
}