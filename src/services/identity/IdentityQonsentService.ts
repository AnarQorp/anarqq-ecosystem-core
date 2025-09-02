/**
 * Identity-specific Qonsent Service
 * Manages privacy profiles and policies per identity
 */

import { 
  ExtendedSquidIdentity, 
  IdentityQonsentProfile, 
  ConsentEvent, 
  PrivacyLevel,
  IdentityType 
} from '@/types/identity';
import { QonsentSettings, IdentityExposureLevel } from '@/types/qonsent';

export interface IdentityQonsentServiceInterface {
  // Profile Management
  createQonsentProfile(identity: ExtendedSquidIdentity): Promise<IdentityQonsentProfile>;
  getQonsentProfile(identityId: string): Promise<IdentityQonsentProfile | null>;
  updateQonsentProfile(identityId: string, updates: Partial<IdentityQonsentProfile>): Promise<boolean>;
  deleteQonsentProfile(identityId: string): Promise<boolean>;
  
  // Privacy Policy Switching
  switchPrivacyContext(fromIdentityId: string, toIdentityId: string): Promise<boolean>;
  applyPrivacyPolicy(identityId: string): Promise<boolean>;
  
  // Profile Synchronization
  syncProfileWithQonsent(identityId: string): Promise<boolean>;
  syncAllProfiles(): Promise<{ success: number; failed: number; errors: string[] }>;
  
  // Consent Management
  grantConsent(identityId: string, module: string, permission: string, metadata?: any): Promise<boolean>;
  revokeConsent(identityId: string, module: string, permission: string): Promise<boolean>;
  checkConsent(identityId: string, module: string, permission: string): Promise<boolean>;
  
  // Privacy Level Management
  setPrivacyLevel(identityId: string, level: PrivacyLevel): Promise<boolean>;
  getEffectivePrivacyLevel(identityId: string): Promise<PrivacyLevel>;
  
  // Module Integration
  getModulePermissions(identityId: string, module: string): Promise<ModulePermissions>;
  updateModulePermissions(identityId: string, module: string, permissions: Partial<ModulePermissions>): Promise<boolean>;
}

export interface ModulePermissions {
  enabled: boolean;
  level: 'MINIMAL' | 'STANDARD' | 'FULL';
  restrictions: string[];
  dataSharing: boolean;
  visibility: PrivacyLevel;
}

export class IdentityQonsentService implements IdentityQonsentServiceInterface {
  private profiles: Map<string, IdentityQonsentProfile> = new Map();
  private activeProfileId: string | null = null;

  constructor() {
    this.loadProfilesFromStorage();
  }

  /**
   * Create a new Qonsent profile for an identity
   */
  async createQonsentProfile(identity: ExtendedSquidIdentity): Promise<IdentityQonsentProfile> {
    const profileId = `qonsent-${identity.did}-${Date.now()}`;
    
    // Determine default privacy level based on identity type
    const defaultPrivacyLevel = this.getDefaultPrivacyLevel(identity.type);
    
    const profile: IdentityQonsentProfile = {
      identityId: identity.did,
      profileId,
      privacyLevel: defaultPrivacyLevel,
      dataSharing: this.getDefaultDataSharing(identity.type),
      visibilityRules: this.getDefaultVisibilityRules(identity.type),
      consentHistory: [],
      lastUpdated: new Date().toISOString()
    };

    // Store profile
    this.profiles.set(identity.did, profile);
    await this.saveProfilesToStorage();
    
    // Log profile creation
    await this.logConsentEvent(identity.did, 'GRANTED', 'SYSTEM', 'PROFILE_CREATED', {
      profileId,
      identityType: identity.type,
      privacyLevel: defaultPrivacyLevel
    });

    console.log(`[IdentityQonsentService] Created Qonsent profile for identity: ${identity.did}`);
    
    return profile;
  }

  /**
   * Get Qonsent profile for an identity
   */
  async getQonsentProfile(identityId: string): Promise<IdentityQonsentProfile | null> {
    return this.profiles.get(identityId) || null;
  }

