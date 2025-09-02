/**
 * Sandbox Wallet Hook
 * React hook for managing sandbox wallet operations and testing scenarios
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  sandboxWalletService, 
  SandboxState, 
  SandboxBalances, 
  SandboxTransaction, 
  TestingScenario 
} from '../services/identity/SandboxWalletService';
import { WalletMode } from '../types/wallet-config';
import { useActiveIdentity } from './useActiveIdentity';

export interface UseSandboxWalletReturn {
  // Sandbox state
  isActive: boolean;
  sandboxState: SandboxState | null;
  currentScenario: string | null;
  
  // Mock data
  mockBalances: SandboxBalances | null;
  mockTransactions: SandboxTransaction[];
  
  // Available scenarios
  availableScenarios: TestingScenario[];
  
  // Actions
  enableSandbox: (config?: Partial<WalletMode>) => Promise<boolean>;
  disableSandbox: () => Promise<boolean>;
  resetSandbox: () => Promise<boolean>;
  
  // Mock data management
  setMockBalances: (balances: Record<string, number>) => Promise<boolean>;
  addMockTransaction: (transaction: Partial<SandboxTransaction>) => Promise<string>;
  
  // Testing scenarios
  startScenario: (scenarioName: string) => Promise<boolean>;
  stopScenario: () => Promise<boolean>;
  addCustomScenario: (scenario: TestingScenario) => Promise<boolean>;
  
  // Simulation controls
  setSimulatedTime: (time: string) => Promise<boolean>;
  setNetworkDelay: (delayMs: number) => Promise<boolean>;
  enableErrorSimulation: (errorRate: number, errorTypes: string[]) => Promise<boolean>;
  disableErrorSimulation: () => Promise<boolean>;
  
  // Transaction simulation
  simulateTransaction: (transaction: {
    type: string;
    amount: number;
    token: string;
    to: string;
  }) => Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
    gasEstimate?: number;
    balanceAfter?: SandboxBalances;
  }>;
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Refresh data
  refresh: () => Promise<void>;
}

export function useSandboxWallet(): UseSandboxWalletReturn {
  const { activeIdentity } = useActiveIdentity();
  const identityId = activeIdentity?.id;

  // State
  const [isActive, setIsActive] = useState(false);
  const [sandboxState, setSandboxState] = useState<SandboxState | null>(null);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [mockBalances, setMockBalances] = useState<SandboxBalances | null>(null);
  const [mockTransactions, setMockTransactions] = useState<SandboxTransaction[]>([]);
  const [availableScenarios, setAvailableScenarios] = useState<TestingScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sandbox state
  const loadSandboxState = useCallback(async () => {
    if (!identityId) return;

    try {
      setLoading(true);
      setError(null);

      const active = sandboxWalletService.isSandboxActive(identityId);
      setIsActive(active);

      if (active) {
        const state = sandboxWalletService.getSandboxState(identityId);
        setSandboxState(state);
        setCurrentScenario(sandboxWalletService.getCurrentScenario(identityId));

        const balances = await sandboxWalletService.getMockBalances(identityId);
        setMockBalances(balances);

        const transactions = await sandboxWalletService.getMockTransactions(identityId);
        setMockTransactions(transactions);
      } else {
        setSandboxState(null);
        setCurrentScenario(null);
        setMockBalances(null);
        setMockTransactions([]);
      }

      const scenarios = sandboxWalletService.getAvailableScenarios();
      setAvailableScenarios(scenarios);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sandbox state');
    } finally {
      setLoading(false);
    }
  }, [identityId]);

  // Load state on mount and identity change
  useEffect(() => {
    loadSandboxState();
  }, [loadSandboxState]);

  // Actions
  const enableSandbox = useCallback(async (config?: Partial<WalletMode>): Promise<boolean> => {
    if (!identityId) return false;

    try {
      setLoading(true);
      setError(null);

      const success = await sandboxWalletService.enableSandboxMode(identityId, config);
      if (success) {
        await loadSandboxState();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable sandbox');
      return false;
    } finally {
      setLoading(false);
    }
  }, [identityId, loadSandboxState]);

  const disableSandbox = useCallback(async (): Promise<boolean> => {
    if (!identityId) return false;

    try {
      setLoading(true);
      setError(null);

      const success = await sandboxWalletService.disableSandboxMode(identityId);
      if (success) {
        await loadSandboxState();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable sandbox');
      return false;
    } finally {
      setLoading(false);
    }
  }, [identityId, loadSandboxState]);

  const resetSandbox = useCallback(async (): Promise<boolean> => {
    if (!identityId) return false;

    try {
      setLoading(true);
      setError(null);

      const success = await sandboxWalletService.resetSandboxData(identityId);
      if (success) {
        await loadSandboxState();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset sandbox');
      return false;
    } finally {
      setLoading(false);
    }
  }, [identityId, loadSandboxState]);

  const setMockBalancesAction = useCallback(async (balances: Record<string, number>): Promise<boolean> => {
    if (!identityId) return false;

    try {
      const success = await sandboxWalletService.setMockBalances(identityId, balances);
      if (success) {
        const updatedBalances = await sandboxWalletService.getMockBalances(identityId);
        setMockBalances(updatedBalances);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set mock balances');
      return false;
    }
  }, [identityId]);

  const addMockTransaction = useCallback(async (transaction: Partial<SandboxTransaction>): Promise<string> => {
    if (!identityId) throw new Error('No active identity');

    try {
      const transactionId = await sandboxWalletService.addMockTransaction(identityId, transaction);
      
      // Refresh transactions and balances
      const transactions = await sandboxWalletService.getMockTransactions(identityId);
      setMockTransactions(transactions);
      
      const balances = await sandboxWalletService.getMockBalances(identityId);
      setMockBalances(balances);
      
      return transactionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add mock transaction');
      throw err;
    }
  }, [identityId]);

  const startScenario = useCallback(async (scenarioName: string): Promise<boolean> => {
    if (!identityId) return false;

    try {
      setLoading(true);
      setError(null);

      const success = await sandboxWalletService.startTestingScenario(identityId, scenarioName);
      if (success) {
        await loadSandboxState();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scenario');
      return false;
    } finally {
      setLoading(false);
    }
  }, [identityId, loadSandboxState]);

  const stopScenario = useCallback(async (): Promise<boolean> => {
    if (!identityId) return false;

    try {
      const success = await sandboxWalletService.stopTestingScenario(identityId);
      if (success) {
        setCurrentScenario(null);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop scenario');
      return false;
    }
  }, [identityId]);

  const addCustomScenario = useCallback(async (scenario: TestingScenario): Promise<boolean> => {
    try {
      const success = await sandboxWalletService.addCustomScenario(scenario);
      if (success) {
        const scenarios = sandboxWalletService.getAvailableScenarios();
        setAvailableScenarios(scenarios);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add custom scenario');
      return false;
    }
  }, []);

  const setSimulatedTime = useCallback(async (time: string): Promise<boolean> => {
    if (!identityId) return false;

    try {
      const success = await sandboxWalletService.setSimulatedTime(identityId, time);
      if (success) {
        await loadSandboxState();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set simulated time');
      return false;
    }
  }, [identityId, loadSandboxState]);

  const setNetworkDelay = useCallback(async (delayMs: number): Promise<boolean> => {
    if (!identityId) return false;

    try {
      const success = await sandboxWalletService.setNetworkDelay(identityId, delayMs);
      if (success) {
        await loadSandboxState();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set network delay');
      return false;
    }
  }, [identityId, loadSandboxState]);

  const enableErrorSimulation = useCallback(async (errorRate: number, errorTypes: string[]): Promise<boolean> => {
    if (!identityId) return false;

    try {
      const success = await sandboxWalletService.enableErrorSimulation(identityId, errorRate, errorTypes);
      if (success) {
        await loadSandboxState();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable error simulation');
      return false;
    }
  }, [identityId, loadSandboxState]);

  const disableErrorSimulation = useCallback(async (): Promise<boolean> => {
    if (!identityId) return false;

    try {
      const success = await sandboxWalletService.disableErrorSimulation(identityId);
      if (success) {
        await loadSandboxState();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable error simulation');
      return false;
    }
  }, [identityId, loadSandboxState]);

  const simulateTransaction = useCallback(async (transaction: {
    type: string;
    amount: number;
    token: string;
    to: string;
  }) => {
    if (!identityId) {
      return { success: false, error: 'No active identity' };
    }

    try {
      const result = await sandboxWalletService.simulateTransaction(identityId, transaction);
      
      if (result.success) {
        // Refresh data after successful transaction
        await loadSandboxState();
      }
      
      return result;
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Transaction simulation failed' 
      };
    }
  }, [identityId, loadSandboxState]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!identityId) return;

    try {
      setLoading(true);
      // Don't clear error here - let it persist if there's an issue

      const active = sandboxWalletService.isSandboxActive(identityId);
      setIsActive(active);

      if (active) {
        const state = sandboxWalletService.getSandboxState(identityId);
        setSandboxState(state);
        setCurrentScenario(sandboxWalletService.getCurrentScenario(identityId));

        const balances = await sandboxWalletService.getMockBalances(identityId);
        setMockBalances(balances);

        const transactions = await sandboxWalletService.getMockTransactions(identityId);
        setMockTransactions(transactions);
      } else {
        setSandboxState(null);
        setCurrentScenario(null);
        setMockBalances(null);
        setMockTransactions([]);
      }

      const scenarios = sandboxWalletService.getAvailableScenarios();
      setAvailableScenarios(scenarios);
      
      // Only clear error if everything succeeded
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh sandbox state');
    } finally {
      setLoading(false);
    }
  }, [identityId]);

  return {
    // State
    isActive,
    sandboxState,
    currentScenario,
    mockBalances,
    mockTransactions,
    availableScenarios,
    
    // Actions
    enableSandbox,
    disableSandbox,
    resetSandbox,
    setMockBalances: setMockBalancesAction,
    addMockTransaction,
    startScenario,
    stopScenario,
    addCustomScenario,
    setSimulatedTime,
    setNetworkDelay,
    enableErrorSimulation,
    disableErrorSimulation,
    simulateTransaction,
    
    // Meta
    loading,
    error,
    refresh
  };
}