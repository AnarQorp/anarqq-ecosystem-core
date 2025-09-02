/**
 * Identity IPFS Storage Service
 * Handles encrypted storage and retrieval of identity metadata in IPFS
 * Requirements: 2.7, 2.8 - Store encrypted profile using Qlock and upload metadata to IPFS
 */

import { ExtendedSquidIdentity, IdentityStorageInterface } from '@/types/identity';
import { uploadToIPFS, getFromIPFS } from '@/utils/ipfs';
import { encrypt, decrypt } from '@/api/qlock';
import { getActiveIdentity } from '@/lib/squid';

export interface IdentityIPFSMetadata {
  did: string;
  name: string;
  type: string;
  parentId?: string;
  rootId: string;
  depth: number;
  path: string[];
  governanceLevel: string;
  privacyLevel: string;
  avatar?: string;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  qonsentProfileId: string;
  qindexRegistered: boolean;
  // Encrypted fields
  encryptedData: {
    qlockKeyPair: any;
    auditLog: any[];
    securityFlags: any[];
    kyc: any;
    usageStats?: any;
  };
  // Metadata for IPFS storage
  storageMetadata: {
    version: string;
    encryptionAlgorithm: string;
    encryptedBy: string;
    storedAt: string;
    contentHash: string;
  };
}

export interface IdentityIPFSResult {
  success: boolean;
  ipfsHash?: string;
  identity?: ExtendedSquidIdentity;
  error?: string;
}

export interface IdentityIPFSCache {
  [identityId: string]: {
    ipfsHash: string;
    cachedAt: string;
    identity: ExtendedSquidIdentity;
  };
}

/**
 * IPFS Storage Service for Identity Metadata
 * Provides encrypted storage and retrieval of identity data
 */
