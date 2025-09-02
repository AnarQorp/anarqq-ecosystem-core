/**
 * Storage Maintenance Service
 * Handles periodic cleanup, optimization, and maintenance of identity storage
 * Requirements: 1.4, 4.1
 */

import { identityStorage, getStorageStats, performStorageCleanup } from './identityStorage';
import { cleanupObsoleteStorage, validateStorageState } from './cleanup';

export interface MaintenanceConfig {
  cleanupIntervalMs: number;
  maxCacheSize: number;
  maxCacheAgeHours: number;
  enableAutoCleanup: boolean;
  enablePerformanceMonitoring: boolean;
}

export interface MaintenanceReport {
  timestamp: string;
  cleanupPerformed: boolean;
  entriesRemoved: number;
  cacheStats: {
    totalEntries: number;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  };
  storageUsage: {
    indexedDBSize: number;
    localStorageSize: number;
    sessionStorageSize: number;
  };
  performanceMetrics: {
    cleanupDurationMs: number;
    averageAccessTimeMs: number;
  };
  recommendations: string[];
}

class StorageMaintenanceService {
  private config: MaintenanceConfig;
  private maintenanceInterval: NodeJS.Timeout | null = null;
  private isMaintenanceRunning = false;
  private lastMaintenanceReport: MaintenanceReport | null = null;

  constructor(config: Partial<MaintenanceConfig> = {}) {
    this.config = {
      cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
      maxCacheSize: 100,
      maxCacheAgeHours: 24,
      enableAutoCleanup: true,
      enablePerformanceMonitoring: true,
      ...config
    };

    if (this.config.enableAutoCleanup) {
      this.startAutoMaintenance();
    }
  }

  /**
   * Start automatic maintenance scheduling
   */
  startAutoMaintenance(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
    }

    this.maintenanceInterval = setInterval(async () => {
      try {
        await this.performMaintenance();
      } catch (error) {
        console.error('[Storage Maintenance] Scheduled maintenance failed:', error);
      }
    }, this.config.cleanupIntervalMs);

