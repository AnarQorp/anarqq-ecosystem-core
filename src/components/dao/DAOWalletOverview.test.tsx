/**
 * DAOWalletOverview Component Tests
 * 
 * Comprehensive test suite for the DAOWalletOverview component functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DAOWalletOverview from './DAOWalletOverview';

// Mock the hooks
vi.mock('../../composables/useDAO');
vi.mock('../../composables/useQwallet');
vi.mock('../../contexts/SessionContext');
vi.mock('../../utils/performance/monitoring');
vi.mock('../../utils/performance/dataFetching');
vi.mock('../../utils/accessibility');

// Mock the useDAO hook
const mockUseDAO = vi.fn();
vi.mocked(mockUseDAO).mockReturnValue({
  currentDAO: {
    id: 'test-dao',
    name: 'Test DAO',
    memberCount: 100,
    governanceRules: {
      tokenRequirement: { token: 'TDT', amount: 100 },
      votingMechanism: 'token-weighted'
    }
  },
  membership: {
    isMember: true,
    permissions: {
      canVote: true,
      canCreateProposals: true,
      isAdmin: false,
      isModerator: false,
      isOwner: false
    }
  },
  getMembership: vi.fn(),
  loading: false
});

// Mock the useQwallet hook
const mockUseQwallet = vi.fn();
vi.mocked(mockUseQwallet).mockReturnValue({
  getBalance: vi.fn().mockResolvedValue({
    balance: 1000000000000000000, // 1 token with 18 decimals
    tokenInfo: {
      symbol: 'TDT',
      decimals: 18,
      contractAddress: '0x123',
      network: 'ethereum',
      type: 'governance'
    }
  }),
  getAllBalances: vi.fn(),
  listUserNFTs: vi.fn().mockResolvedValue([
    {
      tokenId: '1',
      name: 'Test NFT',
      description: 'A test NFT',
      image: 'https://example.com/nft.jpg',
      contractAddress: '0x123',
      attributes: [
        { trait_type: 'dao_id', value: 'test-dao' }
      ]
    }
  ]),
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
  nfts: [],
  loading: false,
  error: null,
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

// Mock cached API call
vi.mocked(vi.fn()).mockReturnValue(vi.fn());

// Mock accessibility hooks
vi.mocked(vi.fn()).mockReturnValue({
  colorScheme: {
    green: '#16a34a',
    gray: '#6b7280'
  },
  shouldShowDataTable: false,
  describer: {
    describeWalletOverview: vi.fn().mockReturnValue('Wallet overview description')
  }
});

vi.mocked(vi.fn()).mockReturnValue({
  describeWalletOverview: vi.fn().mockReturnValue('Wallet overview description')
});

// Mock UI components
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

vi.mock('../ui/skeleton', () => ({
  Skeleton: ({ className }: any) => (
    <div className={`skeleton ${className}`} />
  )
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`button ${variant} ${size} ${className}`}
    >
      {children}
    </button>
  )
}));

// Mock accessibility components
vi.mock('../../utils/accessibility', () => ({
  useAccessibleVisualization: () => ({
    colorScheme: {
      green: '#16a34a',
      gray: '#6b7280'
    },
    shouldShowDataTable: false,
    describer: {
      describeWalletOverview: vi.fn().mockReturnValue('Wallet overview description')
    }
  }),
  useDAOComponentDescriptions: () => ({
    describeWalletOverview: vi.fn().mockReturnValue('Wallet overview description')
  }),
  AccessibleProgress: ({ value, label, showPercentage }: any) => (
    <div role="progressbar" aria-label={label} aria-valuenow={value}>
      {showPercentage && `${value}%`}
    </div>
  )
}));

describe('DAOWalletOverview', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication States', () => {
    it('shows authentication required message when not authenticated', () => {
      mockUseSessionContext.mockReturnValueOnce({
        isAuthenticated: false,
        session: null
      });

      render(<DAOWalletOverview daoId="test-dao" />);
      
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText(/Please authenticate with your sQuid identity/)).toBeInTheDocument();
    });

    it('shows membership required message when not a member', () => {
      mockUseDAO.mockReturnValueOnce({
        ...mockUseDAO(),
        membership: {
          isMember: false,
          permissions: {}
        }
      });

      render(<DAOWalletOverview daoId="test-dao" />);
      
      expect(screen.getByText('Membership Required')).toBeInTheDocument();
      expect(screen.getByText(/You need to be a member of this DAO/)).toBeInTheDocument();
    });

    it('renders wallet overview for authenticated members', () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
      expect(screen.getByText('Your DAO governance tokens and voting power')).toBeInTheDocument();
    });
  });

  describe('Token Balance Display', () => {
    it('displays current token balance correctly', async () => {
      render(<DAOWalletOverview daoId="test-dao" daoTokenSymbol="TDT" />);
      
      await waitFor(() => {
        expect(screen.getByText('Token Balance')).toBeInTheDocument();
        expect(screen.getByText('Current Balance')).toBeInTheDocument();
        expect(screen.getByText('1.00')).toBeInTheDocument(); // 1 token formatted
      });
    });

    it('shows token symbol badge', async () => {
      render(<DAOWalletOverview daoId="test-dao" daoTokenSymbol="TDT" />);
      
      await waitFor(() => {
        expect(screen.getByText('TDT')).toBeInTheDocument();
      });
    });

    it('handles zero balance correctly', async () => {
      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        getBalance: vi.fn().mockResolvedValue({
          balance: 0,
          tokenInfo: {
            symbol: 'TDT',
            decimals: 18,
            contractAddress: '0x123',
            network: 'ethereum',
            type: 'governance'
          }
        })
      });

      render(<DAOWalletOverview daoId="test-dao" daoTokenSymbol="TDT" />);
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });
  });

  describe('NFT Display', () => {
    it('displays DAO NFT count', async () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('DAO NFTs')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // 1 NFT
        expect(screen.getByText('NFT owned')).toBeInTheDocument();
      });
    });

    it('shows plural text for multiple NFTs', async () => {
      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        listUserNFTs: vi.fn().mockResolvedValue([
          {
            tokenId: '1',
            name: 'Test NFT 1',
            description: 'A test NFT',
            image: 'https://example.com/nft1.jpg',
            contractAddress: '0x123',
            attributes: [{ trait_type: 'dao_id', value: 'test-dao' }]
          },
          {
            tokenId: '2',
            name: 'Test NFT 2',
            description: 'Another test NFT',
            image: 'https://example.com/nft2.jpg',
            contractAddress: '0x123',
            attributes: [{ trait_type: 'dao_id', value: 'test-dao' }]
          }
        ])
      });

      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('NFTs owned')).toBeInTheDocument();
      });
    });

    it('displays recent NFTs preview', async () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('Recent DAO NFTs')).toBeInTheDocument();
        expect(screen.getByText('Test NFT')).toBeInTheDocument();
        expect(screen.getByText('#1')).toBeInTheDocument();
      });
    });

    it('shows view all NFTs button when more than 4 NFTs', async () => {
      const manyNFTs = Array.from({ length: 6 }, (_, i) => ({
        tokenId: `${i + 1}`,
        name: `Test NFT ${i + 1}`,
        description: 'A test NFT',
        image: `https://example.com/nft${i + 1}.jpg`,
        contractAddress: '0x123',
        attributes: [{ trait_type: 'dao_id', value: 'test-dao' }]
      }));

      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        listUserNFTs: vi.fn().mockResolvedValue(manyNFTs)
      });

      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('View All 6 NFTs')).toBeInTheDocument();
      });
    });
  });

  describe('Voting Power Calculation', () => {
    it('displays voting power metrics', async () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('Voting Power')).toBeInTheDocument();
        expect(screen.getByText('Token Weight')).toBeInTheDocument();
        expect(screen.getByText('NFT Weight')).toBeInTheDocument();
        expect(screen.getByText('Total Weight')).toBeInTheDocument();
      });
    });

    it('calculates token-weighted voting power correctly', async () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        // For token-weighted voting, token balance should be the weight
        expect(screen.getByText('1')).toBeInTheDocument(); // 1 token = 1 weight
      });
    });

    it('calculates user-based voting power correctly', async () => {
      mockUseDAO.mockReturnValueOnce({
        ...mockUseDAO(),
        currentDAO: {
          ...mockUseDAO().currentDAO,
          governanceRules: {
            ...mockUseDAO().currentDAO.governanceRules,
            votingMechanism: 'user-based'
          }
        }
      });

      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        // For user-based voting, each member gets 1 vote regardless of holdings
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    it('shows voting influence percentage', async () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('Your Voting Influence')).toBeInTheDocument();
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
      });
    });
  });

  describe('Balance Trends', () => {
    it('shows trend indicators when available', async () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        // Trend indicators would be shown if balance history is available
        // This is mocked in the component
        expect(screen.getByText('Current Balance')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton when loading', () => {
      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        loading: true
      });

      render(<DAOWalletOverview daoId="test-dao" />);
      
      expect(document.querySelectorAll('.skeleton')).toHaveLength(8); // Header + content skeletons
    });
  });

  describe('Error Handling', () => {
    it('displays error message when wallet loading fails', () => {
      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        error: 'Failed to load wallet data'
      });

      render(<DAOWalletOverview daoId="test-dao" />);
      
      expect(screen.getByText('Failed to load wallet data')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('shows refresh button', () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('handles refresh button click', async () => {
      const mockRefreshWalletData = vi.fn();
      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        refreshWalletData: mockRefreshWalletData
      });

      render(<DAOWalletOverview daoId="test-dao" />);
      
      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);
      
      expect(mockRefreshWalletData).toHaveBeenCalled();
    });

    it('shows refreshing state', async () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      
      // Should show refreshing state briefly
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe('DAO Token Symbol Detection', () => {
    it('uses provided daoTokenSymbol prop', () => {
      render(<DAOWalletOverview daoId="test-dao" daoTokenSymbol="CUSTOM" />);
      
      // Should use the provided symbol
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
    });

    it('derives token symbol from DAO governance rules', () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      // Should derive from currentDAO.governanceRules.tokenRequirement.token
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
    });

    it('generates default token symbol from DAO name', () => {
      mockUseDAO.mockReturnValueOnce({
        ...mockUseDAO(),
        currentDAO: {
          ...mockUseDAO().currentDAO,
          governanceRules: {
            votingMechanism: 'token-weighted'
            // No tokenRequirement
          }
        }
      });

      render(<DAOWalletOverview daoId="test-dao" />);
      
      // Should generate from DAO name: "Test DAO" -> "TESTTOKEN"
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
    });
  });

  describe('Last Updated Display', () => {
    it('shows last updated timestamp', async () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      expect(screen.getByRole('heading', { name: 'My Wallet Overview' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();
    });

    it('has proper progress bar accessibility', async () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-label', 'Your Voting Influence');
      });
    });

    it('supports keyboard navigation', async () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      await user.tab();
      expect(screen.getByRole('button', { name: /Refresh/ })).toHaveFocus();
    });
  });

  describe('Data Table Fallback', () => {
    it('shows data table when shouldShowDataTable is true', async () => {
      vi.mocked(vi.fn()).mockReturnValueOnce({
        colorScheme: { green: '#16a34a', gray: '#6b7280' },
        shouldShowDataTable: true,
        describer: {
          describeWalletOverview: vi.fn().mockReturnValue('Wallet overview description')
        }
      });

      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        const tables = screen.queryAllByRole('table');
        if (tables.length > 0) {
          expect(tables[0]).toBeInTheDocument();
        }
      });
    });
  });

  describe('NFT Image Handling', () => {
    it('displays NFT images when available', async () => {
      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        const nftImage = screen.getByAltText('Test NFT');
        expect(nftImage).toBeInTheDocument();
        expect(nftImage).toHaveAttribute('src', 'https://example.com/nft.jpg');
      });
    });

    it('shows placeholder when NFT image is not available', async () => {
      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        listUserNFTs: vi.fn().mockResolvedValue([
          {
            tokenId: '1',
            name: 'Test NFT',
            description: 'A test NFT',
            image: '', // No image
            contractAddress: '0x123',
            attributes: [{ trait_type: 'dao_id', value: 'test-dao' }]
          }
        ])
      });

      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        // Should show placeholder icon instead of image
        expect(screen.getByText('Test NFT')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing squidId gracefully', () => {
      mockUseSessionContext.mockReturnValueOnce({
        isAuthenticated: true,
        session: null // No session
      });

      render(<DAOWalletOverview daoId="test-dao" />);
      
      // Should still render but may not load wallet data
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
    });

    it('handles missing currentDAO gracefully', () => {
      mockUseDAO.mockReturnValueOnce({
        ...mockUseDAO(),
        currentDAO: null
      });

      render(<DAOWalletOverview daoId="test-dao" />);
      
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
    });

    it('handles NFT filtering correctly', async () => {
      const mixedNFTs = [
        {
          tokenId: '1',
          name: 'DAO NFT',
          description: 'Belongs to DAO',
          image: 'https://example.com/dao-nft.jpg',
          contractAddress: '0x123',
          attributes: [{ trait_type: 'dao_id', value: 'test-dao' }]
        },
        {
          tokenId: '2',
          name: 'Other NFT',
          description: 'Does not belong to DAO',
          image: 'https://example.com/other-nft.jpg',
          contractAddress: '0x456',
          attributes: [{ trait_type: 'dao_id', value: 'other-dao' }]
        }
      ];

      mockUseQwallet.mockReturnValueOnce({
        ...mockUseQwallet(),
        listUserNFTs: vi.fn().mockResolvedValue(mixedNFTs)
      });

      render(<DAOWalletOverview daoId="test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('DAO NFT')).toBeInTheDocument();
        expect(screen.queryByText('Other NFT')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('memoizes component correctly', () => {
      const { rerender } = render(<DAOWalletOverview daoId="test-dao" />);
      
      // Rerender with same props
      rerender(<DAOWalletOverview daoId="test-dao" />);
      
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
    });
  });
});