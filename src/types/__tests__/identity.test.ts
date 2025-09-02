/**
 * Tests for Extended Identity Types
 * Verifies that the new identity data structures work correctly
 */

import {
  IdentityType,
  GovernanceType,
  PrivacyLevel,
  IdentityStatus,
  ExtendedSquidIdentity,
  IdentityTypeRules,
  IDENTITY_TYPE_RULES,
  IdentityCreationRules,
  SubidentityMetadata,
  IdentityTree,
  IdentityTreeNode
} from '../identity';

import {
  IDENTITY_HIERARCHY_LIMITS,
  IDENTITY_CREATION_MATRIX,
  PRIVACY_LEVEL_HIERARCHY,
  DEFAULT_QONSENT_PROFILES,
  VALIDATION_PATTERNS,
  ERROR_MESSAGES
} from '../identity-constants';

describe('Identity Types', () => {
  describe('IdentityType enum', () => {
    it('should have all required identity types', () => {
      expect(IdentityType.ROOT).toBe('ROOT');
      expect(IdentityType.DAO).toBe('DAO');
      expect(IdentityType.ENTERPRISE).toBe('ENTERPRISE');
      expect(IdentityType.CONSENTIDA).toBe('CONSENTIDA');
      expect(IdentityType.AID).toBe('AID');
    });
  });

  describe('IDENTITY_TYPE_RULES', () => {
    it('should have rules for all identity types', () => {
      expect(IDENTITY_TYPE_RULES[IdentityType.ROOT]).toBeDefined();
      expect(IDENTITY_TYPE_RULES[IdentityType.DAO]).toBeDefined();
      expect(IDENTITY_TYPE_RULES[IdentityType.ENTERPRISE]).toBeDefined();
      expect(IDENTITY_TYPE_RULES[IdentityType.CONSENTIDA]).toBeDefined();
      expect(IDENTITY_TYPE_RULES[IdentityType.AID]).toBeDefined();
    });

    it('should enforce correct rules for ROOT identity', () => {
      const rootRules = IDENTITY_TYPE_RULES[IdentityType.ROOT];
      expect(rootRules.kycRequired).toBe(false);
      expect(rootRules.canCreateSubidentities).toBe(true);
      expect(rootRules.visibility).toBe(PrivacyLevel.PUBLIC);
      expect(rootRules.governedBy).toBe(GovernanceType.SELF);
    });

    it('should enforce correct rules for DAO identity', () => {
      const daoRules = IDENTITY_TYPE_RULES[IdentityType.DAO];
      expect(daoRules.kycRequired).toBe(true);
      expect(daoRules.canCreateSubidentities).toBe(true);
      expect(daoRules.visibility).toBe(PrivacyLevel.PUBLIC);
      expect(daoRules.governedBy).toBe(GovernanceType.DAO);
    });

    it('should enforce correct rules for ENTERPRISE identity', () => {
      const enterpriseRules = IDENTITY_TYPE_RULES[IdentityType.ENTERPRISE];
      expect(enterpriseRules.kycRequired).toBe(true);
      expect(enterpriseRules.canCreateSubidentities).toBe(false);
      expect(enterpriseRules.visibility).toBe(PrivacyLevel.PUBLIC);
      expect(enterpriseRules.governedBy).toBe(GovernanceType.DAO);
    });

    it('should enforce correct rules for CONSENTIDA identity', () => {
      const consentidaRules = IDENTITY_TYPE_RULES[IdentityType.CONSENTIDA];
      expect(consentidaRules.kycRequired).toBe(false);
      expect(consentidaRules.canCreateSubidentities).toBe(false);
      expect(consentidaRules.visibility).toBe(PrivacyLevel.PRIVATE);
      expect(consentidaRules.governedBy).toBe(GovernanceType.PARENT);
    });

    it('should enforce correct rules for AID identity', () => {
      const aidRules = IDENTITY_TYPE_RULES[IdentityType.AID];
      expect(aidRules.kycRequired).toBe(true);
      expect(aidRules.canCreateSubidentities).toBe(false);
      expect(aidRules.visibility).toBe(PrivacyLevel.ANONYMOUS);
      expect(aidRules.governedBy).toBe(GovernanceType.SELF);
    });
  });

  describe('IDENTITY_CREATION_MATRIX', () => {
    it('should allow ROOT to create all subidentity types', () => {
      const rootCanCreate = IDENTITY_CREATION_MATRIX[IdentityType.ROOT];
      expect(rootCanCreate).toContain(IdentityType.DAO);
      expect(rootCanCreate).toContain(IdentityType.ENTERPRISE);
      expect(rootCanCreate).toContain(IdentityType.CONSENTIDA);
      expect(rootCanCreate).toContain(IdentityType.AID);
    });

    it('should allow DAO to create only ENTERPRISE identities', () => {
      const daoCanCreate = IDENTITY_CREATION_MATRIX[IdentityType.DAO];
      expect(daoCanCreate).toContain(IdentityType.ENTERPRISE);
      expect(daoCanCreate).toHaveLength(1);
    });

    it('should not allow ENTERPRISE, CONSENTIDA, or AID to create subidentities', () => {
      expect(IDENTITY_CREATION_MATRIX[IdentityType.ENTERPRISE]).toHaveLength(0);
      expect(IDENTITY_CREATION_MATRIX[IdentityType.CONSENTIDA]).toHaveLength(0);
      expect(IDENTITY_CREATION_MATRIX[IdentityType.AID]).toHaveLength(0);
    });
  });

  describe('ExtendedSquidIdentity interface', () => {
    it('should create a valid extended identity object', () => {
      const identity: ExtendedSquidIdentity = {
        // Core Identity Properties
        did: 'did:squid:test123',
        name: 'Test Identity',
        type: IdentityType.ROOT,
        rootId: 'did:squid:test123',
        
        // Hierarchy and Relationships
        children: [],
        depth: 0,
        path: ['did:squid:test123'],
        
        // Governance and Permissions
        governanceLevel: GovernanceType.SELF,
        creationRules: {
          type: IdentityType.ROOT,
          requiresKYC: false,
          requiresDAOGovernance: false,
          requiresParentalConsent: false,
          maxDepth: 5,
          allowedChildTypes: [IdentityType.DAO, IdentityType.ENTERPRISE, IdentityType.CONSENTIDA, IdentityType.AID]
        },
        permissions: {
          canCreateSubidentities: true,
          canDeleteSubidentities: true,
          canModifyProfile: true,
          canAccessModule: () => true,
          canPerformAction: () => true,
          governanceLevel: GovernanceType.SELF
        },
        status: IdentityStatus.ACTIVE,
        
        // Privacy and Security
        qonsentProfileId: 'qonsent_profile_123',
        qlockKeyPair: {
          publicKey: 'public_key_123',
          privateKey: 'private_key_123',
          algorithm: 'RSA',
          keySize: 2048,
          createdAt: '2024-01-01T00:00:00Z'
        },
        privacyLevel: PrivacyLevel.PUBLIC,
        
        // Profile Metadata
        tags: ['test', 'root'],
        
        // Timestamps
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastUsed: '2024-01-01T00:00:00Z',
        
        // KYC and Verification
        kyc: {
          required: false,
          submitted: false,
          approved: false
        },
        
        // Audit Trail
        auditLog: [],
        securityFlags: [],
        
        // Integration Data
        qindexRegistered: true
      };

      expect(identity.did).toBe('did:squid:test123');
      expect(identity.type).toBe(IdentityType.ROOT);
      expect(identity.governanceLevel).toBe(GovernanceType.SELF);
      expect(identity.privacyLevel).toBe(PrivacyLevel.PUBLIC);
      expect(identity.permissions.canCreateSubidentities).toBe(true);
    });
  });

  describe('SubidentityMetadata interface', () => {
    it('should create valid subidentity metadata', () => {
      const metadata: SubidentityMetadata = {
        name: 'Test DAO Identity',
        description: 'A test DAO identity for testing purposes',
        type: IdentityType.DAO,
        tags: ['dao', 'test'],
        privacyLevel: PrivacyLevel.PUBLIC,
        kycLevel: 'BASIC'
      };

      expect(metadata.name).toBe('Test DAO Identity');
      expect(metadata.type).toBe(IdentityType.DAO);
      expect(metadata.privacyLevel).toBe(PrivacyLevel.PUBLIC);
    });
  });

  describe('Validation patterns', () => {
    it('should validate DID format correctly', () => {
      expect(VALIDATION_PATTERNS.DID.test('did:squid:test123')).toBe(true);
      expect(VALIDATION_PATTERNS.DID.test('did:example:abc123')).toBe(true);
      expect(VALIDATION_PATTERNS.DID.test('invalid-did')).toBe(false);
      expect(VALIDATION_PATTERNS.DID.test('did:')).toBe(false);
    });

    it('should validate name format correctly', () => {
      expect(VALIDATION_PATTERNS.NAME.test('Valid Name')).toBe(true);
      expect(VALIDATION_PATTERNS.NAME.test('Test_Identity-123')).toBe(true);
      expect(VALIDATION_PATTERNS.NAME.test('A')).toBe(false); // Too short
      expect(VALIDATION_PATTERNS.NAME.test('A'.repeat(51))).toBe(false); // Too long
    });

    it('should validate tag format correctly', () => {
      expect(VALIDATION_PATTERNS.TAG.test('valid-tag')).toBe(true);
      expect(VALIDATION_PATTERNS.TAG.test('test_123')).toBe(true);
      expect(VALIDATION_PATTERNS.TAG.test('invalid tag')).toBe(false); // Contains space
      expect(VALIDATION_PATTERNS.TAG.test('A'.repeat(31))).toBe(false); // Too long
    });
  });

  describe('Privacy level hierarchy', () => {
    it('should have correct privacy level ordering', () => {
      expect(PRIVACY_LEVEL_HIERARCHY[PrivacyLevel.ANONYMOUS]).toBe(0);
      expect(PRIVACY_LEVEL_HIERARCHY[PrivacyLevel.PRIVATE]).toBe(1);
      expect(PRIVACY_LEVEL_HIERARCHY[PrivacyLevel.DAO_ONLY]).toBe(2);
      expect(PRIVACY_LEVEL_HIERARCHY[PrivacyLevel.PUBLIC]).toBe(3);
    });

    it('should allow higher privacy levels to access lower level data', () => {
      const publicLevel = PRIVACY_LEVEL_HIERARCHY[PrivacyLevel.PUBLIC];
      const privateLevel = PRIVACY_LEVEL_HIERARCHY[PrivacyLevel.PRIVATE];
      
      expect(publicLevel).toBeGreaterThan(privateLevel);
    });
  });

  describe('Default Qonsent profiles', () => {
    it('should have profiles for all identity types', () => {
      expect(DEFAULT_QONSENT_PROFILES[IdentityType.ROOT]).toBeDefined();
      expect(DEFAULT_QONSENT_PROFILES[IdentityType.DAO]).toBeDefined();
      expect(DEFAULT_QONSENT_PROFILES[IdentityType.ENTERPRISE]).toBeDefined();
      expect(DEFAULT_QONSENT_PROFILES[IdentityType.CONSENTIDA]).toBeDefined();
      expect(DEFAULT_QONSENT_PROFILES[IdentityType.AID]).toBeDefined();
    });

    it('should have appropriate privacy settings for CONSENTIDA identities', () => {
      const consentidaProfile = DEFAULT_QONSENT_PROFILES[IdentityType.CONSENTIDA];
      expect(consentidaProfile.privacyLevel).toBe(PrivacyLevel.PRIVATE);
      expect(consentidaProfile.dataSharing.qsocial.enabled).toBe(false);
      expect(consentidaProfile.visibilityRules.profile).toBe(PrivacyLevel.PRIVATE);
    });

    it('should have appropriate privacy settings for AID identities', () => {
      const aidProfile = DEFAULT_QONSENT_PROFILES[IdentityType.AID];
      expect(aidProfile.privacyLevel).toBe(PrivacyLevel.ANONYMOUS);
      expect(aidProfile.visibilityRules.profile).toBe(PrivacyLevel.ANONYMOUS);
      expect(aidProfile.dataSharing.qmail.restrictions).toContain('metadata_collection');
    });
  });

  describe('Error messages', () => {
    it('should have all required error messages', () => {
      expect(ERROR_MESSAGES.INVALID_IDENTITY_TYPE).toBeDefined();
      expect(ERROR_MESSAGES.KYC_REQUIRED).toBeDefined();
      expect(ERROR_MESSAGES.GOVERNANCE_APPROVAL_REQUIRED).toBeDefined();
      expect(ERROR_MESSAGES.PARENTAL_CONSENT_REQUIRED).toBeDefined();
      expect(ERROR_MESSAGES.MAX_DEPTH_EXCEEDED).toBeDefined();
    });
  });

  describe('Hierarchy limits', () => {
    it('should have reasonable limits defined', () => {
      expect(IDENTITY_HIERARCHY_LIMITS.MAX_DEPTH).toBeGreaterThan(0);
      expect(IDENTITY_HIERARCHY_LIMITS.MAX_CHILDREN_PER_NODE).toBeGreaterThan(0);
      expect(IDENTITY_HIERARCHY_LIMITS.MAX_TOTAL_IDENTITIES).toBeGreaterThan(0);
      expect(IDENTITY_HIERARCHY_LIMITS.MIN_NAME_LENGTH).toBeGreaterThan(0);
      expect(IDENTITY_HIERARCHY_LIMITS.MAX_NAME_LENGTH).toBeGreaterThan(IDENTITY_HIERARCHY_LIMITS.MIN_NAME_LENGTH);
    });
  });
});

