/**
 * Secure Storage Service for Qsocial
 * Handles encrypted storage on IPFS and Storj/Filecoin
 */

import { EncryptionService, EncryptedContent, EncryptionKey } from './EncryptionService';
import { uploadToIPFS, downloadFromIPFS } from '../../api/ipfs';
import type { PrivacyLevel } from '../../types/qsocial';

/**
 * Storage location information
 */
export interface StorageLocation {
  type: 'ipfs' | 'storj' | 'local';
  identifier: string; // IPFS hash, Storj CID, or local path
  encrypted: boolean;
  keyId?: string;
  createdAt: Date;
  size?: number;
}

/**
 * Secure storage result
 */
export interface SecureStorageResult {
  success: boolean;
  locations: StorageLocation[];
  error?: string;
  encryptionKey?: EncryptionKey;
}

/**
 * Storage retrieval result
 */
export interface StorageRetrievalResult {
  success: boolean;
  data?: string | ArrayBuffer;
  error?: string;
  decrypted: boolean;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  preferredStorage: 'ipfs' | 'storj' | 'hybrid';
  encryptPrivateContent: boolean;
  encryptCommunityContent: boolean;
  redundancy: number; // Number of storage locations
  compressionEnabled: boolean;
}

/**
 * Secure Storage Service for encrypted content
 */
export class SecureStorageService {
  private static readonly DEFAULT_CONFIG: StorageConfig = {
    preferredStorage: 'hybrid',
    encryptPrivateContent: true,
    encryptCommunityContent: true,
    redundancy: 2,
    compressionEnabled: true
  };

  /**
   * Store content securely based on privacy level
   */
  static async storeContent(
    content: string,
    contentId: string,
    privacyLevel: PrivacyLevel,
    config: Partial<StorageConfig> = {}
  ): Promise<SecureStorageResult> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const locations: StorageLocation[] = [];
    let encryptionKey: EncryptionKey | undefined;

