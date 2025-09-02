/**
 * useQonsent - React Hook for Qonsent Privacy Management
 * 
 * Provides privacy settings management, consent handling, and data protection
 * controls for the AnarQ&Q ecosystem.
 */

import { useState, useCallback, useEffect } from 'react';
import { useSessionContext } from '@/contexts/SessionContext';
import * as QonsentAPI from '@/api/qonsent';
import { QonsentSettings, IdentityExposureLevel } from '@/types/qonsent';

export interface UseQonsentReturn {
  // State
  settings: QonsentSettings | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  updateSettings: (newSettings: Partial<QonsentSettings>) => Promise<boolean>;
  generateProfile: (data: any) => Promise<string>;
  checkConsent: (action: string, data: any) => Promise<boolean>;
  revokeConsent: (profileId: string) => Promise<boolean>;
  exportData: () => Promise<string | null>;
  deleteAccount: () => Promise<boolean>;
  
  // Utilities
  clearError: () => void;
  refreshSettings: () => Promise<void>;
}

export const useQonsent = (): UseQonsentReturn => {
  const { session, isAuthenticated } = useSessionContext();
  
  // State
  const [settings, setSettings] = useState<QonsentSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings when user changes
  useEffect(() => {
    if (isAuthenticated && session?.id) {
      loadSettings();
    }
  }, [isAuthenticated, session?.id]);

  const loadSettings = useCallback(async () => {
    if (!session?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await QonsentAPI.getPrivacySettings(session.id);
      
      if (response.success && response.settings) {
        // Convert API response to QonsentSettings format
        const qonsentSettings: QonsentSettings = {
          exposureLevel: response.settings.exposureLevel || IdentityExposureLevel.MEDIUM,
          moduleSharing: response.settings.moduleSharing || {},
          useQmask: response.settings.useQmask || false,
          qmaskStrength: response.settings.qmaskStrength || 'standard'
        };
        
        setSettings(qonsentSettings);
      } else {
        throw new Error(response.error || 'Failed to load privacy settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
      console.error('Qonsent settings load error:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.id]);

  const updateSettings = useCallback(async (newSettings: Partial<QonsentSettings>): Promise<boolean> => {
    if (!session?.id || !settings) return false;
    
    try {
      setLoading(true);
      setError(null);
      
      const updatedSettings = { ...settings, ...newSettings };
      
      const response = await QonsentAPI.updatePrivacySettings(session.id, updatedSettings as any);
      
      if (response.success) {
        setSettings(updatedSettings);
        return true;
      } else {
        throw new Error(response.error || 'Failed to update settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      console.error('Qonsent settings update error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [session?.id, settings]);

  const generateProfile = useCallback(async (data: any): Promise<string> => {
    if (!session?.id || !settings) {
      throw new Error('Authentication required');
    }
    
    try {
      setError(null);
      
      // Generate privacy profile based on current settings
      const profileId = `qonsent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const profile = {
        profileId,
        userId: session.id,
        exposureLevel: settings.exposureLevel,
        visibility: data.visibility || 'public',
        encryptionLevel: settings.exposureLevel === IdentityExposureLevel.HIGH ? 'high' : 'medium',
        moduleSharing: settings.moduleSharing,
        useQmask: settings.useQmask,
        qmaskStrength: settings.qmaskStrength,
        createdAt: new Date().toISOString(),
        dataHash: await generateDataHash(data)
      };
      
      // Store profile (in real implementation, this would be stored securely)
      const profiles = JSON.parse(localStorage.getItem('qonsent_profiles') || '{}');
      profiles[profileId] = profile;
      localStorage.setItem('qonsent_profiles', JSON.stringify(profiles));
      
      console.log(`[Qonsent] Generated privacy profile: ${profileId}`);
      
      return profileId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate profile';
      setError(errorMessage);
      console.error('Qonsent profile generation error:', err);
      throw new Error(errorMessage);
    }
  }, [session?.id, settings]);

  const checkConsent = useCallback(async (action: string, data: any): Promise<boolean> => {
    if (!session?.id || !settings) return false;
    
    try {
      setError(null);
      
      // Check if action is allowed based on current settings
      const allowedActions = {
        [IdentityExposureLevel.ANONYMOUS]: ['view_public'],
        [IdentityExposureLevel.LOW]: ['view_public', 'create_content'],
        [IdentityExposureLevel.MEDIUM]: ['view_public', 'create_content', 'share_data'],
        [IdentityExposureLevel.HIGH]: ['view_public', 'create_content', 'share_data', 'export_data']
      };
      
      const userAllowedActions = allowedActions[settings.exposureLevel] || [];
      const isAllowed = userAllowedActions.includes(action);
      
      console.log(`[Qonsent] Consent check for "${action}": ${isAllowed ? 'ALLOWED' : 'DENIED'}`);
      
      return isAllowed;
    } catch (err) {
      console.error('Qonsent consent check error:', err);
      return false;
    }
  }, [session?.id, settings]);

  const revokeConsent = useCallback(async (profileId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Remove profile from storage
      const profiles = JSON.parse(localStorage.getItem('qonsent_profiles') || '{}');
      delete profiles[profileId];
      localStorage.setItem('qonsent_profiles', JSON.stringify(profiles));
      
      console.log(`[Qonsent] Revoked consent for profile: ${profileId}`);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke consent';
      setError(errorMessage);
      console.error('Qonsent consent revocation error:', err);
      return false;
    }
  }, []);

  const exportData = useCallback(async (): Promise<string | null> => {
    if (!session?.id) return null;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await QonsentAPI.requestDataExport(session.id);
      
      if (response.success) {
        return response.requestId || null;
      } else {
        throw new Error(response.error || 'Failed to request data export');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data';
      setError(errorMessage);
      console.error('Qonsent data export error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [session?.id]);

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    if (!session?.id) return false;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await QonsentAPI.requestAccountDeletion(session.id);
      
      if (response.success) {
        // Clear local settings
        setSettings(null);
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete account');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setError(errorMessage);
      console.error('Qonsent account deletion error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [session?.id]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshSettings = useCallback(async (): Promise<void> => {
    await loadSettings();
  }, [loadSettings]);

  return {
    // State
    settings,
    loading,
    error,
    
    // Actions
    updateSettings,
    generateProfile,
    checkConsent,
    revokeConsent,
    exportData,
    deleteAccount,
    
    // Utilities
    clearError,
    refreshSettings
  };
};

// Helper function to generate data hash
async function generateDataHash(data: any): Promise<string> {
  const encoder = new TextEncoder();
  const dataString = JSON.stringify(data);
  const dataBuffer = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}