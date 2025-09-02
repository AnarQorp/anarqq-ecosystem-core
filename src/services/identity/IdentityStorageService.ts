/**
 * Identity Storage Service
 * Combines IPFS storage and local storage for comprehensive identity data management
 * Requirements: 2.7, 2.8, 1.4, 4.1 - Complete storage and persistence solution
 */

import { ExtendedSquidIdentity, IdentityStorageInterface } from '@/types/identity';
import { identityIPFSStorage } from './IdentityIPFSStorage';
import { identityLocalStorage } from './IdentityLocalStorage';

export interface StorageOperationResult {
  success: boolean;
  ipfsHash?: string;
  error?: string;
  fromCache?: boolean;
}

export interface StorageSyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export interface StorageStats {
  ipfs: {
    totalStored: number;
    cacheHitRate: number;
  };
  local: {
    identitiesCount: number;
    treesCount: number;
    auditLogsCount: number;
    totalSize: number;
    lastCleanup: string | null;
  };
  session: {
    activeIdentityId: string | null;
    switchCount: number;
    sessionDuration: number;
  };
}

/**
 * Comprehensive Identity Storage Service
 * Orchestrates IPFS and local storage operations
 */
export class IdentityStorageService implements IdentityStorageInterface {
  private static instance: IdentityStorageService;
  private syncQueue: Set<string> = new Set();
  private syncInProgress = false;

  private constructor() {
    // Setup periodic sync
    this.setupPeriodicSync();
  }

  public static getInstance(): IdentityStorageService {
    if (!IdentityStorageService.instance) {
      IdentityStorageService.instance = new IdentityStorageService();
    }
    return IdentityStorageService.instance;
  }

