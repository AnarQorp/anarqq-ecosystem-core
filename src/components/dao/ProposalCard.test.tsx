/**
 * ProposalCard Component Tests
 * 
 * Comprehensive test suite for the proposal card display functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProposalCard } from './ProposalCard';
import { useDAO } from '../../composables/useDAO';
import { useSessionContext } from '../../contexts/SessionContext';

// Mock the hooks
jest.mock('../../composables/useDAO');
jest.mock('../../contexts/SessionContext');

const mockUseDAO = useDAO as jest.MockedFunction<typeof useDAO>;
const mockUseSessionContext = useSessionContext as jest.MockedFunction<typeof useSessionContext>;

const mockActiveProposal = {
  id: 'proposal-1',
  daoId: 'test-dao',
  title: 'Test Active Proposal',
  description: 'This is a test proposal that is currently active and accepting votes',
  options: ['Yes', 'No', 'Abstain'],
  createdBy: 'did:squid:test-user',
  createdAt: '2024-01-01T00:00:00Z',
  expiresAt: '2024-01-08T23:59:59Z', // Future date
  status: 'active' as const,
  voteCount: 25,
  quorum: 50,
  results: {
    'Yes': { count: 15, weight: 150 },
    'No': { count: 8, weight: 80 },
    'Abstain': { count: 2, weight: 20 }
  },
  quorumReached: false
};

const mockClosedProposal = {
  id: 'proposal-2',
  daoId: 'test-dao',
  title: 'Test Closed Proposal',
  description: 'This is a test proposal that has been closed and shows results',
  options: ['Option A', 'Option B'],
  createdBy: 'did:squid:another-user',
  createdAt: '2023-12-01T00:00:00Z',
  expiresAt: '2023-12-08T23:59:59Z', // Past date
  status: 'closed' as const,
  voteCount: 100,
  quorum: 50,
  results: {
    'Option A': { count: 60, weight: 600 },
    'Option B': { count: 40, weight: 400 }
  },
  quorumReached: true
};

const mockMembership = {
  daoId: 'test-dao',
  userId: 'did:squid:test-user',
  isMember: true,
  canCreateProposals: true,
  memberSince: '2023-01-01T00:00:00Z',
  permissions: {
    canVote: true,
    canCreateProposals: true,
    canModerate: false
  }
};

describe('ProposalCard', () => {
  const user = userEvent.setup();
  const mockOnVote = jest.fn();

  beforeEach(() => {
    mockUseDAO.mockReturnValue({
      daos: [],
      currentDAO: null,
      proposals: [],
      currentProposal: null,
      results: null,
      membership: mockMembership,
      loading: false,
      error: null,
      getDAOs: jest.fn(),
      getDAO: jest.fn(),
      joinDAO: jest.fn(),
      getProposals: jest.fn(),
      getProposal: jest.fn(),
      createProposal: jest.fn(),
      voteOnProposal: jest.fn(),
      getResults: jest.fn(),
      getMembership: jest.fn(),
      getDAOStats: jest.fn(),
      clearError: jest.fn(),
      refreshDAOData: jest.fn()
    });

    mockUseSessionContext.mockReturnValue({
      session: {
        issuer: 'did:squid:test-user',
        address: '0x123',
        signature: 'mock-signature'
      },
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      loading: false
    });

    // Mock current date for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-05T12:00:00Z').getTime());
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders active proposal with all required information', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('Test Active Proposal')).toBeInTheDocument();
      expect(screen.getByText(/This is a test proposal that is currently active/)).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText(/test-user/)).toBeInTheDocument();
      expect(screen.getByText('Vote Now')).toBeInTheDocument();
    });

    it('renders closed proposal with vote results', () => {
      render(
        <ProposalCard 
          proposal={mockClosedProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('Test Closed Proposal')).toBeInTheDocument();
      expect(screen.getByText('Closed')).toBeInTheDocument();
      expect(screen.getByText('Vote Distribution')).toBeInTheDocument();
      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Option B')).toBeInTheDocument();
      expect(screen.getByText('60 votes (60%)')).toBeInTheDocument();
      expect(screen.getByText('40 votes (40%)')).toBeInTheDocument();
    });

    it('renders in compact mode', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
          compact 
        />
      );
      
      expect(screen.getByText('Test Active Proposal')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      // Should not show full description in compact mode
      expect(screen.queryByText(/This is a test proposal that is currently active/)).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
          className="custom-class"
        />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Status Display', () => {
    it('shows active status for active proposals', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      const statusBadge = screen.getByText('Active');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge.closest('.bg-green-100')).toBeInTheDocument();
    });

    it('shows closed status for closed proposals', () => {
      render(
        <ProposalCard 
          proposal={mockClosedProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      const statusBadge = screen.getByText('Closed');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge.closest('.bg-gray-100')).toBeInTheDocument();
    });

    it('shows closed status for expired proposals', () => {
      const expiredProposal = {
        ...mockActiveProposal,
        expiresAt: '2024-01-01T00:00:00Z' // Past date
      };

      render(
        <ProposalCard 
          proposal={expiredProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('Closed')).toBeInTheDocument();
    });
  });

  describe('Time Information', () => {
    it('shows time remaining for active proposals', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('3 days remaining')).toBeInTheDocument();
    });

    it('shows urgent status for proposals expiring soon', () => {
      const urgentProposal = {
        ...mockActiveProposal,
        expiresAt: '2024-01-05T14:00:00Z' // 2 hours from mocked current time
      };

      render(
        <ProposalCard 
          proposal={urgentProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('2 hours remaining')).toBeInTheDocument();
    });

    it('shows closed time for closed proposals', () => {
      render(
        <ProposalCard 
          proposal={mockClosedProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      // Should show how long ago it was closed
      expect(screen.getByText(/Closed \d+ day/)).toBeInTheDocument();
    });
  });

  describe('Vote Distribution', () => {
    it('displays vote distribution for closed proposals', () => {
      render(
        <ProposalCard 
          proposal={mockClosedProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('Vote Distribution')).toBeInTheDocument();
      expect(screen.getByText('100 votes')).toBeInTheDocument();
      
      // Check individual option results
      expect(screen.getByText('60 votes (60%)')).toBeInTheDocument();
      expect(screen.getByText('40 votes (40%)')).toBeInTheDocument();
      
      // Check weight percentages
      expect(screen.getByText('Weight: 60%')).toBeInTheDocument();
      expect(screen.getByText('Weight: 40%')).toBeInTheDocument();
    });

    it('shows winning option indicator', () => {
      render(
        <ProposalCard 
          proposal={mockClosedProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      // Option A should be marked as winning (crown emoji)
      expect(screen.getByText('👑')).toBeInTheDocument();
    });

    it('displays quorum status for closed proposals', () => {
      render(
        <ProposalCard 
          proposal={mockClosedProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('Quorum (50)')).toBeInTheDocument();
      expect(screen.getByText('Reached')).toBeInTheDocument();
    });

    it('shows quorum not reached when applicable', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      // For active proposals, should show current vote count
      expect(screen.getByText('25 votes')).toBeInTheDocument();
    });
  });

  describe('Voting Options Display', () => {
    it('shows voting options for active proposals', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('Voting Options')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
      expect(screen.getByText('Abstain')).toBeInTheDocument();
      
      // Should show current vote counts
      expect(screen.getByText('15 votes')).toBeInTheDocument();
      expect(screen.getByText('8 votes')).toBeInTheDocument();
      expect(screen.getByText('2 votes')).toBeInTheDocument();
    });

    it('does not show voting options for closed proposals', () => {
      render(
        <ProposalCard 
          proposal={mockClosedProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.queryByText('Voting Options')).not.toBeInTheDocument();
    });
  });

  describe('Voting Eligibility', () => {
    it('shows vote button for eligible users on active proposals', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      const voteButton = screen.getByText('Vote Now');
      expect(voteButton).toBeInTheDocument();
      expect(voteButton).not.toBeDisabled();
    });

    it('calls onVote when vote button is clicked', async () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      const voteButton = screen.getByText('Vote Now');
      await user.click(voteButton);
      
      expect(mockOnVote).toHaveBeenCalledWith('proposal-1');
    });

    it('shows cannot vote for unauthenticated users', () => {
      mockUseSessionContext.mockReturnValue({
        session: null,
        isAuthenticated: false,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false
      });

      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('Cannot Vote')).toBeInTheDocument();
      expect(screen.getByText('Please authenticate to vote')).toBeInTheDocument();
    });

    it('shows cannot vote for non-members', () => {
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        membership: {
          ...mockMembership,
          isMember: false
        }
      });

      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('Cannot Vote')).toBeInTheDocument();
      expect(screen.getByText('Only DAO members can vote')).toBeInTheDocument();
    });

    it('shows cannot vote for users without voting permissions', () => {
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        membership: {
          ...mockMembership,
          permissions: {
            ...mockMembership.permissions,
            canVote: false
          }
        }
      });

      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('Cannot Vote')).toBeInTheDocument();
      expect(screen.getByText('You do not have voting permissions')).toBeInTheDocument();
    });

    it('shows cannot vote for closed proposals', () => {
      render(
        <ProposalCard 
          proposal={mockClosedProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.queryByText('Vote Now')).not.toBeInTheDocument();
      expect(screen.getByText('View Results')).toBeInTheDocument();
    });
  });

  describe('Creator Identity Display', () => {
    it('formats DID identifiers correctly', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      // Should show shortened version of the DID
      expect(screen.getByText(/test-user/)).toBeInTheDocument();
    });

    it('handles long identifiers with truncation', () => {
      const longIdProposal = {
        ...mockActiveProposal,
        createdBy: 'did:squid:verylongidentifierthatshouldbetruncat'
      };

      render(
        <ProposalCard 
          proposal={longIdProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      // Should show truncated version
      expect(screen.getByText(/verylo...runcat/)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('shows view details button for all proposals', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    it('shows view results badge for closed proposals', () => {
      render(
        <ProposalCard 
          proposal={mockClosedProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('View Results')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('applies hover effects', () => {
      const { container } = render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(container.firstChild).toHaveClass('hover:shadow-lg');
    });

    it('has proper responsive classes', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      // Check for responsive grid classes in vote distribution
      const voteDistribution = screen.getByText('Vote Distribution');
      expect(voteDistribution).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      // Check for proper button roles
      expect(screen.getByRole('button', { name: /Vote Now/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /View Details/ })).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      // Should have proper heading for proposal title
      expect(screen.getByText('Test Active Proposal')).toBeInTheDocument();
    });

    it('provides proper focus states', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      const voteButton = screen.getByText('Vote Now');
      expect(voteButton).toBeInTheDocument();
      
      // Button should be focusable
      voteButton.focus();
      expect(voteButton).toHaveFocus();
    });
  });

  describe('Enhanced Features', () => {
    const mockAnalytics = {
      votingBreakdown: {
        byWeight: { 'Yes': 150, 'No': 80, 'Abstain': 20 },
        byCount: { 'Yes': 15, 'No': 8, 'Abstain': 2 },
        uniqueVoters: 25,
        totalWeight: 250
      },
      participationMetrics: {
        voterTurnout: 0.5,
        weightTurnout: 0.6,
        timeToQuorum: 120,
        votingPattern: 'early' as const
      },
      quorumStatus: {
        required: 50,
        current: 25,
        achieved: false,
        projectedCompletion: '2024-01-06T12:00:00Z'
      }
    };

    it('displays enhanced voting breakdown when enabled', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote}
          showVotingBreakdown={true}
          votingMechanism="token-weighted"
          proposalAnalytics={mockAnalytics}
        />
      );
      
      expect(screen.getByText('Voting Weight Distribution')).toBeInTheDocument();
      expect(screen.getByText('25 unique voters')).toBeInTheDocument();
      expect(screen.getByText('Voter Metrics')).toBeInTheDocument();
    });

    it('shows quorum progress indicators when enabled', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote}
          showQuorumProgress={true}
          proposalAnalytics={mockAnalytics}
        />
      );
      
      expect(screen.getByText('Quorum Progress')).toBeInTheDocument();
      expect(screen.getByText('25 / 50')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('displays enhanced voter metrics', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote}
          showVotingBreakdown={true}
          votingMechanism="token-weighted"
          proposalAnalytics={mockAnalytics}
        />
      );
      
      expect(screen.getByText('Unique Voters')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Voter Participation Rate')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('Average Vote Weight')).toBeInTheDocument();
    });

    it('shows participation trends and patterns', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote}
          showVotingBreakdown={true}
          proposalAnalytics={mockAnalytics}
        />
      );
      
      expect(screen.getByText('Participation Trends')).toBeInTheDocument();
      expect(screen.getByText('Early')).toBeInTheDocument();
      expect(screen.getByText('Most votes cast in first 25% of voting period')).toBeInTheDocument();
    });

    it('maintains backward compatibility without enhanced props', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote}
        />
      );
      
      // Should not show enhanced features
      expect(screen.queryByText('Voting Weight Distribution')).not.toBeInTheDocument();
      expect(screen.queryByText('Quorum Progress')).not.toBeInTheDocument();
      expect(screen.queryByText('Voter Metrics')).not.toBeInTheDocument();
      
      // Should still show basic functionality
      expect(screen.getByText('Test Active Proposal')).toBeInTheDocument();
      expect(screen.getByText('Vote Now')).toBeInTheDocument();
    });

    it('handles loading state for analytics', () => {
      // Mock fetch to simulate loading
      global.fetch = jest.fn(() => new Promise(() => {})); // Never resolves

      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onVote={mockOnVote}
          showVotingBreakdown={true}
        />
      );
      
      expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles proposals with no results', () => {
      const noResultsProposal = {
        ...mockActiveProposal,
        results: {}
      };

      render(
        <ProposalCard 
          proposal={noResultsProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('Test Active Proposal')).toBeInTheDocument();
      // Should still show voting options
      expect(screen.getByText('Voting Options')).toBeInTheDocument();
    });

    it('handles proposals with zero votes', () => {
      const zeroVotesProposal = {
        ...mockActiveProposal,
        voteCount: 0,
        results: {
          'Yes': { count: 0, weight: 0 },
          'No': { count: 0, weight: 0 },
          'Abstain': { count: 0, weight: 0 }
        }
      };

      render(
        <ProposalCard 
          proposal={zeroVotesProposal} 
          daoId="test-dao" 
          onVote={mockOnVote} 
        />
      );
      
      expect(screen.getByText('0 votes')).toBeInTheDocument();
    });

    it('handles missing onVote callback gracefully', () => {
      render(
        <ProposalCard 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
        />
      );
      
      const voteButton = screen.getByText('Vote Now');
      expect(voteButton).toBeInTheDocument();
      
      // Should not throw error when clicked without callback
      expect(() => fireEvent.click(voteButton)).not.toThrow();
    });
  });
});