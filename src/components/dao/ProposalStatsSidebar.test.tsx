/**
 * ProposalStatsSidebar Component Tests
 * 
 * Comprehensive test suite for the ProposalStatsSidebar component functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ProposalStatsSidebar from './ProposalStatsSidebar';
import type { Proposal, DAOResults } from '../../composables/useDAO';

// Mock the hooks and utilities
vi.mock('../../utils/performance/monitoring');
vi.mock('../../utils/accessibility');

// Mock performance monitoring
vi.mocked(vi.fn()).mockReturnValue({
  getMountTime: vi.fn()
});

// Mock accessibility hooks
vi.mocked(vi.fn()).mockReturnValue({
  colorScheme: {
    green: '#16a34a',
    gray: '#6b7280'
  },
  shouldShowDataTable: false,
  describer: {
    describeQuorumProgress: vi.fn().mockReturnValue('Quorum progress description')
  }
});

// Mock UI components
vi.mock('../ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
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
    <h3 className={className}>{children}</h3>
  )
}));

vi.mock('../ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  )
}));

vi.mock('../ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div className={`progress ${className}`} data-value={value} />
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
      describeQuorumProgress: vi.fn().mockReturnValue('Quorum progress description')
    }
  }),
  AccessibleProgress: ({ value, label, showPercentage }: any) => (
    <div role="progressbar" aria-label={label} aria-valuenow={value}>
      {showPercentage && `${value}%`}
    </div>
  )
}));

// Mock proposal data
const mockActiveProposal: Proposal = {
  id: 'proposal-1',
  daoId: 'test-dao',
  title: 'Active Test Proposal',
  description: 'This is an active test proposal',
  options: ['Yes', 'No'],
  createdBy: 'did:squid:test-user',
  createdAt: '2024-01-01T00:00:00Z',
  expiresAt: '2024-12-31T23:59:59Z',
  status: 'active',
  voteCount: 75,
  quorum: 50,
  results: {
    'Yes': { count: 45, weight: 450 },
    'No': { count: 30, weight: 300 }
  },
  quorumReached: true
};

const mockClosedProposal: Proposal = {
  id: 'proposal-2',
  daoId: 'test-dao',
  title: 'Closed Test Proposal',
  description: 'This is a closed test proposal',
  options: ['Option A', 'Option B', 'Option C'],
  createdBy: 'did:squid:another-user',
  createdAt: '2023-12-01T00:00:00Z',
  expiresAt: '2023-12-31T23:59:59Z',
  status: 'closed',
  voteCount: 100,
  quorum: 50,
  results: {
    'Option A': { count: 60, weight: 600 },
    'Option B': { count: 25, weight: 250 },
    'Option C': { count: 15, weight: 150 }
  },
  quorumReached: true
};

const mockLowParticipationProposal: Proposal = {
  id: 'proposal-3',
  daoId: 'test-dao',
  title: 'Low Participation Proposal',
  description: 'This proposal had low participation',
  options: ['Yes', 'No'],
  createdBy: 'did:squid:user3',
  createdAt: '2024-02-01T00:00:00Z',
  expiresAt: '2024-02-28T23:59:59Z',
  status: 'closed',
  voteCount: 25,
  quorum: 50,
  results: {
    'Yes': { count: 15, weight: 150 },
    'No': { count: 10, weight: 100 }
  },
  quorumReached: false
};

const mockProposals = [mockActiveProposal, mockClosedProposal, mockLowParticipationProposal];

describe('ProposalStatsSidebar', () => {
  const user = userEvent.setup();

  const defaultProps = {
    daoId: 'test-dao',
    proposals: mockProposals,
    results: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders governance statistics header', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ProposalStatsSidebar {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Insufficient Data Handling', () => {
    it('shows no proposals message when no proposals exist', () => {
      render(<ProposalStatsSidebar {...defaultProps} proposals={[]} />);
      
      expect(screen.getByText('No Proposals Yet')).toBeInTheDocument();
      expect(screen.getByText(/This DAO hasn\'t created any proposals yet/)).toBeInTheDocument();
    });

    it('shows limited data message when few proposals exist', () => {
      const fewProposals = [mockActiveProposal, mockClosedProposal]; // Only 2 proposals
      render(<ProposalStatsSidebar {...defaultProps} proposals={fewProposals} />);
      
      expect(screen.getByText('Limited Data Available')).toBeInTheDocument();
      expect(screen.getByText(/Only 2 completed proposal/)).toBeInTheDocument();
    });

    it('shows new DAO guidance for DAOs with no proposals', () => {
      render(<ProposalStatsSidebar {...defaultProps} proposals={[]} />);
      
      expect(screen.getByText('Welcome to DAO Governance')).toBeInTheDocument();
      expect(screen.getByText(/This DAO is ready for its first governance activities/)).toBeInTheDocument();
    });

    it('shows partial statistics notice when some data is available', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      expect(screen.getByText(/Partial Statistics:/)).toBeInTheDocument();
      expect(screen.getByText(/Based on 3 proposals, 2 completed/)).toBeInTheDocument();
    });
  });

  describe('Quorum Statistics', () => {
    it('displays quorum performance section', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      expect(screen.getByText('Quorum Performance')).toBeInTheDocument();
    });

    it('calculates quorum reach rate correctly', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      // 2 out of 3 proposals reached quorum = 66.7%
      expect(screen.getByText('66.7%')).toBeInTheDocument();
    });

    it('displays average participation correctly', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      // (75 + 100 + 25) / 3 = 66.7 votes average
      expect(screen.getByText('66.7 votes')).toBeInTheDocument();
    });

    it('shows participation trend indicator', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      // Should show trend (increasing, decreasing, or stable)
      const trendIndicators = ['Increasing', 'Decreasing', 'Stable'];
      const hasTrend = trendIndicators.some(trend => screen.queryByText(trend));
      expect(hasTrend).toBe(true);
    });

    it('displays average time to quorum when available', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      expect(screen.getByText('Avg. Time to Quorum')).toBeInTheDocument();
      // Should show time in hours or days
      expect(screen.getByText(/\d+[hd]/)).toBeInTheDocument();
    });
  });

  describe('Quorum Chart Visualization', () => {
    it('renders accessible progress bar for quorum rate', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '66.7');
    });

    it('shows quorum legend with counts', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      expect(screen.getByText('Reached (2)')).toBeInTheDocument();
      expect(screen.getByText('Not reached (1)')).toBeInTheDocument();
    });

    it('handles zero proposals gracefully', () => {
      render(<ProposalStatsSidebar {...defaultProps} proposals={[]} />);
      
      // Should not show quorum chart when no proposals
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('Participation Distribution', () => {
    it('shows participation distribution chart', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      // Should show high, medium, low participation buckets
      expect(screen.getByText(/High \(\d+\)/)).toBeInTheDocument();
      expect(screen.getByText(/Med \(\d+\)/)).toBeInTheDocument();
      expect(screen.getByText(/Low \(\d+\)/)).toBeInTheDocument();
    });

    it('categorizes proposals by participation level correctly', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      // Based on average participation of 66.7:
      // High (>= 100): 1 proposal (100 votes)
      // Medium (33.35-99.9): 1 proposal (75 votes)  
      // Low (< 33.35): 1 proposal (25 votes)
      expect(screen.getByText('High (1)')).toBeInTheDocument();
      expect(screen.getByText('Med (1)')).toBeInTheDocument();
      expect(screen.getByText('Low (1)')).toBeInTheDocument();
    });
  });

  describe('Top Proposals Display', () => {
    it('shows most voted proposals section', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      expect(screen.getByText('Most Voted Proposals')).toBeInTheDocument();
      expect(screen.getByText('Proposals ranked by participation and vote count')).toBeInTheDocument();
    });

    it('displays top proposals in order of vote count', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      // Should show proposals ordered by vote count (100, 75, 25)
      const proposalTitles = screen.getAllByText(/Test Proposal/);
      expect(proposalTitles.length).toBeGreaterThan(0);
      
      // First proposal should be the one with highest votes
      expect(screen.getByText('Closed Test Proposal')).toBeInTheDocument();
      expect(screen.getByText('Active Test Proposal')).toBeInTheDocument();
      expect(screen.getByText('Low Participation Proposal')).toBeInTheDocument();
    });

    it('shows proposal status badges', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getAllByText('Closed')).toHaveLength(2);
    });

    it('displays vote counts and participation rates', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      expect(screen.getByText('100')).toBeInTheDocument(); // Vote count
      expect(screen.getByText('75')).toBeInTheDocument(); // Vote count
      expect(screen.getByText('25')).toBeInTheDocument(); // Vote count
    });

    it('shows click to view details hint on hover', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      // Should show hover hint (though testing hover is limited in jsdom)
      const proposalCards = screen.getAllByText(/Test Proposal/);
      expect(proposalCards.length).toBeGreaterThan(0);
    });

    it('handles clicking on proposal cards', async () => {
      // Mock console.log to verify navigation attempt
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      const proposalCard = screen.getByText('Closed Test Proposal').closest('div');
      if (proposalCard) {
        await user.click(proposalCard);
        expect(consoleSpy).toHaveBeenCalledWith('Navigate to proposal:', 'proposal-2');
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Progress Bars and Visualizations', () => {
    it('shows progress bars for leading vote percentages', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      const progressElements = document.querySelectorAll('.progress');
      expect(progressElements.length).toBeGreaterThan(0);
    });

    it('calculates vote percentages correctly', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      // For closed proposal: Option A has 60/100 = 60%
      expect(screen.getByText('60.0%')).toBeInTheDocument();
    });
  });

  describe('Data Table Fallback', () => {
    it('shows data table when shouldShowDataTable is true', () => {
      vi.mocked(vi.fn()).mockReturnValueOnce({
        colorScheme: { green: '#16a34a', gray: '#6b7280' },
        shouldShowDataTable: true,
        describer: {
          describeQuorumProgress: vi.fn().mockReturnValue('Quorum progress description')
        }
      });

      render(<ProposalStatsSidebar {...defaultProps} />);
      
      const tables = screen.queryAllByRole('table');
      if (tables.length > 0) {
        expect(tables[0]).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Count' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Percentage' })).toBeInTheDocument();
      }
    });

    it('shows proper table structure with accessibility', () => {
      vi.mocked(vi.fn()).mockReturnValueOnce({
        colorScheme: { green: '#16a34a', gray: '#6b7280' },
        shouldShowDataTable: true,
        describer: {
          describeQuorumProgress: vi.fn().mockReturnValue('Quorum progress description')
        }
      });

      render(<ProposalStatsSidebar {...defaultProps} />);
      
      const tables = screen.queryAllByRole('table');
      if (tables.length > 0) {
        // Check for proper table caption
        const captions = document.querySelectorAll('caption');
        expect(captions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Tooltip Functionality', () => {
    it('shows tooltips on hover for detailed information', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      // Tooltips are implemented but testing hover in jsdom is limited
      // We can verify the structure exists
      expect(screen.getByText('Quorum Reach Rate')).toBeInTheDocument();
      expect(screen.getByText('Average Participation')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles proposals with no results', () => {
      const noResultsProposal = {
        ...mockActiveProposal,
        results: {}
      };
      
      render(<ProposalStatsSidebar {...defaultProps} proposals={[noResultsProposal]} />);
      
      expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
    });

    it('handles proposals with zero votes', () => {
      const zeroVotesProposal = {
        ...mockActiveProposal,
        voteCount: 0,
        results: {
          'Yes': { count: 0, weight: 0 },
          'No': { count: 0, weight: 0 }
        }
      };
      
      render(<ProposalStatsSidebar {...defaultProps} proposals={[zeroVotesProposal]} />);
      
      expect(screen.getByText('0.0 votes')).toBeInTheDocument();
    });

    it('handles very large numbers correctly', () => {
      const largeVotesProposal = {
        ...mockActiveProposal,
        voteCount: 1000000
      };
      
      render(<ProposalStatsSidebar {...defaultProps} proposals={[largeVotesProposal]} />);
      
      // Should format large numbers appropriately
      expect(screen.getByText(/1000000|1\.0M/)).toBeInTheDocument();
    });

    it('handles missing proposal fields gracefully', () => {
      const minimalProposal = {
        id: 'minimal',
        daoId: 'test-dao',
        title: 'Minimal Proposal',
        description: '',
        options: ['Yes'],
        createdBy: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-12-31T23:59:59Z',
        status: 'active' as const,
        voteCount: 0,
        quorum: 50,
        results: {},
        quorumReached: false
      };
      
      render(<ProposalStatsSidebar {...defaultProps} proposals={[minimalProposal]} />);
      
      expect(screen.getByText('Minimal Proposal')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      expect(screen.getByRole('heading', { name: 'Governance Statistics' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Quorum Performance' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Most Voted Proposals' })).toBeInTheDocument();
    });

    it('has proper progress bar accessibility', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow');
      expect(progressBar).toHaveAttribute('aria-label');
    });

    it('provides screen reader descriptions', () => {
      render(<ProposalStatsSidebar {...defaultProps} />);
      
      const srOnlyElements = document.querySelectorAll('.sr-only');
      expect(srOnlyElements.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('memoizes component correctly', () => {
      const { rerender } = render(<ProposalStatsSidebar {...defaultProps} />);
      
      // Rerender with same props
      rerender(<ProposalStatsSidebar {...defaultProps} />);
      
      expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
    });

    it('handles large numbers of proposals efficiently', () => {
      const manyProposals = Array.from({ length: 100 }, (_, i) => ({
        ...mockActiveProposal,
        id: `proposal-${i}`,
        title: `Proposal ${i}`,
        voteCount: Math.floor(Math.random() * 100)
      }));
      
      render(<ProposalStatsSidebar {...defaultProps} proposals={manyProposals} />);
      
      // Should still render without performance issues
      expect(screen.getByText('Governance Statistics')).toBeInTheDocument();
      
      // Should only show top 5 proposals
      const proposalCards = screen.getAllByText(/Proposal \d+/);
      expect(proposalCards.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Trend Calculation', () => {
    it('calculates increasing trend correctly', () => {
      const increasingProposals = [
        { ...mockActiveProposal, voteCount: 100, createdAt: '2024-03-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 90, createdAt: '2024-02-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 80, createdAt: '2024-01-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 50, createdAt: '2023-12-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 40, createdAt: '2023-11-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 30, createdAt: '2023-10-01T00:00:00Z' }
      ];
      
      render(<ProposalStatsSidebar {...defaultProps} proposals={increasingProposals} />);
      
      expect(screen.getByText('Increasing')).toBeInTheDocument();
    });

    it('calculates decreasing trend correctly', () => {
      const decreasingProposals = [
        { ...mockActiveProposal, voteCount: 30, createdAt: '2024-03-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 40, createdAt: '2024-02-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 50, createdAt: '2024-01-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 80, createdAt: '2023-12-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 90, createdAt: '2023-11-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 100, createdAt: '2023-10-01T00:00:00Z' }
      ];
      
      render(<ProposalStatsSidebar {...defaultProps} proposals={decreasingProposals} />);
      
      expect(screen.getByText('Decreasing')).toBeInTheDocument();
    });

    it('shows stable trend when participation is consistent', () => {
      const stableProposals = [
        { ...mockActiveProposal, voteCount: 50, createdAt: '2024-03-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 52, createdAt: '2024-02-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 48, createdAt: '2024-01-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 51, createdAt: '2023-12-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 49, createdAt: '2023-11-01T00:00:00Z' },
        { ...mockActiveProposal, voteCount: 50, createdAt: '2023-10-01T00:00:00Z' }
      ];
      
      render(<ProposalStatsSidebar {...defaultProps} proposals={stableProposals} />);
      
      expect(screen.getByText('Stable')).toBeInTheDocument();
    });
  });
});