/**
 * PiWalletInterface Component Tests
 * 
 * Comprehensive unit tests for the Pi Wallet integration interface
 * covering linking, unlinking, and identity-specific restrictions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PiWalletInterface from '../PiWalletInterface';
import { useIdentityQwallet } from '../../../hooks/useIdentityQwallet';
import { useSquidContext } from '../../../contexts/SquidContext';
import { IdentityType } from '../../../types/identity';

// Mock dependencies
vi.mock('../../../hooks/useIdentityQwallet');
vi.mock('../../../contexts/SquidContext');

const mockUseIdentityQwallet = vi.mocked(useIdentityQwallet);
const mockUseSquidContext = vi.mocked(useSquidContext);

describe('PiWalletInterface', () => {
  const mockLinkPiWallet = vi.fn();
  const mockUnlinkPiWallet = vi.fn();
  
  const mockWalletData = {
    state: {
      piWalletStatus: {
        connected: false,
        piUserId: null,
        linkedAt: null
      },
      permissions: {
        canLinkExternalWallets: true
      },
      loading: false,
      error: null
    },
    actions: {
      linkPiWallet: mockLinkPiWallet,
      unlinkPiWallet: mockUnlinkPiWallet,
      clearError: vi.fn()
    }
  };

  const mockSquidContext = {
    currentSquid: {
      did: 'did:squid:test123',
      identityType: IdentityType.ROOT,
      displayName: 'Test User',
      isActive: true
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSquidContext.mockReturnValue(mockSquidContext);
    mockUseIdentityQwallet.mockReturnValue(mockWalletData);
  });

  describe('Initial State', () => {
    it('should render Pi Wallet interface when not connected', () => {
      render(<PiWalletInterface />);
      
      expect(screen.getByText('Pi Wallet Integration')).toBeInTheDocument();
      expect(screen.getByText('Connect your Pi Wallet to enable cross-platform transactions')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Connect Pi Wallet' })).toBeInTheDocument();
    });

    it('should show connected state when Pi Wallet is linked', () => {
      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          piWalletStatus: {
            connected: true,
            piUserId: 'pi-user-123',
            linkedAt: '2024-01-01T00:00:00Z'
          }
        }
      });

      render(<PiWalletInterface />);
      
      expect(screen.getByText('Pi Wallet Connected')).toBeInTheDocument();
      expect(screen.getByText('User ID: pi-user-123')).toBeInTheDocument();
      expect(screen.getByText('Connected on: 1/1/2024')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Disconnect Pi Wallet' })).toBeInTheDocument();
    });
  });

  describe('Identity Type Restrictions', () => {
    it('should disable Pi Wallet linking for CONSENTIDA identity', () => {
      mockUseSquidContext.mockReturnValue({
        ...mockSquidContext,
        currentSquid: {
          ...mockSquidContext.currentSquid,
          identityType: IdentityType.CONSENTIDA
        }
      });

      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          permissions: {
            canLinkExternalWallets: false
          }
        }
      });

      render(<PiWalletInterface />);
      
      expect(screen.getByText('Pi Wallet linking not available for minor accounts')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Connect Pi Wallet' })).toBeDisabled();
    });

    it('should disable Pi Wallet linking for AID identity', () => {
      mockUseSquidContext.mockReturnValue({
        ...mockSquidContext,
        currentSquid: {
          ...mockSquidContext.currentSquid,
          identityType: IdentityType.AID
        }
      });

      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          permissions: {
            canLinkExternalWallets: false
          }
        }
      });

      render(<PiWalletInterface />);
      
      expect(screen.getByText('Pi Wallet linking not available for anonymous identities')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Connect Pi Wallet' })).toBeDisabled();
    });

    it('should allow Pi Wallet linking for ROOT identity', () => {
      render(<PiWalletInterface />);
      
      expect(screen.getByRole('button', { name: 'Connect Pi Wallet' })).toBeEnabled();
      expect(screen.queryByText(/not available/)).not.toBeInTheDocument();
    });

    it('should allow Pi Wallet linking for DAO identity', () => {
      mockUseSquidContext.mockReturnValue({
        ...mockSquidContext,
        currentSquid: {
          ...mockSquidContext.currentSquid,
          identityType: IdentityType.DAO
        }
      });

      render(<PiWalletInterface />);
      
      expect(screen.getByRole('button', { name: 'Connect Pi Wallet' })).toBeEnabled();
      expect(screen.queryByText(/not available/)).not.toBeInTheDocument();
    });

    it('should allow Pi Wallet linking for ENTERPRISE identity', () => {
      mockUseSquidContext.mockReturnValue({
        ...mockSquidContext,
        currentSquid: {
          ...mockSquidContext.currentSquid,
          identityType: IdentityType.ENTERPRISE
        }
      });

      render(<PiWalletInterface />);
      
      expect(screen.getByRole('button', { name: 'Connect Pi Wallet' })).toBeEnabled();
      expect(screen.queryByText(/not available/)).not.toBeInTheDocument();
    });
  });

  describe('Pi Wallet Linking', () => {
    it('should handle successful Pi Wallet linking', async () => {
      mockLinkPiWallet.mockResolvedValue({
        success: true,
        data: {
          piUserId: 'pi-user-123',
          linkedAt: '2024-01-01T00:00:00Z'
        }
      });

      render(<PiWalletInterface />);
      
      const connectButton = screen.getByRole('button', { name: 'Connect Pi Wallet' });
      fireEvent.click(connectButton);
      
      await waitFor(() => {
        expect(mockLinkPiWallet).toHaveBeenCalled();
      });
      
      expect(screen.getByText('Pi Wallet connected successfully!')).toBeInTheDocument();
    });

    it('should handle Pi Wallet linking failure', async () => {
      mockLinkPiWallet.mockResolvedValue({
        success: false,
        error: 'Failed to connect to Pi Network'
      });

      render(<PiWalletInterface />);
      
      const connectButton = screen.getByRole('button', { name: 'Connect Pi Wallet' });
      fireEvent.click(connectButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to connect Pi Wallet: Failed to connect to Pi Network')).toBeInTheDocument();
      });
    });

    it('should show loading state during linking', async () => {
      mockLinkPiWallet.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<PiWalletInterface />);
      
      const connectButton = screen.getByRole('button', { name: 'Connect Pi Wallet' });
      fireEvent.click(connectButton);
      
      expect(screen.getByText('Connecting to Pi Wallet...')).toBeInTheDocument();
      expect(connectButton).toBeDisabled();
    });
  });

  describe('Pi Wallet Unlinking', () => {
    beforeEach(() => {
      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          piWalletStatus: {
            connected: true,
            piUserId: 'pi-user-123',
            linkedAt: '2024-01-01T00:00:00Z'
          }
        }
      });
    });

    it('should handle successful Pi Wallet unlinking', async () => {
      mockUnlinkPiWallet.mockResolvedValue({
        success: true
      });

      render(<PiWalletInterface />);
      
      const disconnectButton = screen.getByRole('button', { name: 'Disconnect Pi Wallet' });
      fireEvent.click(disconnectButton);
      
      // Should show confirmation dialog
      expect(screen.getByText('Are you sure you want to disconnect your Pi Wallet?')).toBeInTheDocument();
      
      const confirmButton = screen.getByRole('button', { name: 'Confirm Disconnect' });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockUnlinkPiWallet).toHaveBeenCalled();
      });
      
      expect(screen.getByText('Pi Wallet disconnected successfully!')).toBeInTheDocument();
    });

    it('should handle Pi Wallet unlinking failure', async () => {
      mockUnlinkPiWallet.mockResolvedValue({
        success: false,
        error: 'Failed to disconnect from Pi Network'
      });

      render(<PiWalletInterface />);
      
      const disconnectButton = screen.getByRole('button', { name: 'Disconnect Pi Wallet' });
      fireEvent.click(disconnectButton);
      
      const confirmButton = screen.getByRole('button', { name: 'Confirm Disconnect' });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to disconnect Pi Wallet: Failed to disconnect from Pi Network')).toBeInTheDocument();
      });
    });

    it('should allow canceling disconnection', () => {
      render(<PiWalletInterface />);
      
      const disconnectButton = screen.getByRole('button', { name: 'Disconnect Pi Wallet' });
      fireEvent.click(disconnectButton);
      
      expect(screen.getByText('Are you sure you want to disconnect your Pi Wallet?')).toBeInTheDocument();
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);
      
      expect(screen.queryByText('Are you sure you want to disconnect your Pi Wallet?')).not.toBeInTheDocument();
      expect(mockUnlinkPiWallet).not.toHaveBeenCalled();
    });
  });

  describe('Pi Wallet Features', () => {
    beforeEach(() => {
      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          piWalletStatus: {
            connected: true,
            piUserId: 'pi-user-123',
            linkedAt: '2024-01-01T00:00:00Z'
          }
        }
      });
    });

    it('should show Pi token balance when connected', () => {
      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          balances: {
            PiToken: 1000
          },
          piWalletStatus: {
            connected: true,
            piUserId: 'pi-user-123',
            linkedAt: '2024-01-01T00:00:00Z'
          }
        }
      });

      render(<PiWalletInterface />);
      
      expect(screen.getByText('Pi Balance: 1,000 π')).toBeInTheDocument();
    });

    it('should show Pi transfer options when connected', () => {
      render(<PiWalletInterface />);
      
      expect(screen.getByRole('button', { name: 'Transfer Pi Tokens' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sync Pi Balance' })).toBeInTheDocument();
    });

    it('should display Pi Wallet transaction history', () => {
      render(<PiWalletInterface />);
      
      expect(screen.getByText('Pi Wallet Transactions')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View Pi Transaction History' })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display wallet errors', () => {
      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          error: 'Pi Network connection failed'
        }
      });

      render(<PiWalletInterface />);
      
      expect(screen.getByText('Pi Network connection failed')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry Connection' })).toBeInTheDocument();
    });

    it('should clear errors when retry is clicked', () => {
      const mockClearError = vi.fn();
      mockUseIdentityQwallet.mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          error: 'Pi Network connection failed'
        },
        actions: {
          ...mockWalletData.actions,
          clearError: mockClearError
        }
      });

      render(<PiWalletInterface />);
      
      const retryButton = screen.getByRole('button', { name: 'Retry Connection' });
      fireEvent.click(retryButton);
      
      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<PiWalletInterface />);
      
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Pi Wallet Integration');
      expect(screen.getByRole('button', { name: 'Connect Pi Wallet' })).toHaveAttribute('aria-describedby');
    });

    it('should support keyboard navigation', () => {
      render(<PiWalletInterface />);
      
      const connectButton = screen.getByRole('button', { name: 'Connect Pi Wallet' });
      connectButton.focus();
      expect(connectButton).toHaveFocus();
    });

    it('should announce status changes to screen readers', async () => {
      mockLinkPiWallet.mockResolvedValue({
        success: true,
        data: {
          piUserId: 'pi-user-123',
          linkedAt: '2024-01-01T00:00:00Z'
        }
      });

      render(<PiWalletInterface />);
      
      const connectButton = screen.getByRole('button', { name: 'Connect Pi Wallet' });
      fireEvent.click(connectButton);
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Pi Wallet connected successfully!');
      });
    });
  });
});