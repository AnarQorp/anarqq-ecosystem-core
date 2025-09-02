// A safe wrapper around localStorage that works in both browser and Node.js environments
type StorageType = 'local' | 'session';

// Check if we're in a browser environment
const isBrowser = (() => {
  try {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
  } catch (e) {
    return false;
  }
})();

// Define the Storage interface for type safety
interface IStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

class SafeStorage implements IStorage {
  private storage: IStorage | null = null;
  private memoryStorage: Record<string, string> = {};

  constructor(type: StorageType = 'local') {
    if (isBrowser) {
      try {
        const targetStorage = type === 'local' ? window.localStorage : window.sessionStorage;
        // Test if storage is accessible
        const testKey = `test-${Date.now()}`;
        targetStorage.setItem(testKey, testKey);
        targetStorage.removeItem(testKey);
        
        // If we got here, storage is available
        this.storage = {
          getItem: (key: string) => targetStorage.getItem(key),
          setItem: (key: string, value: string) => targetStorage.setItem(key, value),
          removeItem: (key: string) => targetStorage.removeItem(key),
          clear: () => targetStorage.clear()
        };
      } catch (e) {
        console.warn(`Failed to access ${type}Storage, falling back to memory storage`, e);
        this.storage = null;
      }
    }
  }

  setItem(key: string, value: string): void {
    try {
      if (this.storage) {
        this.storage.setItem(key, value);
      }
      // Always update in-memory storage as a fallback
      this.memoryStorage[key] = value;
    } catch (e) {
      console.error('Error setting storage item:', e);
      this.memoryStorage[key] = value;
    }
  }

  getItem(key: string): string | null {
    try {
      // First try the actual storage
      if (this.storage) {
        const value = this.storage.getItem(key);
        if (value !== null) {
          return value;
        }
      }
      // Fall back to in-memory storage
      return this.memoryStorage[key] || null;
    } catch (e) {
      console.error('Error getting storage item:', e);
      return this.memoryStorage[key] || null;
    }
  }

  removeItem(key: string): void {
    try {
      if (this.storage) {
        this.storage.removeItem(key);
      }
      // Always remove from in-memory storage
      delete this.memoryStorage[key];
    } catch (e) {
      console.error('Error removing storage item:', e);
      delete this.memoryStorage[key];
    }
  }

  clear(): void {
    try {
      if (this.storage) {
        this.storage.clear();
      }
      // Always clear in-memory storage
      this.memoryStorage = {};
    } catch (e) {
      console.error('Error clearing storage:', e);
      this.memoryStorage = {};
    }
  }
}

export const safeLocalStorage = new SafeStorage('local');
export const safeSessionStorage = new SafeStorage('session');
