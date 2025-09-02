/**
 * Mock sQuid Service
 * Simulates sQuid identity verification functionality
 */

export class MockSquidService {
  constructor(options = {}) {
    this.integrated = options.integrated || false;
    this.identities = new Map();
    
    // Initialize with some test identities
    this.initializeTestIdentities();
  }

  async initialize() {
    console.log(`[MocksQuid] Initializing ${this.integrated ? 'integrated' : 'standalone'} mode`);
    return true;
  }

  initializeTestIdentities() {
    const testIdentities = [
      {
        squidId: 'squid_alice_123',
        verified: true,
        reputation: 0.95,
        subidentities: ['sub_alice_work', 'sub_alice_personal'],
        daoMemberships: ['dao_developers', 'dao_community']
      },
      {
        squidId: 'squid_bob_456',
        verified: true,
        reputation: 0.87,
        subidentities: ['sub_bob_business'],
        daoMemberships: ['dao_community']
      },
      {
        squidId: 'squid_charlie_789',
        verified: false,
        reputation: 0.45,
        subidentities: [],
        daoMemberships: []
      }
    ];

    testIdentities.forEach(identity => {
      this.identities.set(identity.squidId, identity);
    });
  }

  /**
   * Verify identity signature
   */
  async verifyIdentity(squidId, signature, timestamp) {
    try {
      console.log(`[MocksQuid] Verifying identity ${squidId}`);

      const identity = this.identities.get(squidId);
      if (!identity) {
        console.log(`[MocksQuid] Identity ${squidId} not found`);
        return false;
      }

      if (!identity.verified) {
        console.log(`[MocksQuid] Identity ${squidId} not verified`);
        return false;
      }

      // Mock signature verification
      if (!signature || signature.length < 10) {
        console.log(`[MocksQuid] Invalid signature for ${squidId}`);
        return false;
      }

      // Check timestamp (within 5 minutes)
      if (timestamp) {
        const now = Date.now();
        const requestTime = new Date(timestamp).getTime();
        const timeDiff = Math.abs(now - requestTime);
        
        if (timeDiff > 300000) { // 5 minutes
          console.log(`[MocksQuid] Timestamp too old for ${squidId}`);
          return false;
        }
      }

      console.log(`[MocksQuid] Identity ${squidId} verified successfully`);
      return true;

    } catch (error) {
      console.error(`[MocksQuid] Error verifying identity ${squidId}:`, error);
      return false;
    }
  }

  /**
   * Get identity information
   */
  async getIdentityInfo(squidId) {
    try {
      console.log(`[MocksQuid] Getting identity info for ${squidId}`);

      const identity = this.identities.get(squidId);
      if (!identity) {
        throw new Error('Identity not found');
      }

      return {
        squidId: identity.squidId,
        verified: identity.verified,
        reputation: identity.reputation,
        subidentities: identity.subidentities,
        daoMemberships: identity.daoMemberships,
        createdAt: '2024-01-01T00:00:00Z',
        lastActive: new Date().toISOString()
      };

    } catch (error) {
      console.error(`[MocksQuid] Error getting identity info for ${squidId}:`, error);
      throw error;
    }
  }

  /**
   * Create new identity (for testing)
   */
  async createIdentity(squidId, options = {}) {
    try {
      console.log(`[MocksQuid] Creating identity ${squidId}`);

      if (this.identities.has(squidId)) {
        throw new Error('Identity already exists');
      }

      const identity = {
        squidId,
        verified: options.verified !== false,
        reputation: options.reputation || 0.5,
        subidentities: options.subidentities || [],
        daoMemberships: options.daoMemberships || [],
        createdAt: new Date().toISOString()
      };

      this.identities.set(squidId, identity);

      console.log(`[MocksQuid] Identity ${squidId} created successfully`);
      return identity;

    } catch (error) {
      console.error(`[MocksQuid] Error creating identity ${squidId}:`, error);
      throw error;
    }
  }

  /**
   * Update identity reputation
   */
  async updateReputation(squidId, reputationDelta) {
    try {
      console.log(`[MocksQuid] Updating reputation for ${squidId} by ${reputationDelta}`);

      const identity = this.identities.get(squidId);
      if (!identity) {
        throw new Error('Identity not found');
      }

      identity.reputation = Math.max(0, Math.min(1, identity.reputation + reputationDelta));
      identity.lastUpdated = new Date().toISOString();

      console.log(`[MocksQuid] Reputation for ${squidId} updated to ${identity.reputation}`);
      return identity.reputation;

    } catch (error) {
      console.error(`[MocksQuid] Error updating reputation for ${squidId}:`, error);
      throw error;
    }
  }

  /**
   * Verify subidentity
   */
  async verifySubidentity(squidId, subId) {
    try {
      console.log(`[MocksQuid] Verifying subidentity ${subId} for ${squidId}`);

      const identity = this.identities.get(squidId);
      if (!identity) {
        return false;
      }

      const hasSubidentity = identity.subidentities.includes(subId);
      console.log(`[MocksQuid] Subidentity ${subId} verification: ${hasSubidentity}`);
      
      return hasSubidentity;

    } catch (error) {
      console.error(`[MocksQuid] Error verifying subidentity ${subId}:`, error);
      return false;
    }
  }

  /**
   * Check DAO membership
   */
  async checkDAOMembership(squidId, daoId) {
    try {
      console.log(`[MocksQuid] Checking DAO membership for ${squidId} in ${daoId}`);

      const identity = this.identities.get(squidId);
      if (!identity) {
        return false;
      }

      const isMember = identity.daoMemberships.includes(daoId);
      console.log(`[MocksQuid] DAO membership ${daoId}: ${isMember}`);
      
      return isMember;

    } catch (error) {
      console.error(`[MocksQuid] Error checking DAO membership:`, error);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mode: this.integrated ? 'integrated' : 'standalone',
      identityCount: this.identities.size,
      verifiedIdentities: Array.from(this.identities.values()).filter(i => i.verified).length
    };
  }

  async shutdown() {
    console.log('[MocksQuid] Shutting down');
    this.identities.clear();
  }
}