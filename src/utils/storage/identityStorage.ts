/**
 * Identity Storage Management
 * Handles IndexedDB schema for identity caching and SessionStorage for active identity
 * Requirements: 1.4, 4.1
 */

import { ExtendedSquidIdentity, IdentityTree, IdentityType } from '@/types/identity';
import { safeLocalStorage, safeSessionStorage } from './safeStorage';

// IndexedDB Configuration
const DB_NAME = 'SquidIdentityDB';
const DB_VERSION = 1;
const IDENTITY_STORE = 'identities';
const TREE_STORE = 'identity_trees';
const CACHE_STORE = 'identity_cache';

// Storage Keys
const ACTIVE_IDENTITY_KEY = 'squid_active_identity';
const IDENTITY_TREE_KEY = 'squid_identity_tree';
const CACHE_METADATA_KEY = 'squid_cache_metadata';

// Cache Configuration
const CACHE_EXPIRY_HOURS = 24;
const MAX_CACHED_IDENTITIES = 100;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export interface IdentityCacheEntry {
  identity: ExtendedSquidIdentity;
  cachedAt: string;
  lastAccessed: string;
  accessCount: number;
  expiresAt: string;
}

export interface IdentityTreeCacheEntry {
  rootId: string;
  tree: IdentityTree;
  cachedAt: string;
  expiresAt: string;
}

export interface CacheMetadata {
  totalEntries: number;
  lastCleanup: string;
  cacheHitRate: number;
  totalHits: number;
  totalMisses: number;
}

class IdentityStorageManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private cacheMetadata: CacheMetadata = {
    totalEntries: 0,
    lastCleanup: new Date().toISOString(),
    cacheHitRate: 0,
    totalHits: 0,
    totalMisses: 0
  };

  constructor() {
    this.initializeDB();
    this.startCleanupInterval();
    this.loadCacheMetadata();
  }

  /**
   * Initialize IndexedDB with proper schema
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        console.warn('[Identity Storage] IndexedDB not available, falling back to localStorage');
        this.isInitialized = true;
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[Identity Storage] Failed to open IndexedDB:', request.error);
        this.isInitialized = true; // Continue with localStorage fallback
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('[Identity Storage] IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create identity store
        if (!db.objectStoreNames.contains(IDENTITY_STORE)) {
          const identityStore = db.createObjectStore(IDENTITY_STORE, { keyPath: 'did' });
          identityStore.createIndex('type', 'type', { unique: false });
          identityStore.createIndex('parentId', 'parentId', { unique: false });
          identityStore.createIndex('rootId', 'rootId', { unique: false });
          identityStore.createIndex('lastUsed', 'lastUsed', { unique: false });
        }

        // Create identity tree store
        if (!db.objectStoreNames.contains(TREE_STORE)) {
          const treeStore = db.createObjectStore(TREE_STORE, { keyPath: 'rootId' });
          treeStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Create cache store for metadata and frequently accessed data
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          const cacheStore = db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
          cacheStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        console.log('[Identity Storage] IndexedDB schema created');
      };
    });
  }

  /**
   * Wait for initialization to complete
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    
    return new Promise((resolve) => {
      const checkInit = () => {
        if (this.isInitialized) {
          resolve();
        } else {
          setTimeout(checkInit, 10);
        }
      };
      checkInit();
    });
  }

  /**
   * Store identity in IndexedDB with caching metadata
   */
  async storeIdentity(identity: ExtendedSquidIdentity): Promise<void> {
    await this.ensureInitialized();

    const cacheEntry: IdentityCacheEntry = {
      identity,
      cachedAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 1,
      expiresAt: new Date(Date.now() + CACHE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
    };

    if (this.db) {
      try {
        const transaction = this.db.transaction([IDENTITY_STORE, CACHE_STORE], 'readwrite');
        
        // Store identity
        const identityStore = transaction.objectStore(IDENTITY_STORE);
        await this.promisifyRequest(identityStore.put(identity));
        
        // Store cache entry
        const cacheStore = transaction.objectStore(CACHE_STORE);
        await this.promisifyRequest(cacheStore.put({
          key: `identity_${identity.did}`,
          ...cacheEntry
        }));

        console.log(`[Identity Storage] Identity stored in IndexedDB: ${identity.did}`);
      } catch (error) {
        console.error('[Identity Storage] Failed to store identity in IndexedDB:', error);
        this.fallbackToLocalStorage('identity', identity.did, identity);
      }
    } else {
      this.fallbackToLocalStorage('identity', identity.did, identity);
    }

    this.updateCacheMetadata({ totalEntries: this.cacheMetadata.totalEntries + 1 });
  }

  /**
   * Retrieve identity from IndexedDB or localStorage
   */
  async getIdentity(did: string): Promise<ExtendedSquidIdentity | null> {
    await this.ensureInitialized();

    if (this.db) {
      try {
        const transaction = this.db.transaction([IDENTITY_STORE, CACHE_STORE], 'readwrite');
        
        // Get identity
        const identityStore = transaction.objectStore(IDENTITY_STORE);
        const identity = await this.promisifyRequest(identityStore.get(did));
        
        if (identity) {
          // Update cache metadata
          const cacheStore = transaction.objectStore(CACHE_STORE);
          const cacheKey = `identity_${did}`;
          const cacheEntry = await this.promisifyRequest(cacheStore.get(cacheKey));
          
          if (cacheEntry) {
            cacheEntry.lastAccessed = new Date().toISOString();
            cacheEntry.accessCount += 1;
            await this.promisifyRequest(cacheStore.put(cacheEntry));
          }

          this.updateCacheMetadata({ totalHits: this.cacheMetadata.totalHits + 1 });
          console.log(`[Identity Storage] Identity retrieved from IndexedDB: ${did}`);
          return identity;
        }
      } catch (error) {
        console.error('[Identity Storage] Failed to retrieve identity from IndexedDB:', error);
      }
    }

    // Fallback to localStorage
    const stored = safeLocalStorage.getItem(`squid_identity_${did}`);
    if (stored) {
      try {
        const identity = JSON.parse(stored);
        this.updateCacheMetadata({ totalHits: this.cacheMetadata.totalHits + 1 });
        return identity;
      } catch (error) {
        console.error('[Identity Storage] Failed to parse identity from localStorage:', error);
      }
    }

    this.updateCacheMetadata({ totalMisses: this.cacheMetadata.totalMisses + 1 });
    return null;
  }

  /**
   * Store multiple identities efficiently
   */
  async storeIdentities(identities: ExtendedSquidIdentity[]): Promise<void> {
    await this.ensureInitialized();

    if (this.db) {
      try {
        const transaction = this.db.transaction([IDENTITY_STORE, CACHE_STORE], 'readwrite');
        const identityStore = transaction.objectStore(IDENTITY_STORE);
        const cacheStore = transaction.objectStore(CACHE_STORE);

        const promises = identities.map(async (identity) => {
          const cacheEntry: IdentityCacheEntry = {
            identity,
            cachedAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
            accessCount: 1,
            expiresAt: new Date(Date.now() + CACHE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
          };

          await this.promisifyRequest(identityStore.put(identity));
          await this.promisifyRequest(cacheStore.put({
            key: `identity_${identity.did}`,
            ...cacheEntry
          }));
        });

        await Promise.all(promises);
        console.log(`[Identity Storage] ${identities.length} identities stored in IndexedDB`);
      } catch (error) {
        console.error('[Identity Storage] Failed to store identities in IndexedDB:', error);
        // Fallback to localStorage
        identities.forEach(identity => {
          this.fallbackToLocalStorage('identity', identity.did, identity);
        });
      }
    } else {
      identities.forEach(identity => {
        this.fallbackToLocalStorage('identity', identity.did, identity);
      });
    }

    this.updateCacheMetadata({ totalEntries: this.cacheMetadata.totalEntries + identities.length });
  }

  /**
   * Get all identities for a specific root
   */
  async getIdentitiesByRoot(rootId: string): Promise<ExtendedSquidIdentity[]> {
    await this.ensureInitialized();

    if (this.db) {
      try {
        const transaction = this.db.transaction([IDENTITY_STORE], 'readonly');
        const store = transaction.objectStore(IDENTITY_STORE);
        const index = store.index('rootId');
        const identities = await this.promisifyRequest(index.getAll(rootId));
        
        console.log(`[Identity Storage] Retrieved ${identities.length} identities for root: ${rootId}`);
        return identities;
      } catch (error) {
        console.error('[Identity Storage] Failed to retrieve identities by root:', error);
      }
    }

    // Fallback to localStorage scan
    const identities: ExtendedSquidIdentity[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('squid_identity_')) {
        try {
          const identity = JSON.parse(localStorage.getItem(key) || '');
          if (identity.rootId === rootId || identity.did === rootId) {
            identities.push(identity);
          }
        } catch (error) {
          console.error(`[Identity Storage] Failed to parse identity from key: ${key}`, error);
        }
      }
    }

    return identities;
  }

  /**
   * Store identity tree in IndexedDB
   */
  async storeIdentityTree(tree: IdentityTree): Promise<void> {
    await this.ensureInitialized();

    const treeEntry: IdentityTreeCacheEntry = {
      rootId: tree.root.identity.did,
      tree,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CACHE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
    };

    if (this.db) {
      try {
        const transaction = this.db.transaction([TREE_STORE], 'readwrite');
        const store = transaction.objectStore(TREE_STORE);
        await this.promisifyRequest(store.put(treeEntry));
        
        console.log(`[Identity Storage] Identity tree stored: ${tree.root.identity.did}`);
      } catch (error) {
        console.error('[Identity Storage] Failed to store identity tree:', error);
        this.fallbackToLocalStorage('tree', tree.root.identity.did, treeEntry);
      }
    } else {
      this.fallbackToLocalStorage('tree', tree.root.identity.did, treeEntry);
    }
  }

  /**
   * Retrieve identity tree from IndexedDB
   */
  async getIdentityTree(rootId: string): Promise<IdentityTree | null> {
    await this.ensureInitialized();

    if (this.db) {
      try {
        const transaction = this.db.transaction([TREE_STORE], 'readonly');
        const store = transaction.objectStore(TREE_STORE);
        const treeEntry = await this.promisifyRequest(store.get(rootId));
        
        if (treeEntry && new Date(treeEntry.expiresAt) > new Date()) {
          console.log(`[Identity Storage] Identity tree retrieved: ${rootId}`);
          return treeEntry.tree;
        }
      } catch (error) {
        console.error('[Identity Storage] Failed to retrieve identity tree:', error);
      }
    }

    // Fallback to localStorage
    const stored = safeLocalStorage.getItem(`squid_tree_${rootId}`);
    if (stored) {
      try {
        const treeEntry = JSON.parse(stored);
        if (new Date(treeEntry.expiresAt) > new Date()) {
          return treeEntry.tree;
        }
      } catch (error) {
        console.error('[Identity Storage] Failed to parse tree from localStorage:', error);
      }
    }

    return null;
  }

  /**
   * Set active identity in SessionStorage
   */
  setActiveIdentity(identity: ExtendedSquidIdentity): void {
    try {
      const activeIdentityData = {
        identity,
        setAt: new Date().toISOString(),
        sessionId: this.generateSessionId()
      };

      safeSessionStorage.setItem(ACTIVE_IDENTITY_KEY, JSON.stringify(activeIdentityData));
      console.log(`[Identity Storage] Active identity set in session: ${identity.did}`);
    } catch (error) {
      console.error('[Identity Storage] Failed to set active identity:', error);
    }
  }

  /**
   * Get active identity from SessionStorage
   */
  getActiveIdentity(): ExtendedSquidIdentity | null {
    try {
      const stored = safeSessionStorage.getItem(ACTIVE_IDENTITY_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return data.identity;
      }
    } catch (error) {
      console.error('[Identity Storage] Failed to get active identity:', error);
    }
    return null;
  }

  /**
   * Clear active identity from SessionStorage
   */
  clearActiveIdentity(): void {
    try {
      safeSessionStorage.removeItem(ACTIVE_IDENTITY_KEY);
      console.log('[Identity Storage] Active identity cleared from session');
    } catch (error) {
      console.error('[Identity Storage] Failed to clear active identity:', error);
    }
  }

  /**
   * Remove identity from all storage
   */
  async removeIdentity(did: string): Promise<void> {
    await this.ensureInitialized();

    if (this.db) {
      try {
        const transaction = this.db.transaction([IDENTITY_STORE, CACHE_STORE], 'readwrite');
        
        const identityStore = transaction.objectStore(IDENTITY_STORE);
        await this.promisifyRequest(identityStore.delete(did));
        
        const cacheStore = transaction.objectStore(CACHE_STORE);
        await this.promisifyRequest(cacheStore.delete(`identity_${did}`));
        
        console.log(`[Identity Storage] Identity removed from IndexedDB: ${did}`);
      } catch (error) {
        console.error('[Identity Storage] Failed to remove identity from IndexedDB:', error);
      }
    }

    // Also remove from localStorage
    safeLocalStorage.removeItem(`squid_identity_${did}`);
    
    this.updateCacheMetadata({ totalEntries: Math.max(0, this.cacheMetadata.totalEntries - 1) });
  }

  /**
   * Cleanup expired entries and maintain cache size
   */
  async performCleanup(): Promise<void> {
    await this.ensureInitialized();

    const now = new Date();
    let cleanedCount = 0;

    if (this.db) {
      try {
        const transaction = this.db.transaction([CACHE_STORE, IDENTITY_STORE, TREE_STORE], 'readwrite');
        
        // Clean expired cache entries
        const cacheStore = transaction.objectStore(CACHE_STORE);
        const expiredIndex = cacheStore.index('expiresAt');
        const expiredEntries = await this.promisifyRequest(
          expiredIndex.getAll(IDBKeyRange.upperBound(now.toISOString()))
        );

        for (const entry of expiredEntries) {
          await this.promisifyRequest(cacheStore.delete(entry.key));
          
          // Also remove from identity store if it's an identity cache
          if (entry.key.startsWith('identity_')) {
            const did = entry.key.replace('identity_', '');
            await this.promisifyRequest(transaction.objectStore(IDENTITY_STORE).delete(did));
          }
          cleanedCount++;
        }

        // Clean expired trees
        const treeStore = transaction.objectStore(TREE_STORE);
        const allTrees = await this.promisifyRequest(treeStore.getAll());
        
        for (const treeEntry of allTrees) {
          if (new Date(treeEntry.expiresAt) <= now) {
            await this.promisifyRequest(treeStore.delete(treeEntry.rootId));
            cleanedCount++;
          }
        }

        // Enforce cache size limit
        const allCacheEntries = await this.promisifyRequest(cacheStore.getAll());
        if (allCacheEntries.length > MAX_CACHED_IDENTITIES) {
          // Sort by last accessed and remove oldest
          const sortedEntries = allCacheEntries
            .filter(entry => entry.key.startsWith('identity_'))
            .sort((a, b) => new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime());
          
          const toRemove = sortedEntries.slice(0, sortedEntries.length - MAX_CACHED_IDENTITIES);
          
          for (const entry of toRemove) {
            await this.promisifyRequest(cacheStore.delete(entry.key));
            const did = entry.key.replace('identity_', '');
            await this.promisifyRequest(transaction.objectStore(IDENTITY_STORE).delete(did));
            cleanedCount++;
          }
        }

      } catch (error) {
        console.error('[Identity Storage] Cleanup failed:', error);
      }
    }

    // Clean localStorage as well
    this.cleanupLocalStorage();

    this.updateCacheMetadata({ 
      lastCleanup: now.toISOString(),
      totalEntries: Math.max(0, this.cacheMetadata.totalEntries - cleanedCount)
    });

    console.log(`[Identity Storage] Cleanup completed, removed ${cleanedCount} expired entries`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheMetadata {
    const hitRate = this.cacheMetadata.totalHits + this.cacheMetadata.totalMisses > 0
      ? this.cacheMetadata.totalHits / (this.cacheMetadata.totalHits + this.cacheMetadata.totalMisses)
      : 0;

    return {
      ...this.cacheMetadata,
      cacheHitRate: hitRate
    };
  }

  /**
   * Clear all identity storage
   */
  async clearAllStorage(): Promise<void> {
    await this.ensureInitialized();

    if (this.db) {
      try {
        const transaction = this.db.transaction([IDENTITY_STORE, TREE_STORE, CACHE_STORE], 'readwrite');
        
        await this.promisifyRequest(transaction.objectStore(IDENTITY_STORE).clear());
        await this.promisifyRequest(transaction.objectStore(TREE_STORE).clear());
        await this.promisifyRequest(transaction.objectStore(CACHE_STORE).clear());
        
        console.log('[Identity Storage] All IndexedDB storage cleared');
      } catch (error) {
        console.error('[Identity Storage] Failed to clear IndexedDB:', error);
      }
    }

    // Clear localStorage
    this.clearLocalStorageIdentities();
    
    // Clear SessionStorage
    this.clearActiveIdentity();

    // Reset cache metadata
    this.cacheMetadata = {
      totalEntries: 0,
      lastCleanup: new Date().toISOString(),
      cacheHitRate: 0,
      totalHits: 0,
      totalMisses: 0
    };
    this.saveCacheMetadata();

    console.log('[Identity Storage] All storage cleared');
  }

  // Private helper methods

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private fallbackToLocalStorage(type: 'identity' | 'tree', key: string, data: any): void {
    try {
      const storageKey = type === 'identity' ? `squid_identity_${key}` : `squid_tree_${key}`;
      safeLocalStorage.setItem(storageKey, JSON.stringify(data));
      console.log(`[Identity Storage] Fallback to localStorage: ${storageKey}`);
    } catch (error) {
      console.error('[Identity Storage] Fallback storage failed:', error);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateCacheMetadata(updates: Partial<CacheMetadata>): void {
    this.cacheMetadata = { ...this.cacheMetadata, ...updates };
    this.saveCacheMetadata();
  }

  private loadCacheMetadata(): void {
    try {
      const stored = safeLocalStorage.getItem(CACHE_METADATA_KEY);
      if (stored) {
        this.cacheMetadata = { ...this.cacheMetadata, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('[Identity Storage] Failed to load cache metadata:', error);
    }
  }

  private saveCacheMetadata(): void {
    try {
      safeLocalStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(this.cacheMetadata));
    } catch (error) {
      console.error('[Identity Storage] Failed to save cache metadata:', error);
    }
  }

  private cleanupLocalStorage(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('squid_identity_') || key.startsWith('squid_tree_'))) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');
          if (data.expiresAt && new Date(data.expiresAt) <= new Date()) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // If we can't parse it, it's probably corrupted, remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => {
      safeLocalStorage.removeItem(key);
    });

    if (keysToRemove.length > 0) {
      console.log(`[Identity Storage] Cleaned ${keysToRemove.length} expired localStorage entries`);
    }
  }

  private clearLocalStorageIdentities(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('squid_identity_') || key.startsWith('squid_tree_') || key === CACHE_METADATA_KEY)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      safeLocalStorage.removeItem(key);
    });
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.performCleanup().catch(error => {
        console.error('[Identity Storage] Scheduled cleanup failed:', error);
      });
    }, CLEANUP_INTERVAL_MS);
  }
}

