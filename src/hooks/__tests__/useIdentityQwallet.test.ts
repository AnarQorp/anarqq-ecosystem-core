/**
 * useIdentityQwallet Hook Tests
 * 
 * Comprehensive unit tests for the enhanced identity wallet hook
 * covering all identity types, operations, and edge cases
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useIdentityQwallet } from '../useIdentityQwallet';
import { IdentityType, ExtendedSquidIdentity } from '../../types/identity';

// Mock external dependencies
vi.mock('../../api/qwallet', () => ({
  getBalance: vi.fn(),
  transferTokens: vi.fn(),
  getTransactionHistory: vi.fn(),
  getNFTs: vi.fn(),
  linkPiWallet: vi.fn(),
  unlinkPiWallet: vi.fn(),
  getRiskAssessment: vi.fn(),
  getWalletPermissions: vi.fn()
}));

vi.mock('../../api/qonsent', () => ({
  checkPermission: vi.fn(),
  requestPermission: vi.fn()
}));

vi.mock('../../api/qlock', () => ({
  signTransaction: vi.fn(),
  verifySignature: vi.fn()
}));

vi.mock('../../api/qerberos', () => ({
  logAuditEvent: vi.fn()
}));

import * as qwalletApi from '../../api/qwallet';
import * as qonsentApi from '../../api/qonsent';
import * as qlockApi from '../../api/qlock';
import * as qerberosApi from '../../api/qerberos';

describe('useIdentityQwallet', () => {
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
    displayName: 'DAO User',
    isActive: true,
    permissions: ['wallet:dao_access'],
    walletAddress: 'wallet-dao123',
    qlockKeyPair: {
      publicKey: 'pub-key-dao',
      privateKey: 'priv-key-dao'
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
    
    // Setup default mock responses
    vi.mocked(qwalletApi.getBalance).mockResolvedValue({
      success: true,
      data: { QToken: 1000, PiToken: 500 }
    });
    
    vi.mocked(qwalletApi.getTransactionHistory).mockResolvedValue({
      success: true,
      data: []
    });
    
    vi.mocked(qwalletApi.getNFTs).mockResolvedValue({
      success: true,
      data: []
    });
    
    vi.mocked(qwalletApi.getWalletPermissions).mockResolvedValue({
      success: true,
      data: {
        canTransfer: true,
        canReceive: true,
        dailyLimit: 10000,
        monthlyLimit: 100000
      }
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should initialize with null identity', () => {
      const { result } = renderHook(() => useIdentityQwallet(null));
      
      expect(result.current.state.balances).toBeNull();
      expect(result.current.state.permissions).toBeNull();
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });

    it('should initialize and load data for ROOT identity', async () => {
      const { result } = renderHook(() => useIdentityQwallet(mockRootIdentity));
      
      expect(result.current.state.loading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
        expect(result.current.state.balances).toEqual({ QToken: 1000, PiToken: 500 });
        expect(result.current.state.permissions?.canTransfer).toBe(true);
      });
    });

    it('should handle auto-refresh option', async () => {
      const { result } = renderHook(() => 
        useIdentityQwallet(mockRootIdentity, { autoRefresh: true, refreshInterval: 100 })
      );
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      // Wait for auto-refresh
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(vi.mocked(qwalletApi.getBalance)).toHaveBeenCalledTimes(2);
    });
  });

  describe('Identity Type Specific Behavior', () => {
    it('should handle ROOT identity with full permissions', async () => {
      const { result } = renderHook(() => useIdentityQwallet(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      expect(result.current.state.permissions?.canTransfer).toBe(true);
      expect(result.current.state.permissions?.dailyLimit).toBe(10000);
    });

    it('should handle DAO identity with governance restrictions', async () => {
      vi.mocked(qwalletApi.getWalletPermissions).mockResolvedValue({
        success: true,
        data: {
          canTransfer: true,
          canReceive: true,
          dailyLimit: 5000,
          monthlyLimit: 50000,
          requiresGovernance: true,
          allowedTokens: ['QToken', 'DAOToken']
        }
      });

      const { result } = renderHook(() => useIdentityQwallet(mockDAOIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      expect(result.current.state.permissions?.requiresGovernance).toBe(true);
      expect(result.current.state.permissions?.allowedTokens).toEqual(['QToken', 'DAOToken']);
    });

    it('should handle CONSENTIDA identity with view-only access', async () => {
      vi.mocked(qwalletApi.getWalletPermissions).mockResolvedValue({
        success: true,
        data: {
          canTransfer: false,
          canReceive: true,
          dailyLimit: 100,
          monthlyLimit: 1000,
          requiresGuardianApproval: true
        }
      });

      const { result } = renderHook(() => useIdentityQwallet(mockConsentidaIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      expect(result.current.state.permissions?.canTransfer).toBe(false);
      expect(result.current.state.permissions?.requiresGuardianApproval).toBe(true);
    });

    it('should handle AID identity with anonymous restrictions', async () => {
      vi.mocked(qwalletApi.getWalletPermissions).mockResolvedValue({
        success: true,
        data: {
          canTransfer: true,
          canReceive: true,
          dailyLimit: 1000,
          monthlyLimit: 5000,
          ephemeralSession: true,
          singleTokenOnly: true,
          allowedTokens: ['QToken']
        }
      });

      const { result } = renderHook(() => useIdentityQwallet(mockAIDIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      expect(result.current.state.permissions?.ephemeralSession).toBe(true);
      expect(result.current.state.permissions?.singleTokenOnly).toBe(true);
      expect(result.current.state.permissions?.allowedTokens).toEqual(['QToken']);
    });
  });

  describe('Wallet Operations', () => {
    it('should handle successful token transfer', async () => {
      vi.mocked(qwalletApi.transferTokens).mockResolvedValue({
        success: true,
        data: {
          transactionId: 'tx-123',
          status: 'completed'
        }
      });

      const { result } = renderHook(() => useIdentityQwallet(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      let transferResult;
      await act(async () => {
        transferResult = await result.current.actions.transferTokens({
          to: 'recipient-address',
          amount: 100,
          token: 'QToken'
        });
      });
      
      expect(transferResult.success).toBe(true);
      expect(transferResult.data.transactionId).toBe('tx-123');
      expect(vi.mocked(qonsentApi.checkPermission)).toHaveBeenCalled();
      expect(vi.mocked(qlockApi.signTransaction)).toHaveBeenCalled();
    });

    it('should handle transfer blocked by Qonsent', async () => {
      vi.mocked(qonsentApi.checkPermission).mockResolvedValue(false);

      const { result } = renderHook(() => useIdentityQwallet(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      let transferResult;
      await act(async () => {
        transferResult = await result.current.actions.transferTokens({
          to: 'recipient-address',
          amount: 100,
          token: 'QToken'
        });
      });
      
      expect(transferResult.success).toBe(false);
      expect(transferResult.error).toContain('Permission denied by Qonsent');
      expect(vi.mocked(qwalletApi.transferTokens)).not.toHaveBeenCalled();
    });

    it('should handle Pi Wallet linking', async () => {
      vi.mocked(qwalletApi.linkPiWallet).mockResolvedValue({
        success: true,
        data: { linked: true }
      });

      const { result } = renderHook(() => useIdentityQwallet(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      let linkResult;
      await act(async () => {
        linkResult = await result.current.actions.linkPiWallet({
          piUserId: 'pi-user-123',
          accessToken: 'pi-token'
        });
      });
      
      expect(linkResult.success).toBe(true);
      expect(result.current.state.piWalletStatus?.connected).toBe(true);
    });

    it('should prevent Pi Wallet linking for AID identity', async () => {
      const { result } = renderHook(() => useIdentityQwallet(mockAIDIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      let linkResult;
      await act(async () => {
        linkResult = await result.current.actions.linkPiWallet({
          piUserId: 'pi-user-123',
          accessToken: 'pi-token'
        });
      });
      
      expect(linkResult.success).toBe(false);
      expect(linkResult.error).toContain('Pi Wallet linking not allowed for AID identity');
    });
  });

  describe('Risk Assessment', () => {
    it('should load and update risk assessment', async () => {
      vi.mocked(qwalletApi.getRiskAssessment).mockResolvedValue({
        success: true,
        data: {
          riskLevel: 'MEDIUM',
          factors: [
            { type: 'VELOCITY', severity: 'MEDIUM', description: 'High transaction velocity' }
          ],
          recommendations: ['Consider reducing transaction frequency']
        }
      });

      const { result } = renderHook(() => useIdentityQwallet(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      expect(result.current.state.riskAssessment?.riskLevel).toBe('MEDIUM');
      expect(result.current.state.riskAssessment?.factors).toHaveLength(1);
    });

    it('should handle risk assessment failure gracefully', async () => {
      vi.mocked(qwalletApi.getRiskAssessment).mockRejectedValue(new Error('Risk service unavailable'));

      const { result } = renderHook(() => useIdentityQwallet(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      // Should not fail the entire hook
      expect(result.current.state.balances).toEqual({ QToken: 1000, PiToken: 500 });
      expect(result.current.state.riskAssessment).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(qwalletApi.getBalance).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useIdentityQwallet(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
        expect(result.current.state.error).toBe('Network error');
      });
    });

    it('should clear errors when requested', async () => {
      vi.mocked(qwalletApi.getBalance).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useIdentityQwallet(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.error).toBe('Network error');
      });
      
      act(() => {
        result.current.actions.clearError();
      });
      
      expect(result.current.state.error).toBeNull();
    });

    it('should retry failed operations', async () => {
      vi.mocked(qwalletApi.getBalance)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: { QToken: 1000 }
        });

      const { result } = renderHook(() => useIdentityQwallet(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.error).toBe('Network error');
      });
      
      await act(async () => {
        await result.current.actions.refreshWalletData();
      });
      
      await waitFor(() => {
        expect(result.current.state.error).toBeNull();
        expect(result.current.state.balances).toEqual({ QToken: 1000 });
      });
    });
  });

  describe('Identity Switching', () => {
    it('should handle identity switching', async () => {
      const { result, rerender } = renderHook(
        ({ identity }) => useIdentityQwallet(identity),
        { initialProps: { identity: mockRootIdentity } }
      );
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      // Switch to DAO identity
      rerender({ identity: mockDAOIdentity });
      
      expect(result.current.state.loading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      expect(vi.mocked(qwalletApi.getBalance)).toHaveBeenCalledWith(mockDAOIdentity.walletAddress);
    });

    it('should cleanup on identity switch', async () => {
      const { result, rerender } = renderHook(
        ({ identity }) => useIdentityQwallet(identity, { autoRefresh: true, refreshInterval: 100 }),
        { initialProps: { identity: mockRootIdentity } }
      );
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      // Switch to null identity (logout)
      rerender({ identity: null });
      
      expect(result.current.state.balances).toBeNull();
      expect(result.current.state.permissions).toBeNull();
    });
  });

  describe('Audit Logging', () => {
    it('should log wallet operations to Qerberos', async () => {
      vi.mocked(qwalletApi.transferTokens).mockResolvedValue({
        success: true,
        data: { transactionId: 'tx-123' }
      });

      const { result } = renderHook(() => useIdentityQwallet(mockRootIdentity));
      
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
      
      await act(async () => {
        await result.current.actions.transferTokens({
          to: 'recipient-address',
          amount: 100,
          token: 'QToken'
        });
      });
      
      expect(vi.mocked(qerberosApi.logAuditEvent)).toHaveBeenCalledWith({
        event: 'wallet_transfer',
        identityId: mockRootIdentity.did,
        details: expect.objectContaining({
          amount: 100,
          token: 'QToken',
          to: 'recipient-address'
        })
      });
    });
  });
});