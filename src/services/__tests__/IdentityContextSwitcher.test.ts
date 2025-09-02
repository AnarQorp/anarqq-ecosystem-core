/**
 * Unit Tests for IdentityContextSwitcher Service
 * Tests context switching orchestration with validation and rollback
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IdentityContextSwitcher } from '../identity/IdentityContextSwitcher';
import {
  ExtendedSquidIdentity,
  IdentityType,
  GovernanceType,
  PrivacyLevel,
  IdentityStatus,
  ContextUpdateStatus
} from '@/types/identity';

describe('IdentityContextSwitcher', () => {
  let contextSwitcher: IdentityContextSwitcher;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockEnterpriseIdentity: ExtendedSquidIdentity;

  beforeEach(() => {
    // Clear all timers and mocks
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();

    contextSwitcher = IdentityContextSwitcher.getInstance();
    contextSwitcher.clearSnapshots();

    // Create mock identities
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
      qonsentProfileId: 'qonsent-456',
      qlockKeyPair: {
        publicKey: 'pub-456',
        privateKey: 'priv-456',
        algorithm: 'QUANTUM',
        keySize: 512,
        createdAt: '2024-01-01T00:00:00Z'
      }
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
      qonsentProfileId: 'qonsent-789',
      qlockKeyPair: {
        publicKey: 'pub-789',
        privateKey: 'priv-789',
        algorithm: 'RSA',
        keySize: 384,
        createdAt: '2024-01-01T00:00:00Z'
      }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('switchIdentityContext', () => {
    it('should successfully switch identity context with all modules', async () => {
      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(result.success).toBe(true);
      expect(result.switchId).toBeDefined();
      expect(result.previousIdentity).toEqual(mockRootIdentity);
      expect(result.newIdentity).toEqual(mockDAOIdentity);
      expect(result.contextUpdates.qonsent).toBe(ContextUpdateStatus.SUCCESS);
      expect(result.contextUpdates.qlock).toBe(ContextUpdateStatus.SUCCESS);
      expect(result.contextUpdates.qwallet).toBe(ContextUpdateStatus.SUCCESS);
      expect(result.contextUpdates.qerberos).toBe(ContextUpdateStatus.SUCCESS);
      expect(result.contextUpdates.qindex).toBe(ContextUpdateStatus.SUCCESS);
      expect(result.successfulModules).toHaveLength(5);
      expect(result.failedModules).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle switch from null previous identity', async () => {
      const result = await contextSwitcher.switchIdentityContext(
        null,
        mockRootIdentity
      );

      expect(result.success).toBe(true);
      expect(result.previousIdentity).toBeNull();
      expect(result.newIdentity).toEqual(mockRootIdentity);
      expect(result.successfulModules).toHaveLength(5);
    });

    it('should prevent concurrent switches', async () => {
      // Start first switch (don't await)
      const firstSwitch = contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      // Try to start second switch immediately
      const secondSwitch = contextSwitcher.switchIdentityContext(
        mockDAOIdentity,
        mockEnterpriseIdentity
      );

      const [firstResult, secondResult] = await Promise.all([firstSwitch, secondSwitch]);

      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('Context switch already in progress');
      expect(secondResult.errorCode).toBe('SWITCH_IN_PROGRESS');
    });

    it('should fail when target identity has no DID', async () => {
      const invalidIdentity = { ...mockDAOIdentity, did: '' };

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        invalidIdentity
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Context validation failed');
      expect(result.errorCode).toBe('VALIDATION_FAILED');
    });

    it('should fail when target identity is inactive', async () => {
      const inactiveIdentity = { ...mockDAOIdentity, status: IdentityStatus.SUSPENDED };

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        inactiveIdentity
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Context validation failed');
      expect(result.errorCode).toBe('VALIDATION_FAILED');
    });

    it('should fail when target identity has no Qonsent profile', async () => {
      const identityWithoutQonsent = { ...mockDAOIdentity, qonsentProfileId: '' };

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        identityWithoutQonsent
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Context validation failed');
      expect(result.errorCode).toBe('VALIDATION_FAILED');
    });

    it('should fail when target identity has no Qlock keys', async () => {
      const identityWithoutQlock = { ...mockDAOIdentity, qlockKeyPair: undefined as any };

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        identityWithoutQlock
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Context validation failed');
      expect(result.errorCode).toBe('VALIDATION_FAILED');
    });

    it('should warn about security flags but still proceed', async () => {
      const identityWithFlags = {
        ...mockDAOIdentity,
        securityFlags: [
          {
            id: 'flag-1',
            type: 'SUSPICIOUS_ACTIVITY',
            severity: 'MEDIUM' as const,
            description: 'Test flag',
            timestamp: '2024-01-01T00:00:00Z',
            resolved: false
          }
        ]
      };

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        identityWithFlags
      );

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Identity has security flags');
    });

    it('should fail when identity has critical security flags', async () => {
      const identityWithCriticalFlags = {
        ...mockDAOIdentity,
        securityFlags: [
          {
            id: 'flag-1',
            type: 'SECURITY_BREACH',
            severity: 'CRITICAL' as const,
            description: 'Critical security issue',
            timestamp: '2024-01-01T00:00:00Z',
            resolved: false
          }
        ]
      };

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        identityWithCriticalFlags
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Context validation failed');
      expect(result.errorCode).toBe('VALIDATION_FAILED');
    });
  });

  describe('validateContextSwitch', () => {
    it('should validate successful context switch', async () => {
      const result = await contextSwitcher.validateContextSwitch(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.checkedModules).toHaveLength(5);
    });

    it('should fail validation for identity without DID', async () => {
      const invalidIdentity = { ...mockDAOIdentity, did: '' };

      const result = await contextSwitcher.validateContextSwitch(
        mockRootIdentity,
        invalidIdentity
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('New identity DID is required');
    });

    it('should fail validation for inactive identity', async () => {
      const inactiveIdentity = { ...mockDAOIdentity, status: IdentityStatus.SUSPENDED };

      const result = await contextSwitcher.validateContextSwitch(
        mockRootIdentity,
        inactiveIdentity
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cannot switch to inactive identity');
    });

    it('should fail validation for identity without Qonsent profile', async () => {
      const identityWithoutQonsent = { ...mockDAOIdentity, qonsentProfileId: '' };

      const result = await contextSwitcher.validateContextSwitch(
        mockRootIdentity,
        identityWithoutQonsent
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('New identity must have Qonsent profile ID');
    });

    it('should fail validation for identity without Qlock keys', async () => {
      const identityWithoutQlock = { ...mockDAOIdentity, qlockKeyPair: undefined as any };

      const result = await contextSwitcher.validateContextSwitch(
        mockRootIdentity,
        identityWithoutQlock
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('New identity must have Qlock key pair');
    });
  });

  describe('createContextSnapshot', () => {
    it('should create context snapshot for rollback', async () => {
      const snapshot = await contextSwitcher.createContextSnapshot(mockRootIdentity);

      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.previousIdentity).toEqual(mockRootIdentity);
      expect(snapshot.contexts).toBeDefined();
      expect(snapshot.contexts.qonsent).toBeDefined();
      expect(snapshot.contexts.qlock).toBeDefined();
      expect(snapshot.contexts.qwallet).toBeDefined();
      expect(snapshot.contexts.qerberos).toBeDefined();
      expect(snapshot.contexts.qindex).toBeDefined();
    });

    it('should create empty snapshot for null identity', async () => {
      const snapshot = await contextSwitcher.createContextSnapshot(null);

      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.previousIdentity).toBeNull();
      expect(snapshot.contexts.qonsent).toBeNull();
      expect(snapshot.contexts.qlock).toBeNull();
      expect(snapshot.contexts.qwallet).toBeNull();
      expect(snapshot.contexts.qerberos).toBeNull();
      expect(snapshot.contexts.qindex).toBeNull();
    });
  });

  describe('rollbackContextSwitch', () => {
    it('should successfully rollback context switch', async () => {
      // First create a snapshot
      const snapshot = await contextSwitcher.createContextSnapshot(mockRootIdentity);
      const switchId = 'test-switch-123';
      
      // Manually add snapshot to the switcher's internal map
      (contextSwitcher as any).contextSnapshots.set(switchId, snapshot);

      const result = await contextSwitcher.rollbackContextSwitch(switchId);

      expect(result.success).toBe(true);
      expect(result.switchId).toBe(switchId);
      expect(result.rollbackResults.qonsent).toBe(true);
      expect(result.rollbackResults.qlock).toBe(true);
      expect(result.rollbackResults.qwallet).toBe(true);
      expect(result.rollbackResults.qerberos).toBe(true);
      expect(result.rollbackResults.qindex).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail rollback when snapshot not found', async () => {
      const result = await contextSwitcher.rollbackContextSwitch('nonexistent-switch');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Context snapshot not found for rollback');
    });
  });

  describe('getSwitchStatus', () => {
    it('should return correct switch status when idle', () => {
      const status = contextSwitcher.getSwitchStatus();

      expect(status.inProgress).toBe(false);
      expect(status.switchId).toBeNull();
    });

    it('should return correct switch status during switch', async () => {
      // Start a switch but don't await it
      const switchPromise = contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      // Check status during switch
      const statusDuringSwitch = contextSwitcher.getSwitchStatus();
      expect(statusDuringSwitch.inProgress).toBe(true);
      expect(statusDuringSwitch.switchId).toBeDefined();

      // Wait for switch to complete
      await switchPromise;

      // Check status after switch
      const statusAfterSwitch = contextSwitcher.getSwitchStatus();
      expect(statusAfterSwitch.inProgress).toBe(false);
      expect(statusAfterSwitch.switchId).toBeNull();
    });
  });

  describe('clearSnapshots', () => {
    it('should clear all context snapshots', async () => {
      // Create some snapshots
      const snapshot1 = await contextSwitcher.createContextSnapshot(mockRootIdentity);
      const snapshot2 = await contextSwitcher.createContextSnapshot(mockDAOIdentity);
      
      // Manually add snapshots
      (contextSwitcher as any).contextSnapshots.set('switch-1', snapshot1);
      (contextSwitcher as any).contextSnapshots.set('switch-2', snapshot2);

      // Verify snapshots exist
      expect((contextSwitcher as any).contextSnapshots.size).toBe(2);

      // Clear snapshots
      contextSwitcher.clearSnapshots();

      // Verify snapshots are cleared
      expect((contextSwitcher as any).contextSnapshots.size).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle unknown errors gracefully', async () => {
      // Create an identity that will cause an error in validation
      const problematicIdentity = {
        ...mockDAOIdentity,
        // Remove required properties to cause validation errors
        did: undefined as any,
        qonsentProfileId: undefined as any,
        qlockKeyPair: undefined as any
      };

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        problematicIdentity
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBeDefined();
      expect(result.failedModules).toContain('all');
    });

    it('should handle validation process failures', async () => {
      // Mock the validation method to throw an error
      const originalValidate = (contextSwitcher as any).validateContextSwitch;
      (contextSwitcher as any).validateContextSwitch = vi.fn().mockRejectedValue(new Error('Validation failed'));

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');

      // Restore original method
      (contextSwitcher as any).validateContextSwitch = originalValidate;
    });
  });

  describe('module context updates', () => {
    it('should update all module contexts successfully', async () => {
      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(result.success).toBe(true);
      expect(result.contextUpdates.qonsent).toBe(ContextUpdateStatus.SUCCESS);
      expect(result.contextUpdates.qlock).toBe(ContextUpdateStatus.SUCCESS);
      expect(result.contextUpdates.qwallet).toBe(ContextUpdateStatus.SUCCESS);
      expect(result.contextUpdates.qerberos).toBe(ContextUpdateStatus.SUCCESS);
      expect(result.contextUpdates.qindex).toBe(ContextUpdateStatus.SUCCESS);
    });

    it('should handle partial module failures gracefully', async () => {
      // Mock one of the update methods to fail
      const originalUpdateQonsent = (contextSwitcher as any).updateQonsentContext;
      (contextSwitcher as any).updateQonsentContext = vi.fn().mockRejectedValue(new Error('Qonsent update failed'));

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(result.success).toBe(true); // Should still succeed with non-critical failures
      expect(result.contextUpdates.qonsent).toBe(ContextUpdateStatus.FAILED);
      expect(result.contextUpdates.qlock).toBe(ContextUpdateStatus.SUCCESS);
      expect(result.failedModules).toContain('qonsent');
      expect(result.successfulModules).toHaveLength(4);
      expect(result.warnings).toContain('Some non-critical modules failed: qonsent');

      // Restore original method
      (contextSwitcher as any).updateQonsentContext = originalUpdateQonsent;
    });

    it('should rollback on critical module failures', async () => {
      // Mock critical modules (qonsent and qlock) to fail
      const originalUpdateQonsent = (contextSwitcher as any).updateQonsentContext;
      const originalUpdateQlock = (contextSwitcher as any).updateQlockContext;
      
      (contextSwitcher as any).updateQonsentContext = vi.fn().mockRejectedValue(new Error('Critical Qonsent failure'));
      (contextSwitcher as any).updateQlockContext = vi.fn().mockRejectedValue(new Error('Critical Qlock failure'));

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Critical context updates failed');
      expect(result.errorCode).toBe('CRITICAL_FAILURE');

      // Restore original methods
      (contextSwitcher as any).updateQonsentContext = originalUpdateQonsent;
      (contextSwitcher as any).updateQlockContext = originalUpdateQlock;
    });
  });

  describe('performance and timing', () => {
    it('should complete context switch within reasonable time', async () => {
      const startTime = Date.now();
      
      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent validation requests', async () => {
      const validationPromises = [
        contextSwitcher.validateContextSwitch(mockRootIdentity, mockDAOIdentity),
        contextSwitcher.validateContextSwitch(mockDAOIdentity, mockEnterpriseIdentity),
        contextSwitcher.validateContextSwitch(mockRootIdentity, mockEnterpriseIdentity)
      ];

      const results = await Promise.all(validationPromises);

      results.forEach(result => {
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });
});