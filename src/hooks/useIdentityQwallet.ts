/**
 * Enhanced Identity Qwallet Hook
 * Provides comprehensive wallet functionality with identity-aware features,
 * Pi Wallet integration, risk assessment, and audit logging
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ExtendedSquidIdentity } from '../types/identity';
import { 
  IdentityBalances, 
  WalletPermissions, 
  TransferResult, 
  RiskAssessment,
  PiWalletStatus,
  WalletAuditLog,
  IdentityWalletConfig
} from '../types/wallet-config';
import { PerformanceMonitor } from '../utils/performance/PerformanceMonitor';
import { WalletCache } from '../utils/performance/WalletCache';

// Enhanced wallet state interface
export interface QwalletState {
  // Core wallet data
  balances: IdentityBalances | null;
  permissions: WalletPermissions | null;
  config: IdentityWalletConfig | null;
  
  // Pi Wallet integration
  piWalletStatus: PiWalletStatus | null;
  piWalletConnected: boolean;
  
  // Risk and audit
  riskAssessment: RiskAssessment | null;
  auditEvents: WalletAuditLog[];
  
  // State management
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  
  // Transaction state
  pendingTransactions: TransferResult[];
  transactionHistory: TransferResult[];
}

export interface QwalletActions {
  // Core wallet operations
  refreshWalletData: () => Promise<void>;
  transferTokens: (transferData: any) => Promise<TransferResult>;
  switchWalletContext: (identityId: string) => Promise<boolean>;
  
  // Pi Wallet operations
  connectPiWallet: (credentials: any) => Promise<boolean>;
  disconnectPiWallet: () => Promise<boolean>;
  transferToPiWallet: (amount: number, token: string) => Promise<TransferResult>;
  transferFromPiWallet: (amount: number, token: string) => Promise<TransferResult>;
  
  // Configuration
  updateWalletConfig: (config: Partial<IdentityWalletConfig>) => Promise<boolean>;
  updatePermissions: (permissions: Partial<WalletPermissions>) => Promise<boolean>;
  
  // Risk and audit
  assessRisk: (operation?: any) => Promise<RiskAssessment>;
  getAuditEvents: (filters?: any) => Promise<WalletAuditLog[]>;
  
  // Utility
  clearError: () => void;
  resetState: () => void;
}

export interface UseIdentityQwalletOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enablePiWallet?: boolean;
  enableRiskAssessment?: boolean;
  enableAuditLogging?: boolean;
}

export const useIdentityQwallet = (
  identity: ExtendedSquidIdentity | null,
  options: UseIdentityQwalletOptions = {}
) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enablePiWallet = true,
    enableRiskAssessment = true,
    enableAuditLogging = true
  } = options;

  // State management
  const [state, setState] = useState<QwalletState>({
    balances: null,
    permissions: null,
    config: null,
    piWalletStatus: null,
    piWalletConnected: false,
    riskAssessment: null,
    auditEvents: [],
    loading: false,
    error: null,
    lastUpdated: null,
    pendingTransactions: [],
    transactionHistory: []
  });

  // Memoized identity ID
  const identityId = useMemo(() => identity?.did || null, [identity?.did]);

  // Load wallet data with performance monitoring and caching
  const refreshWalletData = useCallback(async () => {
    if (!identityId) return;

    // Check cache first
    const cachedBalances = WalletCache.getBalances(identityId);
    const cachedPermissions = WalletCache.getPermissions(identityId);
    const cachedRiskAssessment = WalletCache.getRiskAssessment(identityId);
    const cachedPiWalletStatus = WalletCache.getPiWalletStatus(identityId);

    // If we have all cached data, use it
    if (cachedBalances && cachedPermissions) {
      setState(prev => ({
        ...prev,
        balances: cachedBalances,
        permissions: cachedPermissions,
        riskAssessment: cachedRiskAssessment,
        piWalletStatus: cachedPiWalletStatus,
        piWalletConnected: cachedPiWalletStatus?.connected || false,
        loading: false,
        lastUpdated: cachedBalances.lastUpdated
      }));
      return;
    }

    // Track performance for wallet data loading
    const metricId = PerformanceMonitor.startMetric(
      'wallet_balance_load',
      'WALLET_OPERATION',
      { identityId, identityType: identity?.type },
      ['wallet', 'balance', 'load']
    );

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Mock data loading - in real implementation, these would call actual services
      await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 200)); // 200-1000ms

      const mockBalances: IdentityBalances = {
        identityId,
        walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
        balances: [
          {
            token: 'ETH',
            symbol: 'ETH',
            balance: Math.random() * 10 * Math.pow(10, 18),
            decimals: 18,
            valueUSD: Math.random() * 20000
          },
          {
            token: 'QToken',
            symbol: 'QTK',
            balance: Math.random() * 1000 * Math.pow(10, 18),
            decimals: 18,
            valueUSD: Math.random() * 5000
          }
        ],
        totalValueUSD: 0,
        lastUpdated: new Date().toISOString()
      };
      mockBalances.totalValueUSD = mockBalances.balances.reduce((sum, token) => sum + token.valueUSD, 0);

      const mockPermissions: WalletPermissions = {
        canTransfer: true,
        canReceive: true,
        canMintNFT: identity?.type !== 'AID',
        canSignTransactions: true,
        canAccessDeFi: identity?.type === 'ROOT' || identity?.type === 'DAO',
        canCreateDAO: identity?.type === 'ROOT',
        maxTransactionAmount: identity?.type === 'ROOT' ? 100000 : 10000,
        allowedTokens: ['ETH', 'QToken'],
        restrictedOperations: [],
        governanceLevel: identity?.type === 'ROOT' ? 'FULL' : 'LIMITED',
        requiresApproval: false,
        approvalThreshold: 1000
      };

      const mockPiWalletStatus: PiWalletStatus | null = enablePiWallet ? {
        connected: Math.random() > 0.5,
        balance: Math.random() * 1000,
        lastSync: new Date().toISOString(),
        supportedOperations: ['transfer', 'balance']
      } : null;

      const mockRiskAssessment: RiskAssessment | null = enableRiskAssessment ? {
        identityId,
        overallRisk: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as any,
        riskFactors: [],
        recommendations: ['Enable 2FA', 'Review transaction limits'],
        lastAssessment: new Date().toISOString(),
        nextAssessment: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        autoActions: [],
        reputationScore: Math.floor(Math.random() * 1000),
        reputationTier: ['TRUSTED', 'NEUTRAL', 'RESTRICTED'][Math.floor(Math.random() * 3)] as any
      } : null;

      // Cache the loaded data
      WalletCache.setBalances(identityId, mockBalances);
      WalletCache.setPermissions(identityId, mockPermissions);
      if (mockRiskAssessment) {
        WalletCache.setRiskAssessment(identityId, mockRiskAssessment);
      }
      if (mockPiWalletStatus) {
        WalletCache.setPiWalletStatus(identityId, mockPiWalletStatus);
      }

      setState(prev => ({
        ...prev,
        balances: mockBalances,
        permissions: mockPermissions,
        piWalletStatus: mockPiWalletStatus,
        piWalletConnected: mockPiWalletStatus?.connected || false,
        riskAssessment: mockRiskAssessment,
        loading: false,
        lastUpdated: new Date().toISOString()
      }));

      // End performance tracking
      PerformanceMonitor.endMetric(metricId, true);

    } catch (error) {
      // End performance tracking with error
      PerformanceMonitor.endMetric(metricId, false, error instanceof Error ? error.message : 'Unknown error');
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load wallet data'
      }));
    }
  }, [identityId, enablePiWallet, enableRiskAssessment, identity?.type]);

  // Transfer tokens with enhanced ecosystem integration and performance monitoring
  const transferTokens = useCallback(async (transferData: any): Promise<TransferResult> => {
    if (!identityId) {
      throw new Error('No identity selected');
    }

    // Track token transfer performance
    const metricId = PerformanceMonitor.startMetric(
      'token_transfer',
      'WALLET_OPERATION',
      { 
        identityId, 
        identityType: identity?.type,
        amount: transferData.amount,
        token: transferData.token,
        recipient: transferData.recipient
      },
      ['wallet', 'transfer', 'token']
    );

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Enhanced transfer with ecosystem integration
      const transferOptions = {
        identityType: identity?.type || 'ROOT',
        sessionId: `session_${Date.now()}`,
        deviceFingerprint: navigator.userAgent ? btoa(navigator.userAgent).substring(0, 32) : null,
        ipAddress: '127.0.0.1', // In real implementation, would get actual IP
        userAgent: navigator.userAgent,
        riskScore: Math.random() * 0.5 // Mock risk score
      };

      // Call enhanced Qwallet service with ecosystem integration
      const response = await fetch('/api/qwallet/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromId: identityId,
          toId: transferData.recipient,
          amount: transferData.amount,
          token: transferData.token,
          options: transferOptions
        })
      });

      const transferResult = await response.json();

      const result: TransferResult = {
        success: transferResult.success,
        amount: transferData.amount,
        token: transferData.token,
        fromAddress: identityId,
        toAddress: transferData.recipient,
        timestamp: transferResult.timestamp || new Date().toISOString(),
        transactionHash: transferResult.transactionId || `0x${Math.random().toString(16).substring(2, 66)}`,
        fees: transferData.amount * 0.001,
        error: transferResult.error,
        // Enhanced fields from ecosystem integration
        riskScore: transferOptions.riskScore,
        identityType: transferOptions.identityType,
        sessionId: transferOptions.sessionId
      };

      // Log to audit system if enabled
      if (enableAuditLogging && result.success) {
        try {
          await fetch('/api/qerberos/log', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'wallet_transfer_frontend',
              squidId: identityId,
              resourceId: result.transactionHash,
              operationType: 'WALLET',
              identityType: transferOptions.identityType,
              transactionAmount: transferData.amount,
              transactionToken: transferData.token,
              riskScore: transferOptions.riskScore,
              sessionId: transferOptions.sessionId,
              metadata: {
                frontend: true,
                component: 'useIdentityQwallet',
                recipient: transferData.recipient
              }
            })
          });
        } catch (auditError) {
          console.warn('Failed to log transfer to audit system:', auditError);
        }
      }

      // Update pending transactions
      setState(prev => ({
        ...prev,
        pendingTransactions: [...prev.pendingTransactions, result],
        loading: false
      }));

      // Move to history after delay
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          pendingTransactions: prev.pendingTransactions.filter(tx => tx !== result),
          transactionHistory: [result, ...prev.transactionHistory.slice(0, 49)] // Keep last 50
        }));
      }, 5000);

      // End performance tracking
      PerformanceMonitor.endMetric(metricId, true);

      return result;

    } catch (error) {
      // End performance tracking with error
      PerformanceMonitor.endMetric(metricId, false, error instanceof Error ? error.message : 'Unknown error');
      
      setState(prev => ({ ...prev, loading: false }));
      
      // Log error to audit system
      if (enableAuditLogging) {
        try {
          await fetch('/api/qerberos/log', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'wallet_transfer_frontend_error',
              squidId: identityId,
              operationType: 'WALLET',
              identityType: identity?.type || 'ROOT',
              transactionAmount: transferData.amount,
              transactionToken: transferData.token,
              metadata: {
                error: error instanceof Error ? error.message : 'Unknown error',
                frontend: true,
                component: 'useIdentityQwallet',
                recipient: transferData.recipient
              }
            })
          });
        } catch (auditError) {
          console.warn('Failed to log transfer error to audit system:', auditError);
        }
      }
      
      throw error;
    }
  }, [identityId, identity?.type, enableAuditLogging]);

  // Switch wallet context with performance optimization
  const switchWalletContext = useCallback(async (newIdentityId: string): Promise<boolean> => {
    // Track identity switching performance
    const metricId = PerformanceMonitor.startMetric(
      'identity_switch',
      'IDENTITY_SWITCH',
      { fromIdentity: identityId, toIdentity: newIdentityId },
      ['identity', 'switch', 'wallet']
    );

    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Invalidate cache for current identity
      if (identityId) {
        WalletCache.invalidateIdentity(identityId);
      }
      
      // Preload data for new identity in parallel
      const preloadPromise = WalletCache.preloadIdentityData(newIdentityId, ['balances', 'permissions', 'risk']);
      
      // Mock context switching
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 200)), // 200-500ms
        preloadPromise
      ]);
      
      // Reset state for new identity
      setState({
        balances: null,
        permissions: null,
        config: null,
        piWalletStatus: null,
        piWalletConnected: false,
        riskAssessment: null,
        auditEvents: [],
        loading: false,
        error: null,
        lastUpdated: null,
        pendingTransactions: [],
        transactionHistory: []
      });

      // End performance tracking
      PerformanceMonitor.endMetric(metricId, true);
      return true;
    } catch (error) {
      // End performance tracking with error
      PerformanceMonitor.endMetric(metricId, false, error instanceof Error ? error.message : 'Unknown error');
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Context switch failed' 
      }));
      return false;
    }
  }, [identityId]);

  // Pi Wallet operations
  const connectPiWallet = useCallback(async (credentials: any): Promise<boolean> => {
    if (!enablePiWallet) return false;

    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Mock Pi Wallet connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const connected = Math.random() > 0.2; // 80% success rate
      
      setState(prev => ({
        ...prev,
        piWalletStatus: {
          connected,
          balance: connected ? Math.random() * 1000 : 0,
          lastSync: new Date().toISOString(),
          supportedOperations: ['transfer', 'balance'],
          connectionError: connected ? undefined : 'Failed to connect to Pi Network'
        },
        piWalletConnected: connected,
        loading: false
      }));

      return connected;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false,
        error: error instanceof Error ? error.message : 'Pi Wallet connection failed'
      }));
      return false;
    }
  }, [enablePiWallet]);

  const disconnectPiWallet = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({
        ...prev,
        piWalletStatus: null,
        piWalletConnected: false
      }));
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const transferToPiWallet = useCallback(async (amount: number, token: string): Promise<TransferResult> => {
    if (!state.piWalletConnected) {
      throw new Error('Pi Wallet not connected');
    }

    // Mock transfer to Pi Wallet
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: Math.random() > 0.1,
      amount,
      token,
      fromAddress: identityId || '',
      toAddress: 'pi_wallet',
      timestamp: new Date().toISOString(),
      transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      fees: amount * 0.01
    };
  }, [state.piWalletConnected, identityId]);

  const transferFromPiWallet = useCallback(async (amount: number, token: string): Promise<TransferResult> => {
    if (!state.piWalletConnected) {
      throw new Error('Pi Wallet not connected');
    }

    // Mock transfer from Pi Wallet
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: Math.random() > 0.1,
      amount,
      token,
      fromAddress: 'pi_wallet',
      toAddress: identityId || '',
      timestamp: new Date().toISOString(),
      transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      fees: amount * 0.015
    };
  }, [state.piWalletConnected, identityId]);

  // Configuration updates
  const updateWalletConfig = useCallback(async (config: Partial<IdentityWalletConfig>): Promise<boolean> => {
    try {
      // Mock config update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setState(prev => ({
        ...prev,
        config: prev.config ? { ...prev.config, ...config } : null
      }));
      
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const updatePermissions = useCallback(async (permissions: Partial<WalletPermissions>): Promise<boolean> => {
    try {
      // Mock permissions update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setState(prev => ({
        ...prev,
        permissions: prev.permissions ? { ...prev.permissions, ...permissions } : null
      }));
      
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  // Risk assessment
  const assessRisk = useCallback(async (operation?: any): Promise<RiskAssessment> => {
    if (!enableRiskAssessment || !identityId) {
      throw new Error('Risk assessment not available');
    }

    // Mock risk assessment
    await new Promise(resolve => setTimeout(resolve, 300));

    const assessment: RiskAssessment = {
      identityId,
      overallRisk: operation?.amount > 1000 ? 'HIGH' : 'LOW',
      riskFactors: operation?.amount > 1000 ? [{
        type: 'AMOUNT',
        severity: 'HIGH',
        description: 'Large transaction amount',
        value: operation.amount,
        threshold: 1000,
        firstDetected: new Date().toISOString(),
        lastDetected: new Date().toISOString()
      }] : [],
      recommendations: operation?.amount > 1000 ? ['Consider splitting into smaller transactions'] : [],
      lastAssessment: new Date().toISOString(),
      nextAssessment: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      autoActions: []
    };

    setState(prev => ({ ...prev, riskAssessment: assessment }));
    return assessment;
  }, [enableRiskAssessment, identityId]);

  // Audit events
  const getAuditEvents = useCallback(async (filters?: any): Promise<WalletAuditLog[]> => {
    if (!enableAuditLogging) return [];

    // Mock audit events
    const events: WalletAuditLog[] = Array.from({ length: 5 }, (_, i) => ({
      id: `audit-${i}`,
      identityId: identityId || '',
      operation: ['TRANSFER', 'CONFIG_CHANGE', 'PI_WALLET_CONNECT'][Math.floor(Math.random() * 3)],
      operationType: 'TRANSFER',
      timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      success: Math.random() > 0.1,
      riskScore: Math.random(),
      metadata: {
        sessionId: `session-${i}`,
        amount: Math.random() * 1000
      }
    }));

    setState(prev => ({ ...prev, auditEvents: events }));
    return events;
  }, [enableAuditLogging, identityId]);

  // Utility functions
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const resetState = useCallback(() => {
    setState({
      balances: null,
      permissions: null,
      config: null,
      piWalletStatus: null,
      piWalletConnected: false,
      riskAssessment: null,
      auditEvents: [],
      loading: false,
      error: null,
      lastUpdated: null,
      pendingTransactions: [],
      transactionHistory: []
    });
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (identityId && autoRefresh) {
      refreshWalletData();
      
      const interval = setInterval(refreshWalletData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [identityId, autoRefresh, refreshInterval, refreshWalletData]);

  // Actions object
  const actions: QwalletActions = useMemo(() => ({
    refreshWalletData,
    transferTokens,
    switchWalletContext,
    connectPiWallet,
    disconnectPiWallet,
    transferToPiWallet,
    transferFromPiWallet,
    updateWalletConfig,
    updatePermissions,
    assessRisk,
    getAuditEvents,
    clearError,
    resetState
  }), [
    refreshWalletData,
    transferTokens,
    switchWalletContext,
    connectPiWallet,
    disconnectPiWallet,
    transferToPiWallet,
    transferFromPiWallet,
    updateWalletConfig,
    updatePermissions,
    assessRisk,
    getAuditEvents,
    clearError,
    resetState
  ]);

  return {
    ...state,
    actions,
    isReady: !!identityId && !state.loading && !!state.balances,
    hasError: !!state.error,
    isEmpty: !state.balances || state.balances.balances.length === 0
  };
};