/**
 * useQwallet - React Hook for Qwallet Integration
 * 
 * Provides wallet functionality including balance management, token transfers,
 * NFT operations, and transaction signing for the AnarQ&Q ecosystem.
 */

import { useState, useCallback, useEffect } from 'react';
import { useSessionContext } from '../contexts/SessionContext';

// TypeScript interfaces
export interface TokenInfo {
  symbol: string;
  decimals: number;
  contractAddress: string;
  network: string;
  type: string;
}

export interface Balance {
  balance: number;
  tokenInfo: TokenInfo;
}

export interface WalletBalances {
  QToken: Balance;
  PI: Balance;
}

export interface NFTAttribute {
  trait_type: string;
  value: string;
}

export interface NFT {
  tokenId: string;
  contractAddress: string;
  name: string;
  description: string;
  image: string;
  attributes: NFTAttribute[];
  contentCid?: string;
  mintedAt: string;
  status: string;
}

export interface Transaction {
  id: string;
  type: string;
  squidId?: string;
  fromSquidId?: string;
  toSquidId?: string;
  amount?: number;
  token?: string;
  tokenId?: string;
  timestamp: string;
  status: string;
  gasEstimate?: number;
}

export interface TransferFundsParams {
  toId: string;
  amount: number;
  token?: 'QToken' | 'PI';
}

export interface MintNFTParams {
  name: string;
  description: string;
  image?: string;
  attributes?: NFTAttribute[];
  contentCid?: string;
  contractType?: string;
}

export interface SignTransactionParams {
  action: string;
  payload: Record<string, any>;
  timestamp?: string;
}

export interface SignTransactionResponse {
  signature: string;
  transactionId: string;
  metadata: {
    squidId: string;
    action: string;
    walletAddress: string;
    timestamp: string;
    gasEstimate: number;
    nonce: string;
  };
}

export interface UseQwalletReturn {
  // State
  balances: WalletBalances | null;
  nfts: NFT[];
  transactions: Transaction[];
  walletAddress: string | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  getBalance: (squidId: string, token?: 'QToken' | 'PI') => Promise<Balance | null>;
  getAllBalances: (squidId: string) => Promise<WalletBalances | null>;
  transferFunds: (params: TransferFundsParams) => Promise<boolean>;
  mintNFT: (params: MintNFTParams) => Promise<NFT | null>;
  signTransaction: (params: SignTransactionParams) => Promise<SignTransactionResponse | null>;
  listUserNFTs: (squidId: string) => Promise<NFT[]>;
  getTransactionHistory: (squidId: string, limit?: number) => Promise<Transaction[]>;
  refreshWalletData: () => Promise<void>;
  
  // Utilities
  clearError: () => void;
}

const API_BASE = '/api/qwallet';

