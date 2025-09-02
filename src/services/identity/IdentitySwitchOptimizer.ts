/**
 * Identity Switch Optimizer
 * Implements preloading and performance optimizations for identity switching
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { ExtendedSquidIdentity, IdentityType } from '@/types/identity';
import { identityCacheManager } from './IdentityCacheManager';
import { useIdentityStore } from '@/state/identity';

export interface SwitchPreparation {
  identity: ExtendedSquidIdentity;
  qonsentContext: any;
  qlockContext: any;
  qerberosContext: any;
  qindexContext: any;
  qwalletContext: any;
  preparedAt: number;
  expiresAt: number;
}

export interface SwitchPrediction {
  identityId: string;
  confidence: number;
  reason: 'pattern' | 'recent' | 'frequent' | 'related';
  priority: number;
}

export interface SwitchPerformanceMetrics {
  totalSwitches: number;
  averageSwitchTime: number;
  preloadHitRate: number;
  contextPrepHitRate: number;
  fastestSwitch: number;
  slowestSwitch: number;
  recentSwitchTimes: number[];
}

export interface OptimizationConfig {
  enablePreloading: boolean;
  enableContextPreparation: boolean;
  enableStateBatching: boolean;
  maxPreloadedIdentities: number;
  preloadConfidenceThreshold: number;
  contextCacheExpiry: number;
  batchUpdateDelay: number;
}

class IdentitySwitchOptimizer {
  private preparedContexts = new Map<string, SwitchPreparation>();
  private switchHistory: Array<{ from: string; to: string; timestamp: number; duration: number }> = [];
  private accessPatterns = new Map<string, number[]>(); // DID -> access timestamps
  private switchPatterns = new Map<string, Map<string, number>>(); // from DID -> to DID -> count
  private preloadQueue = new Set<string>();
  private contextPrepQueue = new Set<string>();
  
  private config: OptimizationConfig = {
    enablePreloading: true,
    enableContextPreparation: true,
    enableStateBatching: true,
    maxPreloadedIdentities: 5,
    preloadConfidenceThreshold: 0.6,
    contextCacheExpiry: 10 * 60 * 1000, // 10 minutes
    batchUpdateDelay: 50 // 50ms
  };

  private metrics: SwitchPerformanceMetrics = {
    totalSwitches: 0,
    averageSwitchTime: 0,
    preloadHitRate: 0,
    contextPrepHitRate: 0,
    fastestSwitch: Infinity,
    slowestSwitch: 0,
    recentSwitchTimes: []
  };

  private batchedUpdates = new Map<string, any>();
  private batchTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
    this.loadSwitchHistory();
  }

  /**
   * Optimized identity switch with preloading and context preparation
   */
  async optimizedSwitch(targetIdentityId: string): Promise<void> {
    const startTime = performance.now();
    const currentIdentity = useIdentityStore.getState().activeIdentity;
    
    try {
      // Check if context is already prepared
      const prepared = this.preparedContexts.get(targetIdentityId);
      let contextPrepHit = false;
      
      if (prepared && this.isValidPreparation(prepared)) {
        // Use prepared context
        await this.applePreparedContext(prepared);
        contextPrepHit = true;
        console.log(`[Switch Optimizer] Using prepared context for ${targetIdentityId}`);
      } else {
        // Prepare context on-demand
        await this.prepareAndApplyContext(targetIdentityId);
      }

      // Record switch metrics
      const switchTime = performance.now() - startTime;
      this.recordSwitch(currentIdentity?.did || 'unknown', targetIdentityId, switchTime);
      
      // Update metrics
      this.updateMetrics(switchTime, contextPrepHit);
      
      // Trigger predictive preloading for next likely switches
      this.triggerPredictivePreloading(targetIdentityId);
      
      console.log(`[Switch Optimizer] Switch completed in ${switchTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error(`[Switch Optimizer] Switch failed:`, error);
      throw error;
    }
  }

  /**
   * Preload likely-to-be-accessed identities
   */
  async preloadIdentities(identityIds: string[]): Promise<void> {
    const preloadPromises = identityIds
      .filter(id => !this.preloadQueue.has(id))
      .slice(0, this.config.maxPreloadedIdentities)
      .map(async (identityId) => {
        this.preloadQueue.add(identityId);
        
        try {
          // Preload identity data
          await identityCacheManager.getIdentity(identityId);
          
          // Prepare context if enabled
          if (this.config.enableContextPreparation) {
            await this.prepareContext(identityId);
          }
          
          console.log(`[Switch Optimizer] Preloaded identity: ${identityId}`);
        } catch (error) {
          console.error(`[Switch Optimizer] Preload failed for ${identityId}:`, error);
        } finally {
          this.preloadQueue.delete(identityId);
        }
      });

    await Promise.all(preloadPromises);
  }

  /**
   * Prepare context for identity switch
   */
  async prepareContext(identityId: string): Promise<void> {
    if (this.contextPrepQueue.has(identityId) || this.preparedContexts.has(identityId)) {
      return;
    }

    this.contextPrepQueue.add(identityId);

    try {
      const identity = await identityCacheManager.getIdentity(identityId);
      if (!identity) {
        throw new Error(`Identity not found: ${identityId}`);
      }

      // Prepare all module contexts in parallel
      const [qonsentContext, qlockContext, qerberosContext, qindexContext, qwalletContext] = 
        await Promise.all([
          this.prepareQonsentContext(identity),
          this.prepareQlockContext(identity),
          this.prepareQerberosContext(identity),
          this.prepareQindexContext(identity),
          this.prepareQwalletContext(identity)
        ]);

      const preparation: SwitchPreparation = {
        identity,
        qonsentContext,
        qlockContext,
        qerberosContext,
        qindexContext,
        qwalletContext,
        preparedAt: Date.now(),
        expiresAt: Date.now() + this.config.contextCacheExpiry
      };

      this.preparedContexts.set(identityId, preparation);
      console.log(`[Switch Optimizer] Context prepared for ${identityId}`);
      
    } catch (error) {
      console.error(`[Switch Optimizer] Context preparation failed for ${identityId}:`, error);
    } finally {
      this.contextPrepQueue.delete(identityId);
    }
  }

  /**
   * Get switch predictions based on patterns
   */
  getPredictions(currentIdentityId: string): SwitchPrediction[] {
    const predictions: SwitchPrediction[] = [];
    
    // Pattern-based predictions
    const switchPattern = this.switchPatterns.get(currentIdentityId);
    if (switchPattern) {
      const totalSwitches = Array.from(switchPattern.values()).reduce((sum, count) => sum + count, 0);
      
      switchPattern.forEach((count, targetId) => {
        const confidence = count / totalSwitches;
        if (confidence >= this.config.preloadConfidenceThreshold) {
          predictions.push({
            identityId: targetId,
            confidence,
            reason: 'pattern',
            priority: confidence * 100
          });
        }
      });
    }

    // Recent access predictions
    const recentAccesses = this.getRecentAccesses(60 * 60 * 1000); // Last hour
    recentAccesses.forEach(({ identityId, accessCount }) => {
      if (identityId !== currentIdentityId) {
        const confidence = Math.min(accessCount / 10, 0.9); // Max 90% confidence
        predictions.push({
          identityId,
          confidence,
          reason: 'recent',
          priority: confidence * 80
        });
      }
    });

    // Frequent access predictions
    const frequentAccesses = this.getFrequentAccesses();
    frequentAccesses.forEach(({ identityId, frequency }) => {
      if (identityId !== currentIdentityId) {
        const confidence = Math.min(frequency / 50, 0.8); // Max 80% confidence
        predictions.push({
          identityId,
          confidence,
          reason: 'frequent',
          priority: confidence * 60
        });
      }
    });

    // Remove duplicates and sort by priority
    const uniquePredictions = new Map<string, SwitchPrediction>();
    predictions.forEach(pred => {
      const existing = uniquePredictions.get(pred.identityId);
      if (!existing || pred.priority > existing.priority) {
        uniquePredictions.set(pred.identityId, pred);
      }
    });

    return Array.from(uniquePredictions.values())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, this.config.maxPreloadedIdentities);
  }

  /**
   * Batch state updates for performance
   */
  batchStateUpdate(key: string, update: any): void {
    if (!this.config.enableStateBatching) {
      // Apply immediately if batching disabled
      this.applyStateUpdate(key, update);
      return;
    }

    this.batchedUpdates.set(key, update);

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.flushBatchedUpdates();
    }, this.config.batchUpdateDelay);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): SwitchPerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Configure optimization settings
   */
  configure(config: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[Switch Optimizer] Configuration updated:', this.config);
  }

  /**
   * Clear all caches and reset
   */
  reset(): void {
    this.preparedContexts.clear();
    this.switchHistory = [];
    this.accessPatterns.clear();
    this.switchPatterns.clear();
    this.preloadQueue.clear();
    this.contextPrepQueue.clear();
    this.batchedUpdates.clear();
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.metrics = {
      totalSwitches: 0,
      averageSwitchTime: 0,
      preloadHitRate: 0,
      contextPrepHitRate: 0,
      fastestSwitch: Infinity,
      slowestSwitch: 0,
      recentSwitchTimes: []
    };

    console.log('[Switch Optimizer] Reset completed');
  }

  // Private methods

  private async prepareAndApplyContext(identityId: string): Promise<void> {
    await this.prepareContext(identityId);
    const preparation = this.preparedContexts.get(identityId);
    if (preparation) {
      await this.applePreparedContext(preparation);
    }
  }

  private async applePreparedContext(preparation: SwitchPreparation): Promise<void> {
    // Apply all contexts in parallel for maximum performance
    await Promise.all([
      this.applyQonsentContext(preparation.qonsentContext),
      this.applyQlockContext(preparation.qlockContext),
      this.applyQerberosContext(preparation.qerberosContext),
      this.applyQindexContext(preparation.qindexContext),
      this.applyQwalletContext(preparation.qwalletContext)
    ]);

    // Update active identity in store
    await useIdentityStore.getState().setActiveIdentity(preparation.identity);
  }

  private async prepareQonsentContext(identity: ExtendedSquidIdentity): Promise<any> {
    // Mock Qonsent context preparation
    return {
      profileId: identity.qonsentProfileId,
      privacyLevel: identity.privacyLevel,
      policies: [], // Would load actual policies
      preparedAt: Date.now()
    };
  }

  private async prepareQlockContext(identity: ExtendedSquidIdentity): Promise<any> {
    // Mock Qlock context preparation
    return {
      keyPair: identity.qlockKeyPair,
      encryptionReady: true,
      preparedAt: Date.now()
    };
  }

  private async prepareQerberosContext(identity: ExtendedSquidIdentity): Promise<any> {
    // Mock Qerberos context preparation
    return {
      auditEnabled: true,
      logLevel: 'INFO',
      preparedAt: Date.now()
    };
  }

  private async prepareQindexContext(identity: ExtendedSquidIdentity): Promise<any> {
    // Mock Qindex context preparation
    return {
      registered: identity.qindexRegistered,
      metadata: {}, // Would load actual metadata
      preparedAt: Date.now()
    };
  }

  private async prepareQwalletContext(identity: ExtendedSquidIdentity): Promise<any> {
    // Mock Qwallet context preparation
    return {
      walletAddress: `wallet-${identity.did}`,
      permissions: identity.permissions,
      preparedAt: Date.now()
    };
  }

  private async applyQonsentContext(context: any): Promise<void> {
    // Mock applying Qonsent context
    console.log('[Switch Optimizer] Applied Qonsent context');
  }

  private async applyQlockContext(context: any): Promise<void> {
    // Mock applying Qlock context
    console.log('[Switch Optimizer] Applied Qlock context');
  }

  private async applyQerberosContext(context: any): Promise<void> {
    // Mock applying Qerberos context
    console.log('[Switch Optimizer] Applied Qerberos context');
  }

  private async applyQindexContext(context: any): Promise<void> {
    // Mock applying Qindex context
    console.log('[Switch Optimizer] Applied Qindex context');
  }

  private async applyQwalletContext(context: any): Promise<void> {
    // Mock applying Qwallet context
    console.log('[Switch Optimizer] Applied Qwallet context');
  }

  private isValidPreparation(preparation: SwitchPreparation): boolean {
    return Date.now() < preparation.expiresAt;
  }

  private recordSwitch(fromId: string, toId: string, duration: number): void {
    this.switchHistory.push({
      from: fromId,
      to: toId,
      timestamp: Date.now(),
      duration
    });

    // Keep only recent history (last 1000 switches)
    if (this.switchHistory.length > 1000) {
      this.switchHistory = this.switchHistory.slice(-1000);
    }

    // Update switch patterns
    if (!this.switchPatterns.has(fromId)) {
      this.switchPatterns.set(fromId, new Map());
    }
    const pattern = this.switchPatterns.get(fromId)!;
    pattern.set(toId, (pattern.get(toId) || 0) + 1);

    // Update access patterns
    const now = Date.now();
    const accesses = this.accessPatterns.get(toId) || [];
    accesses.push(now);
    
    // Keep only recent accesses (last 24 hours)
    const recentAccesses = accesses.filter(time => now - time < 24 * 60 * 60 * 1000);
    this.accessPatterns.set(toId, recentAccesses);
  }

  private updateMetrics(switchTime: number, contextPrepHit: boolean): void {
    this.metrics.totalSwitches++;
    this.metrics.recentSwitchTimes.push(switchTime);
    
    // Keep only recent switch times (last 100)
    if (this.metrics.recentSwitchTimes.length > 100) {
      this.metrics.recentSwitchTimes = this.metrics.recentSwitchTimes.slice(-100);
    }

    // Update average
    this.metrics.averageSwitchTime = 
      this.metrics.recentSwitchTimes.reduce((sum, time) => sum + time, 0) / 
      this.metrics.recentSwitchTimes.length;

    // Update fastest/slowest
    this.metrics.fastestSwitch = Math.min(this.metrics.fastestSwitch, switchTime);
    this.metrics.slowestSwitch = Math.max(this.metrics.slowestSwitch, switchTime);

    // Update hit rates
    if (contextPrepHit) {
      this.metrics.contextPrepHitRate = 
        (this.metrics.contextPrepHitRate * (this.metrics.totalSwitches - 1) + 1) / 
        this.metrics.totalSwitches;
    } else {
      this.metrics.contextPrepHitRate = 
        (this.metrics.contextPrepHitRate * (this.metrics.totalSwitches - 1)) / 
        this.metrics.totalSwitches;
    }
  }

  private triggerPredictivePreloading(currentIdentityId: string): void {
    if (!this.config.enablePreloading) return;

    const predictions = this.getPredictions(currentIdentityId);
    const identityIds = predictions.map(p => p.identityId);
    
    if (identityIds.length > 0) {
      this.preloadIdentities(identityIds).catch(error => {
        console.error('[Switch Optimizer] Predictive preloading failed:', error);
      });
    }
  }

  private getRecentAccesses(timeWindow: number): Array<{ identityId: string; accessCount: number }> {
    const now = Date.now();
    const recentAccesses: Array<{ identityId: string; accessCount: number }> = [];

    this.accessPatterns.forEach((accesses, identityId) => {
      const recentCount = accesses.filter(time => now - time < timeWindow).length;
      if (recentCount > 0) {
        recentAccesses.push({ identityId, accessCount: recentCount });
      }
    });

    return recentAccesses.sort((a, b) => b.accessCount - a.accessCount);
  }

  private getFrequentAccesses(): Array<{ identityId: string; frequency: number }> {
    const frequentAccesses: Array<{ identityId: string; frequency: number }> = [];

    this.accessPatterns.forEach((accesses, identityId) => {
      if (accesses.length > 5) { // Only consider identities with multiple accesses
        frequentAccesses.push({ identityId, frequency: accesses.length });
      }
    });

    return frequentAccesses.sort((a, b) => b.frequency - a.frequency);
  }

  private flushBatchedUpdates(): void {
    const updates = Array.from(this.batchedUpdates.entries());
    this.batchedUpdates.clear();
    this.batchTimer = null;

    // Apply all batched updates
    updates.forEach(([key, update]) => {
      this.applyStateUpdate(key, update);
    });

    console.log(`[Switch Optimizer] Flushed ${updates.length} batched updates`);
  }

  private applyStateUpdate(key: string, update: any): void {
    // Mock state update application
    console.log(`[Switch Optimizer] Applied state update: ${key}`);
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredPreparations();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private cleanupExpiredPreparations(): void {
    const now = Date.now();
    let cleanedCount = 0;

    this.preparedContexts.forEach((preparation, identityId) => {
      if (now >= preparation.expiresAt) {
        this.preparedContexts.delete(identityId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`[Switch Optimizer] Cleaned up ${cleanedCount} expired preparations`);
    }
  }

  private loadSwitchHistory(): void {
    try {
      const stored = localStorage.getItem('squid_switch_history');
      if (stored) {
        const data = JSON.parse(stored);
        this.switchHistory = data.switchHistory || [];
        this.accessPatterns = new Map(data.accessPatterns || []);
        this.switchPatterns = new Map(
          (data.switchPatterns || []).map(([key, value]: [string, any]) => [
            key,
            new Map(value)
          ])
        );
        this.metrics = { ...this.metrics, ...data.metrics };
      }
    } catch (error) {
      console.error('[Switch Optimizer] Failed to load switch history:', error);
    }
  }

  private saveSwitchHistory(): void {
    try {
      const data = {
        switchHistory: this.switchHistory.slice(-500), // Keep last 500
        accessPatterns: Array.from(this.accessPatterns.entries()),
        switchPatterns: Array.from(this.switchPatterns.entries()).map(([key, value]) => [
          key,
          Array.from(value.entries())
        ]),
        metrics: this.metrics
      };
      localStorage.setItem('squid_switch_history', JSON.stringify(data));
    } catch (error) {
      console.error('[Switch Optimizer] Failed to save switch history:', error);
    }
  }
}

// Export singleton instance
export const identitySwitchOptimizer = new IdentitySwitchOptimizer();

// Export utility functions
export async function optimizedIdentitySwitch(targetIdentityId: string): Promise<void> {
  return identitySwitchOptimizer.optimizedSwitch(targetIdentityId);
}

export async function preloadIdentitiesForSwitch(identityIds: string[]): Promise<void> {
  return identitySwitchOptimizer.preloadIdentities(identityIds);
}

export function getSwitchPredictions(currentIdentityId: string): SwitchPrediction[] {
  return identitySwitchOptimizer.getPredictions(currentIdentityId);
}

export function getSwitchMetrics(): SwitchPerformanceMetrics {
  return identitySwitchOptimizer.getMetrics();
}

export function configureSwitchOptimization(config: Partial<OptimizationConfig>): void {
  identitySwitchOptimizer.configure(config);
}

export function resetSwitchOptimizer(): void {
  identitySwitchOptimizer.reset();
}