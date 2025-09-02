/**
 * Mock sQuid Service
 * 
 * Simulates sQuid identity verification for standalone mode testing.
 * In production, this would integrate with the actual sQuid service.
 */

export class MockSquidService {
  constructor() {
    this.identities = new Map();
    this.initialized = false;
    this.setupMockIdentities();
  }

  async initialize() {
    console.log('[MockSquidService] Initializing mock sQuid service...');
    this.initialized = true;
    console.log('[MockSquidService] Mock sQuid service initialized');
  }

  /**
   * Setup some mock identities for testing
   */
  setupMockIdentities() {
    const mockIdentities = [
      {
        squidId: 'squid_root_alice',
        type: 'ROOT',
        publicKey: 'mock_public_key_alice',
        verified: true,
        reputation: 95,
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        squidId: 'squid_dao_enterprise',
        type: 'DAO',
        publicKey: 'mock_public_key_dao',
        verified: true,
        reputation: 88,
        createdAt: '2024-01-15T00:00:00Z'
      },
      {
        squidId: 'squid_sub_bob',
        type: 'SUBIDENTITY',
        parentId: 'squid_root_alice',
        publicKey: 'mock_public_key_bob',
        verified: true,
        reputation: 72,
        createdAt: '2024-02-01T00:00:00Z'
      }
    ];

    mockIdentities.forEach(identity => {
      this.identities.set(identity.squidId, identity);
    });
  }

  /**
   * Verify an identity
   */
  async verifyIdentity(squidId, signature = null, timestamp = null) {
    if (!this.initialized) {
      throw new Error('sQuid service not initialized');
    }

    const identity = this.identities.get(squidId);
    
    if (!identity) {
      console.warn(`[MockSquidService] Identity not found: ${squidId}`);
      return {
        valid: false,
        error: 'Identity not found',
        squidId
      };
    }

    // Mock signature verification
    let signatureValid = true;
    if (signature && timestamp) {
      // In a real implementation, this would verify the cryptographic signature
      signatureValid = signature.length > 10; // Simple mock validation
    }

    const result = {
      valid: identity.verified && signatureValid,
      squidId: identity.squidId,
      type: identity.type,
      parentId: identity.parentId,
      publicKey: identity.publicKey,
      reputation: identity.reputation,
      verifiedAt: new Date().toISOString()
    };

    if (!signatureValid) {
      result.error = 'Invalid signature';
    }

    console.log(`[MockSquidService] Identity verification: ${squidId} -> ${result.valid ? 'VALID' : 'INVALID'}`);
    return result;
  }

  /**
   * Get identity information
   */
  async getIdentity(squidId) {
    if (!this.initialized) {
      throw new Error('sQuid service not initialized');
    }

    const identity = this.identities.get(squidId);
    
    if (!identity) {
      return null;
    }

    return {
      squidId: identity.squidId,
      type: identity.type,
      parentId: identity.parentId,
      publicKey: identity.publicKey,
      reputation: identity.reputation,
      verified: identity.verified,
      createdAt: identity.createdAt,
      lastSeen: new Date().toISOString()
    };
  }

  /**
   * Check if identity has permission for operation
   */
  async checkPermission(squidId, operation, resource = null) {
    if (!this.initialized) {
      throw new Error('sQuid service not initialized');
    }

    const identity = await this.getIdentity(squidId);
    
    if (!identity || !identity.verified) {
      return {
        allowed: false,
        reason: 'Identity not verified'
      };
    }

    // Mock permission logic based on identity type and reputation
    let allowed = false;
    let reason = '';

    switch (operation) {
      case 'qlock:encrypt':
      case 'qlock:decrypt':
        allowed = identity.reputation >= 50;
        reason = allowed ? 'Sufficient reputation' : 'Insufficient reputation for encryption';
        break;
        
      case 'qlock:sign':
      case 'qlock:verify':
        allowed = identity.reputation >= 60;
        reason = allowed ? 'Sufficient reputation' : 'Insufficient reputation for signing';
        break;
        
      case 'qlock:lock':
        allowed = identity.reputation >= 70;
        reason = allowed ? 'Sufficient reputation' : 'Insufficient reputation for locking';
        break;
        
      case 'qlock:admin':
        allowed = identity.type === 'ROOT' && identity.reputation >= 90;
        reason = allowed ? 'Admin privileges' : 'Insufficient privileges for admin operations';
        break;
        
      default:
        allowed = identity.reputation >= 50;
        reason = allowed ? 'Basic access granted' : 'Insufficient reputation';
    }

    console.log(`[MockSquidService] Permission check: ${squidId} -> ${operation} -> ${allowed ? 'ALLOWED' : 'DENIED'}`);
    
    return {
      allowed,
      reason,
      identity: {
        squidId: identity.squidId,
        type: identity.type,
        reputation: identity.reputation
      }
    };
  }

