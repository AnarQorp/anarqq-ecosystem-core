/**
 * DAODashboard Component Tests
 * 
 * Comprehensive test suite for the DAO Dashboard component functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DAODashboard } from './DAODashboard';
import { useDAO } from '../../composables/useDAO';
import { useSessionContext } from '../../contexts/SessionContext';

// Mock the hooks
jest.mock('../../composables/useDAO');
jest.mock('../../contexts/SessionContext');

const mockUseDAO = useDAO as jest.MockedFunction<typeof useDAO>;
const mockUseSessionContext = useSessionContext as jest.MockedFunction<typeof useSessionContext>;

const mockDAO = {
  id: 'test-dao',
  name: 'Test DAO',
  description: 'A test DAO for testing purposes',
  visibility: 'public' as const,
  memberCount: 150,
  quorum: 75,
  proposalCount: 12,
  activeProposals: 3,
  governanceRules: {
    quorum: 75,
    votingDuration: 7 * 24 * 60 * 60 * 1000,
    tokenRequirement: {
      token: 'QToken',
      amount: 10
    },
    proposalCreationRights: 'token_holders',
    votingMechanism: 'token_weighted'
  },
  recentActivity: []
};

const mockProposals = [
  {
    id: 'proposal-1',
    daoId: 'test-dao',
    title: 'Test Proposal 1',
    description: 'This is a test proposal',
    options: ['Yes', 'No'],
    createdBy: 'did:squid:test-user',
    createdAt: '2024-01-01T00:00:00Z',
    expiresAt: '2024-01-08T00:00:00Z',
    status: 'active' as const,
    voteCount: 25,
    quorum: 75,
    results: {
      'Yes': { count: 15, weight: 150 },
      'No': { count: 10, weight: 100 }
    },
    quorumReached: false
  },
  {
    id: 'proposal-2',
    daoId: 'test-dao',
    title: 'Test Proposal 2',
    description: 'This is another test proposal',
    options: ['Option A', 'Option B', 'Option C'],
    createdBy: 'did:squid:another-user',
    createdAt: '2023-12-15T00:00:00Z',
    expiresAt: '2023-12-22T00:00:00Z',
    status: 'closed' as const,
    voteCount: 80,
    quorum: 75,
    results: {
      'Option A': { count: 40, weight: 400 },
      'Option B': { count: 25, weight: 250 },
      'Option C': { count: 15, weight: 150 }
    },
    quorumReached: true
  }
];

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

describe('DAODashboard', () => {
  beforeEach(() => {
    mockUseDAO.mockReturnValue({
      daos: [],
      currentDAO: mockDAO,
      proposals: mockProposals,
      currentProposal: null,
      results: null,
      membership: mockMembership,
      loading: false,
      error: null,
      getDAOs: jest.fn(),
      getDAO: jest.fn().mockResolvedValue(mockDAO),
      joinDAO: jest.fn().mockResolvedValue(true),
      getProposals: jest.fn().mockResolvedValue(mockProposals),
      getProposal: jest.fn(),
      createProposal: jest.fn(),
      voteOnProposal: jest.fn(),
      getResults: jest.fn(),
      getMembership: jest.fn().mockResolvedValue(mockMembership),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders DAO dashboard with DAO information', () => {
      render(<DAODashboard daoId="test-dao" />);
      
      expect(screen.getByText('Test DAO')).toBeInTheDocument();
      expect(screen.getByText('A test DAO for testing purposes')).toBeInTheDocument();
      expect(screen.getByText('Public')).toBeInTheDocument();
      expect(screen.getByText('Member')).toBeInTheDocument();
    });

    it('displays DAO statistics correctly', () => {
      render(<DAODashboard daoId="test-dao" />);
      
      expect(screen.getByText('150')).toBeInTheDocument(); // Member count
      expect(screen.getByText('75')).toBeInTheDocument(); // Quorum
      expect(screen.getByText('12')).toBeInTheDocument(); // Total proposals
      expect(screen.getByText('3')).toBeInTheDocument(); // Active proposals
    });

    it('shows governance requirements when present', () => {
      render(<DAODashboard daoId="test-dao" />);
      
      expect(screen.getByText('Governance Requirements')).toBeInTheDocument();
      expect(screen.getByText('10 QToken')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton when DAO data is loading', () => {
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        currentDAO: null,
        loading: true
      });

      render(<DAODashboard daoId="test-dao" />);
      
      // Should show skeleton loaders
      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(8); // Header + proposals skeletons
    });

    it('shows loading skeleton for proposals when loading', () => {
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        loading: true
      });

      render(<DAODashboard daoId="test-dao" />);
      
      // Should show proposal skeletons
      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(6); // 3 proposal cards * 2 skeleton elements each
    });
  });

  describe('Error Handling', () => {
    it('displays error message when DAO loading fails', () => {
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        currentDAO: null,
        error: 'Failed to load DAO',
        loading: false
      });

      render(<DAODashboard daoId="test-dao" />);
      
      expect(screen.getByText('Error Loading DAO')).toBeInTheDocument();
      expect(screen.getByText('Failed to load DAO')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('shows DAO not found message when DAO is null', () => {
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        currentDAO: null,
        error: null,
        loading: false
      });

      render(<DAODashboard daoId="test-dao" />);
      
      expect(screen.getByText('DAO Not Found')).toBeInTheDocument();
      expect(screen.getByText('The requested DAO could not be found.')).toBeInTheDocument();
    });
  });

  describe('Membership Handling', () => {
    it('shows join button for non-members', () => {
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        membership: {
          ...mockMembership,
          isMember: false
        }
      });

      render(<DAODashboard daoId="test-dao" />);
      
      expect(screen.getByText('Join DAO')).toBeInTheDocument();
      expect(screen.getByText('Join this DAO')).toBeInTheDocument();
    });

    it('handles join DAO functionality', async () => {
      const mockJoinDAO = jest.fn().mockResolvedValue(true);
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        membership: {
          ...mockMembership,
          isMember: false
        },
        joinDAO: mockJoinDAO
      });

      render(<DAODashboard daoId="test-dao" />);
      
      const joinButton = screen.getByText('Join DAO');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockJoinDAO).toHaveBeenCalledWith('test-dao');
      });
    });

    it('shows authentication required message for unauthenticated users', () => {
      mockUseSessionContext.mockReturnValue({
        session: null,
        isAuthenticated: false,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false
      });

      render(<DAODashboard daoId="test-dao" />);
      
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText(/Please authenticate with your sQuid identity/)).toBeInTheDocument();
    });
  });

  describe('Proposals Display', () => {
    it('displays proposals list for members', () => {
      render(<DAODashboard daoId="test-dao" />);
      
      expect(screen.getByText('Proposals')).toBeInTheDocument();
      expect(screen.getByText('Test Proposal 1')).toBeInTheDocument();
      expect(screen.getByText('Test Proposal 2')).toBeInTheDocument();
    });

    it('shows proposal status badges correctly', () => {
      render(<DAODashboard daoId="test-dao" />);
      
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Closed')).toBeInTheDocument();
    });

    it('displays vote counts and quorum status', () => {
      render(<DAODashboard daoId="test-dao" />);
      
      expect(screen.getByText('25 votes')).toBeInTheDocument();
      expect(screen.getByText('80 votes')).toBeInTheDocument();
      expect(screen.getByText(/Quorum: 75/)).toBeInTheDocument();
    });

    it('shows create proposal button for eligible users', () => {
      render(<DAODashboard daoId="test-dao" />);
      
      expect(screen.getByText('Create Proposal')).toBeInTheDocument();
    });

    it('hides create proposal button for users without rights', () => {
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        membership: {
          ...mockMembership,
          canCreateProposals: false
        }
      });

      render(<DAODashboard daoId="test-dao" />);
      
      expect(screen.queryByText('Create Proposal')).not.toBeInTheDocument();
    });
  });

  describe('Proposal Filtering', () => {
    it('filters proposals by status', async () => {
      render(<DAODashboard daoId="test-dao" />);
      
      const statusFilter = screen.getByDisplayValue('All Status');
      fireEvent.change(statusFilter, { target: { value: 'active' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Proposal 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Proposal 2')).not.toBeInTheDocument();
      });
    });

    it('filters proposals by search term', async () => {
      render(<DAODashboard daoId="test-dao" />);
      
      const searchInput = screen.getByPlaceholderText('Search proposals...');
      fireEvent.change(searchInput, { target: { value: 'Proposal 1' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Proposal 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Proposal 2')).not.toBeInTheDocument();
      });
    });

    it('shows empty state when no proposals match filters', async () => {
      render(<DAODashboard daoId="test-dao" />);
      
      const searchInput = screen.getByPlaceholderText('Search proposals...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      await waitFor(() => {
        expect(screen.getByText('No proposals match your filters')).toBeInTheDocument();
        expect(screen.getByText('Clear Filters')).toBeInTheDocument();
      });
    });

    it('clears filters when clear button is clicked', async () => {
      render(<DAODashboard daoId="test-dao" />);
      
      // Set a filter
      const searchInput = screen.getByPlaceholderText('Search proposals...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Clear filters
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
    });
  });

  describe('Voting Interface', () => {
    it('shows vote now button for eligible users on active proposals', () => {
      render(<DAODashboard daoId="test-dao" />);
      
      // Should show vote button for active proposal
      const voteButtons = screen.getAllByText('Vote Now');
      expect(voteButtons).toHaveLength(1); // Only for active proposal
    });

    it('hides vote button for users without voting rights', () => {
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

      render(<DAODashboard daoId="test-dao" />);
      
      expect(screen.queryByText('Vote Now')).not.toBeInTheDocument();
    });

    it('hides vote button for closed proposals', () => {
      const closedProposals = mockProposals.map(p => ({ ...p, status: 'closed' as const }));
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        proposals: closedProposals
      });

      render(<DAODashboard daoId="test-dao" />);
      
      expect(screen.queryByText('Vote Now')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive classes correctly', () => {
      const { container } = render(<DAODashboard daoId="test-dao" />);
      
      // Check for responsive grid classes
      expect(container.querySelector('.grid-cols-2')).toBeInTheDocument();
      expect(container.querySelector('.md\\:grid-cols-4')).toBeInTheDocument();
      expect(container.querySelector('.sm\\:flex-row')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<DAODashboard daoId="test-dao" />);
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: 'Test DAO' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Proposals' })).toBeInTheDocument();
      
      // Check for proper button roles
      expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Proposal/ })).toBeInTheDocument();
    });

    it('has proper form labels', () => {
      render(<DAODashboard daoId="test-dao" />);
      
      // Search input should have proper placeholder
      expect(screen.getByPlaceholderText('Search proposals...')).toBeInTheDocument();
      
      // Select elements should have proper options
      expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Created')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('calls appropriate hook methods on mount', () => {
      const mockGetDAO = jest.fn();
      const mockGetProposals = jest.fn();
      const mockGetMembership = jest.fn();
      
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        getDAO: mockGetDAO,
        getProposals: mockGetProposals,
        getMembership: mockGetMembership
      });

      render(<DAODashboard daoId="test-dao" />);
      
      expect(mockGetDAO).toHaveBeenCalledWith('test-dao');
      expect(mockGetProposals).toHaveBeenCalledWith('test-dao');
      expect(mockGetMembership).toHaveBeenCalledWith('test-dao');
    });

    it('refreshes data when refresh button is clicked', async () => {
      const mockGetDAO = jest.fn();
      const mockGetProposals = jest.fn();
      const mockGetMembership = jest.fn();
      
      mockUseDAO.mockReturnValue({
        ...mockUseDAO(),
        getDAO: mockGetDAO,
        getProposals: mockGetProposals,
        getMembership: mockGetMembership
      });

      render(<DAODashboard daoId="test-dao" />);
      
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockGetDAO).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
        expect(mockGetProposals).toHaveBeenCalledTimes(2);
        expect(mockGetMembership).toHaveBeenCalledTimes(2);
      });
    });
  });
});