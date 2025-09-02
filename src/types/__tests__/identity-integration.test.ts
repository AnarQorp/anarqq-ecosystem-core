/**
 * Integration Tests for Identity System Types
 * Tests how different identity types work together
 */

import {
  IdentityType,
  GovernanceType,
  PrivacyLevel,
  IdentityStatus,
  ExtendedSquidIdentity,
  IdentityTree,
  IdentityTreeNode,
  SubidentityMetadata,
  SubidentityResult,
  ValidationResult
} from '../identity';

import {
  IDENTITY_TYPE_RULES,
  IDENTITY_CREATION_MATRIX,
  IDENTITY_HIERARCHY_LIMITS,
  DEFAULT_QONSENT_PROFILES,
  ERROR_MESSAGES
} from '../identity-constants';

describe('Identity System Integration', () => {
  // Helper function to create a mock identity
  const createMockIdentity = (
    type: IdentityType,
    parentId?: string,
    depth: number = 0
  ): ExtendedSquidIdentity => {
    const did = `did:squid:${type.toLowerCase()}_${Date.now()}`;
    const rules = IDENTITY_TYPE_RULES[type];
    
    return {
      did,
      name: `${type} Identity`,
      type,
      parentId,
      rootId: parentId ? 'did:squid:root' : did,
      children: [],
      depth,
      path: parentId ? ['did:squid:root', did] : [did],
      governanceLevel: rules.governedBy,
      creationRules: {
        type,
        requiresKYC: rules.kycRequired,
        requiresDAOGovernance: type === IdentityType.ENTERPRISE,
        requiresParentalConsent: type === IdentityType.CONSENTIDA,
        maxDepth: IDENTITY_HIERARCHY_LIMITS.MAX_DEPTH,
        allowedChildTypes: IDENTITY_CREATION_MATRIX[type]
      },
      permissions: {
        canCreateSubidentities: rules.canCreateSubidentities,
        canDeleteSubidentities: type === IdentityType.ROOT,
        canModifyProfile: true,
        canAccessModule: (module: string) => {
          if (type === IdentityType.CONSENTIDA) {
            return ['qmail', 'qdrive'].includes(module);
          }
          return true;
        },
        canPerformAction: () => true,
        governanceLevel: rules.governedBy
      },
      status: IdentityStatus.ACTIVE,
      qonsentProfileId: `qonsent_${did}`,
      qlockKeyPair: {
        publicKey: `pub_${did}`,
        privateKey: `priv_${did}`,
        algorithm: 'RSA',
        keySize: 2048,
        createdAt: new Date().toISOString()
      },
      privacyLevel: rules.visibility,
      tags: [type.toLowerCase()],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      kyc: {
        required: rules.kycRequired,
        submitted: rules.kycRequired,
        approved: rules.kycRequired
      },
      auditLog: [],
      securityFlags: [],
      qindexRegistered: true
    };
  };

  describe('Identity Hierarchy Creation', () => {
    it('should create a valid identity hierarchy', () => {
      // Create root identity
      const rootIdentity = createMockIdentity(IdentityType.ROOT);
      
      // Create DAO subidentity
      const daoIdentity = createMockIdentity(IdentityType.DAO, rootIdentity.did, 1);
      rootIdentity.children.push(daoIdentity.did);
      
      // Create Enterprise subidentity under DAO
      const enterpriseIdentity = createMockIdentity(IdentityType.ENTERPRISE, daoIdentity.did, 2);
      daoIdentity.children.push(enterpriseIdentity.did);
      
      // Create Consentida subidentity under root
      const consentidaIdentity = createMockIdentity(IdentityType.CONSENTIDA, rootIdentity.did, 1);
      rootIdentity.children.push(consentidaIdentity.did);
      
      // Create AID subidentity under root
      const aidIdentity = createMockIdentity(IdentityType.AID, rootIdentity.did, 1);
      rootIdentity.children.push(aidIdentity.did);

      // Verify hierarchy structure
      expect(rootIdentity.type).toBe(IdentityType.ROOT);
      expect(rootIdentity.children).toHaveLength(3);
      expect(rootIdentity.depth).toBe(0);
      
      expect(daoIdentity.parentId).toBe(rootIdentity.did);
      expect(daoIdentity.depth).toBe(1);
      expect(daoIdentity.children).toHaveLength(1);
      
      expect(enterpriseIdentity.parentId).toBe(daoIdentity.did);
      expect(enterpriseIdentity.depth).toBe(2);
      expect(enterpriseIdentity.children).toHaveLength(0);
      
      expect(consentidaIdentity.parentId).toBe(rootIdentity.did);
      expect(consentidaIdentity.permissions.canAccessModule('qsocial')).toBe(false);
      expect(consentidaIdentity.permissions.canAccessModule('qmail')).toBe(true);
      
      expect(aidIdentity.privacyLevel).toBe(PrivacyLevel.ANONYMOUS);
    });

    it('should build a valid identity tree structure', () => {
      const rootIdentity = createMockIdentity(IdentityType.ROOT);
      const daoIdentity = createMockIdentity(IdentityType.DAO, rootIdentity.did, 1);
      
      const rootNode: IdentityTreeNode = {
        identity: rootIdentity,
        children: [
          {
            identity: daoIdentity,
            children: [],
            parent: undefined // Will be set when building tree
          }
        ]
      };

      const tree: IdentityTree = {
        root: rootNode,
        totalNodes: 2,
        maxDepth: 1,
        lastUpdated: new Date().toISOString()
      };

      expect(tree.root.identity.type).toBe(IdentityType.ROOT);
      expect(tree.root.children).toHaveLength(1);
      expect(tree.root.children[0].identity.type).toBe(IdentityType.DAO);
      expect(tree.totalNodes).toBe(2);
      expect(tree.maxDepth).toBe(1);
    });
  });

  describe('Identity Type Rules Validation', () => {
    it('should validate identity creation rules correctly', () => {
      const rootIdentity = createMockIdentity(IdentityType.ROOT);
      
      // ROOT can create all types
      const allowedTypes = IDENTITY_CREATION_MATRIX[IdentityType.ROOT];
      expect(allowedTypes).toContain(IdentityType.DAO);
      expect(allowedTypes).toContain(IdentityType.ENTERPRISE);
      expect(allowedTypes).toContain(IdentityType.CONSENTIDA);
      expect(allowedTypes).toContain(IdentityType.AID);
      
      // DAO can only create ENTERPRISE
      const daoAllowedTypes = IDENTITY_CREATION_MATRIX[IdentityType.DAO];
      expect(daoAllowedTypes).toContain(IdentityType.ENTERPRISE);
      expect(daoAllowedTypes).not.toContain(IdentityType.DAO);
      expect(daoAllowedTypes).not.toContain(IdentityType.CONSENTIDA);
      expect(daoAllowedTypes).not.toContain(IdentityType.AID);
    });

    it('should enforce KYC requirements correctly', () => {
      const rootRules = IDENTITY_TYPE_RULES[IdentityType.ROOT];
      const daoRules = IDENTITY_TYPE_RULES[IdentityType.DAO];
      const enterpriseRules = IDENTITY_TYPE_RULES[IdentityType.ENTERPRISE];
      const consentidaRules = IDENTITY_TYPE_RULES[IdentityType.CONSENTIDA];
      const aidRules = IDENTITY_TYPE_RULES[IdentityType.AID];

      expect(rootRules.kycRequired).toBe(false);
      expect(daoRules.kycRequired).toBe(true);
      expect(enterpriseRules.kycRequired).toBe(true);
      expect(consentidaRules.kycRequired).toBe(false);
      expect(aidRules.kycRequired).toBe(true);
    });

    it('should enforce governance requirements correctly', () => {
      const rootRules = IDENTITY_TYPE_RULES[IdentityType.ROOT];
      const daoRules = IDENTITY_TYPE_RULES[IdentityType.DAO];
      const enterpriseRules = IDENTITY_TYPE_RULES[IdentityType.ENTERPRISE];
      const consentidaRules = IDENTITY_TYPE_RULES[IdentityType.CONSENTIDA];
      const aidRules = IDENTITY_TYPE_RULES[IdentityType.AID];

      expect(rootRules.governedBy).toBe(GovernanceType.SELF);
      expect(daoRules.governedBy).toBe(GovernanceType.DAO);
      expect(enterpriseRules.governedBy).toBe(GovernanceType.DAO);
      expect(consentidaRules.governedBy).toBe(GovernanceType.PARENT);
      expect(aidRules.governedBy).toBe(GovernanceType.SELF);
    });
  });

  describe('Privacy Level Integration', () => {
    it('should apply correct default privacy settings', () => {
      const rootProfile = DEFAULT_QONSENT_PROFILES[IdentityType.ROOT];
      const daoProfile = DEFAULT_QONSENT_PROFILES[IdentityType.DAO];
      const enterpriseProfile = DEFAULT_QONSENT_PROFILES[IdentityType.ENTERPRISE];
      const consentidaProfile = DEFAULT_QONSENT_PROFILES[IdentityType.CONSENTIDA];
      const aidProfile = DEFAULT_QONSENT_PROFILES[IdentityType.AID];

      expect(rootProfile.privacyLevel).toBe(PrivacyLevel.PUBLIC);
      expect(daoProfile.privacyLevel).toBe(PrivacyLevel.PUBLIC);
      expect(enterpriseProfile.privacyLevel).toBe(PrivacyLevel.PUBLIC);
      expect(consentidaProfile.privacyLevel).toBe(PrivacyLevel.PRIVATE);
      expect(aidProfile.privacyLevel).toBe(PrivacyLevel.ANONYMOUS);
    });

    it('should restrict module access for protected identity types', () => {
      const consentidaProfile = DEFAULT_QONSENT_PROFILES[IdentityType.CONSENTIDA];
      const aidProfile = DEFAULT_QONSENT_PROFILES[IdentityType.AID];

      // Consentida should have restricted social access
      expect(consentidaProfile.dataSharing.qsocial.enabled).toBe(false);
      expect(consentidaProfile.dataSharing.qwallet.enabled).toBe(false);

      // AID should have minimal data sharing with restrictions
      expect(aidProfile.dataSharing.qmail.restrictions).toContain('metadata_collection');
      expect(aidProfile.dataSharing.qsocial.restrictions).toContain('profile_linking');
      expect(aidProfile.dataSharing.qwallet.restrictions).toContain('transaction_history');
    });
  });

  describe('Subidentity Metadata Validation', () => {
    it('should create valid subidentity metadata for different types', () => {
      const daoMetadata: SubidentityMetadata = {
        name: 'Test DAO',
        description: 'A test DAO identity',
        type: IdentityType.DAO,
        tags: ['dao', 'test'],
        privacyLevel: PrivacyLevel.PUBLIC,
        kycLevel: 'BASIC'
      };

      const consentidaMetadata: SubidentityMetadata = {
        name: 'Child Identity',
        description: 'A child identity with parental controls',
        type: IdentityType.CONSENTIDA,
        tags: ['child', 'protected'],
        privacyLevel: PrivacyLevel.PRIVATE,
        governanceConfig: {
          parentalConsent: true
        }
      };

      const aidMetadata: SubidentityMetadata = {
        name: 'Anonymous Identity',
        description: 'An anonymous identity for privacy',
        type: IdentityType.AID,
        tags: ['anonymous', 'privacy'],
        privacyLevel: PrivacyLevel.ANONYMOUS,
        kycLevel: 'ENHANCED'
      };

      expect(daoMetadata.type).toBe(IdentityType.DAO);
      expect(daoMetadata.kycLevel).toBe('BASIC');
      
      expect(consentidaMetadata.type).toBe(IdentityType.CONSENTIDA);
      expect(consentidaMetadata.governanceConfig?.parentalConsent).toBe(true);
      
      expect(aidMetadata.type).toBe(IdentityType.AID);
      expect(aidMetadata.privacyLevel).toBe(PrivacyLevel.ANONYMOUS);
    });
  });

  describe('Error Handling Integration', () => {
    it('should have appropriate error messages for different scenarios', () => {
      expect(ERROR_MESSAGES.INVALID_IDENTITY_TYPE).toBeDefined();
      expect(ERROR_MESSAGES.KYC_REQUIRED).toBeDefined();
      expect(ERROR_MESSAGES.GOVERNANCE_APPROVAL_REQUIRED).toBeDefined();
      expect(ERROR_MESSAGES.PARENTAL_CONSENT_REQUIRED).toBeDefined();
      expect(ERROR_MESSAGES.MAX_DEPTH_EXCEEDED).toBeDefined();
      expect(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS).toBeDefined();
    });
  });

  describe('Hierarchy Limits Enforcement', () => {
    it('should respect hierarchy limits', () => {
      const limits = IDENTITY_HIERARCHY_LIMITS;
      
      expect(limits.MAX_DEPTH).toBe(5);
      expect(limits.MAX_CHILDREN_PER_NODE).toBe(10);
      expect(limits.MAX_TOTAL_IDENTITIES).toBe(100);
      expect(limits.MIN_NAME_LENGTH).toBe(2);
      expect(limits.MAX_NAME_LENGTH).toBe(50);
      expect(limits.MAX_TAGS).toBe(10);
      expect(limits.MAX_TAG_LENGTH).toBe(30);
    });

    it('should validate name length constraints', () => {
      const shortName = 'A';
      const validName = 'Valid Identity Name';
      const longName = 'A'.repeat(51);

      expect(shortName.length).toBeLessThan(IDENTITY_HIERARCHY_LIMITS.MIN_NAME_LENGTH);
      expect(validName.length).toBeGreaterThanOrEqual(IDENTITY_HIERARCHY_LIMITS.MIN_NAME_LENGTH);
      expect(validName.length).toBeLessThanOrEqual(IDENTITY_HIERARCHY_LIMITS.MAX_NAME_LENGTH);
      expect(longName.length).toBeGreaterThan(IDENTITY_HIERARCHY_LIMITS.MAX_NAME_LENGTH);
    });
  });

  describe('Type Safety and Consistency', () => {
    it('should maintain type consistency across interfaces', () => {
      const identity = createMockIdentity(IdentityType.ROOT);
      
      // Verify that all required fields are present and have correct types
      expect(typeof identity.did).toBe('string');
      expect(typeof identity.name).toBe('string');
      expect(Object.values(IdentityType)).toContain(identity.type);
      expect(Object.values(GovernanceType)).toContain(identity.governanceLevel);
      expect(Object.values(PrivacyLevel)).toContain(identity.privacyLevel);
      expect(Object.values(IdentityStatus)).toContain(identity.status);
      expect(Array.isArray(identity.children)).toBe(true);
      expect(Array.isArray(identity.path)).toBe(true);
      expect(Array.isArray(identity.tags)).toBe(true);
      expect(Array.isArray(identity.auditLog)).toBe(true);
      expect(Array.isArray(identity.securityFlags)).toBe(true);
      expect(typeof identity.depth).toBe('number');
      expect(typeof identity.qindexRegistered).toBe('boolean');
    });

    it('should have consistent enum values', () => {
      // Verify that enum values are strings (not numbers)
      Object.values(IdentityType).forEach(value => {
        expect(typeof value).toBe('string');
      });
      
      Object.values(GovernanceType).forEach(value => {
        expect(typeof value).toBe('string');
      });
      
      Object.values(PrivacyLevel).forEach(value => {
        expect(typeof value).toBe('string');
      });
      
      Object.values(IdentityStatus).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });
  });
});