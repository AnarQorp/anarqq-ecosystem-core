/**
 * useActiveIdentity Hook
 * Hook for accessing current active identity with capability checking and permission validation
 * Requirements: 1.5, 4.1, 4.7
 */

import { useMemo, useCallback } from 'react';
import { useIdentityStore } from '@/state/identity';
import {
  ExtendedSquidIdentity,
  IdentityType,
  GovernanceType,
  PrivacyLevel,
  IdentityPermissions,
  UseActiveIdentityReturn,
  IDENTITY_TYPE_RULES
} from '@/types/identity';

export const useActiveIdentity = (): UseActiveIdentityReturn => {
  // Get active identity from the store
  const { activeIdentity, loading: storeLoading } = useIdentityStore();

  /**
   * Check if current identity is root identity
   * Requirements: 1.5
   */
  const isRoot = useMemo(() => {
    return activeIdentity?.type === IdentityType.ROOT;
  }, [activeIdentity]);

  /**
   * Check if current identity can create subidentities
   * Requirements: 1.5, 4.1
   */
  const canCreateSubidentities = useMemo(() => {
    if (!activeIdentity) return false;

    // Check if permissions exist and have the required property
    if (!activeIdentity.permissions || !activeIdentity.permissions.canCreateSubidentities) {
      return false;
    }

    // Check depth limits (max depth is 2, so can create if depth < 2)
    if (activeIdentity.depth >= 2) {
      return false;
    }

    // Check type-specific rules if they exist
    const typeRules = IDENTITY_TYPE_RULES && IDENTITY_TYPE_RULES[activeIdentity.type];
    if (typeRules && !typeRules.canCreateSubidentities) {
      return false;
    }

    // Check status
    if (activeIdentity.status !== 'ACTIVE') {
      return false;
    }

    return true;
  }, [activeIdentity]);

  /**
   * Get governance type for current identity
   * Requirements: 1.5
   */
  const governanceType = useMemo(() => {
    return activeIdentity?.governanceLevel || GovernanceType.SELF;
  }, [activeIdentity]);

  /**
   * Get privacy level for current identity
   * Requirements: 1.5
   */
  const privacyLevel = useMemo(() => {
    return activeIdentity?.privacyLevel || PrivacyLevel.PUBLIC;
  }, [activeIdentity]);

  /**
   * Get permissions for current identity
   * Requirements: 1.5, 4.1
   */
  const permissions = useMemo(() => {
    if (!activeIdentity) {
      // Return default empty permissions
      return {
        canCreateSubidentities: false,
        canDeleteSubidentities: false,
        canModifyProfile: false,
        canAccessModule: () => false,
        canPerformAction: () => false,
        governanceLevel: GovernanceType.SELF
      };
    }

    return activeIdentity.permissions;
  }, [activeIdentity]);

  /**
   * Check if identity can access a specific module
   * Requirements: 4.1
   */
  const canAccessModule = useCallback((module: string): boolean => {
    if (!activeIdentity) return false;

    // Check basic permission
    if (!permissions.canAccessModule(module)) {
      return false;
    }

    // Check privacy level restrictions
    switch (privacyLevel) {
      case PrivacyLevel.ANONYMOUS:
        // AID identities have restricted module access
        const restrictedModules = ['qsocial', 'qindex', 'qmarket'];
        if (restrictedModules.includes(module.toLowerCase())) {
          return false;
        }
        break;
      
      case PrivacyLevel.PRIVATE:
        // Private identities (Consentida) may have parental restrictions
        if (governanceType === GovernanceType.PARENT) {
          const parentalRestrictedModules = ['qmarket', 'qwallet'];
          if (parentalRestrictedModules.includes(module.toLowerCase())) {
            return false;
          }
        }
        break;
      
      case PrivacyLevel.DAO_ONLY:
        // DAO-only identities require DAO membership verification
        if (governanceType !== GovernanceType.DAO) {
          return false;
        }
        break;
    }

    // Check identity status
    if (activeIdentity.status !== 'ACTIVE') {
      return false;
    }

    return true;
  }, [activeIdentity, permissions, privacyLevel, governanceType]);

  /**
   * Check if identity can perform a specific action on a resource
   * Requirements: 4.1
   */
  const canPerformAction = useCallback((action: string, resource: string): boolean => {
    if (!activeIdentity) return false;

    // Check basic permission
    if (!permissions.canPerformAction(action, resource)) {
      return false;
    }

    // Check governance restrictions
    switch (governanceType) {
      case GovernanceType.DAO:
        // DAO-governed identities may need DAO approval for certain actions
        const daoRestrictedActions = ['delete', 'transfer', 'governance'];
        if (daoRestrictedActions.includes(action.toLowerCase())) {
          // In a real implementation, this would check with the DAO service
          // For now, we'll allow it but log the requirement
          console.log(`[useActiveIdentity] Action '${action}' on '${resource}' requires DAO approval`);
        }
        break;
      
      case GovernanceType.PARENT:
        // Parent-controlled identities (Consentida) have restricted actions
        const parentRestrictedActions = ['delete', 'transfer', 'financial'];
        if (parentRestrictedActions.includes(action.toLowerCase())) {
          return false;
        }
        break;
    }

    // Check KYC requirements for certain actions
    const kycRequiredActions = ['financial', 'governance', 'verification'];
    if (kycRequiredActions.includes(action.toLowerCase())) {
      if (!activeIdentity.kyc?.approved) {
        return false;
      }
    }

    return true;
  }, [activeIdentity, permissions, governanceType]);

  /**
   * Get allowed child identity types for current identity
   * Requirements: 1.5
   */
  const getAllowedChildTypes = useCallback((): IdentityType[] => {
    if (!activeIdentity || !canCreateSubidentities) {
      return [];
    }

    return activeIdentity.creationRules?.allowedChildTypes || [];
  }, [activeIdentity, canCreateSubidentities]);

  /**
   * Check if identity has specific capability
   * Requirements: 1.5, 4.1
   */
  const hasCapability = useCallback((capability: string): boolean => {
    if (!activeIdentity) return false;

    switch (capability.toLowerCase()) {
      case 'create_subidentities':
        return canCreateSubidentities;
      
      case 'delete_subidentities':
        return permissions.canDeleteSubidentities;
      
      case 'modify_profile':
        return permissions.canModifyProfile;
      
      case 'kyc_verified':
        return activeIdentity.kyc?.approved || false;
      
      case 'governance_participation':
        return governanceType === GovernanceType.DAO || governanceType === GovernanceType.SELF;
      
      case 'anonymous_operations':
        return privacyLevel === PrivacyLevel.ANONYMOUS;
      
      case 'public_visibility':
        return privacyLevel === PrivacyLevel.PUBLIC;
      
      case 'dao_membership':
        return governanceType === GovernanceType.DAO;
      
      case 'parental_control':
        return governanceType === GovernanceType.PARENT;
      
      default:
        return false;
    }
  }, [activeIdentity, canCreateSubidentities, permissions, governanceType, privacyLevel]);

  /**
   * Get identity capabilities summary
   * Requirements: 1.5
   */
  const getCapabilitiesSummary = useCallback(() => {
    if (!activeIdentity) {
      return {
        canCreateSubidentities: false,
        canDeleteSubidentities: false,
        canModifyProfile: false,
        hasKYC: false,
        isGovernanceParticipant: false,
        isAnonymous: false,
        isPublic: false,
        allowedChildTypes: [],
        restrictedModules: [],
        restrictedActions: []
      };
    }

    const restrictedModules: string[] = [];
    const restrictedActions: string[] = [];

    // Determine restrictions based on privacy level and governance
    if (privacyLevel === PrivacyLevel.ANONYMOUS) {
      restrictedModules.push('qsocial', 'qindex', 'qmarket');
    }

    if (governanceType === GovernanceType.PARENT) {
      restrictedModules.push('qmarket', 'qwallet');
      restrictedActions.push('delete', 'transfer', 'financial');
    }

    if (!activeIdentity.kyc?.approved) {
      restrictedActions.push('financial', 'governance', 'verification');
    }

    return {
      canCreateSubidentities,
      canDeleteSubidentities: permissions.canDeleteSubidentities,
      canModifyProfile: permissions.canModifyProfile,
      hasKYC: activeIdentity.kyc?.approved || false,
      isGovernanceParticipant: governanceType === GovernanceType.DAO || governanceType === GovernanceType.SELF,
      isAnonymous: privacyLevel === PrivacyLevel.ANONYMOUS,
      isPublic: privacyLevel === PrivacyLevel.PUBLIC,
      allowedChildTypes: getAllowedChildTypes(),
      restrictedModules,
      restrictedActions
    };
  }, [activeIdentity, canCreateSubidentities, permissions, governanceType, privacyLevel, getAllowedChildTypes]);

  /**
   * Get identity context information for UI display
   * Requirements: 4.7
   */
  const getContextInfo = useCallback(() => {
    if (!activeIdentity) {
      return {
        displayName: 'No Identity',
        typeLabel: 'None',
        statusLabel: 'Not Authenticated',
        privacyLabel: 'Unknown',
        governanceLabel: 'None',
        capabilities: [],
        warnings: ['No active identity found']
      };
    }

    const capabilities: string[] = [];
    const warnings: string[] = [];

    // Build capabilities list
    if (canCreateSubidentities) capabilities.push('Can create subidentities');
    if (permissions.canDeleteSubidentities) capabilities.push('Can delete subidentities');
    if (permissions.canModifyProfile) capabilities.push('Can modify profile');
    if (activeIdentity.kyc?.approved) capabilities.push('KYC verified');

    // Build warnings list
    if (activeIdentity.status !== 'ACTIVE') {
      warnings.push(`Identity status: ${activeIdentity.status}`);
    }
    if (activeIdentity.depth >= 2) {
      warnings.push('Maximum nesting depth reached');
    }
    if (!activeIdentity.kyc?.approved && activeIdentity.kyc?.required) {
      warnings.push('KYC verification required');
    }

    return {
      displayName: activeIdentity.name,
      typeLabel: activeIdentity.type,
      statusLabel: activeIdentity.status,
      privacyLabel: privacyLevel,
      governanceLabel: governanceType,
      capabilities,
      warnings
    };
  }, [activeIdentity, canCreateSubidentities, permissions, privacyLevel, governanceType]);

  return {
    // Core identity data
    identity: activeIdentity,
    loading: storeLoading,

    // Identity characteristics
    isRoot,
    canCreateSubidentities,
    governanceType,
    privacyLevel,
    permissions,

    // Capability checking functions
    canAccessModule,
    canPerformAction,
    hasCapability,
    getAllowedChildTypes,

    // Utility functions
    getCapabilitiesSummary,
    getContextInfo
  };
};

export default useActiveIdentity;