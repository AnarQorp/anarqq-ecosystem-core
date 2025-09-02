/**
 * QonsentWalletService Tests
 * Tests for permission validation, real-time checking, and dynamic limit updates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QonsentWalletService, WalletOperation } from '../QonsentWalletService';
import { ExtendedSquidIdentity, IdentityType } from '../../types/identity';
import { IdentityExposureLevel } from '../../types/qonsent';
import * as QonsentAPI from '../../api/qonsent';

// Mock the QonsentAPI
vi.mock('../../api/qonsent', () => ({
  getPrivacySettings: vi.fn(),
  updatePrivacySettings: vi.fn()
}));

describe('QonsentWalletService', () => {
  let service: QonsentWalletService;
  let mockIdentity: ExtendedSquidIdentity;
  let mockOperation: WalletOperation;

  beforeEach(() => {
    service = new QonsentWalletService();
    
    mockIdentity = {
      did: 'test-identity-123',
      name: 'Test Identity',
      type: IdentityType.ROOT,
      rootId: 'test-identity-123',
      children: [],
      depth: 0,
      path: [],
      governanceLevel: 'SELF',
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
        governanceLevel: 'SELF'
      },
      status: 'ACTIVE',
      qonsentProfileId: 'qonsent-profile-123',
      qlockKeyPair: {
        publicKey: 'public-key',
        privateKey: 'private-key',
        algorithm: 'RSA',
        keySize: 2048,
        createdAt: '2024-01-01T00:00:00Z'
      },
      privacyLevel: 'PUBLIC',
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

    mockOperation = {
      type: 'TRANSFER',
      amount: 1000,
      token: 'ETH',
      recipient: '0x1234567890123456789012345678901234567890'
    };

    // Setup default mock responses
    vi.mocked(QonsentAPI.getPrivacySettings).mockResolvedValue({
      success: true,
      settings: {
        exposureLevel: IdentityExposureLevel.MEDIUM,
        moduleSharing: { qwallet: true },
        useQmask: false,
        qmaskStrength: 'standard'
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateWalletPermission', () => {
    it('should allow transfer for ROOT identity with medium exposure', async () => {
      const result = await service.validateWalletPermission(mockIdentity, mockOperation);

      expect(result.allowed).toBe(true);
      expect(result.permission.operation).toEqual(mockOperation);
      expect(result.permission.allowed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should deny transfer for CONSENTIDA identity', async () => {
      mockIdentity.type = IdentityType.CONSENTIDA;
      
      const result = await service.validateWalletPermission(mockIdentity, mockOperation);

      expect(result.allowed).toBe(false);
      expect(result.permission.allowed).toBe(false);
      expect(result.permission.reason).toContain('not permitted for this identity type');
    });

    it('should apply exposure level restrictions for ANONYMOUS identity', async () => {
      mockIdentity.type = IdentityType.AID;
      vi.mocked(QonsentAPI.getPrivacySettings).mockResolvedValue({
        success: true,
        settings: {
          exposureLevel: IdentityExposureLevel.ANONYMOUS,
          moduleSharing: { qwallet: true },
          useQmask: true,
          qmaskStrength: 'advanced'
        }
      });

      const result = await service.validateWalletPermission(mockIdentity, mockOperation);

      expect(result.allowed).toBe(false);
      expect(result.permission.reason).toContain('privacy exposure level');
    });

    it('should allow small transfers for ANONYMOUS identity', async () => {
      mockIdentity.type = IdentityType.AID;
      mockOperation.amount = 50; // Below anonymous limit
      
      vi.mocked(QonsentAPI.getPrivacySettings).mockResolvedValue({
        success: true,
        settings: {
          exposureLevel: IdentityExposureLevel.ANONYMOUS,
          moduleSharing: { qwallet: true },
          useQmask: true,
          qmaskStrength: 'advanced'
        }
      });

      const result = await service.validateWalletPermission(mockIdentity, mockOperation);

      expect(result.allowed).toBe(true);
    });

    it('should deny operations when module sharing is disabled', async () => {
      vi.mocked(QonsentAPI.getPrivacySettings).mockResolvedValue({
        success: true,
        settings: {
          exposureLevel: IdentityExposureLevel.MEDIUM,
          moduleSharing: { qwallet: false },
          useQmask: false,
          qmaskStrength: 'standard'
        }
      });

      const result = await service.validateWalletPermission(mockIdentity, mockOperation);

      expect(result.allowed).toBe(false);
      expect(result.permission.reason).toContain('module sharing settings');
    });

    it('should generate warnings for large transactions', async () => {
      mockOperation.amount = 5000; // Large amount

      const result = await service.validateWalletPermission(mockIdentity, mockOperation);

      expect(result.warnings).toContain('Large transaction amount - consider splitting into smaller transactions');
    });

    it('should require additional auth for large amounts', async () => {
      mockOperation.amount = 10000; // Very large amount

      const result = await service.validateWalletPermission(mockIdentity, mockOperation);

      expect(result.requiresAdditionalAuth).toBe(true);
    });

    it('should calculate dynamic limits based on exposure level', async () => {
      vi.mocked(QonsentAPI.getPrivacySettings).mockResolvedValue({
        success: true,
        settings: {
          exposureLevel: IdentityExposureLevel.LOW,
          moduleSharing: { qwallet: true },
          useQmask: false,
          qmaskStrength: 'standard'
        }
      });

      const result = await service.validateWalletPermission(mockIdentity, mockOperation);

      expect(result.dynamicLimits).toBeDefined();
      expect(result.dynamicLimits!.dailyTransferLimit).toBeLessThan(100000); // Should be reduced for LOW exposure
    });

    it('should handle Qonsent API errors gracefully', async () => {
      vi.mocked(QonsentAPI.getPrivacySettings).mockRejectedValue(new Error('API Error'));

      const result = await service.validateWalletPermission(mockIdentity, mockOperation);

      expect(result.allowed).toBe(false);
      expect(result.permission.reason).toContain('service error');
      expect(result.warnings).toContain('Permission validation service temporarily unavailable');
    });

    it('should add governance approval conditions for DAO large transactions', async () => {
      mockIdentity.type = IdentityType.DAO;
      mockOperation.amount = 15000; // Above DAO threshold

      const result = await service.validateWalletPermission(mockIdentity, mockOperation);

      const governanceCondition = result.permission.conditions?.find(
        c => c.type === 'GOVERNANCE_APPROVAL'
      );
      expect(governanceCondition).toBeDefined();
      expect(governanceCondition!.description).toContain('DAO governance approval required');
    });

    it('should add parental consent conditions for CONSENTIDA identity', async () => {
      mockIdentity.type = IdentityType.CONSENTIDA;

      const result = await service.validateWalletPermission(mockIdentity, mockOperation);

      const parentalCondition = result.permission.conditions?.find(
        c => c.type === 'GOVERNANCE_APPROVAL' && c.value === 'PARENTAL_CONSENT'
      );
      expect(parentalCondition).toBeDefined();
    });
  });

  describe('startRealTimePermissionChecking', () => {
    it('should start real-time checking for an identity', async () => {
      const result = await service.startRealTimePermissionChecking(mockIdentity.did);

      expect(result).toBe(true);
      expect(service['permissionCheckers'].has(mockIdentity.did)).toBe(true);
    });

    it('should return true if already monitoring identity', async () => {
      await service.startRealTimePermissionChecking(mockIdentity.did);
      const result = await service.startRealTimePermissionChecking(mockIdentity.did);

      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Mock an error condition
      const originalSet = Map.prototype.set;
      Map.prototype.set = vi.fn().mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = await service.startRealTimePermissionChecking(mockIdentity.did);

      expect(result).toBe(false);

      // Restore original method
      Map.prototype.set = originalSet;
    });
  });

  describe('stopRealTimePermissionChecking', () => {
    it('should stop real-time checking for an identity', async () => {
      await service.startRealTimePermissionChecking(mockIdentity.did);
      const result = await service.stopRealTimePermissionChecking(mockIdentity.did);

      expect(result).toBe(true);
      expect(service['permissionCheckers'].has(mockIdentity.did)).toBe(false);
    });

    it('should return true if identity was not being monitored', async () => {
      const result = await service.stopRealTimePermissionChecking(mockIdentity.did);

      expect(result).toBe(true);
    });
  });

  describe('subscribeToPermissionChanges', () => {
    it('should subscribe to permission changes', () => {
      const handler = vi.fn();
      const unsubscribe = service.subscribeToPermissionChanges(mockIdentity.did, handler);

      expect(typeof unsubscribe).toBe('function');
      expect(service['eventHandlers'].has(mockIdentity.did)).toBe(true);
    });

    it('should unsubscribe from permission changes', () => {
      const handler = vi.fn();
      const unsubscribe = service.subscribeToPermissionChanges(mockIdentity.did, handler);

      unsubscribe();

      const handlers = service['eventHandlers'].get(mockIdentity.did);
      expect(handlers).toEqual([]);
    });
  });

  describe('getPendingNotifications', () => {
    it('should return empty array when no notifications', async () => {
      const notifications = await service.getPendingNotifications(mockIdentity.did);

      expect(notifications).toEqual([]);
    });

    it('should filter notifications by identity', async () => {
      // Add a mock notification to the queue
      service['notificationQueue'].push({
        id: 'test-notification',
        identityId: mockIdentity.did,
        changeType: 'GRANTED',
        operation: mockOperation,
        newPermission: {
          operation: mockOperation,
          allowed: true
        },
        timestamp: new Date().toISOString(),
        source: 'QONSENT_POLICY',
        notificationSent: false,
        acknowledged: false
      });

      const notifications = await service.getPendingNotifications(mockIdentity.did);

      expect(notifications).toHaveLength(1);
      expect(notifications[0].identityId).toBe(mockIdentity.did);
    });
  });

  describe('acknowledgeNotification', () => {
    it('should acknowledge a notification', async () => {
      const notificationId = 'test-notification';
      service['notificationQueue'].push({
        id: notificationId,
        identityId: mockIdentity.did,
        changeType: 'GRANTED',
        operation: mockOperation,
        newPermission: {
          operation: mockOperation,
          allowed: true
        },
        timestamp: new Date().toISOString(),
        source: 'QONSENT_POLICY',
        notificationSent: false,
        acknowledged: false
      });

      const result = await service.acknowledgeNotification(notificationId);

      expect(result).toBe(true);
      expect(service['notificationQueue'][0].acknowledged).toBe(true);
    });

    it('should return false for non-existent notification', async () => {
      const result = await service.acknowledgeNotification('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('identity type permissions', () => {
    it('should allow all operations for ROOT identity', async () => {
      mockIdentity.type = IdentityType.ROOT;
      
      const operations: WalletOperation[] = [
        { type: 'TRANSFER', amount: 1000 },
        { type: 'RECEIVE' },
        { type: 'MINT_NFT' },
        { type: 'SIGN_TRANSACTION' },
        { type: 'ACCESS_DEFI' },
        { type: 'CREATE_DAO' }
      ];

      for (const operation of operations) {
        const result = await service.validateWalletPermission(mockIdentity, operation);
        expect(result.allowed).toBe(true);
      }
    });

    it('should restrict operations for ENTERPRISE identity', async () => {
      mockIdentity.type = IdentityType.ENTERPRISE;
      
      const restrictedOps: WalletOperation[] = [
        { type: 'MINT_NFT' },
        { type: 'ACCESS_DEFI' },
        { type: 'CREATE_DAO' }
      ];

      for (const operation of restrictedOps) {
        const result = await service.validateWalletPermission(mockIdentity, operation);
        expect(result.allowed).toBe(false);
      }
    });

    it('should allow only limited operations for AID identity', async () => {
      mockIdentity.type = IdentityType.AID;
      
      const allowedOps: WalletOperation[] = [
        { type: 'TRANSFER', amount: 100, token: 'QToken' },
        { type: 'RECEIVE' },
        { type: 'SIGN_TRANSACTION' }
      ];

      const restrictedOps: WalletOperation[] = [
        { type: 'MINT_NFT' },
        { type: 'ACCESS_DEFI' },
        { type: 'CREATE_DAO' }
      ];

      for (const operation of allowedOps) {
        const result = await service.validateWalletPermission(mockIdentity, operation);
        expect(result.allowed).toBe(true);
      }

      for (const operation of restrictedOps) {
        const result = await service.validateWalletPermission(mockIdentity, operation);
        expect(result.allowed).toBe(false);
      }
    });
  });

  describe('token restrictions', () => {
    it('should allow all tokens for ROOT identity', async () => {
      mockIdentity.type = IdentityType.ROOT;
      mockOperation.token = 'CUSTOM_TOKEN';

      const result = await service.validateWalletPermission(mockIdentity, mockOperation);

      expect(result.allowed).toBe(true);
    });

    it('should restrict tokens for ENTERPRISE identity', async () => {
      mockIdentity.type = IdentityType.ENTERPRISE;
      mockOperation.token = 'CUSTOM_TOKEN'; // Not in allowed list

      const result = await service.validateWalletPermission(mockIdentity, mockOperation);

      expect(result.allowed).toBe(false);
    });

    it('should allow only QToken for AID identity', async () => {
      mockIdentity.type = IdentityType.AID;
      mockOperation.token = 'ETH'; // Not allowed for AID

      const result = await service.validateWalletPermission(mockIdentity, mockOperation);

      expect(result.allowed).toBe(false);

      mockOperation.token = 'QToken'; // Allowed for AID
      const result2 = await service.validateWalletPermission(mockIdentity, mockOperation);

      expect(result2.allowed).toBe(true);
    });
  });
});