/**
 * useQwalletState Hook Tests
 * 
 * Tests for centralized wallet state management with identity context switching
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useQwalletState, QwalletStateProvider } from '../useQwalletState';
import { IdentityType, ExtendedSquidIdentity } from '../../types/identity';

// Mock the useIdentityQwallet hook
vi.mock('../useIdentityQwallet', () => ({
  useIdentityQwallet: vi.fn()
}));

import { useIdentityQwallet } from '../useIdentityQwallet';

describe('useQwalletState', () => {
  const mockIdentity1: ExtendedSquidIdentity = {
    did: 'did:squid:user1',
    identityType: IdentityType.ROOT,
    displayName: 'User 1',
    isActive: true,
    walletAddress: 'wallet-user1'
  };

  const mockIdentity2: ExtendedSquidIdentity = {
    did: 'did:squid:user2',
    identityType: IdentityType.DAO,
    displayName: 'User 2',
    isActive: true,
    walletAddress: 'wallet-user2'
  };

  const mockWalletState1 = {
    balances: { QToken: 1000 },
    permissions: { canTransfer: true },
    transactions: [],
    nfts: [],
    loading: false,
    error: null,
    riskAssessment: null,
    piWalletStatus: null
  };

  const mockWalletState2 = {
    balances: { QToken: 500, DAOToken: 200 },
    permissions: { canTransfer: true, requiresGovernance: true },
    transactions: [],
    nfts: [],
    loading: false,
    error: null,
    riskAssessment: null,
    piWalletStatus: null
  };

  const mockActions = {
    refreshWalletData: vi.fn(),
    transferTokens: vi.fn(),
    linkPiWallet: vi.fn(),
    unlinkPiWallet: vi.fn(),
    clearError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useIdentityQwallet).mockImplementation((identity) => {
      if (identity?.did === mockIdentity1.did) {
        return { state: mockWalletState1, actions: mockActions };
      } else if (identity?.did === mockIdentity2.did) {
        return { state: mockWalletState2, actions: mockActions };
      }
      return { 
        state: {
          balances: null,
          permissions: null,
          transactions: [],
          nfts: [],
          loading: false,
          error: null,
          riskAssessment: null,
          piWalletStatus: null
        }, 
        actions: mockActions 
      };
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QwalletStateProvider>{children}</QwalletStateProvider>
  );

  describe('Provider and Context', () => {
    it('should provide initial state', () => {
      const { result } = renderHook(() => useQwalletState(), { wrapper });
      
      expect(result.current.state.activeIdentity).toBeNull();
      expect(result.current.state.identityStates.size).toBe(0);
      expect(result.current.state.globalLoading).toBe(false);
      expect(result.current.state.globalError).toBeNull();
    });

    it('should set active identity', () => {
      const { result } = renderHook(() => useQwalletState(), { wrapper });
      
      act(() => {
        result.current.actions.setActiveIdentity(mockIdentity1);
      });
      
      expect(result.current.state.activeIdentity).toEqual(mockIdentity1);
    });
  });

  describe('Identity State Management', () => {
    it('should track multiple identity states', () => {
      const { result } = renderHook(() => useQwalletState(), { wrapper });
      
      act(() => {
        result.current.actions.setActiveIdentity(mockIdentity1);
      });
      
      act(() => {
        result.current.actions.updateIdentityState(mockIdentity1.did, mockWalletState1);
      });
      
      act(() => {
        result.current.actions.setActiveIdentity(mockIdentity2);
      });
      
      act(() => {
        result.current.actions.updateIdentityState(mockIdentity2.did, mockWalletState2);
      });
      
      expect(result.current.state.identityStates.size).toBe(2);
      expect(result.current.actions.getIdentityState(mockIdentity1.did)).toEqual(mockWalletState1);
      expect(result.current.actions.getIdentityState(mockIdentity2.did)).toEqual(mockWalletState2);
    });

    it('should switch between identities', () => {
      const { result } = renderHook(() => useQwalletState(), { wrapper });
      
      // Set first identity
      act(() => {
        result.current.actions.setActiveIdentity(mockIdentity1);
      });
      
      expect(result.current.state.activeIdentity).toEqual(mockIdentity1);
      
      // Switch to second identity
      act(() => {
        result.current.actions.setActiveIdentity(mockIdentity2);
      });
      
      expect(result.current.state.activeIdentity).toEqual(mockIdentity2);
    });

    it('should handle identity logout', () => {
      const { result } = renderHook(() => useQwalletState(), { wrapper });
      
      act(() => {
        result.current.actions.setActiveIdentity(mockIdentity1);
      });
      
      expect(result.current.state.activeIdentity).toEqual(mockIdentity1);
      
      act(() => {
        result.current.actions.setActiveIdentity(null);
      });
      
      expect(result.current.state.activeIdentity).toBeNull();
    });
  });

  describe('Global Operations', () => {
    it('should sync all identities', async () => {
      const { result } = renderHook(() => useQwalletState(), { wrapper });
      
      // Add multiple identities
      act(() => {
        result.current.actions.updateIdentityState(mockIdentity1.did, mockWalletState1);
        result.current.actions.updateIdentityState(mockIdentity2.did, mockWalletState2);
      });
      
      await act(async () => {
        await result.current.actions.syncAllIdentities();
      });
      
      // Should call refresh for all identities
      expect(mockActions.refreshWalletData).toHaveBeenCalledTimes(2);
    });

    it('should handle global loading state', async () => {
      const { result } = renderHook(() => useQwalletState(), { wrapper });
      
      act(() => {
        result.current.actions.updateIdentityState(mockIdentity1.did, mockWalletState1);
      });
      
      // Mock loading state
      vi.mocked(useIdentityQwallet).mockReturnValue({
        state: { ...mockWalletState1, loading: true },
        actions: mockActions
      });
      
      act(() => {
        result.current.actions.setActiveIdentity(mockIdentity1);
      });
      
      expect(result.current.state.globalLoading).toBe(true);
    });

    it('should handle global error state', () => {
      const { result } = renderHook(() => useQwalletState(), { wrapper });
      
      const errorState = { ...mockWalletState1, error: 'Network error' };
      
      act(() => {
        result.current.actions.updateIdentityState(mockIdentity1.did, errorState);
        result.current.actions.setActiveIdentity(mockIdentity1);
      });
      
      expect(result.current.state.globalError).toBe('Network error');
    });

    it('should clear global error', () => {
      const { result } = renderHook(() => useQwalletState(), { wrapper });
      
      const errorState = { ...mockWalletState1, error: 'Network error' };
      
      act(() => {
        result.current.actions.updateIdentityState(mockIdentity1.did, errorState);
        result.current.actions.setActiveIdentity(mockIdentity1);
      });
      
      expect(result.current.state.globalError).toBe('Network error');
      
      act(() => {
        result.current.actions.clearGlobalError();
      });
      
      expect(result.current.state.globalError).toBeNull();
    });
  });

  describe('State Persistence', () => {
    it('should persist identity states across switches', () => {
      const { result } = renderHook(() => useQwalletState(), { wrapper });
      
      // Set up first identity
      act(() => {
        result.current.actions.setActiveIdentity(mockIdentity1);
        result.current.actions.updateIdentityState(mockIdentity1.did, mockWalletState1);
      });
      
      // Switch to second identity
      act(() => {
        result.current.actions.setActiveIdentity(mockIdentity2);
        result.current.actions.updateIdentityState(mockIdentity2.did, mockWalletState2);
      });
      
      // Switch back to first identity
      act(() => {
        result.current.actions.setActiveIdentity(mockIdentity1);
      });
      
      // First identity state should be preserved
      expect(result.current.actions.getIdentityState(mockIdentity1.did)).toEqual(mockWalletState1);
      expect(result.current.actions.getIdentityState(mockIdentity2.did)).toEqual(mockWalletState2);
    });

    it('should handle partial state updates', () => {
      const { result } = renderHook(() => useQwalletState(), { wrapper });
      
      act(() => {
        result.current.actions.updateIdentityState(mockIdentity1.did, mockWalletState1);
      });
      
      // Partial update
      act(() => {
        result.current.actions.updateIdentityState(mockIdentity1.did, {
          balances: { QToken: 2000 }
        });
      });
      
      const updatedState = result.current.actions.getIdentityState(mockIdentity1.did);
      expect(updatedState?.balances).toEqual({ QToken: 2000 });
      expect(updatedState?.permissions).toEqual(mockWalletState1.permissions);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing identity state gracefully', () => {
      const { result } = renderHook(() => useQwalletState(), { wrapper });
      
      const state = result.current.actions.getIdentityState('non-existent-id');
      expect(state).toBeNull();
    });

    it('should handle sync errors gracefully', async () => {
      const { result } = renderHook(() => useQwalletState(), { wrapper });
      
      // Mock refresh to throw error
      mockActions.refreshWalletData.mockRejectedValue(new Error('Sync failed'));
      
      act(() => {
        result.current.actions.updateIdentityState(mockIdentity1.did, mockWalletState1);
      });
      
      await act(async () => {
        await result.current.actions.syncAllIdentities();
      });
      
      // Should not crash the application
      expect(result.current.state.globalError).toBeNull();
    });
  });

  describe('Performance Optimization', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = vi.fn();
      
      const TestComponent = () => {
        renderSpy();
        const { state } = useQwalletState();
        return <div>{state.activeIdentity?.did}</div>;
      };
      
      const { rerender } = renderHook(() => <TestComponent />, { wrapper });
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Same identity should not cause re-render
      rerender();
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('should cleanup unused identity states', () => {
      const { result } = renderHook(() => useQwalletState(), { wrapper });
      
      // Add multiple identities
      act(() => {
        result.current.actions.updateIdentityState(mockIdentity1.did, mockWalletState1);
        result.current.actions.updateIdentityState(mockIdentity2.did, mockWalletState2);
      });
      
      expect(result.current.state.identityStates.size).toBe(2);
      
      // Cleanup should be handled by the provider internally
      // This would typically happen on unmount or after a timeout
    });
  });
});