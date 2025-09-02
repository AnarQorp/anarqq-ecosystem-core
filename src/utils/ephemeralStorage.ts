/**
 * Ephemeral Storage Utility
 * Manages temporary storage for AID identities with automatic cleanup
 */

import { IdentityType } from '../types/identity';

export interface EphemeralStorageItem {
  key: string;
  data: any;
  identityId: string;
  createdAt: string;
  expiresAt: string;
  encrypted: boolean;
  autoDestruct: boolean;
}

export interface EphemeralStorageOptions {
  ttl?: number; // Time to live in milliseconds
  encrypt?: boolean;
  autoDestruct?: boolean;
  destructOnLogout?: boolean;
  destructOnSessionLoss?: boolean;
}

export class EphemeralStorageManager {
  private static instance: EphemeralStorageManager;
  private storage: Map<string, EphemeralStorageItem> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private sessionListeners: Set<() => void> = new Set();

  private constructor() {
    this.initializeCleanup();
    this.setupSessionListeners();
  }

  static getInstance(): EphemeralStorageManager {
    if (!EphemeralStorageManager.instance) {
      EphemeralStorageManager.instance = new EphemeralStorageManager();
    }
    return EphemeralStorageManager.instance;
  }

  // Store data with ephemeral settings
  store(
    key: string,
    data: any,
    identityId: string,
    options: EphemeralStorageOptions = {}
  ): boolean {
    try {
      const {
        ttl = 24 * 60 * 60 * 1000, // 24 hours default
        encrypt = true,
        autoDestruct = true
      } = options;

      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl);

      const item: EphemeralStorageItem = {
        key,
        data: encrypt ? this.encrypt(data) : data,
        identityId,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        encrypted: encrypt,
        autoDestruct
      };

      // Store in memory
      this.storage.set(this.getStorageKey(identityId, key), item);

      // Also store in sessionStorage for persistence across page reloads
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          sessionStorage.setItem(
            `ephemeral_${identityId}_${key}`,
            JSON.stringify(item)
          );
        } catch (error) {
          console.warn('[EphemeralStorage] Failed to store in sessionStorage:', error);
        }
      }

      console.log(`[EphemeralStorage] Stored ephemeral data: ${key} for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[EphemeralStorage] Error storing data:', error);
      return false;
    }
  }

  // Retrieve data
  retrieve(key: string, identityId: string): any | null {
    try {
      const storageKey = this.getStorageKey(identityId, key);
      let item = this.storage.get(storageKey);

      // If not in memory, try to load from sessionStorage
      if (!item && typeof window !== 'undefined' && window.sessionStorage) {
        try {
          const stored = sessionStorage.getItem(`ephemeral_${identityId}_${key}`);
          if (stored) {
            item = JSON.parse(stored);
            if (item) {
              this.storage.set(storageKey, item);
            }
          }
        } catch (error) {
          console.warn('[EphemeralStorage] Failed to load from sessionStorage:', error);
        }
      }

      if (!item) {
        return null;
      }

      // Check if expired
      if (new Date() > new Date(item.expiresAt)) {
        this.remove(key, identityId);
        return null;
      }

      // Decrypt if necessary
      const data = item.encrypted ? this.decrypt(item.data) : item.data;
      
      console.log(`[EphemeralStorage] Retrieved ephemeral data: ${key} for identity: ${identityId}`);
      return data;
    } catch (error) {
      console.error('[EphemeralStorage] Error retrieving data:', error);
      return null;
    }
  }

  // Remove specific item
  remove(key: string, identityId: string): boolean {
    try {
      const storageKey = this.getStorageKey(identityId, key);
      const removed = this.storage.delete(storageKey);

      // Also remove from sessionStorage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(`ephemeral_${identityId}_${key}`);
      }

      if (removed) {
        console.log(`[EphemeralStorage] Removed ephemeral data: ${key} for identity: ${identityId}`);
      }

      return removed;
    } catch (error) {
      console.error('[EphemeralStorage] Error removing data:', error);
      return false;
    }
  }

  // Remove all data for an identity
  removeAllForIdentity(identityId: string): number {
    let removedCount = 0;

    try {
      // Remove from memory storage
      for (const [storageKey, item] of this.storage.entries()) {
        if (item.identityId === identityId) {
          this.storage.delete(storageKey);
          removedCount++;
        }
      }

      // Remove from sessionStorage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(`ephemeral_${identityId}_`)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
      }

      console.log(`[EphemeralStorage] Removed ${removedCount} ephemeral items for identity: ${identityId}`);
      return removedCount;
    } catch (error) {
      console.error('[EphemeralStorage] Error removing all data for identity:', error);
      return removedCount;
    }
  }

  // Check if data exists and is not expired
  exists(key: string, identityId: string): boolean {
    const storageKey = this.getStorageKey(identityId, key);
    const item = this.storage.get(storageKey);
    
    if (!item) {
      return false;
    }

    // Check if expired
    if (new Date() > new Date(item.expiresAt)) {
      this.remove(key, identityId);
      return false;
    }

    return true;
  }

  // Get all keys for an identity
  getKeysForIdentity(identityId: string): string[] {
    const keys: string[] = [];
    
    for (const [storageKey, item] of this.storage.entries()) {
      if (item.identityId === identityId) {
        // Check if not expired
        if (new Date() <= new Date(item.expiresAt)) {
          keys.push(item.key);
        } else {
          // Remove expired item
          this.storage.delete(storageKey);
        }
      }
    }

    return keys;
  }

  // Get storage statistics for an identity
  getStorageStats(identityId: string): {
    totalItems: number;
    totalSize: number;
    oldestItem: string | null;
    newestItem: string | null;
    expiringItems: Array<{ key: string; expiresAt: string }>;
  } {
    const items: EphemeralStorageItem[] = [];
    let totalSize = 0;

    for (const item of this.storage.values()) {
      if (item.identityId === identityId) {
        items.push(item);
        totalSize += JSON.stringify(item.data).length;
      }
    }

    const sortedByDate = items.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const expiringItems = items
      .filter(item => {
        const expiresAt = new Date(item.expiresAt);
        const now = new Date();
        const oneHour = 60 * 60 * 1000;
        return expiresAt.getTime() - now.getTime() < oneHour;
      })
      .map(item => ({ key: item.key, expiresAt: item.expiresAt }));

    return {
      totalItems: items.length,
      totalSize,
      oldestItem: sortedByDate[0]?.key || null,
      newestItem: sortedByDate[sortedByDate.length - 1]?.key || null,
      expiringItems
    };
  }

  // Enable ephemeral mode for an identity
  enableEphemeralMode(identityId: string): boolean {
    try {
      // Mark the identity as using ephemeral storage
      this.store('_ephemeral_mode', true, identityId, {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        encrypt: false,
        autoDestruct: true
      });

      console.log(`[EphemeralStorage] Enabled ephemeral mode for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[EphemeralStorage] Error enabling ephemeral mode:', error);
      return false;
    }
  }

  // Disable ephemeral mode and clean up
  disableEphemeralMode(identityId: string): boolean {
    try {
      const removedCount = this.removeAllForIdentity(identityId);
      console.log(`[EphemeralStorage] Disabled ephemeral mode for identity: ${identityId}, removed ${removedCount} items`);
      return true;
    } catch (error) {
      console.error('[EphemeralStorage] Error disabling ephemeral mode:', error);
      return false;
    }
  }

  // Check if identity is in ephemeral mode
  isEphemeralModeEnabled(identityId: string): boolean {
    return this.exists('_ephemeral_mode', identityId);
  }

  // Cleanup expired items
  cleanupExpired(): number {
    let cleanedCount = 0;
    const now = new Date();

    try {
      const expiredKeys: string[] = [];

      for (const [storageKey, item] of this.storage.entries()) {
        if (now > new Date(item.expiresAt)) {
          expiredKeys.push(storageKey);
        }
      }

      // Remove expired items
      for (const key of expiredKeys) {
        this.storage.delete(key);
        cleanedCount++;
      }

      // Also cleanup sessionStorage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('ephemeral_')) {
            try {
              const stored = sessionStorage.getItem(key);
              if (stored) {
                const item = JSON.parse(stored);
                if (item && now > new Date(item.expiresAt)) {
                  keysToRemove.push(key);
                }
              }
            } catch (error) {
              // Invalid JSON, remove it
              keysToRemove.push(key);
            }
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
      }

      if (cleanedCount > 0) {
        console.log(`[EphemeralStorage] Cleaned up ${cleanedCount} expired items`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('[EphemeralStorage] Error during cleanup:', error);
      return cleanedCount;
    }
  }

  // Add session listener for cleanup on logout/session loss
  addSessionListener(callback: () => void): void {
    this.sessionListeners.add(callback);
  }

  // Remove session listener
  removeSessionListener(callback: () => void): void {
    this.sessionListeners.delete(callback);
  }

  // Trigger session cleanup
  triggerSessionCleanup(): void {
    console.log('[EphemeralStorage] Triggering session cleanup');
    
    // Clean up all auto-destruct items
    const keysToRemove: string[] = [];
    for (const [storageKey, item] of this.storage.entries()) {
      if (item.autoDestruct) {
        keysToRemove.push(storageKey);
      }
    }

    keysToRemove.forEach(key => this.storage.delete(key));

    // Clean up sessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.clear();
    }

    // Notify listeners
    this.sessionListeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[EphemeralStorage] Error in session listener:', error);
      }
    });

    console.log(`[EphemeralStorage] Session cleanup completed, removed ${keysToRemove.length} items`);
  }

  // Private helper methods
  private getStorageKey(identityId: string, key: string): string {
    return `${identityId}:${key}`;
  }

  private encrypt(data: any): string {
    // Simple base64 encoding for demo - in production, use proper encryption
    try {
      return btoa(JSON.stringify(data));
    } catch (error) {
      console.error('[EphemeralStorage] Encryption error:', error);
      return JSON.stringify(data);
    }
  }

  private decrypt(encryptedData: string): any {
    // Simple base64 decoding for demo - in production, use proper decryption
    try {
      return JSON.parse(atob(encryptedData));
    } catch (error) {
      console.error('[EphemeralStorage] Decryption error:', error);
      return encryptedData;
    }
  }

  private initializeCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);

    // Initial cleanup
    this.cleanupExpired();
  }

  private setupSessionListeners(): void {
    if (typeof window !== 'undefined') {
      // Listen for page unload
      window.addEventListener('beforeunload', () => {
        this.triggerSessionCleanup();
      });

      // Listen for storage events (other tabs)
      window.addEventListener('storage', (event) => {
        if (event.key === 'identity_logout') {
          this.triggerSessionCleanup();
        }
      });

      // Listen for visibility change (tab switching)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // Tab is hidden, could be session loss
          setTimeout(() => {
            if (document.hidden) {
              // Still hidden after delay, trigger cleanup
              this.triggerSessionCleanup();
            }
          }, 30000); // 30 seconds delay
        }
      });
    }
  }

  // Cleanup on destroy
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.storage.clear();
    this.sessionListeners.clear();
  }
}

