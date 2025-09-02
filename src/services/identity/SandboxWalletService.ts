/**
 * Sandbox Wallet Service
 * Provides safe testing environment for wallet operations without real funds
 * Supports mock data, testing scenarios, and simulated time
 */

import { 
  WalletMode, 
  IdentityWalletConfig,
  WalletLimits,
  CustomTokenConfig 
} from '../../types/wallet-config';
import { ExtendedSquidIdentity, IdentityType } from '../../types/identity';
import { walletConfigService } from './WalletConfigService';

export interface SandboxTransaction {
  id: string;
  identityId: string;
  type: 'SEND' | 'RECEIVE' | 'MINT' | 'BURN' | 'STAKE' | 'UNSTAKE';
  amount: number;
  token: string;
  from: string;
  to: string;
  timestamp: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  gasUsed?: number;
  gasPrice?: number;
  blockNumber?: number;
  hash: string;
  metadata?: Record<string, any>;
}

export interface SandboxBalances {
  [tokenSymbol: string]: {
    balance: number;
    locked: number;
    staked: number;
    pending: number;
  };
}

export interface TestingScenario {
  name: string;
  description: string;
  initialBalances: SandboxBalances;
  simulatedEvents: SandboxEvent[];
  expectedOutcomes: string[];
  duration?: number; // minutes
  autoReset?: boolean;
}

export interface SandboxEvent {
  type: 'TRANSACTION' | 'BALANCE_CHANGE' | 'LIMIT_CHANGE' | 'ERROR' | 'NETWORK_DELAY';
  delay: number; // milliseconds from scenario start
  data: any;
  description: string;
}

export interface SandboxState {
  identityId: string;
  isActive: boolean;
  currentScenario?: string;
  scenarioStartTime?: string;
  mockBalances: SandboxBalances;
  mockTransactions: SandboxTransaction[];
  simulatedTime?: string;
  networkDelay: number;
  errorSimulation: {
    enabled: boolean;
    errorRate: number; // 0-1
    errorTypes: string[];
  };
  preserveState: boolean;
}

