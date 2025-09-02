/**
 * Mock Qonsent Service
 * 
 * Simulates Qonsent permission checking for standalone mode testing.
 * In production, this would integrate with the actual Qonsent service.
 */

export class MockQonsentService {
  constructor() {
    this.policies = new Map();
    this.grants = new Map();
    this.initialized = false;
    this.setupMockPolicies();
  }

  async initialize() {
    console.log('[MockQonsentService] Initializing mock Qonsent service...');
    this.initialized = true;
    console.log('[MockQonsentService] Mock Qonsent service initialized');
  }

  /**
   * Setup some mock policies for testing
   */
  setupMockPolicies() {
    const mockPolicies = [
      {
        policyId: 'qlock_basic_access',
        name: 'Qlock Basic Access',
        permissions: ['qlock:encrypt', 'qlock:decrypt', 'qlock:verify'],
        conditions: {
          minReputation: 50,
          identityTypes: ['ROOT', 'DAO', 'SUBIDENTITY']
        },
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        policyId: 'qlock_signing_access',
        name: 'Qlock Signing Access',
        permissions: ['qlock:sign', 'qlock:verify'],
        conditions: {
          minReputation: 60,
          identityTypes: ['ROOT', 'DAO']
        },
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        policyId: 'qlock_lock_access',
        name: 'Qlock Lock Access',
        permissions: ['qlock:lock'],
        conditions: {
          minReputation: 70,
          identityTypes: ['ROOT', 'DAO', 'SUBIDENTITY']
        },
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        policyId: 'qlock_admin_access',
        name: 'Qlock Admin Access',
        permissions: ['qlock:admin', 'qlock:rotate_keys', 'qlock:force_unlock'],
        conditions: {
          minReputation: 90,
          identityTypes: ['ROOT']
        },
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    mockPolicies.forEach(policy => {
      this.policies.set(policy.policyId, policy);
    });

    // Setup some mock grants
    const mockGrants = [
      {
        grantId: 'grant_alice_basic',
        squidId: 'squid_root_alice',
        policyId: 'qlock_basic_access',
        permissions: ['qlock:encrypt', 'qlock:decrypt', 'qlock:verify'],
        grantedAt: '2024-01-01T00:00:00Z',
        expiresAt: '2025-01-01T00:00:00Z',
        active: true
      },
      {
        grantId: 'grant_alice_signing',
        squidId: 'squid_root_alice',
        policyId: 'qlock_signing_access',
        permissions: ['qlock:sign', 'qlock:verify'],
        grantedAt: '2024-01-01T00:00:00Z',
        expiresAt: '2025-01-01T00:00:00Z',
        active: true
      },
      {
        grantId: 'grant_dao_basic',
        squidId: 'squid_dao_enterprise',
        policyId: 'qlock_basic_access',
        permissions: ['qlock:encrypt', 'qlock:decrypt', 'qlock:verify'],
        grantedAt: '2024-01-15T00:00:00Z',
        expiresAt: '2025-01-15T00:00:00Z',
        active: true
      }
    ];

    mockGrants.forEach(grant => {
      this.grants.set(grant.grantId, grant);
    });
  }

  /**
   * Check if identity has permission for operation
   */
  async checkPermission(squidId, permission, resource = null) {
    if (!this.initialized) {
      throw new Error('Qonsent service not initialized');
    }

    // Find grants for this identity
    const identityGrants = Array.from(this.grants.values())
      .filter(grant => grant.squidId === squidId && grant.active);

    if (identityGrants.length === 0) {
      console.warn(`[MockQonsentService] No grants found for identity: ${squidId}`);
      return {
        allowed: false,
        reason: 'No grants found for identity',
        squidId,
        permission
      };
    }

    // Check if any grant includes the requested permission
    let allowed = false;
    let grantingPolicy = null;

    for (const grant of identityGrants) {
      // Check if grant is expired
      if (grant.expiresAt && new Date(grant.expiresAt) < new Date()) {
        continue;
      }

      if (grant.permissions.includes(permission)) {
        allowed = true;
        grantingPolicy = grant.policyId;
        break;
      }
    }

    const result = {
      allowed,
      squidId,
      permission,
      resource,
      grantingPolicy,
      checkedAt: new Date().toISOString()
    };

    if (!allowed) {
      result.reason = 'Permission not granted';
    }

    console.log(`[MockQonsentService] Permission check: ${squidId} -> ${permission} -> ${allowed ? 'ALLOWED' : 'DENIED'}`);
    return result;
  }

  /**
   * Grant permission to identity
   */
  async grantPermission(squidId, policyId, options = {}) {
    if (!this.initialized) {
      throw new Error('Qonsent service not initialized');
    }

    const policy = this.policies.get(policyId);
    
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const grantId = `grant_${squidId}_${policyId}_${Date.now()}`;
    const expiresAt = options.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year default

    const grant = {
      grantId,
      squidId,
      policyId,
      permissions: [...policy.permissions],
      grantedAt: new Date().toISOString(),
      expiresAt,
      active: true,
      grantedBy: options.grantedBy || 'system'
    };

    this.grants.set(grantId, grant);
    
    console.log(`[MockQonsentService] Granted permissions: ${squidId} -> ${policyId}`);
    return grant;
  }

  /**
   * Revoke permission from identity
   */
  async revokePermission(squidId, grantId) {
    if (!this.initialized) {
      throw new Error('Qonsent service not initialized');
    }

    const grant = this.grants.get(grantId);
    
    if (!grant) {
      throw new Error(`Grant not found: ${grantId}`);
    }

    if (grant.squidId !== squidId) {
      throw new Error(`Grant ${grantId} does not belong to identity ${squidId}`);
    }

    grant.active = false;
    grant.revokedAt = new Date().toISOString();
    
    console.log(`[MockQonsentService] Revoked grant: ${grantId} for ${squidId}`);
    return grant;
  }

  /**
   * Get all grants for an identity
   */
  async getGrants(squidId) {
    if (!this.initialized) {
      throw new Error('Qonsent service not initialized');
    }

    const identityGrants = Array.from(this.grants.values())
      .filter(grant => grant.squidId === squidId)
      .map(grant => ({
        grantId: grant.grantId,
        policyId: grant.policyId,
        permissions: grant.permissions,
        grantedAt: grant.grantedAt,
        expiresAt: grant.expiresAt,
        active: grant.active,
        revokedAt: grant.revokedAt
      }));

    return identityGrants;
  }

  /**
   * Create a new policy
   */
  async createPolicy(policyData) {
    if (!this.initialized) {
      throw new Error('Qonsent service not initialized');
    }

    const policyId = policyData.policyId || `policy_${Date.now()}`;
    
    const policy = {
      policyId,
      name: policyData.name,
      permissions: policyData.permissions || [],
      conditions: policyData.conditions || {},
      createdAt: new Date().toISOString(),
      createdBy: policyData.createdBy || 'system'
    };

    this.policies.set(policyId, policy);
    
    console.log(`[MockQonsentService] Created policy: ${policyId}`);
    return policy;
  }

  /**
   * Get policy information
   */
  async getPolicy(policyId) {
    if (!this.initialized) {
      throw new Error('Qonsent service not initialized');
    }

    return this.policies.get(policyId) || null;
  }

  /**
   * List all policies
   */
  async listPolicies() {
    if (!this.initialized) {
      throw new Error('Qonsent service not initialized');
    }

    return Array.from(this.policies.values());
  }

  /**
   * Validate Qonsent token (mock implementation)
   */
  async validateToken(token) {
    if (!this.initialized) {
      throw new Error('Qonsent service not initialized');
    }

    try {
      // Mock token validation - decode base64
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const tokenData = JSON.parse(decoded);
      
      // Check if token is expired
      if (tokenData.expiresAt && new Date(tokenData.expiresAt) < new Date()) {
        return {
          valid: false,
          reason: 'Token expired'
        };
      }

      return {
        valid: true,
        squidId: tokenData.squidId,
        permissions: tokenData.permissions || {},
        expiresAt: tokenData.expiresAt
      };

    } catch (error) {
      return {
        valid: false,
        reason: 'Invalid token format'
      };
    }
  }

  /**
   * Generate Qonsent token (mock implementation)
   */
  async generateToken(squidId, permissions, expiresAt = null) {
    if (!this.initialized) {
      throw new Error('Qonsent service not initialized');
    }

    const tokenData = {
      squidId,
      permissions,
      issuedAt: new Date().toISOString(),
      expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours default
    };

    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    
    console.log(`[MockQonsentService] Generated token for: ${squidId}`);
    return token;
  }

  /**
   * Get Qonsent statistics
   */
  async getStatistics() {
    const policies = Array.from(this.policies.values());
    const grants = Array.from(this.grants.values());
    const activeGrants = grants.filter(grant => grant.active);
    
    const stats = {
      totalPolicies: policies.length,
      totalGrants: grants.length,
      activeGrants: activeGrants.length,
      revokedGrants: grants.length - activeGrants.length,
      byPolicy: {},
      byIdentity: {}
    };

    // Count grants by policy
    grants.forEach(grant => {
      stats.byPolicy[grant.policyId] = (stats.byPolicy[grant.policyId] || 0) + 1;
      stats.byIdentity[grant.squidId] = (stats.byIdentity[grant.squidId] || 0) + 1;
    });

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = await this.getStatistics();
    
    return {
      status: this.initialized ? 'healthy' : 'not_initialized',
      service: 'MockQonsentService',
      policyCount: this.policies.size,
      grantCount: this.grants.size,
      initialized: this.initialized,
      statistics: stats
    };
  }

  /**
   * Cleanup expired grants
   */
  async cleanupExpiredGrants() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [grantId, grant] of this.grants.entries()) {
      if (grant.expiresAt && new Date(grant.expiresAt) < now && grant.active) {
        grant.active = false;
        grant.expiredAt = now.toISOString();
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[MockQonsentService] Cleaned up ${cleanedCount} expired grants`);
    }

    return cleanedCount;
  }
}