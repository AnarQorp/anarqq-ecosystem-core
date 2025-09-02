/**
 * Unit Tests for IdentityValidationService
 * Tests type-specific creation rules and validation logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  IdentityValidationService,
  IdentityCreationContext
} from '../IdentityValidationService';
import {
  IdentityType,
  ExtendedSquidIdentity,
  SubidentityMetadata,
  GovernanceType,
  PrivacyLevel,
  IdentityStatus
} from '@/types/identity';

describe('IdentityValidationService', () => {
  let validationService: IdentityValidationService;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;

  beforeEach(() => {
    validationService = IdentityValidationService.getInstance();

    // Mock root identity with approved KYC
    mockRootIdentity = {
      did: 'did:squid:root:123',
      name: 'Root Identity',
      type: IdentityType.ROOT,
      rootId: 'did:squid:root:123',
      children: [],
      depth: 0,
      path: [],
      governanceLevel: GovernanceType.SELF,
      creationRules: {
        type: IdentityType.ROOT,
        requiresKYC: false,
        requiresDAOGovernance: false,
        requiresParentalConsent: false,
        maxDepth: 3,
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
      qonsentProfileId: 'qonsent-123',
      qlockKeyPair: {
        publicKey: 'pub-123',
        privateKey: 'priv-123',
        algorithm: 'ECDSA',
        keySize: 256,
        createdAt: '2024-01-01T00:00:00Z'
      },
      privacyLevel: PrivacyLevel.PUBLIC,
      tags: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      lastUsed: '2024-01-01T00:00:00Z',
      kyc: {
        required: false,
        submitted: true,
        approved: true,
        level: 'ENHANCED'
      },
      auditLog: [],
      securityFlags: [],
      qindexRegistered: true
    };

    // Mock DAO identity
    mockDAOIdentity = {
      ...mockRootIdentity,
      did: 'did:squid:dao:456',
      name: 'Test DAO',
      type: IdentityType.DAO,
      parentId: 'did:squid:root:123',
      depth: 1,
      path: ['did:squid:root:123'],
      governanceLevel: GovernanceType.DAO
    };
  });

  describe('Consentida Identity Validation', () => {
    it('should validate successful Consentida identity creation', async () => {
      const context: IdentityCreationContext = {
        parentIdentity: mockRootIdentity,
        requestedType: IdentityType.CONSENTIDA,
        metadata: {
          name: 'Child Identity',
          description: 'A child identity',
          type: IdentityType.CONSENTIDA,
          privacyLevel: PrivacyLevel.PRIVATE,
          governanceConfig: {
            parentalConsent: true
          }
        },
        currentDepth: 1,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(true);
      expect(result.requirements.parentalConsent).toBe(true);
      expect(result.requirements.kyc).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when Consentida identity lacks parental consent', async () => {
      const context: IdentityCreationContext = {
        parentIdentity: mockRootIdentity,
        requestedType: IdentityType.CONSENTIDA,
        metadata: {
          name: 'Child Identity',
          type: IdentityType.CONSENTIDA,
          governanceConfig: {
            parentalConsent: false
          }
        },
        currentDepth: 1,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Parental consent is required for Consentida identities');
    });

    it('should fail when Consentida identity is not created by root', async () => {
      const context: IdentityCreationContext = {
        parentIdentity: mockDAOIdentity,
        requestedType: IdentityType.CONSENTIDA,
        metadata: {
          name: 'Child Identity',
          type: IdentityType.CONSENTIDA,
          governanceConfig: {
            parentalConsent: true
          }
        },
        currentDepth: 2,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Consentida identities can only be created by root identities');
    });

    it('should warn about inappropriate privacy level for Consentida', async () => {
      const context: IdentityCreationContext = {
        parentIdentity: mockRootIdentity,
        requestedType: IdentityType.CONSENTIDA,
        metadata: {
          name: 'Child Identity',
          type: IdentityType.CONSENTIDA,
          privacyLevel: PrivacyLevel.PUBLIC,
          governanceConfig: {
            parentalConsent: true
          }
        },
        currentDepth: 1,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.warnings).toContain('Consentida identities should be private for safety');
    });
  });

  describe('Enterprise Identity Validation', () => {
    it('should validate successful Enterprise identity creation', async () => {
      const context: IdentityCreationContext = {
        parentIdentity: mockRootIdentity,
        requestedType: IdentityType.ENTERPRISE,
        metadata: {
          name: 'Enterprise Corp',
          type: IdentityType.ENTERPRISE,
          privacyLevel: PrivacyLevel.PUBLIC,
          governanceConfig: {
            daoId: 'dao:test:enterprise'
          }
        },
        currentDepth: 1,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(true);
      expect(result.requirements.governance).toBe(true);
      expect(result.requirements.daoApproval).toBe(true);
    });

    it('should fail when Enterprise identity lacks DAO governance', async () => {
      const context: IdentityCreationContext = {
        parentIdentity: mockRootIdentity,
        requestedType: IdentityType.ENTERPRISE,
        metadata: {
          name: 'Enterprise Corp',
          type: IdentityType.ENTERPRISE,
          privacyLevel: PrivacyLevel.PUBLIC
        },
        currentDepth: 1,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DAO governance is required for Enterprise identities');
    });

    it('should fail when Enterprise identity is not public', async () => {
      const context: IdentityCreationContext = {
        parentIdentity: mockRootIdentity,
        requestedType: IdentityType.ENTERPRISE,
        metadata: {
          name: 'Enterprise Corp',
          type: IdentityType.ENTERPRISE,
          privacyLevel: PrivacyLevel.PRIVATE,
          governanceConfig: {
            daoId: 'dao:test:enterprise'
          }
        },
        currentDepth: 1,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Enterprise identities must be publicly visible');
    });

    it('should fail when parent lacks approved KYC for Enterprise', async () => {
      const parentWithoutKYC = {
        ...mockRootIdentity,
        kyc: {
          required: false,
          submitted: false,
          approved: false
        }
      };

      const context: IdentityCreationContext = {
        parentIdentity: parentWithoutKYC,
        requestedType: IdentityType.ENTERPRISE,
        metadata: {
          name: 'Enterprise Corp',
          type: IdentityType.ENTERPRISE,
          privacyLevel: PrivacyLevel.PUBLIC,
          governanceConfig: {
            daoId: 'dao:test:enterprise'
          }
        },
        currentDepth: 1,
        rootIdentity: parentWithoutKYC
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Parent identity must have approved KYC for Enterprise identity creation');
    });
  });

  describe('DAO Identity Validation', () => {
    it('should validate successful DAO identity creation', async () => {
      const context: IdentityCreationContext = {
        parentIdentity: mockRootIdentity,
        requestedType: IdentityType.DAO,
        metadata: {
          name: 'Test DAO',
          type: IdentityType.DAO,
          privacyLevel: PrivacyLevel.PUBLIC,
          governanceConfig: {
            governanceRules: {
              votingThreshold: 0.5,
              proposalDelay: 86400
            }
          }
        },
        currentDepth: 1,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(true);
      expect(result.requirements.kyc).toBe(true);
      expect(result.requirements.governance).toBe(true);
    });

    it('should fail when root identity lacks KYC for DAO creation', async () => {
      const rootWithoutKYC = {
        ...mockRootIdentity,
        kyc: {
          required: false,
          submitted: false,
          approved: false
        }
      };

      const context: IdentityCreationContext = {
        parentIdentity: rootWithoutKYC,
        requestedType: IdentityType.DAO,
        metadata: {
          name: 'Test DAO',
          type: IdentityType.DAO
        },
        currentDepth: 1,
        rootIdentity: rootWithoutKYC
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Root identity must have approved KYC for DAO identity creation');
    });

    it('should warn when DAO is created from non-root identity', async () => {
      const context: IdentityCreationContext = {
        parentIdentity: mockDAOIdentity,
        requestedType: IdentityType.DAO,
        metadata: {
          name: 'Sub DAO',
          type: IdentityType.DAO
        },
        currentDepth: 2,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.warnings).toContain('DAO identities are typically created directly from root identities');
    });
  });

  describe('AID Identity Validation', () => {
    it('should validate successful AID identity creation', async () => {
      const context: IdentityCreationContext = {
        parentIdentity: mockRootIdentity,
        requestedType: IdentityType.AID,
        metadata: {
          name: 'Anonymous123',
          type: IdentityType.AID,
          privacyLevel: PrivacyLevel.ANONYMOUS,
          description: 'Anonymous identity'
        },
        currentDepth: 1,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(true);
      expect(result.requirements.kyc).toBe(true);
    });

    it('should fail when AID identity is not anonymous', async () => {
      const context: IdentityCreationContext = {
        parentIdentity: mockRootIdentity,
        requestedType: IdentityType.AID,
        metadata: {
          name: 'Anonymous123',
          type: IdentityType.AID,
          privacyLevel: PrivacyLevel.PUBLIC
        },
        currentDepth: 1,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('AID identities must be completely anonymous');
    });

    it('should fail when AID name contains personal information', async () => {
      const context: IdentityCreationContext = {
        parentIdentity: mockRootIdentity,
        requestedType: IdentityType.AID,
        metadata: {
          name: 'john.doe@email.com',
          type: IdentityType.AID,
          privacyLevel: PrivacyLevel.ANONYMOUS
        },
        currentDepth: 1,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('AID identity name cannot contain personal information');
    });

    it('should fail when root lacks KYC for AID creation', async () => {
      const rootWithoutKYC = {
        ...mockRootIdentity,
        kyc: {
          required: false,
          submitted: false,
          approved: false
        }
      };

      const context: IdentityCreationContext = {
        parentIdentity: rootWithoutKYC,
        requestedType: IdentityType.AID,
        metadata: {
          name: 'Anonymous123',
          type: IdentityType.AID,
          privacyLevel: PrivacyLevel.ANONYMOUS
        },
        currentDepth: 1,
        rootIdentity: rootWithoutKYC
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Root identity must have approved KYC for AID identity creation');
    });
  });

  describe('Hierarchy Validation', () => {
    it('should fail when maximum depth is exceeded', async () => {
      const context: IdentityCreationContext = {
        parentIdentity: mockRootIdentity,
        requestedType: IdentityType.DAO,
        metadata: {
          name: 'Deep DAO',
          type: IdentityType.DAO
        },
        currentDepth: 3, // Exceeds max depth
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Maximum identity depth (3 levels) exceeded');
    });

    it('should fail when parent cannot create requested child type', async () => {
      // Enterprise identities cannot create subidentities
      const enterpriseIdentity = {
        ...mockRootIdentity,
        type: IdentityType.ENTERPRISE,
        permissions: {
          ...mockRootIdentity.permissions,
          canCreateSubidentities: false
        }
      };

      const context: IdentityCreationContext = {
        parentIdentity: enterpriseIdentity,
        requestedType: IdentityType.DAO,
        metadata: {
          name: 'Sub DAO',
          type: IdentityType.DAO
        },
        currentDepth: 2,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Parent identity cannot create subidentities');
    });
  });

  describe('Basic Requirements Validation', () => {
    it('should fail when identity name is missing', async () => {
      const context: IdentityCreationContext = {
        parentIdentity: mockRootIdentity,
        requestedType: IdentityType.DAO,
        metadata: {
          name: '',
          type: IdentityType.DAO
        },
        currentDepth: 1,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Identity name is required');
    });

    it('should fail when identity name is too long', async () => {
      const longName = 'a'.repeat(101);
      const context: IdentityCreationContext = {
        parentIdentity: mockRootIdentity,
        requestedType: IdentityType.DAO,
        metadata: {
          name: longName,
          type: IdentityType.DAO
        },
        currentDepth: 1,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Identity name must be 100 characters or less');
    });

    it('should warn when description is very long', async () => {
      const longDescription = 'a'.repeat(501);
      const context: IdentityCreationContext = {
        parentIdentity: mockRootIdentity,
        requestedType: IdentityType.DAO,
        metadata: {
          name: 'Test DAO',
          type: IdentityType.DAO,
          description: longDescription
        },
        currentDepth: 1,
        rootIdentity: mockRootIdentity
      };

      const result = await validationService.validateIdentityCreation(context);

      expect(result.warnings).toContain('Identity description is quite long');
    });
  });

  describe('Governance Configuration Validation', () => {
    it('should validate valid DAO ID for Enterprise identity', async () => {
      const result = await validationService.validateGovernanceConfiguration(
        IdentityType.ENTERPRISE,
        { daoId: 'dao:test:enterprise' }
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with invalid DAO ID format', async () => {
      const result = await validationService.validateGovernanceConfiguration(
        IdentityType.ENTERPRISE,
        { daoId: 'invalid-dao-id' }
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid DAO ID format');
    });

    it('should fail when DAO ID is missing for Enterprise', async () => {
      const result = await validationService.validateGovernanceConfiguration(
        IdentityType.ENTERPRISE,
        {}
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DAO ID is required for Enterprise identities');
    });

    it('should fail when parental consent is missing for Consentida', async () => {
      const result = await validationService.validateGovernanceConfiguration(
        IdentityType.CONSENTIDA,
        { parentalConsent: false }
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Parental consent is required for Consentida identities');
    });
  });
});