/**
 * useIdentityQonsent - React Hook for Identity-specific Qonsent Management
 * 
 * Provides per-identity privacy settings management and dynamic policy switching
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  identityQonsentService, 
  IdentityQonsentServiceInterface,
  ModulePermissions 
} from '@/services/identity/IdentityQonsentService';
import { 
  IdentityQonsentProfile, 
  ExtendedSquidIdentity, 
  PrivacyLevel 
} from '@/types/identity';

export interface UseIdentityQonsentReturn {
  // Current Profile State
  currentProfile: IdentityQonsentProfile | null;
  activeIdentityId: string | null;
  loading: boolean;
  error: string | null;
  
  // Profile Management
  createProfile: (identity: ExtendedSquidIdentity) => Promise<boolean>;
  updateProfile: (updates: Partial<IdentityQonsentProfile>) => Promise<boolean>;
  deleteProfile: (identityId: string) => Promise<boolean>;
  
  // Privacy Context Switching
  switchPrivacyContext: (toIdentityId: string) => Promise<boolean>;
  applyPrivacyPolicy: (identityId: string) => Promise<boolean>;
  
  // Consent Management
  grantConsent: (module: string, permission: string, metadata?: any) => Promise<boolean>;
  revokeConsent: (module: string, permission: string) => Promise<boolean>;
  checkConsent: (module: string, permission: string) => Promise<boolean>;
  
  // Privacy Level Management
  setPrivacyLevel: (level: PrivacyLevel) => Promise<boolean>;
  getEffectivePrivacyLevel: () => Promise<PrivacyLevel>;
  
  // Module Permissions
  getModulePermissions: (module: string) => Promise<ModulePermissions>;
  updateModulePermissions: (module: string, permissions: Partial<ModulePermissions>) => Promise<boolean>;
  
  // Profile Synchronization
  syncProfile: () => Promise<boolean>;
  syncAllProfiles: () => Promise<{ success: number; failed: number; errors: string[] }>;
  
  // Utilities
  clearError: () => void;
  refreshProfile: () => Promise<void>;
  getProfileHistory: () => IdentityQonsentProfile['consentHistory'];
}

export const useIdentityQonsent = (identityId?: string): UseIdentityQonsentReturn => {
  // State
  const [currentProfile, setCurrentProfile] = useState<IdentityQonsentProfile | null>(null);
  const [activeIdentityId, setActiveIdentityId] = useState<string | null>(identityId || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load profile when identity changes
  useEffect(() => {
    if (activeIdentityId) {
      loadProfile(activeIdentityId);
    } else {
      setCurrentProfile(null);
    }
  }, [activeIdentityId]);

  // Update active identity when prop changes
  useEffect(() => {
    if (identityId && identityId !== activeIdentityId) {
      setActiveIdentityId(identityId);
    }
  }, [identityId, activeIdentityId]);

  const loadProfile = useCallback(async (identityId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const profile = await identityQonsentService.getQonsentProfile(identityId);
      setCurrentProfile(profile);
      
      if (!profile) {
        console.warn(`[useIdentityQonsent] No Qonsent profile found for identity: ${identityId}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Qonsent profile';
      setError(errorMessage);
      console.error('[useIdentityQonsent] Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProfile = useCallback(async (identity: ExtendedSquidIdentity): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const profile = await identityQonsentService.createQonsentProfile(identity);
      setCurrentProfile(profile);
      setActiveIdentityId(identity.did);
      
      console.log(`[useIdentityQonsent] Created Qonsent profile for identity: ${identity.did}`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create Qonsent profile';
      setError(errorMessage);
      console.error('[useIdentityQonsent] Error creating profile:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<IdentityQonsentProfile>): Promise<boolean> => {
    if (!activeIdentityId) {
      setError('No active identity');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const success = await identityQonsentService.updateQonsentProfile(activeIdentityId, updates);
      
      if (success) {
        // Reload the profile to get the updated version
        await loadProfile(activeIdentityId);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update Qonsent profile';
      setError(errorMessage);
      console.error('[useIdentityQonsent] Error updating profile:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeIdentityId, loadProfile]);

  const deleteProfile = useCallback(async (identityId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await identityQonsentService.deleteQonsentProfile(identityId);
      
      if (success && identityId === activeIdentityId) {
        setCurrentProfile(null);
        setActiveIdentityId(null);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete Qonsent profile';
      setError(errorMessage);
      console.error('[useIdentityQonsent] Error deleting profile:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeIdentityId]);

  const switchPrivacyContext = useCallback(async (toIdentityId: string): Promise<boolean> => {
    if (!activeIdentityId) {
      setError('No active identity to switch from');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const success = await identityQonsentService.switchPrivacyContext(activeIdentityId, toIdentityId);
      
      if (success) {
        setActiveIdentityId(toIdentityId);
        await loadProfile(toIdentityId);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch privacy context';
      setError(errorMessage);
      console.error('[useIdentityQonsent] Error switching privacy context:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeIdentityId, loadProfile]);

  const applyPrivacyPolicy = useCallback(async (identityId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const success = await identityQonsentService.applyPrivacyPolicy(identityId);
      
      if (!success) {
        setError('Failed to apply privacy policy');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply privacy policy';
      setError(errorMessage);
      console.error('[useIdentityQonsent] Error applying privacy policy:', err);
      return false;
    }
  }, []);

  const grantConsent = useCallback(async (module: string, permission: string, metadata?: any): Promise<boolean> => {
    if (!activeIdentityId) {
      setError('No active identity');
      return false;
    }

    try {
      setError(null);
      
      const success = await identityQonsentService.grantConsent(activeIdentityId, module, permission, metadata);
      
      if (success) {
        // Reload profile to reflect changes
        await loadProfile(activeIdentityId);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to grant consent';
      setError(errorMessage);
      console.error('[useIdentityQonsent] Error granting consent:', err);
      return false;
    }
  }, [activeIdentityId, loadProfile]);

  const revokeConsent = useCallback(async (module: string, permission: string): Promise<boolean> => {
    if (!activeIdentityId) {
      setError('No active identity');
      return false;
    }

    try {
      setError(null);
      
      const success = await identityQonsentService.revokeConsent(activeIdentityId, module, permission);
      
      if (success) {
        // Reload profile to reflect changes
        await loadProfile(activeIdentityId);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke consent';
      setError(errorMessage);
      console.error('[useIdentityQonsent] Error revoking consent:', err);
      return false;
    }
  }, [activeIdentityId, loadProfile]);

  const checkConsent = useCallback(async (module: string, permission: string): Promise<boolean> => {
    if (!activeIdentityId) {
      return false;
    }

    try {
      return await identityQonsentService.checkConsent(activeIdentityId, module, permission);
    } catch (err) {
      console.error('[useIdentityQonsent] Error checking consent:', err);
      return false;
    }
  }, [activeIdentityId]);

  const setPrivacyLevel = useCallback(async (level: PrivacyLevel): Promise<boolean> => {
    if (!activeIdentityId) {
      setError('No active identity');
      return false;
    }

    try {
      setError(null);
      
      const success = await identityQonsentService.setPrivacyLevel(activeIdentityId, level);
      
      if (success) {
        // Reload profile to reflect changes
        await loadProfile(activeIdentityId);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set privacy level';
      setError(errorMessage);
      console.error('[useIdentityQonsent] Error setting privacy level:', err);
      return false;
    }
  }, [activeIdentityId, loadProfile]);

  const getEffectivePrivacyLevel = useCallback(async (): Promise<PrivacyLevel> => {
    if (!activeIdentityId) {
      return PrivacyLevel.PUBLIC;
    }

    try {
      return await identityQonsentService.getEffectivePrivacyLevel(activeIdentityId);
    } catch (err) {
      console.error('[useIdentityQonsent] Error getting privacy level:', err);
      return PrivacyLevel.PUBLIC;
    }
  }, [activeIdentityId]);

  const getModulePermissions = useCallback(async (module: string): Promise<ModulePermissions> => {
    if (!activeIdentityId) {
      return {
        enabled: false,
        level: 'MINIMAL',
        restrictions: [],
        dataSharing: false,
        visibility: PrivacyLevel.PRIVATE
      };
    }

    try {
      return await identityQonsentService.getModulePermissions(activeIdentityId, module);
    } catch (err) {
      console.error('[useIdentityQonsent] Error getting module permissions:', err);
      return {
        enabled: false,
        level: 'MINIMAL',
        restrictions: [],
        dataSharing: false,
        visibility: PrivacyLevel.PRIVATE
      };
    }
  }, [activeIdentityId]);

  const updateModulePermissions = useCallback(async (module: string, permissions: Partial<ModulePermissions>): Promise<boolean> => {
    if (!activeIdentityId) {
      setError('No active identity');
      return false;
    }

    try {
      setError(null);
      
      const success = await identityQonsentService.updateModulePermissions(activeIdentityId, module, permissions);
      
      if (success) {
        // Reload profile to reflect changes
        await loadProfile(activeIdentityId);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update module permissions';
      setError(errorMessage);
      console.error('[useIdentityQonsent] Error updating module permissions:', err);
      return false;
    }
  }, [activeIdentityId, loadProfile]);

  const syncProfile = useCallback(async (): Promise<boolean> => {
    if (!activeIdentityId) {
      setError('No active identity');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const success = await identityQonsentService.syncProfileWithQonsent(activeIdentityId);
      
      if (success) {
        // Reload profile to get any updates from sync
        await loadProfile(activeIdentityId);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync profile';
      setError(errorMessage);
      console.error('[useIdentityQonsent] Error syncing profile:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeIdentityId, loadProfile]);

  const syncAllProfiles = useCallback(async (): Promise<{ success: number; failed: number; errors: string[] }> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await identityQonsentService.syncAllProfiles();
      
      if (result.errors.length > 0) {
        setError(`Sync completed with ${result.failed} errors`);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync all profiles';
      setError(errorMessage);
      console.error('[useIdentityQonsent] Error syncing all profiles:', err);
      return { success: 0, failed: 0, errors: [errorMessage] };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (activeIdentityId) {
      await loadProfile(activeIdentityId);
    }
  }, [activeIdentityId, loadProfile]);

  const getProfileHistory = useCallback((): IdentityQonsentProfile['consentHistory'] => {
    return currentProfile?.consentHistory || [];
  }, [currentProfile]);

  return {
    // Current Profile State
    currentProfile,
    activeIdentityId,
    loading,
    error,
    
    // Profile Management
    createProfile,
    updateProfile,
    deleteProfile,
    
    // Privacy Context Switching
    switchPrivacyContext,
    applyPrivacyPolicy,
    
    // Consent Management
    grantConsent,
    revokeConsent,
    checkConsent,
    
    // Privacy Level Management
    setPrivacyLevel,
    getEffectivePrivacyLevel,
    
    // Module Permissions
    getModulePermissions,
    updateModulePermissions,
    
    // Profile Synchronization
    syncProfile,
    syncAllProfiles,
    
    // Utilities
    clearError,
    refreshProfile,
    getProfileHistory
  };
};