// Export singleton instance
export const identityStorage = new IdentityStorageManager();

// Export utility functions
export async function storeIdentity(identity: ExtendedSquidIdentity): Promise<void> {
  return identityStorage.storeIdentity(identity);
}

export async function getIdentity(did: string): Promise<ExtendedSquidIdentity | null> {
  return identityStorage.getIdentity(did);
}

export async function storeIdentities(identities: ExtendedSquidIdentity[]): Promise<void> {
  return identityStorage.storeIdentities(identities);
}

export async function getIdentitiesByRoot(rootId: string): Promise<ExtendedSquidIdentity[]> {
  return identityStorage.getIdentitiesByRoot(rootId);
}

export async function storeIdentityTree(tree: IdentityTree): Promise<void> {
  return identityStorage.storeIdentityTree(tree);
}

export async function getIdentityTree(rootId: string): Promise<IdentityTree | null> {
  return identityStorage.getIdentityTree(rootId);
}

export function setActiveIdentity(identity: ExtendedSquidIdentity): void {
  return identityStorage.setActiveIdentity(identity);
}

export function getActiveIdentity(): ExtendedSquidIdentity | null {
  return identityStorage.getActiveIdentity();
}

export function clearActiveIdentity(): void {
  return identityStorage.clearActiveIdentity();
}

export async function removeIdentity(did: string): Promise<void> {
  return identityStorage.removeIdentity(did);
}

export async function performStorageCleanup(): Promise<void> {
  return identityStorage.performCleanup();
}

export function getStorageStats(): CacheMetadata {
  return identityStorage.getCacheStats();
}

export async function clearAllIdentityStorage(): Promise<void> {
  return identityStorage.clearAllStorage();
}