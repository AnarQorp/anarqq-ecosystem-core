/**
 * useIdentityQindex - React Hook for Identity-specific Qindex Management
 * 
 * Provides identity registration, search, and discovery functionality
 */

import { useState, useCallback } from 'react';
import { 
  identityQindexService,
  RegistrationResult,
  IdentityMetadata,
  IdentityClassification,
  SearchQuery,
  SearchResult,
  DiscoveryCriteria,
  DiscoveryResult,
  IndexedIdentity,
  IndexStatus,
  OptimizationResult,
  VisibilitySettings,
  IdentityAnalytics,
  SystemAnalytics
} from '@/services/identity/IdentityQindexService';
import { ExtendedSquidIdentity } from '@/types/identity';

export interface UseIdentityQindexReturn {
  // Current State
  loading: boolean;
  error: string | null;
  
  // Identity Registration
  registerIdentity: (identity: ExtendedSquidIdentity) => Promise<RegistrationResult>;
  updateMetadata: (identityId: string, metadata: IdentityMetadata) => Promise<boolean>;
  deregisterIdentity: (identityId: string) => Promise<boolean>;
  
  // Classification
  classifyIdentity: (identity: ExtendedSquidIdentity) => Promise<IdentityClassification | null>;
  updateClassification: (identityId: string, classification: IdentityClassification) => Promise<boolean>;
  
  // Search and Discovery
  searchIdentities: (query: SearchQuery) => Promise<SearchResult[]>;
  discoverIdentities: (criteria: DiscoveryCriteria) => Promise<DiscoveryResult[]>;
  getIdentityByDID: (did: string) => Promise<IndexedIdentity | null>;
  
  // Index Management
  reindexIdentity: (identityId: string) => Promise<boolean>;
  getIndexStatus: (identityId: string) => Promise<IndexStatus>;
  optimizeIndex: () => Promise<OptimizationResult | null>;
  
  // Metadata Management
  storeMetadata: (identityId: string, metadata: any) => Promise<string | null>;
  retrieveMetadata: (identityId: string) => Promise<any>;
  updateStoredMetadata: (identityId: string, updates: any) => Promise<boolean>;
  
  // Visibility Management
  setVisibility: (identityId: string, visibility: VisibilitySettings) => Promise<boolean>;
  getVisibility: (identityId: string) => Promise<VisibilitySettings | null>;
  
  // Analytics
  getIdentityAnalytics: (identityId: string) => Promise<IdentityAnalytics | null>;
  getSystemAnalytics: () => Promise<SystemAnalytics | null>;
  
  // Integration
  syncWithIPFS: (identityId: string) => Promise<boolean>;
  syncWithBlockchain: (identityId: string) => Promise<boolean>;
  
  // Utilities
  clearError: () => void;
}