describe('Identity Tree Types', () => {
  describe('IdentityTreeNode interface', () => {
    it('should create a valid tree node', () => {
      const mockIdentity: ExtendedSquidIdentity = {
        did: 'did:squid:root',
        name: 'Root Identity',
        type: IdentityType.ROOT,
        rootId: 'did:squid:root',
        children: [],
        depth: 0,
        path: ['did:squid:root'],
        governanceLevel: GovernanceType.SELF,
        creationRules: {
          type: IdentityType.ROOT,
          requiresKYC: false,
          requiresDAOGovernance: false,
          requiresParentalConsent: false,
          maxDepth: 5,
          allowedChildTypes: []
        },
        permissions: {
          canCreateSubidentities: true,
          canDeleteSubidentities: true,
          canModifyProfile: true,
          canAccessModule: () => true,
          canPerformAction: () => true,
          governanceLevel: GovernanceType.SELF
        },
        status: IdentityStatus.ACTIVE,
        qonsentProfileId: 'profile_123',
        qlockKeyPair: {
          publicKey: 'pub_key',
          privateKey: 'priv_key',
          algorithm: 'RSA',
          keySize: 2048,
          createdAt: '2024-01-01T00:00:00Z'
        },
        privacyLevel: PrivacyLevel.PUBLIC,
        tags: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastUsed: '2024-01-01T00:00:00Z',
        kyc: {
          required: false,
          submitted: false,
          approved: false
        },
        auditLog: [],
        securityFlags: [],
        qindexRegistered: true
      };

      const treeNode: IdentityTreeNode = {
        identity: mockIdentity,
        children: [],
        expanded: true
      };

      expect(treeNode.identity.did).toBe('did:squid:root');
      expect(treeNode.children).toHaveLength(0);
      expect(treeNode.expanded).toBe(true);
    });
  });

  describe('IdentityTree interface', () => {
    it('should create a valid identity tree', () => {
      const mockIdentity: ExtendedSquidIdentity = {
        did: 'did:squid:root',
        name: 'Root Identity',
        type: IdentityType.ROOT,
        rootId: 'did:squid:root',
        children: [],
        depth: 0,
        path: ['did:squid:root'],
        governanceLevel: GovernanceType.SELF,
        creationRules: {
          type: IdentityType.ROOT,
          requiresKYC: false,
          requiresDAOGovernance: false,
          requiresParentalConsent: false,
          maxDepth: 5,
          allowedChildTypes: []
        },
        permissions: {
          canCreateSubidentities: true,
          canDeleteSubidentities: true,
          canModifyProfile: true,
          canAccessModule: () => true,
          canPerformAction: () => true,
          governanceLevel: GovernanceType.SELF
        },
        status: IdentityStatus.ACTIVE,
        qonsentProfileId: 'profile_123',
        qlockKeyPair: {
          publicKey: 'pub_key',
          privateKey: 'priv_key',
          algorithm: 'RSA',
          keySize: 2048,
          createdAt: '2024-01-01T00:00:00Z'
        },
        privacyLevel: PrivacyLevel.PUBLIC,
        tags: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastUsed: '2024-01-01T00:00:00Z',
        kyc: {
          required: false,
          submitted: false,
          approved: false
        },
        auditLog: [],
        securityFlags: [],
        qindexRegistered: true
      };

      const tree: IdentityTree = {
        root: {
          identity: mockIdentity,
          children: []
        },
        totalNodes: 1,
        maxDepth: 0,
        lastUpdated: '2024-01-01T00:00:00Z'
      };

      expect(tree.root.identity.did).toBe('did:squid:root');
      expect(tree.totalNodes).toBe(1);
      expect(tree.maxDepth).toBe(0);
    });
  });
});