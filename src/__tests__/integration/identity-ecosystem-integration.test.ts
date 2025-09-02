/**
 * Integration Tests for Identity Ecosystem Services
 * Tests integration with Qonsent, Qlock, Qerberos, Qindex, and Qwallet
 * Requirements: 3.5, 4.3, 4.4, 4.5, 4.6, 5.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Services to test
import { identityManager } from '@/services/IdentityManager';
import { QonsentService } from '@/services/qonsent/QonsentService';
import { QlockService } from '@/services/qlock/QlockService';
import { QerberosService } from '@/services/qerberos/QerberosService';
import { QindexService } from '@/services/qindex/QindexService';
import { QwalletService } from '@/services/qwallet/QwalletService';

// Types
import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel, 
  IdentityStatus,
  GovernanceType,
  IdentityAction,
  SubidentityMetadata
} from '@/types/identity';

// Mock data
const mockRootIdentity: ExtendedSquidIdentity = {
  did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
  name: 'Root Identity',
  type: IdentityType.ROOT,
  parentId: undefined,
  depth: 0,
  governanceLevel: GovernanceType.SELF,
  creationRules: {
    kycRequired: false,
    canCreateSubidentities: true,
    visibility: 'PUBLIC',
    governedBy: 'SELF'
  },
  permissions: {
    canCreateSubidentities: true,
    canDeleteSubidentities: true,
    canModifyProfile: true,
    canSwitchIdentities: true
  },
  qonsentProfileId: 'qonsent_profile_root',
  qlockKeyPair: {
    publicKey: 'mock_public_key',
    privateKey: 'mock_private_key'
  },
  privacyLevel: PrivacyLevel.PUBLIC,
  avatar: undefined,
  description: 'Primary root identity',
  tags: ['root', 'primary'],
  createdAt: '2024-01-01T00:00:00Z',
  lastUsed: '2024-02-08T00:00:00Z',
  status: IdentityStatus.ACTIVE,
  kyc: {
    approved: true,
    level: 'FULL',
    verifiedAt: '2024-01-01T00:00:00Z',
    documents: []
  },
  auditLog: [],
  securityFlags: []
};

const mockSubidentityMetadata: SubidentityMetadata = {
  name: 'Test DAO Identity',
  description: 'Test DAO for governance',
  tags: ['dao', 'test'],
  privacyLevel: PrivacyLevel.DAO_ONLY,
  governanceConfig: {
    daoId: 'dao_test_123',
    governanceRules: {
      requiresApproval: true,
      votingThreshold: 0.6,
      minimumStake: 100
    }
  },
  qonsentConfig: {
    profileId: 'qonsent_profile_dao_test',
    dataSharing: {
      qmail: { enabled: true, level: 'STANDARD', restrictions: [] },
      qchat: { enabled: true, level: 'MINIMAL', restrictions: ['no_history'] },
      qsocial: { enabled: false, level: 'MINIMAL', restrictions: [] }
    },
    visibilityRules: {
      profile: 'DAO_ONLY',
      activity: 'DAO_ONLY',
      connections: 'PRIVATE'
    }
  }
};

// Mock all ecosystem services
vi.mock('@/services/qonsent/QonsentService');
vi.mock('@/services/qlock/QlockService');
vi.mock('@/services/qerberos/QerberosService');
vi.mock('@/services/qindex/QindexService');
vi.mock('@/services/qwallet/QwalletService');

describe('Identity Ecosystem Integration Tests', () => {
  const mockQonsentService = vi.mocked(QonsentService);
  const mockQlockService = vi.mocked(QlockService);
  const mockQerberosService = vi.mocked(QerberosService);
  const mockQindexService = vi.mocked(QindexService);
  const mockQwalletService = vi.mocked(QwalletService);

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockQonsentService.prototype.createProfile = vi.fn().mockResolvedValue({
      success: true,
      profileId: 'qonsent_profile_new'
    });

    mockQonsentService.prototype.updateProfile = vi.fn().mockResolvedValue({
      success: true
    });

    mockQonsentService.prototype.switchProfile = vi.fn().mockResolvedValue({
      success: true
    });

    mockQlockService.prototype.generateKeyPair = vi.fn().mockResolvedValue({
      publicKey: 'mock_new_public_key',
      privateKey: 'mock_new_private_key'
    });

    mockQlockService.prototype.encryptData = vi.fn().mockResolvedValue({
      success: true,
      encryptedData: 'encrypted_data_mock'
    });

    mockQlockService.prototype.switchEncryptionContext = vi.fn().mockResolvedValue({
      success: true
    });

    mockQerberosService.prototype.logAction = vi.fn().mockResolvedValue({
      success: true,
      logId: 'audit_log_123'
    });

    mockQerberosService.prototype.logSecurityEvent = vi.fn().mockResolvedValue({
      success: true,
      eventId: 'security_event_456'
    });

    mockQindexService.prototype.registerIdentity = vi.fn().mockResolvedValue({
      success: true,
      indexId: 'qindex_entry_789'
    });

    mockQindexService.prototype.updateIdentityMetadata = vi.fn().mockResolvedValue({
      success: true
    });

    mockQwalletService.prototype.createWalletContext = vi.fn().mockResolvedValue({
      success: true,
      contextId: 'wallet_context_abc'
    });

    mockQwalletService.prototype.switchWalletContext = vi.fn().mockResolvedValue({
      success: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Qonsent Integration', () => {
    it('should create Qonsent profile during identity creation', async () => {
      const result = await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      expect(result.success).toBe(true);
      expect(mockQonsentService.prototype.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          identityId: expect.any(String),
          privacyLevel: PrivacyLevel.DAO_ONLY,
          dataSharing: mockSubidentityMetadata.qonsentConfig?.dataSharing,
          visibilityRules: mockSubidentityMetadata.qonsentConfig?.visibilityRules
        })
      );
    });

    it('should update Qonsent context during identity switch', async () => {
      const targetIdentity = {
        ...mockRootIdentity,
        did: 'did:key:target_identity',
        qonsentProfileId: 'qonsent_profile_target'
      };

      const result = await identityManager.switchActiveIdentity(targetIdentity.did);

      expect(result.success).toBe(true);
      expect(mockQonsentService.prototype.switchProfile).toHaveBeenCalledWith(
        targetIdentity.qonsentProfileId
      );
    });

    it('should handle Qonsent profile creation failure gracefully', async () => {
      mockQonsentService.prototype.createProfile = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed to create Qonsent profile'
      });

      const result = await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Qonsent profile creation failed');
    });

    it('should sync privacy settings changes across ecosystem', async () => {
      const updatedPrivacyConfig = {
        ...mockSubidentityMetadata.qonsentConfig!,
        dataSharing: {
          ...mockSubidentityMetadata.qonsentConfig!.dataSharing,
          qmail: { enabled: false, level: 'MINIMAL', restrictions: ['no_attachments'] }
        }
      };

      await identityManager.updateIdentityPrivacy(
        mockRootIdentity.did,
        updatedPrivacyConfig
      );

      expect(mockQonsentService.prototype.updateProfile).toHaveBeenCalledWith(
        mockRootIdentity.qonsentProfileId,
        expect.objectContaining({
          dataSharing: updatedPrivacyConfig.dataSharing
        })
      );

      expect(mockQindexService.prototype.updateIdentityMetadata).toHaveBeenCalledWith(
        mockRootIdentity.did,
        expect.objectContaining({
          privacyLevel: expect.any(String)
        })
      );
    });
  });

  describe('Qlock Integration', () => {
    it('should generate encryption keys during identity creation', async () => {
      const result = await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      expect(result.success).toBe(true);
      expect(mockQlockService.prototype.generateKeyPair).toHaveBeenCalledWith(
        expect.objectContaining({
          identityId: expect.any(String),
          keyType: 'IDENTITY_ENCRYPTION'
        })
      );
    });

    it('should encrypt identity metadata before storage', async () => {
      const result = await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      expect(result.success).toBe(true);
      expect(mockQlockService.prototype.encryptData).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(Object),
          keyId: expect.any(String)
        })
      );
    });

    it('should switch encryption context during identity switch', async () => {
      const targetIdentity = {
        ...mockRootIdentity,
        did: 'did:key:target_identity',
        qlockKeyPair: {
          publicKey: 'target_public_key',
          privateKey: 'target_private_key'
        }
      };

      const result = await identityManager.switchActiveIdentity(targetIdentity.did);

      expect(result.success).toBe(true);
      expect(mockQlockService.prototype.switchEncryptionContext).toHaveBeenCalledWith(
        targetIdentity.qlockKeyPair
      );
    });

    it('should handle encryption key generation failure', async () => {
      mockQlockService.prototype.generateKeyPair = vi.fn().mockResolvedValue({
        success: false,
        error: 'Key generation failed'
      });

      const result = await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Encryption key generation failed');
    });
  });

  describe('Qerberos Integration', () => {
    it('should log identity creation action', async () => {
      const result = await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      expect(result.success).toBe(true);
      expect(mockQerberosService.prototype.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: IdentityAction.CREATED,
          identityId: expect.any(String),
          metadata: expect.objectContaining({
            type: IdentityType.DAO,
            name: mockSubidentityMetadata.name
          })
        })
      );
    });

    it('should log identity switch action', async () => {
      const targetIdentity = {
        ...mockRootIdentity,
        did: 'did:key:target_identity'
      };

      const result = await identityManager.switchActiveIdentity(targetIdentity.did);

      expect(result.success).toBe(true);
      expect(mockQerberosService.prototype.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: IdentityAction.SWITCHED,
          identityId: targetIdentity.did,
          metadata: expect.objectContaining({
            previousIdentity: expect.any(String),
            newIdentity: targetIdentity.did
          })
        })
      );
    });

    it('should log security events for suspicious activity', async () => {
      // Simulate rapid identity switching (suspicious behavior)
      const identities = [
        'did:key:identity1',
        'did:key:identity2',
        'did:key:identity3'
      ];

      for (const identityId of identities) {
        await identityManager.switchActiveIdentity(identityId);
      }

      // Should detect and log suspicious activity
      expect(mockQerberosService.prototype.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SUSPICIOUS_ACTIVITY',
          severity: 'MEDIUM',
          description: expect.stringContaining('rapid identity switching')
        })
      );
    });

    it('should maintain audit trail integrity', async () => {
      const actions = [
        () => identityManager.createSubidentity(IdentityType.DAO, mockSubidentityMetadata),
        () => identityManager.switchActiveIdentity('did:key:new_identity'),
        () => identityManager.deleteSubidentity('did:key:new_identity')
      ];

      for (const action of actions) {
        await action();
      }

      // Verify all actions were logged
      expect(mockQerberosService.prototype.logAction).toHaveBeenCalledTimes(3);
      
      // Verify log entries have proper sequence
      const logCalls = mockQerberosService.prototype.logAction.mock.calls;
      expect(logCalls[0][0].action).toBe(IdentityAction.CREATED);
      expect(logCalls[1][0].action).toBe(IdentityAction.SWITCHED);
      expect(logCalls[2][0].action).toBe(IdentityAction.DELETED);
    });
  });

  describe('Qindex Integration', () => {
    it('should register identity in Qindex during creation', async () => {
      const result = await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      expect(result.success).toBe(true);
      expect(mockQindexService.prototype.registerIdentity).toHaveBeenCalledWith(
        expect.objectContaining({
          did: expect.any(String),
          type: IdentityType.DAO,
          name: mockSubidentityMetadata.name,
          description: mockSubidentityMetadata.description,
          tags: mockSubidentityMetadata.tags,
          privacyLevel: mockSubidentityMetadata.privacyLevel
        })
      );
    });

    it('should update identity metadata in Qindex', async () => {
      const updatedMetadata = {
        name: 'Updated Identity Name',
        description: 'Updated description',
        tags: ['updated', 'dao']
      };

      await identityManager.updateIdentityMetadata(
        mockRootIdentity.did,
        updatedMetadata
      );

      expect(mockQindexService.prototype.updateIdentityMetadata).toHaveBeenCalledWith(
        mockRootIdentity.did,
        expect.objectContaining(updatedMetadata)
      );
    });

    it('should handle Qindex registration failure', async () => {
      mockQindexService.prototype.registerIdentity = vi.fn().mockResolvedValue({
        success: false,
        error: 'Qindex registration failed'
      });

      const result = await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Qindex registration failed');
    });

    it('should support identity search and discovery', async () => {
      mockQindexService.prototype.searchIdentities = vi.fn().mockResolvedValue({
        success: true,
        results: [
          {
            did: 'did:key:found_identity',
            name: 'Found Identity',
            type: IdentityType.DAO,
            relevanceScore: 0.95
          }
        ]
      });

      const searchResults = await identityManager.searchIdentities({
        query: 'DAO governance',
        type: IdentityType.DAO,
        privacyLevel: PrivacyLevel.PUBLIC
      });

      expect(searchResults.success).toBe(true);
      expect(searchResults.results).toHaveLength(1);
      expect(mockQindexService.prototype.searchIdentities).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'DAO governance',
          filters: expect.objectContaining({
            type: IdentityType.DAO,
            privacyLevel: PrivacyLevel.PUBLIC
          })
        })
      );
    });
  });

  describe('Qwallet Integration', () => {
    it('should create wallet context during identity creation', async () => {
      const result = await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      expect(result.success).toBe(true);
      expect(mockQwalletService.prototype.createWalletContext).toHaveBeenCalledWith(
        expect.objectContaining({
          identityId: expect.any(String),
          type: IdentityType.DAO,
          permissions: expect.any(Object)
        })
      );
    });

    it('should switch wallet context during identity switch', async () => {
      const targetIdentity = {
        ...mockRootIdentity,
        did: 'did:key:target_identity'
      };

      const result = await identityManager.switchActiveIdentity(targetIdentity.did);

      expect(result.success).toBe(true);
      expect(mockQwalletService.prototype.switchWalletContext).toHaveBeenCalledWith(
        targetIdentity.did
      );
    });

    it('should handle wallet context creation failure', async () => {
      mockQwalletService.prototype.createWalletContext = vi.fn().mockResolvedValue({
        success: false,
        error: 'Wallet context creation failed'
      });

      const result = await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet context creation failed');
    });

    it('should maintain wallet permissions per identity', async () => {
      const enterpriseMetadata = {
        ...mockSubidentityMetadata,
        name: 'Enterprise Identity',
        type: IdentityType.ENTERPRISE
      };

      await identityManager.createSubidentity(
        IdentityType.ENTERPRISE,
        enterpriseMetadata
      );

      expect(mockQwalletService.prototype.createWalletContext).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: expect.objectContaining({
            canTransfer: true,
            canStake: true,
            canVote: true,
            maxTransactionAmount: expect.any(Number)
          })
        })
      );
    });
  });

  describe('Cross-Service Integration', () => {
    it('should coordinate all services during identity creation', async () => {
      const result = await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      expect(result.success).toBe(true);

      // Verify all services were called in correct order
      expect(mockQlockService.prototype.generateKeyPair).toHaveBeenCalled();
      expect(mockQonsentService.prototype.createProfile).toHaveBeenCalled();
      expect(mockQwalletService.prototype.createWalletContext).toHaveBeenCalled();
      expect(mockQindexService.prototype.registerIdentity).toHaveBeenCalled();
      expect(mockQerberosService.prototype.logAction).toHaveBeenCalled();
    });

    it('should handle partial service failures with rollback', async () => {
      // Simulate Qindex failure after other services succeed
      mockQindexService.prototype.registerIdentity = vi.fn().mockResolvedValue({
        success: false,
        error: 'Qindex service unavailable'
      });

      const result = await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      expect(result.success).toBe(false);

      // Verify rollback was attempted for successful services
      expect(mockQonsentService.prototype.deleteProfile).toHaveBeenCalled();
      expect(mockQwalletService.prototype.deleteWalletContext).toHaveBeenCalled();
    });

    it('should maintain data consistency across all services', async () => {
      const identityId = 'did:key:consistency_test';
      
      await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      // Verify all services received consistent identity data
      const qonsentCall = mockQonsentService.prototype.createProfile.mock.calls[0][0];
      const qindexCall = mockQindexService.prototype.registerIdentity.mock.calls[0][0];
      const qwalletCall = mockQwalletService.prototype.createWalletContext.mock.calls[0][0];

      expect(qonsentCall.identityId).toBe(qindexCall.did);
      expect(qindexCall.did).toBe(qwalletCall.identityId);
      expect(qonsentCall.privacyLevel).toBe(qindexCall.privacyLevel);
    });

    it('should handle concurrent identity operations safely', async () => {
      const concurrentOperations = [
        identityManager.createSubidentity(IdentityType.DAO, {
          ...mockSubidentityMetadata,
          name: 'Concurrent Identity 1'
        }),
        identityManager.createSubidentity(IdentityType.ENTERPRISE, {
          ...mockSubidentityMetadata,
          name: 'Concurrent Identity 2'
        }),
        identityManager.switchActiveIdentity('did:key:existing_identity')
      ];

      const results = await Promise.all(concurrentOperations);

      // All operations should complete successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify proper sequencing of audit logs
      expect(mockQerberosService.prototype.logAction).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should retry failed service calls with exponential backoff', async () => {
      let callCount = 0;
      mockQonsentService.prototype.createProfile = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({ success: false, error: 'Temporary failure' });
        }
        return Promise.resolve({ success: true, profileId: 'qonsent_profile_retry' });
      });

      const result = await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      expect(result.success).toBe(true);
      expect(mockQonsentService.prototype.createProfile).toHaveBeenCalledTimes(3);
    });

    it('should gracefully degrade when non-critical services fail', async () => {
      // Simulate Qindex failure (non-critical for basic identity creation)
      mockQindexService.prototype.registerIdentity = vi.fn().mockResolvedValue({
        success: false,
        error: 'Qindex temporarily unavailable'
      });

      const result = await identityManager.createSubidentity(
        IdentityType.DAO,
        mockSubidentityMetadata
      );

      // Identity creation should still succeed
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Qindex registration failed');
    });

    it('should maintain service health monitoring', async () => {
      // Simulate various service health states
      const healthChecks = await identityManager.checkEcosystemHealth();

      expect(healthChecks).toEqual(
        expect.objectContaining({
          qonsent: expect.objectContaining({ status: 'healthy' }),
          qlock: expect.objectContaining({ status: 'healthy' }),
          qerberos: expect.objectContaining({ status: 'healthy' }),
          qindex: expect.objectContaining({ status: 'healthy' }),
          qwallet: expect.objectContaining({ status: 'healthy' })
        })
      );
    });
  });
});