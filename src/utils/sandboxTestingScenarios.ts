/**
 * Sandbox Testing Scenarios Utility
 * Provides predefined testing scenarios and utilities for creating custom scenarios
 */

import { TestingScenario, SandboxEvent, SandboxBalances } from '../services/identity/SandboxWalletService';
import { IdentityType } from '../types/identity';

export interface ScenarioTemplate {
  name: string;
  description: string;
  category: 'BASIC' | 'ADVANCED' | 'STRESS' | 'ERROR' | 'COMPLIANCE';
  identityTypes: IdentityType[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedDuration: number; // minutes
  learningObjectives: string[];
  scenario: TestingScenario;
}

export class SandboxTestingScenarios {
  private static scenarios: Map<string, ScenarioTemplate> = new Map();

  static {
    this.initializeScenarios();
  }

  // Get all available scenarios
  static getAllScenarios(): ScenarioTemplate[] {
    return Array.from(this.scenarios.values());
  }

  // Get scenarios by category
  static getScenariosByCategory(category: string): ScenarioTemplate[] {
    return this.getAllScenarios().filter(s => s.category === category);
  }

  // Get scenarios by identity type
  static getScenariosByIdentityType(identityType: IdentityType): ScenarioTemplate[] {
    return this.getAllScenarios().filter(s => 
      s.identityTypes.includes(identityType) || s.identityTypes.includes('ROOT' as IdentityType)
    );
  }

  // Get scenario by name
  static getScenario(name: string): ScenarioTemplate | null {
    return this.scenarios.get(name) || null;
  }

  // Create custom scenario
  static createCustomScenario(
    name: string,
    description: string,
    initialBalances: SandboxBalances,
    events: SandboxEvent[],
    options: {
      duration?: number;
      autoReset?: boolean;
      expectedOutcomes?: string[];
      category?: string;
      identityTypes?: IdentityType[];
      difficulty?: string;
      learningObjectives?: string[];
    } = {}
  ): ScenarioTemplate {
    const scenario: TestingScenario = {
      name,
      description,
      initialBalances,
      simulatedEvents: events,
      expectedOutcomes: options.expectedOutcomes || [],
      duration: options.duration,
      autoReset: options.autoReset
    };

    const template: ScenarioTemplate = {
      name,
      description,
      category: (options.category as any) || 'BASIC',
      identityTypes: options.identityTypes || ['ROOT' as IdentityType],
      difficulty: (options.difficulty as any) || 'BEGINNER',
      estimatedDuration: options.duration || 5,
      learningObjectives: options.learningObjectives || [],
      scenario
    };

    this.scenarios.set(name, template);
    return template;
  }

