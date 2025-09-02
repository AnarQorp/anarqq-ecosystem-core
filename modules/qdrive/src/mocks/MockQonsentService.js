import { logger } from '../utils/logger.js';

export class MockQonsentService {
  constructor() {
    this.permissions = new Map();
    this.policies = new Map();
    this.initializeMockData();
  }

  initializeMockData() {
    // Mock policies
    this.policies.set('qdrive:file:upload', {
      resource: 'qdrive:file:upload',
      action: 'create',
      conditions: ['identity_verified', 'storage_quota_available']
    });

    this.policies.set('qdrive:file:read', {
      resource: 'qdrive:file:*',
      action: 'read',
      conditions: ['owner_or_shared', 'not_expired']
    });

    // Mock permissions for test users
    this.permissions.set('squid_test123456789012345678901234', new Set([
      'qdrive:file:upload',
      'qdrive:file:read',
      'qdrive:file:share',
      'qdrive:file:delete'
    ]));
  }

  async checkPermission(actor, resource, action = 'read') {
    logger.debug(`[MockQonsent] Checking permission: ${resource} for ${actor.squidId}`);
    
    await new Promise(resolve => setTimeout(resolve, 30));

    const userPermissions = this.permissions.get(actor.squidId) || new Set();
    const hasPermission = userPermissions.has(resource) || userPermissions.has(`${resource}:${action}`);

    return {
      allowed: hasPermission,
      resource,
      action,
      actor: actor.squidId,
      reason: hasPermission ? 'permission_granted' : 'permission_denied',
      timestamp: new Date().toISOString()
    };
  }

  async grantPermission(actor, recipient, resource, permissions = ['read']) {
    logger.debug(`[MockQonsent] Granting permission: ${resource} to ${recipient}`);
    
    await new Promise(resolve => setTimeout(resolve, 40));

    let userPermissions = this.permissions.get(recipient);
    if (!userPermissions) {
      userPermissions = new Set();
      this.permissions.set(recipient, userPermissions);
    }

    permissions.forEach(permission => {
      userPermissions.add(`${resource}:${permission}`);
    });

    return {
      success: true,
      resource,
      recipient,
      permissions,
      grantedBy: actor.squidId,
      grantedAt: new Date().toISOString()
    };
  }

  async revokePermission(actor, recipient, resource, permissions = ['read']) {
    logger.debug(`[MockQonsent] Revoking permission: ${resource} from ${recipient}`);
    
    await new Promise(resolve => setTimeout(resolve, 35));

    const userPermissions = this.permissions.get(recipient);
    if (userPermissions) {
      permissions.forEach(permission => {
        userPermissions.delete(`${resource}:${permission}`);
      });
    }

    return {
      success: true,
      resource,
      recipient,
      permissions,
      revokedBy: actor.squidId,
      revokedAt: new Date().toISOString()
    };
  }

  async listPermissions(actor, resource) {
    logger.debug(`[MockQonsent] Listing permissions for: ${resource}`);
    
    await new Promise(resolve => setTimeout(resolve, 25));

    const userPermissions = this.permissions.get(actor.squidId) || new Set();
    const matchingPermissions = Array.from(userPermissions).filter(perm => 
      perm.startsWith(resource) || resource === '*'
    );

    return {
      actor: actor.squidId,
      resource,
      permissions: matchingPermissions,
      timestamp: new Date().toISOString()
    };
  }

  async createPolicy(policyData) {
    logger.debug(`[MockQonsent] Creating policy: ${policyData.resource}`);
    
    await new Promise(resolve => setTimeout(resolve, 50));

    const policy = {
      id: `policy_${Date.now()}`,
      ...policyData,
      createdAt: new Date().toISOString()
    };

    this.policies.set(policy.resource, policy);

    return {
      success: true,
      policy
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      service: 'mock-qonsent',
      permissions: this.permissions.size,
      policies: this.policies.size,
      timestamp: new Date().toISOString()
    };
  }
}