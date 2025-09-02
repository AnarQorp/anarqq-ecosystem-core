/**
 * Service Communication Integration Tests
 * Tests communication patterns between identity services
 * Requirements: 3.5, 4.3, 4.4, 4.5, 4.6, 5.3
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { identityQonsentService } from '../../identity/IdentityQonsentService';
import { identityQlockService } from '../../identity/IdentityQlockService';
import { identityQwalletService } from '../../identity/IdentityQwalletService';
import { IdentityQerberosService } from '../../identity/IdentityQerberosService';
import {
  ExtendedSquidIdentity,
  IdentityType,
  GovernanceType,
  PrivacyLevel,
  IdentityStatus,
  IdentityAction
} from '@/types/identity';

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

describe('Service Communication Integration Tests', () => {
  let qerberosService: IdentityQerberosService;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockEnterpriseIdentity: ExtendedSquidIdentity;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);

    qerberosService = new IdentityQerberosService();

    // Create comprehensive test identities
    mockRootIdentity = {
      did: 'did:squid:root:service-comm-test',
      name: 'Service Communication Root',
      type: IdentityType.ROOT,
      rootId: 'did:squid:root:service-comm-test',
      children: [],
      depth: 0,
      path: [],
      governanceLevel: GovernanceType.SELF,
      creationRules: {
        type: IdentityType.ROOT,
        parentType: undefined,
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
      qonsentProfileId: 'qonsent-service-comm-root',
      qlockKeyPair: {
        publicKey: 'pub-service-comm-root',
        privateKey: 'priv-service-comm-root',
        algorithm: 'QUANTUM',
        keySize: 512,
        createdAt: '2024-01-01T00:00:00Z'
      },
      privacyLevel: PrivacyLevel.PUBLIC,
      avatar: undefined,
      description: 'Service communication test root',
      tags: ['service', 'communication', 'test'],
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
      qindexRegistered: true,
      usageStats: {
        switchCount: 0,
        lastSwitch: '2024-01-01T00:00:00Z',
        modulesAccessed: [],
        totalSessions: 0
      }
    };

    mockDAOIdentity = {
      ...mockRootIdentity,
      did: 'did:squid:dao:service-comm-test',
      name: 'Service Communication DAO',
      type: IdentityType.DAO,
      parentId: 'did:squid:root:service-comm-test',
      depth: 1,
      path: ['did:squid:root:service-comm-test'],
      governanceLevel: GovernanceType.DAO,
      qonsentProfileId: 'qonsent-service-comm-dao'
    };

    mockEnterpriseIdentity = {
      ...mockRootIdentity,
      did: 'did:squid:enterprise:service-comm-test',
      name: 'Service Communication Enterprise',
      type: IdentityType.ENTERPRISE,
      parentId: 'did:squid:dao:service-comm-test',
      depth: 2,
      path: ['did:squid:root:service-comm-test', 'did:squid:dao:service-comm-test'],
      governanceLevel: GovernanceType.DAO,
      qonsentProfileId: 'qonsent-service-comm-enterprise'
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Qonsent-Qlock Integration', () => {
    beforeEach(async () => {
      await identityQonsentService.createQonsentProfile(mockRootIdentity);
      await identityQlockService.generateKeysForIdentity(mockRootIdentity);
    });

    it('should encrypt privacy settings with identity-specific keys', async () => {
      // Update privacy settings
      await identityQonsentService.setPrivacyLevel(mockRootIdentity.did, PrivacyLevel.PRIVATE);

      // Get privacy profile
      const profile = await identityQonsentService.getQonsentProfile(mockRootIdentity.did);
      expect(profile).toBeDefined();
      expect(profile!.privacyLevel).toBe(PrivacyLevel.PRIVATE);

      // Encrypt the profile data using Qlock
      const profileData = JSON.stringify(profile);
      const encrypted = await identityQlockService.encryptForIdentity(
        mockRootIdentity.did,
        profileData
      );

      expect(encrypted).toBeDefined();
      expect(encrypted!.metadata.identityId).toBe(mockRootIdentity.did);

      // Decrypt and verify
      const decrypted = await identityQlockService.decryptForIdentity(
        mockRootIdentity.did,
        encrypted!.encryptedData
      );

      expect(decrypted.success).toBe(true);
      const decryptedProfile = JSON.parse(decrypted.data!);
      expect(decryptedProfile.privacyLevel).toBe(PrivacyLevel.PRIVATE);
    });

    it('should handle privacy level changes with key rotation', async () => {
      // Set initial privacy level
      await identityQonsentService.setPrivacyLevel(mockRootIdentity.did, PrivacyLevel.PUBLIC);

      // Get initial keys
      const initialKeys = await identityQlockService.getKeysForIdentity(mockRootIdentity.did);
      expect(initialKeys).toBeDefined();

      // Change to high-security privacy level
      await identityQonsentService.setPrivacyLevel(mockRootIdentity.did, PrivacyLevel.ANONYMOUS);

      // Rotate keys for enhanced security
      const rotated = await identityQlockService.rotateKeysForIdentity(mockRootIdentity.did);
      expect(rotated).toBe(true);

      // Verify new keys are different
      const newKeys = await identityQlockService.getKeysForIdentity(mockRootIdentity.did);
      expect(newKeys).toBeDefined();
      expect(newKeys!.publicKey).not.toBe(initialKeys!.publicKey);
      expect(newKeys!.createdAt).not.toBe(initialKeys!.createdAt);

      // Verify privacy level is maintained
      const effectiveLevel = await identityQonsentService.getEffectivePrivacyLevel(mockRootIdentity.did);
      expect(effectiveLevel).toBe(PrivacyLevel.ANONYMOUS);
    });
  });

  describe('Qonsent-Qwallet Integration', () => {
    beforeEach(async () => {
      await identityQonsentService.createQonsentProfile(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);
    });

    it('should sync wallet permissions with privacy settings', async () => {
      // Set restrictive privacy level
      await identityQonsentService.setPrivacyLevel(mockRootIdentity.did, PrivacyLevel.PRIVATE);

      // Update module permissions to restrict wallet sharing
      await identityQonsentService.updateModulePermissions(
        mockRootIdentity.did,
        'qwallet',
        {
          enabled: false,
          level: 'MINIMAL',
          restrictions: ['public_transactions']
        }
      );

      // Sync with wallet service
      const synced = await identityQwalletService.syncWithQonsent(mockRootIdentity.did);
      expect(synced).toBe(true);

      // Verify wallet permissions reflect privacy settings
      const walletPermissions = await identityQwalletService.getWalletPermissions(mockRootIdentity.did);
      expect(walletPermissions).toBeDefined();

      // Check if privacy restrictions affect wallet operations
      const modulePermissions = await identityQonsentService.getModulePermissions(
        mockRootIdentity.did,
        'qwallet'
      );
      expect(modulePermissions.enabled).toBe(false);
      expect(modulePermissions.restrictions).toContain('public_transactions');
    });

    it('should handle consent changes affecting wallet operations', async () => {
      // Initially grant wallet consent
      await identityQonsentService.grantConsent(
        mockRootIdentity.did,
        'qwallet',
        'transfer_tokens'
      );

      // Verify wallet operation is allowed
      const transferAllowed = await identityQwalletService.validateWalletOperation(
        mockRootIdentity.did,
        {
          type: 'TRANSFER',
          amount: 100,
          token: 'ETH'
        }
      );
      expect(transferAllowed).toBe(true);

      // Revoke consent
      await identityQonsentService.revokeConsent(
        mockRootIdentity.did,
        'qwallet',
        'transfer_tokens'
      );

      // Check consent status
      const hasConsent = await identityQonsentService.checkConsent(
        mockRootIdentity.did,
        'qwallet',
        'transfer_tokens'
      );
      expect(hasConsent).toBe(false);
    });
  });

  describe('Qlock-Qwallet Integration', () => {
    beforeEach(async () => {
      await identityQlockService.generateKeysForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);
    });

    it('should use Qlock keys for wallet transaction signing', async () => {
      // Create a test transaction
      const transaction = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000', // 1 ETH
        gas: '21000',
        gasPrice: '20000000000'
      };

      // Sign transaction using identity's Qlock keys
      const signResult = await identityQlockService.signForIdentity(
        mockRootIdentity.did,
        JSON.stringify(transaction)
      );

      expect(signResult.success).toBe(true);
      expect(signResult.signature).toBeDefined();
      expect(signResult.identityId).toBe(mockRootIdentity.did);

      // Sign transaction using wallet service (should use same keys)
      const walletSignResult = await identityQwalletService.signTransactionForIdentity(
        mockRootIdentity.did,
        transaction
      );

      expect(walletSignResult.success).toBe(true);
      expect(walletSignResult.signature).toBeDefined();
      expect(walletSignResult.identityId).toBe(mockRootIdentity.did);
    });

    it('should sync encryption contexts between services', async () => {
      // Switch Qlock context
      await identityQlockService.setActiveEncryptionContext(mockRootIdentity.did);

      // Sync with wallet service
      const synced = await identityQwalletService.syncWithQlock(mockRootIdentity.did);
      expect(synced).toBe(true);

      // Verify contexts are aligned
      const qlockContext = await identityQlockService.getActiveEncryptionContext();
      const walletContext = await identityQwalletService.getActiveWalletContext();

      expect(qlockContext).toBe(mockRootIdentity.did);
      expect(walletContext).toBe(mockRootIdentity.did);
    });
  });

  describe('Qerberos Integration with All Services', () => {
    beforeEach(async () => {
      await identityQonsentService.createQonsentProfile(mockRootIdentity);
      await identityQlockService.generateKeysForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);
    });

    it('should log all service interactions', async () => {
      // Perform various operations
      await identityQonsentService.setPrivacyLevel(mockRootIdentity.did, PrivacyLevel.PRIVATE);
      await qerberosService.logIdentityAction(
        mockRootIdentity.did,
        IdentityAction.PRIVACY_CHANGED,
        { newLevel: PrivacyLevel.PRIVATE }
      );

      await identityQlockService.rotateKeysForIdentity(mockRootIdentity.did);
      await qerberosService.logIdentityAction(
        mockRootIdentity.did,
        IdentityAction.UPDATED,
        { operation: 'key_rotation' }
      );

      await identityQwalletService.updateWalletPermissions(mockRootIdentity.did, {
        maxTransactionAmount: 5000
      });
      await qerberosService.logIdentityAction(
        mockRootIdentity.did,
        IdentityAction.UPDATED,
        { operation: 'wallet_permissions_update' }
      );

      // Verify all actions were logged
      const auditLog = await qerberosService.getIdentityAuditLog(mockRootIdentity.did);
      expect(auditLog.length).toBeGreaterThanOrEqual(3);

      const privacyChange = auditLog.find(entry => 
        entry.action === IdentityAction.PRIVACY_CHANGED
      );
      const keyRotation = auditLog.find(entry => 
        entry.metadata?.operation === 'key_rotation'
      );
      const walletUpdate = auditLog.find(entry => 
        entry.metadata?.operation === 'wallet_permissions_update'
      );

      expect(privacyChange).toBeDefined();
      expect(keyRotation).toBeDefined();
      expect(walletUpdate).toBeDefined();
    });

    it('should detect cross-service security events', async () => {
      // Simulate suspicious activity across services
      const suspiciousActions = [
        () => identityQonsentService.setPrivacyLevel(mockRootIdentity.did, PrivacyLevel.ANONYMOUS),
        () => identityQlockService.rotateKeysForIdentity(mockRootIdentity.did),
        () => identityQwalletService.updateWalletPermissions(mockRootIdentity.did, { maxTransactionAmount: 1000000 }),
        () => identityQonsentService.revokeConsent(mockRootIdentity.did, 'qwallet', 'all_operations')
      ];

      // Perform actions rapidly and log them
      for (const action of suspiciousActions) {
        await action();
        await qerberosService.logIdentityAction(
          mockRootIdentity.did,
          IdentityAction.SECURITY_EVENT,
          { suspicious: true }
        );
      }

      // Detect security events
      const securityEvents = await qerberosService.detectSecurityEvents(mockRootIdentity.did);
      expect(securityEvents.length).toBeGreaterThan(0);

      const suspiciousEvent = securityEvents.find(event => 
        event.type === 'SUSPICIOUS_ACTIVITY'
      );
      expect(suspiciousEvent).toBeDefined();
      expect(suspiciousEvent!.severity).toBe('HIGH');
    });

    it('should correlate events across multiple identities', async () => {
      // Setup multiple identities
      await identityQonsentService.createQonsentProfile(mockDAOIdentity);
      await identityQlockService.generateKeysForIdentity(mockDAOIdentity);

      // Log related actions across identities
      await qerberosService.logIdentityAction(
        mockRootIdentity.did,
        IdentityAction.SWITCHED,
        { targetIdentity: mockDAOIdentity.did }
      );

      await qerberosService.logIdentityAction(
        mockDAOIdentity.did,
        IdentityAction.SWITCHED,
        { fromIdentity: mockRootIdentity.did }
      );

      // Analyze cross-identity patterns
      const analysis = await qerberosService.detectCrossIdentityPatterns([
        mockRootIdentity.did,
        mockDAOIdentity.did
      ]);

      expect(analysis.identityIds).toContain(mockRootIdentity.did);
      expect(analysis.identityIds).toContain(mockDAOIdentity.did);
      expect(analysis.correlations).toBeDefined();
    });
  });

  describe('Multi-Service Workflows', () => {
    it('should handle complete identity lifecycle with all services', async () => {
      // 1. Create identity profiles in all services
      const qonsentProfile = await identityQonsentService.createQonsentProfile(mockRootIdentity);
      const qlockKeys = await identityQlockService.generateKeysForIdentity(mockRootIdentity);
      const walletContext = await identityQwalletService.createWalletForIdentity(mockRootIdentity);

      expect(qonsentProfile).toBeDefined();
      expect(qlockKeys).toBeDefined();
      expect(walletContext).toBeDefined();

      // 2. Log creation events
      await qerberosService.logIdentityAction(
        mockRootIdentity.did,
        IdentityAction.CREATED,
        { services: ['qonsent', 'qlock', 'qwallet'] }
      );

      // 3. Perform cross-service operations
      await identityQonsentService.setPrivacyLevel(mockRootIdentity.did, PrivacyLevel.PRIVATE);
      await identityQlockService.encryptForIdentity(mockRootIdentity.did, 'sensitive data');
      await identityQwalletService.validateWalletOperation(mockRootIdentity.did, {
        type: 'TRANSFER',
        amount: 100,
        token: 'ETH'
      });

      // 4. Verify all services are working together
      const finalQonsentProfile = await identityQonsentService.getQonsentProfile(mockRootIdentity.did);
      const finalQlockKeys = await identityQlockService.getKeysForIdentity(mockRootIdentity.did);
      const finalWalletAddress = await identityQwalletService.getWalletAddressForIdentity(mockRootIdentity.did);

      expect(finalQonsentProfile!.privacyLevel).toBe(PrivacyLevel.PRIVATE);
      expect(finalQlockKeys).toBeDefined();
      expect(finalWalletAddress).toBeDefined();

      // 5. Verify audit trail
      const auditLog = await qerberosService.getIdentityAuditLog(mockRootIdentity.did);
      expect(auditLog.length).toBeGreaterThan(0);
    });

    it('should handle identity migration between service configurations', async () => {
      // Setup initial configuration
      await identityQonsentService.createQonsentProfile(mockRootIdentity);
      await identityQlockService.generateKeysForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);

      // Migrate to high-security configuration
      await identityQonsentService.setPrivacyLevel(mockRootIdentity.did, PrivacyLevel.ANONYMOUS);
      await identityQlockService.rotateKeysForIdentity(mockRootIdentity.did);
      await identityQwalletService.updateWalletPermissions(mockRootIdentity.did, {
        maxTransactionAmount: 1000,
        restrictedOperations: ['DEFI', 'DAO_CREATE']
      });

      // Verify migration
      const privacyLevel = await identityQonsentService.getEffectivePrivacyLevel(mockRootIdentity.did);
      const keys = await identityQlockService.getKeysForIdentity(mockRootIdentity.did);
      const permissions = await identityQwalletService.getWalletPermissions(mockRootIdentity.did);

      expect(privacyLevel).toBe(PrivacyLevel.ANONYMOUS);
      expect(keys).toBeDefined();
      expect(permissions.maxTransactionAmount).toBe(1000);
      expect(permissions.restrictedOperations).toContain('DEFI');

      // Log migration
      await qerberosService.logIdentityAction(
        mockRootIdentity.did,
        IdentityAction.UPDATED,
        { operation: 'security_migration', newConfiguration: 'high_security' }
      );

      const auditLog = await qerberosService.getIdentityAuditLog(mockRootIdentity.did);
      const migrationEvent = auditLog.find(entry => 
        entry.metadata?.operation === 'security_migration'
      );
      expect(migrationEvent).toBeDefined();
    });
  });

  describe('Service Synchronization', () => {
    it('should maintain synchronization across all services', async () => {
      // Setup identities in all services
      const services = [
        () => identityQonsentService.createQonsentProfile(mockRootIdentity),
        () => identityQlockService.generateKeysForIdentity(mockRootIdentity),
        () => identityQwalletService.createWalletForIdentity(mockRootIdentity)
      ];

      const results = await Promise.all(services.map(service => service()));
      results.forEach(result => expect(result).toBeDefined());

      // Perform synchronized updates
      const updates = [
        () => identityQonsentService.syncProfileWithQonsent(mockRootIdentity.did),
        () => identityQwalletService.syncWithQlock(mockRootIdentity.did),
        () => identityQwalletService.syncWithQonsent(mockRootIdentity.did)
      ];

      const updateResults = await Promise.all(updates.map(update => update()));
      updateResults.forEach(result => expect(result).toBe(true));

      // Verify synchronization
      const qonsentProfile = await identityQonsentService.getQonsentProfile(mockRootIdentity.did);
      const qlockKeys = await identityQlockService.getKeysForIdentity(mockRootIdentity.did);
      const walletAddress = await identityQwalletService.getWalletAddressForIdentity(mockRootIdentity.did);

      expect(qonsentProfile).toBeDefined();
      expect(qlockKeys).toBeDefined();
      expect(walletAddress).toBeDefined();

      // All should reference the same identity
      expect(qonsentProfile!.identityId).toBe(mockRootIdentity.did);
      expect(walletAddress).toContain('0x'); // Valid wallet address format
    });

    it('should handle service synchronization failures gracefully', async () => {
      // Setup services
      await identityQonsentService.createQonsentProfile(mockRootIdentity);
      await identityQlockService.generateKeysForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);

      // Mock one service to fail sync
      const originalSync = identityQonsentService.syncProfileWithQonsent;
      identityQonsentService.syncProfileWithQonsent = vi.fn().mockResolvedValue(false);

      // Attempt synchronization
      const syncResults = await identityQonsentService.syncAllProfiles();

      expect(syncResults.failed).toBeGreaterThan(0);
      expect(syncResults.errors.length).toBeGreaterThan(0);

      // Verify other services still work
      const qlockKeys = await identityQlockService.getKeysForIdentity(mockRootIdentity.did);
      const walletSync = await identityQwalletService.syncWithQlock(mockRootIdentity.did);

      expect(qlockKeys).toBeDefined();
      expect(walletSync).toBe(true);

      // Restore original function
      identityQonsentService.syncProfileWithQonsent = originalSync;
    });
  });
});