    try {
      // Determine if content should be encrypted
      const shouldEncrypt = this.shouldEncryptContent(privacyLevel, finalConfig);
      let dataToStore = content;
      let encrypted = false;

      if (shouldEncrypt) {
        // Generate storage encryption key
        encryptionKey = await EncryptionService.generateStorageKey(contentId, privacyLevel);
        
        // Encrypt content for storage
        const encryptedContent = await EncryptionService.encryptForStorage(content, encryptionKey);
        dataToStore = JSON.stringify(encryptedContent);
        encrypted = true;
      }

      // Compress if enabled
      if (finalConfig.compressionEnabled) {
        dataToStore = await this.compressData(dataToStore);
      }

      // Store in multiple locations based on configuration
      const storagePromises: Promise<StorageLocation | null>[] = [];

      // IPFS storage
      if (finalConfig.preferredStorage === 'ipfs' || finalConfig.preferredStorage === 'hybrid') {
        storagePromises.push(this.storeInIPFS(dataToStore, encrypted));
      }

      // Storj/Filecoin storage (simulated with S3-compatible API)
      if (finalConfig.preferredStorage === 'storj' || finalConfig.preferredStorage === 'hybrid') {
        storagePromises.push(this.storeInStorj(dataToStore, contentId, encrypted));
      }

      // Wait for storage operations
      const results = await Promise.allSettled(storagePromises);
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          locations.push(result.value);
        }
      }

      // Ensure minimum redundancy
      if (locations.length < Math.min(finalConfig.redundancy, 1)) {
        return {
          success: false,
          locations,
          error: 'Failed to achieve minimum storage redundancy'
        };
      }

      return {
        success: true,
        locations,
        encryptionKey
      };

    } catch (error) {
      return {
        success: false,
        locations,
        error: error instanceof Error ? error.message : 'Storage operation failed',
        encryptionKey
      };
    }
  }

  /**
   * Retrieve content from secure storage
   */
  static async retrieveContent(
    locations: StorageLocation[],
    encryptionKey?: EncryptionKey
  ): Promise<StorageRetrievalResult> {
    // Try locations in order of preference
    const sortedLocations = this.sortLocationsByPreference(locations);

    for (const location of sortedLocations) {
      try {
        let data: string | null = null;

        // Retrieve from storage location
        switch (location.type) {
          case 'ipfs':
            data = await this.retrieveFromIPFS(location.identifier);
            break;
          case 'storj':
            data = await this.retrieveFromStorj(location.identifier);
            break;
          case 'local':
            data = await this.retrieveFromLocal(location.identifier);
            break;
        }

        if (!data) {
          continue; // Try next location
        }

        // Decompress if needed
        if (this.DEFAULT_CONFIG.compressionEnabled) {
          try {
            data = await this.decompressData(data);
          } catch (error) {
            console.warn('Decompression failed, using raw data');
          }
        }

        // Decrypt if needed
        let decrypted = false;
        if (location.encrypted && encryptionKey) {
          try {
            const encryptedContent: EncryptedContent = JSON.parse(data);
            const decryptedBuffer = await EncryptionService.decryptFromStorage(
              encryptedContent,
              encryptionKey
            );
            
            // Convert back to string
            const decoder = new TextDecoder();
            data = decoder.decode(decryptedBuffer);
            decrypted = true;
          } catch (error) {
            console.error('Decryption failed:', error);
            continue; // Try next location
          }
        }

        return {
          success: true,
          data,
          decrypted
        };

      } catch (error) {
        console.error(`Failed to retrieve from ${location.type}:`, error);
        continue; // Try next location
      }
    }

    return {
      success: false,
      error: 'Failed to retrieve content from any storage location',
      decrypted: false
    };
  }

  /**
   * Store content in IPFS
   */
  private static async storeInIPFS(
    content: string,
    encrypted: boolean
  ): Promise<StorageLocation | null> {
    try {
      // Convert string to file for IPFS upload
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], 'content.txt', { type: 'text/plain' });

      const result = await uploadToIPFS(file);
      
      if (result.success && result.hash) {
        return {
          type: 'ipfs',
          identifier: result.hash,
          encrypted,
          createdAt: new Date(),
          size: content.length
        };
      }

      return null;
    } catch (error) {
      console.error('IPFS storage failed:', error);
      return null;
    }
  }

  /**
   * Retrieve content from IPFS
   */
  private static async retrieveFromIPFS(hash: string): Promise<string | null> {
    try {
      const result = await downloadFromIPFS(hash);
      
      if (result.success && result.data) {
        // Convert blob to string
        if (result.data instanceof Blob) {
          return await result.data.text();
        }
        return result.data as string;
      }

      return null;
    } catch (error) {
      console.error('IPFS retrieval failed:', error);
      return null;
    }
  }

  /**
   * Store content in Storj/Filecoin (simulated)
   */
  private static async storeInStorj(
    content: string,
    contentId: string,
    encrypted: boolean
  ): Promise<StorageLocation | null> {
    try {
      // Simulate S3-compatible API call to Storj/Filecoin
      // In a real implementation, this would use AWS SDK or similar
      const response = await fetch('/api/storage/storj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: `qsocial/${contentId}`,
          content: content,
          encrypted: encrypted
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          type: 'storj',
          identifier: result.cid || result.key,
          encrypted,
          createdAt: new Date(),
          size: content.length
        };
      }

      return null;
    } catch (error) {
      console.error('Storj storage failed:', error);
      return null;
    }
  }

  /**
   * Retrieve content from Storj/Filecoin (simulated)
   */
  private static async retrieveFromStorj(identifier: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/storage/storj/${identifier}`);
      
      if (response.ok) {
        return await response.text();
      }

      return null;
    } catch (error) {
      console.error('Storj retrieval failed:', error);
      return null;
    }
  }

  /**
   * Store content locally (fallback)
   */
  private static async storeInLocal(
    content: string,
    contentId: string,
    encrypted: boolean
  ): Promise<StorageLocation | null> {
    try {
      // Use localStorage for local storage (in a real app, use IndexedDB)
      const key = `qsocial_content_${contentId}`;
      localStorage.setItem(key, content);

      return {
        type: 'local',
        identifier: key,
        encrypted,
        createdAt: new Date(),
        size: content.length
      };
    } catch (error) {
      console.error('Local storage failed:', error);
      return null;
    }
  }

  /**
   * Retrieve content from local storage
   */
  private static async retrieveFromLocal(identifier: string): Promise<string | null> {
    try {
      return localStorage.getItem(identifier);
    } catch (error) {
      console.error('Local retrieval failed:', error);
      return null;
    }
  }

  /**
   * Determine if content should be encrypted based on privacy level
   */
  private static shouldEncryptContent(
    privacyLevel: PrivacyLevel,
    config: StorageConfig
  ): boolean {
    switch (privacyLevel) {
      case PrivacyLevel.PUBLIC:
        return false;
      case PrivacyLevel.COMMUNITY:
        return config.encryptCommunityContent;
      case PrivacyLevel.PRIVATE:
        return config.encryptPrivateContent;
      default:
        return false;
    }
  }

  /**
   * Sort storage locations by preference
   */
  private static sortLocationsByPreference(locations: StorageLocation[]): StorageLocation[] {
    const preferenceOrder = ['ipfs', 'storj', 'local'];
    
    return locations.sort((a, b) => {
      const aIndex = preferenceOrder.indexOf(a.type);
      const bIndex = preferenceOrder.indexOf(b.type);
      return aIndex - bIndex;
    });
  }

  /**
   * Compress data (simple implementation)
   */
  private static async compressData(data: string): Promise<string> {
    // In a real implementation, use a proper compression library
    // For now, just return the data as-is
    return data;
  }

  /**
   * Decompress data (simple implementation)
   */
  private static async decompressData(data: string): Promise<string> {
    // In a real implementation, use a proper decompression library
    // For now, just return the data as-is
    return data;
  }

  /**
   * Clean up storage locations (remove old/unused content)
   */
  static async cleanupStorage(
    locations: StorageLocation[],
    maxAge: number = 30 * 24 * 60 * 60 * 1000 // 30 days
  ): Promise<{ cleaned: number; errors: string[] }> {
    const errors: string[] = [];
    let cleaned = 0;

    for (const location of locations) {
      const age = Date.now() - location.createdAt.getTime();
      
      if (age > maxAge) {
        try {
          await this.deleteFromStorage(location);
          cleaned++;
        } catch (error) {
          errors.push(`Failed to delete ${location.type}:${location.identifier}`);
        }
      }
    }

    return { cleaned, errors };
  }

  /**
   * Delete content from storage location
   */
  private static async deleteFromStorage(location: StorageLocation): Promise<void> {
    switch (location.type) {
      case 'ipfs':
        // IPFS content is immutable, so we can't delete it
        // In practice, we would remove it from our pinning service
        break;
      case 'storj':
        await fetch(`/api/storage/storj/${location.identifier}`, {
          method: 'DELETE'
        });
        break;
      case 'local':
        localStorage.removeItem(location.identifier);
        break;
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(locations: StorageLocation[]): Promise<{
    totalSize: number;
    locationCounts: Record<string, number>;
    encryptedCount: number;
    averageAge: number;
  }> {
    const stats = {
      totalSize: 0,
      locationCounts: { ipfs: 0, storj: 0, local: 0 },
      encryptedCount: 0,
      averageAge: 0
    };

    let totalAge = 0;

    for (const location of locations) {
      stats.totalSize += location.size || 0;
      stats.locationCounts[location.type]++;
      
      if (location.encrypted) {
        stats.encryptedCount++;
      }

      totalAge += Date.now() - location.createdAt.getTime();
    }

    stats.averageAge = locations.length > 0 ? totalAge / locations.length : 0;

    return stats;
  }

  /**
   * Verify storage integrity
   */
  static async verifyStorageIntegrity(
    locations: StorageLocation[],
    originalContent: string
  ): Promise<{
    verified: boolean;
    workingLocations: StorageLocation[];
    failedLocations: StorageLocation[];
  }> {
    const workingLocations: StorageLocation[] = [];
    const failedLocations: StorageLocation[] = [];

    for (const location of locations) {
      try {
        const result = await this.retrieveContent([location]);
        
        if (result.success && result.data === originalContent) {
          workingLocations.push(location);
        } else {
          failedLocations.push(location);
        }
      } catch (error) {
        failedLocations.push(location);
      }
    }

    return {
      verified: workingLocations.length > 0,
      workingLocations,
      failedLocations
    };
  }
}