/**
 * Visual Indicators Components Test Suite
 * Tests for wallet limit indicators, permission displays, risk indicators, and loading states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import components to test
import WalletLimitIndicators, { LimitUsageData } from '../WalletLimitIndicators';
import PermissionStatusDisplay from '../PermissionStatusDisplay';
import RiskLevelIndicator, { RiskAssessment } from '../RiskLevelIndicator';
import { 
  ProgressIndicator,
  MultiStepProgress,
  TransactionLoading,
  IdentitySwitchLoading,
  WalletSkeleton
} from '../LoadingStateIndicators';

// Import types
import { WalletLimits, WalletPermissions } from '../../../types/wallet-config';
import { IdentityType, GovernanceType } from '../../../types/identity';

// Mock data
const mockLimits: WalletLimits = {
  dailyTransferLimit: 10000,
  monthlyTransferLimit: 50000,
  maxTransactionAmount: 5000,
  maxTransactionsPerHour: 10,
  allowedTokens: ['ETH', 'QTK'],
  restrictedAddresses: [],
  requiresApprovalAbove: 1000,
  dynamicLimitsEnabled: true,
  governanceControlled: false,
  riskBasedAdjustments: false
};

const mockUsage: LimitUsageData = {
  dailyUsed: 7500,
  monthlyUsed: 32000,
  hourlyTransactions: 6,
  lastUpdated: new Date().toISOString()
};

const mockPermissions: WalletPermissions = {
  canTransfer: true,
  canReceive: true,
  canMintNFT: false,
  canSignTransactions: true,
  canAccessDeFi: false,
  canCreateDAO: false,
  maxTransactionAmount: 5000,
  allowedTokens: ['ETH', 'QTK'],
  restrictedOperations: ['DeFi Access'],
  governanceLevel: 'LIMITED',
  requiresApproval: true,
  approvalThreshold: 1000
};

const mockRiskAssessment: RiskAssessment = {
  identityId: 'test-identity',
  overallRisk: 'MEDIUM',
  riskScore: 0.65,
  factors: [
    {
      id: '1',
      name: 'High Velocity',
      description: 'Multiple transactions in short period',
      severity: 'HIGH',
      score: 0.8,
      category: 'VELOCITY',
      detected: new Date().toISOString(),
      lastOccurrence: new Date().toISOString(),
      occurrenceCount: 3
    }
  ],
  recommendations: ['Enable 2FA', 'Review transactions'],
  lastAssessment: new Date().toISOString(),
  nextAssessment: new Date().toISOString(),
  trend: 'STABLE'
};

describe('WalletLimitIndicators', () => {
  it('renders limit indicators with usage data', () => {
    render(
      <WalletLimitIndicators
        limits={mockLimits}
        usage={mockUsage}
      />
    );

    expect(screen.getByText('Wallet Limit Usage')).toBeInTheDocument();
    expect(screen.getByText('Daily Transfer Limit')).toBeInTheDocument();
    expect(screen.getByText('Monthly Transfer Limit')).toBeInTheDocument();
  });

  it('shows warning when usage is high', () => {
    const highUsage = {
      ...mockUsage,
      dailyUsed: 9500 // 95% of limit
    };

    render(
      <WalletLimitIndicators
        limits={mockLimits}
        usage={highUsage}
        showWarnings={true}
      />
    );

    expect(screen.getAllByText('Critical')).toHaveLength(2); // Header and badge
  });

  it('renders in compact mode', () => {
    render(
      <WalletLimitIndicators
        limits={mockLimits}
        usage={mockUsage}
        compact={true}
      />
    );

    expect(screen.getByText('Limits')).toBeInTheDocument();
    // Should show percentage indicators
    expect(screen.getByText('75%')).toBeInTheDocument(); // Daily usage
  });
});

describe('PermissionStatusDisplay', () => {
  it('renders permission status correctly', () => {
    render(
      <PermissionStatusDisplay
        permissions={mockPermissions}
        identityType={IdentityType.ENTERPRISE}
        governanceType={GovernanceType.DAO}
      />
    );

    expect(screen.getByText('Permission Status')).toBeInTheDocument();
    expect(screen.getByText('ENTERPRISE')).toBeInTheDocument();
    expect(screen.getByText('Transfer Tokens')).toBeInTheDocument();
  });

  it('shows restricted operations', () => {
    render(
      <PermissionStatusDisplay
        permissions={mockPermissions}
        identityType={IdentityType.ENTERPRISE}
        governanceType={GovernanceType.DAO}
        showDetails={true}
      />
    );

    expect(screen.getAllByText('DeFi Access')).toHaveLength(2); // Permission item and restricted operations
  });

  it('handles permission clicks', () => {
    const onPermissionClick = vi.fn();
    
    render(
      <PermissionStatusDisplay
        permissions={mockPermissions}
        identityType={IdentityType.ENTERPRISE}
        governanceType={GovernanceType.DAO}
        onPermissionClick={onPermissionClick}
      />
    );

    // This would require more specific testing based on implementation
    // The component structure would need to be examined for clickable elements
  });
});

describe('RiskLevelIndicator', () => {
  it('renders risk assessment correctly', () => {
    render(
      <RiskLevelIndicator
        riskAssessment={mockRiskAssessment}
      />
    );

    expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
    expect(screen.getAllByText('MEDIUM')).toHaveLength(2); // Risk meter and main display
    expect(screen.getByText('65%')).toBeInTheDocument(); // Risk score
  });

  it('shows risk factors', () => {
    render(
      <RiskLevelIndicator
        riskAssessment={mockRiskAssessment}
        showFactors={true}
      />
    );

    expect(screen.getByText('High Velocity')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('shows recommendations', () => {
    render(
      <RiskLevelIndicator
        riskAssessment={mockRiskAssessment}
        showRecommendations={true}
      />
    );

    expect(screen.getByText(/Enable 2FA/)).toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    render(
      <RiskLevelIndicator
        riskAssessment={mockRiskAssessment}
        compact={true}
      />
    );

    expect(screen.getByText('MEDIUM Risk')).toBeInTheDocument();
  });
});

describe('ProgressIndicator', () => {
  it('renders progress correctly', () => {
    render(
      <ProgressIndicator
        progress={50}
        status="processing"
        operation="transfer"
        message="Processing transfer..."
      />
    );

    expect(screen.getByText('transfer')).toBeInTheDocument(); // Text is lowercase in component
    expect(screen.getByText('Processing transfer...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows estimated time', () => {
    render(
      <ProgressIndicator
        progress={25}
        status="processing"
        operation="transfer"
        estimatedTime={30}
      />
    );

    expect(screen.getByText('~30s')).toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    render(
      <ProgressIndicator
        progress={75}
        status="processing"
        operation="transfer"
        compact={true}
      />
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});

describe('MultiStepProgress', () => {
  const mockSteps = [
    { id: '1', label: 'Step 1', status: 'completed' as const },
    { id: '2', label: 'Step 2', status: 'active' as const },
    { id: '3', label: 'Step 3', status: 'pending' as const }
  ];

  it('renders all steps', () => {
    render(
      <MultiStepProgress
        steps={mockSteps}
        currentStep={1}
      />
    );

    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('shows step numbers', () => {
    render(
      <MultiStepProgress
        steps={mockSteps}
        currentStep={1}
      />
    );

    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument();
  });
});

describe('TransactionLoading', () => {
  it('renders transaction status', () => {
    render(
      <TransactionLoading
        transactionHash="0x1234567890abcdef"
        status="confirming"
        confirmations={2}
        requiredConfirmations={3}
      />
    );

    expect(screen.getByText('Transaction Status')).toBeInTheDocument();
    expect(screen.getByText('Confirming... (2/3)')).toBeInTheDocument();
    expect(screen.getByText('0x1234567890abcdef')).toBeInTheDocument();
  });

  it('shows progress based on status', () => {
    render(
      <TransactionLoading
        status="confirmed"
      />
    );

    expect(screen.getByText('Transaction confirmed!')).toBeInTheDocument();
  });
});

describe('IdentitySwitchLoading', () => {
  it('renders identity switch progress', () => {
    render(
      <IdentitySwitchLoading
        fromIdentity="ROOT"
        toIdentity="ENTERPRISE"
        stage="switching"
        progress={50}
        currentModule="Qwallet"
      />
    );

    expect(screen.getByText('Identity Switch')).toBeInTheDocument();
    expect(screen.getByText('ROOT')).toBeInTheDocument();
    expect(screen.getByText('ENTERPRISE')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows current module being updated', () => {
    render(
      <IdentitySwitchLoading
        fromIdentity="ROOT"
        toIdentity="DAO"
        stage="updating_contexts"
        progress={75}
        currentModule="Qonsent"
      />
    );

    expect(screen.getByText('Updating Qonsent...')).toBeInTheDocument();
  });
});

describe('WalletSkeleton', () => {
  it('renders dashboard skeleton', () => {
    const { container } = render(<WalletSkeleton type="dashboard" />);
    
    // Should render the skeleton container
    expect(container.querySelector('.wallet-skeleton')).toBeInTheDocument();
  });

  it('renders transaction list skeleton with count', () => {
    const { container } = render(<WalletSkeleton type="transaction_list" count={3} />);
    
    // Should render the skeleton container
    expect(container.querySelector('.wallet-skeleton')).toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  it('components work together in a dashboard layout', () => {
    render(
      <div>
        <WalletLimitIndicators
          limits={mockLimits}
          usage={mockUsage}
          compact={true}
        />
        <PermissionStatusDisplay
          permissions={mockPermissions}
          identityType={IdentityType.ROOT}
          governanceType={GovernanceType.SELF}
          compact={true}
        />
        <RiskLevelIndicator
          riskAssessment={mockRiskAssessment}
          compact={true}
        />
      </div>
    );

    // All components should render without conflicts
    expect(screen.getByText('Limits')).toBeInTheDocument();
    expect(screen.getByText('Permissions')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM Risk')).toBeInTheDocument();
  });
});