export class SandboxWalletService {
  private sandboxStates: Map<string, SandboxState> = new Map();
  private testingScenarios: Map<string, TestingScenario> = new Map();
  private scenarioTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultScenarios();
  }

  // Sandbox Mode Management
  async enableSandboxMode(
    identityId: string, 
    config?: Partial<WalletMode>
  ): Promise<boolean> {
    try {
      // Enable sandbox mode in wallet config
      const success = await walletConfigService.enableSandboxMode(identityId, config);
      if (!success) return false;

      // Initialize sandbox state
      const sandboxState: SandboxState = {
        identityId,
        isActive: true,
        mockBalances: config?.mockBalances ? this.convertToSandboxBalances(config.mockBalances) : this.getDefaultBalances(),
        mockTransactions: [],
        simulatedTime: config?.simulatedTime,
        networkDelay: 100, // Default 100ms delay
        errorSimulation: {
          enabled: false,
          errorRate: 0,
          errorTypes: []
        },
        preserveState: config?.preserveAuditLogs ?? false
      };

      this.sandboxStates.set(identityId, sandboxState);

      // Start testing scenario if specified
      if (config?.testingScenario) {
        await this.startTestingScenario(identityId, config.testingScenario);
      }

      return true;
    } catch (error) {
      console.error('[SandboxWalletService] Error enabling sandbox mode:', error);
      return false;
    }
  }

  async disableSandboxMode(identityId: string): Promise<boolean> {
    try {
      // Stop any running scenarios
      await this.stopTestingScenario(identityId);

      // Clear sandbox state
      this.sandboxStates.delete(identityId);

      // Disable sandbox mode in wallet config
      return await walletConfigService.disableSandboxMode(identityId);
    } catch (error) {
      console.error('[SandboxWalletService] Error disabling sandbox mode:', error);
      return false;
    }
  }

  async resetSandboxData(identityId: string): Promise<boolean> {
    try {
      const state = this.sandboxStates.get(identityId);
      if (!state) {
        throw new Error('Sandbox not active for identity');
      }

      // Stop current scenario
      await this.stopTestingScenario(identityId);

      // Reset state
      state.mockBalances = this.getDefaultBalances();
      state.mockTransactions = [];
      state.simulatedTime = undefined;
      state.currentScenario = undefined;
      state.scenarioStartTime = undefined;

      // Reset in config service
      return await walletConfigService.resetSandboxData(identityId);
    } catch (error) {
      console.error('[SandboxWalletService] Error resetting sandbox data:', error);
      return false;
    }
  }

  // Mock Data Management
  async setMockBalances(identityId: string, balances: Record<string, number>): Promise<boolean> {
    try {
      const state = this.sandboxStates.get(identityId);
      if (!state) return false;

      state.mockBalances = this.convertToSandboxBalances(balances);
      return true;
    } catch (error) {
      console.error('[SandboxWalletService] Error setting mock balances:', error);
      return false;
    }
  }

  async getMockBalances(identityId: string): Promise<SandboxBalances | null> {
    const state = this.sandboxStates.get(identityId);
    return state?.mockBalances || null;
  }

  async addMockTransaction(identityId: string, transaction: Partial<SandboxTransaction>): Promise<string> {
    const state = this.sandboxStates.get(identityId);
    if (!state) {
      throw new Error('Sandbox not active for identity');
    }

    const mockTransaction: SandboxTransaction = {
      id: this.generateTransactionId(),
      identityId,
      type: transaction.type || 'SEND',
      amount: transaction.amount || 0,
      token: transaction.token || 'QToken',
      from: transaction.from || 'sandbox_wallet',
      to: transaction.to || 'test_recipient',
      timestamp: this.getCurrentTime(identityId),
      status: transaction.status || 'CONFIRMED',
      hash: this.generateTransactionHash(),
      metadata: transaction.metadata || {}
    };

    state.mockTransactions.push(mockTransaction);

    // Update balances based on transaction
    this.updateBalancesFromTransaction(state, mockTransaction);

    return mockTransaction.id;
  }

  async getMockTransactions(identityId: string): Promise<SandboxTransaction[]> {
    const state = this.sandboxStates.get(identityId);
    return state?.mockTransactions || [];
  }

  // Testing Scenarios
  async startTestingScenario(identityId: string, scenarioName: string): Promise<boolean> {
    try {
      const scenario = this.testingScenarios.get(scenarioName);
      if (!scenario) {
        throw new Error(`Testing scenario '${scenarioName}' not found`);
      }

      const state = this.sandboxStates.get(identityId);
      if (!state) {
        throw new Error('Sandbox not active for identity');
      }

      // Stop any existing scenario
      await this.stopTestingScenario(identityId);

      // Set up scenario
      state.currentScenario = scenarioName;
      state.scenarioStartTime = new Date().toISOString();
      state.mockBalances = { ...scenario.initialBalances };

      // Schedule scenario events
      this.scheduleScenarioEvents(identityId, scenario);

      console.log(`[SandboxWalletService] Started testing scenario '${scenarioName}' for identity ${identityId}`);
      return true;
    } catch (error) {
      console.error('[SandboxWalletService] Error starting testing scenario:', error);
      return false;
    }
  }

  async stopTestingScenario(identityId: string): Promise<boolean> {
    try {
      const state = this.sandboxStates.get(identityId);
      if (!state || !state.currentScenario) return true;

      // Clear scenario timer
      const timerKey = `${identityId}_${state.currentScenario}`;
      const timer = this.scenarioTimers.get(timerKey);
      if (timer) {
        clearTimeout(timer);
        this.scenarioTimers.delete(timerKey);
      }

      // Clear scenario state
      state.currentScenario = undefined;
      state.scenarioStartTime = undefined;

      console.log(`[SandboxWalletService] Stopped testing scenario for identity ${identityId}`);
      return true;
    } catch (error) {
      console.error('[SandboxWalletService] Error stopping testing scenario:', error);
      return false;
    }
  }

  getAvailableScenarios(): TestingScenario[] {
    return Array.from(this.testingScenarios.values());
  }

  async addCustomScenario(scenario: TestingScenario): Promise<boolean> {
    try {
      this.testingScenarios.set(scenario.name, scenario);
      return true;
    } catch (error) {
      console.error('[SandboxWalletService] Error adding custom scenario:', error);
      return false;
    }
  }

  // Simulation Controls
  async setSimulatedTime(identityId: string, time: string): Promise<boolean> {
    const state = this.sandboxStates.get(identityId);
    if (!state) return false;

    state.simulatedTime = time;
    return true;
  }

  async setNetworkDelay(identityId: string, delayMs: number): Promise<boolean> {
    const state = this.sandboxStates.get(identityId);
    if (!state) return false;

    state.networkDelay = Math.max(0, delayMs);
    return true;
  }

  async enableErrorSimulation(
    identityId: string, 
    errorRate: number, 
    errorTypes: string[]
  ): Promise<boolean> {
    const state = this.sandboxStates.get(identityId);
    if (!state) return false;

    state.errorSimulation = {
      enabled: true,
      errorRate: Math.max(0, Math.min(1, errorRate)),
      errorTypes
    };
    return true;
  }

  async disableErrorSimulation(identityId: string): Promise<boolean> {
    const state = this.sandboxStates.get(identityId);
    if (!state) return false;

    state.errorSimulation.enabled = false;
    return true;
  }

  // Sandbox State Queries
  isSandboxActive(identityId: string): boolean {
    const state = this.sandboxStates.get(identityId);
    return state?.isActive || false;
  }

  getSandboxState(identityId: string): SandboxState | null {
    return this.sandboxStates.get(identityId) || null;
  }

  getCurrentScenario(identityId: string): string | null {
    const state = this.sandboxStates.get(identityId);
    return state?.currentScenario || null;
  }

  // Safe Transaction Simulation
  async simulateTransaction(
    identityId: string,
    transaction: {
      type: string;
      amount: number;
      token: string;
      to: string;
    }
  ): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
    gasEstimate?: number;
    balanceAfter?: SandboxBalances;
  }> {
    try {
      const state = this.sandboxStates.get(identityId);
      if (!state) {
        return { success: false, error: 'Sandbox not active' };
      }

      // Simulate network delay
      await this.delay(state.networkDelay);

      // Check for error simulation
      if (state.errorSimulation.enabled && Math.random() < state.errorSimulation.errorRate) {
        const errorType = state.errorSimulation.errorTypes[
          Math.floor(Math.random() * state.errorSimulation.errorTypes.length)
        ];
        return { success: false, error: `Simulated error: ${errorType}` };
      }

      // Validate transaction
      const validation = this.validateSandboxTransaction(state, transaction);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Create mock transaction
      const transactionId = await this.addMockTransaction(identityId, {
        type: transaction.type as any,
        amount: transaction.amount,
        token: transaction.token,
        to: transaction.to,
        status: 'CONFIRMED'
      });

      return {
        success: true,
        transactionId,
        gasEstimate: Math.floor(Math.random() * 50000) + 21000, // Mock gas estimate
        balanceAfter: state.mockBalances
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Private Helper Methods
  private initializeDefaultScenarios(): void {
    // High Volume Trading Scenario
    this.testingScenarios.set('HIGH_VOLUME_TRADING', {
      name: 'HIGH_VOLUME_TRADING',
      description: 'Simulates high-frequency trading with multiple tokens',
      initialBalances: {
        'QToken': { balance: 10000, locked: 0, staked: 0, pending: 0 },
        'ETH': { balance: 100, locked: 0, staked: 0, pending: 0 },
        'USDC': { balance: 50000, locked: 0, staked: 0, pending: 0 }
      },
      simulatedEvents: [
        {
          type: 'TRANSACTION',
          delay: 1000,
          data: { type: 'SEND', amount: 100, token: 'QToken', to: 'trader_1' },
          description: 'Initial trade'
        },
        {
          type: 'TRANSACTION',
          delay: 2000,
          data: { type: 'RECEIVE', amount: 50, token: 'ETH', from: 'trader_1' },
          description: 'Receive ETH'
        }
      ],
      expectedOutcomes: ['Balance changes tracked', 'Transaction limits respected'],
      duration: 10,
      autoReset: true
    });

    // Limit Testing Scenario
    this.testingScenarios.set('LIMIT_TESTING', {
      name: 'LIMIT_TESTING',
      description: 'Tests wallet limits and restrictions',
      initialBalances: {
        'QToken': { balance: 1000, locked: 0, staked: 0, pending: 0 }
      },
      simulatedEvents: [
        {
          type: 'TRANSACTION',
          delay: 500,
          data: { type: 'SEND', amount: 999, token: 'QToken', to: 'test_recipient' },
          description: 'Large transaction near limit'
        },
        {
          type: 'TRANSACTION',
          delay: 1000,
          data: { type: 'SEND', amount: 100, token: 'QToken', to: 'test_recipient' },
          description: 'Transaction exceeding remaining balance'
        }
      ],
      expectedOutcomes: ['First transaction succeeds', 'Second transaction fails'],
      duration: 5
    });

    // Error Handling Scenario
    this.testingScenarios.set('ERROR_HANDLING', {
      name: 'ERROR_HANDLING',
      description: 'Tests error handling and recovery mechanisms',
      initialBalances: {
        'QToken': { balance: 500, locked: 0, staked: 0, pending: 0 }
      },
      simulatedEvents: [
        {
          type: 'ERROR',
          delay: 1000,
          data: { type: 'NETWORK_ERROR', message: 'Connection timeout' },
          description: 'Network error simulation'
        },
        {
          type: 'ERROR',
          delay: 2000,
          data: { type: 'VALIDATION_ERROR', message: 'Invalid recipient' },
          description: 'Validation error simulation'
        }
      ],
      expectedOutcomes: ['Errors handled gracefully', 'Recovery mechanisms triggered'],
      duration: 5
    });
  }

  private convertToSandboxBalances(balances: Record<string, number>): SandboxBalances {
    const sandboxBalances: SandboxBalances = {};
    for (const [token, amount] of Object.entries(balances)) {
      sandboxBalances[token] = {
        balance: amount,
        locked: 0,
        staked: 0,
        pending: 0
      };
    }
    return sandboxBalances;
  }

  private getDefaultBalances(): SandboxBalances {
    return {
      'QToken': { balance: 1000, locked: 0, staked: 0, pending: 0 },
      'ETH': { balance: 10, locked: 0, staked: 0, pending: 0 },
      'USDC': { balance: 5000, locked: 0, staked: 0, pending: 0 }
    };
  }

  private scheduleScenarioEvents(identityId: string, scenario: TestingScenario): void {
    const timerKey = `${identityId}_${scenario.name}`;
    
    scenario.simulatedEvents.forEach((event, index) => {
      const timer = setTimeout(async () => {
        await this.executeScenarioEvent(identityId, event);
      }, event.delay);
      
      // Store timer for cleanup (using a composite key for multiple events)
      this.scenarioTimers.set(`${timerKey}_${index}`, timer);
    });

    // Auto-reset timer if enabled
    if (scenario.autoReset && scenario.duration) {
      const resetTimer = setTimeout(async () => {
        await this.resetSandboxData(identityId);
        await this.startTestingScenario(identityId, scenario.name);
      }, scenario.duration * 60 * 1000);
      
      this.scenarioTimers.set(`${timerKey}_reset`, resetTimer);
    }
  }

  private async executeScenarioEvent(identityId: string, event: SandboxEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'TRANSACTION':
          await this.addMockTransaction(identityId, event.data);
          break;
        case 'BALANCE_CHANGE':
          await this.setMockBalances(identityId, event.data);
          break;
        case 'ERROR':
          console.log(`[SandboxWalletService] Simulated error for ${identityId}:`, event.data);
          break;
        case 'NETWORK_DELAY':
          await this.setNetworkDelay(identityId, event.data.delay);
          break;
      }
    } catch (error) {
      console.error('[SandboxWalletService] Error executing scenario event:', error);
    }
  }

  private updateBalancesFromTransaction(state: SandboxState, transaction: SandboxTransaction): void {
    const tokenBalance = state.mockBalances[transaction.token];
    if (!tokenBalance) return;

    switch (transaction.type) {
      case 'SEND':
        tokenBalance.balance = Math.max(0, tokenBalance.balance - transaction.amount);
        break;
      case 'RECEIVE':
        tokenBalance.balance += transaction.amount;
        break;
      case 'STAKE':
        tokenBalance.balance = Math.max(0, tokenBalance.balance - transaction.amount);
        tokenBalance.staked += transaction.amount;
        break;
      case 'UNSTAKE':
        tokenBalance.staked = Math.max(0, tokenBalance.staked - transaction.amount);
        tokenBalance.balance += transaction.amount;
        break;
    }
  }

  private validateSandboxTransaction(
    state: SandboxState, 
    transaction: { amount: number; token: string; type: string }
  ): { valid: boolean; error?: string } {
    const tokenBalance = state.mockBalances[transaction.token];
    if (!tokenBalance) {
      return { valid: false, error: `Token ${transaction.token} not found in sandbox` };
    }

    if (transaction.type === 'SEND' && tokenBalance.balance < transaction.amount) {
      return { valid: false, error: 'Insufficient balance' };
    }

    if (transaction.amount <= 0) {
      return { valid: false, error: 'Amount must be positive' };
    }

    return { valid: true };
  }

  private getCurrentTime(identityId: string): string {
    const state = this.sandboxStates.get(identityId);
    return state?.simulatedTime || new Date().toISOString();
  }

  private generateTransactionId(): string {
    return `sandbox_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTransactionHash(): string {
    return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const sandboxWalletService = new SandboxWalletService();