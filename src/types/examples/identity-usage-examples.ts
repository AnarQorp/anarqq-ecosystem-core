/**
 * Usage Examples for Extended Identity Types
 * Demonstrates how to use the new identity system types
 */

import {
  IdentityType,
  GovernanceType,
  PrivacyLevel,
  IdentityStatus,
  ExtendedSquidIdentity,
  SubidentityMetadata,
  IdentityTree,
  IdentityTreeNode,
  IdentityManagerInterface,
  SubidentityResult,
  SwitchResult,
  ValidationResult
} from '../identity';

import {
  IDENTITY_TYPE_RULES,
  IDENTITY_CREATION_MATRIX,
  DEFAULT_QONSENT_PROFILES,
  VALIDATION_PATTERNS,
  ERROR_MESSAGES
} from '../identity-constants';

// Example 1: Creating a Root Identity
export const createRootIdentityExample = (): ExtendedSquidIdentity => {
  const rootIdentity: ExtendedSquidIdentity = {
    // Core Identity Properties
    did: 'did:squid:root_user_123',
    name: 'John Doe',
    type: IdentityType.ROOT,
    rootId: 'did:squid:root_user_123',
    
    // Hierarchy and Relationships
    children: [],
    depth: 0,
    path: ['did:squid:root_user_123'],
    
    // Governance and Permissions
    governanceLevel: GovernanceType.SELF,
    creationRules: {
      type: IdentityType.ROOT,
      requiresKYC: false,
      requiresDAOGovernance: false,
      requiresParentalConsent: false,
      maxDepth: 5,
      allowedChildTypes: IDENTITY_CREATION_MATRIX[IdentityType.ROOT]
    },
    permissions: {
      canCreateSubidentities: true,
      canDeleteSubidentities: true,
      canModifyProfile: true,
      canAccessModule: (module: string) => true,
      canPerformAction: (action: string, resource: string) => true,
      governanceLevel: GovernanceType.SELF
    },
    status: IdentityStatus.ACTIVE,
    
    // Privacy and Security
    qonsentProfileId: 'qonsent_profile_root_123',
    qlockKeyPair: {
      publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...',
      privateKey: 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...',
      algorithm: 'RSA',
      keySize: 2048,
      createdAt: '2024-01-01T00:00:00Z'
    },
    privacyLevel: PrivacyLevel.PUBLIC,
    
    // Profile Metadata
    avatar: 'https://example.com/avatar.jpg',
    description: 'Primary identity for John Doe',
    tags: ['root', 'verified', 'primary'],
    
    // Timestamps
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastUsed: '2024-01-01T00:00:00Z',
    
    // KYC and Verification
    kyc: {
      required: false,
      submitted: true,
      approved: true,
      level: 'ENHANCED',
      submittedAt: '2024-01-01T00:00:00Z',
      approvedAt: '2024-01-01T01:00:00Z',
      documents: ['QmHash1', 'QmHash2']
    },
    
    // Audit Trail
    auditLog: [],
    securityFlags: [],
    
    // Integration Data
    qindexRegistered: true,
    qindexMetadata: {
      classification: ['individual', 'verified'],
      searchable: true,
      indexed: true,
      lastSync: '2024-01-01T00:00:00Z'
    }
  };

  return rootIdentity;
};

