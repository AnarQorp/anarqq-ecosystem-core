/**
 * Integration Tests for IdentityQonsentService
 * Tests per-identity privacy management and Qonsent integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdentityQonsentService } from '../IdentityQonsentService';
import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel, 
  GovernanceType,
  IdentityStatus 
} from '@/types/identity';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock console methods to avoid noise in tests
const consoleMock = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

Object.defineProperty(console, 'log', { value: consoleMock.log });
Object.defineProperty(console, 'error', { value: consoleMock.error });
Object.defineProperty(console, 'warn', { value: consoleMock.warn });

describe('IdentityQonsentService', () => {
  let service: IdentityQonsentService;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockAIDIdentity: ExtendedSquidIdentity;
  let mockConsentidaIdentity: ExtendedSquidIdentity;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Create fresh service instance
    service = new IdentityQonsentService();

    // Create mock identities
    const baseIdentity = {
      rootId: 'root-123',
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
      qonsentProfileId: '',
      qlockKeyPair: {
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key',
        algorithm: 'RSA' as const,
        keySize: 2048,
        createdAt: new Date().toISOString()
      },
      privacyLevel: PrivacyLevel.PUBLIC,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      kyc: {
        required: false,
        submitted: false,
        approved: false
      },
      auditLog: [],
      securityFlags: [],
      qindexRegistered: false
    };

    mockRootIdentity = {
      ...baseIdentity,
      did: 'did:squid:root-123',
      name: 'Root Identity',
      type: IdentityType.ROOT,
      privacyLevel: PrivacyLevel.PUBLIC
    };

    mockDAOIdentity = {
      ...baseIdentity,
      did: 'did:squid:dao-456',
      name: 'DAO Identity',
      type: IdentityType.DAO,
      parentId: 'did:squid:root-123',
      depth: 1,
      path: ['did:squid:root-123'],
      privacyLevel: PrivacyLevel.PUBLIC,
      governanceLevel: GovernanceType.DAO
    };

    mockAIDIdentity = {
      ...baseIdentity,
      did: 'did:squid:aid-789',
      name: 'Anonymous Identity',
      type: IdentityType.AID,
      parentId: 'did:squid:root-123',
      depth: 1,
      path: ['did:squid:root-123'],
      privacyLevel: PrivacyLevel.ANONYMOUS,
      permissions: {
        ...baseIdentity.permissions,
        canCreateSubidentities: false
      }
    };

    mockConsentidaIdentity = {
      ...baseIdentity,
      did: 'did:squid:consentida-101',
      name: 'Consentida Identity',
      type: IdentityType.CONSENTIDA,
      parentId: 'did:squid:root-123',
      depth: 1,
      path: ['did:squid:root-123'],
      privacyLevel: PrivacyLevel.PRIVATE,
      governanceLevel: GovernanceType.PARENT,
      permissions: {
        ...baseIdentity.permissions,
        canCreateSubidentities: false
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Profile Creation', () => {
    it('should create Qonsent profile for ROOT identity with correct defaults', async () => {
      const profile = await service.createQonsentProfile(mockRootIdentity);

      expect(profile).toBeDefined();
      expect(profile.identityId).toBe(mockRootIdentity.did);
      expect(profile.privacyLevel).toBe(PrivacyLevel.PUBLIC);
      expect(profile.dataSharing.qsocial.enabled).toBe(true);
      expect(profile.dataSharing.qsocial.level).toBe('FULL');
      expect(profile.visibilityRules.profile).toBe(PrivacyLevel.PUBLIC);
      expect(profile.consentHistory).toHaveLength(1);
      expect(profile.consentHistory[0].action).toBe('GRANTED');
      expect(profile.consentHistory[0].permission).toBe('PROFILE_CREATED');
    });

    it('should create Qonsent profile for AID identity with anonymous defaults', async () => {
      const profile = await service.createQonsentProfile(mockAIDIdentity);

      expect(profile).toBeDefined();
      expect(profile.identityId).toBe(mockAIDIdentity.did);
      expect(profile.privacyLevel).toBe(PrivacyLevel.ANONYMOUS);
      expect(profile.dataSharing.qsocial.enabled).toBe(false);
      expect(profile.dataSharing.qwallet.enabled).toBe(false);
      expect(profile.visibilityRules.profile).toBe(PrivacyLevel.ANONYMOUS);
    });

    it('should create Qonsent profile for Consentida identity with private defaults', async () => {
      const profile = await service.createQonsentProfile(mockConsentidaIdentity);

      expect(profile).toBeDefined();
      expect(profile.identityId).toBe(mockConsentidaIdentity.did);
      expect(profile.privacyLevel).toBe(PrivacyLevel.PRIVATE);
      expect(profile.dataSharing.qsocial.level).toBe('MINIMAL');
      expect(profile.dataSharing.qsocial.restrictions).toContain('public_posts');
      expect(profile.dataSharing.qwallet.enabled).toBe(false);
      expect(profile.visibilityRules.profile).toBe(PrivacyLevel.PRIVATE);
    });

    it('should save profile to localStorage', async () => {
      await service.createQonsentProfile(mockRootIdentity);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'identity_qonsent_profiles',
        expect.stringContaining(mockRootIdentity.did)
      );
    });
  });

  describe('Profile Retrieval and Updates', () => {
    beforeEach(async () => {
      await service.createQonsentProfile(mockRootIdentity);
    });

    it('should retrieve existing Qonsent profile', async () => {
      const profile = await service.getQonsentProfile(mockRootIdentity.did);

      expect(profile).toBeDefined();
      expect(profile!.identityId).toBe(mockRootIdentity.did);
    });

    it('should return null for non-existent profile', async () => {
      const profile = await service.getQonsentProfile('non-existent-id');

      expect(profile).toBeNull();
    });

    it('should update existing profile', async () => {
      const updates = {
        privacyLevel: PrivacyLevel.PRIVATE,
        dataSharing: {
          qsocial: {
            enabled: false,
            level: 'MINIMAL' as const,
            restrictions: ['all']
          }
        }
      };

      const success = await service.updateQonsentProfile(mockRootIdentity.did, updates);
      expect(success).toBe(true);

      const updatedProfile = await service.getQonsentProfile(mockRootIdentity.did);
      expect(updatedProfile!.privacyLevel).toBe(PrivacyLevel.PRIVATE);
      expect(updatedProfile!.dataSharing.qsocial.enabled).toBe(false);
      expect(updatedProfile!.consentHistory).toHaveLength(2); // Creation + Update
    });

    it('should fail to update non-existent profile', async () => {
      const success = await service.updateQonsentProfile('non-existent-id', {});

      expect(success).toBe(false);
    });
  });

  describe('Profile Deletion', () => {
    beforeEach(async () => {
      await service.createQonsentProfile(mockRootIdentity);
    });

    it('should delete existing profile', async () => {
      const success = await service.deleteQonsentProfile(mockRootIdentity.did);
      expect(success).toBe(true);

      const profile = await service.getQonsentProfile(mockRootIdentity.did);
      expect(profile).toBeNull();
    });

    it('should return false for non-existent profile deletion', async () => {
      const success = await service.deleteQonsentProfile('non-existent-id');

      expect(success).toBe(false);
    });
  });

  describe('Privacy Context Switching', () => {
    beforeEach(async () => {
      await service.createQonsentProfile(mockRootIdentity);
      await service.createQonsentProfile(mockDAOIdentity);
    });

    it('should switch privacy context between identities', async () => {
      const success = await service.switchPrivacyContext(
        mockRootIdentity.did, 
        mockDAOIdentity.did
      );

      expect(success).toBe(true);
      
      // Check that consent event was logged
      const daoProfile = await service.getQonsentProfile(mockDAOIdentity.did);
      const contextSwitchEvent = daoProfile!.consentHistory.find(
        event => event.permission === 'CONTEXT_SWITCHED'
      );
      expect(contextSwitchEvent).toBeDefined();
      expect(contextSwitchEvent!.metadata.fromIdentity).toBe(mockRootIdentity.did);
      expect(contextSwitchEvent!.metadata.toIdentity).toBe(mockDAOIdentity.did);
    });

    it('should fail to switch to non-existent identity', async () => {
      const success = await service.switchPrivacyContext(
        mockRootIdentity.did, 
        'non-existent-id'
      );

      expect(success).toBe(false);
    });

    it('should apply privacy policy correctly', async () => {
      const success = await service.applyPrivacyPolicy(mockRootIdentity.did);

      expect(success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `qonsent_settings_${mockRootIdentity.did}`,
        expect.stringContaining('exposureLevel')
      );
    });
  });

  describe('Consent Management', () => {
    beforeEach(async () => {
      await service.createQonsentProfile(mockRootIdentity);
    });

    it('should grant consent for module and permission', async () => {
      const success = await service.grantConsent(
        mockRootIdentity.did, 
        'qwallet', 
        'transaction_signing'
      );

      expect(success).toBe(true);

      const profile = await service.getQonsentProfile(mockRootIdentity.did);
      expect(profile!.dataSharing.qwallet.enabled).toBe(true);
      
      const consentEvent = profile!.consentHistory.find(
        event => event.module === 'qwallet' && event.permission === 'transaction_signing'
      );
      expect(consentEvent).toBeDefined();
      expect(consentEvent!.action).toBe('GRANTED');
    });

    it('should revoke consent for module and permission', async () => {
      // First grant consent
      await service.grantConsent(mockRootIdentity.did, 'qwallet', 'transaction_signing');
      
      // Then revoke it
      const success = await service.revokeConsent(
        mockRootIdentity.did, 
        'qwallet', 
        'transaction_signing'
      );

      expect(success).toBe(true);

      const profile = await service.getQonsentProfile(mockRootIdentity.did);
      expect(profile!.dataSharing.qwallet.enabled).toBe(false);
      
      const revokeEvent = profile!.consentHistory.find(
        event => event.action === 'REVOKED' && event.module === 'qwallet'
      );
      expect(revokeEvent).toBeDefined();
    });

    it('should check consent correctly', async () => {
      // Grant consent first
      await service.grantConsent(mockRootIdentity.did, 'qsocial', 'post_creation');
      
      const hasConsent = await service.checkConsent(
        mockRootIdentity.did, 
        'qsocial', 
        'post_creation'
      );

      expect(hasConsent).toBe(true);

      // Check for non-granted permission on a module that doesn't exist
      const noConsent = await service.checkConsent(
        mockRootIdentity.did, 
        'non_existent_module', 
        'admin_access'
      );

      expect(noConsent).toBe(false);
    });
  });

  describe('Privacy Level Management', () => {
    beforeEach(async () => {
      await service.createQonsentProfile(mockRootIdentity);
    });

    it('should set privacy level', async () => {
      const success = await service.setPrivacyLevel(
        mockRootIdentity.did, 
        PrivacyLevel.PRIVATE
      );

      expect(success).toBe(true);

      const profile = await service.getQonsentProfile(mockRootIdentity.did);
      expect(profile!.privacyLevel).toBe(PrivacyLevel.PRIVATE);
    });

    it('should get effective privacy level', async () => {
      await service.setPrivacyLevel(mockRootIdentity.did, PrivacyLevel.DAO_ONLY);
      
      const level = await service.getEffectivePrivacyLevel(mockRootIdentity.did);

      expect(level).toBe(PrivacyLevel.DAO_ONLY);
    });

    it('should return PUBLIC for non-existent identity', async () => {
      const level = await service.getEffectivePrivacyLevel('non-existent-id');

      expect(level).toBe(PrivacyLevel.PUBLIC);
    });
  });

  describe('Module Permissions', () => {
    beforeEach(async () => {
      await service.createQonsentProfile(mockRootIdentity);
    });

    it('should get module permissions', async () => {
      const permissions = await service.getModulePermissions(
        mockRootIdentity.did, 
        'qsocial'
      );

      expect(permissions.enabled).toBe(true);
      expect(permissions.level).toBe('FULL');
      expect(permissions.dataSharing).toBe(true);
      expect(permissions.visibility).toBe(PrivacyLevel.PUBLIC);
    });

    it('should return default permissions for non-existent module', async () => {
      const permissions = await service.getModulePermissions(
        mockRootIdentity.did, 
        'non-existent-module'
      );

      expect(permissions.enabled).toBe(false);
      expect(permissions.level).toBe('MINIMAL');
      expect(permissions.dataSharing).toBe(false);
      expect(permissions.visibility).toBe(PrivacyLevel.PRIVATE);
    });

    it('should update module permissions', async () => {
      const success = await service.updateModulePermissions(
        mockRootIdentity.did, 
        'qsocial', 
        {
          enabled: false,
          level: 'MINIMAL',
          restrictions: ['public_posts', 'direct_messages']
        }
      );

      expect(success).toBe(true);

      const permissions = await service.getModulePermissions(
        mockRootIdentity.did, 
        'qsocial'
      );

      expect(permissions.enabled).toBe(false);
      expect(permissions.level).toBe('MINIMAL');
      expect(permissions.restrictions).toContain('public_posts');
      expect(permissions.restrictions).toContain('direct_messages');
    });
  });

  describe('Profile Synchronization', () => {
    beforeEach(async () => {
      await service.createQonsentProfile(mockRootIdentity);
    });

    it('should sync profile with Qonsent service', async () => {
      const success = await service.syncProfileWithQonsent(mockRootIdentity.did);

      expect(success).toBe(true);
      
      // Check that lastUpdated was updated
      const profile = await service.getQonsentProfile(mockRootIdentity.did);
      expect(profile!.lastUpdated).toBeDefined();
    });

    it('should sync all profiles', async () => {
      await service.createQonsentProfile(mockDAOIdentity);
      await service.createQonsentProfile(mockAIDIdentity);

      const result = await service.syncAllProfiles();

      expect(result.success).toBe(3); // Root + DAO + AID
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle sync failures gracefully', async () => {
      // Create a profile then delete it from the map to simulate failure
      await service.createQonsentProfile(mockRootIdentity);
      (service as any).profiles.delete(mockRootIdentity.did);

      const success = await service.syncProfileWithQonsent(mockRootIdentity.did);

      expect(success).toBe(false);
    });
  });

  describe('Storage Integration', () => {
    it('should load profiles from localStorage on initialization', () => {
      const mockProfiles = {
        'did:squid:test-123': {
          identityId: 'did:squid:test-123',
          profileId: 'profile-123',
          privacyLevel: PrivacyLevel.PUBLIC,
          dataSharing: {},
          visibilityRules: {
            profile: PrivacyLevel.PUBLIC,
            activity: PrivacyLevel.PUBLIC,
            connections: PrivacyLevel.PUBLIC
          },
          consentHistory: [],
          lastUpdated: new Date().toISOString()
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockProfiles));

      const newService = new IdentityQonsentService();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('identity_qonsent_profiles');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => new IdentityQonsentService()).not.toThrow();
      expect(consoleMock.error).toHaveBeenCalledWith(
        '[IdentityQonsentService] Error loading profiles from storage:',
        expect.any(Error)
      );
    });

    it('should save profiles to localStorage', async () => {
      await service.createQonsentProfile(mockRootIdentity);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'identity_qonsent_profiles',
        expect.stringContaining(mockRootIdentity.did)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in profile creation', async () => {
      // Mock localStorage to throw an error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const profile = await service.createQonsentProfile(mockRootIdentity);

      // Should still create the profile in memory
      expect(profile).toBeDefined();
      expect(profile.identityId).toBe(mockRootIdentity.did);
      
      // Should log the error
      expect(consoleMock.error).toHaveBeenCalledWith(
        '[IdentityQonsentService] Error saving profiles to storage:',
        expect.any(Error)
      );
    });

    it('should handle consent operations on non-existent profiles', async () => {
      const success = await service.grantConsent(
        'non-existent-id', 
        'qsocial', 
        'post_creation'
      );

      expect(success).toBe(false);
    });

    it('should handle privacy level operations on non-existent profiles', async () => {
      const success = await service.setPrivacyLevel(
        'non-existent-id', 
        PrivacyLevel.PRIVATE
      );

      expect(success).toBe(false);
    });
  });
});