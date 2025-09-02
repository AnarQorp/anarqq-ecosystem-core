// Common testing utilities for Q ecosystem modules

export interface MockServiceConfig {
  port: number;
  responses?: Record<string, any>;
}

export class MockService {
  constructor(private config: MockServiceConfig) {}

  start(): Promise<void> {
    // Mock implementation
    return Promise.resolve();
  }

  stop(): Promise<void> {
    // Mock implementation
    return Promise.resolve();
  }
}

export const createMockIdentity = () => ({
  squidId: 'test-identity',
  subId: 'test-sub',
  daoId: 'test-dao'
});

export const createMockProfile = () => ({
  name: 'test-profile',
  rules: [
    {
      field: 'email',
      strategy: 'HASH' as const,
      params: { algorithm: 'sha256' }
    }
  ],
  defaults: {},
  version: '1.0.0'
});

// Contract Testing Exports
export * from './contract/ContractValidator';
export * from './contract/ContractTestRunner';
export * from './contract/TestReporter';
export * from './contract/EnhancedContractTestRunner';