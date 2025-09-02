/**
 * Identity Local Storage Service
 * Handles IndexedDB caching and SessionStorage management for identity data
 * Requirements: 1.4, 4.1 - Local identity persistence and active identity management
 */

import { ExtendedSquidIdentity, IdentityStorageInterface } from '@/types/identity';

export interface IdentityDBSchema {
  identities: {
    key: string; // DID
    value: {
      did: string;
      identity: ExtendedSquidIdentity;
      ipfsHash?: string;
      cachedAt: string;
      lastAccessed: string;
      syncStatus: 'synced' | 'pending' | 'error';
      version: number;
    };
    indexes: {
      'by-type': string;
      'by-parent': string;
      'by-root': string;
      'by-cached-at': string;
      'by-last-accessed': string;
    };
  };
  identityTrees: {
    key: string; // Root DID
    value: {
      rootId: string;
      treeData: any;
      lastBuilt: string;
      version: number;
    };
  };
  auditLogs: {
    key: string; // Log ID
    value: {
      id: string;
      identityId: string;
      action: string;
      timestamp: string;
      metadata: any;
      synced: boolean;
    };
    indexes: {
      'by-identity': string;
      'by-timestamp': string;
      'by-synced': boolean;
    };
  };
}

export interface SessionStorageData {
  activeIdentityId: string | null;
  switchHistory: Array<{
    identityId: string;
    timestamp: string;
    switchId: string;
  }>;
  contextState: {
    [module: string]: any;
  };
  sessionMetadata: {
    sessionId: string;
    startedAt: string;
    lastActivity: string;
    deviceFingerprint?: string;
  };
}

/**
 * Local Storage Service for Identity Management
 * Provides IndexedDB caching and SessionStorage management
 */
export class IdentityLocalStorage implements Partial<IdentityStorageInterface> {
  private static instance: IdentityLocalStorage;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'SquidIdentityDB';
  private readonly DB_VERSION = 1;
  private readonly SESSION_KEY = 'squid-identity-session';
  private readonly CACHE_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_ENTRIES = 100;

  private constructor() {
    this.initializeDB();
    this.setupCleanupInterval();
  }

  public static getInstance(): IdentityLocalStorage {
    if (!IdentityLocalStorage.instance) {
      IdentityLocalStorage.instance = new IdentityLocalStorage();
    }
    return IdentityLocalStorage.instance;
  }

