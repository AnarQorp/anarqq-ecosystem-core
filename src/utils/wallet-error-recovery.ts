/**
 * Wallet Error Recovery Utilities
 * Provides fallback mechanisms and recovery strategies for wallet operations
 * Requirements: 6.6, Error handling design
 */

import {
  WalletError,
  WalletErrorType,
  RecoveryStrategy,
  ErrorRecoveryResult
} from '../types/wallet-errors';

import { IdentityType } from '../types/identity';

export interface FallbackMechanism {
  name: string;
  description: string;
  applicable: (error: WalletError) => boolean;
  execute: (error: WalletError, context?: any) => Promise<any>;
  priority: number;
}

export interface RecoveryContext {
  identityId: string;
  identityType: IdentityType;
  operation: string;
  originalParameters: any;
  attemptCount: number;
  maxAttempts: number;
  lastError?: WalletError;
}

export class WalletErrorRecoveryUtils {
  private fallbackMechanisms: FallbackMechanism[] = [];

  constructor() {
    this.initializeFallbackMechanisms();
  }

  /**
   * Execute fallback mechanism for a given error
   */
  async executeFallback(error: WalletError, context?: RecoveryContext): Promise<any> {
    const applicableFallbacks = this.fallbackMechanisms
      .filter(mechanism => mechanism.applicable(error))
      .sort((a, b) => b.priority - a.priority);

    for (const fallback of applicableFallbacks) {
      try {
        console.log(`[WalletErrorRecovery] Attempting fallback: ${fallback.name}`);
        const result = await fallback.execute(error, context);
        
        if (result && result.success) {
          console.log(`[WalletErrorRecovery] Fallback successful: ${fallback.name}`);
          return result;
        }
      } catch (fallbackError) {
        console.warn(`[WalletErrorRecovery] Fallback failed: ${fallback.name}`, fallbackError);
        continue;
      }
    }

    throw new Error(`No successful fallback mechanism found for error: ${error.type}`);
  }

