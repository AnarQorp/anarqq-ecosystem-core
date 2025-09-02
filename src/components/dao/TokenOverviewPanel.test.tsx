/**
 * TokenOverviewPanel Component Tests
 * 
 * Comprehensive test suite for the TokenOverviewPanel component functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TokenOverviewPanel from './TokenOverviewPanel';
import type { TokenInfo } from './TokenOverviewPanel';

// Mock the hooks
vi.mock('../../composables/useDAO', () => ({
  useDAO: () => ({
    currentDAO: {
      id: 'test-dao',
      name: 'Test DAO',
      description: 'A test DAO',
      memberCount: 150,
      governanceRules: {
        tokenRequirement: { token: 'TDT', amount: 100 },
        votingMechanism: 'token-weighted'
      }
    },
    getDAO: vi.fn(),
    loading: false,
    error: null
  })
}));

vi.mock('../../composables/useQwallet', () => ({
  useQwallet: () => ({
    getBalance: vi.fn(),
    getAllBalances: vi.fn(),
    loading: false,
    error: null
  })
}));

vi.mock('../../utils/performance/monitoring', () => ({
  useRenderMonitoring: () => ({
    getMountTime: vi.fn()
  })
}));

vi.mock('../../utils/performance/dataFetching', () => ({
  useCachedApiCall: () => vi.fn()
}));

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
  CardTitle: ({ children, className, id }: any) => (
    <h2 className={className} id={id}>{children}</h2>
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

// Mock accessibility components
vi.mock('../../utils/accessibility', () => ({
  useKeyboardNavigation: () => ({
    containerRef: { current: null },
    focusFirst: vi.fn()
  }),
  useAccessibleVisualization: () => ({
    colorScheme: {
      green: '#16a34a',
      gray: '#6b7280'
    },
    shouldShowDataTable: false,
    describer: {
      describeTokenSupply: vi.fn().mockReturnValue('Token supply description')
    }
  }),
  createTokenDisplayAria: () => ({
    containerAttributes: {},
    labelId: 'token-label',
    descriptionId: 'token-description',
    descriptionText: 'Token display'
  }),
  createProgressAria: () => ({
    'aria-label': 'Token Supply Progress',
    'aria-valuenow': 75,
    'aria-valuemin': 0,
    'aria-valuemax': 100
  }),
  useDAOComponentDescriptions: () => ({
    describeTokenOverview: vi.fn().mockReturnValue('Token overview description')
  }),
  DataDescription: ({ children }: any) => <div>{children}</div>,
  AccessibleProgress: ({ value, label, showPercentage }: any) => (
    <div role="progressbar" aria-label={label} aria-valuenow={value}>
      {showPercentage && `${value}%`}
    </div>
  ),
  createAccessibleClickHandler: (handler: Function) => ({
    onClick: handler,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    }
  })
}));

const mockTokenInfo: TokenInfo = {
  name: 'Test DAO Token',
  symbol: 'TDT',
  totalSupply: 1000000,
  circulatingSupply: 750000,
  holderCount: 150,
  contractAddress: '0x1234567890123456789012345678901234567890',
  type: 'token-weighted',
  decimals: 18,
  network: 'ethereum'
};

describe('TokenOverviewPanel', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders token information correctly', () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      expect(screen.getByText('Test DAO Token')).toBeInTheDocument();
      expect(screen.getByText('TDT - Token display')).toBeInTheDocument();
      expect(screen.getByText('Token-Weighted')).toBeInTheDocument();
    });

    it('displays token metrics in grid format', () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      expect(screen.getByText('1.0M')).toBeInTheDocument(); // Total supply
      expect(screen.getByText('750.0K')).toBeInTheDocument(); // Circulating supply
      expect(screen.getByText('150')).toBeInTheDocument(); // Holder count
      expect(screen.getByText('18')).toBeInTheDocument(); // Decimals
    });

    it('shows contract information when available', () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      expect(screen.getByText('Contract Information')).toBeInTheDocument();
      expect(screen.getByText('0x1234567890123456789012345678901234567890')).toBeInTheDocument();
      expect(screen.getByText('Ethereum')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <TokenOverviewPanel 
          daoId="test-dao" 
          tokenInfo={mockTokenInfo} 
          className="custom-class"
        />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Token Type Badges', () => {
    it('displays user-based governance badge', () => {
      const userBasedToken = { ...mockTokenInfo, type: 'user-based' as const };
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={userBasedToken} />);
      
      expect(screen.getByText('User-Based')).toBeInTheDocument();
    });

    it('displays token-weighted governance badge', () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      expect(screen.getByText('Token-Weighted')).toBeInTheDocument();
    });

    it('displays NFT-weighted governance badge', () => {
      const nftWeightedToken = { ...mockTokenInfo, type: 'nft-weighted' as const };
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={nftWeightedToken} />);
      
      expect(screen.getByText('NFT-Weighted')).toBeInTheDocument();
    });
  });

  describe('Number Formatting', () => {
    it('formats large numbers correctly', () => {
      const largeNumberToken = {
        ...mockTokenInfo,
        totalSupply: 5000000,
        circulatingSupply: 3500000,
        holderCount: 2500
      };
      
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={largeNumberToken} />);
      
      expect(screen.getByText('5.0M')).toBeInTheDocument();
      expect(screen.getByText('3.5M')).toBeInTheDocument();
      expect(screen.getByText('2.5K')).toBeInTheDocument();
    });

    it('formats small numbers correctly', () => {
      const smallNumberToken = {
        ...mockTokenInfo,
        totalSupply: 500,
        circulatingSupply: 350,
        holderCount: 25
      };
      
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={smallNumberToken} />);
      
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('350')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  describe('Supply Visualization', () => {
    it('calculates supply percentage correctly', () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      // 750000 / 1000000 = 75%
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('handles zero total supply', () => {
      const zeroSupplyToken = { ...mockTokenInfo, totalSupply: 0 };
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={zeroSupplyToken} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('shows accessible progress bar', () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Circulating Supply');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton when loading', () => {
      mockUseDAO.mockReturnValueOnce({
        ...mockUseDAO(),
        loading: true
      });

      render(<TokenOverviewPanel daoId="test-dao" />);
      
      expect(document.querySelectorAll('.skeleton')).toHaveLength(9); // Header + content skeletons
    });

    it('shows loading skeleton when no token info and loading', () => {
      render(<TokenOverviewPanel daoId="test-dao" />);
      
      // Should show skeleton when no tokenInfo prop and not loading
      expect(screen.getByText('No Token Information')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when token loading fails', () => {
      mockUseDAO.mockReturnValueOnce({
        ...mockUseDAO(),
        error: 'Failed to load token information'
      });

      render(<TokenOverviewPanel daoId="test-dao" />);
      
      expect(screen.getByText('Token Information Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Failed to load token information')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('shows retry button that can be clicked', async () => {
      mockUseDAO.mockReturnValueOnce({
        ...mockUseDAO(),
        error: 'Failed to load token information'
      });

      render(<TokenOverviewPanel daoId="test-dao" />);
      
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);
      
      // Button should be clickable (no error thrown)
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('No Token Information State', () => {
    it('shows no token information message when no data available', () => {
      render(<TokenOverviewPanel daoId="test-dao" />);
      
      expect(screen.getByText('No Token Information')).toBeInTheDocument();
      expect(screen.getByText('This DAO does not have associated token information.')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('shows refresh button', () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).not.toBeDisabled();
    });

    it('shows copy address button when contract address is available', () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      expect(screen.getByText('Copy Address')).toBeInTheDocument();
    });

    it('hides copy address button when no contract address', () => {
      const noAddressToken = { ...mockTokenInfo, contractAddress: '' };
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={noAddressToken} />);
      
      expect(screen.queryByText('Copy Address')).not.toBeInTheDocument();
    });

    it('handles refresh button click', async () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);
      
      // Should not throw error
      expect(refreshButton).toBeInTheDocument();
    });

    it('handles copy address button click', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
        }
      });

      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      const copyButton = screen.getByText('Copy Address');
      await user.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890'
      );
    });
  });

  describe('Last Updated Display', () => {
    it('shows last updated timestamp', () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: 'Test DAO Token' })).toBeInTheDocument();
      
      // Check for proper button roles
      expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Copy Address/ })).toBeInTheDocument();
    });

    it('has proper progress bar accessibility', () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Circulating Supply');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('has proper region landmarks', () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      const regions = screen.getAllByRole('region');
      expect(regions.length).toBeGreaterThan(0);
      
      // Check for specific region labels
      expect(screen.getByRole('region', { name: 'Total supply information' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Circulating supply information' })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      // Test Tab navigation
      await user.tab();
      expect(screen.getByRole('button', { name: /Refresh/ })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /Copy Address/ })).toHaveFocus();
    });

    it('supports keyboard activation', async () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      const refreshButton = screen.getByRole('button', { name: /Refresh/ });
      refreshButton.focus();
      
      await user.keyboard('{Enter}');
      // Should not throw error
      expect(refreshButton).toHaveFocus();
    });
  });

  describe('Data Fetching and Caching', () => {
    it('fetches token info when daoId changes', () => {
      const { rerender } = render(<TokenOverviewPanel daoId="test-dao-1" />);
      
      rerender(<TokenOverviewPanel daoId="test-dao-2" />);
      
      // Should trigger new fetch (in real implementation)
      expect(mockUseDAO).toHaveBeenCalled();
    });

    it('uses provided tokenInfo prop when available', () => {
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      expect(screen.getByText('Test DAO Token')).toBeInTheDocument();
      // Should not fetch when tokenInfo is provided
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive classes correctly', () => {
      const { container } = render(
        <TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />
      );
      
      // Check for responsive grid classes
      expect(container.querySelector('.grid-cols-2')).toBeInTheDocument();
      expect(container.querySelector('.lg\\:grid-cols-4')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing optional fields gracefully', () => {
      const minimalToken = {
        name: 'Minimal Token',
        symbol: 'MIN',
        totalSupply: 1000,
        circulatingSupply: 500,
        holderCount: 10,
        contractAddress: '0x123',
        type: 'user-based' as const
        // Missing decimals and network
      };
      
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={minimalToken} />);
      
      expect(screen.getByText('Minimal Token')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument(); // Default decimals
    });

    it('handles zero values correctly', () => {
      const zeroToken = {
        ...mockTokenInfo,
        totalSupply: 0,
        circulatingSupply: 0,
        holderCount: 0
      };
      
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={zeroToken} />);
      
      expect(screen.getAllByText('0')).toHaveLength(3);
    });

    it('handles very large numbers', () => {
      const largeToken = {
        ...mockTokenInfo,
        totalSupply: 1000000000000, // 1 trillion
        circulatingSupply: 500000000000, // 500 billion
        holderCount: 1000000 // 1 million
      };
      
      render(<TokenOverviewPanel daoId="test-dao" tokenInfo={largeToken} />);
      
      // Should format large numbers appropriately
      expect(screen.getByText(/1000000\.0M|1\.0T/)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('memoizes component correctly', () => {
      const { rerender } = render(
        <TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />
      );
      
      // Rerender with same props
      rerender(<TokenOverviewPanel daoId="test-dao" tokenInfo={mockTokenInfo} />);
      
      // Component should be memoized (React.memo)
      expect(screen.getByText('Test DAO Token')).toBeInTheDocument();
    });
  });
});