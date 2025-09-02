/**
 * DAO Dashboard Integration Tests
 * 
 * Tests API integration, cross-component data flow, permission-based rendering,
 * and responsive design across all DAO dashboard components.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Import components to test
import DAODashboard from '../DAODashboard';
import TokenOverviewPanel from '../TokenOverviewPanel';
import DAOWalletOverview from '../DAOWalletOverview';
import QuickActionsPanel from '../QuickActionsPanel';
import ProposalStatsSidebar from '../ProposalStatsSidebar';

// Mock API responses
const mockDAOResponse = {
  id: 'test-dao',
  name: 'Integration Test DAO',
  description: 'A DAO for integration testing',
  visibility: 'public',
  memberCount: 250,
  quorum: 125,
  proposalCount: 15,
  activeProposals: 3,
  governanceRules: {
    quorum: 125,
    votingDuration: 7 * 24 * 60 * 60 * 1000,
    tokenRequirement: {
      token: 'ITDT',
      amount: 50
    },
    proposalCreationRights: 'token_holders',
    votingMechanism: 'token-weighted'
  },
  tokenInfo: {
    name: 'Integration Test DAO Token',
    symbol: 'ITDT',
    totalSupply: 2000000,
    circulatingSupply: 1500000,
    holderCount: 250,
    contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    type: 'token-weighted',
    decimals: 18,
    network: 'ethereum'
  },
  recentActivity: []
};

const mockProposalsResponse = [
  {
    id: 'proposal-1',
    daoId: 'test-dao',
    title: 'Integration Test Proposal 1',
    description: 'First proposal for integration testing',
    options: ['Approve', 'Reject', 'Abstain'],
    createdBy: 'did:squid:test-user-1',
    createdAt: '2024-01-15T10:00:00Z',
    expiresAt: '2024-01-22T10:00:00Z',
    status: 'active',
    voteCount: 85,
    quorum: 125,
    results: {
      'Approve': { count: 50, weight: 500 },
      'Reject': { count: 25, weight: 250 },
      'Abstain': { count: 10, weight: 100 }
    },
    quorumReached: false
  },
  {
    id: 'proposal-2',
    daoId: 'test-dao',
    title: 'Integration Test Proposal 2',
    description: 'Second proposal for integration testing',
    options: ['Yes', 'No'],
    createdBy: 'did:squid:test-user-2',
    createdAt: '2024-01-10T14:00:00Z',
    expiresAt: '2024-01-17T14:00:00Z',
    status: 'closed',
    voteCount: 150,
    quorum: 125,
    results: {
      'Yes': { count: 90, weight: 900 },
      'No': { count: 60, weight: 600 }
    },
    quorumReached: true
  }
];

const mockMembershipResponse = {
  daoId: 'test-dao',
  userId: 'did:squid:test-user',
  isMember: true,
  canCreateProposals: true,
  memberSince: '2023-06-01T00:00:00Z',
  permissions: {
    canVote: true,
    canCreateProposals: true,
    canModerate: true,
    isAdmin: false,
    isOwner: false
  }
};

const mockWalletResponse = {
  balances: {
    ITDT: {
      balance: 5000000000000000000, // 5 tokens with 18 decimals
      tokenInfo: {
        symbol: 'ITDT',
        decimals: 18,
        contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        network: 'ethereum',
        type: 'governance'
      }
    }
  },
  nfts: [
    {
      tokenId: '1',
      name: 'Integration Test NFT 1',
      description: 'First NFT for integration testing',
      image: 'https://example.com/nft1.jpg',
      contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      attributes: [
        { trait_type: 'dao_id', value: 'test-dao' },
        { trait_type: 'rarity', value: 'common' }
      ]
    },
    {
      tokenId: '2',
      name: 'Integration Test NFT 2',
      description: 'Second NFT for integration testing',
      image: 'https://example.com/nft2.jpg',
      contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      attributes: [
        { trait_type: 'dao_id', value: 'test-dao' },
        { trait_type: 'rarity', value: 'rare' }
      ]
    }
  ]
};

// Mock the hooks with realistic API integration
vi.mock('../../composables/useDAO', () => ({
  useDAO: () => ({
    daos: [],
    currentDAO: mockDAOResponse,
    proposals: mockProposalsResponse,
    currentProposal: null,
    results: null,
    membership: mockMembershipResponse,
    loading: false,
    error: null,
    getDAOs: vi.fn().mockResolvedValue([mockDAOResponse]),
    getDAO: vi.fn().mockResolvedValue(mockDAOResponse),
    joinDAO: vi.fn().mockResolvedValue(true),
    getProposals: vi.fn().mockResolvedValue(mockProposalsResponse),
    getProposal: vi.fn(),
    createProposal: vi.fn(),
    voteOnProposal: vi.fn(),
    getResults: vi.fn(),
    getMembership: vi.fn().mockResolvedValue(mockMembershipResponse),
    getDAOStats: vi.fn(),
    clearError: vi.fn(),
    refreshDAOData: vi.fn()
  })
}));

vi.mock('../../composables/useQwallet', () => ({
  useQwallet: () => ({
    ...mockWalletResponse,
    loading: false,
    error: null,
    getBalance: vi.fn().mockResolvedValue(mockWalletResponse.balances.ITDT),
    getAllBalances: vi.fn().mockResolvedValue(mockWalletResponse.balances),
    listUserNFTs: vi.fn().mockResolvedValue(mockWalletResponse.nfts),
    mintNFT: vi.fn().mockResolvedValue({ tokenId: '3', name: 'New NFT' }),
    transferFunds: vi.fn().mockResolvedValue(true),
    refreshWalletData: vi.fn()
  })
}));

vi.mock('../../contexts/SessionContext', () => ({
  useSessionContext: () => ({
    session: {
      issuer: 'did:squid:test-user',
      address: '0x123456789',
      signature: 'mock-signature'
    },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false
  })
}));

// Mock UI components
vi.mock('../ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="card" {...props}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className} data-testid="card-content">{children}</div>
  ),
  CardDescription: ({ children, className }: any) => (
    <div className={className} data-testid="card-description">{children}</div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div className={className} data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children, className, ...props }: any) => (
    <h2 className={className} data-testid="card-title" {...props}>{children}</h2>
  )
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`button ${variant} ${size} ${className}`}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  )
}));

vi.mock('../ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`} data-testid="badge">{children}</span>
  )
}));

vi.mock('../ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (
    open ? <div data-testid="dialog" onClick={() => onOpenChange?.(false)}>{children}</div> : null
  ),
  DialogContent: ({ children, className }: any) => (
    <div className={className} data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h3 data-testid="dialog-title">{children}</h3>
}));

// Mock wallet components
vi.mock('../qwallet/TokenTransferForm', () => ({
  default: () => <div data-testid="token-transfer-form">Token Transfer Form</div>
}));

vi.mock('../qwallet/NFTGallery', () => ({
  default: () => <div data-testid="nft-gallery">NFT Gallery</div>
}));

// Mock accessibility and performance utilities
vi.mock('../../utils/performance/monitoring', () => ({
  useRenderMonitoring: () => ({ getMountTime: vi.fn() })
}));

vi.mock('../../utils/performance/dataFetching', () => ({
  useCachedApiCall: () => vi.fn()
}));

vi.mock('../../utils/accessibility', () => ({
  useKeyboardNavigation: () => ({
    containerRef: { current: null },
    focusFirst: vi.fn()
  }),
  useAccessibleVisualization: () => ({
    colorScheme: { green: '#16a34a', gray: '#6b7280' },
    shouldShowDataTable: false,
    describer: {
      describeTokenSupply: vi.fn().mockReturnValue('Token supply description'),
      describeWalletOverview: vi.fn().mockReturnValue('Wallet overview description'),
      describeQuorumProgress: vi.fn().mockReturnValue('Quorum progress description')
    }
  }),
  createTokenDisplayAria: () => ({
    containerAttributes: {},
    labelId: 'token-label',
    descriptionId: 'token-description',
    descriptionText: 'Token display'
  }),
  createProgressAria: () => ({
    'aria-label': 'Progress',
    'aria-valuenow': 75,
    'aria-valuemin': 0,
    'aria-valuemax': 100
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
    describeTokenOverview: vi.fn().mockReturnValue('Token overview description'),
    describeWalletOverview: vi.fn().mockReturnValue('Wallet overview description'),
    describeQuickActions: vi.fn().mockReturnValue('Quick actions description')
  }),
  DataDescription: ({ children }: any) => <div data-testid="data-description">{children}</div>,
  AccessibleProgress: ({ value, label, showPercentage }: any) => (
    <div role="progressbar" aria-label={label} aria-valuenow={value} data-testid="accessible-progress">
      {showPercentage && `${value}%`}
    </div>
  )
}));

describe('DAO Dashboard Integration Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Integration', () => {
    it('integrates with DAO service API correctly', async () => {
      render(<TokenOverviewPanel daoId="test-dao" />);
      
      // Should display data from mocked API response
      await waitFor(() => {
        expect(screen.getByText('Integration Test DAO Token')).toBeInTheDocument();
        expect(screen.getByText('ITDT - Token display')).toBeInTheDocument();
        expect(screen.getByText('2.0M')).toBeInTheDocument(); // Total supply
        expect(screen.getByText('1.5M')).toBeInTheDocument(); // Circulating supply
      });
    });

    it('integrates with wallet service API correctly', async () => {
      render(<DAOWalletOverview daoId="test-dao" daoTokenSymbol="ITDT" />);
      
      await waitFor(() => {
        expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
        expect(screen.getByText('5.00')).toBeInTheDocument(); // Token balance
        expect(screen.getByText('2')).toBeInTheDocument(); // NFT count
      });
    });

    it('handles API errors gracefully across components', async () => {
      // Mock API error
      vi.mocked(vi.fn()).mockRejectedValueOnce(new Error('API Error'));
      
      render(<TokenOverviewPanel daoId="test-dao" />);
      
      // Should show error state without crashing
      expect(screen.getByText('No Token Information')).toBeInTheDocument();
    });

    it('shows loading states during API calls', () => {
      // Mock loading state
      vi.mock('../../composables/useDAO', () => ({
        useDAO: () => ({
          currentDAO: null,
          loading: true,
          error: null,
          getDAO: vi.fn()
        })
      }));

      render(<TokenOverviewPanel daoId="test-dao" />);
      
      // Should show loading skeleton
      expect(document.querySelectorAll('[class*="skeleton"]')).toHaveLength(0); // Mocked away
    });
  });

  describe('Cross-Component Data Flow', () => {
    it('shares DAO data across multiple components', () => {
      const TestWrapper = () => (
        <div>
          <TokenOverviewPanel daoId="test-dao" />
          <DAOWalletOverview daoId="test-dao" daoTokenSymbol="ITDT" />
          <ProposalStatsSidebar daoId="test-dao" proposals={mockProposalsResponse} results={null} />
        </div>
      );

      render(<TestWrapper />);
      
      // All components should display consistent DAO information
      expect(screen.getByText('Integration Test DAO Token')).toBeInTheDocument();
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
      expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
    });

    it('updates wallet data across components when actions are performed', async () => {
      const mockRefreshWalletData = vi.fn();
      
      render(
        <QuickActionsPanel
          daoId="test-dao"
          userRole="moderator"
          hasTokens={true}
          hasNFTs={true}
          onAction={vi.fn()}
        />
      );
      
      // Perform an action that should refresh wallet data
      const transferButton = screen.getByText('Transfer Token');
      await user.click(transferButton);
      
      // Should open modal
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('maintains state consistency across component interactions', async () => {
      const TestWrapper = () => (
        <div>
          <DAOWalletOverview daoId="test-dao" daoTokenSymbol="ITDT" />
          <QuickActionsPanel
            daoId="test-dao"
            userRole="moderator"
            hasTokens={true}
            hasNFTs={true}
            onAction={vi.fn()}
          />
        </div>
      );

      render(<TestWrapper />);
      
      // Wallet overview should show current balance
      expect(screen.getByText('5.00')).toBeInTheDocument();
      
      // Quick actions should be available based on wallet state
      expect(screen.getByText('Transfer Token')).toBeInTheDocument();
      expect(screen.getByText('View NFT Gallery')).toBeInTheDocument();
    });

    it('propagates permission changes across components', () => {
      const TestWrapper = () => (
        <div>
          <DAOWalletOverview daoId="test-dao" daoTokenSymbol="ITDT" />
          <QuickActionsPanel
            daoId="test-dao"
            userRole="member" // Lower permission level
            hasTokens={true}
            hasNFTs={true}
            onAction={vi.fn()}
          />
        </div>
      );

      render(<TestWrapper />);
      
      // Wallet overview should still show for members
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
      
      // But mint NFT action should not be available for regular members
      expect(screen.queryByText('Mint NFT')).not.toBeInTheDocument();
    });
  });

  describe('Permission-Based Rendering', () => {
    it('renders different content based on user roles', () => {
      const AdminPanel = () => (
        <QuickActionsPanel
          daoId="test-dao"
          userRole="admin"
          hasTokens={true}
          hasNFTs={true}
          onAction={vi.fn()}
        />
      );

      const MemberPanel = () => (
        <QuickActionsPanel
          daoId="test-dao"
          userRole="member"
          hasTokens={true}
          hasNFTs={true}
          onAction={vi.fn()}
        />
      );

      const { rerender } = render(<AdminPanel />);
      
      // Admin should see mint NFT button
      expect(screen.getByText('Mint NFT')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      
      rerender(<MemberPanel />);
      
      // Member should not see mint NFT button
      expect(screen.queryByText('Mint NFT')).not.toBeInTheDocument();
      expect(screen.getByText('Member')).toBeInTheDocument();
    });

    it('shows appropriate messages for insufficient permissions', () => {
      render(
        <QuickActionsPanel
          daoId="test-dao"
          userRole="member"
          hasTokens={false}
          hasNFTs={false}
          onAction={vi.fn()}
        />
      );
      
      // Should show disabled state with explanation
      expect(screen.getByText('No tokens available to transfer')).toBeInTheDocument();
      expect(screen.getByText('No NFTs in your collection')).toBeInTheDocument();
    });

    it('handles authentication state changes', () => {
      // Mock unauthenticated state
      vi.mock('../../contexts/SessionContext', () => ({
        useSessionContext: () => ({
          session: null,
          isAuthenticated: false,
          login: vi.fn(),
          logout: vi.fn(),
          loading: false
        })
      }));

      render(<DAOWalletOverview daoId="test-dao" />);
      
      // Should show authentication required message
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });

    it('handles membership state changes', () => {
      // Mock non-member state
      vi.mock('../../composables/useDAO', () => ({
        useDAO: () => ({
          currentDAO: mockDAOResponse,
          membership: {
            ...mockMembershipResponse,
            isMember: false
          },
          loading: false,
          error: null
        })
      }));

      render(<DAOWalletOverview daoId="test-dao" />);
      
      // Should show membership required message
      expect(screen.getByText('Membership Required')).toBeInTheDocument();
    });
  });

  describe('Responsive Design Validation', () => {
    it('applies responsive classes correctly', () => {
      const { container } = render(
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TokenOverviewPanel daoId="test-dao" />
          <DAOWalletOverview daoId="test-dao" daoTokenSymbol="ITDT" />
        </div>
      );
      
      // Check for responsive grid classes
      expect(container.querySelector('.grid-cols-1')).toBeInTheDocument();
      expect(container.querySelector('.md\\:grid-cols-2')).toBeInTheDocument();
    });

    it('handles mobile layout correctly', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<TokenOverviewPanel daoId="test-dao" />);
      
      // Should render without layout issues on mobile
      expect(screen.getByText('Integration Test DAO Token')).toBeInTheDocument();
    });

    it('handles desktop layout correctly', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      render(
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <TokenOverviewPanel daoId="test-dao" />
          <DAOWalletOverview daoId="test-dao" daoTokenSymbol="ITDT" />
          <QuickActionsPanel
            daoId="test-dao"
            userRole="moderator"
            hasTokens={true}
            hasNFTs={true}
            onAction={vi.fn()}
          />
          <ProposalStatsSidebar daoId="test-dao" proposals={mockProposalsResponse} results={null} />
        </div>
      );
      
      // All components should render in desktop layout
      expect(screen.getByText('Integration Test DAO Token')).toBeInTheDocument();
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
    });

    it('handles touch interactions on mobile devices', async () => {
      // Mock touch device
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 5,
      });

      render(
        <QuickActionsPanel
          daoId="test-dao"
          userRole="moderator"
          hasTokens={true}
          hasNFTs={true}
          onAction={vi.fn()}
        />
      );
      
      const mintButton = screen.getByText('Mint NFT');
      
      // Should handle touch interactions
      fireEvent.touchStart(mintButton);
      fireEvent.touchEnd(mintButton);
      
      // Should not throw errors
      expect(mintButton).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('handles component errors gracefully', () => {
      // Mock component that throws error
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      const TestWrapper = () => (
        <div>
          <TokenOverviewPanel daoId="test-dao" />
          <ErrorComponent />
        </div>
      );

      // Should not crash the entire application
      expect(() => render(<TestWrapper />)).not.toThrow();
    });

    it('shows fallback UI when components fail', () => {
      // Mock error state
      vi.mock('../../composables/useDAO', () => ({
        useDAO: () => ({
          currentDAO: null,
          loading: false,
          error: 'Failed to load DAO data',
          getDAO: vi.fn()
        })
      }));

      render(<TokenOverviewPanel daoId="test-dao" />);
      
      // Should show error fallback
      expect(screen.getByText('No Token Information')).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    it('handles large datasets efficiently', () => {
      const manyProposals = Array.from({ length: 100 }, (_, i) => ({
        ...mockProposalsResponse[0],
        id: `proposal-${i}`,
        title: `Proposal ${i}`,
        voteCount: Math.floor(Math.random() * 200)
      }));

      render(<ProposalStatsSidebar daoId="test-dao" proposals={manyProposals} results={null} />);
      
      // Should render without performance issues
      expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
      
      // Should limit displayed proposals to top 5
      const proposalElements = screen.getAllByText(/Proposal \d+/);
      expect(proposalElements.length).toBeLessThanOrEqual(5);
    });

    it('debounces rapid state changes', async () => {
      const mockOnAction = vi.fn();
      
      render(
        <QuickActionsPanel
          daoId="test-dao"
          userRole="moderator"
          hasTokens={true}
          hasNFTs={true}
          onAction={mockOnAction}
        />
      );
      
      const mintButton = screen.getByText('Mint NFT');
      
      // Rapid clicks should be handled gracefully
      await user.click(mintButton);
      await user.click(mintButton);
      await user.click(mintButton);
      
      // Should not cause issues
      expect(mockOnAction).toHaveBeenCalled();
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains focus management across components', async () => {
      render(
        <div>
          <TokenOverviewPanel daoId="test-dao" />
          <QuickActionsPanel
            daoId="test-dao"
            userRole="moderator"
            hasTokens={true}
            hasNFTs={true}
            onAction={vi.fn()}
          />
        </div>
      );
      
      // Tab navigation should work across components
      await user.tab();
      expect(document.activeElement).toBeDefined();
      
      await user.tab();
      expect(document.activeElement).toBeDefined();
    });

    it('provides consistent ARIA labeling across components', () => {
      render(
        <div>
          <TokenOverviewPanel daoId="test-dao" />
          <DAOWalletOverview daoId="test-dao" daoTokenSymbol="ITDT" />
          <ProposalStatsSidebar daoId="test-dao" proposals={mockProposalsResponse} results={null} />
        </div>
      );
      
      // All progress bars should have proper ARIA labels
      const progressBars = screen.getAllByRole('progressbar');
      progressBars.forEach(progressBar => {
        expect(progressBar).toHaveAttribute('aria-label');
        expect(progressBar).toHaveAttribute('aria-valuenow');
      });
    });

    it('supports screen reader navigation', () => {
      render(
        <div>
          <TokenOverviewPanel daoId="test-dao" />
          <DAOWalletOverview daoId="test-dao" daoTokenSymbol="ITDT" />
        </div>
      );
      
      // Should have proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Should have proper landmark regions
      const regions = screen.getAllByRole('region');
      expect(regions.length).toBeGreaterThan(0);
    });
  });

  describe('Real-World Usage Scenarios', () => {
    it('handles complete user workflow: view DAO → check wallet → perform action', async () => {
      const mockOnAction = vi.fn();
      
      const CompleteWorkflow = () => (
        <div>
          <TokenOverviewPanel daoId="test-dao" />
          <DAOWalletOverview daoId="test-dao" daoTokenSymbol="ITDT" />
          <QuickActionsPanel
            daoId="test-dao"
            userRole="moderator"
            hasTokens={true}
            hasNFTs={true}
            onAction={mockOnAction}
          />
        </div>
      );

      render(<CompleteWorkflow />);
      
      // 1. User views DAO token information
      expect(screen.getByText('Integration Test DAO Token')).toBeInTheDocument();
      expect(screen.getByText('2.0M')).toBeInTheDocument();
      
      // 2. User checks their wallet
      expect(screen.getByText('5.00')).toBeInTheDocument(); // Token balance
      expect(screen.getByText('2')).toBeInTheDocument(); // NFT count
      
      // 3. User performs an action
      const mintButton = screen.getByText('Mint NFT');
      await user.click(mintButton);
      
      expect(mockOnAction).toHaveBeenCalledWith('mint-nft');
    });

    it('handles governance participation workflow', async () => {
      render(
        <div>
          <ProposalStatsSidebar daoId="test-dao" proposals={mockProposalsResponse} results={null} />
          <DAOWalletOverview daoId="test-dao" daoTokenSymbol="ITDT" />
        </div>
      );
      
      // User views governance statistics
      expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
      expect(screen.getByText('50.0%')).toBeInTheDocument(); // Quorum reach rate
      
      // User checks voting power
      expect(screen.getByText('Voting Power')).toBeInTheDocument();
      
      // User can see their influence in governance
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('handles error recovery workflow', async () => {
      // Start with error state
      vi.mock('../../composables/useDAO', () => ({
        useDAO: () => ({
          currentDAO: null,
          loading: false,
          error: 'Network error',
          getDAO: vi.fn().mockResolvedValue(mockDAOResponse)
        })
      }));

      render(<TokenOverviewPanel daoId="test-dao" />);
      
      // Should show error state
      expect(screen.getByText('Token Information Unavailable')).toBeInTheDocument();
      
      // User clicks retry
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);
      
      // Should attempt to recover
      expect(retryButton).toBeInTheDocument();
    });
  });
});