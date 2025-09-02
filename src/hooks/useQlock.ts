/**
 * useQlock - React Hook for Qlock Encryption Management
 * 
 * Provides encryption, decryption, and key management functionality
 * for the AnarQ&Q ecosystem.
 */

import { useState, useCallback } from 'react';
import { useSessionContext } from '@/contexts/SessionContext';
import * as QlockAPI from '@/api/qlock';

export interface EncryptionResult {
  encryptedData: string;
  metadata: {
    algorithm: string;
    keySize: number;
    quantumResistant: boolean;
    timestamp: number;
  };
}

export interface DecryptionResult {
  success: boolean;
  data?: string;
  error?: string;
}

export interface SignatureResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export interface VerificationResult {
  success: boolean;
  valid?: boolean;
  error?: string;
}

export interface UseQlockReturn {
  // State
  loading: boolean;
  error: string | null;
  
  // Key Management
  generateKeys: (level?: string) => Promise<{ publicKey: string; privateKey: string } | null>;
  
  // Encryption/Decryption
  encrypt: (data: string, recipientPublicKey: string, level?: string) => Promise<EncryptionResult | null>;
  decrypt: (encryptedData: string, privateKey: string) => Promise<DecryptionResult>;
  
  // Signing/Verification
  sign: (data: string, privateKey: string, level?: string) => Promise<SignatureResult>;
  verify: (data: string, signature: string, publicKey: string) => Promise<VerificationResult>;
  
  // Utilities
  getAlgorithms: () => Promise<any[]>;
  clearError: () => void;
}

export const useQlock = (): UseQlockReturn => {
  const { session, isAuthenticated } = useSessionContext();
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateKeys = useCallback(async (level: string = 'QUANTUM'): Promise<{ publicKey: string; privateKey: string } | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const keys = await QlockAPI.generateKeys(level);
      
      console.log(`[Qlock] Generated ${level} key pair`);
      
      return keys;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate keys';
      setError(errorMessage);
      console.error('Qlock key generation error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const encrypt = useCallback(async (
    data: string, 
    recipientPublicKey: string, 
    level: string = 'QUANTUM'
  ): Promise<EncryptionResult | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await QlockAPI.encrypt(data, recipientPublicKey, level);
      
      console.log(`[Qlock] Encrypted data with ${level} encryption`);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to encrypt data';
      setError(errorMessage);
      console.error('Qlock encryption error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const decrypt = useCallback(async (
    encryptedData: string, 
    privateKey: string
  ): Promise<DecryptionResult> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await QlockAPI.decrypt(encryptedData, privateKey);
      
      if (result.success) {
        console.log('[Qlock] Successfully decrypted data');
      } else {
        console.warn('[Qlock] Decryption failed:', result.error);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decrypt data';
      setError(errorMessage);
      console.error('Qlock decryption error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const sign = useCallback(async (
    data: string, 
    privateKey: string, 
    level: string = 'QUANTUM'
  ): Promise<SignatureResult> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await QlockAPI.sign(data, privateKey, level);
      
      if (result.success) {
        console.log(`[Qlock] Signed data with ${level} signature`);
      } else {
        console.warn('[Qlock] Signing failed:', result.error);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign data';
      setError(errorMessage);
      console.error('Qlock signing error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const verify = useCallback(async (
    data: string, 
    signature: string, 
    publicKey: string
  ): Promise<VerificationResult> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await QlockAPI.verify(data, signature, publicKey);
      
      if (result.success) {
        console.log(`[Qlock] Signature verification: ${result.valid ? 'VALID' : 'INVALID'}`);
      } else {
        console.warn('[Qlock] Verification failed:', result.error);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify signature';
      setError(errorMessage);
      console.error('Qlock verification error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const getAlgorithms = useCallback(async (): Promise<any[]> => {
    try {
      setError(null);
      
      const response = await QlockAPI.getAlgorithms();
      
      return response.algorithms;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get algorithms';
      setError(errorMessage);
      console.error('Qlock algorithms error:', err);
      return [];
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,
    
    // Key Management
    generateKeys,
    
    // Encryption/Decryption
    encrypt,
    decrypt,
    
    // Signing/Verification
    sign,
    verify,
    
    // Utilities
    getAlgorithms,
    clearError
  };
};