  /**
   * Update Qonsent profile
   */
  async updateQonsentProfile(identityId: string, updates: Partial<IdentityQonsentProfile>): Promise<boolean> {
    const existingProfile = this.profiles.get(identityId);
    if (!existingProfile) {
      console.error(`[IdentityQonsentService] Profile not found for identity: ${identityId}`);
      return false;
    }

    const updatedProfile: IdentityQonsentProfile = {
      ...existingProfile,
      ...updates,
      lastUpdated: new Date().toISOString()
    };

    this.profiles.set(identityId, updatedProfile);
    await this.saveProfilesToStorage();

    // Log profile update
    await this.logConsentEvent(identityId, 'MODIFIED', 'SYSTEM', 'PROFILE_UPDATED', {
      changes: updates,
      previousState: existingProfile
    });

    console.log(`[IdentityQonsentService] Updated Qonsent profile for identity: ${identityId}`);
    
    return true;
  }

  /**
   * Delete Qonsent profile
   */
  async deleteQonsentProfile(identityId: string): Promise<boolean> {
    const profile = this.profiles.get(identityId);
    if (!profile) {
      return false;
    }

    this.profiles.delete(identityId);
    await this.saveProfilesToStorage();

    // Log profile deletion
    await this.logConsentEvent(identityId, 'REVOKED', 'SYSTEM', 'PROFILE_DELETED', {
      profileId: profile.profileId
    });

    console.log(`[IdentityQonsentService] Deleted Qonsent profile for identity: ${identityId}`);
    
    return true;
  }

  /**
   * Switch privacy context between identities
   */
  async switchPrivacyContext(fromIdentityId: string, toIdentityId: string): Promise<boolean> {
    try {
      // Get target profile
      const targetProfile = await this.getQonsentProfile(toIdentityId);
      if (!targetProfile) {
        console.error(`[IdentityQonsentService] No Qonsent profile found for identity: ${toIdentityId}`);
        return false;
      }

      // Apply the new privacy policy
      const applied = await this.applyPrivacyPolicy(toIdentityId);
      if (!applied) {
        console.error(`[IdentityQonsentService] Failed to apply privacy policy for identity: ${toIdentityId}`);
        return false;
      }

      // Update active profile
      this.activeProfileId = toIdentityId;

      // Log context switch
      await this.logConsentEvent(toIdentityId, 'GRANTED', 'SYSTEM', 'CONTEXT_SWITCHED', {
        fromIdentity: fromIdentityId,
        toIdentity: toIdentityId,
        privacyLevel: targetProfile.privacyLevel
      });

      console.log(`[IdentityQonsentService] Switched privacy context from ${fromIdentityId} to ${toIdentityId}`);
      
      return true;
    } catch (error) {
      console.error('[IdentityQonsentService] Error switching privacy context:', error);
      return false;
    }
  }

  /**
   * Apply privacy policy for an identity
   */
  async applyPrivacyPolicy(identityId: string): Promise<boolean> {
    try {
      const profile = await this.getQonsentProfile(identityId);
      if (!profile) {
        return false;
      }

      // Convert to legacy QonsentSettings format for compatibility
      const qonsentSettings: QonsentSettings = {
        exposureLevel: this.mapPrivacyLevelToExposure(profile.privacyLevel),
        moduleSharing: this.extractModuleSharing(profile.dataSharing),
        useQmask: profile.privacyLevel === PrivacyLevel.ANONYMOUS,
        qmaskStrength: profile.privacyLevel === PrivacyLevel.ANONYMOUS ? 'advanced' : 'standard'
      };

      // Apply settings to the existing Qonsent system
      // This would integrate with the existing useQonsent hook
      await this.applyQonsentSettings(identityId, qonsentSettings);

      console.log(`[IdentityQonsentService] Applied privacy policy for identity: ${identityId}`);
      
      return true;
    } catch (error) {
      console.error('[IdentityQonsentService] Error applying privacy policy:', error);
      return false;
    }
  }

