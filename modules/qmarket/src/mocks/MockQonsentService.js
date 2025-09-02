/**
 * Mock Qonsent Service for Standalone Development
 * 
 * Provides mock permission and privacy management for testing.
 */

import crypto from 'crypto';

export class MockQonsentService {
  constructor() {
    this.profiles = new Map();
    this.permissions = new Map();
    this.accessGrants = new Map();
    
    // Initialize with test data
    this.initializeTestData();
  }

  initializeTestData() {
    // Create some default privacy profiles
    const defaultProfiles = [
      {
        profileId: 'profile_public_minimal',
        visibility: 'public',
        encryptionLevel: 'basic',
        dataType: 'media',
        accessRules: ['*'],
        restrictions: []
      },
      {
        profileId: 'profile_dao_enhanced',
        visibility: 'dao-only',
        encryptionLevel: 'advanced',
        dataType: 'document',
        accessRules: ['dao:members'],
        restrictions: ['no_redistribution']
      },
      {
        profileId: 'profile_private_maximum',
        visibility: 'private',
        encryptionLevel: 'quantum',
        dataType: 'image',
        accessRules: ['owner_only'],
        restrictions: ['owner_only', 'no_sharing']
      }
    ];

    defaultProfiles.forEach(profile => {
      this.profiles.set(profile.profileId, profile);
    });
  }

  async generateProfile({ squidId, visibility, dataType, daoId, customRules, correlationId }) {
    await this.simulateDelay(100, 300);

    const profileId = `profile_${crypto.randomBytes(8).toString('hex')}`;
    
    // Determine encryption level based on visibility and data type
    const encryptionLevel = this.determineEncryptionLevel(visibility, dataType);
    
    // Generate access rules
    const accessRules = this.generateAccessRules(visibility, daoId, customRules);
    
    const profile = {
      profileId,
      squidId,
      visibility,
      encryptionLevel,
      dataType,
      daoId,
      accessRules,
      restrictions: this.generateRestrictions(visibility, customRules),
      createdAt: new Date().toISOString(),
      correlationId
    };

    this.profiles.set(profileId, profile);

    return {
      success: true,
      profileId,
      visibility,
      encryptionLevel,
      accessRules,
      restrictions: profile.restrictions
    };
  }

  async checkPermission({ squidId, subId, daoIds, permission, resourceType, resourceId, context }) {
    await this.simulateDelay(50, 150);

    // Mock permission checking logic
    const permissionKey = `${squidId}:${permission}:${resourceType}:${resourceId}`;
    
    // Check if explicit permission exists
    const explicitPermission = this.permissions.get(permissionKey);
    if (explicitPermission) {
      return {
        granted: explicitPermission.granted,
        permissions: explicitPermission.permissions,
        scope: explicitPermission.scope,
        expiresAt: explicitPermission.expiresAt,
        reason: 'explicit_grant'
      };
    }

    // Check access grants
    const accessGrant = this.accessGrants.get(`${resourceId}:${squidId}`);
    if (accessGrant && accessGrant.permissions.includes(permission)) {
      return {
        granted: true,
        permissions: accessGrant.permissions,
        scope: 'resource',
        expiresAt: accessGrant.expiresAt,
        reason: 'access_grant'
      };
    }

    // Default permission logic based on resource type and permission
    const granted = this.evaluateDefaultPermission(
      squidId, 
      permission, 
      resourceType, 
      daoIds, 
      context
    );

    return {
      granted,
      permissions: granted ? [permission] : [],
      scope: granted ? 'default' : 'none',
      reason: granted ? 'default_policy' : 'access_denied'
    };
  }

  async checkAccess({ squidId, resourceId, permission }) {
    await this.simulateDelay(30, 100);

    // Check if access grant exists
    const accessGrant = this.accessGrants.get(`${resourceId}:${squidId}`);
    
    if (accessGrant) {
      const hasPermission = accessGrant.permissions.includes(permission) || 
                           accessGrant.permissions.includes('all');
      
      const notExpired = !accessGrant.expiresAt || 
                        new Date(accessGrant.expiresAt) > new Date();

      return {
        granted: hasPermission && notExpired,
        permissions: accessGrant.permissions,
        expiresAt: accessGrant.expiresAt,
        reason: hasPermission && notExpired ? 'valid_grant' : 'expired_or_insufficient'
      };
    }

    // Default deny
    return {
      granted: false,
      permissions: [],
      reason: 'no_grant_found'
    };
  }

