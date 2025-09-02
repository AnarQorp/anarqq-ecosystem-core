import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
// Using relative paths to avoid module resolution issues
import { useIdentity } from '../lib/squid-identity';
import { getTokenBalance } from '../../libs/qwallet/core/wallet';
import { signTransaction, SignTransactionOptions } from '../../libs/qwallet/core/signer';
import type { TokenBalance, Identity, SignedTransaction } from '../../libs/qwallet/core/types';
import { identityQwalletService, IdentityBalances } from '../services/identity/IdentityQwalletService';
import { ExtendedSquidIdentity } from '../types/identity';

interface WalletContextType {
  balances: TokenBalance[];
  identityBalances: IdentityBalances | null;
  walletAddress: string | null;
  activeWalletContext: string | null;
  sign: <T>(payload: T, options?: SignTransactionOptions) => Promise<SignedTransaction<T>>;
  refreshBalances: () => Promise<void>;
  switchWalletContext: (identityId: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { identity } = useIdentity();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [identityBalances, setIdentityBalances] = useState<IdentityBalances | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [activeWalletContext, setActiveWalletContext] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load active wallet context on mount
  useEffect(() => {
    const loadActiveContext = async () => {
      try {
        const context = await identityQwalletService.getActiveWalletContext();
        setActiveWalletContext(context);
      } catch (err) {
        console.error('Failed to load active wallet context:', err);
      }
    };
    
    loadActiveContext();
  }, []);

  const loadBalances = useCallback(async () => {
    if (!identity) {
      setBalances([]);
      setIdentityBalances(null);
      setWalletAddress(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Load traditional balances for backward compatibility
      const tokenBalances = await getTokenBalance(identity);
      setBalances(tokenBalances);

      // Load identity-specific balances using the new service
      const identityId = (identity as ExtendedSquidIdentity).did || identity.id;
      const idBalances = await identityQwalletService.getBalancesForIdentity(identityId);
      setIdentityBalances(idBalances);

      // Get wallet address for the current identity
      const address = await identityQwalletService.getWalletAddressForIdentity(identityId);
      setWalletAddress(address);

    } catch (err) {
      console.error('Failed to load token balances:', err);
      setError('Failed to load token balances');
      setBalances([]);
      setIdentityBalances(null);
      setWalletAddress(null);
    } finally {
      setIsLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  // Switch wallet context to a different identity
  const switchWalletContext = useCallback(async (identityId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const currentContext = activeWalletContext || 'none';
      const success = await identityQwalletService.switchWalletContext(currentContext, identityId);
      
      if (success) {
        setActiveWalletContext(identityId);
        
        // Reload balances for the new context
        const idBalances = await identityQwalletService.getBalancesForIdentity(identityId);
        setIdentityBalances(idBalances);

        // Get wallet address for the new identity
        const address = await identityQwalletService.getWalletAddressForIdentity(identityId);
        setWalletAddress(address);

        console.log(`[WalletProvider] Successfully switched wallet context to: ${identityId}`);
      } else {
        setError('Failed to switch wallet context');
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch wallet context';
      setError(errorMessage);
      console.error('[WalletProvider] Error switching wallet context:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [activeWalletContext]);

  // Sign a transaction with identity-aware signing
  const sign = useCallback(async <T,>(
    payload: T,
    options?: SignTransactionOptions
  ): Promise<SignedTransaction<T>> => {
    if (!identity) {
      throw new Error('No identity available');
    }

    try {
      const identityId = (identity as ExtendedSquidIdentity).did || identity.id;
      
      // Use identity-specific signing if available
      const signResult = await identityQwalletService.signTransactionForIdentity(identityId, payload);
      
      if (!signResult.success) {
        throw new Error(signResult.error || 'Transaction signing failed');
      }

      // Return in the expected format
      return {
        signature: signResult.signature,
        payload,
        metadata: {
          identityId,
          timestamp: signResult.timestamp,
          transactionHash: signResult.transactionHash
        }
      } as SignedTransaction<T>;

    } catch (err) {
      console.error('[WalletProvider] Error signing transaction:', err);
      
      // Fallback to traditional signing
      return signTransaction(identity, payload, options);
    }
  }, [identity]);

  const value = {
    balances,
    identityBalances,
    walletAddress,
    activeWalletContext,
    sign,
    refreshBalances: loadBalances,
    switchWalletContext,
    isLoading,
    error,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

// Export the context for advanced use cases
export { WalletContext };