  // Initialize predefined scenarios
  private static initializeScenarios(): void {
    // Basic Transfer Scenario
    this.scenarios.set('BASIC_TRANSFER', {
      name: 'BASIC_TRANSFER',
      description: 'Learn basic token transfers in a safe environment',
      category: 'BASIC',
      identityTypes: ['ROOT', 'DAO', 'ENTERPRISE'] as IdentityType[],
      difficulty: 'BEGINNER',
      estimatedDuration: 5,
      learningObjectives: [
        'Understand token transfer mechanics',
        'Learn about transaction fees',
        'Practice wallet balance management'
      ],
      scenario: {
        name: 'BASIC_TRANSFER',
        description: 'Learn basic token transfers in a safe environment',
        initialBalances: {
          'QToken': { balance: 1000, locked: 0, staked: 0, pending: 0 },
          'ETH': { balance: 10, locked: 0, staked: 0, pending: 0 }
        },
        simulatedEvents: [
          {
            type: 'TRANSACTION',
            delay: 2000,
            data: { type: 'SEND', amount: 100, token: 'QToken', to: 'tutorial_recipient' },
            description: 'Send 100 QToken to tutorial recipient'
          },
          {
            type: 'TRANSACTION',
            delay: 4000,
            data: { type: 'RECEIVE', amount: 50, token: 'ETH', from: 'tutorial_sender' },
            description: 'Receive 50 ETH from tutorial sender'
          }
        ],
        expectedOutcomes: [
          'QToken balance decreases by 100',
          'ETH balance increases by 50',
          'Transaction history shows both transfers'
        ],
        duration: 5,
        autoReset: false
      }
    });

    // High Volume Trading
    this.scenarios.set('HIGH_VOLUME_TRADING', {
      name: 'HIGH_VOLUME_TRADING',
      description: 'Simulate high-frequency trading with multiple tokens',
      category: 'STRESS',
      identityTypes: ['ROOT', 'DAO'] as IdentityType[],
      difficulty: 'ADVANCED',
      estimatedDuration: 15,
      learningObjectives: [
        'Handle high transaction volumes',
        'Understand rate limiting',
        'Monitor system performance under load'
      ],
      scenario: {
        name: 'HIGH_VOLUME_TRADING',
        description: 'Simulate high-frequency trading with multiple tokens',
        initialBalances: {
          'QToken': { balance: 50000, locked: 0, staked: 0, pending: 0 },
          'ETH': { balance: 500, locked: 0, staked: 0, pending: 0 },
          'USDC': { balance: 100000, locked: 0, staked: 0, pending: 0 }
        },
        simulatedEvents: this.generateHighVolumeEvents(),
        expectedOutcomes: [
          'All transactions processed correctly',
          'Rate limits respected',
          'Balance consistency maintained'
        ],
        duration: 15,
        autoReset: true
      }
    });

    // Limit Testing
    this.scenarios.set('LIMIT_TESTING', {
      name: 'LIMIT_TESTING',
      description: 'Test wallet limits and restrictions for different identity types',
      category: 'COMPLIANCE',
      identityTypes: ['CONSENTIDA', 'ENTERPRISE'] as IdentityType[],
      difficulty: 'INTERMEDIATE',
      estimatedDuration: 10,
      learningObjectives: [
        'Understand identity-based limits',
        'Learn about governance restrictions',
        'Practice compliance scenarios'
      ],
      scenario: {
        name: 'LIMIT_TESTING',
        description: 'Test wallet limits and restrictions for different identity types',
        initialBalances: {
          'QToken': { balance: 1000, locked: 0, staked: 0, pending: 0 }
        },
        simulatedEvents: [
          {
            type: 'TRANSACTION',
            delay: 1000,
            data: { type: 'SEND', amount: 500, token: 'QToken', to: 'limit_test_1' },
            description: 'Test transaction within limits'
          },
          {
            type: 'TRANSACTION',
            delay: 3000,
            data: { type: 'SEND', amount: 600, token: 'QToken', to: 'limit_test_2' },
            description: 'Test transaction exceeding daily limit'
          },
          {
            type: 'LIMIT_CHANGE',
            delay: 5000,
            data: { dailyTransferLimit: 2000 },
            description: 'Increase daily limit via governance'
          },
          {
            type: 'TRANSACTION',
            delay: 6000,
            data: { type: 'SEND', amount: 400, token: 'QToken', to: 'limit_test_3' },
            description: 'Test transaction with new limits'
          }
        ],
        expectedOutcomes: [
          'First transaction succeeds',
          'Second transaction fails due to limits',
          'Third transaction succeeds after limit increase'
        ],
        duration: 10,
        autoReset: false
      }
    });

    // Error Handling
    this.scenarios.set('ERROR_HANDLING', {
      name: 'ERROR_HANDLING',
      description: 'Test error handling and recovery mechanisms',
      category: 'ERROR',
      identityTypes: ['ROOT', 'DAO', 'ENTERPRISE'] as IdentityType[],
      difficulty: 'INTERMEDIATE',
      estimatedDuration: 8,
      learningObjectives: [
        'Understand error types and handling',
        'Learn recovery mechanisms',
        'Practice error scenario responses'
      ],
      scenario: {
        name: 'ERROR_HANDLING',
        description: 'Test error handling and recovery mechanisms',
        initialBalances: {
          'QToken': { balance: 1000, locked: 0, staked: 0, pending: 0 }
        },
        simulatedEvents: [
          {
            type: 'TRANSACTION',
            delay: 1000,
            data: { type: 'SEND', amount: 100, token: 'QToken', to: 'valid_recipient' },
            description: 'Normal transaction'
          },
          {
            type: 'ERROR',
            delay: 2000,
            data: { type: 'NETWORK_ERROR', message: 'Connection timeout', recoverable: true },
            description: 'Simulate network error'
          },
          {
            type: 'TRANSACTION',
            delay: 4000,
            data: { type: 'SEND', amount: 200, token: 'QToken', to: 'invalid_recipient' },
            description: 'Transaction to invalid recipient'
          },
          {
            type: 'ERROR',
            delay: 5000,
            data: { type: 'VALIDATION_ERROR', message: 'Invalid recipient address', recoverable: false },
            description: 'Simulate validation error'
          }
        ],
        expectedOutcomes: [
          'Normal transaction succeeds',
          'Network error triggers retry mechanism',
          'Validation error shows appropriate user message'
        ],
        duration: 8,
        autoReset: false
      }
    });

    // Multi-Chain Operations
    this.scenarios.set('MULTI_CHAIN', {
      name: 'MULTI_CHAIN',
      description: 'Test multi-chain token operations and cross-chain transfers',
      category: 'ADVANCED',
      identityTypes: ['ROOT', 'DAO'] as IdentityType[],
      difficulty: 'ADVANCED',
      estimatedDuration: 20,
      learningObjectives: [
        'Understand multi-chain operations',
        'Learn cross-chain transfer mechanics',
        'Practice chain-specific validations'
      ],
      scenario: {
        name: 'MULTI_CHAIN',
        description: 'Test multi-chain token operations and cross-chain transfers',
        initialBalances: {
          'QToken': { balance: 1000, locked: 0, staked: 0, pending: 0 },
          'ETH': { balance: 10, locked: 0, staked: 0, pending: 0 },
          'BTC': { balance: 1, locked: 0, staked: 0, pending: 0 },
          'USDC': { balance: 5000, locked: 0, staked: 0, pending: 0 }
        },
        simulatedEvents: [
          {
            type: 'TRANSACTION',
            delay: 2000,
            data: { type: 'SEND', amount: 0.5, token: 'BTC', to: 'btc_recipient', chain: 'BTC' },
            description: 'Bitcoin transfer'
          },
          {
            type: 'TRANSACTION',
            delay: 4000,
            data: { type: 'SEND', amount: 5, token: 'ETH', to: 'eth_recipient', chain: 'ETH' },
            description: 'Ethereum transfer'
          },
          {
            type: 'TRANSACTION',
            delay: 6000,
            data: { type: 'SEND', amount: 1000, token: 'USDC', to: 'usdc_recipient', chain: 'ETH' },
            description: 'USDC transfer on Ethereum'
          }
        ],
        expectedOutcomes: [
          'All chain-specific transfers succeed',
          'Gas fees calculated correctly for each chain',
          'Cross-chain validations work properly'
        ],
        duration: 20,
        autoReset: false
      }
    });

    // Staking Operations
    this.scenarios.set('STAKING_OPERATIONS', {
      name: 'STAKING_OPERATIONS',
      description: 'Learn staking and unstaking operations with rewards',
      category: 'BASIC',
      identityTypes: ['ROOT', 'DAO', 'ENTERPRISE'] as IdentityType[],
      difficulty: 'INTERMEDIATE',
      estimatedDuration: 12,
      learningObjectives: [
        'Understand staking mechanics',
        'Learn about staking rewards',
        'Practice unstaking procedures'
      ],
      scenario: {
        name: 'STAKING_OPERATIONS',
        description: 'Learn staking and unstaking operations with rewards',
        initialBalances: {
          'QToken': { balance: 2000, locked: 0, staked: 0, pending: 0 }
        },
        simulatedEvents: [
          {
            type: 'TRANSACTION',
            delay: 2000,
            data: { type: 'STAKE', amount: 1000, token: 'QToken', validator: 'validator_1' },
            description: 'Stake 1000 QToken'
          },
          {
            type: 'BALANCE_CHANGE',
            delay: 8000,
            data: { 'QToken': { balance: 1000, locked: 0, staked: 1050, pending: 0 } },
            description: 'Staking rewards earned'
          },
          {
            type: 'TRANSACTION',
            delay: 10000,
            data: { type: 'UNSTAKE', amount: 500, token: 'QToken', validator: 'validator_1' },
            description: 'Unstake 500 QToken'
          }
        ],
        expectedOutcomes: [
          'Tokens successfully staked',
          'Staking rewards accumulated',
          'Partial unstaking works correctly'
        ],
        duration: 12,
        autoReset: false
      }
    });

    // Governance Participation
    this.scenarios.set('GOVERNANCE_PARTICIPATION', {
      name: 'GOVERNANCE_PARTICIPATION',
      description: 'Participate in DAO governance and voting',
      category: 'ADVANCED',
      identityTypes: ['DAO'] as IdentityType[],
      difficulty: 'ADVANCED',
      estimatedDuration: 15,
      learningObjectives: [
        'Understand DAO governance',
        'Learn voting mechanisms',
        'Practice proposal creation'
      ],
      scenario: {
        name: 'GOVERNANCE_PARTICIPATION',
        description: 'Participate in DAO governance and voting',
        initialBalances: {
          'QToken': { balance: 5000, locked: 0, staked: 0, pending: 0 },
          'GOV_TOKEN': { balance: 1000, locked: 0, staked: 0, pending: 0 }
        },
        simulatedEvents: [
          {
            type: 'TRANSACTION',
            delay: 2000,
            data: { type: 'VOTE', proposalId: 'prop_001', choice: 'YES', weight: 500 },
            description: 'Vote on governance proposal'
          },
          {
            type: 'TRANSACTION',
            delay: 5000,
            data: { type: 'DELEGATE', amount: 300, token: 'GOV_TOKEN', delegate: 'trusted_delegate' },
            description: 'Delegate voting power'
          },
          {
            type: 'TRANSACTION',
            delay: 8000,
            data: { type: 'CREATE_PROPOSAL', title: 'Test Proposal', description: 'Test governance proposal' },
            description: 'Create new governance proposal'
          }
        ],
        expectedOutcomes: [
          'Vote successfully cast',
          'Voting power delegated',
          'New proposal created'
        ],
        duration: 15,
        autoReset: false
      }
    });
  }

