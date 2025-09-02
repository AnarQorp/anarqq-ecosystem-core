/**
 * useQlockWallet - React Hook for Qlock Wallet Integration
 * 
 * Provides transaction signing, signature verification, and fallback mechanisms
 * for wallet operations using the QlockWalletService.
 * 
 * Requirements: 3.2, 3.5, 3.6
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  qlockWalletService,
  TransactionSignatureResult,
  MessageSignatureResult,
  TypedDataSignatureResult,
  SignatureVerificationResult,
  FallbackSignatureResult,
  QlockHealthStatus,
  WalletTransaction,
  TypedData
} from '@/services/identity/QlockWalletService';

export interface UseQlockWalletReturn {
  // Current State
  isQlockAvailable: boolean;
  fallbackMode: boolean;
  serviceHealth: QlockHealthStatus | null;
  loading: boolean;
  error: string | null;
  
  // Transaction Signing
  signTransaction: (identityId: string, transaction: WalletTransaction) => Promise<TransactionSignatureResult | null>;
  signMessage: (identityId: string, message: string) => Promise<MessageSignatureResult | null>;
  signTypedData: (identityId: string, typedData: TypedData) => Promise<TypedDataSignatureResult | null>;
  
  // Signature Verification
  verifyTransactionSignature: (transaction: WalletTransaction, signature: string, publicKey: string) => Promise<SignatureVerificationResult | null>;
  verifyMessageSignature: (message: string, signature: string, publicKey: string) => Promise<SignatureVerificationResult | null>;
  validateSignatureIntegrity: (identityId: string, signature: string) => Promise<boolean>;
  
  // Key Management
  getSigningKeys: (identityId: string) => Promise<any>;
  rotateSigningKeys: (identityId: string) => Promise<boolean>;
  validateKeyAccess: (identityId: string) => Promise<boolean>;
  
  // Service Management
  checkServiceHealth: () => Promise<QlockHealthStatus | null>;
  enableFallbackMode: () => Promise<void>;
  disableFallbackMode: () => Promise<void>;
  recoverFromFailure: () => Promise<boolean>;
  
  // Utilities
  clearError: () => void;
  refreshServiceStatus: () => Promise<void>;
}

export const useQlockWallet = (): UseQlockWalletReturn => {
  // State
  const [isQlockAvailable, setIsQlockAvailable] = useState(true);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [serviceHealth, setServiceHealth] = useState<QlockHealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize service status on mount
  useEffect(() => {
    initializeServiceStatus();
  }, []);

  const initializeServiceStatus = useCallback(async () => {
    try {
      setLoading(true);
      const health = await qlockWalletService.checkServiceHealth();
      setServiceHealth(health);
      setIsQlockAvailable(health.available);
      
      if (!health.available) {
        console.warn('[useQlockWallet] Qlock service unavailable on initialization');
      }
    } catch (err) {
      console.error('[useQlockWallet] Error initializing service status:', err);
      setError('Failed to initialize Qlock service status');
      setIsQlockAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign a wallet transaction
   */
  const signTransaction = useCallback(async (
    identityId: string, 
    transaction: WalletTransaction
  ): Promise<TransactionSignatureResult | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await qlockWalletService.signTransaction(identityId, transaction);
      
      if (!result.success) {
        setError(result.error || 'Transaction signing failed');
      }
      
      // Update fallback mode status if it was used
      if (result.fallbackUsed) {
        setFallbackMode(true);
      }
      
      console.log(`[useQlockWallet] Transaction signing for ${identityId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown signing error';
      setError(errorMessage);
      console.error('[useQlockWallet] Error signing transaction:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign a plain text message
   */
  const signMessage = useCallback(async (
    identityId: string, 
    message: string
  ): Promise<MessageSignatureResult | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await qlockWalletService.signMessage(identityId, message);
      
      if (!result.success) {
        setError(result.error || 'Message signing failed');
      }
      
      // Update fallback mode status if it was used
      if (result.fallbackUsed) {
        setFallbackMode(true);
      }
      
      console.log(`[useQlockWallet] Message signing for ${identityId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown signing error';
      setError(errorMessage);
      console.error('[useQlockWallet] Error signing message:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign typed data (EIP-712)
   */
  const signTypedData = useCallback(async (
    identityId: string, 
    typedData: TypedData
  ): Promise<TypedDataSignatureResult | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await qlockWalletService.signTypedData(identityId, typedData);
      
      if (!result.success) {
        setError(result.error || 'Typed data signing failed');
      }
      
      // Update fallback mode status if it was used
      if (result.fallbackUsed) {
        setFallbackMode(true);
      }
      
      console.log(`[useQlockWallet] Typed data signing for ${identityId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown signing error';
      setError(errorMessage);
      console.error('[useQlockWallet] Error signing typed data:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []); 
 /**
   * Verify transaction signature
   */
  const verifyTransactionSignature = useCallback(async (
    transaction: WalletTransaction,
    signature: string,
    publicKey: string
  ): Promise<SignatureVerificationResult | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await qlockWalletService.verifyTransactionSignature(transaction, signature, publicKey);
      
      if (!result.valid && result.error) {
        setError(result.error);
      }
      
      console.log(`[useQlockWallet] Transaction signature verification: ${result.valid ? 'VALID' : 'INVALID'}`);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown verification error';
      setError(errorMessage);
      console.error('[useQlockWallet] Error verifying transaction signature:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verify message signature
   */
  const verifyMessageSignature = useCallback(async (
    message: string,
    signature: string,
    publicKey: string
  ): Promise<SignatureVerificationResult | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await qlockWalletService.verifyMessageSignature(message, signature, publicKey);
      
      if (!result.valid && result.error) {
        setError(result.error);
      }
      
      console.log(`[useQlockWallet] Message signature verification: ${result.valid ? 'VALID' : 'INVALID'}`);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown verification error';
      setError(errorMessage);
      console.error('[useQlockWallet] Error verifying message signature:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Validate signature integrity
   */
  const validateSignatureIntegrity = useCallback(async (
    identityId: string,
    signature: string
  ): Promise<boolean> => {
    try {
      setError(null);
      
      const isValid = await qlockWalletService.validateSignatureIntegrity(identityId, signature);
      
      if (!isValid) {
        setError('Signature integrity validation failed');
      }
      
      console.log(`[useQlockWallet] Signature integrity validation for ${identityId}: ${isValid ? 'PASSED' : 'FAILED'}`);
      return isValid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown validation error';
      setError(errorMessage);
      console.error('[useQlockWallet] Error validating signature integrity:', err);
      return false;
    }
  }, []);

  /**
   * Get signing keys for an identity
   */
  const getSigningKeys = useCallback(async (identityId: string): Promise<any> => {
    try {
      setError(null);
      
      const keys = await qlockWalletService.getSigningKeys(identityId);
      
      if (!keys) {
        setError(`No signing keys found for identity: ${identityId}`);
      }
      
      return keys;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown key retrieval error';
      setError(errorMessage);
      console.error('[useQlockWallet] Error getting signing keys:', err);
      return null;
    }
  }, []);

  /**
   * Rotate signing keys for an identity
   */
  const rotateSigningKeys = useCallback(async (identityId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await qlockWalletService.rotateSigningKeys(identityId);
      
      if (!success) {
        setError(`Failed to rotate signing keys for identity: ${identityId}`);
      }
      
      console.log(`[useQlockWallet] Key rotation for ${identityId}: ${success ? 'SUCCESS' : 'FAILED'}`);
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown key rotation error';
      setError(errorMessage);
      console.error('[useQlockWallet] Error rotating signing keys:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Validate key access for an identity
   */
  const validateKeyAccess = useCallback(async (identityId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const hasAccess = await qlockWalletService.validateKeyAccess(identityId);
      
      if (!hasAccess) {
        setError(`Key access validation failed for identity: ${identityId}`);
      }
      
      return hasAccess;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown access validation error';
      setError(errorMessage);
      console.error('[useQlockWallet] Error validating key access:', err);
      return false;
    }
  }, []);

  /**
   * Check service health
   */
  const checkServiceHealth = useCallback(async (): Promise<QlockHealthStatus | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const health = await qlockWalletService.checkServiceHealth();
      setServiceHealth(health);
      setIsQlockAvailable(health.available);
      
      if (!health.available) {
        setError(`Qlock service unavailable: ${health.lastError || 'Unknown error'}`);
      }
      
      console.log(`[useQlockWallet] Service health check: ${health.available ? 'HEALTHY' : 'UNHEALTHY'}`);
      return health;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown health check error';
      setError(errorMessage);
      console.error('[useQlockWallet] Error checking service health:', err);
      setIsQlockAvailable(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Enable fallback mode
   */
  const enableFallbackMode = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await qlockWalletService.enableFallbackMode();
      setFallbackMode(true);
      
      console.warn('[useQlockWallet] Fallback mode enabled');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown fallback mode error';
      setError(errorMessage);
      console.error('[useQlockWallet] Error enabling fallback mode:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Disable fallback mode
   */
  const disableFallbackMode = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await qlockWalletService.disableFallbackMode();
      setFallbackMode(false);
      
      console.log('[useQlockWallet] Fallback mode disabled');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown fallback mode error';
      setError(errorMessage);
      console.error('[useQlockWallet] Error disabling fallback mode:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Recover from service failure
   */
  const recoverFromFailure = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const recovered = await qlockWalletService.recoverFromFailure();
      
      if (recovered) {
        // Update service status after recovery
        const health = await qlockWalletService.checkServiceHealth();
        setServiceHealth(health);
        setIsQlockAvailable(health.available);
        setFallbackMode(false);
      } else {
        setError('Service recovery failed');
        setFallbackMode(true);
      }
      
      console.log(`[useQlockWallet] Service recovery: ${recovered ? 'SUCCESS' : 'FAILED'}`);
      return recovered;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown recovery error';
      setError(errorMessage);
      console.error('[useQlockWallet] Error recovering from failure:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refresh service status
   */
  const refreshServiceStatus = useCallback(async (): Promise<void> => {
    await checkServiceHealth();
  }, [checkServiceHealth]);

  return {
    // Current State
    isQlockAvailable,
    fallbackMode,
    serviceHealth,
    loading,
    error,
    
    // Transaction Signing
    signTransaction,
    signMessage,
    signTypedData,
    
    // Signature Verification
    verifyTransactionSignature,
    verifyMessageSignature,
    validateSignatureIntegrity,
    
    // Key Management
    getSigningKeys,
    rotateSigningKeys,
    validateKeyAccess,
    
    // Service Management
    checkServiceHealth,
    enableFallbackMode,
    disableFallbackMode,
    recoverFromFailure,
    
    // Utilities
    clearError,
    refreshServiceStatus
  };
};