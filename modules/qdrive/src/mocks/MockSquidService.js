import { logger } from '../utils/logger.js';

export class MockSquidService {
  constructor() {
    this.identities = new Map();
    this.initializeMockData();
  }

  initializeMockData() {
    // Add some mock identities for testing
    this.identities.set('squid_test123456789012345678901234', {
      squidId: 'squid_test123456789012345678901234',
      verified: true,
      reputation: 0.8,
      createdAt: '2024-01-01T00:00:00Z',
      subidentities: ['sub_test789012345678901234567890']
    });
    
    this.identities.set('squid_demo123456789012345678901234', {
      squidId: 'squid_demo123456789012345678901234',
      verified: true,
      reputation: 0.9,
      createdAt: '2024-01-01T00:00:00Z',
      subidentities: []
    });
  }

  async verifyIdentity(squidId, token) {
    logger.debug(`[MockSquid] Verifying identity: ${squidId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const identity = this.identities.get(squidId);
    
    if (!identity) {
      return {
        verified: false,
        error: 'Identity not found'
      };
    }
    
    // Mock token validation (always pass for mock)
    return {
      verified: true,
      identity: {
        squidId: identity.squidId,
        reputation: identity.reputation,
        createdAt: identity.createdAt
      }
    };
  }

  async getIdentityInfo(squidId) {
    logger.debug(`[MockSquid] Getting identity info: ${squidId}`);
    
    await new Promise(resolve => setTimeout(resolve, 30));
    
    const identity = this.identities.get(squidId);
    
    if (!identity) {
      throw new Error('Identity not found');
    }
    
    return identity;
  }

  async validateSubidentity(squidId, subId) {
    logger.debug(`[MockSquid] Validating subidentity: ${subId} for ${squidId}`);
    
    await new Promise(resolve => setTimeout(resolve, 40));
    
    const identity = this.identities.get(squidId);
    
    if (!identity) {
      return { valid: false, error: 'Identity not found' };
    }
    
    const isValid = identity.subidentities.includes(subId);
    
    return {
      valid: isValid,
      subidentity: isValid ? {
        subId,
        parentId: squidId,
        permissions: ['read', 'write', 'share']
      } : null
    };
  }

  async getReputationScore(squidId) {
    logger.debug(`[MockSquid] Getting reputation score: ${squidId}`);
    
    await new Promise(resolve => setTimeout(resolve, 20));
    
    const identity = this.identities.get(squidId);
    
    return {
      squidId,
      reputation: identity?.reputation || 0.5,
      factors: {
        fileUploads: 0.8,
        sharing: 0.7,
        communityParticipation: 0.6
      },
      lastUpdated: new Date().toISOString()
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      service: 'mock-squid',
      identities: this.identities.size,
      timestamp: new Date().toISOString()
    };
  }
}