// Singleton instance
export const ephemeralStorage = EphemeralStorageManager.getInstance();

// Utility functions for common operations
export const ephemeralStorageUtils = {
  // Store wallet data for AID identity
  storeWalletData: (identityId: string, walletData: any) => {
    return ephemeralStorage.store('wallet_data', walletData, identityId, {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      encrypt: true,
      autoDestruct: true
    });
  },

  // Retrieve wallet data for AID identity
  getWalletData: (identityId: string) => {
    return ephemeralStorage.retrieve('wallet_data', identityId);
  },

  // Store transaction history temporarily
  storeTransactionHistory: (identityId: string, transactions: any[]) => {
    return ephemeralStorage.store('transaction_history', transactions, identityId, {
      ttl: 60 * 60 * 1000, // 1 hour
      encrypt: true,
      autoDestruct: true
    });
  },

  // Get transaction history
  getTransactionHistory: (identityId: string) => {
    return ephemeralStorage.retrieve('transaction_history', identityId);
  },

  // Store session data
  storeSessionData: (identityId: string, sessionData: any) => {
    return ephemeralStorage.store('session_data', sessionData, identityId, {
      ttl: 30 * 60 * 1000, // 30 minutes
      encrypt: false,
      autoDestruct: true
    });
  },

  // Get session data
  getSessionData: (identityId: string) => {
    return ephemeralStorage.retrieve('session_data', identityId);
  },

  // Check if identity should use ephemeral storage
  shouldUseEphemeralStorage: (identityType: IdentityType): boolean => {
    return identityType === IdentityType.AID;
  },

  // Setup ephemeral storage for AID identity
  setupForAIDIdentity: (identityId: string): boolean => {
    if (!ephemeralStorageUtils.shouldUseEphemeralStorage(IdentityType.AID)) {
      return false;
    }

    return ephemeralStorage.enableEphemeralMode(identityId);
  },

  // Cleanup on identity switch
  cleanupOnIdentitySwitch: (fromIdentityId: string, toIdentityId: string): void => {
    // If switching from AID identity, clean up its ephemeral data
    if (fromIdentityId && ephemeralStorage.isEphemeralModeEnabled(fromIdentityId)) {
      ephemeralStorage.removeAllForIdentity(fromIdentityId);
    }

    // If switching to AID identity, enable ephemeral mode
    if (toIdentityId && ephemeralStorageUtils.shouldUseEphemeralStorage(IdentityType.AID)) {
      ephemeralStorage.enableEphemeralMode(toIdentityId);
    }
  }
};

// Export types and utilities
export type {
  EphemeralStorageItem,
  EphemeralStorageOptions
};