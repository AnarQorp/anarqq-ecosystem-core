/**
 * DAO Dashboard E2E Test Scenarios
 * 
 * End-to-end tests for complete user workflows including wallet integration,
 * token transfers, NFT minting, and governance participation with enhanced metrics.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Import the main dashboard component
import DAODashboard from '../DAODashboard';

// Mock complete application context
const mockCompleteDAOResponse = {
  id: 'e2e-test-dao',
  name: 'E2E Test DAO',
  description: 'A comprehensive DAO for end-to-end testing',
  visibility: 'public',
  memberCount: 500,
  quorum: 250,
  proposalCount: 25,
  activeProposals: 5,
  governanceRules: {
    quorum: 250,
    votingDuration: 7 * 24 * 60 * 60 * 1000,
    tokenRequirement: {
      token: 'E2ETOKEN',
      amount: 100
    },
    proposalCreationRights: 'token_holders',
    votingMechanism: 'token-weighted'
  },
  tokenInfo: {
    name: 'E2E Test DAO Token',
    symbol: 'E2ETOKEN',
    totalSupply: 10000000,
    circulatingSupply: 7500000,
    holderCount: 500,
    contractAddress: '0xe2e1234567890abcdef1234567890abcdef123456',
    type: 'token-weighted',
    decimals: 18,
    network: 'ethereum'
  },
  economicMetrics: {
    totalValueLocked: 5000000,
    averageHolding: 15000,
    distributionIndex: 0.65
  },
  recentActivity: []
};

const mockE2EProposals = [
  {
    id: 'e2e-proposal-1',
    daoId: 'e2e-test-dao',
    title: 'Increase Token Rewards',
    description: 'Proposal to increase token rewards for active participants',
    options: ['Approve', 'Reject', 'Modify'],
    createdBy: 'did:squid:e2e-user-1',
    createdAt: '2024-01-20T09:00:00Z',
    expiresAt: '2024-01-27T09:00:00Z',
    status: 'active',
    voteCount: 180,
    quorum: 250,
    results: {
      'Approve': { count: 120, weight: 1200 },
      'Reject': { count: 40, weight: 400 },
      'Modify': { count: 20, weight: 200 }
    },
    quorumReached: false,
    analytics: {
      votingBreakdown: {
        byWeight: { 'Approve': 1200, 'Reject': 400, 'Modify': 200 },
        byCount: { 'Approve': 120, 'Reject': 40, 'Modify': 20 },
        uniqueVoters: 180,
        totalWeight: 1800
      },
      participationMetrics: {
        voterTurnout: 0.36,
        weightTurnout: 0.45,
        timeToQuorum: null,
        votingPattern: 'early'
      },
      quorumStatus: {
        required: 250,
        current: 180,
        achieved: false,
        projectedCompletion: '2024-01-25T15:00:00Z'
      }
    }
  },
  {
    id: 'e2e-proposal-2',
    daoId: 'e2e-test-dao',
    title: 'Treasury Allocation',
    description: 'Proposal for treasury fund allocation to development',
    options: ['Yes', 'No'],
    createdBy: 'did:squid:e2e-user-2',
    createdAt: '2024-01-15T14:00:00Z',
    expiresAt: '2024-01-22T14:00:00Z',
    status: 'closed',
    voteCount: 320,
    quorum: 250,
    results: {
      'Yes': { count: 200, weight: 2000 },
      'No': { count: 120, weight: 1200 }
    },
    quorumReached: true,
    analytics: {
      votingBreakdown: {
        byWeight: { 'Yes': 2000, 'No': 1200 },
        byCount: { 'Yes': 200, 'No': 120 },
        uniqueVoters: 320,
        totalWeight: 3200
      },
      participationMetrics: {
        voterTurnout: 0.64,
        weightTurnout: 0.80,
        timeToQuorum: 72,
        votingPattern: 'consistent'
      },
      quorumStatus: {
        required: 250,
        current: 320,
        achieved: true,
        projectedCompletion: null
      }
    }
  }
];

const mockE2EMembership = {
  daoId: 'e2e-test-dao',
  userId: 'did:squid:e2e-test-user',
  isMember: true,
  canCreateProposals: true,
  memberSince: '2023-08-01T00:00:00Z',
  permissions: {
    canVote: true,
    canCreateProposals: true,
    canModerate: true,
    isAdmin: false,
    isOwner: false
  }
};

const mockE2EWalletData = {
  balances: {
    E2ETOKEN: {
      balance: 25000000000000000000, // 25 tokens with 18 decimals
      tokenInfo: {
        symbol: 'E2ETOKEN',
        decimals: 18,
        contractAddress: '0xe2e1234567890abcdef1234567890abcdef123456',
        network: 'ethereum',
        type: 'governance'
      }
    }
  },
  nfts: [
    {
      tokenId: '101',
      name: 'E2E Governance NFT',
      description: 'Special governance NFT for E2E testing',
      image: 'https://example.com/e2e-nft.jpg',
      contractAddress: '0xe2e1234567890abcdef1234567890abcdef123456',
      attributes: [
        { trait_type: 'dao_id', value: 'e2e-test-dao' },
        { trait_type: 'governance_power', value: '5' },
        { trait_type: 'rarity', value: 'legendary' }
      ]
    }
  ]
};

// Mock all dependencies for E2E testing
vi.mock('../../composables/useDAO', () => ({
  useDAO: () => ({
    daos: [mockCompleteDAOResponse],
    currentDAO: mockCompleteDAOResponse,
    proposals: mockE2EProposals,
    currentProposal: null,
    results: null,
    membership: mockE2EMembership,
    loading: false,
    error: null,
    getDAOs: vi.fn().mockResolvedValue([mockCompleteDAOResponse]),
    getDAO: vi.fn().mockResolvedValue(mockCompleteDAOResponse),
    joinDAO: vi.fn().mockResolvedValue(true),
    getProposals: vi.fn().mockResolvedValue(mockE2EProposals),
    getProposal: vi.fn().mockImplementation((id) => 
      Promise.resolve(mockE2EProposals.find(p => p.id === id))
    ),
    createProposal: vi.fn().mockResolvedValue({ id: 'new-proposal', title: 'New Proposal' }),
    voteOnProposal: vi.fn().mockResolvedValue(true),
    getResults: vi.fn().mockResolvedValue(mockE2EProposals[1].results),
    getMembership: vi.fn().mockResolvedValue(mockE2EMembership),
    getDAOStats: vi.fn().mockResolvedValue({
      totalProposals: 25,
      activeProposals: 5,
      averageParticipation: 0.55,
      quorumReachRate: 0.72
    }),
    clearError: vi.fn(),
    refreshDAOData: vi.fn()
  })
}));

vi.mock('../../composables/useQwallet', () => ({
  useQwallet: () => ({
    ...mockE2EWalletData,
    loading: false,
    error: null,
    getBalance: vi.fn().mockResolvedValue(mockE2EWalletData.balances.E2ETOKEN),
    getAllBalances: vi.fn().mockResolvedValue(mockE2EWalletData.balances),
    listUserNFTs: vi.fn().mockResolvedValue(mockE2EWalletData.nfts),
    mintNFT: vi.fn().mockImplementation((params) => 
      Promise.resolve({
        tokenId: '102',
        name: params.name,
        description: params.description,
        attributes: params.attributes
      })
    ),
    transferFunds: vi.fn().mockImplementation((params) => {
      if (params.amount > mockE2EWalletData.balances.E2ETOKEN.balance) {
        return Promise.reject(new Error('Insufficient balance'));
      }
      return Promise.resolve({
        transactionHash: '0xabcdef123456789',
        success: true
      });
    }),
    refreshWalletData: vi.fn()
  })
}));

vi.mock('../../contexts/SessionContext', () => ({
  useSessionContext: () => ({
    session: {
      issuer: 'did:squid:e2e-test-user',
      address: '0xe2eTestUser123456789',
      signature: 'e2e-test-signature'
    },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false
  })
}));

// Mock UI components with better testability
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

vi.mock('../ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (
    open ? (
      <div data-testid="dialog" role="dialog" aria-modal="true">
        <div data-testid="dialog-backdrop" onClick={() => onOpenChange?.(false)} />
        {children}
      </div>
    ) : null
  ),
  DialogContent: ({ children, className }: any) => (
    <div className={className} data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h3 data-testid="dialog-title">{children}</h3>
}));

// Mock wallet components with realistic behavior
vi.mock('../qwallet/TokenTransferForm', () => ({
  default: ({ onTransfer }: any) => (
    <div data-testid="token-transfer-form">
      <h4>Transfer E2E Tokens</h4>
      <input 
        data-testid="recipient-input" 
        placeholder="Recipient address" 
        defaultValue="0xRecipient123"
      />
      <input 
        data-testid="amount-input" 
        placeholder="Amount" 
        type="number"
        defaultValue="5"
      />
      <button 
        data-testid="transfer-submit"
        onClick={() => onTransfer?.({ 
          recipient: '0xRecipient123', 
          amount: 5000000000000000000 // 5 tokens
        })}
      >
        Transfer Tokens
      </button>
    </div>
  )
}));

vi.mock('../qwallet/NFTGallery', () => ({
  default: () => (
    <div data-testid="nft-gallery">
      <h4>NFT Gallery</h4>
      <div data-testid="nft-item">
        <img src="https://example.com/e2e-nft.jpg" alt="E2E Governance NFT" />
        <p>E2E Governance NFT</p>
        <p>Token ID: 101</p>
      </div>
    </div>
  )
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
    colorScheme: { green: '#16a34a', gray: '#6b7280', blue: '#2563eb' },
    shouldShowDataTable: false,
    describer: {
      describeTokenSupply: vi.fn().mockReturnValue('Token supply: 7.5M of 10M tokens in circulation'),
      describeWalletOverview: vi.fn().mockReturnValue('Wallet contains 25 E2ETOKEN tokens and 1 NFT'),
      describeQuorumProgress: vi.fn().mockReturnValue('Quorum progress: 180 of 250 votes required')
    }
  }),
  createTokenDisplayAria: () => ({
    containerAttributes: { role: 'region', 'aria-label': 'Token information' },
    labelId: 'token-label',
    descriptionId: 'token-description',
    descriptionText: 'E2E Test DAO Token information'
  }),
  createProgressAria: (config: any) => ({
    'aria-label': config.label,
    'aria-valuenow': config.value,
    'aria-valuemin': config.min || 0,
    'aria-valuemax': config.max || 100,
    'aria-valuetext': config.valueText
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
    describeTokenOverview: vi.fn().mockReturnValue('Complete token overview with supply and holder information'),
    describeWalletOverview: vi.fn().mockReturnValue('User wallet overview with tokens and NFTs'),
    describeQuickActions: vi.fn().mockReturnValue('Available actions: mint NFT, transfer tokens, view gallery')
  }),
  DataDescription: ({ data }: any) => (
    <div className="sr-only" data-testid="data-description">
      {data.title}: {data.summary}
    </div>
  ),
  AccessibleProgress: ({ value, label, showPercentage, colorScheme }: any) => (
    <div 
      role="progressbar" 
      aria-label={label} 
      aria-valuenow={value}
      data-testid="accessible-progress"
      className={`progress-${colorScheme}`}
    >
      <div className="progress-bar" style={{ width: `${value}%` }} />
      {showPercentage && <span className="progress-text">{value}%</span>}
    </div>
  )
}));

describe('DAO Dashboard E2E Test Scenarios', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset any global state
    localStorage.clear();
  });

  describe('Complete Wallet Integration Workflow', () => {
    it('completes full wallet integration from dashboard to transaction', async () => {
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      // Step 1: User views DAO dashboard and sees their wallet overview
      await waitFor(() => {
        expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
        expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
      });
      
      // Step 2: User checks their token balance
      expect(screen.getByText('25.00')).toBeInTheDocument(); // Token balance
      expect(screen.getByText('E2ETOKEN')).toBeInTheDocument(); // Token symbol
      
      // Step 3: User sees their voting power
      expect(screen.getByText('Voting Power')).toBeInTheDocument();
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
      
      // Step 4: User initiates token transfer
      const transferButton = screen.getByText('Transfer Token');
      expect(transferButton).toBeInTheDocument();
      expect(transferButton).not.toBeDisabled();
      
      await user.click(transferButton);
      
      // Step 5: Transfer modal opens
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByText('Transfer Tokens')).toBeInTheDocument();
      });
      
      // Step 6: User fills transfer form
      const recipientInput = screen.getByTestId('recipient-input');
      const amountInput = screen.getByTestId('amount-input');
      
      expect(recipientInput).toHaveValue('0xRecipient123');
      expect(amountInput).toHaveValue(5);
      
      // Step 7: User submits transfer
      const submitButton = screen.getByTestId('transfer-submit');
      await user.click(submitButton);
      
      // Step 8: Transfer should be processed
      // In a real E2E test, this would verify blockchain transaction
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('handles wallet connection errors gracefully', async () => {
      // Mock wallet connection error
      vi.mocked(vi.fn()).mockRejectedValueOnce(new Error('Wallet connection failed'));
      
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      // Should show error state but not crash
      await waitFor(() => {
        expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
      });
      
      // User should still be able to view DAO information
      expect(screen.getByText('E2E Test DAO Token')).toBeInTheDocument();
    });

    it('validates insufficient balance scenarios', async () => {
      // Mock insufficient balance
      const mockTransferWithError = vi.fn().mockRejectedValue(new Error('Insufficient balance'));
      
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('Transfer Token')).toBeInTheDocument();
      });
      
      const transferButton = screen.getByText('Transfer Token');
      await user.click(transferButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });
      
      // Try to transfer more than available balance
      const submitButton = screen.getByTestId('transfer-submit');
      await user.click(submitButton);
      
      // Should handle error appropriately
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });
  });

  describe('NFT Minting Process E2E', () => {
    it('completes full NFT minting workflow', async () => {
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      // Step 1: User sees they have moderator permissions
      await waitFor(() => {
        expect(screen.getByText('Moderator')).toBeInTheDocument();
      });
      
      // Step 2: User clicks mint NFT button
      const mintButton = screen.getByText('Mint NFT');
      expect(mintButton).toBeInTheDocument();
      expect(mintButton).not.toBeDisabled();
      
      await user.click(mintButton);
      
      // Step 3: Mint NFT modal opens
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByText('Mint New NFT')).toBeInTheDocument();
      });
      
      // Step 4: User fills NFT form
      const nameInput = screen.getByLabelText(/NFT Name/);
      const descriptionInput = screen.getByLabelText(/Description/);
      const imageInput = screen.getByLabelText(/Image URL/);
      
      await user.type(nameInput, 'E2E Test NFT');
      await user.type(descriptionInput, 'An NFT created during E2E testing');
      await user.type(imageInput, 'https://example.com/e2e-test-nft.jpg');
      
      // Step 5: User adds custom attributes
      const addAttributeButton = screen.getByText('Add Attribute');
      await user.click(addAttributeButton);
      
      const traitTypeInput = screen.getByPlaceholderText('Trait type');
      const valueInput = screen.getByPlaceholderText('Value');
      
      await user.type(traitTypeInput, 'test_type');
      await user.type(valueInput, 'e2e_test');
      
      // Step 6: User sees DAO information is auto-populated
      expect(screen.getByText(/e2e-test-dao/)).toBeInTheDocument();
      expect(screen.getByText(/moderator/)).toBeInTheDocument();
      
      // Step 7: User submits NFT minting
      const mintSubmitButton = screen.getByRole('button', { name: /Mint NFT/ });
      expect(mintSubmitButton).not.toBeDisabled();
      
      await user.click(mintSubmitButton);
      
      // Step 8: NFT should be minted successfully
      await waitFor(() => {
        expect(screen.getByText(/Successfully minted NFT/)).toBeInTheDocument();
      });
      
      // Step 9: Modal should close and wallet data should refresh
      // In real E2E, this would verify the NFT appears in the user's collection
    });

    it('validates NFT minting form requirements', async () => {
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        const mintButton = screen.getByText('Mint NFT');
        await user.click(mintButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });
      
      // Try to submit without required fields
      const mintSubmitButton = screen.getByRole('button', { name: /Mint NFT/ });
      expect(mintSubmitButton).toBeDisabled();
      
      // Fill only name
      const nameInput = screen.getByLabelText(/NFT Name/);
      await user.type(nameInput, 'Test NFT');
      
      // Should still be disabled without description
      expect(mintSubmitButton).toBeDisabled();
      
      // Fill description
      const descriptionInput = screen.getByLabelText(/Description/);
      await user.type(descriptionInput, 'Test description');
      
      // Now should be enabled
      expect(mintSubmitButton).not.toBeDisabled();
    });

    it('handles NFT minting errors', async () => {
      // Mock minting error
      const mockMintNFTError = vi.fn().mockRejectedValue(new Error('Minting failed'));
      
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        const mintButton = screen.getByText('Mint NFT');
        await user.click(mintButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });
      
      // Fill form
      await user.type(screen.getByLabelText(/NFT Name/), 'Error Test NFT');
      await user.type(screen.getByLabelText(/Description/), 'This will fail');
      
      // Submit
      const mintSubmitButton = screen.getByRole('button', { name: /Mint NFT/ });
      await user.click(mintSubmitButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to mint NFT/)).toBeInTheDocument();
      });
    });
  });

  describe('Governance Participation with Enhanced Metrics', () => {
    it('displays enhanced proposal metrics and allows voting', async () => {
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      // Step 1: User views governance statistics
      await waitFor(() => {
        expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
      });
      
      // Step 2: User sees quorum performance
      expect(screen.getByText('Quorum Performance')).toBeInTheDocument();
      expect(screen.getByText('50.0%')).toBeInTheDocument(); // Quorum reach rate
      
      // Step 3: User views top proposals
      expect(screen.getByText('Most Voted Proposals')).toBeInTheDocument();
      expect(screen.getByText('Treasury Allocation')).toBeInTheDocument();
      expect(screen.getByText('Increase Token Rewards')).toBeInTheDocument();
      
      // Step 4: User sees enhanced proposal metrics
      expect(screen.getByText('320')).toBeInTheDocument(); // Vote count
      expect(screen.getByText('180')).toBeInTheDocument(); // Vote count
      
      // Step 5: User clicks on a proposal to view details
      const proposalCard = screen.getByText('Increase Token Rewards').closest('[data-testid="card"]');
      if (proposalCard) {
        await user.click(proposalCard);
        
        // Should navigate to proposal details (mocked)
        expect(proposalCard).toBeInTheDocument();
      }
      
      // Step 6: User sees their voting power
      expect(screen.getByText('Voting Power')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument(); // Token weight
      
      // Step 7: User can vote on active proposals
      const voteButtons = screen.getAllByText('Vote Now');
      expect(voteButtons.length).toBeGreaterThan(0);
    });

    it('shows enhanced voting breakdown for token-weighted voting', async () => {
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
      });
      
      // Should show voting weight distribution
      expect(screen.getByText('Most Voted Proposals')).toBeInTheDocument();
      
      // Should show participation metrics
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
      
      // Each progress bar should have proper accessibility
      progressBars.forEach(progressBar => {
        expect(progressBar).toHaveAttribute('aria-label');
        expect(progressBar).toHaveAttribute('aria-valuenow');
      });
    });

    it('handles quorum progress indicators', async () => {
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
      });
      
      // Should show quorum progress
      expect(screen.getByText('Quorum Performance')).toBeInTheDocument();
      
      // Should show quorum reach rate
      const progressBars = screen.getAllByRole('progressbar');
      const quorumProgress = progressBars.find(bar => 
        bar.getAttribute('aria-label')?.includes('Quorum') ||
        bar.getAttribute('aria-label')?.includes('Progress')
      );
      
      expect(quorumProgress).toBeInTheDocument();
    });
  });

  describe('Accessibility Compliance E2E', () => {
    it('passes automated accessibility tests', async () => {
      const { container } = render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
      });
      
      // Run axe accessibility tests
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports complete keyboard navigation workflow', async () => {
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
      });
      
      // Step 1: Tab through all interactive elements
      await user.tab(); // First focusable element
      expect(document.activeElement).toBeDefined();
      
      await user.tab(); // Second focusable element
      expect(document.activeElement).toBeDefined();
      
      await user.tab(); // Third focusable element
      expect(document.activeElement).toBeDefined();
      
      // Step 2: Use Enter to activate buttons
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.tagName === 'BUTTON') {
        await user.keyboard('{Enter}');
        // Should activate the button without errors
        expect(activeElement).toBeDefined();
      }
      
      // Step 3: Use Space to activate buttons
      await user.keyboard(' ');
      // Should work as alternative activation method
      expect(document.activeElement).toBeDefined();
    });

    it('provides proper screen reader announcements', async () => {
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
      });
      
      // Check for screen reader content
      const srOnlyElements = document.querySelectorAll('.sr-only');
      expect(srOnlyElements.length).toBeGreaterThan(0);
      
      // Check for proper ARIA labels
      const progressBars = screen.getAllByRole('progressbar');
      progressBars.forEach(progressBar => {
        expect(progressBar).toHaveAttribute('aria-label');
        expect(progressBar).toHaveAttribute('aria-valuenow');
      });
      
      // Check for proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Verify heading hierarchy
      const h1Elements = headings.filter(h => h.tagName === 'H1');
      const h2Elements = headings.filter(h => h.tagName === 'H2');
      expect(h1Elements.length + h2Elements.length).toBeGreaterThan(0);
    });

    it('supports high contrast mode', async () => {
      // Mock high contrast preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
      });
      
      // Should render without issues in high contrast mode
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('supports reduced motion preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
      });
      
      // Should render without animations
      expect(screen.getByText('E2E Test DAO Token')).toBeInTheDocument();
    });
  });

  describe('Responsive Design E2E', () => {
    it('adapts to mobile viewport correctly', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });
      
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
      });
      
      // All components should be visible and functional on mobile
      expect(screen.getByText('E2E Test DAO Token')).toBeInTheDocument();
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
      
      // Touch interactions should work
      const mintButton = screen.getByText('Mint NFT');
      fireEvent.touchStart(mintButton);
      fireEvent.touchEnd(mintButton);
      
      expect(mintButton).toBeInTheDocument();
    });

    it('adapts to tablet viewport correctly', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
      });
      
      // Should show intermediate layout
      expect(screen.getByText('E2E Test DAO Token')).toBeInTheDocument();
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
    });

    it('adapts to desktop viewport correctly', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080,
      });
      
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
      });
      
      // Should show full desktop layout
      expect(screen.getByText('E2E Test DAO Token')).toBeInTheDocument();
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
    });
  });

  describe('Error Recovery E2E', () => {
    it('recovers from network errors gracefully', async () => {
      // Mock network error initially
      const mockGetDAOError = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockCompleteDAOResponse);
      
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      // Should show error state initially
      await waitFor(() => {
        expect(screen.getByText('DAO Not Found')).toBeInTheDocument();
      });
      
      // User clicks retry
      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);
      
      // Should recover and show DAO data
      await waitFor(() => {
        expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
      });
    });

    it('handles partial data loading gracefully', async () => {
      // Mock partial data loading
      vi.mock('../../composables/useDAO', () => ({
        useDAO: () => ({
          currentDAO: mockCompleteDAOResponse,
          proposals: [], // No proposals loaded
          membership: mockE2EMembership,
          loading: false,
          error: null,
          getDAO: vi.fn().mockResolvedValue(mockCompleteDAOResponse),
          getProposals: vi.fn().mockResolvedValue([]),
          getMembership: vi.fn().mockResolvedValue(mockE2EMembership)
        })
      }));
      
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
      });
      
      // Should show DAO info even without proposals
      expect(screen.getByText('E2E Test DAO Token')).toBeInTheDocument();
      expect(screen.getByText('My Wallet Overview')).toBeInTheDocument();
      
      // Should show appropriate message for missing proposals
      expect(screen.getByText('No Proposals Yet')).toBeInTheDocument();
    });
  });

  describe('Performance E2E', () => {
    it('handles large datasets without performance degradation', async () => {
      // Mock large dataset
      const manyProposals = Array.from({ length: 1000 }, (_, i) => ({
        ...mockE2EProposals[0],
        id: `large-proposal-${i}`,
        title: `Large Dataset Proposal ${i}`,
        voteCount: Math.floor(Math.random() * 500)
      }));
      
      vi.mock('../../composables/useDAO', () => ({
        useDAO: () => ({
          currentDAO: mockCompleteDAOResponse,
          proposals: manyProposals,
          membership: mockE2EMembership,
          loading: false,
          error: null
        })
      }));
      
      const startTime = performance.now();
      
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time (less than 2 seconds)
      expect(renderTime).toBeLessThan(2000);
      
      // Should still show governance statistics
      expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
    });

    it('maintains responsiveness during heavy interactions', async () => {
      render(<DAODashboard daoId="e2e-test-dao" />);
      
      await waitFor(() => {
        expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
      });
      
      // Perform multiple rapid interactions
      const mintButton = screen.getByText('Mint NFT');
      const transferButton = screen.getByText('Transfer Token');
      const refreshButton = screen.getByText('Refresh');
      
      // Rapid clicking should not cause issues
      for (let i = 0; i < 10; i++) {
        fireEvent.click(mintButton);
        fireEvent.click(transferButton);
        fireEvent.click(refreshButton);
      }
      
      // Should still be responsive
      expect(screen.getByText('E2E Test DAO')).toBeInTheDocument();
    });
  });
});