  /**
   * Initialize IndexedDB with schema
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('[IdentityLocalStorage] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IdentityLocalStorage] IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create identities store
        if (!db.objectStoreNames.contains('identities')) {
          const identitiesStore = db.createObjectStore('identities', { keyPath: 'did' });
          identitiesStore.createIndex('by-type', 'identity.type', { unique: false });
          identitiesStore.createIndex('by-parent', 'identity.parentId', { unique: false });
          identitiesStore.createIndex('by-root', 'identity.rootId', { unique: false });
          identitiesStore.createIndex('by-cached-at', 'cachedAt', { unique: false });
          identitiesStore.createIndex('by-last-accessed', 'lastAccessed', { unique: false });
        }

        // Create identity trees store
        if (!db.objectStoreNames.contains('identityTrees')) {
          db.createObjectStore('identityTrees', { keyPath: 'rootId' });
        }

        // Create audit logs store
        if (!db.objectStoreNames.contains('auditLogs')) {
          const auditStore = db.createObjectStore('auditLogs', { keyPath: 'id' });
          auditStore.createIndex('by-identity', 'identityId', { unique: false });
          auditStore.createIndex('by-timestamp', 'timestamp', { unique: false });
          auditStore.createIndex('by-synced', 'synced', { unique: false });
        }

        console.log('[IdentityLocalStorage] IndexedDB schema created/upgraded');
      };
    });
  }

  /**
   * Cache identity in IndexedDB
   * Requirements: 1.4 - Local identity persistence
   */
  async cacheIdentity(identity: ExtendedSquidIdentity, ipfsHash?: string): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    try {
      const transaction = this.db!.transaction(['identities'], 'readwrite');
      const store = transaction.objectStore('identities');

      const cacheEntry = {
        did: identity.did,
        identity,
        ipfsHash,
        cachedAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        syncStatus: 'synced' as const,
        version: 1
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(cacheEntry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log(`[IdentityLocalStorage] Cached identity: ${identity.did}`);

      // Cleanup old entries if we exceed the limit
      await this.cleanupOldEntries();

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to cache identity:', error);
      throw new Error(`Failed to cache identity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cached identity from IndexedDB
   */
  async getCachedIdentity(identityId: string): Promise<ExtendedSquidIdentity | null> {
    if (!this.db) {
      await this.initializeDB();
    }

    try {
      const transaction = this.db!.transaction(['identities'], 'readwrite');
      const store = transaction.objectStore('identities');

      const cacheEntry = await new Promise<any>((resolve, reject) => {
        const request = store.get(identityId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!cacheEntry) {
        return null;
      }

      // Update last accessed time
      cacheEntry.lastAccessed = new Date().toISOString();
      await new Promise<void>((resolve, reject) => {
        const updateRequest = store.put(cacheEntry);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      });

      console.log(`[IdentityLocalStorage] Retrieved cached identity: ${identityId}`);
      return cacheEntry.identity;

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to get cached identity:', error);
      return null;
    }
  }

  /**
   * Get all cached identities
   */
  async getAllCachedIdentities(): Promise<ExtendedSquidIdentity[]> {
    if (!this.db) {
      await this.initializeDB();
    }

    try {
      const transaction = this.db!.transaction(['identities'], 'readonly');
      const store = transaction.objectStore('identities');

      const entries = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return entries.map(entry => entry.identity);

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to get all cached identities:', error);
      return [];
    }
  }

  /**
   * Get cached identities by type
   */
  async getCachedIdentitiesByType(type: string): Promise<ExtendedSquidIdentity[]> {
    if (!this.db) {
      await this.initializeDB();
    }

    try {
      const transaction = this.db!.transaction(['identities'], 'readonly');
      const store = transaction.objectStore('identities');
      const index = store.index('by-type');

      const entries = await new Promise<any[]>((resolve, reject) => {
        const request = index.getAll(type);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return entries.map(entry => entry.identity);

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to get cached identities by type:', error);
      return [];
    }
  }

  /**
   * Get cached identities by parent
   */
  async getCachedIdentitiesByParent(parentId: string): Promise<ExtendedSquidIdentity[]> {
    if (!this.db) {
      await this.initializeDB();
    }

    try {
      const transaction = this.db!.transaction(['identities'], 'readonly');
      const store = transaction.objectStore('identities');
      const index = store.index('by-parent');

      const entries = await new Promise<any[]>((resolve, reject) => {
        const request = index.getAll(parentId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return entries.map(entry => entry.identity);

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to get cached identities by parent:', error);
      return [];
    }
  }

  /**
   * Clear cache for specific identity or all identities
   */
  async clearCache(identityId?: string): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    try {
      const transaction = this.db!.transaction(['identities'], 'readwrite');
      const store = transaction.objectStore('identities');

      if (identityId) {
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(identityId);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        console.log(`[IdentityLocalStorage] Cleared cache for identity: ${identityId}`);
      } else {
        await new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        console.log('[IdentityLocalStorage] Cleared all identity cache');
      }

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to clear cache:', error);
      throw new Error(`Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set active identity in SessionStorage
   * Requirements: 4.1 - Active identity management
   */
  async setActiveIdentity(identity: ExtendedSquidIdentity): Promise<void> {
    try {
      const sessionData = this.getSessionData();
      
      // Update active identity
      sessionData.activeIdentityId = identity.did;
      
      // Add to switch history
      sessionData.switchHistory.unshift({
        identityId: identity.did,
        timestamp: new Date().toISOString(),
        switchId: this.generateSwitchId()
      });

      // Keep only last 10 switches
      sessionData.switchHistory = sessionData.switchHistory.slice(0, 10);

      // Update session metadata
      sessionData.sessionMetadata.lastActivity = new Date().toISOString();

      // Store in SessionStorage
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));

      console.log(`[IdentityLocalStorage] Set active identity: ${identity.did}`);

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to set active identity:', error);
      throw new Error(`Failed to set active identity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get active identity from SessionStorage
   */
  async getActiveIdentity(): Promise<ExtendedSquidIdentity | null> {
    try {
      const sessionData = this.getSessionData();
      
      if (!sessionData.activeIdentityId) {
        return null;
      }

      // Try to get from cache first
      const cachedIdentity = await this.getCachedIdentity(sessionData.activeIdentityId);
      
      if (cachedIdentity) {
        // Update last activity
        sessionData.sessionMetadata.lastActivity = new Date().toISOString();
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
        
        return cachedIdentity;
      }

      console.warn(`[IdentityLocalStorage] Active identity ${sessionData.activeIdentityId} not found in cache`);
      return null;

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to get active identity:', error);
      return null;
    }
  }

  /**
   * Clear active identity from SessionStorage
   */
  async clearActiveIdentity(): Promise<void> {
    try {
      const sessionData = this.getSessionData();
      sessionData.activeIdentityId = null;
      sessionData.contextState = {};
      sessionData.sessionMetadata.lastActivity = new Date().toISOString();

      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));

      console.log('[IdentityLocalStorage] Cleared active identity');

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to clear active identity:', error);
      throw new Error(`Failed to clear active identity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get switch history from SessionStorage
   */
  getSwitchHistory(): Array<{ identityId: string; timestamp: string; switchId: string }> {
    const sessionData = this.getSessionData();
    return sessionData.switchHistory;
  }

  /**
   * Store context state for a module
   */
  setModuleContext(module: string, context: any): void {
    try {
      const sessionData = this.getSessionData();
      sessionData.contextState[module] = context;
      sessionData.sessionMetadata.lastActivity = new Date().toISOString();

      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));

      console.log(`[IdentityLocalStorage] Stored context for module: ${module}`);

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to set module context:', error);
    }
  }

  /**
   * Get context state for a module
   */
  getModuleContext(module: string): any {
    try {
      const sessionData = this.getSessionData();
      return sessionData.contextState[module] || null;

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to get module context:', error);
      return null;
    }
  }

  /**
   * Clear context state for a module
   */
  clearModuleContext(module: string): void {
    try {
      const sessionData = this.getSessionData();
      delete sessionData.contextState[module];
      sessionData.sessionMetadata.lastActivity = new Date().toISOString();

      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));

      console.log(`[IdentityLocalStorage] Cleared context for module: ${module}`);

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to clear module context:', error);
    }
  }

  /**
   * Cache identity tree data
   */
  async cacheIdentityTree(rootId: string, treeData: any): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    try {
      const transaction = this.db!.transaction(['identityTrees'], 'readwrite');
      const store = transaction.objectStore('identityTrees');

      const treeEntry = {
        rootId,
        treeData,
        lastBuilt: new Date().toISOString(),
        version: 1
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(treeEntry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log(`[IdentityLocalStorage] Cached identity tree for root: ${rootId}`);

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to cache identity tree:', error);
      throw new Error(`Failed to cache identity tree: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cached identity tree data
   */
  async getCachedIdentityTree(rootId: string): Promise<any | null> {
    if (!this.db) {
      await this.initializeDB();
    }

    try {
      const transaction = this.db!.transaction(['identityTrees'], 'readonly');
      const store = transaction.objectStore('identityTrees');

      const treeEntry = await new Promise<any>((resolve, reject) => {
        const request = store.get(rootId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return treeEntry ? treeEntry.treeData : null;

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to get cached identity tree:', error);
      return null;
    }
  }

  /**
   * Store audit log entry
   */
  async storeAuditLog(logEntry: any): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    try {
      const transaction = this.db!.transaction(['auditLogs'], 'readwrite');
      const store = transaction.objectStore('auditLogs');

      const auditEntry = {
        ...logEntry,
        synced: false
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(auditEntry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log(`[IdentityLocalStorage] Stored audit log: ${logEntry.id}`);

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to store audit log:', error);
      throw new Error(`Failed to store audit log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get audit logs for an identity
   */
  async getAuditLogs(identityId: string): Promise<any[]> {
    if (!this.db) {
      await this.initializeDB();
    }

    try {
      const transaction = this.db!.transaction(['auditLogs'], 'readonly');
      const store = transaction.objectStore('auditLogs');
      const index = store.index('by-identity');

      const logs = await new Promise<any[]>((resolve, reject) => {
        const request = index.getAll(identityId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to get audit logs:', error);
      return [];
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    identitiesCount: number;
    treesCount: number;
    auditLogsCount: number;
    totalSize: number;
    lastCleanup: string | null;
  }> {
    if (!this.db) {
      await this.initializeDB();
    }

    try {
      const transaction = this.db!.transaction(['identities', 'identityTrees', 'auditLogs'], 'readonly');
      
      const identitiesCount = await new Promise<number>((resolve, reject) => {
        const request = transaction.objectStore('identities').count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const treesCount = await new Promise<number>((resolve, reject) => {
        const request = transaction.objectStore('identityTrees').count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const auditLogsCount = await new Promise<number>((resolve, reject) => {
        const request = transaction.objectStore('auditLogs').count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Estimate total size (rough calculation)
      const totalSize = (identitiesCount * 10 + treesCount * 5 + auditLogsCount * 2) * 1024; // KB estimate

      return {
        identitiesCount,
        treesCount,
        auditLogsCount,
        totalSize,
        lastCleanup: localStorage.getItem('squid-identity-last-cleanup')
      };

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to get storage stats:', error);
      return {
        identitiesCount: 0,
        treesCount: 0,
        auditLogsCount: 0,
        totalSize: 0,
        lastCleanup: null
      };
    }
  }

  // Private helper methods

  private getSessionData(): SessionStorageData {
    try {
      const stored = sessionStorage.getItem(this.SESSION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[IdentityLocalStorage] Failed to parse session data, creating new session');
    }

    // Create new session data
    const newSessionData: SessionStorageData = {
      activeIdentityId: null,
      switchHistory: [],
      contextState: {},
      sessionMetadata: {
        sessionId: this.generateSessionId(),
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        deviceFingerprint: this.generateDeviceFingerprint()
      }
    };

    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(newSessionData));
    return newSessionData;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSwitchId(): string {
    return `switch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDeviceFingerprint(): string {
    // Simple device fingerprinting (in production, use a proper library)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 10, 10);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(16);
  }

  private async cleanupOldEntries(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['identities'], 'readwrite');
      const store = transaction.objectStore('identities');
      const index = store.index('by-last-accessed');

      // Get all entries sorted by last accessed (oldest first)
      const entries = await new Promise<any[]>((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // If we have more than max entries, delete the oldest ones
      if (entries.length > this.MAX_CACHE_ENTRIES) {
        const entriesToDelete = entries
          .sort((a, b) => new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime())
          .slice(0, entries.length - this.MAX_CACHE_ENTRIES);

        for (const entry of entriesToDelete) {
          await new Promise<void>((resolve, reject) => {
            const deleteRequest = store.delete(entry.did);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });
        }

        console.log(`[IdentityLocalStorage] Cleaned up ${entriesToDelete.length} old cache entries`);
      }

      // Update last cleanup time
      localStorage.setItem('squid-identity-last-cleanup', new Date().toISOString());

    } catch (error) {
      console.error('[IdentityLocalStorage] Failed to cleanup old entries:', error);
    }
  }

  private setupCleanupInterval(): void {
    // Run cleanup every 24 hours
    setInterval(() => {
      this.cleanupOldEntries();
    }, this.CACHE_CLEANUP_INTERVAL);
  }
}

// Export singleton instance
export const identityLocalStorage = IdentityLocalStorage.getInstance();