// Example 2: Creating Subidentity Metadata for Different Types
export const createSubidentityMetadataExamples = () => {
  // DAO Identity Metadata
  const daoMetadata: SubidentityMetadata = {
    name: 'Tech Innovation DAO',
    description: 'A DAO focused on technology innovation and development',
    type: IdentityType.DAO,
    avatar: 'https://example.com/dao-avatar.jpg',
    tags: ['dao', 'technology', 'innovation'],
    privacyLevel: PrivacyLevel.PUBLIC,
    kycLevel: 'BASIC',
    governanceConfig: {
      daoId: 'dao_tech_innovation_123',
      governanceRules: {
        votingThreshold: 0.6,
        quorum: 0.4,
        proposalDelay: 24 // hours
      }
    },
    qonsentConfig: {
      privacyLevel: PrivacyLevel.PUBLIC,
      dataSharing: {
        qsocial: { enabled: true, level: 'FULL', restrictions: [] },
        qwallet: { enabled: true, level: 'STANDARD', restrictions: [] }
      }
    }
  };

  // Enterprise Identity Metadata
  const enterpriseMetadata: SubidentityMetadata = {
    name: 'Acme Corp Business',
    description: 'Corporate identity for Acme Corporation',
    type: IdentityType.ENTERPRISE,
    tags: ['enterprise', 'business', 'corporate'],
    privacyLevel: PrivacyLevel.PUBLIC,
    kycLevel: 'INSTITUTIONAL',
    governanceConfig: {
      daoId: 'dao_tech_innovation_123' // Must be governed by a DAO
    }
  };

  // Consentida (Child) Identity Metadata
  const consentidaMetadata: SubidentityMetadata = {
    name: 'Jane Doe (Minor)',
    description: 'Protected identity for minor with parental controls',
    type: IdentityType.CONSENTIDA,
    tags: ['child', 'protected', 'family'],
    privacyLevel: PrivacyLevel.PRIVATE,
    governanceConfig: {
      parentalConsent: true
    },
    qonsentConfig: {
      privacyLevel: PrivacyLevel.PRIVATE,
      dataSharing: {
        qmail: { enabled: true, level: 'MINIMAL', restrictions: ['external_contacts'] },
        qsocial: { enabled: false, level: 'MINIMAL', restrictions: ['all'] },
        qwallet: { enabled: false, level: 'MINIMAL', restrictions: ['all'] },
        qdrive: { enabled: true, level: 'MINIMAL', restrictions: ['sharing'] }
      }
    }
  };

  // AID (Anonymous) Identity Metadata
  const aidMetadata: SubidentityMetadata = {
    name: 'Anonymous User 7f3a',
    description: 'Anonymous identity for privacy-focused activities',
    type: IdentityType.AID,
    tags: ['anonymous', 'privacy', 'secure'],
    privacyLevel: PrivacyLevel.ANONYMOUS,
    kycLevel: 'ENHANCED', // Root must be verified for AID creation
    qonsentConfig: {
      privacyLevel: PrivacyLevel.ANONYMOUS,
      dataSharing: {
        qmail: { enabled: true, level: 'MINIMAL', restrictions: ['metadata_collection'] },
        qsocial: { enabled: true, level: 'MINIMAL', restrictions: ['profile_linking'] },
        qwallet: { enabled: true, level: 'MINIMAL', restrictions: ['transaction_history'] },
        qdrive: { enabled: true, level: 'MINIMAL', restrictions: ['file_metadata'] }
      }
    }
  };

  return {
    daoMetadata,
    enterpriseMetadata,
    consentidaMetadata,
    aidMetadata
  };
};

// Example 3: Building an Identity Tree
export const buildIdentityTreeExample = (): IdentityTree => {
  const rootIdentity = createRootIdentityExample();
  
  // Create child identities
  const daoIdentity: ExtendedSquidIdentity = {
    ...rootIdentity,
    did: 'did:squid:dao_tech_123',
    name: 'Tech Innovation DAO',
    type: IdentityType.DAO,
    parentId: rootIdentity.did,
    depth: 1,
    path: [rootIdentity.did, 'did:squid:dao_tech_123'],
    governanceLevel: GovernanceType.DAO,
    privacyLevel: PrivacyLevel.PUBLIC,
    children: ['did:squid:enterprise_acme_123']
  };

  const enterpriseIdentity: ExtendedSquidIdentity = {
    ...rootIdentity,
    did: 'did:squid:enterprise_acme_123',
    name: 'Acme Corp Business',
    type: IdentityType.ENTERPRISE,
    parentId: daoIdentity.did,
    depth: 2,
    path: [rootIdentity.did, daoIdentity.did, 'did:squid:enterprise_acme_123'],
    governanceLevel: GovernanceType.DAO,
    privacyLevel: PrivacyLevel.PUBLIC,
    children: []
  };

  const consentidaIdentity: ExtendedSquidIdentity = {
    ...rootIdentity,
    did: 'did:squid:consentida_jane_123',
    name: 'Jane Doe (Minor)',
    type: IdentityType.CONSENTIDA,
    parentId: rootIdentity.did,
    depth: 1,
    path: [rootIdentity.did, 'did:squid:consentida_jane_123'],
    governanceLevel: GovernanceType.PARENT,
    privacyLevel: PrivacyLevel.PRIVATE,
    children: []
  };

  const aidIdentity: ExtendedSquidIdentity = {
    ...rootIdentity,
    did: 'did:squid:aid_anon_123',
    name: 'Anonymous User 7f3a',
    type: IdentityType.AID,
    parentId: rootIdentity.did,
    depth: 1,
    path: [rootIdentity.did, 'did:squid:aid_anon_123'],
    governanceLevel: GovernanceType.SELF,
    privacyLevel: PrivacyLevel.ANONYMOUS,
    children: []
  };

  // Update root identity children
  rootIdentity.children = [
    daoIdentity.did,
    consentidaIdentity.did,
    aidIdentity.did
  ];

  // Build tree structure
  const tree: IdentityTree = {
    root: {
      identity: rootIdentity,
      children: [
        {
          identity: daoIdentity,
          children: [
            {
              identity: enterpriseIdentity,
              children: []
            }
          ]
        },
        {
          identity: consentidaIdentity,
          children: []
        },
        {
          identity: aidIdentity,
          children: []
        }
      ]
    },
    totalNodes: 5,
    maxDepth: 2,
    lastUpdated: new Date().toISOString()
  };

  return tree;
};

