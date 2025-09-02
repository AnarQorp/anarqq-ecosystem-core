/**
 * useIdentityManager Hook
 * Primary hook for identity creation, switching, and deletion with loading states and error handling
 * Requirements: 1.1, 1.2, 1.3, 4.1, 4.2
 */

import { useState, useCallback, useEffect } from 'react';
import { useIdentityStore } from '@/state/identity';
import { identityManager } from '@/services/IdentityManager';
import {
  ExtendedSquidIdentity,
  IdentityType,
  SubidentityMetadata,
  SubidentityResult,
  SwitchResult,
  DeleteResult,
  UseIdentityManagerReturn,
  IdentityAction
} from '@/types/identity';

export const useIdentityManager = (): UseIdentityManagerReturn => {
  // Local state for loading and error handling
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get state and actions from the identity store
  const {
    activeIdentity,
    identities,
    setActiveIdentity: storeSetActiveIdentity,
    createSubidentity: storeCreateSubidentity,
    deleteSubidentity: storeDeleteSubidentity,
    logIdentityAction
  } = useIdentityStore();

  // Convert Map to array for easier consumption
  const identitiesArray = Array.from(identities.values());

  /**
   * Create a new subidentity with comprehensive validation and error handling
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10
   */
  const createSubidentity = useCallback(async (
    type: IdentityType,
    metadata: SubidentityMetadata
  ): Promise<SubidentityResult> => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[useIdentityManager] Creating subidentity of type: ${type}`);

      // Validate that we have an active identity
      if (!activeIdentity) {
        const errorMsg = 'No active identity found. Please authenticate first.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Validate creation permissions
      if (!activeIdentity.permissions.canCreateSubidentities) {
        const errorMsg = 'Current identity does not have permission to create subidentities';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Validate metadata
      if (!metadata.name || metadata.name.trim().length === 0) {
        const errorMsg = 'Identity name is required';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Check depth limits
      if (activeIdentity.depth >= 2) {
        const errorMsg = 'Maximum identity depth exceeded. Cannot create more nested identities.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Use the identity manager service for creation
      const result = await identityManager.createSubidentity(type, metadata);

      if (result.success && result.identity) {
        console.log(`[useIdentityManager] Successfully created subidentity: ${result.identity.did}`);
        
        // Log the successful creation
        await logIdentityAction(result.identity.did, IdentityAction.CREATED, {
          parentId: activeIdentity.did,
          type,
          metadata: {
            name: metadata.name,
            privacyLevel: result.identity.privacyLevel
          }
        });
      } else {
        setError(result.error || 'Failed to create subidentity');
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred while creating subidentity';
      console.error('[useIdentityManager] Error creating subidentity:', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [activeIdentity, logIdentityAction]);

  /**
   * Switch to a different identity with context updates
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
   */
  const switchIdentity = useCallback(async (identityId: string): Promise<SwitchResult> => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[useIdentityManager] Switching to identity: ${identityId}`);

      // Validate that the identity exists
      const targetIdentity = identities.get(identityId);
      if (!targetIdentity) {
        const errorMsg = `Identity with ID ${identityId} not found`;
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Check if identity is active
      if (targetIdentity.status !== 'ACTIVE') {
        const errorMsg = 'Cannot switch to inactive identity';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Verify ownership if not switching to own identity
      const currentIdentity = activeIdentity;
      if (currentIdentity && targetIdentity.did !== currentIdentity.did) {
        const hasOwnership = await identityManager.verifyIdentityOwnership(identityId, currentIdentity.did);
        if (!hasOwnership) {
          const errorMsg = 'You do not have permission to switch to this identity';
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }
      }

      // Use the identity manager service for switching
      const result = await identityManager.switchActiveIdentity(identityId);

      if (result.success) {
        console.log(`[useIdentityManager] Successfully switched to identity: ${identityId}`);
        
        // Update the store state
        await storeSetActiveIdentity(targetIdentity);
      } else {
        setError(result.error || 'Failed to switch identity');
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred while switching identity';
      console.error('[useIdentityManager] Error switching identity:', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [activeIdentity, identities, storeSetActiveIdentity]);

  /**
   * Delete a subidentity with cascade handling
   * Requirements: 1.3, 2.10
   */
  const deleteIdentity = useCallback(async (identityId: string): Promise<DeleteResult> => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[useIdentityManager] Deleting identity: ${identityId}`);

      // Validate that the identity exists
      const targetIdentity = identities.get(identityId);
      if (!targetIdentity) {
        const errorMsg = `Identity with ID ${identityId} not found`;
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Cannot delete root identity
      if (targetIdentity.type === IdentityType.ROOT) {
        const errorMsg = 'Cannot delete root identity';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Check permissions
      if (!activeIdentity?.permissions.canDeleteSubidentities) {
        const errorMsg = 'Current identity does not have permission to delete subidentities';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Verify ownership
      if (activeIdentity) {
        const hasOwnership = await identityManager.verifyIdentityOwnership(identityId, activeIdentity.did);
        if (!hasOwnership) {
          const errorMsg = 'You do not have permission to delete this identity';
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }
      }

      // Use the identity manager service for deletion
      const result = await identityManager.deleteSubidentity(identityId);

      if (result.success) {
        console.log(`[useIdentityManager] Successfully deleted identity: ${identityId}`);
        
        // Log the deletion
        if (activeIdentity) {
          await logIdentityAction(identityId, IdentityAction.DELETED, {
            deletedBy: activeIdentity.did,
            affectedChildren: result.affectedChildren,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        setError(result.error || 'Failed to delete identity');
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred while deleting identity';
      console.error('[useIdentityManager] Error deleting identity:', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [activeIdentity, identities, logIdentityAction]);

  /**
   * Clear any existing errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refresh identities from the store
   */
  const refreshIdentities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Trigger a rebuild of the identity tree if we have a root identity
      const rootIdentity = identitiesArray.find(identity => identity.type === IdentityType.ROOT);
      if (rootIdentity) {
        await identityManager.getIdentityTree(rootIdentity.did);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh identities';
      console.error('[useIdentityManager] Error refreshing identities:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [identitiesArray]);

  /**
   * Get identity statistics
   */
  const getIdentityStats = useCallback(() => {
    const stats = {
      total: identitiesArray.length,
      byType: {
        [IdentityType.ROOT]: 0,
        [IdentityType.DAO]: 0,
        [IdentityType.ENTERPRISE]: 0,
        [IdentityType.CONSENTIDA]: 0,
        [IdentityType.AID]: 0
      },
      active: identitiesArray.filter(identity => identity.status === 'ACTIVE').length,
      withKYC: identitiesArray.filter(identity => identity.kyc.approved).length
    };

    identitiesArray.forEach(identity => {
      stats.byType[identity.type]++;
    });

    return stats;
  }, [identitiesArray]);

  // Effect to clear error when identities change (successful operations)
  useEffect(() => {
    if (error && identitiesArray.length > 0) {
      // Clear error after successful operations
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [identitiesArray.length, error]);

  // Effect to log hook usage for analytics
  useEffect(() => {
    console.log(`[useIdentityManager] Hook initialized with ${identitiesArray.length} identities`);
    console.log(`[useIdentityManager] Active identity: ${activeIdentity?.did || 'none'}`);
  }, []);

  return {
    // Core state
    identities: identitiesArray,
    activeIdentity,
    loading,
    error,

    // Core actions
    createSubidentity,
    switchIdentity,
    deleteIdentity,

    // Utility actions
    clearError,
    refreshIdentities,
    getIdentityStats
  };
};

export default useIdentityManager;