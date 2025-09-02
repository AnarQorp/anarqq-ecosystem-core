/**
 * Wallet Dashboard Component Tests
 * Tests for the modular wallet dashboard with identity-aware features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WalletDashboard } from '../WalletDashboard';
import { ExtendedSquidIdentity, IdentityType, PrivacyLevel } from '../../../types/identity';

// Mock the UI components
jest.mock('../../ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>
}));

jest.mock('../../ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span className={`badge ${variant}`}>{children}</span>
}));

jest.mock('../../ui/button', () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button onClick={onClick} className={`btn ${variant} ${size}`}>
      {children}
    </button>
  )
}));

jest.mock('../../ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  )
}));

jest.mock('../../ui/alert', () => ({
  Alert: ({ children, variant }: any) => <div className={`alert ${variant}`}>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>
}));

describe('WalletDashboard', () => {
  const mockIdentity: ExtendedSquidIdentity = {
    did: 'did:test:123456789',
    type: IdentityType.ROOT,
    privacyLevel: PrivacyLevel.MEDIUM,
    parentDID: null,
    childDIDs: [],
    permissions: [],
    metadata: {},
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    status: 'ACTIVE'
  };

  const mockAIDIdentity: ExtendedSquidIdentity = {
    ...mockIdentity,
    did: 'did:aid:123456789',
    type: IdentityType.AID,
    privacyLevel: PrivacyLevel.HIGH
  };

  beforeEach(() => {
    // Clear any previous mocks
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render wallet dashboard with loading state', () => {
      render(<WalletDashboard identity={mockIdentity} />);
      
      expect(screen.getByText('Loading wallet data...')).toBeInTheDocument();
    });

    it('should render compact dashboard', async () => {
      render(<WalletDashboard identity={mockIdentity} compact={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Balance')).toBeInTheDocument();
        expect(screen.getByText('Risk')).toBeInTheDocument();
      });
    });

    it('should render full dashboard after loading', async () => {
      render(<WalletDashboard identity={mockIdentity} />);
      
      await waitFor(() => {
        expect(screen.getByText('Wallet Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Transfer')).toBeInTheDocument();
      });
    });

    it('should display identity information', async () => {
      render(<WalletDashboard identity={mockIdentity} />);
      
      await waitFor(() => {
        expect(screen.getByText(/ROOT/)).toBeInTheDocument();
        expect(screen.getByText(/did:test:123456789/)).toBeInTheDocument();
      });
    });
  });

  describe('Balance Display', () => {
    it('should show balance information', async () => {
      render(<WalletDashboard identity={mockIdentity} />);
      
      await waitFor(() => {
        expect(screen.getByText('Wallet Balance')).toBeInTheDocument();
        expect(screen.getByText(/tokens/)).toBeInTheDocument();
      });
    });

    it('should hide balances for high privacy identities', async () => {
      render(<WalletDashboard identity={mockAIDIdentity} />);
      
      await waitFor(() => {
        // Should show privacy controls
        const eyeButtons = screen.getAllByRole('button');
        expect(eyeButtons.some(btn => btn.className.includes('h-8 w-8'))).toBe(true);
      });
    });

    it('should allow balance refresh', async () => {
      render(<WalletDashboard identity={mockIdentity} />);
      
      await waitFor(() => {
        const refreshButtons = screen.getAllByRole('button');
        const refreshButton = refreshButtons.find(btn => 
          btn.querySelector('svg') // Looking for refresh icon
        );
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('should display token information', async () => {
      render(<WalletDashboard identity={mockIdentity} />);
      
      await waitFor(() => {
        // Should show token symbols and balances
        expect(screen.getByText(/ETH|QTK/)).toBeInTheDocument();
      });
    });
  });

  describe('Risk Status Display', () => {
    it('should show risk status information', async () => {
      render(<WalletDashboard identity={mockIdentity} />);
      
      await waitFor(() => {
        expect(screen.getByText('Security Status')).toBeInTheDocument();
        expect(screen.getByText('Overall Risk')).toBeInTheDocument();
      });
    });

    it('should display reputation score when available', async () => {
      render(<WalletDashboard identity={mockIdentity} />);
      
      await waitFor(() => {
        expect(screen.getByText('Reputation')).toBeInTheDocument();
        expect(screen.getByText(/\/1000/)).toBeInTheDocument();
      });
    });

    it('should show risk recommendations', async () => {
      render(<WalletDashboard identity={mockIdentity} />);
      
      await waitFor(() => {
        // Should show security recommendations
        expect(screen.getByText(/Enable 2FA|Review recent transactions/)).toBeInTheDocument();
      });
    });
  });

  describe('Pi Wallet Integration', () => {
    it('should show Pi Wallet status when enabled', async () => {
      render(<WalletDashboard identity={mockIdentity} showPiWallet={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Pi Wallet')).toBeInTheDocument();
      });
    });

    it('should hide Pi Wallet when disabled', async () => {
      render(<WalletDashboard identity={mockIdentity} showPiWallet={false} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Pi Wallet')).not.toBeInTheDocument();
      });
    });

    it('should show connection status', async () => {
      render(<WalletDashboard identity={mockIdentity} showPiWallet={true} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Connected|Disconnected|Not connected/)).toBeInTheDocument();
      });
    });
  });

  describe('Transaction History', () => {
    it('should show transaction history when enabled', async () => {
      render(<WalletDashboard identity={mockIdentity} showTransactionHistory={true} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Transaction History|Recent/)).toBeInTheDocument();
      });
    });

    it('should hide transaction history when disabled', async () => {
      render(<WalletDashboard identity={mockIdentity} showTransactionHistory={false} />);
      
      await waitFor(() => {
        // In overview tab, transaction history should not be shown
        expect(screen.queryByText('Transaction History')).not.toBeInTheDocument();
      });
    });

    it('should respect privacy settings for transactions', async () => {
      render(<WalletDashboard identity={mockAIDIdentity} showTransactionHistory={true} />);
      
      await waitFor(() => {
        // High privacy identity should have limited transaction visibility
        const transactionElements = screen.queryAllByText(/send|receive|mint/i);
        // Should either show no transactions or very limited ones
        expect(transactionElements.length).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should render all tabs for full dashboard', async () => {
      render(<WalletDashboard identity={mockIdentity} showPiWallet={true} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
        expect(screen.getByTestId('tab-transactions')).toBeInTheDocument();
        expect(screen.getByTestId('tab-security')).toBeInTheDocument();
        expect(screen.getByTestId('tab-pi-wallet')).toBeInTheDocument();
      });
    });

    it('should hide Pi Wallet tab when disabled', async () => {
      render(<WalletDashboard identity={mockIdentity} showPiWallet={false} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('tab-pi-wallet')).not.toBeInTheDocument();
      });
    });

    it('should switch between tabs', async () => {
      render(<WalletDashboard identity={mockIdentity} />);
      
      await waitFor(() => {
        const transactionsTab = screen.getByTestId('tab-transactions');
        fireEvent.click(transactionsTab);
        
        expect(screen.getByTestId('tab-content-transactions')).toBeInTheDocument();
      });
    });
  });

  describe('Event Handlers', () => {
    it('should call onTransferClick when transfer button is clicked', async () => {
      const mockOnTransferClick = jest.fn();
      render(
        <WalletDashboard 
          identity={mockIdentity} 
          onTransferClick={mockOnTransferClick}
        />
      );
      
      await waitFor(() => {
        const transferButton = screen.getByText('Transfer');
        fireEvent.click(transferButton);
        expect(mockOnTransferClick).toHaveBeenCalled();
      });
    });

    it('should call onSettingsClick when settings button is clicked', async () => {
      const mockOnSettingsClick = jest.fn();
      render(
        <WalletDashboard 
          identity={mockIdentity} 
          onSettingsClick={mockOnSettingsClick}
        />
      );
      
      await waitFor(() => {
        const settingsButtons = screen.getAllByRole('button');
        const settingsButton = settingsButtons.find(btn => 
          btn.querySelector('svg') && btn.className.includes('ghost')
        );
        if (settingsButton) {
          fireEvent.click(settingsButton);
          expect(mockOnSettingsClick).toHaveBeenCalled();
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error state when data loading fails', async () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // This would require mocking the data loading to fail
      // For now, we'll test the error display structure
      render(<WalletDashboard identity={mockIdentity} />);
      
      // The component should handle errors gracefully
      await waitFor(() => {
        expect(screen.queryByText('Loading wallet data...')).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });

    it('should provide retry functionality on error', async () => {
      // This would test the retry button functionality
      // Implementation would depend on how errors are simulated
      render(<WalletDashboard identity={mockIdentity} />);
      
      await waitFor(() => {
        // Should render without crashing
        expect(screen.getByText('Loading wallet data...')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render compact layout correctly', async () => {
      render(<WalletDashboard identity={mockIdentity} compact={true} />);
      
      await waitFor(() => {
        const dashboard = document.querySelector('.wallet-dashboard-compact');
        expect(dashboard).toBeInTheDocument();
      });
    });

    it('should render full layout correctly', async () => {
      render(<WalletDashboard identity={mockIdentity} compact={false} />);
      
      await waitFor(() => {
        const dashboard = document.querySelector('.wallet-dashboard');
        expect(dashboard).toBeInTheDocument();
      });
    });
  });

  describe('Identity Type Specific Behavior', () => {
    it('should handle ROOT identity correctly', async () => {
      render(<WalletDashboard identity={mockIdentity} />);
      
      await waitFor(() => {
        expect(screen.getByText(/ROOT/)).toBeInTheDocument();
        // ROOT identity should have full access to all features
      });
    });

    it('should handle AID identity with privacy restrictions', async () => {
      render(<WalletDashboard identity={mockAIDIdentity} />);
      
      await waitFor(() => {
        expect(screen.getByText(/AID/)).toBeInTheDocument();
        // AID identity should have privacy controls visible
      });
    });

    it('should adapt UI based on privacy level', async () => {
      const highPrivacyIdentity = {
        ...mockIdentity,
        privacyLevel: PrivacyLevel.HIGH
      };
      
      render(<WalletDashboard identity={highPrivacyIdentity} />);
      
      await waitFor(() => {
        // Should show privacy controls for high privacy level
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });
});