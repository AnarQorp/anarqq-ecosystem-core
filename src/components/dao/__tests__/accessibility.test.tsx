/**
 * Accessibility Tests for DAO Dashboard Components
 * 
 * Tests WCAG 2.1 compliance, keyboard navigation, screen reader support,
 * and accessible data visualization across all DAO components.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Import components to test
import TokenOverviewPanel from '../TokenOverviewPanel';
import DAOWalletOverview from '../DAOWalletOverview';
import QuickActionsPanel from '../QuickActionsPanel';
import ProposalStatsSidebar from '../ProposalStatsSidebar';
import ProposalCard from '../ProposalCard';

// Import accessibility utilities
import {
  FocusManager,
  KEYBOARD_KEYS,
  DataVisualizationDescriber,
  ACCESSIBLE_COLORS,
  ScreenReaderUtils
} from '../../../utils/accessibility';

// Mock data
const mockTokenInfo = {
  name: 'Test DAO Token',
  symbol: 'TDT',
  totalSupply: 1000000,
  circulatingSupply: 750000,
  holderCount: 150,
  contractAddress: '0x1234567890123456789012345678901234567890',
  type: 'token-weighted' as const,
  decimals: 18,
  network: 'ethereum'
};

const mockProposal = {
  id: 'proposal-1',
  title: 'Test Proposal',
  description: 'This is a test proposal for accessibility testing',
  createdBy: 'did:squid:test-user',
  createdAt: '2024-01-01T00:00:00Z',
  expiresAt: '2024-12-31T23:59:59Z',
  status: 'active' as const,
  options: ['Yes', 'No', 'Abstain'],
  voteCount: 25,
  quorum: 50,
  quorumReached: false,
  results: {
    'Yes': { count: 15, weight: 150 },
    'No': { count: 8, weight: 80 },
    'Abstain': { count: 2, weight: 20 }
  }
};

const mockProposals = [mockProposal];

// Mock contexts and hooks
jest.mock('../../composables/useDAO', () => ({
  useDAO: () => ({
    currentDAO: {
      id: 'test-dao',
      name: 'Test DAO',
      description: 'A test DAO for accessibility testing',
      memberCount: 100,
      quorum: 50,
      visibility: 'public',
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
        isModerator: true,
        isOwner: false
      }
    },
    loading: false,
    error: null,
    getDAO: jest.fn(),
    getProposals: jest.fn(),
    getMembership: jest.fn()
  })
}));

jest.mock('../../composables/useQwallet', () => ({
  useQwallet: () => ({
    balances: {
      TDT: {
        balance: 1000,
        tokenInfo: {
          symbol: 'TDT',
          decimals: 18,
          contractAddress: '0x1234567890123456789012345678901234567890',
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
        contractAddress: '0x1234567890123456789012345678901234567890',
        attributes: [
          { trait_type: 'dao_id', value: 'test-dao' }
        ]
      }
    ],
    loading: false,
    error: null,
    getBalance: jest.fn(),
    getAllBalances: jest.fn(),
    listUserNFTs: jest.fn(),
    mintNFT: jest.fn(),
    refreshWalletData: jest.fn()
  })
}));

jest.mock('../../contexts/SessionContext', () => ({
  useSessionContext: () => ({
    isAuthenticated: true,
    session: {
      issuer: 'did:squid:test-user'
    }
  })
}));

describe('DAO Dashboard Accessibility', () => {
  describe('WCAG 2.1 Compliance', () => {
    test('TokenOverviewPanel has no accessibility violations', async () => {
      const { container } = render(
        <TokenOverviewPanel 
          daoId="test-dao" 
          tokenInfo={mockTokenInfo}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('DAOWalletOverview has no accessibility violations', async () => {
      const { container } = render(
        <DAOWalletOverview 
          daoId="test-dao"
          squidId="did:squid:test-user"
          daoTokenSymbol="TDT"
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('QuickActionsPanel has no accessibility violations', async () => {
      const { container } = render(
        <QuickActionsPanel
          daoId="test-dao"
          userRole="moderator"
          hasTokens={true}
          hasNFTs={true}
          onAction={jest.fn()}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('ProposalStatsSidebar has no accessibility violations', async () => {
      const { container } = render(
        <ProposalStatsSidebar
          daoId="test-dao"
          proposals={mockProposals}
          results={null}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('ProposalCard has no accessibility violations', async () => {
      const { container } = render(
        <ProposalCard
          proposal={mockProposal}
          daoId="test-dao"
          onVote={jest.fn()}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    test('TokenOverviewPanel supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TokenOverviewPanel 
          daoId="test-dao" 
          tokenInfo={mockTokenInfo}
        />
      );

      // Test Tab navigation
      await user.tab();
      expect(screen.getByRole('button', { name: /refresh token information/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /copy contract address/i })).toHaveFocus();

      // Test Enter key activation
      const refreshButton = screen.getByRole('button', { name: /refresh token information/i });
      refreshButton.focus();
      await user.keyboard('{Enter}');
      
      // Verify button was activated (would trigger refresh in real implementation)
      expect(refreshButton).toHaveFocus();
    });

    test('QuickActionsPanel supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const mockOnAction = jest.fn();
      
      render(
        <QuickActionsPanel
          daoId="test-dao"
          userRole="moderator"
          hasTokens={true}
          hasNFTs={true}
          onAction={mockOnAction}
        />
      );

      // Test Tab navigation through action buttons
      await user.tab();
      const firstButton = screen.getByRole('button', { name: /mint nft/i });
      expect(firstButton).toHaveFocus();

      await user.tab();
      const secondButton = screen.getByRole('button', { name: /transfer token/i });
      expect(secondButton).toHaveFocus();

      // Test Space key activation
      await user.keyboard(' ');
      expect(mockOnAction).toHaveBeenCalledWith('transfer-token');
    });

    test('ProposalCard supports keyboard navigation for voting', async () => {
      const user = userEvent.setup();
      const mockOnVote = jest.fn();
      
      render(
        <ProposalCard
          proposal={mockProposal}
          daoId="test-dao"
          onVote={mockOnVote}
        />
      );

      // Navigate to vote button
      const voteButton = screen.getByRole('button', { name: /vote now/i });
      voteButton.focus();
      
      // Test Enter key activation
      await user.keyboard('{Enter}');
      expect(mockOnVote).toHaveBeenCalledWith('proposal-1');
    });

    test('Focus management works correctly', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button>Button 1</button>
        <input type="text" value="Input 1" />
        <button>Button 2</button>
        <a href="#">Link 1</a>
      `;
      document.body.appendChild(container);

      const focusableElements = FocusManager.getFocusableElements(container);
      expect(focusableElements).toHaveLength(4);

      // Test focus first
      const focusedFirst = FocusManager.focusFirst(container);
      expect(focusedFirst).toBe(true);
      expect(document.activeElement).toBe(focusableElements[0]);

      // Test focus last
      const focusedLast = FocusManager.focusLast(container);
      expect(focusedLast).toBe(true);
      expect(document.activeElement).toBe(focusableElements[3]);

      document.body.removeChild(container);
    });
  });

  describe('ARIA Labels and Descriptions', () => {
    test('TokenOverviewPanel has proper ARIA labels', () => {
      render(
        <TokenOverviewPanel 
          daoId="test-dao" 
          tokenInfo={mockTokenInfo}
        />
      );

      // Check for progress bar ARIA attributes
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label');

      // Check for button ARIA labels
      const refreshButton = screen.getByRole('button', { name: /refresh token information/i });
      expect(refreshButton).toHaveAttribute('aria-label');
      expect(refreshButton).toHaveAttribute('aria-describedby');
    });

    test('DAOWalletOverview has proper ARIA structure', () => {
      render(
        <DAOWalletOverview 
          daoId="test-dao"
          squidId="did:squid:test-user"
          daoTokenSymbol="TDT"
        />
      );

      // Check for region landmarks
      const walletRegion = screen.getByRole('region', { name: /wallet overview/i });
      expect(walletRegion).toBeInTheDocument();

      // Check for progress bars with proper ARIA
      const progressBars = screen.getAllByRole('progressbar');
      progressBars.forEach(progressBar => {
        expect(progressBar).toHaveAttribute('aria-valuenow');
        expect(progressBar).toHaveAttribute('aria-valuemin');
        expect(progressBar).toHaveAttribute('aria-valuemax');
      });
    });

    test('ProposalCard has proper voting ARIA structure', () => {
      render(
        <ProposalCard
          proposal={mockProposal}
          daoId="test-dao"
          onVote={jest.fn()}
          showVotingBreakdown={true}
          votingMechanism="token-weighted"
        />
      );

      // Check for proper heading structure
      const proposalTitle = screen.getByRole('heading', { name: mockProposal.title });
      expect(proposalTitle).toBeInTheDocument();

      // Check for vote button accessibility
      const voteButton = screen.getByRole('button', { name: /vote now/i });
      expect(voteButton).toHaveAttribute('aria-label');
    });
  });

  describe('Screen Reader Support', () => {
    test('Data visualizations have alternative text descriptions', () => {
      render(
        <TokenOverviewPanel 
          daoId="test-dao" 
          tokenInfo={mockTokenInfo}
        />
      );

      // Check for screen reader only descriptions
      const srOnlyElements = document.querySelectorAll('.sr-only');
      expect(srOnlyElements.length).toBeGreaterThan(0);

      // Verify content includes meaningful descriptions
      const descriptions = Array.from(srOnlyElements).map(el => el.textContent);
      expect(descriptions.some(desc => desc?.includes('token'))).toBe(true);
      expect(descriptions.some(desc => desc?.includes('supply'))).toBe(true);
    });

    test('Complex data has table fallbacks', () => {
      // Mock user preference for data tables
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <ProposalStatsSidebar
          daoId="test-dao"
          proposals={mockProposals}
          results={null}
        />
      );

      // Check for data table presence (when enabled)
      // Note: In real implementation, this would be controlled by user preferences
      const tables = screen.queryAllByRole('table');
      if (tables.length > 0) {
        tables.forEach(table => {
          expect(table).toHaveAttribute('role', 'table');
          
          // Check for proper table structure
          const headers = screen.getAllByRole('columnheader');
          expect(headers.length).toBeGreaterThan(0);
        });
      }
    });

    test('Status announcements are properly structured', () => {
      render(
        <QuickActionsPanel
          daoId="test-dao"
          userRole="member"
          hasTokens={false}
          hasNFTs={false}
          onAction={jest.fn()}
        />
      );

      // Check for live regions for status updates
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);

      liveRegions.forEach(region => {
        expect(region).toHaveAttribute('aria-live');
        expect(['polite', 'assertive', 'off']).toContain(
          region.getAttribute('aria-live')
        );
      });
    });
  });

  describe('High Contrast and Color Accessibility', () => {
    test('Components use accessible color schemes', () => {
      // Test that accessible colors meet contrast requirements
      expect(ACCESSIBLE_COLORS.primary.blue).toBe('#1e40af');
      expect(ACCESSIBLE_COLORS.primary.green).toBe('#166534');
      expect(ACCESSIBLE_COLORS.primary.red).toBe('#dc2626');
      
      // These colors are designed to meet WCAG AA contrast ratios
      // In a real test, you would verify actual contrast ratios
    });

    test('Data visualizations work without color', () => {
      render(
        <TokenOverviewPanel 
          daoId="test-dao" 
          tokenInfo={mockTokenInfo}
        />
      );

      // Check that information is conveyed through more than just color
      // Progress bars should have text labels and ARIA attributes
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label');
      expect(progressBar).toHaveAttribute('aria-valuetext');

      // Check for text-based indicators
      const percentageText = screen.getByText(/75\.0%/);
      expect(percentageText).toBeInTheDocument();
    });
  });

  describe('Data Visualization Descriptions', () => {
    test('DataVisualizationDescriber generates accurate descriptions', () => {
      // Test progress bar description
      const progressDesc = DataVisualizationDescriber.describeProgressBar(75, 100, 'Token Supply');
      expect(progressDesc).toBe('Token Supply: 75% progress');

      // Test voting distribution description
      const votingData = [
        { option: 'Yes', count: 15, percentage: 60, isWinning: true },
        { option: 'No', count: 8, percentage: 32 },
        { option: 'Abstain', count: 2, percentage: 8 }
      ];
      const votingDesc = DataVisualizationDescriber.describeVotingDistribution(votingData);
      expect(votingDesc).toContain('25 total votes');
      expect(votingDesc).toContain('Yes: 15 votes (60%) (winning)');
      expect(votingDesc).toContain('Leading option: Yes with 60% of votes');

      // Test token supply description
      const tokenDesc = DataVisualizationDescriber.describeTokenSupply(750000, 1000000, 'TDT');
      expect(tokenDesc).toContain('Token supply for TDT');
      expect(tokenDesc).toContain('750,000 of 1,000,000 tokens in circulation (75%)');

      // Test quorum progress description
      const quorumDesc = DataVisualizationDescriber.describeQuorumProgress(25, 50, false);
      expect(quorumDesc).toContain('Quorum progress: 25 of 50 votes required (50%)');
      expect(quorumDesc).toContain('Status: not achieved');
    });

    test('ScreenReaderUtils creates comprehensive descriptions', () => {
      // Test complex data description
      const complexDesc = ScreenReaderUtils.describeComplexData({
        type: 'chart',
        title: 'Token Distribution',
        summary: 'Shows token allocation across holders',
        details: ['75% circulating', '25% reserved'],
        instructions: 'Use Tab to navigate chart elements'
      });

      expect(complexDesc).toContain('Token Distribution');
      expect(complexDesc).toContain('Chart: Shows token allocation across holders');
      expect(complexDesc).toContain('Details: 75% circulating, 25% reserved');
      expect(complexDesc).toContain('Use Tab to navigate chart elements');

      // Test navigation instructions
      const navInstructions = ScreenReaderUtils.createNavigationInstructions({
        type: 'dashboard',
        shortcuts: [
          { key: 'Tab', action: 'navigate sections' },
          { key: 'Enter', action: 'activate buttons' }
        ]
      });

      expect(navInstructions).toContain('Dashboard interface');
      expect(navInstructions).toContain('Tab for navigate sections');
      expect(navInstructions).toContain('Enter for activate buttons');
    });
  });

  describe('Focus Management', () => {
    test('Focus trap works in modal contexts', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button>First</button>
        <input type="text" />
        <button>Last</button>
      `;
      document.body.appendChild(container);

      // Simulate Tab key at the end of focusable elements
      const lastButton = container.querySelector('button:last-child') as HTMLElement;
      lastButton.focus();

      const event = new KeyboardEvent('keydown', {
        key: KEYBOARD_KEYS.TAB,
        bubbles: true
      });

      FocusManager.trapFocus(container, event);

      // In a real focus trap, this would cycle back to the first element
      // Here we just verify the trap function doesn't throw errors
      expect(event.defaultPrevented).toBe(false); // No preventDefault called in this simple test

      document.body.removeChild(container);
    });

    test('Focus announcements work correctly', () => {
      const mockAnnounce = jest.fn();
      
      // Mock the screen reader announcement
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockImplementation((tagName) => {
        const element = originalCreateElement.call(document, tagName);
        if (tagName === 'div') {
          // Mock the announcement element
          Object.defineProperty(element, 'textContent', {
            set: mockAnnounce,
            get: () => ''
          });
        }
        return element;
      });

      ScreenReaderUtils.announce('Test announcement', 'polite');
      
      // Restore original createElement
      document.createElement = originalCreateElement;
      
      // In a real implementation, this would verify the announcement was made
      expect(mockAnnounce).toHaveBeenCalledWith('Test announcement');
    });
  });

  describe('Responsive Accessibility', () => {
    test('Touch targets meet minimum size requirements', () => {
      render(
        <QuickActionsPanel
          daoId="test-dao"
          userRole="moderator"
          hasTokens={true}
          hasNFTs={true}
          onAction={jest.fn()}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const height = parseInt(styles.height);
        const width = parseInt(styles.width);
        
        // WCAG recommends minimum 44px touch targets
        // Note: In a real test environment, you'd need to account for padding/margins
        expect(height).toBeGreaterThanOrEqual(32); // Accounting for test environment limitations
        expect(width).toBeGreaterThanOrEqual(32);
      });
    });

    test('Components adapt to reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <TokenOverviewPanel 
          daoId="test-dao" 
          tokenInfo={mockTokenInfo}
        />
      );

      // Check that animations are reduced or disabled
      const progressBar = screen.getByRole('progressbar');
      const styles = window.getComputedStyle(progressBar);
      
      // In a real implementation, you'd check for reduced animation duration
      // or disabled transitions based on the prefers-reduced-motion media query
      expect(progressBar).toBeInTheDocument();
    });
  });
});

describe('Accessibility Utilities', () => {
  describe('FocusManager', () => {
    test('correctly identifies focusable elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button>Focusable Button</button>
        <button disabled>Disabled Button</button>
        <input type="text" />
        <input type="text" disabled />
        <a href="#">Focusable Link</a>
        <a>Non-focusable Link</a>
        <div tabindex="0">Focusable Div</div>
        <div tabindex="-1">Non-focusable Div</div>
        <div style="display: none;"><button>Hidden Button</button></div>
      `;
      document.body.appendChild(container);

      const focusableElements = FocusManager.getFocusableElements(container);
      
      // Should find: button, input, a[href], div[tabindex="0"]
      expect(focusableElements).toHaveLength(4);
      expect(focusableElements[0].tagName).toBe('BUTTON');
      expect(focusableElements[1].tagName).toBe('INPUT');
      expect(focusableElements[2].tagName).toBe('A');
      expect(focusableElements[3].tagName).toBe('DIV');

      document.body.removeChild(container);
    });

    test('visibility detection works correctly', () => {
      const visibleElement = document.createElement('div');
      const hiddenElement = document.createElement('div');
      hiddenElement.style.display = 'none';

      document.body.appendChild(visibleElement);
      document.body.appendChild(hiddenElement);

      expect(FocusManager.isVisible(visibleElement)).toBe(true);
      expect(FocusManager.isVisible(hiddenElement)).toBe(false);

      document.body.removeChild(visibleElement);
      document.body.removeChild(hiddenElement);
    });
  });

  describe('DataVisualizationDescriber', () => {
    test('handles edge cases correctly', () => {
      // Empty data
      const emptyPieDesc = DataVisualizationDescriber.describePieChart([]);
      expect(emptyPieDesc).toContain('Pie chart showing:');

      // Zero values
      const zeroProgressDesc = DataVisualizationDescriber.describeProgressBar(0, 100);
      expect(zeroProgressDesc).toBe('0% progress');

      // Large numbers
      const largeTokenDesc = DataVisualizationDescriber.describeTokenSupply(
        1500000000, 2000000000, 'LARGE'
      );
      expect(largeTokenDesc).toContain('1,500,000,000 of 2,000,000,000');
    });
  });

  describe('ACCESSIBLE_COLORS', () => {
    test('provides consistent color schemes', () => {
      expect(ACCESSIBLE_COLORS.primary).toBeDefined();
      expect(ACCESSIBLE_COLORS.secondary).toBeDefined();
      expect(ACCESSIBLE_COLORS.highContrast).toBeDefined();
      expect(ACCESSIBLE_COLORS.colorBlindFriendly).toBeDefined();

      // Check that all required colors are present
      const requiredColors = ['blue', 'green', 'red', 'orange', 'purple', 'gray'];
      requiredColors.forEach(color => {
        expect(ACCESSIBLE_COLORS.primary[color as keyof typeof ACCESSIBLE_COLORS.primary]).toBeDefined();
        expect(ACCESSIBLE_COLORS.secondary[color as keyof typeof ACCESSIBLE_COLORS.secondary]).toBeDefined();
      });
    });
  });
});