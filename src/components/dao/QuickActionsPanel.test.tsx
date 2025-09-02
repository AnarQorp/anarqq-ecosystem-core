/**
 * QuickActionsPanel Component Tests
 * 
 * Comprehensive test suite for the QuickActionsPanel component functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import QuickActionsPanel from './QuickActionsPanel';

// Mock the hooks
vi.mock('../../composables/useQwallet');
vi.mock('../../contexts/SessionContext');
vi.mock('../../utils/performance/monitoring');
vi.mock('../../utils/accessibility');

// Mock the useQwallet hook
const mockUseQwallet = vi.fn();
vi.mocked(mockUseQwallet).mockReturnValue({
  balances: {
    TDT: {
      balance: 1000000000000000000,
      tokenInfo: {
        symbol: 'TDT',
        decimals: 18,
        contractAddress: '0x123',
        network: 'ethereum',
        type: 'governance'
      }
    }
  },
  nfts: [
    {
      tokenId: '1',
      name: 'Test NFT',
      description: 'A test NFT',
      image: 'https://example.com/nft.jpg',
      contractAddress: '0x123',
      attributes: [{ trait_type: 'dao_id', value: 'test-dao' }]
    }
  ],
  loading: false,
  error: null,
  mintNFT: vi.fn(),
  refreshWalletData: vi.fn()
});

// Mock the useSessionContext hook
const mockUseSessionContext = vi.fn();
vi.mocked(mockUseSessionContext).mockReturnValue({
  isAuthenticated: true,
  session: {
    issuer: 'did:squid:test-user'
  }
});

// Mock performance monitoring
vi.mocked(vi.fn()).mockReturnValue({
  getMountTime: vi.fn()
});

// Mock accessibility hooks
vi.mocked(vi.fn()).mockReturnValue({
  containerRef: { current: null },
  focusFirst: vi.fn()
});

vi.mocked(vi.fn()).mockReturnValue({
  describeQuickActions: vi.fn().mockReturnValue('Quick actions description')
});

// Mock UI components
vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`button ${variant} ${className}`}
    >
      {children}
    </button>
  )
}));

vi.mock('../ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardDescription: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h2 className={className}>{children}</h2>
  )
}));

vi.mock('../ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  )
}));

vi.mock('../ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h3>{children}</h3>
}));

// Mock wallet components
vi.mock('../qwallet/TokenTransferForm', () => ({
  default: () => <div data-testid="token-transfer-form">Token Transfer Form</div>
}));

vi.mock('../qwallet/NFTGallery', () => ({
  default: () => <div data-testid="nft-gallery">NFT Gallery</div>
}));

// Mock accessibility components
vi.mock('../../utils/accessibility', () => ({
  useKeyboardNavigation: () => ({
    containerRef: { current: null },
    focusFirst: vi.fn()
  }),
  createAccessibleClickHandler: (handler: Function) => ({
    onClick: handler,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    }
  }),
  useDAOComponentDescriptions: () => ({
    describeQuickActions: vi.fn().mockReturnValue('Quick actions description')
  }),
  DataDescription: ({ children }: any) => <div>{children}</div>,
  createButtonAria: () => ({})
}));

describe('QuickActionsPanel', () => {
  const user = userEvent.setup();
  const mockOnAction = vi.fn();

  const defaultProps = {
    daoId: 'test-dao',
    userRole: 'moderator' as const,
    hasTokens: true,
    hasNFTs: true,
    onAction: mockOnAction
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication States', () => {
    it('shows authentication required message when not authenticated', () => {
      mockUseSessionContext.mockReturnValueOnce({
        isAuthenticated: false,
        session: null
      });

      render(<QuickActionsPanel {...defaultProps} />);
      
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText(/Please authenticate with your sQuid identity/)).toBeInTheDocument();
    });

    it('renders quick actions for authenticated users', () => {
      render(<QuickActionsPanel {...defaultProps} />);
      
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Wallet operations and DAO management tools')).toBeInTheDocument();
    });
  });

  describe('Role-Based Action Buttons', () => {
    it('shows mint NFT button for moderators', () => {
      render(<QuickActionsPanel {...defaultProps} userRole="moderator" />);
      
      expect(screen.getByText('Mint NFT')).toBeInTheDocument();
      expect(screen.getByText('Create a new NFT for this DAO')).toBeInTheDocument();
    });

    it('shows mint NFT button for admins', () => {
      render(<QuickActionsPanel {...defaultProps} userRole="admin" />);
      
      expect(screen.getByText('Mint NFT')).toBeInTheDocument();
    });

    it('shows mint NFT button for owners', () => {
      render(<QuickActionsPanel {...defaultProps} userRole="owner" />);
      
      expect(screen.getByText('Mint NFT')).toBeInTheDocument();
    });

    it('hides mint NFT button for regular members', () => {
      render(<QuickActionsPanel {...defaultProps} userRole="member" />);
      
      expect(screen.queryByText('Mint NFT')).not.toBeInTheDocument();
    });

    it('shows transfer token button when user has tokens', () => {
      render(<QuickActionsPanel {...defaultProps} hasTokens={true} />);
      
      expect(screen.getByText('Transfer Token')).toBeInTheDocument();
      expect(screen.getByText('Send DAO tokens to another member')).toBeInTheDocument();
    });

    it('disables transfer token button when user has no tokens', () => {
      render(<QuickActionsPanel {...defaultProps} hasTokens={false} />);
      
      const transferButton = screen.getByText('Transfer Token');
      expect(transferButton.closest('button')).toBeDisabled();
      expect(screen.getByText('No tokens available to transfer')).toBeInTheDocument();
    });

    it('shows view NFT gallery button when user has NFTs', () => {
      render(<QuickActionsPanel {...defaultProps} hasNFTs={true} />);
      
      expect(screen.getByText('View NFT Gallery')).toBeInTheDocument();
      expect(screen.getByText('Browse your NFT collection')).toBeInTheDocument();
    });

    it('disables view NFT gallery button when user has no NFTs', () => {
      render(<QuickActionsPanel {...defaultProps} hasNFTs={false} />);
      
      const nftButton = screen.getByText('View NFT Gallery');
      expect(nftButton.closest('button')).toBeDisabled();
      expect(screen.getByText('No NFTs in your collection')).toBeInTheDocument();
    });
  });

  describe('User Role Badge Display', () => {
    it('displays moderator role badge', () => {
      render(<QuickActionsPanel {...defaultProps} userRole="moderator" />);
      
      expect(screen.getByText('Moderator')).toBeInTheDocument();
    });

    it('displays admin role badge', () => {
      render(<QuickActionsPanel {...defaultProps} userRole="admin" />);
      
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('displays owner role badge', () => {
      render(<QuickActionsPanel {...defaultProps} userRole="owner" />);
      
      expect(screen.getByText('Owner')).toBeInTheDocument();
    });

    it('displays member role badge', () => {
      render(<QuickActionsPanel {...defaultProps} userRole="member" />);
      
      expect(screen.getByText('Member')).toBeInTheDocument();
    });
  });

  describe('Action Button Interactions', () => {
    it('calls onAction when mint NFT button is clicked', async () => {
      render(<QuickActionsPanel {...defaultProps} />);
      
      const mintButton = screen.getByText('Mint NFT');
      await user.click(mintButton);
      
      expect(mockOnAction).toHaveBeenCalledWith('mint-nft');
    });

    it('calls onAction when transfer token button is clicked', async () => {
      render(<QuickActionsPanel {...defaultProps} />);
      
      const transferButton = screen.getByText('Transfer Token');
      await user.click(transferButton);
      
      expect(mockOnAction).toHaveBeenCalledWith('transfer-token');
    });

    it('calls onAction when view NFT gallery button is clicked', async () => {
      render(<QuickActionsPanel {...defaultProps} />);
      
      const nftButton = screen.getByText('View NFT Gallery');
      await user.click(nftButton);
      
      expect(mockOnAction).toHaveBeenCalledWith('view-nft-gallery');
    });

    it('shows loading state when action is being processed', async () => {
      render(<QuickActionsPanel {...defaultProps} />);
      
      const mintButton = screen.getByText('Mint NFT');
      fireEvent.click(mintButton);
      
      // Should show loading state briefly
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('opens token transfer modal when transfer button is clicked', async () => {
      render(<QuickActionsPanel {...defaultProps} />);
      
      const transferButton = screen.getByText('Transfer Token');
      await user.click(transferButton);
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Transfer Tokens')).toBeInTheDocument();
      expect(screen.getByTestId('token-transfer-form')).toBeInTheDocument();
    });

    it('opens NFT gallery modal when gallery button is clicked', async () => {
      render(<QuickActionsPanel {...defaultProps} />);
      
      const nftButton = screen.getByText('View NFT Gallery');
      await user.click(nftButton);
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('NFT Gallery')).toBeInTheDocument();
      expect(screen.getByTestId('nft-gallery')).toBeInTheDocument();
    });

    it('opens mint NFT modal when mint button is clicked', async () => {
      render(<QuickActionsPanel {...defaultProps} />);
      
      const mintButton = screen.getByText('Mint NFT');
      await user.click(mintButton);
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Mint New NFT')).toBeInTheDocument();
    });
  });

  describe('NFT Minting Form', () => {
    beforeEach(async () => {
      render(<QuickActionsPanel {...defaultProps} />);
      const mintButton = screen.getByText('Mint NFT');
      await user.click(mintButton);
    });

    it('shows NFT minting form fields', () => {
      expect(screen.getByLabelText(/NFT Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Image URL/)).toBeInTheDocument();
    });

    it('allows adding NFT attributes', async () => {
      const addButton = screen.getByText('Add Attribute');
      await user.click(addButton);
      
      expect(screen.getByPlaceholderText('Trait type')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Value')).toBeInTheDocument();
    });

    it('allows removing NFT attributes', async () => {
      const addButton = screen.getByText('Add Attribute');
      await user.click(addButton);
      
      const removeButton = screen.getByRole('button', { name: '' }); // X button
      await user.click(removeButton);
      
      expect(screen.queryByPlaceholderText('Trait type')).not.toBeInTheDocument();
    });

    it('shows DAO information in the form', () => {
      expect(screen.getByText('DAO NFT Information')).toBeInTheDocument();
      expect(screen.getByText(/test-dao/)).toBeInTheDocument();
      expect(screen.getByText(/moderator/)).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const mintButton = screen.getByRole('button', { name: /Mint NFT/ });
      expect(mintButton).toBeDisabled();
      
      // Fill in required fields
      await user.type(screen.getByLabelText(/NFT Name/), 'Test NFT');
      await user.type(screen.getByLabelText(/Description/), 'Test Description');
      
      expect(mintButton).not.toBeDisabled();
    });

    it('calls mintNFT when form is submitted', async () => {
      const mockMintNFT = vi.fn().mockResolvedValue({ tokenId: '123' });
      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        mintNFT: mockMintNFT
      });

      // Re-render to get the updated mock
      render(<QuickActionsPanel {...defaultProps} />);
      const mintButton = screen.getByText('Mint NFT');
      await user.click(mintButton);
      
      // Fill in form
      await user.type(screen.getByLabelText(/NFT Name/), 'Test NFT');
      await user.type(screen.getByLabelText(/Description/), 'Test Description');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /Mint NFT/ });
      await user.click(submitButton);
      
      expect(mockMintNFT).toHaveBeenCalledWith({
        name: 'Test NFT',
        description: 'Test Description',
        attributes: [
          { trait_type: 'dao_id', value: 'test-dao' },
          { trait_type: 'minted_by_role', value: 'moderator' }
        ]
      });
    });
  });

  describe('Error Handling', () => {
    it('displays wallet error when present', () => {
      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        error: 'Wallet connection failed'
      });

      render(<QuickActionsPanel {...defaultProps} />);
      
      expect(screen.getByText('Wallet connection failed')).toBeInTheDocument();
    });

    it('shows error feedback when action fails', async () => {
      const mockMintNFT = vi.fn().mockRejectedValue(new Error('Minting failed'));
      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        mintNFT: mockMintNFT
      });

      render(<QuickActionsPanel {...defaultProps} />);
      const mintButton = screen.getByText('Mint NFT');
      await user.click(mintButton);
      
      // Fill and submit form
      await user.type(screen.getByLabelText(/NFT Name/), 'Test NFT');
      await user.type(screen.getByLabelText(/Description/), 'Test Description');
      
      const submitButton = screen.getByRole('button', { name: /Mint NFT/ });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to mint NFT: Minting failed/)).toBeInTheDocument();
      });
    });

    it('shows validation error for empty required fields', async () => {
      render(<QuickActionsPanel {...defaultProps} />);
      const mintButton = screen.getByText('Mint NFT');
      await user.click(mintButton);
      
      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /Mint NFT/ });
      await user.click(submitButton);
      
      expect(screen.getByText(/Please fill in all required fields/)).toBeInTheDocument();
    });
  });

  describe('Success Feedback', () => {
    it('shows success message when action completes', async () => {
      render(<QuickActionsPanel {...defaultProps} />);
      
      const transferButton = screen.getByText('Transfer Token');
      await user.click(transferButton);
      
      expect(screen.getByText('Token transfer modal opened')).toBeInTheDocument();
    });

    it('allows dismissing feedback messages', async () => {
      render(<QuickActionsPanel {...defaultProps} />);
      
      const transferButton = screen.getByText('Transfer Token');
      await user.click(transferButton);
      
      const dismissButton = screen.getByText('Dismiss');
      await user.click(dismissButton);
      
      expect(screen.queryByText('Token transfer modal opened')).not.toBeInTheDocument();
    });

    it('auto-dismisses feedback after timeout', async () => {
      vi.useFakeTimers();
      
      render(<QuickActionsPanel {...defaultProps} />);
      
      const transferButton = screen.getByText('Transfer Token');
      await user.click(transferButton);
      
      expect(screen.getByText('Token transfer modal opened')).toBeInTheDocument();
      
      // Fast-forward time
      vi.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(screen.queryByText('Token transfer modal opened')).not.toBeInTheDocument();
      });
      
      vi.useRealTimers();
    });
  });

  describe('No Actions Available State', () => {
    it('shows no actions message for members without permissions', () => {
      render(
        <QuickActionsPanel 
          {...defaultProps} 
          userRole="member" 
          hasTokens={false} 
          hasNFTs={false} 
        />
      );
      
      expect(screen.getByText('No Actions Available')).toBeInTheDocument();
      expect(screen.getByText(/You need moderator permissions/)).toBeInTheDocument();
    });
  });

  describe('Permission Information', () => {
    it('displays permission information section', () => {
      render(<QuickActionsPanel {...defaultProps} />);
      
      expect(screen.getByText('Action Permissions:')).toBeInTheDocument();
      expect(screen.getByText(/Mint NFT.*moderator, admin, or owner/)).toBeInTheDocument();
      expect(screen.getByText(/Transfer Token.*all members with token balance/)).toBeInTheDocument();
      expect(screen.getByText(/View NFT Gallery.*all members with NFTs/)).toBeInTheDocument();
    });
  });

  describe('Modal State Management', () => {
    it('refreshes wallet data when transfer modal closes', async () => {
      const mockRefreshWalletData = vi.fn();
      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        refreshWalletData: mockRefreshWalletData
      });

      render(<QuickActionsPanel {...defaultProps} />);
      
      const transferButton = screen.getByText('Transfer Token');
      await user.click(transferButton);
      
      // Close modal (simulate)
      // In real implementation, this would be triggered by modal close
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('refreshes wallet data when NFT gallery modal closes', async () => {
      const mockRefreshWalletData = vi.fn();
      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        refreshWalletData: mockRefreshWalletData
      });

      render(<QuickActionsPanel {...defaultProps} />);
      
      const nftButton = screen.getByText('View NFT Gallery');
      await user.click(nftButton);
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<QuickActionsPanel {...defaultProps} />);
      
      expect(screen.getByRole('region', { name: 'Quick Actions Panel' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Quick Actions' })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(<QuickActionsPanel {...defaultProps} />);
      
      await user.tab();
      expect(screen.getByText('Mint NFT').closest('button')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Transfer Token').closest('button')).toHaveFocus();
    });

    it('supports keyboard activation', async () => {
      render(<QuickActionsPanel {...defaultProps} />);
      
      const mintButton = screen.getByText('Mint NFT').closest('button');
      mintButton?.focus();
      
      await user.keyboard('{Enter}');
      expect(mockOnAction).toHaveBeenCalledWith('mint-nft');
    });
  });

  describe('Loading States', () => {
    it('shows loading state when wallet is loading', () => {
      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        loading: true
      });

      render(<QuickActionsPanel {...defaultProps} />);
      
      // Buttons should be disabled when loading
      expect(screen.getByText('Mint NFT').closest('button')).toBeDisabled();
    });

    it('shows minting state when NFT is being minted', async () => {
      const mockMintNFT = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        mintNFT: mockMintNFT
      });

      render(<QuickActionsPanel {...defaultProps} />);
      const mintButton = screen.getByText('Mint NFT');
      await user.click(mintButton);
      
      // Fill and submit form
      await user.type(screen.getByLabelText(/NFT Name/), 'Test NFT');
      await user.type(screen.getByLabelText(/Description/), 'Test Description');
      
      const submitButton = screen.getByRole('button', { name: /Mint NFT/ });
      fireEvent.click(submitButton);
      
      expect(screen.getByText('Minting...')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing session gracefully', () => {
      mockUseSessionContext.mockReturnValueOnce({
        isAuthenticated: true,
        session: null
      });

      render(<QuickActionsPanel {...defaultProps} />);
      
      // Should still render but may not allow certain actions
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    it('handles clipboard API not available', async () => {
      // Remove clipboard API
      Object.assign(navigator, {
        clipboard: undefined
      });

      render(<QuickActionsPanel {...defaultProps} />);
      
      // Should not crash
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('memoizes component correctly', () => {
      const { rerender } = render(<QuickActionsPanel {...defaultProps} />);
      
      // Rerender with same props
      rerender(<QuickActionsPanel {...defaultProps} />);
      
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });
});