// Example 4: Validation Functions
export const validateIdentityCreation = (
  parentType: IdentityType,
  childType: IdentityType,
  metadata: SubidentityMetadata
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if parent can create this child type
  const allowedTypes = IDENTITY_CREATION_MATRIX[parentType];
  if (!allowedTypes.includes(childType)) {
    errors.push(`${parentType} identity cannot create ${childType} subidentity`);
  }
  
  // Validate name
  if (!VALIDATION_PATTERNS.NAME.test(metadata.name)) {
    errors.push(ERROR_MESSAGES.INVALID_NAME);
  }
  
  // Check KYC requirements
  const childRules = IDENTITY_TYPE_RULES[childType];
  if (childRules.kycRequired && metadata.kycLevel === undefined) {
    errors.push(ERROR_MESSAGES.KYC_REQUIRED);
  }
  
  // Check governance requirements
  if (childType === IdentityType.ENTERPRISE && !metadata.governanceConfig?.daoId) {
    errors.push(ERROR_MESSAGES.GOVERNANCE_APPROVAL_REQUIRED);
  }
  
  if (childType === IdentityType.CONSENTIDA && !metadata.governanceConfig?.parentalConsent) {
    errors.push(ERROR_MESSAGES.PARENTAL_CONSENT_REQUIRED);
  }
  
  // Validate tags
  if (metadata.tags && metadata.tags.length > 10) {
    warnings.push('Too many tags, maximum is 10');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requirements: {
      kyc: childRules.kycRequired,
      governance: childType === IdentityType.ENTERPRISE,
      parentalConsent: childType === IdentityType.CONSENTIDA,
      daoApproval: childType === IdentityType.ENTERPRISE
    }
  };
};

// Example 5: Mock Identity Manager Implementation
export class MockIdentityManager implements IdentityManagerInterface {
  private identities: Map<string, ExtendedSquidIdentity> = new Map();
  private activeIdentityId: string | null = null;