  /**
   * Sync profile with external Qonsent service
   */
  async syncProfileWithQonsent(identityId: string): Promise<boolean> {
    try {
      const profile = await this.getQonsentProfile(identityId);
      if (!profile) {
        return false;
      }

      // Simulate sync with external Qonsent service
      // In real implementation, this would call the Qonsent API
      await new Promise(resolve => setTimeout(resolve, 200));

      // Update last sync timestamp
      await this.updateQonsentProfile(identityId, {
        lastUpdated: new Date().toISOString()
      });

      console.log(`[IdentityQonsentService] Synced profile with Qonsent for identity: ${identityId}`);
      
      return true;
    } catch (error) {
      console.error('[IdentityQonsentService] Error syncing profile:', error);
      return false;
    }
  }

  /**
   * Sync all profiles
   */
  async syncAllProfiles(): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const [identityId] of this.profiles) {
      try {
        const synced = await this.syncProfileWithQonsent(identityId);
        if (synced) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`Failed to sync profile for identity: ${identityId}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Error syncing identity ${identityId}: ${error}`);
      }
    }

    console.log(`[IdentityQonsentService] Sync completed: ${results.success} success, ${results.failed} failed`);
    
    return results;
  }

  /**
   * Grant consent for a specific module and permission
   */
  async grantConsent(identityId: string, module: string, permission: string, metadata?: any): Promise<boolean> {
    try {
      const profile = await this.getQonsentProfile(identityId);
      if (!profile) {
        return false;
      }

      // Update module permissions
      if (!profile.dataSharing[module]) {
        profile.dataSharing[module] = {
          enabled: true,
          level: 'STANDARD',
          restrictions: []
        };
      }
      profile.dataSharing[module].enabled = true;

      // Log consent event
      await this.logConsentEvent(identityId, 'GRANTED', module, permission, metadata);

      // Update profile
      await this.updateQonsentProfile(identityId, { dataSharing: profile.dataSharing });

      console.log(`[IdentityQonsentService] Granted consent for ${module}:${permission} to identity: ${identityId}`);
      
      return true;
    } catch (error) {
      console.error('[IdentityQonsentService] Error granting consent:', error);
      return false;
    }
  }

  /**
   * Revoke consent for a specific module and permission
   */
  async revokeConsent(identityId: string, module: string, permission: string): Promise<boolean> {
    try {
      const profile = await this.getQonsentProfile(identityId);
      if (!profile) {
        return false;
      }

      // Update module permissions
      if (profile.dataSharing[module]) {
        profile.dataSharing[module].enabled = false;
      }

      // Log consent event
      await this.logConsentEvent(identityId, 'REVOKED', module, permission);

      // Update profile
      await this.updateQonsentProfile(identityId, { dataSharing: profile.dataSharing });

      console.log(`[IdentityQonsentService] Revoked consent for ${module}:${permission} from identity: ${identityId}`);
      
      return true;
    } catch (error) {
      console.error('[IdentityQonsentService] Error revoking consent:', error);
      return false;
    }
  }

  /**
   * Check if consent is granted for a specific module and permission
   */
  async checkConsent(identityId: string, module: string, permission: string): Promise<boolean> {
    try {
      const profile = await this.getQonsentProfile(identityId);
      if (!profile) {
        return false;
      }

      const modulePermissions = profile.dataSharing[module];
      if (!modulePermissions) {
        return false;
      }

      return modulePermissions.enabled && !modulePermissions.restrictions.includes(permission);
    } catch (error) {
      console.error('[IdentityQonsentService] Error checking consent:', error);
      return false;
    }
  }

  /**
   * Set privacy level for an identity
   */
  async setPrivacyLevel(identityId: string, level: PrivacyLevel): Promise<boolean> {
    try {
      const updated = await this.updateQonsentProfile(identityId, { privacyLevel: level });
      if (updated) {
        // Apply the new privacy policy
        await this.applyPrivacyPolicy(identityId);
      }
      return updated;
    } catch (error) {
      console.error('[IdentityQonsentService] Error setting privacy level:', error);
      return false;
    }
  }

  /**
   * Get effective privacy level for an identity
   */
  async getEffectivePrivacyLevel(identityId: string): Promise<PrivacyLevel> {
    const profile = await this.getQonsentProfile(identityId);
    return profile?.privacyLevel || PrivacyLevel.PUBLIC;
  }

  /**
   * Get module permissions for an identity
   */
  async getModulePermissions(identityId: string, module: string): Promise<ModulePermissions> {
    const profile = await this.getQonsentProfile(identityId);
    
    if (!profile || !profile.dataSharing[module]) {
      return {
        enabled: false,
        level: 'MINIMAL',
        restrictions: [],
        dataSharing: false,
        visibility: PrivacyLevel.PRIVATE
      };
    }

    const moduleData = profile.dataSharing[module];
    
    return {
      enabled: moduleData.enabled,
      level: moduleData.level,
      restrictions: moduleData.restrictions,
      dataSharing: moduleData.enabled,
      visibility: profile.visibilityRules.profile
    };
  }

  /**
   * Update module permissions for an identity
   */
  async updateModulePermissions(identityId: string, module: string, permissions: Partial<ModulePermissions>): Promise<boolean> {
    try {
      const profile = await this.getQonsentProfile(identityId);
      if (!profile) {
        return false;
      }

      // Initialize module data if it doesn't exist
      if (!profile.dataSharing[module]) {
        profile.dataSharing[module] = {
          enabled: false,
          level: 'MINIMAL',
          restrictions: []
        };
      }

      // Update module permissions
      const moduleData = profile.dataSharing[module];
      if (permissions.enabled !== undefined) moduleData.enabled = permissions.enabled;
      if (permissions.level !== undefined) moduleData.level = permissions.level;
      if (permissions.restrictions !== undefined) moduleData.restrictions = permissions.restrictions;

      // Update profile
      await this.updateQonsentProfile(identityId, { dataSharing: profile.dataSharing });

      console.log(`[IdentityQonsentService] Updated module permissions for ${module} on identity: ${identityId}`);
      
      return true;
    } catch (error) {
      console.error('[IdentityQonsentService] Error updating module permissions:', error);
      return false;
    }
  }

  // Private helper methods

  private getDefaultPrivacyLevel(identityType: IdentityType): PrivacyLevel {
    switch (identityType) {
      case IdentityType.ROOT:
      case IdentityType.DAO:
      case IdentityType.ENTERPRISE:
        return PrivacyLevel.PUBLIC;
      case IdentityType.CONSENTIDA:
        return PrivacyLevel.PRIVATE;
      case IdentityType.AID:
        return PrivacyLevel.ANONYMOUS;
      default:
        return PrivacyLevel.PUBLIC;
    }
  }

  private getDefaultDataSharing(identityType: IdentityType): IdentityQonsentProfile['dataSharing'] {
    const baseSharing = {
      enabled: true,
      level: 'STANDARD' as const,
      restrictions: [] as string[]
    };

    switch (identityType) {
      case IdentityType.ROOT:
      case IdentityType.DAO:
      case IdentityType.ENTERPRISE:
        return {
          qsocial: { ...baseSharing, level: 'FULL' },
          qwallet: { ...baseSharing },
          qindex: { ...baseSharing, level: 'FULL' },
          qerberos: { ...baseSharing, level: 'MINIMAL' }
        };
      case IdentityType.CONSENTIDA:
        return {
          qsocial: { ...baseSharing, level: 'MINIMAL', restrictions: ['public_posts'] },
          qwallet: { enabled: false, level: 'MINIMAL', restrictions: ['all'] },
          qindex: { enabled: false, level: 'MINIMAL', restrictions: ['all'] },
          qerberos: { ...baseSharing, level: 'MINIMAL' }
        };
      case IdentityType.AID:
        return {
          qsocial: { enabled: false, level: 'MINIMAL', restrictions: ['all'] },
          qwallet: { enabled: false, level: 'MINIMAL', restrictions: ['all'] },
          qindex: { enabled: false, level: 'MINIMAL', restrictions: ['all'] },
          qerberos: { enabled: false, level: 'MINIMAL', restrictions: ['all'] }
        };
      default:
        return {};
    }
  }

  private getDefaultVisibilityRules(identityType: IdentityType): IdentityQonsentProfile['visibilityRules'] {
    switch (identityType) {
      case IdentityType.ROOT:
      case IdentityType.DAO:
      case IdentityType.ENTERPRISE:
        return {
          profile: PrivacyLevel.PUBLIC,
          activity: PrivacyLevel.PUBLIC,
          connections: PrivacyLevel.PUBLIC
        };
      case IdentityType.CONSENTIDA:
        return {
          profile: PrivacyLevel.PRIVATE,
          activity: PrivacyLevel.PRIVATE,
          connections: PrivacyLevel.PRIVATE
        };
      case IdentityType.AID:
        return {
          profile: PrivacyLevel.ANONYMOUS,
          activity: PrivacyLevel.ANONYMOUS,
          connections: PrivacyLevel.ANONYMOUS
        };
      default:
        return {
          profile: PrivacyLevel.PUBLIC,
          activity: PrivacyLevel.PUBLIC,
          connections: PrivacyLevel.PUBLIC
        };
    }
  }

  private mapPrivacyLevelToExposure(privacyLevel: PrivacyLevel): IdentityExposureLevel {
    switch (privacyLevel) {
      case PrivacyLevel.PUBLIC:
        return IdentityExposureLevel.HIGH;
      case PrivacyLevel.DAO_ONLY:
        return IdentityExposureLevel.MEDIUM;
      case PrivacyLevel.PRIVATE:
        return IdentityExposureLevel.LOW;
      case PrivacyLevel.ANONYMOUS:
        return IdentityExposureLevel.ANONYMOUS;
      default:
        return IdentityExposureLevel.MEDIUM;
    }
  }

  private extractModuleSharing(dataSharing: IdentityQonsentProfile['dataSharing']): Record<string, boolean> {
    const moduleSharing: Record<string, boolean> = {};
    
    for (const [module, config] of Object.entries(dataSharing)) {
      moduleSharing[module] = config.enabled;
    }
    
    return moduleSharing;
  }

  private async applyQonsentSettings(identityId: string, settings: QonsentSettings): Promise<void> {
    // This would integrate with the existing Qonsent system
    // For now, we'll just log the settings that would be applied
    console.log(`[IdentityQonsentService] Applying Qonsent settings for identity ${identityId}:`, settings);
    
    // Store settings in a way that the existing useQonsent hook can access them
    const settingsKey = `qonsent_settings_${identityId}`;
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }

  private async logConsentEvent(identityId: string, action: ConsentEvent['action'], module: string, permission: string, metadata?: any): Promise<void> {
    const profile = this.profiles.get(identityId);
    if (!profile) return;

    const event: ConsentEvent = {
      id: `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      module,
      permission,
      timestamp: new Date().toISOString(),
      metadata
    };

    profile.consentHistory.push(event);
    
    // Keep only the last 100 events to prevent unbounded growth
    if (profile.consentHistory.length > 100) {
      profile.consentHistory = profile.consentHistory.slice(-100);
    }

    await this.saveProfilesToStorage();
  }

  private async loadProfilesFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem('identity_qonsent_profiles');
      if (stored) {
        const profilesData = JSON.parse(stored);
        this.profiles = new Map(Object.entries(profilesData));
        console.log(`[IdentityQonsentService] Loaded ${this.profiles.size} Qonsent profiles from storage`);
      }
    } catch (error) {
      console.error('[IdentityQonsentService] Error loading profiles from storage:', error);
    }
  }

  private async saveProfilesToStorage(): Promise<void> {
    try {
      const profilesData = Object.fromEntries(this.profiles);
      localStorage.setItem('identity_qonsent_profiles', JSON.stringify(profilesData));
    } catch (error) {
      console.error('[IdentityQonsentService] Error saving profiles to storage:', error);
    }
  }
}

// Singleton instance
export const identityQonsentService = new IdentityQonsentService();