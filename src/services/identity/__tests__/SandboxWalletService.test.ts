/**
 * Test suite for Sandbox Wallet Service
 * Tests sandbox mode functionality, mock data management, and testing scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sandboxWalletService, SandboxWalletService } from '../SandboxWalletService';
import { walletConfigService } from '../WalletConfigService';

// Mock the wallet config service
vi.mock('../WalletConfigService', () => ({
  walletConfigService: {
    enableSandboxMode: vi.fn(),
    disableSandboxMode: vi.fn(),
    resetSandboxData: vi.fn()
  }
}));

describe('SandboxWalletService', () => {
  const mockIdentityId = 'test-identity-123';
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock successful config service responses
    vi.mocked(walletConfigService.enableSandboxMode).mockResolvedValue(true);
    vi.mocked(walletConfigService.disableSandboxMode).mockResolvedValue(true);
    vi.mocked(walletConfigService.resetSandboxData).mockResolvedValue(true);
  });

  afterEach(() => {
    // Clean up any active sandbox states
    sandboxWalletService.disableSandboxMode(mockIdentityId);
  });

  describe('Sandbox Mode Management', () => {
    it('should enable sandbox mode with default configuration', async () => {
      const success = await sandboxWalletService.enableSandboxMode(mockIdentityId);
      
      expect(success).toBe(true);
      expect(walletConfigService.enableSandboxMode).toHaveBeenCalledWith(mockIdentityId, undefined);
      expect(sandboxWalletService.isSandboxActive(mockIdentityId)).toBe(true);
    });

    it('should enable sandbox mode with custom configuration', async () => {
      const customConfig = {
        mockBalances: { QToken: 5000, ETH: 50 },
        debugLogging: true
      };

      const success = await sandboxWalletService.enableSandboxMode(mockIdentityId, customConfig);
      
      expect(success).toBe(true);
      expect(walletConfigService.enableSandboxMode).toHaveBeenCalledWith(mockIdentityId, customConfig);
      
      const mockBalances = await sandboxWalletService.getMockBalances(mockIdentityId);
      expect(mockBalances).toEqual({
        QToken: { balance: 5000, locked: 0, staked: 0, pending: 0 },
        ETH: { balance: 50, locked: 0, staked: 0, pending: 0 }
      });
    });

    it('should disable sandbox mode', async () => {
      // First enable sandbox
      await sandboxWalletService.enableSandboxMode(mockIdentityId);
      expect(sandboxWalletService.isSandboxActive(mockIdentityId)).toBe(true);

      // Then disable it
      const success = await sandboxWalletService.disableSandboxMode(mockIdentityId);
      
      expect(success).toBe(true);
      expect(walletConfigService.disableSandboxMode).toHaveBeenCalledWith(mockIdentityId);
      expect(sandboxWalletService.isSandboxActive(mockIdentityId)).toBe(false);
    });

    it('should reset sandbox data', async () => {
      // Enable sandbox with mock data
      await sandboxWalletService.enableSandboxMode(mockIdentityId, {
        mockBalances: { QToken: 1000 },
        testingScenario: 'BASIC_TRANSFER'
      });

      // Add some mock transactions
      await sandboxWalletService.addMockTransaction(mockIdentityId, {
        type: 'SEND',
        amount: 100,
        token: 'QToken',
        to: 'test_recipient'
      });

      // Reset sandbox data
      const success = await sandboxWalletService.resetSandboxData(mockIdentityId);
      
      expect(success).toBe(true);
      expect(walletConfigService.resetSandboxData).toHaveBeenCalledWith(mockIdentityId);
      
      const mockBalances = await sandboxWalletService.getMockBalances(mockIdentityId);
      expect(mockBalances).toEqual({
        QToken: { balance: 1000, locked: 0, staked: 0, pending: 0 },
        ETH: { balance: 10, locked: 0, staked: 0, pending: 0 },
        USDC: { balance: 5000, locked: 0, staked: 0, pending: 0 }
      });
      
      const mockTransactions = await sandboxWalletService.getMockTransactions(mockIdentityId);
      expect(mockTransactions).toHaveLength(0);
    });

    it('should handle config service failures gracefully', async () => {
      vi.mocked(walletConfigService.enableSandboxMode).mockResolvedValue(false);
      
      const success = await sandboxWalletService.enableSandboxMode(mockIdentityId);
      
      expect(success).toBe(false);
      expect(sandboxWalletService.isSandboxActive(mockIdentityId)).toBe(false);
    });
  });

  describe('Mock Data Management', () => {
    beforeEach(async () => {
      await sandboxWalletService.enableSandboxMode(mockIdentityId);
    });

    it('should set mock balances', async () => {
      const balances = { QToken: 2000, ETH: 20, USDC: 10000 };
      
      const success = await sandboxWalletService.setMockBalances(mockIdentityId, balances);
      
      expect(success).toBe(true);
      
      const mockBalances = await sandboxWalletService.getMockBalances(mockIdentityId);
      expect(mockBalances).toEqual({
        QToken: { balance: 2000, locked: 0, staked: 0, pending: 0 },
        ETH: { balance: 20, locked: 0, staked: 0, pending: 0 },
        USDC: { balance: 10000, locked: 0, staked: 0, pending: 0 }
      });
    });

    it('should add mock transactions', async () => {
      const transactionId = await sandboxWalletService.addMockTransaction(mockIdentityId, {
        type: 'SEND',
        amount: 100,
        token: 'QToken',
        to: 'test_recipient',
        status: 'CONFIRMED'
      });
      
      expect(transactionId).toBeDefined();
      expect(typeof transactionId).toBe('string');
      
      const mockTransactions = await sandboxWalletService.getMockTransactions(mockIdentityId);
      expect(mockTransactions).toHaveLength(1);
      expect(mockTransactions[0]).toMatchObject({
        id: transactionId,
        identityId: mockIdentityId,
        type: 'SEND',
        amount: 100,
        token: 'QToken',
        to: 'test_recipient',
        status: 'CONFIRMED'
      });
    });

    it('should update balances when adding transactions', async () => {
      // Set initial balance
      await sandboxWalletService.setMockBalances(mockIdentityId, { QToken: 1000 });
      
      // Add send transaction
      await sandboxWalletService.addMockTransaction(mockIdentityId, {
        type: 'SEND',
        amount: 100,
        token: 'QToken',
        to: 'test_recipient'
      });
      
      const mockBalances = await sandboxWalletService.getMockBalances(mockIdentityId);
      expect(mockBalances?.QToken.balance).toBe(900);
      
      // Add receive transaction
      await sandboxWalletService.addMockTransaction(mockIdentityId, {
        type: 'RECEIVE',
        amount: 50,
        token: 'QToken',
        from: 'test_sender'
      });
      
      const updatedBalances = await sandboxWalletService.getMockBalances(mockIdentityId);
      expect(updatedBalances?.QToken.balance).toBe(950);
    });

    it('should handle staking transactions', async () => {
      await sandboxWalletService.setMockBalances(mockIdentityId, { QToken: 1000 });
      
      // Stake tokens
      await sandboxWalletService.addMockTransaction(mockIdentityId, {
        type: 'STAKE',
        amount: 500,
        token: 'QToken',
        to: 'validator_1'
      });
      
      const mockBalances = await sandboxWalletService.getMockBalances(mockIdentityId);
      expect(mockBalances?.QToken.balance).toBe(500);
      expect(mockBalances?.QToken.staked).toBe(500);
      
      // Unstake tokens
      await sandboxWalletService.addMockTransaction(mockIdentityId, {
        type: 'UNSTAKE',
        amount: 200,
        token: 'QToken',
        from: 'validator_1'
      });
      
      const updatedBalances = await sandboxWalletService.getMockBalances(mockIdentityId);
      expect(updatedBalances?.QToken.balance).toBe(700);
      expect(updatedBalances?.QToken.staked).toBe(300);
    });

    it('should return null for inactive sandbox', async () => {
      await sandboxWalletService.disableSandboxMode(mockIdentityId);
      
      const mockBalances = await sandboxWalletService.getMockBalances(mockIdentityId);
      expect(mockBalances).toBeNull();
      
      const mockTransactions = await sandboxWalletService.getMockTransactions(mockIdentityId);
      expect(mockTransactions).toEqual([]);
    });
  });

  describe('Testing Scenarios', () => {
    beforeEach(async () => {
      await sandboxWalletService.enableSandboxMode(mockIdentityId);
    });

    it('should start a testing scenario', async () => {
      const success = await sandboxWalletService.startTestingScenario(mockIdentityId, 'HIGH_VOLUME_TRADING');
      
      expect(success).toBe(true);
      expect(sandboxWalletService.getCurrentScenario(mockIdentityId)).toBe('HIGH_VOLUME_TRADING');
      
      const sandboxState = sandboxWalletService.getSandboxState(mockIdentityId);
      expect(sandboxState?.currentScenario).toBe('HIGH_VOLUME_TRADING');
      expect(sandboxState?.scenarioStartTime).toBeDefined();
    });

    it('should stop a testing scenario', async () => {
      await sandboxWalletService.startTestingScenario(mockIdentityId, 'HIGH_VOLUME_TRADING');
      
      const success = await sandboxWalletService.stopTestingScenario(mockIdentityId);
      
      expect(success).toBe(true);
      expect(sandboxWalletService.getCurrentScenario(mockIdentityId)).toBeNull();
    });

    it('should get available scenarios', () => {
      const scenarios = sandboxWalletService.getAvailableScenarios();
      
      expect(scenarios).toBeInstanceOf(Array);
      expect(scenarios.length).toBeGreaterThan(0);
      
      const highVolumeScenario = scenarios.find(s => s.name === 'HIGH_VOLUME_TRADING');
      expect(highVolumeScenario).toBeDefined();
      expect(highVolumeScenario?.description).toBeDefined();
      expect(highVolumeScenario?.initialBalances).toBeDefined();
    });

    it('should add custom scenarios', async () => {
      const customScenario = {
        name: 'CUSTOM_TEST',
        description: 'Custom test scenario',
        initialBalances: {
          QToken: { balance: 500, locked: 0, staked: 0, pending: 0 }
        },
        simulatedEvents: [],
        expectedOutcomes: ['Custom test outcome']
      };
      
      const success = await sandboxWalletService.addCustomScenario(customScenario);
      
      expect(success).toBe(true);
      
      const scenarios = sandboxWalletService.getAvailableScenarios();
      const addedScenario = scenarios.find(s => s.name === 'CUSTOM_TEST');
      expect(addedScenario).toBeDefined();
    });

    it('should handle invalid scenario names', async () => {
      const success = await sandboxWalletService.startTestingScenario(mockIdentityId, 'INVALID_SCENARIO');
      
      expect(success).toBe(false);
      expect(sandboxWalletService.getCurrentScenario(mockIdentityId)).toBeNull();
    });
  });

  describe('Simulation Controls', () => {
    beforeEach(async () => {
      await sandboxWalletService.enableSandboxMode(mockIdentityId);
    });

    it('should set simulated time', async () => {
      const testTime = '2024-01-01T12:00:00Z';
      
      const success = await sandboxWalletService.setSimulatedTime(mockIdentityId, testTime);
      
      expect(success).toBe(true);
      
      const sandboxState = sandboxWalletService.getSandboxState(mockIdentityId);
      expect(sandboxState?.simulatedTime).toBe(testTime);
    });

    it('should set network delay', async () => {
      const delay = 500;
      
      const success = await sandboxWalletService.setNetworkDelay(mockIdentityId, delay);
      
      expect(success).toBe(true);
      
      const sandboxState = sandboxWalletService.getSandboxState(mockIdentityId);
      expect(sandboxState?.networkDelay).toBe(delay);
    });

    it('should enable error simulation', async () => {
      const errorRate = 0.2;
      const errorTypes = ['NETWORK_ERROR', 'VALIDATION_ERROR'];
      
      const success = await sandboxWalletService.enableErrorSimulation(mockIdentityId, errorRate, errorTypes);
      
      expect(success).toBe(true);
      
      const sandboxState = sandboxWalletService.getSandboxState(mockIdentityId);
      expect(sandboxState?.errorSimulation.enabled).toBe(true);
      expect(sandboxState?.errorSimulation.errorRate).toBe(errorRate);
      expect(sandboxState?.errorSimulation.errorTypes).toEqual(errorTypes);
    });

    it('should disable error simulation', async () => {
      await sandboxWalletService.enableErrorSimulation(mockIdentityId, 0.1, ['NETWORK_ERROR']);
      
      const success = await sandboxWalletService.disableErrorSimulation(mockIdentityId);
      
      expect(success).toBe(true);
      
      const sandboxState = sandboxWalletService.getSandboxState(mockIdentityId);
      expect(sandboxState?.errorSimulation.enabled).toBe(false);
    });

    it('should clamp network delay to non-negative values', async () => {
      await sandboxWalletService.setNetworkDelay(mockIdentityId, -100);
      
      const sandboxState = sandboxWalletService.getSandboxState(mockIdentityId);
      expect(sandboxState?.networkDelay).toBe(0);
    });

    it('should clamp error rate to 0-1 range', async () => {
      await sandboxWalletService.enableErrorSimulation(mockIdentityId, 1.5, ['NETWORK_ERROR']);
      
      const sandboxState = sandboxWalletService.getSandboxState(mockIdentityId);
      expect(sandboxState?.errorSimulation.errorRate).toBe(1);
      
      await sandboxWalletService.enableErrorSimulation(mockIdentityId, -0.5, ['NETWORK_ERROR']);
      
      const updatedState = sandboxWalletService.getSandboxState(mockIdentityId);
      expect(updatedState?.errorSimulation.errorRate).toBe(0);
    });
  });

  describe('Transaction Simulation', () => {
    beforeEach(async () => {
      await sandboxWalletService.enableSandboxMode(mockIdentityId);
      await sandboxWalletService.setMockBalances(mockIdentityId, { QToken: 1000 });
    });

    it('should simulate successful transaction', async () => {
      const result = await sandboxWalletService.simulateTransaction(mockIdentityId, {
        type: 'SEND',
        amount: 100,
        token: 'QToken',
        to: 'test_recipient'
      });
      
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.gasEstimate).toBeGreaterThan(0);
      expect(result.balanceAfter).toBeDefined();
      expect(result.balanceAfter?.QToken.balance).toBe(900);
    });

    it('should validate transaction before simulation', async () => {
      const result = await sandboxWalletService.simulateTransaction(mockIdentityId, {
        type: 'SEND',
        amount: 2000, // More than available balance
        token: 'QToken',
        to: 'test_recipient'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance');
    });

    it('should validate positive amounts', async () => {
      const result = await sandboxWalletService.simulateTransaction(mockIdentityId, {
        type: 'SEND',
        amount: -100,
        token: 'QToken',
        to: 'test_recipient'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Amount must be positive');
    });

    it('should validate token existence', async () => {
      const result = await sandboxWalletService.simulateTransaction(mockIdentityId, {
        type: 'SEND',
        amount: 100,
        token: 'INVALID_TOKEN',
        to: 'test_recipient'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Token INVALID_TOKEN not found in sandbox');
    });

    it('should simulate network delay', async () => {
      await sandboxWalletService.setNetworkDelay(mockIdentityId, 200);
      
      const startTime = Date.now();
      await sandboxWalletService.simulateTransaction(mockIdentityId, {
        type: 'SEND',
        amount: 100,
        token: 'QToken',
        to: 'test_recipient'
      });
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(200);
    });

    it('should simulate errors when enabled', async () => {
      await sandboxWalletService.enableErrorSimulation(mockIdentityId, 1.0, ['NETWORK_ERROR']);
      
      const result = await sandboxWalletService.simulateTransaction(mockIdentityId, {
        type: 'SEND',
        amount: 100,
        token: 'QToken',
        to: 'test_recipient'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Simulated error');
    });

    it('should handle inactive sandbox', async () => {
      await sandboxWalletService.disableSandboxMode(mockIdentityId);
      
      const result = await sandboxWalletService.simulateTransaction(mockIdentityId, {
        type: 'SEND',
        amount: 100,
        token: 'QToken',
        to: 'test_recipient'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Sandbox not active');
    });
  });

  describe('State Queries', () => {
    it('should return correct sandbox active state', async () => {
      expect(sandboxWalletService.isSandboxActive(mockIdentityId)).toBe(false);
      
      await sandboxWalletService.enableSandboxMode(mockIdentityId);
      expect(sandboxWalletService.isSandboxActive(mockIdentityId)).toBe(true);
      
      await sandboxWalletService.disableSandboxMode(mockIdentityId);
      expect(sandboxWalletService.isSandboxActive(mockIdentityId)).toBe(false);
    });

    it('should return sandbox state', async () => {
      expect(sandboxWalletService.getSandboxState(mockIdentityId)).toBeNull();
      
      await sandboxWalletService.enableSandboxMode(mockIdentityId);
      const state = sandboxWalletService.getSandboxState(mockIdentityId);
      
      expect(state).toBeDefined();
      expect(state?.identityId).toBe(mockIdentityId);
      expect(state?.isActive).toBe(true);
    });

    it('should return current scenario', async () => {
      expect(sandboxWalletService.getCurrentScenario(mockIdentityId)).toBeNull();
      
      await sandboxWalletService.enableSandboxMode(mockIdentityId);
      await sandboxWalletService.startTestingScenario(mockIdentityId, 'HIGH_VOLUME_TRADING');
      
      expect(sandboxWalletService.getCurrentScenario(mockIdentityId)).toBe('HIGH_VOLUME_TRADING');
    });
  });
});