  async grantAccess({ resourceId, granteeId, permissions, expiresAt, grantedBy }) {
    await this.simulateDelay(100, 200);

    const grantId = `grant_${crypto.randomBytes(8).toString('hex')}`;
    const accessKey = `${resourceId}:${granteeId}`;

    const accessGrant = {
      grantId,
      resourceId,
      granteeId,
      permissions: Array.isArray(permissions) ? permissions : [permissions],
      expiresAt,
      grantedBy: grantedBy || 'system',
      grantedAt: new Date().toISOString(),
      status: 'active'
    };

    this.accessGrants.set(accessKey, accessGrant);

    return {
      success: true,
      grantId,
      resourceId,
      granteeId,
      permissions: accessGrant.permissions,
      expiresAt,
      grantedAt: accessGrant.grantedAt
    };
  }

  async revokeAccess({ resourceId, granteeId, revokedBy, reason }) {
    await this.simulateDelay(100, 200);

    const accessKey = `${resourceId}:${granteeId}`;
    const accessGrant = this.accessGrants.get(accessKey);

    if (!accessGrant) {
      return {
        success: false,
        error: 'Access grant not found'
      };
    }

    // Mark as revoked instead of deleting for audit trail
    accessGrant.status = 'revoked';
    accessGrant.revokedAt = new Date().toISOString();
    accessGrant.revokedBy = revokedBy || 'system';
    accessGrant.revokeReason = reason;

    return {
      success: true,
      grantId: accessGrant.grantId,
      resourceId,
      granteeId,
      revokedAt: accessGrant.revokedAt,
      reason
    };
  }

  async getProfile(profileId) {
    await this.simulateDelay(50, 100);

    const profile = this.profiles.get(profileId);
    if (!profile) {
      return {
        success: false,
        error: 'Profile not found'
      };
    }

    return {
      success: true,
      profile: {
        profileId: profile.profileId,
        visibility: profile.visibility,
        encryptionLevel: profile.encryptionLevel,
        dataType: profile.dataType,
        accessRules: profile.accessRules,
        restrictions: profile.restrictions,
        createdAt: profile.createdAt
      }
    };
  }

  async listAccessGrants(squidId) {
    await this.simulateDelay(100, 200);

    const grants = Array.from(this.accessGrants.values())
      .filter(grant => grant.granteeId === squidId && grant.status === 'active')
      .map(grant => ({
        grantId: grant.grantId,
        resourceId: grant.resourceId,
        permissions: grant.permissions,
        grantedAt: grant.grantedAt,
        expiresAt: grant.expiresAt
      }));

    return {
      success: true,
      grants,
      totalGrants: grants.length
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      service: 'mock-qonsent',
      timestamp: new Date().toISOString(),
      profiles: this.profiles.size,
      permissions: this.permissions.size,
      accessGrants: this.accessGrants.size
    };
  }

  // Helper methods
  determineEncryptionLevel(visibility, dataType) {
    if (visibility === 'private') return 'quantum';
    if (visibility === 'dao-only') return 'advanced';
    if (dataType === 'document' || dataType === 'software') return 'advanced';
    return 'basic';
  }

  generateAccessRules(visibility, daoId, customRules) {
    if (customRules?.canView) {
      return customRules.canView;
    }

    switch (visibility) {
      case 'public':
        return ['*'];
      case 'dao-only':
        return daoId ? [`dao:${daoId}:members`] : ['authenticated'];
      case 'private':
        return ['owner_only'];
      default:
        return ['authenticated'];
    }
  }

  generateRestrictions(visibility, customRules) {
    const restrictions = [];

    if (customRules?.restrictions) {
      restrictions.push(...customRules.restrictions);
    }

    if (visibility === 'private') {
      restrictions.push('owner_only', 'no_sharing');
    } else if (visibility === 'dao-only') {
      restrictions.push('no_redistribution');
    }

    return [...new Set(restrictions)]; // Remove duplicates
  }

  evaluateDefaultPermission(squidId, permission, resourceType, daoIds, context) {
    // Mock default permission logic
    
    // Allow read access to public resources
    if (permission === 'read' && resourceType === 'listing') {
      return true;
    }

    // Allow purchase permission for authenticated users
    if (permission === 'purchase' && squidId) {
      return true;
    }

    // Allow create permission for authenticated users
    if (permission === 'create' && squidId) {
      return true;
    }

    // Deny by default
    return false;
  }

  async simulateDelay(min = 50, max = 200) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // Test helper methods
  addTestProfile(profile) {
    this.profiles.set(profile.profileId, profile);
  }

  addTestPermission(squidId, permission, resourceType, resourceId, granted = true) {
    const permissionKey = `${squidId}:${permission}:${resourceType}:${resourceId}`;
    this.permissions.set(permissionKey, {
      granted,
      permissions: [permission],
      scope: 'test',
      createdAt: new Date().toISOString()
    });
  }

  getTestData() {
    return {
      profiles: Array.from(this.profiles.values()),
      permissions: Array.from(this.permissions.entries()),
      accessGrants: Array.from(this.accessGrants.values())
    };
  }
}

export default MockQonsentService;