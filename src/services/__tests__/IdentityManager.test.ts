/**
 * Unit Tests for IdentityManager Service
 * Tests core identity management operations with type-specific validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IdentityManager } from '../IdentityManager';
import {
  IdentityType,
  ExtendedSquidIdentity,
  SubidentityMetadata,
  GovernanceType,
  PrivacyLevel,
  IdentityStatus
} from '@/types/identity';

// Mock the useIdentityStore
vi.mock('@/state/identity', () => {
  const mockStore = {
    activeIdentity: null as ExtendedSquidIdentity | null,
    identities: new Map<string, ExtendedSquidIdentity>(),
    identityTree: null,
    createSubidentity: vi.fn(),
    setActiveIdentity: vi.fn(),
    deleteSubidentity: vi.fn(),
    buildIdentityTree: vi.fn(),
    getIdentityById: vi.fn(),
    getChildIdentities: vi.fn(),
    getRootIdentity: vi.fn(),
    logIdentityAction: vi.fn(),
    addSecurityFlag: vi.fn()
  };
  
  return {
    useIdentityStore: {
      getState: () => mockStore
    }
  };
});

describe('IdentityManager', () => {
  let identityManager: IdentityManager;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockIdentityStore: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Get the mock store
    const { useIdentityStore } = await import('@/state/identity');
    mockIdentityStore = useIdentityStore.getState();
    
    // Get fresh instance
    identityManager = IdentityManager.getInstance();

    // Create mock root identity
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

    // Create mock DAO identity
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

    // Setup mock store state
    mockIdentityStore.activeIdentity = mockRootIdentity;
    mockIdentityStore.identities.set(mockRootIdentity.did, mockRootIdentity);
    mockIdentityStore.identities.set(mockDAOIdentity.did, mockDAOIdentity);
    
    // Setup mock methods
    mockIdentityStore.getRootIdentity.mockReturnValue(mockRootIdentity);
    mockIdentityStore.getIdentityById.mockImplementation((id: string) => 
      mockIdentityStore.identities.get(id) || null
    );
  });

  describe('createSubidentity', () => {
    it('should successfully create a Consentida subidentity', async () => {
      const metadata: SubidentityMetadata = {
        name: 'Child Identity',
        description: 'A child identity',
        type: IdentityType.CONSENTIDA,
        privacyLevel: PrivacyLevel.PRIVATE,
        governanceConfig: {
          parentalConsent: true
        }
      };

      mockIdentityStore.createSubidentity.mockResolvedValue({
        success: true,
        identity: {
          ...mockRootIdentity,
          did: 'did:squid:consentida:789',
          name: metadata.name,
          type: IdentityType.CONSENTIDA,
          parentId: mockRootIdentity.did,
          depth: 1
        }
      });

      const result = await identityManager.createSubidentity(IdentityType.CONSENTIDA, metadata);

      expect(result.success).toBe(true);
      expect(result.identity).toBeDefined();
      expect(mockIdentityStore.createSubidentity).toHaveBeenCalledWith(metadata);
      expect(mockIdentityStore.logIdentityAction).toHaveBeenCalled();
    });

    it('should fail to create subidentity when no active identity', async () => {
      mockIdentityStore.activeIdentity = null;

      const metadata: SubidentityMetadata = {
        name: 'Test Identity',
        type: IdentityType.DAO
      };

      const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active identity found');
    });

    it('should fail to create Enterprise identity without DAO governance', async () => {
      const metadata: SubidentityMetadata = {
        name: 'Enterprise Corp',
        type: IdentityType.ENTERPRISE,
        privacyLevel: PrivacyLevel.PUBLIC
        // Missing governanceConfig.daoId
      };

      const result = await identityManager.createSubidentity(IdentityType.ENTERPRISE, metadata);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Identity creation validation failed');
    });

    it('should fail to create AID identity when root lacks KYC', async () => {
      const rootWithoutKYC = {
        ...mockRootIdentity,
        kyc: {
          required: false,
          submitted: false,
          approved: false
        }
      };

      mockIdentityStore.activeIdentity = rootWithoutKYC;
      mockIdentityStore.getRootIdentity.mockReturnValue(rootWithoutKYC);

      const metadata: SubidentityMetadata = {
        name: 'Anonymous123',
        type: IdentityType.AID,
        privacyLevel: PrivacyLevel.ANONYMOUS
      };

      const result = await identityManager.createSubidentity(IdentityType.AID, metadata);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Identity creation validation failed');
    });

    it('should successfully create DAO identity with proper validation', async () => {
      const metadata: SubidentityMetadata = {
        name: 'Test DAO',
        type: IdentityType.DAO,
        privacyLevel: PrivacyLevel.PUBLIC,
        governanceConfig: {
          governanceRules: {
            votingThreshold: 0.5
          }
        }
      };

      mockIdentityStore.createSubidentity.mockResolvedValue({
        success: true,
        identity: {
          ...mockRootIdentity,
          did: 'did:squid:dao:new',
          name: metadata.name,
          type: IdentityType.DAO,
          parentId: mockRootIdentity.did,
          depth: 1
        }
      });

      const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);

      expect(result.success).toBe(true);
      expect(result.identity).toBeDefined();
    });
  });

  describe('switchActiveIdentity', () => {
    it('should successfully switch to existing identity', async () => {
      const targetIdentity = mockDAOIdentity;
      
      mockIdentityStore.setActiveIdentity.mockResolvedValue(undefined);

      const result = await identityManager.switchActiveIdentity(targetIdentity.did);

      expect(result.success).toBe(true);
      expect(result.newIdentity).toEqual(targetIdentity);
      expect(result.previousIdentity).toEqual(mockRootIdentity);
      expect(mockIdentityStore.setActiveIdentity).toHaveBeenCalledWith(targetIdentity);
      expect(mockIdentityStore.logIdentityAction).toHaveBeenCalledWith(
        targetIdentity.did,
        'SWITCHED',
        expect.any(Object)
      );
    });

    it('should fail to switch to non-existent identity', async () => {
      const nonExistentId = 'did:squid:nonexistent:999';
      mockIdentityStore.getIdentityById.mockReturnValue(null);

      const result = await identityManager.switchActiveIdentity(nonExistentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Target identity not found');
    });

    it('should fail to switch to inactive identity', async () => {
      const inactiveIdentity = {
        ...mockDAOIdentity,
        status: IdentityStatus.SUSPENDED
      };
      
      mockIdentityStore.getIdentityById.mockReturnValue(inactiveIdentity);

      const result = await identityManager.switchActiveIdentity(inactiveIdentity.did);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot switch to inactive identity');
    });
  });

  describe('deleteSubidentity', () => {
    it('should successfully delete subidentity', async () => {
      const targetIdentity = mockDAOIdentity;
      
      mockIdentityStore.deleteSubidentity.mockResolvedValue({
        success: true,
        deletedIdentity: targetIdentity,
        affectedChildren: []
      });

      const result = await identityManager.deleteSubidentity(targetIdentity.did);

      expect(result.success).toBe(true);
      expect(result.deletedIdentity).toEqual(targetIdentity);
      expect(mockIdentityStore.deleteSubidentity).toHaveBeenCalledWith(targetIdentity.did);
      expect(mockIdentityStore.logIdentityAction).toHaveBeenCalledWith(
        targetIdentity.did,
        'DELETED',
        expect.any(Object)
      );
    });

    it('should fail to delete root identity', async () => {
      const result = await identityManager.deleteSubidentity(mockRootIdentity.did);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot delete root identity');
    });

    it('should fail to delete non-existent identity', async () => {
      const nonExistentId = 'did:squid:nonexistent:999';
      mockIdentityStore.getIdentityById.mockReturnValue(null);

      const result = await identityManager.deleteSubidentity(nonExistentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Identity not found');
    });

    it('should fail when user lacks delete permissions', async () => {
      const identityWithoutPermissions = {
        ...mockRootIdentity,
        permissions: {
          ...mockRootIdentity.permissions,
          canDeleteSubidentities: false
        }
      };
      
      mockIdentityStore.activeIdentity = identityWithoutPermissions;

      const result = await identityManager.deleteSubidentity(mockDAOIdentity.did);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No permission to delete subidentities');
    });
  });

  describe('getIdentityTree', () => {
    it('should successfully build and return identity tree', async () => {
      const mockTree = {
        root: {
          identity: mockRootIdentity,
          children: [{
            identity: mockDAOIdentity,
            children: []
          }]
        },
        totalNodes: 2,
        maxDepth: 1,
        lastUpdated: '2024-01-01T00:00:00Z'
      };

      mockIdentityStore.buildIdentityTree.mockResolvedValue(undefined);
      mockIdentityStore.identityTree = mockTree;

      const result = await identityManager.getIdentityTree(mockRootIdentity.did);

      expect(result).toEqual(mockTree);
      expect(mockIdentityStore.buildIdentityTree).toHaveBeenCalledWith(mockRootIdentity.did);
    });

    it('should fail when tree building fails', async () => {
      mockIdentityStore.buildIdentityTree.mockResolvedValue(undefined);
      mockIdentityStore.identityTree = null;

      await expect(identityManager.getIdentityTree(mockRootIdentity.did))
        .rejects.toThrow('Failed to build identity tree');
    });
  });

  describe('verifyIdentityOwnership', () => {
    it('should verify ownership for identity owner', async () => {
      const result = await identityManager.verifyIdentityOwnership(
        mockDAOIdentity.did, 
        mockDAOIdentity.did
      );

      expect(result).toBe(true);
    });

    it('should verify ownership for root identity', async () => {
      const result = await identityManager.verifyIdentityOwnership(
        mockDAOIdentity.did, 
        mockRootIdentity.did
      );

      expect(result).toBe(true);
    });

    it('should verify ownership for parent in path', async () => {
      const childIdentity = {
        ...mockDAOIdentity,
        did: 'did:squid:child:789',
        parentId: mockDAOIdentity.did,
        path: [mockRootIdentity.did, mockDAOIdentity.did],
        depth: 2
      };

      mockIdentityStore.getIdentityById.mockReturnValue(childIdentity);

      const result = await identityManager.verifyIdentityOwnership(
        childIdentity.did, 
        mockDAOIdentity.did
      );

      expect(result).toBe(true);
    });

    it('should deny ownership for unrelated identity', async () => {
      const unrelatedIdentity = {
        ...mockDAOIdentity,
        did: 'did:squid:unrelated:999',
        path: []
      };

      mockIdentityStore.getIdentityById.mockReturnValue(mockDAOIdentity);

      const result = await identityManager.verifyIdentityOwnership(
        mockDAOIdentity.did, 
        unrelatedIdentity.did
      );

      expect(result).toBe(false);
    });
  });

  describe('validateIdentityCreation', () => {
    it('should validate successful Consentida creation', async () => {
      const result = await identityManager.validateIdentityCreation(
        IdentityType.CONSENTIDA, 
        mockRootIdentity.did
      );

      expect(result.valid).toBe(true);
      expect(result.requirements.parentalConsent).toBe(true);
      expect(result.requirements.kyc).toBe(false);
    });

    it('should validate successful Enterprise creation', async () => {
      const result = await identityManager.validateIdentityCreation(
        IdentityType.ENTERPRISE, 
        mockRootIdentity.did
      );

      expect(result.valid).toBe(true);
      expect(result.requirements.governance).toBe(true);
      expect(result.requirements.daoApproval).toBe(true);
    });

    it('should validate successful DAO creation', async () => {
      const result = await identityManager.validateIdentityCreation(
        IdentityType.DAO, 
        mockRootIdentity.did
      );

      expect(result.valid).toBe(true);
      expect(result.requirements.kyc).toBe(true);
    });

    it('should validate successful AID creation', async () => {
      const result = await identityManager.validateIdentityCreation(
        IdentityType.AID, 
        mockRootIdentity.did
      );

      expect(result.valid).toBe(true);
      expect(result.requirements.kyc).toBe(true);
    });

    it('should fail validation for non-existent parent', async () => {
      mockIdentityStore.getIdentityById.mockReturnValue(null);

      const result = await identityManager.validateIdentityCreation(
        IdentityType.DAO, 
        'nonexistent'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Parent identity not found');
    });

    it('should fail validation when parent cannot create subidentities', async () => {
      const parentWithoutPermissions = {
        ...mockRootIdentity,
        permissions: {
          ...mockRootIdentity.permissions,
          canCreateSubidentities: false
        }
      };

      mockIdentityStore.getIdentityById.mockReturnValue(parentWithoutPermissions);

      const result = await identityManager.validateIdentityCreation(
        IdentityType.DAO, 
        parentWithoutPermissions.did
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Parent identity cannot create subidentities');
    });
  });

  describe('ecosystem integration', () => {
    it('should sync with all ecosystem services', async () => {
      const result = await identityManager.syncWithEcosystem(mockRootIdentity);

      expect(result.success).toBe(true);
      expect(result.services.qonsent).toBe(true);
      expect(result.services.qlock).toBe(true);
      expect(result.services.qerberos).toBe(true);
      expect(result.services.qindex).toBe(true);
      expect(result.services.qwallet).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should update all module contexts', async () => {
      const result = await identityManager.updateModuleContexts(mockRootIdentity);

      expect(result.success).toBe(true);
      expect(result.updatedContexts).toContain('qonsent');
      expect(result.updatedContexts).toContain('qlock');
      expect(result.updatedContexts).toContain('qwallet');
      expect(result.updatedContexts).toContain('qerberos');
      expect(result.updatedContexts).toContain('qindex');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('utility methods', () => {
    it('should get identity by ID', async () => {
      const result = await identityManager.getIdentityById(mockRootIdentity.did);
      expect(result).toEqual(mockRootIdentity);
    });

    it('should get identities by type', async () => {
      const result = await identityManager.getIdentitiesByType(IdentityType.ROOT);
      expect(result).toContain(mockRootIdentity);
    });

    it('should get child identities', async () => {
      mockIdentityStore.getChildIdentities.mockReturnValue([mockDAOIdentity]);
      
      const result = await identityManager.getChildIdentities(mockRootIdentity.did);
      expect(result).toContain(mockDAOIdentity);
    });

    it('should log identity actions', async () => {
      await identityManager.logIdentityAction(mockRootIdentity.did, 'CREATED', { test: true });
      
      expect(mockIdentityStore.logIdentityAction).toHaveBeenCalledWith(
        mockRootIdentity.did, 
        'CREATED', 
        { test: true }
      );
    });

    it('should get audit log', async () => {
      const mockAuditLog = [
        {
          id: 'audit-1',
          identityId: mockRootIdentity.did,
          action: 'CREATED',
          timestamp: '2024-01-01T00:00:00Z',
          metadata: {}
        }
      ];

      const identityWithAuditLog = {
        ...mockRootIdentity,
        auditLog: mockAuditLog
      };

      mockIdentityStore.getIdentityById.mockReturnValue(identityWithAuditLog);

      const result = await identityManager.getAuditLog(mockRootIdentity.did);
      expect(result).toEqual(mockAuditLog);
    });

    it('should flag security events', async () => {
      const securityFlag = {
        id: 'flag-1',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        description: 'Test flag',
        timestamp: '2024-01-01T00:00:00Z',
        resolved: false
      };

      await identityManager.flagSecurityEvent(mockRootIdentity.did, securityFlag);
      
      expect(mockIdentityStore.addSecurityFlag).toHaveBeenCalledWith(
        mockRootIdentity.did, 
        securityFlag
      );
    });
  });
});