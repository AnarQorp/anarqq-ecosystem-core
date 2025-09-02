/**
 * QwalletDashboard Component Tests
 * 
 * Comprehensive unit tests for the wallet dashboard component
 * covering all identity types and scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import QwalletDashboard from '../QwalletDashboard';
import { useQwallet } from '../../../composables/useQwallet';
import { useSquidContext } from '../../../contexts/SquidContext';
import { IdentityType } from '../../../types/identity';

// Mock dependencies
vi.mock('../../../composables/useQwallet');
vi.mock('../../../contexts/SquidContext');

const mockUseQwallet = vi.mocked(useQwallet);
const mockUseSquidContext = vi.mocked(useSquidContext);

describe('QwalletDashboard', () => {
  const mockWalletData = {
    balances: {
      QToken: 1000,
      PiToken: 500,
      ETH: 0.5
    },
    nfts: [
      {
        id: 'nft-1',
        name: 'Test NFT',
        description: 'Test NFT Description',
        image: 'https://example.com/nft.png',
        tokenId: '1',
        contractAddress: '0x123'
      }
    ],
    transactions: [
      {
        id: 'tx-1',
        type: 'transfer',
        amount: 100,
        token: 'QToken',
        from: 'user1',
        to: 'user2',
        timestamp: '2024-01-01T00:00:00Z',
        status: 'completed'
      }
    ],
    loading: false,
    error: null,
    refreshWalletData: vi.fn(),
    clearError: vi.fn()
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
    mockUseQwallet.mockReturnValue(mockWalletData);
  });

  describe('Basic Rendering', () => {
    it('should render dashboard with wallet data', () => {
      render(<QwalletDashboard />);
      
      expect(screen.getByText('Qwallet Dashboard')).toBeInTheDocument();
      expect(screen.getByText('1,000 QToken')).toBeInTheDocument();
      expect(screen.getByText('500 PiToken')).toBeInTheDocument();
      expect(screen.getByText('0.5 ETH')).toBeInTheDocument();
    });

    it('should display NFT count', () => {
      render(<QwalletDashboard />);
      
      expect(screen.getByText('1 NFT')).toBeInTheDocument();
    });

    it('should display recent transactions', () => {
      render(<QwalletDashboard />);
      
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
      expect(screen.getByText('Transfer')).toBeInTheDocument();
      expect(screen.getByText('100 QToken')).toBeInTheDocument();
    });
  });

  describe('Identity Type Specific Behavior', () => {
    it('should show full access for ROOT identity', () => {
      mockUseSquidContext.mockReturnValue({
        ...mockSquidContext,
        currentSquid: {
          ...mockSquidContext.currentSquid,
          identityType: IdentityType.ROOT
        }
      });

      render(<QwalletDashboard />);
      
      // ROOT should see all features
      expect(screen.getByText('Send Tokens')).toBeInTheDocument();
      expect(screen.getByText('Receive')).toBeInTheDocument();
      expect(screen.getByText('NFT Gallery')).toBeInTheDocument();
    });

    it('should show limited access for CONSENTIDA identity', () => {
      mockUseSquidContext.mockReturnValue({
        ...mockSquidContext,
        currentSquid: {
          ...mockSquidContext.currentSquid,
          identityType: IdentityType.CONSENTIDA
        }
      });

      render(<QwalletDashboard />);
      
      // CONSENTIDA should have view-only access
      expect(screen.queryByText('Send Tokens')).not.toBeInTheDocument();
      expect(screen.getByText('View Only Mode')).toBeInTheDocument();
    });

    it('should show business features for ENTERPRISE identity', () => {
      mockUseSquidContext.mockReturnValue({
        ...mockSquidContext,
        currentSquid: {
          ...mockSquidContext.currentSquid,
          identityType: IdentityType.ENTERPRISE
        }
      });

      render(<QwalletDashboard />);
      
      // ENTERPRISE should see business-specific features
      expect(screen.getByText('Business Tokens Only')).toBeInTheDocument();
    });

    it('should show anonymous mode for AID identity', () => {
      mockUseSquidContext.mockReturnValue({
        ...mockSquidContext,
        currentSquid: {
          ...mockSquidContext.currentSquid,
          identityType: IdentityType.AID
        }
      });

      render(<QwalletDashboard />);
      
      // AID should show anonymous mode
      expect(screen.getByText('Anonymous Mode')).toBeInTheDocument();
      expect(screen.getByText('Single Token Support')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state', () => {
      mockUseQwallet.mockReturnValue({
        ...mockWalletData,
        loading: true
      });

      render(<QwalletDashboard />);
      
      expect(screen.getByText('Loading wallet data...')).toBeInTheDocument();
    });

    it('should show error state', () => {
      const errorMessage = 'Failed to load wallet data';
      mockUseQwallet.mockReturnValue({
        ...mockWalletData,
        error: errorMessage
      });

      render(<QwalletDashboard />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should handle refresh action', async () => {
      const mockRefresh = vi.fn();
      mockUseQwallet.mockReturnValue({
        ...mockWalletData,
        refreshWalletData: mockRefresh
      });

      render(<QwalletDashboard />);
      
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no balances', () => {
      mockUseQwallet.mockReturnValue({
        ...mockWalletData,
        balances: {}
      });

      render(<QwalletDashboard />);
      
      expect(screen.getByText('No tokens found')).toBeInTheDocument();
    });

    it('should show empty state when no NFTs', () => {
      mockUseQwallet.mockReturnValue({
        ...mockWalletData,
        nfts: []
      });

      render(<QwalletDashboard />);
      
      expect(screen.getByText('No NFTs found')).toBeInTheDocument();
    });

    it('should show empty state when no transactions', () => {
      mockUseQwallet.mockReturnValue({
        ...mockWalletData,
        transactions: []
      });

      render(<QwalletDashboard />);
      
      expect(screen.getByText('No recent transactions')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<QwalletDashboard />);
      
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Wallet Dashboard');
      expect(screen.getByRole('button', { name: 'Refresh wallet data' })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<QwalletDashboard />);
      
      const refreshButton = screen.getByRole('button', { name: 'Refresh wallet data' });
      refreshButton.focus();
      expect(refreshButton).toHaveFocus();
    });
  });
});