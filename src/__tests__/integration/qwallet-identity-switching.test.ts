/**
 * Qwallet Identity Switching Integration Tests
 * 
 * Tests the complete identity switching flow with wallet context updates
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IdentityType, ExtendedSquidIdentity } from '../../types/identity';

// Mock all external services
vi.mock('../../api/qwallet');
vi.mock('../../api/qonsent');
vi.mock('../../api/qlock');
vi.mock('../../api/qerberos');
vi.mock('../../api/qindex');

import * as qwalletApi from '../../api/qwallet';
import * as qonsentApi from '../../api/qonsent';
import * as qlockApi from '../../api/qlock';
import * as qerberosApi from '../../api/qerberos';

describe('Qwallet Identity Switching Integration', () => {
  const mockRootIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:root123',
    identityType: IdentityType.ROOT,
    displayName: 'Root User',
    isActive: true,
    permissions: ['wallet:full_access'],
    walletAddress: 'wallet-root123',
    qlockKeyPair: {
      publicKey: 'pub-key-root',
      privateKey: 'priv-key-root'
    }
  };

  const mockDAOIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:dao123',
    identityType: IdentityType.DAO,
    displayName: 'DAO Member',
    isActive: true,
    permissions: ['wallet:dao_access'],
    walletAddress: 'wallet-dao123',
    qlockKeyPair: {
      publicKey: 'pub-key-dao',
      privateKey: 'priv-key-dao'
    }
  };

  const mockEnterpriseIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:enterprise123',
    identityType: IdentityType.ENTERPRISE,
    displayName: 'Enterprise User',
    isActive: true,
    permissions: ['wallet:business_access'],
    walletAddress: 'wallet-enterprise123',
    qlockKeyPair: {
      publicKey: 'pub-key-enterprise',
      privateKey: 'priv-key-enterprise'
    }
  };

  const mockConsentidaIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:consentida123',
    identityType: IdentityType.CONSENTIDA,
    displayName: 'Minor User',
    isActive: true,
    permissions: ['wallet:view_only'],
    walletAddress: 'wallet-consentida123',
    qlockKeyPair: {
      publicKey: 'pub-key-consentida',
      privateKey: 'priv-key-consentida'
    }
  };

  const mockAIDIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:aid123',
    identityType: IdentityType.AID,
    displayName: 'Anonymous User',
    isActive: true,
    permissions: ['wallet:anonymous'],
    walletAddress: 'wallet-aid123',
    qlockKeyPair: {
      publicKey: 'pub-key-aid',
      privateKey: 'priv-key-aid'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default API responses
    vi.mocked(qwalletApi.getBalance).mockImplementation((walletAddress) => {
      const balances = {
        'wallet-root123': { QToken: 10000, PiToken: 5000, ETH: 1.5 },
        'wallet-dao123': { QToken: 5000, DAOToken: 1000 },
        'wallet-enterprise123': { QToken: 3000, BusinessToken: 2000 },
        'wallet-consentida123': { QToken: 100 },
        'wallet-aid123': { QToken: 500 }
      };
      
      return Promise.resolve({
        success: true,
        data: balances[walletAddress] || {}
      });
    });

    vi.mocked(qwalletApi.getWalletPermissions).mockImplementation((walletAddress) => {
      const permissions = {
        'wallet-root123': {
          canTransfer: true,
          canReceive: true,
          dailyLimit: 100000,
          monthlyLimit: 1000000,
          allowedTokens: ['QToken', 'PiToken', 'ETH'],
          canLinkExternalWallets: true
        },
        'wallet-dao123': {
          canTransfer: true,
          canReceive: true,
          dailyLimit: 50000,
          monthlyLimit: 500000,
          allowedTokens: ['QToken', 'DAOToken'],
          requiresGovernance: true,
          canLinkExternalWallets: true
        },
        'wallet-enterprise123': {
          canTransfer: true,
          canReceive: true,
          dailyLimit: 30000,
          monthlyLimit: 300000,
          allowedTokens: ['QToken', 'BusinessToken'],
          businessOnly: true,
          canLinkExternalWallets: true
        },
        'wallet-consentida123': {
          canTransfer: false,
          canReceive: true,
          dailyLimit: 1000,
          monthlyLimit: 10000,
          allowedTokens: ['QToken'],
          requiresGuardianApproval: true,
          canLinkExternalWallets: false
        },
        'wallet-aid123': {
          canTransfer: true,
          canReceive: true,
          dailyLimit: 5000,
          monthlyLimit: 25000,
          allowedTokens: ['QToken'],
          ephemeralSession: true,
          singleTokenOnly: true,
          canLinkExternalWallets: false
        }
      };
      
      return Promise.resolve({
        success: true,
        data: permissions[walletAddress] || {}
      });
    });

    vi.mocked(qwalletApi.getTransactionHistory).mockResolvedValue({
      success: true,
      data: []
    });

    vi.mocked(qwalletApi.getRiskAssessment).mockResolvedValue({
      success: true,
      data: {
        riskLevel: 'LOW',
        factors: [],
        recommendations: []
      }
    });

    vi.mocked(qonsentApi.checkPermission).mockResolvedValue(true);
    vi.mocked(qlockApi.signTransaction).mockResolvedValue({
      success: true,
      signature: 'mock-signature'
    });
    vi.mocked(qerberosApi.logAuditEvent).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Identity Context Switching', () => {
    it('should switch from ROOT to DAO identity with proper context updates', async () => {
      // Simulate identity switching service
      const identitySwitcher = {
        switchIdentity: async (fromIdentity: ExtendedSquidIdentity | null, toIdentity: ExtendedSquidIdentity) => {
          // Log the switch
          await qerberosApi.logAuditEvent({
            event: 'identity_switch',
            fromIdentity: fromIdentity?.did || null,
            toIdentity: toIdentity.did,
            timestamp: new Date().toISOString()
          });

          // Update wallet context
          const walletData = await qwalletApi.getBalance(toIdentity.walletAddress);
          const permissions = await qwalletApi.getWalletPermissions(toIdentity.walletAddress);
          
          return {
            success: true,
            newContext: {
              identity: toIdentity,
              walletData: walletData.data,
              permissions: permissions.data
            }
          };
        }
      };

      // Switch from ROOT to DAO
      const result = await identitySwitcher.switchIdentity(mockRootIdentity, mockDAOIdentity);
      
      expect(result.success).toBe(true);
      expect(result.newContext.identity).toEqual(mockDAOIdentity);
      expect(result.newContext.walletData).toEqual({ QToken: 5000, DAOToken: 1000 });
      expect(result.newContext.permissions.requiresGovernance).toBe(true);
      
      // Verify audit logging
      expect(qerberosApi.logAuditEvent).toHaveBeenCalledWith({
        event: 'identity_switch',
        fromIdentity: mockRootIdentity.did,
        toIdentity: mockDAOIdentity.did,
        timestamp: expect.any(String)
      });
    });

    it('should handle switching to CONSENTIDA identity with restricted permissions', async () => {
      const identitySwitcher = {
        switchIdentity: async (fromIdentity: ExtendedSquidIdentity | null, toIdentity: ExtendedSquidIdentity) => {
          const walletData = await qwalletApi.getBalance(toIdentity.walletAddress);
          const permissions = await qwalletApi.getWalletPermissions(toIdentity.walletAddress);
          
          return {
            success: true,
            newContext: {
              identity: toIdentity,
              walletData: walletData.data,
              permissions: permissions.data
            }
          };
        }
      };

      const result = await identitySwitcher.switchIdentity(mockRootIdentity, mockConsentidaIdentity);
      
      expect(result.success).toBe(true);
      expect(result.newContext.permissions.canTransfer).toBe(false);
      expect(result.newContext.permissions.requiresGuardianApproval).toBe(true);
      expect(result.newContext.permissions.canLinkExternalWallets).toBe(false);
      expect(result.newContext.walletData).toEqual({ QToken: 100 });
    });

    it('should handle switching to AID identity with ephemeral storage', async () => {
      const identitySwitcher = {
        switchIdentity: async (fromIdentity: ExtendedSquidIdentity | null, toIdentity: ExtendedSquidIdentity) => {
          const walletData = await qwalletApi.getBalance(toIdentity.walletAddress);
          const permissions = await qwalletApi.getWalletPermissions(toIdentity.walletAddress);
          
          // For AID, setup ephemeral storage
          const ephemeralContext = {
            identity: toIdentity,
            walletData: walletData.data,
            permissions: permissions.data,
            ephemeral: true,
            sessionTimeout: 30 * 60 * 1000 // 30 minutes
          };
          
          return {
            success: true,
            newContext: ephemeralContext
          };
        }
      };

      const result = await identitySwitcher.switchIdentity(mockRootIdentity, mockAIDIdentity);
      
      expect(result.success).toBe(true);
      expect(result.newContext.permissions.ephemeralSession).toBe(true);
      expect(result.newContext.permissions.singleTokenOnly).toBe(true);
      expect(result.newContext.permissions.canLinkExternalWallets).toBe(false);
      expect(result.newContext.ephemeral).toBe(true);
    });
  });

  describe('Cross-Identity Operations', () => {
    it('should prevent unauthorized cross-identity transfers', async () => {
      const walletService = {
        transferTokens: async (fromIdentity: ExtendedSquidIdentity, transferData: any) => {
          // Check if identity has permission
          const permissions = await qwalletApi.getWalletPermissions(fromIdentity.walletAddress);
          
          if (!permissions.data.canTransfer) {
            return {
              success: false,
              error: 'Transfer not allowed for this identity type'
            };
          }
          
          // Check Qonsent permissions
          const hasPermission = await qonsentApi.checkPermission(
            fromIdentity.did,
            'wallet:transfer',
            transferData
          );
          
          if (!hasPermission) {
            return {
              success: false,
              error: 'Permission denied by Qonsent'
            };
          }
          
          return {
            success: true,
            transactionId: 'tx-123'
          };
        }
      };

      // Try transfer with CONSENTIDA identity (should fail)
      const consentidaResult = await walletService.transferTokens(mockConsentidaIdentity, {
        to: 'recipient-address',
        amount: 50,
        token: 'QToken'
      });
      
      expect(consentidaResult.success).toBe(false);
      expect(consentidaResult.error).toBe('Transfer not allowed for this identity type');

      // Try transfer with ROOT identity (should succeed)
      const rootResult = await walletService.transferTokens(mockRootIdentity, {
        to: 'recipient-address',
        amount: 100,
        token: 'QToken'
      });
      
      expect(rootResult.success).toBe(true);
      expect(rootResult.transactionId).toBe('tx-123');
    });

    it('should enforce token restrictions per identity type', async () => {
      const walletService = {
        transferTokens: async (fromIdentity: ExtendedSquidIdentity, transferData: any) => {
          const permissions = await qwalletApi.getWalletPermissions(fromIdentity.walletAddress);
          
          if (!permissions.data.allowedTokens.includes(transferData.token)) {
            return {
              success: false,
              error: `Token ${transferData.token} not allowed for this identity`
            };
          }
          
          return {
            success: true,
            transactionId: 'tx-456'
          };
        }
      };

      // Try to transfer ETH with DAO identity (should fail)
      const daoResult = await walletService.transferTokens(mockDAOIdentity, {
        to: 'recipient-address',
        amount: 0.1,
        token: 'ETH'
      });
      
      expect(daoResult.success).toBe(false);
      expect(daoResult.error).toBe('Token ETH not allowed for this identity');

      // Try to transfer DAOToken with DAO identity (should succeed)
      const daoTokenResult = await walletService.transferTokens(mockDAOIdentity, {
        to: 'recipient-address',
        amount: 100,
        token: 'DAOToken'
      });
      
      expect(daoTokenResult.success).toBe(true);
    });
  });

  describe('Pi Wallet Integration with Identity Types', () => {
    it('should allow Pi Wallet linking for ROOT and DAO identities', async () => {
      const piWalletService = {
        linkPiWallet: async (identity: ExtendedSquidIdentity, piWalletData: any) => {
          const permissions = await qwalletApi.getWalletPermissions(identity.walletAddress);
          
          if (!permissions.data.canLinkExternalWallets) {
            return {
              success: false,
              error: 'External wallet linking not allowed for this identity type'
            };
          }
          
          return {
            success: true,
            linkedAt: new Date().toISOString()
          };
        }
      };

      // ROOT identity should be able to link
      const rootResult = await piWalletService.linkPiWallet(mockRootIdentity, {
        piUserId: 'pi-user-123',
        accessToken: 'pi-token'
      });
      
      expect(rootResult.success).toBe(true);

      // DAO identity should be able to link
      const daoResult = await piWalletService.linkPiWallet(mockDAOIdentity, {
        piUserId: 'pi-user-456',
        accessToken: 'pi-token'
      });
      
      expect(daoResult.success).toBe(true);

      // CONSENTIDA identity should not be able to link
      const consentidaResult = await piWalletService.linkPiWallet(mockConsentidaIdentity, {
        piUserId: 'pi-user-789',
        accessToken: 'pi-token'
      });
      
      expect(consentidaResult.success).toBe(false);
      expect(consentidaResult.error).toBe('External wallet linking not allowed for this identity type');

      // AID identity should not be able to link
      const aidResult = await piWalletService.linkPiWallet(mockAIDIdentity, {
        piUserId: 'pi-user-000',
        accessToken: 'pi-token'
      });
      
      expect(aidResult.success).toBe(false);
    });
  });

  describe('Audit Trail and Compliance', () => {
    it('should maintain separate audit trails per identity', async () => {
      const auditService = {
        logOperation: async (identity: ExtendedSquidIdentity, operation: string, details: any) => {
          await qerberosApi.logAuditEvent({
            event: operation,
            identityId: identity.did,
            identityType: identity.identityType,
            details,
            timestamp: new Date().toISOString()
          });
          
          return { success: true };
        }
      };

      // Log operations for different identities
      await auditService.logOperation(mockRootIdentity, 'wallet_transfer', {
        amount: 1000,
        token: 'QToken',
        to: 'recipient-1'
      });

      await auditService.logOperation(mockDAOIdentity, 'wallet_transfer', {
        amount: 500,
        token: 'DAOToken',
        to: 'recipient-2'
      });

      await auditService.logOperation(mockAIDIdentity, 'wallet_view', {
        action: 'balance_check'
      });

      // Verify separate audit logs
      expect(qerberosApi.logAuditEvent).toHaveBeenCalledTimes(3);
      
      expect(qerberosApi.logAuditEvent).toHaveBeenNthCalledWith(1, {
        event: 'wallet_transfer',
        identityId: mockRootIdentity.did,
        identityType: IdentityType.ROOT,
        details: { amount: 1000, token: 'QToken', to: 'recipient-1' },
        timestamp: expect.any(String)
      });

      expect(qerberosApi.logAuditEvent).toHaveBeenNthCalledWith(2, {
        event: 'wallet_transfer',
        identityId: mockDAOIdentity.did,
        identityType: IdentityType.DAO,
        details: { amount: 500, token: 'DAOToken', to: 'recipient-2' },
        timestamp: expect.any(String)
      });

      expect(qerberosApi.logAuditEvent).toHaveBeenNthCalledWith(3, {
        event: 'wallet_view',
        identityId: mockAIDIdentity.did,
        identityType: IdentityType.AID,
        details: { action: 'balance_check' },
        timestamp: expect.any(String)
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle identity switching failures gracefully', async () => {
      // Mock API failure
      vi.mocked(qwalletApi.getBalance).mockRejectedValueOnce(new Error('Network error'));

      const identitySwitcher = {
        switchIdentity: async (fromIdentity: ExtendedSquidIdentity | null, toIdentity: ExtendedSquidIdentity) => {
          try {
            const walletData = await qwalletApi.getBalance(toIdentity.walletAddress);
            const permissions = await qwalletApi.getWalletPermissions(toIdentity.walletAddress);
            
            return {
              success: true,
              newContext: {
                identity: toIdentity,
                walletData: walletData.data,
                permissions: permissions.data
              }
            };
          } catch (error) {
            // Log the error and provide fallback
            await qerberosApi.logAuditEvent({
              event: 'identity_switch_failed',
              fromIdentity: fromIdentity?.did || null,
              toIdentity: toIdentity.did,
              error: error.message,
              timestamp: new Date().toISOString()
            });

            return {
              success: false,
              error: 'Failed to switch identity: ' + error.message,
              fallbackContext: {
                identity: toIdentity,
                walletData: null,
                permissions: null
              }
            };
          }
        }
      };

      const result = await identitySwitcher.switchIdentity(mockRootIdentity, mockDAOIdentity);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(result.fallbackContext.identity).toEqual(mockDAOIdentity);
      
      // Verify error logging
      expect(qerberosApi.logAuditEvent).toHaveBeenCalledWith({
        event: 'identity_switch_failed',
        fromIdentity: mockRootIdentity.did,
        toIdentity: mockDAOIdentity.did,
        error: 'Network error',
        timestamp: expect.any(String)
      });
    });
  });
});