/**
 * Qonsent Service - Privacy Profile Management
 * 
 * Generates and manages privacy profiles for file uploads in the AnarQ&Q ecosystem.
 * Defines visibility levels, data types, and access policies.
 */

import crypto from 'crypto';

export class QonsentService {
  constructor() {
    this.profileCache = new Map();
    this.daoRules = new Map();
  }

  /**
   * Generate privacy profile for file upload
   * @param {Object} options - Profile generation options
   * @param {string} options.squidId - sQuid identity DID
   * @param {string} options.visibility - 'public', 'dao-only', 'private'
   * @param {string} options.dataType - 'image', 'video', 'audio', 'document', 'media'
   * @param {string} options.daoId - DAO identifier (if dao-only)
   * @param {Object} options.customRules - Custom access rules
   * @returns {Promise<Object>} Privacy profile
   */
  async generateProfile(options) {
    const {
      squidId,
      visibility = 'private',
      dataType = 'media',
      daoId = null,
      customRules = {}
    } = options;

    // Validate inputs
    this.validateProfileOptions(options);

    // Generate unique profile ID
    const profileId = this.generateProfileId(squidId, visibility, dataType);

    // Determine encryption level based on visibility
    const encryptionLevel = this.getEncryptionLevel(visibility);

    // Generate access rules
    const accessRules = await this.generateAccessRules(visibility, daoId, customRules);

    // Create privacy profile
    const profile = {
      profileId,
      squidId,
      visibility,
      dataType,
      encryptionLevel,
      accessRules,
      daoId,
      customRules,
      createdAt: new Date().toISOString(),
      expiresAt: this.calculateExpiration(visibility),
      version: '1.0',
      compliance: {
        gdpr: true,
        ccpa: true,
        ecosystem: 'anarq'
      }
    };

    // Cache profile for quick access
    this.profileCache.set(profileId, profile);

    // Log profile generation
    console.log(`[Qonsent] Generated privacy profile: ${profileId} for ${squidId}`);

    return profile;
  }

  /**
   * Validate profile generation options
   */
  validateProfileOptions(options) {
    const { squidId, visibility, dataType } = options;

    if (!squidId || typeof squidId !== 'string') {
      throw new Error('Valid squidId is required');
    }

    const validVisibilities = ['public', 'dao-only', 'private'];
    if (!validVisibilities.includes(visibility)) {
      throw new Error(`Invalid visibility. Must be one of: ${validVisibilities.join(', ')}`);
    }

    const validDataTypes = ['image', 'video', 'audio', 'document', 'media', 'text'];
    if (!validDataTypes.includes(dataType)) {
      throw new Error(`Invalid dataType. Must be one of: ${validDataTypes.join(', ')}`);
    }

    if (visibility === 'dao-only' && !options.daoId) {
      throw new Error('daoId is required for dao-only visibility');
    }
  }

  /**
   * Generate unique profile ID
   */
  generateProfileId(squidId, visibility, dataType) {
    const timestamp = Date.now();
    const data = `${squidId}:${visibility}:${dataType}:${timestamp}`;
    return `qonsent_${crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)}`;
  }

  /**
   * Determine encryption level based on visibility
   */
  getEncryptionLevel(visibility) {
    const encryptionLevels = {
      'public': 'none',
      'dao-only': 'standard',
      'private': 'high'
    };
    return encryptionLevels[visibility] || 'standard';
  }

  /**
   * Generate access rules based on visibility and DAO settings
   */
  async generateAccessRules(visibility, daoId, customRules) {
    const baseRules = {
      canRead: [],
      canWrite: [],
      canShare: [],
      canDelete: [],
      restrictions: []
    };

    switch (visibility) {
      case 'public':
        baseRules.canRead = ['*'];
        baseRules.canShare = ['*'];
        baseRules.restrictions = ['no_modification'];
        break;

      case 'dao-only':
        if (daoId) {
          const daoMembers = await this.getDaoMembers(daoId);
          baseRules.canRead = daoMembers;
          baseRules.canShare = daoMembers;
          baseRules.canWrite = await this.getDaoModerators(daoId);
        }
        baseRules.restrictions = ['dao_members_only'];
        break;

      case 'private':
        baseRules.canRead = ['owner'];
        baseRules.canWrite = ['owner'];
        baseRules.canShare = ['owner'];
        baseRules.canDelete = ['owner'];
        baseRules.restrictions = ['owner_only', 'no_public_access'];
        break;
    }

    // Merge with custom rules
    return { ...baseRules, ...customRules };
  }

  /**
   * Get DAO members (mock implementation)
   */
  async getDaoMembers(daoId) {
    // In production, this would query the DAO service
    return [`dao:${daoId}:members`];
  }

