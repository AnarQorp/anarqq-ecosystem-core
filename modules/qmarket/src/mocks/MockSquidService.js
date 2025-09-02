/**
 * Mock sQuid Service for Standalone Development
 * 
 * Provides mock identity verification and management for testing.
 */

export class MockSquidService {
  constructor() {
    this.identities = new Map();
    this.sessions = new Map();
    
    // Initialize with some test identities
    this.initializeTestIdentities();
  }

  initializeTestIdentities() {
    const testIdentities = [
      {
        squidId: 'squid_alice123',
        subId: null,
        daoIds: ['dao_artists', 'dao_creators'],
        reputation: 95,
        verified: true,
        profile: {
          name: 'Alice Creator',
          bio: 'Digital artist and NFT creator',
          avatar: 'https://example.com/avatar1.jpg'
        }
      },
      {
        squidId: 'squid_bob456',
        subId: 'sub_business',
        daoIds: ['dao_collectors', 'dao_investors'],
        reputation: 87,
        verified: true,
        profile: {
          name: 'Bob Collector',
          bio: 'Art collector and investor',
          avatar: 'https://example.com/avatar2.jpg'
        }
      },
      {
        squidId: 'squid_charlie789',
        subId: null,
        daoIds: ['dao_developers'],
        reputation: 92,
        verified: false,
        profile: {
          name: 'Charlie Dev',
          bio: 'Software developer',
          avatar: 'https://example.com/avatar3.jpg'
        }
      }
    ];

    testIdentities.forEach(identity => {
      this.identities.set(identity.squidId, identity);
    });
  }

  async verifyToken({ token, squidId, subId, signature, timestamp }) {
    // Mock token verification
    await this.simulateDelay(100, 300);

    // Check if identity exists
    const identity = this.identities.get(squidId);
    if (!identity) {
      return {
        valid: false,
        error: 'Identity not found'
      };
    }

    // Mock token validation (in real implementation, would verify JWT)
    if (!token || token.length < 10) {
      return {
        valid: false,
        error: 'Invalid token format'
      };
    }

    // Mock signature validation
    if (signature && !this.validateMockSignature(signature, squidId)) {
      return {
        valid: false,
        error: 'Invalid signature'
      };
    }

    // Mock timestamp validation (within 5 minutes)
    if (timestamp) {
      const now = Date.now();
      const tokenTime = parseInt(timestamp);
      if (Math.abs(now - tokenTime) > 5 * 60 * 1000) {
        return {
          valid: false,
          error: 'Token timestamp expired'
        };
      }
    }

    return {
      valid: true,
      squidId: identity.squidId,
      subId: subId || identity.subId,
      daoIds: identity.daoIds,
      reputation: identity.reputation,
      verified: identity.verified,
      profile: identity.profile
    };
  }

  async getIdentity(squidId) {
    await this.simulateDelay(50, 150);

    const identity = this.identities.get(squidId);
    if (!identity) {
      return {
        success: false,
        error: 'Identity not found'
      };
    }

    return {
      success: true,
      identity: {
        squidId: identity.squidId,
        subId: identity.subId,
        daoIds: identity.daoIds,
        reputation: identity.reputation,
        verified: identity.verified,
        profile: identity.profile,
        createdAt: '2024-01-01T00:00:00Z',
        lastActiveAt: new Date().toISOString()
      }
    };
  }

  async createSubidentity({ squidId, subId, purpose, permissions }) {
    await this.simulateDelay(200, 500);

    const identity = this.identities.get(squidId);
    if (!identity) {
      return {
        success: false,
        error: 'Parent identity not found'
      };
    }

    // Mock subidentity creation
    const subidentity = {
      squidId,
      subId,
      purpose,
      permissions: permissions || ['read', 'write'],
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    return {
      success: true,
      subidentity
    };
  }

  async updateReputation({ squidId, change, reason }) {
    await this.simulateDelay(100, 200);

    const identity = this.identities.get(squidId);
    if (!identity) {
      return {
        success: false,
        error: 'Identity not found'
      };
    }

    // Update reputation (with bounds)
    const oldReputation = identity.reputation;
    identity.reputation = Math.max(0, Math.min(100, identity.reputation + change));

    return {
      success: true,
      reputation: {
        previous: oldReputation,
        current: identity.reputation,
        change,
        reason
      }
    };
  }

  async getDAOMembers(daoId) {
    await this.simulateDelay(150, 300);

    // Mock DAO membership
    const daoMembers = Array.from(this.identities.values())
      .filter(identity => identity.daoIds.includes(daoId))
      .map(identity => ({
        squidId: identity.squidId,
        reputation: identity.reputation,
        verified: identity.verified,
        joinedAt: '2024-01-01T00:00:00Z',
        role: identity.reputation > 90 ? 'admin' : 'member'
      }));

    return {
      success: true,
      daoId,
      members: daoMembers,
      totalMembers: daoMembers.length
    };
  }

  async validateDAOMembership({ squidId, daoId }) {
    await this.simulateDelay(50, 100);

    const identity = this.identities.get(squidId);
    if (!identity) {
      return {
        success: false,
        error: 'Identity not found'
      };
    }

    const isMember = identity.daoIds.includes(daoId);
    
    return {
      success: true,
      isMember,
      daoId,
      squidId,
      membershipDetails: isMember ? {
        joinedAt: '2024-01-01T00:00:00Z',
        role: identity.reputation > 90 ? 'admin' : 'member',
        reputation: identity.reputation
      } : null
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      service: 'mock-squid',
      timestamp: new Date().toISOString(),
      identities: this.identities.size,
      sessions: this.sessions.size
    };
  }

  // Helper methods
  validateMockSignature(signature, squidId) {
    // Mock signature validation - in real implementation would use cryptographic verification
    return signature.startsWith('sig_') && signature.includes(squidId.slice(-6));
  }

  async simulateDelay(min = 50, max = 200) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // Test helper methods
  addTestIdentity(identity) {
    this.identities.set(identity.squidId, identity);
  }

  removeTestIdentity(squidId) {
    this.identities.delete(squidId);
  }

  getTestIdentities() {
    return Array.from(this.identities.values());
  }
}

export default MockSquidService;