export const useIdentityQindex = (): UseIdentityQindexReturn => {
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerIdentity = useCallback(async (identity: ExtendedSquidIdentity): Promise<RegistrationResult> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await identityQindexService.registerIdentity(identity);
      
      if (!result.success) {
        setError(result.error || 'Failed to register identity');
      }
      
      console.log(`[useIdentityQindex] Registration result for ${identity.did}: ${result.success}`);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register identity';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error registering identity:', err);
      return {
        success: false,
        identityId: identity.did,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMetadata = useCallback(async (identityId: string, metadata: IdentityMetadata): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await identityQindexService.updateIdentityMetadata(identityId, metadata);
      
      if (!success) {
        setError('Failed to update identity metadata');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update metadata';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error updating metadata:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deregisterIdentity = useCallback(async (identityId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await identityQindexService.deregisterIdentity(identityId);
      
      if (!success) {
        setError('Failed to deregister identity');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deregister identity';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error deregistering identity:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const classifyIdentity = useCallback(async (identity: ExtendedSquidIdentity): Promise<IdentityClassification | null> => {
    try {
      setError(null);
      
      const classification = await identityQindexService.classifyIdentity(identity);
      
      return classification;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to classify identity';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error classifying identity:', err);
      return null;
    }
  }, []);

  const updateClassification = useCallback(async (identityId: string, classification: IdentityClassification): Promise<boolean> => {
    try {
      setError(null);
      
      const success = await identityQindexService.updateClassification(identityId, classification);
      
      if (!success) {
        setError('Failed to update classification');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update classification';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error updating classification:', err);
      return false;
    }
  }, []);

  const searchIdentities = useCallback(async (query: SearchQuery): Promise<SearchResult[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await identityQindexService.searchIdentities(query);
      
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search identities';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error searching identities:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const discoverIdentities = useCallback(async (criteria: DiscoveryCriteria): Promise<DiscoveryResult[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await identityQindexService.discoverIdentities(criteria);
      
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to discover identities';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error discovering identities:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getIdentityByDID = useCallback(async (did: string): Promise<IndexedIdentity | null> => {
    try {
      setError(null);
      
      const identity = await identityQindexService.getIdentityByDID(did);
      
      return identity;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get identity';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error getting identity by DID:', err);
      return null;
    }
  }, []);

  const reindexIdentity = useCallback(async (identityId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await identityQindexService.reindexIdentity(identityId);
      
      if (!success) {
        setError('Failed to reindex identity');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reindex identity';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error reindexing identity:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getIndexStatus = useCallback(async (identityId: string): Promise<IndexStatus> => {
    try {
      setError(null);
      
      const status = await identityQindexService.getIndexStatus(identityId);
      
      return status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get index status';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error getting index status:', err);
      return {
        identityId,
        indexed: false,
        lastIndexed: 'Error',
        indexHealth: 'FAILED',
        issues: [errorMessage],
        nextReindex: 'N/A'
      };
    }
  }, []);

  const optimizeIndex = useCallback(async (): Promise<OptimizationResult | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await identityQindexService.optimizeIndex();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to optimize index';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error optimizing index:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const storeMetadata = useCallback(async (identityId: string, metadata: any): Promise<string | null> => {
    try {
      setError(null);
      
      const hash = await identityQindexService.storeMetadata(identityId, metadata);
      
      return hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to store metadata';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error storing metadata:', err);
      return null;
    }
  }, []);

  const retrieveMetadata = useCallback(async (identityId: string): Promise<any> => {
    try {
      setError(null);
      
      const metadata = await identityQindexService.retrieveMetadata(identityId);
      
      return metadata;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retrieve metadata';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error retrieving metadata:', err);
      return null;
    }
  }, []);

  const updateStoredMetadata = useCallback(async (identityId: string, updates: any): Promise<boolean> => {
    try {
      setError(null);
      
      const success = await identityQindexService.updateMetadata(identityId, updates);
      
      if (!success) {
        setError('Failed to update stored metadata');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update stored metadata';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error updating stored metadata:', err);
      return false;
    }
  }, []);

  const setVisibility = useCallback(async (identityId: string, visibility: VisibilitySettings): Promise<boolean> => {
    try {
      setError(null);
      
      const success = await identityQindexService.setVisibility(identityId, visibility);
      
      if (!success) {
        setError('Failed to set visibility');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set visibility';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error setting visibility:', err);
      return false;
    }
  }, []);

  const getVisibility = useCallback(async (identityId: string): Promise<VisibilitySettings | null> => {
    try {
      setError(null);
      
      const visibility = await identityQindexService.getVisibilitySettings(identityId);
      
      return visibility;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get visibility';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error getting visibility:', err);
      return null;
    }
  }, []);

  const getIdentityAnalytics = useCallback(async (identityId: string): Promise<IdentityAnalytics | null> => {
    try {
      setError(null);
      
      const analytics = await identityQindexService.getIdentityAnalytics(identityId);
      
      return analytics;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get identity analytics';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error getting identity analytics:', err);
      return null;
    }
  }, []);

  const getSystemAnalytics = useCallback(async (): Promise<SystemAnalytics | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const analytics = await identityQindexService.getSystemAnalytics();
      
      return analytics;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get system analytics';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error getting system analytics:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const syncWithIPFS = useCallback(async (identityId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const success = await identityQindexService.syncWithIPFS(identityId);
      
      if (!success) {
        setError('Failed to sync with IPFS');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync with IPFS';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error syncing with IPFS:', err);
      return false;
    }
  }, []);

  const syncWithBlockchain = useCallback(async (identityId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const success = await identityQindexService.syncWithBlockchain(identityId);
      
      if (!success) {
        setError('Failed to sync with blockchain');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync with blockchain';
      setError(errorMessage);
      console.error('[useIdentityQindex] Error syncing with blockchain:', err);
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Current State
    loading,
    error,
    
    // Identity Registration
    registerIdentity,
    updateMetadata,
    deregisterIdentity,
    
    // Classification
    classifyIdentity,
    updateClassification,
    
    // Search and Discovery
    searchIdentities,
    discoverIdentities,
    getIdentityByDID,
    
    // Index Management
    reindexIdentity,
    getIndexStatus,
    optimizeIndex,
    
    // Metadata Management
    storeMetadata,
    retrieveMetadata,
    updateStoredMetadata,
    
    // Visibility Management
    setVisibility,
    getVisibility,
    
    // Analytics
    getIdentityAnalytics,
    getSystemAnalytics,
    
    // Integration
    syncWithIPFS,
    syncWithBlockchain,
    
    // Utilities
    clearError
  };
};