  /**
   * Store identity metadata with dual storage strategy
   * Requirements: 2.7, 2.8 - Store encrypted profile and upload to IPFS
   */
  async storeIdentityMetadata(identity: ExtendedSquidIdentity): Promise<string> {
    try {
      console.log(`[IdentityStorageService] Storing identity: ${identity.did}`);

      // Store in IPFS first (authoritative storage)
      const ipfsHash = await identityIPFSStorage.storeIdentityMetadata(identity);

      // Cache locally for fast access
      await identityLocalStorage.cacheIdentity(identity, ipfsHash);

      console.log(`[IdentityStorageService] Successfully stored identity: ${identity.did} (IPFS: ${ipfsHash})`);
      return ipfsHash;

    } catch (error) {
      console.error('[IdentityStorageService] Failed to store identity metadata:', error);
      
      // Fallback: try to cache locally even if IPFS fails
      try {
        await identityLocalStorage.cacheIdentity(identity);
        this.syncQueue.add(identity.did);
        console.warn(`[IdentityStorageService] Stored identity locally, queued for IPFS sync: ${identity.did}`);
        return 'local-pending-sync';
      } catch (localError) {
        throw new Error(`Failed to store identity: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Retrieve identity metadata with cache-first strategy
   * Requirements: 2.7, 2.8 - Retrieve and decrypt identity data
   */
  async retrieveIdentityMetadata(ipfsHash: string): Promise<ExtendedSquidIdentity> {
    try {
      console.log(`[IdentityStorageService] Retrieving identity from IPFS: ${ipfsHash}`);

      // Try IPFS first (authoritative source)
      const identity = await identityIPFSStorage.retrieveIdentityMetadata(ipfsHash);

      // Update local cache
      await identityLocalStorage.cacheIdentity(identity, ipfsHash);

      return identity;

    } catch (error) {
      console.warn('[IdentityStorageService] IPFS retrieval failed, checking local cache:', error);
      
      // Fallback: try to find in local cache by IPFS hash
      const cachedIdentities = await identityLocalStorage.getAllCachedIdentities();
      const cachedIdentity = cachedIdentities.find(id => 
        identityIPFSStorage.getCachedIPFSHash(id.did) === ipfsHash
      );

      if (cachedIdentity) {
        console.log(`[IdentityStorageService] Retrieved from local cache: ${cachedIdentity.did}`);
        return cachedIdentity;
      }

      throw new Error(`Failed to retrieve identity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get identity by DID with intelligent caching
   */
  async getIdentityByDID(did: string): Promise<ExtendedSquidIdentity | null> {
    try {
      // Try local cache first for speed
      const cachedIdentity = await identityLocalStorage.getCachedIdentity(did);
      if (cachedIdentity) {
        console.log(`[IdentityStorageService] Retrieved from cache: ${did}`);
        return cachedIdentity;
      }

      // Try to get IPFS hash from cache and retrieve
      const ipfsHash = identityIPFSStorage.getCachedIPFSHash(did);
      if (ipfsHash) {
        return await this.retrieveIdentityMetadata(ipfsHash);
      }

      console.warn(`[IdentityStorageService] Identity not found: ${did}`);
      return null;

    } catch (error) {
      console.error('[IdentityStorageService] Failed to get identity by DID:', error);
      return null;
    }
  }

  /**
   * Cache identity locally
   * Requirements: 1.4 - Local identity persistence
   */
  async cacheIdentity(identity: ExtendedSquidIdentity): Promise<void> {
    try {
      const ipfsHash = identityIPFSStorage.getCachedIPFSHash(identity.did);
      await identityLocalStorage.cacheIdentity(identity, ipfsHash || undefined);
      console.log(`[IdentityStorageService] Cached identity locally: ${identity.did}`);
    } catch (error) {
      console.error('[IdentityStorageService] Failed to cache identity:', error);
      throw error;
    }
  }

  /**
   * Get cached identity from local storage
   */
  async getCachedIdentity(identityId: string): Promise<ExtendedSquidIdentity | null> {
    return await identityLocalStorage.getCachedIdentity(identityId);
  }

  /**
   * Clear cache for specific identity or all identities
   */
  async clearCache(identityId?: string): Promise<void> {
    try {
      await identityLocalStorage.clearCache(identityId);
      identityIPFSStorage.clearCache(identityId);
      
      if (identityId) {
        this.syncQueue.delete(identityId);
        console.log(`[IdentityStorageService] Cleared cache for identity: ${identityId}`);
      } else {
        this.syncQueue.clear();
        console.log('[IdentityStorageService] Cleared all caches');
      }
    } catch (error) {
      console.error('[IdentityStorageService] Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Set active identity in session storage
   * Requirements: 4.1 - Active identity management
   */
  async setActiveIdentity(identity: ExtendedSquidIdentity): Promise<void> {
    try {
      await identityLocalStorage.setActiveIdentity(identity);
      
      // Ensure the identity is cached locally for quick access
      await this.cacheIdentity(identity);
      
      console.log(`[IdentityStorageService] Set active identity: ${identity.did}`);
    } catch (error) {
      console.error('[IdentityStorageService] Failed to set active identity:', error);
      throw error;
    }
  }

  /**
   * Get active identity from session storage
   */
  async getActiveIdentity(): Promise<ExtendedSquidIdentity | null> {
    return await identityLocalStorage.getActiveIdentity();
  }

  /**
   * Clear active identity from session storage
   */
  async clearActiveIdentity(): Promise<void> {
    await identityLocalStorage.clearActiveIdentity();
    console.log('[IdentityStorageService] Cleared active identity');
  }

  /**
   * Store multiple identities in batch
   */
  async storeIdentityBatch(identities: ExtendedSquidIdentity[]): Promise<{ [did: string]: string }> {
    const results: { [did: string]: string } = {};
    const errors: string[] = [];

    // Store in IPFS batch
    try {
      const ipfsResults = await identityIPFSStorage.storeIdentityBatch(identities);
      Object.assign(results, ipfsResults);
    } catch (error) {
      errors.push(`IPFS batch storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Cache locally
    for (const identity of identities) {
      try {
        const ipfsHash = results[identity.did];
        await identityLocalStorage.cacheIdentity(identity, ipfsHash);
        
        if (!ipfsHash) {
          this.syncQueue.add(identity.did);
        }
      } catch (error) {
        errors.push(`Local caching failed for ${identity.did}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      console.warn('[IdentityStorageService] Batch storage completed with errors:', errors);
    }

    return results;
  }

  /**
   * Retrieve multiple identities by IPFS hashes
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
      console.warn('[IdentityStorageService] Batch retrieval completed with errors:', errors);
    }

    return results;
  }

  /**
   * Sync pending identities to IPFS
   */
  async syncPendingIdentities(): Promise<StorageSyncResult> {
    if (this.syncInProgress) {
      console.log('[IdentityStorageService] Sync already in progress, skipping');
      return { success: true, synced: 0, failed: 0, errors: [] };
    }

    this.syncInProgress = true;
    const result: StorageSyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      console.log(`[IdentityStorageService] Syncing ${this.syncQueue.size} pending identities`);

      for (const identityId of Array.from(this.syncQueue)) {
        try {
          const cachedIdentity = await identityLocalStorage.getCachedIdentity(identityId);
          if (cachedIdentity) {
            const ipfsHash = await identityIPFSStorage.storeIdentityMetadata(cachedIdentity);
            await identityLocalStorage.cacheIdentity(cachedIdentity, ipfsHash);
            this.syncQueue.delete(identityId);
            result.synced++;
            console.log(`[IdentityStorageService] Synced identity: ${identityId} (${ipfsHash})`);
          } else {
            this.syncQueue.delete(identityId);
            result.failed++;
            result.errors.push(`Identity not found in cache: ${identityId}`);
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to sync ${identityId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.success = result.failed === 0;
      console.log(`[IdentityStorageService] Sync completed: ${result.synced} synced, ${result.failed} failed`);

    } catch (error) {
      result.success = false;
      result.errors.push(`Sync process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Get comprehensive storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      const localStats = await identityLocalStorage.getStorageStats();
      const ipfsStats = identityIPFSStorage.getCacheStats();
      const switchHistory = identityLocalStorage.getSwitchHistory();
      const activeIdentity = await identityLocalStorage.getActiveIdentity();

      // Calculate session duration
      const sessionStart = switchHistory.length > 0 
        ? new Date(switchHistory[switchHistory.length - 1].timestamp).getTime()
        : Date.now();
      const sessionDuration = Date.now() - sessionStart;

      return {
        ipfs: {
          totalStored: ipfsStats.totalEntries,
          cacheHitRate: ipfsStats.totalEntries > 0 
            ? (ipfsStats.validEntries / ipfsStats.totalEntries) * 100 
            : 0
        },
        local: localStats,
        session: {
          activeIdentityId: activeIdentity?.did || null,
          switchCount: switchHistory.length,
          sessionDuration
        }
      };

    } catch (error) {
      console.error('[IdentityStorageService] Failed to get storage stats:', error);
      return {
        ipfs: { totalStored: 0, cacheHitRate: 0 },
        local: { identitiesCount: 0, treesCount: 0, auditLogsCount: 0, totalSize: 0, lastCleanup: null },
        session: { activeIdentityId: null, switchCount: 0, sessionDuration: 0 }
      };
    }
  }

  /**
   * Check storage health and integrity
   */
  async checkStorageHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check if IPFS is accessible
      try {
        await identityIPFSStorage.identityExists('QmTestHash');
      } catch (error) {
        issues.push('IPFS service is not accessible');
        recommendations.push('Check IPFS connection and authentication');
      }

      // Check local storage quota
      const stats = await this.getStorageStats();
      if (stats.local.totalSize > 50 * 1024 * 1024) { // 50MB
        issues.push('Local storage usage is high');
        recommendations.push('Consider clearing old cached identities');
      }

      // Check sync queue size
      if (this.syncQueue.size > 10) {
        issues.push('Large number of identities pending sync');
        recommendations.push('Run manual sync or check IPFS connectivity');
      }

      // Check for expired cache entries
      const ipfsStats = identityIPFSStorage.getCacheStats();
      if (ipfsStats.expiredEntries > ipfsStats.validEntries) {
        issues.push('Many expired cache entries detected');
        recommendations.push('Clear expired cache entries');
      }

      return {
        healthy: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error) {
      return {
        healthy: false,
        issues: ['Failed to check storage health'],
        recommendations: ['Restart the application and check storage services']
      };
    }
  }

  /**
   * Perform storage maintenance
   */
  async performMaintenance(): Promise<{
    success: boolean;
    actions: string[];
    errors: string[];
  }> {
    const actions: string[] = [];
    const errors: string[] = [];

    try {
      // Clear expired IPFS cache
      identityIPFSStorage.clearCache();
      actions.push('Cleared expired IPFS cache');

      // Sync pending identities
      const syncResult = await this.syncPendingIdentities();
      if (syncResult.success) {
        actions.push(`Synced ${syncResult.synced} pending identities`);
      } else {
        errors.push(...syncResult.errors);
      }

      // The local storage cleanup is handled automatically by the service

      return {
        success: errors.length === 0,
        actions,
        errors
      };

    } catch (error) {
      errors.push(`Maintenance failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        actions,
        errors
      };
    }
  }

  // Module context management (delegated to local storage)
  setModuleContext(module: string, context: any): void {
    identityLocalStorage.setModuleContext(module, context);
  }

  getModuleContext(module: string): any {
    return identityLocalStorage.getModuleContext(module);
  }

  clearModuleContext(module: string): void {
    identityLocalStorage.clearModuleContext(module);
  }

  getSwitchHistory(): Array<{ identityId: string; timestamp: string; switchId: string }> {
    return identityLocalStorage.getSwitchHistory();
  }

  // Private helper methods

  private setupPeriodicSync(): void {
    // Sync every 5 minutes
    setInterval(async () => {
      if (this.syncQueue.size > 0) {
        console.log('[IdentityStorageService] Running periodic sync');
        await this.syncPendingIdentities();
      }
    }, 5 * 60 * 1000);

    // Maintenance every hour
    setInterval(async () => {
      console.log('[IdentityStorageService] Running periodic maintenance');
      await this.performMaintenance();
    }, 60 * 60 * 1000);
  }
}

// Export singleton instance
export const identityStorageService = IdentityStorageService.getInstance();