export const useQwallet = (): UseQwalletReturn => {
  const { session, isAuthenticated } = useSessionContext();
  
  // State
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to make API calls
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(session?.issuer && { 'X-Squid-ID': session.issuer }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }, [session?.issuer]);

  // Get balance for specific token
  const getBalance = useCallback(async (squidId: string, token: 'QToken' | 'PI' = 'QToken'): Promise<Balance | null> => {
    try {
      setError(null);
      const response = await apiCall(`/balance/${squidId}?token=${token}`);
      
      if (response.success) {
        return {
          balance: response.data.balance,
          tokenInfo: response.data.tokenInfo
        };
      }
      
      throw new Error(response.error || 'Failed to get balance');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get balance';
      setError(errorMessage);
      console.error('Get balance error:', err);
      return null;
    }
  }, [apiCall]);

  // Get all balances
  const getAllBalances = useCallback(async (squidId: string): Promise<WalletBalances | null> => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiCall(`/balances/${squidId}`);
      
      if (response.success) {
        const walletBalances: WalletBalances = {
          QToken: response.data.balances.QToken,
          PI: response.data.balances.PI
        };
        
        setBalances(walletBalances);
        setWalletAddress(response.data.walletAddress);
        return walletBalances;
      }
      
      throw new Error(response.error || 'Failed to get balances');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get balances';
      setError(errorMessage);
      console.error('Get all balances error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Get transaction history
  const getTransactionHistory = useCallback(async (squidId: string, limit: number = 20): Promise<Transaction[]> => {
    try {
      setError(null);
      
      const response = await apiCall(`/transactions/${squidId}?limit=${limit}`);
      
      if (response.success) {
        const userTransactions = response.data.transactions;
        setTransactions(userTransactions);
        return userTransactions;
      }
      
      throw new Error(response.error || 'Failed to get transaction history');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get transaction history';
      setError(errorMessage);
      console.error('Get transaction history error:', err);
      return [];
    }
  }, [apiCall]);

  // List user NFTs
  const listUserNFTs = useCallback(async (squidId: string): Promise<NFT[]> => {
    try {
      setError(null);
      
      const response = await apiCall(`/nfts/${squidId}`);
      
      if (response.success) {
        const userNFTs = response.data.nfts;
        setNfts(userNFTs);
        return userNFTs;
      }
      
      throw new Error(response.error || 'Failed to list NFTs');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to list NFTs';
      setError(errorMessage);
      console.error('List user NFTs error:', err);
      return [];
    }
  }, [apiCall]);

  // Transfer funds
  const transferFunds = useCallback(async (params: TransferFundsParams): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiCall('/transfer', {
        method: 'POST',
        body: JSON.stringify({
          toId: params.toId,
          amount: params.amount,
          token: params.token || 'QToken'
        })
      });
      
      if (response.success) {
        // Refresh balances after successful transfer
        if (session?.issuer) {
          await getAllBalances(session.issuer);
          await getTransactionHistory(session.issuer);
        }
        return true;
      }
      
      throw new Error(response.error || 'Transfer failed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transfer failed';
      setError(errorMessage);
      console.error('Transfer funds error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [apiCall, session?.issuer, getAllBalances, getTransactionHistory]);

  // Mint NFT
  const mintNFT = useCallback(async (params: MintNFTParams): Promise<NFT | null> => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiCall('/mint', {
        method: 'POST',
        body: JSON.stringify(params)
      });
      
      if (response.success) {
        const nft: NFT = {
          tokenId: response.data.tokenId,
          contractAddress: response.data.contractAddress,
          name: response.data.metadata.name,
          description: response.data.metadata.description,
          image: response.data.metadata.image,
          attributes: response.data.metadata.attributes,
          contentCid: params.contentCid,
          mintedAt: response.data.mintedAt,
          status: 'active'
        };
        
        // Refresh NFTs after successful minting
        if (session?.issuer) {
          await listUserNFTs(session.issuer);
          await getTransactionHistory(session.issuer);
        }
        
        return nft;
      }
      
      throw new Error(response.error || 'NFT minting failed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'NFT minting failed';
      setError(errorMessage);
      console.error('Mint NFT error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, session?.issuer, listUserNFTs, getTransactionHistory]);

  // Sign transaction
  const signTransaction = useCallback(async (params: SignTransactionParams): Promise<SignTransactionResponse | null> => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiCall('/sign', {
        method: 'POST',
        body: JSON.stringify(params)
      });
      
      if (response.success) {
        // Refresh transaction history after signing
        if (session?.issuer) {
          await getTransactionHistory(session.issuer);
        }
        
        return response.data;
      }
      
      throw new Error(response.error || 'Transaction signing failed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction signing failed';
      setError(errorMessage);
      console.error('Sign transaction error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, session?.issuer, getTransactionHistory]);

  // Refresh all wallet data
  const refreshWalletData = useCallback(async (): Promise<void> => {
    if (!session?.issuer) return;
    
    try {
      setLoading(true);
      await Promise.all([
        getAllBalances(session.issuer),
        listUserNFTs(session.issuer),
        getTransactionHistory(session.issuer)
      ]);
    } catch (err) {
      console.error('Refresh wallet data error:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.issuer, getAllBalances, listUserNFTs, getTransactionHistory]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load wallet data when session changes
  useEffect(() => {
    if (session?.issuer) {
      refreshWalletData();
    }
  }, [session?.issuer, refreshWalletData]);

  return {
    // State
    balances,
    nfts,
    transactions,
    walletAddress,
    loading,
    error,
    
    // Actions
    getBalance,
    getAllBalances,
    transferFunds,
    mintNFT,
    signTransaction,
    listUserNFTs,
    getTransactionHistory,
    refreshWalletData,
    
    // Utilities
    clearError
  };
};