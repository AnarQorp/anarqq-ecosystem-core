import { QonsentService } from './qonsent.service';
import { ProfileService } from './ProfileService';
import { Types } from 'mongoose';

export interface ResourceAccessResponse {
  access: boolean;
  reason: string;
  level: 'public' | 'private' | 'dao_only' | 'delegated' | 'time_limited';
  requiredPermissions?: string[];
  expiresAt?: Date;
}

export interface ResourceVisibilityResponse {
  visibility: 'public' | 'private' | 'dao_only' | 'delegated' | 'time_limited';
  appliedProfile?: string;
  expiresAt?: Date;
}

export class PublicApiService {
  private qonsentService: QonsentService;
  private profileService: ProfileService;

  constructor() {
    this.qonsentService = new QonsentService();
    this.profileService = new ProfileService();
  }

  /**
   * Check if a requester has access to a resource
   */
  async checkResourceAccess(
    resourceId: string,
    requesterDid?: string,
    daoScope?: string
  ): Promise<ResourceAccessResponse> {
    // First check direct access
    const accessCheck = await this.qonsentService.checkAccess({
      resourceId,
      targetDid: requesterDid || 'anonymous',
      daoScope,
      returnRequiredPermissions: true,
    });

    // Get the profile applied to this resource
    const profile = await this.profileService.getProfileForResource(resourceId);
    
    // If no specific profile is set, return the basic access check
    if (!profile) {
      return {
        access: accessCheck.hasAccess,
        reason: accessCheck.reason,
        level: accessCheck.level as any,
        requiredPermissions: accessCheck.requiredPermissions,
      };
    }

    // Apply profile-specific visibility rules
    switch (profile.visibility) {
      case 'public':
        return { access: true, reason: 'Public resource', level: 'public' };
      
      case 'private':
        return { 
          access: accessCheck.hasAccess, 
          reason: accessCheck.reason || 'Private resource', 
          level: 'private',
          requiredPermissions: accessCheck.requiredPermissions,
        };
      
      case 'dao_only':
        return {
          access: accessCheck.hasAccess && accessCheck.level === 'dao',
          reason: accessCheck.hasAccess ? 'DAO access granted' : 'DAO access required',
          level: 'dao_only',
          requiredPermissions: accessCheck.requiredPermissions,
        };
      
      case 'time_limited':
        const now = new Date();
        const expiresAt = profile.expirationValue instanceof Date 
          ? profile.expirationValue 
          : new Date(now.getTime() + (profile.expirationValue || 0) * 1000);
        
        const isExpired = now > expiresAt;
        
        return {
          access: accessCheck.hasAccess && !isExpired,
          reason: isExpired ? 'Access expired' : accessCheck.reason,
          level: 'time_limited',
          requiredPermissions: accessCheck.requiredPermissions,
          expiresAt: isExpired ? undefined : expiresAt,
        };
      
      default:
        return {
          access: false,
          reason: 'Access denied',
          level: 'private',
        };
    }
  }

  /**
   * Get visibility settings for a resource
   */
  async getResourceVisibility(
    resourceId: string
  ): Promise<ResourceVisibilityResponse> {
    const profile = await this.profileService.getProfileForResource(resourceId);
    
    if (!profile) {
      return { visibility: 'private' };
    }

    const response: ResourceVisibilityResponse = {
      visibility: profile.visibility,
      appliedProfile: profile.name,
    };

    if (profile.expirationRule === 'fixed_date' && profile.expirationValue) {
      response.expiresAt = profile.expirationValue instanceof Date 
        ? profile.expirationValue 
        : new Date(profile.expirationValue);
    }

    return response;
  }

  /**
   * Get all permissions for a resource
   */
  async getResourcePermissions(
    resourceId: string,
    requesterDid?: string,
    daoScope?: string
  ) {
    const permissions = await this.qonsentService.getPermissionsForResource({
      resourceId,
      targetDid: requesterDid,
      daoScope,
    });

    const visibility = await this.getResourceVisibility(resourceId);

    return {
      resourceId,
      visibility: visibility.visibility,
      appliedProfile: visibility.appliedProfile,
      permissions,
    };
  }

  /**
   * Get all available privacy profiles
   */
  async listPrivacyProfiles() {
    return this.profileService.listProfiles();
  }

  /**
   * Apply a privacy profile to a resource
   */
  async applyPrivacyProfile(
    resourceId: string,
    profileName: string,
    ownerDid: string,
    customOverrides?: any
  ) {
    return this.profileService.applyProfileToResource({
      cid: resourceId,
      profileName,
      ownerDid,
      customOverrides,
    });
  }
}

export default PublicApiService;
