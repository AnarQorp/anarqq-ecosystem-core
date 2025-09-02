/**
 * Identity Context Switcher Service
 * Handles automatic module context updates on identity switch with validation and rollback
 * Requirements: 4.3, 4.4, 4.5, 4.6
 */

import {
  ExtendedSquidIdentity,
  ContextSwitchResult,
  ContextValidationResult,
  ContextRollbackResult,
  ModuleContext,
  ContextSwitchError,
  ContextUpdateStatus
} from '@/types/identity';

// Module context interfaces
interface QonsentContext {
  profileId: string;
  privacyLevel: string;
  policies: Record<string, any>;
}

interface QlockContext {
  keyPair: {
    publicKey: string;
    privateKey: string;
    algorithm: string;
  };
  encryptionSettings: Record<string, any>;
}

interface QwalletContext {
  walletAddress: string;
  permissions: string[];
  daoMemberships: string[];
}

interface QerberosContext {
  auditLevel: string;
  logSettings: Record<string, any>;
}

interface QindexContext {
  registrationId: string;
  visibility: string;
  metadata: Record<string, any>;
}

interface ContextSnapshot {
  timestamp: string;
  previousIdentity: ExtendedSquidIdentity | null;
  contexts: {
    qonsent: QonsentContext | null;
    qlock: QlockContext | null;
    qwallet: QwalletContext | null;
    qerberos: QerberosContext | null;
    qindex: QindexContext | null;
  };
}

/**
 * Core Identity Context Switching Service
 * Orchestrates context updates across all ecosystem modules
 */
export class IdentityContextSwitcher {
  private static instance: IdentityContextSwitcher;
  private contextSnapshots: Map<string, ContextSnapshot> = new Map();
  private switchInProgress = false;
  private currentSwitchId: string | null = null;

  private constructor() {}

  public static getInstance(): IdentityContextSwitcher {
    if (!IdentityContextSwitcher.instance) {
      IdentityContextSwitcher.instance = new IdentityContextSwitcher();
    }
    return IdentityContextSwitcher.instance;
  }

