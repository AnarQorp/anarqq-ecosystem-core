/**
 * Test suite for Enhanced Wallet Configuration Service
 * Tests identity-aware wallet configurations, dynamic limits,
 * DAO governance integration, security settings, and sandbox testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalletConfigService } from '../WalletConfigService';
import { IdentityType, PrivacyLevel } from '../../../types/identity';
import {
  IdentityWalletConfig,
  WalletLimits,
  SecuritySettings,
  PrivacySettings,
  AuditSettings,
  WalletMode,
  ConfigValidationResult,
  ConfigChangeRequest,
  WalletConfigError,
  ConfigValidationError,
  GovernanceRequiredError
} from '../../../types/wallet-config';

describe('WalletConfigService', () => {
  let walletConfigService: WalletConfigService;
  const mockIdentityId = 'test-root-identity-123';
  const mockDAOIdentityId = 'test-dao-identity-456';
  const mockEnterpriseIdentityId = 'test-enterprise-identity-789';
  const mockConsentidaIdentityId = 'test-consentida-identity-101';
  const mockAIDIdentityId = 'test-aid-identity-202';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    sessionStorage.clear();
    
    // Create fresh service instance
    walletConfigService = new WalletConfigService();
  });

  describe('Configuration Management', () => {
    it('should create default configuration for ROOT identity', async () => {
      const config = await walletConfigService.getWalletConfig(mockIdentityId);

      expect(config).toBeDefined();
      expect(config.identityId).toBe(mockIdentityId);
      expect(config.identityType).toBe(IdentityType.ROOT);
      expect(config.permissions.canTransfer).toBe(true);
      expect(config.permissions.canCreateDAO).toBe(true);
      expect(config.permissions.governanceLevel).toBe('FULL');
      expect(config.limits.dynamicLimitsEnabled).toBe(true);
      expect(config.limits.governanceControlled).toBe(false);
      expect(config.securitySettings.requiresDeviceVerification).toBe(false);
      expect(config.privacySettings.privacyLevel).toBe(PrivacyLevel.PUBLIC);
      expect(config.auditSettings.enableAuditLogging).toBe(true);
      expect(config.walletMode.mode).toBe('PRODUCTION');
      expect(config.frozen).toBe(false);
    });

    it('should create default configuration for DAO identity', async () => {
      const config = await walletConfigService.getWalletConfig(mockDAOIdentityId);

      expect(config.identityType).toBe(IdentityType.DAO);
      expect(config.permissions.canCreateDAO).toBe(false);
      expect(config.permissions.governanceLevel).toBe('LIMITED');
      expect(config.permissions.requiresApproval).toBe(true);
      expect(config.limits.governanceControlled).toBe(true);
      expect(config.securitySettings.requiresMultiSig).toBe(true);
      expect(config.securitySettings.requires2FA).toBe(true);
    });

    it('should create default configuration for ENTERPRISE identity', async () => {
      const config = await walletConfigService.getWalletConfig(mockEnterpriseIdentityId);

      expect(config.identityType).toBe(IdentityType.ENTERPRISE);
      expect(config.permissions.canAccessDeFi).toBe(false);
      expect(config.permissions.restrictedOperations).toContain('DEFI');
      expect(config.securitySettings.requiresBiometric).toBe(true);
      expect(config.privacySettings.privacyLevel).toBe(PrivacyLevel.PRIVATE);
      expect(config.privacySettings.shareWithAnalytics).toBe(false);
    });

    it('should create default configuration for CONSENTIDA identity', async () => {
      const config = await walletConfigService.getWalletConfig(mockConsentidaIdentityId);

      expect(config.identityType).toBe(IdentityType.CONSENTIDA);
      expect(config.permissions.canTransfer).toBe(false);
      expect(config.permissions.governanceLevel).toBe('READ_ONLY');
      expect(config.limits.maxTransactionAmount).toBe(50);
      expect(config.securitySettings.maxConcurrentSessions).toBe(1);
      expect(config.privacySettings.shareWithParent).toBe(true);
      expect(config.privacySettings.hideBalances).toBe(true);
    });

    it('should create default configuration for AID identity', async () => {
      const config = await walletConfigService.getWalletConfig(mockAIDIdentityId);

      expect(config.identityType).toBe(IdentityType.AID);
      expect(config.permissions.canMintNFT).toBe(false);
      expect(config.permissions.allowedTokens).toEqual(['ETH']);
      expect(config.securitySettings.sessionTimeout).toBe(10);
      expect(config.privacySettings.privacyLevel).toBe(PrivacyLevel.ANONYMOUS);
      expect(config.privacySettings.ephemeralStorage).toBe(true);
      expect(config.auditSettings.enableAuditLogging).toBe(false);
    });

    it('should update wallet configuration successfully', async () => {
      const originalConfig = await walletConfigService.getWalletConfig(mockIdentityId);
      
      const updates: Partial<IdentityWalletConfig> = {
        limits: {
          ...originalConfig.limits,
          dailyTransferLimit: 50000
        },
        securitySettings: {
          ...originalConfig.securitySettings,
          requiresDeviceVerification: true
        }
      };

      const success = await walletConfigService.updateWalletConfig(mockIdentityId, updates);
      expect(success).toBe(true);

      const updatedConfig = await walletConfigService.getWalletConfig(mockIdentityId);
      expect(updatedConfig.limits.dailyTransferLimit).toBe(50000);
      expect(updatedConfig.securitySettings.requiresDeviceVerification).toBe(true);
      expect(updatedConfig.version).not.toBe(originalConfig.version);
    });

    it('should reset wallet configuration to defaults', async () => {
      // First modify the configuration
      const updates: Partial<IdentityWalletConfig> = {
        limits: {
          dailyTransferLimit: 1000,
          monthlyTransferLimit: 10000,
          maxTransactionAmount: 500,
          maxTransactionsPerHour: 5,
          allowedTokens: ['ETH'],
          restrictedAddresses: [],
          requiresApprovalAbove: 100,
          dynamicLimitsEnabled: false,
          governanceControlled: false,
          riskBasedAdjustments: false
        }
      };
      
      await walletConfigService.updateWalletConfig(mockIdentityId, updates);
      
      // Then reset
      const success = await walletConfigService.resetWalletConfig(mockIdentityId);
      expect(success).toBe(true);

      const resetConfig = await walletConfigService.getWalletConfig(mockIdentityId);
      expect(resetConfig.limits.dailyTransferLimit).toBe(100000); // Default for ROOT
    });
  });

  describe('Template Management', () => {
    it('should get configuration template for identity type', async () => {
      const template = await walletConfigService.getConfigTemplate(IdentityType.ROOT);

      expect(template).toBeDefined();
      expect(template.identityType).toBe(IdentityType.ROOT);
      expect(template.templateName).toBe('ROOT_DEFAULT');
      expect(template.isDefault).toBe(true);
      expect(template.permissions.governanceLevel).toBe('FULL');
    });

    it('should create configuration from template', async () => {
      const config = await walletConfigService.createConfigFromTemplate(mockIdentityId, 'ROOT_DEFAULT');

      expect(config.identityId).toBe(mockIdentityId);
      expect(config.identityType).toBe(IdentityType.ROOT);
      expect(config.permissions.canCreateDAO).toBe(true);
      expect(config.version).toBe('1.0.0');
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        walletConfigService.getConfigTemplate('INVALID' as IdentityType)
      ).rejects.toThrow('No template found for identity type');
    });
  });

  describe('Dynamic Limits', () => {
    it('should update dynamic limits when enabled', async () => {
      const newLimits: Partial<WalletLimits> = {
        dailyTransferLimit: 75000,
        maxTransactionAmount: 30000
      };

      const success = await walletConfigService.updateDynamicLimits(mockIdentityId, newLimits);
      expect(success).toBe(true);

      const config = await walletConfigService.getWalletConfig(mockIdentityId);
      expect(config.limits.dailyTransferLimit).toBe(75000);
      expect(config.limits.maxTransactionAmount).toBe(30000);
    });

    it('should fail to update dynamic limits when disabled', async () => {
      // First disable dynamic limits
      const config = await walletConfigService.getWalletConfig(mockIdentityId);
      config.limits.dynamicLimitsEnabled = false;
      await walletConfigService.updateWalletConfig(mockIdentityId, { limits: config.limits });

      const newLimits: Partial<WalletLimits> = {
        dailyTransferLimit: 75000
      };

      const success = await walletConfigService.updateDynamicLimits(mockIdentityId, newLimits);
      expect(success).toBe(false);
    });

    it('should apply risk-based limits correctly', async () => {
      const success = await walletConfigService.applyRiskBasedLimits(mockIdentityId, 'HIGH');
      expect(success).toBe(true);

      const config = await walletConfigService.getWalletConfig(mockIdentityId);
      // HIGH risk should apply 0.3 multiplier to ROOT defaults
      expect(config.limits.dailyTransferLimit).toBe(30000); // 100000 * 0.3
      expect(config.limits.maxTransactionAmount).toBe(15000); // 50000 * 0.3
    });

    it('should handle critical risk by setting limits to zero', async () => {
      const success = await walletConfigService.applyRiskBasedLimits(mockIdentityId, 'CRITICAL');
      expect(success).toBe(true);

      const config = await walletConfigService.getWalletConfig(mockIdentityId);
      expect(config.limits.dailyTransferLimit).toBe(0);
      expect(config.limits.maxTransactionAmount).toBe(0);
    });
  });

  describe('Governance Integration', () => {
    it('should create configuration change request', async () => {
      const changeRequest: ConfigChangeRequest = {
        requestId: '',
        identityId: mockDAOIdentityId,
        requestedBy: 'test-user',
        changeType: 'LIMITS',
        currentConfig: {},
        proposedConfig: {
          limits: {
            dailyTransferLimit: 1000,
            monthlyTransferLimit: 10000,
            maxTransactionAmount: 500,
            maxTransactionsPerHour: 10,
            allowedTokens: ['ETH'],
            restrictedAddresses: [],
            requiresApprovalAbove: 100,
            dynamicLimitsEnabled: true,
            governanceControlled: true,
            riskBasedAdjustments: true
          }
        },
        justification: 'Increase limits for project funding',
        requiresGovernanceApproval: true,
        status: 'PENDING',
        requestedAt: '',
        expiresAt: ''
      };

      const requestId = await walletConfigService.requestConfigChange(changeRequest);
      expect(requestId).toBeDefined();
      expect(requestId.startsWith('req_')).toBe(true);
    });

    it('should approve configuration change request', async () => {
      const changeRequest: ConfigChangeRequest = {
        requestId: '',
        identityId: mockDAOIdentityId,
        requestedBy: 'test-user',
        changeType: 'LIMITS',
        currentConfig: {},
        proposedConfig: {
          limits: {
            dailyTransferLimit: 1000,
            monthlyTransferLimit: 10000,
            maxTransactionAmount: 500,
            maxTransactionsPerHour: 10,
            allowedTokens: ['ETH'],
            restrictedAddresses: [],
            requiresApprovalAbove: 100,
            dynamicLimitsEnabled: true,
            governanceControlled: true,
            riskBasedAdjustments: true
          }
        },
        justification: 'Increase limits for project funding',
        requiresGovernanceApproval: true,
        status: 'PENDING',
        requestedAt: '',
        expiresAt: ''
      };

      const requestId = await walletConfigService.requestConfigChange(changeRequest);
      const success = await walletConfigService.approveConfigChange(requestId, true);
      expect(success).toBe(true);
    });

    it('should reject configuration change request', async () => {
      const changeRequest: ConfigChangeRequest = {
        requestId: '',
        identityId: mockDAOIdentityId,
        requestedBy: 'test-user',
        changeType: 'LIMITS',
        currentConfig: {},
        proposedConfig: {},
        justification: 'Test rejection',
        requiresGovernanceApproval: true,
        status: 'PENDING',
        requestedAt: '',
        expiresAt: ''
      };

      const requestId = await walletConfigService.requestConfigChange(changeRequest);
      const success = await walletConfigService.approveConfigChange(requestId, false);
      expect(success).toBe(true);
    });

    it('should get configuration change history', async () => {
      // First make a change to create history
      const updates: Partial<IdentityWalletConfig> = {
        limits: {
          dailyTransferLimit: 1000,
          monthlyTransferLimit: 10000,
          maxTransactionAmount: 500,
          maxTransactionsPerHour: 10,
          allowedTokens: ['ETH'],
          restrictedAddresses: [],
          requiresApprovalAbove: 100,
          dynamicLimitsEnabled: true,
          governanceControlled: true,
          riskBasedAdjustments: true
        }
      };
      
      await walletConfigService.updateWalletConfig(mockIdentityId, updates);

      const history = await walletConfigService.getConfigChangeHistory(mockIdentityId);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', async () => {
      const config = await walletConfigService.getWalletConfig(mockIdentityId);
      const validation = await walletConfigService.validateConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.riskLevel).toBe('LOW');
    });

    it('should detect invalid configuration', async () => {
      const config = await walletConfigService.getWalletConfig(mockIdentityId);
      config.permissions.maxTransactionAmount = -100; // Invalid negative amount
      config.limits.dailyTransferLimit = 100; // Less than max transaction amount
      config.securitySettings.sessionTimeout = 1; // Very short timeout

      const validation = await walletConfigService.validateConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.riskLevel).toBe('CRITICAL');
    });

    it('should validate configuration changes', async () => {
      const changes: Partial<IdentityWalletConfig> = {
        limits: {
          dailyTransferLimit: 1000,
          monthlyTransferLimit: 10000,
          maxTransactionAmount: 2000, // Greater than daily limit
          maxTransactionsPerHour: 10,
          allowedTokens: ['ETH'],
          restrictedAddresses: [],
          requiresApprovalAbove: 100,
          dynamicLimitsEnabled: true,
          governanceControlled: true,
          riskBasedAdjustments: true
        }
      };

      const validation = await walletConfigService.validateConfigChange(mockIdentityId, changes);
      expect(validation.warnings.length).toBeGreaterThan(0); // Should warn about max > daily
    });
  });

  describe('Sandbox Mode', () => {
    it('should enable sandbox mode', async () => {
      const success = await walletConfigService.enableSandboxMode(mockIdentityId);
      expect(success).toBe(true);

      const config = await walletConfigService.getWalletConfig(mockIdentityId);
      expect(config.walletMode.mode).toBe('SANDBOX');
      expect(config.walletMode.isSandbox).toBe(true);
      expect(config.walletMode.fakeSignatures).toBe(true);
      expect(config.walletMode.enableTestTransactions).toBe(true);
      expect(config.walletMode.allowReset).toBe(true);
    });

    it('should enable sandbox mode with custom configuration', async () => {
      const sandboxConfig: Partial<WalletMode> = {
        mockBalances: { 'ETH': 100, 'QToken': 1000 },
        testingScenario: 'HIGH_VOLUME_TESTING',
        debugLogging: true
      };

      const success = await walletConfigService.enableSandboxMode(mockIdentityId, sandboxConfig);
      expect(success).toBe(true);

      const config = await walletConfigService.getWalletConfig(mockIdentityId);
      expect(config.walletMode.mockBalances).toEqual({ 'ETH': 100, 'QToken': 1000 });
      expect(config.walletMode.testingScenario).toBe('HIGH_VOLUME_TESTING');
    });

    it('should disable sandbox mode', async () => {
      // First enable sandbox mode
      await walletConfigService.enableSandboxMode(mockIdentityId);
      
      // Then disable it
      const success = await walletConfigService.disableSandboxMode(mockIdentityId);
      expect(success).toBe(true);

      const config = await walletConfigService.getWalletConfig(mockIdentityId);
      expect(config.walletMode.mode).toBe('PRODUCTION');
      expect(config.walletMode.isSandbox).toBe(false);
      expect(config.walletMode.fakeSignatures).toBe(false);
      expect(config.walletMode.allowReset).toBe(false);
    });

    it('should reset sandbox data', async () => {
      // Enable sandbox with mock data
      await walletConfigService.enableSandboxMode(mockIdentityId, {
        mockBalances: { 'ETH': 100 },
        testingScenario: 'TEST_SCENARIO'
      });

      // Reset sandbox data
      const success = await walletConfigService.resetSandboxData(mockIdentityId);
      expect(success).toBe(true);

      const config = await walletConfigService.getWalletConfig(mockIdentityId);
      expect(config.walletMode.mockBalances).toEqual({});
      expect(config.walletMode.testingScenario).toBeUndefined();
    });

    it('should fail to reset sandbox data when not allowed', async () => {
      // Try to reset without sandbox mode enabled
      const success = await walletConfigService.resetSandboxData(mockIdentityId);
      expect(success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw WalletConfigError for invalid operations', async () => {
      await expect(
        walletConfigService.getConfigTemplate('INVALID' as IdentityType)
      ).rejects.toThrow(WalletConfigError);
    });

    it('should handle storage errors gracefully', async () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should still work but log error
      const config = await walletConfigService.getWalletConfig(mockIdentityId);
      expect(config).toBeDefined();

      // Restore original function
      localStorage.setItem = originalSetItem;
    });
  });

  describe('Event Handling', () => {
    it('should emit configuration update events', async () => {
      const eventHandler = vi.fn();
      walletConfigService.addEventListener(eventHandler);

      const updates: Partial<IdentityWalletConfig> = {
        limits: {
          dailyTransferLimit: 1000,
          monthlyTransferLimit: 10000,
          maxTransactionAmount: 500,
          maxTransactionsPerHour: 10,
          allowedTokens: ['ETH'],
          restrictedAddresses: [],
          requiresApprovalAbove: 100,
          dynamicLimitsEnabled: true,
          governanceControlled: true,
          riskBasedAdjustments: true
        }
      };

      await walletConfigService.updateWalletConfig(mockIdentityId, updates);

      expect(eventHandler).toHaveBeenCalled();
      const event = eventHandler.mock.calls[0][0];
      expect(event.type).toBe('LIMITS');
      expect(event.identityId).toBe(mockIdentityId);
    });

    it('should remove event listeners', async () => {
      const eventHandler = vi.fn();
      walletConfigService.addEventListener(eventHandler);
      walletConfigService.removeEventListener(eventHandler);

      const updates: Partial<IdentityWalletConfig> = {
        securitySettings: {
          requiresDeviceVerification: false,
          requiresMultiSig: false,
          sessionTimeout: 60,
          maxConcurrentSessions: 5,
          suspiciousActivityThreshold: 10,
          autoFreezeOnSuspiciousActivity: true,
          requiresBiometric: false,
          requires2FA: false,
          transactionConfirmationRequired: false,
          largeTransactionDelay: 0,
          emergencyFreeze: true
        }
      };

      await walletConfigService.updateWalletConfig(mockIdentityId, updates);

      expect(eventHandler).not.toHaveBeenCalled();
    });
  });

  describe('Integration with Identity Types', () => {
    it('should enforce identity-specific restrictions', async () => {
      // CONSENTIDA identity should have very restrictive defaults
      const consentidaConfig = await walletConfigService.getWalletConfig(mockConsentidaIdentityId);
      expect(consentidaConfig.permissions.canTransfer).toBe(false);
      expect(consentidaConfig.limits.maxTransactionAmount).toBe(50);
      expect(consentidaConfig.securitySettings.maxConcurrentSessions).toBe(1);

      // AID identity should have ephemeral storage
      const aidConfig = await walletConfigService.getWalletConfig(mockAIDIdentityId);
      expect(aidConfig.privacySettings.ephemeralStorage).toBe(true);
      expect(aidConfig.privacySettings.privacyLevel).toBe(PrivacyLevel.ANONYMOUS);
      expect(aidConfig.auditSettings.enableAuditLogging).toBe(false);
    });

    it('should handle governance requirements for DAO identities', async () => {
      const daoConfig = await walletConfigService.getWalletConfig(mockDAOIdentityId);
      expect(daoConfig.limits.governanceControlled).toBe(true);
      expect(daoConfig.permissions.requiresApproval).toBe(true);
      expect(daoConfig.securitySettings.requiresMultiSig).toBe(true);
    });
  });

  describe('Persistence', () => {
    it('should persist configuration across service instances', async () => {
      // First get the original config to ensure it exists
      const originalConfig = await walletConfigService.getWalletConfig(mockIdentityId);
      expect(originalConfig.limits.dailyTransferLimit).toBe(100000); // ROOT default
      
      // Create and modify configuration
      const updates: Partial<IdentityWalletConfig> = {
        limits: {
          ...originalConfig.limits,
          dailyTransferLimit: 1000
        }
      };
      
      const success = await walletConfigService.updateWalletConfig(mockIdentityId, updates);
      expect(success).toBe(true);
      
      // Verify the update worked
      const updatedConfig = await walletConfigService.getWalletConfig(mockIdentityId);
      expect(updatedConfig.limits.dailyTransferLimit).toBe(1000);

      // Manually save to localStorage to simulate persistence
      const configs = { [mockIdentityId]: updatedConfig };
      localStorage.setItem('wallet_configs', JSON.stringify(configs));

      // Create new service instance
      const newService = new WalletConfigService();
      const config = await newService.getWalletConfig(mockIdentityId);

      expect(config.limits.dailyTransferLimit).toBe(1000);
    });
  });
});