  /**
   * Create a new mock identity (for testing)
   */
  async createMockIdentity(squidId, options = {}) {
    const identity = {
      squidId,
      type: options.type || 'ROOT',
      parentId: options.parentId,
      publicKey: options.publicKey || `mock_public_key_${Date.now()}`,
      verified: options.verified !== false,
      reputation: options.reputation || 75,
      createdAt: new Date().toISOString()
    };

    this.identities.set(squidId, identity);
    
    console.log(`[MockSquidService] Created mock identity: ${squidId}`);
    return identity;
  }

  /**
   * Update identity reputation
   */
  async updateReputation(squidId, reputationChange) {
    const identity = this.identities.get(squidId);
    
    if (!identity) {
      throw new Error(`Identity not found: ${squidId}`);
    }

    const oldReputation = identity.reputation;
    identity.reputation = Math.max(0, Math.min(100, identity.reputation + reputationChange));
    
    console.log(`[MockSquidService] Updated reputation: ${squidId} ${oldReputation} -> ${identity.reputation}`);
    
    return {
      squidId,
      oldReputation,
      newReputation: identity.reputation,
      change: reputationChange
    };
  }

  /**
   * List all identities (for debugging)
   */
  async listIdentities() {
    return Array.from(this.identities.values()).map(identity => ({
      squidId: identity.squidId,
      type: identity.type,
      parentId: identity.parentId,
      reputation: identity.reputation,
      verified: identity.verified,
      createdAt: identity.createdAt
    }));
  }

  /**
   * Get identity statistics
   */
  async getStatistics() {
    const identities = Array.from(this.identities.values());
    
    const stats = {
      totalIdentities: identities.length,
      byType: {},
      averageReputation: 0,
      verifiedCount: 0
    };

    let totalReputation = 0;
    
    identities.forEach(identity => {
      stats.byType[identity.type] = (stats.byType[identity.type] || 0) + 1;
      totalReputation += identity.reputation;
      
      if (identity.verified) {
        stats.verifiedCount++;
      }
    });

    if (identities.length > 0) {
      stats.averageReputation = Math.round(totalReputation / identities.length);
    }

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = await this.getStatistics();
    
    return {
      status: this.initialized ? 'healthy' : 'not_initialized',
      service: 'MockSquidService',
      identityCount: this.identities.size,
      initialized: this.initialized,
      statistics: stats
    };
  }

  /**
   * Simulate identity context switching
   */
  async switchContext(fromSquidId, toSquidId) {
    const fromIdentity = await this.getIdentity(fromSquidId);
    const toIdentity = await this.getIdentity(toSquidId);
    
    if (!fromIdentity || !toIdentity) {
      throw new Error('One or both identities not found');
    }

    // Check if context switch is allowed
    const allowed = fromIdentity.type === 'ROOT' || 
                   (toIdentity.parentId === fromSquidId) ||
                   (fromIdentity.parentId === toIdentity.parentId);

    console.log(`[MockSquidService] Context switch: ${fromSquidId} -> ${toSquidId} -> ${allowed ? 'ALLOWED' : 'DENIED'}`);
    
    return {
      allowed,
      fromIdentity: {
        squidId: fromIdentity.squidId,
        type: fromIdentity.type
      },
      toIdentity: {
        squidId: toIdentity.squidId,
        type: toIdentity.type
      },
      switchedAt: new Date().toISOString()
    };
  }
}