  /**
   * Get DAO moderators (mock implementation)
   */
  async getDaoModerators(daoId) {
    // In production, this would query the DAO service
    return [`dao:${daoId}:moderators`];
  }

  /**
   * Calculate profile expiration based on visibility
   */
  calculateExpiration(visibility) {
    const now = new Date();
    const expirationHours = {
      'public': 24 * 365, // 1 year
      'dao-only': 24 * 30, // 1 month
      'private': 24 * 7    // 1 week
    };

    const hours = expirationHours[visibility] || 24;
    return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
  }

  /**
   * Get existing profile by ID
   */
  async getProfile(profileId) {
    const profile = this.profileCache.get(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    // Check if profile has expired
    if (new Date() > new Date(profile.expiresAt)) {
      this.profileCache.delete(profileId);
      throw new Error(`Profile expired: ${profileId}`);
    }

    return profile;
  }

  /**
   * Update profile access rules
   */
  async updateProfile(profileId, updates) {
    const profile = await this.getProfile(profileId);
    
    const updatedProfile = {
      ...profile,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: this.incrementVersion(profile.version)
    };

    this.profileCache.set(profileId, updatedProfile);
    
    console.log(`[Qonsent] Updated privacy profile: ${profileId}`);
    return updatedProfile;
  }

  /**
   * Validate access to resource
   */
  async validateAccess(profileId, requestorId, action = 'read') {
    try {
      const profile = await this.getProfile(profileId);
      const accessRules = profile.accessRules;

      // Check if requestor has permission for the action
      const allowedUsers = accessRules[`can${action.charAt(0).toUpperCase() + action.slice(1)}`] || [];
      
      // Check for wildcard access
      if (allowedUsers.includes('*')) {
        return { allowed: true, reason: 'public_access' };
      }

      // Check for owner access
      if (allowedUsers.includes('owner') && requestorId === profile.squidId) {
        return { allowed: true, reason: 'owner_access' };
      }

      // Check for specific user access
      if (allowedUsers.includes(requestorId)) {
        return { allowed: true, reason: 'explicit_permission' };
      }

      // Check for DAO access
      if (profile.visibility === 'dao-only' && allowedUsers.includes(`dao:${profile.daoId}:members`)) {
        const isDaoMember = await this.checkDaoMembership(requestorId, profile.daoId);
        if (isDaoMember) {
          return { allowed: true, reason: 'dao_member' };
        }
      }

      return { allowed: false, reason: 'insufficient_permissions' };

    } catch (error) {
      console.error(`[Qonsent] Access validation error:`, error);
      return { allowed: false, reason: 'validation_error' };
    }
  }

  /**
   * Check DAO membership (mock implementation)
   */
  async checkDaoMembership(squidId, daoId) {
    // In production, this would check actual DAO membership
    return Math.random() > 0.3; // 70% chance of membership for testing
  }

  /**
   * Increment version string
   */
  incrementVersion(version) {
    const parts = version.split('.');
    const patch = parseInt(parts[parts.length - 1]) + 1;
    parts[parts.length - 1] = patch.toString();
    return parts.join('.');
  }

  /**
   * Get profile statistics
   */
  async getProfileStats() {
    const profiles = Array.from(this.profileCache.values());
    
    const stats = {
      total: profiles.length,
      byVisibility: {},
      byDataType: {},
      expired: 0,
      active: 0
    };

    const now = new Date();

    profiles.forEach(profile => {
      // Count by visibility
      stats.byVisibility[profile.visibility] = (stats.byVisibility[profile.visibility] || 0) + 1;
      
      // Count by data type
      stats.byDataType[profile.dataType] = (stats.byDataType[profile.dataType] || 0) + 1;
      
      // Count expired vs active
      if (new Date(profile.expiresAt) < now) {
        stats.expired++;
      } else {
        stats.active++;
      }
    });

    return stats;
  }

  /**
   * Clean up expired profiles
   */
  async cleanupExpiredProfiles() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [profileId, profile] of this.profileCache.entries()) {
      if (new Date(profile.expiresAt) < now) {
        this.profileCache.delete(profileId);
        cleanedCount++;
      }
    }

    console.log(`[Qonsent] Cleaned up ${cleanedCount} expired profiles`);
    return cleanedCount;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = await this.getProfileStats();
    
    return {
      status: 'healthy',
      profileCache: {
        size: this.profileCache.size,
        active: stats.active,
        expired: stats.expired
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let qonsentServiceInstance = null;

export function getQonsentService() {
  if (!qonsentServiceInstance) {
    qonsentServiceInstance = new QonsentService();
  }
  return qonsentServiceInstance;
}

export default QonsentService;