/**
 * Qwallet End-to-End Tests
 * 
 * Complete user journey tests covering all wallet operations
 * across different identity types and scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { IdentityType, ExtendedSquidIdentity } from '../../types/identity';

// Mock all external services
vi.mock('../../api/qwallet');
vi.mock('../../api/qonsent');
vi.mock('../../api/qlock');
vi.mock('../../api/qerberos');
vi.mock('../../api/qindex');
vi.mock('../../hooks/useIdentityQwallet');
vi.mock('../../contexts/SquidContext');

import QwalletDashboard from '../../components/qwallet/QwalletDashboard';
import TokenTransferForm from '../../components/qwallet/TokenTransferForm';
import PiWalletInterface from '../../components/qwallet/PiWalletInterface';
import NFTGallery from '../../components/qwallet/NFTGallery';
import { useIdentityQwallet } from '../../hooks/useIdentityQwallet';
import { useSquidContext } from '../../contexts/SquidContext';
import * as qwalletApi from '../../api/qwallet';
import * as qonsentApi from '../../api/qonsent';
import * as qlockApi from '../../api/qlock';
import * as qerberosApi from '../../api/qerberos';

describe('Qwallet End-to-End Tests', () => {
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

  const mockWalletData = {
    state: {
      balances: {
        QToken: 5000,
        PiToken: 2500,
        ETH: 1.5
      },
      nfts: [
        {
          id: 'nft-1',
          name: 'Cool NFT',
          description: 'A very cool NFT',
          image: 'https://example.com/nft1.png',
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
          from: 'wallet-root123',
          to: 'wallet-dao123',
          timestamp: '2024-01-01T00:00:00Z',
          status: 'completed'
        }
      ],
      permissions: {
        canTransfer: true,
        canReceive: true,
        dailyLimit: 10000,
        monthlyLimit: 100000,
        allowedTokens: ['QToken', 'PiToken', 'ETH'],
        canLinkExternalWallets: true
      },
      piWalletStatus: {
        connected: false,
        piUserId: null,
        linkedAt: null
      },
      loading: false,
      error: null
    },
    actions: {
      transferTokens: vi.fn(),
      linkPiWallet: vi.fn(),
      unlinkPiWallet: vi.fn(),
      refreshWalletData: vi.fn(),
      clearError: vi.fn()
    }
  };

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <MemoryRouter>
      {children}
    </MemoryRouter>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(useSquidContext).mockReturnValue({
      currentSquid: mockRootIdentity
    });
    
    vi.mocked(useIdentityQwallet).mockReturnValue(mockWalletData);
    
    vi.mocked(qwalletApi.getBalance).mockResolvedValue({
      success: true,
      data: mockWalletData.state.balances
    });
    
    vi.mocked(qwalletApi.transferTokens).mockResolvedValue({
      success: true,
      data: { transactionId: 'tx-new-123' }
    });
    
    vi.mocked(qwalletApi.linkPiWallet).mockResolvedValue({
      success: true,
      data: { piUserId: 'pi-user-123', linkedAt: '2024-01-01T00:00:00Z' }
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

  describe('Complete Wallet Journey - ROOT Identity', () => {
    it('should complete full wallet workflow from dashboard to transfer', async () => {
      // Step 1: Render dashboard and verify initial state
      render(
        <TestWrapper>
          <QwalletDashboard />
        </TestWrapper>
      );
      
      expect(screen.getByText('Qwallet Dashboard')).toBeInTheDocument();
      expect(screen.getByText('5,000 QToken')).toBeInTheDocument();
      expect(screen.getByText('2,500 PiToken')).toBeInTheDocument();
      expect(screen.getByText('1.5 ETH')).toBeInTheDocument();
      
      // Step 2: Navigate to transfer form
      const transferButton = screen.getByRole('button', { name: 'Send Tokens' });
      fireEvent.click(transferButton);
      
      // Step 3: Fill out transfer form
      render(
        <TestWrapper>
          <TokenTransferForm />
        </TestWrapper>
      );
      
      const recipientInput = screen.getByLabelText('Recipient Address');
      const amountInput = screen.getByLabelText('Amount');
      const tokenSelect = screen.getByLabelText('Token');
      const submitButton = screen.getByRole('button', { name: 'Transfer' });
      
      fireEvent.change(recipientInput, { 
        target: { value: '0x1234567890123456789012345678901234567890' } 
      });
      fireEvent.change(amountInput, { target: { value: '500' } });
      fireEvent.change(tokenSelect, { target: { value: 'QToken' } });
      
      // Step 4: Execute transfer
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockWalletData.actions.transferTokens).toHaveBeenCalledWith({
          to: '0x1234567890123456789012345678901234567890',
          amount: 500,
          token: 'QToken'
        });
      });
      
      // Step 5: Verify success message
      expect(screen.getByText(/Transfer successful/)).toBeInTheDocument();
    });

    it('should complete Pi Wallet integration workflow', async () => {
      // Step 1: Render Pi Wallet interface
      render(
        <TestWrapper>
          <PiWalletInterface />
        </TestWrapper>
      );
      
      expect(screen.getByText('Pi Wallet Integration')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Connect Pi Wallet' })).toBeInTheDocument();
      
      // Step 2: Connect Pi Wallet
      const connectButton = screen.getByRole('button', { name: 'Connect Pi Wallet' });
      fireEvent.click(connectButton);
      
      await waitFor(() => {
        expect(mockWalletData.actions.linkPiWallet).toHaveBeenCalled();
      });
      
      // Step 3: Verify connected state
      vi.mocked(useIdentityQwallet).mockReturnValue({
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
      
      render(
        <TestWrapper>
          <PiWalletInterface />
        </TestWrapper>
      );
      
      expect(screen.getByText('Pi Wallet Connected')).toBeInTheDocument();
      expect(screen.getByText('User ID: pi-user-123')).toBeInTheDocument();
    });

    it('should complete NFT viewing and transfer workflow', async () => {
      // Step 1: Render NFT gallery
      render(
        <TestWrapper>
          <NFTGallery />
        </TestWrapper>
      );
      
      expect(screen.getByText('NFT Gallery')).toBeInTheDocument();
      expect(screen.getByText('Cool NFT')).toBeInTheDocument();
      
      // Step 2: Open NFT details
      const nftCard = screen.getByTestId('nft-card-nft-1');
      fireEvent.click(nftCard);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('NFT Details')).toBeInTheDocument();
      
      // Step 3: Initiate NFT transfer
      const transferNFTButton = screen.getByRole('button', { name: 'Transfer NFT' });
      fireEvent.click(transferNFTButton);
      
      // Step 4: Fill transfer form
      const nftRecipientInput = screen.getByLabelText('Recipient Address');
      const confirmTransferButton = screen.getByRole('button', { name: 'Confirm Transfer' });
      
      fireEvent.change(nftRecipientInput, { 
        target: { value: '0x9876543210987654321098765432109876543210' } 
      });
      fireEvent.click(confirmTransferButton);
      
      await waitFor(() => {
        expect(mockWalletData.actions.transferNFT).toHaveBeenCalledWith({
          nftId: 'nft-1',
          to: '0x9876543210987654321098765432109876543210'
        });
      });
    });
  });

  describe('Identity-Specific Workflows', () => {
    it('should handle DAO identity workflow with governance restrictions', async () => {
      // Setup DAO identity context
      vi.mocked(useSquidContext).mockReturnValue({
        currentSquid: mockDAOIdentity
      });
      
      vi.mocked(useIdentityQwallet).mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          permissions: {
            ...mockWalletData.state.permissions,
            requiresGovernance: true,
            dailyLimit: 5000,
            allowedTokens: ['QToken', 'DAOToken']
          }
        }
      });
      
      render(
        <TestWrapper>
          <QwalletDashboard />
        </TestWrapper>
      );
      
      // Should show DAO-specific features
      expect(screen.getByText('DAO Member')).toBeInTheDocument();
      expect(screen.getByText(/governance approval/)).toBeInTheDocument();
      
      // Test transfer with governance warning
      render(
        <TestWrapper>
          <TokenTransferForm />
        </TestWrapper>
      );
      
      expect(screen.getByText('Large transfers may require governance approval')).toBeInTheDocument();
      
      // Should only show allowed tokens
      const tokenSelect = screen.getByLabelText('Token');
      fireEvent.click(tokenSelect);
      
      expect(screen.getByText('QToken')).toBeInTheDocument();
      expect(screen.getByText('DAOToken')).toBeInTheDocument();
      expect(screen.queryByText('ETH')).not.toBeInTheDocument();
    });

    it('should handle CONSENTIDA identity with view-only restrictions', async () => {
      // Setup CONSENTIDA identity context
      vi.mocked(useSquidContext).mockReturnValue({
        currentSquid: mockConsentidaIdentity
      });
      
      vi.mocked(useIdentityQwallet).mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          permissions: {
            ...mockWalletData.state.permissions,
            canTransfer: false,
            canLinkExternalWallets: false,
            requiresGuardianApproval: true
          }
        }
      });
      
      render(
        <TestWrapper>
          <QwalletDashboard />
        </TestWrapper>
      );
      
      // Should show view-only mode
      expect(screen.getByText('View Only Mode')).toBeInTheDocument();
      expect(screen.queryByText('Send Tokens')).not.toBeInTheDocument();
      
      // Transfer form should be disabled
      render(
        <TestWrapper>
          <TokenTransferForm />
        </TestWrapper>
      );
      
      expect(screen.getByText('Transfers not allowed for this identity type')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Transfer' })).toBeDisabled();
      
      // Pi Wallet linking should be disabled
      render(
        <TestWrapper>
          <PiWalletInterface />
        </TestWrapper>
      );
      
      expect(screen.getByText('Pi Wallet linking not available for minor accounts')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Connect Pi Wallet' })).toBeDisabled();
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle network errors gracefully throughout the workflow', async () => {
      // Simulate network error
      vi.mocked(qwalletApi.getBalance).mockRejectedValue(new Error('Network error'));
      
      vi.mocked(useIdentityQwallet).mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          error: 'Network error',
          loading: false
        }
      });
      
      render(
        <TestWrapper>
          <QwalletDashboard />
        </TestWrapper>
      );
      
      // Should show error state
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      
      // Test error recovery
      const retryButton = screen.getByRole('button', { name: 'Retry' });
      fireEvent.click(retryButton);
      
      expect(mockWalletData.actions.clearError).toHaveBeenCalled();
      expect(mockWalletData.actions.refreshWalletData).toHaveBeenCalled();
    });

    it('should handle transfer failures with proper user feedback', async () => {
      // Setup transfer failure
      mockWalletData.actions.transferTokens.mockResolvedValue({
        success: false,
        error: 'Insufficient funds'
      });
      
      render(
        <TestWrapper>
          <TokenTransferForm />
        </TestWrapper>
      );
      
      // Fill and submit form
      const recipientInput = screen.getByLabelText('Recipient Address');
      const amountInput = screen.getByLabelText('Amount');
      const submitButton = screen.getByRole('button', { name: 'Transfer' });
      
      fireEvent.change(recipientInput, { 
        target: { value: '0x1234567890123456789012345678901234567890' } 
      });
      fireEvent.change(amountInput, { target: { value: '10000' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Transfer failed: Insufficient funds')).toBeInTheDocument();
      });
      
      // Should provide retry option
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    });

    it('should handle Qonsent permission denials', async () => {
      // Setup Qonsent denial
      vi.mocked(qonsentApi.checkPermission).mockResolvedValue(false);
      
      mockWalletData.actions.transferTokens.mockResolvedValue({
        success: false,
        error: 'Permission denied by Qonsent'
      });
      
      render(
        <TestWrapper>
          <TokenTransferForm />
        </TestWrapper>
      );
      
      // Fill and submit form
      const recipientInput = screen.getByLabelText('Recipient Address');
      const amountInput = screen.getByLabelText('Amount');
      const submitButton = screen.getByRole('button', { name: 'Transfer' });
      
      fireEvent.change(recipientInput, { 
        target: { value: '0x1234567890123456789012345678901234567890' } 
      });
      fireEvent.change(amountInput, { target: { value: '100' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Transfer failed: Permission denied by Qonsent')).toBeInTheDocument();
      });
      
      // Should provide option to request permission
      expect(screen.getByRole('button', { name: 'Request Permission' })).toBeInTheDocument();
    });
  });

  describe('Multi-Component Integration', () => {
    it('should maintain state consistency across components', async () => {
      // Render dashboard
      const { rerender } = render(
        <TestWrapper>
          <QwalletDashboard />
        </TestWrapper>
      );
      
      expect(screen.getByText('5,000 QToken')).toBeInTheDocument();
      
      // Simulate successful transfer
      mockWalletData.actions.transferTokens.mockResolvedValue({
        success: true,
        data: { transactionId: 'tx-123' }
      });
      
      // Update wallet data to reflect transfer
      const updatedWalletData = {
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          balances: {
            ...mockWalletData.state.balances,
            QToken: 4500 // Reduced by 500
          }
        }
      };
      
      vi.mocked(useIdentityQwallet).mockReturnValue(updatedWalletData);
      
      // Re-render dashboard
      rerender(
        <TestWrapper>
          <QwalletDashboard />
        </TestWrapper>
      );
      
      // Should show updated balance
      expect(screen.getByText('4,500 QToken')).toBeInTheDocument();
    });

    it('should handle identity switching across all components', async () => {
      // Start with ROOT identity
      const { rerender } = render(
        <TestWrapper>
          <QwalletDashboard />
        </TestWrapper>
      );
      
      expect(screen.getByText('Send Tokens')).toBeInTheDocument();
      
      // Switch to CONSENTIDA identity
      vi.mocked(useSquidContext).mockReturnValue({
        currentSquid: mockConsentidaIdentity
      });
      
      vi.mocked(useIdentityQwallet).mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          permissions: {
            ...mockWalletData.state.permissions,
            canTransfer: false
          }
        }
      });
      
      rerender(
        <TestWrapper>
          <QwalletDashboard />
        </TestWrapper>
      );
      
      // Should hide transfer functionality
      expect(screen.queryByText('Send Tokens')).not.toBeInTheDocument();
      expect(screen.getByText('View Only Mode')).toBeInTheDocument();
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large transaction history
      const largeTransactionHistory = Array.from({ length: 1000 }, (_, i) => ({
        id: `tx-${i}`,
        type: 'transfer',
        amount: Math.floor(Math.random() * 1000),
        token: 'QToken',
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
        status: 'completed'
      }));
      
      vi.mocked(useIdentityQwallet).mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          transactions: largeTransactionHistory
        }
      });
      
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <QwalletDashboard />
        </TestWrapper>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time
      expect(renderTime).toBeLessThan(1000); // Less than 1 second
      
      // Should show transaction count
      expect(screen.getByText('1,000 transactions')).toBeInTheDocument();
    });

    it('should provide loading states for async operations', async () => {
      // Setup loading state
      vi.mocked(useIdentityQwallet).mockReturnValue({
        ...mockWalletData,
        state: {
          ...mockWalletData.state,
          loading: true
        }
      });
      
      render(
        <TestWrapper>
          <QwalletDashboard />
        </TestWrapper>
      );
      
      expect(screen.getByText('Loading wallet data...')).toBeInTheDocument();
      
      // Should show loading indicators for specific operations
      expect(screen.getByTestId('balance-loading')).toBeInTheDocument();
      expect(screen.getByTestId('transactions-loading')).toBeInTheDocument();
    });
  });
});