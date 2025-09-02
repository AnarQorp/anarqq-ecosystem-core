/**
 * Centralized Qwallet State Management Hook
 * Provides global wallet state management with identity context switching,
 * cross-component state synchronization, and persistent storage
 */

import { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react';
import { ExtendedSquidIdentity } from '../types/identity';
import { QwalletState, QwalletActions, useIdentityQwallet } from './useIdentityQwallet';
import { PerformanceMonitor } from '../utils/performance/PerformanceMonitor';
import { WalletCache } from '../utils/performance/WalletCache';

// Global wallet state context
interface QwalletGlobalState {
  activeIdentity: ExtendedSquidIdentity | null;
  identityStates: Map<string, QwalletState>;
  globalLoading: boolean;
  globalError: string | null;
  lastSyncTime: string | null;
}

interface QwalletGlobalActions {
  setActiveIdentity: (identity: ExtendedSquidIdentity | null) => void;
  syncAllIdentities: () => Promise<void>;
  clearGlobalError: () => void;
  getIdentityState: (identityId: string) => QwalletState | null;
  updateIdentityState: (identityId: string, state: Partial<QwalletState>) => void;
}

interface QwalletContextValue {
  state: QwalletGlobalState;
  actions: QwalletGlobalActions;
  currentWallet: {
    state: QwalletState;
    actions: QwalletActions;
    isReady: boolean;
    hasError: boolean;
    isEmpty: boolean;
  } | null;
}

const QwalletContext = createContext<QwalletContextValue | null>(null);

// Provider component
export const QwalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [globalState, setGlobalState] = useState<QwalletGlobalState>({
    activeIdentity: null,
    identityStates: new Map(),
    globalLoading: false,
    globalError: null,
    lastSyncTime: null
  });

  // Current wallet hook
  const currentWallet = useIdentityQwallet(globalState.activeIdentity, {
    autoRefresh: true,
    refreshInterval: 30000,
    enablePiWallet: true,
    enableRiskAssessment: true,
    enableAuditLogging: true
  });

  // Set active identity with enhanced ecosystem integration and performance monitoring
  const setActiveIdentity = useCallback(async (identity: ExtendedSquidIdentity | null) => {
    const previousIdentity = globalState.activeIdentity;
    
    // Track identity switching performance at global level
    const metricId = identity ? PerformanceMonitor.startMetric(
      'identity_switch',
      'IDENTITY_SWITCH',
      { 
        fromIdentity: previousIdentity?.did,
        toIdentity: identity.did,
        fromType: previousIdentity?.type,
        toType: identity.type
      },
      ['identity', 'switch', 'global']
    ) : null;
    
    setGlobalState(prev => ({
      ...prev,
      activeIdentity: identity,
      globalError: null,
      globalLoading: true
    }));

    try {
      // Preload data for new identity if switching
      if (identity && previousIdentity && identity.did !== previousIdentity.did) {
        // Start preloading in parallel with other operations
        WalletCache.preloadIdentityData(identity.did, ['balances', 'permissions', 'risk']).catch(error => {
          console.warn('Failed to preload identity data:', error);
        });
      }
      // Log identity switch to audit system
      if (identity && previousIdentity && identity.did !== previousIdentity.did) {
        try {
          await fetch('/api/qerberos/log', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'wallet_identity_switch',
              squidId: identity.did,
              operationType: 'WALLET',
              identityType: identity.type,
              sessionId: `session_${Date.now()}`,
              deviceFingerprint: navigator.userAgent ? btoa(navigator.userAgent).substring(0, 32) : null,
              ipAddress: '127.0.0.1',
              userAgent: navigator.userAgent,
              metadata: {
                previousIdentityId: previousIdentity.did,
                previousIdentityType: previousIdentity.type,
                newIdentityId: identity.did,
                newIdentityType: identity.type,
                switchTimestamp: new Date().toISOString(),
                frontend: true,
                component: 'useQwalletState'
              }
            })
          });
        } catch (auditError) {
          console.warn('Failed to log identity switch to audit system:', auditError);
        }
      }

      // Update context switching coordination
      if (identity) {
        // Notify all ecosystem modules about identity switch
        try {
          await fetch('/api/ecosystem/identity-switch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              newIdentityId: identity.did,
              newIdentityType: identity.type,
              previousIdentityId: previousIdentity?.did,
              timestamp: new Date().toISOString(),
              modules: ['qwallet', 'qonsent', 'qlock', 'qindex', 'qerberos']
            })
          });
        } catch (coordinationError) {
          console.warn('Failed to coordinate identity switch across ecosystem:', coordinationError);
        }
      }

      setGlobalState(prev => ({
        ...prev,
        globalLoading: false,
        lastSyncTime: new Date().toISOString()
      }));

      // End performance tracking
      if (metricId) {
        PerformanceMonitor.endMetric(metricId, true);
      }

    } catch (error) {
      // End performance tracking with error
      if (metricId) {
        PerformanceMonitor.endMetric(metricId, false, error instanceof Error ? error.message : 'Unknown error');
      }
      
      setGlobalState(prev => ({
        ...prev,
        globalLoading: false,
        globalError: error instanceof Error ? error.message : 'Identity switch failed'
      }));
    }
  }, [globalState.activeIdentity]);

  // Sync all identities
  const syncAllIdentities = useCallback(async () => {
    setGlobalState(prev => ({ ...prev, globalLoading: true, globalError: null }));

    try {
      // In a real implementation, this would sync all cached identity states
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setGlobalState(prev => ({
        ...prev,
        globalLoading: false,
        lastSyncTime: new Date().toISOString()
      }));
    } catch (error) {
      setGlobalState(prev => ({
        ...prev,
        globalLoading: false,
        globalError: error instanceof Error ? error.message : 'Sync failed'
      }));
    }
  }, []);

  // Clear global error
  const clearGlobalError = useCallback(() => {
    setGlobalState(prev => ({ ...prev, globalError: null }));
  }, []);

  // Get identity state
  const getIdentityState = useCallback((identityId: string): QwalletState | null => {
    return globalState.identityStates.get(identityId) || null;
  }, [globalState.identityStates]);

  // Update identity state
  const updateIdentityState = useCallback((identityId: string, state: Partial<QwalletState>) => {
    setGlobalState(prev => {
      const newStates = new Map(prev.identityStates);
      const currentState = newStates.get(identityId);
      
      if (currentState) {
        newStates.set(identityId, { ...currentState, ...state });
      }
      
      return {
        ...prev,
        identityStates: newStates
      };
    });
  }, []);

  // Update identity states when current wallet changes
  useEffect(() => {
    if (globalState.activeIdentity && currentWallet.isReady) {
      const identityId = globalState.activeIdentity.did;
      setGlobalState(prev => {
        const newStates = new Map(prev.identityStates);
        newStates.set(identityId, {
          balances: currentWallet.balances,
          permissions: currentWallet.permissions,
          config: currentWallet.config,
          piWalletStatus: currentWallet.piWalletStatus,
          piWalletConnected: currentWallet.piWalletConnected,
          riskAssessment: currentWallet.riskAssessment,
          auditEvents: currentWallet.auditEvents,
          loading: currentWallet.loading,
          error: currentWallet.error,
          lastUpdated: currentWallet.lastUpdated,
          pendingTransactions: currentWallet.pendingTransactions,
          transactionHistory: currentWallet.transactionHistory
        });
        
        return {
          ...prev,
          identityStates: newStates
        };
      });
    }
  }, [globalState.activeIdentity, currentWallet]);

  // Load persisted state on mount
  useEffect(() => {
    try {
      const persistedState = localStorage.getItem('qwallet_global_state');
      if (persistedState) {
        const parsed = JSON.parse(persistedState);
        setGlobalState(prev => ({
          ...prev,
          identityStates: new Map(Object.entries(parsed.identityStates || {})),
          lastSyncTime: parsed.lastSyncTime
        }));
      }
    } catch (error) {
      console.error('Failed to load persisted wallet state:', error);
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    try {
      const stateToSave = {
        identityStates: Object.fromEntries(globalState.identityStates),
        lastSyncTime: globalState.lastSyncTime
      };
      localStorage.setItem('qwallet_global_state', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to persist wallet state:', error);
    }
  }, [globalState.identityStates, globalState.lastSyncTime]);

  const contextValue: QwalletContextValue = {
    state: globalState,
    actions: {
      setActiveIdentity,
      syncAllIdentities,
      clearGlobalError,
      getIdentityState,
      updateIdentityState
    },
    currentWallet: globalState.activeIdentity ? {
      state: {
        balances: currentWallet.balances,
        permissions: currentWallet.permissions,
        config: currentWallet.config,
        piWalletStatus: currentWallet.piWalletStatus,
        piWalletConnected: currentWallet.piWalletConnected,
        riskAssessment: currentWallet.riskAssessment,
        auditEvents: currentWallet.auditEvents,
        loading: currentWallet.loading,
        error: currentWallet.error,
        lastUpdated: currentWallet.lastUpdated,
        pendingTransactions: currentWallet.pendingTransactions,
        transactionHistory: currentWallet.transactionHistory
      },
      actions: currentWallet.actions,
      isReady: currentWallet.isReady,
      hasError: currentWallet.hasError,
      isEmpty: currentWallet.isEmpty
    } : null
  };

  return (
    <QwalletContext.Provider value={contextValue}>
      {children}
    </QwalletContext.Provider>
  );
};

// Hook to use the global wallet state
export const useQwalletState = () => {
  const context = useContext(QwalletContext);
  if (!context) {
    throw new Error('useQwalletState must be used within a QwalletProvider');
  }
  return context;
};

// Hook for specific identity wallet state
export const useIdentityWalletState = (identityId: string) => {
  const { state, actions } = useQwalletState();
  
  const identityState = state.identityStates.get(identityId);
  
  return {
    state: identityState || null,
    isActive: state.activeIdentity?.did === identityId,
    updateState: (updates: Partial<QwalletState>) => actions.updateIdentityState(identityId, updates),
    switchToIdentity: () => {
      // This would need to be implemented to switch to this identity
      console.log(`Switching to identity: ${identityId}`);
    }
  };
};

// Hook for wallet operations across identities
export const useMultiIdentityWallet = () => {
  const { state, actions, currentWallet } = useQwalletState();
  
  const getAllBalances = useCallback(() => {
    const allBalances = new Map<string, number>();
    
    state.identityStates.forEach((walletState, identityId) => {
      if (walletState.balances) {
        allBalances.set(identityId, walletState.balances.totalValueUSD);
      }
    });
    
    return allBalances;
  }, [state.identityStates]);
  
  const getTotalPortfolioValue = useCallback(() => {
    let total = 0;
    
    state.identityStates.forEach((walletState) => {
      if (walletState.balances) {
        total += walletState.balances.totalValueUSD;
      }
    });
    
    return total;
  }, [state.identityStates]);
  
  const getIdentitiesWithPiWallet = useCallback(() => {
    const identitiesWithPi: string[] = [];
    
    state.identityStates.forEach((walletState, identityId) => {
      if (walletState.piWalletConnected) {
        identitiesWithPi.push(identityId);
      }
    });
    
    return identitiesWithPi;
  }, [state.identityStates]);
  
  const getHighRiskIdentities = useCallback(() => {
    const highRiskIdentities: string[] = [];
    
    state.identityStates.forEach((walletState, identityId) => {
      if (walletState.riskAssessment?.overallRisk === 'HIGH' || 
          walletState.riskAssessment?.overallRisk === 'CRITICAL') {
        highRiskIdentities.push(identityId);
      }
    });
    
    return highRiskIdentities;
  }, [state.identityStates]);
  
  return {
    // State
    allIdentityStates: state.identityStates,
    activeIdentity: state.activeIdentity,
    currentWallet,
    
    // Actions
    setActiveIdentity: actions.setActiveIdentity,
    syncAllIdentities: actions.syncAllIdentities,
    
    // Computed values
    getAllBalances,
    getTotalPortfolioValue,
    getIdentitiesWithPiWallet,
    getHighRiskIdentities,
    
    // Status
    hasAnyErrors: Array.from(state.identityStates.values()).some(s => s.error),
    isAnyLoading: state.globalLoading || Array.from(state.identityStates.values()).some(s => s.loading),
    totalIdentities: state.identityStates.size
  };
};