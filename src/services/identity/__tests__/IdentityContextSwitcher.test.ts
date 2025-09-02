/**
 * Integration Tests for Identity Context Switcher
 * Tests context switching logic, validation, error handling, and rollback functionality
 * Requirements: 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { identityContextSwitcher, IdentityContextSwitcher } from '../IdentityContextSwitcher';
import {
  ExtendedSquidIdentity,
  IdentityType,
  IdentityStatus,
  GovernanceType,
  PrivacyLevel,
  ContextUpdateStatus,
  ContextSwitchError
} from '@/types/identity';

// Mock identities for testing
const mockRootIdentity: ExtendedSquidIdentity = {
  did: 'did:squid:root:test-root-123',
  name: 'Test Root Identity',
  type: IdentityType.ROOT,
  rootId: 'did:squid:root:test-root-123',
  children: ['did:squid:dao:test-dao-456'],
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
  qonsentProfileId: 'qonsent-root-123',
  qlockKeyPair: {
    publicKey: 'pub-root-123',
    privateKey: 'priv-root-123',
    algorithm: 'ECDSA',
    keySize: 256,
    createdAt: '2024-01-01T00:00:00Z'
  },
  privacyLevel: PrivacyLevel.PUBLIC,
  tags: ['root', 'primary'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastUsed: '2024-01-01T00:00:00Z',
  kyc: {
    required: false,
    submitted: true,
    approved: true
  },
  auditLog: [],
  securityFlags: [],
  qindexRegistered: true,
  usageStats: {
    switchCount: 0,
    lastSwitch: '2024-01-01T00:00:00Z',
    modulesAccessed: [],
    totalSessions: 1
  }
};

const mockDAOIdentity: ExtendedSquidIdentity = {
  did: 'did:squid:dao:test-dao-456',
  name: 'Test DAO Identity',
  type: IdentityType.DAO,
  parentId: 'did:squid:root:test-root-123',
  rootId: 'did:squid:root:test-root-123',
  children: [],
  depth: 1,
  path: ['did:squid:root:test-root-123'],
  governanceLevel: GovernanceType.DAO,
  creationRules: {
    type: IdentityType.DAO,
    parentType: IdentityType.ROOT,
    requiresKYC: true,
    requiresDAOGovernance: false,
    requiresParentalConsent: false,
    maxDepth: 3,
    allowedChildTypes: [IdentityType.ENTERPRISE, IdentityType.CONSENTIDA, IdentityType.AID]
  },
  permissions: {
    canCreateSubidentities: true,
    canDeleteSubidentities: true,
    canModifyProfile: true,
    canAccessModule: () => true,
    canPerformAction: () => true,
    governanceLevel: GovernanceType.DAO
  },
  status: IdentityStatus.ACTIVE,
  qonsentProfileId: 'qonsent-dao-456',
  qlockKeyPair: {
    publicKey: 'pub-dao-456',
    privateKey: 'priv-dao-456',
    algorithm: 'ECDSA',
    keySize: 256,
    createdAt: '2024-01-01T01:00:00Z'
  },
  privacyLevel: PrivacyLevel.PUBLIC,
  tags: ['dao', 'governance'],
  createdAt: '2024-01-01T01:00:00Z',
  updatedAt: '2024-01-01T01:00:00Z',
  lastUsed: '2024-01-01T01:00:00Z',
  kyc: {
    required: true,
    submitted: true,
    approved: true
  },
  auditLog: [],
  securityFlags: [],
  qindexRegistered: true,
  usageStats: {
    switchCount: 0,
    lastSwitch: '2024-01-01T01:00:00Z',
    modulesAccessed: [],
    totalSessions: 0
  }
};

const mockInactiveIdentity: ExtendedSquidIdentity = {
  ...mockDAOIdentity,
  did: 'did:squid:dao:inactive-789',
  name: 'Inactive DAO Identity',
  status: IdentityStatus.INACTIVE
};

const mockIdentityWithSecurityFlags: ExtendedSquidIdentity = {
  ...mockDAOIdentity,
  did: 'did:squid:dao:flagged-999',
  name: 'Flagged DAO Identity',
  securityFlags: [
    {
      id: 'flag-1',
      type: 'SUSPICIOUS_ACTIVITY',
      severity: 'HIGH',
      description: 'Multiple failed login attempts',
      timestamp: '2024-01-01T02:00:00Z',
      resolved: false
    }
  ]
};

describe('IdentityContextSwitcher', () => {
  let contextSwitcher: IdentityContextSwitcher;

  beforeEach(() => {
    contextSwitcher = IdentityContextSwitcher.getInstance();
    // Clear any existing snapshots
    contextSwitcher.clearSnapshots();
    vi.clearAllMocks();
  });

  afterEach(() => {
    contextSwitcher.clearSnapshots();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = IdentityContextSwitcher.getInstance();
      const instance2 = IdentityContextSwitcher.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Context Switch Validation', () => {
    it('should validate successful context switch', async () => {
      const validation = await contextSwitcher.validateContextSwitch(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.checkedModules).toContain('qonsent');
      expect(validation.checkedModules).toContain('qlock');
      expect(validation.checkedModules).toContain('qwallet');
      expect(validation.checkedModules).toContain('qerberos');
      expect(validation.checkedModules).toContain('qindex');
    });

    it('should fail validation for identity without DID', async () => {
      const invalidIdentity = { ...mockDAOIdentity, did: '' };
      
      const validation = await contextSwitcher.validateContextSwitch(
        mockRootIdentity,
        invalidIdentity
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('New identity DID is required');
    });

    it('should fail validation for identity without Qonsent profile', async () => {
      const invalidIdentity = { ...mockDAOIdentity, qonsentProfileId: '' };
      
      const validation = await contextSwitcher.validateContextSwitch(
        mockRootIdentity,
        invalidIdentity
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('New identity must have Qonsent profile ID');
    });

    it('should fail validation for identity without Qlock key pair', async () => {
      const invalidIdentity = { ...mockDAOIdentity, qlockKeyPair: undefined as any };
      
      const validation = await contextSwitcher.validateContextSwitch(
        mockRootIdentity,
        invalidIdentity
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('New identity must have Qlock key pair');
    });

    it('should fail validation for inactive identity', async () => {
      const validation = await contextSwitcher.validateContextSwitch(
        mockRootIdentity,
        mockInactiveIdentity
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Cannot switch to inactive identity');
    });

    it('should fail validation for identity with critical security flags', async () => {
      const criticalFlaggedIdentity = {
        ...mockIdentityWithSecurityFlags,
        securityFlags: [
          {
            id: 'flag-critical',
            type: 'SECURITY_BREACH' as const,
            severity: 'CRITICAL' as const,
            description: 'Security breach detected',
            timestamp: '2024-01-01T02:00:00Z',
            resolved: false
          }
        ]
      };

      const validation = await contextSwitcher.validateContextSwitch(
        mockRootIdentity,
        criticalFlaggedIdentity
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Identity has critical security flags');
    });

    it('should add warnings for identity with non-critical security flags', async () => {
      const validation = await contextSwitcher.validateContextSwitch(
        mockRootIdentity,
        mockIdentityWithSecurityFlags
      );

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('Identity has security flags');
    });
  });

  describe('Successful Context Switch', () => {
    it('should successfully switch identity context', async () => {
      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(result.success).toBe(true);
      expect(result.switchId).toBeDefined();
      expect(result.previousIdentity).toEqual(mockRootIdentity);
      expect(result.newIdentity).toEqual(mockDAOIdentity);
      expect(result.successfulModules).toContain('qonsent');
      expect(result.successfulModules).toContain('qlock');
      expect(result.successfulModules).toContain('qwallet');
      expect(result.successfulModules).toContain('qerberos');
      expect(result.successfulModules).toContain('qindex');
      expect(result.contextUpdates.qonsent).toBe(ContextUpdateStatus.SUCCESS);
      expect(result.contextUpdates.qlock).toBe(ContextUpdateStatus.SUCCESS);
      expect(result.contextUpdates.qwallet).toBe(ContextUpdateStatus.SUCCESS);
      expect(result.contextUpdates.qerberos).toBe(ContextUpdateStatus.SUCCESS);
      expect(result.contextUpdates.qindex).toBe(ContextUpdateStatus.SUCCESS);
    });

    it('should handle switch from null previous identity', async () => {
      const result = await contextSwitcher.switchIdentityContext(
        null,
        mockDAOIdentity
      );

      expect(result.success).toBe(true);
      expect(result.previousIdentity).toBeNull();
      expect(result.newIdentity).toEqual(mockDAOIdentity);
    });

    it('should continue with warnings for non-critical module failures', async () => {
      // Mock a scenario where some non-critical modules fail
      const originalUpdateQindex = (contextSwitcher as any).updateQindexContext;
      (contextSwitcher as any).updateQindexContext = vi.fn().mockRejectedValue(
        new Error('Qindex temporarily unavailable')
      );

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(result.success).toBe(true);
      expect(result.failedModules).toContain('qindex');
      expect(result.warnings).toContain('Some non-critical modules failed: qindex');

      // Restore original method
      (contextSwitcher as any).updateQindexContext = originalUpdateQindex;
    });
  });

  describe('Context Switch Failures and Rollback', () => {
    it('should fail and rollback on critical module failure', async () => {
      // Mock critical module failure (Qonsent)
      const originalUpdateQonsent = (contextSwitcher as any).updateQonsentContext;
      (contextSwitcher as any).updateQonsentContext = vi.fn().mockRejectedValue(
        new Error('Qonsent service critical failure')
      );

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Critical context updates failed');
      expect(result.errorCode).toBe('CRITICAL_FAILURE');

      // Restore original method
      (contextSwitcher as any).updateQonsentContext = originalUpdateQonsent;
    });

    it('should fail and rollback on Qlock critical failure', async () => {
      // Mock critical module failure (Qlock)
      const originalUpdateQlock = (contextSwitcher as any).updateQlockContext;
      (contextSwitcher as any).updateQlockContext = vi.fn().mockRejectedValue(
        new Error('Qlock encryption failure')
      );

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Critical context updates failed');
      expect(result.errorCode).toBe('CRITICAL_FAILURE');

      // Restore original method
      (contextSwitcher as any).updateQlockContext = originalUpdateQlock;
    });

    it('should prevent concurrent switches', async () => {
      // Start first switch
      const firstSwitchPromise = contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      // Try to start second switch while first is in progress
      const secondSwitchPromise = contextSwitcher.switchIdentityContext(
        mockDAOIdentity,
        mockRootIdentity
      );

      const [firstResult, secondResult] = await Promise.all([
        firstSwitchPromise,
        secondSwitchPromise
      ]);

      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('Context switch already in progress');
      expect(secondResult.errorCode).toBe('SWITCH_IN_PROGRESS');
    });

    it('should handle validation failure', async () => {
      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockInactiveIdentity
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Context validation failed');
      expect(result.errorCode).toBe('VALIDATION_FAILED');
    });
  });

  describe('Context Snapshot and Rollback', () => {
    it('should create context snapshot', async () => {
      const snapshot = await (contextSwitcher as any).createContextSnapshot(mockRootIdentity);

      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.previousIdentity).toEqual(mockRootIdentity);
      expect(snapshot.contexts).toBeDefined();
      expect(snapshot.contexts.qonsent).toBeDefined();
      expect(snapshot.contexts.qlock).toBeDefined();
      expect(snapshot.contexts.qwallet).toBeDefined();
      expect(snapshot.contexts.qerberos).toBeDefined();
      expect(snapshot.contexts.qindex).toBeDefined();
    });

    it('should handle snapshot creation for null identity', async () => {
      const snapshot = await (contextSwitcher as any).createContextSnapshot(null);

      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.previousIdentity).toBeNull();
      expect(snapshot.contexts.qonsent).toBeNull();
      expect(snapshot.contexts.qlock).toBeNull();
      expect(snapshot.contexts.qwallet).toBeNull();
      expect(snapshot.contexts.qerberos).toBeNull();
      expect(snapshot.contexts.qindex).toBeNull();
    });

    it('should perform successful rollback', async () => {
      // Create a snapshot first
      const snapshot = await (contextSwitcher as any).createContextSnapshot(mockRootIdentity);
      const switchId = 'test-switch-123';
      (contextSwitcher as any).contextSnapshots.set(switchId, snapshot);

      const rollbackResult = await contextSwitcher.rollbackContextSwitch(switchId);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.switchId).toBe(switchId);
      expect(rollbackResult.rollbackResults.qonsent).toBe(true);
      expect(rollbackResult.rollbackResults.qlock).toBe(true);
      expect(rollbackResult.rollbackResults.qwallet).toBe(true);
      expect(rollbackResult.rollbackResults.qerberos).toBe(true);
      expect(rollbackResult.rollbackResults.qindex).toBe(true);
      expect(rollbackResult.errors).toHaveLength(0);
    });

    it('should handle rollback with missing snapshot', async () => {
      const rollbackResult = await contextSwitcher.rollbackContextSwitch('non-existent-switch');

      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.errors).toContain('Context snapshot not found for rollback');
    });

    it('should handle partial rollback failures', async () => {
      // Create a snapshot first
      const snapshot = await (contextSwitcher as any).createContextSnapshot(mockRootIdentity);
      const switchId = 'test-switch-456';
      (contextSwitcher as any).contextSnapshots.set(switchId, snapshot);

      // Mock rollback failure for one module
      const originalRollbackQonsent = (contextSwitcher as any).rollbackQonsentContext;
      (contextSwitcher as any).rollbackQonsentContext = vi.fn().mockRejectedValue(
        new Error('Qonsent rollback failed')
      );

      const rollbackResult = await contextSwitcher.rollbackContextSwitch(switchId);

      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.rollbackResults.qonsent).toBe(false);
      expect(rollbackResult.rollbackResults.qlock).toBe(true);
      expect(rollbackResult.errors).toContain('Qonsent rollback failed: Qonsent rollback failed');

      // Restore original method
      (contextSwitcher as any).rollbackQonsentContext = originalRollbackQonsent;
    });
  });

  describe('Switch Status and Cleanup', () => {
    it('should track switch status', () => {
      const initialStatus = contextSwitcher.getSwitchStatus();
      expect(initialStatus.inProgress).toBe(false);
      expect(initialStatus.switchId).toBeNull();
    });

    it('should clear snapshots', () => {
      // Add some test snapshots
      (contextSwitcher as any).contextSnapshots.set('test-1', {});
      (contextSwitcher as any).contextSnapshots.set('test-2', {});

      expect((contextSwitcher as any).contextSnapshots.size).toBe(2);

      contextSwitcher.clearSnapshots();

      expect((contextSwitcher as any).contextSnapshots.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle ContextSwitchError properly', async () => {
      // Mock validation to throw ContextSwitchError
      const originalValidate = contextSwitcher.validateContextSwitch;
      contextSwitcher.validateContextSwitch = vi.fn().mockRejectedValue(
        new ContextSwitchError('Test error', 'TEST_ERROR', 'test-switch-789')
      );

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(result.errorCode).toBe('TEST_ERROR');

      // Restore original method
      contextSwitcher.validateContextSwitch = originalValidate;
    });

    it('should handle unknown errors', async () => {
      // Mock validation to throw unknown error
      const originalValidate = contextSwitcher.validateContextSwitch;
      contextSwitcher.validateContextSwitch = vi.fn().mockRejectedValue(
        new Error('Unknown error')
      );

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
      expect(result.errorCode).toBe('UNKNOWN_ERROR');

      // Restore original method
      contextSwitcher.validateContextSwitch = originalValidate;
    });

    it('should handle non-Error exceptions', async () => {
      // Mock validation to throw non-Error object
      const originalValidate = contextSwitcher.validateContextSwitch;
      contextSwitcher.validateContextSwitch = vi.fn().mockRejectedValue('String error');

      const result = await contextSwitcher.switchIdentityContext(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown context switch error');
      expect(result.errorCode).toBe('UNKNOWN_ERROR');

      // Restore original method
      contextSwitcher.validateContextSwitch = originalValidate;
    });
  });

  describe('Module Context Updates', () => {
    it('should handle individual module update failures gracefully', async () => {
      // Test each module update method individually
      const testIdentity = mockDAOIdentity;

      // Test successful updates
      await expect((contextSwitcher as any).updateQonsentContext(testIdentity)).resolves.not.toThrow();
      await expect((contextSwitcher as any).updateQlockContext(testIdentity)).resolves.not.toThrow();
      await expect((contextSwitcher as any).updateQwalletContext(testIdentity)).resolves.not.toThrow();
      await expect((contextSwitcher as any).updateQerberosContext(testIdentity)).resolves.not.toThrow();
      await expect((contextSwitcher as any).updateQindexContext(testIdentity)).resolves.not.toThrow();
    });

    it('should handle context capture methods', async () => {
      const testIdentity = mockRootIdentity;

      const qonsentContext = await (contextSwitcher as any).captureQonsentContext(testIdentity);
      expect(qonsentContext.profileId).toBe(testIdentity.qonsentProfileId);
      expect(qonsentContext.privacyLevel).toBe(testIdentity.privacyLevel);

      const qlockContext = await (contextSwitcher as any).captureQlockContext(testIdentity);
      expect(qlockContext.keyPair).toEqual(testIdentity.qlockKeyPair);

      const qwalletContext = await (contextSwitcher as any).captureQwalletContext(testIdentity);
      expect(qwalletContext.walletAddress).toBe(`wallet-${testIdentity.did}`);

      const qerberosContext = await (contextSwitcher as any).captureQerberosContext(testIdentity);
      expect(qerberosContext.auditLevel).toBe('MEDIUM');

      const qindexContext = await (contextSwitcher as any).captureQindexContext(testIdentity);
      expect(qindexContext.registrationId).toBe(`qindex-${testIdentity.did}`);
    });
  });
});