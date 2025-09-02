/**
 * Integration test for Sandbox Wallet functionality
 * Tests the complete sandbox workflow from enabling to transaction simulation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sandboxWalletService } from '../SandboxWalletService';
import { walletConfigService } from '../WalletConfigService';

// Mock the wallet config service
vi.mock('../WalletConfigService', () => ({
  walletConfigService: {
    enableSandboxMode: vi.fn(),
    disableSandboxMode: vi.fn(),
    resetSandboxData: vi.fn()
  }
}));

describe('Sandbox Wallet Integration', () => {
  const testIdentityId = 'integration-test-identity';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(walletConfigService.enableSandboxMode).mockResolvedValue(true);
    vi.mocked(walletConfigService.disableSandboxMode).mockResolvedValue(true);
    vi.mocked(walletConfigService.resetSandboxData).mockResolvedValue(true);
  });

  afterEach(async () => {
    // Clean up sandbox state
    await sandboxWalletService.disableSandboxMode(testIdentityId);
  });

  it('should complete a full sandbox workflow', async () => {
    // 1. Enable sandbox mode
    const enableSuccess = await sandboxWalletService.enableSandboxMode(testIdentityId, {
      mockBalances: { QToken: 1000, ETH: 10 },
      debugLogging: true,
      allowReset: true
    });
    expect(enableSuccess).toBe(true);
    expect(sandboxWalletService.isSandboxActive(testIdentityId)).toBe(true);

    // 2. Verify initial balances
    const initialBalances = await sandboxWalletService.getMockBalances(testIdentityId);
    expect(initialBalances).toEqual({
      QToken: { balance: 1000, locked: 0, staked: 0, pending: 0 },
      ETH: { balance: 10, locked: 0, staked: 0, pending: 0 }
    });

    // 3. Simulate a transaction
    const transactionResult = await sandboxWalletService.simulateTransaction(testIdentityId, {
      type: 'SEND',
      amount: 100,
      token: 'QToken',
      to: 'test_recipient'
    });
    expect(transactionResult.success).toBe(true);
    expect(transactionResult.transactionId).toBeDefined();

    // 4. Verify balance was updated
    const updatedBalances = await sandboxWalletService.getMockBalances(testIdentityId);
    expect(updatedBalances?.QToken.balance).toBe(900);

    // 5. Verify transaction was recorded
    const transactions = await sandboxWalletService.getMockTransactions(testIdentityId);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      type: 'SEND',
      amount: 100,
      token: 'QToken',
      to: 'test_recipient',
      status: 'CONFIRMED'
    });

    // 6. Test scenario execution
    const scenarioSuccess = await sandboxWalletService.startTestingScenario(
      testIdentityId, 
      'HIGH_VOLUME_TRADING'
    );
    expect(scenarioSuccess).toBe(true);
    expect(sandboxWalletService.getCurrentScenario(testIdentityId)).toBe('HIGH_VOLUME_TRADING');

    // 7. Stop scenario
    const stopSuccess = await sandboxWalletService.stopTestingScenario(testIdentityId);
    expect(stopSuccess).toBe(true);
    expect(sandboxWalletService.getCurrentScenario(testIdentityId)).toBeNull();

    // 8. Test simulation controls
    await sandboxWalletService.setNetworkDelay(testIdentityId, 200);
    await sandboxWalletService.enableErrorSimulation(testIdentityId, 0.5, ['NETWORK_ERROR']);
    
    const sandboxState = sandboxWalletService.getSandboxState(testIdentityId);
    expect(sandboxState?.networkDelay).toBe(200);
    expect(sandboxState?.errorSimulation.enabled).toBe(true);
    expect(sandboxState?.errorSimulation.errorRate).toBe(0.5);

    // 9. Reset sandbox data
    const resetSuccess = await sandboxWalletService.resetSandboxData(testIdentityId);
    expect(resetSuccess).toBe(true);

    const resetBalances = await sandboxWalletService.getMockBalances(testIdentityId);
    expect(resetBalances?.QToken.balance).toBe(1000); // Back to default
    
    const resetTransactions = await sandboxWalletService.getMockTransactions(testIdentityId);
    expect(resetTransactions).toHaveLength(0);

    // 10. Disable sandbox mode
    const disableSuccess = await sandboxWalletService.disableSandboxMode(testIdentityId);
    expect(disableSuccess).toBe(true);
    expect(sandboxWalletService.isSandboxActive(testIdentityId)).toBe(false);
  });

  it('should handle error scenarios gracefully', async () => {
    // Enable sandbox
    await sandboxWalletService.enableSandboxMode(testIdentityId, {
      mockBalances: { QToken: 100 }
    });

    // Test insufficient balance
    const insufficientResult = await sandboxWalletService.simulateTransaction(testIdentityId, {
      type: 'SEND',
      amount: 200, // More than available
      token: 'QToken',
      to: 'test_recipient'
    });
    expect(insufficientResult.success).toBe(false);
    expect(insufficientResult.error).toBe('Insufficient balance');

    // Test invalid token
    const invalidTokenResult = await sandboxWalletService.simulateTransaction(testIdentityId, {
      type: 'SEND',
      amount: 50,
      token: 'INVALID_TOKEN',
      to: 'test_recipient'
    });
    expect(invalidTokenResult.success).toBe(false);
    expect(invalidTokenResult.error).toBe('Token INVALID_TOKEN not found in sandbox');

    // Test negative amount
    const negativeAmountResult = await sandboxWalletService.simulateTransaction(testIdentityId, {
      type: 'SEND',
      amount: -10,
      token: 'QToken',
      to: 'test_recipient'
    });
    expect(negativeAmountResult.success).toBe(false);
    expect(negativeAmountResult.error).toBe('Amount must be positive');

    // Test error simulation
    await sandboxWalletService.enableErrorSimulation(testIdentityId, 1.0, ['NETWORK_ERROR']);
    
    const errorSimResult = await sandboxWalletService.simulateTransaction(testIdentityId, {
      type: 'SEND',
      amount: 50,
      token: 'QToken',
      to: 'test_recipient'
    });
    expect(errorSimResult.success).toBe(false);
    expect(errorSimResult.error).toContain('Simulated error');
  });

  it('should handle multiple identities independently', async () => {
    const identity1 = 'identity-1';
    const identity2 = 'identity-2';

    // Enable sandbox for both identities with different configurations
    await sandboxWalletService.enableSandboxMode(identity1, {
      mockBalances: { QToken: 1000 }
    });
    
    await sandboxWalletService.enableSandboxMode(identity2, {
      mockBalances: { ETH: 50 }
    });

    // Verify both are active
    expect(sandboxWalletService.isSandboxActive(identity1)).toBe(true);
    expect(sandboxWalletService.isSandboxActive(identity2)).toBe(true);

    // Verify different balances
    const balances1 = await sandboxWalletService.getMockBalances(identity1);
    const balances2 = await sandboxWalletService.getMockBalances(identity2);
    
    expect(balances1?.QToken?.balance).toBe(1000);
    expect(balances1?.ETH).toBeUndefined();
    
    expect(balances2?.ETH?.balance).toBe(50);
    expect(balances2?.QToken).toBeUndefined();

    // Perform transactions on each
    await sandboxWalletService.simulateTransaction(identity1, {
      type: 'SEND',
      amount: 100,
      token: 'QToken',
      to: 'recipient1'
    });

    await sandboxWalletService.simulateTransaction(identity2, {
      type: 'SEND',
      amount: 5,
      token: 'ETH',
      to: 'recipient2'
    });

    // Verify transactions are isolated
    const transactions1 = await sandboxWalletService.getMockTransactions(identity1);
    const transactions2 = await sandboxWalletService.getMockTransactions(identity2);

    expect(transactions1).toHaveLength(1);
    expect(transactions1[0].token).toBe('QToken');
    
    expect(transactions2).toHaveLength(1);
    expect(transactions2[0].token).toBe('ETH');

    // Clean up
    await sandboxWalletService.disableSandboxMode(identity1);
    await sandboxWalletService.disableSandboxMode(identity2);
  });

  it('should handle network delay simulation', async () => {
    await sandboxWalletService.enableSandboxMode(testIdentityId, {
      mockBalances: { QToken: 1000 }
    });

    // Set network delay
    await sandboxWalletService.setNetworkDelay(testIdentityId, 100);

    // Measure transaction time
    const startTime = Date.now();
    await sandboxWalletService.simulateTransaction(testIdentityId, {
      type: 'SEND',
      amount: 100,
      token: 'QToken',
      to: 'test_recipient'
    });
    const endTime = Date.now();

    // Should take at least the network delay time
    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
  });

  it('should handle custom scenarios', async () => {
    await sandboxWalletService.enableSandboxMode(testIdentityId);

    // Add custom scenario
    const customScenario = {
      name: 'CUSTOM_INTEGRATION_TEST',
      description: 'Custom scenario for integration testing',
      initialBalances: {
        QToken: { balance: 500, locked: 0, staked: 0, pending: 0 }
      },
      simulatedEvents: [],
      expectedOutcomes: ['Custom scenario executed']
    };

    const addSuccess = await sandboxWalletService.addCustomScenario(customScenario);
    expect(addSuccess).toBe(true);

    // Verify scenario is available
    const scenarios = sandboxWalletService.getAvailableScenarios();
    const addedScenario = scenarios.find(s => s.name === 'CUSTOM_INTEGRATION_TEST');
    expect(addedScenario).toBeDefined();

    // Start custom scenario
    const startSuccess = await sandboxWalletService.startTestingScenario(
      testIdentityId, 
      'CUSTOM_INTEGRATION_TEST'
    );
    expect(startSuccess).toBe(true);
    expect(sandboxWalletService.getCurrentScenario(testIdentityId)).toBe('CUSTOM_INTEGRATION_TEST');

    // Verify scenario balances were applied
    const balances = await sandboxWalletService.getMockBalances(testIdentityId);
    expect(balances?.QToken.balance).toBe(500);
  });
});