  // Generate high volume trading events
  private static generateHighVolumeEvents(): SandboxEvent[] {
    const events: SandboxEvent[] = [];
    const tokens = ['QToken', 'ETH', 'USDC'];
    const recipients = ['trader_1', 'trader_2', 'trader_3', 'market_maker'];

    for (let i = 0; i < 50; i++) {
      const delay = 500 + (i * 200); // Stagger events every 200ms
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      const recipient = recipients[Math.floor(Math.random() * recipients.length)];
      const amount = Math.floor(Math.random() * 100) + 10;

      events.push({
        type: 'TRANSACTION',
        delay,
        data: { 
          type: Math.random() > 0.5 ? 'SEND' : 'RECEIVE', 
          amount, 
          token, 
          to: recipient 
        },
        description: `High volume trade ${i + 1}: ${amount} ${token}`
      });
    }

    return events;
  }

  // Utility methods for scenario creation
  static createBalanceChangeEvent(
    delay: number, 
    balances: SandboxBalances, 
    description: string
  ): SandboxEvent {
    return {
      type: 'BALANCE_CHANGE',
      delay,
      data: balances,
      description
    };
  }

  static createTransactionEvent(
    delay: number,
    type: string,
    amount: number,
    token: string,
    target: string,
    description: string
  ): SandboxEvent {
    return {
      type: 'TRANSACTION',
      delay,
      data: { type, amount, token, to: target },
      description
    };
  }

  static createErrorEvent(
    delay: number,
    errorType: string,
    message: string,
    recoverable: boolean = true
  ): SandboxEvent {
    return {
      type: 'ERROR',
      delay,
      data: { type: errorType, message, recoverable },
      description: `Simulated ${errorType}: ${message}`
    };
  }

  static createNetworkDelayEvent(
    delay: number,
    networkDelay: number,
    description: string
  ): SandboxEvent {
    return {
      type: 'NETWORK_DELAY',
      delay,
      data: { delay: networkDelay },
      description
    };
  }
}

// Export utility functions
export const {
  getAllScenarios,
  getScenariosByCategory,
  getScenariosByIdentityType,
  getScenario,
  createCustomScenario,
  createBalanceChangeEvent,
  createTransactionEvent,
  createErrorEvent,
  createNetworkDelayEvent
} = SandboxTestingScenarios;