  async createSubidentity(type: IdentityType, metadata: SubidentityMetadata): Promise<SubidentityResult> {
    try {
      // Validate creation
      const parentIdentity = this.activeIdentityId ? this.identities.get(this.activeIdentityId) : null;
      if (!parentIdentity) {
        return {
          success: false,
          error: 'No active parent identity'
        };
      }

      const validation = validateIdentityCreation(parentIdentity.type, type, metadata);
      if (!validation.valid) {
        return {
          success: false,
          error: 'Validation failed',
          validationErrors: validation.errors
        };
      }

      // Create new identity
      const newIdentity: ExtendedSquidIdentity = {
        ...createRootIdentityExample(),
        did: `did:squid:${type.toLowerCase()}_${Date.now()}`,
        name: metadata.name,
        type,
        parentId: parentIdentity.did,
        depth: parentIdentity.depth + 1,
        path: [...parentIdentity.path, `did:squid:${type.toLowerCase()}_${Date.now()}`],
        description: metadata.description,
        tags: metadata.tags || [],
        privacyLevel: metadata.privacyLevel || IDENTITY_TYPE_RULES[type].visibility
      };

      // Store identity
      this.identities.set(newIdentity.did, newIdentity);
      
      // Update parent's children
      parentIdentity.children.push(newIdentity.did);

      return {
        success: true,
        identity: newIdentity
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async switchActiveIdentity(identityId: string): Promise<SwitchResult> {
    const identity = this.identities.get(identityId);
    if (!identity) {
      return {
        success: false,
        error: 'Identity not found'
      };
    }

    const previousIdentity = this.activeIdentityId ? this.identities.get(this.activeIdentityId) : undefined;
    this.activeIdentityId = identityId;

    return {
      success: true,
      previousIdentity,
      newIdentity: identity,
      contextUpdates: {
        qonsent: true,
        qlock: true,
        qwallet: true,
        qerberos: true,
        qindex: true
      }
    };
  }

  async getIdentityTree(rootId: string): Promise<IdentityTree> {
    // This would build the tree from stored identities
    return buildIdentityTreeExample();
  }

  async deleteSubidentity(identityId: string): Promise<any> {
    // Implementation would handle deletion logic
    return { success: true };
  }

  async validateIdentityCreation(type: IdentityType, parentId: string): Promise<ValidationResult> {
    const parent = this.identities.get(parentId);
    if (!parent) {
      return {
        valid: false,
        errors: ['Parent identity not found'],
        warnings: [],
        requirements: {
          kyc: false,
          governance: false,
          parentalConsent: false,
          daoApproval: false
        }
      };
    }

    return validateIdentityCreation(parent.type, type, { name: 'Test', type });
  }

  async verifyIdentityOwnership(identityId: string, userId: string): Promise<boolean> {
    // Implementation would verify ownership
    return true;
  }

  async syncWithEcosystem(identity: ExtendedSquidIdentity): Promise<any> {
    // Implementation would sync with ecosystem services
    return { success: true, services: {} };
  }

  async updateModuleContexts(identity: ExtendedSquidIdentity): Promise<any> {
    // Implementation would update module contexts
    return { success: true, updatedContexts: [], errors: [] };
  }

  async getIdentityById(identityId: string): Promise<ExtendedSquidIdentity | null> {
    return this.identities.get(identityId) || null;
  }

  async getIdentitiesByType(type: IdentityType): Promise<ExtendedSquidIdentity[]> {
    return Array.from(this.identities.values()).filter(identity => identity.type === type);
  }

  async getChildIdentities(parentId: string): Promise<ExtendedSquidIdentity[]> {
    return Array.from(this.identities.values()).filter(identity => identity.parentId === parentId);
  }

  async logIdentityAction(identityId: string, action: any, metadata?: any): Promise<void> {
    // Implementation would log to Qerberos
  }

  async getAuditLog(identityId: string): Promise<any[]> {
    const identity = this.identities.get(identityId);
    return identity?.auditLog || [];
  }

  async flagSecurityEvent(identityId: string, flag: any): Promise<void> {
    // Implementation would flag security events
  }
}

// Example 6: Usage in React Hook (type definitions)
export interface UseIdentityManagerHookExample {
  identities: ExtendedSquidIdentity[];
  activeIdentity: ExtendedSquidIdentity | null;
  createSubidentity: (type: IdentityType, metadata: SubidentityMetadata) => Promise<SubidentityResult>;
  switchIdentity: (id: string) => Promise<SwitchResult>;
  deleteIdentity: (id: string) => Promise<any>;
  loading: boolean;
  error: string | null;
}

// This demonstrates how the types would be used in a React hook
export const useIdentityManagerExample = (): UseIdentityManagerHookExample => {
  // This would be implemented with actual React hooks
  return {
    identities: [],
    activeIdentity: null,
    createSubidentity: async () => ({ success: false }),
    switchIdentity: async () => ({ success: false }),
    deleteIdentity: async () => ({ success: false }),
    loading: false,
    error: null
  };
};