/**
 * Test suite for useSandboxWallet hook
 * Tests React hook functionality for sandbox wallet operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSandboxWallet } from '../useSandboxWallet';
import { sandboxWalletService } from '../../services/identity/SandboxWalletService';
import { useActiveIdentity } from '../useActiveIdentity';

// Mock dependencies
vi.mock('../useActiveIdentity');
vi.mock('../../services/identity/SandboxWalletService');

const mockActiveIdentity = {
  id: 'test-identity-123',
  type: 'ROOT' as const,
  name: 'Test Identity'
};

const mockSandboxState = {
  identityId: 'test-identity-123',
  isActive: true,
  mockBalances: {
    QToken: { balance: 1000, locked: 0, staked: 0, pending: 0 },
    ETH: { balance: 10, locked: 0, staked: 0, pending: 0 }
  },
  mockTransactions: [],
  networkDelay: 100,
  errorSimulation: {
    enabled: false,
    errorRate: 0,
    errorTypes: []
  },
  preserveState: false
};

const mockScenarios = [
  {
    name: 'HIGH_VOLUME_TRADING',
    description: 'High volume trading scenario',
    initialBalances: {
      QToken: { balance: 10000, locked: 0, staked: 0, pending: 0 }
    },
    simulatedEvents: [],
    expectedOutcomes: []
  }
];

describe('useSandboxWallet', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock useActiveIdentity
    vi.mocked(useActiveIdentity).mockReturnValue({
      activeIdentity: mockActiveIdentity,
      setActiveIdentity: vi.fn(),
      loading: false,
      error: null
    });

    // Mock sandboxWalletService methods
    vi.mocked(sandboxWalletService.isSandboxActive).mockReturnValue(false);
    vi.mocked(sandboxWalletService.getSandboxState).mockReturnValue(null);
    vi.mocked(sandboxWalletService.getCurrentScenario).mockReturnValue(null);
    vi.mocked(sandboxWalletService.getMockBalances).mockResolvedValue(null);
    vi.mocked(sandboxWalletService.getMockTransactions).mockResolvedValue([]);
    vi.mocked(sandboxWalletService.getAvailableScenarios).mockReturnValue(mockScenarios);
    vi.mocked(sandboxWalletService.enableSandboxMode).mockResolvedValue(true);
    vi.mocked(sandboxWalletService.disableSandboxMode).mockResolvedValue(true);
    vi.mocked(sandboxWalletService.resetSandboxData).mockResolvedValue(true);
    vi.mocked(sandboxWalletService.setMockBalances).mockResolvedValue(true);
    vi.mocked(sandboxWalletService.addMockTransaction).mockResolvedValue('tx-123');
    vi.mocked(sandboxWalletService.startTestingScenario).mockResolvedValue(true);
    vi.mocked(sandboxWalletService.stopTestingScenario).mockResolvedValue(true);
    vi.mocked(sandboxWalletService.addCustomScenario).mockResolvedValue(true);
    vi.mocked(sandboxWalletService.setSimulatedTime).mockResolvedValue(true);
    vi.mocked(sandboxWalletService.setNetworkDelay).mockResolvedValue(true);
    vi.mocked(sandboxWalletService.enableErrorSimulation).mockResolvedValue(true);
    vi.mocked(sandboxWalletService.disableErrorSimulation).mockResolvedValue(true);
    vi.mocked(sandboxWalletService.simulateTransaction).mockResolvedValue({
      success: true,
      transactionId: 'tx-123',
      gasEstimate: 21000
    });
  });

  describe('Initial State', () => {
    it('should initialize with inactive sandbox state', async () => {
      const { result } = renderHook(() => useSandboxWallet());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.sandboxState).toBeNull();
      expect(result.current.currentScenario).toBeNull();
      expect(result.current.mockBalances).toBeNull();
      expect(result.current.mockTransactions).toEqual([]);
      expect(result.current.availableScenarios).toEqual(mockScenarios);
      expect(result.current.error).toBeNull();
    });

    it('should load active sandbox state', async () => {
      vi.mocked(sandboxWalletService.isSandboxActive).mockReturnValue(true);
      vi.mocked(sandboxWalletService.getSandboxState).mockReturnValue(mockSandboxState);
      vi.mocked(sandboxWalletService.getCurrentScenario).mockReturnValue('HIGH_VOLUME_TRADING');
      vi.mocked(sandboxWalletService.getMockBalances).mockResolvedValue(mockSandboxState.mockBalances);

      const { result } = renderHook(() => useSandboxWallet());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.sandboxState).toEqual(mockSandboxState);
      expect(result.current.currentScenario).toBe('HIGH_VOLUME_TRADING');
      expect(result.current.mockBalances).toEqual(mockSandboxState.mockBalances);
    });

    it('should handle missing active identity', async () => {
      vi.mocked(useActiveIdentity).mockReturnValue({
        activeIdentity: null,
        setActiveIdentity: vi.fn(),
        loading: false,
        error: null
      });

      const { result } = renderHook(() => useSandboxWallet());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Sandbox Mode Management', () => {
    it('should enable sandbox mode', async () => {
      const { result } = renderHook(() => useSandboxWallet());

      await act(async () => {
        const success = await result.current.enableSandbox();
        expect(success).toBe(true);
      });

      expect(sandboxWalletService.enableSandboxMode).toHaveBeenCalledWith(
        mockActiveIdentity.id,
        undefined
      );
    });

    it('should enable sandbox mode with custom config', async () => {
      const { result } = renderHook(() => useSandboxWallet());
      const customConfig = {
        mockBalances: { QToken: 5000 },
        debugLogging: true
      };

      await act(async () => {
        const success = await result.current.enableSandbox(customConfig);
        expect(success).toBe(true);
      });

      expect(sandboxWalletService.enableSandboxMode).toHaveBeenCalledWith(
        mockActiveIdentity.id,
        customConfig
      );
    });

    it('should disable sandbox mode', async () => {
      const { result } = renderHook(() => useSandboxWallet());

      await act(async () => {
        const success = await result.current.disableSandbox();
        expect(success).toBe(true);
      });

      expect(sandboxWalletService.disableSandboxMode).toHaveBeenCalledWith(mockActiveIdentity.id);
    });

    it('should reset sandbox data', async () => {
      const { result } = renderHook(() => useSandboxWallet());

      await act(async () => {
        const success = await result.current.resetSandbox();
        expect(success).toBe(true);
      });

      expect(sandboxWalletService.resetSandboxData).toHaveBeenCalledWith(mockActiveIdentity.id);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(sandboxWalletService.enableSandboxMode).mockRejectedValue(
        new Error('Enable failed')
      );

      const { result } = renderHook(() => useSandboxWallet());

      await act(async () => {
        const success = await result.current.enableSandbox();
        expect(success).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Enable failed');
      });
    });

    it('should return false when no active identity', async () => {
      vi.mocked(useActiveIdentity).mockReturnValue({
        activeIdentity: null,
        setActiveIdentity: vi.fn(),
        loading: false,
        error: null
      });

      const { result } = renderHook(() => useSandboxWallet());

      await act(async () => {
        const success = await result.current.enableSandbox();
        expect(success).toBe(false);
      });

      expect(sandboxWalletService.enableSandboxMode).not.toHaveBeenCalled();
    });
  });

  describe('Mock Data Management', () => {
    it('should set mock balances', async () => {
      const { result } = renderHook(() => useSandboxWallet());
      const balances = { QToken: 2000, ETH: 20 };

      await act(async () => {
        const success = await result.current.setMockBalances(balances);
        expect(success).toBe(true);
      });

      expect(sandboxWalletService.setMockBalances).toHaveBeenCalledWith(
        mockActiveIdentity.id,
        balances
      );
    });

    it('should add mock transaction', async () => {
      const { result } = renderHook(() => useSandboxWallet());
      const transaction = {
        type: 'SEND' as const,
        amount: 100,
        token: 'QToken',
        to: 'test_recipient'
      };

      await act(async () => {
        const transactionId = await result.current.addMockTransaction(transaction);
        expect(transactionId).toBe('tx-123');
      });

      expect(sandboxWalletService.addMockTransaction).toHaveBeenCalledWith(
        mockActiveIdentity.id,
        transaction
      );
    });

    it('should handle mock transaction errors', async () => {
      vi.mocked(sandboxWalletService.addMockTransaction).mockRejectedValue(
        new Error('Transaction failed')
      );

      const { result } = renderHook(() => useSandboxWallet());
      const transaction = {
        type: 'SEND' as const,
        amount: 100,
        token: 'QToken',
        to: 'test_recipient'
      };

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.addMockTransaction(transaction);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      expect(thrownError?.message).toBe('Transaction failed');
      
      await waitFor(() => {
        expect(result.current.error).toBe('Transaction failed');
      });
    });
  });

  describe('Testing Scenarios', () => {
    it('should start testing scenario', async () => {
      const { result } = renderHook(() => useSandboxWallet());

      await act(async () => {
        const success = await result.current.startScenario('HIGH_VOLUME_TRADING');
        expect(success).toBe(true);
      });

      expect(sandboxWalletService.startTestingScenario).toHaveBeenCalledWith(
        mockActiveIdentity.id,
        'HIGH_VOLUME_TRADING'
      );
    });

    it('should stop testing scenario', async () => {
      const { result } = renderHook(() => useSandboxWallet());

      await act(async () => {
        const success = await result.current.stopScenario();
        expect(success).toBe(true);
      });

      expect(sandboxWalletService.stopTestingScenario).toHaveBeenCalledWith(mockActiveIdentity.id);
    });

    it('should add custom scenario', async () => {
      const { result } = renderHook(() => useSandboxWallet());
      const customScenario = {
        name: 'CUSTOM_TEST',
        description: 'Custom test scenario',
        initialBalances: {
          QToken: { balance: 500, locked: 0, staked: 0, pending: 0 }
        },
        simulatedEvents: [],
        expectedOutcomes: []
      };

      await act(async () => {
        const success = await result.current.addCustomScenario(customScenario);
        expect(success).toBe(true);
      });

      expect(sandboxWalletService.addCustomScenario).toHaveBeenCalledWith(customScenario);
    });
  });

  describe('Simulation Controls', () => {
    it('should set simulated time', async () => {
      const { result } = renderHook(() => useSandboxWallet());
      const testTime = '2024-01-01T12:00:00Z';

      await act(async () => {
        const success = await result.current.setSimulatedTime(testTime);
        expect(success).toBe(true);
      });

      expect(sandboxWalletService.setSimulatedTime).toHaveBeenCalledWith(
        mockActiveIdentity.id,
        testTime
      );
    });

    it('should set network delay', async () => {
      const { result } = renderHook(() => useSandboxWallet());
      const delay = 500;

      await act(async () => {
        const success = await result.current.setNetworkDelay(delay);
        expect(success).toBe(true);
      });

      expect(sandboxWalletService.setNetworkDelay).toHaveBeenCalledWith(
        mockActiveIdentity.id,
        delay
      );
    });

    it('should enable error simulation', async () => {
      const { result } = renderHook(() => useSandboxWallet());
      const errorRate = 0.2;
      const errorTypes = ['NETWORK_ERROR'];

      await act(async () => {
        const success = await result.current.enableErrorSimulation(errorRate, errorTypes);
        expect(success).toBe(true);
      });

      expect(sandboxWalletService.enableErrorSimulation).toHaveBeenCalledWith(
        mockActiveIdentity.id,
        errorRate,
        errorTypes
      );
    });

    it('should disable error simulation', async () => {
      const { result } = renderHook(() => useSandboxWallet());

      await act(async () => {
        const success = await result.current.disableErrorSimulation();
        expect(success).toBe(true);
      });

      expect(sandboxWalletService.disableErrorSimulation).toHaveBeenCalledWith(mockActiveIdentity.id);
    });
  });

  describe('Transaction Simulation', () => {
    it('should simulate transaction successfully', async () => {
      const { result } = renderHook(() => useSandboxWallet());
      const transaction = {
        type: 'SEND',
        amount: 100,
        token: 'QToken',
        to: 'test_recipient'
      };

      await act(async () => {
        const simulationResult = await result.current.simulateTransaction(transaction);
        expect(simulationResult.success).toBe(true);
        expect(simulationResult.transactionId).toBe('tx-123');
        expect(simulationResult.gasEstimate).toBe(21000);
      });

      expect(sandboxWalletService.simulateTransaction).toHaveBeenCalledWith(
        mockActiveIdentity.id,
        transaction
      );
    });

    it('should handle transaction simulation failure', async () => {
      vi.mocked(sandboxWalletService.simulateTransaction).mockResolvedValue({
        success: false,
        error: 'Insufficient balance'
      });

      const { result } = renderHook(() => useSandboxWallet());
      const transaction = {
        type: 'SEND',
        amount: 2000,
        token: 'QToken',
        to: 'test_recipient'
      };

      await act(async () => {
        const simulationResult = await result.current.simulateTransaction(transaction);
        expect(simulationResult.success).toBe(false);
        expect(simulationResult.error).toBe('Insufficient balance');
      });
    });

    it('should handle simulation errors', async () => {
      vi.mocked(sandboxWalletService.simulateTransaction).mockRejectedValue(
        new Error('Simulation failed')
      );

      const { result } = renderHook(() => useSandboxWallet());
      const transaction = {
        type: 'SEND',
        amount: 100,
        token: 'QToken',
        to: 'test_recipient'
      };

      await act(async () => {
        const simulationResult = await result.current.simulateTransaction(transaction);
        expect(simulationResult.success).toBe(false);
        expect(simulationResult.error).toBe('Simulation failed');
      });
    });

    it('should return error when no active identity', async () => {
      vi.mocked(useActiveIdentity).mockReturnValue({
        activeIdentity: null,
        setActiveIdentity: vi.fn(),
        loading: false,
        error: null
      });

      const { result } = renderHook(() => useSandboxWallet());
      const transaction = {
        type: 'SEND',
        amount: 100,
        token: 'QToken',
        to: 'test_recipient'
      };

      await act(async () => {
        const simulationResult = await result.current.simulateTransaction(transaction);
        expect(simulationResult.success).toBe(false);
        expect(simulationResult.error).toBe('No active identity');
      });

      expect(sandboxWalletService.simulateTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Data Refresh', () => {
    it('should refresh sandbox data', async () => {
      const { result } = renderHook(() => useSandboxWallet());

      await act(async () => {
        await result.current.refresh();
      });

      // Verify that all data loading methods were called
      expect(sandboxWalletService.isSandboxActive).toHaveBeenCalledWith(mockActiveIdentity.id);
      expect(sandboxWalletService.getAvailableScenarios).toHaveBeenCalled();
    });

    it('should handle refresh errors', async () => {
      // Mock the service to throw an error
      vi.mocked(sandboxWalletService.getMockBalances).mockRejectedValue(
        new Error('Refresh failed')
      );
      
      // Also mock isSandboxActive to return true so it tries to get balances
      vi.mocked(sandboxWalletService.isSandboxActive).mockReturnValue(true);

      const { result } = renderHook(() => useSandboxWallet());

      // Wait for initial load to complete first
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Refresh failed');
      });
    });
  });

  describe('Identity Changes', () => {
    it('should reload data when identity changes', async () => {
      const { rerender } = renderHook(() => useSandboxWallet());

      // Change the active identity
      const newIdentity = { ...mockActiveIdentity, id: 'new-identity-456' };
      vi.mocked(useActiveIdentity).mockReturnValue({
        activeIdentity: newIdentity,
        setActiveIdentity: vi.fn(),
        loading: false,
        error: null
      });

      rerender();

      await waitFor(() => {
        expect(sandboxWalletService.isSandboxActive).toHaveBeenCalledWith('new-identity-456');
      });
    });

    it('should handle null identity gracefully', async () => {
      const { result, rerender } = renderHook(() => useSandboxWallet());

      // Set identity to null
      vi.mocked(useActiveIdentity).mockReturnValue({
        activeIdentity: null,
        setActiveIdentity: vi.fn(),
        loading: false,
        error: null
      });

      rerender();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not call service methods with null identity
      expect(sandboxWalletService.isSandboxActive).not.toHaveBeenCalledWith(null);
    });
  });
});