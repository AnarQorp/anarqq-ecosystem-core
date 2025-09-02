/**
 * useIdentityQlock - React Hook for Identity-specific Qlock Management
 * 
 * Provides per-identity encryption key management and automatic key switching
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  identityQlockService, 
  IdentityQlockServiceInterface,
  EncryptionResult,
  DecryptionResult,
  SignatureResult,
  VerificationResult 
} from '@/services/identity/IdentityQlockService';
import { 
  ExtendedSquidIdentity, 
  KeyPair 
} from '@/types/identity';

export interface UseIdentityQlockReturn {
  // Current State
  activeEncryptionContext: string | null;
  loading: boolean;
  error: string | null;
  
  // Key Management
  generateKeys: (identity: ExtendedSquidIdentity) => Promise<KeyPair | null>;
  getKeys: (identityId: string) => Promise<KeyPair | null>;
  updateKeys: (identityId: string, keyPair: KeyPair) => Promise<boolean>;
  deleteKeys: (identityId: string) => Promise<boolean>;
  rotateKeys: (identityId: string) => Promise<boolean>;
  
  // Encryption/Decryption
  encrypt: (identityId: string, data: string, recipientPublicKey?: string) => Promise<EncryptionResult | null>;
  decrypt: (identityId: string, encryptedData: string) => Promise<DecryptionResult>;
  
  // Context Switching
  switchEncryptionContext: (toIdentityId: string) => Promise<boolean>;
  setActiveContext: (identityId: string) => Promise<boolean>;
  
  // Key Derivation
  deriveKeyFromDID: (did: string, algorithm?: string) => Promise<string | null>;
  deriveKeyPairFromIdentity: (identity: ExtendedSquidIdentity) => Promise<KeyPair | null>;
  
  // Signing/Verification
  sign: (identityId: string, data: string) => Promise<SignatureResult>;
  verify: (identityId: string, data: string, signature: string, publicKey: string) => Promise<VerificationResult>;
  
  // Key Isolation
  isolateKeys: (identityId: string) => Promise<boolean>;
  validateKeyIsolation: (identityId: string) => Promise<boolean>;
  
  // Bulk Operations
  generateKeysForAll: (identities: ExtendedSquidIdentity[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  
  // Utilities
  clearError: () => void;
  refreshContext: () => Promise<void>;
}

export const useIdentityQlock = (initialIdentityId?: string): UseIdentityQlockReturn => {
  // State
  const [activeEncryptionContext, setActiveEncryptionContext] = useState<string | null>(initialIdentityId || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active context on mount
  useEffect(() => {
    loadActiveContext();
  }, []);

  // Update context when initial identity changes
  useEffect(() => {
    if (initialIdentityId && initialIdentityId !== activeEncryptionContext) {
      setActiveContext(initialIdentityId);
    }
  }, [initialIdentityId]);

  const loadActiveContext = useCallback(async () => {
    try {
      const context = await identityQlockService.getActiveEncryptionContext();
      setActiveEncryptionContext(context);
    } catch (err) {
      console.error('[useIdentityQlock] Error loading active context:', err);
    }
  }, []);

  const generateKeys = useCallback(async (identity: ExtendedSquidIdentity): Promise<KeyPair | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const keyPair = await identityQlockService.generateKeysForIdentity(identity);
      
      console.log(`[useIdentityQlock] Generated keys for identity: ${identity.did}`);
      return keyPair;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate keys';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error generating keys:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getKeys = useCallback(async (identityId: string): Promise<KeyPair | null> => {
    try {
      setError(null);
      
      const keyPair = await identityQlockService.getKeysForIdentity(identityId);
      
      if (!keyPair) {
        console.warn(`[useIdentityQlock] No keys found for identity: ${identityId}`);
      }
      
      return keyPair;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get keys';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error getting keys:', err);
      return null;
    }
  }, []);

  const updateKeys = useCallback(async (identityId: string, keyPair: KeyPair): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await identityQlockService.updateKeysForIdentity(identityId, keyPair);
      
      if (!success) {
        setError('Failed to update keys');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update keys';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error updating keys:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteKeys = useCallback(async (identityId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await identityQlockService.deleteKeysForIdentity(identityId);
      
      if (success && activeEncryptionContext === identityId) {
        setActiveEncryptionContext(null);
      }
      
      if (!success) {
        setError('Failed to delete keys');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete keys';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error deleting keys:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeEncryptionContext]);

  const rotateKeys = useCallback(async (identityId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await identityQlockService.rotateKeysForIdentity(identityId);
      
      if (!success) {
        setError('Failed to rotate keys');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rotate keys';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error rotating keys:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const encrypt = useCallback(async (identityId: string, data: string, recipientPublicKey?: string): Promise<EncryptionResult | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await identityQlockService.encryptForIdentity(identityId, data, recipientPublicKey);
      
      if (!result) {
        setError('Failed to encrypt data');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to encrypt data';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error encrypting data:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const decrypt = useCallback(async (identityId: string, encryptedData: string): Promise<DecryptionResult> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await identityQlockService.decryptForIdentity(identityId, encryptedData);
      
      if (!result.success) {
        setError(result.error || 'Failed to decrypt data');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decrypt data';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error decrypting data:', err);
      return {
        success: false,
        error: errorMessage,
        identityId
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const switchEncryptionContext = useCallback(async (toIdentityId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const fromIdentityId = activeEncryptionContext || 'none';
      const success = await identityQlockService.switchEncryptionContext(fromIdentityId, toIdentityId);
      
      if (success) {
        setActiveEncryptionContext(toIdentityId);
      } else {
        setError('Failed to switch encryption context');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch encryption context';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error switching context:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeEncryptionContext]);

  const setActiveContext = useCallback(async (identityId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const success = await identityQlockService.setActiveEncryptionContext(identityId);
      
      if (success) {
        setActiveEncryptionContext(identityId);
      } else {
        setError('Failed to set active encryption context');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set active context';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error setting active context:', err);
      return false;
    }
  }, []);

  const deriveKeyFromDID = useCallback(async (did: string, algorithm?: string): Promise<string | null> => {
    try {
      setError(null);
      
      const key = await identityQlockService.deriveKeyFromDID(did, algorithm);
      
      return key;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to derive key from DID';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error deriving key from DID:', err);
      return null;
    }
  }, []);

  const deriveKeyPairFromIdentity = useCallback(async (identity: ExtendedSquidIdentity): Promise<KeyPair | null> => {
    try {
      setError(null);
      
      const keyPair = await identityQlockService.deriveKeyPairFromIdentity(identity);
      
      return keyPair;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to derive key pair from identity';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error deriving key pair:', err);
      return null;
    }
  }, []);

  const sign = useCallback(async (identityId: string, data: string): Promise<SignatureResult> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await identityQlockService.signForIdentity(identityId, data);
      
      if (!result.success) {
        setError(result.error || 'Failed to sign data');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign data';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error signing data:', err);
      return {
        success: false,
        error: errorMessage,
        identityId
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const verify = useCallback(async (identityId: string, data: string, signature: string, publicKey: string): Promise<VerificationResult> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await identityQlockService.verifyForIdentity(identityId, data, signature, publicKey);
      
      if (!result.success) {
        setError(result.error || 'Failed to verify signature');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify signature';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error verifying signature:', err);
      return {
        success: false,
        error: errorMessage,
        identityId
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const isolateKeys = useCallback(async (identityId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const success = await identityQlockService.isolateKeys(identityId);
      
      if (!success) {
        setError('Failed to isolate keys');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to isolate keys';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error isolating keys:', err);
      return false;
    }
  }, []);

  const validateKeyIsolation = useCallback(async (identityId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const isValid = await identityQlockService.validateKeyIsolation(identityId);
      
      if (!isValid) {
        setError('Key isolation validation failed');
      }
      
      return isValid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate key isolation';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error validating key isolation:', err);
      return false;
    }
  }, []);

  const generateKeysForAll = useCallback(async (identities: ExtendedSquidIdentity[]): Promise<{ success: number; failed: number; errors: string[] }> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await identityQlockService.generateKeysForAllIdentities(identities);
      
      if (result.errors.length > 0) {
        setError(`Bulk key generation completed with ${result.failed} errors`);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate keys for all identities';
      setError(errorMessage);
      console.error('[useIdentityQlock] Error generating keys for all:', err);
      return { success: 0, failed: identities.length, errors: [errorMessage] };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshContext = useCallback(async (): Promise<void> => {
    await loadActiveContext();
  }, [loadActiveContext]);

  return {
    // Current State
    activeEncryptionContext,
    loading,
    error,
    
    // Key Management
    generateKeys,
    getKeys,
    updateKeys,
    deleteKeys,
    rotateKeys,
    
    // Encryption/Decryption
    encrypt,
    decrypt,
    
    // Context Switching
    switchEncryptionContext,
    setActiveContext,
    
    // Key Derivation
    deriveKeyFromDID,
    deriveKeyPairFromIdentity,
    
    // Signing/Verification
    sign,
    verify,
    
    // Key Isolation
    isolateKeys,
    validateKeyIsolation,
    
    // Bulk Operations
    generateKeysForAll,
    
    // Utilities
    clearError,
    refreshContext
  };
};