  /**
   * Perform complete identity context switch with validation and rollback support
   * Requirements: 4.3, 4.4, 4.5, 4.6
   */
  async switchIdentityContext(
    previousIdentity: ExtendedSquidIdentity | null,
    newIdentity: ExtendedSquidIdentity
  ): Promise<ContextSwitchResult> {
    const switchId = this.generateSwitchId();
    this.currentSwitchId = switchId;

    try {
      // Prevent concurrent switches
      if (this.switchInProgress) {
        throw new ContextSwitchError(
          'Context switch already in progress',
          'SWITCH_IN_PROGRESS',
          switchId
        );
      }

      this.switchInProgress = true;
      console.log(`[IdentityContextSwitcher] Starting context switch: ${switchId}`);
      console.log(`[IdentityContextSwitcher] From: ${previousIdentity?.did || 'none'} To: ${newIdentity.did}`);

      // Step 1: Create context snapshot for rollback
      const snapshot = await this.createContextSnapshot(previousIdentity);
      this.contextSnapshots.set(switchId, snapshot);

      // Step 2: Validate context switch
      const validation = await this.validateContextSwitch(previousIdentity, newIdentity);
      if (!validation.valid) {
        throw new ContextSwitchError(
          `Context validation failed: ${validation.errors.join(', ')}`,
          'VALIDATION_FAILED',
          switchId,
          validation.errors
        );
      }

      // Step 3: Update module contexts sequentially
      const contextUpdates: Record<string, ContextUpdateStatus> = {};
      const updateResults: Array<{ module: string; success: boolean; error?: string }> = [];

      // Update Qonsent context
      try {
        await this.updateQonsentContext(newIdentity);
        contextUpdates.qonsent = ContextUpdateStatus.SUCCESS;
        updateResults.push({ module: 'qonsent', success: true });
        console.log(`[IdentityContextSwitcher] Qonsent context updated for: ${newIdentity.did}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown Qonsent error';
        contextUpdates.qonsent = ContextUpdateStatus.FAILED;
        updateResults.push({ module: 'qonsent', success: false, error: errorMsg });
        console.error(`[IdentityContextSwitcher] Qonsent context update failed:`, error);
      }

      // Update Qlock context
      try {
        await this.updateQlockContext(newIdentity);
        contextUpdates.qlock = ContextUpdateStatus.SUCCESS;
        updateResults.push({ module: 'qlock', success: true });
        console.log(`[IdentityContextSwitcher] Qlock context updated for: ${newIdentity.did}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown Qlock error';
        contextUpdates.qlock = ContextUpdateStatus.FAILED;
        updateResults.push({ module: 'qlock', success: false, error: errorMsg });
        console.error(`[IdentityContextSwitcher] Qlock context update failed:`, error);
      }

      // Update Qwallet context
      try {
        await this.updateQwalletContext(newIdentity);
        contextUpdates.qwallet = ContextUpdateStatus.SUCCESS;
        updateResults.push({ module: 'qwallet', success: true });
        console.log(`[IdentityContextSwitcher] Qwallet context updated for: ${newIdentity.did}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown Qwallet error';
        contextUpdates.qwallet = ContextUpdateStatus.FAILED;
        updateResults.push({ module: 'qwallet', success: false, error: errorMsg });
        console.error(`[IdentityContextSwitcher] Qwallet context update failed:`, error);
      }

      // Update Qerberos context
      try {
        await this.updateQerberosContext(newIdentity);
        contextUpdates.qerberos = ContextUpdateStatus.SUCCESS;
        updateResults.push({ module: 'qerberos', success: true });
        console.log(`[IdentityContextSwitcher] Qerberos context updated for: ${newIdentity.did}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown Qerberos error';
        contextUpdates.qerberos = ContextUpdateStatus.FAILED;
        updateResults.push({ module: 'qerberos', success: false, error: errorMsg });
        console.error(`[IdentityContextSwitcher] Qerberos context update failed:`, error);
      }

      // Update Qindex context
      try {
        await this.updateQindexContext(newIdentity);
        contextUpdates.qindex = ContextUpdateStatus.SUCCESS;
        updateResults.push({ module: 'qindex', success: true });
        console.log(`[IdentityContextSwitcher] Qindex context updated for: ${newIdentity.did}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown Qindex error';
        contextUpdates.qindex = ContextUpdateStatus.FAILED;
        updateResults.push({ module: 'qindex', success: false, error: errorMsg });
        console.error(`[IdentityContextSwitcher] Qindex context update failed:`, error);
      }

      // Step 4: Evaluate results and determine if rollback is needed
      const failedUpdates = updateResults.filter(result => !result.success);
      const successfulUpdates = updateResults.filter(result => result.success);

      // If critical modules failed, perform rollback
      const criticalModules = ['qonsent', 'qlock'];
      const criticalFailures = failedUpdates.filter(result => 
        criticalModules.includes(result.module)
      );

      if (criticalFailures.length > 0) {
        console.warn(`[IdentityContextSwitcher] Critical module failures detected, initiating rollback`);
        
        const rollbackResult = await this.rollbackContextSwitch(switchId);
        
        throw new ContextSwitchError(
          `Critical context updates failed: ${criticalFailures.map(f => f.module).join(', ')}`,
          'CRITICAL_FAILURE',
          switchId,
          criticalFailures.map(f => f.error || 'Unknown error'),
          rollbackResult
        );
      }

      // Step 5: Clean up snapshot if switch was successful
      this.contextSnapshots.delete(switchId);

      const result: ContextSwitchResult = {
        success: true,
        switchId,
        previousIdentity,
        newIdentity,
        contextUpdates,
        successfulModules: successfulUpdates.map(r => r.module),
        failedModules: failedUpdates.map(r => r.module),
        warnings: failedUpdates.length > 0 ? 
          [`Some non-critical modules failed: ${failedUpdates.map(f => f.module).join(', ')}`] : [],
        timestamp: new Date().toISOString()
      };

      console.log(`[IdentityContextSwitcher] Context switch completed successfully: ${switchId}`);
      console.log(`[IdentityContextSwitcher] Successful modules: ${result.successfulModules.join(', ')}`);
      
      if (result.failedModules.length > 0) {
        console.warn(`[IdentityContextSwitcher] Failed modules: ${result.failedModules.join(', ')}`);
      }

      return result;

    } catch (error) {
      console.error(`[IdentityContextSwitcher] Context switch failed: ${switchId}`, error);
      
      if (error instanceof ContextSwitchError) {
        return {
          success: false,
          switchId,
          previousIdentity,
          newIdentity,
          error: error.message,
          errorCode: error.code,
          contextUpdates: {},
          successfulModules: [],
          failedModules: ['all'],
          warnings: [],
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        switchId,
        previousIdentity,
        newIdentity,
        error: error instanceof Error ? error.message : 'Unknown context switch error',
        errorCode: 'UNKNOWN_ERROR',
        contextUpdates: {},
        successfulModules: [],
        failedModules: ['all'],
        warnings: [],
        timestamp: new Date().toISOString()
      };

    } finally {
      this.switchInProgress = false;
      this.currentSwitchId = null;
    }
  }

  /**
   * Validate context switch before execution
   * Requirements: Context validation and error handling
   */
  async validateContextSwitch(
    previousIdentity: ExtendedSquidIdentity | null,
    newIdentity: ExtendedSquidIdentity
  ): Promise<ContextValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate new identity
      if (!newIdentity.did) {
        errors.push('New identity DID is required');
      }

      if (!newIdentity.qonsentProfileId) {
        errors.push('New identity must have Qonsent profile ID');
      }

      if (!newIdentity.qlockKeyPair) {
        errors.push('New identity must have Qlock key pair');
      }

      // Validate identity status
      if (newIdentity.status !== 'ACTIVE') {
        errors.push('Cannot switch to inactive identity');
      }

      // Check for security flags
      if (newIdentity.securityFlags && newIdentity.securityFlags.length > 0) {
        const criticalFlags = newIdentity.securityFlags.filter(flag => 
          flag.severity === 'CRITICAL'
        );
        
        if (criticalFlags.length > 0) {
          errors.push('Identity has critical security flags');
        } else {
          warnings.push('Identity has security flags');
        }
      }

      // Validate governance permissions
      if (previousIdentity && newIdentity.governanceLevel === 'DAO_GOVERNED') {
        // Check if switch is allowed by DAO governance
        const hasDAOPermission = await this.validateDAOSwitchPermission(previousIdentity, newIdentity);
        if (!hasDAOPermission) {
          errors.push('DAO governance does not permit this identity switch');
        }
      }

      // Check module availability
      const moduleChecks = await Promise.allSettled([
        this.checkQonsentAvailability(),
        this.checkQlockAvailability(),
        this.checkQwalletAvailability(),
        this.checkQerberosAvailability(),
        this.checkQindexAvailability()
      ]);

      moduleChecks.forEach((result, index) => {
        const modules = ['Qonsent', 'Qlock', 'Qwallet', 'Qerberos', 'Qindex'];
        if (result.status === 'rejected') {
          warnings.push(`${modules[index]} module may not be available`);
        }
      });

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        checkedModules: ['qonsent', 'qlock', 'qwallet', 'qerberos', 'qindex'],
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[IdentityContextSwitcher] Validation error:', error);
      errors.push('Context validation process failed');
      
      return {
        valid: false,
        errors,
        warnings,
        checkedModules: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Create context snapshot for rollback functionality
   * Requirements: Context rollback functionality for failed switches
   */
  async createContextSnapshot(previousIdentity: ExtendedSquidIdentity | null): Promise<ContextSnapshot> {
    try {
      const snapshot: ContextSnapshot = {
        timestamp: new Date().toISOString(),
        previousIdentity,
        contexts: {
          qonsent: null,
          qlock: null,
          qwallet: null,
          qerberos: null,
          qindex: null
        }
      };

      if (previousIdentity) {
        // Capture current contexts
        try {
          snapshot.contexts.qonsent = await this.captureQonsentContext(previousIdentity);
        } catch (error) {
          console.warn('[IdentityContextSwitcher] Failed to capture Qonsent context:', error);
        }

        try {
          snapshot.contexts.qlock = await this.captureQlockContext(previousIdentity);
        } catch (error) {
          console.warn('[IdentityContextSwitcher] Failed to capture Qlock context:', error);
        }

        try {
          snapshot.contexts.qwallet = await this.captureQwalletContext(previousIdentity);
        } catch (error) {
          console.warn('[IdentityContextSwitcher] Failed to capture Qwallet context:', error);
        }

        try {
          snapshot.contexts.qerberos = await this.captureQerberosContext(previousIdentity);
        } catch (error) {
          console.warn('[IdentityContextSwitcher] Failed to capture Qerberos context:', error);
        }

        try {
          snapshot.contexts.qindex = await this.captureQindexContext(previousIdentity);
        } catch (error) {
          console.warn('[IdentityContextSwitcher] Failed to capture Qindex context:', error);
        }
      }

      return snapshot;

    } catch (error) {
      console.error('[IdentityContextSwitcher] Failed to create context snapshot:', error);
      throw new ContextSwitchError(
        'Failed to create context snapshot',
        'SNAPSHOT_FAILED',
        this.currentSwitchId || 'unknown'
      );
    }
  }

  /**
   * Rollback context switch using snapshot
   * Requirements: Context rollback functionality for failed switches
   */
  async rollbackContextSwitch(switchId: string): Promise<ContextRollbackResult> {
    try {
      console.log(`[IdentityContextSwitcher] Starting context rollback: ${switchId}`);

      const snapshot = this.contextSnapshots.get(switchId);
      if (!snapshot) {
        throw new Error('Context snapshot not found for rollback');
      }

      const rollbackResults: Record<string, boolean> = {};
      const errors: string[] = [];

      // Rollback each module context
      if (snapshot.contexts.qonsent) {
        try {
          await this.rollbackQonsentContext(snapshot.contexts.qonsent);
          rollbackResults.qonsent = true;
        } catch (error) {
          rollbackResults.qonsent = false;
          errors.push(`Qonsent rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (snapshot.contexts.qlock) {
        try {
          await this.rollbackQlockContext(snapshot.contexts.qlock);
          rollbackResults.qlock = true;
        } catch (error) {
          rollbackResults.qlock = false;
          errors.push(`Qlock rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (snapshot.contexts.qwallet) {
        try {
          await this.rollbackQwalletContext(snapshot.contexts.qwallet);
          rollbackResults.qwallet = true;
        } catch (error) {
          rollbackResults.qwallet = false;
          errors.push(`Qwallet rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (snapshot.contexts.qerberos) {
        try {
          await this.rollbackQerberosContext(snapshot.contexts.qerberos);
          rollbackResults.qerberos = true;
        } catch (error) {
          rollbackResults.qerberos = false;
          errors.push(`Qerberos rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (snapshot.contexts.qindex) {
        try {
          await this.rollbackQindexContext(snapshot.contexts.qindex);
          rollbackResults.qindex = true;
        } catch (error) {
          rollbackResults.qindex = false;
          errors.push(`Qindex rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Clean up snapshot
      this.contextSnapshots.delete(switchId);

      const result: ContextRollbackResult = {
        success: errors.length === 0,
        switchId,
        rollbackResults,
        errors,
        timestamp: new Date().toISOString()
      };

      console.log(`[IdentityContextSwitcher] Context rollback completed: ${switchId}`, result);
      return result;

    } catch (error) {
      console.error(`[IdentityContextSwitcher] Context rollback failed: ${switchId}`, error);
      
      return {
        success: false,
        switchId,
        rollbackResults: {},
        errors: [error instanceof Error ? error.message : 'Unknown rollback error'],
        timestamp: new Date().toISOString()
      };
    }
  }

  // Private helper methods for module context updates
  private async updateQonsentContext(identity: ExtendedSquidIdentity): Promise<void> {
    // Mock implementation - would integrate with actual Qonsent service
    console.log(`[IdentityContextSwitcher] Updating Qonsent context for: ${identity.did}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Note: Random failure simulation removed for consistent testing
    // In production, this would integrate with actual Qonsent service
  }

  private async updateQlockContext(identity: ExtendedSquidIdentity): Promise<void> {
    // Mock implementation - would integrate with actual Qlock service
    console.log(`[IdentityContextSwitcher] Updating Qlock context for: ${identity.did}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Note: Random failure simulation removed for consistent testing
    // In production, this would integrate with actual Qlock service
  }

  private async updateQwalletContext(identity: ExtendedSquidIdentity): Promise<void> {
    // Mock implementation - would integrate with actual Qwallet service
    console.log(`[IdentityContextSwitcher] Updating Qwallet context for: ${identity.did}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Note: Random failure simulation removed for consistent testing
    // In production, this would integrate with actual Qwallet service
  }

  private async updateQerberosContext(identity: ExtendedSquidIdentity): Promise<void> {
    // Mock implementation - would integrate with actual Qerberos service
    console.log(`[IdentityContextSwitcher] Updating Qerberos context for: ${identity.did}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 80));
    
    // Note: Random failure simulation removed for consistent testing
    // In production, this would integrate with actual Qerberos service
  }

  private async updateQindexContext(identity: ExtendedSquidIdentity): Promise<void> {
    // Mock implementation - would integrate with actual Qindex service
    console.log(`[IdentityContextSwitcher] Updating Qindex context for: ${identity.did}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 120));
    
    // Note: Random failure simulation removed for consistent testing
    // In production, this would integrate with actual Qindex service
  }

  // Context capture methods for rollback
  private async captureQonsentContext(identity: ExtendedSquidIdentity): Promise<QonsentContext> {
    return {
      profileId: identity.qonsentProfileId,
      privacyLevel: identity.privacyLevel,
      policies: {} // Mock policies
    };
  }

  private async captureQlockContext(identity: ExtendedSquidIdentity): Promise<QlockContext> {
    return {
      keyPair: identity.qlockKeyPair,
      encryptionSettings: {} // Mock settings
    };
  }

  private async captureQwalletContext(identity: ExtendedSquidIdentity): Promise<QwalletContext> {
    return {
      walletAddress: `wallet-${identity.did}`,
      permissions: [],
      daoMemberships: []
    };
  }

  private async captureQerberosContext(identity: ExtendedSquidIdentity): Promise<QerberosContext> {
    return {
      auditLevel: 'MEDIUM',
      logSettings: {}
    };
  }

  private async captureQindexContext(identity: ExtendedSquidIdentity): Promise<QindexContext> {
    return {
      registrationId: `qindex-${identity.did}`,
      visibility: identity.privacyLevel,
      metadata: {}
    };
  }

  // Context rollback methods
  private async rollbackQonsentContext(context: QonsentContext): Promise<void> {
    console.log(`[IdentityContextSwitcher] Rolling back Qonsent context: ${context.profileId}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async rollbackQlockContext(context: QlockContext): Promise<void> {
    console.log(`[IdentityContextSwitcher] Rolling back Qlock context`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async rollbackQwalletContext(context: QwalletContext): Promise<void> {
    console.log(`[IdentityContextSwitcher] Rolling back Qwallet context: ${context.walletAddress}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async rollbackQerberosContext(context: QerberosContext): Promise<void> {
    console.log(`[IdentityContextSwitcher] Rolling back Qerberos context`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async rollbackQindexContext(context: QindexContext): Promise<void> {
    console.log(`[IdentityContextSwitcher] Rolling back Qindex context: ${context.registrationId}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Validation helper methods
  private async validateDAOSwitchPermission(
    previousIdentity: ExtendedSquidIdentity,
    newIdentity: ExtendedSquidIdentity
  ): Promise<boolean> {
    // Mock DAO permission validation
    return true;
  }

  private async checkQonsentAvailability(): Promise<boolean> {
    // Mock service availability check
    await new Promise(resolve => setTimeout(resolve, 10));
    return true;
  }

  private async checkQlockAvailability(): Promise<boolean> {
    // Mock service availability check
    await new Promise(resolve => setTimeout(resolve, 10));
    return true;
  }

  private async checkQwalletAvailability(): Promise<boolean> {
    // Mock service availability check
    await new Promise(resolve => setTimeout(resolve, 10));
    return true;
  }

  private async checkQerberosAvailability(): Promise<boolean> {
    // Mock service availability check
    await new Promise(resolve => setTimeout(resolve, 10));
    return true;
  }

  private async checkQindexAvailability(): Promise<boolean> {
    // Mock service availability check
    await new Promise(resolve => setTimeout(resolve, 10));
    return true;
  }

  // Utility methods
  private generateSwitchId(): string {
    return `switch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current switch status
   */
  public getSwitchStatus(): { inProgress: boolean; switchId: string | null } {
    return {
      inProgress: this.switchInProgress,
      switchId: this.currentSwitchId
    };
  }

  /**
   * Clear all context snapshots (cleanup method)
   */
  public clearSnapshots(): void {
    this.contextSnapshots.clear();
    console.log('[IdentityContextSwitcher] All context snapshots cleared');
  }
}

// Export singleton instance
export const identityContextSwitcher = IdentityContextSwitcher.getInstance();
export default identityContextSwitcher;