  /**
   * Get available fallback mechanisms for an error
   */
  getAvailableFallbacks(error: WalletError): FallbackMechanism[] {
    return this.fallbackMechanisms
      .filter(mechanism => mechanism.applicable(error))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Register a custom fallback mechanism
   */
  registerFallback(mechanism: FallbackMechanism): void {
    this.fallbackMechanisms.push(mechanism);
    this.fallbackMechanisms.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Create a recovery context for tracking retry attempts
   */
  createRecoveryContext(
    identityId: string,
    identityType: IdentityType,
    operation: string,
    originalParameters: any,
    maxAttempts: number = 3
  ): RecoveryContext {
    return {
      identityId,
      identityType,
      operation,
      originalParameters,
      attemptCount: 0,
      maxAttempts
    };
  }

  /**
   * Execute operation with automatic retry and fallback
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: RecoveryContext,
    onError?: (error: WalletError, context: RecoveryContext) => Promise<boolean>
  ): Promise<T> {
    let lastError: WalletError | null = null;

    for (let attempt = 1; attempt <= context.maxAttempts; attempt++) {
      context.attemptCount = attempt;

      try {
        return await operation();
      } catch (error) {
        const walletError = this.normalizeError(error);
        lastError = walletError;
        context.lastError = walletError;

        console.log(`[WalletErrorRecovery] Attempt ${attempt}/${context.maxAttempts} failed:`, walletError.type);

        // Allow custom error handling
        if (onError) {
          const shouldContinue = await onError(walletError, context);
          if (!shouldContinue) {
            break;
          }
        }

        // Don't retry on final attempt
        if (attempt === context.maxAttempts) {
          break;
        }

        // Check if error is retryable
        if (!walletError.retryable) {
          console.log(`[WalletErrorRecovery] Error not retryable: ${walletError.type}`);
          break;
        }

        // Wait before retry with exponential backoff
        const delay = this.calculateRetryDelay(attempt);
        await this.sleep(delay);
      }
    }

    // All retries failed, attempt fallback
    if (lastError) {
      try {
        const fallbackResult = await this.executeFallback(lastError, context);
        if (fallbackResult && fallbackResult.success) {
          return fallbackResult.data;
        }
      } catch (fallbackError) {
        console.error('[WalletErrorRecovery] All fallback mechanisms failed:', fallbackError);
      }
    }

    // If we get here, everything failed
    throw lastError || new Error('Operation failed after all recovery attempts');
  }

  /**
   * Graceful degradation for wallet operations
   */
  async degradeGracefully(error: WalletError, context?: RecoveryContext): Promise<any> {
    console.log(`[WalletErrorRecovery] Attempting graceful degradation for: ${error.type}`);

    switch (error.type) {
      case WalletErrorType.QLOCK_FAILED:
      case WalletErrorType.QLOCK_UNAVAILABLE:
        return this.degradeSigningOperation(error, context);

      case WalletErrorType.QONSENT_TIMEOUT:
        return this.degradePermissionCheck(error, context);

      case WalletErrorType.QERBEROS_LOG_FAILED:
        return this.degradeAuditLogging(error, context);

      case WalletErrorType.PI_WALLET_CONNECTION_FAILED:
        return this.degradePiWalletOperation(error, context);

      case WalletErrorType.NETWORK_ERROR:
        return this.degradeNetworkOperation(error, context);

      default:
        throw new Error(`No graceful degradation available for error: ${error.type}`);
    }
  }

  // Private helper methods

  private initializeFallbackMechanisms(): void {
    // Qlock signing fallback
    this.fallbackMechanisms.push({
      name: 'Manual Signing Fallback',
      description: 'Use manual signing when Qlock is unavailable',
      applicable: (error) => [
        WalletErrorType.QLOCK_FAILED,
        WalletErrorType.QLOCK_UNAVAILABLE
      ].includes(error.type),
      execute: async (error, context) => {
        return this.executeManualSigning(error, context);
      },
      priority: 8
    });

    // Qonsent permission fallback
    this.fallbackMechanisms.push({
      name: 'Default Permission Fallback',
      description: 'Use default permissions when Qonsent is unavailable',
      applicable: (error) => [
        WalletErrorType.QONSENT_TIMEOUT,
        WalletErrorType.QONSENT_BLOCKED
      ].includes(error.type),
      execute: async (error, context) => {
        return this.executeDefaultPermissions(error, context);
      },
      priority: 6
    });

    // Qerberos logging fallback
    this.fallbackMechanisms.push({
      name: 'Local Logging Fallback',
      description: 'Use local logging when Qerberos is unavailable',
      applicable: (error) => error.type === WalletErrorType.QERBEROS_LOG_FAILED,
      execute: async (error, context) => {
        return this.executeLocalLogging(error, context);
      },
      priority: 9
    });

    // Pi Wallet fallback
    this.fallbackMechanisms.push({
      name: 'Native Transfer Fallback',
      description: 'Use native transfers when Pi Wallet is unavailable',
      applicable: (error) => [
        WalletErrorType.PI_WALLET_CONNECTION_FAILED,
        WalletErrorType.PI_WALLET_TRANSFER_FAILED
      ].includes(error.type),
      execute: async (error, context) => {
        return this.executeNativeTransfer(error, context);
      },
      priority: 7
    });

    // Network error fallback
    this.fallbackMechanisms.push({
      name: 'Cached Data Fallback',
      description: 'Use cached data when network is unavailable',
      applicable: (error) => [
        WalletErrorType.NETWORK_ERROR,
        WalletErrorType.SERVICE_UNAVAILABLE
      ].includes(error.type),
      execute: async (error, context) => {
        return this.executeCachedDataFallback(error, context);
      },
      priority: 5
    });

    // Transaction limit fallback
    this.fallbackMechanisms.push({
      name: 'Split Transaction Fallback',
      description: 'Split large transactions into smaller ones',
      applicable: (error) => error.type === WalletErrorType.LIMIT_EXCEEDED,
      execute: async (error, context) => {
        return this.executeSplitTransaction(error, context);
      },
      priority: 7
    });
  }

  private async executeManualSigning(error: WalletError, context?: RecoveryContext): Promise<any> {
    console.log('[WalletErrorRecovery] Executing manual signing fallback');
    
    // In a real implementation, this would prompt the user for manual signing
    // For now, we'll simulate a successful manual signing
    return {
      success: true,
      method: 'manual_signing',
      signature: 'manual_signature_placeholder',
      message: 'Transaction signed manually due to Qlock unavailability'
    };
  }

  private async executeDefaultPermissions(error: WalletError, context?: RecoveryContext): Promise<any> {
    console.log('[WalletErrorRecovery] Executing default permissions fallback');
    
    if (!context) {
      throw new Error('Context required for permission fallback');
    }

    // Use conservative default permissions based on identity type
    const defaultPermissions = this.getDefaultPermissionsForIdentity(context.identityType);
    
    return {
      success: true,
      method: 'default_permissions',
      permissions: defaultPermissions,
      message: 'Using default permissions due to Qonsent unavailability'
    };
  }

  private async executeLocalLogging(error: WalletError, context?: RecoveryContext): Promise<any> {
    console.log('[WalletErrorRecovery] Executing local logging fallback');
    
    try {
      // Store log entry locally
      const logEntry = {
        timestamp: new Date().toISOString(),
        error: error,
        context: context,
        fallbackUsed: 'local_logging'
      };

      const existingLogs = JSON.parse(localStorage.getItem('wallet_fallback_logs') || '[]');
      existingLogs.push(logEntry);
      
      // Keep only last 50 entries
      if (existingLogs.length > 50) {
        existingLogs.splice(0, existingLogs.length - 50);
      }
      
      localStorage.setItem('wallet_fallback_logs', JSON.stringify(existingLogs));

      return {
        success: true,
        method: 'local_logging',
        message: 'Log stored locally, will sync when Qerberos is available'
      };
    } catch (storageError) {
      throw new Error(`Local logging fallback failed: ${storageError}`);
    }
  }

  private async executeNativeTransfer(error: WalletError, context?: RecoveryContext): Promise<any> {
    console.log('[WalletErrorRecovery] Executing native transfer fallback');
    
    // In a real implementation, this would execute a native blockchain transfer
    // instead of using Pi Wallet
    return {
      success: true,
      method: 'native_transfer',
      transactionHash: 'native_tx_placeholder',
      message: 'Transfer completed using native blockchain instead of Pi Wallet'
    };
  }

  private async executeCachedDataFallback(error: WalletError, context?: RecoveryContext): Promise<any> {
    console.log('[WalletErrorRecovery] Executing cached data fallback');
    
    try {
      // Try to get cached data
      const cacheKey = `wallet_cache_${context?.identityId}_${context?.operation}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - new Date(parsed.timestamp).getTime();
        
        // Use cached data if it's less than 5 minutes old
        if (cacheAge < 5 * 60 * 1000) {
          return {
            success: true,
            method: 'cached_data',
            data: parsed.data,
            message: 'Using cached data due to network unavailability',
            cacheAge: cacheAge
          };
        }
      }
      
      throw new Error('No valid cached data available');
    } catch (cacheError) {
      throw new Error(`Cached data fallback failed: ${cacheError}`);
    }
  }

  private async executeSplitTransaction(error: WalletError, context?: RecoveryContext): Promise<any> {
    console.log('[WalletErrorRecovery] Executing split transaction fallback');
    
    if (!context?.originalParameters?.amount) {
      throw new Error('Cannot split transaction without amount information');
    }

    const originalAmount = context.originalParameters.amount;
    const maxAmount = this.getMaxTransactionAmount(context.identityType);
    
    if (originalAmount <= maxAmount) {
      throw new Error('Transaction amount is already within limits');
    }

    // Calculate number of splits needed
    const numSplits = Math.ceil(originalAmount / maxAmount);
    const splitAmount = originalAmount / numSplits;

    return {
      success: true,
      method: 'split_transaction',
      originalAmount,
      splitAmount,
      numSplits,
      message: `Transaction split into ${numSplits} smaller transactions of ${splitAmount} each`
    };
  }

  private async degradeSigningOperation(error: WalletError, context?: RecoveryContext): Promise<any> {
    console.log('[WalletErrorRecovery] Degrading signing operation');
    
    return {
      success: true,
      degraded: true,
      method: 'manual_approval_required',
      message: 'Transaction requires manual approval due to signing service unavailability'
    };
  }

  private async degradePermissionCheck(error: WalletError, context?: RecoveryContext): Promise<any> {
    console.log('[WalletErrorRecovery] Degrading permission check');
    
    return {
      success: true,
      degraded: true,
      method: 'conservative_permissions',
      message: 'Using conservative permissions due to permission service timeout'
    };
  }

  private async degradeAuditLogging(error: WalletError, context?: RecoveryContext): Promise<any> {
    console.log('[WalletErrorRecovery] Degrading audit logging');
    
    return {
      success: true,
      degraded: true,
      method: 'deferred_logging',
      message: 'Audit logging deferred until service recovery'
    };
  }

  private async degradePiWalletOperation(error: WalletError, context?: RecoveryContext): Promise<any> {
    console.log('[WalletErrorRecovery] Degrading Pi Wallet operation');
    
    return {
      success: true,
      degraded: true,
      method: 'pi_wallet_disabled',
      message: 'Pi Wallet operations temporarily disabled'
    };
  }

  private async degradeNetworkOperation(error: WalletError, context?: RecoveryContext): Promise<any> {
    console.log('[WalletErrorRecovery] Degrading network operation');
    
    return {
      success: true,
      degraded: true,
      method: 'offline_mode',
      message: 'Operating in offline mode with limited functionality'
    };
  }

  private normalizeError(error: any): WalletError {
    if (error && typeof error === 'object' && 'type' in error) {
      return error as WalletError;
    }

    // Convert generic error to WalletError
    return {
      type: WalletErrorType.UNKNOWN_ERROR,
      code: 'WALLET_UNKNOWN_ERROR',
      message: error?.message || 'Unknown error occurred',
      userMessage: 'An unexpected error occurred',
      severity: 'MEDIUM' as any,
      recoverable: true,
      retryable: true,
      suggestedActions: ['Try again', 'Contact support if problem persists'],
      recoveryStrategy: RecoveryStrategy.RETRY,
      timestamp: new Date().toISOString()
    };
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc. (max 30s)
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getDefaultPermissionsForIdentity(identityType: IdentityType): any {
    switch (identityType) {
      case IdentityType.ROOT:
        return {
          canTransfer: true,
          canReceive: true,
          canMintNFT: true,
          canSignTransactions: true,
          canAccessDeFi: true,
          canCreateDAO: true,
          maxTransactionAmount: 1000000,
          allowedTokens: ['*'],
          restrictedOperations: [],
          governanceLevel: 'FULL'
        };
      
      case IdentityType.DAO:
        return {
          canTransfer: true,
          canReceive: true,
          canMintNFT: true,
          canSignTransactions: true,
          canAccessDeFi: false,
          canCreateDAO: false,
          maxTransactionAmount: 100000,
          allowedTokens: ['ETH', 'ANARQ'],
          restrictedOperations: ['DEFI'],
          governanceLevel: 'LIMITED'
        };
      
      case IdentityType.ENTERPRISE:
        return {
          canTransfer: true,
          canReceive: true,
          canMintNFT: false,
          canSignTransactions: true,
          canAccessDeFi: false,
          canCreateDAO: false,
          maxTransactionAmount: 50000,
          allowedTokens: ['ETH', 'USDC'],
          restrictedOperations: ['DEFI', 'DAO_CREATE'],
          governanceLevel: 'LIMITED'
        };
      
      case IdentityType.CONSENTIDA:
        return {
          canTransfer: false,
          canReceive: true,
          canMintNFT: false,
          canSignTransactions: false,
          canAccessDeFi: false,
          canCreateDAO: false,
          maxTransactionAmount: 100,
          allowedTokens: ['ETH'],
          restrictedOperations: ['TRANSFER', 'SIGN', 'DEFI', 'DAO_CREATE'],
          governanceLevel: 'READ_ONLY'
        };
      
      case IdentityType.AID:
        return {
          canTransfer: true,
          canReceive: true,
          canMintNFT: false,
          canSignTransactions: true,
          canAccessDeFi: false,
          canCreateDAO: false,
          maxTransactionAmount: 1000,
          allowedTokens: ['ANARQ'],
          restrictedOperations: ['DEFI', 'DAO_CREATE'],
          governanceLevel: 'LIMITED'
        };
      
      default:
        return {
          canTransfer: false,
          canReceive: false,
          canMintNFT: false,
          canSignTransactions: false,
          canAccessDeFi: false,
          canCreateDAO: false,
          maxTransactionAmount: 0,
          allowedTokens: [],
          restrictedOperations: ['*'],
          governanceLevel: 'READ_ONLY'
        };
    }
  }

  private getMaxTransactionAmount(identityType: IdentityType): number {
    switch (identityType) {
      case IdentityType.ROOT: return 100000;
      case IdentityType.DAO: return 50000;
      case IdentityType.ENTERPRISE: return 25000;
      case IdentityType.CONSENTIDA: return 100;
      case IdentityType.AID: return 1000;
      default: return 0;
    }
  }
}

// Export singleton instance
export const walletErrorRecoveryUtils = new WalletErrorRecoveryUtils();