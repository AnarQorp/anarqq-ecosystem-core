/**
 * Storage Utilities Index
 * Centralized exports for all storage-related functionality
 */

// Core storage utilities
export * from './safeStorage';
export * from './cleanup';

// Identity storage management
export * from './identityStorage';

// Storage maintenance service
export * from './storageMaintenanceService';

// Legacy storage utilities (for backward compatibility)
export * from '../storage';

// Re-export commonly used types and interfaces
export type {
  IdentityCacheEntry,
  IdentityTreeCacheEntry,
  CacheMetadata
} from './identityStorage';

export type {
  MaintenanceConfig,
  MaintenanceReport
} from './storageMaintenanceService';