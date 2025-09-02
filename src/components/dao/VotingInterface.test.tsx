/**
 * VotingInterface Component Tests
 * 
 * Comprehensive test suite for the voting interface functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VotingInterface } from './VotingInterface';
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

const mockExpiredProposal = {
  ...mockActiveProposal,
  id: 'proposal-expired',
  expiresAt: '2024-01-01T00:00:00Z', // Past date
  status: 'closed' as const
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

const mockVoteResult = {
  id: 'vote-1',
  proposalId: 'proposal-1',
  option: 'Yes',
  weight: 10,
  timestamp: '2024-01-05T12:00:00Z'
};

describe('VotingInterface', () => {
  const user = userEvent.setup();
  const mockOnClose = jest.fn();

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
      voteOnProposal: jest.fn().mockResolvedValue(mockVoteResult),
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
    it('renders voting interface with proposal information', () => {
      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText('Cast Your Vote')).toBeInTheDocument();
      expect(screen.getByText('Test Active Proposal')).toBeInTheDocument();
      expect(screen.getByText(/This is a test proposal that is currently active/)).toBeInTheDocument();
      expect(screen.getByText('Select Your Vote')).toBeInTheDocument();
    });

    it('displays all voting options as radio buttons', () => {
      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
      expect(screen.getByText('Abstain')).toBeInTheDocument();
      
      // Check radio buttons are present
      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(3);
    });

    it('shows proposal creator and creation date', () => {
      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText(/test-user/)).toBeInTheDocument();
      expect(screen.getByText('1/1/2024')).toBeInTheDocument();
    });

    it('displays time remaining for active proposals', () => {
      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText('3 days remaining')).toBeInTheDocument();
    });

    it('shows current vote distribution preview', () => {
      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText('Current Vote Distribution')).toBeInTheDocument();
      expect(screen.getByText('15 votes (60%)')).toBeInTheDocument();
      expect(screen.getByText('8 votes (32%)')).toBeInTheDocument();
      expect(screen.getByText('2 votes (8%)')).toBeInTheDocument();
    });
  });

  describe('Eligibility Checking', () => {
    it('shows error for unauthenticated users', () => {
      mockUseSessionContext.mockReturnValue({
        session: null,
        isAuthenticated: false,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false
      });

      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText('Cannot Vote')).toBeInTheDocument();
      expect(screen.getByText('You must be authenticated to vote')).toBeInTheDocument();
      expect(screen.getByText(/Please sign in with your sQuid identity/)).toBeInTheDocument();
    });

    it('shows error for non-members', () => {
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        membership: {
          ...mockMembership,
          isMember: false
        }
      });

      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText('Cannot Vote')).toBeInTheDocument();
      expect(screen.getByText('You must be a DAO member to vote')).toBeInTheDocument();
    });

    it('shows error for users without voting permissions', () => {
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
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText('Cannot Vote')).toBeInTheDocument();
      expect(screen.getByText('You do not have voting permissions')).toBeInTheDocument();
    });

    it('shows error for expired proposals', () => {
      render(
        <VotingInterface 
          proposal={mockExpiredProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText('Cannot Vote')).toBeInTheDocument();
      expect(screen.getByText('Voting period has expired')).toBeInTheDocument();
    });

    it('shows error for closed proposals', () => {
      const closedProposal = {
        ...mockActiveProposal,
        status: 'closed' as const
      };

      render(
        <VotingInterface 
          proposal={closedProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText('Cannot Vote')).toBeInTheDocument();
      expect(screen.getByText('This proposal is no longer active')).toBeInTheDocument();
    });
  });

  describe('Vote Selection', () => {
    it('allows selecting voting options', async () => {
      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      const yesOption = screen.getByLabelText('Yes');
      await user.click(yesOption);
      
      expect(yesOption).toBeChecked();
      
      // Submit button should be enabled
      const submitButton = screen.getByText('Submit Vote');
      expect(submitButton).not.toBeDisabled();
    });

    it('highlights selected option visually', async () => {
      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      const yesOption = screen.getByLabelText('Yes');
      await user.click(yesOption);
      
      // Check for visual highlighting
      const yesContainer = yesOption.closest('div');
      expect(yesContainer).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('allows changing selection', async () => {
      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      const yesOption = screen.getByLabelText('Yes');
      const noOption = screen.getByLabelText('No');
      
      await user.click(yesOption);
      expect(yesOption).toBeChecked();
      
      await user.click(noOption);
      expect(noOption).toBeChecked();
      expect(yesOption).not.toBeChecked();
    });

    it('disables submit button when no option is selected', () => {
      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      const submitButton = screen.getByText('Submit Vote');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Vote Submission', () => {
    it('submits vote when submit button is clicked', async () => {
      const mockVoteOnProposal = jest.fn().mockResolvedValue(mockVoteResult);
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        voteOnProposal: mockVoteOnProposal
      });

      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      const yesOption = screen.getByLabelText('Yes');
      await user.click(yesOption);
      
      const submitButton = screen.getByText('Submit Vote');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockVoteOnProposal).toHaveBeenCalledWith('test-dao', 'proposal-1', {
          option: 'Yes',
          signature: expect.any(String)
        });
      });
    });

    it('shows loading state during submission', async () => {
      const mockVoteOnProposal = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockVoteResult), 100))
      );
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        voteOnProposal: mockVoteOnProposal
      });

      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      const yesOption = screen.getByLabelText('Yes');
      await user.click(yesOption);
      
      const submitButton = screen.getByText('Submit Vote');
      await user.click(submitButton);
      
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      await waitFor(() => {
        expect(screen.queryByText('Submitting...')).not.toBeInTheDocument();
      });
    });

    it('shows success state after successful vote', async () => {
      const mockVoteOnProposal = jest.fn().mockResolvedValue(mockVoteResult);
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        voteOnProposal: mockVoteOnProposal
      });

      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      const yesOption = screen.getByLabelText('Yes');
      await user.click(yesOption);
      
      const submitButton = screen.getByText('Submit Vote');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Vote Submitted')).toBeInTheDocument();
        expect(screen.getByText('Your vote has been recorded!')).toBeInTheDocument();
        expect(screen.getByText('You voted for: Yes')).toBeInTheDocument();
      });
    });

    it('auto-closes after successful vote', async () => {
      jest.useFakeTimers();
      
      const mockVoteOnProposal = jest.fn().mockResolvedValue(mockVoteResult);
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        voteOnProposal: mockVoteOnProposal
      });

      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      const yesOption = screen.getByLabelText('Yes');
      await user.click(yesOption);
      
      const submitButton = screen.getByText('Submit Vote');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Vote Submitted')).toBeInTheDocument();
      });
      
      // Fast-forward time
      jest.advanceTimersByTime(3000);
      
      expect(mockOnClose).toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('shows error message on submission failure', async () => {
      const mockVoteOnProposal = jest.fn().mockRejectedValue(new Error('Vote submission failed'));
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        voteOnProposal: mockVoteOnProposal
      });

      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      const yesOption = screen.getByLabelText('Yes');
      await user.click(yesOption);
      
      const submitButton = screen.getByText('Submit Vote');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Vote submission failed')).toBeInTheDocument();
      });
    });
  });

  describe('Time Display', () => {
    it('shows urgent status for proposals expiring soon', () => {
      const urgentProposal = {
        ...mockActiveProposal,
        expiresAt: '2024-01-05T14:00:00Z' // 2 hours from mocked current time
      };

      render(
        <VotingInterface 
          proposal={urgentProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText('2 hours remaining')).toBeInTheDocument();
      
      // Should have urgent styling
      const timeBadge = screen.getByText('2 hours remaining').closest('.bg-orange-100');
      expect(timeBadge).toBeInTheDocument();
    });

    it('shows minutes remaining for very urgent proposals', () => {
      const veryUrgentProposal = {
        ...mockActiveProposal,
        expiresAt: '2024-01-05T12:30:00Z' // 30 minutes from mocked current time
      };

      render(
        <VotingInterface 
          proposal={veryUrgentProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText('30 minutes remaining')).toBeInTheDocument();
    });
  });

  describe('User Interface', () => {
    it('calls onClose when cancel button is clicked', async () => {
      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when close button is clicked in success state', async () => {
      const mockVoteOnProposal = jest.fn().mockResolvedValue(mockVoteResult);
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        voteOnProposal: mockVoteOnProposal
      });

      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      // Submit a vote first
      const yesOption = screen.getByLabelText('Yes');
      await user.click(yesOption);
      
      const submitButton = screen.getByText('Submit Vote');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Vote Submitted')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('prevents interaction during submission', async () => {
      const mockVoteOnProposal = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockVoteResult), 100))
      );
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        voteOnProposal: mockVoteOnProposal
      });

      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      const yesOption = screen.getByLabelText('Yes');
      await user.click(yesOption);
      
      const submitButton = screen.getByText('Submit Vote');
      await user.click(submitButton);
      
      // Options should be disabled during submission
      expect(yesOption).toBeDisabled();
      expect(screen.getByLabelText('No')).toBeDisabled();
      expect(screen.getByLabelText('Abstain')).toBeDisabled();
      
      await waitFor(() => {
        expect(screen.queryByText('Submitting...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      // Check for proper radio group
      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(3);
      
      // Check for proper button roles
      expect(screen.getByRole('button', { name: /Submit Vote/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
    });

    it('has proper form structure and labels', () => {
      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: 'Cast Your Vote' })).toBeInTheDocument();
      
      // Check for proper labels
      expect(screen.getByLabelText('Yes')).toBeInTheDocument();
      expect(screen.getByLabelText('No')).toBeInTheDocument();
      expect(screen.getByLabelText('Abstain')).toBeInTheDocument();
    });

    it('provides proper focus states', async () => {
      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      const yesOption = screen.getByLabelText('Yes');
      
      // Option should be focusable
      yesOption.focus();
      expect(yesOption).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('displays DAO error messages', () => {
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        error: 'DAO service error'
      });

      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText('DAO service error')).toBeInTheDocument();
    });

    it('clears errors when proposal changes', () => {
      const mockClearError = jest.fn();
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        clearError: mockClearError
      });

      const { rerender } = render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      // Change proposal
      const newProposal = { ...mockActiveProposal, id: 'new-proposal' };
      rerender(
        <VotingInterface 
          proposal={newProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles proposals with no current votes', () => {
      const noVotesProposal = {
        ...mockActiveProposal,
        voteCount: 0,
        results: {
          'Yes': { count: 0, weight: 0 },
          'No': { count: 0, weight: 0 },
          'Abstain': { count: 0, weight: 0 }
        }
      };

      render(
        <VotingInterface 
          proposal={noVotesProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText('Test Active Proposal')).toBeInTheDocument();
      expect(screen.getByText('Total votes: 0')).toBeInTheDocument();
    });

    it('handles missing onClose callback gracefully', () => {
      render(
        <VotingInterface 
          proposal={mockActiveProposal} 
          daoId="test-dao" 
        />
      );
      
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeInTheDocument();
      
      // Should not throw error when clicked without callback
      expect(() => fireEvent.click(cancelButton)).not.toThrow();
    });

    it('handles proposals with single option', () => {
      const singleOptionProposal = {
        ...mockActiveProposal,
        options: ['Approve'],
        results: {
          'Approve': { count: 10, weight: 100 }
        }
      };

      render(
        <VotingInterface 
          proposal={singleOptionProposal} 
          daoId="test-dao" 
          onClose={mockOnClose} 
        />
      );
      
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(1);
    });
  });
});