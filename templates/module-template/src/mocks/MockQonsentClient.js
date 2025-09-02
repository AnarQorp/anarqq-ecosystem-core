/**
 * Mock Qonsent Client
 * 
 * Mock implementation of Qonsent permission service for development and testing
 */

import { v4 as uuidv4 } from 'uuid';

export class MockQonsentClient {
  constructor(options = {}) {
    this.options = options;
    this.policies = new Map();
    this.grants = new Map();
    
    // Create test policies and grants
    this.createTestPolicies();
  }

  createTestPolicies() {
    const testPolicies = [
      {
        policyId: 'policy-1',
        name: '{{MODULE_NAME}} Read Policy',
        scope: '{{MODULE_NAME}}:read',
        rules: [
          {
            effect: 'allow',
            conditions: ['identity.verified === true']
          }
        ]
      },
      {
        policyId: 'policy-2',
        name: '{{MODULE_NAME}} Write Policy',
        scope: '{{MODULE_NAME}}:write',
        rules: [
          {
            effect: 'allow',
            conditions: [
              'identity.verified === true',
              'identity.reputation >= 50'
            ]
          }
        ]
      },
      {
        policyId: 'policy-3',
        name: '{{MODULE_NAME}} Admin Policy',
        scope: '{{MODULE_NAME}}:admin',
        rules: [
          {
            effect: 'allow',
            conditions: [
              'identity.verified === true',
              'identity.reputation >= 90'
            ]
          }
        ]
      }
    ];

    testPolicies.forEach(policy => {
      this.policies.set(policy.policyId, policy);
    });

    // Create test grants
    const testGrants = [
      {
        grantId: 'grant-1',
        squidId: '123e4567-e89b-12d3-a456-426614174000',
        scope: '{{MODULE_NAME}}:read',
        policyId: 'policy-1',
        granted: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        grantId: 'grant-2',
        squidId: '123e4567-e89b-12d3-a456-426614174000',
        scope: '{{MODULE_NAME}}:write',
        policyId: 'policy-2',
        granted: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        grantId: 'grant-3',
        squidId: '123e4567-e89b-12d3-a456-426614174002',
        scope: '{{MODULE_NAME}}:read',
        policyId: 'policy-1',
        granted: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    testGrants.forEach(grant => {
      this.grants.set(grant.grantId, grant);
    });
  }

  /**
   * Check permission
   */
  async checkPermission({ token, scope, resource, action, context }) {
    await this.delay(40);

    const { squidId, subId, daoId } = context;

    // Find matching grant
    const grant = Array.from(this.grants.values()).find(g => 
      g.squidId === squidId && 
      g.scope === scope &&
      g.granted &&
      new Date(g.expiresAt) > new Date()
    );

    if (!grant) {
      return {
        allowed: false,
        reason: 'no_valid_grant',
        scope,
        resource,
        action
      };
    }

    // Check policy conditions (simplified)
    const policy = this.policies.get(grant.policyId);
    if (!policy) {
      return {
        allowed: false,
        reason: 'policy_not_found',
        scope,
        resource,
        action
      };
    }

    // Mock policy evaluation (always allow for test users)
    const testUsers = [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174002'
    ];

    if (testUsers.includes(squidId)) {
      return {
        allowed: true,
        grantId: grant.grantId,
        policyId: policy.policyId,
        scope,
        resource,
        action,
        expires: grant.expiresAt
      };
    }

    return {
      allowed: false,
      reason: 'policy_conditions_not_met',
      scope,
      resource,
      action
    };
  }

  /**
   * Grant permission
   */
  async grant({ squidId, scope, policyId, duration = 24 * 60 * 60 * 1000 }) {
    await this.delay(50);

    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    const grantId = uuidv4();
    const grant = {
      grantId,
      squidId,
      scope,
      policyId,
      granted: true,
      grantedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + duration).toISOString()
    };

    this.grants.set(grantId, grant);

    return grant;
  }

  /**
   * Revoke permission
   */
  async revoke({ grantId, squidId, scope }) {
    await this.delay(30);

    if (grantId) {
      const grant = this.grants.get(grantId);
      if (grant) {
        grant.granted = false;
        grant.revokedAt = new Date().toISOString();
        return { revoked: true, grantId };
      }
    }

    // Revoke by squidId and scope
    if (squidId && scope) {
      const grants = Array.from(this.grants.values()).filter(g => 
        g.squidId === squidId && g.scope === scope && g.granted
      );

      grants.forEach(grant => {
        grant.granted = false;
        grant.revokedAt = new Date().toISOString();
      });

      return { revoked: true, count: grants.length };
    }

    throw new Error('Grant not found');
  }

  /**
   * List grants for user
   */
  async listGrants(squidId) {
    await this.delay(35);

    const userGrants = Array.from(this.grants.values())
      .filter(g => g.squidId === squidId)
      .map(grant => ({
        grantId: grant.grantId,
        scope: grant.scope,
        policyId: grant.policyId,
        granted: grant.granted,
        grantedAt: grant.grantedAt,
        expiresAt: grant.expiresAt,
        revokedAt: grant.revokedAt
      }));

    return userGrants;
  }

  /**
   * Create policy
   */
  async createPolicy({ name, scope, rules }) {
    await this.delay(60);

    const policyId = uuidv4();
    const policy = {
      policyId,
      name,
      scope,
      rules,
      createdAt: new Date().toISOString(),
      active: true
    };

    this.policies.set(policyId, policy);

    return policy;
  }

  /**
   * Get policy
   */
  async getPolicy(policyId) {
    await this.delay(25);

    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    return policy;
  }

  /**
   * Health check
   */
  async health() {
    return {
      status: 'healthy',
      version: '1.0.0-mock',
      timestamp: new Date().toISOString(),
      policies: this.policies.size,
      grants: this.grants.size,
      activeGrants: Array.from(this.grants.values()).filter(g => g.granted).length
    };
  }

  /**
   * Simulate network delay
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}