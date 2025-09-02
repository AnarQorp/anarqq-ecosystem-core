/**
 * Mock Qwallet Service
 * Simulates Qwallet payment functionality
 */

export class MockQwalletService {
  constructor(options = {}) {
    this.integrated = options.integrated || false;
  }

  async initialize() {
    console.log(`[MockQwallet] Initializing ${this.integrated ? 'integrated' : 'standalone'} mode`);
    return true;
  }

  async checkBalance(squidId) {
    console.log(`[MockQwallet] Checking balance for ${squidId}`);
    return true; // Always has balance for demo
  }

  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mode: this.integrated ? 'integrated' : 'standalone'
    };
  }

  async shutdown() {
    console.log('[MockQwallet] Shutting down');
  }
}