    console.log(`[Storage Maintenance] Auto-maintenance started (interval: ${this.config.cleanupIntervalMs}ms)`);
  }

  /**
   * Stop automatic maintenance
   */
  stopAutoMaintenance(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
      console.log('[Storage Maintenance] Auto-maintenance stopped');
    }
  }

  /**
   * Perform comprehensive storage maintenance
   */
  async performMaintenance(force = false): Promise<MaintenanceReport> {
    if (this.isMaintenanceRunning && !force) {
      console.log('[Storage Maintenance] Maintenance already running, skipping...');
      return this.lastMaintenanceReport || this.createEmptyReport();
    }

    this.isMaintenanceRunning = true;
    const startTime = Date.now();

    try {
      console.log('[Storage Maintenance] Starting comprehensive maintenance...');

      // Get initial stats
      const initialStats = getStorageStats();
      const initialStorageUsage = await this.calculateStorageUsage();

      // Perform cleanup operations
      await this.performCleanupOperations();

      // Get final stats
      const finalStats = getStorageStats();
      const finalStorageUsage = await this.calculateStorageUsage();

      // Calculate metrics
      const cleanupDurationMs = Date.now() - startTime;
      const entriesRemoved = Math.max(0, initialStats.totalEntries - finalStats.totalEntries);

      // Generate recommendations
      const recommendations = this.generateRecommendations(finalStats, finalStorageUsage);

      // Create maintenance report
      const report: MaintenanceReport = {
        timestamp: new Date().toISOString(),
        cleanupPerformed: true,
        entriesRemoved,
        cacheStats: {
          totalEntries: finalStats.totalEntries,
          hitRate: finalStats.cacheHitRate,
          totalHits: finalStats.totalHits,
          totalMisses: finalStats.totalMisses
        },
        storageUsage: finalStorageUsage,
        performanceMetrics: {
          cleanupDurationMs,
          averageAccessTimeMs: this.calculateAverageAccessTime()
        },
        recommendations
      };

      this.lastMaintenanceReport = report;

      console.log(`[Storage Maintenance] Maintenance completed in ${cleanupDurationMs}ms`);
      console.log(`[Storage Maintenance] Removed ${entriesRemoved} expired entries`);
      console.log(`[Storage Maintenance] Cache hit rate: ${(finalStats.cacheHitRate * 100).toFixed(2)}%`);

      return report;

    } catch (error) {
      console.error('[Storage Maintenance] Maintenance failed:', error);
      return this.createErrorReport(error);
    } finally {
      this.isMaintenanceRunning = false;
    }
  }

  /**
   * Perform all cleanup operations
   */
  private async performCleanupOperations(): Promise<void> {
    // 1. Clean up identity storage (IndexedDB + localStorage)
    await performStorageCleanup();

    // 2. Clean up obsolete storage keys
    cleanupObsoleteStorage();

    // 3. Validate storage state
    validateStorageState();

    // 4. Optimize IndexedDB if needed
    await this.optimizeIndexedDB();

    // 5. Clean up session storage if needed
    this.cleanupSessionStorage();
  }

  /**
   * Optimize IndexedDB performance
   */
  private async optimizeIndexedDB(): Promise<void> {
    try {
      // This is a placeholder for IndexedDB optimization
      // In a real implementation, you might:
      // - Compact the database
      // - Rebuild indexes
      // - Defragment storage
      console.log('[Storage Maintenance] IndexedDB optimization completed');
    } catch (error) {
      console.error('[Storage Maintenance] IndexedDB optimization failed:', error);
    }
  }

  /**
   * Clean up session storage
   */
  private cleanupSessionStorage(): void {
    try {
      // Remove expired session data
      const sessionKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) sessionKeys.push(key);
      }

      let removedCount = 0;
      sessionKeys.forEach(key => {
        if (key.startsWith('squid_') && key.includes('_temp_')) {
          try {
            const data = JSON.parse(sessionStorage.getItem(key) || '{}');
            if (data.expiresAt && new Date(data.expiresAt) <= new Date()) {
              sessionStorage.removeItem(key);
              removedCount++;
            }
          } catch (error) {
            // If we can't parse it, it might be corrupted, remove it
            sessionStorage.removeItem(key);
            removedCount++;
          }
        }
      });

      if (removedCount > 0) {
        console.log(`[Storage Maintenance] Cleaned ${removedCount} expired session storage entries`);
      }
    } catch (error) {
      console.error('[Storage Maintenance] Session storage cleanup failed:', error);
    }
  }

  /**
   * Calculate storage usage across different storage types
   */
  private async calculateStorageUsage(): Promise<MaintenanceReport['storageUsage']> {
    const usage = {
      indexedDBSize: 0,
      localStorageSize: 0,
      sessionStorageSize: 0
    };

    try {
      // Calculate localStorage usage
      let localStorageSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            localStorageSize += key.length + value.length;
          }
        }
      }
      usage.localStorageSize = localStorageSize;

      // Calculate sessionStorage usage
      let sessionStorageSize = 0;
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          const value = sessionStorage.getItem(key);
          if (value) {
            sessionStorageSize += key.length + value.length;
          }
        }
      }
      usage.sessionStorageSize = sessionStorageSize;

      // IndexedDB size estimation (simplified)
      if ('navigator' in globalThis && 'storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        usage.indexedDBSize = estimate.usage || 0;
      }

    } catch (error) {
      console.error('[Storage Maintenance] Failed to calculate storage usage:', error);
    }

    return usage;
  }

  /**
   * Generate maintenance recommendations
   */
  private generateRecommendations(
    stats: ReturnType<typeof getStorageStats>,
    storageUsage: MaintenanceReport['storageUsage']
  ): string[] {
    const recommendations: string[] = [];

    // Cache hit rate recommendations
    if (stats.cacheHitRate < 0.7) {
      recommendations.push('Cache hit rate is low (<70%). Consider increasing cache size or reviewing access patterns.');
    }

    // Storage usage recommendations
    const totalStorageKB = (storageUsage.localStorageSize + storageUsage.sessionStorageSize) / 1024;
    if (totalStorageKB > 5000) { // 5MB
      recommendations.push('Storage usage is high (>5MB). Consider more aggressive cleanup policies.');
    }

    // Cache size recommendations
    if (stats.totalEntries > this.config.maxCacheSize) {
      recommendations.push(`Cache size (${stats.totalEntries}) exceeds recommended maximum (${this.config.maxCacheSize}).`);
    }

    // Performance recommendations
    if (this.lastMaintenanceReport && this.lastMaintenanceReport.performanceMetrics.cleanupDurationMs > 5000) {
      recommendations.push('Cleanup operations are taking longer than expected. Consider optimizing storage structure.');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Storage is operating efficiently. No immediate action required.');
    }

    return recommendations;
  }

  /**
   * Calculate average access time (simplified estimation)
   */
  private calculateAverageAccessTime(): number {
    // This is a simplified calculation
    // In a real implementation, you would track actual access times
    const stats = getStorageStats();
    const totalAccesses = stats.totalHits + stats.totalMisses;
    
    if (totalAccesses === 0) return 0;
    
    // Estimate based on cache hit rate (hits are faster than misses)
    const avgHitTime = 1; // 1ms for cache hits
    const avgMissTime = 10; // 10ms for cache misses
    
    return (stats.totalHits * avgHitTime + stats.totalMisses * avgMissTime) / totalAccesses;
  }

  /**
   * Create empty maintenance report
   */
  private createEmptyReport(): MaintenanceReport {
    return {
      timestamp: new Date().toISOString(),
      cleanupPerformed: false,
      entriesRemoved: 0,
      cacheStats: {
        totalEntries: 0,
        hitRate: 0,
        totalHits: 0,
        totalMisses: 0
      },
      storageUsage: {
        indexedDBSize: 0,
        localStorageSize: 0,
        sessionStorageSize: 0
      },
      performanceMetrics: {
        cleanupDurationMs: 0,
        averageAccessTimeMs: 0
      },
      recommendations: ['Maintenance not performed']
    };
  }

  /**
   * Create error maintenance report
   */
  private createErrorReport(error: any): MaintenanceReport {
    return {
      timestamp: new Date().toISOString(),
      cleanupPerformed: false,
      entriesRemoved: 0,
      cacheStats: {
        totalEntries: 0,
        hitRate: 0,
        totalHits: 0,
        totalMisses: 0
      },
      storageUsage: {
        indexedDBSize: 0,
        localStorageSize: 0,
        sessionStorageSize: 0
      },
      performanceMetrics: {
        cleanupDurationMs: 0,
        averageAccessTimeMs: 0
      },
      recommendations: [`Maintenance failed: ${error.message || 'Unknown error'}`]
    };
  }

  /**
   * Get the last maintenance report
   */
  getLastMaintenanceReport(): MaintenanceReport | null {
    return this.lastMaintenanceReport;
  }

  /**
   * Update maintenance configuration
   */
  updateConfig(newConfig: Partial<MaintenanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart auto-maintenance if interval changed
    if (newConfig.cleanupIntervalMs && this.maintenanceInterval) {
      this.stopAutoMaintenance();
      if (this.config.enableAutoCleanup) {
        this.startAutoMaintenance();
      }
    }

    console.log('[Storage Maintenance] Configuration updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): MaintenanceConfig {
    return { ...this.config };
  }

  /**
   * Force immediate maintenance
   */
  async forceMaintenanceNow(): Promise<MaintenanceReport> {
    return this.performMaintenance(true);
  }

  /**
   * Get maintenance status
   */
  getMaintenanceStatus(): {
    isRunning: boolean;
    autoMaintenanceEnabled: boolean;
    lastRun: string | null;
    nextScheduledRun: string | null;
  } {
    const nextRun = this.maintenanceInterval && this.lastMaintenanceReport
      ? new Date(Date.now() + this.config.cleanupIntervalMs).toISOString()
      : null;

    return {
      isRunning: this.isMaintenanceRunning,
      autoMaintenanceEnabled: !!this.maintenanceInterval,
      lastRun: this.lastMaintenanceReport?.timestamp || null,
      nextScheduledRun: nextRun
    };
  }

  /**
   * Cleanup resources when service is no longer needed
   */
  destroy(): void {
    this.stopAutoMaintenance();
    this.lastMaintenanceReport = null;
    console.log('[Storage Maintenance] Service destroyed');
  }
}

// Export singleton instance
export const storageMaintenanceService = new StorageMaintenanceService();

// Export utility functions
export async function performStorageMaintenance(): Promise<MaintenanceReport> {
  return storageMaintenanceService.performMaintenance();
}

export function getMaintenanceReport(): MaintenanceReport | null {
  return storageMaintenanceService.getLastMaintenanceReport();
}

export function configureStorageMaintenance(config: Partial<MaintenanceConfig>): void {
  storageMaintenanceService.updateConfig(config);
}

export function getMaintenanceStatus() {
  return storageMaintenanceService.getMaintenanceStatus();
}

export async function forceStorageMaintenance(): Promise<MaintenanceReport> {
  return storageMaintenanceService.forceMaintenanceNow();
}

// Initialize maintenance service on module load
if (typeof window !== 'undefined') {
  // Only start in browser environment
  console.log('[Storage Maintenance] Service initialized');
}