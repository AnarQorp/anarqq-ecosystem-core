/**
 * Pi Wallet Operations Hook
 * Specialized hook for Pi Wallet integration with identity validation,
 * connection management, and transfer operations
 */

import { useState, useEffect, useCallback } from 'react';
import { ExtendedSquidIdentity } from '../types/identity';
import { PiWalletStatus, TransferResult } from '../types/wallet-config';
import { piWalletService } from '../services/identity/PiWalletService';

export interface PiWalletState {
  status: PiWalletStatus | null;
  isConnected: boolean;
  isLinking: boolean;
  isTransferring: boolean;
  lastError: string | null;
  connectionHistory: PiWalletConnectionEvent[];
}

export interface PiWalletConnectionEvent {
  timestamp: string;
  event: 'CONNECT' | 'DISCONNECT' | 'LINK' | 'UNLINK' | 'TRANSFER' | 'ERROR';
  success: boolean;
  details?: string;
}

export interface PiWalletCredentials {
  piUserId: string;
  accessToken: string;
  refreshToken?: string;
  permissions: string[];
}

export interface UsePiWalletOptions {
  autoConnect?: boolean;
  enableStatusPolling?: boolean;
  pollingInterval?: number;
}

export const usePiWallet = (
  identity: ExtendedSquidIdentity | null,
  options: UsePiWalletOptions = {}
) => {
  const {
    autoConnect = false,
    enableStatusPolling = true,
    pollingInterval = 60000 // 1 minute
  } = options;

  const [state, setState] = useState<PiWalletState>({
    status: null,
    isConnected: false,
    isLinking: false,
    isTransferring: false,
    lastError: null,
    connectionHistory: []
  });

  const identityId = identity?.did;

  // Add connection event to history
  const addConnectionEvent = useCallback((event: Omit<PiWalletConnectionEvent, 'timestamp'>) => {
    setState(prev => ({
      ...prev,
      connectionHistory: [
        {
          ...event,
          timestamp: new Date().toISOString()
        },
        ...prev.connectionHistory.slice(0, 49) // Keep last 50 events
      ]
    }));
  }, []);

  // Load Pi Wallet status
  const loadStatus = useCallback(async () => {
    if (!identityId) return;

    try {
      const status = await piWalletService.getPiWalletStatus(identityId);
      setState(prev => ({
        ...prev,
        status,
        isConnected: status?.connected || false,
        lastError: status?.connectionError || null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Failed to load Pi Wallet status'
      }));
    }
  }, [identityId]);

  // Connect to Pi Wallet
  const connect = useCallback(async (credentials: PiWalletCredentials): Promise<boolean> => {
    if (!identityId) {
      throw new Error('No identity selected');
    }

    setState(prev => ({ ...prev, isLinking: true, lastError: null }));

    try {
      const connection = await piWalletService.connectPiWallet(identityId, credentials);
      
      setState(prev => ({
        ...prev,
        isLinking: false,
        isConnected: true,
        status: {
          connected: true,
          balance: 0,
          lastSync: new Date().toISOString(),
          supportedOperations: credentials.permissions
        }
      }));

      addConnectionEvent({
        event: 'CONNECT',
        success: true,
        details: `Connected with user ID: ${credentials.piUserId}`
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      
      setState(prev => ({
        ...prev,
        isLinking: false,
        lastError: errorMessage
      }));

      addConnectionEvent({
        event: 'CONNECT',
        success: false,
        details: errorMessage
      });

      return false;
    }
  }, [identityId, addConnectionEvent]);

  // Disconnect from Pi Wallet
  const disconnect = useCallback(async (): Promise<boolean> => {
    if (!identityId) return false;

    try {
      const success = await piWalletService.disconnectPiWallet(identityId);
      
      if (success) {
        setState(prev => ({
          ...prev,
          status: null,
          isConnected: false,
          lastError: null
        }));

        addConnectionEvent({
          event: 'DISCONNECT',
          success: true
        });
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Disconnect failed';
      
      setState(prev => ({ ...prev, lastError: errorMessage }));
      
      addConnectionEvent({
        event: 'DISCONNECT',
        success: false,
        details: errorMessage
      });

      return false;
    }
  }, [identityId, addConnectionEvent]);

  // Link Pi Wallet (different from connect - this is for wallet linking)
  const linkWallet = useCallback(async (piWalletData: any): Promise<boolean> => {
    if (!identityId) {
      throw new Error('No identity selected');
    }

    setState(prev => ({ ...prev, isLinking: true, lastError: null }));

    try {
      const success = await piWalletService.linkPiWallet(identityId, piWalletData);
      
      setState(prev => ({ ...prev, isLinking: false }));

      addConnectionEvent({
        event: 'LINK',
        success,
        details: success ? 'Wallet linked successfully' : 'Wallet linking failed'
      });

      if (success) {
        await loadStatus(); // Refresh status after linking
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Linking failed';
      
      setState(prev => ({
        ...prev,
        isLinking: false,
        lastError: errorMessage
      }));

      addConnectionEvent({
        event: 'LINK',
        success: false,
        details: errorMessage
      });

      return false;
    }
  }, [identityId, addConnectionEvent, loadStatus]);

  // Unlink Pi Wallet
  const unlinkWallet = useCallback(async (): Promise<boolean> => {
    if (!identityId) return false;

    try {
      const success = await piWalletService.unlinkPiWallet(identityId);
      
      if (success) {
        setState(prev => ({
          ...prev,
          status: null,
          isConnected: false,
          lastError: null
        }));

        addConnectionEvent({
          event: 'UNLINK',
          success: true
        });
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unlink failed';
      
      setState(prev => ({ ...prev, lastError: errorMessage }));
      
      addConnectionEvent({
        event: 'UNLINK',
        success: false,
        details: errorMessage
      });

      return false;
    }
  }, [identityId, addConnectionEvent]);

  // Transfer to Pi Wallet
  const transferTo = useCallback(async (amount: number, token: string): Promise<TransferResult> => {
    if (!identityId) {
      throw new Error('No identity selected');
    }

    if (!state.isConnected) {
      throw new Error('Pi Wallet not connected');
    }

    setState(prev => ({ ...prev, isTransferring: true, lastError: null }));

    try {
      const result = await piWalletService.transferToPiWallet(identityId, amount, token);
      
      setState(prev => ({ ...prev, isTransferring: false }));

      addConnectionEvent({
        event: 'TRANSFER',
        success: result.success,
        details: `Transfer to Pi: ${amount} ${token} - ${result.success ? 'Success' : result.error}`
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transfer failed';
      
      setState(prev => ({
        ...prev,
        isTransferring: false,
        lastError: errorMessage
      }));

      addConnectionEvent({
        event: 'TRANSFER',
        success: false,
        details: `Transfer to Pi failed: ${errorMessage}`
      });

      throw error;
    }
  }, [identityId, state.isConnected, addConnectionEvent]);

  // Transfer from Pi Wallet
  const transferFrom = useCallback(async (amount: number, token: string): Promise<TransferResult> => {
    if (!identityId) {
      throw new Error('No identity selected');
    }

    if (!state.isConnected) {
      throw new Error('Pi Wallet not connected');
    }

    setState(prev => ({ ...prev, isTransferring: true, lastError: null }));

    try {
      const result = await piWalletService.transferFromPiWallet(identityId, amount, token);
      
      setState(prev => ({ ...prev, isTransferring: false }));

      addConnectionEvent({
        event: 'TRANSFER',
        success: result.success,
        details: `Transfer from Pi: ${amount} ${token} - ${result.success ? 'Success' : result.error}`
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transfer failed';
      
      setState(prev => ({
        ...prev,
        isTransferring: false,
        lastError: errorMessage
      }));

      addConnectionEvent({
        event: 'TRANSFER',
        success: false,
        details: `Transfer from Pi failed: ${errorMessage}`
      });

      throw error;
    }
  }, [identityId, state.isConnected, addConnectionEvent]);

  // Get Pi Wallet balance
  const getBalance = useCallback(async (): Promise<number> => {
    if (!identityId || !state.isConnected) {
      return 0;
    }

    try {
      const balance = await piWalletService.getPiWalletBalance(identityId);
      return balance?.available || 0;
    } catch (error) {
      console.error('Failed to get Pi Wallet balance:', error);
      return 0;
    }
  }, [identityId, state.isConnected]);

  // Validate transfer
  const validateTransfer = useCallback(async (amount: number, direction: 'TO_PI' | 'FROM_PI') => {
    if (!identityId) {
      throw new Error('No identity selected');
    }

    return await piWalletService.validateTransfer(identityId, amount, direction);
  }, [identityId]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, lastError: null }));
  }, []);

  // Check if identity can use Pi Wallet
  const canUsePiWallet = useCallback(() => {
    if (!identity) return false;
    
    // AID and CONSENTIDA identities cannot use Pi Wallet
    return identity.type !== 'AID' && identity.type !== 'CONSENTIDA';
  }, [identity]);

  // Auto-connect effect
  useEffect(() => {
    if (identityId && autoConnect && canUsePiWallet()) {
      loadStatus();
    }
  }, [identityId, autoConnect, canUsePiWallet, loadStatus]);

  // Status polling effect
  useEffect(() => {
    if (identityId && enableStatusPolling && state.isConnected) {
      const interval = setInterval(loadStatus, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [identityId, enableStatusPolling, state.isConnected, pollingInterval, loadStatus]);

  // Load initial status
  useEffect(() => {
    if (identityId && canUsePiWallet()) {
      loadStatus();
    }
  }, [identityId, canUsePiWallet, loadStatus]);

  return {
    // State
    ...state,
    canUsePiWallet: canUsePiWallet(),
    
    // Actions
    connect,
    disconnect,
    linkWallet,
    unlinkWallet,
    transferTo,
    transferFrom,
    getBalance,
    validateTransfer,
    refreshStatus: loadStatus,
    clearError,
    
    // Computed values
    hasRecentActivity: state.connectionHistory.length > 0,
    lastActivity: state.connectionHistory[0]?.timestamp || null,
    successfulConnections: state.connectionHistory.filter(e => e.event === 'CONNECT' && e.success).length,
    failedConnections: state.connectionHistory.filter(e => e.event === 'CONNECT' && !e.success).length,
    totalTransfers: state.connectionHistory.filter(e => e.event === 'TRANSFER').length,
    
    // Status checks
    isReady: state.isConnected && !state.isLinking && !state.isTransferring,
    hasError: !!state.lastError,
    isOperating: state.isLinking || state.isTransferring
  };
};