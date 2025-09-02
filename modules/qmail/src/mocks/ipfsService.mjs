/**
 * Mock IPFS Service
 * Simulates IPFS storage functionality
 */

export class MockIPFSService {
  constructor(options = {}) {
    this.integrated = options.integrated || false;
    this.storage = new Map();
  }

  async initialize() {
    console.log(`[MockIPFS] Initializing ${this.integrated ? 'integrated' : 'standalone'} mode`);
    return true;
  }

  async storeMessage(message) {
    const cid = `Qm${Math.random().toString(36).substr(2, 44)}`;
    this.storage.set(cid, message);
    console.log(`[MockIPFS] Message stored with CID: ${cid}`);
    return cid;
  }

  async storeReceipt(receipt) {
    const cid = `Qm${Math.random().toString(36).substr(2, 44)}`;
    this.storage.set(cid, receipt);
    console.log(`[MockIPFS] Receipt stored with CID: ${cid}`);
    return cid;
  }

  async unpinContent(cid) {
    console.log(`[MockIPFS] Unpinning content: ${cid}`);
    this.storage.delete(cid);
    return true;
  }

  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mode: this.integrated ? 'integrated' : 'standalone',
      storedItems: this.storage.size
    };
  }

  async shutdown() {
    console.log('[MockIPFS] Shutting down');
    this.storage.clear();
  }
}