export class IdentityIPFSStorage implements Partial<IdentityStorageInterface> {
  private static instance: IdentityIPFSStorage;
  private cache: IdentityIPFSCache = {};
  private readonly STORAGE_VERSION = '1.0.0';
  private readonly CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): IdentityIPFSStorage {
    if (!IdentityIPFSStorage.instance) {
      IdentityIPFSStorage.instance = new IdentityIPFSStorage();
    }
    return IdentityIPFSStorage.instance;
  }

  /**
   * Store identity metadata in IPFS with encryption
   * Requirements: 2.7 - Store encrypted profile using Qlock
   * Requirements: 2.8 - Upload metadata to IPFS
   */
  async storeIdentityMetadata(identity: ExtendedSquidIdentity): Promise<string> {
    try {
      console.log(`[IdentityIPFSStorage] Storing identity metadata for: ${identity.did}`);

      // Get current active identity for encryption context
      const activeIdentity = getActiveIdentity();
      if (!activeIdentity) {
        throw new Error('No active identity found for encryption context');
      }

      // Prepare sensitive data for encryption
      const sensitiveData = {
        qlockKeyPair: identity.qlockKeyPair,
        auditLog: identity.auditLog,
        securityFlags: identity.securityFlags,
        kyc: identity.kyc,
        usageStats: identity.usageStats
      };

      // Encrypt sensitive data using Qlock
      const encryptionResult = await encrypt(
        JSON.stringify(sensitiveData),
        activeIdentity.id,
        'QUANTUM'
      );

      if (!encryptionResult.encryptedData) {
        throw new Error('Failed to encrypt identity sensitive data');
      }

      // Create IPFS metadata structure
      const ipfsMetadata: IdentityIPFSMetadata = {
        // Public metadata (not encrypted)
        did: identity.did,
        name: identity.name,
        type: identity.type,
        parentId: identity.parentId,
        rootId: identity.rootId,
        depth: identity.depth,
        path: identity.path,
        governanceLevel: identity.governanceLevel,
        privacyLevel: identity.privacyLevel,
        avatar: identity.avatar,
        description: identity.description,
        tags: identity.tags,
        createdAt: identity.createdAt,
        updatedAt: identity.updatedAt,
        qonsentProfileId: identity.qonsentProfileId,
        qindexRegistered: identity.qindexRegistered,

        // Encrypted sensitive data
        encryptedData: {
          qlockKeyPair: encryptionResult.encryptedData,
          auditLog: encryptionResult.encryptedData,
          securityFlags: encryptionResult.encryptedData,
          kyc: encryptionResult.encryptedData,
          usageStats: encryptionResult.encryptedData
        },

        // Storage metadata
        storageMetadata: {
          version: this.STORAGE_VERSION,
          encryptionAlgorithm: 'QUANTUM',
          encryptedBy: activeIdentity.id,
          storedAt: new Date().toISOString(),
          contentHash: this.generateContentHash(identity)
        }
      };

      // Upload to IPFS
      const uploadResult = await uploadToIPFS(ipfsMetadata, {
        filename: `identity-${identity.did.split(':').pop()}.json`
      });

      const ipfsHash = uploadResult.cid;

      // Update cache
      this.cache[identity.did] = {
        ipfsHash,
        cachedAt: new Date().toISOString(),
        identity
      };

      console.log(`[IdentityIPFSStorage] Successfully stored identity metadata. IPFS Hash: ${ipfsHash}`);
      return ipfsHash;

    } catch (error) {
      console.error('[IdentityIPFSStorage] Failed to store identity metadata:', error);
      throw new Error(`Failed to store identity metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve identity metadata from IPFS with decryption
   * Requirements: 2.7, 2.8 - Retrieve and decrypt identity data
   */
  async retrieveIdentityMetadata(ipfsHash: string): Promise<ExtendedSquidIdentity> {
    try {
      console.log(`[IdentityIPFSStorage] Retrieving identity metadata from IPFS: ${ipfsHash}`);

      // Check cache first
      const cachedEntry = Object.values(this.cache).find(entry => entry.ipfsHash === ipfsHash);
      if (cachedEntry && this.isCacheValid(cachedEntry.cachedAt)) {
        console.log(`[IdentityIPFSStorage] Returning cached identity: ${cachedEntry.identity.did}`);
        return cachedEntry.identity;
      }

      // Get current active identity for decryption context
      const activeIdentity = getActiveIdentity();
      if (!activeIdentity) {
        throw new Error('No active identity found for decryption context');
      }

      // Download from IPFS
      const ipfsMetadata = await getFromIPFS<IdentityIPFSMetadata>(ipfsHash);

      if (!ipfsMetadata || !ipfsMetadata.did) {
        throw new Error('Invalid identity metadata retrieved from IPFS');
      }

      // Verify storage version compatibility
      if (ipfsMetadata.storageMetadata?.version !== this.STORAGE_VERSION) {
        console.warn(`[IdentityIPFSStorage] Version mismatch: ${ipfsMetadata.storageMetadata?.version} vs ${this.STORAGE_VERSION}`);
      }

      // Decrypt sensitive data
      let decryptedSensitiveData: any = {};
      if (ipfsMetadata.encryptedData?.qlockKeyPair) {
        try {
          const decryptionResult = await decrypt(
            ipfsMetadata.encryptedData.qlockKeyPair,
            activeIdentity.id
          );

          if (decryptionResult.success && decryptionResult.data) {
            decryptedSensitiveData = JSON.parse(decryptionResult.data);
          }
        } catch (decryptError) {
          console.warn('[IdentityIPFSStorage] Failed to decrypt sensitive data, using defaults:', decryptError);
          // Continue with empty sensitive data - identity will still be functional
        }
      }

      // Reconstruct full identity object
      const reconstructedIdentity: ExtendedSquidIdentity = {
        // Public metadata
        did: ipfsMetadata.did,
        name: ipfsMetadata.name,
        type: ipfsMetadata.type as any,
        parentId: ipfsMetadata.parentId,
        rootId: ipfsMetadata.rootId,
        children: [], // Will be populated by identity tree building
        depth: ipfsMetadata.depth,
        path: ipfsMetadata.path,
        governanceLevel: ipfsMetadata.governanceLevel as any,
        privacyLevel: ipfsMetadata.privacyLevel as any,
        avatar: ipfsMetadata.avatar,
        description: ipfsMetadata.description,
        tags: ipfsMetadata.tags,
        createdAt: ipfsMetadata.createdAt,
        updatedAt: ipfsMetadata.updatedAt,
        lastUsed: new Date().toISOString(), // Update last used on retrieval
        qonsentProfileId: ipfsMetadata.qonsentProfileId,
        qindexRegistered: ipfsMetadata.qindexRegistered,

        // Decrypted sensitive data with defaults
        qlockKeyPair: decryptedSensitiveData.qlockKeyPair || this.createDefaultKeyPair(ipfsMetadata.did),
        auditLog: decryptedSensitiveData.auditLog || [],
        securityFlags: decryptedSensitiveData.securityFlags || [],
        kyc: decryptedSensitiveData.kyc || {
          required: false,
          submitted: false,
          approved: false
        },
        usageStats: decryptedSensitiveData.usageStats || {
          switchCount: 0,
          lastSwitch: ipfsMetadata.createdAt,
          modulesAccessed: [],
          totalSessions: 0
        },

        // Derived properties
        creationRules: this.createDefaultCreationRules(ipfsMetadata.type as any),
        permissions: this.createDefaultPermissions(ipfsMetadata.type as any),
        status: 'ACTIVE' as any,

        // IPFS metadata
        qindexMetadata: {
          classification: [ipfsMetadata.type],
          searchable: ipfsMetadata.privacyLevel === 'PUBLIC',
          indexed: ipfsMetadata.qindexRegistered,
          lastSync: ipfsMetadata.storageMetadata?.storedAt || ipfsMetadata.updatedAt
        }
      };

      // Update cache
      this.cache[reconstructedIdentity.did] = {
        ipfsHash,
        cachedAt: new Date().toISOString(),
        identity: reconstructedIdentity
      };

      console.log(`[IdentityIPFSStorage] Successfully retrieved identity metadata: ${reconstructedIdentity.did}`);
      return reconstructedIdentity;

    } catch (error) {
      console.error('[IdentityIPFSStorage] Failed to retrieve identity metadata:', error);
      throw new Error(`Failed to retrieve identity metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store multiple identity metadata objects in batch
   */
  async storeIdentityBatch(identities: ExtendedSquidIdentity[]): Promise<{ [did: string]: string }> {
    const results: { [did: string]: string } = {};
    const errors: string[] = [];

    for (const identity of identities) {
      try {
        const ipfsHash = await this.storeIdentityMetadata(identity);
        results[identity.did] = ipfsHash;
      } catch (error) {
        errors.push(`Failed to store ${identity.did}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      console.warn('[IdentityIPFSStorage] Batch storage completed with errors:', errors);
    }

    return results;
  }

  /**
   * Retrieve multiple identity metadata objects by IPFS hashes
   */
  async retrieveIdentityBatch(ipfsHashes: string[]): Promise<ExtendedSquidIdentity[]> {
    const results: ExtendedSquidIdentity[] = [];
    const errors: string[] = [];

    for (const hash of ipfsHashes) {
      try {
        const identity = await this.retrieveIdentityMetadata(hash);
        results.push(identity);
      } catch (error) {
        errors.push(`Failed to retrieve ${hash}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      console.warn('[IdentityIPFSStorage] Batch retrieval completed with errors:', errors);
    }

    return results;
  }

  /**
   * Check if identity metadata exists in IPFS
   */
  async identityExists(ipfsHash: string): Promise<boolean> {
    try {
      await getFromIPFS(ipfsHash);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get IPFS hash for a cached identity
   */
  getCachedIPFSHash(identityId: string): string | null {
    const cached = this.cache[identityId];
    if (cached && this.isCacheValid(cached.cachedAt)) {
      return cached.ipfsHash;
    }
    return null;
  }

  /**
   * Clear cache for specific identity or all identities
   */
  clearCache(identityId?: string): void {
    if (identityId) {
      delete this.cache[identityId];
      console.log(`[IdentityIPFSStorage] Cleared cache for identity: ${identityId}`);
    } else {
      this.cache = {};
      console.log('[IdentityIPFSStorage] Cleared all identity cache');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalEntries: number; validEntries: number; expiredEntries: number } {
    const now = new Date().toISOString();
    let validEntries = 0;
    let expiredEntries = 0;

    Object.values(this.cache).forEach(entry => {
      if (this.isCacheValid(entry.cachedAt)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      totalEntries: Object.keys(this.cache).length,
      validEntries,
      expiredEntries
    };
  }

  // Private helper methods

  private generateContentHash(identity: ExtendedSquidIdentity): string {
    // Create a hash of the identity content for integrity verification
    const content = JSON.stringify({
      did: identity.did,
      name: identity.name,
      type: identity.type,
      updatedAt: identity.updatedAt
    });
    
    // Simple hash function (in production, use a proper cryptographic hash)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  private isCacheValid(cachedAt: string): boolean {
    const cacheTime = new Date(cachedAt).getTime();
    const now = new Date().getTime();
    return (now - cacheTime) < this.CACHE_EXPIRY_MS;
  }

  private createDefaultKeyPair(did: string): any {
    return {
      publicKey: `pub-${did.split(':').pop()}`,
      privateKey: `priv-${did.split(':').pop()}`,
      algorithm: 'ECDSA' as const,
      keySize: 256,
      createdAt: new Date().toISOString()
    };
  }

  private createDefaultCreationRules(type: string): any {
    return {
      type,
      requiresKYC: false,
      requiresDAOGovernance: false,
      requiresParentalConsent: false,
      maxDepth: 3,
      allowedChildTypes: []
    };
  }

  private createDefaultPermissions(type: string): any {
    return {
      canCreateSubidentities: type === 'ROOT' || type === 'DAO',
      canDeleteSubidentities: true,
      canModifyProfile: true,
      canAccessModule: () => true,
      canPerformAction: () => true,
      governanceLevel: 'SELF'
    };
  }
}

// Export singleton instance
export const identityIPFSStorage = IdentityIPFSStorage.getInstance();