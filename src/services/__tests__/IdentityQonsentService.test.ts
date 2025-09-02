/**
 * Unit Tests for IdentityQonsentService
 * Tests identity-specific Qonsent profile management and privacy controls
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IdentityQonsentService } from '../identity/IdentityQonsentService';
import {
  ExtendedSquidIdentity,
  IdentityType,
  GovernanceType,
  PrivacyLevel,
  IdentityStatus
} from '@/types/identity';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('IdentityQonsentService', () => {
  let qonsentService: IdentityQonsentService;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockEnterpriseIdentity: ExtendedSquidIdentity;
  let mockConsentidaIdentity: ExtendedSquidIdentity;
  let mockAIDIdentity: ExtendedSquidIdentity;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    qonsentService = new IdentityQonsentService();

    // Create mock identities for different types
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

    mockDAOIdentity = {
      ...mockRootIdentity,
      did: 'did:squid:dao:456',
      name: 'Test DAO',
      type: IdentityType.DAO,
      parentId: 'did:squid:root:123',
      depth: 1,
      path: ['did:squid:root:123'],
      governanceLevel: GovernanceType.DAO,
      qonsentProfileId: 'qonsent-456'
    };

    mockEnterpriseIdentity = {
      ...mockRootIdentity,
      did: 'did:squid:enterprise:789',
      name: 'Enterprise Corp',
      type: IdentityType.ENTERPRISE,
      parentId: 'did:squid:dao:456',
      depth: 2,
      path: ['did:squid:root:123', 'did:squid:dao:456'],
      governanceLevel: GovernanceType.DAO,
      qonsentProfileId: 'qonsent-789'
    };

    mockConsentidaIdentity = {
      ...mockRootIdentity,
      did: 'did:squid:consentida:101',
      name: 'Child Identity',
      type: IdentityType.CONSENTIDA,
      parentId: 'did:squid:root:123',
      depth: 1,
      path: ['did:squid:root:123'],
      governanceLevel: GovernanceType.PARENT,
      privacyLevel: PrivacyLevel.PRIVATE,
      qonsentProfileId: 'qonsent-101'
    };

    mockAIDIdentity = {
      ...mockRootIdentity,
      did: 'did:squid:aid:202',
      name: 'Anonymous123',
      type: IdentityType.AID,
      parentId: 'did:squid:root:123',
      depth: 1,
      path: ['did:squid:root:123'],
      governanceLevel: GovernanceType.SELF,
      privacyLevel: PrivacyLevel.ANONYMOUS,
      qonsentProfileId: 'qonsent-202'
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('createQonsentProfile', () => {
    it('should create Qonsent profile for ROOT identity with public defaults', async () => {
      const profile = await qonsentService.createQonsentProfile(mockRootIdentity);

      expect(profile.identityId).toBe(mockRootIdentity.did);
      expect(profile.profileId).toContain('qonsent-');
      expect(profile.privacyLevel).toBe(PrivacyLevel.PUBLIC);
      expect(profile.dataSharing.qsocial.enabled).toBe(true);
      expect(profile.dataSharing.qsocial.level).toBe('FULL');
      expect(profile.dataSharing.qwallet.enabled).toBe(true);
      expect(profile.dataSharing.qindex.enabled).toBe(true);
      expect(profile.visibilityRules.profile).toBe(PrivacyLevel.PUBLIC);
      expect(profile.consentHistory).toHaveLength(1);
      expect(profile.consentHistory[0].action).toBe('GRANTED');
      expect(profile.consentHistory[0].permission).toBe('PROFILE_CREATED');
    });

    it('should create Qonsent profile for DAO identity with public defaults', async () => {
      const profile = await qonsentService.createQonsentProfile(mockDAOIdentity);

      expect(profile.identityId).toBe(mockDAOIdentity.did);
      expect(profile.privacyLevel).toBe(PrivacyLevel.PUBLIC);
      expect(profile.dataSharing.qsocial.level).toBe('FULL');
      expect(profile.visibilityRules.profile).toBe(PrivacyLevel.PUBLIC);
    });

    it('should create Qonsent profile for Enterprise identity with public defaults', async () => {
      const profile = await qonsentService.createQonsentProfile(mockEnterpriseIdentity);

      expect(profile.identityId).toBe(mockEnterpriseIdentity.did);
      expect(profile.privacyLevel).toBe(PrivacyLevel.PUBLIC);
      expect(profile.dataSharing.qsocial.level).toBe('FULL');
      expect(profile.visibilityRules.profile).toBe(PrivacyLevel.PUBLIC);
    });

    it('should create Qonsent profile for Consentida identity with private defaults', async () => {
      const profile = await qonsentService.createQonsentProfile(mockConsentidaIdentity);

      expect(profile.identityId).toBe(mockConsentidaIdentity.did);
      expect(profile.privacyLevel).toBe(PrivacyLevel.PRIVATE);
      expect(profile.dataSharing.qsocial.level).toBe('MINIMAL');
      expect(profile.dataSharing.qsocial.restrictions).toContain('public_posts');
      expect(profile.dataSharing.qwallet.enabled).toBe(false);
      expect(profile.dataSharing.qindex.enabled).toBe(false);
      expect(profile.visibilityRules.profile).toBe(PrivacyLevel.PRIVATE);
    });

    it('should create Qonsent profile for AID identity with anonymous defaults', async () => {
      const profile = await qonsentService.createQonsentProfile(mockAIDIdentity);

      expect(profile.identityId).toBe(mockAIDIdentity.did);
      expect(profile.privacyLevel).toBe(PrivacyLevel.ANONYMOUS);
      expect(profile.dataSharing.qsocial.enabled).toBe(false);
      expect(profile.dataSharing.qwallet.enabled).toBe(false);
      expect(profile.dataSharing.qindex.enabled).toBe(false);
      expect(profile.dataSharing.qerberos.enabled).toBe(false);
      expect(profile.visibilityRules.profile).toBe(PrivacyLevel.ANONYMOUS);
    });
  });

  describe('getQonsentProfile', () => {
    it('should return existing profile', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      
      const profile = await qonsentService.getQonsentProfile(mockRootIdentity.did);

      expect(profile).toBeDefined();
      expect(profile!.identityId).toBe(mockRootIdentity.did);
    });

    it('should return null for non-existent profile', async () => {
      const profile = await qonsentService.getQonsentProfile('nonexistent-id');

      expect(profile).toBeNull();
    });
  });

  describe('updateQonsentProfile', () => {
    it('should update existing profile successfully', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      
      const updated = await qonsentService.updateQonsentProfile(mockRootIdentity.did, {
        privacyLevel: PrivacyLevel.PRIVATE
      });

      expect(updated).toBe(true);
      
      const profile = await qonsentService.getQonsentProfile(mockRootIdentity.did);
      expect(profile!.privacyLevel).toBe(PrivacyLevel.PRIVATE);
      expect(profile!.lastUpdated).toBeDefined();
    });

    it('should fail to update non-existent profile', async () => {
      const updated = await qonsentService.updateQonsentProfile('nonexistent-id', {
        privacyLevel: PrivacyLevel.PRIVATE
      });

      expect(updated).toBe(false);
    });

    it('should log profile update event', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      
      await qonsentService.updateQonsentProfile(mockRootIdentity.did, {
        privacyLevel: PrivacyLevel.PRIVATE
      });

      const profile = await qonsentService.getQonsentProfile(mockRootIdentity.did);
      expect(profile!.consentHistory).toHaveLength(2);
      expect(profile!.consentHistory[1].action).toBe('MODIFIED');
      expect(profile!.consentHistory[1].permission).toBe('PROFILE_UPDATED');
    });
  });

  describe('deleteQonsentProfile', () => {
    it('should delete existing profile successfully', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      
      const deleted = await qonsentService.deleteQonsentProfile(mockRootIdentity.did);

      expect(deleted).toBe(true);
      
      const profile = await qonsentService.getQonsentProfile(mockRootIdentity.did);
      expect(profile).toBeNull();
    });

    it('should return false for non-existent profile', async () => {
      const deleted = await qonsentService.deleteQonsentProfile('nonexistent-id');

      expect(deleted).toBe(false);
    });
  });

  describe('switchPrivacyContext', () => {
    it('should switch privacy context successfully', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      await qonsentService.createQonsentProfile(mockDAOIdentity);
      
      const switched = await qonsentService.switchPrivacyContext(
        mockRootIdentity.did,
        mockDAOIdentity.did
      );

      expect(switched).toBe(true);
    });

    it('should fail when target profile does not exist', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      
      const switched = await qonsentService.switchPrivacyContext(
        mockRootIdentity.did,
        'nonexistent-id'
      );

      expect(switched).toBe(false);
    });

    it('should log context switch event', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      await qonsentService.createQonsentProfile(mockDAOIdentity);
      
      await qonsentService.switchPrivacyContext(
        mockRootIdentity.did,
        mockDAOIdentity.did
      );

      const profile = await qonsentService.getQonsentProfile(mockDAOIdentity.did);
      const contextSwitchEvent = profile!.consentHistory.find(
        event => event.permission === 'CONTEXT_SWITCHED'
      );
      
      expect(contextSwitchEvent).toBeDefined();
      expect(contextSwitchEvent!.action).toBe('GRANTED');
      expect(contextSwitchEvent!.metadata.fromIdentity).toBe(mockRootIdentity.did);
      expect(contextSwitchEvent!.metadata.toIdentity).toBe(mockDAOIdentity.did);
    });
  });

  describe('applyPrivacyPolicy', () => {
    it('should apply privacy policy successfully', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      
      const applied = await qonsentService.applyPrivacyPolicy(mockRootIdentity.did);

      expect(applied).toBe(true);
    });

    it('should fail for non-existent profile', async () => {
      const applied = await qonsentService.applyPrivacyPolicy('nonexistent-id');

      expect(applied).toBe(false);
    });

    it('should store settings in localStorage for useQonsent hook', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      
      await qonsentService.applyPrivacyPolicy(mockRootIdentity.did);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `qonsent_settings_${mockRootIdentity.did}`,
        expect.stringContaining('exposureLevel')
      );
    });
  });

  describe('syncProfileWithQonsent', () => {
    it('should sync profile successfully', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      
      const synced = await qonsentService.syncProfileWithQonsent(mockRootIdentity.did);

      expect(synced).toBe(true);
    });

    it('should fail for non-existent profile', async () => {
      const synced = await qonsentService.syncProfileWithQonsent('nonexistent-id');

      expect(synced).toBe(false);
    });

    it('should update lastUpdated timestamp', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      const originalProfile = await qonsentService.getQonsentProfile(mockRootIdentity.did);
      const originalTimestamp = originalProfile!.lastUpdated;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await qonsentService.syncProfileWithQonsent(mockRootIdentity.did);
      
      const updatedProfile = await qonsentService.getQonsentProfile(mockRootIdentity.did);
      expect(updatedProfile!.lastUpdated).not.toBe(originalTimestamp);
    });
  });

  describe('syncAllProfiles', () => {
    it('should sync all profiles successfully', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      await qonsentService.createQonsentProfile(mockDAOIdentity);
      await qonsentService.createQonsentProfile(mockEnterpriseIdentity);
      
      const results = await qonsentService.syncAllProfiles();

      expect(results.success).toBe(3);
      expect(results.failed).toBe(0);
      expect(results.errors).toHaveLength(0);
    });

    it('should handle partial sync failures', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      await qonsentService.createQonsentProfile(mockDAOIdentity);
      
      // Mock one sync to fail
      const originalSync = qonsentService.syncProfileWithQonsent;
      qonsentService.syncProfileWithQonsent = vi.fn()
        .mockResolvedValueOnce(true)  // First call succeeds
        .mockResolvedValueOnce(false); // Second call fails
      
      const results = await qonsentService.syncAllProfiles();

      expect(results.success).toBe(1);
      expect(results.failed).toBe(1);
      expect(results.errors).toHaveLength(1);
      
      // Restore original method
      qonsentService.syncProfileWithQonsent = originalSync;
    });
  });

  describe('consent management', () => {
    beforeEach(async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
    });

    describe('grantConsent', () => {
      it('should grant consent for module permission', async () => {
        const granted = await qonsentService.grantConsent(
          mockRootIdentity.did,
          'qsocial',
          'post_content',
          { reason: 'User requested' }
        );

        expect(granted).toBe(true);
        
        const profile = await qonsentService.getQonsentProfile(mockRootIdentity.did);
        expect(profile!.dataSharing.qsocial.enabled).toBe(true);
        
        const consentEvent = profile!.consentHistory.find(
          event => event.permission === 'post_content'
        );
        expect(consentEvent).toBeDefined();
        expect(consentEvent!.action).toBe('GRANTED');
        expect(consentEvent!.module).toBe('qsocial');
      });

      it('should fail for non-existent profile', async () => {
        const granted = await qonsentService.grantConsent(
          'nonexistent-id',
          'qsocial',
          'post_content'
        );

        expect(granted).toBe(false);
      });
    });

    describe('revokeConsent', () => {
      it('should revoke consent for module permission', async () => {
        // First grant consent
        await qonsentService.grantConsent(mockRootIdentity.did, 'qsocial', 'post_content');
        
        const revoked = await qonsentService.revokeConsent(
          mockRootIdentity.did,
          'qsocial',
          'post_content'
        );

        expect(revoked).toBe(true);
        
        const profile = await qonsentService.getQonsentProfile(mockRootIdentity.did);
        expect(profile!.dataSharing.qsocial.enabled).toBe(false);
        
        const revokeEvent = profile!.consentHistory.find(
          event => event.action === 'REVOKED' && event.permission === 'post_content'
        );
        expect(revokeEvent).toBeDefined();
      });

      it('should fail for non-existent profile', async () => {
        const revoked = await qonsentService.revokeConsent(
          'nonexistent-id',
          'qsocial',
          'post_content'
        );

        expect(revoked).toBe(false);
      });
    });

    describe('checkConsent', () => {
      it('should return true for granted consent', async () => {
        await qonsentService.grantConsent(mockRootIdentity.did, 'qsocial', 'post_content');
        
        const hasConsent = await qonsentService.checkConsent(
          mockRootIdentity.did,
          'qsocial',
          'post_content'
        );

        expect(hasConsent).toBe(true);
      });

      it('should return false for revoked consent', async () => {
        await qonsentService.grantConsent(mockRootIdentity.did, 'qsocial', 'post_content');
        await qonsentService.revokeConsent(mockRootIdentity.did, 'qsocial', 'post_content');
        
        const hasConsent = await qonsentService.checkConsent(
          mockRootIdentity.did,
          'qsocial',
          'post_content'
        );

        expect(hasConsent).toBe(false);
      });

      it('should return false for restricted permission', async () => {
        // Update profile to add restrictions
        const profile = await qonsentService.getQonsentProfile(mockRootIdentity.did);
        profile!.dataSharing.qsocial.restrictions = ['post_content'];
        await qonsentService.updateQonsentProfile(mockRootIdentity.did, {
          dataSharing: profile!.dataSharing
        });
        
        const hasConsent = await qonsentService.checkConsent(
          mockRootIdentity.did,
          'qsocial',
          'post_content'
        );

        expect(hasConsent).toBe(false);
      });

      it('should return false for non-existent profile', async () => {
        const hasConsent = await qonsentService.checkConsent(
          'nonexistent-id',
          'qsocial',
          'post_content'
        );

        expect(hasConsent).toBe(false);
      });
    });
  });

  describe('privacy level management', () => {
    beforeEach(async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
    });

    describe('setPrivacyLevel', () => {
      it('should set privacy level successfully', async () => {
        const updated = await qonsentService.setPrivacyLevel(
          mockRootIdentity.did,
          PrivacyLevel.PRIVATE
        );

        expect(updated).toBe(true);
        
        const profile = await qonsentService.getQonsentProfile(mockRootIdentity.did);
        expect(profile!.privacyLevel).toBe(PrivacyLevel.PRIVATE);
      });
    });

    describe('getEffectivePrivacyLevel', () => {
      it('should return current privacy level', async () => {
        const level = await qonsentService.getEffectivePrivacyLevel(mockRootIdentity.did);

        expect(level).toBe(PrivacyLevel.PUBLIC);
      });

      it('should return PUBLIC for non-existent profile', async () => {
        const level = await qonsentService.getEffectivePrivacyLevel('nonexistent-id');

        expect(level).toBe(PrivacyLevel.PUBLIC);
      });
    });
  });

  describe('module permissions management', () => {
    beforeEach(async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
    });

    describe('getModulePermissions', () => {
      it('should return existing module permissions', async () => {
        const permissions = await qonsentService.getModulePermissions(
          mockRootIdentity.did,
          'qsocial'
        );

        expect(permissions.enabled).toBe(true);
        expect(permissions.level).toBe('FULL');
        expect(permissions.dataSharing).toBe(true);
        expect(permissions.visibility).toBe(PrivacyLevel.PUBLIC);
      });

      it('should return default permissions for non-existent module', async () => {
        const permissions = await qonsentService.getModulePermissions(
          mockRootIdentity.did,
          'nonexistent-module'
        );

        expect(permissions.enabled).toBe(false);
        expect(permissions.level).toBe('MINIMAL');
        expect(permissions.dataSharing).toBe(false);
        expect(permissions.visibility).toBe(PrivacyLevel.PRIVATE);
      });

      it('should return default permissions for non-existent profile', async () => {
        const permissions = await qonsentService.getModulePermissions(
          'nonexistent-id',
          'qsocial'
        );

        expect(permissions.enabled).toBe(false);
        expect(permissions.level).toBe('MINIMAL');
      });
    });

    describe('updateModulePermissions', () => {
      it('should update existing module permissions', async () => {
        const updated = await qonsentService.updateModulePermissions(
          mockRootIdentity.did,
          'qsocial',
          {
            enabled: false,
            level: 'MINIMAL',
            restrictions: ['public_posts']
          }
        );

        expect(updated).toBe(true);
        
        const permissions = await qonsentService.getModulePermissions(
          mockRootIdentity.did,
          'qsocial'
        );
        expect(permissions.enabled).toBe(false);
        expect(permissions.level).toBe('MINIMAL');
        expect(permissions.restrictions).toContain('public_posts');
      });

      it('should create new module permissions if not exists', async () => {
        const updated = await qonsentService.updateModulePermissions(
          mockRootIdentity.did,
          'new-module',
          {
            enabled: true,
            level: 'STANDARD'
          }
        );

        expect(updated).toBe(true);
        
        const permissions = await qonsentService.getModulePermissions(
          mockRootIdentity.did,
          'new-module'
        );
        expect(permissions.enabled).toBe(true);
        expect(permissions.level).toBe('STANDARD');
      });

      it('should fail for non-existent profile', async () => {
        const updated = await qonsentService.updateModulePermissions(
          'nonexistent-id',
          'qsocial',
          { enabled: false }
        );

        expect(updated).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw error, but handle gracefully
      await expect(qonsentService.createQonsentProfile(mockRootIdentity))
        .resolves.toBeDefined();
    });

    it('should handle profile creation errors', async () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create an identity that might cause issues
      const problematicIdentity = {
        ...mockRootIdentity,
        type: 'INVALID_TYPE' as any
      };

      const profile = await qonsentService.createQonsentProfile(problematicIdentity);

      expect(profile).toBeDefined();
      expect(profile.privacyLevel).toBe(PrivacyLevel.PUBLIC); // Should fall back to default

      consoleSpy.mockRestore();
    });
  });

  describe('consent history management', () => {
    it('should limit consent history to 100 events', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      
      // Generate 105 consent events
      for (let i = 0; i < 105; i++) {
        await qonsentService.grantConsent(
          mockRootIdentity.did,
          'qsocial',
          `permission_${i}`
        );
      }

      const profile = await qonsentService.getQonsentProfile(mockRootIdentity.did);
      expect(profile!.consentHistory.length).toBe(100); // Should be capped at 100
    });

    it('should maintain chronological order of events', async () => {
      await qonsentService.createQonsentProfile(mockRootIdentity);
      
      await qonsentService.grantConsent(mockRootIdentity.did, 'qsocial', 'first');
      await qonsentService.grantConsent(mockRootIdentity.did, 'qwallet', 'second');
      await qonsentService.revokeConsent(mockRootIdentity.did, 'qsocial', 'first');

      const profile = await qonsentService.getQonsentProfile(mockRootIdentity.did);
      const events = profile!.consentHistory;
      
      // Should be in chronological order
      expect(new Date(events[0].timestamp).getTime())
        .toBeLessThanOrEqual(new Date(events[1].timestamp).getTime());
      expect(new Date(events[1].timestamp).getTime())
        .toBeLessThanOrEqual(new Date(events[2].timestamp).getTime());
    });
  });
});